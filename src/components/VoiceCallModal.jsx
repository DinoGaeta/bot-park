import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Tv,
  Send,
  Lock,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';
import { sendVoiceAudioToGemini } from '../services/geminiService';
import { speakTextWithElevenLabs, stopCurrentSpeech, unlockAudioForMobile } from '../services/elevenLabsService';

export default function VoiceCallModal({
  isOpen,
  onClose,
  activeBot,
  geminiApiKey,
  elevenLabsApiKey,
  messages = [],
  onVoiceTurnCompleted,
}) {
  const [callState, setCallState] = useState('idle'); // 'listening' | 'thinking' | 'speaking' | 'muted' | 'idle'
  const [liveTranscript, setLiveTranscript] = useState('');
  const [botReplyText, setBotReplyText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakOnTvToo, setSpeakOnTvToo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorBanner, setErrorBanner] = useState('');
  const [isHybridFallbackMode, setIsHybridFallbackMode] = useState(false);
  const [hybridInputText, setHybridInputText] = useState('');

  // Ref sempre aggiornati per evitare qualsiasi closure obsoleta (così Spielberg è sempre Spielberg!)
  const activeBotRef = useRef(activeBot);
  const messagesRef = useRef(messages);
  const speakOnTvTooRef = useRef(speakOnTvToo);
  const geminiApiKeyRef = useRef(geminiApiKey);
  const elevenLabsApiKeyRef = useRef(elevenLabsApiKey);
  const onVoiceTurnCompletedRef = useRef(onVoiceTurnCompleted);
  const audioCaptureInputRef = useRef(null);
  const processCapturedVoiceRef = useRef(null);

  useEffect(() => {
    activeBotRef.current = activeBot;
  }, [activeBot]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    speakOnTvTooRef.current = speakOnTvToo;
  }, [speakOnTvToo]);
  useEffect(() => {
    geminiApiKeyRef.current = geminiApiKey;
  }, [geminiApiKey]);
  useEffect(() => {
    elevenLabsApiKeyRef.current = elevenLabsApiKey;
  }, [elevenLabsApiKey]);
  useEffect(() => {
    onVoiceTurnCompletedRef.current = onVoiceTurnCompleted;
  }, [onVoiceTurnCompleted]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const bargeInRafRef = useRef(null);
  const bargeInStreamRef = useRef(null);
  const bargeInCtxRef = useRef(null);
  const tvSpeechTimerRef = useRef(null);
  const silenceStartRef = useRef(null);
  const hasSpokenInTurnRef = useRef(false);
  const speechRecRef = useRef(null);
  const interimTextRef = useRef('');
  const isMountedRef = useRef(false);

  // Timer durata chiamata
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stopBargeInMonitor = useCallback(() => {
    if (bargeInRafRef.current) {
      cancelAnimationFrame(bargeInRafRef.current);
      bargeInRafRef.current = null;
    }
    if (tvSpeechTimerRef.current) {
      clearTimeout(tvSpeechTimerRef.current);
      tvSpeechTimerRef.current = null;
    }
    try {
      if (bargeInStreamRef.current) {
        bargeInStreamRef.current.getTracks().forEach((t) => t.stop());
        bargeInStreamRef.current = null;
      }
    } catch {}
    try {
      if (bargeInCtxRef.current && bargeInCtxRef.current.state !== 'closed') {
        bargeInCtxRef.current.close();
        bargeInCtxRef.current = null;
      }
    } catch {}
  }, []);

  const cleanupRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopBargeInMonitor();
    try {
      if (speechRecRef.current) {
        speechRecRef.current.onend = null;
        speechRecRef.current.stop();
      }
    } catch {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    } catch {}
    setAudioLevel(0);
  }, [stopBargeInMonitor]);

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result || '';
        resolve(String(res).split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Interrompe immediatamente il parlato del Bot (PC + Smart TV) e passa all'ascolto di Dion
  const interruptBotSpeechAndListen = useCallback(() => {
    stopBargeInMonitor();
    stopCurrentSpeech();
    if (speakOnTvTooRef.current) {
      fetch('/api/tv/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stop_speak' }),
      }).catch(() => {});
    }
    if (isMountedRef.current) {
      startListeningTurn();
    }
  }, [stopBargeInMonitor]);

  // Monitora il microfono mentre il Bot parla per Barge-In (se Dion inizia a parlare, il Bot si zittisce subito e ascolta!)
  const startBargeInMonitor = useCallback(async () => {
    stopBargeInMonitor();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      bargeInStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      bargeInCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const startedAt = Date.now();
      let consecutiveVoiceFrames = 0;

      const checkBargeIn = () => {
        if (!isMountedRef.current || !bargeInStreamRef.current) return;
        analyser.getByteFrequencyData(data);
        // Concentriamoci sulle frequenze vocali umane (bin 4..45)
        let sum = 0;
        const count = Math.min(45, data.length);
        for (let i = 4; i < count; i++) sum += data[i];
        const avg = sum / (count - 4);

        // Dopo 750ms di grazia iniziale, se Dion parla con voce chiara per ~220ms consecutivi, interrompi il bot!
        if (Date.now() - startedAt > 750) {
          if (avg > 44) {
            consecutiveVoiceFrames += 1;
            if (consecutiveVoiceFrames >= 11) {
              interruptBotSpeechAndListen();
              return;
            }
          } else {
            consecutiveVoiceFrames = Math.max(0, consecutiveVoiceFrames - 1);
          }
        }
        bargeInRafRef.current = requestAnimationFrame(checkBargeIn);
      };
      bargeInRafRef.current = requestAnimationFrame(checkBargeIn);
    } catch {}
  }, [stopBargeInMonitor, interruptBotSpeechAndListen]);

  const finishListeningAndSend = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    try {
      if (speechRecRef.current) {
        speechRecRef.current.onend = null;
        speechRecRef.current.stop();
      }
    } catch {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}
  }, []);

  const processCapturedVoice = useCallback(
    async (audioBlob, fallbackText) => {
      if (!isMountedRef.current) return;

      const cleanFallback = (fallbackText || '').trim();
      if ((!audioBlob || audioBlob.size < 1400) && !cleanFallback) {
        startListeningTurn();
        return;
      }

      setCallState('thinking');
      sounds.play('tick');

      const currentBot = activeBotRef.current;

      try {
        const base64Audio = audioBlob ? await blobToBase64(audioBlob) : '';
        const botMemoriesText =
          Array.isArray(currentBot?.memories) && currentBot.memories.length > 0
            ? `\n\n[MEMORIE PERMANENTEMENTE SALVATE SU DION E SUL PROGETTO (${currentBot.memories.length})]:\n` +
              currentBot.memories.slice(-50).map((m) => `- (${m.date}) ${m.text}`).join('\n')
            : '';
        const botSkillsText =
          Array.isArray(currentBot?.skills) && currentBot.skills.length > 0
            ? `\n\n[SKILL OPERATIVE APPRESE]:\n` +
              currentBot.skills.map((s) => `- ${s.title}: ${s.steps}`).join('\n')
            : '';

        const { transcript, reply } = await sendVoiceAudioToGemini({
          apiKey: geminiApiKeyRef.current,
          audioBase64: base64Audio,
          mimeType: audioBlob?.type || 'audio/webm',
          spokenTextFallback: cleanFallback,
          messages: messagesRef.current,
          personaId: currentBot?.id || 'samantha',
          botName: currentBot?.name || 'Samantha',
          botSubtitle: currentBot?.subtitle || '',
          customSystemInstruction: `${currentBot?.systemInstruction || ''}${botMemoriesText}${botSkillsText}`,
        });

        if (!isMountedRef.current) return;

        const cleanTranscript = (transcript || cleanFallback || '').trim();
        if (!cleanTranscript || cleanTranscript === '...') {
          startListeningTurn();
          return;
        }

        setLiveTranscript(cleanTranscript);

        const rawReply = reply || '';
        const isHangUp =
          /<<<HANG_UP>>>/i.test(rawReply) ||
          /\b(riattacca|riaggancia|butta gi[uù]|metti gi[uù]( la chiamata)?|(ok |okay )?stacca( la chiamata)?|chiudi la chiamata|chiudere la chiamata|termina la chiamata|basta così)\b/i.test(
            cleanTranscript
          );

        const cleanSpokenReply = rawReply
          .replace(/<<<HANG_UP>>>/g, '')
          .replace(/<<<TV_COMMAND:[\s\S]*?>>>/g, '')
          .replace(/<<<CREATE_BOT:[\s\S]*?>>>/g, '')
          .replace(/<<<SEND_TO_BOT:[\s\S]*?>>>/g, '')
          .replace(/<<<WRITE_FILE:[\s\S]*?>>>/g, '')
          .replace(/<<<REMEMBER:[\s\S]*?>>>/g, '')
          .replace(/<<<SEND_TO_ANTIGRAVITY:[\s\S]*?>>>/g, '')
          .replace(/<<<NEW_CHAT_SESSION:[\s\S]*?>>>/g, '')
          .trim();

        const speechToPlay = cleanSpokenReply || (isHangUp ? 'A presto Dion, ci sentiamo dopo!' : 'Ho capito.');
        setBotReplyText(speechToPlay);
        setCallState('speaking');

        if (onVoiceTurnCompletedRef.current) {
          // Passiamo la risposta GREZZA (con i tag) così App.jsx può eseguire davvero TV_COMMAND, WRITE_FILE, ecc.
          onVoiceTurnCompletedRef.current(cleanTranscript, rawReply || speechToPlay);
        }

        const voiceId = currentBot?.voiceId || 'CiwzbDpaN3pQXjTgx3ML';

        // SE Dion ha chiesto di staccare la chiamata, il Bot saluta e chiude automaticamente la chiamata!
        if (isHangUp) {
          if (speakOnTvTooRef.current) {
            await fetch('/api/tv/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'samantha_speak',
                text: speechToPlay,
                voiceId,
                botName: currentBot?.name || 'Samantha',
                botColor: currentBot?.color || '#000000',
                botShape: currentBot?.avatarShape || 'pebble',
              }),
            }).catch(() => {});
            const wordCount = speechToPlay.split(/\s+/).filter(Boolean).length;
            const farewellMs = Math.max(2000, Math.min(6000, wordCount * 360 + 800));
            tvSpeechTimerRef.current = setTimeout(() => {
              sounds.play('close');
              if (isMountedRef.current) onClose();
            }, farewellMs);
            return;
          }

          await speakTextWithElevenLabs({
            text: speechToPlay,
            voiceId,
            apiKey: elevenLabsApiKeyRef.current,
            speed: currentBot?.speed || 1.02,
            onStart: () => {
              if (isMountedRef.current) setCallState('speaking');
            },
            onEnd: () => {
              sounds.play('close');
              if (isMountedRef.current) onClose();
            },
            onError: () => {
              sounds.play('close');
              if (isMountedRef.current) onClose();
            },
          });
          return;
        }

        // SE "Voce su TV: ON" è attivo, facciamo uscire la voce dell'Agente direttamente dagli altoparlanti della Smart TV (172.20.10.3)!
        if (speakOnTvTooRef.current) {
          await fetch('/api/tv/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'samantha_speak',
              text: speechToPlay,
              voiceId,
              botName: currentBot?.name || 'Samantha',
              botColor: currentBot?.color || '#000000',
              botShape: currentBot?.avatarShape || 'pebble',
            }),
          }).catch(() => {});

          // Calcola la durata stimata del parlato sulla TV prima di riaprire il microfono
          const wordCount = speechToPlay.split(/\s+/).filter(Boolean).length;
          const estimatedMs = Math.max(3000, Math.min(18000, wordCount * 390 + 1500));
          tvSpeechTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              startListeningTurn();
            }
          }, estimatedMs);
          return;
        }

        // Altrimenti riproduci sul PC con la voce ElevenLabs specifica dell'Agente (es. Liam per Spielberg, George per Italo, Aida per Samantha)
        await speakTextWithElevenLabs({
          text: speechToPlay,
          voiceId,
          apiKey: elevenLabsApiKeyRef.current,
          speed: currentBot?.speed || 1.02,
          onStart: () => {
            if (isMountedRef.current) setCallState('speaking');
          },
          onEnd: () => {
            // Pausa anti-eco di 450ms prima di riaprire il microfono per evitare self-triggering
            setTimeout(() => {
              if (isMountedRef.current) {
                startListeningTurn();
              }
            }, 450);
          },
          onError: () => {
            if (isMountedRef.current) {
              startListeningTurn();
            }
          },
        });
      } catch (err) {
        stopBargeInMonitor();
        if (!isMountedRef.current) return;
        setErrorBanner(err.message || 'Errore durante la chiamata vocale con Gemini');
        setCallState('idle');
      }
    },
    [startBargeInMonitor, stopBargeInMonitor]
  );

  useEffect(() => {
    processCapturedVoiceRef.current = processCapturedVoice;
  }, [processCapturedVoice]);

  useEffect(() => {
    if (!isOpen) return;
    const onNativeSpeech = (ev) => {
      const spoken = String(ev?.detail?.text || '').trim();
      if (spoken && isMountedRef.current && processCapturedVoiceRef.current) {
        unlockAudioForMobile();
        setLiveTranscript(spoken);
        processCapturedVoiceRef.current(null, spoken);
      }
    };
    window.addEventListener('botpark-native-speech', onNativeSpeech);
    return () => window.removeEventListener('botpark-native-speech', onNativeSpeech);
  }, [isOpen]);

  // Avvia l'ascolto dal microfono con rilevamento automatico del parlato (VAD) + MediaRecorder per Gemini Audio API
  const startListeningTurn = useCallback(async () => {
    if (!isMountedRef.current) return;
    stopBargeInMonitor();
    setErrorBanner('');
    setLiveTranscript('');
    interimTextRef.current = '';
    hasSpokenInTurnRef.current = false;
    silenceStartRef.current = null;
    audioChunksRef.current = [];

    const hasLiveMic =
      typeof navigator !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof window.MediaRecorder !== 'undefined';

    if (!hasLiveMic) {
      setIsHybridFallbackMode(true);
      setCallState('idle');
      return;
    }

    try {
      setIsHybridFallbackMode(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = 'it-IT';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (ev) => {
            let text = '';
            for (let i = 0; i < ev.results.length; i++) {
              text += ev.results[i][0].transcript;
            }
            if (text.trim()) {
              interimTextRef.current = text.trim();
              setLiveTranscript(text.trim());
              hasSpokenInTurnRef.current = true;
            }
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {}
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!isMountedRef.current) return;
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await processCapturedVoice(blob, interimTextRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setCallState('listening');

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const turnStartedAt = Date.now();

      const checkVolume = () => {
        if (!isMountedRef.current || !analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const norm = Math.min(1, avg / 55);
        setAudioLevel(norm);

        const now = Date.now();
        if (avg > 15) {
          hasSpokenInTurnRef.current = true;
          silenceStartRef.current = null;
        } else if (hasSpokenInTurnRef.current && now - turnStartedAt > 1100) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = now;
          } else if (now - silenceStartRef.current > 1400) {
            finishListeningAndSend();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(checkVolume);
      };

      rafRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      setIsHybridFallbackMode(true);
      if (window.isSecureContext) {
        setErrorBanner(`Accesso al microfono non riuscito: ${err.message}`);
      } else {
        setErrorBanner('');
      }
      setCallState('idle');
    }
  }, [finishListeningAndSend, processCapturedVoice, stopBargeInMonitor]);

  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      unlockAudioForMobile();
      sounds.play('open');
      setHybridInputText('');
      setErrorBanner('');
      setLiveTranscript('');
      setBotReplyText(
        `Ciao Dion, sono ${activeBot?.name || 'Samantha'} (${activeBot?.subtitle || 'Agente'}). Ti ascolto, parlami pure!`
      );
      startListeningTurn();
    } else {
      isMountedRef.current = false;
      cleanupRecording();
      stopCurrentSpeech();
      setCallState('idle');
    }

    return () => {
      isMountedRef.current = false;
      cleanupRecording();
      stopCurrentSpeech();
    };
  }, [isOpen, activeBot?.id]);

  if (!isOpen) return null;

  const botColor = activeBot?.color || '#FF309B';

  const handleSendHybridText = (e) => {
    if (e) e.preventDefault();
    const clean = hybridInputText.trim();
    if (!clean || callState === 'thinking') return;
    unlockAudioForMobile();
    setHybridInputText('');
    setLiveTranscript(clean);
    processCapturedVoice(null, clean);
  };

  const handleHybridVoiceCapture = () => {
    unlockAudioForMobile();
    sounds.play('tick');
    if (window.BotParkNative && typeof window.BotParkNative.startVoiceRecognition === 'function') {
      window.BotParkNative.startVoiceRecognition();
      return;
    }
    audioCaptureInputRef.current?.click();
  };

  const handleAudioFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isMountedRef.current) return;
    unlockAudioForMobile();
    await processCapturedVoice(file, '');
  };

  const handleToggleMuteOrSend = () => {
    unlockAudioForMobile();
    sounds.play('tick');
    if (callState === 'listening') {
      if (hasSpokenInTurnRef.current || liveTranscript) {
        finishListeningAndSend();
      } else {
        cleanupRecording();
        setCallState('muted');
      }
    } else if (callState === 'speaking') {
      // Barge-In immediato: zittisce il bot (PC + TV) e ascolta subito Dion!
      interruptBotSpeechAndListen();
    } else if (isHybridFallbackMode) {
      handleHybridVoiceCapture();
    } else {
      startListeningTurn();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#171920] to-[#0f1116] border border-white/10 rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center text-white overflow-hidden"
        >
          {/* Glow di sfondo dinamico col colore dell'Agente attivo */}
          <div
            className="absolute -top-24 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-500"
            style={{
              backgroundColor:
                callState === 'speaking'
                  ? botColor
                  : callState === 'listening'
                  ? '#00C972'
                  : botColor,
              transform: `scale(${1 + audioLevel * 0.6})`,
            }}
          />

          {/* Top Bar: Stato Chiamata + Timer + Switch Audio TV Reale */}
          <div className="w-full flex items-center justify-between text-xs text-gray-400 mb-6 z-10">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <span
                className={`w-2 h-2 rounded-full ${
                  callState === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : callState === 'speaking'
                    ? 'bg-pink-400 animate-pulse'
                    : callState === 'thinking'
                    ? 'bg-amber-400 animate-bounce'
                    : 'bg-gray-500'
                }`}
              />
              <span className="font-semibold text-gray-200">{formatTime(callDuration)}</span>
            </div>

            <button
              onClick={() => {
                sounds.play('tick');
                const nextVal = !speakOnTvToo;
                setSpeakOnTvToo(nextVal);
                speakOnTvTooRef.current = nextVal;
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                speakOnTvToo
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
              title={`Fai uscire la voce di ${activeBot?.name} direttamente dagli altoparlanti della Smart TV (172.20.10.3)`}
            >
              <Tv size={12} />
              <span>{speakOnTvToo ? 'Voce su TV: ON' : 'Voce su TV: OFF'}</span>
            </button>
          </div>

          {/* Avatar Gigante del Bot (cliccabile per interrompere e parlare subito!) */}
          <div
            onClick={() => {
              if (callState === 'speaking') interruptBotSpeechAndListen();
            }}
            className="relative my-4 flex items-center justify-center z-10 cursor-pointer"
            title={
              callState === 'speaking'
                ? 'Clicca (o inizia a parlare) per interrompere e prendere la parola'
                : ''
            }
          >
            <motion.div
              animate={{
                scale:
                  callState === 'listening'
                    ? 1 + audioLevel * 0.35
                    : callState === 'speaking'
                    ? [1, 1.12, 1]
                    : 1,
              }}
              transition={
                callState === 'speaking'
                  ? { repeat: Infinity, duration: 1.1 }
                  : { duration: 0.1 }
              }
              className="absolute w-32 h-32 rounded-full border-2 pointer-events-none"
              style={{ borderColor: `${botColor}55` }}
            />
            <div className="scale-150 transform p-4">
              <BotAvatar
                bot={activeBot}
                size="large"
                status={
                  callState === 'speaking'
                    ? 'speaking'
                    : callState === 'thinking'
                    ? 'thinking'
                    : 'idle'
                }
              />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight mt-3 z-10">
            {activeBot?.name || 'Samantha'}
          </h2>
          <p className="text-[11px] text-gray-400 z-10">{activeBot?.subtitle}</p>
          <p
            className="text-xs font-semibold mt-1 z-10"
            style={{ color: callState === 'listening' ? '#34D399' : botColor }}
          >
            {callState === 'listening'
              ? 'Ti sta ascoltando... (parla pure, invio automatico a fine frase)'
              : callState === 'thinking'
              ? `${activeBot?.name} sta pensando...`
              : callState === 'speaking'
              ? speakOnTvToo
                ? `Sta parlando sulla Smart TV (inizia a parlare per interromperlo)...`
                : `Sta parlando con voce ${activeBot?.voice?.split(' ')[0] || 'ElevenLabs'} (parla per interrompere)...`
              : isHybridFallbackMode
              ? 'Modalità Ibrida Mobile • Dettatura o Audio Rapido'
              : 'Microfono in pausa'}
          </p>

          {/* Trascrizione Live di Dion & Sottotitoli Risposta dell'Agente */}
          <div className="w-full min-h-[115px] mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center gap-2 text-left z-10">
            {liveTranscript && (
              <div className="text-xs" style={{ color: botColor }}>
                <span className="font-bold">Tu: </span>«{liveTranscript}»
              </div>
            )}
            <div className="text-xs text-gray-200 leading-relaxed line-clamp-4">
              {botReplyText || `Parla al microfono per dialogare a voce con ${activeBot?.name}`}
            </div>
          </div>

          <input
            ref={audioCaptureInputRef}
            type="file"
            accept="audio/*"
            capture="microphone"
            className="hidden"
            onChange={handleAudioFileSelected}
          />

          {isHybridFallbackMode && (
            <div className="w-full mt-3 flex flex-col gap-2 z-10">
              <form
                onSubmit={handleSendHybridText}
                className="w-full flex items-center gap-2 bg-white/8 border border-white/15 rounded-2xl px-3 py-2 focus-within:border-white/35 transition-colors"
              >
                <input
                  type="text"
                  value={hybridInputText}
                  onChange={(e) => setHybridInputText(e.target.value)}
                  onFocus={() => unlockAudioForMobile()}
                  placeholder="Tocca qui e premi 🎙️ sulla tastiera iPhone per parlare..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-400 outline-none select-text"
                />
                <button
                  type="submit"
                  disabled={!hybridInputText.trim() || callState === 'thinking'}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                  style={{ backgroundColor: botColor }}
                >
                  <Send size={13} />
                  <span>Invia</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleHybridVoiceCapture}
                  disabled={callState === 'thinking'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  <Mic size={13} />
                  <span>
                    {typeof window !== 'undefined' && window.BotParkNative?.startVoiceRecognition
                      ? 'Parla con Microfono Android'
                      : 'Registra Clip Audio'}
                  </span>
                </button>

                {typeof window !== 'undefined' &&
                  window.location.protocol === 'http:' &&
                  !['localhost', '127.0.0.1'].includes(window.location.hostname) && (
                    <button
                      type="button"
                      onClick={() => {
                        unlockAudioForMobile();
                        window.location.href = `https://${window.location.hostname}:5443/${window.location.search}`;
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-[11px] font-medium text-emerald-200 transition-all cursor-pointer"
                    >
                      <Lock size={12} />
                      <span>Passa a HTTPS (:5443) per Mic Live Continuo</span>
                    </button>
                  )}
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="w-full mt-3 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-[11px] text-red-200 z-10">
              {errorBanner}
            </div>
          )}

          {/* Controlli Chiamata in Basso */}
          <div className="flex items-center justify-center gap-5 mt-6 z-10">
            {/* Tasto Microfono / Invia subito / Interrompi */}
            <button
              onClick={handleToggleMuteOrSend}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer text-white"
              style={{
                backgroundColor:
                  callState === 'listening'
                    ? botColor
                    : callState === 'speaking'
                    ? '#F59E0B'
                    : isHybridFallbackMode
                    ? botColor
                    : 'rgba(255,255,255,0.12)',
              }}
              title={
                callState === 'listening'
                  ? 'Clicca per inviare subito la frase o mettere in muto'
                  : callState === 'speaking'
                  ? 'Interrompi subito e parla'
                  : isHybridFallbackMode
                  ? 'Avvia registrazione vocale rapida'
                  : 'Riattiva microfono'
              }
            >
              {callState === 'muted' ? (
                <MicOff size={22} />
              ) : callState === 'listening' && (hasSpokenInTurnRef.current || liveTranscript) ? (
                <Send size={20} />
              ) : (
                <Mic size={22} />
              )}
            </button>

            {/* Tasto Termina Chiamata */}
            <button
              onClick={() => {
                sounds.play('tick');
                if (speakOnTvTooRef.current) {
                  fetch('/api/tv/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'stop_speak' }),
                  }).catch(() => {});
                }
                onClose();
              }}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
              title="Termina chiamata vocale"
            >
              <PhoneOff size={22} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

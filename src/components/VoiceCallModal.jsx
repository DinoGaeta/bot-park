import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Tv,
  Sparkles,
  Send,
  Radio,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';
import { sendVoiceAudioToGemini } from '../services/geminiService';
import { speakTextWithElevenLabs, stopCurrentSpeech } from '../services/elevenLabsService';

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

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
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

  const cleanupRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
  }, []);

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

  // Avvia l'ascolto dal microfono con rilevamento automatico del parlato (VAD) + MediaRecorder per Gemini Audio API
  const startListeningTurn = useCallback(async () => {
    if (!isMountedRef.current) return;
    setErrorBanner('');
    setLiveTranscript('');
    interimTextRef.current = '';
    hasSpokenInTurnRef.current = false;
    silenceStartRef.current = null;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Avvia anche Web Speech API in parallelo per mostrare l'anteprima testo live se disponibile
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

      // Analisi livello volume e rilevamento automatico fine frase (1.5s di silenzio dopo aver parlato)
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
        if (avg > 14) {
          hasSpokenInTurnRef.current = true;
          silenceStartRef.current = null;
        } else if (hasSpokenInTurnRef.current && now - turnStartedAt > 1200) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = now;
          } else if (now - silenceStartRef.current > 1550) {
            // Utente ha finito di parlare: invia subito a Gemini!
            finishListeningAndSend();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(checkVolume);
      };

      rafRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      setErrorBanner(`Accesso al microfono non riuscito: ${err.message}`);
      setCallState('idle');
    }
  }, []);

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

  const processCapturedVoice = async (audioBlob, fallbackText) => {
    if (!isMountedRef.current) return;

    // Se l'audio è vuoto e non ha parlato, riapri l'ascolto
    if (audioBlob.size < 1200 && !fallbackText) {
      startListeningTurn();
      return;
    }

    setCallState('thinking');
    sounds.play('tick');

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const { transcript, reply } = await sendVoiceAudioToGemini({
        apiKey: geminiApiKey,
        audioBase64: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
        spokenTextFallback: fallbackText,
        messages,
        personaId: activeBot?.id || 'capo-bot',
        customSystemInstruction: activeBot?.systemInstruction || '',
      });

      if (!isMountedRef.current) return;

      const cleanTranscript = (transcript || fallbackText || '').trim();
      if (!cleanTranscript || cleanTranscript === '...') {
        startListeningTurn();
        return;
      }

      setLiveTranscript(cleanTranscript);

      // Puliamo eventuali tag tecnici dalla risposta parlata
      const cleanSpokenReply = (reply || '')
        .replace(/<<<TV_COMMAND:[\s\S]*?>>>/g, '')
        .replace(/<<<CREATE_BOT:[\s\S]*?>>>/g, '')
        .trim();

      setBotReplyText(cleanSpokenReply);
      setCallState('speaking');

      // Notifichiamo App.jsx per salvare il turno nella chat ed eseguire eventuali <<<TV_COMMAND>>> o <<<CREATE_BOT>>>
      if (onVoiceTurnCompleted) {
        onVoiceTurnCompleted(cleanTranscript, reply);
      }

      // Se l'interruttore "Parla anche su TV" è attivo e non c'era già un TV_COMMAND, facciamo parlare Capo Bot anche sul TV!
      if (speakOnTvToo && !String(reply).includes('<<<TV_COMMAND:')) {
        fetch('/api/tv/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'Capo Bot_speak', text: cleanSpokenReply }),
        }).catch(() => {});
      }

      const voiceId = activeBot?.voiceId || 'CiwzbDpaN3pQXjTgx3ML';

      await speakTextWithElevenLabs({
        text: cleanSpokenReply,
        voiceId,
        apiKey: elevenLabsApiKey,
        speed: activeBot?.speed || 1.02,
        onStart: () => {
          if (isMountedRef.current) setCallState('speaking');
        },
        onEnd: () => {
          // Appena finisce di parlare, riapre automaticamente il microfono per continuare la conversazione!
          if (isMountedRef.current) {
            startListeningTurn();
          }
        },
        onError: () => {
          if (isMountedRef.current) {
            startListeningTurn();
          }
        },
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setErrorBanner(err.message || 'Errore durante la chiamata vocale con Gemini');
      setCallState('idle');
    }
  };

  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      sounds.play('open');
      setBotReplyText(
        `Ciao, sono ${activeBot?.name || 'capo-bot'}. Ti ascolto, parlami pure liberamente!`
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
  }, [isOpen, activeBot?.id, cleanupRecording, startListeningTurn]);

  if (!isOpen) return null;

  const handleToggleMuteOrSend = () => {
    sounds.play('tick');
    if (callState === 'listening') {
      // Se ha già iniziato a parlare, cliccare invia subito la frase a Gemini!
      if (hasSpokenInTurnRef.current || liveTranscript) {
        finishListeningAndSend();
      } else {
        cleanupRecording();
        setCallState('muted');
      }
    } else if (callState === 'speaking') {
      // Interrompi la voce del bot e passa subito all'ascolto (barge-in!)
      stopCurrentSpeech();
      startListeningTurn();
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
          {/* Glow di sfondo dinamico */}
          <div
            className="absolute -top-24 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-500"
            style={{
              backgroundColor:
                callState === 'speaking'
                  ? '#FF309B'
                  : callState === 'listening'
                  ? '#00C972'
                  : '#1084FE',
              transform: `scale(${1 + audioLevel * 0.6})`,
            }}
          />

          {/* Top Bar: Stato Chiamata + Timer + Switch Audio TV */}
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
                setSpeakOnTvToo(!speakOnTvToo);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                speakOnTvToo
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
              title="Fai uscire la voce di Capo Bot anche dagli altoparlanti della Smart TV"
            >
              <Tv size={12} />
              <span>{speakOnTvToo ? 'Voce su TV: ON' : 'Voce su TV: OFF'}</span>
            </button>
          </div>

          {/* Avatar Gigante del Bot con anello pulsante a tempo di voce */}
          <div className="relative my-4 flex items-center justify-center z-10">
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
              className="absolute w-32 h-32 rounded-full border-2 border-white/15 pointer-events-none"
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
            {activeBot?.name || 'capo-bot'}
          </h2>
          <p className="text-xs font-medium text-pink-400 mt-0.5 z-10">
            {callState === 'listening'
              ? 'Ti sta ascoltando... (parla pure, invio automatico a fine frase)'
              : callState === 'thinking'
              ? 'Elaborazione con Gemini Live...'
              : callState === 'speaking'
              ? 'Sta parlando con voce ElevenLabs...'
              : 'Microfono in pausa'}
          </p>

          {/* Trascrizione Live di Utente & Sottotitoli Risposta di Capo Bot */}
          <div className="w-full min-h-[115px] mt-5 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center gap-2 text-left z-10">
            {liveTranscript && (
              <div className="text-xs text-emerald-300">
                <span className="font-bold text-emerald-400">Tu: </span>«{liveTranscript}»
              </div>
            )}
            <div className="text-xs text-gray-200 leading-relaxed line-clamp-4">
              {botReplyText || 'Parla al microfono per dialogare a voce con ' + activeBot?.name}
            </div>
          </div>

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
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                callState === 'listening'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : callState === 'speaking'
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={
                callState === 'listening'
                  ? 'Clicca per inviare subito la frase o mettere in muto'
                  : callState === 'speaking'
                  ? 'Interrompi e parla subito'
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


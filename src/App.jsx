import React, { useState, useEffect, useRef, useCallback } from 'react';
import SidebarLeft from './components/SidebarLeft';
import ChatCenter from './components/ChatCenter';
import SidebarRight from './components/SidebarRight';
import MobilePairModal from './components/MobilePairModal';
import CreateBotModal from './components/CreateBotModal';
import SettingsModal from './components/SettingsModal';
import VirtualComputerModal from './components/VirtualComputerModal';
import VoiceCallModal from './components/VoiceCallModal';
import RoutineModal from './components/RoutineModal';
import {
  VIRGIN_BOTS,
  KITSUNE_LABS_BOTS,
  INITIAL_BOT_MESSAGES,
} from './data/botsData';
import { sounds } from './services/soundEffects';
import { streamGeminiChat } from './services/geminiService';
import { speakTextWithElevenLabs, stopCurrentSpeech } from './services/elevenLabsService';

const STORAGE_BOTS_KEY = 'botpark_clean_bots_v1';
const STORAGE_MESSAGES_KEY = 'botpark_clean_messages_v1';
const STORAGE_ROUTINES_KEY = 'botpark_clean_routines_v1';

const DEFAULT_ROUTINES = [
  {
    id: 'rt_morning_brief',
    botId: 'capo-bot',
    title: 'Briefing Mattutino & News',
    time: '08:30',
    frequency: 'Ogni giorno',
    prompt: 'Dammi il buongiorno con il meteo live e le principali notizie di oggi.',
    alsoOnTv: false,
    enabled: false,
    lastRunDate: '',
  },
];

export default function App() {
  // Parte in Versione Vergine pulita (solo il Capo Bot)
  const [isVirginMode, setIsVirginMode] = useState(true);

  const [bots, setBots] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return VIRGIN_BOTS;
  });

  const [activeBotId, setActiveBotId] = useState('capo-bot');

  const [botMessages, setBotMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...INITIAL_BOT_MESSAGES, ...parsed };
        }
      }
    } catch {}
    return INITIAL_BOT_MESSAGES;
  });

  const [routines, setRoutines] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ROUTINES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_ROUTINES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOTS_KEY, JSON.stringify(bots));
    } catch {}
  }, [bots]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(botMessages));
    } catch {}
  }, [botMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ROUTINES_KEY, JSON.stringify(routines));
    } catch {}
  }, [routines]);

  // Modali
  const [showPairModal, setShowPairModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [computerInitialTab, setComputerInitialTab] = useState('files');
  const [fileToOpenInComputer, setFileToOpenInComputer] = useState(null);
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('generali');

  // Chiavi API caricate da .env o localStorage (nessuna chiave privata hardcoded)
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('botpark_gemini_key') || ''
  );
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(
    () => import.meta.env.VITE_ELEVENLABS_API_KEY || localStorage.getItem('botpark_elevenlabs_key') || ''
  );

  const [tvLiveMemorySummary, setTvLiveMemorySummary] = useState('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);

  const isSpeakingAudio = speakingMessageIndex !== null;
  const botStatus =
    isStreaming || isSpeakingAudio ? 'speaking' : isListening ? 'thinking' : 'idle';

  const activeBot = bots.find((b) => b.id === activeBotId) || bots[0];
  const activeMessages = botMessages[activeBotId] || [];
  const abortControllerRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  useEffect(() => {
    sounds.play('open');
  }, []);

  // Esegue tag <<<CREATE_BOT>>>, <<<TV_COMMAND>>>, <<<SEND_TO_BOT>>> e <<<WRITE_FILE>>>
  const executeBotSideEffects = useCallback(
    async (fullAssistantText, senderBotId) => {
      // 1. Creazione nuovo bot
      if (fullAssistantText.includes('<<<CREATE_BOT:')) {
        const match = fullAssistantText.match(/<<<CREATE_BOT:\s*(\{[\s\S]*?\})\s*>>>/);
        if (match && match[1]) {
          try {
            const botData = JSON.parse(match[1]);
            const newId = botData.name.toLowerCase().replace(/\s+/g, '-');
            const newBot = {
              id: newId,
              name: botData.name,
              subtitle: botData.subtitle || botData.role,
              color: botData.color || '#00C972',
              avatarShape: botData.shape || 'bean',
              systemInstruction:
                botData.systemInstruction ||
                `Sei ${botData.name}, agente specializzato di Bot Park, con identità e memoria indipendenti.`,
              voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
              voice: 'Liam',
              speed: '1.10x',
              language: 'Italian',
              computerStatus: 'Attivo',
            };

            setBots((prev) => {
              if (prev.some((b) => b.id === newBot.id)) return prev;
              return [...prev, newBot];
            });

            setBotMessages((prev) => ({
              ...prev,
              [newId]: [
                {
                  role: 'assistant',
                  content: `Ciao! Sono **${newBot.name}** (${newBot.subtitle}). La mia identità e la mia memoria sono pronte. Da dove partiamo?`,
                },
              ],
              [senderBotId]: (prev[senderBotId] || []).map((m, idx, arr) =>
                idx === arr.length - 1
                  ? {
                      ...m,
                      actionChip: {
                        icon: '✨',
                        text: `Agente ${newBot.name} creato • Apri chat`,
                        targetBotId: newId,
                      },
                    }
                  : m
              ),
            }));
            sounds.play('success');
          } catch (e) {
            console.error('Errore parsing creazione bot:', e);
          }
        }
      }

      // 2. Scrittura reale di un file nel workspace dell'Agente
      if (fullAssistantText.includes('<<<WRITE_FILE:')) {
        const fileMatch = fullAssistantText.match(/<<<WRITE_FILE:\s*(\{[\s\S]*?\})\s*>>>/);
        if (fileMatch && fileMatch[1]) {
          try {
            const filePayload = JSON.parse(fileMatch[1]);
            const fileName = filePayload.name || filePayload.filename || 'documento.md';
            const fileContent = filePayload.content || '';
            const res = await fetch('/api/fs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                botId: senderBotId,
                name: fileName,
                content: fileContent,
              }),
            });
            const data = await res.json();
            if (data && data.ok) {
              setBotMessages((prev) => {
                const thread = [...(prev[senderBotId] || [])];
                if (thread.length > 0) {
                  thread[thread.length - 1] = {
                    ...thread[thread.length - 1],
                    actionChip: {
                      icon: '📄',
                      text: `File salvato su disco: ${data.name}`,
                    },
                  };
                }
                return { ...prev, [senderBotId]: thread };
              });
            }
          } catch (e) {
            console.error('Errore scrittura file da bot:', e);
          }
        }
      }

      // 3. Messaggio / Delega Inter-Agente
      if (fullAssistantText.includes('<<<SEND_TO_BOT:')) {
        const msgMatch = fullAssistantText.match(/<<<SEND_TO_BOT:\s*(\{[\s\S]*?\})\s*>>>/);
        if (msgMatch && msgMatch[1]) {
          try {
            const payload = JSON.parse(msgMatch[1]);
            const targetId = String(payload.targetId || '').toLowerCase();
            const targetBot = bots.find(
              (b) => b.id === targetId || b.name.toLowerCase() === targetId
            );
            const senderBot = bots.find((b) => b.id === senderBotId);

            if (targetBot && payload.message) {
              setBotMessages((prev) => {
                const senderThread = [...(prev[senderBotId] || [])];
                if (senderThread.length > 0) {
                  senderThread[senderThread.length - 1] = {
                    ...senderThread[senderThread.length - 1],
                    actionChip: {
                      icon: '💬',
                      text: `Messaggio inviato a ${targetBot.name}`,
                      targetBotId: targetBot.id,
                    },
                  };
                }
                return { ...prev, [senderBotId]: senderThread };
              });

              const incomingNote = `[Messaggio dal collega ${senderBot?.name || 'Capo Bot'}]: ${payload.message}`;
              const targetThread = [
                ...(botMessages[targetBot.id] || []),
                {
                  role: 'user',
                  content: incomingNote,
                  timestamp: `Da ${senderBot?.name || 'Capo Bot'}`,
                },
              ];

              setBotMessages((prev) => ({
                ...prev,
                [targetBot.id]: targetThread,
              }));

              const replyText = await streamGeminiChat({
                apiKey: geminiApiKey,
                model: 'gemini-3.5-flash-lite',
                messages: targetThread,
                personaId: targetBot.id,
                customSystemInstruction: targetBot.systemInstruction,
              });

              const cleanReply = replyText
                .replace(/<<<[\s\S]*?>>>/g, '')
                .trim();

              setBotMessages((prev) => ({
                ...prev,
                [targetBot.id]: [
                  ...(prev[targetBot.id] || []),
                  {
                    role: 'assistant',
                    content: cleanReply,
                    timestamp: 'Risposta autonoma al team',
                  },
                ],
              }));

              setBots((prev) =>
                prev.map((b) =>
                  b.id === targetBot.id
                    ? { ...b, subtitle: cleanReply.slice(0, 36) + '...' }
                    : b
                )
              );
            }
          } catch (e) {
            console.error('Errore invio messaggio inter-bot:', e);
          }
        }
      }

      // 4. Comando verso Android TV via ADB
      if (fullAssistantText.includes('<<<TV_COMMAND:')) {
        const tvMatch = fullAssistantText.match(/<<<TV_COMMAND:\s*(\{[\s\S]*?\})\s*>>>/);
        if (tvMatch && tvMatch[1]) {
          try {
            const tvCmd = JSON.parse(tvMatch[1]);
            const res = await fetch('/api/tv/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tvCmd),
            });
            const data = await res.json();
            if (data && data.ok) {
              const chipText = data.tvReply
                ? `Android TV: «${data.tvReply}»`
                : `Comando TV eseguito: ${tvCmd.type}`;

              setBotMessages((prev) => {
                const thread = [...(prev[senderBotId] || [])];
                if (thread.length > 0) {
                  thread[thread.length - 1] = {
                    ...thread[thread.length - 1],
                    actionChip: { icon: '📺', text: chipText },
                  };
                }
                return { ...prev, [senderBotId]: thread };
              });
            }
          } catch (e) {
            console.error('Errore invio comando TV:', e);
          }
        }
      }
    },
    [bots, botMessages, geminiApiKey]
  );

  // Ripristina Versione Vergine Pulita
  const handleResetVirgin = () => {
    setIsVirginMode(true);
    setBots(VIRGIN_BOTS);
    setActiveBotId('capo-bot');
    setBotMessages({ 'capo-bot': INITIAL_BOT_MESSAGES['capo-bot'] });
    localStorage.removeItem(STORAGE_BOTS_KEY);
    localStorage.removeItem(STORAGE_MESSAGES_KEY);
    sounds.play('success');
  };

  // Carica 3 Agenti Starter di Esempio
  const handleLoadDemo = () => {
    setIsVirginMode(false);
    setBots(KITSUNE_LABS_BOTS);
    setBotMessages(INITIAL_BOT_MESSAGES);
    setActiveBotId('capo-bot');
    sounds.play('tick');
  };

  const handleOpenSettings = (tab = 'generali') => {
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  };

  const handleOpenComputer = (tab = 'files') => {
    setFileToOpenInComputer(null);
    setComputerInitialTab(typeof tab === 'string' ? tab : 'files');
    setShowComputerModal(true);
  };

  const handleOpenFileInEditor = (fileName) => {
    setFileToOpenInComputer(fileName);
    setComputerInitialTab('files');
    setShowComputerModal(true);
  };

  const handleSpeakMessage = async (text, msgIndex) => {
    if (speakingMessageIndex === msgIndex) {
      await stopCurrentSpeech();
      setSpeakingMessageIndex(null);
      return;
    }

    sounds.play('tick');
    setSpeakingMessageIndex(msgIndex);

    const voiceId = activeBot?.voiceId || '21m00Tcm4TlvDq8ikWAM';

    await speakTextWithElevenLabs({
      text,
      voiceId,
      apiKey: elevenLabsApiKey,
      speed: activeBot?.speed || 1.0,
      onStart: () => setSpeakingMessageIndex(msgIndex),
      onEnd: () => setSpeakingMessageIndex(null),
      onError: () => setSpeakingMessageIndex(null),
    });
  };

  const handleCreateBot = (newBot) => {
    const botWithDefaults = {
      ...newBot,
      voiceId: newBot.voiceId || 'TX3LPaxmHKxFdv7VOQHJ',
      libraryFiles: [
        {
          id: 'f1',
          name: `identita_${newBot.id}.md`,
          date: 'Oggi • Creato',
          size: '4.0 KB',
        },
      ],
    };
    setBots((prev) => [...prev, botWithDefaults]);
    setActiveBotId(botWithDefaults.id);
    setBotMessages((prev) => ({
      ...prev,
      [botWithDefaults.id]: [
        {
          role: 'assistant',
          content: `Ciao! Sono **${botWithDefaults.name}**. Ruolo: ${botWithDefaults.subtitle}. La mia memoria indipendente è attiva: come posso aiutarti?`,
        },
      ],
    }));
  };

  const handleVoiceTurnCompleted = useCallback(
    (userTranscript, rawBotReply) => {
      const cleanDisplay = String(rawBotReply || '')
        .replace(/<<<CREATE_BOT:[\s\S]*?>>>/g, '')
        .replace(/<<<TV_COMMAND:[\s\S]*?>>>/g, '')
        .replace(/<<<SEND_TO_BOT:[\s\S]*?>>>/g, '')
        .replace(/<<<WRITE_FILE:[\s\S]*?>>>/g, '')
        .trim();

      setBotMessages((prev) => {
        const current = prev[activeBotId] || [];
        return {
          ...prev,
          [activeBotId]: [
            ...current,
            { role: 'user', content: `🎙️ ${userTranscript}`, timestamp: 'Chiamata Vocale' },
            { role: 'assistant', content: cleanDisplay, timestamp: 'Chiamata Vocale' },
          ],
        };
      });

      executeBotSideEffects(String(rawBotReply || ''), activeBotId);
    },
    [activeBotId, executeBotSideEffects]
  );

  const handleSendMessage = async (forcedText, targetBotOverrideId = null) => {
    const text = (forcedText !== undefined ? forcedText : inputValue).trim();
    if ((!text && attachedImages.length === 0) || isStreaming) return;

    // Shortcut rapida se l'utente clicca sull'opzione per caricare i 3 agenti di esempio
    if (text === 'Carica 3 agenti di esempio (DevBot, CopyBot, ScoutBot)') {
      handleLoadDemo();
      return;
    }

    sounds.play('doubleTick');
    const currentBotId = targetBotOverrideId || activeBotId;
    const currentBotObj = bots.find((b) => b.id === currentBotId) || activeBot;
    const currentThread = botMessages[currentBotId] || [];

    const userMsg = {
      role: 'user',
      content: text,
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      timestamp: 'Adesso',
    };

    const newThread = [...currentThread, userMsg];
    setBotMessages((prev) => ({
      ...prev,
      [currentBotId]: newThread,
    }));
    if (forcedText === undefined) {
      setInputValue('');
      setAttachedImages([]);
    }
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    setBotMessages((prev) => ({
      ...prev,
      [currentBotId]: [...newThread, { role: 'assistant', content: '' }],
    }));

    try {
      let fullAssistantText = '';

      let systemPrompt = currentBotObj.systemInstruction || '';
      if (currentBotObj.isMain) {
        systemPrompt += tvLiveMemorySummary;
      }

      systemPrompt += `\n\nHAI ACCESSO DIRETTO AL TUO DISCO LOCALE (Libreria): se l'utente ti chiede di salvare un file, uno script, un documento o un appunto nella tua Libreria, aggiungi a fine risposta il tag: <<<WRITE_FILE: {"name": "nome_file.md", "content": "contenuto completo del file"}>>>.`;

      const urlMatch = text.match(/https?:\/\/[^\s)]+/i);
      if (urlMatch && urlMatch[0]) {
        try {
          const webRes = await fetch('/api/web/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlMatch[0] }),
          });
          const webData = await webRes.json();
          if (webData && webData.ok) {
            systemPrompt += `\n\n[CONTENUTO WEB LIVE ESTRATTO IN TEMPO REALE DAL LINK ${urlMatch[0]}]:\nTitolo: ${webData.title}\nContenuto:\n${webData.content}`;
          }
        } catch (_) {}
      }

      if (/meteo|notizie|news|tempo fa|oggi|cronaca|giornale|ultime ore|briefing/i.test(text)) {
        try {
          const briefRes = await fetch('/api/web/briefing');
          const briefData = await briefRes.json();
          if (briefData && briefData.ok && briefData.combined) {
            systemPrompt += `\n\n[DATI LIVE IN TEMPO REALE — METEO & GOOGLE NEWS ITALIA]:\n${briefData.combined}`;
          }
        } catch (_) {}
      }

      await streamGeminiChat({
        apiKey: geminiApiKey,
        model: 'gemini-3.5-flash-lite',
        messages: newThread,
        personaId: currentBotObj.id,
        customSystemInstruction: systemPrompt,
        signal: abortControllerRef.current.signal,
        onToken: (token, accumulated) => {
          fullAssistantText = accumulated;
          const displayClean = accumulated
            .replace(/<<<CREATE_BOT:[\s\S]*?>>>/g, '')
            .replace(/<<<TV_COMMAND:[\s\S]*?>>>/g, '')
            .replace(/<<<SEND_TO_BOT:[\s\S]*?>>>/g, '')
            .replace(/<<<WRITE_FILE:[\s\S]*?>>>/g, '')
            .trim();
          setBotMessages((prev) => {
            const thread = [...(prev[currentBotId] || [])];
            if (thread.length > 0) {
              thread[thread.length - 1] = {
                role: 'assistant',
                content: displayClean || accumulated,
              };
            }
            return { ...prev, [currentBotId]: thread };
          });
        },
      });

      const cleanFinal = fullAssistantText
        .replace(/<<<[\s\S]*?>>>/g, '')
        .trim();
      if (cleanFinal && !currentBotObj.isMain) {
        setBots((prev) =>
          prev.map((b) =>
            b.id === currentBotId
              ? { ...b, subtitle: cleanFinal.replace(/\n+/g, ' ').slice(0, 36) + '...' }
              : b
          )
        );
      }

      await executeBotSideEffects(fullAssistantText, currentBotId);
      sounds.play('chime');
      return cleanFinal;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setBotMessages((prev) => {
          const thread = [...(prev[currentBotId] || [])];
          if (thread.length > 0) {
            thread[thread.length - 1] = {
              role: 'assistant',
              content: `⚠️ ${err.message}`,
            };
          }
          return { ...prev, [currentBotId]: thread };
        });
      }
      return '';
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRunRoutine = useCallback(
    async (routine) => {
      if (!routine) return;
      const targetBotId = routine.botId || activeBotId;
      setActiveBotId(targetBotId);
      const reply = await handleSendMessage(
        `⏰ [Routine Automatica "${routine.title}"]: ${routine.prompt}`,
        targetBotId
      );
      if (routine.alsoOnTv && reply) {
        try {
          await fetch('/api/tv/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'jarvis_say',
              text: reply.slice(0, 260),
            }),
          });
        } catch (_) {}
      }
    },
    [activeBotId, geminiApiKey, bots, botMessages]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;
      const todayKey = now.toISOString().slice(0, 10);

      routines.forEach((rt) => {
        if (rt.enabled && rt.time === currentHHMM && rt.lastRunDate !== todayKey) {
          setRoutines((prev) =>
            prev.map((item) =>
              item.id === rt.id ? { ...item, lastRunDate: todayKey } : item
            )
          );
          handleRunRoutine(rt);
        }
      });
    }, 25000);
    return () => clearInterval(timer);
  }, [routines, handleRunRoutine]);

  const handleAttachImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setAttachedImages((prev) => [
          ...prev,
          {
            mimeType: file.type || 'image/png',
            base64: dataUrl.split(',')[1],
            previewUrl: dataUrl,
          },
        ]);
        sounds.play('tick');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowVoiceCallModal(true);
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      sounds.play('doubleTick');
    };

    recognition.onresult = (ev) => {
      let transcript = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        transcript += ev.results[i][0].transcript;
      }
      setInputValue(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setShowVoiceCallModal(true);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="w-screen h-screen flex bg-white overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <SidebarLeft
        bots={bots}
        activeBotId={activeBotId}
        onSelectBot={(id) => setActiveBotId(id)}
        onAddBot={() => setShowCreateModal(true)}
        onResetVirgin={handleResetVirgin}
        onLoadDemo={handleLoadDemo}
        isVirginMode={isVirginMode}
        botStatus={botStatus}
        onOpenSettings={handleOpenSettings}
        onOpenPairModal={() => setShowPairModal(true)}
      />

      <ChatCenter
        activeBot={activeBot}
        messages={activeMessages}
        inputValue={inputValue}
        onChangeInput={(e) => setInputValue(e.target.value)}
        onSendMessage={() => handleSendMessage()}
        isStreaming={isStreaming}
        isListening={isListening}
        onToggleListening={handleToggleListening}
        onStartVoiceCall={() => setShowVoiceCallModal(true)}
        attachedImages={attachedImages}
        onAttachImage={handleAttachImage}
        onSpeakMessage={handleSpeakMessage}
        onSelectOption={(opt) => handleSendMessage(opt)}
        onSelectBot={(id) => setActiveBotId(id)}
        speakingMessageIndex={speakingMessageIndex}
      />

      <SidebarRight
        activeBot={activeBot}
        onUpdateBot={(updated) =>
          setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        }
        onStartVoiceCall={() => setShowVoiceCallModal(true)}
        onOpenComputer={handleOpenComputer}
        onOpenFileInEditor={handleOpenFileInEditor}
        onCreateRoutine={() => setShowRoutineModal(true)}
        elevenLabsApiKey={elevenLabsApiKey}
        onMinimize={() => window.botParkAPI?.minimize()}
        onMaximize={() => window.botParkAPI?.toggleMaximize()}
        onClose={() => window.botParkAPI?.close()}
      />

      <CreateBotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBot}
      />

      <MobilePairModal isOpen={showPairModal} onClose={() => setShowPairModal(false)} />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenPairModal={() => setShowPairModal(true)}
        initialTab={settingsInitialTab}
        onMemoryImported={(excerpt) =>
          setTvLiveMemorySummary(
            (prev) => `${prev}\n\n[MEMORIA IMPORTATA]:\n${excerpt}`
          )
        }
      />

      <VirtualComputerModal
        isOpen={showComputerModal}
        onClose={() => setShowComputerModal(false)}
        botName={activeBot.name}
        botId={activeBot.id}
        initialTab={computerInitialTab}
        initialFileToOpen={fileToOpenInComputer}
      />

      <VoiceCallModal
        isOpen={showVoiceCallModal}
        onClose={() => setShowVoiceCallModal(false)}
        activeBot={activeBot}
        geminiApiKey={geminiApiKey}
        elevenLabsApiKey={elevenLabsApiKey}
        messages={activeMessages}
        onVoiceTurnCompleted={handleVoiceTurnCompleted}
      />

      <RoutineModal
        isOpen={showRoutineModal}
        onClose={() => setShowRoutineModal(false)}
        activeBot={activeBot}
        routines={routines}
        onAddRoutine={(newRt) => setRoutines((prev) => [newRt, ...prev])}
        onToggleRoutine={(id) =>
          setRoutines((prev) =>
            prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
          )
        }
        onDeleteRoutine={(id) =>
          setRoutines((prev) => prev.filter((r) => r.id !== id))
        }
        onRunRoutineNow={(rt) => {
          setShowRoutineModal(false);
          handleRunRoutine(rt);
        }}
      />
    </div>
  );
}


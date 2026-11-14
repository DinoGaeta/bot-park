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
import TeachModal from './components/TeachModal';
import CommandPaletteModal from './components/CommandPaletteModal';
import {
  VIRGIN_BOTS,
  KITSUNE_LABS_BOTS,
  INITIAL_BOT_MESSAGES,
} from './data/botsData';
import { sounds } from './services/soundEffects';
import { streamGeminiChat } from './services/geminiService';
import { speakTextWithElevenLabs, stopCurrentSpeech } from './services/elevenLabsService';

const checkIsMobileView = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 900 || window.location.search.includes('mobile=1'));

const STORAGE_BOTS_KEY = 'botpark_bots_v4';
const STORAGE_MESSAGES_KEY = 'botpark_messages_v4';
const STORAGE_ROUTINES_KEY = 'botpark_routines_v1';

const DEFAULT_ROUTINES = [
  {
    id: 'rt_morning_brief',
    botId: 'samantha',
    title: 'Buongiorno, Meteo Torino & News',
    time: '08:30',
    frequency: 'Ogni giorno',
    prompt:
      'Dammi il buongiorno con il meteo live di Torino e le principali notizie di oggi in Italia.',
    alsoOnTv: true,
    enabled: true,
    lastRunDate: '',
  },
  {
    id: 'rt_reel_idea',
    botId: 'giulia',
    title: 'Idea Reel Giornaliero AInpratica',
    time: '14:30',
    frequency: 'Ogni giorno',
    prompt:
      'Proponi 1 idea forte di Reel AI di oggi per AInpratica basata sulle ultime novità e delega a Italo la stesura dello script.',
    alsoOnTv: false,
    enabled: true,
    lastRunDate: '',
  },
  {
    id: 'rt_tv_check',
    botId: 'piton',
    title: 'Controllo Bridge Smart TV & Servizi',
    time: '21:00',
    frequency: 'Ogni giorno',
    prompt:
      'Fai un check rapido dello stato di sistema per la serata cinema sul salotto.',
    alsoOnTv: false,
    enabled: false,
    lastRunDate: '',
  },
];

export default function App() {
  const [isVirginMode, setIsVirginMode] = useState(false);

  // Ogni agente conserva la propria identità, istruzioni, forma, colore, memorie, skill e voce
  // Uniamo sempre i default di KITSUNE_LABS_BOTS per garantire che nessun bot perda mai il suo systemInstruction!
  const [bots, setBots] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b) => {
            const def = KITSUNE_LABS_BOTS.find((d) => d.id === b.id);
            return def
              ? {
                  ...def,
                  ...b,
                  systemInstruction: b.systemInstruction || def.systemInstruction,
                  voiceId: b.voiceId || def.voiceId,
                  color: b.color || def.color,
                }
              : b;
          });
        }
      }
    } catch {}
    return KITSUNE_LABS_BOTS;
  });

  const [activeBotId, setActiveBotId] = useState('samantha');

  // Ogni agente conserva la propria memoria conversazionale indipendente
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

  // Routine automatiche programmate
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
  const [computerInitialTab, setComputerInitialTab] = useState('tv');
  const [fileToOpenInComputer, setFileToOpenInComputer] = useState(null);
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showTeachModal, setShowTeachModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [settingsInitialTab, setSettingsInitialTab] = useState('generali');
  const [isMobileView, setIsMobileView] = useState(checkIsMobileView);
  const [mobileScreen, setMobileScreen] = useState('list'); // 'list' | 'chat' | 'details'
  const mobileScreenRef = useRef(mobileScreen);
  const isMobileViewRef = useRef(isMobileView);

  useEffect(() => {
    mobileScreenRef.current = mobileScreen;
    if (typeof window !== 'undefined') {
      window.__botParkMobileScreen = mobileScreen;
    }
  }, [mobileScreen]);

  useEffect(() => {
    isMobileViewRef.current = isMobileView;
  }, [isMobileView]);

  useEffect(() => {
    const onResize = () => setIsMobileView(checkIsMobileView());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigateMobileScreen = useCallback((nextScreen) => {
    if (nextScreen === 'chat' || nextScreen === 'details') {
      try {
        if (window.location.hash !== `#${nextScreen}`) {
          window.history.pushState({ mobileScreen: nextScreen }, '', `#${nextScreen}`);
        }
      } catch {}
    }
    setMobileScreen(nextScreen);
  }, []);

  const handleGoHome = useCallback(() => {
    sounds.play('tick');
    if (isMobileViewRef.current) {
      setMobileScreen('list');
    } else {
      setActiveBotId('samantha');
    }
  }, []);

  useEffect(() => {
    const onBackAction = () => {
      if (!isMobileViewRef.current) return;
      if (mobileScreenRef.current === 'details') {
        setMobileScreen('chat');
      } else if (mobileScreenRef.current === 'chat') {
        setMobileScreen('list');
      }
    };
    window.addEventListener('popstate', onBackAction);
    window.addEventListener('botpark-back', onBackAction);
    return () => {
      window.removeEventListener('popstate', onBackAction);
      window.removeEventListener('botpark-back', onBackAction);
    };
  }, []);

  // Helper universali per i 3 pulsanti finestra (Minimizza, Ingrandisci, Chiudi) sia in Electron che nel Browser
  const handleWindowMinimize = () => {
    sounds.play('tick');
    if (window.botParkAPI?.minimize) {
      window.botParkAPI.minimize();
    } else {
      window.blur();
    }
  };

  const handleWindowMaximize = () => {
    sounds.play('tick');
    if (window.botParkAPI?.toggleMaximize) {
      window.botParkAPI.toggleMaximize();
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleWindowClose = () => {
    sounds.play('close');
    if (window.botParkAPI?.close) {
      window.botParkAPI.close();
    } else {
      window.close();
    }
  };

  // Scorciatoia globale Ctrl+K per aprire la Ricerca Universale (Feature #4)
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sounds.play('tick');
        setShowCommandPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Chiavi API (Gemini & ElevenLabs)
  const [geminiApiKey, setGeminiApiKey] = useState(
    import.meta.env.VITE_GEMINI_API_KEY ||
      ''
  );
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(
    import.meta.env.VITE_ELEVENLABS_API_KEY ||
      ''
  );

  // Memoria live letta dalla Smart TV (172.20.10.3) + memoria_gemini.txt + ponte Antigravity
  const [tvLiveMemorySummary, setTvLiveMemorySummary] = useState('');
  const [antigravityBridgeContext, setAntigravityBridgeContext] = useState('');
  const [pushBanners, setPushBanners] = useState([]);

  // Indice messaggio in riproduzione audio
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedDocs, setAttachedDocs] = useState([]);

  const isSpeakingAudio = speakingMessageIndex !== null;
  const botStatus =
    isStreaming || isSpeakingAudio ? 'speaking' : isListening ? 'thinking' : 'idle';

  const activeBot = bots.find((b) => b.id === activeBotId) || bots[0];
  const activeMessages = botMessages[activeBotId] || [];
  const abortControllerRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const isSyncedReadyRef = useRef(false);
  const isBridgeInitRef = useRef(false);
  const seenPushIdsRef = useRef(new Set());
  const seenBridgeMsgIdsRef = useRef(new Set());

  const triggerPushNotification = useCallback(async (notif) => {
    if (!notif || !notif.id) return;
    if (seenPushIdsRef.current.has(notif.id)) return;
    seenPushIdsRef.current.add(notif.id);

    sounds.play('chime');
    setPushBanners((prev) => [notif, ...prev].slice(0, 4));
    setTimeout(() => {
      setPushBanners((prev) => prev.filter((item) => item.id !== notif.id));
    }, 7500);

    try {
      if (window.botParkAPI?.notify) {
        window.botParkAPI.notify({
          title: notif.title || 'Bot Park • Notifica Push',
          body: notif.body || '',
        });
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready.catch(() => null);
          if (reg && reg.active) {
            reg.active.postMessage({ type: 'SHOW_PUSH_NOTIFICATION', ...notif });
            return;
          }
        }
        if (!window.botParkAPI?.notify) {
          new window.Notification(notif.title || 'Bot Park', {
            body: notif.body || '',
            icon: '/bot_park_icon.png',
            tag: notif.id,
          });
        }
      }
    } catch {}
  }, []);

  // Polling automatico del ponte Antigravity + auto-sincronizzazione memoria_gemini.txt + click da notifica PWA
  useEffect(() => {
    let active = true;

    const pollBridge = async () => {
      try {
        const res = await fetch('/api/bridge/antigravity');
        const data = await res.json();
        if (!active || !data?.ok) return;

        const parts = [];
        if (data.diaryExcerpt) {
          parts.push(`\n\n[DIARIO CONDIVISO MEMORIA_GEMINI.TXT (AUTO-SINCRONIZZATO CON ANTIGRAVITY)]:\n${data.diaryExcerpt}`);
        }
        const recentBridgeMsgs = Array.isArray(data.messages) ? data.messages.slice(-8) : [];
        if (recentBridgeMsgs.length > 0) {
          const lines = recentBridgeMsgs
            .map((m) => `- [${m.timeLabel || ''}] ${m.senderName} → ${m.targetName}: ${m.message}`)
            .join('\n');
          parts.push(`\n\n[ULTIMI MESSAGGI SUL PONTE ANTIGRAVITY ↔ BOT PARK]:\n${lines}`);
        }
        setAntigravityBridgeContext(parts.join(''));

        const lastSeenTs = Number(localStorage.getItem('bot_park_last_bridge_msg_ts') || 0);
        let maxTs = lastSeenTs;

        if (!isBridgeInitRef.current) {
          isBridgeInitRef.current = true;
          (data.notifications || []).forEach((n) => {
            if (Number(n.timestamp || 0) <= lastSeenTs || n.direction !== 'antigravity_to_bot') {
              seenPushIdsRef.current.add(n.id);
            }
          });
          recentBridgeMsgs.forEach((m) => {
            if (Number(m.timestamp || 0) <= lastSeenTs || m.direction !== 'antigravity_to_bot') {
              seenBridgeMsgIdsRef.current.add(m.id);
            }
          });
        }

        const allMsgs = Array.isArray(data.messages) ? data.messages : [];
        for (const msg of allMsgs) {
          if (msg.direction === 'antigravity_to_bot' && !seenBridgeMsgIdsRef.current.has(msg.id)) {
            seenBridgeMsgIdsRef.current.add(msg.id);
            const targetId = msg.targetId || 'samantha';
            setBotMessages((prev) => ({
              ...prev,
              [targetId]: [
                ...(prev[targetId] || []),
                {
                  role: 'assistant',
                  content: `⚡ **Messaggio autonomo da Antigravity:**\n\n${msg.message}`,
                  timestamp: `Ponte Antigravity • ${msg.timeLabel || ''}`,
                },
              ],
            }));
          }
          if (Number(msg.timestamp || 0) > maxTs) {
            maxTs = Number(msg.timestamp || 0);
          }
        }

        const allNotifs = Array.isArray(data.notifications) ? data.notifications : [];
        for (const notif of allNotifs) {
          if (!seenPushIdsRef.current.has(notif.id)) {
            await triggerPushNotification(notif);
          }
          if (Number(notif.timestamp || 0) > maxTs) {
            maxTs = Number(notif.timestamp || 0);
          }
        }

        if (maxTs > lastSeenTs) {
          try {
            localStorage.setItem('bot_park_last_bridge_msg_ts', String(maxTs));
          } catch {}
        }
      } catch {}
    };

    pollBridge();
    const interval = setInterval(pollBridge, 5000);

    const onSwMessage = (ev) => {
      if (ev?.data?.type === 'BOTPARK_PUSH_CLICK' && ev.data.botId) {
        setActiveBotId(ev.data.botId);
        if (isMobileViewRef.current) navigateMobileScreen('chat');
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      active = false;
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, [triggerPushNotification]);

  // Carica i secret locali da SamanthaSecure + sincronizza TV e memoria condivisa su disco PC
  useEffect(() => {
    async function initApp() {
      try {
        if (window.botParkAPI && window.botParkAPI.getSecrets) {
          try {
            const secrets = await window.botParkAPI.getSecrets();
            if (secrets) {
              if (secrets.geminiApiKey) setGeminiApiKey(secrets.geminiApiKey);
              if (secrets.elevenLabsApiKey) setElevenLabsApiKey(secrets.elevenLabsApiKey);
            }
          } catch (_) {}
        }

        try {
          const res = await fetch('/api/tv/status');
          const data = await res.json();
          if (data && data.ok && Array.isArray(data.history) && data.history.length > 0) {
            const formatted = data.history
              .map((t) => `- Dion (su TV): "${t.user}" -> Samantha TV: "${t.jarvis}"`)
              .join('\n');
            setTvLiveMemorySummary(
              `\n\nULTIME CONVERSAZIONI REALI SINCRONIZZATE DALLA SMART TV DI DION (172.20.10.3 - App aperta ora: ${data.currentApp}):\n${formatted}`
            );
          }
        } catch (_) {}

        // Sincronizza memorie agenti, skill e chat salvate sul disco del PC tra Electron, Browser desktop e Mobile LAN
        const isMobileClient =
          window.innerWidth < 768 || window.location.search.includes('mobile=1');
        const hadLocalBots = Boolean(localStorage.getItem(STORAGE_BOTS_KEY));
        const localSyncAt = Number(localStorage.getItem('bot_park_last_sync_at') || 0);

        try {
          const syncRes = await fetch('/api/mobile/sync');
          const syncData = await syncRes.json();
          if (syncData?.ok && syncData.state) {
            const diskUpdatedAt = Number(syncData.state.updatedAt || 0);
            const shouldHydrateFromDisk =
              isMobileClient || !hadLocalBots || diskUpdatedAt > localSyncAt;

            if (shouldHydrateFromDisk) {
              if (Array.isArray(syncData.state.bots) && syncData.state.bots.length > 0) {
                setBots(
                  syncData.state.bots.map((b) => {
                    const def = KITSUNE_LABS_BOTS.find((d) => d.id === b.id);
                    return def
                      ? {
                          ...def,
                          ...b,
                          systemInstruction: b.systemInstruction || def.systemInstruction,
                          voiceId: b.voiceId || def.voiceId,
                          color: b.color || def.color,
                        }
                      : b;
                  })
                );
              }
              if (syncData.state.botMessages && typeof syncData.state.botMessages === 'object') {
                setBotMessages(syncData.state.botMessages);
              }
              if (Array.isArray(syncData.state.routines) && syncData.state.routines.length > 0) {
                setRoutines(syncData.state.routines);
              }
              if (diskUpdatedAt > 0) {
                localStorage.setItem('bot_park_last_sync_at', String(diskUpdatedAt));
              }
            }

            if (syncData.state.geminiApiKey) {
              setGeminiApiKey((prev) => prev || syncData.state.geminiApiKey);
            }
            if (syncData.state.elevenLabsApiKey) {
              setElevenLabsApiKey((prev) => prev || syncData.state.elevenLabsApiKey);
            }
          }
        } catch (_) {}

        sounds.play('open');
      } finally {
        isSyncedReadyRef.current = true;
      }
    }
    initApp();
  }, []);

  // Sincronizza automaticamente in background lo stato con il disco del PC (/api/mobile/sync -> _mobile_sync_state.json + memoria_agente.md)
  useEffect(() => {
    if (!isSyncedReadyRef.current) return;
    const timer = setTimeout(() => {
      fetch('/api/mobile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bots,
          botMessages,
          routines,
          geminiApiKey,
          elevenLabsApiKey,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.updatedAt) {
            try {
              localStorage.setItem('bot_park_last_sync_at', String(data.updatedAt));
            } catch {}
          }
        })
        .catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [bots, botMessages, routines, geminiApiKey, elevenLabsApiKey]);

  // Esegue tag <<<CREATE_BOT>>>, <<<TV_COMMAND>>>, <<<SEND_TO_BOT>>>, <<<WRITE_FILE>>> e <<<REMEMBER>>>
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
                `Sei ${botData.name}, agente specializzato di Dion in kitsune Labs, con identità e memoria indipendenti.`,
              voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
              voice: 'Liam (Steve/Spielberg)',
              speed: '1.15x',
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
                  content: `Ciao Dion! Sono **${newBot.name}** (${newBot.subtitle}). La mia identità e la mia memoria sono pronte. Da dove partiamo?`,
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

      // 2. Auto-Learning Memoria del Bot (<<<REMEMBER: "fatto da ricordare">>>)
      if (fullAssistantText.includes('<<<REMEMBER:')) {
        const memMatch = fullAssistantText.match(/<<<REMEMBER:\s*"?([^">]+)"?\s*>>>/);
        if (memMatch && memMatch[1]) {
          const fact = memMatch[1].trim();
          setBots((prev) =>
            prev.map((b) =>
              b.id === senderBotId
                ? {
                    ...b,
                    memories: [
                      {
                        id: `mem_${Date.now()}`,
                        text: fact,
                        date: new Date().toLocaleDateString('it-IT'),
                      },
                      ...(b.memories || []),
                    ],
                  }
                : b
            )
          );
        }
      }

      // 3. Scrittura reale di un file nel workspace dell'Agente
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

      // 4. Messaggio / Delega Inter-Agente
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
                      text: `Messaggio inviato a ${targetBot.name} • Apri chat`,
                      targetBotId: targetBot.id,
                    },
                  };
                }
                return { ...prev, [senderBotId]: senderThread };
              });

              const incomingNote = `[Messaggio dal collega ${senderBot?.name || 'Samantha'}]: ${payload.message}`;
              const targetThread = [
                ...(botMessages[targetBot.id] || []),
                {
                  role: 'user',
                  content: incomingNote,
                  timestamp: `Da ${senderBot?.name || 'Samantha'}`,
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
                customSystemInstruction: `IDENTITÀ ASSOLUTA: Tu sei ${targetBot.name} (${targetBot.subtitle}).\n${targetBot.systemInstruction}`,
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

              try {
                const pushRes = await fetch('/api/bridge/antigravity', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    direction: 'bot_to_bot',
                    senderId: senderBot?.id || senderBotId,
                    senderName: senderBot?.name || senderBotId,
                    senderColor: senderBot?.color || '#FF3B9A',
                    targetId: targetBot.id,
                    targetName: targetBot.name,
                    message: `${payload.message} → ${cleanReply.slice(0, 120)}`,
                  }),
                });
                const pushData = await pushRes.json();
                if (pushData?.notification) {
                  await triggerPushNotification(pushData.notification);
                }
              } catch {}
            }
          } catch (e) {
            console.error('Errore invio messaggio inter-bot:', e);
          }
        }
      }

      // 5. Comando reale verso la Smart TV Android (172.20.10.3:5555)
      if (fullAssistantText.includes('<<<TV_COMMAND:')) {
        const tvMatch = fullAssistantText.match(/<<<TV_COMMAND:\s*(\{[\s\S]*?\})\s*>>>/);
        if (tvMatch && tvMatch[1]) {
          try {
            const rawTvCmd = JSON.parse(tvMatch[1]);
            const senderBot = bots.find((b) => b.id === senderBotId);
            const tvCmd = {
              ...rawTvCmd,
              botName: rawTvCmd.botName || senderBot?.name || 'Samantha',
              botColor: rawTvCmd.botColor || senderBot?.color || '#FF3B9A',
              botShape: rawTvCmd.botShape || senderBot?.avatarShape || 'pebble',
              voiceId: rawTvCmd.voiceId || senderBot?.voiceId || '',
            };
            const res = await fetch('/api/tv/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tvCmd),
            });
            const data = await res.json();
            if (data && data.ok) {
              const chipText = data.tvReply
                ? `${tvCmd.botName} su TV: «${data.tvReply}»`
                : `Comando TV eseguito da ${tvCmd.botName}: ${tvCmd.type} (${tvCmd.app || tvCmd.key || tvCmd.text || 'OK'})`;

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

      // 6. Comunicazione autonoma verso Antigravity (<<<SEND_TO_ANTIGRAVITY: {...}>>>)
      if (fullAssistantText.includes('<<<SEND_TO_ANTIGRAVITY:')) {
        const agMatch = fullAssistantText.match(/<<<SEND_TO_ANTIGRAVITY:\s*([\s\S]*?)\s*>>>/);
        if (agMatch && agMatch[1]) {
          try {
            let agMessage = '';
            const rawInner = agMatch[1].trim();
            if (rawInner.startsWith('{')) {
              const parsed = JSON.parse(rawInner);
              agMessage = String(parsed.message || parsed.text || '').trim();
            } else {
              agMessage = rawInner.replace(/^["']|["']$/g, '').trim();
            }
            const senderBot = bots.find((b) => b.id === senderBotId);
            if (agMessage) {
              const res = await fetch('/api/bridge/antigravity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  direction: 'bot_to_antigravity',
                  senderId: senderBot?.id || senderBotId,
                  senderName: senderBot?.name || senderBotId,
                  senderColor: senderBot?.color || '#FF3B9A',
                  targetId: 'antigravity',
                  targetName: 'Antigravity',
                  message: agMessage,
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
                        icon: '🛰️',
                        text: 'Inviato ad Antigravity • Notifica Push inviata',
                      },
                    };
                  }
                  return { ...prev, [senderBotId]: thread };
                });
                if (data.notification) {
                  await triggerPushNotification(data.notification);
                }
              }
            }
          } catch (e) {
            console.error('Errore invio messaggio ad Antigravity:', e);
          }
        }
      }
    },
    [bots, botMessages, geminiApiKey, triggerPushNotification]
  );

  // Passa a Versione Vergine Pulita
  const handleResetVirgin = () => {
    setIsVirginMode(true);
    setBots(VIRGIN_BOTS);
    setActiveBotId('samantha');
    const cleanMsgs = {
      samantha: [
        {
          role: 'assistant',
          content:
            'Area di lavoro ripulita, Dion! Sono **Samantha**, la tua **Capo Bot**. Ho con me tutta la nostra memoria e il controllo della Smart TV. Chiedimi pure di creare nuovi bot per la squadra o di gestire il salotto!',
        },
      ],
    };
    setBotMessages(cleanMsgs);
    localStorage.removeItem(STORAGE_BOTS_KEY);
    localStorage.removeItem(STORAGE_MESSAGES_KEY);
    sounds.play('success');
  };

  // Carica Squadra Completa Kitsune Labs
  const handleLoadDemo = () => {
    setIsVirginMode(false);
    setBots(KITSUNE_LABS_BOTS);
    setBotMessages(INITIAL_BOT_MESSAGES);
    setActiveBotId('samantha');
    sounds.play('tick');
  };

  const handleOpenSettings = (tab = 'generali') => {
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  };

  const handleOpenComputer = (tab = 'tv') => {
    setFileToOpenInComputer(null);
    setComputerInitialTab(typeof tab === 'string' ? tab : 'tv');
    setShowComputerModal(true);
  };

  const handleOpenFileInEditor = (fileName) => {
    setFileToOpenInComputer(fileName);
    setComputerInitialTab('files');
    setShowComputerModal(true);
  };

  // Riproduzione Vocale ElevenLabs con la voce specifica dell'Agente
  const handleSpeakMessage = async (text, msgIndex) => {
    if (speakingMessageIndex === msgIndex) {
      await stopCurrentSpeech();
      setSpeakingMessageIndex(null);
      return;
    }

    sounds.play('tick');
    setSpeakingMessageIndex(msgIndex);

    const voiceId = activeBot?.voiceId || 'CiwzbDpaN3pQXjTgx3ML';

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

  // Creazione Nuovo Bot tramite Modale
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
          content: `Ciao Dion! Sono **${botWithDefaults.name}**, appena forgiato insieme a Samantha. Ruolo: ${botWithDefaults.subtitle}. La mia memoria indipendente è attiva: come posso aiutarti?`,
        },
      ],
    }));
  };

  // Salva un turno completato nella Chiamata Vocale Live dentro la chat dell'Agente
  const handleVoiceTurnCompleted = useCallback(
    (userTranscript, rawBotReply) => {
      const cleanDisplay = String(rawBotReply || '')
        .replace(/<<<HANG_UP>>>/g, '')
        .replace(/<<<CREATE_BOT:[\s\S]*?>>>/g, '')
        .replace(/<<<TV_COMMAND:[\s\S]*?>>>/g, '')
        .replace(/<<<SEND_TO_BOT:[\s\S]*?>>>/g, '')
        .replace(/<<<WRITE_FILE:[\s\S]*?>>>/g, '')
        .replace(/<<<REMEMBER:[\s\S]*?>>>/g, '')
        .replace(/<<<SEND_TO_ANTIGRAVITY:[\s\S]*?>>>/g, '')
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

  // Cattura istantanea dello schermo PC Windows di Dion e lo allega in chat (Feature #5)
  const handleCapturePcScreen = async () => {
    sounds.play('tick');
    try {
      const res = await fetch('/api/pc/screenshot');
      const data = await res.json();
      if (data && data.ok && data.base64) {
        setAttachedImages((prev) => [
          ...prev,
          {
            mimeType: 'image/jpeg',
            base64: data.base64,
            previewUrl: data.dataUrl,
          },
        ]);
        if (!inputValue.trim()) {
          setInputValue('Guarda il mio schermo PC in questo momento: ');
        }
        sounds.play('success');
      }
    } catch (e) {
      alert('Impossibile catturare lo schermo PC: ' + e.message);
    }
  };

  // Invio Messaggio all'Agente attivo
  const handleSendMessage = async (forcedText, targetBotOverrideId = null) => {
    const text = (forcedText !== undefined ? forcedText : inputValue).trim();
    if ((!text && attachedImages.length === 0 && attachedDocs.length === 0) || isStreaming)
      return;

    sounds.play('doubleTick');
    const currentBotId = targetBotOverrideId || activeBotId;
    const currentBotObj = bots.find((b) => b.id === currentBotId) || activeBot;
    const currentThread = botMessages[currentBotId] || [];

    const docsSnapshot = [...attachedDocs];
    const userMsg = {
      role: 'user',
      content: text || (docsSnapshot.length > 0 ? `Allegato: ${docsSnapshot.map((d) => d.name).join(', ')}` : 'Immagine allegata'),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      docs: docsSnapshot.length > 0 ? docsSnapshot : undefined,
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
      setAttachedDocs([]);
    }
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    setBotMessages((prev) => ({
      ...prev,
      [currentBotId]: [...newThread, { role: 'assistant', content: '' }],
    }));

    try {
      let fullAssistantText = '';

      const identityHeader =
        currentBotObj.id !== 'samantha'
          ? `IDENTITÀ ASSOLUTA DELL'AGENTE: Tu sei ESCLUSIVAMENTE "${currentBotObj.name}" (${currentBotObj.subtitle}). NON sei Samantha! Rispondi sempre con la personalità, il ruolo e lo stile di ${currentBotObj.name}.\n\n`
          : '';

      let systemPrompt = `${identityHeader}${currentBotObj.systemInstruction || ''}`;
      if (currentBotObj.isMain || currentBotObj.id === 'samantha') {
        systemPrompt += tvLiveMemorySummary;
      }
      if (antigravityBridgeContext) {
        systemPrompt += antigravityBridgeContext;
      }

      // Inietta Memorie e Skill insegnate a questo specifico Bot (Feature #1 & #2)
      if (Array.isArray(currentBotObj.memories) && currentBotObj.memories.length > 0) {
        systemPrompt += `\n\n[MEMORIE SPECIFICHE DI ${currentBotObj.name.toUpperCase()}]:\n${currentBotObj.memories
          .map((m) => `- ${m.text}`)
          .join('\n')}`;
      }
      if (Array.isArray(currentBotObj.skills) && currentBotObj.skills.length > 0) {
        systemPrompt += `\n\n[SKILL & PROCEDURE INSEGNATE A ${currentBotObj.name.toUpperCase()}]:\n${currentBotObj.skills
          .map((s) => `- ${s.title}: ${s.steps}`)
          .join('\n')}`;
      }

      // Se l'utente ha allegato documenti (.txt, .md, .csv, .json, .pdf, codice), iniettiamoli nel contesto
      if (docsSnapshot.length > 0) {
        systemPrompt += `\n\n[DOCUMENTI ALLEGATI DALL'UTENTE IN QUESTO MESSAGGIO]:\n${docsSnapshot
          .map((d) => `--- FILE: ${d.name} ---\n${d.content}`)
          .join('\n\n')}`;
      }

      // Istruzioni operative per salvataggio file, delega @menzioni, auto-apprendimento memoria e ponte Antigravity
      systemPrompt += `\n\nCOMANDI SPECIALI A TUA DISPOSIZIONE:
- Se Dion ti chiede di salvare un file/script/documento nella tua Libreria su disco, aggiungi a fine risposta: <<<WRITE_FILE: {"name": "nome_file.md", "content": "contenuto completo"}>>>
- Se Dion ti insegna una preferenza permanente o ti chiede di ricordare una regola, aggiungi a fine risposta: <<<REMEMBER: "regola o fatto da ricordare">>>
- Se Dion menziona un altro collega con @NomeBot o ti chiede di delegare a un collega, aggiungi a fine risposta: <<<SEND_TO_BOT: {"targetId": "nome_bot_minuscolo", "message": "compito da svolgere"}>>>
- Se Dion ti chiede di contattare/avvisare Antigravity o delegargli un'operazione tecnica sul PC, aggiungi a fine risposta: <<<SEND_TO_ANTIGRAVITY: {"message": "messaggio chiaro per Antigravity"}>>>`;

      // 1. Se il messaggio contiene un URL http/https, scarichiamo il contenuto live!
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

      // 2. Se il messaggio chiede meteo, notizie, briefing di oggi o Torino, iniettiamo i dati live!
      if (/meteo|notizie|news|tempo fa|oggi|cronaca|torino|giornale|ultime ore|briefing/i.test(text)) {
        try {
          const briefRes = await fetch('/api/web/briefing');
          const briefData = await briefRes.json();
          if (briefData && briefData.ok && briefData.combined) {
            systemPrompt += `\n\n[DATI LIVE IN TEMPO REALE — METEO TORINO & GOOGLE NEWS ITALIA]:\n${briefData.combined}`;
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
            .replace(/<<<REMEMBER:[\s\S]*?>>>/g, '')
            .replace(/<<<SEND_TO_ANTIGRAVITY:[\s\S]*?>>>/g, '')
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
              content: `⚠️ Errore di connessione: ${err.message}`,
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

  // Esecuzione reale di una Routine (manuale o automatica da scheduler)
  const handleRunRoutine = useCallback(
    async (routine) => {
      if (!routine) return;
      const targetBotId = routine.botId || activeBotId;
      const targetBotObj = bots.find((b) => b.id === targetBotId) || activeBot;
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
              type: 'samantha_speak',
              text: reply.slice(0, 260),
              voiceId: targetBotObj?.voiceId || 'CiwzbDpaN3pQXjTgx3ML',
              botName: targetBotObj?.name || 'Samantha',
              botColor: targetBotObj?.color || '#0B0B0D',
              botShape: targetBotObj?.avatarShape || 'pebble',
            }),
          });
        } catch (_) {}
      }
    },
    [activeBotId, geminiApiKey, bots, botMessages]
  );

  // Scheduler in background: controlla ogni 25 secondi se una routine attiva deve scattare all'orario HH:MM
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

  // Allegati immagini E documenti (.pdf, .txt, .md, .csv, .json, codice)
  const handleAttachImage = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
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
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const textContent = String(ev.target.result || '').slice(0, 12000);
          setAttachedDocs((prev) => [
            ...prev,
            {
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              content: textContent,
            },
          ]);
          sounds.play('tick');
        };
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (type, index) => {
    sounds.play('tick');
    if (type === 'image') {
      setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAttachedDocs((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Dettatura Vocale rapida nella barra di testo
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
    <div className="w-screen h-[100dvh] flex bg-white overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] relative">
      {/* Dynamic Island Overlay Notifiche Push per Comunicazioni Autonome */}
      {pushBanners.length > 0 && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[250] flex flex-col gap-2 w-[92vw] max-w-[440px] pointer-events-none">
          {pushBanners.map((banner) => (
            <div
              key={banner.id}
              onClick={() => {
                if (banner.botId && bots.some((b) => b.id === banner.botId)) {
                  setActiveBotId(banner.botId);
                  if (isMobileView) navigateMobileScreen('chat');
                }
                setPushBanners((prev) => prev.filter((item) => item.id !== banner.id));
              }}
              className="pointer-events-auto bg-[#111216]/95 backdrop-blur-md text-white border border-white/15 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-start gap-3 cursor-pointer hover:bg-[#191b22] transition-all"
            >
              <span
                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: banner.senderColor || '#FF3B9A' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{banner.title}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{banner.timeLabel || ''}</span>
                </div>
                {banner.body && (
                  <p className="text-[11.5px] text-gray-300 line-clamp-2 mt-0.5 leading-snug">
                    {banner.body}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setPushBanners((prev) => prev.filter((item) => item.id !== banner.id));
                }}
                className="text-gray-400 hover:text-white text-xs font-bold px-1 cursor-pointer shrink-0"
                title="Chiudi notifica"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 1. Sidebar Sinistra (Samantha Capo Bot in cima + Teammates Indipendenti) */}
      {(!isMobileView || mobileScreen === 'list') && (
        <SidebarLeft
          bots={bots}
          activeBotId={activeBotId}
          onSelectBot={(id) => {
            setActiveBotId(id);
            if (isMobileView) navigateMobileScreen('chat');
          }}
          onAddBot={() => setShowCreateModal(true)}
          onOpenSearch={() => setShowCommandPalette(true)}
          onUpdateBot={(updated) =>
            setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }
          onDeleteBot={(botIdToDelete) => {
            setBots((prev) => prev.filter((b) => b.id !== botIdToDelete));
            setBotMessages((prev) => {
              const next = { ...prev };
              delete next[botIdToDelete];
              return next;
            });
            if (activeBotId === botIdToDelete) {
              setActiveBotId('samantha');
            }
          }}
          onClearBotChat={(botIdToClear) => {
            const botObj = bots.find((b) => b.id === botIdToClear);
            setBotMessages((prev) => ({
              ...prev,
              [botIdToClear]: [
                {
                  role: 'assistant',
                  content: `Cronologia chat azzerata. Ciao Dion, sono **${botObj?.name || 'il tuo Bot'}**, pronto a ripartire!`,
                },
              ],
            }));
          }}
          botStatus={botStatus}
          onOpenSettings={handleOpenSettings}
          onOpenPairModal={() => setShowPairModal(true)}
          isMobile={isMobileView}
        />
      )}

      {/* 2. Centro Chat (con colore dinamico dell'Agente, Pill cliccabile, @menzioni, Canvas a schermo intero e allegati multi-formato) */}
      {(!isMobileView || mobileScreen === 'chat') && (
        <ChatCenter
          activeBot={activeBot}
          bots={bots}
          messages={activeMessages}
          inputValue={inputValue}
          onChangeInput={(e) => setInputValue(e.target.value)}
          onSendMessage={() => handleSendMessage()}
          isStreaming={isStreaming}
          isListening={isListening}
          onToggleListening={handleToggleListening}
          onStartVoiceCall={() => setShowVoiceCallModal(true)}
          attachedImages={attachedImages}
          attachedDocs={attachedDocs}
          onAttachImage={handleAttachImage}
          onRemoveAttachment={handleRemoveAttachment}
          onCapturePcScreen={handleCapturePcScreen}
          onOpenSearch={() => setShowCommandPalette(true)}
          onSpeakMessage={handleSpeakMessage}
          onSelectOption={(opt) => handleSendMessage(opt)}
          onSelectBot={(id) => {
            setActiveBotId(id);
            if (isMobileView) navigateMobileScreen('chat');
          }}
          speakingMessageIndex={speakingMessageIndex}
          isRightSidebarOpen={isMobileView ? mobileScreen === 'details' : isRightSidebarOpen}
          onToggleRightSidebar={() => {
            if (isMobileView) {
              navigateMobileScreen(mobileScreen === 'details' ? 'chat' : 'details');
            } else {
              setIsRightSidebarOpen((v) => !v);
            }
          }}
          onMinimize={handleWindowMinimize}
          onMaximize={handleWindowMaximize}
          onCloseWindow={handleWindowClose}
          isMobile={isMobileView}
          onMobileBack={() => setMobileScreen('list')}
          onGoHome={handleGoHome}
        />
      )}

      {/* 3. Sidebar Destra a scomparsa (aperta dalla Pill centrale con Nome Bot >, chiusa dal cerchio ( X ) "Chiudi") */}
      {(isMobileView ? mobileScreen === 'details' : isRightSidebarOpen) && (
        <SidebarRight
          activeBot={activeBot}
          onUpdateBot={(updated) =>
            setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }
          onStartVoiceCall={() => setShowVoiceCallModal(true)}
          onOpenComputer={handleOpenComputer}
          onOpenFileInEditor={handleOpenFileInEditor}
          onCreateRoutine={() => setShowRoutineModal(true)}
          onOpenTeachModal={() => setShowTeachModal(true)}
          onRunTaskInChat={(taskText) => {
            if (isMobileView) navigateMobileScreen('chat');
            handleSendMessage(taskText);
          }}
          elevenLabsApiKey={elevenLabsApiKey}
          onCloseSidebarRight={() => {
            if (isMobileView) {
              setMobileScreen('chat');
            } else {
              setIsRightSidebarOpen(false);
            }
          }}
          onMinimize={handleWindowMinimize}
          onMaximize={handleWindowMaximize}
          onCloseWindow={handleWindowClose}
          isMobile={isMobileView}
          onGoHome={handleGoHome}
        />
      )}

      {/* 4. Modale Creazione Nuovo Agente */}
      <CreateBotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBot}
      />

      {/* 5. Modale Accoppiamento Mobile via QR Code */}
      <MobilePairModal isOpen={showPairModal} onClose={() => setShowPairModal(false)} />

      {/* 6. Modale Impostazioni Ufficiale (con Cassaforte reale e Importazione Memoria) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenPairModal={() => setShowPairModal(true)}
        initialTab={settingsInitialTab}
        geminiApiKey={geminiApiKey}
        elevenLabsApiKey={elevenLabsApiKey}
        onSaveApiKeys={(newGemini, newEleven) => {
          setGeminiApiKey(newGemini);
          setElevenLabsApiKey(newEleven);
          if (window.botParkAPI?.saveSecrets) {
            window.botParkAPI.saveSecrets({ geminiApiKey: newGemini, elevenLabsApiKey: newEleven });
          }
        }}
        activeBotId={activeBot.id}
        activeBotName={activeBot.name}
        onMemoryImported={(excerpt) =>
          setTvLiveMemorySummary(
            (prev) => `${prev}\n\n[DIARIO MEMORIA_GEMINI.TXT SINCRONIZZATO]:\n${excerpt}`
          )
        }
        onTestPushNotification={async () => {
          const res = await fetch('/api/bridge/antigravity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              direction: 'system_test',
              senderId: activeBot.id,
              senderName: activeBot.name,
              senderColor: activeBot.color,
              targetId: activeBot.id,
              targetName: activeBot.name,
              message:
                'Ponte Antigravity e Notifiche Push attivi su Desktop, Web e Mobile!',
            }),
          });
          const data = await res.json();
          if (data?.notification) {
            await triggerPushNotification(data.notification);
          }
        }}
      />

      {/* 7. Virtual Computer Reale (Terminale, File Manager su Disco, Browser Live + Controllo Smart TV Android) */}
      <VirtualComputerModal
        isOpen={showComputerModal}
        onClose={() => setShowComputerModal(false)}
        botName={activeBot.name}
        botId={activeBot.id}
        botColor={activeBot.color}
        botShape={activeBot.avatarShape}
        initialTab={computerInitialTab}
        initialFileToOpen={fileToOpenInComputer}
      />

      {/* 8. Chiamata Vocale Live con Barge-In, Identità Indipendente & Uscita Reale Voce su TV */}
      <VoiceCallModal
        isOpen={showVoiceCallModal}
        onClose={() => setShowVoiceCallModal(false)}
        activeBot={activeBot}
        geminiApiKey={geminiApiKey}
        elevenLabsApiKey={elevenLabsApiKey}
        messages={activeMessages}
        onVoiceTurnCompleted={handleVoiceTurnCompleted}
      />

      {/* 9. Modale Routine Programmate & Scheduler Giornaliero */}
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

      {/* 10. Modale "Insegna un'attività" (Teach Mode + Registrazione Schermo PC) */}
      <TeachModal
        isOpen={showTeachModal}
        onClose={() => setShowTeachModal(false)}
        activeBot={activeBot}
        onSaveSkill={(newSkill) => {
          setBots((prev) =>
            prev.map((b) =>
              b.id === activeBot.id
                ? { ...b, skills: [newSkill, ...(b.skills || [])] }
                : b
            )
          );
        }}
      />

      {/* 11. Ricerca Universale Ctrl+K */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        bots={bots}
        botMessages={botMessages}
        onSelectBot={(id) => setActiveBotId(id)}
        onOpenSettings={handleOpenSettings}
        onOpenRoutine={() => setShowRoutineModal(true)}
        onOpenTeach={() => setShowTeachModal(true)}
        onOpenComputer={handleOpenComputer}
      />
    </div>
  );
}

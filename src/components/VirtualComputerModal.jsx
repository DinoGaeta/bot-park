import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Square as MaximizeIcon,
  Minimize2,
  Terminal,
  Globe,
  Folder,
  FileCode,
  Eye,
  MousePointer,
  Tv,
  RefreshCw,
  Mic,
  Volume2,
  VolumeX,
  Power,
  Home,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Radio,
  Plus,
  Save,
  Trash2,
  Search,
  Newspaper,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

const QUICK_TV_APPS = [
  { id: 'youtube', label: 'YouTube TV', color: 'bg-red-600/20 text-red-400 border-red-500/30' },
  { id: 'spotify', label: 'Spotify', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
  { id: 'stremio', label: 'Stremio', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' },
  { id: 'netflix', label: 'Netflix', color: 'bg-rose-600/20 text-rose-400 border-rose-500/30' },
  { id: 'disney', label: 'Disney+', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  { id: 'prime', label: 'Prime Video', color: 'bg-sky-600/20 text-sky-400 border-sky-500/30' },
  { id: 'tivimate', label: 'TiviMate TV', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  { id: 'raiplay', label: 'RaiPlay', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' },
];

export default function VirtualComputerModal({
  isOpen,
  onClose,
  botId = 'samantha',
  botName = 'Samantha',
  botColor = '#FF3B9A',
  botShape = 'pebble',
  initialTab = null,
  initialFileToOpen = null,
  onFilesUpdated,
}) {
  // Stato connessione iniziale ("Connessione in corso" identica a Screenshot 2)
  const [isConnecting, setIsConnecting] = useState(true);
  // Controllo desktop ("Visualizzazione | Prendi il controllo" <-> "Hai il controllo | Interrompi")
  const [hasControl, setHasControl] = useState(false);
  // Finestra attualmente aperta sul Desktop Linux ('none' = mostra lo sfondo grigio di Screenshot 3, 'chrome' = Screenshot 4, 'files', 'terminal', 'tv')
  const [openWindow, setOpenWindow] = useState('none');
  const [isWindowMaximized, setIsWindowMaximized] = useState(true);
  // Orologio live nella taskbar tint2 in basso a destra ("Wed Nov 11  12:24 AM")
  const [clockText, setClockText] = useState('');

  // Schede vere di Google Chrome
  const [chromeTabs, setChromeTabs] = useState([
    {
      id: 'tab-1',
      title: 'New Tab',
      url: 'google://newtab',
      inputUrl: '',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [webFallbackHtml, setWebFallbackHtml] = useState('');
  const [isLoadingWeb, setIsLoadingWeb] = useState(false);
  const webviewRef = useRef(null);

  const isElectron =
    typeof window !== 'undefined' &&
    Boolean(window.botParkAPI || navigator.userAgent.toLowerCase().includes('electron'));

  // 1. Stato Terminale Reale
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: `Linux sand-box 6.6.87-x86_64 — Workspace per ${botName} (${botId})` },
    { type: 'success', text: `✔ Connesso al filesystem locale: workspaces/${botId}` },
  ]);
  const [cmdInput, setCmdInput] = useState('');
  const [isRunningCmd, setIsRunningCmd] = useState(false);

  // 2. Stato File Manager Reale su Disco (pcmanfm)
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [workspacePath, setWorkspacePath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileSavedMsg, setFileSavedMsg] = useState('');
  const [newFileName, setNewFileName] = useState('');

  // 3. Stato Android TV Reale
  const [tvStatus, setTvStatus] = useState({
    connected: false,
    serial: '172.20.10.3:5555',
    currentApp: 'Verifica connessione...',
    history: [],
  });
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);
  const [autoRefreshTv, setAutoRefreshTv] = useState(true);
  const [tvQueryInput, setTvQueryInput] = useState('');
  const [tvCommandStatus, setTvCommandStatus] = useState('');
  const [isSendingTvCmd, setIsSendingTvCmd] = useState(false);

  // Orologio in stile tint2 ("Wed Nov 11  12:24 AM")
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dayNum = now.getDate();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setClockText(`${dayName} ${monthName} ${dayNum}  ${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const t = setInterval(updateClock, 10000);
    return () => clearInterval(t);
  }, []);

  // Carica i veri file dal disco per il bot corrente
  const loadWorkspaceFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/fs/list?botId=${encodeURIComponent(botId)}`);
      const data = await res.json();
      if (data && data.ok) {
        setWorkspaceFiles(data.files || []);
        setWorkspacePath(data.workspacePath || '');
        if (onFilesUpdated) onFilesUpdated(data.files || []);
      }
    } catch {}
  }, [botId, onFilesUpdated]);

  const openDiskFile = useCallback(
    async (fileName) => {
      try {
        const res = await fetch(
          `/api/fs/read?botId=${encodeURIComponent(botId)}&name=${encodeURIComponent(fileName)}`
        );
        const data = await res.json();
        if (data && data.ok) {
          setSelectedFile(data.name);
          setFileContent(data.content || '');
          setOpenWindow('files');
          setHasControl(true);
        }
      } catch {}
    },
    [botId]
  );

  // Effetto "Connessione in corso" all'apertura come nello Screenshot 2
  useEffect(() => {
    if (!isOpen) return;
    setIsConnecting(true);
    loadWorkspaceFiles();

    const timer = setTimeout(() => {
      setIsConnecting(false);
      if (initialFileToOpen) {
        openDiskFile(initialFileToOpen);
      } else if (initialTab === 'files') {
        setOpenWindow('files');
      } else if (initialTab === 'terminal') {
        setOpenWindow('terminal');
      } else if (initialTab === 'browser') {
        setOpenWindow('chrome');
      } else {
        // Parte mostrando il Desktop pulito (Screenshot 3) o Chrome se già aperto
        setOpenWindow('none');
      }
    }, 950);

    return () => clearTimeout(timer);
  }, [isOpen, initialTab, initialFileToOpen, loadWorkspaceFiles, openDiskFile]);

  const fetchTvStatusAndScreen = useCallback(async (withScreen = true) => {
    try {
      const res = await fetch('/api/tv/status');
      const data = await res.json();
      if (data && data.ok) {
        setTvStatus({
          connected: data.connected,
          serial: data.serial,
          currentApp: data.currentApp || 'Android TV',
          history: data.history || [],
        });
      }
    } catch {
      setTvStatus((prev) => ({ ...prev, connected: false }));
    }

    if (withScreen) {
      setIsLoadingScreen(true);
      setScreenshotUrl(`/api/tv/screenshot?t=${Date.now()}`);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || openWindow !== 'tv') return;
    fetchTvStatusAndScreen(true);
    if (!autoRefreshTv) return;
    const interval = setInterval(() => {
      fetchTvStatusAndScreen(true);
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen, openWindow, autoRefreshTv, fetchTvStatusAndScreen]);

  // Sincronizza la barra degli indirizzi e il titolo scheda quando l'utente naviga nel proxy web
  useEffect(() => {
    if (!isOpen || isElectron) return;
    const onProxyNav = (ev) => {
      if (ev?.data?.type !== 'BOTPARK_PROXY_NAV' || !ev.data.url) return;
      setChromeTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                inputUrl: ev.data.url,
                title: ev.data.title || t.title,
              }
            : t
        )
      );
      setIsLoadingWeb(false);
    };
    window.addEventListener('message', onProxyNav);
    return () => window.removeEventListener('message', onProxyNav);
  }, [isOpen, isElectron, activeTabId]);

  if (!isOpen) return null;

  const activeChromeTab =
    chromeTabs.find((t) => t.id === activeTabId) || chromeTabs[0];

  const updateActiveChromeTab = (patch) => {
    setChromeTabs((prev) =>
      prev.map((t) => (t.id === activeChromeTab.id ? { ...t, ...patch } : t))
    );
  };

  const navigateChromeTo = async (rawTarget) => {
    const trimmed = String(rawTarget || '').trim();
    if (!trimmed) return;

    let finalUrl = trimmed;
    let title = trimmed;
    if (trimmed === 'google://newtab') {
      updateActiveChromeTab({ url: 'google://newtab', inputUrl: '', title: 'New Tab' });
      return;
    }

    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      (trimmed.includes(' ') || !trimmed.includes('.'))
    ) {
      finalUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`;
      title = `${trimmed} - Google Search`;
    } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      finalUrl = `https://${trimmed}`;
      title = trimmed;
    } else {
      try {
        title = new URL(finalUrl).hostname.replace('www.', '');
      } catch {
        title = finalUrl;
      }
    }

    updateActiveChromeTab({
      url: finalUrl,
      inputUrl: finalUrl,
      title,
    });

    if (!isElectron) {
      setIsLoadingWeb(true);
      setWebFallbackHtml('');
    }
  };

  const handleAddChromeTab = () => {
    sounds.play('tick');
    const newId = `tab-${Date.now()}`;
    setChromeTabs((prev) => [
      ...prev,
      { id: newId, title: 'New Tab', url: 'google://newtab', inputUrl: '' },
    ]);
    setActiveTabId(newId);
  };

  const handleCloseChromeTab = (idToClose, e) => {
    e.stopPropagation();
    sounds.play('tick');
    if (chromeTabs.length === 1) {
      setOpenWindow('none');
      return;
    }
    const remaining = chromeTabs.filter((t) => t.id !== idToClose);
    setChromeTabs(remaining);
    if (activeTabId === idToClose) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Esecuzione comando reale sul Terminale
  const handleCommand = async (e) => {
    e.preventDefault();
    const cmd = cmdInput.trim();
    if (!cmd || isRunningCmd) return;

    sounds.play('tick');
    setCmdInput('');

    if (cmd === 'clear' || cmd === 'cls') {
      setTerminalHistory([]);
      return;
    }

    setTerminalHistory((prev) => [
      ...prev,
      { type: 'prompt', text: `${botId}@sand-box:~$ ${cmd}` },
    ]);
    setIsRunningCmd(true);

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, command: cmd }),
      });
      const data = await res.json();
      setTerminalHistory((prev) => [
        ...prev,
        {
          type: data.isError ? 'error' : 'output',
          text: data.output || '(nessun output)',
        },
      ]);
      loadWorkspaceFiles();
    } catch (err) {
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'error', text: `Errore: ${err.message}` },
      ]);
    } finally {
      setIsRunningCmd(false);
    }
  };

  // Salvataggio file su disco
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    sounds.play('tick');
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          name: selectedFile,
          content: fileContent,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFileSavedMsg('✔ Salvato su disco!');
        setTimeout(() => setFileSavedMsg(''), 2000);
        loadWorkspaceFiles();
      }
    } catch {}
  };

  const handleCreateNewFile = async (e) => {
    e.preventDefault();
    const fname = newFileName.trim();
    if (!fname) return;
    const finalName = fname.includes('.') ? fname : `${fname}.md`;
    setNewFileName('');
    await fetch('/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId,
        name: finalName,
        content: `# ${finalName}\n\nCreato per ${botName}.\n`,
      }),
    });
    await loadWorkspaceFiles();
    openDiskFile(finalName);
  };

  const handleDeleteFile = async (fname) => {
    sounds.play('tick');
    await fetch('/api/fs/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, name: fname }),
    });
    if (selectedFile === fname) {
      setSelectedFile(null);
      setFileContent('');
    }
    loadWorkspaceFiles();
  };

  // Comandi Smart TV
  const sendTvCommand = async (payload, label = 'Comando inviato') => {
    sounds.play('tick');
    setIsSendingTvCmd(true);
    setTvCommandStatus(`Invio: ${label}...`);
    try {
      const mergedPayload = {
        botName,
        botColor,
        botShape,
        ...payload,
      };
      const res = await fetch('/api/tv/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedPayload),
      });
      const data = await res.json();
      if (data && data.ok) {
        setTvCommandStatus(`✔ ${data.detail || label}`);
        setTimeout(() => fetchTvStatusAndScreen(true), 900);
      } else {
        setTvCommandStatus(`⚠️ Errore: ${data?.error || 'TV non raggiungibile'}`);
      }
    } catch (e) {
      setTvCommandStatus(`⚠️ Errore rete: ${e.message}`);
    } finally {
      setIsSendingTvCmd(false);
    }
  };

  const handleTvQuerySubmit = (e) => {
    e.preventDefault();
    const q = tvQueryInput.trim();
    if (!q) return;
    sendTvCommand({ type: 'youtube_search', query: q }, `Cerca "${q}" su TV`);
    setTvQueryInput('');
  };

  const handleSamanthaSpeakOnTv = () => {
    const q = tvQueryInput.trim();
    if (!q) return;
    sendTvCommand(
      { type: 'samantha_speak', text: q, botName, botColor, botShape },
      `Fai dire a ${botName} sulla TV`
    );
    setTvQueryInput('');
  };

  return (
    <div className="fixed inset-0 bg-[#141415] z-50 flex flex-col items-center justify-between p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Barra Superiore Minimale Identica a Screenshot 3 & 4 (solo le icone Riduci / Ingrandisci / Chiudi in alto a destra) */}
      <div className="w-full flex items-center justify-between px-2 h-7 shrink-0">
        <div className="text-[11px] text-white/40 font-medium flex items-center gap-2">
          <span>Computer di {botName}</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <button
            onClick={() => {
              sounds.play('tick');
              onClose();
            }}
            className="hover:text-white transition-colors cursor-pointer p-1"
            title="Riduci e torna alla chat"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={() => {
              sounds.play('tick');
              setIsWindowMaximized((v) => !v);
            }}
            className="hover:text-white transition-colors cursor-pointer p-1"
            title="Ingrandisci"
          >
            <MaximizeIcon size={13} />
          </button>
          <button
            onClick={() => {
              sounds.play('close');
              onClose();
            }}
            className="hover:text-white transition-colors cursor-pointer p-1"
            title="Chiudi"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 2. Cornice Principale del Monitor Remoto noVNC (16:10 centrato come negli Screenshot 2, 3 e 4) */}
      <div className="flex-1 w-full max-w-[1160px] my-1 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full max-h-[720px] rounded-xl overflow-hidden border border-white/[0.08] bg-[#1e1e20] shadow-[0_25px_90px_rgba(0,0,0,0.65)] flex flex-col relative">
          {/* STATO A: Connessione in corso (Identico a Screenshot 2) */}
          {isConnecting ? (
            <div className="flex-1 w-full h-full bg-[#1e1e20] flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-white"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                  className="w-3.5 h-3.5 rounded-t-full rounded-b-sm bg-white flex items-center justify-center gap-0.5"
                >
                  <span className="w-0.5 h-1 bg-[#1e1e20] rounded-full" />
                  <span className="w-0.5 h-1 bg-[#1e1e20] rounded-full" />
                </motion.div>
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                  className="w-1.5 h-1.5 rounded-full bg-white"
                />
              </div>
              <span className="text-[12px] text-white/45 font-medium tracking-tight">
                Connessione in corso
              </span>
            </div>
          ) : (
            <>
              {/* STATO B: Vero Desktop Linux X11 + Wallpaper Onda Monocromatica (Identico a Screenshot 3) */}
              <div
                onClick={() => {
                  if (!hasControl) {
                    sounds.play('tick');
                    setHasControl(true);
                  }
                }}
                className="flex-1 w-full relative overflow-hidden flex flex-col"
                style={{
                  background:
                    'radial-gradient(125% 95% at 15% 10%, #cfcfd2 0%, #8e8f94 38%, #434448 54%, #9c9da1 72%, #595a5e 100%)',
                }}
              >
                {/* Effetto curva diagonale morbida identica allo sfondo Openbox di Grok Bot (Screenshot 3) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(132deg, rgba(255,255,255,0.28) 0%, rgba(30,30,34,0.68) 46%, rgba(215,215,220,0.45) 54%, rgba(60,60,65,0.45) 100%)',
                  }}
                />

                {/* FINESTRA 1: VERO GOOGLE CHROME (Identico a Screenshot 4!) */}
                {openWindow === 'chrome' && (
                  <div
                    className={`z-10 flex flex-col bg-white shadow-2xl overflow-hidden transition-all ${
                      isWindowMaximized
                        ? 'w-full h-full'
                        : 'w-[92%] h-[90%] m-auto rounded-lg border border-black/20'
                    }`}
                  >
                    {/* Barra Tab Superiore Azzurra di Google Chrome Linux (Screenshot 4) */}
                    <div className="h-9 bg-[#d3e3fd] flex items-end px-2 pt-1.5 gap-1 select-none shrink-0 border-b border-[#b8cdf0]">
                      <div className="w-5 h-5 mb-1 rounded-md hover:bg-black/5 flex items-center justify-center text-gray-600 text-[10px]">
                        ⌄
                      </div>

                      {/* Schede aperte */}
                      {chromeTabs.map((tab) => {
                        const isTabActive = tab.id === activeChromeTab.id;
                        return (
                          <div
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[11.5px] max-w-[200px] min-w-[130px] cursor-pointer transition-colors ${
                              isTabActive
                                ? 'bg-white text-gray-900 font-medium shadow-2xs'
                                : 'bg-[#d3e3fd] hover:bg-[#e1ecfe] text-gray-700'
                            }`}
                          >
                            <Globe size={12} className="text-gray-600 shrink-0" />
                            <span className="truncate flex-1">{tab.title}</span>
                            <button
                              onClick={(e) => handleCloseChromeTab(tab.id, e)}
                              className="w-4 h-4 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Pulsante + Nuova Scheda */}
                      <button
                        onClick={handleAddChromeTab}
                        className="w-6 h-6 mb-0.5 rounded-full hover:bg-black/10 flex items-center justify-center text-gray-700 cursor-pointer"
                        title="New Tab"
                      >
                        <Plus size={13} />
                      </button>

                      <div className="flex-1" />

                      {/* Controlli Finestra Chrome Linux in alto a destra (_ □ X) */}
                      <div className="flex items-center gap-1 mb-1.5 pr-1 text-gray-600">
                        <button
                          onClick={() => setOpenWindow('none')}
                          className="w-6 h-6 rounded hover:bg-black/10 flex items-center justify-center cursor-pointer"
                          title="Riduci a icona sulla barra"
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          onClick={() => setIsWindowMaximized((v) => !v)}
                          className="w-6 h-6 rounded hover:bg-black/10 flex items-center justify-center cursor-pointer"
                          title="Ridimensiona"
                        >
                          <MaximizeIcon size={10} />
                        </button>
                        <button
                          onClick={() => setOpenWindow('none')}
                          className="w-6 h-6 rounded hover:bg-red-500 hover:text-white flex items-center justify-center cursor-pointer"
                          title="Chiudi Chrome"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Barra degli Indirizzi di Chrome con pillola "AI Mode" come in Screenshot 4 */}
                    <div className="h-10 bg-white border-b border-gray-200 flex items-center px-2.5 gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (webviewRef.current?.canGoBack?.()) {
                            webviewRef.current.goBack();
                          } else {
                            navigateChromeTo('google://newtab');
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"
                        title="Indietro"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        onClick={() => webviewRef.current?.goForward?.()}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                        title="Avanti"
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (webviewRef.current?.reload) {
                            webviewRef.current.reload();
                          } else if (activeChromeTab.url !== 'google://newtab') {
                            navigateChromeTo(activeChromeTab.url);
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"
                        title="Ricarica"
                      >
                        <RotateCw size={13} />
                      </button>

                      {/* Omnibox URL */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          navigateChromeTo(activeChromeTab.inputUrl);
                        }}
                        className="flex-1 flex items-center bg-[#f1f3f4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1a73e8] rounded-full px-3 py-1 gap-2 border border-transparent"
                      >
                        <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#1a73e8] shadow-2xs">
                          G
                        </span>
                        <input
                          type="text"
                          value={activeChromeTab.inputUrl}
                          onChange={(e) =>
                            updateActiveChromeTab({ inputUrl: e.target.value })
                          }
                          placeholder="Search Google or type a URL"
                          className="flex-1 bg-transparent text-[12.5px] text-gray-800 focus:outline-none select-text"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            navigateChromeTo(
                              activeChromeTab.inputUrl || 'https://news.google.com'
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1967d2] text-[10.5px] font-semibold hover:bg-[#d2e3fc] cursor-pointer"
                        >
                          <Sparkles size={10} />
                          <span>AI Mode</span>
                        </button>
                      </form>
                    </div>

                    {/* Corpo della Pagina di Google Chrome */}
                    <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
                      {activeChromeTab.url === 'google://newtab' ? (
                        /* Esatta New Tab di Google Chrome come nello Screenshot 4! */
                        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
                          {/* Link in alto a destra Gmail / Images */}
                          <div className="absolute top-3 right-5 flex items-center gap-4 text-[12px] text-gray-700">
                            <button
                              onClick={() => navigateChromeTo('https://mail.google.com')}
                              className="hover:underline cursor-pointer"
                            >
                              Gmail
                            </button>
                            <button
                              onClick={() => navigateChromeTo('https://images.google.com')}
                              className="hover:underline cursor-pointer"
                            >
                              Images
                            </button>
                          </div>

                          {/* Logo Google Ufficiale */}
                          <div className="text-[64px] font-bold tracking-tight mb-6 select-none leading-none">
                            <span className="text-[#4285F4]">G</span>
                            <span className="text-[#EA4335]">o</span>
                            <span className="text-[#FBBC05]">o</span>
                            <span className="text-[#4285F4]">g</span>
                            <span className="text-[#34A853]">l</span>
                            <span className="text-[#EA4335]">e</span>
                          </div>

                          {/* Barra di ricerca centrale Google */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (googleSearchQuery.trim()) {
                                navigateChromeTo(googleSearchQuery);
                                setGoogleSearchQuery('');
                              }
                            }}
                            className="w-full max-w-[520px] flex items-center bg-white border border-gray-200 hover:shadow-md focus-within:shadow-md rounded-full px-4 py-2.5 gap-3 mb-7 transition-shadow"
                          >
                            <Search size={16} className="text-gray-400" />
                            <input
                              type="text"
                              value={googleSearchQuery}
                              onChange={(e) => setGoogleSearchQuery(e.target.value)}
                              placeholder="Search Google or type a URL"
                              className="flex-1 text-[13.5px] text-gray-800 focus:outline-none select-text"
                            />
                            <Mic size={16} className="text-[#4285F4] cursor-pointer" />
                          </form>

                          {/* Scorciatoie Rapide New Tab (Web Store, Google News, YouTube, Wikipedia, Add shortcut) */}
                          <div className="flex items-center gap-6">
                            {[
                              {
                                label: 'Google News',
                                url: 'https://news.google.com',
                                icon: '📰',
                              },
                              {
                                label: 'Wikipedia',
                                url: 'https://it.wikipedia.org',
                                icon: '🌐',
                              },
                              {
                                label: 'YouTube',
                                url: 'https://www.youtube.com',
                                icon: '▶️',
                              },
                              {
                                label: 'Add shortcut',
                                url: 'https://www.google.com/search?igu=1&q=Torino+notizie+oggi',
                                icon: '+',
                              },
                            ].map((sc) => (
                              <button
                                key={sc.label}
                                onClick={() => navigateChromeTo(sc.url)}
                                className="flex flex-col items-center gap-2 group cursor-pointer"
                              >
                                <div className="w-11 h-11 rounded-full bg-[#f1f3f4] group-hover:bg-[#e8eaed] flex items-center justify-center text-base text-gray-700 transition-colors">
                                  {sc.icon}
                                </div>
                                <span className="text-[11.5px] text-gray-700">
                                  {sc.label}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Pillola Customize Chrome in basso a destra (Screenshot 4) */}
                          <div className="absolute bottom-3 right-4 px-3 py-1.5 rounded-full bg-[#d3e3fd] text-[#041e49] text-[11px] font-medium flex items-center gap-1.5 shadow-2xs">
                            <span>✎</span>
                            <span>Customize Chrome</span>
                          </div>
                        </div>
                      ) : isElectron ? (
                        /* VERO MOTORE CHROMIUM INTERATTIVO IN ELECTRON */
                        <webview
                          ref={webviewRef}
                          src={activeChromeTab.url}
                          className="w-full h-full flex-1 border-0"
                          allowpopups="true"
                        />
                      ) : (
                        /* Proxy HTML locale quando aperto su browser normale o mobile */
                        <div className="w-full h-full flex flex-col">
                          <iframe
                            src={`/api/web/proxy?url=${encodeURIComponent(activeChromeTab.url)}`}
                            onLoad={() => setIsLoadingWeb(false)}
                            title="Chrome Viewport"
                            className="w-full flex-1 border-0 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* FINESTRA 2: FILE MANAGER REALE (pcmanfm) */}
                {openWindow === 'files' && (
                  <div className="z-10 w-[92%] h-[88%] m-auto bg-[#23262e] rounded-lg border border-white/15 shadow-2xl flex flex-col overflow-hidden text-gray-200">
                    <div className="h-9 bg-[#191b22] px-3 flex items-center justify-between border-b border-white/10 shrink-0">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Folder size={14} className="text-amber-400" />
                        <span>File Manager — /home/{botId}/workspace</span>
                      </div>
                      <button
                        onClick={() => setOpenWindow('none')}
                        className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                      <div className="w-64 border-r border-white/10 p-3 flex flex-col bg-[#1b1e26]">
                        <form onSubmit={handleCreateNewFile} className="flex gap-1.5 mb-3">
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="nuovo_file.md..."
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none select-text"
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </form>
                        <div className="flex-1 overflow-y-auto space-y-1">
                          {workspaceFiles.map((f) => (
                            <div
                              key={f.name}
                              onClick={() => openDiskFile(f.name)}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer ${
                                selectedFile === f.name
                                  ? 'bg-blue-600/30 text-white border border-blue-400/30'
                                  : 'hover:bg-white/5 text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileCode size={13} className="text-blue-400 shrink-0" />
                                <span className="truncate">{f.name}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(f.name);
                                }}
                                className="text-gray-500 hover:text-red-400 p-0.5"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col p-4 bg-[#23262e]">
                        {selectedFile ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono text-blue-300">
                                {selectedFile}
                              </span>
                              <div className="flex items-center gap-2">
                                {fileSavedMsg && (
                                  <span className="text-xs text-emerald-400 font-semibold">
                                    {fileSavedMsg}
                                  </span>
                                )}
                                <button
                                  onClick={handleSaveFile}
                                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Save size={12} />
                                  <span>Salva</span>
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={fileContent}
                              onChange={(e) => setFileContent(e.target.value)}
                              className="flex-1 w-full bg-[#14161c] border border-white/10 rounded-lg p-3 font-mono text-xs text-gray-100 focus:outline-none resize-none select-text"
                            />
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                            Seleziona un file a sinistra per modificarlo sul disco reale.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* FINESTRA 3: TERMINALE REALE (lxterminal) */}
                {openWindow === 'terminal' && (
                  <div className="z-10 w-[88%] h-[84%] m-auto bg-[#0e1015] rounded-lg border border-white/15 shadow-2xl flex flex-col overflow-hidden text-gray-200 font-mono">
                    <div className="h-9 bg-[#191b22] px-3 flex items-center justify-between border-b border-white/10 shrink-0 font-sans">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Terminal size={14} className="text-emerald-400" />
                        <span>lxterminal — {botId}@sand-box:~</span>
                      </div>
                      <button
                        onClick={() => setOpenWindow('none')}
                        className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs select-text">
                      {terminalHistory.map((item, i) => (
                        <div
                          key={i}
                          className={`whitespace-pre-wrap leading-relaxed ${
                            item.type === 'prompt'
                              ? 'text-blue-400 font-bold'
                              : item.type === 'error'
                              ? 'text-red-400'
                              : item.type === 'success'
                              ? 'text-emerald-400'
                              : 'text-gray-200'
                          }`}
                        >
                          {item.text}
                        </div>
                      ))}
                    </div>
                    <form
                      onSubmit={handleCommand}
                      className="h-10 border-t border-white/10 px-3 flex items-center gap-2 bg-[#14171f]"
                    >
                      <span className="text-emerald-400 text-xs font-bold">
                        {botId}@sand-box:~$
                      </span>
                      <input
                        type="text"
                        value={cmdInput}
                        onChange={(e) => setCmdInput(e.target.value)}
                        placeholder="Scrivi un comando reale (es. dir, python --version, git status)..."
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none select-text"
                      />
                    </form>
                  </div>
                )}

                {/* FINESTRA 4: BRIDGE SMART TV SALOTTO (172.20.10.3:5555) */}
                {openWindow === 'tv' && (
                  <div className="z-10 w-[94%] h-[90%] m-auto bg-[#141821] rounded-lg border border-white/15 shadow-2xl flex flex-col overflow-hidden text-gray-200">
                    <div className="h-9 bg-[#191d28] px-3 flex items-center justify-between border-b border-white/10 shrink-0">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Tv size={14} className="text-emerald-400" />
                        <span>
                          Smart TV Salotto ({tvStatus.serial}) • App attiva: {tvStatus.currentApp}
                        </span>
                      </div>
                      <button
                        onClick={() => setOpenWindow('none')}
                        className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-y-auto">
                      <div className="col-span-7 flex flex-col gap-3">
                        <div className="aspect-video bg-black rounded-lg border border-white/10 overflow-hidden relative flex items-center justify-center">
                          {screenshotUrl ? (
                            <img
                              src={screenshotUrl}
                              alt="Smart TV Live"
                              className="w-full h-full object-contain"
                              onLoad={() => setIsLoadingScreen(false)}
                            />
                          ) : (
                            <span className="text-xs text-gray-500">
                              Connessione video ADB alla TV...
                            </span>
                          )}
                        </div>
                        <form onSubmit={handleTvQuerySubmit} className="flex gap-2">
                          <input
                            type="text"
                            value={tvQueryInput}
                            onChange={(e) => setTvQueryInput(e.target.value)}
                            placeholder={`Scrivi cosa cercare su YouTube TV o far dire a ${botName}...`}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none select-text"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            YouTube TV
                          </button>
                          <button
                            type="button"
                            onClick={handleSamanthaSpeakOnTv}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Parla su TV
                          </button>
                        </form>
                      </div>
                      <div className="col-span-5 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          {QUICK_TV_APPS.map((app) => (
                            <button
                              key={app.id}
                              onClick={() =>
                                sendTvCommand(
                                  { type: 'launch_app', app: app.id },
                                  `Avvio ${app.label}`
                                )
                              }
                              className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-left cursor-pointer ${app.color}`}
                            >
                              {app.label}
                            </button>
                          ))}
                        </div>
                        {tvCommandStatus && (
                          <div className="text-[11px] text-emerald-400 font-mono bg-black/30 p-2 rounded">
                            {tvCommandStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay trasparente quando sei in modalità "Visualizzazione" (cliccandolo o premendo "Prendi il controllo" attivi l'interazione) */}
                {!hasControl && openWindow !== 'none' && (
                  <div
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                    }}
                    className="absolute inset-0 z-20 bg-transparent cursor-pointer"
                    title="Clicca per prendere il controllo del desktop"
                  />
                )}
              </div>

              {/* BARRA INFERIORE LINUX TINT2 (Identica a Screenshot 3 & 4: icone 1Password, Chrome, File Manager, Terminale + Orologio a destra) */}
              <div className="h-9 bg-[#14171c] border-t border-white/[0.07] px-3 flex items-center justify-between shrink-0 z-30">
                <div className="flex-1" />

                {/* Icone Centrali della Dock tint2 */}
                <div className="flex items-center gap-2">
                  {/* 1. 1Password / Cassaforte */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                      setOpenWindow('files');
                    }}
                    className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                    title="1Password & Credenziali Bot"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#0a85ea] flex items-center justify-center text-white font-bold text-[10px] border border-white/30">
                      <KeyRound size={11} />
                    </div>
                  </button>

                  {/* 2. Google Chrome (con pallini colorati ufficiali) */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                      setOpenWindow((w) => (w === 'chrome' ? 'none' : 'chrome'));
                    }}
                    className={`h-7 px-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      openWindow === 'chrome'
                        ? 'bg-white/15 text-white'
                        : 'hover:bg-white/10 text-gray-300'
                    }`}
                    title="Google Chrome"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#34A853] via-[#FBBC05] to-[#EA4335] p-0.5 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4] border border-white" />
                    </div>
                    {openWindow === 'chrome' && (
                      <span className="text-[11px] text-gray-200 max-w-[140px] truncate">
                        {activeChromeTab.title} - Google Chrome
                      </span>
                    )}
                  </button>

                  {/* 3. File Manager (pcmanfm) */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                      setOpenWindow((w) => (w === 'files' ? 'none' : 'files'));
                    }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                      openWindow === 'files' ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                    title="File Manager"
                  >
                    <Folder size={16} className="text-gray-300" />
                  </button>

                  {/* 4. Terminale Linux (lxterminal `>_`) */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                      setOpenWindow((w) => (w === 'terminal' ? 'none' : 'terminal'));
                    }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                      openWindow === 'terminal' ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                    title="Terminale"
                  >
                    <div className="w-5 h-4 rounded-xs bg-[#2c313a] border border-gray-500 flex items-center px-1 text-[9px] font-mono text-white font-bold">
                      &gt;_
                    </div>
                  </button>

                  {/* 5. Smart TV Salotto Bridge */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setHasControl(true);
                      setOpenWindow((w) => (w === 'tv' ? 'none' : 'tv'));
                    }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                      openWindow === 'tv' ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                    title="Smart TV Salotto (172.20.10.3)"
                  >
                    <Tv size={15} className="text-emerald-400" />
                  </button>
                </div>

                {/* Orologio a destra in stile tint2 ("Wed Nov 11  12:24 AM") */}
                <div className="flex-1 flex justify-end">
                  <span className="text-[11px] text-gray-300 font-mono tracking-tight">
                    {clockText}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Pillola Bianca Inferiore IDENTICA agli Screenshot 2, 3 e 4:
          - Stato Visualizzazione: [ 👁 Visualizzazione  ( Prendi il controllo ) ]
          - Stato Controllo:       [ 🖱 Hai il controllo ( Interrompi ) ] */}
      <div className="h-11 flex items-center justify-center shrink-0">
        {!hasControl ? (
          <div className="flex items-center gap-2 bg-white rounded-full pl-3.5 pr-1.5 py-1 shadow-xl">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
              <Eye size={13} className="text-gray-400" />
              <span>Visualizzazione</span>
            </div>
            <button
              onClick={() => {
                sounds.play('tick');
                setHasControl(true);
                if (openWindow === 'none') {
                  setOpenWindow('chrome');
                }
              }}
              className="px-3 py-1 rounded-full bg-[#141415] hover:bg-[#2a2a2d] text-white text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Prendi il controllo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white rounded-full pl-3.5 pr-1.5 py-1 shadow-xl">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
              <MousePointer size={13} className="text-gray-700" />
              <span>Hai il controllo</span>
            </div>
            <button
              onClick={() => {
                sounds.play('tick');
                setHasControl(false);
              }}
              className="px-3 py-1 rounded-full bg-[#e5e7eb] hover:bg-[#d1d5db] text-gray-800 text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Interrompi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

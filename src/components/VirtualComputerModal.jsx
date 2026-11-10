import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
  botId = 'capo-bot',
  botName = 'capo-bot',
  initialTab = null,
  initialFileToOpen = null,
  onFilesUpdated,
}) {
  const [mode, setMode] = useState('controllo');
  const [activeApp, setActiveApp] = useState('tv'); // 'tv' | 'terminal' | 'browser' | 'files'

  // 1. Stato Terminale Reale
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: `Windows / Node v22.17.0 — Workspace reale per ${botName}` },
    { type: 'success', text: `✔ Terminale collegato a: workspaces/${botId}` },
  ]);
  const [cmdInput, setCmdInput] = useState('');
  const [isRunningCmd, setIsRunningCmd] = useState(false);

  // 2. Stato File Manager Reale su Disco
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [workspacePath, setWorkspacePath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileSavedMsg, setFileSavedMsg] = useState('');
  const [newFileName, setNewFileName] = useState('');

  // 3. Stato Browser Web & Briefing Live
  const [browserUrl, setBrowserUrl] = useState('https://news.google.com');
  const [browserTitle, setBrowserTitle] = useState('Briefing Meteo Torino & Top News Live');
  const [browserContent, setBrowserContent] = useState('');
  const [isLoadingWeb, setIsLoadingWeb] = useState(false);

  // 4. Stato Android TV Reale
  const [tvStatus, setTvStatus] = useState({
    connected: false,
    serial: '192.168.1.100:5555',
    currentApp: 'Verifica connessione...',
    history: [],
  });
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);
  const [autoRefreshTv, setAutoRefreshTv] = useState(true);
  const [tvQueryInput, setTvQueryInput] = useState('');
  const [tvCommandStatus, setTvCommandStatus] = useState('');
  const [isSendingTvCmd, setIsSendingTvCmd] = useState(false);

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
          setActiveApp('files');
        }
      } catch {}
    },
    [botId]
  );

  useEffect(() => {
    if (!isOpen) return;
    loadWorkspaceFiles();
    if (initialFileToOpen) {
      openDiskFile(initialFileToOpen);
    } else if (initialTab) {
      setActiveApp(initialTab);
    }
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
    if (!isOpen || activeApp !== 'tv') return;
    fetchTvStatusAndScreen(true);

    if (!autoRefreshTv) return;
    const interval = setInterval(() => {
      fetchTvStatusAndScreen(true);
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen, activeApp, autoRefreshTv, fetchTvStatusAndScreen]);

  // Carica il Briefing Live quando si apre il Browser per la prima volta
  const loadLiveBriefing = useCallback(async () => {
    setIsLoadingWeb(true);
    try {
      const res = await fetch('/api/web/briefing');
      const data = await res.json();
      if (data && data.ok) {
        setBrowserTitle('Briefing Tempo Reale — Meteo Torino & Google News Italia');
        setBrowserContent(data.combined || 'Nessun dato ricevuto.');
      }
    } catch (e) {
      setBrowserContent(`Errore caricamento briefing: ${e.message}`);
    } finally {
      setIsLoadingWeb(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeApp === 'browser' && !browserContent) {
      loadLiveBriefing();
    }
  }, [isOpen, activeApp, browserContent, loadLiveBriefing]);

  if (!isOpen) return null;

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
      { type: 'prompt', text: `${botId}@bot-park:~$ ${cmd}` },
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

  // Navigazione Web Reale
  const handleBrowserFetch = async (e) => {
    e.preventDefault();
    let target = browserUrl.trim();
    if (!target) return;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
      setBrowserUrl(target);
    }
    setIsLoadingWeb(true);
    try {
      const res = await fetch('/api/web/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (data && data.ok) {
        setBrowserTitle(data.title || target);
        setBrowserContent(data.content || 'Pagina letta.');
      }
    } catch (err) {
      setBrowserContent(`Errore apertura URL: ${err.message}`);
    } finally {
      setIsLoadingWeb(false);
    }
  };

  const sendTvCommand = async (payload, label = '') => {
    sounds.play('tick');
    setIsSendingTvCmd(true);
    if (label) setTvCommandStatus(`Invio a TV: ${label}...`);
    try {
      const res = await fetch('/api/tv/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.tvReply) {
          setTvCommandStatus(`Assistente TV: «${data.tvReply}»`);
        } else {
          setTvCommandStatus(`✔ Eseguito sulla TV: ${label || payload.type}`);
        }
        setTimeout(() => fetchTvStatusAndScreen(true), 800);
      } else {
        setTvCommandStatus(`⚠ Errore TV: ${data.error || 'Comando fallito'}`);
      }
    } catch (err) {
      setTvCommandStatus(`⚠ Errore comunicazione TV: ${err.message}`);
    } finally {
      setIsSendingTvCmd(false);
    }
  };

  const handleSendCapo BotTvQuery = async (e) => {
    e.preventDefault();
    const q = tvQueryInput.trim();
    if (!q || isSendingTvCmd) return;
    setTvQueryInput('');
    await sendTvCommand({ type: 'Capo Bot_query', text: q }, `Ordine a Capo Bot ("${q}")`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-none"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-6xl h-[88vh] bg-[#0d0f12] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
        >
          {/* 1. Barra del Titolo */}
          <div className="h-11 bg-[#16191f] border-b border-white/5 px-4 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  tvStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-gray-200">
                Computer Reale & Bridge Salotto • {botName}
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                TV {tvStatus.serial} • {tvStatus.currentApp}
              </span>
            </div>

            <button
              onClick={() => {
                sounds.play('tick');
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* 2. Area di Lavoro Principale */}
          <div
            className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4"
            style={{
              background:
                'radial-gradient(ellipse at center, #2e3440 0%, #1e222a 60%, #111318 100%)',
            }}
          >
            <div className="w-full h-full max-w-5xl bg-[#181a1f]/95 rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md">
              {/* Header Finestra App */}
              <div className="h-9 bg-[#21252b] px-3.5 flex items-center justify-between text-[11px] text-gray-400 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="ml-2 font-mono text-gray-200 font-semibold">
                    {activeApp === 'tv'
                      ? `Capo Bot — Controllo Diretto Smart TV (${tvStatus.serial})`
                      : activeApp === 'terminal'
                      ? `Terminale Reale — workspaces/${botId}`
                      : activeApp === 'browser'
                      ? 'Browser Web Live & Briefing Meteo/News'
                      : `File Manager Reale — workspaces/${botId}`}
                  </span>
                </div>

                {activeApp === 'tv' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoRefreshTv(!autoRefreshTv)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        autoRefreshTv
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-gray-400 border-white/10'
                      }`}
                    >
                      <Radio size={10} className="inline mr-1" />
                      {autoRefreshTv ? 'Live Stream ON' : 'Live Pausa'}
                    </button>
                    <button
                      onClick={() => fetchTvStatusAndScreen(true)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      title="Aggiorna schermata TV ora"
                    >
                      <RefreshCw size={12} className={isLoadingScreen ? 'animate-spin' : ''} />
                    </button>
                  </div>
                )}
              </div>

              {/* CONTENUTO APP */}
              {activeApp === 'tv' ? (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                  <div className="lg:col-span-7 p-4 flex flex-col gap-3 border-r border-white/5 overflow-y-auto">
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
                      {screenshotUrl ? (
                        <img
                          src={screenshotUrl}
                          alt="Schermo Android TV Live"
                          onLoad={() => setIsLoadingScreen(false)}
                          onError={() => setIsLoadingScreen(false)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-gray-500 flex flex-col items-center gap-2">
                          <Tv size={28} className="text-pink-400 animate-pulse" />
                          <span>Acquisizione schermo Android TV (Android TV)...</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5 border border-white/10">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tvStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'
                          }`}
                        />
                        <span>{tvStatus.currentApp}</span>
                      </div>
                    </div>

                    <form onSubmit={handleSendCapo BotTvQuery} className="flex gap-2">
                      <input
                        type="text"
                        value={tvQueryInput}
                        onChange={(e) => setTvQueryInput(e.target.value)}
                        placeholder="Chiedi a Capo Bot sulla TV (es. 'Metti jazz su YouTube', 'Che tempo fa?', 'Spegni schermo')..."
                        className="flex-1 bg-[#111318] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingTvCmd}
                        className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        <Send size={13} />
                        <span>Invia a Assistente TV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sendTvCommand({ type: 'trigger_mic' }, 'Microfono vocale TV')}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-pink-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        title="Attiva ascolto microfono su Android TV"
                      >
                        <Mic size={14} />
                      </button>
                    </form>

                    {tvCommandStatus && (
                      <div className="px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-200 font-medium">
                        {tvCommandStatus}
                      </div>
                    )}

                    <div className="flex-1 bg-[#111318]/90 rounded-xl border border-white/5 p-3 overflow-y-auto space-y-2 max-h-36">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Memoria Live Assistente TV (/sdcard/Jarvis/conversation_memory.json)
                      </div>
                      {tvStatus.history && tvStatus.history.length > 0 ? (
                        tvStatus.history
                          .slice()
                          .reverse()
                          .slice(0, 4)
                          .map((turn, i) => (
                            <div key={i} className="text-[11px] border-b border-white/5 pb-1.5">
                              <div className="text-gray-400">
                                <span className="text-emerald-400 font-semibold">Utente:</span> {turn.user}
                              </div>
                              <div className="text-pink-200">
                                <span className="text-pink-400 font-semibold">Assistente TV:</span>{' '}
                                {turn.jarvis}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-[11px] text-gray-500">
                          Nessuna conversazione recente letta dal TV.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-4 flex flex-col justify-between gap-3 overflow-y-auto bg-[#14171d]">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Controlli Rapidi Hardware & Audio
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'WAKEUP' }, 'Sveglia TV')}
                          className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Power size={14} />
                          <span>Accendi</span>
                        </button>
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'POWER' }, 'Standby TV')}
                          className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Power size={14} />
                          <span>Spegni</span>
                        </button>
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'HOME' }, 'Tasto Home')}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Home size={14} />
                          <span>Home</span>
                        </button>
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'BACK' }, 'Tasto Indietro')}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                          <span>Indietro</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center my-1">
                      <div className="grid grid-cols-3 gap-2 w-40">
                        <div />
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'UP' }, 'Freccia Su')}
                          className="h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <div />
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'LEFT' }, 'Freccia Sinistra')}
                          className="h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'CENTER' }, 'OK / Conferma')}
                          className="h-10 rounded-xl bg-pink-600 hover:bg-pink-500 flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow-lg active:scale-95"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'RIGHT' }, 'Freccia Destra')}
                          className="h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div />
                        <button
                          onClick={() => sendTvCommand({ type: 'keyevent', key: 'DOWN' }, 'Freccia Giù')}
                          className="h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95"
                        >
                          <ChevronDown size={18} />
                        </button>
                        <div />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => sendTvCommand({ type: 'keyevent', key: 'VOLUME_DOWN' }, 'Volume -')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 size={13} />
                        <span>Vol -</span>
                      </button>
                      <button
                        onClick={() => sendTvCommand({ type: 'keyevent', key: 'VOLUME_UP' }, 'Volume +')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 size={13} />
                        <span>Vol +</span>
                      </button>
                      <button
                        onClick={() => sendTvCommand({ type: 'keyevent', key: 'MUTE' }, 'Muto')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <VolumeX size={13} />
                        <span>Muto</span>
                      </button>
                      <button
                        onClick={() => sendTvCommand({ type: 'keyevent', key: 'PLAY_PAUSE' }, 'Play/Pausa')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play size={13} />
                        <span>Play</span>
                      </button>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Avvia Applicazioni TV con 1 Click
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {QUICK_TV_APPS.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => sendTvCommand({ type: 'open_app', app: app.id }, `Avvio ${app.label}`)}
                            className={`px-2.5 py-2 rounded-lg border text-xs font-semibold text-left transition-all hover:brightness-125 cursor-pointer ${app.color}`}
                          >
                            {app.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeApp === 'terminal' ? (
                /* TERMINALE REALE */
                <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 text-gray-300 flex flex-col">
                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {terminalHistory.map((line, idx) => (
                      <div
                        key={idx}
                        className={`whitespace-pre-wrap ${
                          line.type === 'prompt'
                            ? 'text-cyan-400 font-semibold'
                            : line.type === 'success'
                            ? 'text-emerald-400'
                            : line.type === 'error'
                            ? 'text-red-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleCommand} className="flex items-center gap-2 pt-3 border-t border-white/10">
                    <span className="text-cyan-400 font-semibold">{botId}@bot-park:~$</span>
                    <input
                      type="text"
                      value={cmdInput}
                      onChange={(e) => setCmdInput(e.target.value)}
                      placeholder="Esegui comando reale (es. dir, node -v, python --version, type file.md)..."
                      className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isRunningCmd}
                      className="px-2.5 py-1 rounded bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] cursor-pointer"
                    >
                      {isRunningCmd ? '...' : 'Esegui'}
                    </button>
                  </form>
                </div>
              ) : activeApp === 'browser' ? (
                /* BROWSER WEB & BRIEFING LIVE REALE */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 bg-[#14171d] border-b border-white/10 flex items-center gap-2">
                    <form onSubmit={handleBrowserFetch} className="flex-1 flex items-center gap-2">
                      <Globe size={15} className="text-cyan-400 shrink-0" />
                      <input
                        type="text"
                        value={browserUrl}
                        onChange={(e) => setBrowserUrl(e.target.value)}
                        placeholder="Inserisci un URL o link YouTube da analizzare..."
                        className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={isLoadingWeb}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Search size={12} />
                        <span>Apri URL</span>
                      </button>
                    </form>
                    <button
                      onClick={loadLiveBriefing}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-600/30"
                    >
                      <Newspaper size={13} />
                      <span>Meteo Torino & News Live</span>
                    </button>
                  </div>

                  <div className="flex-1 p-5 overflow-y-auto space-y-3 text-gray-200">
                    <div className="text-sm font-bold text-cyan-300 border-b border-white/10 pb-2">
                      {browserTitle}
                    </div>
                    {isLoadingWeb ? (
                      <div className="text-xs text-gray-400 animate-pulse py-8 text-center">
                        Connessione e lettura contenuti live in corso...
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-300 bg-[#111318] p-4 rounded-xl border border-white/5">
                        {browserContent}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                /* FILE MANAGER REALE SU DISCO + EDITOR INTEGRATO */
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                  <div className="md:col-span-5 border-r border-white/10 p-4 flex flex-col gap-3 overflow-y-auto bg-[#14171d]">
                    <div className="text-[11px] font-semibold text-gray-400">
                      Cartella su disco: <span className="text-amber-400 font-mono">{workspacePath}</span>
                    </div>

                    <form onSubmit={handleCreateNewFile} className="flex gap-1.5">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="Nuovo file (es. note.md, script.py)..."
                        className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Crea</span>
                      </button>
                    </form>

                    <div className="space-y-1.5 flex-1 overflow-y-auto">
                      {workspaceFiles.map((f) => (
                        <div
                          key={f.name}
                          onClick={() => openDiskFile(f.name)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            selectedFile === f.name
                              ? 'bg-amber-500/20 border-amber-500/40 text-white'
                              : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileCode size={16} className="text-amber-400 shrink-0" />
                            <div className="overflow-hidden">
                              <div className="text-xs font-semibold truncate">{f.name}</div>
                              <div className="text-[10px] text-gray-500">
                                {f.date} • {f.size}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(f.name);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                            title="Elimina file"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-7 p-4 flex flex-col gap-2 overflow-hidden">
                    {selectedFile ? (
                      <>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-mono text-xs font-bold text-amber-300">
                            {selectedFile}
                          </span>
                          <div className="flex items-center gap-2">
                            {fileSavedMsg && (
                              <span className="text-[11px] text-emerald-400 font-semibold">
                                {fileSavedMsg}
                              </span>
                            )}
                            <button
                              onClick={handleSaveFile}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Save size={12} />
                              <span>Salva su Disco</span>
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="flex-1 w-full bg-[#0d0f12] border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 focus:outline-none focus:border-amber-500 resize-none"
                        />
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                        <Folder size={32} className="text-amber-400/60" />
                        <span>Seleziona un file a sinistra per leggerlo o modificarlo su disco.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Dock delle Applicazioni */}
          <div className="h-12 bg-[#121418] border-t border-white/5 px-6 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sounds.play('tick');
                  setActiveApp('tv');
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  activeApp === 'tv'
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Tv size={15} />
                <span>Android TV Salotto</span>
              </button>

              <button
                onClick={() => {
                  sounds.play('tick');
                  setActiveApp('terminal');
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  activeApp === 'terminal'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Terminal size={15} />
                <span>Terminale</span>
              </button>

              <button
                onClick={() => {
                  sounds.play('tick');
                  setActiveApp('browser');
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  activeApp === 'browser'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Globe size={15} />
                <span>Web & News Live</span>
              </button>

              <button
                onClick={() => {
                  sounds.play('tick');
                  setActiveApp('files');
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  activeApp === 'files'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Folder size={15} />
                <span>File & Libreria ({workspaceFiles.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode(mode === 'controllo' ? 'visualizzazione' : 'controllo')}
                className="text-[11px] text-gray-300 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                {mode === 'controllo' ? <MousePointer size={12} /> : <Eye size={12} />}
                <span>{mode === 'controllo' ? 'Controllo Attivo' : 'Sola Visualizzazione'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


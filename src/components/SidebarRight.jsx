import React, { useState, useEffect } from 'react';
import {
  Minus,
  Square as MaximizeIcon,
  X,
  Clock,
  ChevronRight,
  Power,
  Volume2,
  FileText,
  Sparkles,
  Check,
  Video,
  CheckSquare,
  Plus,
  Trash2,
  Play,
  Brain,
  BookOpen,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';
import { ELEVEN_LABS_VOICES, speakTextWithElevenLabs } from '../services/elevenLabsService';
import { GROK_BOT_SHAPES, GROK_BOT_COLORS, getShapeSvgPath } from '../data/botShapes';

export default function SidebarRight({
  activeBot,
  onUpdateBot,
  onStartVoiceCall,
  onOpenComputer,
  onOpenFileInEditor,
  onCreateRoutine,
  onOpenTeachModal,
  onRunTaskInChat,
  elevenLabsApiKey,
  onCloseSidebarRight,
  onMinimize,
  onMaximize,
  onCloseWindow,
  isMobile = false,
}) {
  const [activeTab, setActiveTab] = useState('attivita'); // 'attivita' | 'identita' | 'libreria'
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newMemoryText, setNewMemoryText] = useState('');

  const botColor = activeBot?.color || '#00C972';

  const isComputerActive =
    activeBot?.computerStatus === 'Attivo' ||
    String(activeBot?.computerStatus || '').includes('Connessa');

  const toggleComputer = () => {
    sounds.play('tick');
    const newStatus = isComputerActive ? 'In sospensione' : 'Attivo';
    onUpdateBot({
      ...activeBot,
      computerStatus: newStatus,
    });
  };

  const handleTestVoice = async () => {
    if (isPlayingSample) return;
    sounds.play('tick');
    setIsPlayingSample(true);

    const voiceId = activeBot?.voiceId || 'CiwzbDpaN3pQXjTgx3ML';
    const sampleText = `Ciao Dion! Sono ${activeBot?.name || 'Samantha'}. Questa è la mia voce indipendente in Bot Park.`;

    await speakTextWithElevenLabs({
      text: sampleText,
      voiceId,
      apiKey: elevenLabsApiKey,
      speed: activeBot?.speed || 1.0,
      onStart: () => setIsPlayingSample(true),
      onEnd: () => setIsPlayingSample(false),
      onError: () => setIsPlayingSample(false),
    });
  };

  // Libreria file reali su disco dell'agente selezionato
  const [diskFiles, setDiskFiles] = useState([]);

  useEffect(() => {
    if (!activeBot?.id) return;
    fetch(`/api/fs/list?botId=${encodeURIComponent(activeBot.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.files)) {
          setDiskFiles(d.files);
        }
      })
      .catch(() => {});
  }, [activeBot?.id, activeTab]);

  const libraryFiles = diskFiles.length > 0 ? diskFiles : activeBot?.libraryFiles || [];
  const botTasks = activeBot?.tasks || [];
  const botMemories = activeBot?.memories || [];
  const botSkills = activeBot?.skills || [];

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    sounds.play('tick');
    const updatedTasks = [
      { id: `t_${Date.now()}`, text: newTaskText.trim(), done: false },
      ...botTasks,
    ];
    onUpdateBot({ ...activeBot, tasks: updatedTasks });
    setNewTaskText('');
  };

  const handleToggleTask = (taskId) => {
    sounds.play('tick');
    const updatedTasks = botTasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    onUpdateBot({ ...activeBot, tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId) => {
    sounds.play('tick');
    const updatedTasks = botTasks.filter((t) => t.id !== taskId);
    onUpdateBot({ ...activeBot, tasks: updatedTasks });
  };

  const handleAddMemory = (e) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    sounds.play('tick');
    const updatedMemories = [
      {
        id: `mem_${Date.now()}`,
        text: newMemoryText.trim(),
        date: new Date().toLocaleDateString('it-IT'),
      },
      ...botMemories,
    ];
    onUpdateBot({ ...activeBot, memories: updatedMemories });
    setNewMemoryText('');
  };

  const handleDeleteMemory = (memId) => {
    sounds.play('tick');
    const updatedMemories = botMemories.filter((m) => m.id !== memId);
    onUpdateBot({ ...activeBot, memories: updatedMemories });
  };

  return (
    <aside
      className={`${
        isMobile ? 'w-full' : 'w-72'
      } h-full bg-[#fbfcfc] border-l border-[#e5e7eb] flex flex-col select-none shrink-0 text-[#1f2937] font-['Plus_Jakarta_Sans',sans-serif]`}
    >
      {/* 1. Header identico all'originale Grok Bot (Image 3): Cerchio ( X ) "Chiudi" + separatore "|" + Controlli Finestra (—  □  ×) */}
      <div
        className="h-12 flex items-center justify-end px-3 gap-2 shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* Pulsante circolare ( X ) per chiudere la Sidebar Destra */}
        <button
          onClick={() => {
            sounds.play('tick');
            onCloseSidebarRight && onCloseSidebarRight();
          }}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="w-8 h-8 rounded-full bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          title="Chiudi"
        >
          <X size={15} strokeWidth={2} />
        </button>

        {!isMobile && (
          <>
            {/* Divisore verticale sottile "|" */}
            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            {/* I 3 pulsanti di controllo finestra (Minimizza, Ingrandisci, Chiudi App) */}
            <div
              className="flex items-center gap-1"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <button
                onClick={onMinimize}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/80 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Riduci a icona"
              >
                <Minus size={14} />
              </button>
              <button
                onClick={onMaximize}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/80 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Ingrandisci"
              >
                <MaximizeIcon size={12} />
              </button>
              <button
                onClick={onCloseWindow}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                title="Chiudi applicazione"
              >
                <X size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. Profilo del Bot (Avatar grande, Nome, Tab Attività / Identità / Libreria) */}
      <div className="flex flex-col items-center pt-2 pb-3.5 border-b border-[#e5e7eb]/70 px-4">
        <div className="mb-2">
          <BotAvatar
            bot={activeBot}
            size="large"
            status={isPlayingSample ? 'speaking' : 'idle'}
          />
        </div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight text-center">
          {activeBot?.name}
        </h2>
        <span className="text-[11px] text-gray-400 truncate max-w-full mt-0.5">
          {activeBot?.subtitle}
        </span>

        {/* Schede Attività / Identità / Libreria */}
        <div className="flex items-center gap-5 mt-3 text-xs font-semibold">
          <button
            onClick={() => {
              sounds.play('tick');
              setActiveTab('attivita');
            }}
            className={`pb-1 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'attivita'
                ? 'text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'attivita' ? botColor : 'transparent',
            }}
          >
            Attività
          </button>
          <button
            onClick={() => {
              sounds.play('tick');
              setActiveTab('identita');
            }}
            className={`pb-1 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'identita'
                ? 'text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'identita' ? botColor : 'transparent',
            }}
          >
            Identità
          </button>
          <button
            onClick={() => {
              sounds.play('tick');
              setActiveTab('libreria');
            }}
            className={`pb-1 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'libreria'
                ? 'text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'libreria' ? botColor : 'transparent',
            }}
          >
            Libreria
          </button>
        </div>
      </div>

      {/* 3. Contenuto Scrollabile della Scheda Bot */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {activeTab === 'attivita' ? (
          <>
            {/* Sezione Suggerimenti (Crea una routine + Insegna un'attività) */}
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2 font-medium">
                <span>Suggerimenti</span>
                <button
                  onClick={() => setHideSuggestions(!hideSuggestions)}
                  className="text-[11px] text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {hideSuggestions ? 'Mostra' : 'Nascondi'}
                </button>
              </div>

              {!hideSuggestions && (
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      onCreateRoutine && onCreateRoutine();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5e7eb] hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={15} style={{ color: botColor }} />
                      <span className="text-gray-800 font-medium">Crea una routine</span>
                    </div>
                    <ChevronRight size={13} className="text-gray-400" />
                  </button>

                  {/* Feature #1 dallo scraping Grok Bot: Insegna un'attività (Teach Mode / Screen Record) */}
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      onOpenTeachModal && onOpenTeachModal();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5e7eb] hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Video size={15} style={{ color: botColor }} />
                      <span className="text-gray-800 font-medium">Insegna un'attività</span>
                    </div>
                    <ChevronRight size={13} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Feature #6 dallo scraping Grok Bot: Promemoria & Task Interattivi */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium flex items-center justify-between">
                <span>Promemoria & Task</span>
                <span className="text-[10px] text-gray-400">
                  {botTasks.filter((t) => !t.done).length} attivi
                </span>
              </div>

              <form onSubmit={handleAddTask} className="flex gap-1.5">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder={`Nuovo task per ${activeBot?.name}...`}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-[11px] text-gray-800 focus:outline-none focus:border-gray-400"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-xl text-white font-bold flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: botColor }}
                  title="Aggiungi promemoria/task"
                >
                  <Plus size={13} />
                </button>
              </form>

              {botTasks.length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {botTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-gray-200/80 text-[11px]"
                    >
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => handleToggleTask(t.id)}
                          className="rounded cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            t.done ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                          }`}
                        >
                          {t.text}
                        </span>
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        {!t.done && onRunTaskInChat && (
                          <button
                            onClick={() => onRunTaskInChat(t.text)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer"
                            title="Fai svolgere subito questo task al Bot"
                          >
                            <Play size={11} style={{ color: botColor }} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Elimina task"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sezione Computer & Smart TV del Bot */}
            <div className="space-y-2.5">
              <div className="text-gray-500 font-medium flex items-center justify-between">
                <span>Computer & Smart TV</span>
                <button
                  onClick={() => onOpenComputer && onOpenComputer('tv')}
                  className="text-[10px] font-bold hover:underline cursor-pointer"
                  style={{ color: botColor }}
                >
                  Apri Schermo ↗
                </button>
              </div>

              <div
                onClick={() => onOpenComputer && onOpenComputer('terminal')}
                className="p-3 rounded-2xl bg-white border border-[#e5e7eb] flex items-center justify-between shadow-xs hover:border-gray-300 transition-all cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <span>Computer del Bot</span>
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isComputerActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span>{isComputerActive ? 'Attivo & Pronto' : 'In sospensione'}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComputer();
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isComputerActive
                      ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600 shadow-xs'
                      : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600'
                  }`}
                  title="Attiva / Sospendi Computer Virtuale"
                >
                  <Power size={15} />
                </button>
              </div>

              {/* Card dedicata Controllo Diretto Smart TV Android (172.20.10.3) */}
              <div
                onClick={() => onOpenComputer && onOpenComputer('tv')}
                className="p-3 rounded-2xl bg-gradient-to-r from-pink-50/80 to-white border border-pink-200/80 flex items-center justify-between shadow-xs hover:border-pink-400 transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <span>📺 Smart TV Salotto</span>
                  </div>
                  <div className="text-[10.5px] text-pink-600 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>172.20.10.3 • Telecomando & Live</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-pink-500" />
              </div>
            </div>

            {/* Sezione Chat Vocale (Integrata con ElevenLabs & colore dell'Agente) */}
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2 font-medium">
                <span>Chat vocale</span>
                <button
                  onClick={handleTestVoice}
                  disabled={isPlayingSample}
                  className="text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ color: botColor }}
                >
                  <Volume2 size={12} className={isPlayingSample ? 'animate-bounce' : ''} />
                  <span>{isPlayingSample ? 'Parla...' : 'Ascolta'}</span>
                </button>
              </div>

              <div className="space-y-3 bg-white p-3 rounded-2xl border border-[#e5e7eb]">
                <div className="space-y-1">
                  <span className="text-gray-500 text-[11px] block">Voce Agente (ElevenLabs)</span>
                  <select
                    value={activeBot?.voiceId || 'CiwzbDpaN3pQXjTgx3ML'}
                    onChange={(e) =>
                      onUpdateBot({
                        ...activeBot,
                        voiceId: e.target.value,
                        voice:
                          ELEVEN_LABS_VOICES.find((v) => v.id === e.target.value)?.name ||
                          'Samantha',
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none"
                  >
                    {ELEVEN_LABS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Velocità</span>
                  <select
                    value={activeBot?.speed || '1.0x'}
                    onChange={(e) =>
                      onUpdateBot({ ...activeBot, speed: e.target.value })
                    }
                    className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="0.9x">0.9x ⌵</option>
                    <option value="1.0x">1.0x ⌵</option>
                    <option value="1.05x">1.05x ⌵</option>
                    <option value="1.15x">1.15x ⌵</option>
                    <option value="1.25x">1.25x ⌵</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Lingua</span>
                  <select
                    value={activeBot?.language || 'Italian'}
                    onChange={(e) =>
                      onUpdateBot({ ...activeBot, language: e.target.value })
                    }
                    className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Italian">Italian ⌵</option>
                    <option value="English">English ⌵</option>
                  </select>
                </div>

                {/* Pulsante Chiamata Vocale Live col colore dell'Agente attivo! */}
                <button
                  onClick={() => {
                    sounds.play('open');
                    onStartVoiceCall && onStartVoiceCall();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: botColor }}
                >
                  <Volume2 size={13} />
                  <span>Avvia Chiamata Vocale Live</span>
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'identita' ? (
          /* Scheda Identità Indipendente + Memorie & Skill dell'Agente (Feature #2) */
          <div className="space-y-4">
            <div
              className="p-2.5 rounded-xl border text-[11px] flex items-center gap-2"
              style={{
                backgroundColor: `${botColor}12`,
                borderColor: `${botColor}40`,
                color: '#1f2937',
              }}
            >
              <Sparkles size={14} style={{ color: botColor }} className="shrink-0" />
              <span>
                <strong>{activeBot?.name}</strong> ha memoria, personalità, skill e voce indipendenti dagli altri bot.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Ruolo / Sottotitolo
              </label>
              <input
                type="text"
                value={activeBot?.subtitle || ''}
                onChange={(e) =>
                  onUpdateBot({ ...activeBot, subtitle: e.target.value })
                }
                className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-500">
                  Istruzioni & Personalità Indipendente
                </label>
                {savedBadge && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <Check size={11} /> Salvato
                  </span>
                )}
              </div>
              <textarea
                rows={6}
                value={activeBot?.systemInstruction || ''}
                onChange={(e) => {
                  onUpdateBot({ ...activeBot, systemInstruction: e.target.value });
                  setSavedBadge(true);
                  setTimeout(() => setSavedBadge(false), 1500);
                }}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-[11.5px] leading-relaxed text-gray-800 focus:outline-none focus:border-gray-900 resize-y"
              />
            </div>

            {/* Feature #2 dallo scraping Grok Bot: Memorie Specifiche dell'Agente */}
            <div className="space-y-2 pt-1 border-t border-gray-200/70">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                  <Brain size={13} style={{ color: botColor }} />
                  <span>Memorie di {activeBot?.name}</span>
                </span>
                <span className="text-[10px] text-gray-400">{botMemories.length} voci</span>
              </div>

              <form onSubmit={handleAddMemory} className="flex gap-1.5">
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Aggiungi una regola o fatto da ricordare..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-[11px] text-gray-800 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: botColor }}
                >
                  <Plus size={13} />
                </button>
              </form>

              {botMemories.length === 0 ? (
                <p className="text-[10.5px] text-gray-400 italic">
                  Ancora nessuna memoria specifica. Aggiungine una qui o chiedi al Bot in chat di ricordarla.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {botMemories.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-[11px] flex items-start justify-between gap-2"
                    >
                      <span className="text-gray-700 leading-snug">{m.text}</span>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skill Insegnate a questo Bot */}
            {botSkills.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-gray-200/70">
                <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                  <BookOpen size={13} style={{ color: botColor }} />
                  <span>Skill insegnate ({botSkills.length})</span>
                </div>
                {botSkills.map((sk) => (
                  <div
                    key={sk.id}
                    onClick={() => onOpenFileInEditor && onOpenFileInEditor(sk.fileName)}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="font-bold text-gray-800 text-[11px]">{sk.title}</div>
                    <div className="text-[10px] text-gray-500 truncate">{sk.steps}</div>
                  </div>
                ))}
              </div>
            )}

            {!activeBot?.isGroup && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Forma Geometria Grok Bot ({GROK_BOT_SHAPES.length})
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-gray-200">
                    {GROK_BOT_SHAPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          sounds.play('tick');
                          onUpdateBot({ ...activeBot, avatarShape: s.id, tilt: s.tilt });
                        }}
                        className={`p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                          activeBot?.avatarShape === s.id
                            ? 'border-gray-900 bg-gray-100 scale-105'
                            : 'border-transparent hover:bg-gray-50'
                        }`}
                        title={s.label}
                      >
                        <svg viewBox="0 0 100 100" className="w-6 h-6">
                          <path d={getShapeSvgPath(s.id)} fill={activeBot?.color || '#1084FE'} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Colore Agente
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {GROK_BOT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          sounds.play('tick');
                          onUpdateBot({ ...activeBot, color: c.value });
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          activeBot?.color?.toLowerCase() === c.value.toLowerCase()
                            ? 'border-gray-900 scale-115 shadow'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Scheda Libreria specifica dell'Agente */
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                File & Memoria di {activeBot?.name}
              </div>
              <div className="space-y-1.5">
                {libraryFiles.map((f) => (
                  <div
                    key={f.id || f.name}
                    onClick={() => {
                      sounds.play('tick');
                      if (onOpenFileInEditor) onOpenFileInEditor(f.name);
                      else if (onOpenComputer) onOpenComputer('files');
                    }}
                    className="p-2.5 rounded-xl bg-white border border-[#e5e7eb] hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer"
                    title="Clicca per aprire e modificare questo file su disco"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText size={16} style={{ color: botColor }} className="shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-gray-800 truncate text-xs">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {f.date} • {f.size}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

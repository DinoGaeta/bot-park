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
  elevenLabsApiKey,
  onMinimize,
  onMaximize,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('attivita'); // 'attivita' | 'identita' | 'libreria'
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

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
    const sampleText = `Ciao! Sono ${activeBot?.name || 'capo-bot'}. Questa è la mia voce indipendente in Bot Park.`;

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

  return (
    <aside className="w-72 h-full bg-[#fbfcfc] border-l border-[#e5e7eb] flex flex-col select-none shrink-0 text-[#1f2937] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header con Window Controls in alto a destra */}
      <div className="h-10 flex items-center justify-end px-3 gap-1 shrink-0">
        <button
          onClick={onMinimize}
          className="p-1 rounded hover:bg-gray-200/80 text-gray-400 hover:text-gray-700 transition-colors"
          title="Riduci a icona"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={onMaximize}
          className="p-1 rounded hover:bg-gray-200/80 text-gray-400 hover:text-gray-700 transition-colors"
          title="Ingrandisci"
        >
          <MaximizeIcon size={11} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Chiudi"
        >
          <X size={14} />
        </button>
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
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
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
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
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
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Libreria
          </button>
        </div>
      </div>

      {/* 3. Contenuto Scrollabile della Scheda Bot */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {activeTab === 'attivita' ? (
          <>
            {/* Sezione Suggerimenti (senza pulsante Slack!) */}
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
                      <Clock size={15} className="text-gray-500" />
                      <span className="text-gray-800 font-medium">Crea una routine</span>
                    </div>
                    <ChevronRight size={13} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Sezione Computer & Smart TV del Bot */}
            <div className="space-y-2.5">
              <div className="text-gray-500 font-medium flex items-center justify-between">
                <span>Computer & Smart TV</span>
                <button
                  onClick={() => onOpenComputer && onOpenComputer('tv')}
                  className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
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

              {/* Card dedicata Controllo Diretto Smart TV Android (Android TV) */}
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
                    <span>Android TV • Telecomando & Live</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-pink-500" />
              </div>
            </div>

            {/* Sezione Chat Vocale (Integrata con ElevenLabs & Capo Bot) */}
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2 font-medium">
                <span>Chat vocale</span>
                <button
                  onClick={handleTestVoice}
                  disabled={isPlayingSample}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 size={12} className={isPlayingSample ? 'animate-bounce' : ''} />
                  <span>{isPlayingSample ? 'Parla...' : 'Ascolta'}</span>
                </button>
              </div>

              <div className="space-y-3 bg-white p-3 rounded-2xl border border-[#e5e7eb]">
                {/* Voce ElevenLabs Indipendente per l'Agente */}
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
                          'capo-bot',
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-green-600"
                  >
                    {ELEVEN_LABS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Velocità */}
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

                {/* Lingua */}
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

                {/* Pulsante Chiamata Vocale Live con Gemini + ElevenLabs */}
                <button
                  onClick={() => {
                    sounds.play('open');
                    onStartVoiceCall && onStartVoiceCall();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Volume2 size={13} />
                  <span>Avvia Chiamata Vocale Live</span>
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'identita' ? (
          /* Scheda Identità Indipendente dell'Agente (Ruolo, Istruzioni, Forma e Colore) */
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-600 shrink-0" />
              <span>
                <strong>{activeBot?.name}</strong> ha memoria, personalità e voce indipendenti dagli altri bot.
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
                rows={7}
                value={activeBot?.systemInstruction || ''}
                onChange={(e) => {
                  onUpdateBot({ ...activeBot, systemInstruction: e.target.value });
                  setSavedBadge(true);
                  setTimeout(() => setSavedBadge(false), 1500);
                }}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-[11.5px] leading-relaxed text-gray-800 focus:outline-none focus:border-gray-900 resize-y"
              />
            </div>

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
                      <FileText size={16} className="text-gray-400 shrink-0" />
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


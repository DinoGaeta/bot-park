import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Play,
  Plus,
  Trash2,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function RoutineModal({
  isOpen,
  onClose,
  bots = [],
  activeBot,
  routines = [],
  onAddRoutine,
  onToggleRoutine,
  onDeleteRoutine,
  onRunRoutineNow,
}) {
  const [selectedBotId, setSelectedBotId] = useState(activeBot?.id || 'capo-bot');
  const [time, setTime] = useState('08:30');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [alsoOnTv, setAlsoOnTv] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;
    sounds.play('success');
    onAddRoutine({
      id: `rt_${Date.now()}`,
      botId: selectedBotId,
      time,
      title: title.trim(),
      prompt: prompt.trim(),
      alsoOnTv,
      enabled: true,
      lastRunDate: '',
    });
    setTitle('');
    setPrompt('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden text-gray-800"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#fbfcfc]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Routine Automatiche & Sveglie Agenti
                </h2>
                <p className="text-xs text-gray-500">
                  Pianifica task giornalieri per Capo Bot e la squadra Kitsune Labs (anche su Smart TV)
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.play('tick');
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-gray-200/70 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Form Creazione Nuova Routine */}
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-2xl bg-[#f7f8f9] border border-gray-200/80 space-y-3"
            >
              <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-600" />
                <span>Nuova Routine Programmata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Agente Responsabile
                  </label>
                  <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800"
                  >
                    {bots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Orario Giornaliero
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Nome Routine
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es. Buongiorno & News"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Istruzione / Azione da Eseguire Automaticamente
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Es. Controlla il meteo di Torino e le ultime notizie, saluta Utente e accendi YouTube sulla TV"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoOnTv}
                    onChange={(e) => setAlsoOnTv(e.target.checked)}
                    className="rounded text-pink-600"
                  />
                  <Tv size={14} className="text-pink-600" />
                  <span>Esegui e pronuncia anche sulla Smart TV (Android TV)</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
                >
                  Aggiungi Routine
                </button>
              </div>
            </form>

            {/* 2. Lista Routine Attive */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Routine Programmate ({routines.length})
              </div>

              {routines.map((rt) => {
                const bot = bots.find((b) => b.id === rt.botId) || bots[0];
                return (
                  <div
                    key={rt.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      rt.enabled
                        ? 'bg-white border-gray-200 shadow-2xs'
                        : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BotAvatar bot={bot} size="small" interactive={false} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono font-bold text-xs border border-emerald-200">
                            {rt.time}
                          </span>
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {rt.title}
                          </span>
                          <span className="text-[11px] text-gray-400">• {bot?.name}</span>
                          {rt.alsoOnTv && (
                            <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 text-[10px] font-bold">
                              📺 TV
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-gray-500 truncate mt-0.5">
                          {rt.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          sounds.play('tick');
                          onRunRoutineNow(rt);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Esegui subito questa routine"
                      >
                        <Play size={11} />
                        <span>Esegui ora</span>
                      </button>

                      <button
                        onClick={() => onToggleRoutine(rt.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          rt.enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {rt.enabled ? 'Attiva' : 'Pausa'}
                      </button>

                      <button
                        onClick={() => onDeleteRoutine(rt.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Elimina routine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


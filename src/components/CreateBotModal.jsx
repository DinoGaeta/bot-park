import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Check, Bot } from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { GROK_BOT_SHAPES, GROK_BOT_COLORS, getShapeSvgPath } from '../data/botShapes';
import BotAvatar from './BotAvatar';

export default function CreateBotModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [color, setColor] = useState('#00C972'); // Green Grok Bot default
  const [avatarShape, setAvatarShape] = useState('bean');
  const [systemInstruction, setSystemInstruction] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    sounds.play('success');
    onCreate({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      subtitle: role.trim() || 'Pronto per nuovi compiti...',
      color,
      avatarShape,
      systemInstruction:
        systemInstruction.trim() ||
        `Sei ${name}, un assistente AI specializzato in Bot Park (Bot Park). Ruolo: ${role}.`,
      voice: 'Cosmo',
      speed: '1.25x',
      language: 'Italian',
      computerStatus: 'Attivo',
    });

    setName('');
    setRole('');
    setSystemInstruction('');
    onClose();
  };

  const previewBot = {
    id: 'preview',
    name: name || 'Nuovo Bot',
    color,
    avatarShape,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        className="bg-white rounded-3xl border border-gray-200 p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header con Anteprima Live dell'Avatar */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <BotAvatar bot={previewBot} size="large" status="idle" />
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-tight">
              Forgia Nuovo Agente con Ciccio
            </h3>
            <p className="text-[11px] text-gray-500">
              Personalizza forma, colore e istruzioni per il tuo bot
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Nome & Ruolo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Nome del Bot
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. VideoScout, Maya, Echo"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-600 bg-gray-50/50"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Ruolo / Sottotitolo
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="es. YouTube Researcher, Copywriter"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-600 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Scelta della Sagoma (Forme Ufficiali Grok Bot + Dino) */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Forma dell'Avatar (Sagome Originali Grok Bot)
            </label>
            <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-200/80 max-h-36 overflow-y-auto">
              {GROK_BOT_SHAPES.map((s) => {
                const isSelected = avatarShape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      sounds.play('tick');
                      setAvatarShape(s.id);
                    }}
                    className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-white shadow-md border border-gray-300 scale-105'
                        : 'hover:bg-white/60'
                    }`}
                    title={s.label}
                  >
                    <svg viewBox="0 0 100 100" className="w-6 h-6">
                      <path
                        d={getShapeSvgPath(s.id)}
                        fill={isSelected ? color : '#9ca3af'}
                      />
                    </svg>
                    <span className="text-[9px] text-gray-600 font-medium truncate w-full text-center mt-1">
                      {s.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Colori Ufficiali Grok Bot */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Colore Ufficiale
            </label>
            <div className="flex flex-wrap gap-2">
              {GROK_BOT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    sounds.play('tick');
                    setColor(c.value);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={`${c.label} (${c.value})`}
                >
                  {color === c.value && <Check size={12} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt di Sistema / Istruzioni */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Istruzioni di Sistema (Personalità & Compito)
            </label>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="Spiega a questo bot come comportarsi, quale stile comunicativo adottare e cosa deve realizzare per te..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-600 bg-gray-50/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles size={14} />
              <span>Forgia Agente</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


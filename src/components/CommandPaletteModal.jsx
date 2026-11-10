import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  MessageSquare,
  Settings,
  Clock,
  Monitor,
  Tv,
  Video,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  bots = [],
  botMessages = {},
  onSelectBot,
  onOpenSettings,
  onOpenRoutine,
  onOpenTeach,
  onOpenComputer,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedBots = bots.filter(
    (b) =>
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.subtitle || '').toLowerCase().includes(q)
  );

  // Cerca nei messaggi di tutte le chat
  const matchedMessages = [];
  if (q.length >= 2) {
    for (const b of bots) {
      const msgs = botMessages[b.id] || [];
      msgs.forEach((m) => {
        if (m.content && m.content.toLowerCase().includes(q)) {
          matchedMessages.push({
            bot: b,
            snippet: m.content.slice(0, 110),
            role: m.role,
          });
        }
      });
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: -10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
        >
          {/* Barra di ricerca */}
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <Search size={17} className="text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca Bot, chat, skill, impostazioni..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
            {/* Azioni Rapide */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase px-2.5 mb-1">
                Azioni Rapide
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    onClose();
                    onOpenTeach && onOpenTeach();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <Video size={14} className="text-pink-500" />
                  <span>Insegna un'attività (Skill)</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenRoutine && onOpenRoutine();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <Clock size={14} className="text-amber-500" />
                  <span>Gestisci Routine orarie</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenComputer && onOpenComputer('tv');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <Tv size={14} className="text-emerald-600" />
                  <span>Smart TV Salotto (172.20.10.3)</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings && onOpenSettings('cassaforte');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <Settings size={14} className="text-blue-500" />
                  <span>Apri Cassaforte & Impostazioni</span>
                </button>
              </div>
            </div>

            {/* Agenti */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase px-2.5 mb-1">
                Agenti ({matchedBots.length})
              </div>
              <div className="space-y-1">
                {matchedBots.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      sounds.play('tick');
                      onSelectBot(b.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-left transition-colors cursor-pointer"
                  >
                    <BotAvatar bot={b} size="small" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900">{b.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{b.subtitle}</div>
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Messaggi trovati nelle chat */}
            {matchedMessages.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase px-2.5 mb-1">
                  Messaggi nelle conversazioni ({matchedMessages.length})
                </div>
                <div className="space-y-1">
                  {matchedMessages.slice(0, 8).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        sounds.play('tick');
                        onSelectBot(item.bot.id);
                        onClose();
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-800">
                          Chat con {item.bot.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{item.snippet}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

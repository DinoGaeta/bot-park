import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Settings,
  Clock,
  Tv,
  Video,
  Sparkles,
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Calcola l'ultimo messaggio per ciascun bot (come nello screenshot originale)
  const getBotLastPreview = (bot) => {
    const msgs = botMessages[bot.id] || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const text = String(msgs[i]?.content || '')
        .replace(/\*\*/g, '')
        .replace(/<<<[\s\S]*?>>>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }
    return bot.subtitle || '';
  };

  const matchedBots = bots.filter((b) => {
    if (!q) return true;
    const preview = getBotLastPreview(b).toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.subtitle || '').toLowerCase().includes(q) ||
      preview.includes(q)
    );
  });

  // Cerca nei messaggi di tutte le chat quando l'utente digita
  const matchedMessages = [];
  if (q.length >= 2) {
    for (const b of bots) {
      const msgs = botMessages[b.id] || [];
      msgs.forEach((m) => {
        if (m.content && m.content.toLowerCase().includes(q)) {
          matchedMessages.push({
            bot: b,
            snippet: m.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').slice(0, 110),
            role: m.role,
          });
        }
      });
    }
  }

  // Cerca nelle impostazioni / azioni quando l'utente digita o in fondo
  const settingsItems = [
    {
      id: 'set-general',
      title: 'Impostazioni Generali & Aspetto',
      subtitle: 'Tema, effetti sonori, avvio automatico e memoria condivisa',
      icon: Settings,
      action: () => onOpenSettings && onOpenSettings('generali'),
    },
    {
      id: 'set-vault',
      title: 'Cassaforte & Credenziali (API Key)',
      subtitle: 'Gestisci chiavi Gemini, ElevenLabs e segreti degli agenti',
      icon: Sparkles,
      action: () => onOpenSettings && onOpenSettings('cassaforte'),
    },
    {
      id: 'set-teach',
      title: "Insegna un'attività (Skill)",
      subtitle: 'Registra lo schermo PC e insegna una procedura ripetibile al Bot',
      icon: Video,
      action: () => onOpenTeach && onOpenTeach(),
    },
    {
      id: 'set-routine',
      title: 'Routine Programmate & Sveglie',
      subtitle: 'Pianifica task automatici giornalieri su PC e Smart TV',
      icon: Clock,
      action: () => onOpenRoutine && onOpenRoutine(),
    },
    {
      id: 'set-tv',
      title: 'Controllo Smart TV Android',
      subtitle: 'Telecomando ADB, streaming live e voce su TV',
      icon: Tv,
      action: () => onOpenComputer && onOpenComputer('tv'),
    },
  ].filter(
    (item) =>
      q.length > 0 &&
      (item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q))
  );

  // Navigazione da tastiera Freccia Su / Giù / Invio / Esc
  const handleKeyDown = (e) => {
    const total = matchedBots.length;
    if (e.key === 'ArrowDown' && total > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % total);
    } else if (e.key === 'ArrowUp' && total > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === 'Enter' && matchedBots[selectedIndex]) {
      e.preventDefault();
      sounds.play('tick');
      onSelectBot(matchedBots[selectedIndex].id);
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/25 flex items-start justify-center pt-16 p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[600px] bg-white rounded-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-gray-200/80 overflow-hidden"
        >
          {/* Barra di ricerca identica all'originale */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Cerca Bot, chat, impostazioni..."
              className="flex-1 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent font-normal"
            />
          </div>

          <div className="max-h-[68vh] overflow-y-auto px-3 pb-3 space-y-3">
            {/* Sezione Bot (esattamente come nello screenshot originale) */}
            {matchedBots.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-400 px-3 py-1.5">
                  Bot
                </div>
                <div className="space-y-0.5">
                  {matchedBots.map((b, idx) => {
                    const isSelected = idx === selectedIndex;
                    const lastPreview = getBotLastPreview(b);
                    return (
                      <button
                        key={b.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          sounds.play('tick');
                          onSelectBot(b.id);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#ededed]' : 'hover:bg-[#f4f4f5]'
                        }`}
                      >
                        <BotAvatar bot={b} size="small" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium text-gray-900 leading-snug truncate">
                            {b.name}
                          </div>
                          <div className="text-[13px] text-gray-500 truncate leading-snug">
                            {lastPreview}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sezione Chat / Messaggi trovati quando si digita */}
            {matchedMessages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-400 px-3 py-1.5">
                  Chat
                </div>
                <div className="space-y-0.5">
                  {matchedMessages.slice(0, 6).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        sounds.play('tick');
                        onSelectBot(item.bot.id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-[#f4f4f5] text-left cursor-pointer"
                    >
                      <MessageSquare size={16} className="text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-gray-900">
                          {item.bot.name}
                        </div>
                        <div className="text-[13px] text-gray-500 truncate">
                          {item.snippet}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sezione Impostazioni & Azioni quando si cerca */}
            {settingsItems.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-400 px-3 py-1.5">
                  Impostazioni
                </div>
                <div className="space-y-0.5">
                  {settingsItems.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          sounds.play('tick');
                          onClose();
                          item.action();
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-[#f4f4f5] text-left cursor-pointer"
                      >
                        <IconComp size={16} className="text-gray-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-gray-900">
                            {item.title}
                          </div>
                          <div className="text-[13px] text-gray-500 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {matchedBots.length === 0 &&
              matchedMessages.length === 0 &&
              settingsItems.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  Nessun Bot o messaggio corrispondente a «{query}»
                </div>
              )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

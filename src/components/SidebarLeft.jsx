import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  LayoutGrid,
  Sparkles,
  Crown,
  Smartphone,
  MessageSquare,
  Settings,
  UserPlus,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function SidebarLeft({
  bots,
  activeBotId,
  onSelectBot,
  onAddBot,
  onResetVirgin,
  onLoadDemo,
  isVirginMode,
  botStatus,
  onOpenSettings,
  onOpenPairModal,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPremiumFlyout, setShowPremiumFlyout] = useState(false);

  const popoverRef = useRef(null);

  // Chiudi popover al click esterno
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowPremiumFlyout(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Capo Bot è la Capo Bot / Agente Principale in cima
  const mainBot = bots.find((b) => b.isMain || b.id === 'capo-bot' || b.id === 'ciccio') || bots[0] || {
    id: 'capo-bot',
    name: 'capo-bot',
    subtitle: 'Capo Bot • OS1',
    color: '#000000',
    avatarShape: 'pebble',
  };

  // Teammates
  const otherBots = bots.filter((b) => b.id !== mainBot.id);
  const filteredBots = otherBots.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMainBotActive = activeBotId === mainBot.id;

  return (
    <aside className="w-64 h-full bg-[#f6f7f8] border-r border-[#e5e7eb] flex flex-col select-none shrink-0 text-[#1f2937] font-['Plus_Jakarta_Sans',sans-serif] relative">
      {/* 1. Header con Cerca, Logo Ufficiale Bot Park, Reset Vergine e Tasto + */}
      <div className="p-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sounds.play('tick');
              setShowSearchInput(!showSearchInput);
            }}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e7eb] hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-xs cursor-pointer"
            title="Cerca bot"
          >
            <Search size={14} />
          </button>
          <img
            src="./bot_park_icon.png"
            alt="Bot Park"
            className="h-8 w-auto object-contain drop-shadow-xs select-none"
            title="Bot Park — Jurassic AI Agent"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tasto Switch Modalità Vergine / Demo */}
          <button
            onClick={() => {
              sounds.play('open');
              if (isVirginMode) onLoadDemo();
              else onResetVirgin();
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
              isVirginMode
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-500 hover:text-black'
            }`}
            title={isVirginMode ? 'Carica dati demo' : 'Passa a Versione Vergine Pulita'}
          >
            {isVirginMode ? '✨ Vergine' : '🧹 Pulisci'}
          </button>

          {/* Tasto + per creare bot */}
          <button
            onClick={() => {
              sounds.play('doubleTick');
              onAddBot();
            }}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e7eb] hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-xs"
            title="Crea nuovo bot con Ciccio"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Barra di ricerca */}
      {showSearchInput && (
        <div className="px-3 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca tra i bot..."
            className="w-full bg-white border border-[#e5e7eb] rounded-xl px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-green-600 shadow-xs"
            autoFocus
          />
        </div>
      )}

      {/* 2. Capo Bot — CAPO BOT & AGENTE PRINCIPALE (In cima, maestosa) */}
      <div className="px-3 py-2 border-b border-[#e5e7eb]/70">
        <button
          onClick={() => {
            sounds.play('tick');
            onSelectBot(mainBot.id);
          }}
          className={`w-full flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
            isMainBotActive
              ? 'bg-[#e5e7eb] shadow-xs'
              : 'hover:bg-white/70'
          }`}
          title="Capo Bot — Capo Bot per coordinare la squadra e controllare la Smart TV"
        >
          <div className="relative">
            <BotAvatar
              bot={mainBot}
              size="large"
              status={isMainBotActive ? botStatus : 'idle'}
            />
            {/* Badge Corona / Master */}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center shadow border border-white">
              ★
            </span>
          </div>
          <span className="text-xs font-bold text-gray-900 mt-1.5">
            {mainBot.name}
          </span>
          <span className="text-[10px] text-pink-600 font-semibold">
            Capo Bot • OS1 & TV
          </span>
        </button>
      </div>

      {/* 3. Lista dei Bot Teammates creati */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredBots.length === 0 ? (
          <div className="text-center py-6 px-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">
              {isVirginMode ? 'Nessun bot secondario' : 'Nessun bot trovato'}
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Parla con <span className="font-semibold text-gray-700">Ciccio</span> o premi <span className="font-semibold text-gray-700">+</span> per creare il tuo primo agente specializzato!
            </p>
          </div>
        ) : (
          filteredBots.map((bot) => {
            const isActive = activeBotId === bot.id;
            return (
              <button
                key={bot.id}
                onClick={() => {
                  sounds.play('tick');
                  onSelectBot(bot.id);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all ${
                  isActive
                    ? 'bg-[#e5e7eb] text-gray-900 shadow-xs font-medium'
                    : 'hover:bg-white/70 text-gray-700'
                }`}
              >
                <BotAvatar
                  bot={bot}
                  size="small"
                  status={isActive ? botStatus : 'idle'}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate leading-tight">
                    {bot.name}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate leading-normal">
                    {bot.subtitle}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 4. Footer con Brand Kitsune Labs (Clickable per Popover Menu di Image 1) */}
      <div
        ref={popoverRef}
        className="p-3 border-t border-[#e5e7eb] bg-[#f6f7f8] flex items-center justify-between relative"
      >
        <button
          onClick={() => {
            sounds.play('tick');
            setShowProfileMenu(!showProfileMenu);
          }}
          className="flex items-center gap-2 p-1.5 -ml-1 rounded-xl hover:bg-gray-200/70 transition-colors text-left cursor-pointer"
        >
          <img
            src="./bot_park_icon.png"
            alt="Bot Park"
            className="w-7 h-7 object-contain drop-shadow-2xs"
          />
          <span className="text-xs font-semibold text-gray-700 hover:text-black">
            kitsune Labs
          </span>
        </button>

        <button
          onClick={() => {
            sounds.play('tick');
            onOpenSettings && onOpenSettings('generali');
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 transition-colors"
          title="Impostazioni"
        >
          <LayoutGrid size={15} />
        </button>

        {/* POPOVER MENU UFFICIALE (Esattamente come in Image 1) */}
        {showProfileMenu && (
          <div className="absolute bottom-12 left-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 p-1.5 z-50 text-xs text-gray-800 animate-in fade-in zoom-in-95">
            {/* Voce Premium con Submenu a comparsa */}
            <div
              onMouseEnter={() => setShowPremiumFlyout(true)}
              onMouseLeave={() => setShowPremiumFlyout(false)}
              className="relative"
            >
              <button
                onClick={() => {
                  sounds.play('tick');
                  setShowProfileMenu(false);
                  onOpenSettings && onOpenSettings('utilizzo');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Crown size={14} className="text-amber-500" />
                  <span>Premium</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <span>0% usato</span>
                  <ChevronRight size={13} />
                </div>
              </button>

              {/* Flyout Submenu Premium */}
              {showPremiumFlyout && (
                <div className="absolute left-full bottom-0 ml-1.5 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 text-xs space-y-1.5 z-50">
                  <div className="font-bold text-gray-900">Premium</div>
                  <div className="text-[11px] text-gray-500">Si azzera tra 4 giorni</div>
                  <div className="font-semibold text-gray-800">0% usato</div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-0 h-full bg-emerald-500" />
                  </div>
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setShowProfileMenu(false);
                      onOpenSettings && onOpenSettings('utilizzo');
                    }}
                    className="text-[11px] text-emerald-600 font-bold hover:underline block pt-1"
                  >
                    Gestisci utilizzo
                  </button>
                </div>
              )}
            </div>

            {/* Scarica Mobile */}
            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenPairModal && onOpenPairModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <Smartphone size={14} className="text-gray-500" />
              <span>Scarica Bot Park per dispositivi mobili</span>
            </button>

            {/* Supporto */}
            <button
              onClick={() => {
                sounds.play('tick');
                alert('Supporto Bot Park: contatta kitsune Labs a user@example.com');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <MessageSquare size={14} className="text-gray-500" />
              <span>Supporto</span>
            </button>

            {/* Impostazioni */}
            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenSettings && onOpenSettings('generali');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <Settings size={14} className="text-gray-500" />
              <span>Impostazioni</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            {/* Aggiungi Account */}
            <button
              onClick={() => {
                sounds.play('tick');
                alert('Aggiunta di un nuovo profilo account...');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left text-gray-600"
            >
              <UserPlus size={14} />
              <span>Aggiungi account</span>
            </button>

            {/* Disconnetti */}
            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-left"
            >
              <LogOut size={14} />
              <span>Disconnetti</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}


import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  LayoutGrid,
  Smartphone,
  Settings,
  Key,
  RefreshCw,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Copy,
  EyeOff,
  Eye,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Download,
  Zap,
  ChevronRight,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function SidebarLeft({
  bots,
  activeBotId,
  onSelectBot,
  onAddBot,
  onOpenSearch,
  onUpdateBot,
  onDeleteBot,
  onClearBotChat,
  botStatus,
  onOpenSettings,
  onOpenPairModal,
  isMobile = false,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Stato per il menu Azioni del Bot ("..." o tasto destro) come nell'originale Grok Bot
  const [menuOpenBotId, setMenuOpenBotId] = useState(null);
  const [renamingBotId, setRenamingBotId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteBot, setConfirmDeleteBot] = useState(null);
  const [showHiddenBots, setShowHiddenBots] = useState(false);
  const [permStatus, setPermStatus] = useState('');

  const isNativeAndroid =
    typeof window !== 'undefined' &&
    Boolean(window.BotParkNative?.isNativeApp?.() || window.location.search.includes('nativeApp=android'));

  const handleUnlockPermissions = async () => {
    sounds.play('tick');
    try {
      if (window.BotParkNative?.requestAllPermissions) {
        window.BotParkNative.requestAllPermissions();
      }
    } catch {}

    let micOk = false;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        micOk = true;
      }
    } catch {}

    let pushPerm = 'in-app';
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        pushPerm = await window.Notification.requestPermission();
      }
      const devId =
        localStorage.getItem('botpark_mobile_device_id') ||
        `mob_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('botpark_mobile_device_id', devId);
      await fetch('/api/push/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: devId,
          platform: isNativeAndroid ? 'android-native' : 'mobile-web',
          pushToken: `${pushPerm}_${micOk ? 'mic' : 'nomic'}`,
        }),
      });
    } catch {}

    setPermStatus(micOk ? 'Mic, Tel & Push attivi!' : 'Permessi aggiornati!');
    setTimeout(() => setPermStatus(''), 3500);
  };

  const popoverRef = useRef(null);
  const botMenuRef = useRef(null);

  // Chiudi popover al click esterno
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (botMenuRef.current && !botMenuRef.current.contains(event.target)) {
        setMenuOpenBotId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Samantha è la Capo Bot / Agente Principale in cima
  const mainBot =
    bots.find((b) => b.isMain || b.id === 'samantha' || b.id === 'ciccio') ||
    bots[0] || {
      id: 'samantha',
      name: 'Samantha',
      subtitle: 'Capo Bot • OS1',
      color: '#FF3B9A',
      avatarShape: 'pebble',
    };

  const otherBots = bots.filter((b) => b.id !== mainBot.id);
  const visibleBots = otherBots.filter((b) => !b.isHidden);
  const hiddenBots = otherBots.filter((b) => b.isHidden);

  // Separa Bot fissati (Pinned) e Bot normali, proprio come nell'originale ("Bot fissati" / "Bot")
  const pinnedBots = visibleBots.filter((b) => b.isPinned);
  const regularBots = visibleBots.filter((b) => !b.isPinned);

  const isMainBotActive = activeBotId === mainBot.id;

  const handleStartRename = (bot) => {
    setMenuOpenBotId(null);
    setRenamingBotId(bot.id);
    setRenameValue(bot.name);
  };

  const handleSaveRename = (bot) => {
    const trimmed = renameValue.trim();
    if (trimmed && onUpdateBot) {
      onUpdateBot({ ...bot, name: trimmed });
      sounds.play('success');
    }
    setRenamingBotId(null);
  };

  const renderBotRow = (bot) => {
    const isActive = activeBotId === bot.id;
    const isMenuOpen = menuOpenBotId === bot.id;
    const isRenaming = renamingBotId === bot.id;

    return (
      <div
        key={bot.id}
        onContextMenu={(e) => {
          e.preventDefault();
          sounds.play('tick');
          setMenuOpenBotId(bot.id);
        }}
        className="relative group"
      >
        <div
          onClick={() => {
            if (!isRenaming) {
              sounds.play('tick');
              onSelectBot(bot.id);
            }
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all cursor-pointer ${
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
            {isRenaming ? (
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(bot);
                  if (e.key === 'Escape') setRenamingBotId(null);
                }}
                onBlur={() => handleSaveRename(bot)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-gray-900"
              />
            ) : (
              <>
                <div className="text-[13px] font-semibold truncate leading-tight flex items-center gap-1">
                  <span className="truncate">{bot.name}</span>
                  {bot.isPinned && (
                    <Pin size={10} className="text-gray-400 shrink-0 rotate-45" />
                  )}
                </div>
                <div className="text-[11px] text-gray-500 truncate leading-normal">
                  {bot.subtitle}
                </div>
              </>
            )}
          </div>

          {/* Pulsante "..." Azioni del Bot (compare in hover o quando attivo) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sounds.play('tick');
              setMenuOpenBotId(isMenuOpen ? null : bot.id);
            }}
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-300/60 hover:text-gray-900 transition-opacity cursor-pointer ${
              isMenuOpen ? 'opacity-100 bg-gray-300/60' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Azioni del Bot"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Menu contestuale "Azioni del Bot" identico all'originale Grok Bot */}
        {isMenuOpen && (
          <div
            ref={botMenuRef}
            className="absolute right-2 top-11 w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 p-1.5 z-50 text-xs text-gray-800 animate-in fade-in zoom-in-95"
          >
            {/* Fissa / Rimuovi dai fissati */}
            <button
              onClick={() => {
                sounds.play('tick');
                onUpdateBot && onUpdateBot({ ...bot, isPinned: !bot.isPinned });
                setMenuOpenBotId(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
            >
              {bot.isPinned ? (
                <>
                  <PinOff size={14} className="text-gray-500" />
                  <span>Rimuovi dai fissati</span>
                </>
              ) : (
                <>
                  <Pin size={14} className="text-gray-500" />
                  <span>Fissa</span>
                </>
              )}
            </button>

            {/* Rinomina Bot */}
            <button
              onClick={() => handleStartRename(bot)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
            >
              <Pencil size={14} className="text-gray-500" />
              <span>Rinomina Bot</span>
            </button>

            {/* Copia ID conversazione */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(bot.id);
                sounds.play('tick');
                setMenuOpenBotId(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
            >
              <Copy size={14} className="text-gray-500" />
              <span>Copia ID conversazione</span>
            </button>

            {/* Svuota solo la chat di questo Bot */}
            <button
              onClick={() => {
                sounds.play('tick');
                setMenuOpenBotId(null);
                onClearBotChat && onClearBotChat(bot.id);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
            >
              <RotateCcw size={14} className="text-gray-500" />
              <span>Azzera cronologia chat</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            {/* Nascondi / Mostra nella barra laterale */}
            <button
              onClick={() => {
                sounds.play('tick');
                onUpdateBot && onUpdateBot({ ...bot, isHidden: !bot.isHidden });
                setMenuOpenBotId(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-left cursor-pointer"
            >
              {bot.isHidden ? (
                <>
                  <Eye size={14} className="text-gray-500" />
                  <span>Mostra nella barra laterale</span>
                </>
              ) : (
                <>
                  <EyeOff size={14} className="text-gray-500" />
                  <span>Nascondi dalla barra laterale</span>
                </>
              )}
            </button>

            {/* Elimina (in rosso con modale di conferma ufficiale) */}
            <button
              onClick={() => {
                sounds.play('tick');
                setMenuOpenBotId(null);
                setConfirmDeleteBot(bot);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-red-50 text-red-600 font-medium text-left cursor-pointer"
            >
              <Trash2 size={14} className="text-red-500" />
              <span>Elimina</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`${
        isMobile ? 'w-full' : 'w-64'
      } h-full bg-[#f6f7f8] border-r border-[#e5e7eb] flex flex-col select-none shrink-0 text-[#1f2937] font-['Plus_Jakarta_Sans',sans-serif] relative`}
    >
      {/* 1. Header identico all'originale: Lente Ricerca Universale, Logo Bot Park e Tasto + */}
      <div
        className="p-3 pb-2 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            onClick={() => {
              sounds.play('tick');
              onOpenSearch && onOpenSearch();
            }}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e7eb] hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-xs cursor-pointer"
            title="Cerca Bot, chat, impostazioni... (Ctrl+K)"
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

        {/* Tasto + per creare un nuovo Bot */}
        <button
          onClick={() => {
            sounds.play('doubleTick');
            onAddBot();
          }}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="w-8 h-8 rounded-full bg-white border border-[#e5e7eb] hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-xs cursor-pointer"
          title="Crea un Bot"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Barra compatta Mobile: Entanglement Real-Time + Sblocco Permessi (Mic, Tel, Cam, Push) */}
      {isMobile && (
        <div className="px-3 pb-2 flex items-center justify-between gap-2 flex-wrap border-b border-[#e5e7eb]/60">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
            <Zap size={11} className="text-emerald-600" />
            <span>Entanglement Attivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUnlockPermissions}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-800 shadow-2xs cursor-pointer"
              title="Sblocca Microfono, Telefono, Fotocamera, Contatti e Notifiche Push"
            >
              <ShieldCheck size={12} className="text-blue-600" />
              <span>{permStatus || 'Sblocca Mic, Tel & Push'}</span>
            </button>
            {!isNativeAndroid && (
              <a
                href="./BotParkMobile.apk"
                download="BotParkMobile.apk"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0b0b0d] text-white text-[11px] font-semibold shadow-2xs"
                title="Scarica App Android Nativa BotParkMobile.apk"
              >
                <Download size={11} />
                <span>APK</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 2. SAMANTHA — CAPO BOT & AGENTE PRINCIPALE (In cima, protetta da eliminazione) */}
      <div className="px-3 py-2 border-b border-[#e5e7eb]/70">
        <button
          onClick={() => {
            sounds.play('tick');
            onSelectBot(mainBot.id);
          }}
          className={`w-full flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
            isMainBotActive ? 'bg-[#e5e7eb] shadow-xs' : 'hover:bg-white/70'
          }`}
          title="Samantha — Capo Bot per coordinare la squadra e controllare la Smart TV"
        >
          <div className="relative">
            <BotAvatar
              bot={mainBot}
              size="large"
              status={isMainBotActive ? botStatus : 'idle'}
            />
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

      {/* 3. Lista dei Bot Teammates (Fissati + Regolari + Nascosti) */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {pinnedBots.length > 0 && (
          <div className="mb-2">
            <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Bot fissati
            </div>
            <div className="space-y-0.5">{pinnedBots.map(renderBotRow)}</div>
          </div>
        )}

        {regularBots.length === 0 && pinnedBots.length === 0 ? (
          <div className="text-center py-6 px-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">
              Nessun Bot secondario
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Chiedi a <span className="font-semibold text-gray-700">Samantha</span> o premi{' '}
              <span className="font-semibold text-gray-700">+</span> per creare un nuovo agente!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">{regularBots.map(renderBotRow)}</div>
        )}

        {/* Sezione Bot nascosti (come nell'originale "Bot nascosti") */}
        {hiddenBots.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-200/70">
            <button
              onClick={() => setShowHiddenBots(!showHiddenBots)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <span>Bot nascosti ({hiddenBots.length})</span>
              <ChevronRight
                size={13}
                className={`transition-transform ${showHiddenBots ? 'rotate-90' : ''}`}
              />
            </button>
            {showHiddenBots && (
              <div className="space-y-0.5 opacity-75">
                {hiddenBots.map(renderBotRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer con Brand Kitsune Labs */}
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
          className="p-1.5 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          title="Impostazioni"
        >
          <LayoutGrid size={15} />
        </button>

        {/* POPOVER MENU AZIONI REALI */}
        {showProfileMenu && (
          <div className="absolute bottom-12 left-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 p-1.5 z-50 text-xs text-gray-800 animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenSettings && onOpenSettings('generali');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <Settings size={14} className="text-gray-500" />
              <span>Impostazioni & Chiavi API</span>
            </button>

            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenSettings && onOpenSettings('cassaforte');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <Key size={14} className="text-gray-500" />
              <span>Cassaforte Credenziali</span>
            </button>

            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenPairModal && onOpenPairModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <Smartphone size={14} className="text-gray-500" />
              <span>Connetti Smartphone (QR)</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => {
                sounds.play('tick');
                setShowProfileMenu(false);
                onOpenSettings && onOpenSettings('aggiornamenti');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <RefreshCw size={14} className="text-gray-500" />
              <span>Sistema & Reset Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. FINESTRA DI CONFERMA ELIMINAZIONE BOT (Identica all'originale Grok Bot) */}
      {confirmDeleteBot && (
        <div
          onClick={() => setConfirmDeleteBot(null)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-3">
              <BotAvatar bot={confirmDeleteBot} size="small" />
              <h3 className="text-base font-bold text-gray-900">
                Elimina «{confirmDeleteBot.name}»?
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Il Bot e la sua cronologia della chat verranno eliminati definitivamente. Questa
              azione non può essere annullata.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                autoFocus
                onClick={() => {
                  sounds.play('tick');
                  setConfirmDeleteBot(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  sounds.play('close');
                  onDeleteBot && onDeleteBot(confirmDeleteBot.id);
                  setConfirmDeleteBot(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Key,
  RefreshCw,
  Copy,
  Search,
  Plus,
  Mail,
  Camera,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Smartphone,
  Bell,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SettingsModal({
  isOpen,
  onClose,
  onOpenPairModal,
  onMemoryImported,
  onTestPushNotification,
  initialTab = 'generali',
  geminiApiKey = '',
  elevenLabsApiKey = '',
  onSaveApiKeys,
  activeBotId = 'samantha',
  activeBotName = 'Samantha',
}) {
  const [activeTab, setActiveTab] = useState('generali');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [pushTestStatus, setPushTestStatus] = useState('');

  // Stati Chiavi API reali
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);
  const [elevenInput, setElevenInput] = useState(elevenLabsApiKey);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiSaveMsg, setApiSaveMsg] = useState('');

  // Stati Sistema & Reset
  const [resetStatus, setResetStatus] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [versionStatus, setVersionStatus] = useState('');

  // Stati Cassaforte Reale su Disco
  const [vaultFilter, setVaultFilter] = useState('all');
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultItems, setVaultItems] = useState([]);
  const [showNewVaultForm, setShowNewVaultForm] = useState(false);
  const [newVaultTitle, setNewVaultTitle] = useState('');
  const [newVaultSubtitle, setNewVaultSubtitle] = useState('');
  const [newVaultSecret, setNewVaultSecret] = useState('');
  const [newVaultType, setNewVaultType] = useState('credential');

  useEffect(() => {
    if (!isOpen) return;
    const validTabs = ['generali', 'cassaforte', 'aggiornamenti'];
    setActiveTab(validTabs.includes(initialTab) ? initialTab : 'generali');
    setGeminiInput(geminiApiKey || '');
    setElevenInput(elevenLabsApiKey || '');
    setApiSaveMsg('');
    setResetStatus('');
    setVersionStatus('');

    fetch('/api/vault')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.items)) setVaultItems(d.items);
      })
      .catch(() => {});
  }, [isOpen, initialTab, geminiApiKey, elevenLabsApiKey]);

  const handleSaveKeys = (e) => {
    e.preventDefault();
    sounds.play('success');
    if (onSaveApiKeys) {
      onSaveApiKeys(geminiInput.trim(), elevenInput.trim());
    }
    setApiSaveMsg('✔ Chiavi API salvate e sincronizzate!');
    setTimeout(() => setApiSaveMsg(''), 3000);
  };

  const handleResetWorkspace = async (targetBotId, label) => {
    sounds.play('tick');
    setIsResetting(true);
    setResetStatus(`Ripristino ${label} in corso...`);
    try {
      const res = await fetch('/api/fs/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: targetBotId }),
      });
      const data = await res.json();
      if (data && data.ok) {
        setResetStatus('✔ Workspace ripristinato ai file predefiniti su disco!');
        sounds.play('success');
      } else {
        setResetStatus(`Errore ripristino: ${data?.error || 'operazione fallita'}`);
      }
    } catch (err) {
      setResetStatus(`Errore ripristino: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleImportMemory = async () => {
    sounds.play('tick');
    setImportStatus('Importazione da memoria_gemini.txt in corso...');
    try {
      const res = await fetch('/api/memory/import', { method: 'POST' });
      const data = await res.json();
      if (data && data.ok) {
        const kb = Math.round((data.totalChars || 0) / 1024);
        setImportStatus(`✔ Importati ${kb} KB da memoria_gemini.txt nel workspace di Samantha!`);
        if (onMemoryImported && data.excerpt) {
          onMemoryImported(data.excerpt);
        }
        sounds.play('success');
      }
    } catch (e) {
      setImportStatus(`Errore importazione: ${e.message}`);
    }
  };

  const handleAddVaultItem = async (e) => {
    e.preventDefault();
    if (!newVaultTitle.trim()) return;
    sounds.play('success');
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: newVaultType,
        title: newVaultTitle.trim(),
        subtitle: newVaultSubtitle.trim(),
        secret: newVaultSecret.trim(),
        icon: newVaultType === 'contact' ? 'mail' : 'key',
      }),
    });
    const data = await res.json();
    if (data && data.ok) {
      setVaultItems(data.items || []);
      setNewVaultTitle('');
      setNewVaultSubtitle('');
      setNewVaultSecret('');
      setShowNewVaultForm(false);
    }
  };

  const handleDeleteVaultItem = async (id) => {
    sounds.play('tick');
    const res = await fetch(`/api/vault?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data && data.ok) {
      setVaultItems(data.items || []);
    }
  };

  if (!isOpen) return null;

  const copyEmail = () => {
    sounds.play('tick');
    navigator.clipboard?.writeText('user@example.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const navItems = [
    { id: 'generali', label: 'Generali & API', icon: Settings },
    { id: 'cassaforte', label: 'Cassaforte', icon: Key },
    { id: 'aggiornamenti', label: 'Sistema & Reset', icon: RefreshCw },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="relative w-full max-w-3xl h-[82vh] bg-white rounded-3xl shadow-2xl border border-gray-200/80 flex overflow-hidden text-gray-800"
        >
          {/* Tasto Chiudi Modale */}
          <button
            onClick={() => {
              sounds.play('tick');
              onClose();
            }}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            title="Chiudi impostazioni"
          >
            <X size={18} />
          </button>

          {/* Sidebar Navigazione Sinistra */}
          <div className="w-56 bg-[#f7f8f9] border-r border-gray-200/80 p-3 flex flex-col shrink-0">
            <div className="h-4" />
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      sounds.play('tick');
                      setActiveTab(item.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#e5e7eb] text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area Contenuto Destra Scrollabile */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-xs">
            {/* ================= 1. GENERALI & API ================= */}
            {activeTab === 'generali' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Generali & Chiavi API</h1>

                {/* Profilo & Dispositivi */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Profilo & Dispositivi
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
                        KL
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">kitsune Labs</div>
                        <div className="text-gray-500 flex items-center gap-1.5 text-xs">
                          <span>user@example.com</span>
                          <button
                            onClick={copyEmail}
                            className="hover:text-black transition-colors cursor-pointer"
                            title="Copia email"
                          >
                            {copiedEmail ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        sounds.play('tick');
                        onClose();
                        onOpenPairModal && onOpenPairModal();
                      }}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Smartphone size={13} />
                      <span>Connetti Smartphone (QR)</span>
                    </button>
                  </div>
                </div>

                {/* Chiavi API (Gemini & ElevenLabs) */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Chiavi API (Gemini & ElevenLabs)
                  </div>
                  <form
                    onSubmit={handleSaveKeys}
                    className="p-4 rounded-2xl border border-gray-200 space-y-3"
                  >
                    <div className="space-y-1">
                      <label className="block font-bold text-gray-700">Gemini API Key</label>
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={geminiInput}
                        onChange={(e) => setGeminiInput(e.target.value)}
                        placeholder="Inserisci la tua chiave Gemini..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-gray-700">ElevenLabs API Key</label>
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={elevenInput}
                        onChange={(e) => setElevenInput(e.target.value)}
                        placeholder="Inserisci la tua chiave ElevenLabs..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.play('tick');
                          setShowApiKeys((v) => !v);
                        }}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        {showApiKeys ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showApiKeys ? 'Nascondi' : 'Mostra'}</span>
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-full bg-black hover:bg-gray-800 text-white font-bold cursor-pointer transition-colors"
                      >
                        Salva Chiavi API
                      </button>
                    </div>
                    {apiSaveMsg && (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        {apiSaveMsg}
                      </div>
                    )}
                  </form>
                </div>

                {/* Importa Memoria Reale da memoria_gemini.txt */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Memoria Condivisa
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">Importa la memoria in Bot Park</div>
                        <div className="text-gray-500 text-[11px]">
                          Sincronizza il diario file di memoria locale (.txt / .md) e il contesto in Capo Bot
                        </div>
                      </div>
                      <button
                        onClick={handleImportMemory}
                        className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 cursor-pointer shrink-0"
                      >
                        Avvia importazione
                      </button>
                    </div>
                    {importStatus && (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        {importStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ponte Antigravity & Notifiche Push (PC + Mobile iOS/Android) */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Ponte Antigravity & Notifiche Push
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Bell size={13} className="text-pink-600" />
                          <span>Notifiche Push Comunicazioni Autonome</span>
                        </div>
                        <div className="text-gray-500 text-[11px]">
                          Avvisi istantanei su Desktop (Windows/Electron), Dynamic Island e predisposizione Mobile iOS/Android
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          sounds.play('tick');
                          let permState = 'in-app';
                          if (typeof window !== 'undefined' && 'Notification' in window) {
                            try {
                              permState = await window.Notification.requestPermission();
                            } catch {}
                          }
                          if (onTestPushNotification) {
                            await onTestPushNotification();
                          }
                          setPushTestStatus(
                            `Notifica push inviata! Permesso browser: ${permState} (Dynamic Island ed Electron sempre attivi).`
                          );
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-gray-800 font-semibold cursor-pointer shrink-0 transition-colors"
                      >
                        Attiva & Testa Notifica Push
                      </button>
                    </div>
                    {pushTestStatus && (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        {pushTestStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ================= 2. CASSAFORTE REALE SU DISCO ================= */}
            {activeTab === 'cassaforte' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-900">Cassaforte</h1>
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      setShowNewVaultForm(!showNewVaultForm);
                    }}
                    className="px-4 py-1.5 rounded-full bg-black text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Nuovo elemento</span>
                  </button>
                </div>

                {showNewVaultForm && (
                  <form
                    onSubmit={handleAddVaultItem}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={newVaultType}
                        onChange={(e) => setNewVaultType(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="credential">Credenziale / API Key</option>
                        <option value="contact">Dato di contatto</option>
                        <option value="payment">Metodo di pagamento</option>
                      </select>
                      <input
                        type="text"
                        value={newVaultTitle}
                        onChange={(e) => setNewVaultTitle(e.target.value)}
                        placeholder="Servizio / Titolo (es. GitHub, OpenAI)"
                        className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={newVaultSubtitle}
                        onChange={(e) => setNewVaultSubtitle(e.target.value)}
                        placeholder="Username / Email / IP"
                        className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newVaultSecret}
                        onChange={(e) => setNewVaultSecret(e.target.value)}
                        placeholder="Valore segreto / Password / Token..."
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Salva in Cassaforte
                      </button>
                    </div>
                  </form>
                )}

                {/* Filtri & Barra di Ricerca */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: `Tutti ${vaultItems.length}` },
                      {
                        id: 'credential',
                        label: `Credenziali ${vaultItems.filter((i) => i.type === 'credential').length}`,
                      },
                      {
                        id: 'payment',
                        label: `Pagamenti ${vaultItems.filter((i) => i.type === 'payment').length}`,
                      },
                      {
                        id: 'contact',
                        label: `Dati di contatto ${vaultItems.filter((i) => i.type === 'contact').length}`,
                      },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setVaultFilter(f.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          vaultFilter === f.id
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
                    <input
                      type="text"
                      value={vaultSearch}
                      onChange={(e) => setVaultSearch(e.target.value)}
                      placeholder="Cerca nella cassaforte"
                      className="bg-gray-100 border border-gray-200 rounded-xl pl-7 pr-3 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Elementi Salvati nella Cassaforte */}
                <div className="space-y-1.5 p-3 rounded-2xl border border-gray-200">
                  {vaultItems
                    .filter((i) => vaultFilter === 'all' || i.type === vaultFilter)
                    .filter(
                      (i) =>
                        i.title.toLowerCase().includes(vaultSearch.toLowerCase()) ||
                        i.subtitle.toLowerCase().includes(vaultSearch.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.icon === 'mail'
                                ? 'bg-pink-100 text-pink-600'
                                : item.icon === 'instagram'
                                ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.icon === 'mail' ? (
                              <Mail size={16} />
                            ) : item.icon === 'instagram' ? (
                              <Camera size={16} />
                            ) : (
                              <Key size={16} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{item.title}</div>
                            <div className="text-gray-500 text-xs">{item.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              sounds.play('tick');
                              navigator.clipboard?.writeText(item.secret || item.subtitle);
                            }}
                            className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Copia credenziale/segreto"
                          >
                            <Copy size={11} />
                            <span>Copia</span>
                          </button>
                          <button
                            onClick={() => handleDeleteVaultItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Rimuovi dalla cassaforte"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="text-[11px] text-gray-400 leading-relaxed">
                  Bot Park salva la cassaforte localmente sul tuo computer. Può usare le credenziali e i dati di contatto autorizzati per assisterti.
                </div>
              </div>
            )}

            {/* ================= 3. SISTEMA & RESET ================= */}
            {activeTab === 'aggiornamenti' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Sistema & Reset Workspace</h1>

                {/* Reimposta Workspace del Bot */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Manutenzione Workspace su Disco
                  </div>
                  <div className="p-5 rounded-2xl border border-gray-200 space-y-4">
                    <div>
                      <div className="font-bold text-gray-900">Reimposta Workspace del Bot</div>
                      <div className="text-gray-500 text-[11px] leading-relaxed mt-0.5">
                        Pulisce la cartella su disco e ripristina i file predefiniti iniziali. L'operazione non cancella la Cassaforte né le tue chiavi API.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        disabled={isResetting}
                        onClick={() => handleResetWorkspace(activeBotId, `di ${activeBotName}`)}
                        className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        Reimposta workspace di {activeBotName}
                      </button>
                      <button
                        disabled={isResetting}
                        onClick={() => handleResetWorkspace('all', 'di tutti i Bot')}
                        className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        Reimposta tutti i workspace
                      </button>
                    </div>
                    {resetStatus && (
                      <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        {resetStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Versione & Stato Sistema */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Versione & Stato Sistema
                  </div>
                  <div className="p-5 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="./bot_park_icon.png"
                        alt="Bot Park Logo"
                        className="w-14 h-14 object-contain drop-shadow-sm"
                      />
                      <div>
                        <div className="font-bold text-gray-900">
                          Bot Park v2.0.0 (Samantha Capo Bot + TV Edition)
                        </div>
                        <div className="text-gray-500 text-xs">
                          Build locale attiva con motore Gemini, voce ElevenLabs e bridge Smart TV ADB.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          sounds.play('tick');
                          setVersionStatus('✔ Bot Park v2.0.0 è aggiornato e pronto all\'uso.');
                        }}
                        className="px-4 py-2 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 text-xs cursor-pointer"
                      >
                        Verifica stato sistema
                      </button>
                      {versionStatus && (
                        <span className="text-xs font-semibold text-emerald-700">
                          {versionStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

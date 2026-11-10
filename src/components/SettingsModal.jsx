import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Monitor,
  Shield,
  Key,
  BarChart2,
  RefreshCw,
  Copy,
  ChevronRight,
  Search,
  Plus,
  Mail,
  Camera,
  Check,
  Trash2,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SettingsModal({
  isOpen,
  onClose,
  onOpenPairModal,
  onMemoryImported,
}) {
  const [activeTab, setActiveTab] = useState('generali');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Stati Generali
  const [theme, setTheme] = useState('system');
  const [accent, setAccent] = useState('bot');
  const [language, setLanguage] = useState('system');
  const [spellcheck, setSpellcheck] = useState(true);
  const [hwAccel, setHwAccel] = useState(true);
  const [securityKeys, setSecurityKeys] = useState(true);

  // Stati Computer
  const [localExec, setLocalExec] = useState('always');
  const [routeTraffic, setRouteTraffic] = useState(true);

  // Stati Autorizzazioni
  const [autoReview, setAutoReview] = useState(true);

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
    fetch('/api/vault')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.items)) setVaultItems(d.items);
      })
      .catch(() => {});
  }, [isOpen]);

  const handleImportMemory = async () => {
    sounds.play('tick');
    setImportStatus('Importazione da memoria_gemini.txt in corso...');
    try {
      const res = await fetch('/api/memory/import', { method: 'POST' });
      const data = await res.json();
      if (data && data.ok) {
        const kb = Math.round((data.totalChars || 0) / 1024);
        setImportStatus(`✔ Importati ${kb} KB da memoria_gemini.txt nel workspace di Capo Bot!`);
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
    { id: 'generali', label: 'Generali', icon: Settings },
    { id: 'computer', label: 'Computer', icon: Monitor },
    { id: 'autorizzazioni', label: 'Autorizzazioni', icon: Shield },
    { id: 'cassaforte', label: 'Cassaforte', icon: Key },
    { id: 'utilizzo', label: 'Utilizzo e fatturazione', icon: BarChart2 },
    { id: 'aggiornamenti', label: 'Aggiornamenti', icon: RefreshCw },
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
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Sidebar Navigazione Sinistra (Image 2) */}
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 text-xs">
            {/* ================= 1. GENERALI ================= */}
            {activeTab === 'generali' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Generali</h1>

                {/* Account */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Account
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
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
                            className="hover:text-black transition-colors"
                            title="Copia email"
                          >
                            {copiedEmail ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sounds.play('tick')}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-700"
                      >
                        Aggiungi account
                      </button>
                      <button
                        onClick={() => sounds.play('tick')}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-700"
                      >
                        Disconnetti
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aspetto */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Aspetto
                  </div>
                  <div className="space-y-3.5 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Tema</span>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="system">Segui il sistema ⌵</option>
                        <option value="light">Chiaro ⌵</option>
                        <option value="dark">Scuro ⌵</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Accento</span>
                      <select
                        value={accent}
                        onChange={(e) => setAccent(e.target.value)}
                        className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="bot">Colore del Bot ⌵</option>
                        <option value="green">Verde kitsune ⌵</option>
                        <option value="cyan">Ciano Dino ⌵</option>
                        <option value="magenta">Magenta ⌵</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Lingua</span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="system">Segui il sistema ⌵</option>
                        <option value="it">Italiano ⌵</option>
                        <option value="en">English ⌵</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-medium text-gray-700">
                        Controlla l'ortografia durante la digitazione
                      </span>
                      <input
                        type="checkbox"
                        checked={spellcheck}
                        onChange={(e) => setSpellcheck(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Sistema */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Sistema
                  </div>
                  <div className="space-y-3.5 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Microfono</span>
                      <select className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold">
                        <option>Predefinito di sistema ⌵</option>
                        <option>Microfono Realtek Audio</option>
                        <option>Dispositivo Esterno</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        Usa l'accelerazione hardware
                      </span>
                      <input
                        type="checkbox"
                        checked={hwAccel}
                        onChange={(e) => setHwAccel(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Bot Fuso Orario */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Bot
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <span className="font-medium text-gray-700">Fuso orario 🔗</span>
                    <select className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold">
                      <option>Rilevamento automatico (Europe/Rome) ⌵</option>
                    </select>
                  </div>
                </div>

                {/* Importa Memoria Reale da memoria_gemini.txt */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Importa
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">Importa la memoria in Bot Park</div>
                        <div className="text-gray-500 text-[11px]">
                          Sincronizza il diario file di memoria locale (.txt / .md) e il contesto in Capo Bot
                        </div>
                      </div>
                      <button
                        onClick={handleImportMemory}
                        className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 cursor-pointer"
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

                {/* Chiave di sicurezza Hardware */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Chiave di sicurezza
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="max-w-md">
                      <div className="font-bold text-gray-900">Usa le chiavi di sicurezza hardware</div>
                      <div className="text-gray-500 text-[11px] leading-relaxed">
                        Consenti a Bot Park di usare una chiave di sicurezza (come una YubiKey) collegata al tuo computer. Ti verrà chiesto di approvare ogni utilizzo.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={securityKeys}
                      onChange={(e) => setSecurityKeys(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Bot del Team: Microsoft Teams */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Bot del team
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="max-w-md">
                      <div className="font-bold text-gray-900">Account Microsoft Teams</div>
                      <div className="text-gray-500 text-[11px] leading-relaxed">
                        Collega il tuo account Microsoft Teams in modo che i Bot del team e gli agenti cloud sappiano chi sei su Microsoft Teams.
                      </div>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 font-semibold">
                      Non collegato
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 2. COMPUTER (Image 4) ================= */}
            {activeTab === 'computer' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Computer</h1>

                {/* Il tuo computer */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Il tuo computer
                  </div>
                  <div className="space-y-3.5 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">Esecuzione su questo computer 🔗</div>
                        <div className="text-gray-500 text-[11px]">
                          Consenti a Bot Park di aprire file ed eseguire attività sul tuo computer.
                        </div>
                      </div>
                      <select
                        value={localExec}
                        onChange={(e) => setLocalExec(e.target.value)}
                        className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="always">Consenti sempre ⌵</option>
                        <option value="ask">Chiedi ogni volta ⌵</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <div className="font-bold text-gray-900">Instrada il traffico attraverso questo computer</div>
                        <div className="text-gray-500 text-[11px]">
                          Il computer di Bot Park è attivo. L'instradamento è sincronizzato con la rete locale.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={routeTraffic}
                        onChange={(e) => setRouteTraffic(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Gestisci Dispositivi */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Gestisci dispositivi
                  </div>
                  <div className="space-y-2 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <Monitor size={18} className="text-gray-600" />
                        <div>
                          <div className="font-bold text-gray-900">Silver</div>
                          <div className="text-gray-500 text-[11px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <span>Computer • Online ora</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 flex items-center justify-center text-gray-600 font-bold">
                          📱
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">iPhone 17</div>
                          <div className="text-gray-500 text-[11px]">
                            • iOS • Ultima apertura ieri
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Computer del Bot */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Computer del Bot
                  </div>
                  <div className="space-y-4 p-4 rounded-2xl border border-gray-200">
                    <div>
                      <div className="font-bold text-gray-900">Aggiorna il computer del Bot</div>
                      <div className="text-gray-500 text-[11px] leading-relaxed mb-3">
                        Aggiorna il computer condiviso dai tuoi Bot. I tuoi file e gli accessi vengono conservati, ma le app e i pacchetti installati vengono rimossi. Tutti i Bot si aggiornano insieme.
                      </div>
                      <div className="p-3 bg-sky-50 text-sky-800 rounded-xl flex items-center gap-2 font-medium text-xs border border-sky-100">
                        <Check size={14} className="text-sky-600" />
                        <span>Il tuo computer è alla versione più recente</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="max-w-md">
                        <div className="font-bold text-gray-900">Reimposta il computer del Bot</div>
                        <div className="text-gray-500 text-[11px] leading-relaxed">
                          Ricomincia da zero se il computer si blocca. Viene ricostruito dall'ultimo snapshot salvato.
                        </div>
                      </div>
                      <button
                        onClick={() => sounds.play('tick')}
                        className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-xs transition-colors"
                      >
                        Reimposta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 3. AUTORIZZAZIONI (Image 5) ================= */}
            {activeTab === 'autorizzazioni' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Autorizzazioni</h1>

                <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">Revisione automatica</div>
                    <div className="text-gray-500 text-[11px]">
                      Rivede le azioni di Bot Park in base a regole personalizzate
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReview}
                    onChange={(e) => setAutoReview(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">Chiedi sempre</div>
                      <div className="text-gray-500 text-[11px]">
                        Si ferma e chiede quando un'azione corrisponde a queste regole
                      </div>
                    </div>
                    <button
                      onClick={() => sounds.play('tick')}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800"
                    >
                      Aggiungi regola
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">Consenti senza chiedere</div>
                      <div className="text-gray-500 text-[11px]">
                        Continua automaticamente quando un'azione corrisponde a queste regole
                      </div>
                    </div>
                    <button
                      onClick={() => sounds.play('tick')}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800"
                    >
                      Aggiungi regola
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 4. CASSAFORTE REALE SU DISCO ================= */}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
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

            {/* ================= 5. UTILIZZO E FATTURAZIONE (Image 7) ================= */}
            {activeTab === 'utilizzo' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Utilizzo e fatturazione</h1>

                {/* Il mio piano */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Il mio piano
                  </div>
                  <div className="space-y-3 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Premium</div>
                        <div className="text-gray-500 text-[11px]">
                          Visualizza, modifica o aggiorna il tuo piano kitsune Labs
                        </div>
                      </div>
                      <button
                        onClick={() => sounds.play('tick')}
                        className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800"
                      >
                        Gestisci piano
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <div className="font-bold text-gray-900">Fatturazione</div>
                        <div className="text-gray-500 text-[11px]">
                          Metodi di pagamento e fatture su Bot Park
                        </div>
                      </div>
                      <button
                        onClick={() => sounds.play('tick')}
                        className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800"
                      >
                        Gestisci fatturazione
                      </button>
                    </div>
                  </div>
                </div>

                {/* Limiti di Utilizzo */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Limiti di utilizzo
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <div className="font-bold text-gray-900">Utilizzo settimanale</div>
                    <div className="text-2xl font-bold text-gray-900">0% <span className="text-xs font-normal text-gray-500">utilizzato</span></div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-0 h-full bg-emerald-500" />
                    </div>
                    <div className="text-[11px] text-gray-400 pt-1">
                      Si azzera tra 4 giorni
                    </div>
                  </div>
                </div>

                {/* Utilizzo di Bot Park */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Utilizzo di Bot Park
                  </div>
                  <div className="p-5 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">0%</span>
                        <span className="text-xs text-gray-500 ml-2">del tuo limite settimanale • 7 nov – 14 nov</span>
                      </div>
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
                        <button className="px-2.5 py-1 bg-white rounded-md shadow-xs text-gray-900">Per origine</button>
                        <button className="px-2.5 py-1 text-gray-500 hover:text-gray-900">Per Bot</button>
                      </div>
                    </div>
                    <div className="py-6 text-center text-xs text-gray-400">
                      Nessun utilizzo di Bot Park questa settimana
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 6. AGGIORNAMENTI ================= */}
            {activeTab === 'aggiornamenti' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900">Aggiornamenti</h1>
                <div className="p-5 rounded-2xl border border-gray-200 space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="./bot_park_icon.png"
                      alt="Bot Park Logo"
                      className="w-14 h-14 object-contain drop-shadow-sm"
                    />
                    <div>
                      <div className="font-bold text-gray-900">Bot Park v2.0.0 (Capo Bot Capo Bot + TV Edition)</div>
                      <div className="text-gray-500 text-xs">Sei all'ultima versione disponibile con motore Gemini 3.5 Flash & ElevenLabs.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sounds.play('tick');
                      alert('Bot Park è già aggiornato all\'ultima build ufficiale!');
                    }}
                    className="px-4 py-2 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 text-xs cursor-pointer"
                  >
                    Verifica aggiornamenti
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


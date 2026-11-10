import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Video,
  Square,
  Sparkles,
  Check,
  Monitor,
  BookOpen,
} from 'lucide-react';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function TeachModal({ isOpen, onClose, activeBot, onSaveSkill }) {
  const [skillTitle, setSkillTitle] = useState('');
  const [skillSteps, setSkillSteps] = useState('');
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const timerRef = useRef(null);

  if (!isOpen) return null;

  const botColor = activeBot?.color || '#00C972';

  const handleStartScreenRecording = async () => {
    sounds.play('tick');
    setIsRecordingScreen(true);
    setStatusMsg('Registrazione schermo PC avviata... svolgi pure l\'attività sul tuo schermo!');

    const captureFrame = async () => {
      try {
        const res = await fetch('/api/pc/screenshot');
        const data = await res.json();
        if (data && data.ok && data.dataUrl) {
          setCapturedFrames((prev) => [
            ...prev.slice(-5),
            { time: data.timestamp, dataUrl: data.dataUrl, base64: data.base64 },
          ]);
        }
      } catch {}
    };

    await captureFrame();
    timerRef.current = setInterval(captureFrame, 3000);
  };

  const handleStopScreenRecording = () => {
    sounds.play('doubleTick');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecordingScreen(false);
    setStatusMsg(
      `Catturati ${capturedFrames.length} fotogrammi dello schermo. Aggiungi una breve descrizione o salva subito la Skill!`
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!skillTitle.trim()) return;

    const cleanSlug = skillTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const fileName = `skill_${cleanSlug || Date.now()}.md`;
    const markdownContent = `# Skill: ${skillTitle.trim()}\n**Insegnata a**: ${activeBot?.name}\n**Data**: ${new Date().toLocaleString('it-IT')}\n**Fotogrammi schermo registrati**: ${capturedFrames.length}\n\n## Procedura / Passaggi Ripetibili\n${skillSteps.trim() || 'Procedura acquisita tramite registrazione schermo.'}\n`;

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: activeBot?.id || 'samantha',
          name: fileName,
          content: markdownContent,
        }),
      });
    } catch {}

    if (onSaveSkill) {
      onSaveSkill({
        id: `sk_${Date.now()}`,
        title: skillTitle.trim(),
        steps: skillSteps.trim() || 'Procedura registrata a schermo',
        fileName,
        framesCount: capturedFrames.length,
        lastFrame: capturedFrames[capturedFrames.length - 1] || null,
      });
    }

    sounds.play('success');
    setSkillTitle('');
    setSkillSteps('');
    setCapturedFrames([]);
    setStatusMsg('');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2.5">
              <BotAvatar bot={activeBot} size="small" />
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Insegna un'attività a {activeBot?.name}
                </h2>
                <p className="text-[11px] text-gray-500">
                  Le skill insegnano a questo Bot a gestire le attività ripetitive
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-gray-200/70 text-gray-500 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Box Registrazione Schermo PC */}
            <div className="p-4 rounded-2xl bg-gray-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={16} style={{ color: botColor }} />
                  <span className="text-xs font-bold">
                    Registrati mentre svolgi l'attività sullo schermo
                  </span>
                </div>
                {!isRecordingScreen ? (
                  <button
                    type="button"
                    onClick={handleStartScreenRecording}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                    style={{ backgroundColor: botColor }}
                  >
                    <Video size={13} />
                    <span>Avvia registrazione</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopScreenRecording}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1.5 animate-pulse cursor-pointer"
                  >
                    <Square size={12} />
                    <span>Interrompi registrazione</span>
                  </button>
                )}
              </div>

              {statusMsg && (
                <p className="text-[11px] text-gray-300 leading-relaxed">{statusMsg}</p>
              )}

              {capturedFrames.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {capturedFrames.map((fr, idx) => (
                    <div key={idx} className="relative shrink-0">
                      <img
                        src={fr.dataUrl}
                        alt={`Frame ${idx + 1}`}
                        className="h-16 w-28 object-cover rounded-lg border border-white/20"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] px-1 rounded">
                        {fr.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Titolo Skill */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nome della Skill / Attività
              </label>
              <input
                type="text"
                required
                value={skillTitle}
                onChange={(e) => setSkillTitle(e.target.value)}
                placeholder="Es. Struttura Script Reel Virale 45s / Analisi Competitors"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Passaggi che il Bot deve seguire */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Scrivi i passaggi che {activeBot?.name} deve seguire per questa attività
              </label>
              <textarea
                rows={4}
                value={skillSteps}
                onChange={(e) => setSkillSteps(e.target.value)}
                placeholder="Descrivi un modo di lavorare ripetibile perché questo Bot completi l'attività in modo coerente..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                style={{ backgroundColor: botColor }}
              >
                <BookOpen size={13} />
                <span>Salva Skill nella Libreria di {activeBot?.name}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

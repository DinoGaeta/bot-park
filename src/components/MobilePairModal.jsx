import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Smartphone, Wifi, Check, Copy, QrCode, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { sounds } from '../services/soundEffects';

export default function MobilePairModal({ isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const localIp = '172.20.10.5'; // Rilevato dalla subnet Wi-Fi attiva
  const port = '5173';
  const pairUrl = `http://${localIp}:${port}/?paired=true&t=${Date.now()}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(pairUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Errore generazione QR:', err));
      sounds.play('open');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairUrl);
    sounds.play('tick');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#10141d] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center"
      >
        {/* Pulsante Chiusura */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header con Nuovo Logo Ufficiale Bot Park */}
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2">
          <img
            src="./bot_park_icon.png"
            alt="Bot Park Logo"
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>

        <h3 className="font-extrabold text-lg text-white mb-1">
          Accoppia <span className="text-amber-400">Bot Park Mobile</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Inquadra il QR Code con la fotocamera del tuo smartphone per collegarlo istantaneamente a questo computer.
        </p>

        {/* QR Code Canvas Frame */}
        <div className="p-3 bg-white rounded-2xl inline-block shadow-inner mb-4 border-4 border-amber-500/40">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code di Accoppiamento" className="w-52 h-52 block rounded-lg" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-gray-500 text-xs">
              Generazione QR in corso...
            </div>
          )}
        </div>

        {/* Badge di Sicurezza & Subnet */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-mono mb-4 bg-emerald-950/40 py-1 px-2.5 rounded-lg border border-emerald-500/20">
          <Wifi size={12} />
          <span>Subnet Locale: {localIp}:{port}</span>
        </div>

        {/* Copia Link Manuale */}
        <button
          onClick={handleCopy}
          className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 flex items-center justify-center gap-2 transition-all hover:text-white"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Link Copiato negli Appunti!' : 'Copia Link Diretto per Smartphone'}</span>
        </button>
      </motion.div>
    </div>
  );
}


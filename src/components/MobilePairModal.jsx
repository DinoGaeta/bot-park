import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Wifi, Check, Copy, Share, PlusSquare, Smartphone, Download, Bell } from 'lucide-react';
import QRCode from 'qrcode';
import { sounds } from '../services/soundEffects';

export default function MobilePairModal({ isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [localIp, setLocalIp] = useState('172.20.10.5');
  const [activeTab, setActiveTab] = useState('android'); // 'iphone' | 'android'
  const [qrMode, setQrMode] = useState('web'); // 'web' | 'apk'
  const [pushStatus, setPushStatus] = useState('');
  const port = '5173';
  const pairUrl = `http://${localIp}:${port}/?mobile=1`;
  const apkUrl = `http://${localIp}:${port}/BotParkMobile.apk`;
  const activeQrUrl = activeTab === 'android' && qrMode === 'apk' ? apkUrl : pairUrl;

  useEffect(() => {
    if (!isOpen) return;
    sounds.play('open');
    setPushStatus('');
    fetch('/api/network/info')
      .then((r) => r.json())
      .then((data) => {
        if (data?.lanIp && data.lanIp !== '127.0.0.1') {
          setLocalIp(data.lanIp);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(activeQrUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0B0B0D',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Errore generazione QR:', err));
  }, [isOpen, activeQrUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeQrUrl);
    sounds.play('tick');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnableMobilePush = async () => {
    sounds.play('tick');
    let perm = 'in-app';
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        perm = await window.Notification.requestPermission();
      } catch {}
    }
    try {
      const devId =
        localStorage.getItem('botpark_mobile_device_id') ||
        `pwa_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('botpark_mobile_device_id', devId);
      await fetch('/api/push/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: devId,
          platform: activeTab,
          pushToken: `web_pwa_${perm}`,
        }),
      });
      await fetch('/api/bridge/antigravity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'system_test',
          senderId: 'samantha',
          senderName: 'Samantha',
          senderColor: '#FF3B9A',
          targetId: 'samantha',
          targetName: 'Samantha',
          message: `Dispositivo ${activeTab === 'iphone' ? 'iPhone' : 'Android'} registrato per le notifiche push!`,
        }),
      });
      setPushStatus(`Notifiche push attive (${perm})! Dispositivo registrato.`);
    } catch (e) {
      setPushStatus('Errore attivazione push: ' + e.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-black/[0.08] rounded-[28px] p-6 max-w-[390px] w-full shadow-[0_24px_70px_rgba(0,0,0,0.22)] relative text-center"
      >
        {/* Pulsante Chiusura */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#686A6E] hover:text-[#0B0B0D] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="w-14 h-14 rounded-2xl bg-[#F8F9FA] border border-black/[0.06] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <img
            src="./bot_park_icon.png"
            alt="Bot Park Logo"
            className="w-10 h-10 object-contain"
          />
        </div>

        <h3 className="font-bold text-[19px] text-[#0B0B0D] tracking-[-0.02em] mb-1">
          Bot Park su iPhone & Android
        </h3>
        <p className="text-[12.5px] text-[#686A6E] mb-4 leading-relaxed">
          Inquadra il QR Code con la fotocamera del telefono per avere tutti i tuoi Bot, la voce e il controllo Smart TV in tasca.
        </p>

        {/* QR Code Frame */}
        <div className="p-3 bg-white rounded-2xl inline-block shadow-sm mb-3 border border-black/[0.09]">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code di Accoppiamento"
              className="w-44 h-44 block rounded-lg"
            />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-[#8E9094] text-xs">
              Generazione QR...
            </div>
          )}
        </div>

        {/* Indirizzo LAN */}
        <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#059669] font-mono mb-4 bg-[#ECFDF5] py-1.5 px-3 rounded-full border border-[#A7F3D0] mx-auto w-fit">
          <Wifi size={12} />
          <span>Sincronizzato in tempo reale: {localIp}:{port}</span>
        </div>

        {/* Selettore Guida iPhone / Android */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl mb-3">
          <button
            onClick={() => {
              setActiveTab('iphone');
              setQrMode('web');
            }}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'iphone'
                ? 'bg-white text-[#0B0B0D] shadow-xs'
                : 'text-[#686A6E] hover:text-[#0B0B0D]'
            }`}
          >
            🍎 iPhone (App Web)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-[#0B0B0D] shadow-xs'
                : 'text-[#686A6E] hover:text-[#0B0B0D]'
            }`}
          >
            🤖 Android (App .APK)
          </button>
        </div>

        {activeTab === 'iphone' ? (
          <div className="text-left bg-[#F8F9FA] border border-black/[0.06] rounded-2xl p-3.5 mb-3 space-y-2 text-[12px] text-[#374151]">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>Inquadra il QR con la fotocamera e apri in <b>Safari</b>.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span className="flex items-center gap-1 flex-wrap">
                Tocca <b>Condividi</b> <Share size={13} className="inline text-[#1084FE]" /> nella barra in basso.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span className="flex items-center gap-1 flex-wrap">
                Scegli <b>«Aggiungi alla schermata Home»</b> <PlusSquare size={13} className="inline text-[#0B0B0D]" />.
              </span>
            </div>
          </div>
        ) : (
          <div className="text-left bg-[#F8F9FA] border border-black/[0.06] rounded-2xl p-3.5 mb-3 space-y-2.5 text-[12px] text-[#374151]">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-black/[0.06]">
              <button
                onClick={() => setQrMode('apk')}
                className={`flex-1 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  qrMode === 'apk' ? 'bg-[#0B0B0D] text-white' : 'text-[#686A6E]'
                }`}
              >
                QR Download APK Nativo
              </button>
              <button
                onClick={() => setQrMode('web')}
                className={`flex-1 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  qrMode === 'web' ? 'bg-[#0B0B0D] text-white' : 'text-[#686A6E]'
                }`}
              >
                QR Web App Istantanea
              </button>
            </div>
            <a
              href="/BotParkMobile.apk"
              download="BotParkMobile.apk"
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={14} />
              <span>Scarica App Nativa Android (.APK)</span>
            </a>
            <div className="text-[11px] text-[#686A6E] leading-snug">
              Include Voce Live + Servizio Push nativo in background quando Bot e Antigravity comunicano.
            </div>
          </div>
        )}

        {/* Attiva & Testa Notifiche Push su questo Dispositivo */}
        <button
          onClick={handleEnableMobilePush}
          className="w-full mb-2 py-2 px-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[12px] font-semibold text-[#0B0B0D] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Bell size={14} className="text-pink-600" />
          <span>Attiva & Testa Notifiche Push su questo Dispositivo</span>
        </button>

        {pushStatus && (
          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 mb-2">
            {pushStatus}
          </div>
        )}

        {/* Copia Link Manuale */}
        <button
          onClick={handleCopy}
          className="w-full py-2.5 px-3 rounded-xl bg-[#0B0B0D] hover:bg-[#232529] text-[12.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {copied ? <Check size={14} className="text-[#34D399]" /> : <Copy size={14} />}
          <span>{copied ? 'Link Copiato negli Appunti!' : 'Copia Link Diretto'}</span>
        </button>
      </motion.div>
    </div>
  );
}

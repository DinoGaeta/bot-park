import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Mic,
  MicOff,
  Share2,
  Paperclip,
  Smile,
  CornerUpLeft,
  MoreHorizontal,
  Volume2,
  RotateCcw,
  VolumeX,
} from 'lucide-react';
import { marked } from 'marked';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function ChatCenter({
  activeBot,
  messages,
  inputValue,
  onChangeInput,
  onSendMessage,
  isStreaming,
  isListening,
  onToggleListening,
  onStartVoiceCall,
  attachedImages,
  onAttachImage,
  onSpeakMessage,
  onSelectOption,
  onSelectBot,
  speakingMessageIndex,
}) {
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden relative select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Superiore della Chat */}
      <header className="h-12 border-b border-[#e5e7eb] flex items-center justify-between px-6 shrink-0 bg-white/90 backdrop-blur-md">
        <div className="w-20" />

        {/* Pill Centrale con Nome del Bot Attivo */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] shadow-xs">
          <BotAvatar bot={activeBot} size="small" />
          <span className="text-xs font-bold text-gray-800">
            {activeBot?.name}
          </span>
        </div>

        {/* Tasto Condividi a destra */}
        <button
          onClick={() => {
            sounds.play('tick');
            navigator.clipboard?.writeText(window.location.href);
            alert('Link della conversazione copiato negli appunti!');
          }}
          className="text-xs font-semibold text-gray-700 hover:text-black transition-colors px-3 py-1 rounded-lg hover:bg-gray-100"
        >
          Condividi
        </button>
      </header>

      {/* 2. Flusso dei Messaggi */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isSpeakingThis = speakingMessageIndex === idx;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Timestamp di separazione data (come in Image 1: dom 8 nov 22:06) */}
              {m.dateSeparator && (
                <div className="w-full text-center my-3 text-[11px] text-gray-400 font-medium">
                  {m.dateSeparator}
                </div>
              )}

              {/* Action Chip Inter-Bot (come in Image 1: Messaggio a 🌸 Giulia) */}
              {m.actionChip && (
                <div className="w-full flex justify-center my-2">
                  <div
                    onClick={() => {
                      if (m.actionChip.targetBotId && onSelectBot) {
                        sounds.play('tick');
                        onSelectBot(m.actionChip.targetBotId);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span>{m.actionChip.icon || '💬'}</span>
                    <span>{m.actionChip.text}</span>
                  </div>
                </div>
              )}

              {/* Status Bar Progetto (come in Image 1: Ainpratica Coordinamento Instagram) */}
              {m.projectStatusBar && (
                <div className="w-full flex justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200/80">
                    <span className="text-gray-400">⚡</span>
                    <span>{m.projectStatusBar}</span>
                    <span className="text-gray-400 flex items-center gap-1 ml-1">
                      <RotateCcw size={11} />
                      <VolumeX size={11} />
                    </span>
                  </div>
                </div>
              )}

              {isUser ? (
                /* Bolla Utente (Verde Smeraldo Grok Bot / iMessage) */
                <div className="max-w-[70%] bg-[#15803d] text-white text-[13.5px] leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-sm font-normal">
                  {m.images && m.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {m.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.previewUrl}
                          alt="Allegato"
                          className="max-h-40 rounded-xl border border-white/20 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                /* Risposta Bot (Testo pulito flat direttamente sul canvas bianco) */
                <div className="max-w-[75%] text-[13.5px] leading-relaxed text-gray-900 pr-4">
                  <div
                    className="prose prose-neutral max-w-none text-[13.5px] leading-relaxed space-y-2 [&>pre]:bg-[#1e293b] [&>pre]:text-gray-100 [&>pre]:p-3 [&>pre]:rounded-xl [&>code]:text-emerald-700"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(
                        m.content || (isStreaming && idx === messages.length - 1 ? '●' : '')
                      ),
                    }}
                  />

                  {/* Scelte Multiple (come in Image 1: [A] Italia, [B] USA) */}
                  {m.options && m.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => {
                            sounds.play('tick');
                            onSelectOption && onSelectOption(opt);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all text-left text-xs font-medium text-gray-800 shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-[10px]">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Icone di Azione con Tasto Ascolta ElevenLabs */}
                  <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                    <button
                      onClick={() => onSpeakMessage && onSpeakMessage(m.content, idx)}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 ${
                        isSpeakingThis ? 'text-emerald-600 font-bold' : 'hover:text-gray-700'
                      }`}
                      title="Ascolta con ElevenLabs"
                    >
                      <Volume2 size={13} className={isSpeakingThis ? 'animate-bounce' : ''} />
                      <span className="text-[10px]">
                        {isSpeakingThis ? 'In riproduzione...' : 'Ascolta'}
                      </span>
                    </button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <Smile size={13} />
                    </button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <CornerUpLeft size={13} />
                    </button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {m.timestamp && (
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {m.timestamp}
                </span>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* 3. Barra di Input Fluttuante in basso */}
      <footer className="p-4 bg-white shrink-0">
        <div className="max-w-3xl mx-auto rounded-full bg-[#f3f4f6] border border-[#e5e7eb] px-3 py-1.5 flex items-center gap-2 shadow-xs focus-within:border-gray-400 transition-colors">
          {/* Tasto + per allegati */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onAttachImage}
            accept="image/*"
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-full hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0"
            title="Allega file o immagine"
          >
            <Plus size={16} />
          </button>

          {/* Input Text */}
          <input
            type="text"
            value={inputValue}
            onChange={onChangeInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder={`Scrivi a ${activeBot?.name}...`}
            className="flex-1 bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none px-1"
          />

          {/* Microfono per dettatura vocale */}
          <button
            onClick={onToggleListening}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isListening
                ? 'text-red-600 bg-red-100 animate-pulse'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/80'
            }`}
            title="Dettatura vocale"
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          {/* Tasto Verde Circolare per Chiamata / Voice Waveform */}
          <button
            onClick={onStartVoiceCall}
            className="w-7 h-7 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0"
            title="Avvia sessione vocale con ElevenLabs"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <rect x="3" y="10" width="2" height="4" rx="1" />
              <rect x="7" y="7" width="2" height="10" rx="1" />
              <rect x="11" y="4" width="2" height="16" rx="1" />
              <rect x="15" y="7" width="2" height="10" rx="1" />
              <rect x="19" y="10" width="2" height="4" rx="1" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}


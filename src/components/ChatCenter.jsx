import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Mic,
  MicOff,
  Smile,
  CornerUpLeft,
  MoreHorizontal,
  Volume2,
  RotateCcw,
  VolumeX,
  Maximize2,
  Monitor,
  Search,
  FileText,
  X,
  Download,
  Copy,
  Check,
  Send,
  ChevronRight,
  Minus,
  Square as MaximizeIcon,
} from 'lucide-react';
import { marked } from 'marked';
import BotAvatar from './BotAvatar';
import { sounds } from '../services/soundEffects';

export default function ChatCenter({
  activeBot,
  bots = [],
  messages,
  inputValue,
  onChangeInput,
  onSendMessage,
  isStreaming,
  isListening,
  onToggleListening,
  onStartVoiceCall,
  attachedImages = [],
  attachedDocs = [],
  onAttachImage,
  onRemoveAttachment,
  onCapturePcScreen,
  onOpenSearch,
  onSpeakMessage,
  onSelectOption,
  onSelectBot,
  speakingMessageIndex,
  isRightSidebarOpen = false,
  onToggleRightSidebar,
  onMinimize,
  onMaximize,
  onCloseWindow,
}) {
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [canvasContent, setCanvasContent] = useState(null); // { title, content }
  const [copiedCanvas, setCopiedCanvas] = useState(false);

  // Colore dinamico dell'Agente attivo (Grok Bot original style!)
  const botColor = activeBot?.color || '#00C972';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Rilevamento menzione @NomeBot nella barra di input
  const mentionMatch = String(inputValue || '').match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const matchingBots =
    mentionQuery !== null
      ? bots
          .filter(
            (b) =>
              b.id.toLowerCase().includes(mentionQuery) ||
              b.name.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 6)
      : [];

  const handleInsertMention = (bot) => {
    sounds.play('tick');
    const replaced = String(inputValue || '').replace(
      /(?:^|\s)@([a-zA-Z0-9_-]*)$/,
      (full) => `${full.startsWith(' ') ? ' ' : ''}@${bot.name} `
    );
    onChangeInput({ target: { value: replaced } });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden relative select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Superiore della Chat — Identico all'originale Grok Bot (Image 1 & Image 4) */}
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 bg-white/95 backdrop-blur-md z-20"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* Spazio sinistro per bilanciare il centraggio perfetto della Pill */}
        <div className="w-36" />

        {/* Pill Centrale Cliccabile con Avatar + Nome Bot + ">" (Image 4: apre/chiude la Sidebar Destra!) */}
        <button
          onClick={() => {
            sounds.play('tick');
            onToggleRightSidebar && onToggleRightSidebar();
          }}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#f3f4f6] border border-gray-200/80 shadow-xs transition-all cursor-pointer"
          title={activeBot?.name}
        >
          <BotAvatar bot={activeBot} size="small" />
          <span className="text-[13px] font-semibold text-gray-900">
            {activeBot?.name}
          </span>
          <ChevronRight
            size={14}
            className={`text-gray-400 group-hover:text-gray-700 transition-transform duration-200 ${
              isRightSidebarOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Destra: Tasto "Condividi" + i 3 pulsanti Finestra (visibili qui quando la Sidebar Destra è chiusa, come in Image 1) */}
        <div
          className="flex items-center justify-end gap-2 w-36"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            onClick={() => {
              sounds.play('tick');
              const summary = messages
                .map((m) => `${m.role === 'user' ? 'Tu' : activeBot?.name}: ${m.content}`)
                .join('\n\n');
              navigator.clipboard?.writeText(summary);
              alert(`Trascrizione della chat con ${activeBot?.name} copiata negli appunti!`);
            }}
            className="text-xs font-medium text-gray-700 hover:text-black transition-colors px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-100 cursor-pointer"
          >
            Condividi
          </button>

          {!isRightSidebarOpen && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={onMinimize}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/80 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Riduci a icona"
              >
                <Minus size={14} />
              </button>
              <button
                onClick={onMaximize}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/80 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Ingrandisci"
              >
                <MaximizeIcon size={12} />
              </button>
              <button
                onClick={onCloseWindow}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                title="Chiudi applicazione"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Flusso dei Messaggi */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isSpeakingThis = speakingMessageIndex === idx;
          const hasRichCanvasContent =
            !isUser &&
            m.content &&
            (m.content.includes('|---') ||
              m.content.includes('```') ||
              m.content.length > 420);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Timestamp di separazione data */}
              {m.dateSeparator && (
                <div className="w-full text-center my-3 text-[11px] text-gray-400 font-medium">
                  {m.dateSeparator}
                </div>
              )}

              {/* Action Chip Inter-Bot col colore dell'Agente */}
              {m.actionChip && (
                <div className="w-full flex justify-center my-2">
                  <div
                    onClick={() => {
                      if (m.actionChip.targetBotId && onSelectBot) {
                        sounds.play('tick');
                        onSelectBot(m.actionChip.targetBotId);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border text-xs font-semibold text-gray-800 shadow-2xs hover:bg-gray-100 transition-colors cursor-pointer"
                    style={{ borderColor: `${botColor}55` }}
                  >
                    <span>{m.actionChip.icon || '💬'}</span>
                    <span>{m.actionChip.text}</span>
                  </div>
                </div>
              )}

              {/* Status Bar Progetto */}
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
                /* Bolla Utente: PRENDE DINAMICAMENTE IL COLORE DELL'AGENTE CHE STAI USANDO! */
                <div
                  className="max-w-[70%] text-white text-[13.5px] leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-sm font-normal transition-colors duration-300"
                  style={{ backgroundColor: botColor }}
                >
                  {m.images && m.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {m.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.previewUrl}
                          alt="Allegato"
                          className="max-h-40 rounded-xl border border-white/25 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {m.docs && m.docs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.docs.map((doc, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-white text-[11px] font-semibold"
                        >
                          <FileText size={12} />
                          <span>{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                /* Risposta Bot */
                <div className="max-w-[75%] text-[13.5px] leading-relaxed text-gray-900 pr-4">
                  <div
                    className="prose prose-neutral max-w-none text-[13.5px] leading-relaxed space-y-2 [&>pre]:bg-[#1e293b] [&>pre]:text-gray-100 [&>pre]:p-3 [&>pre]:rounded-xl [&>code]:font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(
                        m.content || (isStreaming && idx === messages.length - 1 ? '●' : '')
                      ),
                    }}
                  />

                  {/* Pulsante "Apri a schermo intero" per Tabelle, Diagrammi, Script e Documenti (Feature #3 da Grok Bot) */}
                  {hasRichCanvasContent && (
                    <button
                      onClick={() => {
                        sounds.play('tick');
                        setCanvasContent({
                          title: `Documento / Vista di ${activeBot?.name}`,
                          content: m.content,
                        });
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:shadow-xs cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-800"
                      style={{ borderColor: `${botColor}55` }}
                    >
                      <Maximize2 size={12} style={{ color: botColor }} />
                      <span>Apri a schermo intero</span>
                    </button>
                  )}

                  {/* Scelte Multiple col colore dinamico dell'Agente */}
                  {m.options && m.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => {
                            sounds.play('tick');
                            onSelectOption && onSelectOption(opt);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-left text-xs font-medium text-gray-800 shadow-2xs cursor-pointer"
                          style={{ borderColor: `${botColor}40` }}
                        >
                          <span
                            className="w-5 h-5 rounded-md text-white font-bold flex items-center justify-center text-[10px] shrink-0"
                            style={{ backgroundColor: botColor }}
                          >
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
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
                      style={{ color: isSpeakingThis ? botColor : undefined }}
                      title={`Ascolta con la voce di ${activeBot?.name}`}
                    >
                      <Volume2 size={13} className={isSpeakingThis ? 'animate-bounce' : ''} />
                      <span className="text-[10px] font-semibold">
                        {isSpeakingThis ? 'In riproduzione...' : 'Ascolta'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(m.content || '');
                        sounds.play('tick');
                      }}
                      className="p-1 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                      title="Copia messaggio"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() =>
                        setCanvasContent({
                          title: `Vista a schermo intero — ${activeBot?.name}`,
                          content: m.content,
                        })
                      }
                      className="p-1 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                      title="Apri a schermo intero"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {m.timestamp && (
                <span className="text-[10px] text-gray-400 mt-1 px-1">{m.timestamp}</span>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Anteprima Allegati Immagini & Documenti prima dell'invio */}
      {(attachedImages.length > 0 || attachedDocs.length > 0) && (
        <div className="px-6 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2 overflow-x-auto">
          {attachedImages.map((img, i) => (
            <div key={`img-${i}`} className="relative group shrink-0">
              <img
                src={img.previewUrl}
                alt="Preview"
                className="h-12 w-12 rounded-xl object-cover border border-gray-300"
              />
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment('image', i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[10px] cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {attachedDocs.map((doc, i) => (
            <div
              key={`doc-${i}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 shrink-0"
            >
              <FileText size={13} style={{ color: botColor }} />
              <span className="max-w-[140px] truncate">{doc.name}</span>
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment('doc', i)}
                  className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Popup Menzione @NomeBot sopra la barra di input (Feature #4) */}
      <AnimatePresence>
        {matchingBots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-auto mb-1 w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 z-30"
          >
            <div className="text-[10px] font-bold text-gray-400 uppercase px-2.5 py-1">
              Menziona un collega del Team (@)
            </div>
            {matchingBots.map((b) => (
              <button
                key={b.id}
                onClick={() => handleInsertMention(b)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 text-left transition-colors cursor-pointer"
              >
                <BotAvatar bot={b} size="small" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900">{b.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{b.subtitle}</div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: b.color }}
                >
                  @{b.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Barra di Input Fluttuante in basso (adattata al colore dell'Agente attivo!) */}
      <footer className="p-4 bg-white shrink-0">
        <div
          className="max-w-3xl mx-auto rounded-full bg-[#f3f4f6] border px-3 py-1.5 flex items-center gap-2 shadow-xs transition-colors"
          style={{ borderColor: inputValue ? `${botColor}88` : '#e5e7eb' }}
        >
          {/* Tasto + per allegati (Immagini + PDF, TXT, MD, CSV, JSON, Codice, Word/Excel) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onAttachImage}
            accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml,.log"
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-full hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Allega immagine o documento (.pdf, .txt, .md, .csv, .json, codice)"
          >
            <Plus size={16} />
          </button>

          {/* Tasto Cattura Schermo PC in diretta ("Agisce sullo schermo" - Feature #5) */}
          {onCapturePcScreen && (
            <button
              onClick={onCapturePcScreen}
              className="w-7 h-7 rounded-full hover:bg-gray-200/80 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title={`Mostra il tuo schermo PC a ${activeBot?.name} in tempo reale`}
            >
              <Monitor size={14} />
            </button>
          )}

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
            placeholder={`Scrivi a ${activeBot?.name}... (usa @ per chiamare un altro bot)`}
            className="flex-1 bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none px-1"
          />

          {/* Microfono per dettatura vocale */}
          <button
            onClick={onToggleListening}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isListening
                ? 'text-red-600 bg-red-100 animate-pulse'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/80'
            }`}
            title="Dettatura vocale"
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          {/* Se c'è testo scritto, mostra anche il pulsante Invia col colore dell'Agente */}
          {inputValue && inputValue.trim().length > 0 && (
            <button
              onClick={() => onSendMessage()}
              className="w-7 h-7 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0 cursor-pointer"
              style={{ backgroundColor: botColor }}
              title="Invia messaggio"
            >
              <Send size={13} />
            </button>
          )}

          {/* Tasto Circolare per Chiamata Vocale: PRENDE IL COLORE DELL'AVATAR AGENTE! */}
          <button
            onClick={onStartVoiceCall}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0 cursor-pointer"
            style={{ backgroundColor: botColor }}
            title={`Avvia chiamata vocale live con ${activeBot?.name}`}
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

      {/* Modale Canvas a Schermo Intero per Tabelle, Diagrammi e Documenti (Feature #3) */}
      <AnimatePresence>
        {canvasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <BotAvatar bot={activeBot} size="small" />
                  <h3 className="text-sm font-bold text-gray-900">{canvasContent.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(canvasContent.content);
                      setCopiedCanvas(true);
                      setTimeout(() => setCopiedCanvas(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCanvas ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedCanvas ? 'Copiato!' : 'Copia'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      const fileName = `canvas_${activeBot?.id}_${Date.now()}.md`;
                      await fetch('/api/fs/write', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          botId: activeBot?.id,
                          name: fileName,
                          content: canvasContent.content,
                        }),
                      });
                      sounds.play('success');
                      alert(`Salvato nella Libreria di ${activeBot?.name}: ${fileName}`);
                    }}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: botColor }}
                  >
                    <Download size={13} />
                    <span>Salva in Libreria</span>
                  </button>
                  <button
                    onClick={() => setCanvasContent(null)}
                    className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div
                  className="prose prose-neutral max-w-none text-sm leading-relaxed [&>pre]:bg-[#1e293b] [&>pre]:text-gray-100 [&>pre]:p-4 [&>pre]:rounded-2xl [&>table]:w-full [&>table]:border-collapse [&_th]:bg-gray-100 [&_th]:p-2.5 [&_th]:border [&_td]:p-2.5 [&_td]:border"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(canvasContent.content || ''),
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

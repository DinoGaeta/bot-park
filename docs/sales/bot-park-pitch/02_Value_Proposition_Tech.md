# Bot Park — Value Proposition Tecnica & Architettura Enterprise

**Autore / Strategia:** Arthur × Kitsune Labs  
**Target Audience:** CTO, VP Engineering, Security Officer, Head of IT  
**Focus:** Architettura Local-First, Sicurezza GDPR/EU AI Act, Entanglement Real-Time & Integrazioni

---

## 1. Architettura di Sistema "Zero-Bloat"
Bot Park elimina i pesanti livelli intermedi tipici delle suite AI SaaS grazie a uno stack moderno, trasparente e modulare:

- **Frontend Multi-Piattaforma**: React + Vite + Framer Motion + TailwindCSS, servito in locale o via Edge CDN con caricamento sub-secondo.
- **Shell Desktop Nativa**: Electron custom (`com.kitsunelabs.botpark`) con tray icon, launcher nativo Windows senza console (`Bot Park.exe`), cache isolata e notifiche OS native.
- **App Mobile Nativa Android (`BotParkMobile.apk`)**: WebView ottimizzata con sblocco permessi WebRTC/microfono, auto-discovery LAN/IP e `BotParkPushService` in foreground per ricezione notifiche real-time.
- **Backend Middleware Integrato**: Server Node/Vite espandibile (`/api/*`) con gestione atomica dello stato, proxy web anti-CORS (`GET /api/web/proxy`), bridge file system sandboxed (`workspaces/<botId>`) e integrazione ADB.

---

## 2. Sincronizzazione Real-Time "Quantum Entanglement"
Uno dei principali punti di rottura delle piattaforme AI multi-device è lo disallineamento tra ciò che accade sul telefono e ciò che appare sulla workstation desktop. Bot Park risolve il problema con un bus reattivo a 2 livelli:

1. **Server-Sent Events (`GET /api/sync/stream`)**: Tutti i client connessi (Electron Desktop, Browser Web, App Android) mantengono uno stream persistente verso l'orchestratore. Ogni modifica di stato, creazione agente o nuovo messaggio si propaga verso gli altri client in `< 50ms`.
2. **Merge Atomico CRDT (`mergeEntangledState`)**: Lato server, `POST /api/mobile/sync` non sovrascrive mai ciecamente lo stato precedente, ma effettua il merge per `botId` di lista agenti, memorie permanenti, skill e conversazioni (gestendo separatamente eliminazioni volontarie e reset di chat).

---

## 3. Sicurezza, Privacy & Conformità (GDPR / EU AI Act)
- **Local-First by Design**: Nessun database centrale proprietario accumula prompt, allegati o segreti aziendali dei clienti.
- **Cassaforte Credenziali Locale**: Gestione separata di API key (Gemini, ElevenLabs) con supporto BYOK (*Bring Your Own Key*) e sanitizzazione automatica per i repository pubblici/condivisi.
- **Memoria Persistente Auditabile**: Ogni agente salva i fatti appresi e le proprie skill in file Markdown leggibili (`workspaces/<botId>/memoria_agente.md`) con rotazione automatica (`max 200 memorie`, `max 100 messaggi` per thread) che mantiene l'occupazione su disco inferiore a pochi MB anche su lungo periodo.

---

## 4. Ecosistema di Tool & Integrazioni Operative
| Capacità Tecnica | Modulo Bot Park | Impatto Operativo |
| :--- | :--- | :--- |
| **Delega Multi-Agente** | `<<<SEND_TO_BOT>>>` / `<<<CREATE_BOT>>>` | Routing autonomo tra reparti AI (Marketing, Dev, Security, Sales) |
| **Bridge Autonomo IDE** | `<<<SEND_TO_ANTIGRAVITY>>>` + Watcher Reattivo | Gli agenti delegano task di codice/documenti reali direttamente all'IDE |
| **Chiamate Vocali Live** | Web Speech + ElevenLabs Low-Latency TTS | Voice agent personalizzati per ogni ruolo con strippaggio tag di sistema |
| **Controllo Smart TV / IoT** | Bridge ADB LAN (`android.os` / Jarvis OS1) | Comandi vocali e telecontrollo su dispositivi Android TV in rete locale |
| **Virtual Computer Proxy** | `/api/web/proxy` & `/api/fs/*` | Navigazione controllata e lettura/scrittura file direttamente in app |

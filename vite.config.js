import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const ADB_PATH = 'C:\\Users\\corra\\.gemini\\antigravity\\scratch\\tools\\platform-tools\\adb.exe';
const TV_SERIAL = '172.20.10.3:5555';
const WORKSPACES_ROOT = path.join(__dirname, 'workspaces');
const VAULT_FILE = path.join(WORKSPACES_ROOT, '_vault.json');
const MOBILE_SYNC_FILE = path.join(WORKSPACES_ROOT, '_mobile_sync_state.json');
const MEMORIA_GEMINI_PATH = 'C:\\Users\\corra\\Desktop\\memoria_gemini.txt';

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  let fallback = '127.0.0.1';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.') || net.address.startsWith('172.20.') || net.address.startsWith('10.')) {
          return net.address;
        }
        fallback = net.address;
      }
    }
  }
  return fallback;
}

const TV_APPS = {
  youtube: { pkg: 'com.google.android.youtube.tv', label: 'YouTube TV' },
  smarttube: { pkg: 'org.smarttube.stable', label: 'SmartTube' },
  spotify: { pkg: 'com.spotify.tv.android', label: 'Spotify TV' },
  stremio: { pkg: 'com.stremio.one', label: 'Stremio' },
  netflix: { pkg: 'com.netflix.ninja', label: 'Netflix' },
  disney: { pkg: 'com.disney.disneyplus', label: 'Disney+' },
  prime: { pkg: 'com.amazon.amazonvideo.livingroom', label: 'Prime Video' },
  appletv: { pkg: 'com.apple.atve.androidtv.appletv', label: 'Apple TV' },
  raiplay: { pkg: 'it.rainet.androidtv', label: 'RaiPlay' },
  tivimate: { pkg: 'ar.tvplayer.tv', label: 'TiviMate Live TV' },
};

const KEY_MAP = {
  HOME: '3',
  BACK: '4',
  UP: '19',
  DOWN: '20',
  LEFT: '21',
  RIGHT: '22',
  CENTER: '23',
  OK: '23',
  VOLUME_UP: '24',
  VOLUME_DOWN: '25',
  POWER: '26',
  SLEEP: '223',
  WAKEUP: '224',
  PLAY_PAUSE: '85',
  MUTE: '164',
};

const DEFAULT_BOT_FILES = {
  samantha: {
    'piano_fiorire_insieme.md': `# Diario Condiviso — Samantha & Dion ("Fiorire Insieme")\n\n- **Ruolo**: Capo Bot di Bot Park & OS1 su Smart TV Salotto (172.20.10.3)\n- **Squadra Coordinata**: Steve, Giulia, Italo, Laika, Spielberg, Bastione, Sam, Piton, santilighieri, Concierge, Rex.\n- **Stato Smart TV**: Collegata in tempo reale via ADB (172.20.10.3:5555).\n`,
    'regole_coordinamento_team.md': `# Regole Operative del Team Kitsune Labs\n\n1. Ogni agente mantiene memoria, voce e workspace indipendenti.\n2. Samantha supervisiona le priorità e il collegamento con la TV del salotto.\n3. I file generati dai bot vengono salvati direttamente nella rispettiva cartella workspace.\n`,
  },
  italo: {
    'script_reel_ainpratica_ep01.md': `# Script Reel #01 — AInpratica\n\n**HOOK (0-3s):** "Tutti usano l'IA come un motore di ricerca. Ecco perché ottengono risposte mediocri."\n**SVILUPPO (3-18s):** Mostriamo la differenza tra un singolo prompt e una squadra di agenti specializzati con ruoli divisi.\n**CTA (18-25s):** "Salva il Reel e scrivici nei commenti quale agente vorresti nel tuo team."\n`,
  },
  giulia: {
    'calendario_editoriale_ainpratica.md': `# Calendario Editoriale Instagram — AInpratica\n\n- **Lunedì**: Carosello educativo (grafica di Laika)\n- **Mercoledì**: Reel Hook + Caso Pratico (script di Italo, montaggio di Spielberg)\n- **Venerdì**: Dietro le quinte del team Kitsune Labs\n`,
  },
  laika: {
    'sistema_visivo_ainpratica.md': `# Identità Visiva & Palette — AInpratica\n\n- **Primary**: #1084FE (Grok Electric Blue)\n- **Accent**: #FF309B (Neon Magenta) & #00C972 (Emerald)\n- **Font Titoli**: Plus Jakarta Sans ExtraBold (contrasto elevato per lettura mobile)\n`,
  },
  spielberg: {
    'preset_montaggio_reel.md': `# Linee Guida Montaggio Short Verticali\n\n- Pattern interrupt visivo ogni 2.5 secondi.\n- Sottotitoli dinamici ad alto contrasto centrati nella safe-zone.\n- Sound design leggero (whoosh + pop organici).\n`,
  },
  steve: {
    'roadmap_progetti_dion.md': `# Roadmap Operativa Progetti — Dion & Steve\n\n1. **Bot Park v2.0**: Consolidamento Samantha Capo Bot + Bridge Smart TV + Terminale e File Reali.\n2. **Samantha Mobile / Segretaria**: Valutazione fattibilità flusso chiamate in entrata.\n3. **AInpratica**: Avvio pubblicazione primi 3 contenuti con Giulia, Italo, Laika e Spielberg.\n`,
  },
  bastione: {
    'hardening_rete_e_tv.md': `# Checklist Sicurezza Locale — Bastione\n\n- Verifica periodica porte esposte su subnet 172.20.10.0/24.\n- Controllo firma crittografica intent su JarvisSecurityFirewall (Android TV).\n`,
  },
  piton: {
    'diagnostica_sistema.py': `import platform\nimport datetime\n\nprint(f"[PITON] Sistema operativo: {platform.system()} {platform.release()}")\nprint(f"[PITON] Timestamp verifica: {datetime.datetime.now().isoformat()}")\n`,
  },
};

function ensureBotWorkspace(botId) {
  const safeId = String(botId || 'samantha').replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(WORKSPACES_ROOT, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    const seed = DEFAULT_BOT_FILES[safeId] || {
      [`note_${safeId}.md`]: `# Workspace Ufficiale di ${safeId}\n\nCartella di lavoro reale attiva su disco.\n`,
    };
    for (const [fname, content] of Object.entries(seed)) {
      fs.writeFileSync(path.join(dir, fname), content, 'utf8');
    }
  }
  return dir;
}

function ensureVaultFile() {
  if (!fs.existsSync(WORKSPACES_ROOT)) {
    fs.mkdirSync(WORKSPACES_ROOT, { recursive: true });
  }
  if (!fs.existsSync(VAULT_FILE)) {
    const initialVault = [
      {
        id: 'v1',
        type: 'contact',
        title: 'Email di Bot Park',
        subtitle: 'corradogaeta123@gmail.com',
        secret: 'corradogaeta123@gmail.com',
        icon: 'mail',
      },
      {
        id: 'v2',
        type: 'credential',
        title: 'instagram.com',
        subtitle: 'corradogaeta123@gmail.com',
        secret: 'Account principale collegato',
        icon: 'instagram',
      },
      {
        id: 'v3',
        type: 'credential',
        title: 'instagram.com (AInpratica)',
        subtitle: 'ainpratica',
        secret: 'Pagina ufficiale progetto AInpratica',
        icon: 'instagram',
      },
      {
        id: 'v4',
        type: 'credential',
        title: 'Android TV Salotto (ADB)',
        subtitle: '172.20.10.3:5555',
        secret: 'Connessione diretta Samantha OS1',
        icon: 'key',
      },
    ];
    fs.writeFileSync(VAULT_FILE, JSON.stringify(initialVault, null, 2), 'utf8');
  }
}

async function runAdb(args, options = {}) {
  try {
    return await execFileAsync(ADB_PATH, ['-s', TV_SERIAL, ...args], {
      timeout: options.timeout || 10000,
      maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
      encoding: options.encoding || 'utf8',
    });
  } catch {
    await execFileAsync(ADB_PATH, ['connect', TV_SERIAL], { timeout: 4000 }).catch(() => {});
    return await execFileAsync(ADB_PATH, ['-s', TV_SERIAL, ...args], {
      timeout: options.timeout || 10000,
      maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
      encoding: options.encoding || 'utf8',
    });
  }
}

function escapeAndroidShellSingleQuotes(str) {
  return `'${String(str || '').replace(/'/g, "'\\''")}'`;
}

async function readJsonBody(req) {
  let bodyStr = '';
  for await (const chunk of req) {
    bodyStr += chunk;
  }
  return JSON.parse(bodyStr || '{}');
}

function botParkBackendPlugin() {
  return {
    name: 'bot-park-backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost:5173');
        const pathname = urlObj.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          // =========================================================================
          // A. SMART TV ANDROID BRIDGE (/api/tv/*)
          // =========================================================================
          if (pathname === '/api/tv/status' && req.method === 'GET') {
            const { stdout: stateOut } = await runAdb(['get-state'], { timeout: 4000 });
            const connected = stateOut.trim() === 'device';

            const { stdout: winOut } = await runAdb([
              'shell',
              "dumpsys window displays | grep -E 'mCurrentFocus|mFocusedApp' | head -n 4",
            ]).catch(() => ({ stdout: '' }));

            let currentApp = 'Android TV Home';
            for (const [, info] of Object.entries(TV_APPS)) {
              if (winOut.includes(info.pkg)) {
                currentApp = info.label;
                break;
              }
            }
            if (winOut.includes('com.google.android.tvlauncher')) {
              currentApp = 'Google TV Home';
            }

            const { stdout: memOut } = await runAdb([
              'shell',
              'cat /sdcard/Jarvis/conversation_memory.json 2>/dev/null || echo "[]"',
            ]).catch(() => ({ stdout: '[]' }));

            let history = [];
            try {
              const parsed = JSON.parse(memOut.trim() || '[]');
              if (Array.isArray(parsed)) {
                history = parsed.slice(-8);
              }
            } catch {
              history = [];
            }

            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                connected,
                serial: TV_SERIAL,
                currentApp,
                focusRaw: winOut.trim(),
                history,
                timestamp: Date.now(),
              })
            );
          }

          if (pathname === '/api/tv/screenshot' && req.method === 'GET') {
            const { stdout: pngBuffer } = await runAdb(['exec-out', 'screencap', '-p'], {
              encoding: 'buffer',
              timeout: 8000,
              maxBuffer: 25 * 1024 * 1024,
            });

            if (urlObj.searchParams.get('format') === 'json') {
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  ok: true,
                  base64: pngBuffer.toString('base64'),
                  mimeType: 'image/png',
                  timestamp: Date.now(),
                })
              );
            }

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.end(pngBuffer);
          }

          if (pathname === '/api/tv/command' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const { type } = body;

            if (type === 'samantha_query') {
              const queryText = String(body.text || '').trim();
              if (!queryText) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ ok: false, error: 'Query vuota' }));
              }

              let prevLastTs = 0;
              try {
                const { stdout: beforeMem } = await runAdb([
                  'shell',
                  'cat /sdcard/Jarvis/conversation_memory.json 2>/dev/null || echo "[]"',
                ]);
                const arr = JSON.parse(beforeMem.trim() || '[]');
                if (arr.length > 0) prevLastTs = arr[arr.length - 1].timestamp || 0;
              } catch {}

              await runAdb(['shell', 'input keyevent 224']).catch(() => {});
              const escaped = escapeAndroidShellSingleQuotes(queryText);
              await runAdb([
                'shell',
                `am startservice -n com.kage.jarvis/.JarvisOverlayService -a com.kage.jarvis.TEST_QUERY --es query ${escaped}`,
              ]);

              let newTurn = null;
              for (let i = 0; i < 11; i++) {
                await new Promise((r) => setTimeout(r, 750));
                try {
                  const { stdout: afterMem } = await runAdb([
                    'shell',
                    'cat /sdcard/Jarvis/conversation_memory.json 2>/dev/null || echo "[]"',
                  ]);
                  const arr = JSON.parse(afterMem.trim() || '[]');
                  if (arr.length > 0) {
                    const last = arr[arr.length - 1];
                    if (last.timestamp && last.timestamp > prevLastTs) {
                      newTurn = last;
                      break;
                    }
                  }
                } catch {}
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  ok: true,
                  type: 'samantha_query',
                  query: queryText,
                  tvReply: newTurn ? newTurn.jarvis : null,
                  tvAction: newTurn ? newTurn.action : 'Comando inviato a Samantha TV',
                  turn: newTurn,
                })
              );
            }

            if (type === 'samantha_speak' || type === 'jarvis_say') {
              const speakText = String(body.text || '').trim();
              const targetVoiceId = String(body.voiceId || '').trim();

              // Se l'agente ha una propria voce ElevenLabs (es. Spielberg, Italo, Samantha), aggiorniamo al volo la voce sulla TV!
              if (targetVoiceId && targetVoiceId !== 'Cosmo') {
                try {
                  const { stdout: cfgRaw } = await runAdb([
                    'shell',
                    'cat /sdcard/Jarvis/config.json 2>/dev/null || echo "{}"',
                  ]);
                  const cfgObj = JSON.parse(cfgRaw.trim() || '{}');
                  if (cfgObj.elevenlabs_voice_id !== targetVoiceId) {
                    cfgObj.elevenlabs_voice_id = targetVoiceId;
                    const escapedCfg = escapeAndroidShellSingleQuotes(JSON.stringify(cfgObj));
                    await runAdb([
                      'shell',
                      `echo ${escapedCfg} > /sdcard/Jarvis/config.json`,
                    ]);
                  }
                } catch {}
              }

              await runAdb(['shell', 'input keyevent 224']).catch(() => {});
              const escaped = escapeAndroidShellSingleQuotes(speakText);
              const escapedName = escapeAndroidShellSingleQuotes(body.botName || 'Samantha');
              const escapedColor = escapeAndroidShellSingleQuotes(body.botColor || '#FF3B9A');
              const escapedShape = escapeAndroidShellSingleQuotes(body.botShape || 'pebble');
              await runAdb([
                'shell',
                `am startservice -n com.kage.jarvis/.JarvisOverlayService -a com.kage.jarvis.SPEAK --es text ${escaped} --es bot_name ${escapedName} --es bot_color ${escapedColor} --es bot_shape ${escapedShape}`,
              ]);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, type: 'samantha_speak', text: speakText, voiceId: targetVoiceId }));
            }

            if (type === 'stop_speak') {
              await runAdb(['shell', 'input keyevent 4']).catch(() => {});
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, type: 'stop_speak' }));
            }

            if (type === 'trigger_mic') {
              await runAdb(['shell', 'input keyevent 224']).catch(() => {});
              await runAdb([
                'shell',
                'am startservice -n com.kage.jarvis/.JarvisOverlayService -a com.kage.jarvis.TRIGGER_VOICE',
              ]);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, type: 'trigger_mic' }));
            }

            if (type === 'keyevent') {
              const keyName = String(body.key || 'HOME').toUpperCase();
              const code = KEY_MAP[keyName] || keyName;
              await runAdb(['shell', `input keyevent ${code}`]);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, type: 'keyevent', key: keyName, code }));
            }

            if (type === 'open_app') {
              const appKey = String(body.app || '').toLowerCase();
              const target = TV_APPS[appKey];
              if (!target) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ ok: false, error: `App non riconosciuta: ${appKey}` }));
              }
              await runAdb(['shell', 'input keyevent 224']).catch(() => {});
              await runAdb([
                'shell',
                `monkey -p ${target.pkg} -c android.intent.category.LEANBACK_LAUNCHER 1 || monkey -p ${target.pkg} 1`,
              ]);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, type: 'open_app', app: target.label, pkg: target.pkg }));
            }

            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: `Tipo comando non supportato: ${type}` }));
          }

          // =========================================================================
          // B. FILE MANAGER & LIBRERIA REALE SU DISCO PER OGNI BOT (/api/fs/*)
          // =========================================================================
          if (pathname === '/api/fs/list' && req.method === 'GET') {
            const botId = urlObj.searchParams.get('botId') || 'samantha';
            const dir = ensureBotWorkspace(botId);
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const files = entries
              .filter((e) => e.isFile())
              .map((e) => {
                const full = path.join(dir, e.name);
                const stat = fs.statSync(full);
                const kb = Math.max(0.1, stat.size / 1024).toFixed(1);
                const d = new Date(stat.mtime);
                const dateStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                return {
                  id: e.name,
                  name: e.name,
                  size: `${kb} KB`,
                  date: `Oggi • ${dateStr}`,
                  mtime: stat.mtimeMs,
                };
              })
              .sort((a, b) => b.mtime - a.mtime);

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, botId, workspacePath: dir, files }));
          }

          if (pathname === '/api/fs/read' && req.method === 'GET') {
            const botId = urlObj.searchParams.get('botId') || 'samantha';
            const fileName = path.basename(urlObj.searchParams.get('name') || '');
            const dir = ensureBotWorkspace(botId);
            const target = path.join(dir, fileName);
            if (!fs.existsSync(target)) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ ok: false, error: 'File non trovato' }));
            }
            const content = fs.readFileSync(target, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, name: fileName, content }));
          }

          if (pathname === '/api/fs/write' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const botId = body.botId || 'samantha';
            const fileName = path.basename(body.name || 'documento.md');
            const content = String(body.content ?? '');
            const dir = ensureBotWorkspace(botId);
            const target = path.join(dir, fileName);
            fs.writeFileSync(target, content, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, name: fileName, path: target }));
          }

          if (pathname === '/api/fs/delete' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const botId = body.botId || 'samantha';
            const fileName = path.basename(body.name || '');
            const dir = ensureBotWorkspace(botId);
            const target = path.join(dir, fileName);
            if (fs.existsSync(target)) fs.unlinkSync(target);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }

          // =========================================================================
          // C. TERMINALE REALE DEL BOT (/api/terminal/exec)
          // =========================================================================
          if (pathname === '/api/terminal/exec' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const botId = body.botId || 'samantha';
            const command = String(body.command || '').trim();
            const cwd = ensureBotWorkspace(botId);

            if (!command) {
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, output: '' }));
            }

            try {
              const { stdout, stderr } = await execAsync(command, {
                cwd,
                timeout: 12000,
                maxBuffer: 4 * 1024 * 1024,
              });
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  ok: true,
                  cwd,
                  output: (stdout || stderr || 'Comando completato (exit 0).').trim(),
                })
              );
            } catch (cmdErr) {
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  ok: true,
                  cwd,
                  output: (cmdErr.stdout || cmdErr.stderr || cmdErr.message || 'Errore esecuzione').trim(),
                  isError: true,
                })
              );
            }
          }

          // =========================================================================
          // D. ACCESSO WEB LIVE: METEO TORINO, GOOGLE NEWS ITALIA & FETCH LINK/YOUTUBE (/api/web/*)
          // =========================================================================
          if (pathname === '/api/web/briefing' && req.method === 'GET') {
            let weatherSummary = '';
            let newsSummary = '';

            // 1. Meteo Reale Torino (Open-Meteo)
            try {
              const wRes = await fetch(
                'https://api.open-meteo.com/v1/forecast?latitude=45.0703&longitude=7.6869&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FRome'
              );
              if (wRes.ok) {
                const wData = await wRes.json();
                const cur = wData.current || {};
                const daily = wData.daily || {};
                weatherSummary = `METEO LIVE TORINO: Temperatura attuale ${cur.temperature_2m}°C (percepita ${cur.apparent_temperature}°C), Umidità ${cur.relative_humidity_2m}%, Vento ${cur.wind_speed_10m} km/h. Oggi min ${daily.temperature_2m_min?.[0]}°C / max ${daily.temperature_2m_max?.[0]}°C (prob. pioggia ${daily.precipitation_probability_max?.[0]}%).`;
              }
            } catch {}

            // 2. Ultime Notizie Reali Google News Italia RSS
            try {
              const nRes = await fetch('https://news.google.com/rss?hl=it&gl=IT&ceid=IT:it');
              if (nRes.ok) {
                const xml = await nRes.text();
                const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/g)]
                  .slice(0, 6)
                  .map((m, i) => `${i + 1}. ${m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()}`);
                if (items.length > 0) {
                  newsSummary = `ULTIME NOTIZIE LIVE ITALIA & MONDO:\n${items.join('\n')}`;
                }
              }
            } catch {}

            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                weather: weatherSummary,
                news: newsSummary,
                combined: [weatherSummary, newsSummary].filter(Boolean).join('\n\n'),
              })
            );
          }

          if (pathname === '/api/web/fetch' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const targetUrl = String(body.url || '').trim();
            if (!targetUrl) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ ok: false, error: 'URL mancante' }));
            }

            let extractedTitle = targetUrl;
            let extractedText = '';

            // Se è un link YouTube, estraiamo prima i metadati ufficiali tramite oEmbed!
            if (targetUrl.includes('youtube.com/') || targetUrl.includes('youtu.be/')) {
              try {
                const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
                const oeRes = await fetch(oembedUrl);
                if (oeRes.ok) {
                  const oe = await oeRes.json();
                  extractedTitle = `${oe.title} (Canale YouTube: ${oe.author_name})`;
                  extractedText += `VIDEO YOUTUBE RILEVATO:\n- Titolo: ${oe.title}\n- Autore/Canale: ${oe.author_name}\n- URL Canale: ${oe.author_url}\n`;
                }
              } catch {}
            }

            try {
              const pageRes = await fetch(targetUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
                },
              });
              const html = await pageRes.text();
              const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
              if (titleMatch && extractedTitle === targetUrl) {
                extractedTitle = titleMatch[1].replace(/\s+/g, ' ').trim();
              }
              const descMatch = html.match(
                /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i
              );
              const metaDesc = descMatch ? descMatch[1] : '';

              const stripped = html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 3500);

              extractedText += `${metaDesc ? `Descrizione: ${metaDesc}\n` : ''}Contenuto estratto: ${stripped}`;
            } catch (e) {
              extractedText += `Impossibile scaricare il corpo HTML completo (${e.message}).`;
            }

            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                url: targetUrl,
                title: extractedTitle,
                content: extractedText,
              })
            );
          }

          // =========================================================================
          // E. CASSAFORTE REALE & IMPORTAZIONE MEMORIA (/api/vault & /api/memory/import)
          // =========================================================================
          if (pathname === '/api/vault' && req.method === 'GET') {
            ensureVaultFile();
            const items = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8') || '[]');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, items }));
          }

          if (pathname === '/api/vault' && req.method === 'POST') {
            ensureVaultFile();
            const body = await readJsonBody(req);
            const items = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8') || '[]');
            const newItem = {
              id: `v_${Date.now()}`,
              type: body.type || 'credential',
              title: body.title || 'Nuovo Elemento',
              subtitle: body.subtitle || '',
              secret: body.secret || '',
              icon: body.icon || 'key',
            };
            items.unshift(newItem);
            fs.writeFileSync(VAULT_FILE, JSON.stringify(items, null, 2), 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, item: newItem, items }));
          }

          if (pathname === '/api/vault' && req.method === 'DELETE') {
            ensureVaultFile();
            const id = urlObj.searchParams.get('id');
            let items = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8') || '[]');
            items = items.filter((i) => i.id !== id);
            fs.writeFileSync(VAULT_FILE, JSON.stringify(items, null, 2), 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, items }));
          }

          if (pathname === '/api/memory/import' && req.method === 'POST') {
            let diaryExcerpt = '';
            let totalChars = 0;
            if (fs.existsSync(MEMORIA_GEMINI_PATH)) {
              const raw = fs.readFileSync(MEMORIA_GEMINI_PATH, 'utf8');
              totalChars = raw.length;
              diaryExcerpt = raw.slice(-3500);
              // Salviamo anche una copia aggiornata nel workspace di Samantha
              const samDir = ensureBotWorkspace('samantha');
              fs.writeFileSync(path.join(samDir, 'memoria_gemini_sincronizzata.txt'), raw, 'utf8');
            }
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                source: MEMORIA_GEMINI_PATH,
                totalChars,
                excerpt: diaryExcerpt,
              })
            );
          }

          // =========================================================================
          // F. CATTURA SCHERMO PC LOCALE WINDOWS (/api/pc/screenshot)
          // =========================================================================
          if (pathname === '/api/pc/screenshot' && req.method === 'GET') {
            const psCmd = `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $bmp.Dispose(); [Convert]::ToBase64String($ms.ToArray())`;
            const { stdout } = await execFileAsync(
              'powershell.exe',
              ['-NoProfile', '-Command', psCmd],
              { timeout: 8000, maxBuffer: 15 * 1024 * 1024 }
            );
            const b64 = (stdout || '').trim();
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: Boolean(b64),
                mimeType: 'image/jpeg',
                base64: b64,
                dataUrl: b64 ? `data:image/jpeg;base64,${b64}` : '',
                timestamp: new Date().toLocaleTimeString('it-IT'),
              })
            );
          }

          // =========================================================================
          // G. SINCRONIZZAZIONE MOBILE & QR CODE LAN (/api/mobile/sync & /api/network/info)
          // =========================================================================
          if (pathname === '/api/network/info' && req.method === 'GET') {
            const lanIp = getLocalLanIp();
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                lanIp,
                port: 5173,
                mobileUrl: `http://${lanIp}:5173`,
              })
            );
          }

          if (pathname === '/api/mobile/sync' && req.method === 'GET') {
            ensureVaultFile();
            let state = null;
            if (fs.existsSync(MOBILE_SYNC_FILE)) {
              try {
                state = JSON.parse(fs.readFileSync(MOBILE_SYNC_FILE, 'utf8'));
              } catch (_) {
                state = null;
              }
            }
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                ok: true,
                lanIp: getLocalLanIp(),
                state,
              })
            );
          }

          if (pathname === '/api/mobile/sync' && req.method === 'POST') {
            ensureVaultFile();
            const body = await readJsonBody(req);
            const payload = {
              updatedAt: Date.now(),
              bots: body.bots || null,
              botMessages: body.botMessages || null,
              routines: body.routines || null,
              geminiApiKey: body.geminiApiKey || '',
              elevenLabsApiKey: body.elevenLabsApiKey || '',
            };
            fs.writeFileSync(MOBILE_SYNC_FILE, JSON.stringify(payload, null, 2), 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }));
          }

          next();
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: err.message || 'Errore interno Backend Bot Park',
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), botParkBackendPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/workspaces/**', '**/_mobile_sync_state.json', '**/_vault.json'],
    },
  },
  base: './',
});

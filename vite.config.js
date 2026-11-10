import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const TV_TARGET = process.env.VITE_ANDROID_TV_IP || '192.168.1.100:5555';
const ADB_PATH = process.env.ADB_PATH || 'adb';
const WORKSPACES_ROOT = path.resolve(process.cwd(), 'workspaces');
const VAULT_FILE = path.join(WORKSPACES_ROOT, '_vault.json');

if (!fs.existsSync(WORKSPACES_ROOT)) {
  fs.mkdirSync(WORKSPACES_ROOT, { recursive: true });
}

function getBotWorkspace(botId = 'capo-bot') {
  const safeId = String(botId || 'capo-bot')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const dir = path.join(WORKSPACES_ROOT, safeId || 'capo-bot');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    const readmePath = path.join(dir, `identita_${safeId}.md`);
    fs.writeFileSync(
      readmePath,
      `# Workspace Agente: ${safeId.toUpperCase()}\n\nCartella di lavoro persistente su disco locale per l'agente **${safeId}**.\nTutti i file creati o modificati qui sono salvati in tempo reale.\n`,
      'utf8'
    );
  }
  return dir;
}

function getVaultItems() {
  if (!fs.existsSync(VAULT_FILE)) {
    const initialVault = [
      {
        id: 'v1',
        name: 'GEMINI_API_KEY',
        category: 'Secret',
        value: 'Configura la tua chiave API Gemini',
        createdAt: 'Sistema',
      },
      {
        id: 'v2',
        name: 'ELEVENLABS_API_KEY',
        category: 'Secret',
        value: 'Configura la tua chiave API ElevenLabs',
        createdAt: 'Sistema',
      },
    ];
    fs.writeFileSync(VAULT_FILE, JSON.stringify(initialVault, null, 2), 'utf8');
    return initialVault;
  }
  try {
    return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function runAdb(args) {
  return new Promise((resolve) => {
    const cmd = `"${ADB_PATH}" -s ${TV_TARGET} ${args}`;
    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout ? stdout.trim() : '',
        stderr: stderr ? stderr.trim() : error ? error.message : '',
      });
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function botParkBackendPlugin() {
  return {
    name: 'bot-park-backend-bridge',
    configureServer(server) {
      // 1. FILE SYSTEM REALE PER OGNI AGENTE
      server.middlewares.use('/api/fs/list', (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const botId = urlObj.searchParams.get('botId') || 'capo-bot';
        const dir = getBotWorkspace(botId);
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = entries
          .filter((e) => e.isFile())
          .map((e) => {
            const full = path.join(dir, e.name);
            const stat = fs.statSync(full);
            const kb = Math.max(0.1, stat.size / 1024).toFixed(1);
            return {
              id: e.name,
              name: e.name,
              size: `${kb} KB`,
              date: new Date(stat.mtimeMs).toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, botId, workspacePath: dir, files }));
      });

      server.middlewares.use('/api/fs/read', (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const botId = urlObj.searchParams.get('botId') || 'capo-bot';
        const fileName = path.basename(urlObj.searchParams.get('name') || '');
        const dir = getBotWorkspace(botId);
        const full = path.join(dir, fileName);
        res.setHeader('Content-Type', 'application/json');
        if (!fileName || !fs.existsSync(full)) {
          res.end(JSON.stringify({ ok: false, error: 'File non trovato' }));
          return;
        }
        const content = fs.readFileSync(full, 'utf8');
        res.end(JSON.stringify({ ok: true, name: fileName, content }));
      });

      server.middlewares.use('/api/fs/write', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const payload = await readJsonBody(req);
        const botId = payload.botId || 'capo-bot';
        const fileName = path.basename(String(payload.name || 'nuovo_file.md').trim());
        const content = String(payload.content ?? '');
        const dir = getBotWorkspace(botId);
        const full = path.join(dir, fileName);
        fs.writeFileSync(full, content, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, name: fileName, path: full }));
      });

      server.middlewares.use('/api/fs/delete', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const payload = await readJsonBody(req);
        const botId = payload.botId || 'capo-bot';
        const fileName = path.basename(String(payload.name || '').trim());
        const dir = getBotWorkspace(botId);
        const full = path.join(dir, fileName);
        if (fileName && fs.existsSync(full)) {
          fs.unlinkSync(full);
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
      });

      // 2. TERMINALE REALE NEL WORKSPACE DELL'AGENTE
      server.middlewares.use('/api/terminal/exec', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const payload = await readJsonBody(req);
        const botId = payload.botId || 'capo-bot';
        const command = String(payload.command || '').trim();
        const cwd = getBotWorkspace(botId);
        res.setHeader('Content-Type', 'application/json');
        if (!command) {
          res.end(JSON.stringify({ ok: true, output: '' }));
          return;
        }
        exec(command, { cwd, timeout: 10000 }, (err, stdout, stderr) => {
          const combined = [stdout, stderr, err ? err.message : '']
            .filter(Boolean)
            .join('\n')
            .trim();
          res.end(
            JSON.stringify({
              ok: !err,
              cwd,
              output: combined || '(Comando completato senza output)',
            })
          );
        });
      });

      // 3. ACCESSO WEB LIVE (Meteo Open-Meteo + Google News RSS + Link/YouTube Fetch)
      server.middlewares.use('/api/web/briefing', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const weatherRes = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=41.9028&longitude=12.4964&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FRome'
          );
          const weatherData = await weatherRes.json();
          const cur = weatherData.current || {};
          const daily = weatherData.daily || {};
          const weatherSummary = `METEO LIVE: Temperatura attuale ${cur.temperature_2m ?? '?'}°C (percepita ${cur.apparent_temperature ?? '?'}°C), Umidità ${cur.relative_humidity_2m ?? '?'}%, Vento ${cur.wind_speed_10m ?? '?'} km/h. Oggi min ${daily.temperature_2m_min?.[0] ?? '?'}°C / max ${daily.temperature_2m_max?.[0] ?? '?'}°C.`;

          const newsRes = await fetch(
            'https://news.google.com/rss?hl=it&gl=IT&ceid=IT:it'
          );
          const rssXml = await newsRes.text();
          const items = [];
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          while ((match = itemRegex.exec(rssXml)) !== null && items.length < 8) {
            const block = match[1];
            const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
            const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            if (titleMatch) {
              const cleanTitle = titleMatch[1]
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&#39;/g, "'");
              items.push({
                title: cleanTitle,
                pubDate: pubDateMatch ? pubDateMatch[1] : '',
              });
            }
          }

          res.end(
            JSON.stringify({
              ok: true,
              weather: weatherSummary,
              news: items,
              combined: `${weatherSummary}\n\nULTIME NOTIZIE IN TEMPO REALE (Google News Italia):\n${items
                .map((n, i) => `${i + 1}. ${n.title}`)
                .join('\n')}`,
            })
          );
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });

      server.middlewares.use('/api/web/fetch', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const payload = await readJsonBody(req);
        let targetUrl = String(payload.url || '').trim();
        res.setHeader('Content-Type', 'application/json');
        if (!targetUrl) {
          res.end(JSON.stringify({ ok: false, error: 'URL mancante' }));
          return;
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }

        try {
          if (/youtube\.com\/watch|youtu\.be\//i.test(targetUrl)) {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
              targetUrl
            )}&format=json`;
            const ytRes = await fetch(oembedUrl);
            if (ytRes.ok) {
              const ytData = await ytRes.json();
              res.end(
                JSON.stringify({
                  ok: true,
                  url: targetUrl,
                  title: ytData.title || 'Video YouTube',
                  author: ytData.author_name || '',
                  content: `VIDEO YOUTUBE: "${ytData.title}" del canale "${ytData.author_name}". URL: ${targetUrl}`,
                })
              );
              return;
            }
          }

          const pageRes = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            },
          });
          const html = await pageRes.text();
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : targetUrl;
          const textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000);

          res.end(
            JSON.stringify({
              ok: true,
              url: targetUrl,
              title,
              content: textContent,
            })
          );
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });

      // 4. CASSAFORTE (VAULT)
      server.middlewares.use('/api/vault', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          res.end(JSON.stringify({ ok: true, items: getVaultItems() }));
          return;
        }
        if (req.method === 'POST') {
          const payload = await readJsonBody(req);
          const items = getVaultItems();
          if (payload.action === 'delete' && payload.id) {
            const filtered = items.filter((i) => i.id !== payload.id);
            fs.writeFileSync(VAULT_FILE, JSON.stringify(filtered, null, 2), 'utf8');
            res.end(JSON.stringify({ ok: true, items: filtered }));
            return;
          }
          const newItem = {
            id: 'v_' + Date.now(),
            name: String(payload.name || 'NUOVA_CHIAVE').trim(),
            category: payload.category || 'Secret',
            value: String(payload.value || '').trim(),
            createdAt: new Date().toLocaleDateString('it-IT'),
          };
          const updated = [newItem, ...items];
          fs.writeFileSync(VAULT_FILE, JSON.stringify(updated, null, 2), 'utf8');
          res.end(JSON.stringify({ ok: true, items: updated }));
        }
      });

      // 5. STATO E COMANDI ANDROID TV VIA ADB
      server.middlewares.use('/api/tv/status', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const devices = await runAdb('devices');
          const connected = devices.stdout.includes(TV_TARGET);
          res.end(
            JSON.stringify({
              ok: connected,
              tvIp: TV_TARGET,
              currentApp: connected ? 'Android TV Online' : 'Offline',
              history: [],
            })
          );
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });

      server.middlewares.use('/api/tv/command', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const payload = await readJsonBody(req);
        res.setHeader('Content-Type', 'application/json');
        const { type, app, key } = payload;
        let result = { ok: false };
        if (type === 'key' && key) {
          result = await runAdb(`shell input keyevent ${key}`);
        } else if (type === 'launch_app' && app) {
          result = await runAdb(`shell monkey -p ${app} 1`);
        }
        res.end(JSON.stringify({ ok: result.ok, stdout: result.stdout }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), botParkBackendPlugin()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

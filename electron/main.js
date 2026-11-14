import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, session, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartella cache dedicata in AppData\Local\BotParkData + Single Instance Lock (zero conflitti cache GPU!)
const userDataDir = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'BotParkData');
app.setPath('userData', userDataDir);
app.commandLine.appendSwitch('disk-cache-dir', path.join(userDataDir, 'Cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kitsunelabs.botpark');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let tray = null;

function getSecretsPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  return path.join(localAppData, 'SamanthaSecure', 'secrets.json');
}

function readLocalSecrets() {
  try {
    const secretsPath = getSecretsPath();
    if (fs.existsSync(secretsPath)) {
      const data = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      return {
        geminiApiKey: data.gemini_api_key || '',
        elevenLabsApiKey: data.elevenlabs_api_key || '',
      };
    }
  } catch (err) {
    console.error('Errore lettura secrets Samantha:', err);
  }
  return { geminiApiKey: '', elevenLabsApiKey: '' };
}

function createWindow() {
  const icoPath = path.join(__dirname, '../public/bot_park_icon.ico');
  const pngPath = path.join(__dirname, '../public/bot_park_icon.png');
  const iconPath = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : pngPath;
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 780,
    minHeight: 560,
    title: 'Bot Park — Jurassic AI Agent',
    frame: false,
    backgroundColor: '#080a0e',
    show: true,
    center: true,
    hasShadow: true,
    icon: appIcon && !appIcon.isEmpty() ? appIcon : iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webviewTag: true,
    },
  });

  if (appIcon && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  mainWindow.once('ready-to-show', () => {
    if (appIcon && !appIcon.isEmpty()) {
      mainWindow.setIcon(appIcon);
    }
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 600);
  });

  // Log diagnostico del renderer (errori JS / caricamento) per capire eventuali schermate nere
  const rendererLogPath = path.join(__dirname, '../renderer.log');
  try { fs.writeFileSync(rendererLogPath, `[${new Date().toISOString()}] Avvio Bot Park\n`); } catch {}
  const logRenderer = (msg) => {
    try { fs.appendFileSync(rendererLogPath, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
  };
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) logRenderer(`console(${level}): ${message} @ ${sourceId}:${line}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logRenderer(`render-process-gone: ${details.reason}`);
  });

  // Avvia automaticamente Vite (porta 5173) in background se non è ancora attivo, così Desktop & Mobile condividono sempre il bus live
  const ensureLiveViteAndLoad = () => {
    const req = http.get('http://127.0.0.1:5173/api/network/info', { timeout: 900 }, (res) => {
      res.resume();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://localhost:5173');
      }
    });
    req.on('error', () => {
      try {
        const appRoot = path.join(__dirname, '..');
        const viteProc = spawn('npx', ['vite', '--port', '5173', '--host'], {
          cwd: appRoot,
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          shell: true,
        });
        viteProc.unref();
      } catch {}
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173');
        }
      }, 1500);
    });
  };

  // Se il dev server Vite sta avviandosi, riprova su http://localhost:5173; fallback estremo su dist/index.html
  let loadRetries = 0;
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    logRenderer(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
    if (String(validatedURL || '').startsWith('http://localhost:5173') && loadRetries < 12) {
      loadRetries += 1;
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL('http://localhost:5173');
      }, 1000);
    } else if (String(validatedURL || '').startsWith('http://localhost:5173')) {
      const distPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distPath) && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(distPath);
      }
    }
  });

  // Carica sempre il server live http://localhost:5173 per Quantum Entanglement tra Electron, Browser e Mobile
  ensureLiveViteAndLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icoPath = path.join(__dirname, '../public/bot_park_icon.ico');
  const pngPath = path.join(__dirname, '../public/bot_park_icon.png');
  const iconPath = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : pngPath;
  let trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();
  if (process.platform !== 'win32' && !trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 20, height: 20 });
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostra Bot Park',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Nascondi',
      click: () => {
        if (mainWindow) mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Esci da Bot Park',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Bot Park — Jurassic AI Agent (Ctrl+Alt+B)');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow) {
      createWindow();
    } else if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // Rimuove X-Frame-Options e CSP restrittivi sui frame interni così il Browser Chrome dentro il Desktop Virtuale può caricare Google, YouTube, Wikipedia e qualsiasi sito reale senza blocchi!
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === 'x-frame-options' || lower === 'content-security-policy') {
        delete responseHeaders[key];
      }
    }
    callback({ cancel: false, responseHeaders });
  });

  createWindow();
  createTray();

  // Shortcut globale Ctrl+Alt+B per richiamare Bot Park ovunque
  globalShortcut.register('CommandOrControl+Alt+B', () => {
    if (!mainWindow) {
      createWindow();
    } else if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('get-secrets', async () => {
  return readLocalSecrets();
});

ipcMain.handle('save-secrets', async (event, secrets) => {
  try {
    const secretsPath = getSecretsPath();
    const dir = path.dirname(secretsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let existing = {};
    if (fs.existsSync(secretsPath)) {
      try { existing = JSON.parse(fs.readFileSync(secretsPath, 'utf-8')); } catch (_) {}
    }

    if (secrets.geminiApiKey !== undefined) existing.gemini_api_key = secrets.geminiApiKey;
    if (secrets.elevenLabsApiKey !== undefined) existing.elevenlabs_api_key = secrets.elevenLabsApiKey;

    fs.writeFileSync(secretsPath, JSON.stringify(existing, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Errore salvataggio secrets:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('send-os-notification', (_event, payload = {}) => {
  try {
    if (!Notification.isSupported()) return;
    const icoPath = path.join(__dirname, '../public/bot_park_icon.ico');
    const pngPath = path.join(__dirname, '../public/bot_park_icon.png');
    const iconPath = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : pngPath;
    const notif = new Notification({
      title: String(payload.title || 'Bot Park'),
      body: String(payload.body || ''),
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
    });
    notif.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notif.show();
  } catch {}
});

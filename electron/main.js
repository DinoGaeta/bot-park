import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Se siamo in modalità dev esplicita e il dev server è richiesto usa localhost, altrimenti carica sempre dist/index.html
  const distPath = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER === 'true') {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icoPath = path.join(__dirname, '../public/bot_park_icon.ico');
  const pngPath = path.join(__dirname, '../public/bot_park_icon.png');
  const iconPath = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : pngPath;
  const trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 })
    : nativeImage.createEmpty();

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

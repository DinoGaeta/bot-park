const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('botParkAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  toggleMaximize: () => ipcRenderer.send('window-maximize'),
  getSecrets: () => ipcRenderer.invoke('get-secrets'),
  saveSecrets: (secrets) => ipcRenderer.invoke('save-secrets', secrets),
  playSound: (soundName) => ipcRenderer.send('play-sound', soundName),
  notify: (payload) => ipcRenderer.send('send-os-notification', payload),
  platform: process.platform,
});

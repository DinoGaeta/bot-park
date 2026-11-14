self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_PUSH_NOTIFICATION') {
    const title = data.title || 'Bot Park • Notifica Push';
    const options = {
      body: data.body || '',
      icon: '/bot_park_icon.png',
      badge: '/bot_park_icon.png',
      tag: data.id || `bp_push_${Date.now()}`,
      vibrate: [120, 60, 120],
      data: {
        botId: data.botId || 'samantha',
        url: '/',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Bot Park', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Bot Park • Comunicazione Autonoma';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/bot_park_icon.png',
      badge: '/bot_park_icon.png',
      tag: payload.id || `bp_push_${Date.now()}`,
      vibrate: [120, 60, 120],
      data: { botId: payload.botId || 'samantha', url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetBotId = event.notification.data?.botId || 'samantha';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'BOTPARK_PUSH_CLICK', botId: targetBotId });
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

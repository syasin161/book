// 写真帳 Service Worker
// バージョンを変えると次回アクセス時にキャッシュが更新されます
const CACHE_NAME = 'photobook-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時にアプリ本体をキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// 古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Google Fonts はキャッシュ優先（初回オンライン時に保存 → 以降オフラインでも表示）
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        }).catch(() => new Response('', { status: 200 })); // フォント取得失敗時は代替フォントで表示
      })
    );
    return;
  }

  // アプリ本体：キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(req).catch(() => caches.match('./index.html'));
    })
  );
});

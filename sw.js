const CACHE_NAME = "dina-pwa-v7.8";
const ASSETS = [
  "./app.html",
  "./index.html",
  "./css/tokens.css?v=7.8",
  "./css/app.css?v=7.8",
  "./css/styles.css?v=7.8",
  "./js/app.js?v=7.8",
  "./js/main.js?v=7.8",
  "./manifest.json",
  "./assets/icons/pwa-logo.svg",
  "./assets/images/pwa-icon-192.png",
  "./assets/images/pwa-icon-512.png",
  "./assets/images/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

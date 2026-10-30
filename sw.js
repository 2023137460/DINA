const CACHE_NAME = "dina-pwa-v8.2";
const ASSETS = [
  "./app.html",
  "./index.html",
  "./css/tokens.css?v=8.2",
  "./css/app.css?v=8.2",
  "./css/styles.css?v=8.2",
  "./js/app.js?v=8.2",
  "./js/main.js?v=8.2",
  "./manifest.json",
  "./assets/icons/pwa-logo.svg",
  "./assets/images/pwa-icon-192.png",
  "./assets/images/pwa-icon-512.png",
  "./assets/images/apple-touch-icon.png",
  "./assets/images/meal_beef_ribeye.jpg",
  "./assets/images/meal_salmon_fillet.jpg",
  "./assets/images/meal_chicken_breast.jpg",
  "./assets/images/meal_tiger_prawns.jpg",
  "./assets/images/meal_lasagna.jpg",
  "./assets/images/meal_pork_tenderloin.jpg",
  "./assets/images/meal_vegetables.jpg",
  "./assets/images/meal_custom_dish.jpg"
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

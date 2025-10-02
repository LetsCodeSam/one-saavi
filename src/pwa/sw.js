/// <reference lib="webworker" />
// Very simple Service Worker for One Saavi
// Caches the app shell so it works offline after first load.
const CACHE_NAME = "one-saavi-v1";
const ASSETS = [
    "/", // index.html
    "/manifest.webmanifest",
];
// Install: cache base assets
self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
    self.skipWaiting();
});
// Activate: clear old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))));
    self.clients.claim();
});
// Fetch: serve cached, then network
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET")
        return;
    event.respondWith(caches.match(req).then((res) => res || fetch(req)));
});
export {};

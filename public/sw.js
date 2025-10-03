/* One Saavi – simple offline SW (no KDBX caching) */

const VERSION = "v1.0.0";
const RUNTIME_CACHE = `one-saavi-runtime-${VERSION}`;
const PRECACHE_CACHE = `one-saavi-precache-${VERSION}`;

// Derive base ("/one-saavi/") from the sw.js path so it works on GH Pages
const BASE = (() => {
  const p = self.location.pathname;
  return p.endsWith("sw.js") ? p.slice(0, -("sw.js".length)) : "/";
})();

// Minimal precache for SPA shell
const PRECACHE = [
  BASE, // e.g. "/one-saavi/"
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  // You can add static icons here if you like:
  // BASE + "icons/icon-192.png",
  // BASE + "icons/icon-512.png",
  // BASE + "icons/maskable-512.png",
];

// Utility: same-origin check
function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Utility: treat as static asset (hashed vite outputs or images/fonts)
function isStaticAsset(url) {
  return (
    url.endsWith(".js") ||
    url.endsWith(".css") ||
    url.endsWith(".ico") ||
    url.endsWith(".svg") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".webp") ||
    url.endsWith(".gif") ||
    url.endsWith(".woff") ||
    url.endsWith(".woff2")
  );
}

// NEVER cache these (sensitive)
function isSensitive(url) {
  return url.endsWith(".kdbx") || url.endsWith(".key");
}

// --- Install: precache minimal shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  // Activate immediately on first load (we still support manual skip via message)
  self.skipWaiting();
});

// --- Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== PRECACHE_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// --- Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // Only handle GETs
  if (req.method !== "GET") return;

  // Don’t touch cross-origin requests
  if (!isSameOrigin(url)) return;

  // Never cache/open sensitive DB/key files
  if (isSensitive(url)) return;

  // App shell navigation (SPA): cache-first for index, fallback to network
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PRECACHE_CACHE);
        const cached = await cache.match(BASE + "index.html");
        try {
          const fresh = await fetch(req);
          return fresh; // If your host serves index for SPA routes, this wins
        } catch {
          if (cached) return cached;
          // last resort: offline response
          return new Response(
            "<h1>Offline</h1><p>Try again when you’re back online.</p>",
            { headers: { "content-type": "text/html" }, status: 503 }
          );
        }
      })()
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const resp = await fetch(req);
        // Cache successful responses only
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
      })()
    );
    return;
  }

  // Default: network-first with runtime cache fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const resp = await fetch(req);
        if (resp && resp.ok && req.headers.get("accept")?.includes("text")) {
          cache.put(req, resp.clone());
        }
        return resp;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        // If nothing cached, bubble up
        throw new Error("Network error and no cache");
      }
    })()
  );
});

// --- Manual skipWaiting support (from client)
self.addEventListener("message", (event) => {
  const msg = (event && event.data) || "";
  if (msg === "SKIP_WAITING" || msg === "skipWaiting") {
    self.skipWaiting();
  }
});

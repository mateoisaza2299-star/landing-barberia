const CACHE = "panel-shell-v1";

const SHELL = [
  "admin.html",
  "admin-login.html",
  "css/admin.css",
  "css/styles.css",
  "js/admin.js",
  "js/admin-login.js",
  "js/config.js",
  "js/pwa.js",
  "js/servicios.js",
  "js/supabase.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

const SHELL_SET = new Set(SHELL);
const ADMIN_PAGES = new Set(["admin.html", "admin-login.html"]);

const relativePath = (url) => {
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return "";
  let path = url.pathname.slice(scope.pathname.length);
  if (path.startsWith("/")) path = path.slice(1);
  try {
    return decodeURIComponent(path);
  } catch (error) {
    return "";
  }
};

const leaveAlone = (url, request) => {
  if (request.method !== "GET") return true;
  const host = url.hostname;
  if (host === "supabase.co" || host.endsWith(".supabase.co") || host.endsWith(".supabase.in")) return true;
  const blob = url.pathname + url.search;
  if (/access_token|refresh_token|provider_token|code_verifier|token_type|apikey/i.test(blob)) return true;
  if (/\/auth\/v1\/|\/rest\/v1\/|\/realtime\/v1\//.test(url.pathname)) return true;
  if (request.headers.get("authorization") || request.headers.get("apikey")) return true;
  return false;
};

const fromAdmin = (request) => {
  const path = relativePath(new URL(request.url));
  if (request.mode === "navigate" || request.destination === "document") return ADMIN_PAGES.has(path);
  if (!request.referrer) return false;
  let referrer;
  try {
    referrer = new URL(request.referrer);
  } catch (error) {
    return false;
  }
  const ref = relativePath(referrer);
  if (ADMIN_PAGES.has(ref)) return true;
  return SHELL_SET.has(ref) && ref.startsWith("js/");
};

const cleanRequest = (path) => new Request(new URL(path, self.registration.scope).href);

const canStore = (request, response) => {
  if (!response || !response.ok || response.type !== "basic" || response.redirected) return false;
  const url = new URL(request.url);
  if (leaveAlone(url, request) || !SHELL_SET.has(relativePath(url))) return false;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("json")) return false;
  return type.includes("text/html") || type.includes("text/css") || type.includes("javascript") || type.includes("image/png");
};

const offlineDocument = () => new Response(
  "<!DOCTYPE html><html lang=\"es-CO\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"theme-color\" content=\"#161210\"><title>Panel</title><style>html,body{margin:0;height:100%;background:#f7f3eb;color:#1a1512}body{min-height:100%;display:grid;place-items:center;padding:2rem;text-align:center;font-family:Georgia,'Times New Roman',serif}p{margin:0;max-width:14rem;font-size:2rem;line-height:1.05}p::before{content:'';display:block;width:2rem;height:1px;margin:0 auto 1rem;background:#c9a24b}</style></head><body><p>Sin conexión. Conéctate para ver tus citas.</p><script>addEventListener('online',function(){location.reload()})</script></body></html>",
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
);

const networkFirst = async (request) => {
  const path = relativePath(new URL(request.url));
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request.url, {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "follow"
    });
    if (canStore(request, response)) await cache.put(cleanRequest(path), response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(cleanRequest(path));
    if (cached) return cached;
    if (request.mode === "navigate" || request.destination === "document") return offlineDocument();
    throw error;
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((path) => "./" + path)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }
  if (leaveAlone(url, request)) return;
  if (!SHELL_SET.has(relativePath(url))) return;
  if (!fromAdmin(request)) return;
  event.respondWith(networkFirst(request));
});

/* Fichier genere par split.py depuis sw.src.js : ne pas editer. */
/* Première 2026 : service worker (source). split.py écrit site/sw.js à partir de ce fichier
   en y inscrivant BUILD et la liste des assets versionnés. Ne pas éditer site/sw.js à la main.
   Cache versionné p26-<BUILD> pour ouvrir le site sans réseau, plus les notifications.
   L'API Supabase (*.supabase.co, et /__api, /__rt du serveur de test) n'est jamais interceptée. */
const BUILD = "3c7dbe2a0b";
const ASSETS = ["app.css?v=0a185206e6", "app.js?v=2838bf2879", "p26-runtime.js?v=26d9447486", "supabase.js?v=183ff90999", "config.js?v=8564bfacbf"];
const MODS = ["ambiance.js", "amis.css", "amis.js", "annonce.css", "annonce.js", "boutique.css", "boutique.js", "boutique2.css", "boutique2.js", "duelx.css", "duelx.js", "epreuve.css", "epreuve.js", "jeux2.css", "jeux2.js", "opendyslexic.woff2", "partage.js", "progression.css", "progression.js", "pronote.js", "revision.css", "revision.js", "royale-amis.css", "royale-amis.js", "saison.css", "saison.js", "signaler.js", "skins.css", "skins.js", "survie.css", "survie.js", "vraifaux.css", "vraifaux.js"]; // fichiers de site/mod (split.py) : précachés avec ?v=BUILD, comme P26mod les demande
const CACHE = "p26-" + BUILD;
const PRE = ["./", "index.html", ...ASSETS, "manifest.webmanifest", "icons/icon-192.png", "icons/badge-96.png",
  // Une police (woff2) est demandée par la feuille de style sans ?v= : on la précache à cette adresse-là.
  ...MODS.map((n) => "mod/" + n + "?v=" + BUILD).map((u) => (/\.woff2\?/.test(u) ? u.split("?")[0] : u)), "prog/automatismes.json"];
const NAV_DELAI = 4000;
const CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // Un fichier introuvable ne doit pas faire échouer l'installation (les notifications en dépendent) :
  // il sera mis en cache à sa première demande.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRE.map((u) =>
    fetch(new Request(u, { cache: "reload" })).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)))));
});
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("p26-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())));

const horsLigne = () => new Response("", { status: 504, statusText: "Hors ligne" });
const garde = (r) => r && (r.ok || r.type === "opaque");

function cacheDabord(req) {
  return caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (garde(r)) c.put(req, r.clone()).catch(() => {});
    return r;
  }))).catch(horsLigne);
}
function perimeEtMaj(e) {
  const req = e.request;
  const net = caches.open(CACHE).then((c) => fetch(req).then((r) => {
    if (r.ok) c.put(req, r.clone()).catch(() => {});
    return r;
  })).catch(() => null);
  e.waitUntil(net.then(() => {}));
  return caches.match(req, { cacheName: CACHE }).then((hit) => hit || net.then((r) => r || horsLigne())).catch(horsLigne);
}
function navigation(req, estIndex) {
  const copie = () => caches.open(CACHE).then((c) => c.match("index.html")).catch(() => null);
  return new Promise((res) => {
    let fini = false;
    const rendre = (r) => { if (!fini && r) { fini = true; res(r); } };
    const t = setTimeout(() => copie().then(rendre), NAV_DELAI); // au-delà, la copie si elle existe ; sinon on attend le réseau
    fetch(req).then((r) => {
      clearTimeout(t);
      if (r.ok && estIndex) { const c2 = r.clone(); caches.open(CACHE).then((c) => c.put("index.html", c2)).catch(() => {}); }
      rendre(r);
    }).catch(() => { clearTimeout(t); copie().then((m) => rendre(m || Response.error())); });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (/\.supabase\.co$/.test(u.hostname)) return;
  if (u.origin === self.location.origin) {
    const base = new URL(self.registration.scope).pathname;
    if (!u.pathname.startsWith(base)) return;
    const rel = u.pathname.slice(base.length);
    if (/^__(api|rt)/.test(rel)) return;
    if (req.mode === "navigate") { e.respondWith(navigation(req, rel === "" || rel === "index.html")); return; }
    if (/^(mod\/[^/]+|prog\/[^/]+\.json)$/.test(rel)) { e.respondWith(perimeEtMaj(e)); return; }
    if (u.searchParams.has("v")) { e.respondWith(cacheDabord(req)); return; }
    return;
  }
  if (CDN.test(u.hostname)) { e.respondWith(cacheDabord(req)); return; }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Première 2026", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: d.tag, data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const scope = self.registration.scope;
    for (const c of cs) { if (c.url.startsWith(scope) && "focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

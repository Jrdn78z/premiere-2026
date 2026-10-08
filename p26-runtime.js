/* Première 2026 : version web autonome.
   Remplace window.claude (db, user, room, downloads) par Supabase.
   Aucun secret ici : la clé "anon" est publique, la sécurité est dans les règles de la base. */
(function () {
  "use strict";
  const CFG = window.P26_CONFIG || {};
  const DOMAIN = "premiere2026.invalid"; // domaine fictif : les comptes sont « pseudo + mot de passe », pas d'e-mail
  const LS_UID = "p26w_uid";
  const LS_PROF = "p26w_profile"; // copie du profil pour démarrer sans réseau : {uid, p}
  const $ = (s) => document.querySelector(s);

  // Service worker (cache hors ligne et notifications). Même URL et même portée que pushOn().
  if (!window.P26_PREVIEW && "serviceWorker" in navigator) {
    const swReg = () => navigator.serviceWorker.register("sw.js").catch(() => {});
    if (document.readyState === "complete") swReg(); else window.addEventListener("load", swReg);
  }

  if (!window.supabase || !CFG.url || !CFG.anonKey || /COLLE_ICI/.test(CFG.url + CFG.anonKey)) {
    window.claude = { use: async () => null };
    document.addEventListener("DOMContentLoaded", () => {
      const d = document.createElement("div");
      d.id = "p26auth";
      d.innerHTML = `<div class="p26box"><h1>Première 2026</h1><p>Le site n’est pas encore relié à sa base de données. Il manque l’adresse et la clé publique Supabase dans <b>config.js</b>.</p></div>`;
      document.body.appendChild(d);
    });
    return;
  }

  const sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  window.P26 = { sb };

  // Identique à public.p26_slug (schema.sql) : la base refuse un compte si les deux ne donnent pas le même résultat.
  const SL_FROM = "ABCDEFGHIJKLMNOPQRSTUVWXYZàáâäãåāçèéêëēìíîïīñòóôöõøōùúûüūýÿœæÀÁÂÄÃÅĀÇÈÉÊËĒÌÍÎÏĪÑÒÓÔÖÕØŌÙÚÛÜŪÝŸŒÆ";
  const SL_TO = "abcdefghijklmnopqrstuvwxyzaaaaaaaceeeeeiiiiinooooooouuuuuyyoaaaaaaaaceeeeeiiiiinooooooouuuuuyyoa";
  const slug = (p) => [...String(p || "").trim()].map((c) => { const i = SL_FROM.indexOf(c); return i < 0 ? c : SL_TO[i]; }).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const mail = (p) => slug(p) + "@" + DOMAIN;
  const errCode = (e) => {
    if (!e) return "unknown";
    const c = String(e.code || "");
    if (e.status === 401 || c === "PGRST301" || c === "PGRST303" || /JWT expired|invalid JWT/i.test(e.message || "")) return "not_granted";
    if (c === "42501" || /row-level security/i.test(e.message || "")) return "invalid_argument";
    if (c === "PGRST116") return "not_found";
    // Refus de la base, code "refus_base" (raise exception = P0001, données ou contraintes = 22xxx/23xxx) : la base a répondu non,
    // ce n'est pas une panne. Seuls réseau, fonction absente et erreurs sans code restent « unavailable ».
    if (/^(P0|22|23)/.test(c)) return "refus_base";
    return "unavailable";
  };
  // Messages des refus de la base (raise exception de sql/*.sql) en phrases pour l'élève.
  const REFUS = {
    "club inconnu": "Ce club n’existe pas ou tu n’en fais plus partie.",
    "message invalide": "Message refusé : 500 caractères au plus.",
    "nom invalide": "Nom refusé : 1 à 24 caractères, sans caractère invisible.",
    "trop de clubs": "Tu as créé trop de clubs pour aujourd’hui.",
    "visibilité invalide": "Partage refusé : choisis Moi seul ou un de tes clubs.",
    "contenu non autorisé": "Ce contenu ne peut pas être partagé dans un club.",
    "document trop gros": "Document trop gros pour être enregistré.",
    "quota atteint": "Tu as atteint la limite de documents enregistrés.",
    "pseudo trop long": "Pseudo trop long : 16 caractères au plus.",
    "pseudo invalide": "Pseudo refusé.",
    "ligne de classement invalide": "Ligne de classement refusée.",
    "chemin invalide": "Enregistrement refusé : adresse invalide.",
    "trop de signalements": "Trop de signalements aujourd’hui. Réessaie demain.",
    "trop de notifications": "Trop de notifications envoyées aujourd’hui. Réessaie demain.",
    "trop de parties": "Trop de parties ouvertes. Réessaie dans un moment.",
    "trop tôt": "Trop tôt : attends la fin de la partie.",
    "trop de réponses d'un coup": "Trop de réponses envoyées d’un coup.",
    "mot de passe trop court": "Le mot de passe fait 8 caractères au moins.",
    "non connecté": "Connecte-toi d’abord.",
    "profil introuvable": "Profil introuvable. Reconnecte-toi.",
    "réservé à l'administrateur": "Réservé à l’administrateur.",
    // paquet 1 (sql/8-paquet1.sql)
    "pas ami": "Vous devez être amis.",
    "duel invalide": "Ce duel n’est plus jouable.",
    "score invalide": "Score refusé par la base.",
    "heure invalide": "Heure refusée : choisis entre 17 h et 21 h.",
    "réglage invalide": "Réglage refusé.",
    "compte invalide": "Compte inconnu.",
    "ce compte ne peut pas être bloqué": "Ce compte ne peut pas être bloqué (toi ou un administrateur).",
    "compte bloqué": "Ce compte est bloqué.",
    "texte invalide": "Texte refusé : 1 à 160 caractères, sans caractère invisible.",
    "durée invalide": "Durée refusée.",
    "nombre invalide": "Nombre refusé.",
    "trop d'annonces": "Trois annonces par jour au plus. Réessaie demain.",
    "trop d'invitations": "Trop de codes créés aujourd’hui. Réessaie demain.",
  };
  const refusMsg = (e) => {
    const m = String((e && e.message) || "").trim();
    const k = m.toLowerCase().replace(/’/g, "'");
    if (REFUS[k]) return REFUS[k];
    if (/^P0/.test(String((e && e.code) || "")) && m && m.length <= 120) return "Refusé par la base : " + m + ".";
    return "Enregistrement refusé : données non valides.";
  };
  let kicked = false;
  const wrapErr = (e) => {
    const code = errCode(e);
    if (code === "not_granted" && session && !kicked) {
      kicked = true;
      // Jeton périmé : on essaie de le renouveler ; on ne déconnecte que si ça échoue.
      sb.auth.refreshSession().then((r) => { if (r && r.data && r.data.session) { session = r.data.session; kicked = false; } else window.P26.account.signOut(); })
        .catch(() => window.P26.account.signOut());
    }
    if (e) console.error("[Première 2026]", e);
    return Object.assign(new Error(code === "invalid_argument" ? "Écriture refusée." : code === "not_granted" ? "Session expirée." : code === "refus_base" ? refusMsg(e) : "La base ne répond pas pour l’instant."), { code, cause: e });
  };

  /* ================= HORS LIGNE : détection ================= */
  // « Pas de réseau » (la requête n'est jamais arrivée) et « refusé » (le serveur a répondu non) sont deux cas
  // différents : seul le premier passe par la copie locale et la file d'attente.
  // status : statut HTTP de la réponse supabase-js quand on l'a (0 = pas de réponse).
  function isNet(e, status) {
    if (typeof status === "number" && status > 0) return false;
    if (status === 0) return true;
    if (navigator.onLine === false) return true;
    if (!e) return false;
    if (e.offline || e.name === "AuthRetryableFetchError") return true;
    return /Failed to fetch|NetworkError|Load failed|fetch failed|ERR_INTERNET_DISCONNECTED|ERR_NETWORK/i.test(String(e.message || "") + " " + String(e.details || ""));
  }
  const sansFn = (e) => !!e && (e.code === "PGRST202" || e.code === "42883"); // fonction SQL pas encore créée
  const offErr = (cause) => Object.assign(new Error("Pas de réseau pour l’instant."), { code: "unavailable", offline: true, cause });
  // Session laissée par le client Supabase dans localStorage (lue seulement pour démarrer sans réseau).
  // supabase-js v2 : clé sb-<ref du projet>-auth-token ; faux client des tests : fake_sess.
  function storedSession() {
    let ref = ""; try { ref = new URL(CFG.url).hostname.split(".")[0]; } catch (e) {}
    for (const k of ["sb-" + ref + "-auth-token", "fake_sess"]) {
      try {
        let o = JSON.parse(localStorage.getItem(k) || "null");
        if (o && o.currentSession) o = o.currentSession;
        if (o && !o.user) { const u = JSON.parse(localStorage.getItem(k + "-user") || "null"); if (u && u.user) o.user = u.user; }
        if (o && o.access_token && o.user && o.user.id) return o;
      } catch (e) {}
    }
    return null;
  }
  function profileCopy(uid) {
    try { const c = JSON.parse(localStorage.getItem(LS_PROF) || "null"); return c && c.uid === uid && c.p && c.p.id === uid ? c.p : null; } catch (e) { return null; }
  }

  /* ================= HORS LIGNE : IndexedDB (base p26) ================= */
  // docs   : clé [uid, path] -> {e:true, d:données} ou {e:false} ; clé [uid, coll + "/"] -> {paths:[...]} (collection lue)
  // outbox : écritures en attente {seq, uid, op:"set"|"delete", path, data}, dans l'ordre de seq
  // rejets : les 20 dernières écritures retirées de la file sans être enregistrées {uid, path, date, raison}
  let idbP = null;
  function idbOpen() {
    if (!idbP) idbP = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error("IndexedDB absent")); return; }
      const r = indexedDB.open("p26", 2);
      r.onupgradeneeded = () => {
        const d = r.result, mk = (n, o) => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o); };
        mk("docs"); mk("outbox", { keyPath: "seq", autoIncrement: true }); mk("rejets", { autoIncrement: true });
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }).catch((e) => { idbP = null; throw e; });
    return idbP;
  }
  // fn reçoit le magasin ; s'il rend une requête, son résultat est rendu une fois la transaction terminée.
  function idb(store, mode, fn) {
    return idbOpen().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store); let out;
      const q = fn(s); if (q && "onsuccess" in q) q.onsuccess = () => { out = q.result; };
      t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error);
    }));
  }

  /* ================= SESSION ================= */
  let session = null, profile = null;
  let offline = false, bootOffline = false; // hors ligne ; entré sans pouvoir renouveler le jeton
  let parLeleve = false; // déconnexion demandée par l'élève (sinon SIGNED_OUT garde la file d'attente)
  let resolveReady; const ready = new Promise((r) => { resolveReady = r; });

  // Profil : RPC mon_profil (sql/7-profils-prives.sql) ; tant qu'elle n'existe pas (PGRST202/42883), lecture de la table comme avant.
  async function loadProfile(uid) {
    let r;
    try {
      r = await sb.rpc("mon_profil");
      if (r.error && sansFn(r.error)) r = await sb.from("profiles").select("id,pseudo,pseudo_lc,role,recovery_set").eq("id", uid).maybeSingle();
      else if (!r.error) r = { data: (Array.isArray(r.data) ? r.data[0] : r.data) || null, error: null, status: r.status };
    } catch (e) { if (isNet(e)) throw offErr(e); throw e; }
    if (r.data && r.data.id !== uid) r = { data: null, error: null };
    if (r.error) throw isNet(r.error, r.status) ? offErr(r.error) : wrapErr(r.error);
    if (r.data) try { localStorage.setItem(LS_PROF, JSON.stringify({ uid, p: r.data })); } catch (e) {}
    return r.data;
  }
  function clearLocal() {
    try { Object.keys(localStorage).filter((k) => k.startsWith("p26_")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
  }
  async function enter(s, fresh) {
    session = s;
    let net = false;
    try { profile = await loadProfile(s.user.id); } catch (e) { profile = null; net = !!(e && e.offline); }
    if (net) {
      // Pas de réseau : la copie du profil de ce compte suffit pour entrer. Sans copie, on garde la session
      // (pas de déconnexion) et on attend le réseau.
      profile = profileCopy(s.user.id);
      if (!profile) { session = null; throw new Error("Pas de réseau. Reviens quand tu seras connecté."); }
      goOffline();
    }
    if (!profile) {
      // Compte créé mais profil absent : on le retente une fois (le trigger peut prendre un instant)
      await new Promise((r) => setTimeout(r, 800));
      try { profile = await loadProfile(s.user.id); } catch (e) { profile = null; }
    }
    if (!profile) { await sb.auth.signOut(); session = null; throw new Error("Profil introuvable. Réessaie de te connecter."); }
    let prev = null; try { prev = localStorage.getItem(LS_UID); } catch (e) {}
    let stored = false;
    if (fresh || prev !== s.user.id) {
      // Nouvelle connexion : on repart d'un navigateur propre, puis la page se recharge avec ce compte
      clearLocal();
      try { localStorage.setItem(LS_UID, s.user.id); localStorage.setItem("p26_nick", JSON.stringify(profile.pseudo)); stored = localStorage.getItem(LS_UID) === s.user.id; } catch (e) {}
      // Si le navigateur bloque le stockage (navigation privée stricte), on ne recharge pas : sinon la page tournerait en boucle.
      if (stored) { location.reload(); await new Promise(() => {}); }
    }
    try { localStorage.setItem("p26_nick", JSON.stringify(profile.pseudo)); } catch (e) {}
    window.P26.uid = s.user.id; window.P26.profile = profile;
    hideAuth();
    startSession(s.user.id);
    resolveReady();
    if (profile.recovery_set === false && !offline) setTimeout(codeBanner, 1500);
  }
  // Démarrage sans réseau avec un jeton expiré : session stockée + p26w_uid + copie du profil, même uid.
  function enterOffline(s, p) {
    session = s; profile = p; bootOffline = true;
    window.P26.uid = s.user.id; window.P26.profile = p;
    goOffline();
    hideAuth();
    startSession(s.user.id);
    resolveReady();
  }
  function offlineIdentity() {
    const s = storedSession(); if (!s) return null;
    let uid = null; try { uid = localStorage.getItem(LS_UID); } catch (e) {}
    const p = uid === s.user.id ? profileCopy(uid) : null;
    return p ? { s, p } : null;
  }
  // Déconnexion avec des modifications pas encore envoyées : on demande d'abord (boîte dans la page).
  function confirmSignOut(n) {
    if (document.getElementById("p26so")) return;
    const b = document.createElement("div"); b.id = "p26so"; b.setAttribute("role", "alertdialog");
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 84px));z-index:950;max-width:460px;margin:0 auto;background:#FAFAF7;color:#1A1C1E;border-radius:16px;padding:14px 16px;box-shadow:0 18px 40px -16px rgba(0,0,0,.7);font:600 .9rem/1.4 Figtree,system-ui,sans-serif";
    b.innerHTML = '<div id="p26sot"></div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" id="p26sok" style="flex:1;border:0;border-radius:999px;padding:10px;font:inherit;font-weight:800;background:#1A1C1E;color:#FAFAF7;cursor:pointer">Rester connecté</button><button type="button" id="p26sogo" style="flex:1;border:0;border-radius:999px;padding:10px 14px;font:inherit;background:#ECECE6;color:#C1272D;cursor:pointer">Me déconnecter quand même</button></div>';
    b.querySelector("#p26sot").textContent = n > 1
      ? n + " modifications ne sont pas encore envoyées. Si tu te déconnectes maintenant, elles seront perdues."
      : "1 modification n’est pas encore envoyée. Si tu te déconnectes maintenant, elle sera perdue.";
    document.body.appendChild(b);
    b.querySelector("#p26sok").onclick = () => b.remove();
    b.querySelector("#p26sogo").onclick = () => { b.remove(); window.P26.account.signOut(true); };
  }
  // Pas de code de secours (compte neuf sans code, ou code déjà utilisé) : on propose d'en créer un.
  function codeBanner() {
    if (document.getElementById("p26cb")) return;
    const b = document.createElement("div"); b.id = "p26cb"; b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 84px));z-index:900;max-width:460px;margin:0 auto;background:#FAFAF7;color:#1A1C1E;border-radius:16px;padding:14px 16px;box-shadow:0 18px 40px -16px rgba(0,0,0,.7);font:600 .9rem/1.4 Figtree,system-ui,sans-serif";
    b.innerHTML = '<div id="p26cbt">Tu n’as pas de code de secours. Sans lui, un mot de passe oublié = compte perdu.</div><label for="p26cbp" style="display:block;font-size:.84rem;margin:10px 0 4px">Pour le créer, écris ton mot de passe</label><input id="p26cbp" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;font:inherit;font-size:16px;color:#1A1C1E;background:#EFEFE9;border:2px solid transparent;border-radius:12px;padding:9px 12px"><div id="p26cbe" role="alert" style="color:#C1272D;font-size:.84rem;min-height:1.1em;margin-top:4px"></div><div style="display:flex;gap:8px;margin-top:6px"><button type="button" id="p26cbgo" style="flex:1;border:0;border-radius:999px;padding:10px;font:inherit;font-weight:800;background:#1A1C1E;color:#FAFAF7;cursor:pointer">Créer mon code</button><button type="button" id="p26cbx" style="border:0;border-radius:999px;padding:10px 14px;font:inherit;background:#ECECE6;color:#1A1C1E;cursor:pointer">Plus tard</button></div>';
    document.body.appendChild(b);
    b.querySelector("#p26cbx").onclick = () => b.remove();
    b.querySelector("#p26cbp").onkeydown = (e) => { if (e.key === "Enter") b.querySelector("#p26cbgo").click(); };
    b.querySelector("#p26cbgo").onclick = async () => {
      const t = b.querySelector("#p26cbt"), go = b.querySelector("#p26cbgo"), inp = b.querySelector("#p26cbp"), er = b.querySelector("#p26cbe");
      if (!inp.value) { er.textContent = "Écris ton mot de passe."; inp.focus(); return; }
      go.disabled = true; er.textContent = "";
      try { const c = await window.P26.account.newRecoveryCode(inp.value); profile.recovery_set = true;
        inp.value = ""; [inp, er, b.querySelector('label[for="p26cbp"]')].forEach((x) => x && x.remove());
        t.innerHTML = 'Ton code de secours, à noter maintenant (il ne sera plus affiché) :<div style="font:900 1.6rem/1.2 \'Bodoni Moda\',Georgia,serif;letter-spacing:.12em;text-align:center;margin:10px 0;user-select:all;-webkit-user-select:all"></div>';
        t.querySelector("div").textContent = c; go.remove(); b.querySelector("#p26cbx").textContent = "Je l’ai noté"; }
      catch (e) { er.textContent = e && e.code === "refuse" ? "Mot de passe incorrect. Après 5 essais ratés, attends 15 minutes." : "Impossible pour l’instant. Réessaie depuis Profil › Compte."; go.disabled = false; }
    };
  }

  /* ================= ÉCRAN DE CONNEXION ================= */
  const CSS = `
#p26auth{position:fixed;inset:0;z-index:1000;overflow:auto;background:radial-gradient(130% 70% at 50% 0%,#2A6B52 0%,#1B4A38 45%,#123526 100%);color:#EAF3EE;font-family:"Figtree",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
#p26auth .p26box{max-width:420px;margin:0 auto;padding:max(28px,6vh) 20px 40px}
#p26auth h1{font-family:"Bodoni Moda","Didot",Georgia,serif;font-weight:900;font-size:2.4rem;line-height:1.05;margin:0 0 6px;letter-spacing:-.01em}
#p26auth .sub{color:#A9C7B8;margin:0 0 22px;font-size:.95rem}
#p26auth .card{background:#FAFAF7;color:#1A1C1E;border-radius:20px;padding:20px 18px;box-shadow:0 24px 50px -24px rgba(0,0,0,.8)}
#p26auth .tabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:#ECECE6;margin:0 0 16px}
#p26auth .tabs button{flex:1;border:0;border-radius:999px;padding:9px 10px;font:inherit;font-weight:800;font-size:.9rem;background:transparent;color:#5E6166;cursor:pointer}
#p26auth .tabs button.on{background:#1A1C1E;color:#FAFAF7}
#p26auth label{display:block;font-weight:700;font-size:.88rem;margin:12px 0 6px}
#p26auth input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;color:#1A1C1E;background:#EFEFE9;border:2px solid transparent;border-radius:12px;padding:11px 14px}
#p26auth input:focus{outline:none;border-color:#1A1C1E}
#p26auth .hint{font-size:.8rem;color:#5E6166;margin:4px 0 0}
#p26auth .btn{border:0;border-radius:999px;padding:12px 20px;font:inherit;font-weight:800;font-size:.95rem;background:#1A1C1E;color:#FAFAF7;cursor:pointer;width:100%;margin-top:16px}
#p26auth .btn:disabled{opacity:.5}
#p26auth .btn.ghost{background:transparent;color:#1A1C1E;box-shadow:inset 0 0 0 1.5px #CFCFC8;margin-top:8px}
#p26auth .err{color:#C1272D;font-size:.88rem;margin:10px 0 0;min-height:1.2em}
#p26auth .link{border:0;background:transparent;color:#5E6166;font:inherit;font-size:.84rem;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px 0;margin-top:10px}
#p26auth .code{font-family:"Bodoni Moda",Georgia,serif;font-weight:900;font-size:1.9rem;letter-spacing:.12em;text-align:center;background:#EFEFE9;border-radius:12px;padding:14px;margin:12px 0;user-select:all;-webkit-user-select:all}
#p26auth .foot{color:#A9C7B8;font-size:.8rem;margin:18px 0 0;text-align:center}
#p26auth .ok{color:#1E7D4A;font-weight:700;font-size:.88rem;margin:10px 0 0}
#p26auth .chk{display:flex;gap:10px;align-items:flex-start;font-size:.9rem;margin-top:12px}
#p26auth .chk input{width:20px;height:20px;margin:2px 0 0;flex:0 0 auto}
body.p26locked{overflow:hidden}
.p26acct{display:grid;gap:8px}
.p26acct .row{display:flex;gap:8px;flex-wrap:wrap}
`;
  function ensureAuthBox() {
    if (!document.getElementById("p26authcss")) { const st = document.createElement("style"); st.id = "p26authcss"; st.textContent = CSS; document.head.appendChild(st); }
    let d = document.getElementById("p26auth");
    if (!d) { d = document.createElement("div"); d.id = "p26auth"; document.body.appendChild(d); }
    document.body.classList.add("p26locked");
    return d;
  }
  function hideAuth() { const d = document.getElementById("p26auth"); if (d) d.remove(); document.body.classList.remove("p26locked"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c])); }

  const UI = { mode: "login", busy: false };
  /* Code d'invitation (paquet 1, désactivé par défaut) : la base dit si un code est requis (invitation_requise, appelable sans compte).
     Le code peut venir du lien #invite=CODE ; il part dans options.data.invite, contrôlé par le trigger de la base. */
  const INV = { req: null, p: null, code: "" };
  try { const m = /^#invite=([A-Za-z0-9]{8})$/.exec(location.hash || ""); if (m) { INV.code = m[1].toUpperCase(); UI.mode = "signup"; } } catch (e) {}
  const invCode = (v) => String(v == null ? "" : v).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  function invRequise() {
    if (INV.req !== null) return Promise.resolve(INV.req);
    if (!INV.p) INV.p = Promise.resolve().then(() => sb.rpc("invitation_requise", {})).then((r) => { INV.req = !!(r && !r.error && r.data === true); return INV.req; }, () => { INV.p = null; return false; });
    return INV.p;
  }
  function invChamp() {
    const go = $("#p26go"); if (!go || $("#p26inv") || UI.mode !== "signup") return;
    const lab = document.createElement("label"); lab.htmlFor = "p26inv"; lab.textContent = "Code d’invitation";
    const inp = document.createElement("input"); inp.id = "p26inv"; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "characters"); inp.maxLength = 8; inp.placeholder = "8 lettres ou chiffres"; inp.value = INV.code; inp.style.textTransform = "uppercase";
    const h = document.createElement("p"); h.className = "hint"; h.textContent = "Demande-le à la personne qui t’a invité.";
    go.before(lab, inp, h);
  }
  function renderAuth(msg) {
    const d = ensureAuthBox();
    const m = UI.mode; UI.busy = false;
    let form = "";
    if (m === "login") form = `
      <label for="p26u">Pseudo</label><input id="p26u" autocomplete="username" maxlength="16" autocapitalize="off" placeholder="Ex. Jordan">
      <label for="p26p">Mot de passe</label><input id="p26p" type="password" autocomplete="current-password">
      <button class="btn" id="p26go">Me connecter</button>
      <button class="link" id="p26forgot">Mot de passe oublié ? J’ai mon code de secours</button>`;
    if (m === "signup") form = `
      <label for="p26u">Choisis ton pseudo</label><input id="p26u" autocomplete="username" maxlength="16" autocapitalize="off" placeholder="2 à 16 caractères"><p class="hint">C’est le nom que tes amis verront dans le classement.</p>
      <label for="p26p">Mot de passe</label><input id="p26p" type="password" autocomplete="new-password" placeholder="8 caractères au moins">
      <label for="p26p2">Encore une fois</label><input id="p26p2" type="password" autocomplete="new-password">
      <button class="btn" id="p26go">Créer mon compte</button>
      <p class="hint">Pas d’adresse e-mail : tu recevras un <b>code de secours</b> à garder pour le jour où tu oublies ton mot de passe.</p>`;
    if (m === "forgot") form = `
      <label for="p26u">Pseudo</label><input id="p26u" autocomplete="username" maxlength="16" autocapitalize="off">
      <label for="p26c">Code de secours</label><input id="p26c" autocomplete="off" autocapitalize="characters" placeholder="ABCDE-FGHJK" style="text-transform:uppercase;letter-spacing:.1em">
      <label for="p26p">Nouveau mot de passe</label><input id="p26p" type="password" autocomplete="new-password" placeholder="8 caractères au moins">
      <button class="btn" id="p26go">Changer mon mot de passe</button>
      <button class="link" id="p26back">Retour</button>`;
    if (m === "code") form = `
      <p>Ton compte est créé. Voici ton <b>code de secours</b>. Note-le ou fais une capture : il ne sera plus affiché.</p>
      <div class="code" id="p26code">${esc(UI.code)}</div>
      <button class="btn ghost" id="p26copy" type="button">Copier le code</button>
      <label class="chk"><input type="checkbox" id="p26noted"> <span>Je l’ai noté quelque part.</span></label>
      <button class="btn" id="p26go" disabled>Entrer dans Première 2026</button>`;
    if (m === "confirm") form = `
      <p>Le compte est créé mais la base demande une confirmation par e-mail, ce qui n’est pas prévu ici. Demande à l’administrateur du site de désactiver « Confirm email » dans Supabase (Authentication › Providers › Email), puis connecte-toi.</p>
      <button class="btn" id="p26back">Retour</button>`;
    d.innerHTML = `<div class="p26box"><h1>Première 2026</h1><p class="sub">Ton hub de révision. Cartes, quiz, fiches, ligue avec tes amis.</p>
      <div class="card">${m === "login" || m === "signup" ? `<div class="tabs"><button type="button" class="${m === "login" ? "on" : ""}" data-m="login">Me connecter</button><button type="button" class="${m === "signup" ? "on" : ""}" data-m="signup">Créer un compte</button></div>` : ""}
      <form id="p26form" novalidate>${form}<p class="err" id="p26err" role="alert">${esc(msg || "")}</p></form></div>
      <p class="foot">Aucune adresse e-mail n’est demandée. Ton pseudo et ta progression restent dans la base du site.</p></div>`;
    d.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { UI.mode = b.dataset.m; renderAuth(); }));
    const back = $("#p26back"); if (back) back.onclick = (e) => { e.preventDefault(); UI.mode = "login"; renderAuth(); };
    const forgot = $("#p26forgot"); if (forgot) forgot.onclick = (e) => { e.preventDefault(); UI.mode = "forgot"; renderAuth(); };
    const noted = $("#p26noted"); if (noted) noted.onchange = () => { $("#p26go").disabled = !noted.checked; };
    const copy = $("#p26copy"); if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(UI.code); copy.textContent = "Copié"; } catch (e) { const r = document.createRange(); r.selectNodeContents($("#p26code")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } };
    $("#p26form").onsubmit = (e) => { e.preventDefault(); submit(); };
    const first = d.querySelector("input"); if (first && m !== "code") setTimeout(() => first.focus(), 50);
    if (m === "signup") { if (INV.req === true) invChamp(); else if (INV.req === null) invRequise().then((v) => { if (v) invChamp(); }); }
  }
  function setErr(t) { const e = $("#p26err"); if (e) e.textContent = t || ""; }
  function busy(on) { UI.busy = on; const b = $("#p26go"); if (b) b.disabled = on; }

  async function submit() {
    if (UI.busy) return;
    const u = ($("#p26u") || {}).value || "", p = ($("#p26p") || {}).value || "";
    try {
      if (UI.mode === "login") {
        if (!slug(u) || !p) { setErr("Écris ton pseudo et ton mot de passe."); return; }
        busy(true); setErr("Connexion…");
        const { data, error } = await sb.auth.signInWithPassword({ email: mail(u), password: p });
        if (error) { setErr(/Invalid login/i.test(error.message) ? "Pseudo ou mot de passe incorrect." : /Email not confirmed/i.test(error.message) ? "Ce compte attend une confirmation : demande à l’administrateur de désactiver « Confirm email »." : "Connexion impossible pour l’instant. Réessaie dans un moment."); busy(false); return; }
        await enter(data.session, true);
      } else if (UI.mode === "signup") {
        const p2 = ($("#p26p2") || {}).value || "";
        const pseudo = u.trim();
        if (pseudo.length < 2 || pseudo.length > 16 || slug(pseudo).length < 2) { setErr("Le pseudo fait 2 à 16 caractères, avec au moins deux lettres ou chiffres."); return; }
        if (p.length < 8) { setErr("Le mot de passe fait 8 caractères au moins."); return; }
        if (p !== p2) { setErr("Les deux mots de passe ne sont pas identiques."); return; }
        busy(true); setErr("Vérification du pseudo…");
        const free = await sb.rpc("pseudo_libre", { p: pseudo });
        if (free.error) { console.error(free.error); setErr("La base ne répond pas. Réessaie dans un moment."); busy(false); return; }
        if (free.data === false) { setErr("Ce pseudo est déjà pris. Choisis-en un autre."); busy(false); return; }
        const req = await invRequise(), meta = { pseudo };
        if (req) {
          invChamp(); const c = invCode(($("#p26inv") || {}).value); INV.code = c;
          if (!/^[A-Z0-9]{8}$/.test(c)) { setErr("Écris le code d’invitation (8 lettres ou chiffres)."); busy(false); const f = $("#p26inv"); if (f) f.focus(); return; }
          meta.invite = c;
        }
        setErr("Création du compte…");
        const { data, error } = await sb.auth.signUp({ email: mail(pseudo), password: p, options: { data: meta } });
        if (error) {
          const t = error.message || "";
          if (req && /Database error/i.test(t)) { setErr("Inscription refusée : vérifie le code d’invitation, ou réessaie plus tard."); busy(false); return; }
          setErr(/already registered/i.test(t) ? "Ce pseudo est déjà pris." : /email_address_invalid|invalid.*email/i.test(t + (error.code || "")) ? "La base refuse ce type de compte. L’administrateur doit vérifier le réglage des e-mails dans Supabase." : /Database error/i.test(t) ? "Pseudo refusé : lettres, chiffres, espaces ou tirets, et pas déjà pris. Si ton pseudo est bon, il y a trop d’inscriptions en ce moment : réessaie dans une heure." : "Inscription impossible pour l’instant. Réessaie dans un moment."); console.error(error);
          busy(false); return;
        }
        // Le code d’invitation ne reste pas dans l’adresse ni dans l’historique.
        try { if (/^#invite=/.test(location.hash || "")) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
        if (!data.session) { UI.mode = "confirm"; renderAuth(); return; }
        let code = "";
        try { const r = await sb.rpc("nouveau_code_secours", { p_preuve: p }); if (!r.error) code = r.data || ""; } catch (e) {}
        UI.code = code || "(indisponible : va dans Profil › Compte pour en créer un)";
        UI.pendingSession = data.session;
        UI.mode = "code"; renderAuth();
      } else if (UI.mode === "code") {
        busy(true);
        await enter(UI.pendingSession || (await sb.auth.getSession()).data.session, true);
      } else if (UI.mode === "forgot") {
        const c = (($("#p26c") || {}).value || "").toUpperCase().replace(/\s/g, "");
        if (!slug(u) || !c || p.length < 8) { setErr("Remplis le pseudo, le code et un mot de passe de 8 caractères au moins."); return; }
        busy(true); setErr("Vérification…");
        const r = await sb.rpc("reinit_mdp", { p_pseudo: u, p_code: c, p_mdp: p });
        if (r.error) { console.error(r.error); setErr(/trop court/.test(r.error.message || "") ? "Le mot de passe fait 8 caractères au moins." : "Impossible pour l’instant. Réessaie dans un moment."); busy(false); return; }
        if (r.data !== true) { setErr("Pseudo ou code de secours incorrect. Après 5 essais ratés, attends 15 minutes."); busy(false); return; }
        UI.mode = "login"; renderAuth("Mot de passe changé. Connecte-toi. Ton ancien code ne marche plus : tu en créeras un nouveau.");
      }
    } catch (e) {
      setErr(e && e.message ? e.message : "Ça n’a pas marché. Réessaie.");
      busy(false);
    }
  }

  async function boot() {
    let err = null;
    try {
      // Sans réseau, supabase-js peut réessayer de renouveler le jeton pendant de longues secondes : on n'attend pas plus de 3 s.
      const wait = navigator.onLine === false && offlineIdentity()
        ? new Promise((r) => setTimeout(() => r({ data: {}, error: offErr() }), 3000)) : null;
      const r = await (wait ? Promise.race([sb.auth.getSession(), wait]) : sb.auth.getSession());
      const data = r && r.data; err = r && r.error;
      if (data && data.session) { await enter(data.session); return; }
    } catch (e) { err = err || e; }
    const off = (isNet(err) || navigator.onLine === false) ? offlineIdentity() : null;
    if (off && !session) { enterOffline(off.s, off.p); return; }
    renderAuth();
  }
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "SIGNED_OUT") {
      let uid = uidNow(); try { uid = uid || localStorage.getItem(LS_UID); } catch (e) {}
      clearLocal(); try { localStorage.removeItem(LS_UID); localStorage.removeItem(LS_PROF); } catch (e) {}
      wipe(uid, !parLeleve).then(() => location.reload());
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  /* ================= DB ================= */
  const cache = new Map();          // path -> data
  const have = new Set();           // collections déjà chargées
  const subs = [];                  // {kind:'coll'|'doc', key, cb, err}
  const collOf = (p) => p.slice(0, p.lastIndexOf("/"));
  // Ce que la page a le droit de relire (mêmes règles que « docs: lecture » dans schema.sql)
  const canSee = (p) => { const c = collOf(p); if (c === "signalements") return !!(profile && profile.role === "admin"); if (c.startsWith("data/users/")) return !!(session && c.split("/")[2] === session.user.id); return true; };
  const idOf = (p) => p.slice(p.lastIndexOf("/") + 1);
  let rt = null, rtOk = false, pollT = null;

  const uidNow = () => (session ? session.user.id : null);

  /* --- Copie locale des lectures (IndexedDB, magasin docs) --- */
  const saved = new Map(); // coll + "/" ou path -> JSON déjà recopié (évite de réécrire la même chose à chaque rafraîchissement)
  function copyColl(coll) {
    const uid = uidNow(); if (!uid) return;
    const rows = [...cache.entries()].filter(([p]) => collOf(p) === coll);
    const j = JSON.stringify(rows); if (saved.get(coll + "/") === j) return; saved.set(coll + "/", j);
    idb("docs", "readwrite", (s) => {
      const g = s.get([uid, coll + "/"]);
      g.onsuccess = () => {
        const now = rows.map(([p]) => p);
        ((g.result && g.result.paths) || []).forEach((p) => { if (!now.includes(p)) s.delete([uid, p]); });
        rows.forEach(([p, d]) => { s.put({ e: true, d }, [uid, p]); saved.delete(p); });
        s.put({ paths: now }, [uid, coll + "/"]);
      };
    }).catch(() => { saved.delete(coll + "/"); });
  }
  function copyDoc(path, d) {
    const uid = uidNow(); if (!uid) return;
    const k = collOf(path) + "/", j = d === undefined ? "-" : JSON.stringify(d);
    if (saved.get(path) === j) return;
    saved.delete(k); saved.set(path, j);
    idb("docs", "readwrite", (s) => {
      s.put(d === undefined ? { e: false } : { e: true, d }, [uid, path]);
      const g = s.get([uid, k]);
      g.onsuccess = () => {
        const m = g.result; if (!m) return;
        const has = m.paths.includes(path);
        if (d !== undefined && !has) m.paths.push(path); else if (d === undefined && has) m.paths = m.paths.filter((p) => p !== path); else return;
        s.put(m, [uid, k]);
      };
    }).catch(() => { saved.delete(path); });
  }
  async function localColl(coll) {
    const uid = uidNow(), out = [];
    const m = await idb("docs", "readonly", (s) => s.get([uid, coll + "/"])).catch(() => null);
    if (!m) return null;
    await idb("docs", "readonly", (s) => { m.paths.forEach((p) => { const g = s.get([uid, p]); g.onsuccess = () => { if (g.result && g.result.e) out.push([p, g.result.d]); }; }); });
    return out;
  }
  const localDoc = (path) => idb("docs", "readonly", (s) => s.get([uidNow(), path])).catch(() => null);

  /* --- File d'attente des écritures (IndexedDB, magasin outbox) --- */
  const pending = new Map(); // path -> {seq, uid, op, path, data} : la file de ce compte (une entrée par path, la dernière gagne)
  let obReady = Promise.resolve();
  function startSession(uid) {
    obReady = idb("outbox", "readonly", (s) => s.getAll())
      .then((all) => {
        // Une seule entrée par path : la plus récente (seq le plus haut) ; les autres sont des restes, retirés de la base.
        const doublons = [];
        (all || []).forEach((x) => {
          if (x.uid !== uid) return;
          const o = pending.get(x.path);
          if (!o) { pending.set(x.path, x); return; }
          if (x.seq > o.seq) { doublons.push(o.seq); pending.set(x.path, x); } else doublons.push(x.seq);
        });
        if (doublons.length) return idb("outbox", "readwrite", (s) => { doublons.forEach((k) => s.delete(k)); });
      })
      .catch(() => {})
      .then(() => { if (!offline) flushOutbox(); syncTimer(); });
  }
  // Écritures en file l'une après l'autre : sinon deux set du même path dans le même tick voyaient la même « ancienne » entrée
  // et en laissaient une orpheline dans IndexedDB (startSession ne garde de toute façon que la plus récente par path).
  let obChaine = Promise.resolve();
  function obPut(op, path, data) {
    const uid = uidNow();
    const p = obChaine.then(() => {
      const old = pending.get(path);
      return idb("outbox", "readwrite", (s) => {
        if (old) s.delete(old.seq);
        const x = { uid, op, path, data }, a = s.add(x);
        a.onsuccess = () => { x.seq = a.result; pending.set(path, x); };
      });
    });
    obChaine = p.catch(() => {});
    return p;
  }
  // Écritures pas encore reçues par le serveur : elles passent avant ce qu'il renvoie.
  function overlay(match) {
    pending.forEach((x, p) => { if (match(p) && canSee(p)) { if (x.op === "set") cache.set(p, x.data); else cache.delete(p); } });
  }
  // Appliquée tout de suite sur cette page (abonnés prévenus comme pour une écriture réussie), envoyée plus tard.
  async function queueWrite(op, path, data, cause) {
    try { await obPut(op, path, data); } catch (e) { throw offErr(cause || e); }
    if (canSee(path)) {
      if (op === "set") cache.set(path, data); else cache.delete(path);
      copyDoc(path, op === "set" ? data : undefined);
      notify(path);
    }
    syncTimer();
    if (!offline) flushOutbox();
  }
  // Envoi au serveur : {} si accepté, {net} si pas de réseau, {error, status} si le serveur a répondu non.
  async function rawSet(path, data) {
    try {
      const r = await sb.from("docs").upsert({ path, data }, { onConflict: "path" });
      if (!r.error) return {};
      if (isNet(r.error, r.status)) return { net: true, cause: r.error };
      // Un upsert doit aussi pouvoir relire la ligne : pour un document qu'on a le droit de créer
      // sans pouvoir le lire (cadeau de l'admin chez un élève, signalement), on tente un insert simple.
      if (errCode(r.error) === "invalid_argument") {
        const r2 = await sb.from("docs").insert({ path, data });
        if (!r2.error) return {};
        if (isNet(r2.error, r2.status)) return { net: true, cause: r2.error };
      }
      return { error: r.error, status: r.status };
    } catch (e) { if (isNet(e)) return { net: true, cause: e }; throw e; }
  }
  async function rawDel(path) {
    try {
      const r = await sb.from("docs").delete().eq("path", path);
      if (!r.error) return {};
      return isNet(r.error, r.status) ? { net: true, cause: r.error } : { error: r.error, status: r.status };
    } catch (e) { if (isNet(e)) return { net: true, cause: e }; throw e; }
  }
  // Réponse d'erreur du serveur pour une entrée de la file :
  //  "jeton"   : jeton refusé -> on arrête, wrapErr le renouvelle ;
  //  "refus"   : définitif (règles, validation, 4xx) -> entrée retirée et notée dans rejets ;
  //  "panne"   : 5xx, 408, 429, fonction absente (PGRST202, 42883), code inconnu -> l'entrée reste, nouvel essai avec un délai croissant (jamais retirée) ;
  //  "inconnu" : ni statut ni code -> l'entrée reste, mais elle est retirée (et notée) au 5e essai.
  const MAX_ESSAIS = 5;
  function errKind(err, status) {
    const c = errCode(err), code = String((err && err.code) || "");
    if (c === "not_granted") return "jeton";
    if (code === "PGRST202" || code === "42883") return "panne"; // fonction absente (SQL pas encore appliqué) : on garde et on réessaie
    if (c === "invalid_argument" || /^(22|23|P0|42|PGRST[12])/.test(code)) return "refus";
    const st = typeof status === "number" && status > 0 ? status : 0;
    if (st >= 500 || st === 408 || st === 429) return "panne";
    if (st >= 400) return "refus";
    return st || code ? "panne" : "inconnu";
  }
  // Écriture perdue : console, liste rejets (20 dernières) et un avis dans la page, une fois.
  function rejet(e, err, quoi) {
    console.error("[Première 2026] écriture " + quoi + ", retirée de la file :", e.path, err);
    const rec = { uid: uidNow(), path: e.path, date: new Date().toISOString(), raison: quoi + " : " + String((err && (err.message || err.code)) || "") };
    idb("rejets", "readwrite", (s) => {
      s.add(rec);
      const g = s.getAllKeys(); g.onsuccess = () => { const k = g.result || []; k.slice(0, Math.max(0, k.length - 20)).forEach((x) => s.delete(x)); };
    }).catch(() => {});
    avisRejet();
  }
  let avisVu = false;
  function avisRejet() {
    if (avisVu || !document.body) return; avisVu = true;
    const b = document.createElement("div"); b.id = "p26rej"; b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);top:max(12px,calc(env(safe-area-inset-top) + 12px));z-index:960;width:max-content;max-width:calc(100% - 24px);box-sizing:border-box;display:flex;gap:10px;align-items:center;background:#FAFAF7;color:#1A1C1E;border-radius:999px;padding:7px 8px 7px 14px;box-shadow:0 10px 24px -14px rgba(0,0,0,.7);font:600 .82rem/1.3 Figtree,system-ui,sans-serif";
    b.innerHTML = '<span>Une modification n’a pas pu être enregistrée.</span><button type="button" style="border:0;border-radius:999px;padding:5px 12px;font:inherit;font-weight:800;background:#1A1C1E;color:#FAFAF7;cursor:pointer">OK</button>';
    b.querySelector("button").onclick = () => b.remove();
    document.body.appendChild(b);
  }
  // Vide la file dans l'ordre ; s'arrête au premier échec réseau ou à une panne du serveur.
  let flushing = null, bloquee = false; // bloquee : la file n'avance plus pour une raison autre que le réseau
  const essais = new Map(); // entrée -> nombre d'essais « inconnu » (en mémoire)
  function flushOutbox() {
    if (flushing) return flushing;
    let panne = false;
    flushing = (async () => {
      const vus = new Set();
      while (!offline && session) {
        const e = [...pending.values()].filter((x) => !vus.has(x)).sort((a, b) => a.seq - b.seq)[0];
        if (!e) break;
        const r = e.op === "delete" ? await rawDel(e.path) : await rawSet(e.path, e.data);
        if (r.net) { goOffline(); break; }
        if (r.error) {
          const k = errKind(r.error, r.status);
          if (k === "jeton") { wrapErr(r.error); break; }
          if (k === "panne") { panne = true; vus.add(e); if (r.status >= 500 || r.status === 408 || r.status === 429) break; continue; }
          if (k === "inconnu") {
            const n = (essais.get(e) || 0) + 1; essais.set(e, n);
            if (n < MAX_ESSAIS) { vus.add(e); continue; }
            rejet(e, r.error, "abandonnée après " + MAX_ESSAIS + " essais");
          } else rejet(e, r.error, "refusée");
        }
        await idb("outbox", "readwrite", (s) => s.delete(e.seq)).catch(() => {});
        essais.delete(e);
        if (pending.get(e.path) === e) pending.delete(e.path);
      }
    })().catch((x) => console.error("[Première 2026]", x))
      .finally(() => {
        flushing = null; bloquee = !offline && pending.size > 0;
        if (panne) { const d = palier; palier = Math.min(palier * 2, ATTENTE_MAX); syncTimer(d); } else { palier = ATTENTE; syncTimer(); }
      });
    return flushing;
  }
  // En ligne avec une file bloquée : l'écriture part directement et remplace l'entrée en attente du même document.
  const passeParFile = () => offline || (pending.size > 0 && !bloquee);
  function remplace(path) {
    const x = pending.get(path); if (!x) return;
    pending.delete(path); essais.delete(x);
    idb("outbox", "readwrite", (s) => s.delete(x.seq)).catch(() => {});
  }
  // Efface de cet appareil ce qui concerne un compte (déconnexion). garderFile : la file reste pour la prochaine
  // connexion de ce compte (session terminée sans que l'élève se déconnecte).
  function wipe(uid, garderFile) {
    if (!uid) return Promise.resolve();
    pending.clear(); saved.clear();
    if (!garderFile) jClear(); // réponses en attente d'envoi de ce compte (appareil partagé)
    const parUid = (store) => idb(store, "readwrite", (s) => { const g = s.openCursor(); g.onsuccess = () => { const c = g.result; if (!c) return; if (c.value && c.value.uid === uid) c.delete(); c.continue(); }; });
    const t = new Promise((r) => setTimeout(r, 2000));
    return Promise.race([t, Promise.all([
      idb("docs", "readwrite", (s) => s.delete(IDBKeyRange.bound([uid], [uid, []]))),
      garderFile ? null : parUid("outbox"),
      parUid("rejets"),
    ]).catch(() => {})]);
  }
  // Essais automatiques : toutes les 30 s hors ligne (le réseau est-il revenu ?) ; pour la file, 30 s puis,
  // si le serveur est en panne, 1 min, 2 min… jusqu'à 10 min.
  const ATTENTE = 30000, ATTENTE_MAX = 600000;
  let syncT = null, palier = ATTENTE;
  function syncTimer(delai) {
    const need = offline || pending.size > 0;
    if (syncT && (!need || delai)) { clearTimeout(syncT); syncT = null; }
    if (!need) { palier = ATTENTE; return; }
    if (syncT) return;
    syncT = setTimeout(() => {
      syncT = null;
      Promise.resolve(offline ? reconnect() : flushOutbox()).catch(() => {}).then(() => syncTimer());
    }, offline ? ATTENTE : (delai || ATTENTE));
  }

  /* --- Passage hors ligne / en ligne --- */
  function pill(on) {
    const el = document.getElementById("p26off");
    if (!on) { if (el) el.remove(); return; }
    if (el || !document.body) return;
    const b = document.createElement("div"); b.id = "p26off"; b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:max(84px,calc(env(safe-area-inset-bottom) + 84px));z-index:899;width:max-content;max-width:calc(100% - 24px);box-sizing:border-box;background:rgba(26,28,30,.9);color:#FAFAF7;border-radius:999px;padding:7px 14px;box-shadow:0 10px 24px -14px rgba(0,0,0,.7);font:600 .78rem/1.3 Figtree,system-ui,sans-serif;text-align:center;pointer-events:none";
    b.textContent = "Hors ligne. Ta progression sera envoyée au retour du réseau.";
    document.body.appendChild(b);
  }
  function goOffline() {
    if (offline) return;
    offline = true;
    if (rt) { const c = rt; rt = null; rtOk = false; try { sb.removeChannel(c); } catch (e) {} }
    if (pollT) { clearInterval(pollT); pollT = null; }
    pill(true); syncTimer();
  }
  function goOnline() {
    if (!offline) return;
    offline = false; pill(false); syncTimer();
    flushOutbox().then(() => { if (offline) return; if (subs.length) startRealtime(); refreshAll(); });
  }
  let reconnecting = false;
  async function reconnect() {
    if (!offline || reconnecting || !session || navigator.onLine === false) return;
    reconnecting = true;
    try {
      if (bootOffline) {
        // Entré avec un jeton expiré : on le renouvelle d'abord. Refusé par le serveur = vraie déconnexion.
        let r; try { r = await sb.auth.refreshSession(); } catch (e) { r = { error: e }; }
        const s = r && r.data && r.data.session;
        if (!s) { if (!isNet(r && r.error)) window.P26.account.signOut(); return; }
        session = s; bootOffline = false;
      }
      try { const p = await loadProfile(session.user.id); if (p) { profile = p; window.P26.profile = p; } } catch (e) { if (e && e.offline) return; }
      goOnline();
    } finally { reconnecting = false; }
  }
  window.addEventListener("online", () => { if (offline) reconnect(); else flushOutbox(); });
  window.addEventListener("offline", () => { if (session) goOffline(); });

  /* --- Lectures --- */
  async function fetchColl(coll) {
    if (!offline) {
      let r; try { r = await sb.from("docs").select("path,data").eq("coll", coll); } catch (e) { if (!isNet(e)) throw e; r = { error: e, status: 0 }; }
      if (!r.error) {
        for (const p of [...cache.keys()]) if (collOf(p) === coll) cache.delete(p);
        (r.data || []).forEach((x) => cache.set(x.path, x.data));
        overlay((p) => collOf(p) === coll);
        have.add(coll); copyColl(coll);
        return;
      }
      if (!isNet(r.error, r.status)) throw wrapErr(r.error);
      goOffline();
    }
    if (have.has(coll)) return; // déjà en mémoire, avec les écritures faites hors ligne
    const rows = await localColl(coll).catch(() => null);
    if (!rows) throw offErr();
    for (const p of [...cache.keys()]) if (collOf(p) === coll) cache.delete(p);
    rows.forEach(([p, d]) => cache.set(p, d));
    overlay((p) => collOf(p) === coll);
    have.add(coll);
  }
  async function fetchDoc(path) {
    if (!offline) {
      let r; try { r = await sb.from("docs").select("path,data").eq("path", path).maybeSingle(); } catch (e) { if (!isNet(e)) throw e; r = { error: e, status: 0 }; }
      if (!r.error) {
        if (r.data) cache.set(path, r.data.data); else cache.delete(path);
        overlay((p) => p === path);
        copyDoc(path, cache.get(path));
        return cache.get(path);
      }
      if (!isNet(r.error, r.status)) throw wrapErr(r.error);
      goOffline();
    }
    if (!cache.has(path) && !have.has(collOf(path))) {
      const x = await localDoc(path);
      if (x) { if (x.e) cache.set(path, x.d); else cache.delete(path); } else if (!pending.has(path)) throw offErr();
    }
    overlay((p) => p === path);
    return cache.get(path);
  }
  const collSnap = (coll) => ({ docs: [...cache.entries()].filter(([p]) => collOf(p) === coll).map(([p, d]) => ({ id: idOf(p), exists: true, data: () => d })) });
  const docSnap = (path) => { const d = cache.get(path); return { exists: d !== undefined, data: () => d, metadata: { hasPendingWrites: false } }; };
  function notify(path) {
    const coll = collOf(path);
    subs.forEach((s) => {
      try {
        if (s.kind === "coll" && s.key === coll) s.cb(collSnap(coll));
        else if (s.kind === "doc" && s.key === path) s.cb(docSnap(path));
      } catch (e) { console.error(e); }
    });
  }
  function onChange(payload) {
    const n = payload.new, o = payload.old;
    if (payload.eventType === "DELETE") { const p = o && o.path; if (p && cache.has(p)) { cache.delete(p); notify(p); } return; }
    if (!n || !n.path) return;
    const before = JSON.stringify(cache.get(n.path));
    cache.set(n.path, n.data);
    if (before !== JSON.stringify(n.data)) notify(n.path);
  }
  // Hors ligne : ni temps réel ni sondage (relancés par goOnline).
  function startRealtime() {
    if (rt || offline) return;
    const ch = sb.channel("docs-" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, onChange);
    rt = ch;
    ch.subscribe((status) => { if (rt !== ch) return; rtOk = status === "SUBSCRIBED"; if (!rtOk) startPolling(); else stopPolling(); });
    startPolling();
  }
  function startPolling() { if (pollT || offline) return; pollT = setInterval(refreshAll, rtOk ? 60000 : 20000); }
  function stopPolling() { if (pollT) { clearInterval(pollT); pollT = null; } if (!offline) pollT = setInterval(refreshAll, 90000); }
  let refreshing = false;
  async function refreshAll() {
    if (refreshing || document.hidden || offline) return; refreshing = true;
    try {
      const colls = [...new Set(subs.filter((s) => s.kind === "coll").map((s) => s.key))];
      for (const c of colls) { const before = JSON.stringify(collSnap(c).docs.map((d) => [d.id, d.data()])); await fetchColl(c); if (before !== JSON.stringify(collSnap(c).docs.map((d) => [d.id, d.data()]))) subs.filter((s) => s.kind === "coll" && s.key === c).forEach((s) => s.cb(collSnap(c))); }
      const docs = [...new Set(subs.filter((s) => s.kind === "doc").map((s) => s.key))];
      for (const p of docs) { if (colls.includes(collOf(p))) continue; const before = JSON.stringify(cache.get(p)); await fetchDoc(p); if (before !== JSON.stringify(cache.get(p))) subs.filter((s) => s.kind === "doc" && s.key === p).forEach((s) => s.cb(docSnap(p))); }
    } catch (e) {} finally { refreshing = false; }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAll(); });

  function docRef(path) {
    return {
      path,
      async get() { await ready; const d = await fetchDoc(path); return { exists: d !== undefined, data: () => d }; },
      async set(v) {
        await ready; await obReady;
        const data = JSON.parse(JSON.stringify(v == null ? {} : v));
        // Hors ligne, ou d'autres écritures attendent déjà (file non bloquée) : on passe par la file pour garder l'ordre.
        if (passeParFile()) return queueWrite("set", path, data);
        remplace(path);
        const r = await rawSet(path, data);
        if (r.net) { goOffline(); return queueWrite("set", path, data, r.cause); }
        if (r.error) throw wrapErr(r.error);
        if (canSee(path)) { cache.set(path, data); notify(path); copyDoc(path, data); }
      },
      async update(v) { const cur = (await this.get()).data() || {}; return this.set(Object.assign({}, cur, v)); },
      async delete() {
        await ready; await obReady;
        if (passeParFile()) return queueWrite("delete", path);
        remplace(path);
        const r = await rawDel(path);
        if (r.net) { goOffline(); return queueWrite("delete", path, undefined, r.cause); }
        if (r.error) throw wrapErr(r.error);
        cache.delete(path); notify(path); copyDoc(path, undefined);
      },
      onSnapshot(cb, err) {
        const s = { kind: "doc", key: path, cb, err }; subs.push(s);
        ready.then(() => { startRealtime(); return fetchDoc(path); }).then(() => cb(docSnap(path))).catch((e) => { if (err) err(e); });
        return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
      },
      collection(name) { return collRef(path + "/" + name); },
    };
  }
  function collRef(coll) {
    return {
      path: coll,
      doc(k) { return docRef(coll + "/" + k); },
      async add(v) { const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (n) => ("0" + n.toString(16)).slice(-2)).join(""); const r = docRef(coll + "/" + id); await r.set(v); return r; },
      async get() { await ready; await fetchColl(coll); return collSnap(coll); },
      onSnapshot(cb, err) {
        const s = { kind: "coll", key: coll, cb, err }; subs.push(s);
        ready.then(() => { startRealtime(); return fetchColl(coll); }).then(() => cb(collSnap(coll))).catch((e) => { if (err) err(e); });
        return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
      },
      where() { return this; }, orderBy() { return this; }, limit() { return this; },
    };
  }
  const db = { collection: collRef, doc: docRef };

  /* ================= USER ================= */
  const user = {
    async id() { await ready; return session.user.id; },
    async isOwner() { await ready; return !!(profile && profile.role === "admin"); },
    async canEdit() { await ready; return !!(profile && profile.role === "admin"); },
    async can() { await ready; return true; },
    async me() { await ready; return { id: session.user.id, name: profile ? profile.pseudo : "", email: null, guest: false }; },
    async profiles(ids) {
      await ready; const out = {};
      const { data } = await sb.from("profiles").select("id,pseudo").in("id", ids || []);
      (data || []).forEach((p) => { out[p.id] = { id: p.id, name: p.pseudo }; });
      (ids || []).forEach((i) => { if (!out[i]) out[i] = { id: i, name: "" }; });
      return out;
    },
    async search() { return []; },
  };

  /* ================= ROOM (présence temps réel) ================= */
  const TAB = Math.random().toString(36).slice(2, 10);
  function makeRoom(name) {
    let ch = null, state = {}, peersCb = null, errCb = null, key = null, joined = false;
    const peers = () => {
      if (!ch) return [];
      const st = ch.presenceState(); const out = [];
      Object.entries(st).forEach(([k, arr]) => (arr || []).forEach((p) => {
        out.push({ peer: k, kind: "viewer", isMe: k.startsWith(session.user.id + ":"), sameTab: k === key, presence: p.state || {} });
      }));
      return out;
    };
    const fire = () => { if (peersCb) try { peersCb(peers()); } catch (e) {} };
    return {
      async join() {
        await ready; key = session.user.id + ":" + TAB;
        ch = sb.channel("room:" + name, { config: { private: true, presence: { key }, broadcast: { self: false } } });
        ch.on("presence", { event: "sync" }, fire).on("presence", { event: "join" }, fire).on("presence", { event: "leave" }, fire);
        await new Promise((res, rej) => {
          const t = setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "unavailable" })), 12000);
          ch.subscribe((status) => { if (status === "SUBSCRIBED") { clearTimeout(t); joined = true; res(); } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); rej(Object.assign(new Error(status), { code: "unavailable" })); if (errCb && joined) errCb(); } });
        });
        return this;
      },
      async presence(patch) { state = Object.assign({}, state, patch || {}); if (ch) await ch.track({ state }); },
      onPeers(cb, err) { peersCb = cb; errCb = err; fire(); return () => { peersCb = null; }; },
      peers,
      emit(topic, data) { if (ch) ch.send({ type: "broadcast", event: topic, payload: data }); },
      on(topic, fn) { if (ch) ch.on("broadcast", { event: topic }, (m) => fn(m.payload)); return () => {}; },
      async leave() { if (ch) { try { await ch.untrack(); } catch (e) {} try { await sb.removeChannel(ch); } catch (e) {} } ch = null; joined = false; },
    };
  }
  const lobby = makeRoom("lobby");
  const room = Object.assign({}, lobby, { join: async (name) => { const r = makeRoom(name); await r.join(); return r; } });

  /* ================= DOWNLOADS ================= */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const name = String(filename || "fichier").replace(/[\\/:*?"<>|]/g, "").slice(0, 120);
      try {
        if (navigator.canShare && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
          const f = new File([blob], name, { type: blob.type || "application/octet-stream" });
          if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return { status: "saved" }; }
        }
      } catch (e) { if (e && e.name === "AbortError") throw Object.assign(new Error("declined"), { code: "declined" }); }
      const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 5000);
      return { status: "saved" };
    },
  };

  /* ================= COMPTE (utilisé par la page) ================= */
  const refuse = (m) => Object.assign(new Error(m), { code: "refuse" });
  window.P26.account = {
    async signOut(quandMeme) {
      // Des modifications attendent : on essaie de les envoyer (3 s au plus), sinon on demande avant de les perdre.
      if (!quandMeme && pending.size) {
        if (!offline) await Promise.race([flushOutbox(), new Promise((r) => setTimeout(r, 3000))]);
        if (pending.size) { confirmSignOut(pending.size); return; }
      }
      const uid = uidNow(); parLeleve = true;
      // Cet appareil ne doit plus recevoir les notifications de ce compte
      try { if ("serviceWorker" in navigator) { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) { await sb.rpc("push_desabonner", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); } } } catch (e) {}
      if (!offline) await Promise.race([jFlush(), new Promise((r) => setTimeout(r, 2000))]).catch(() => {}); // réponses en attente : dernier envoi
      await wipe(uid); // copies et file de ce compte (appareil partagé)
      try { await sb.auth.signOut(); } catch (e) {} clearLocal(); try { localStorage.removeItem(LS_UID); localStorage.removeItem(LS_PROF); } catch (e) {} location.reload(); },
    // preuve = mot de passe actuel OU code de secours actuel, vérifiés par la base (null = refusé, 5 échecs = 15 min)
    async newRecoveryCode(preuve) {
      let r; try { r = await sb.rpc("nouveau_code_secours", { p_preuve: preuve == null ? null : String(preuve) }); } catch (e) { throw offErr(e); }
      if (r.error) throw isNet(r.error, r.status) ? offErr(r.error) : wrapErr(r.error);
      if (!r.data) throw refuse("Mot de passe ou code incorrect. Après 5 essais ratés, attends 15 minutes.");
      return r.data;
    },
    // Re-vérifie le mot de passe actuel avant de le changer (plan §3.2 ; la vraie barrière reste la CSP et le réglage Auth)
    async changePassword(ancien, nouveau) {
      if (String(nouveau || "").length < 8) throw Object.assign(new Error("Le mot de passe fait 8 caractères au moins."), { code: "invalid_argument" });
      await ready;
      if (!ancien) throw refuse("Mot de passe actuel incorrect.");
      let r; try { r = await sb.auth.signInWithPassword({ email: mail(profile.pseudo), password: String(ancien) }); } catch (e) { throw offErr(e); }
      if (r.error) { if (/Invalid login/i.test(r.error.message || "")) throw refuse("Mot de passe actuel incorrect."); throw isNet(r.error, r.error.status) ? offErr(r.error) : wrapErr(r.error); }
      if (r.data && r.data.session && r.data.session.user && r.data.session.user.id === uidNow()) session = r.data.session;
      let u; try { u = await sb.auth.updateUser({ password: String(nouveau) }); } catch (e) { throw offErr(e); }
      if (u.error) throw wrapErr(u.error);
    },
    async exportAll() {
      await ready; const uid = session.user.id;
      const { data, error } = await sb.from("docs").select("path,data").eq("owner", uid);
      if (error) throw wrapErr(error);
      let prog = {}; try { prog = JSON.parse(localStorage.getItem("p26_prog") || "{}"); } catch (e) {}
      return { format: "premiere-2026-export", version: 1, exporte: new Date().toISOString(), uid, pseudo: profile.pseudo, progres: prog, docs: (data || []).map((r) => ({ path: r.path, data: r.data })) };
    },
    async importAll(json, mergeProg) {
      await ready; const uid = session.user.id;
      if (!json || json.format !== "premiere-2026-export" || !Array.isArray(json.docs)) throw new Error("Ce fichier n’est pas un export de Première 2026.");
      const old = json.uid || "";
      let n = 0;
      for (const d of json.docs) {
        if (!d || typeof d.path !== "string") continue;
        if (!d.data || typeof d.data !== "object" || Array.isArray(d.data) || Object.prototype.hasOwnProperty.call(d.data, "__proto__")) continue;
        let p = d.path;
        if (old) p = p.split(old).join(uid);
        if (!(p.startsWith("data/users/" + uid + "/") || p === "ligue/" + uid || p === "biblio/" + uid || p.startsWith("biblio/" + uid + "/"))) continue;
        if (p === "data/users/" + uid + "/progres") continue; // la progression passe par mergeProg
        const { error } = await sb.from("docs").upsert({ path: p, data: d.data }, { onConflict: "path" });
        if (!error) { n++; cache.set(p, d.data); notify(p); }
      }
      if (json.progres && mergeProg) mergeProg(json.progres);
      return n;
    },
    profile: () => profile,
  };

  /* ================= ADMIN (lecture seule de ce qui est déjà public, plus les profils) ================= */
  window.P26.admin = {
    async users() {
      await ready;
      if (!profile || profile.role !== "admin") throw Object.assign(new Error("Réservé à l’administrateur."), { code: "invalid_argument" });
      const [p, l, b] = await Promise.all([
        sb.rpc("admin_profils").then((r) => (r.error && sansFn(r.error) ? sb.from("profiles").select("id,pseudo,role,created_at") : r)),
        sb.from("docs").select("path,data,updated_at").eq("coll", "ligue"),
        sb.from("docs").select("owner").like("coll", "biblio/%/chap"),
      ]);
      for (const r of [p, l, b]) if (r.error) throw wrapErr(r.error);
      const lig = {}, act = {}, nb = {};
      (l.data || []).forEach((r) => { const id = idOf(r.path); lig[id] = r.data || {}; act[id] = Date.parse(r.updated_at) || 0; });
      (b.data || []).forEach((r) => { if (r.owner) nb[r.owner] = (nb[r.owner] || 0) + 1; });
      return (p.data || []).map((u) => ({ id: u.id, pseudo: u.pseudo, role: u.role, cree: u.created_at, lig: lig[u.id] || null, act: act[u.id] || 0, nbib: nb[u.id] || 0 }));
    },
  };

  /* ================= CLUBS (codes et membres gardés par la base, voir sql/6-securite.sql) ================= */
  // Erreur réseau ou fonction absente : exception code "unavailable" (la page garde alors son cache P.lg).
  async function clubRpc(name, args) {
    await ready;
    if (offline) throw offErr(null);
    let r; try { r = await sb.rpc(name, args); } catch (e) { throw offErr(e); }
    if (r.error) throw isNet(r.error, r.status) ? offErr(r.error) : r.error.code === "P0001" ? r.error : wrapErr(r.error);
    return r.data;
  }
  const clubCode = (c) => String(c == null ? "" : c).toUpperCase().replace(/[^A-Z0-9]/g, "");
  window.P26.clubs = {
    // [{code, nom, createur (vrai si je l'ai créé), membres}]
    async mes() {
      let d; try { d = await clubRpc("clubs_mes", {}); } catch (e) { throw e && e.code === "P0001" ? wrapErr(e) : e; }
      return (Array.isArray(d) ? d : []).filter((x) => x && typeof x.code === "string").map((x) => ({ code: x.code, nom: String(x.nom || "Club " + x.code), createur: x.createur === true, membres: Math.max(0, Math.round(+x.membres) || 0) }));
    },
    // Rend le code du club (tiré par la base). Refus : invalid_argument (nom), limite (5 par jour, 30 clubs).
    async creer(nom) {
      const n = String(nom == null ? "" : nom).replace(/^ +| +$/g, "");
      if ([...n].length < 1 || [...n].length > 24) throw Object.assign(new Error("Le nom du club fait 1 à 24 caractères."), { code: "invalid_argument" });
      try { const c = await clubRpc("club_creer", { p_nom: n }); if (typeof c !== "string" || !/^[A-Z0-9]{5}$/.test(c)) throw new Error("code invalide"); return c; }
      catch (e) {
        if (e && e.code === "P0001") {
          if (/limite|trop/i.test(e.message || "")) throw Object.assign(new Error("Tu as créé trop de clubs pour aujourd’hui."), { code: "limite", cause: e });
          throw Object.assign(new Error(/nom/i.test(e.message || "") ? refusMsg(e) : "Nom de club refusé."), { code: "invalid_argument", cause: e });
        }
        if (e && e.code) throw e;
        throw Object.assign(new Error("La base ne répond pas pour l’instant."), { code: "unavailable", cause: e });
      }
    },
    // "ok" | "deja" | "inconnu" | "limite" | "plein"
    async rejoindre(code) {
      const c = clubCode(code);
      let v; try { v = await clubRpc("club_rejoindre", { p_code: c }); } catch (e) { throw e && e.code === "P0001" ? wrapErr(e) : e; }
      if (!["ok", "deja", "inconnu", "limite", "plein"].includes(v)) throw Object.assign(new Error("Réponse inattendue."), { code: "unavailable" });
      return v;
    },
    // true si j'étais membre (le club disparaît quand le dernier membre part)
    async quitter(code) {
      let v; try { v = await clubRpc("club_quitter", { p_code: clubCode(code) }); } catch (e) { throw e && e.code === "P0001" ? wrapErr(e) : e; }
      return v === true;
    },
  };

  /* ================= ELO (calculé par la base, voir 3-elo.sql) ================= */
  const rpc = async (name, args) => { await ready; const r = await sb.rpc(name, args || {}); if (r.error) throw wrapErr(r.error); return r.data; };
  window.P26.elo = {
    async list() {
      await ready;
      const out = {};
      for (let from = 0; from < 100000; from += 1000) {
        const { data, error } = await sb.from("elo").select("uid,elo,parties").order("uid").range(from, from + 999);
        if (error) throw wrapErr(error);
        (data || []).forEach((r) => { out[r.uid] = { elo: r.elo, n: r.parties }; });
        if (!data || data.length < 1000) break;
      }
      return out;
    },
    ouvrir: (nbq, sec, joue) => rpc("elo_ouvrir", { p_nbq: nbq, p_sec: sec, p_joue: joue !== false }),
    rejoindre: (id) => rpc("elo_rejoindre", { p_id: id }),
    score: (id, s) => rpc("elo_score", { p_id: id, p_score: s }),
    cloturer: (id) => rpc("elo_cloturer", { p_id: id }),
    rattrapage: () => rpc("elo_rattrapage"),
    async resultat(id) {
      await ready;
      const { data, error } = await sb.from("elo_joueurs").select("uid,score,avant,delta").eq("partie", id);
      if (error) throw wrapErr(error);
      const me = (data || []).find((r) => r.uid === session.user.id) || null;
      return { me, tous: data || [] };
    },
  };

  /* ================= AMIS ET NOTIFICATIONS (voir 3-maj8.sql) ================= */
  window.P26.social = {
    async notifs() {
      await ready;
      const { data, error } = await sb.from("notifs").select("id,de,type,texte,lien,cree,lu").order("cree", { ascending: false }).limit(50);
      if (error) throw wrapErr(error);
      return data || [];
    },
    lues: (ids) => rpc("notifs_lues", { p_ids: ids }),
    async amis() {
      await ready;
      const { data, error } = await sb.from("amis").select("a,b,de,statut,cree");
      if (error) throw wrapErr(error);
      const me = session.user.id, ids = [...new Set((data || []).map((r) => (r.a === me ? r.b : r.a)))];
      const noms = {};
      if (ids.length) { const p = await sb.from("profiles").select("id,pseudo").in("id", ids); (p.data || []).forEach((x) => { noms[x.id] = x.pseudo; }); }
      return (data || []).map((r) => { const o = r.a === me ? r.b : r.a; return { id: o, pseudo: noms[o] || "?", ok: r.statut === "ok", recu: r.statut !== "ok" && r.de !== me, cree: r.cree }; });
    },
    demander: (p) => rpc("ami_demander", { p_pseudo: p }),
    repondre: (id, ok) => rpc("ami_repondre", { p_autre: id, p_ok: !!ok }),
    retirer: (id) => rpc("ami_retirer", { p_autre: id }),
    defier: (id, code) => rpc("defier", { p_ami: id, p_code: code }),
    abonner: (sub) => { const j = sub.toJSON(); return rpc("push_abonner", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }); },
    desabonner: (endpoint) => rpc("push_desabonner", { p_endpoint: endpoint }),
  };

  /* ================= JOURNAL DES RÉPONSES ET ÉVÉNEMENTS (voir 5-fondations.sql) ================= */
  // add() met la réponse en mémoire ; envoi groupé (reponses_ajouter) toutes les 15 s, à 50 réponses en attente et quand
  // la page passe en arrière-plan. Le tampon est recopié dans localStorage (p26w_journal, avec l'uid, 500 éléments au plus,
  // les plus anciens tombent) : hors ligne, panne ou fermeture de la page, il est renvoyé plus tard.
  // La base ne croit rien : mêmes limites côté SQL (100 par appel, 3000 par 24 h). Pas de file IndexedDB ici (c'est celle des docs).
  const LS_JRN = "p26w_journal", JRN_MAX = 500, JRN_LOT = 100, JRN_ENVOI = 50, JRN_DELAI = 15000;
  const JRN_MODES = ["carte", "quiz", "defi", "duel", "arene", "verbe", "examen", "autre"];
  let jbuf = [], jUid = null, jSending = null, jTimer = null;
  const jqid = (q) => String(q == null ? "" : q).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._:-]+/g, "_").slice(0, 120);
  function jPersist() {
    try {
      if (jbuf.length && jUid) localStorage.setItem(LS_JRN, JSON.stringify({ uid: jUid, items: jbuf.slice(-JRN_MAX) }));
      else localStorage.removeItem(LS_JRN);
    } catch (e) {}
  }
  // Reprend le tampon laissé par une page précédente (même compte seulement), une fois par session.
  function jInit() {
    const uid = uidNow();
    if (!uid || jUid === uid) return !!uid;
    jUid = uid;
    let st = null; try { st = JSON.parse(localStorage.getItem(LS_JRN) || "null"); } catch (e) {}
    if (st && st.uid === uid && Array.isArray(st.items)) {
      const ok = st.items.filter((x) => x && typeof x.q === "string" && typeof x.ok === "boolean" && JRN_MODES.includes(x.m));
      jbuf = ok.concat(jbuf).slice(-JRN_MAX);
    }
    jPersist();
    return true;
  }
  function jClear() { jbuf = []; jUid = null; try { localStorage.removeItem(LS_JRN); } catch (e) {} }
  function jFlush() {
    if (jSending) return jSending;
    if (window.P26_PREVIEW || !jInit() || !jbuf.length || navigator.onLine === false) return Promise.resolve();
    jSending = (async () => {
      while (jbuf.length && session && uidNow() === jUid && navigator.onLine !== false) {
        const lot = jbuf.slice(0, JRN_LOT); let r;
        try { r = await sb.rpc("reponses_ajouter", { p: lot }); } catch (e) { r = { error: e, status: 0 }; }
        if (r && r.error) {
          const k = isNet(r.error, r.status) ? "net" : errKind(r.error, r.status);
          if (k === "jeton") wrapErr(r.error);
          if (k !== "refus") break; // réseau, panne, jeton : on garde tout, nouvel essai plus tard
          // refus définitif du lot (ex. plus de 100 d'un coup) : on le jette plutôt que de bloquer la suite
        }
        const env = new Set(lot); jbuf = jbuf.filter((x) => !env.has(x)); // par identité : add() a pu faire tomber la tête pendant l'envoi
        jPersist();
      }
    })().catch(() => {}).then(() => { jPersist(); jSending = null; });
    return jSending;
  }
  window.P26.journal = {
    add(qid, ok, ms, mode) {
      try {
        if (window.P26_PREVIEW || !jInit()) return;
        const q = jqid(qid); if (!q) return;
        const t = Number.isFinite(+ms) && ms !== null && ms !== "" ? Math.round(+ms) : null;
        jbuf.push({ q, ok: !!ok, ms: t !== null && t >= 0 && t <= 600000 ? t : null, m: JRN_MODES.includes(mode) ? mode : "autre" });
        if (jbuf.length > JRN_MAX) jbuf.splice(0, jbuf.length - JRN_MAX);
        jPersist();
        if (jbuf.length >= JRN_ENVOI) jFlush();
      } catch (e) {}
    },
    flush: () => jFlush(),
    // Pour les tests : arrête ou relance l'envoi toutes les 15 s.
    minuteur(on) { if (jTimer) { clearInterval(jTimer); jTimer = null; } if (on) jTimer = setInterval(() => { if (jbuf.length) jFlush(); }, JRN_DELAI); },
    taille: () => jbuf.length,
    // Mes réponses depuis une date (Date, ms ou texte ISO ; 7 jours par défaut), la plus récente d'abord.
    async mine(opt) {
      await ready;
      let d = opt && opt.depuis != null ? new Date(opt.depuis) : new Date(Date.now() - 7 * 864e5);
      if (isNaN(d.getTime())) d = new Date(Date.now() - 7 * 864e5);
      const { data, error } = await sb.from("reponses").select("qid,ok,ms,mode,cree").gte("cree", d.toISOString()).order("cree", { ascending: false }).limit(5000);
      if (error) throw wrapErr(error);
      return (data || []).slice().sort((a, b) => (a.cree < b.cree ? 1 : a.cree > b.cree ? -1 : 0));
    },
  };
  ready.then(() => { jInit(); jFlush(); }).catch(() => {});
  jTimer = setInterval(() => { if (jbuf.length) jFlush(); }, JRN_DELAI);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") jFlush(); });
  window.addEventListener("pagehide", () => { jFlush(); });
  window.addEventListener("online", () => { setTimeout(jFlush, 800); setTimeout(jFlush, 5000); });

  // Événements (fil d'activité). La page ne stocke aucun texte libre : seule la phrase construite ici à partir de type + data s'affiche.
  const EV_TYPES = ["division", "trophee", "niveau", "serie", "record", "info"];
  // Aucun texte venu de la base n'est affiché : data ne contient que des identifiants ou des entiers (contrôlés par evenement_ajouter),
  // et la page les traduit par des libellés fixes. Identifiant inconnu : phrase générique.
  const EV_DIV = { bronze: "bronze", argent: "argent", or: "or", diamant: "diamant" };
  // Identifiants des trophées de la page (trophies() dans base.html) et des trophées gagnés du paquet 1.
  const EV_TROPHEES = {
    "premier-pas": "Premier pas", "serie-7": "Une semaine de suite", "elo-1200": "Elo 1200",
    debut: "Première carte", serie7: "Sept soirs", dix: "Sans faute", paquet: "Paquet maîtrisé", cent: "Cent cartes",
    defi: "Défi parfait", focus: "En focus", diamant: "Diamant", fiche: "Première fiche", equipe: "Esprit d’équipe",
    champion: "Champion", ami: "Défi relevé", bac: "Mention", plan: "Bien préparé", quete: "Trois sans-faute",
    survivant: "Survivant", eclair: "Éclair", stratege: "Stratège", centverbes: "Cent verbes",
  };
  const EV_RECORDS = { verbes: "au chrono des verbes", defi: "au défi du jour", arene: "dans l’Arène", quiz: "en quiz", survie: "en Survie", vf: "au Vrai ou faux express" };
  const own = (o, k) => (typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null);
  const evNum = (v) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(0, Math.min(n, 1e9)) : 0; };
  function evPhrase(type, d, moi) {
    d = d && typeof d === "object" ? d : {};
    const il = moi ? "Tu as" : "a", est = moi ? "Tu es" : "est";
    switch (type) {
      case "division": { const l = own(EV_DIV, d.n); return l ? est + " passé en division " + l + "." : est + " monté de division."; }
      case "trophee": { const l = own(EV_TROPHEES, d.n); return l ? il + " décroché le trophée « " + l + " »." : il + " décroché un trophée secret."; }
      case "niveau": return il + " atteint le niveau " + evNum(d.n) + ".";
      case "serie": return est + " sur une série de " + evNum(d.n) + " jour" + (evNum(d.n) > 1 ? "s" : "") + ".";
      case "record": { const l = own(EV_RECORDS, d.de); return il + " battu un record" + (l ? " " + l : "") + " : " + evNum(d.n) + "."; }
      default: return il + " une nouvelle activité.";
    }
  }
  window.P26.evenements = {
    // Retourne true si l'événement est enregistré (30 par jour au plus). Jamais d'exception : un événement perdu n'est pas grave.
    async add(type, data) {
      try {
        if (window.P26_PREVIEW || !EV_TYPES.includes(type)) return false;
        await ready;
        const r = await sb.rpc("evenement_ajouter", { p_type: type, p_data: data && typeof data === "object" && !Array.isArray(data) ? data : {} });
        return !r.error && r.data === true;
      } catch (e) { return false; }
    },
    // Les 50 derniers événements de moi et de mes amis, du plus récent au plus ancien : {id, uid, moi, pseudo, type, data, cree, texte}.
    async fil() {
      await ready;
      const { data, error } = await sb.from("evenements").select("id,uid,type,data,cree").order("cree", { ascending: false }).limit(50);
      if (error) throw wrapErr(error);
      const L = (data || []).filter((e) => EV_TYPES.includes(e.type)).sort((a, b) => (a.cree < b.cree ? 1 : a.cree > b.cree ? -1 : b.id - a.id)).slice(0, 50);
      const me = session.user.id, ids = [...new Set(L.map((e) => e.uid).filter((u) => u !== me))], noms = {};
      if (ids.length) { try { const p = await sb.from("profiles").select("id,pseudo").in("id", ids); (p.data || []).forEach((x) => { noms[x.id] = x.pseudo; }); } catch (e) {} }
      return L.map((e) => { const moi = e.uid === me, pseudo = moi ? "Toi" : (noms[e.uid] || "Un ami"); return { id: e.id, uid: e.uid, moi, pseudo, type: e.type, data: e.data, cree: e.cree, texte: evPhrase(e.type, e.data, moi) }; });
    },
  };

  /* ================= Paquet 1 : appels génériques à la base (P26.rpc, P26.lire) ================= */
  // Rejets, toujours un Error avec un code :
  //   "unavailable" : pas de réseau, hors ligne, panne (5xx), réponse sans code ;
  //   "absent"      : fonction ou table pas encore créée (PGRST202, 42883, 42P01, PGRST205) : SQL pas encore appliqué ;
  //   "refus"       : la base a dit non (P0001 = raise exception, 22xxx, 23xxx, 42501, autres 4xx) ; message = texte SQL tel quel,
  //                   texte = phrase pour l'élève ;
  //   jeton refusé  : comme wrapErr (code "not_granted", renouvellement du jeton tenté).
  const absent = (e) => !!e && (sansFn(e) || e.code === "42P01" || e.code === "PGRST205");
  function p1Err(e, status) {
    if (isNet(e, status)) return offErr(e);
    if (absent(e)) return Object.assign(new Error("Fonction pas encore disponible."), { code: "absent", cause: e });
    const c = errCode(e);
    if (c === "not_granted") return wrapErr(e);
    if (c === "refus_base" || c === "invalid_argument" || (typeof status === "number" && status >= 400 && status < 500) || /^P0/.test(String(e.code || ""))) {
      return Object.assign(new Error(String(e.message || "refusé").slice(0, 300)), { code: "refus", texte: refusMsg(e), cause: e });
    }
    return Object.assign(new Error("La base ne répond pas pour l’instant."), { code: "unavailable", cause: e });
  }
  window.P26.ready = ready;
  // P26.rpc("nom", {p_x: ...}) -> data de la fonction SQL.
  window.P26.rpc = async (nom, args) => {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(String(nom))) throw Object.assign(new Error("nom de fonction invalide"), { code: "refus", texte: "Demande invalide." });
    await ready;
    if (offline) throw offErr(null);
    let r; try { r = await sb.rpc(nom, args && typeof args === "object" ? args : {}); } catch (e) { throw offErr(e); }
    if (r.error) throw p1Err(r.error, r.status);
    return r.data;
  };
  // P26.lire("table", q => q.select("a,b").eq("x", 1)) -> lignes (tableau). Sans f : select("*").
  window.P26.lire = async (table, f) => {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(String(table))) throw Object.assign(new Error("table invalide"), { code: "refus", texte: "Demande invalide." });
    await ready;
    if (offline) throw offErr(null);
    let r; try { const q0 = sb.from(table); r = await (typeof f === "function" ? f(q0) : q0.select("*")); } catch (e) { throw offErr(e); }
    if (r.error) throw p1Err(r.error, r.status);
    return Array.isArray(r.data) ? r.data : r.data == null ? [] : [r.data];
  };

  /* ================= window.claude ================= */
  const NS = { db, user, room, downloads, sample: null, artifact: null, assets: null, comments: null, files: null, mcp: null };
  window.claude = {
    use: async (name) => {
      if (!(name in NS)) return null;
      if (NS[name] === null) return null;
      await ready;
      return NS[name];
    },
  };
})();

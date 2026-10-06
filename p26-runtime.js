/* Première 2026 : version web autonome.
   Remplace window.claude (db, user, room, downloads) par Supabase.
   Aucun secret ici : la clé "anon" est publique, la sécurité est dans les règles de la base. */
(function () {
  "use strict";
  const CFG = window.P26_CONFIG || {};
  const DOMAIN = "premiere2026.invalid"; // domaine fictif : les comptes sont « pseudo + mot de passe », pas d'e-mail
  const LS_UID = "p26w_uid";
  const $ = (s) => document.querySelector(s);

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
    return "unavailable";
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
    return Object.assign(new Error(code === "invalid_argument" ? "Écriture refusée." : code === "not_granted" ? "Session expirée." : "La base ne répond pas pour l’instant."), { code, cause: e });
  };

  /* ================= SESSION ================= */
  let session = null, profile = null;
  let resolveReady; const ready = new Promise((r) => { resolveReady = r; });

  async function loadProfile(uid) {
    const { data, error } = await sb.from("profiles").select("id,pseudo,pseudo_lc,role,recovery_set").eq("id", uid).maybeSingle();
    if (error) throw wrapErr(error);
    return data;
  }
  function clearLocal() {
    try { Object.keys(localStorage).filter((k) => k.startsWith("p26_")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
  }
  async function enter(s, fresh) {
    session = s;
    try { profile = await loadProfile(s.user.id); } catch (e) { profile = null; }
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
    resolveReady();
    if (profile.recovery_set === false) setTimeout(codeBanner, 1500);
  }
  // Pas de code de secours (compte neuf sans code, ou code déjà utilisé) : on propose d'en créer un.
  function codeBanner() {
    if (document.getElementById("p26cb")) return;
    const b = document.createElement("div"); b.id = "p26cb"; b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 84px));z-index:900;max-width:460px;margin:0 auto;background:#FAFAF7;color:#1A1C1E;border-radius:16px;padding:14px 16px;box-shadow:0 18px 40px -16px rgba(0,0,0,.7);font:600 .9rem/1.4 Figtree,system-ui,sans-serif";
    b.innerHTML = '<div id="p26cbt">Tu n’as pas de code de secours. Sans lui, un mot de passe oublié = compte perdu.</div><div style="display:flex;gap:8px;margin-top:10px"><button type="button" id="p26cbgo" style="flex:1;border:0;border-radius:999px;padding:10px;font:inherit;font-weight:800;background:#1A1C1E;color:#FAFAF7;cursor:pointer">Créer mon code</button><button type="button" id="p26cbx" style="border:0;border-radius:999px;padding:10px 14px;font:inherit;background:#ECECE6;color:#1A1C1E;cursor:pointer">Plus tard</button></div>';
    document.body.appendChild(b);
    b.querySelector("#p26cbx").onclick = () => b.remove();
    b.querySelector("#p26cbgo").onclick = async () => {
      const t = b.querySelector("#p26cbt"), go = b.querySelector("#p26cbgo"); go.disabled = true;
      try { const c = await window.P26.account.newRecoveryCode(); profile.recovery_set = true;
        t.innerHTML = 'Ton code de secours, à noter maintenant (il ne sera plus affiché) :<div style="font:900 1.6rem/1.2 \'Bodoni Moda\',Georgia,serif;letter-spacing:.12em;text-align:center;margin:10px 0;user-select:all;-webkit-user-select:all"></div>';
        t.querySelector("div").textContent = c; go.remove(); b.querySelector("#p26cbx").textContent = "Je l’ai noté"; }
      catch (e) { t.textContent = "Impossible pour l’instant. Réessaie depuis Profil › Compte."; go.disabled = false; }
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
        setErr("Création du compte…");
        const { data, error } = await sb.auth.signUp({ email: mail(pseudo), password: p, options: { data: { pseudo } } });
        if (error) {
          const t = error.message || "";
          setErr(/already registered/i.test(t) ? "Ce pseudo est déjà pris." : /email_address_invalid|invalid.*email/i.test(t + (error.code || "")) ? "La base refuse ce type de compte. L’administrateur doit vérifier le réglage des e-mails dans Supabase." : /Database error/i.test(t) ? "Pseudo refusé : lettres, chiffres, espaces ou tirets, et pas déjà pris." : "Inscription impossible pour l’instant. Réessaie dans un moment."); console.error(error);
          busy(false); return;
        }
        if (!data.session) { UI.mode = "confirm"; renderAuth(); return; }
        let code = "";
        try { const r = await sb.rpc("nouveau_code_secours"); if (!r.error) code = r.data || ""; } catch (e) {}
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
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) { await enter(data.session); return; }
    } catch (e) {}
    renderAuth();
  }
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "SIGNED_OUT") { clearLocal(); try { localStorage.removeItem(LS_UID); } catch (e) {} location.reload(); }
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

  async function fetchColl(coll) {
    const { data, error } = await sb.from("docs").select("path,data").eq("coll", coll);
    if (error) throw wrapErr(error);
    for (const p of [...cache.keys()]) if (collOf(p) === coll) cache.delete(p);
    (data || []).forEach((r) => cache.set(r.path, r.data));
    have.add(coll);
  }
  async function fetchDoc(path) {
    const { data, error } = await sb.from("docs").select("path,data").eq("path", path).maybeSingle();
    if (error) throw wrapErr(error);
    if (data) cache.set(path, data.data); else cache.delete(path);
    return data ? data.data : undefined;
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
  function startRealtime() {
    if (rt) return;
    rt = sb.channel("docs-" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, onChange)
      .subscribe((status) => { rtOk = status === "SUBSCRIBED"; if (!rtOk) startPolling(); else stopPolling(); });
    startPolling();
  }
  function startPolling() { if (pollT) return; pollT = setInterval(refreshAll, rtOk ? 60000 : 20000); }
  function stopPolling() { if (pollT) { clearInterval(pollT); pollT = null; } pollT = setInterval(refreshAll, 90000); }
  let refreshing = false;
  async function refreshAll() {
    if (refreshing || document.hidden) return; refreshing = true;
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
        await ready;
        const data = JSON.parse(JSON.stringify(v == null ? {} : v));
        let { error } = await sb.from("docs").upsert({ path, data }, { onConflict: "path" });
        // Un upsert doit aussi pouvoir relire la ligne : pour un document qu'on a le droit de créer
        // sans pouvoir le lire (cadeau de l'admin chez un élève, signalement), on tente un insert simple.
        if (error && errCode(error) === "invalid_argument") {
          const r2 = await sb.from("docs").insert({ path, data });
          if (!r2.error) error = null;
        }
        if (error) throw wrapErr(error);
        if (canSee(path)) { cache.set(path, data); notify(path); }
      },
      async update(v) { const cur = (await this.get()).data() || {}; return this.set(Object.assign({}, cur, v)); },
      async delete() {
        await ready;
        const { error } = await sb.from("docs").delete().eq("path", path);
        if (error) throw wrapErr(error);
        cache.delete(path); notify(path);
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
  window.P26.account = {
    async signOut() { try { await sb.auth.signOut(); } catch (e) {} clearLocal(); try { localStorage.removeItem(LS_UID); } catch (e) {} location.reload(); },
    async newRecoveryCode() { const r = await sb.rpc("nouveau_code_secours"); if (r.error) throw wrapErr(r.error); return r.data; },
    async changePassword(p) { if (String(p || "").length < 8) throw Object.assign(new Error("Le mot de passe fait 8 caractères au moins."), { code: "invalid_argument" }); const { error } = await sb.auth.updateUser({ password: p }); if (error) throw wrapErr(error); },
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
        sb.from("profiles").select("id,pseudo,role,created_at"),
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

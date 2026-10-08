
"use strict";
/* ================= P26ui : points d'accroche du paquet 1 (socle T0) =================
   Fichier source p26ui.js, injecté par patch10.py en tête de app.js (même portée que l'application).
   Les modules site/mod/*.js s'y branchent ; l'application l'appelle aux endroits marqués dans patch10.py et maj8.js.
   Règle : aucune exception d'un module ne remonte dans l'application (chaque appel vers un module est protégé).
   Mode d'emploi complet : docs/NUIT.md §10. */
const P26ui=(()=>{
  const ID=/^[a-z0-9-]{1,24}$/;                          // identifiants de module, de vue, d'onglet, de cadre, de titre
  const ABO={};                                          // evt -> [{fn,ordre,n}]
  let NUM=0;
  const log=(quoi,e)=>{try{console.error("[P26ui] "+quoi+" :",e)}catch(_){}};
  const U={
    /* ---------- Événements ---------- */
    // Abonnement ; ordre croissant (50 par défaut), à égalité ordre d'inscription. Rend une fonction de désabonnement.
    on(evt,fn,ordre){if(typeof fn!=="function")return ()=>{};evt=String(evt);
      const L=ABO[evt]=ABO[evt]||[],a={fn,ordre:Number.isFinite(+ordre)?+ordre:50,n:NUM++};L.push(a);L.sort((x,y)=>x.ordre-y.ordre||x.n-y.n);
      if(evt.startsWith("slot:"))rafraichir(evt.slice(5));
      return ()=>{const i=L.indexOf(a);if(i>=0)L.splice(i,1)}},
    // Appelle chaque abonné dans l'ordre ; un abonné qui lève est journalisé (console.error "[P26ui]") et les suivants passent quand même.
    emit(evt,data){const L=(ABO[String(evt)]||[]).slice();for(const a of L){try{a.fn(data)}catch(e){log("abonné de « "+evt+" »",e)}}},

    /* ---------- Emplacements ---------- */
    // L'application passe un conteneur (vidé ici) ; chaque abonné de "slot:"+nom y ajoute SON enfant <div data-p1="module">.
    slot(nom,el){if(!el||!el.nodeType)return;el.setAttribute("data-slot",nom);el.textContent="";U.emit("slot:"+nom,el)},
    // Aide : crée et ajoute l'enfant <div data-p1="module"> d'un emplacement, et le rend.
    bloc(el,module){const d=document.createElement("div");d.setAttribute("data-p1",ID.test(module)?module:"x");el.appendChild(d);return d},

    /* ---------- Vues de module (view === "mod", conteneur #modv) ---------- */
    vue(nom,def){if(!ID.test(nom)||!def||typeof def.rendre!=="function"){log("vue refusée",nom);return}VUES[nom]=def},
    ouvrir(nom,arg){if(!ID.test(String(nom)))return Promise.resolve(false);
      return pret(nom).then(ok=>{if(!ok){toastSur("Cette partie du site n’est pas disponible pour l’instant.");return false}
        if(COUR&&COUR.nom!==nom)quitter();COUR={nom,arg:arg==null?"":String(arg)};
        if(view==="mod")render();else go("mod");return true})},
    retour(){go(PREC&&PREC!=="mod"?PREC:"table")},

    /* ---------- Routes (#motif ou #motif=valeur) ---------- */
    route(motif,fn){if(ID.test(motif)&&typeof fn==="function")ROUTES[motif]=fn},
    suivre(h){return suivre(h)},

    /* ---------- Ligne de classement, cadre, texte sous le pseudo ---------- */
    ligne(fn){if(typeof fn==="function")LIGNE.push(fn)},
    cadre:r=>"",
    sous(fn){if(typeof fn==="function")SOUS.push(fn)},
    sousHTML(r){const out=[];for(const f of SOUS){try{const s=f(r||{});if(typeof s==="string"&&s)out.push(s)}catch(e){log("sous",e)}}return out.join(" · ")},
    filtreLigue:rows=>rows,
    gel:iso=>false,

    /* ---------- État du compte P.p1 ---------- */
    fusion(cle,fn){if(!/^[a-z0-9_-]{1,24}$/.test(cle)||typeof fn!=="function")return;FUS[cle]=fn;
      if(DIST&&Object.prototype.hasOwnProperty.call(DIST,cle)&&fusionne(cle,DIST[cle]))saveP()},
    etat(cle,init){P.p1=P.p1&&typeof P.p1==="object"&&!Array.isArray(P.p1)?P.p1:{};
      if(P.p1[cle]===undefined&&init!==undefined)P.p1[cle]=init;return P.p1[cle]},

    /* ---------- Boutique ---------- */
    ongletsBoutique(){const L=[];U.emit("boutique.onglets",L);const vus=new Set(["dos","w","b","ch"]);
      return L.filter(t=>Array.isArray(t)&&ID.test(t[0])&&typeof t[1]==="string"&&!vus.has(t[0])&&(vus.add(t[0]),true)).map(t=>[t[0],t[1].slice(0,30)])},

    precharger:["progression","boutique","revision","amis","annonce"],

    /* ---------- Appels internes de l'application (ne pas appeler depuis un module) ---------- */
    _cadre(r){try{const s=U.cadre(r||{});return typeof s==="string"&&/^ data-cadre="[a-z0-9-]{1,24}"$/.test(s)?s:""}catch(e){log("cadre",e);return ""}},
    _gel(iso){try{return U.gel(iso)===true}catch(e){log("gel",e);return false}},
    _filtre(rows){try{const o=U.filtreLigue(rows);return Array.isArray(o)?o:rows}catch(e){log("filtreLigue",e);return rows}},
    _champs(){const o={};for(const f of LIGNE){let x;try{x=f()}catch(e){log("ligne",e);continue}if(x&&typeof x==="object")for(const k of CHAMPS)if(k in x){const v=norme(k,x[k]);if(v!==undefined)o[k]=v}}return o},
    _propre(d,o){for(const k of CHAMPS){if(d&&typeof d==="object"&&k in d)o[k]=norme(k,d[k]);else delete o[k]}return o},
    // Ma ligne : mes champs actuels (fournisseurs) passent devant ceux de ma ligne publiée, qui peut dater d'avant un achat ou un niveau.
    _moi(o){return Object.assign({id:typeof UID==="string"?UID:"",me:true},o||{},U._champs())},
    _mergeP(r){if(!r||!r.p1||typeof r.p1!=="object"||Array.isArray(r.p1))return false;DIST=r.p1;let ch=false;
      for(const k of Object.keys(r.p1))if(/^[a-z0-9_-]{1,24}$/.test(k)&&fusionne(k,r.p1[k]))ch=true;return ch},
    _vueCourante(){return COUR&&VUES[COUR.nom]?COUR.nom:null},
    _rendre(){const box=document.getElementById("modv");if(!box)return;const v=COUR&&VUES[COUR.nom];if(!v){go("table");return}
      try{if(typeof v.occupe==="function"&&v.occupe()&&box.dataset.vue===COUR.nom)return}catch(e){}
      box.dataset.vue=COUR.nom;const sec=document.getElementById("v-mod");if(sec)sec.setAttribute("aria-label",String(v.titre||""));
      try{v.rendre(box,COUR.arg)}catch(e){log("vue « "+COUR.nom+" »",e);box.innerHTML='<p class="muted">Cette partie du site a rencontré un problème.</p>'}},
    _quitter(){quitter()},
    _go(v){if(v!=="mod")PREC=v},
    _demarrer(){demarrer()},
  };
  /* ----- état interne ----- */
  const VUES={},ROUTES={},LIGNE=[],SOUS=[],FUS={};let COUR=null,PREC="table",DIST=null,PRECH=null;
  const CHAMPS=["cad","tit","niv","sv","vf"];
  function norme(k,v){if(k==="cad"||k==="tit")return typeof v==="string"&&ID.test(v)?v:"";const n=Math.round(+v);
    if(k==="niv")return Number.isFinite(n)?Math.max(1,Math.min(100,n)):1;return Number.isFinite(n)?Math.max(0,Math.min(10000,n)):0}
  function fusionne(k,dist){P.p1=P.p1&&typeof P.p1==="object"&&!Array.isArray(P.p1)?P.p1:{};const loc=P.p1[k];let v;
    if(FUS[k]){try{v=FUS[k](loc===undefined?undefined:JSON.parse(JSON.stringify(loc)),JSON.parse(JSON.stringify(dist)))}catch(e){log("fusion « "+k+" »",e);return false}}
    else v=loc===undefined?dist:loc;
    if(v===undefined||JSON.stringify(v)===JSON.stringify(loc))return false;P.p1[k]=JSON.parse(JSON.stringify(v));return true}
  function quitter(){const v=COUR&&VUES[COUR.nom];if(v&&typeof v.quitter==="function"){try{v.quitter()}catch(e){log("quitter",e)}}}
  function toastSur(t){try{toast(`<div><b>${esc(t)}</b></div>`)}catch(e){}}
  const mods=()=>Array.isArray(window.P26_MODS)?window.P26_MODS:null;     // fichiers de site/mod (écrit par split.py)
  const existe=f=>{const m=mods();return !m||m.includes(f)};
  function charger(nom){if(!window.P26mod)return Promise.reject(new Error("P26mod absent"));
    if(existe(nom+".css"))window.P26mod.css(nom).catch(()=>{});
    return window.P26mod(nom)}
  // Vue prête : enregistrée, sinon après le préchargement, sinon en chargeant le module du même nom.
  function pret(nom){if(VUES[nom])return Promise.resolve(true);
    return (PRECH||Promise.resolve()).then(()=>VUES[nom]?true:charger(nom).then(()=>!!VUES[nom],()=>false))}
  // Rafraîchit les emplacements déjà affichés quand un module s'y abonne tard (regroupé par tâche).
  const AFAIRE=new Set();let prevu=false;
  function rafraichir(nom){AFAIRE.add(nom);if(prevu)return;prevu=true;
    Promise.resolve().then(()=>{prevu=false;const L=[...AFAIRE];AFAIRE.clear();
      for(const n of L)document.querySelectorAll("[data-slot]").forEach(el=>{if(el.getAttribute("data-slot")===n&&el.isConnected)U.slot(n,el)})})}
  // #m=nom ou #m=nom:arg ; #motif ou #motif=valeur (routes enregistrées, défi, arène, verbes)
  const ANCIENS=new Set(["ligue","duel","arene","invite"]);
  function suivre(h){h=String(h||"").replace(/^#/,"");if(!h)return false;
    let m=/^m=([a-z0-9-]{1,24})(?::([A-Za-z0-9_.-]{0,64}))?$/.exec(h);
    if(m){U.ouvrir(m[1],m[2]||"");return true}
    m=/^([a-z0-9-]{1,24})(?:=([A-Za-z0-9_.:-]{0,64}))?$/.exec(h);if(!m)return false;
    const motif=m[1],val=m[2]===undefined?null:m[2];
    if(ROUTES[motif]){try{ROUTES[motif](val)}catch(e){log("route « "+motif+" »",e)}return true}
    if(val===null&&motif==="defi"){go("ligue");setTimeout(()=>{const d=document.getElementById("lgDefi");if(d&&d.scrollIntoView)d.scrollIntoView({block:"start"})},60);return true}
    if(val===null&&motif==="arene"){go("duel");return true}
    if(val===null&&motif==="verbes"){if(C.ready)go("verbes");else{const off=U.on("contenu",()=>{off();go("verbes")})}return true}
    if(ANCIENS.has(motif)||views.includes(motif))return false;
    // Route d'un module pas encore chargé : on charge le module du même nom, puis on réessaie.
    (PRECH||Promise.resolve()).then(()=>ROUTES[motif]?null:existe(motif+".js")?charger(motif):null).then(()=>{if(ROUTES[motif])suivre("#"+h)},()=>{});
    return true}
  function demarrer(){
    if(location.hash)suivre(location.hash);
    addEventListener("hashchange",()=>suivre(location.hash));
    const L=U.precharger.filter(n=>ID.test(n)&&existe(n+".js"));
    PRECH=new Promise(res=>{const run=()=>Promise.all(L.map(n=>charger(n).catch(()=>null))).then(()=>res());
      if(window.requestIdleCallback)requestIdleCallback(run,{timeout:1500});else setTimeout(run,1500)});
  }
  return U;
})();
window.P26ui=P26ui;

/* ================= OUTILS ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function tex(s){
  return String(s==null?"":s).split(/(\$[^$]+\$)/g).map(p=>{
    if(p.length>2&&p[0]==="$"&&p[p.length-1]==="$"){const t=p.slice(1,-1);
      if(window.katex){try{return window.katex.renderToString(t,{output:"mathml",throwOnError:false})}catch(e){}}
      return "<span class=\"tx\">"+esc(plainTex(t))+"</span>"}
    return esc(p)}).join("");
}
function plainTex(t){const G={alpha:"α",beta:"β",Delta:"Δ",Omega:"Ω",times:"×",leq:"≤",geq:"≥",neq:"≠",emptyset:"∅",cap:"∩",cup:"∪",dots:"…",ldots:"…",infty:"∞"};
  let s=t.replace(/\{,\}/g,",").replace(/\\mathbb\{R\}/g,"ℝ").replace(/\\left\\\{|\\\{/g,"｛").replace(/\\right\\\}|\\\}/g,"｝").replace(/\\approx/g,"≈");for(let i=0;i<4;i++)s=s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,"($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g,"√($1)").replace(/\\overline\{([^{}]*)\}/g,"non-$1");
  return s.replace(/\\(left|right)/g,"").replace(/\\([a-zA-Z]+)/g,(m,w)=>G[w]||w).replace(/\^2/g,"²").replace(/_\{([^{}]*)\}/g,"$1").replace(/\{,\}/g,",").replace(/\\[,;]/g," ").replace(/[{}]/g,"").replace(/\(([A-Za-z0-9])\)\//g,"$1/").replace(/\/\(([A-Za-z0-9])\)/g,"/$1")}
const DEMO=!window.claude?.use;
const STORAGE_PREFIX=DEMO?"p26_demo_":"p26_";
const LS={get(k,d){try{const v=localStorage.getItem(STORAGE_PREFIX+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(STORAGE_PREFIX+k,JSON.stringify(v))}catch(e){}}};
const pad=n=>(n<10?"0":"")+n;
const isoOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const isoOk=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(parseIso(s));
const parseIso=s=>{const p=String(s).split("-");return new Date(+p[0],+p[1]-1,+p[2])};
const EPOCH=new Date(2026,0,1);
const dayNum=d=>Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-EPOCH)/864e5);
const NOW=new Date(), TODAY=dayNum(NOW), TODAY_ISO=isoOf(NOW);
const daysTo=iso=>dayNum(parseIso(iso))-TODAY;
const fmtLong=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const fmtShort=new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"});
const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const SRC={import:"Importé",auto:"Import auto",cours:"Ton cours",pronote:"Cours Pronote",prof:"Doc. du prof",programme:"Programme officiel",verif:"À vérifier"};
const srcBadge=s=>s?`<span class="srcb ${s==="programme"?"programme":s==="verif"?"verif":""}">${esc(SRC[s]||s)}</span>`:"";
function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}

/* ================= CONTENU (db) ================= */
const C={mats:[],M:{},chaps:{},ech:[],etat:null,ready:false,cards:{},qs:{}};
function reindex(){
  C.matsAll=Object.values(C.M).sort((a,b)=>(a.ordre||0)-(b.ordre||0));
  C.mats=C.matsAll.filter(m=>matOn(m.id));if(!C.mats.length)C.mats=C.matsAll;
  C.cards={};C.qs={};
  Object.values(C.chaps).forEach(ch=>{
    (ch.paquets||[]).forEach(p=>(p.cartes||[]).forEach(c=>{C.cards[c.id]={c,ch,p}}));
    (ch.quiz||[]).forEach((s,si)=>(s.qs||[]).forEach(q=>{C.qs[q.id]={q,ch,si}}));
  });
}
const chapsOf=mid=>Object.values(C.chaps).filter(c=>c.mat===mid&&isProg(c)===(srcOf(mid)==="prog")).sort((a,b)=>(a.ordre||0)-(b.ordre||0));
const cardsOfChap=ch=>(ch.paquets||[]).flatMap(p=>p.cartes||[]);
const suitOf=mid=>{const s=C.M[mid]&&C.M[mid].suit;return typeof s==="string"&&/^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\))$/i.test(s)?s:"var(--red)"};
const matName=mid=>(C.M[mid]&&C.M[mid].nom)||mid;

/* ================= PROGRESSION (par compte) ================= */
let P=Object.assign({c:{},q:{},j:{},e:{},f:{}},LS.get("prog",{}));
["c","q","j","e","f","x","t","df","sm","pl","bb","qw","own","buy","gx","p1"].forEach(k=>{if(!P[k]||typeof P[k]!=="object")P[k]={}});
(()=>{const lim=isoOf(new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate()-70));Object.keys(P.sm).forEach(k=>{if(k<lim)delete P.sm[k]});Object.keys(P.qw).forEach(k=>{if(k.slice(0,10)<lim)delete P.qw[k]})})();
let pRef=null,remoteOK=false,pT=null,pBusy=false,pDirty=false;
function saveP(){LS.set("prog",P);pDirty=true;clearTimeout(pT);pT=setTimeout(flushP,1200)}
async function flushP(){
  if(!pRef||!remoteOK||pBusy||!pDirty)return;
  pBusy=true;pDirty=false;
  try{await pRef.set(JSON.parse(JSON.stringify(P)))}catch(e){if(e&&(e.code==="invalid_argument"||e.code==="revoked"||e.code==="not_granted")){remoteOK=false;setSync();if(!IMP.isOwner)guestOn(true)}else pDirty=true}
  pBusy=false;if(pDirty)setTimeout(flushP,1500);
}
function mergeP(r){
  if(!r)return false;let ch=false;
  Object.entries(r.c||{}).forEach(([k,v])=>{const m=P.c[k];if(Array.isArray(v)&&(!m||(v[2]||0)>(m[2]||0))){P.c[k]=v;ch=true}});
  Object.entries(r.q||{}).forEach(([k,v])=>{if(typeof v==="number"&&!(P.q[k]>=v)){P.q[k]=v;ch=true}});
  Object.entries(r.j||{}).forEach(([k,v])=>{if(typeof v==="number"&&!(P.j[k]>=v)){P.j[k]=v;ch=true}});
  Object.entries(r.f||{}).forEach(([k,v])=>{if(!(k in P.f)){P.f[k]=v;ch=true}});
  Object.entries(r.e||{}).forEach(([k,v])=>{if(!(k in P.e)){P.e[k]=v;ch=true}});
  Object.entries(r.x||{}).forEach(([k,v])=>{if(typeof v==="number"&&!(P.x[k]>=v)){P.x[k]=v;ch=true}});
  Object.entries(r.t||{}).forEach(([k,v])=>{if(!(k in P.t)){P.t[k]=v;ch=true}});
  Object.entries(r.df||{}).forEach(([k,v])=>{if(!(k in P.df)&&v&&typeof v==="object"){P.df[k]=v;ch=true}});
  if(typeof r.fz==="number"&&!(P.fz>=r.fz)){P.fz=r.fz;ch=true}
  if(r.dos&&!P.dos){P.dos=r.dos;ch=true}
  if(r.pf&&typeof r.pf==="object"&&!P.pf){P.pf=r.pf;ch=true}
  if(r.cls&&typeof r.cls==="object"&&!P.cls){P.cls=r.cls;ch=true}
  ["srcm","hide"].forEach(k=>{if(r[k]&&typeof r[k]==="object"){P[k]=P[k]||{};Object.entries(r[k]).forEach(([a,v])=>{if(!(a in P[k])){P[k][a]=v;ch=true}})}});
  if(r.sk&&typeof r.sk==="object"&&!P.sk){P.sk=r.sk;ch=true}
  ["own","buy","gx"].forEach(k=>{if(r[k]&&typeof r[k]==="object")Object.entries(r[k]).forEach(([a,v])=>{if(!(a in P[k])){P[k][a]=v;ch=true}})});
  if(typeof r.ownXP==="number"&&r.ownXP>(P.ownXP||0)){P.ownXP=r.ownXP;ch=true}
  if(!r.ownV&&typeof grandfather==="function"){const t=P.ownXP>0?P.ownXP:totalXP();grandfather(t);P.ownXP=t;ch=true}
  if(r.rw&&typeof r.rw==="object"){P.rw=P.rw||{};Object.entries(r.rw).forEach(([k,v])=>{if(!(k in P.rw)){P.rw[k]=v;ch=true}})}
  if(r.dc&&typeof r.dc==="object"){P.dc=P.dc||{};Object.entries(r.dc).forEach(([k,v])=>{if(!(k in P.dc)){P.dc[k]=v;ch=true}})}
  if(typeof r.fc==="number"&&!(P.fc>=r.fc)){P.fc=r.fc;ch=true}
  if(typeof r.sz==="string"&&(!P.sz||P.sz<r.sz)){P.sz=r.sz;ch=true}
  if(Array.isArray(r.dsn)&&!P.dsn){P.dsn=r.dsn;ch=true}
  Object.entries(r.sm||{}).forEach(([d,o])=>{if(!o||typeof o!=="object")return;const m=P.sm[d]=P.sm[d]||{};Object.entries(o).forEach(([k,v])=>{if(typeof v==="number"&&!(m[k]>=v)){m[k]=v;ch=true}})});
  Object.entries(r.pl||{}).forEach(([k,v])=>{if(!(k in P.pl)){P.pl[k]=v;ch=true}});
  Object.entries(r.qw||{}).forEach(([k,v])=>{if(v&&typeof v==="object"&&!P.qw[k]){P.qw[k]=v;ch=true}});
  Object.entries(r.bb||{}).forEach(([k,v])=>{if(v&&typeof v==="object"&&(!P.bb[k]||(v.s>P.bb[k].s))){P.bb[k]=v;ch=true}});
  ["theme","oral","cal"].forEach(k=>{if(typeof r[k]==="string"&&P[k]==null){P[k]=r[k];ch=true}});
  if(Array.isArray(r.mats)&&!P.mats){P.mats=r.mats;ch=true}
  if(r.lg&&typeof r.lg==="object"){if(!P.lg){P.lg=r.lg;ch=true}else{const a=P.lg.codes||[];(r.lg.codes||[]).forEach(c=>{if(!a.includes(c)){a.push(c);ch=true}});P.lg.codes=a;P.lg.mine=Object.assign({},r.lg.mine||{},P.lg.mine||{});["left","joined"].forEach(k=>{P.lg[k]=P.lg[k]||{};Object.entries(r.lg[k]||{}).forEach(([c,t])=>{if(t>(P.lg[k][c]||0)){P.lg[k][c]=t;ch=true}})})}}
  ch=P26ui._mergeP(r)||ch;
  return ch;
}
let JT=0;const jrn=(q,ok,ms,m)=>{try{if(window.P26&&window.P26.journal)window.P26.journal.add(q,ok,ms,m)}catch(e){}P26ui.emit("reponse",{q,ok,ms,mode:m})};const jms=()=>JT?Date.now()-JT:null;
const IV=[0,1,3,7,21,45];
const boxOf=id=>(P.c[id]?P.c[id][0]:-1);
const isDue=id=>!P.c[id]||P.c[id][1]<=TODAY;
function tickMat(m){if(!m)return;const d=P.sm[TODAY_ISO]=P.sm[TODAY_ISO]||{};d[m]=(d[m]||0)+1}
function answerCard(id,ok){
  tickMat(C.cards[id]&&C.cards[id].ch.mat);
  const c=P.c[id]||[0,TODAY,0];const b=ok?Math.min((P.c[id]?c[0]:0)+1,5):0;
  P.c[id]=[b,TODAY+(ok?IV[b]:1),Date.now()];tickDay();saveP();gainXP(ok?2:1);
}
function tickDay(){P.j[TODAY_ISO]=(P.j[TODAY_ISO]||0)+1}
function stats(cards){let m=0,g=0;cards.forEach(c=>{const b=boxOf(c.id);if(b>=3)m++;else if(b>=1)g++});return {m,g,n:cards.length}}
function gaugeHTML(st,extra){const n=st.n||1;
  if(st.n&&!(st.m+st.g))return `<div class="gauge zero">Pas encore joué · <b>${st.n} cartes</b> à découvrir${extra||""}</div>`;
  return `<div class="gauge"><span class="bar"><i class="m" style="width:${st.m/n*100}%"></i><i class="g" style="width:${st.g/n*100}%"></i></span><span>${st.n?Math.round((st.m+st.g)/n*100)+" %":"aucune carte"}${extra||""}</span></div>`}

/* ================= TAPIS TEINTÉ ================= */
const EASE_OUT="cubic-bezier(0.23,1,0.32,1)";
function tint(hex,k){const n=parseInt(String(hex).replace("#",""),16);if(isNaN(n))return null;const f=x=>Math.round(x+(255-x)*k);return "rgb("+f(n>>16&255)+","+f(n>>8&255)+","+f(n&255)+")"}
const isLight=()=>document.body.dataset.theme==="clair";
function shade(hex,k){const n=parseInt(String(hex).replace("#",""),16);if(isNaN(n))return null;const r=n>>16&255,g=n>>8&255,b=n&255,f=x=>Math.round(x*(1-k));return "rgb("+f(r)+","+f(g)+","+f(b)+")"}
let dyeMat=null,dyeFlip=false;
function currentMat(){
  if(view==="jeu")return sel.mat&&sel.mat[0]!=="@"?sel.mat:null;
  if(view==="cours")return sel.mat&&sel.mat[0]!=="@"?sel.mat:null;
  if(view==="duel"){if(OL.game&&C.chaps[OL.game.cid])return C.chaps[OL.game.cid].mat;if(inDuel&&dCh&&C.chaps[dCh])return C.chaps[dCh].mat;return inDuel?null:duelMat}
  return null;
}
function applyTint(from){
  const m=C.ready?currentMat():null;if(m===dyeMat)return;dyeMat=m;
  const a=$("#dyeA"),b=$("#dyeB");if(!a)return;
  const hex=m&&C.M[m]&&C.M[m].suit;
  if(!hex){a.classList.remove("on");b.classList.remove("on");return}
  const next=dyeFlip?a:b,prev=dyeFlip?b:a;dyeFlip=!dyeFlip;
  next.style.background=isLight()?`radial-gradient(130% 70% at 50% 0%,${tint(hex,.9)} 0%,${tint(hex,.84)} 45%,${tint(hex,.76)} 100%)`:`radial-gradient(130% 70% at 50% 0%,${shade(hex,.42)} 0%,${shade(hex,.6)} 45%,${shade(hex,.74)} 100%)`;
  next.style.zIndex="1";prev.style.zIndex="0";
  if(from&&!reduce&&next.animate){
    const r=from.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
    next.style.transition="none";next.classList.add("on");void next.offsetWidth;next.style.transition="";
    const a=next.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${R}px at ${x}px ${y}px)`}],{duration:520,easing:"cubic-bezier(0.77,0,0.175,1)"});
    a.onfinish=()=>{if(next.classList.contains("on"))prev.classList.remove("on")};return}
  next.classList.add("on");prev.classList.remove("on");
}
function enter(el,delay){if(reduce||!el||!el.animate)return null;return el.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:220,delay:delay||0,easing:EASE_OUT,fill:"backwards"})}

/* ================= NAVIGATION ================= */
const views=["table","jeu","duel","cours","fiches","profil","ligue","import","clubs","quetes","admin","verbes","notifs","mod"];
const ADM=()=>!!(IMP&&IMP.isOwner&&LS.get("adm",false));
let view="table";
function go(v){if(!views.includes(v))v="table";if(v==="admin"&&!ADM())v="profil";if(v==="admin")AD.need=true;if(view==="clubs"&&v!=="clubs")clubStop();if(view==="quetes"&&v!=="quetes")EX.quest=null;if(v==="mod"&&!P26ui._vueCourante())v="table";if(view==="mod"&&v!=="mod")P26ui._quitter();P26ui._go(view);view=v;document.body.dataset.view=v;views.forEach(x=>$("#v-"+x).hidden=x!==v);
  document.querySelectorAll("nav.dock button").forEach(b=>{if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  if(!["import","profil","admin","verbes","notifs","mod"].includes(v))LS.set("view",v);if(v!=="verbes")clearInterval(VB.timer);window.scrollTo(0,0);render();enter($("#v-"+v));dockTo(v);P26ui.emit("vue",v)}
function dockTo(v){const d=$("nav.dock div"),hl=$("#dockHl");if(!d||!hl)return;const b=d.querySelector(`button[data-v="${v}"]`);if(!b){hl.style.clipPath="inset(0 100% 0 0 round 999px)";return}
  const r=hl.getBoundingClientRect(),q=b.getBoundingClientRect();hl.style.clipPath=`inset(0 ${Math.max(0,r.right-q.right)}px 0 ${Math.max(0,q.left-r.left)}px round 999px)`}
addEventListener("resize",()=>dockTo(view));
document.querySelectorAll("nav.dock button").forEach(b=>b.onclick=()=>go(b.dataset.v));
function render(){if(view==="clubs")renderClubs();else if(view==="quetes"){if(!EX.quest)renderQuetes()}else if(view==="table")renderTable();else if(view==="jeu")renderJeuPicks();else if(view==="duel"){if(!inDuel&&!BB.on)renderSeries()}else if(view==="ligue"){if(!LG.defi)renderLigue()}else if(view==="import"){if(IMPV.need){IMPV.need=false;renderImport()}}else if(view==="fiches"){if(!((FI.mode==="new"&&$("#fnGo"))||(FI.mode==="preview"&&$("#fpSave"))))renderFiches()}else if(view==="profil"){renderProfil()}else if(view==="admin"){if(AD.need){AD.need=false;renderAdmin()}}else if(view==="verbes"){if(!VB.q)renderVerbes()}else if(view==="notifs"){renderNotifs()}else if(view==="mod"){P26ui._rendre()}else renderCours();applyTint();paintMyAv()}

/* ================= TABLE ================= */
const EVAL=t=>t==="controle"||t==="oral";
const CTRL=t=>t==="controle";
function chapStats(ids){return stats((ids||[]).flatMap(id=>C.chaps[id]?cardsOfChap(C.chaps[id]):[]))}
function bestFor(ids){let b=null;(ids||[]).forEach(id=>{const ch=C.chaps[id];if(!ch)return;(ch.quiz||[]).forEach((s,si)=>{const v=P.q[id+"#"+si];if(v!=null&&(b==null||v>b))b=v})});return b}
function dateBlock(iso){const d=parseIso(iso),n=daysTo(iso);
  return `<b>${n===0?"Auj.":n===1?"Dem.":"J-"+n}</b><small>${["dim.","lun.","mar.","mer.","jeu.","ven.","sam."][d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}</small>`}
let tableShown=false;
function solari(){if(reduce)return;[...document.querySelectorAll("#today .jj, #evs .ev .d b")].slice(0,4).forEach((el,i)=>{if(el.animate)el.animate([{transform:"perspective(300px) rotateX(90deg)",opacity:.2},{transform:"perspective(300px) rotateX(-12deg)",opacity:1,offset:.7},{transform:"none"}],{duration:420,delay:120+i*90,easing:EASE_OUT,fill:"backwards"})})}
function renderTable(){
  renderExtras();
  $("#tDate").textContent=fmtLong.format(NOW);
  const bn=$("#banner");
  if(!C.ready){bn.className="banner";bn.innerHTML=`<i></i><span>${dbState==="off"?"Ouvre la page depuis claude.ai, connecté, pour charger tes cartes.":"Chargement du paquet…"}</span>`;
    if(dbState==="off"){document.body.classList.add("off");const t=$("#today");t.className="today";t.removeAttribute("aria-label");t.innerHTML=`<h2>Connecte-toi</h2><p>Tes cartes et ta progression sont rangées dans ton compte Claude. Ouvre cette page depuis claude.ai, connecté, et tout réapparaît.</p>`}
    return}
  const pr=C.etat&&C.etat.pronote;
  if(!IMP.isOwner){bn.className="banner";bn.innerHTML="<i></i><span>Tes contrôles et devoirs viennent de tes imports.</span>"}
  else if(pr&&pr.date){const d=new Date(pr.date),age=TODAY-dayNum(d);
    bn.className="banner"+(pr.ok===false?" bad":age>=3?" old":"");
    bn.innerHTML=`<i></i><span>${pr.ok===false?esc(pr.msg||"Pronote n’a pas pu être relu."):"Pronote relu le "+d.getDate()+" "+MOIS[d.getMonth()]+" à "+d.getHours()+" h "+pad(d.getMinutes())+(age>=3?". Dis-moi « mets à jour ».":"")}</span>`}
  else {bn.className="banner";bn.innerHTML="<i></i><span>Contrôles et devoirs : ceux du hub, plus tes imports.</span>"}
  renderToday();
  const up=C.ech.filter(e=>e.date>=TODAY_ISO).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const evs=up.filter(e=>EVAL(e.type)),hws=up.filter(e=>!EVAL(e.type));
  $("#evCount").textContent=evs.length?evs.length+" à venir":"";
  const groups=[];evs.forEach(e=>{let g=groups[groups.length-1];if(!g||g.date!==e.date){g={date:e.date,items:[]};groups.push(g)}g.items.push(e)});
  const JR=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
  $("#evs").innerHTML=groups.length?groups.map(g=>{const d=parseIso(g.date),n=daysTo(g.date);
    return `<div class="evday${n<=7?" soon":""}"><div class="evd"><b>${n===0?"Auj.":n===1?"Dem.":"J-"+n}</b><small>${JR[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}</small>${g.items.length>1?`<em>${g.items.length} épreuves</em>`:""}</div><div class="evl">${g.items.map(e=>{const st=chapStats(e.chap),b=bestFor(e.chap);
      return `<button class="ev2" type="button" data-ch="${esc((e.chap||[])[0]||"")}" data-m="${esc(e.mat)}" style="--suit:${suitOf(e.mat)}"><span class="m"><i></i>${esc(matName(e.mat))}${e.type==="oral"?'<span class="kind">oral</span>':""}</span><b>${esc(e.titre)}${e.partage?` <span class="via">via ${esc(e.auteur||"ta ligue")}</span>`:""}</b>${CTRL(e.type)&&(e.chap||[]).length?gaugeHTML(st,b!=null?" · duel "+b+"/10":""):""}</button>`}).join("")}</div></div>`}).join("")
    :`<p class="muted" style="margin:0">Aucun contrôle relevé sur Pronote.</p>`;
  $("#evs").querySelectorAll(".ev2").forEach(b=>b.onclick=()=>{if(b.dataset.ch){sel.mat=b.dataset.m;sel.chap=b.dataset.ch;sel.paq="*";go("jeu");startPile()}else go("jeu")});
  $("#hwCount").textContent=hws.length?hws.filter(h=>!P.f[h.id]).length+" à faire":"";
  $("#hws").innerHTML=hws.length?hws.map(h=>{const n=daysTo(h.date);
    return `<label class="hw${P.f[h.id]?" done":""}"><input type="checkbox" data-id="${esc(h.id)}"${P.f[h.id]?" checked":""}><span class="t"><b>${esc(matName(h.mat))}</b> · ${esc(h.titre)}${typeof h.lien==="string"&&/^https:\/\//i.test(h.lien)?` · <a href="${esc(h.lien)}" target="_blank" rel="noopener noreferrer">énoncés</a>`:""}<span class="m">Pour ${n===0?"aujourd’hui":n===1?"demain":fmtShort.format(parseIso(h.date))}</span></span></label>`}).join("")
    :`<p class="muted" style="margin:0">Rien à rendre d’après Pronote.</p>`;
  $("#hws").querySelectorAll("input").forEach(i=>i.onchange=()=>{if(i.checked)P.f[i.dataset.id]=1;else delete P.f[i.dataset.id];saveP();renderTable()});
  $("#mats").innerHTML=C.mats.map(m=>{const cs=chapsOf(m.id),st=stats(cs.flatMap(cardsOfChap)),w=st.m+st.g,p=st.n?w/st.n:0;
    return `<button class="mcard${st.n?"":" none"}" type="button" data-m="${esc(m.id)}" style="--suit:${m.suit};--p:${p.toFixed(3)}" aria-label="${esc(m.nom)} : ${w} cartes gagnées sur ${st.n}" title="${esc(m.nom)}"><span class="mi">${esc(m.court||m.nom)}</span><span class="mn">${w}<small>/${st.n}</small></span><span class="ml">${st.n?(w?Math.round(p*100)+" %":"à jouer"):"bientôt"}</span></button>`}).join("");
  $("#mats").querySelectorAll(".mcard").forEach(b=>b.onclick=()=>{sel.mat=b.dataset.m;sel.chap=null;sel.paq="*";go("cours")});
  if(!tableShown){tableShown=true;solari();[...document.querySelectorAll("#evs .evday, #hws .hw, #mats .mcard")].slice(0,16).forEach((el,i)=>enter(el,60+i*35))}
  renderCal();renderCountdown();renderPlan();renderWeak();renderWeek();P26ui.slot("accueil",document.querySelector('#v-table [data-slot="accueil"]'));
  let s=0;for(let i=0;i<400;i++){const d=new Date(NOW);d.setDate(d.getDate()-i);if(P.j[isoOf(d)])s++;else if(i>0)break}
  $("#streak").innerHTML=s?`<b>${s}</b> soir${s>1?"s":""} de suite`:"Joue une donne ce soir pour lancer ta série.";
}
function renderCal(){
  const y=NOW.getFullYear(),mo=NOW.getMonth(),nd=new Date(y,mo+1,0).getDate(),off=(new Date(y,mo,1).getDay()+6)%7;
  const vac=((C.etat&&C.etat.vacances)||[]).filter(v=>Array.isArray(v)&&v[0]&&v[1]);
  const inVac=iso=>vac.some(v=>iso>=v[0]&&iso<=v[1]);
  $("#calMonth").textContent=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"][mo]+" "+y;
  let h=["L","M","M","J","V","S","D"].map(x=>`<span>${x}</span>`).join("");
  for(let i=0;i<off;i++)h+=`<i class="blank" aria-hidden="true"></i>`;
  for(let dd=1;dd<=nd;dd++){const d=new Date(y,mo,dd),iso=isoOf(d),v=P.j[iso]||0,fut=iso>TODAY_ISO;
    const c=[fut?"fut":v>=40?"l3":v>=15?"l2":v>0?"l1":"",iso===TODAY_ISO?"today":"",fut&&inVac(iso)?"vac":""].filter(Boolean).join(" ");
    h+=`<i class="${c}" title="${dd} ${MOIS[mo]} : ${v} carte${v>1?"s":""}">${dd}</i>`}
  $("#nights").innerHTML=h;
}
function renderToday(){
  const box=$("#today");const donne=buildDonne();
  const next=C.ech.filter(e=>CTRL(e.type)&&e.date>=TODAY_ISO&&daysTo(e.date)<=7&&(e.chap||[]).length).sort((a,b)=>a.date<b.date?-1:1)[0];
  const sem=(IMP.isOwner&&C.etat&&C.etat.semaine&&C.etat.semaine[String(NOW.getDay())])||[];
  const semTxt=sem.length?"Au programme ce soir : "+sem.map(matName).join(", ")+".":"";
  if(next){const n=daysTo(next.date);
    const steps=[["J-7 à J-4","Cartes du chapitre, tous les paquets",n>=4],["J-3 et J-2","Duels du chapitre jusqu’à 9/10",n===2||n===3],["J-1","Pile des erreurs, puis relecture du Cours",n===1],["Jour J","Relis les cartes de cours, rien de nouveau",n===0]];
    box.className="today";box.removeAttribute("aria-label");
    box.innerHTML=`<span class="jj">${n===0?"J":"J-"+n}</span><h2>${esc(next.titre)}</h2><p class="meta">Veille de contrôle · ${esc(matName(next.mat))} <span>· ${fmtLong.format(parseIso(next.date))}</span></p>
     <ul class="steps">${steps.map(s=>`<li class="${s[2]?"on":""}"><b>${s[0]}</b> · ${s[1]}</li>`).join("")}</ul>
     <div class="go"><button class="btn" type="button" id="goFocus">${n>=4?"Jouer le chapitre":n>=2?"Lancer le duel":n===1?"Pile des erreurs":"Relire le cours"}</button><button class="btn soft" type="button" id="goDonne">Donne du soir · ${donne.length}</button><button class="btn text" type="button" id="goFocusMode">Mode focus</button></div>`;
    $("#goFocus").onclick=()=>{const ch=(next.chap||[])[0];sel.mat=next.mat;sel.chap=ch;sel.paq="*";
      if(n>=4){go("jeu");startPile()}else if(n>=2){duelMat=next.mat;go("duel")}else if(n===1){sel.mat="@err";go("jeu");startPile()}else go("cours")};
  } else {
    box.className="today";box.removeAttribute("aria-label");
    box.innerHTML=`<h2>Donne du soir</h2><p class="meta">25 min <span>· ${donne.length} carte${donne.length>1?"s":""}${sem.length?" · "+esc(sem.map(m=>(C.M[m]&&C.M[m].court)||m).join(", ")):""}</span></p><p>${donne.length?"Celles à revoir aujourd’hui d’abord, puis des nouvelles, en priorité sur les matières du soir.":"Aucune carte à revoir ce soir. Lance un duel ou avance dans un chapitre."}</p>
     <div class="go"><button class="btn" type="button" id="goDonne">Tirer la donne</button><button class="btn soft" type="button" id="goQuick">5 minutes</button><button class="btn text" type="button" id="goFocusMode">Mode focus</button><button class="btn text" type="button" id="goDuel">Duel</button></div>`;
    $("#goQuick").onclick=()=>focusOn(true);
    $("#goDuel").onclick=()=>go("duel");
  }
  $("#goDonne").onclick=()=>{sel.mat="@donne";go("jeu");startPile()};
  $("#goFocusMode").onclick=()=>focusOn(false);
}
function buildDonne(){
  if(!C.ready)return [];
  const focus=new Set(),focusMat=new Set();
  C.ech.forEach(e=>{if(CTRL(e.type)&&e.date>=TODAY_ISO&&daysTo(e.date)<=7)(e.chap||[]).forEach(id=>focus.add(id))});
  ((IMP.isOwner&&C.etat&&C.etat.semaine&&C.etat.semaine[String(NOW.getDay())])||[]).forEach(m=>focusMat.add(m));
  const all=Object.values(C.cards).filter(x=>matOn(x.ch.mat)&&isProg(x.ch)===(srcOf(x.ch.mat)==="prog"));
  const reviews=all.filter(x=>P.c[x.c.id]&&isDue(x.c.id)).sort((a,b)=>P.c[a.c.id][1]-P.c[b.c.id][1]);
  const fresh=all.filter(x=>!P.c[x.c.id]);
  const f1=fresh.filter(x=>focus.has(x.ch.id)),f2=fresh.filter(x=>!focus.has(x.ch.id)&&focusMat.has(x.ch.mat));
  const out=[],seen=new Set();
  const f3=IMP.isOwner?[]:fresh.filter(x=>!focus.has(x.ch.id)).sort((a,b)=>(b.ch.ordre||0)-(a.ch.ordre||0));
  [...reviews,...f1,...f2,...f3].forEach(x=>{if(out.length<30&&!seen.has(x.c.id)){seen.add(x.c.id);out.push(x.c.id)}});
  return out;
}

/* ================= JEU ================= */
const sel={mat:LS.get("mat","@donne"),chap:null,paq:"*"};
let pile=[],cur=null,flipped=false,sessionN=0,donneIds=null;
function errCards(){return Object.keys(P.e).filter(id=>C.qs[id]).map(id=>{const x=C.qs[id];const q=x.q;
  return {id:"err:"+id,qid:id,r:q.q,v:q.ok+(q.why?" · "+q.why:""),q:"Retrouve la bonne réponse",i:["!","Erreur"],ch:x.ch}})}
function pickRow(el,items,cur,cb){el.innerHTML=items.map(it=>`<button type="button" class="${it.k===cur?"on":""}" data-k="${esc(it.k)}" style="--suit:${it.suit||"var(--red)"}">${it.dot?'<span class="dot"></span>':""}${esc(it.l)}</button>`).join("");el.hidden=!items.length;
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>{cb(b.dataset.k);applyTint(b)})}
function renderJeuPicks(){
  if(!C.ready){$("#stage").innerHTML=`<div class="empty"><h2>Un instant</h2><p>${dbState==="off"?"Ouvre la page depuis claude.ai, connecté, pour charger tes cartes.":"Je distribue les cartes…"}</p></div>`;$("#ctrl").style.visibility="hidden";return}
  P26ui.slot("jeu",document.querySelector('#v-jeu [data-slot="jeu"]'));
  const mats=[...(QUICK.on?[{k:"@cinq",l:(QUICK.min||5)+" minutes"}]:[]),{k:"@donne",l:"Donne du soir"},{k:"@faibles",l:"Points faibles · "+weakCards().length},{k:"@err",l:"Erreurs · "+errCards().length},...C.mats.filter(m=>Object.values(C.chaps).some(c=>c.mat===m.id&&cardsOfChap(c).length)).map(m=>({k:m.id,l:m.court||m.nom,suit:m.suit,dot:1}))];
  pickRow($("#jMat"),mats,sel.mat,k=>{sel.mat=k;sel.chap=null;sel.paq="*";LS.set("mat",k);renderJeuPicks();startPile()});
  if(sel.mat==="@cinq"&&!QUICK.on)sel.mat="@donne";
  srcSeg($("#jSrc"),sel.mat,()=>{sel.chap=null;sel.paq="*";renderJeuPicks();startPile()});
  if(sel.mat[0]==="@"){$("#jChap").hidden=true;$("#jPaq").hidden=true}
  else{const chs=chapsOf(sel.mat).filter(c=>cardsOfChap(c).length);
    if(!sel.chap||!chs.find(c=>c.id===sel.chap))sel.chap=chs[0]?chs[0].id:null;
    pickRow($("#jChap"),chs.length>1?chs.map(c=>({k:c.id,l:c.court||c.titre})):[],sel.chap,k=>{sel.chap=k;sel.paq="*";renderJeuPicks();startPile()});
    const ch=C.chaps[sel.chap];const ps=ch?(ch.paquets||[]).filter(p=>(p.cartes||[]).length):[];
    pickRow($("#jPaq"),ps.length>1?[{k:"*",l:"Tout"},...ps.map(p=>({k:p.k,l:p.nom}))]:[],sel.paq,k=>{sel.paq=k;renderJeuPicks();startPile()});
  }
  if(!cur&&!pile.length)startPile();else counts();
}
function selection(){
  if(sel.mat==="@donne")return (donneIds||buildDonne()).filter(id=>C.cards[id]).map(id=>C.cards[id].c);
  if(sel.mat==="@err")return errCards();
  if(sel.mat==="@faibles")return weakCards().map(x=>x.c);
  if(sel.mat==="@cinq")return (QUICK.ids||[]).filter(id=>C.cards[id]).map(id=>C.cards[id].c);
  const ch=C.chaps[sel.chap];if(!ch)return [];
  return (ch.paquets||[]).filter(p=>sel.paq==="*"||p.k===sel.paq).flatMap(p=>p.cartes||[]);
}
function startPile(all){
  if(!C.ready)return;
  if(sel.mat==="@donne")donneIds=buildDonne();
  const cs=selection();
  pile=sel.mat==="@donne"||sel.mat==="@cinq"?cs.slice():shuffle(sel.mat==="@err"||sel.mat==="@faibles"||all?cs:cs.filter(c=>isDue(c.id)));
  sessionN=0;nextCard(pile.length>=3);
}
function fanDeal(pl){
  const st=$("#stage");if(reduce||!st||!pl||!pl.animate)return false;
  const n=7,cs=[];for(let i=0;i<n;i++){const d=document.createElement("div");d.className="fanc"+(i%2?" r":"");st.appendChild(d);cs.push(d)}
  pl.style.opacity="0";
  cs.forEach((d,i)=>{const a=(i-(n-1)/2)*10;d.animate([{transform:"translateY(60px) rotate(0deg)",opacity:0},{transform:`rotate(${a}deg) translateY(-30px)`,opacity:1,offset:.45},{transform:`rotate(${a}deg) translateY(-30px)`,opacity:1,offset:.7},{transform:"translateY(8px) rotate(0deg)",opacity:0}],{duration:1150,delay:i*40,easing:EASE_OUT,fill:"both"}).onfinish=()=>d.remove()});
  setTimeout(()=>{pl.style.opacity="";pl._a=pl.animate([{opacity:0,transform:"translateY(14px) scale(.97)"},{opacity:1,transform:"none"}],{duration:240,easing:EASE_OUT})},1050);
  return true;
}
function metaOf(c){if(c.ch)return {ch:c.ch,p:{nom:"Erreurs"}};const x=C.cards[c.id];return x?{ch:x.ch,p:x.p}:{ch:null,p:{}}}
function counts(){
  const cs=selection();const st=sel.mat==="@err"?{m:0,g:0,n:cs.length}:stats(cs);
  $("#cLeft").textContent=(pile.length+(cur?1:0))+" dans la pioche";
  $("#cWon").textContent=sel.mat==="@err"?cs.length+" erreurs":(st.m+st.g)+" / "+st.n+" gagnées";
}
function idxOf(c,ch){if(c.i)return c.i;const w=String(c.r).replace(/\$[^$]*\$/g,"").replace(/[«»"()]/g,"").trim();const L=w.split(/\s+/).filter(x=>x.length>2).map(x=>x[0]).join("").slice(0,2).toUpperCase();return [L||((ch&&C.M[ch.mat]&&C.M[ch.mat].court)||"§").slice(0,1),ch?(ch.court||""):""]}
function cardHTML(c){
  const {ch,p}=metaOf(c);const suit=suitOf(ch&&ch.mat);const ix=idxOf(c,ch);const src=c.s||(ch&&ch.src);
  return `<div class="play" id="play" style="--suit:${suit}" tabindex="0" aria-label="Carte, touche pour retourner"><div class="inner">
  <div class="face"><div class="idx">${esc(ix[0])}<small>${esc(ix[1])}</small></div>
   <div class="mid"><div class="role">${esc(ch?matName(ch.mat):"")} · ${esc(p.nom||"")}</div><span class="big">${tex(c.r)}</span><span class="hint">${esc(c.q||"Dis la réponse, puis retourne")}</span></div>
   <div class="idx bot">${esc(ix[0])}<small>${esc(ix[1])}</small></div>
   <span class="tag yes" id="tYes">JE SAIS</span><span class="tag no" id="tNo">À REVOIR</span></div>
  <div class="face backf"><div class="anstitle">${tex(c.r)}</div><p class="ans">${tex(c.v)}</p>${c.n?`<p class="qsrc">${esc(c.n)}</p>`:""}${c.w?`<p class="warn">${esc(c.w)}</p>`:""}
   <div class="foot">${srcBadge(src)}</div>
   <div class="idx bot">${esc(ix[0])}<small>${esc(ix[1])}</small></div></div>
 </div></div>`;
}
function nextCard(fan){
  cur=pile.shift()||null;JT=Date.now();flipped=false;$("#bRep").hidden=true;$("#bExp").hidden=true;$("#repBox").innerHTML="";$("#oralBox").innerHTML="";if(EXPL.ctl)EXPL.ctl.abort();
  if(FOCUS&&fOver()){if(cur)pile.unshift(cur);cur=null;focusEnd();return}
  if(blocOver()){showPause();return}
  if(!cur&&FOCUS){focusEnd();return}
  if(!cur){
    const cs=selection();const left=sel.mat==="@err"?cs.length:cs.filter(c=>isDue(c.id)).length;
    const msg=sel.mat==="@donne"?["Donne terminée","Tu as joué toutes les cartes de ce soir. Un duel pour finir ?"]:sel.mat==="@faibles"?["Plus de point faible","Toutes tes cartes ratées sont rattrapées. Bravo."]:sel.mat==="@err"?["Pile vide","Aucune erreur en attente. Tes duels en remettront."]:left?["Pioche vide","Il reste "+left+" cartes à revoir : reprends-les."]:["Rien à revoir","Tu as joué tout ce qui tombe aujourd’hui dans ce paquet."];
    const won=sessionN>0&&(sel.mat==="@donne"||(sel.mat[0]!=="@"&&cs.length&&cs.every(c=>boxOf(c.id)>=1)));
    $("#stage").innerHTML=(won?'<canvas class="casc" id="casc"></canvas>':"")+`<div class="empty"><h2>${won&&sel.mat!=="@donne"?"Paquet gagné":msg[0]}</h2><p>${msg[1]}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${sel.mat[0]!=="@"&&cs.length?`<button class="btn light" type="button" id="again">Rejouer tout le paquet</button>`:""}<button class="btn ghost" type="button" id="toDuel">Lancer un duel</button></div></div>`;
    if($("#again"))$("#again").onclick=()=>startPile(true);$("#toDuel").onclick=()=>{if(sel.mat[0]!=="@")duelMat=sel.mat;go("duel")};
    $("#ctrl").style.visibility="hidden";counts();if(won)cascade($("#casc"));return}
  $("#ctrl").style.visibility="visible";
  $("#stage").innerHTML=(pile.length>1?'<div class="back-deck"></div>':"")+(pile.length?'<div class="back-deck b2"></div>':"")+cardHTML(cur);
  const pl=$("#play");bindDrag(pl);counts();
  const bd=$("#stage .back-deck");if(bd){const n=Math.min(pile.length,22),sh=[];for(let i=1;i<=n;i++)sh.push(`0 ${i*1.3}px 0 ${i%2?"#E9E7DF":"#C9C6BC"}`);sh.push("0 10px 26px -14px rgba(0,0,0,.7)");bd.style.boxShadow=sh.join(",")}
  if(ORAL.on)oralCard();P26ui.emit("carte",{cur,el:$("#stage")});
  if(fan&&fanDeal(pl))return;
  if(!reduce&&pl.animate)pl._a=pl.animate([{opacity:0,transform:"translateY(14px) scale(.97)"},{opacity:1,transform:"none"}],{duration:240,easing:EASE_OUT});
}
function cascade(cv){
  if(!cv||reduce)return;const ctx=cv.getContext("2d");const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);cv.width=r.width*dpr;cv.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=r.width,H=r.height,cw=36,ch=50,deck=selection().slice(0,8),suit=suitOf(sel.mat[0]==="@"?null:sel.mat);let k=0,cur=null,t0=performance.now(),tEnd=performance.now()+5200;
  const launch=()=>{if(k>=8)return null;const c=deck[k%Math.max(deck.length,1)];k++;return {x:W*.12+(k%6)*W*.15,y:10,vx:(k%2?1:-1)*(1.8+Math.random()*2),vy:-Math.random()*2,s:c?idxOf(c,null)[0]:"♠"}};
  cur=launch();
  (function step(){if(!cur||performance.now()>tEnd||!cv.isConnected)return;cur.vy+=.35;cur.x+=cur.vx;cur.y+=cur.vy;if(cur.y>H-ch/2){cur.y=H-ch/2;cur.vy*=-.78}
    ctx.fillStyle="#FAFAF7";ctx.strokeStyle="rgba(0,0,0,.18)";ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cur.x-cw/2,cur.y-ch/2,cw,ch,5);else ctx.rect(cur.x-cw/2,cur.y-ch/2,cw,ch);ctx.fill();ctx.stroke();
    ctx.fillStyle=suit.startsWith("#")?suit:"#C1272D";ctx.font='900 15px "Bodoni Moda",Georgia,serif';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(cur.s).slice(0,2),cur.x,cur.y);
    if(cur.x<-cw||cur.x>W+cw||performance.now()-t0>2600){cur=launch();t0=performance.now()}
    requestAnimationFrame(step)})();
}
function flip(){const p=$("#play");if(!p)return;snd();flipped=!flipped;p.classList.toggle("flip",flipped);$("#bRep").hidden=!flipped||!!cur.qid;$("#bExp").hidden=!flipped||!IMP.sample;if(flipped&&ORAL.on)speak(cur.v,metaOf(cur).ch);P26ui.emit("carte.retournee",{cur,flipped,el:$("#stage")})}
function decide(yes,via){
  const p=$("#play");if(!p||p.dataset.out)return;p.dataset.out="1";blocTick();snd();
  const prevB=cur.qid?-1:boxOf(cur.id);jrn(cur.qid||cur.id,yes,jms(),"carte");
  buzz(yes?14:[8,60,8]);if(FOCUS){fN++;if(yes)fYes++;fCount()}
  if(cur.qid){if(yes){delete P.e[cur.qid];gainXP(2)}else pile.push(cur);tickDay();saveP()}
  else{answerCard(cur.id,yes);if(!yes)pile.splice(Math.min(3,pile.length),0,cur)}
  sessionN++;
  if(reduce){nextCard();return}
  const mastered=yes&&prevB===2;
  const go2=()=>{
    if(yes&&via==="btn"){const cw=$("#cWon").getBoundingClientRect(),cr=p.getBoundingClientRect(),dx=cw.left+cw.width/2-(cr.left+cr.width/2),dy=cw.top+cw.height/2-(cr.top+cr.height/2);
      p.animate([{transform:"none",opacity:1},{transform:`translate(${dx*.5}px,${dy*.5-30}px) rotate(10deg) scale(.5)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) rotate(20deg) scale(.1)`,opacity:0}],{duration:480,easing:"cubic-bezier(0.32,0.72,0,1)",fill:"forwards"}).onfinish=()=>{nextCard();popWon()};return}
    p.classList.remove("snap");p.classList.add("fly");
    const w=window.innerWidth;p.style.transform=`translateX(${yes?w:-w}px) rotate(${yes?24:-24}deg)`;p.style.opacity="0";
    setTimeout(()=>{nextCard();if(yes)popWon()},300)};
  if(mastered){const f=p.querySelector(p.classList.contains("flip")?".backf":".face");const s=document.createElement("div");s.className="stamp";s.textContent="MAÎTRISÉE";f.appendChild(s);
    s.animate([{transform:"rotate(-14deg) scale(1.7)",opacity:0},{transform:"rotate(-14deg) scale(1)",opacity:.92}],{duration:170,easing:EASE_OUT,fill:"forwards"}).onfinish=()=>{p.animate([{transform:p.style.transform||"none"},{transform:(p.style.transform||"")+" translateY(3px)"},{transform:p.style.transform||"none"}],{duration:140});setTimeout(go2,420)};return}
  go2();
}
function popWon(){const el=$("#cWon");if(!reduce&&el&&el.animate)el.animate([{transform:"scale(1.18)",color:"#E7C66B"},{transform:"none"}],{duration:300,easing:EASE_OUT})}
/* Son et vibration (option) */
let SON=LS.get("son",false),AC=null;
function snd(){if(!SON)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const len=Math.floor(AC.sampleRate*.045),buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);const src=AC.createBufferSource();src.buffer=buf;const f=AC.createBiquadFilter();f.type="bandpass";f.frequency.value=2200;f.Q.value=.8;const g=AC.createGain();g.gain.value=.5;src.connect(f).connect(g).connect(AC.destination);src.start()}catch(e){}
}
let VIB=LS.get("vib",true);const canVib=typeof navigator!=="undefined"&&"vibrate" in navigator;
function buzz(p){if(!VIB||!canVib)return;try{navigator.vibrate(p)}catch(e){}}
function vibLabel(){const b=$("#bVib");if(!b)return;b.hidden=!canVib;b.textContent="Vibration : "+(VIB?"activée":"coupée")}
function sonLabel(){const b=$("#bSon");if(b)b.textContent="Son : "+(SON?"activé":"coupé")}
function bindDrag(el){
  let x0=0,y0=0,dx=0,drag=false,moved=false;
  const yes=el.querySelector("#tYes"),no=el.querySelector("#tNo");
  const glare=(e)=>{const r=el.getBoundingClientRect();el.style.setProperty("--gx",((e.clientX-r.left)/r.width*100)+"%");el.style.setProperty("--gy",((e.clientY-r.top)/r.height*100)+"%")};
  let armed=false;
  el.addEventListener("pointerdown",e=>{if(el._a){el._a.cancel();el._a=null}glare(e);el.classList.add("held");drag=true;moved=false;armed=false;x0=e.clientX;y0=e.clientY;dx=0;el.classList.remove("snap");el.setPointerCapture(e.pointerId)});
  el.addEventListener("pointermove",e=>{if(!drag)return;glare(e);dx=e.clientX-x0;const dy=e.clientY-y0;if(Math.abs(dx)>6||Math.abs(dy)>6)moved=true;
    el.style.transform=`translate(${dx}px,${dy*.25}px) rotate(${dx/18}deg)`;
    const r=Math.min(Math.abs(dx)/100,1);if(r>=1&&!armed){armed=true;buzz(6)}else if(r<1)armed=false;if(dx>0){yes.style.opacity=r;no.style.opacity=0}else{no.style.opacity=r;yes.style.opacity=0}});
  const end=()=>{el.classList.remove("held");if(!drag)return;drag=false;
    if(!moved){el.style.transform="";flip();return}
    if(Math.abs(dx)>100){decide(dx>0);return}
    el.classList.add("snap");el.style.transform="";yes.style.opacity=0;no.style.opacity=0};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
  el.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}});
}
$("#bFlip").onclick=flip;$("#bYes").onclick=()=>decide(true,"btn");
$("#bSon").onclick=()=>{SON=!SON;LS.set("son",SON);sonLabel();if(SON)snd()};sonLabel();
$("#bVib").onclick=()=>{VIB=!VIB;LS.set("vib",VIB);vibLabel();buzz(14)};vibLabel();
$("#bFocus").onclick=()=>focusOn(false);$("#fExit").onclick=()=>focusOff(true);$("#bNo").onclick=()=>decide(false);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&FOCUS){focusOff(true);return}if($("#v-jeu").hidden||!cur||e.target.closest("textarea,input"))return;if(e.key==="ArrowRight")decide(true);if(e.key==="ArrowLeft")decide(false);if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();flip()}});
/* Bloc de 25 min */
let blocT0=LS.get("bloc",0),blocTimer=null,pauseShown=false;
function blocTick(){if(FOCUS)return;if(!blocT0||Date.now()-blocT0>30*60e3){blocT0=Date.now();LS.set("bloc",blocT0);pauseShown=false}if(!blocTimer)blocTimer=setInterval(showBloc,1000);showBloc()}
function blocOver(){return blocT0&&!pauseShown&&Date.now()-blocT0>=25*60e3&&Date.now()-blocT0<30*60e3}
function showBloc(){const el=$("#bloc");if(!blocT0||FOCUS){el.hidden=true;return}const t=Date.now()-blocT0;
  if(t>=30*60e3){el.hidden=true;clearInterval(blocTimer);blocTimer=null;return}
  el.hidden=false;const left=t<25*60e3?25*60e3-t:30*60e3-t;const m=Math.floor(left/60e3),s=Math.floor(left%60e3/1000);
  el.className="pill"+(t>=25*60e3?" pause":"");el.textContent=(t>=25*60e3?"Pause ":"Bloc ")+m+":"+pad(s)}
function showPause(){if(FOCUS){focusEnd();return}pauseShown=true;if(cur)pile.unshift(cur);cur=null;$("#ctrl").style.visibility="hidden";
  $("#stage").innerHTML=`<div class="empty"><h2>Pause</h2><p>25 minutes jouées. Pose le téléphone 5 minutes, puis reprends si tu veux.</p><button class="btn light" type="button" id="resume">Reprendre un bloc</button></div>`;
  $("#resume").onclick=()=>{blocT0=Date.now();LS.set("bloc",blocT0);pauseShown=false;nextCard()}}
/* Mode focus : donne du soir en plein écran, 25 minutes */
let FDUR=25*60e3;const QUICK={ids:[],on:false};let FOCUS=false,fT=null,fStart=0,fYes=0,fN=0,fEnded=false;
const fOver=()=>FOCUS&&Date.now()-fStart>=FDUR;
function fCount(){const el=$("#fCount");if(el)el.textContent=fN?fN+" jouée"+(fN>1?"s":""):""}
function fTick(){const left=Math.max(0,FDUR-(Date.now()-fStart)),s1=Math.ceil(left/1000),m=Math.floor(s1/60),sc=s1%60;
  $("#fTime").textContent=m+":"+pad(sc);$("#fLine").style.setProperty("--fp",(left/FDUR).toFixed(4));
  if(!left&&!fEnded&&cur&&!$("#play")?.dataset.out){pile.unshift(cur);cur=null;focusEnd()}}
function focusOn(quick,min){quick=quick===true;
  if(!C.ready)return;QUICK.min=quick&&+min>=1&&+min<=25?Math.round(+min):5;FDUR=(quick?QUICK.min:25)*60e3;QUICK.on=quick;FOCUS=true;fEnded=false;fStart=Date.now();fYes=0;fN=0;
  $("#fExit").textContent=quick?"Arrêter":"Quitter le focus";
  blocT0=0;LS.set("bloc",0);pauseShown=true;
  document.body.classList.add("focus");$("#fbar").hidden=false;fCount();
  if(quick){QUICK.ids=quickIds();sel.mat="@cinq"}else{sel.mat="@donne";LS.set("mat","@donne")}if(view!=="jeu")go("jeu");else renderJeuPicks();
  startPile();clearInterval(fT);fTick();fT=setInterval(fTick,1000);
  try{document.documentElement.requestFullscreen&&matchMedia("(pointer:coarse)").matches&&document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
}
function focusEnd(){
  fEnded=true;clearInterval(fT);fT=null;$("#ctrl").style.visibility="hidden";
  const mins=Math.max(1,Math.round((Date.now()-fStart)/60e3));
  const h=QUICK.on?(fN?(QUICK.min||5)+" minutes gagnées":"Rien à jouer"):fN?(fYes>=fN*.7?"Soirée gagnée":"Soirée jouée"):"Rien à jouer";
  const p=fN?(fYes>=fN*.7?"Tes cartes sues reviendront dans quelques jours. Celles ratées repassent demain.":"Les cartes ratées reviennent demain. Un duel court pour finir ?"):"Aucune carte à revoir ce soir. Avance dans un chapitre depuis Cours.";
  $("#stage").innerHTML=(fN?'<canvas class="casc" id="casc"></canvas>':"")+`<div class="empty fend"><h2>${h}</h2>${fN?`<div class="fstats"><span><b>${fN}</b>jouées</span><span><b>${fYes}</b>sues</span><span><b>${mins}</b>min</span></div>`:""}<p>${p}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn light" type="button" id="fDone">Terminer</button>${fN?'<button class="btn ghost" type="button" id="fDuel">Un duel</button>':""}</div></div>`;
  $("#fDone").onclick=()=>focusOff(false);if($("#fDuel"))$("#fDuel").onclick=()=>{focusOff(false);go("duel")};
  if(fN){cascade($("#casc"));if(!QUICK.on)P.fz=(P.fz||0)+1;saveP();checkRewards()}buzz([20,80,20]);
}
function focusOff(manual){
  if(!FOCUS)return;FOCUS=false;clearInterval(fT);fT=null;document.body.classList.remove("focus");$("#fbar").hidden=true;
  try{document.fullscreenElement&&document.exitFullscreen().catch(()=>{})}catch(e){}
  pauseShown=false;if(QUICK.on){QUICK.on=false;sel.mat="@donne"}if(view==="jeu"){renderJeuPicks();startPile()}
}
/* Signaler une carte */
$("#bRep").onclick=()=>{if(!cur)return;const c=cur;
  $("#repBox").innerHTML=`<div class="report"><p>Qu’est-ce qui ne va pas sur « ${esc(String(c.r).slice(0,60))} » ?</p><textarea id="repTxt" placeholder="Ex. : ma prof dit plutôt…"></textarea><div class="row"><button class="btn" type="button" id="repGo">Envoyer</button><button class="btn ghost" type="button" id="repNo">Annuler</button></div><p id="repMsg" style="margin:8px 0 0;font-size:.85rem"></p></div>`;
  $("#repNo").onclick=()=>$("#repBox").innerHTML="";
  $("#repGo").onclick=async()=>{const t=$("#repTxt").value.trim().slice(0,600);if(!t){$("#repMsg").textContent="Écris ce qui est faux.";return}
    if(!DB){$("#repMsg").textContent="Envoi impossible ici. Dis-le-moi dans notre conversation.";return}
    $("#repGo").disabled=true;
    try{await DB.collection("signalements").add({carte:c.id,chap:(metaOf(c).ch||{}).id||"",recto:String(c.r).slice(0,200),texte:t,date:new Date().toISOString(),par:UID||""});$("#repBox").innerHTML=`<div class="report"><p>Reçu. Je corrige la carte à la prochaine mise à jour.</p></div>`}
    catch(e){$("#repGo").disabled=false;$("#repMsg").textContent="Envoi refusé. Dis-le-moi dans notre conversation."}};
};

/* ================= DUEL SOLO ================= */
let inDuel=false,duelMat=null,dCh=null,dSi=0,dQs=[],dQi=0,dRes=[];
function seriesOf(mid){return chapsOf(mid).flatMap(ch=>(ch.quiz||[]).map((s,si)=>({ch,s,si})).filter(x=>(x.s.qs||[]).length))}
function renderSeries(){inDuel=false;
  const mats=C.mats.filter(m=>seriesOf(m.id).length);
  if(!duelMat||!mats.find(m=>m.id===duelMat))duelMat=mats[0]?mats[0].id:null;
  $("#duel").innerHTML=`<h1 style="font-size:2rem;margin-bottom:6px">Duel</h1><p class="muted" style="margin:0 0 18px">10 questions. Une erreur part dans ta pile « Erreurs » du Jeu.</p>
   <div class="pick" id="dMat"></div>
   <div class="series" id="dSer">${C.ready?"":'<p class="loading">Chargement…</p>'}</div>
   <div id="arEntry"></div><div id="vbEntry"></div><div class="online" id="onlineEntry"></div>`;
  $("#duel p.muted").insertAdjacentHTML("afterend",'<div data-slot="duel"></div>');P26ui.slot("duel",$('#duel [data-slot="duel"]'));
  renderOnlineEntry();arEntryPaint();if(!C.ready)return;
  const intro=$("#duel p.muted");if(intro)intro.insertAdjacentHTML("afterend",bbCardHTML());if($("#bbGo"))$("#bbGo").onclick=bbStart;
  pickRow($("#dMat"),mats.map(m=>({k:m.id,l:m.court||m.nom,suit:m.suit,dot:1})),duelMat,k=>{duelMat=k;renderSeries()});
  const list=duelMat?seriesOf(duelMat):[];
  $("#dSer").innerHTML=list.length?list.map((x,i)=>{const b=P.q[x.ch.id+"#"+x.si];return `<button class="serie" type="button" data-c="${esc(x.ch.id)}" data-s="${x.si}"><span class="mini" style="color:${suitOf(duelMat)}">${["I","II","III","IV","V","VI","VII","VIII"][i]||i+1}</span><span><b>${esc(x.s.nom)}</b><span>${esc(x.s.d||x.ch.titre)}</span></span><span class="best">${b!=null?b+"/10":"–"}</span></button>`}).join("")
    :`<p class="muted">Pas encore de duel pour cette matière.</p>`;
  applyTint();
  $("#dSer").querySelectorAll(".serie").forEach(b=>b.onclick=()=>{dCh=b.dataset.c;dSi=+b.dataset.s;dQs=shuffle(C.chaps[dCh].quiz[dSi].qs).slice(0,10);dQi=0;dRes=[];inDuel=true;renderQ()});
}
function reactOpt(b,good,okBtn){snd();buzz(good?14:[8,60,8]);if(reduce)return;
  if(!good&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-8px)"},{transform:"translateX(7px)"},{transform:"translateX(-5px)"},{transform:"translateX(3px)"},{transform:"none"}],{duration:320,easing:"ease-out"});
  if(okBtn){if(good&&okBtn.animate)okBtn.animate([{transform:"scale(1)"},{transform:"scale(1.04)"},{transform:"none"}],{duration:260,easing:EASE_OUT});requestAnimationFrame(()=>okBtn.classList.add("shine"))}}
function optsOf(q,rnd){const o=[{t:q.ok,ok:1},...(q.no||[]).map(t=>({t,ok:0}))];return rnd?sshuffle(o,rnd):shuffle(o)}
function renderQ(){
  const N=dQs.length;
  if(dQi>=N){const sc=dRes.filter(Boolean).length,sc10=Math.round(sc/N*10),k=dCh+"#"+dSi;if(P.q[k]==null||sc10>P.q[k])P.q[k]=sc10;if(sc10===10)gainXP(5);saveP();checkRewards();
    const msg=sc10>=9?"Manche gagnée.":sc10>=6?"Presque. Tes erreurs t’attendent dans le Jeu.":"Repasse par le Cours, puis rejoue demain.";
    $("#duel").innerHTML=`<div class="result"><div class="sc">${sc}/${N}</div><p>${msg}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn light" type="button" id="re">Rejouer</button><button class="btn ghost" type="button" id="toErr">Mes erreurs</button><button class="btn ghost" type="button" id="bk">Autres duels</button></div></div>`;
    if(!reduce){const sc=$("#duel .sc");if(sc&&sc.animate)sc.animate([{opacity:0,transform:"scale(.94)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE_OUT})}
    $("#re").onclick=()=>{dQs=shuffle(C.chaps[dCh].quiz[dSi].qs).slice(0,10);dQi=0;dRes=[];renderQ()};$("#bk").onclick=renderSeries;$("#toErr").onclick=()=>{sel.mat="@err";inDuel=false;go("jeu");startPile()};return}
  applyTint();const q=dQs[dQi],ch=C.chaps[dCh],opts=optsOf(q);JT=Date.now();
  $("#duel").innerHTML=`<div class="qcard" style="--suit:${suitOf(ch.mat)}"><div class="role"><span>${esc(ch.quiz[dSi].nom)}</span><span>${dQi+1} / ${N}</span></div><h2>${tex(q.q)}</h2>
   ${opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="why"></div></div>
   <div class="dots">${dQs.map((_,i)=>`<i class="${dRes[i]===true?"w":dRes[i]===false?"l":i===dQi?"cur":""}"></i>`).join("")}</div>`;
  const btns=[...$("#duel").querySelectorAll(".opt")];
  btns.forEach(b=>b.onclick=()=>{const good=!!opts[+b.dataset.i].ok;dRes[dQi]=good;
    jrn(q.id,good,jms(),"quiz");if(good){delete P.e[q.id];gainXP(1)}else P.e[q.id]=Date.now();tickMat(ch.mat);tickDay();saveP();
    btns.forEach(x=>{x.disabled=true;if(opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});reactOpt(b,good,btns.find(x=>opts[+x.dataset.i].ok));
    $("#why").innerHTML=`<p class="why"><b>${good?"Gagné.":"Perdu."}</b> ${tex(q.why||"")}</p><div style="margin-top:14px"><button class="btn" type="button" id="nx">${dQi<N-1?"Question suivante":"Voir le score"}</button></div>`;
    $("#duel").querySelectorAll(".dots i")[dQi].className=good?"w":"l";$("#nx").onclick=()=>{dQi++;renderQ()};$("#nx").focus()});
}

/* ================= DUEL EN LIGNE (room, présence) ================= */
let ROOM=null,roomState="wait";
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function sshuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const cleanNick=s=>String(s||"").replace(/[\u0000-\u001f​-‏‪-‮]/g,"").trim().slice(0,16);
const OL={g:null,code:"",nick:LS.get("nick",""),host:false,epoch:0,game:null,qi:0,score:0,ms:0,t0:0,unsub:null,answered:false,pickMat:null};
function renderOnlineEntry(){
  const box=$("#onlineEntry");if(!box)return;const n=cleanNick(LG.nick);
  box.className="online";
  box.innerHTML=`<h2>Contre un ami</h2><p class="muted">Les mêmes 10 questions, en direct. Le plus juste gagne, puis le plus rapide.</p>
   ${n?`<p>Tu joues avec <b>${esc(n)}</b> · pseudo de ton profil</p>`:`<p>Ajoute ton pseudo dans ton profil pour jouer.</p><button id="olProfile" type="button" class="btn light">Compléter mon profil</button>`}
   <div class="olrow"><button class="btn light" type="button" id="olCreate">Créer une partie</button></div>
   <label class="lab" for="olCode">Ou rejoins avec un code</label>
   <div class="olrow"><input id="olCode" class="inp code" maxlength="4" autocomplete="off" placeholder="ABCD"><button class="btn ghost" type="button" id="olJoin">Rejoindre</button></div>
   <div class="olrow"><label class="btn ghost qrscan"><input type="file" id="olQr" accept="image/*" capture="environment">Scanner un QR code</label></div>
   <p class="olerr" id="olErr" role="alert"></p>`;
  const need=()=>{const nick=cleanNick(LG.nick);if(!nick){$("#olErr").textContent="Complète ton pseudo dans ton profil.";return false}OL.nick=nick;return true};
  if($("#olProfile"))$("#olProfile").onclick=()=>go("profil");
  $("#olCreate").onclick=()=>{if(!need())return;const al="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let c="";for(let i=0;i<4;i++)c+=al[Math.floor(Math.random()*al.length)];enterRoom(c,true)};
  $("#olQr").onchange=async e=>{const f=e.target.files[0];if(!f||!need())return;$("#olErr").textContent="Lecture du QR code…";let c="";try{c=await qrRead(f)}catch(x){}
    if(!c){$("#olErr").textContent="QR code illisible. Reprends la photo de plus près, ou tape le code.";return}$("#olCode").value=c;enterRoom(c,false)};
  if(!OL.autoTried){OL.autoTried=true;const m=/duel=([A-Z0-9]{4})/i.exec(location.hash||"");if(m)$("#olCode").value=m[1].toUpperCase()}
  $("#olJoin").onclick=()=>{if(!need())return;const c=$("#olCode").value.toUpperCase().replace(/[^A-Z0-9]/g,"");if(c.length!==4){$("#olErr").textContent="Le code fait 4 caractères.";return}enterRoom(c,false)};
  const blocked=roomState!=="ok"||!n;$("#olCreate").disabled=blocked;$("#olJoin").disabled=blocked;$("#olQr").disabled=blocked;
  if(roomState!=="ok")$("#olErr").textContent=roomState==="wait"?"Connexion…":DEMO?"Aperçu local : les parties entre amis nécessitent Claude connecté.":"Ouvre la page connecté sur Claude pour jouer en direct.";
}
async function enterRoom(code,host){
  const nick=cleanNick(LG.nick);if(!nick||!ROOM||roomState!=="ok")return;OL.nick=nick;
  $("#olErr").textContent="Connexion à la partie…";
  try{OL.g=await ROOM.join("duel-"+code.toLowerCase())}catch(e){OL.g=null;$("#olErr").textContent=e&&e.code==="limit_reached"?"Trop de parties ouvertes, réessaie dans un instant.":"Impossible de rejoindre la partie. Réessaie.";return}
  OL.code=code;OL.host=host;OL.epoch=0;OL.game=null;inDuel=true;
  await OL.g.presence({nick:OL.nick,host,epoch:0,qi:0,score:0,ms:0,done:false,cid:null,si:null,seed:null}).catch(()=>{});
  OL.unsub=OL.g.onPeers(onPeersChange,()=>{leaveRoom("La connexion à la partie a été perdue.")});
  renderLobby();
}
async function leaveRoom(msg){if(OL.unsub)OL.unsub();OL.unsub=null;if(OL.g)await OL.g.leave().catch(()=>{});OL.g=null;OL.game=null;inDuel=false;renderSeries();if(msg&&$("#olErr"))$("#olErr").textContent=msg}
function players(){return (OL.g?OL.g.peers():[]).filter(p=>p.kind==="viewer"&&p.presence&&p.presence.nick)}
function hostPeer(){return players().filter(p=>p.presence.host).sort((a,b)=>a.peer<b.peer?-1:1)[0]}
function onPeersChange(){
  const h=hostPeer();
  if(h&&!h.isMe){const hp=h.presence;if(hp.eloId&&hp.eloId!==OL.eloId){OL.eloId=hp.eloId;if(!GUEST)eloJoin(hp.eloId)}if(typeof hp.epoch==="number"&&hp.epoch>OL.epoch&&hp.seed!=null&&!OL.loading){if(hp.gref||hp.refs){OL.loading=true;OL.epoch=hp.epoch;mixFromHost(hp).finally(()=>{OL.loading=false})}else if(hp.cid&&hp.si!=null)startOnline(hp.epoch,hp.cid,hp.si,hp.seed)}}
  if(!OL.game)renderLobby();else renderBoard();
}
function renderLobby(){
  const ps=players(),h=hostPeer();
  $("#duel").innerHTML=`<div class="olhead"><div><span class="muted">Code de la partie</span><div class="bigcode">${esc(OL.code)}</div></div><div class="qrbox" id="olQrImg" aria-label="QR code de la partie"></div></div>
   <p class="muted">Tes amis ouvrent cette page, vont dans Duel, puis tapent le code ou scannent le QR code (Scanner un QR code). <button class="btn ghost" type="button" id="olLeave" style="margin-left:6px">Quitter</button></p>
   <h2 class="solo">À la table</h2><ul class="olplayers">${ps.map(p=>`<li><span>${esc(cleanNick(p.presence.nick))}</span>${p.isMe&&p.sameTab?"<em>toi</em>":""}${p.presence.host?"<em>hôte</em>":""}</li>`).join("")||'<li class="muted">Connexion…</li>'}</ul>
   ${OL.host?mixHTML()+`<p class="olerr" id="olErr2" role="alert"></p>`+(ps.length<2?'<p class="muted">Seul à la table : tu peux quand même jouer pour t’entraîner.</p>':"")
   :`<p class="waitmsg">${h?"En attente du lancement par "+esc(cleanNick(h.presence.nick))+"…":"En attente de l’hôte de la partie…"}</p>`}`;
  $("#olLeave").onclick=()=>leaveRoom();
  qrShow($("#olQrImg"),OL.code);
  if(OL.host)mixBind(renderLobby);
}
/* ---------- Duel mixte : plusieurs chapitres, plusieurs matières, QR code ---------- */
const MIX={mats:null,sel:new Set(),n:10};
/* Empreintes SRI (sha384) des bibliothèques externes : un fichier modifié sur le CDN est refusé par le navigateur. */
const SRI={"https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js":"sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k",
  "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js":"sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js":"sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js":"sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e"};
function sriSrc(s,src){s.src=src;if(SRI[src]){s.integrity=SRI[src];s.crossOrigin="anonymous"}return s}
function loadLib(src,glob){return window[glob]?Promise.resolve(window[glob]):new Promise((ok,ko)=>{const s=document.createElement("script");sriSrc(s,src);s.onload=()=>window[glob]?ok(window[glob]):ko();s.onerror=ko;document.head.appendChild(s)})}
const QR_GEN="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js",QR_READ="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
function mixSeries(mid){return Object.values(C.chaps).filter(c=>c.mat===mid).flatMap(ch=>(ch.quiz||[]).map((s,si)=>({ch,s,si})).filter(x=>(x.s.qs||[]).length))}
function mixMats(){return (C.mats||[]).filter(m=>mixSeries(m.id).length)}
function mixHTML(){const mats=mixMats();if(!MIX.mats)MIX.mats=new Set(mats.slice(0,1).map(m=>m.id));
  if(!mats.length)return `<p class="muted">Aucun quiz pour l’instant. Prépare les cartes d’un thème du programme ou importe un cours.</p>`;
  const nq=[...MIX.sel].reduce((a,k)=>{const [c,s]=k.split("#");const ch=C.chaps[c];return a+(ch&&ch.quiz[+s]?ch.quiz[+s].qs.length:0)},0);
  return `<h2 class="solo">Matières</h2><div class="onbch" id="mixMats">${mats.map(m=>`<button type="button" class="${MIX.mats.has(m.id)?"on":""}" data-m="${esc(m.id)}">${esc(m.court||m.nom)}</button>`).join("")}</div>
   <h2 class="solo">Chapitres</h2>${[...MIX.mats].filter(id=>mats.find(m=>m.id===id)).map(id=>`<p class="mixm">${esc(matName(id))}</p><div class="onbch">${mixSeries(id).map(x=>{const k=x.ch.id+"#"+x.si;return `<button type="button" class="${MIX.sel.has(k)?"on":""}" data-k="${esc(k)}">${esc(x.ch.court||x.ch.titre)}${(x.ch.quiz.length>1)?" · "+esc(x.s.nom):""}<small>${isProg(x.ch)?"Prog.":"Cours"}</small></button>`}).join("")}</div>`).join("")}
   <h2 class="solo">Questions</h2><div class="onbch" id="mixN">${[5,10,20].map(n=>`<button type="button" class="${MIX.n===n?"on":""}" data-n="${n}">${n}</button>`).join("")}</div>
   <p class="muted" style="margin-top:10px">${MIX.sel.size?MIX.sel.size+" chapitre"+(MIX.sel.size>1?"s":"")+" · "+nq+" questions disponibles":"Choisis au moins un chapitre."}</p>
   <div class="olrow"><button class="btn light" type="button" id="mixGo" ${MIX.sel.size?"":"disabled"}>Lancer la partie</button></div>`}
function mixBind(rerender){const box=$("#duel");
  box.querySelectorAll("#mixMats [data-m]").forEach(b=>b.onclick=()=>{const m=b.dataset.m;if(MIX.mats.has(m)){MIX.mats.delete(m);[...MIX.sel].forEach(k=>{const c=C.chaps[k.split("#")[0]];if(c&&c.mat===m)MIX.sel.delete(k)})}else MIX.mats.add(m);rerender()});
  box.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;MIX.sel.has(k)?MIX.sel.delete(k):MIX.sel.add(k);rerender()});
  box.querySelectorAll("#mixN [data-n]").forEach(b=>b.onclick=()=>{MIX.n=+b.dataset.n;rerender()});
  const go=$("#mixGo");if(go)go.onclick=mixLaunch}
function mixBuild(seed){const r=rng(seed),pool=[];
  [...MIX.sel].forEach(k=>{const [c,s]=k.split("#"),ch=C.chaps[c];if(!ch||!ch.quiz[+s])return;ch.quiz[+s].qs.forEach(q=>pool.push({id:q.id,q:q.q,ok:q.ok,no:q.no,why:q.why||"",mat:ch.mat,t:ch.court||ch.titre}))});
  return sshuffle(pool,r).slice(0,MIX.n)}
async function mixLaunch(){const seed=Math.floor(Math.random()*2**31),ep=OL.epoch+1,qs=mixBuild(seed),err=$("#olErr2");if(!qs.length)return;
  const pres={epoch:ep,seed,qi:0,score:0,ms:0,done:false,cid:null,si:null,gref:null,refs:null};
  try{if(!DB||!UID||GUEST)throw 0;await DB.doc("biblio/"+UID+"/duel/"+OL.code).set({epoch:ep,seed,qs,upd:Date.now()});pres.gref=UID}
  catch(e){pres.refs=[...MIX.sel].slice(0,40);pres.n=MIX.n;if(err)err.textContent="Mode invité : tes amis doivent avoir les mêmes chapitres que toi."}
  OL.eloId=(players().length>=2&&!GUEST&&UID)?await eloOpen(qs.length,60,true):null;EG.joined=EG.joined||{};if(OL.eloId)EG.joined[OL.eloId]=true;pres.eloId=OL.eloId;
  OL.g.presence(pres).catch(()=>{});startMix(ep,seed,qs)}
async function mixFromHost(hp){if(hp.gref){try{const s=await DB.doc("biblio/"+hp.gref+"/duel/"+OL.code).get();const d=s.exists?s.data():null;if(d&&d.epoch===hp.epoch&&Array.isArray(d.qs))return startMix(hp.epoch,hp.seed,d.qs)}catch(e){}}
  if(Array.isArray(hp.refs)){const keep=MIX.sel,kn=MIX.n;MIX.sel=new Set(hp.refs.filter(k=>typeof k==="string"));MIX.n=+hp.n||10;const qs=mixBuild(hp.seed);MIX.sel=keep;MIX.n=kn;if(qs.length)return startMix(hp.epoch,hp.seed,qs)}
  const w=$(".waitmsg");if(w)w.textContent="Impossible de charger les questions de l’hôte. Demande-lui de relancer."}
function startMix(epoch,seed,qs){const r=rng(seed+1);OL.epoch=epoch;OL.game={mix:true,qs:qs.map(q=>({q,opts:optsOf(q,r)}))};OL.qi=0;OL.score=0;OL.ms=0;
  if(!OL.host)OL.g.presence({epoch,qi:0,score:0,ms:0,done:false}).catch(()=>{});renderOnlineQ()}
async function qrShow(el,code){try{const qrcode=await loadLib(QR_GEN,"qrcode");const q=qrcode(0,"M");q.addData(HUB_URL+"#duel="+code);q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){el.textContent="QR code indisponible."}}
async function qrRead(file){const jsQR=await loadLib(QR_READ,"jsQR");const pic=await loadPic(file);const W=Math.min(1200,pic.w),H=Math.round(pic.h*W/pic.w),cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");g.drawImage(pic.src,0,0,W,H);
  const d=g.getImageData(0,0,W,H),r=jsQR(d.data,W,H);if(!r)return "";const ma=/arene=([A-Z0-9]{5})/i.exec(r.data);if(ma)return ma[1].toUpperCase();const m=/duel=([A-Z0-9]{4})/i.exec(r.data)||/^([A-Z0-9]{4})$/i.exec(r.data.trim());return m?m[1].toUpperCase():""}

function startOnline(epoch,cid,si,seed){
  const ch=C.chaps[cid];if(!ch||!ch.quiz||!ch.quiz[si]){toast(`<span class="tm">!</span><div><b>Ce thème n’est pas dans tes cours</b><span>Demande à l’hôte de lancer un « Mélange » ou un thème de ta classe.</span></div>`);return}
  const r=rng(seed);const qsx=sshuffle(ch.quiz[si].qs,r).slice(0,10).map(q=>({q,opts:optsOf(q,r)}));
  OL.epoch=epoch;OL.game={cid,si,qs:qsx};OL.qi=0;OL.score=0;OL.ms=0;
  if(!OL.host)OL.g.presence({epoch,qi:0,score:0,ms:0,done:false}).catch(()=>{});
  renderOnlineQ();
}
function renderOnlineQ(){
  const G=OL.game,N=G.qs.length,ch=G.mix?null:C.chaps[G.cid];
  if(OL.qi>=N){OL.g.presence({epoch:OL.epoch,qi:OL.qi,score:OL.score,ms:OL.ms,done:true}).catch(()=>{});if(G.mix&&!G.paid){G.paid=1;if(OL.score===N&&N>=5)gainXP(5)}renderEnd();return}
  const Q=G.qs[OL.qi];if(!G.mix)applyTint();OL.answered=false;OL.t0=performance.now();
  $("#duel").innerHTML=`<div class="board" id="board"></div>
   <div class="qcard" style="--suit:${suitOf(ch?ch.mat:Q.q.mat)}"><div class="role"><span>${ch?"En ligne · "+esc(ch.quiz[G.si].nom):esc(matName(Q.q.mat))+" · "+esc(Q.q.t||"")}</span><span>${OL.qi+1} / ${N}</span></div><h2>${tex(Q.q.q)}</h2>
   ${Q.opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="why"></div></div>`;
  renderBoard();
  const btns=[...$("#duel").querySelectorAll(".opt")];
  btns.forEach(b=>b.onclick=()=>{if(OL.answered)return;OL.answered=true;const good=!!Q.opts[+b.dataset.i].ok;OL.ms+=Math.round(performance.now()-OL.t0);if(good){OL.score++;gainXP(1)}
    jrn(Q.q.id,good,Math.round(performance.now()-OL.t0),"duel");if(good)delete P.e[Q.q.id];else P.e[Q.q.id]=Date.now();saveP();
    btns.forEach(x=>{x.disabled=true;if(Q.opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});reactOpt(b,good,btns.find(x=>Q.opts[+x.dataset.i].ok));
    OL.g.presence({epoch:OL.epoch,qi:OL.qi+1,score:OL.score,ms:OL.ms,done:false}).catch(()=>{});
    $("#why").innerHTML=`<p class="why"><b>${good?"Gagné.":"Perdu."}</b> ${tex(Q.q.why||"")}</p><div style="margin-top:14px"><button class="btn" type="button" id="nx">${OL.qi<N-1?"Question suivante":"Voir le classement"}</button></div>`;
    $("#nx").onclick=()=>{OL.qi++;renderOnlineQ()};$("#nx").focus()});
}
function ranking(){return players().filter(p=>p.presence.epoch===OL.epoch).map(p=>({me:p.isMe&&p.sameTab,nick:cleanNick(p.presence.nick),qi:+p.presence.qi||0,score:+p.presence.score||0,ms:+p.presence.ms||0,done:!!p.presence.done}))
  .sort((a,b)=>b.score-a.score||(b.done-a.done)||a.ms-b.ms)}
function renderBoard(){
  const el=$("#board");if(!el)return;const N=OL.game?OL.game.qs.length:10;
  el.innerHTML=ranking().map(p=>`<div class="bp${p.me?" me":""}"><span class="bn">${esc(p.nick)}${p.me?" (toi)":""}</span><span class="bs">${p.score}</span><span class="bq">${p.done?"fini":p.qi+"/"+N}</span></div>`).join("");
  if($("#endlist"))renderEnd();
}
function renderEnd(){
  const rk=ranking(),all=rk.length>0&&rk.every(p=>p.done),N=OL.game?OL.game.qs.length:10;const sec=ms=>(ms/1000).toFixed(1).replace(".",",")+" s";
  $("#duel").innerHTML=`<div class="result"><div class="sc">${OL.score}/${N}</div><p>${all?(rk[0]&&rk[0].me?"Tu remportes le duel.":"Duel terminé."):"En attente des autres joueurs…"}</p></div>
   <ol class="endlist" id="endlist">${rk.map((p,i)=>`<li class="${p.me?"me":""}"><span class="rk">${i+1}</span><span class="bn">${esc(p.nick)}${p.me?" (toi)":""}</span><span class="bs">${p.score}/${N}</span><span class="bq">${p.done?sec(p.ms):p.qi+"/"+N}</span></li>`).join("")}</ol>
   <p class="muted" style="font-size:.85rem">À égalité, le plus rapide gagne.</p><p class="arelo" id="olElo">${OL.eloId?"":"Partie non classée (2 joueurs connectés minimum)."}</p>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${OL.host?'<button class="btn light" type="button" id="olRe">Revanche</button>':'<span class="waitmsg">La revanche se lance chez l’hôte.</span>'}<button class="btn ghost" type="button" id="olLeave">Quitter</button></div>`;
  $("#olLeave").onclick=()=>leaveRoom();
  if(OL.eloId){if(EG.id!==OL.eloId){EG.id=OL.eloId;eloSend(OL.eloId,Math.max(0,OL.score*1000-Math.min(999,Math.round(OL.ms/100))),"#olElo")}else eloPaintAgain(OL.eloId,"#olElo")}
  if(all&&rk[0]&&rk[0].me&&rk.length>1&&OL.p1v!==OL.game){OL.p1v=OL.game;P26ui.emit("victoire",{type:"duel",el:$("#duel")})}
  if($("#olRe"))$("#olRe").onclick=()=>{OL.game=null;OL.g.presence({done:false,qi:0,score:0,ms:0}).catch(()=>{});renderLobby()};
}

/* ================= COURS ================= */
function renderCours(){
  const box=$("#cours");
  if(!C.ready){box.innerHTML=`<p class="loading">${dbState==="off"?"Ouvre la page depuis claude.ai, connecté.":"Chargement du cours…"}</p>`;return}
  if(!sel.mat||sel.mat[0]==="@"||!C.M[sel.mat])sel.mat=C.mats[0]?C.mats[0].id:null;
  pickRow($("#cMat"),C.mats.map(m=>({k:m.id,l:m.court||m.nom,suit:m.suit,dot:1})),sel.mat,k=>{sel.mat=k;sel.chap=null;renderCours()});
  srcSeg($("#cSrc"),sel.mat,()=>{sel.chap=null;renderCours()});
  const chs=chapsOf(sel.mat);
  if(!sel.chap||!chs.find(c=>c.id===sel.chap))sel.chap=chs[0]?chs[0].id:null;
  pickRow($("#cChap"),chs.length>1?chs.map(c=>({k:c.id,l:c.court||c.titre})):[],sel.chap,k=>{sel.chap=k;renderCours()});
  const ch=C.chaps[sel.chap];
  if(!ch){box.innerHTML=srcOf(sel.mat)==="cours"&&hasSrc(sel.mat,true)?`<div class="empty2"><h2>Pas encore de cours importé</h2><p>Crée tes cartes avec ton cours de ${esc(matName(sel.mat))}. Dans Pronote, ouvre Cahier de textes › Contenu des cours, puis fais une capture, une vidéo d’écran, ou copie le texte. Tes cartes restent séparées du programme officiel.</p><div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="cImp2">Importer depuis Pronote</button></div></div>`:`<div class="empty2"><h2>Aucun chapitre</h2><p>Importe ton cours de ${esc(matName(sel.mat))} avec une photo, une capture ou un PDF.</p></div>`;if($("#cImp2"))$("#cImp2").onclick=()=>openImport("cours");return}
  const parts=(ch.cours&&ch.cours.length)?ch.cours:(ch.paquets||[]).filter(p=>(p.cartes||[]).length).map(p=>({t:p.nom,cartes:p.cartes.map(c=>({id:c.id,k:c.r,v:c.v,s:c.s,w:c.w,n:c.n}))}));
  const st=stats(cardsOfChap(ch));
  box.innerHTML=`<h1 style="font-size:1.9rem;margin:4px 0 10px">${esc(ch.titre)}</h1>
   <div class="chapinfo">${srcBadge(ch.src)}${ch._doc?`<span class="srcb by">par ${esc(ch.auteur||"un élève")}${ch.vis==="moi"?" · pour toi seul":ch.vis&&ch.vis.startsWith("ligue:")?" · ligue "+esc(ligName(ch.vis.slice(6))):""}</span>`:""}${ch.etat&&!ch._doc?`<span class="srcb">${esc(ch.etat)}</span>`:""}</div>
   ${progCoursHTML(ch)}${ch.note?`<p class="note">${esc(ch.note)}</p>`:""}
   ${ch.probl?`<p class="probl">${esc(ch.probl)}</p>`:""}
   ${(ch.seances||[]).length?`<details class="seances"><summary>Séances relevées sur Pronote</summary>${ch.seances.map(s=>`<div class="day"><span class="d">${esc(isoOk(s.d)?fmtShort.format(parseIso(s.d)):"")}</span><span class="t">${esc(s.t)}</span></div>`).join("")}</details>`:""}
   ${parts.length?gaugeHTML(st)+"<div style='height:18px'></div>"+parts.map(p=>`<div class="part" style="--suit:${suitOf(ch.mat)}"><h2>${tex(p.t)}</h2><p class="muted">${p.cartes.length} cartes, fais glisser</p>
     <div class="rail">${p.cartes.map((c,i)=>`<article class="lc"><div class="k">${tex(c.k)}</div><p>${tex(c.v)}</p>${c.n?`<p class="lcn">${esc(c.n)}</p>`:""}${c.w?`<p class="lcw">${esc(c.w)}</p>`:""}${c.s&&c.s!==ch.src?srcBadge(c.s):""}${isProg(ch)&&c.id?`<button class="hidec linkbtn" type="button" data-id="${esc(c.id)}">${ADM()?"Masquer pour tous":"Masquer"}</button>`:""}<span class="num">${i+1} / ${p.cartes.length}</span></article>`).join("")}</div></div>`).join("")
     +`<button class="btn light" type="button" id="cPlay">Jouer ce chapitre</button>`
   :isProg(ch)?"":`<div class="empty2"><h2>Pas encore de cartes</h2><p>Envoie-moi les photos de ton cahier pour ce chapitre : je reprends les mots de ton prof.</p></div>`}
   ${atelierHTML(ch)}`;
  if($("#cPlay"))$("#cPlay").onclick=()=>{sel.paq="*";go("jeu");startPile()};
  bindAtelier(ch);progBind(ch);
}


/* ================= ATELIER « S'ENTRAÎNER » ================= */
const ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const t=b;b=a%b;a=t}return a||1}
function fr(x,d){const p=Math.pow(10,d==null?4:d);return String(Math.round(x*p)/p).replace(".","{,}")}
function frac(n,d){if(d<0){n=-n;d=-d}const g=gcd(n,d);n/=g;d/=g;if(d===1)return String(n);return (n<0?"-":"")+"\\frac{"+Math.abs(n)+"}{"+d+"}"}
const par=n=>n<0?"("+n+")":String(n);
function poly(a,b,c){let s=(a===1?"":a===-1?"-":a)+"x^2";if(b)s+=(b>0?"+":"-")+(Math.abs(b)===1?"":Math.abs(b))+"x";if(c)s+=(c>0?"+":"-")+Math.abs(c);return s}
function coef(a){return a===1?"":a===-1?"-":String(a)}
function sqx(al){return al===0?"x^2":"(x"+(al>0?"-":"+")+Math.abs(al)+")^2"}
function sqf(n,d){const neg=n*d<0;return "\\left(x"+(neg?"-":"+")+frac(Math.abs(n),Math.abs(d))+"\\right)^2"}
function tail(n,d){if(n===0)return "";const neg=n*d<0;return (neg?"-":"+")+frac(Math.abs(n),Math.abs(d))}
/* Arbre pondéré en SVG (couleurs des cartes) */
function arbreSVG(o){
  const A=esc(String(o.A==null?"A":o.A).slice(0,3)),B=esc(String(o.B==null?"B":o.B).slice(0,3)),f=x=>{const n=+x;return Number.isFinite(n)?String(Math.round(n*1000)/1000).replace(".",","):"?"};
  const L=[[20,90,120,40,f(o.pa)],[20,90,120,140,f(1-o.pa)],[150,40,250,15,f(o.pb)],[150,40,250,65,f(1-o.pb)],[150,140,250,115,f(o.pc)],[150,140,250,165,f(1-o.pc)]];
  const lbl=(x,y,t,bar)=>`<text x="${x}" y="${y}" font-size="16" font-weight="700" fill="#1A1C1E" text-anchor="middle" dominant-baseline="middle">${t}${bar?"\u0305":""}</text>`;
  return `<svg class="arbre" viewBox="0 0 300 180" role="img" aria-label="Arbre pondéré">`+
   L.map(l=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="#5E6166" stroke-width="1.5"/><text x="${(l[0]+l[2])/2}" y="${(l[1]+l[3])/2-7}" font-size="12.5" fill="#C1272D" font-weight="700" text-anchor="middle">${l[4]}</text>`).join("")+
   `<circle cx="20" cy="90" r="4" fill="#1A1C1E"/>`+lbl(135,40,A)+lbl(135,140,A,1)+lbl(265,15,B)+lbl(265,65,B,1)+lbl(265,115,B)+lbl(265,165,B,1)+`</svg>`;
}
const GEN={
 sommet:{nom:"Sommet et extremum",make(){const a=pick([1,2,3,-1,-2,-3]),al=ri(-4,4),b=-2*a*al,c=ri(-7,7),be=a*al*al+b*al+c;
  return {enonce:`Soit $f(x)=${poly(a,b,c)}$. Déterminer le sommet $S$, en déduire la forme canonique, puis le sens de la parabole et l’extremum.`,
   etapes:[`$\\alpha=-\\frac{b}{2a}=-\\frac{${b}}{2\\times${par(a)}}=${al}$`,`$\\beta=f(\\alpha)=f(${al})=${be}$`,`Ainsi $S(${al}\\,;\\,${be})$.`,`Pour tout réel $x$ : $f(x)=${coef(a)}${sqx(al)}${be?(be>0?"+":"")+be:""}$`,`Comme $a=${a}${a>0?">0":"<0"}$, la parabole est tournée vers le ${a>0?"haut":"bas"}.`,`$f$ admet donc un ${a>0?"minimum":"maximum"} qui vaut $${be}$, atteint en $x=${al}$.`]}}},
 canonique:{nom:"Forme canonique (méthode générale)",make(){const a=pick([2,3,-2,-3,1]);let b=ri(-11,11);if(!b)b=5;const c=ri(-7,7);
  return {enonce:`Déterminer la forme canonique de $f(x)=${poly(a,b,c)}$ avec la méthode générale.`,
   etapes:[`On factorise par $a$ les deux premiers termes : $f(x)=${coef(a)}\\left(x^2${tail(b,a)}x\\right)${c?(c>0?"+":"")+c:""}$`,
    `On fait apparaître le carré, avec $h=${frac(b,2*a)}$ : $f(x)=${coef(a)}\\left[${sqf(b,2*a)}-${frac(b*b,4*a*a)}\\right]${c?(c>0?"+":"")+c:""}$`,
    `On redistribue le facteur $a=${a}$ : $f(x)=${coef(a)}${sqf(b,2*a)}${tail(-b*b,4*a)}${c?(c>0?"+":"")+c:""}$`,
    `D’où $f(x)=${coef(a)}${sqf(b,2*a)}${tail(4*a*c-b*b,4*a)}$`,
    `Vérification : $\\beta=\\frac{4ac-b^2}{4a}=${frac(4*a*c-b*b,4*a)}$`]}}},
 equation:{nom:"Résoudre une équation",make(){let a,b,c;const m=pick(["deux","deux","double","aucune"]);
  if(m==="deux"){do{a=pick([1,2,3,-1,-2]);const r1=ri(-5,5),r2=ri(-5,5);b=-a*(r1+r2);c=a*r1*r2}while(b*b-4*a*c<=0)}
  else if(m==="double"){a=pick([1,4,9,2,3]);const r=ri(-4,4);b=-2*a*r;c=a*r*r}
  else{do{a=pick([1,2,3,-2]);b=ri(-5,5);c=ri(-8,8)}while(b*b-4*a*c>=0)}
  const D=b*b-4*a*c,et=[`$\\Delta=b^2-4ac=${par(b)}^2-4\\times${par(a)}\\times${par(c)}$`,`$b^2=${b*b}$ et $4ac=${4*a*c}$, donc $\\Delta=${D}$`];
  if(D>0){const s=Math.round(Math.sqrt(D));if(s*s===D){et.push(`Comme $\\Delta>0$, l’équation admet deux racines réelles distinctes. $\\sqrt{\\Delta}=${s}$`,`$x_1=\\frac{-b-\\sqrt{\\Delta}}{2a}=${frac(-b-s,2*a)}$ et $x_2=\\frac{-b+\\sqrt{\\Delta}}{2a}=${frac(-b+s,2*a)}$`,`Ainsi $S=\\left\\{${frac(-b-s,2*a)}\\,;\\,${frac(-b+s,2*a)}\\right\\}$`)}
   else et.push(`Comme $\\Delta>0$, deux racines réelles distinctes : $x_1=\\frac{${-b}-\\sqrt{${D}}}{${2*a}}$ et $x_2=\\frac{${-b}+\\sqrt{${D}}}{${2*a}}$`,`Ainsi $S=\\left\\{\\frac{${-b}-\\sqrt{${D}}}{${2*a}}\\,;\\,\\frac{${-b}+\\sqrt{${D}}}{${2*a}}\\right\\}$`)}
  else if(D===0)et.push(`Comme $\\Delta=0$, une unique racine réelle : $x_0=-\\frac{b}{2a}=${frac(-b,2*a)}$`,`Ainsi $S=\\left\\{${frac(-b,2*a)}\\right\\}$`);
  else et.push(`Comme $\\Delta<0$, l’équation n’admet aucune racine réelle.`,`Ainsi $S=\\emptyset$`);
  return {enonce:`Résoudre dans $\\mathbb{R}$ : $${poly(a,b,c)}=0$`,etapes:et}}},
 sommeproduit:{nom:"Racine évidente, somme et produit",make(){const a=pick([1,2,3,5,7]),r1=pick([1,-1]);let r2=ri(-6,6);if(r2===r1)r2=r1+2;const b=-a*(r1+r2),c=a*r1*r2;
  return {enonce:`Résoudre $${poly(a,b,c)}=0$ sans calculer $\\Delta$ : cherche une racine évidente.`,
   etapes:[r1===1?`$a+b+c=${a}${b>=0?"+":""}${b}${c>=0?"+":""}${c}=0$ donc $x_1=1$ est racine évidente.`:`$a-b+c=${a}-${par(b)}${c>=0?"+":""}${c}=0$ donc $x_1=-1$ est racine évidente.`,
    `Produit des racines : $x_1\\times x_2=\\frac{c}{a}=${frac(c,a)}$`,`Donc $x_2=${r2}$`,`Vérification par la somme : $x_1+x_2=${r1+r2}$ et $-\\frac{b}{a}=${frac(-b,a)}$`,`Ainsi $S=\\left\\{${Math.min(r1,r2)}\\,;\\,${Math.max(r1,r2)}\\right\\}$`]}}},
 arbre:{nom:"Arbre pondéré",make(){const pa=pick([.2,.25,.3,.4,.45,.6,.7,.8]),pb=pick([.1,.2,.3,.4,.6,.7,.8,.9]),pc=pick([.05,.1,.2,.3,.4,.5,.6]);
  const ab=pa*pb,nb=(1-pa)*pc,pB=ab+nb;
  return {enonce:`On donne $P(A)=${fr(pa)}$, $P_A(B)=${fr(pb)}$ et $P_{\\overline{A}}(B)=${fr(pc)}$. Construire l’arbre, puis calculer $P(A\\cap B)$, $P(B)$ et $P_B(A)$ (arrondi au millième).`,
   etapes:[{t:"La somme des probabilités sur les branches partant d’un même nœud est égale à $1$.",arbre:{pa,pb,pc}},
    `$P(A\\cap B)=P(A)\\times P_A(B)=${fr(pa)}\\times${fr(pb)}=${fr(ab)}$`,
    `$P(\\overline{A}\\cap B)=P(\\overline{A})\\times P_{\\overline{A}}(B)=${fr(1-pa)}\\times${fr(pc)}=${fr(nb)}$`,
    `D’après la formule des probabilités totales : $P(B)=P(A\\cap B)+P(\\overline{A}\\cap B)=${fr(ab)}+${fr(nb)}=${fr(pB)}$`,
    `$P_B(A)=\\frac{P(A\\cap B)}{P(B)}=\\frac{${fr(ab)}}{${fr(pB)}}\\approx${fr(ab/pB,3)}$`]}}},
 tableau:{nom:"Tableau à double entrée",make(){const N=pick([200,400,500]),nA=Math.round(N*pick([.3,.4,.45,.6])),nAB=Math.round(nA*pick([.2,.25,.4,.5,.6])),nB=nAB+Math.round((N-nA)*pick([.1,.2,.3,.5]));
  const t={h:["","$B$","$\\overline{B}$","Total"],r:[["$A$",nAB,nA-nAB,nA],["$\\overline{A}$",nB-nAB,N-nA-nB+nAB,N-nA],["Total",nB,N-nB,N]]};
  return {enonce:`Voici les effectifs d’une population de ${N} personnes. On choisit une personne au hasard. Calculer $P(A)$, $P(A\\cap B)$, $P_A(B)$ et $P_B(A)$.`,tableau:t,
   etapes:[`$P(A)=\\frac{${nA}}{${N}}=${fr(nA/N)}$ : on le lit dans la dernière colonne.`,`$P(A\\cap B)=\\frac{${nAB}}{${N}}=${fr(nAB/N)}$ : à l’intersection de la ligne $A$ et de la colonne $B$.`,
    `$P_A(B)=\\frac{P(A\\cap B)}{P(A)}=\\frac{${nAB}}{${nA}}\\approx${fr(nAB/nA,3)}$`,`$P_B(A)=\\frac{P(A\\cap B)}{P(B)}=\\frac{${nAB}}{${nB}}\\approx${fr(nAB/nB,3)}$`]}}},
 indep:{nom:"Indépendants ou pas ?",make(){let pa,pb,prod,ok,inter;do{pa=pick([.2,.3,.4,.5,.6]);pb=pick([.2,.25,.3,.5,.8]);prod=Math.round(pa*pb*1e4)/1e4;ok=Math.random()<.5;inter=ok?prod:Math.round((prod+pick([-.05,.05,.1]))*1e4)/1e4}while(inter<=0||inter>Math.min(pa,pb)||pa+pb-inter>1);
  const useU=Math.random()<.35,uni=pa+pb-inter,et=[];
  if(useU)et.push(`$P(A\\cap B)=P(A)+P(B)-P(A\\cup B)=${fr(pa)}+${fr(pb)}-${fr(uni)}=${fr(inter)}$`);
  et.push(`$P(A)\\times P(B)=${fr(pa)}\\times${fr(pb)}=${fr(prod)}${ok?"=":"\\neq"}P(A\\cap B)$`,ok?"Ainsi, les événements $A$ et $B$ sont indépendants.":"Ainsi, les événements $A$ et $B$ ne sont pas indépendants.");
  return {enonce:`$P(A)=${fr(pa)}$, $P(B)=${fr(pb)}$ et ${useU?`$P(A\\cup B)=${fr(uni)}$`:`$P(A\\cap B)=${fr(inter)}$`}. Les événements $A$ et $B$ sont-ils indépendants ?`,etapes:et}}}
};
let AT={ch:null,key:null,ex:null,shown:0,ds:null};
/* Tableau à double entrée : une structure {h:[...], r:[[...]]}, chaque case passe par tex(). Jamais de HTML stocké. */
function tblHTML(t){if(!t||typeof t!=="object"||!Array.isArray(t.h)||!Array.isArray(t.r))return "";const c=x=>tex(String(x==null?"":x).slice(0,80));
  return `<table class="dbl"><tr>${t.h.slice(0,8).map(x=>`<th>${c(x)}</th>`).join("")}</tr>${t.r.slice(0,12).filter(Array.isArray).map(r=>`<tr><th>${c(r[0])}</th>${r.slice(1,8).map(x=>`<td>${c(x)}</td>`).join("")}</tr>`).join("")}</table>`}
function stepHTML(s){if(typeof s==="string")return tex(s);return (s.t?tex(s.t):"")+(s.arbre?arbreSVG(s.arbre):"")}
function atelierHTML(ch){
  const g=(ch.ateliers||[]).filter(k=>GEN[k]),ex=ch.exos||[],ds=ch.ds;
  if(!g.length&&!ex.length&&!ds)return "";
  const items=[...g.map(k=>({k:"g:"+k,l:GEN[k].nom})),...ex.map(e=>({k:"e:"+e.id,l:e.titre})),...(ds?[{k:"ds",l:"DS blanc"}]:[])];
  if(AT.ch!==ch.id){AT={ch:ch.id,key:items[0].k,ex:null,shown:0,ds:null}}
  return `<div class="sec" id="atTop"><h2>S’entraîner</h2><span>corrigés pas à pas</span></div>
   <div class="pick sm" id="atPick">${items.map(it=>`<button type="button" class="${it.k===AT.key?"on":""}" data-k="${esc(it.k)}">${esc(it.l)}</button>`).join("")}</div>
   <div id="atZone"></div>`;
}
function bindAtelier(ch){
  const pk=$("#atPick");if(!pk)return;
  pk.querySelectorAll("button").forEach(b=>b.onclick=()=>{AT.key=b.dataset.k;AT.ex=null;AT.shown=0;pk.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));drawAtelier(ch)});
  drawAtelier(ch);
}
function drawAtelier(ch){
  const z=$("#atZone");if(!z)return;const k=AT.key||"";
  if(k==="ds"){drawDS(ch,z);return}
  let ex,src,title,isGen=k.startsWith("g:");
  if(isGen){const G=GEN[k.slice(2)];if(!AT.ex)AT.ex=G.make();ex=AT.ex;title="Générateur · "+G.nom;src=null}
  else{ex=(ch.exos||[]).find(e=>"e:"+e.id===k);if(!ex){z.innerHTML="";return}title=ex.titre;src=ex.src}
  const n=ex.etapes.length;
  z.innerHTML=`<article class="exo" style="--suit:${suitOf(ch.mat)}"><div class="role"><span>${esc(title)}</span><span>${AT.shown} / ${n}</span></div>
   <div class="en">${tex(ex.enonce)}</div>${tblHTML(ex.tableau)?`<div class="tblw">${tblHTML(ex.tableau)}</div>`:""}
   <ol class="steps">${ex.etapes.slice(0,AT.shown).map((s,i)=>`<li data-i="${i}">${stepHTML(s)}</li>`).join("")}</ol>
   ${ex.note?`<p class="qsrc">${esc(ex.note)}</p>`:""}${src?`<div class="foot">${srcBadge(src)}${ex.corr==="claude"?'<span class="srcb verif">Correction écrite par Claude</span>':""}</div>`:""}
   <div class="exrow">${AT.shown<n?`<button class="btn" type="button" id="exNext">${AT.shown?"Étape suivante":"Voir la correction"}</button><button class="btn soft" type="button" id="exAll">Tout afficher</button>`:`<span class="exdone">Corrigé complet.</span>`}${isGen?`<button class="btn soft" type="button" id="exNew">Nouvel exercice</button>`:""}</div></article>`;
  const reveal=()=>{const li=z.querySelector(`.steps li[data-i="${AT.shown-1}"]`);if(li&&!reduce&&li.animate)li.animate([{opacity:0,transform:"perspective(500px) rotateX(-70deg)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE_OUT})};
  if($("#exNext"))$("#exNext").onclick=()=>{AT.shown++;snd();if(AT.shown===n)tickDay(),gainXP(3),saveP();drawAtelier(ch);reveal()};
  if($("#exAll"))$("#exAll").onclick=()=>{AT.shown=n;tickDay();saveP();drawAtelier(ch)};
  if($("#exNew"))$("#exNew").onclick=()=>{AT.ex=null;AT.shown=0;drawAtelier(ch);const e=z.querySelector(".exo");if(e&&!reduce&&e.animate)e.animate([{opacity:0,transform:"translateY(12px) scale(.98)"},{opacity:1,transform:"none"}],{duration:240,easing:EASE_OUT})};
}
let dsT=null;
function drawDS(ch,z){
  const ds=ch.ds,dur=Math.max(1,Math.min(240,Math.round(+ds.duree)||25)),ptsOf=it=>Math.max(0,Math.min(20,Math.round(+(it&&it.pts))||0)),items=(Array.isArray(ds.items)?ds.items:[]).filter(it=>it&&typeof it==="object");if(!AT.ds)AT.ds={left:dur*60,run:false,show:false,pts:{}};const S=AT.ds;
  const best=P.q["ds:"+ch.id];const tot=Object.values(S.pts).reduce((a,b)=>a+(+b||0),0);
  const mm=Math.floor(S.left/60),ss=S.left%60;
  z.innerHTML=`<article class="exo ds" style="--suit:${suitOf(ch.mat)}"><div class="role"><span>${esc(ds.titre)}</span><span>${best!=null?"record "+fr(best,1).replace("{,}",",")+"/10":""}</span></div>
   <div class="dstime${S.left<=300?" low":""}" id="dsClock">${pad(mm)}:${pad(ss)}</div>
   <div class="exrow" style="justify-content:center"><button class="btn" type="button" id="dsGo">${S.run?"Pause":S.left<dur*60?"Reprendre":"Démarrer"}</button><button class="btn soft" type="button" id="dsRe">Remise à zéro</button></div>
   <p class="qsrc" style="text-align:center">Feuille blanche, sans calculatrice. ${esc(ds.note||"")}</p>
   <ol class="dsq">${items.map(it=>`<li><span class="pts">${ptsOf(it)} pt${ptsOf(it)>1?"s":""}</span>${tex(it.t)}</li>`).join("")}</ol>
   <div class="exrow"><button class="btn soft" type="button" id="dsCor">${S.show?"Masquer la correction":"Afficher la correction"}</button></div>
   ${S.show?`<div class="dscor">${(Array.isArray(ds.correction)?ds.correction:[]).filter(c=>c&&typeof c==="object").map(c=>`<h3>${tex(c.t)}</h3><ol class="steps">${(Array.isArray(c.etapes)?c.etapes:[]).map(s=>`<li>${stepHTML(s)}</li>`).join("")}</ol>`).join("")}</div>
   <h3 class="autoh">Auto-évaluation</h3><div class="auto">${items.map((it,i)=>`<label>${esc(it.nom||("Partie "+(i+1)))}<select data-i="${i}">${Array.from({length:ptsOf(it)*2+1},(_,k)=>k/2).map(v=>`<option value="${v}"${+S.pts[i]===v?" selected":""}>${String(v).replace(".",",")} / ${ptsOf(it)}</option>`).join("")}</select></label>`).join("")}</div>
   <div class="dstot">${String(tot).replace(".",",")} / 10</div><div class="exrow" style="justify-content:center"><button class="btn" type="button" id="dsSave">Enregistrer ma note</button></div>`:""}</article>`;
  const tick=()=>{if(!S.run)return;S.left=Math.max(0,S.left-1);const c=$("#dsClock");if(c){c.textContent=pad(Math.floor(S.left/60))+":"+pad(S.left%60);c.classList.toggle("low",S.left<=300)}if(!S.left){S.run=false;clearInterval(dsT);dsT=null;snd();if($("#dsGo"))$("#dsGo").textContent="Démarrer"}};
  $("#dsGo").onclick=()=>{S.run=!S.run;if(S.run&&!dsT)dsT=setInterval(tick,1000);if(!S.run&&dsT){clearInterval(dsT);dsT=null}$("#dsGo").textContent=S.run?"Pause":"Reprendre"};
  $("#dsRe").onclick=()=>{S.run=false;if(dsT){clearInterval(dsT);dsT=null}S.left=dur*60;drawDS(ch,z)};
  $("#dsCor").onclick=()=>{S.show=!S.show;drawDS(ch,z)};
  z.querySelectorAll(".auto select").forEach(s=>s.onchange=()=>{S.pts[s.dataset.i]=+s.value;drawDS(ch,z)});
  if($("#dsSave"))$("#dsSave").onclick=()=>{const k="ds:"+ch.id;if(P.q[k]==null||tot>P.q[k])P.q[k]=tot;tickDay();saveP();const t=z.querySelector(".dstot");if(t&&!reduce&&t.animate)t.animate([{transform:"scale(1.15)",color:"#E7C66B"},{transform:"none"}],{duration:300,easing:EASE_OUT});$("#dsSave").textContent="Note enregistrée"};
}


/* ================= LIGUE ET RÉCOMPENSES ================= */
const CAP=300;
const DIVS=["Bronze","Argent","Or","Diamant"];
const DOS=[{id:"classique",nom:"Classique",xp:0},{id:"tricolore",nom:"Tricolore",xp:150},{id:"assignat",nom:"Assignat",xp:400},{id:"or",nom:"Or 1793",xp:800},{id:"nuit",nom:"Nuit étoilée",xp:1500},{id:"holo",nom:"Holographique",xp:2500},{id:"equipe",nom:"Équipe",rw:"equipe"},{id:"saison",nom:"Saison",rw:"saison"}];
const LG={ok:false,ref:null,rows:[],me:null,nick:cleanNick(LS.get("nick","")),div:0,res:null,ro:false,t:null,rolled:false,defi:null,seen:false,cur:"HUB",per:"sem",shop:"dos",rxOpen:null,inv:false,dc:null};
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const WEEK=isoOf(mondayOf(NOW));
function weekSum(){const m=mondayOf(NOW);let s=0;for(let i=0;i<7;i++){const d=new Date(m);d.setDate(m.getDate()+i);s+=P.x[isoOf(d)]||0}return s}
function giftSum(k){return Object.values(P.gx||{}).reduce((a,g)=>a+(g&&+g[k]>0?Math.min(+g[k],1e12):0),0)}
/* XP total : tout ce que tu as gagné depuis le début. Il ne baisse jamais. */
function totalXP(){return Object.values(P.x).reduce((a,b)=>a+(+b||0),0)+giftSum("xp")}
/* Pièces : 1 pièce par XP gagné, plus les cadeaux. On les dépense dans la boutique. */
function coinsEarned(){return totalXP()+giftSum("co")}
function coinsSpent(){return Object.values(P.buy||{}).reduce((a,b)=>a+(+b>0?+b:0),0)}
function coins(){return coinsEarned()-coinsSpent()}
const fmtN=n=>Number(n||0).toLocaleString("fr-FR");
function streakNow(){let s=0;for(let i=0;i<400;i++){const d=new Date(NOW);d.setDate(d.getDate()-i);if(P.j[isoOf(d)]||P26ui._gel(isoOf(d)))s++;else if(i>0)break}return s}
function gainXP(n,el){
  const cur=P.x[TODAY_ISO]||0;let add=n;
  if(!cur){const y=new Date(NOW);y.setDate(y.getDate()-1);if(P.j[isoOf(y)])add+=10}
  add=Math.max(0,Math.min(add,CAP-cur));if(!add)return;
  P.x[TODAY_ISO]=cur+add;saveP();lgPush();xpFloat(add,el);checkRewards();P26ui.emit("xp",add);
}
function xpFloat(n,el){if(reduce)return;const a=el||$("#cWon");if(!a||!a.getBoundingClientRect)return;const r=a.getBoundingClientRect();if(!r.width)return;
  const f=document.createElement("div");f.className="xpf";f.textContent="+"+n;f.style.left=(r.left+r.width/2-10)+"px";f.style.top=(r.top-6)+"px";document.body.appendChild(f);
  f.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"translateY(-10px)",offset:.3},{opacity:0,transform:"translateY(-28px)"}],{duration:900,easing:EASE_OUT}).onfinish=()=>f.remove()}
/* Trophées : calculés depuis ta progression */
function trophies(){
  const boxes=Object.values(P.c);const won=boxes.filter(v=>v[0]>=1).length;
  const duel10=Object.entries(P.q).some(([k,v])=>!k.startsWith("ds:")&&v===10);
  const paquet=C.ready&&Object.values(C.chaps).some(ch=>(ch.paquets||[]).some(p=>(p.cartes||[]).length>=4&&p.cartes.every(c=>boxOf(c.id)>=3)));
  const defi10=Object.values(P.df).some(v=>v&&v.s===10);
  return [
    {id:"debut",m:"I",nom:"Première carte",cond:"Joue une carte",got:boxes.length>0},
    {id:"serie7",m:"VII",nom:"Sept soirs",cond:"7 soirs d’affilée",got:streakNow()>=7||!!P.t.serie7},
    {id:"dix",m:"X",nom:"Sans faute",cond:"10/10 en duel",got:duel10},
    {id:"paquet",m:"♣",nom:"Paquet maîtrisé",cond:"Toutes les cartes d’un paquet maîtrisées",got:paquet||!!P.t.paquet},
    {id:"cent",m:"C",nom:"Cent cartes",cond:"100 cartes gagnées",got:won>=100||!!P.t.cent},
    {id:"defi",m:"★",nom:"Défi parfait",cond:"10/10 au défi du jour",got:defi10},
    {id:"focus",m:"F",nom:"En focus",cond:"Termine un mode focus",got:(P.fz||0)>=1},
    {id:"diamant",m:"◆",nom:"Diamant",cond:"Atteins la division Diamant",got:(LG.div||0)>=3||!!P.t.diamant},
    {id:"fiche",m:"✎",nom:"Première fiche",cond:"Crée ta fiche",got:(P.fc||0)>=1||!!P.t.fiche},
    {id:"equipe",m:"∞",nom:"Esprit d’équipe",cond:"Objectif de ligue réussi",got:!!(P.rw&&P.rw.equipe)},
    {id:"champion",m:"♛",nom:"Champion",cond:"1er d’une saison",got:!!P.t.champion},
    {id:"ami",m:"⚔",nom:"Défi relevé",cond:"Bats un ami avec un code",got:!!P.t.ami},
    {id:"bac",m:"XV",nom:"Mention",cond:"15/20 au bac blanc",got:Object.values(P.bb||{}).some(v=>v&&v.s>=15)},
    {id:"plan",m:"✓",nom:"Bien préparé",cond:"Coche 3 séances du plan",got:Object.keys(P.pl||{}).length>=3},
    {id:"quete",m:"Q",nom:"Trois sans-faute",cond:"Les 3 quêtes d’une même semaine",got:questWeeksFull()||!!P.t.quete}
  ];
}
function dosUnlocked(){return DOS.filter(d=>owned(d))}
let toastQ=[],toastOn=false;
function toast(html){toastQ.push(html);if(!toastOn)nextToast()}
function nextToast(){const el=$("#toast");const h=toastQ.shift();if(!h){toastOn=false;return}toastOn=true;el.innerHTML=h;void el.offsetWidth;el.classList.add("on");buzz(18);
  setTimeout(()=>{el.classList.remove("on");setTimeout(nextToast,500)},2800)}
function markLigue(on){const b=document.querySelector('nav.dock button[data-v="ligue"]');if(!b)return;let d=b.querySelector(".nb");if(on&&!d){d=document.createElement("span");d.className="nb";b.appendChild(d)}if(!on&&d)d.remove()}
function checkRewards(silent){
  let changed=false;
  trophies().forEach(t=>{if(t.got&&!P.t[t.id]){P.t[t.id]=TODAY_ISO;changed=true;P26ui.emit("trophee",t.id);if(!silent){toast(`<span class="tm">${esc(t.m)}</span><div><b>Trophée : ${esc(t.nom)}</b><span>${esc(t.cond)}</span></div>`);markLigue(true)}}});
  const un=dosUnlocked().map(d=>d.id),seen=Array.isArray(P.dsn)?P.dsn:DOS.slice(0,P.ds||1).map(d=>d.id),nw=un.filter(id=>!seen.includes(id));
  if(nw.length||!Array.isArray(P.dsn)){if(!silent)nw.forEach(id=>{const d=DOS.find(x=>x.id===id);toast(`<i class="dosv" data-d="${d.id}"></i><div><b>Nouveau dos : ${esc(d.nom)}</b><span>Choisis-le dans la boutique</span></div>`);markLigue(true)});P.dsn=un;changed=true}
  shopCheck(silent);
  if(changed){saveP();lgPush()}
}
/* Ligne de classement : chacun n'écrit que la sienne (ligue/<son id>) */
function lgRow(){const me=LG.me||{};const df=P.df[TODAY_ISO];
  return Object.assign({nick:LG.nick,av:avData(),avk:avK(),cl:(P.pf&&P.pf.cl)||"",sk:{ch:chromaNow(),w:(P.sk&&P.sk.w)||""},mo:{[MON]:monthSum(MON),[PMON]:monthSum(PMON)},rx:rxClean(LG.myRx),sem:WEEK,xp:weekSum(),tot:totalXP(),div:LG.div||0,dos:P.dos||"classique",tr:Object.keys(P.t).filter(k=>/^[A-Za-z0-9_-]{1,30}$/.test(k)).slice(0,40),elo:myElo(),nch:Object.keys(IMP.mine||{}).length+((IMP.pub&&IMP.pub[UID])||[]).length,
    jour:df?{d:TODAY_ISO,s:df.s,ms:df.ms}:(me.jour&&me.jour.d===TODAY_ISO?me.jour:null),res:LG.res||null,upd:Date.now()},P26ui._champs())}
function lgPush(now){if(!LG.ref||!LG.nick||LG.ro)return;clearTimeout(LG.t);
  const go=async()=>{const row=lgRow();try{await LG.ref.set(row);LG.me=row}catch(e){if(e&&(e.code==="invalid_argument"||e.code==="not_granted")){LG.ro=true;guestOn();if(view==="ligue"&&!LG.defi)renderLigue()}}};
  if(now)return go();LG.t=setTimeout(go,1500)}
/* Ligne de ligue lue (la sienne ou celle d'un autre compte) : chaque champ affiché est forcé dans sa forme.
   Les codes de club n'y sont plus lus : l'appartenance vient de la base (P26.clubs). */
function lgClean(d,id){d=d&&typeof d==="object"&&!Array.isArray(d)?d:{};const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const o=Object.assign({},d,{id:String(id)});delete o.codes;delete o.mesLigues;
  o.nick=cleanNick(typeof d.nick==="string"?d.nick:"");o.cl=clip(typeof d.cl==="string"?d.cl:"",12);o.sem=typeof d.sem==="string"?d.sem.slice(0,12):"";
  o.xp=N(d.xp,0,1e7);o.tot=N(d.tot,0,1e9);o.div=N(d.div,0,9);o.nch=N(d.nch,0,1e4);if("elo" in d)o.elo=N(d.elo,0,1e5);
  o.dos=typeof d.dos==="string"&&/^[a-z0-9-]{1,24}$/.test(d.dos)?d.dos:"classique";
  o.mo=d.mo&&typeof d.mo==="object"&&!Array.isArray(d.mo)?Object.fromEntries(Object.entries(d.mo).filter(([k])=>/^\d{4}-\d{2}$/.test(k)).slice(0,4).map(([k,v])=>[k,N(v,0,1e8)])):{};
  o.tr=Array.isArray(d.tr)?d.tr.filter(x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,30}$/.test(x)).slice(0,40):[];
  const j=d.jour;o.jour=j&&typeof j==="object"&&isoOk(j.d)?{d:j.d,s:N(j.s,0,10),ms:N(j.ms,0,36e5)}:null;
  if(o.res!=null&&(typeof o.res!=="object"||Array.isArray(o.res)))o.res=null;
  P26ui._propre(d,o);
  return o}
async function ligueInit(){
  if(!DB||!UID){LG.ok=false;return}
  LG.ok=true;LG.ref=DB.doc("ligue/"+UID);
  try{const s=await LG.ref.get();LG.me=s.exists?s.data():null}catch(e){LG.me=null}
  if(LG.me){delete LG.me.codes;delete LG.me.mesLigues;LG.nick=cleanNick(LG.me.nick||LS.get("nick",""));LG.div=+LG.me.div||0;LG.res=LG.me.res||null;if(!P.dos&&LG.me.dos)P.dos=LG.me.dos;LG.myRx=rxClean(LG.me.rx)}
  document.body.dataset.dos=P.dos||"classique";applySkin();
  DB.collection("ligue").onSnapshot(s=>{LG.rows=s.docs.map(d=>lgClean(d.data(),d.id));
    if(LG.me&&LG.me.sem&&LG.me.sem!==WEEK&&!LG.rolled)rollWeek();
    seasonCheck();goalCheck();duelCheck();
    if(view==="ligue"&&!LG.defi)renderLigue()},()=>{});
  checkRewards(true);if(LG.me)lgPush();
  clubsLoad();
}
/* Fin de semaine : montée si tu finis dans la première moitié avec 100 XP ou plus, descente si 0 XP */
function rollWeek(){LG.rolled=true;return;const prev=LG.me.sem;
  const rows=LG.rows.filter(r=>r.sem===prev).sort((a,b)=>(b.xp||0)-(a.xp||0)||String(a.id).localeCompare(String(b.id)));
  const n=rows.length,rk=rows.findIndex(r=>r.id===UID)+1,xp=+LG.me.xp||0;let mv=0;
  if(xp>=100&&rk>0&&rk<=Math.ceil(n/2)&&LG.div<3)mv=1;else if(xp===0&&LG.div>0)mv=-1;
  LG.div=(LG.div||0)+mv;LG.res={sem:prev,rk,n,mv,xp};lgPush(true);checkRewards();applySkin();
}
const xpOf=r=>LG.per==="mois"?(r.id===UID?monthSum(MON):(+(r.mo&&r.mo[MON])||0)):(r.id===UID?weekSum():(r.sem===WEEK?(+r.xp||0):0));
function lgRanking(){const rows0=LG.rows.filter(r=>r.nick&&(inCur(r)||r.id===UID));if(LG.nick&&!rows0.find(r=>r.id===UID))rows0.push(P26ui._moi({id:UID,nick:LG.nick,div:LG.div,dos:P.dos}));
  const rows=rows0.map(r=>Object.assign({},r,{wx:eloOf(r.id),np:eloN(r.id),me:r.id===UID,div:eloDiv(eloOf(r.id)),dos:r.id===UID?(P.dos||"classique"):(r.dos||"classique")})).sort((a,b)=>b.wx-a.wx||b.np-a.np||String(a.nick).localeCompare(String(b.nick)));return P26ui._filtre(rows)}
function weekLabel(){const m=mondayOf(NOW),e=new Date(m);e.setDate(m.getDate()+6);const left=Math.max(0,Math.round((e-new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate()))/864e5));
  return `Semaine du ${m.getDate()} ${MOIS[m.getMonth()]} · ${left?"fin dans "+left+" j":"dernier jour"}`}
const DEFI={pool:null,req:false};function defiLoad(){if(DEFI.req||typeof fetch!=="function")return;DEFI.req=true;fetch("prog/defi.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{if(Array.isArray(j)&&j.length>=10){DEFI.pool=j;if(view==="ligue"&&!LG.defi)renderLigue()}else DEFI.req=false}).catch(()=>{DEFI.req=false})}
function defiQs(){defiLoad();const all=(DEFI.pool||Object.values(C.qs).filter(x=>!x.ch._doc||(x.ch.vis||"hub")==="hub").map(x=>x.q)).filter(q=>q&&q.ok&&(q.no||[]).length).sort((a,b)=>a.id<b.id?-1:1);
  let seed=0;for(const ch of TODAY_ISO)seed=(seed*31+ch.charCodeAt(0))|0;const r=rng(seed);
  return sshuffle(all,r).slice(0,10).map(q=>({q,opts:optsOf(q,r)}))}
function renderLigue(){
  LG.cur="HUB";eloLoad();if(SOC()&&Date.now()-NT.amisT>20000)amisLoad().then(()=>{if(view==="ligue"&&!LG.defi)renderLigue()});
  markLigue(false);const box=$("#lg");
  if(!C.ready){box.innerHTML=`<p class="loading">${dbState==="off"?"Ouvre la page depuis claude.ai, connecté, pour voir la ligue.":"Chargement de la ligue…"}</p>`;return}
  if(!LG.ok){box.innerHTML=`<div class="lgtop"><h1>Ligue</h1></div><p class="guestnote"><b>Mode invité.</b> Connecte-toi pour apparaître dans le classement. En attendant, défie tes amis avec un code : ils jouent les mêmes questions que toi.</p>`+friendsHTML()+shopHTML(totalXP());bindFriends();bindShop();return}
  const rk=lgRanking(),meI=rk.findIndex(r=>r.me),wk=weekSum(),tot=totalXP(),today=P.x[TODAY_ISO]||0;
  const cn=coins(),nx=DOS.find(d=>!d.rw&&!owned(d));
  let h=`<div class="lgtop"><h1>Ligue</h1>${LG.nick?`<span class="dv" data-v="${LG.div}">${DIVS[LG.div]}</span>`:""}</div><p class="lgsub">${weekLabel()}</p>`+(LG.nick?lgPickHTML():"");
  const pm=mondayOf(NOW);pm.setDate(pm.getDate()-7);
  if(LG.res&&LG.res.sem===isoOf(pm)){const r=LG.res;h+=`<p class="lgres">Semaine passée : <b>${r.rk?r.rk+(r.rk===1?"er":"e")+" sur "+r.n:"pas classé"}</b> avec ${r.xp} XP. ${r.mv>0?"Tu montes en <b>"+DIVS[LG.div]+"</b>.":r.mv<0?"Tu redescends en "+DIVS[LG.div]+" : une donne par soir suffit pour remonter.":"Tu restes en "+DIVS[LG.div]+"."}</p>`}
  if(!LG.nick){
    h+=`<div class="lgjoin"><h2>Rejoins la ligue</h2><p>Chaque carte, duel et défi te rapporte de l’XP et des pièces. Le classement se fait à l’Elo, qui ne repart jamais à zéro.</p>
     <label class="lab" for="lgNick">Ton pseudo</label><div class="olrow"><input id="lgNick" class="inp" maxlength="16" autocomplete="off" value="${esc(OL.nick||"")}" placeholder="Ex. Jeremy"><button class="btn" type="button" id="lgJoin">Rejoindre</button></div><p class="olerr" id="lgErr" role="alert"></p></div>`;
  } else {
    h+=`<div class="lgme"><span class="rk">${meI+1}<small>${meI===0?"er":"e"}</small></span><b>${esc(LG.nick)}</b><span class="xp">${fmtN(myElo())}<small>Elo · ${eloN(UID)} partie${eloN(UID)>1?"s":""} classée${eloN(UID)>1?"s":""}</small></span><span>Cette semaine : ${fmtN(wk)} XP${today>=CAP?" · plafond du jour atteint":""}</span></div>
     <div class="exrow" style="margin-top:10px"><button class="btn ghost" type="button" id="lgCard">Ma carte de score</button><span class="istat" id="lgCardSt" role="status"></span></div>`;
    if(LG.ro||GUEST)h+=`<p class="guestnote"><b>Mode invité.</b> Tes points, tes cartes et tes fiches restent sur ce téléphone. Reconnecte-toi pour apparaître dans le classement.</p>`;
  }
  if(LG.nick&&!LG.ro)h+=goalHTML();
  h+=amisHTML()+`<div data-slot="ligue.haut"></div><div class="sec"><h2>Classement Elo</h2><span>ne repart jamais à zéro</span></div><p class="muted" style="margin:-4px 0 10px;font-size:.85rem">Tout le monde part à 1000. L’Elo bouge seulement dans les parties classées à plusieurs : duel en ligne et Arène. Battre plus fort que toi rapporte plus.</p>`;
  if(rk.length){const half=Math.ceil(rk.length/2);
    const canRx=LG.nick&&!LG.ro&&!GUEST;
    h+=`<ol class="lgl">`+rk.map((r,i)=>`<li class="${r.me?"me":""}" data-id="${esc(r.id)}"><span class="r">${i+1}</span>${avHTML(r.me?P26ui._moi({nick:LG.nick,av:avData(),avk:avK(),sk:{ch:chromaNow()}}):r,"sm")}<span class="n"></span><span class="x">${fmtN(r.wx)}<small>${r.np} partie${r.np>1?"s":""}</small></span>${!r.me&&canRx?`<button class="rxb${myRx(r.id)?" on":""}" type="button" data-rx="${esc(r.id)}" aria-label="Réagir">${myRx(r.id)?esc(myRx(r.id)):"+"}</button>`:"<span></span>"}</li>${LG.rxOpen===r.id?`<li class="rxp">${RX.map(e=>`<button type="button" data-e="${e}" data-t="${esc(r.id)}">${e}</button>`).join("")}</li>`:""}`).join("")+`</ol>`;
  } else h+=`<p class="muted" style="margin:0">Personne encore. Rejoins la ligue, puis invite tes amis.</p>`;
  const df=P.df[TODAY_ISO],drows=LG.rows.filter(r=>r.nick&&r.jour&&r.jour.d===TODAY_ISO&&(inCur(r)||r.id===UID)).map(r=>({nick:r.nick,s:Math.max(0,Math.min(10,Math.round(+r.jour.s)||0)),ms:Math.max(0,Math.round(+r.jour.ms)||0),me:r.id===UID}));
  if(df&&!drows.find(r=>r.me)&&LG.nick)drows.push({nick:LG.nick,s:df.s,ms:df.ms,me:true});
  drows.sort((a,b)=>b.s-a.s||a.ms-b.ms);
  const nq=defiQs().length;
  h+=`<div class="sec" id="lgDefi"><h2>Défi du jour</h2><span>${fmtLong.format(NOW)}</span></div><div class="defi">`+
    (df?`<div class="sc">${df.s}/10</div><p>${(df.ms/1000).toFixed(1).replace(".",",")} s · nouveau défi demain</p>`
       :nq>=10?`<h3>10 questions, une seule tentative</h3><p>Les mêmes pour toute la ligue. À égalité, le plus rapide gagne. 2 XP par bonne réponse.</p><button class="btn" type="button" id="dfGo">Jouer le défi</button>`
       :`<p>Pas assez de questions de duel pour un défi.</p>`)+
    duelHTML()+(drows.length?`<ol class="dlist">${drows.slice(0,6).map((r,i)=>`<li class="${r.me?"me":""}"><span class="r">${i+1}</span><span class="dn"></span><span>${r.s}/10 · ${(r.ms/1000).toFixed(1).replace(".",",")} s</span></li>`).join("")}</ol>`:"")+`</div>`;
  h+=friendsHTML();
  h+=`<div class="sec"><h2>XP et pièces</h2></div>`+xpExplainHTML();
  if(nx)h+=`<div class="sec"><h2>Boutique</h2><span>${fmtN(cn)} pièces</span></div><div class="nextd"><i class="dosv" data-d="${nx.id}"></i><b>${cn>=nx.xp?"Tu peux acheter « "+esc(nx.nom)+" » : touche-le dans la boutique":"Encore "+fmtN(nx.xp-cn)+" pièces pour « "+esc(nx.nom)+" »"}</b><span class="bar" style="--p:${Math.min(1,cn/nx.xp).toFixed(3)}"><i></i></span></div>`;
  h+=shopHTML(tot,!nx);
  const tr=trophies();
  h+=`<div class="sec"><h2>Trophées</h2><span>${tr.filter(t=>t.got).length} / ${tr.length}</span></div><div class="trog">${tr.map(t=>`<div class="tro${t.got?" got":""}"><i>${esc(t.m)}</i><b>${esc(t.nom)}</b><small>${esc(t.cond)}</small></div>`).join("")}</div>`;
  h+=`<details class="lghelp"><summary>Comment gagner des points</summary><ul>
    <li><b>Carte sue</b> : 2 XP. <b>Carte à revoir</b> : 1 XP, l’effort compte.</li>
    <li><b>Duel</b> : 1 XP par bonne réponse, 5 XP de bonus pour un 10/10.</li>
    <li><b>Défi du jour</b> : 2 XP par bonne réponse. <b>Exercice corrigé terminé</b> : 3 XP.</li>
    <li><b>Série</b> : 10 XP au premier point du jour si tu as joué la veille.</li>
    <li><b>Pièces</b> : chaque XP gagné te donne aussi 1 pièce. Les pièces s’achètent rien, elles se gagnent, et elles ne disparaissent jamais : tu les dépenses dans la boutique quand tu veux.</li>
    <li>Plafond de ${CAP} XP par jour. L’XP sert au niveau et aux pièces, pas au classement.</li><li><b>Classement</b> : à l’Elo, qui ne repart jamais à zéro. Divisions : Bronze sous 1100, Argent dès 1100, Or dès 1250, Diamant dès 1400.</li></ul></details>`;
  h+=INVITE_HELP_F();
  box.innerHTML=h;amisBind(box);P26ui.slot("ligue.haut",box.querySelector('[data-slot="ligue.haut"]'));
  box.querySelectorAll(".lgl li[data-id]").forEach((li,i)=>{const r=rk[i];li.querySelector(".n").textContent=r.nick;const rx=rxFor(r.id);if(rx.length){const sp=document.createElement("span");sp.className="rxs";rx.slice(0,3).forEach(([e,n])=>{const x=document.createElement("span");x.textContent=e+(n>1?" "+n:"");sp.appendChild(x)});li.querySelector(".n").appendChild(sp)}const sm=document.createElement("small");sm.textContent=(r.me?(GUEST||LG.ro?"toi, invité · ":"toi · "):"")+DIVS[r.div||0]+(r.cl?" · "+String(r.cl).slice(0,12):"");li.querySelector(".n").appendChild(sm);const p1s=P26ui.sousHTML(r.me?P26ui._moi(r):r);if(p1s){const s2=document.createElement("small");s2.className="p1s";s2.innerHTML=p1s;li.querySelector(".n").appendChild(s2)}});
  box.querySelectorAll(".dlist li").forEach((li,i)=>{li.querySelector(".dn").textContent=drows[i].nick+(drows[i].me?" (toi)":"")});
  if($("#lgJoin"))$("#lgJoin").onclick=async()=>{const n=cleanNick($("#lgNick").value);if(!n){$("#lgErr").textContent="Choisis un pseudo d’abord.";$("#lgNick").focus();return}
    LG.nick=n;OL.nick=n;LS.set("nick",n);$("#lgJoin").disabled=true;await lgPush(true);
    if(LG.ro)guestOn();renderLigue()};
  if($("#dfGo"))$("#dfGo").onclick=()=>{LG.defi={qs:defiQs(),i:0,ok:0,ms:0,t0:0};renderDefi()};
  bindShop();bindFriends();
  if($("#lgPer"))$("#lgPer").querySelectorAll("button").forEach(b=>b.onclick=()=>{LG.per=b.dataset.p;renderLigue()});
  box.querySelectorAll("[data-rx]").forEach(b=>b.onclick=()=>{LG.rxOpen=LG.rxOpen===b.dataset.rx?null:b.dataset.rx;renderLigue()});
  box.querySelectorAll(".rxp button").forEach(b=>b.onclick=()=>setRx(b.dataset.t,b.dataset.e));
  if($("#lgCard"))$("#lgCard").onclick=()=>scoreCard({titre:"Ma semaine",big:String(weekSum()),unit:"XP",sub:(meI>=0?(meI+1)+(meI===0?"er":"e")+" de "+ligName(LG.cur):"")},$("#lgCardSt"));
  if($("#lgInv"))$("#lgInv").onclick=()=>{LG.inv=!LG.inv;renderLigue()};
  if($("#invCopy"))$("#invCopy").onclick=async()=>{const t=$("#invTxt");t.select();let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){try{ok=document.execCommand("copy")}catch(e2){}}$("#invSt").textContent=ok?"Copié. Colle-le dans ta conversation de groupe.":"Sélectionne le texte et copie-le."};
  if($("#invShare"))$("#invShare").onclick=async()=>{try{await navigator.share({text:$("#invTxt").value})}catch(e){$("#invSt").textContent="Partage impossible ici : copie le texte."}};
  bindLgPick();
  const hm=String(location.hash||"").match(/ligue=([A-Za-z0-9]{5})/);if(hm&&LG.nick&&!LG.hashDone){LG.hashDone=true;const c=hm[1].toUpperCase();if(!myCodes().includes(c))lgForm("join",c)}
}
function renderDefi(){
  const D=LG.defi,N=D.qs.length,box=$("#lg");if(D.done)return;
  if(D.code&&D.i>=N){codeEnd(D,box);return}
  if(D.i>=N){const s=D.ok;P.df[TODAY_ISO]={s,ms:D.ms};saveP();D.done=true;gainXP(2*s);lgPush(true);checkRewards();
    box.innerHTML=`<div class="result"><div class="sc">${s}/${N}</div><p>${s===10?"Sans faute. Regarde où tu te places.":s>=7?"Belle manche. Le classement du jour t’attend.":"Tes erreurs partent dans la pile du Jeu."}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn light" type="button" id="dfBack">Voir le classement</button><button class="btn ghost" type="button" id="dfCard">Ma carte de score</button>${s<10?'<button class="btn ghost" type="button" id="dfErr">Mes erreurs</button>':""}</div><p class="istat" id="dfSt" role="status"></p></div>`;
    $("#dfCard").onclick=()=>scoreCard({titre:"Défi du jour",big:s+"/10",sub:(D.ms/1000).toFixed(1).replace(".",",")+" s"},$("#dfSt"));
    $("#dfBack").onclick=()=>{LG.defi=null;renderLigue()};if($("#dfErr"))$("#dfErr").onclick=()=>{LG.defi=null;sel.mat="@err";go("jeu");startPile()};return}
  D.res=D.res||[];const Q=D.qs[D.i],qx=C.qs[Q.q.id],ch=qx?qx.ch:null;D.t0=performance.now();
  box.innerHTML=`<div class="qcard" style="--suit:${ch?suitOf(ch.mat):"var(--red)"}"><div class="role"><span>${D.code?"Défi "+esc(D.code):"Défi du jour"}${ch?" · "+esc(matName(ch.mat)):""}</span><span>${D.i+1} / ${N}</span></div><h2>${tex(Q.q.q)}</h2>
    ${Q.opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="why"></div></div>
    <div class="dots">${D.qs.map((_,i)=>`<i class="${i<D.i?(D.res&&D.res[i]?"w":"l"):i===D.i?"cur":""}"></i>`).join("")}</div>`;
  const btns=[...box.querySelectorAll(".opt")];
  btns.forEach(b=>b.onclick=()=>{D.ms+=Math.round(performance.now()-D.t0);const good=!!Q.opts[+b.dataset.i].ok;D.res[D.i]=good;if(good)D.ok++;
    jrn(Q.q.id,good,Math.round(performance.now()-D.t0),"defi");if(good)delete P.e[Q.q.id];else P.e[Q.q.id]=Date.now();if(!D.code)tickDay();saveP();
    btns.forEach(x=>{x.disabled=true;if(Q.opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});reactOpt(b,good,btns.find(x=>Q.opts[+x.dataset.i].ok));
    $("#why").innerHTML=`<p class="why"><b>${good?"Gagné.":"Perdu."}</b> ${tex(Q.q.why||"")}</p><div style="margin-top:14px"><button class="btn" type="button" id="nx">${D.i<N-1?"Question suivante":"Voir le score"}</button></div>`;
    $("#nx").onclick=()=>{D.i++;renderDefi()};$("#nx").focus()});
}


/* ================= LIGUES PAR CODE ================= */
/* Clubs : la liste vient de la base (window.P26.clubs.mes()). P.lg n'est plus qu'un cache pour le hors ligne,
   le mode invité et le mode démo. Aucun code de club n'est publié dans ligue/<uid>. */
const CLUB={list:null,t:0,busy:false,sync:false};
const clubApi=()=>(window.P26&&window.P26.clubs)||null;
function cacheCodes(){const lg=P.lg||{};return (Array.isArray(lg.codes)?lg.codes:[]).filter(c=>typeof c==="string"&&/^[A-Z0-9]{5}$/.test(c)&&(!(lg.left&&lg.left[c])||(lg.joined&&lg.joined[c]||0)>lg.left[c]))}
function myCodes(){return CLUB.list?CLUB.list.map(c=>c.code):cacheCodes()}
function clubCache(){const L=CLUB.list;if(!L)return;const lg=P.lg=P.lg||{};const before=JSON.stringify(lg);
  lg.codes=L.map(c=>c.code);lg.mine=Object.fromEntries(L.map(c=>[c.code,c.nom]));lg.joined=Object.assign({},lg.joined||{});lg.left=Object.assign({},lg.left||{});
  L.forEach(c=>{if(!lg.joined[c.code]||(lg.left[c.code]||0)>=lg.joined[c.code])lg.joined[c.code]=Date.now()});
  if(JSON.stringify(lg)!==before)saveP()}
function clubForget(c){const lg=P.lg=P.lg||{};lg.left=Object.assign({},lg.left||{},{[c]:Date.now()});lg.codes=(lg.codes||[]).filter(x=>x!==c);if(CLUB.list)CLUB.list=CLUB.list.filter(x=>x.code!==c);saveP()}
async function clubsLoad(){const A=clubApi();if(DEMO||GUEST||!DB||!UID||!A||CLUB.busy)return;CLUB.busy=true;CLUB.t=Date.now();
  try{const vus=new Set(cacheCodes()),L=await A.mes();if(!Array.isArray(L))return;
    CLUB.list=L.filter(c=>c&&typeof c.code==="string"&&/^[A-Z0-9]{5}$/.test(c.code)).map(c=>({code:c.code,nom:clip(c.nom,24)||"Club "+c.code,createur:!!c.createur,membres:Math.max(0,Math.round(+c.membres)||0)}));
    /* Codes du cache absents de la liste de la base : la migration (sql/6) a déjà repris tous les anciens codes,
       donc un tel code est un club créé par l'ancienne page (inconnu en base) ou quitté ailleurs. On l'oublie
       sans appeler club_rejoindre : aucun essai raté n'est compté, l'élève ne peut pas se bloquer lui-même.
       Seuls les codes présents avant la lecture (vus) sont concernés : un club créé pendant la lecture reste. */
    if(!CLUB.sync){CLUB.sync=true;const srv=new Set(CLUB.list.map(c=>c.code));cacheCodes().filter(c=>vus.has(c)&&!srv.has(c)).forEach(c=>clubForget(c))}
    clubCache()}
  catch(e){/* hors ligne ou fonction absente : on garde le cache P.lg */}
  finally{CLUB.busy=false}
  if(!C.ready)return;fiExt();
  if(view==="clubs"){mergeAll();reindex();if(!$("#clubInput"))renderClubs()}else rebuild()}
function inCur(r){return true} // Le classement compétitif est toujours global.
function ligName(c){if(c==="HUB")return "Ligue globale";const k=CLUB.list&&CLUB.list.find(x=>x.code===c);if(k)return k.nom;if(P.lg&&P.lg.mine&&P.lg.mine[c])return clip(P.lg.mine[c],24);return "Club "+c}
function lgPickHTML(){return `<div class="exnav"><button type="button" id="openClubs">Mes clubs <span>${myCodes().length}</span></button><button type="button" id="openQuests">Quêtes <span>${questsDone()} / ${QUEST_CATS.length}</span></button></div><p class="exnote">Un seul classement pour tout le hub. Les clubs servent à partager des cours et à discuter.</p><div id="lgForm"></div>`}
function bindLgPick(){if($("#openClubs"))$("#openClubs").onclick=()=>go("clubs");if($("#openQuests"))$("#openQuests").onclick=()=>go("quetes")}
function lgForm(kind,pre){go("clubs");clubForm(kind);if(pre)$("#clubInput").value=pre}

const INVITE_HELP_F=()=>`<details class="lghelp"><summary>Inviter tes amis</summary><ol>
  <li>Envoie-leur l’adresse du site : <b>${esc(HUB_URL)}</b></li>
  <li>Chacun crée son compte avec un pseudo et un mot de passe. Pas d’e-mail, pas de compte Claude.</li>
  <li>Ton ami rejoint ta ligue avec son code à 5 lettres, et vous êtes dans le même classement.</li></ol></details>`;

/* ================= IMPORTS : CHACUN APPORTE SES COURS ================= */
const HUB_URL=location.origin+location.pathname.replace(/index\.html$/,"");
const IMP={isOwner:false,pub:{},pubEch:{},mine:{},ech:[],subs:{},sample:null,caps:null};
const IMPV={need:false,tab:"ech",pfile:null,prefill:null,draft:null,ctl:null,eDraft:null,prev:"table",autoVis:"hub"};
const slug=t=>String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,24)||"matiere";
const PAL=["#5B4B8A","#2F6F73","#8A5A2B","#3E6B2F","#7A2E4D","#2C4F8A","#8C3B2E","#4D5B66"];
const suitFor=k=>PAL[parseInt(hash(String(k)),36)%PAL.length];
const clip=(t,n)=>String(t==null?"":t).replace(/[\u0000-\u0008\u000b-\u001f]/g,"").trim().slice(0,n);
/* Contenu partagé par un autre compte (biblio/<autre>) : liste blanche, mêmes bornes que l'import.
   Exercices, DS, cours, séances, notes : jamais repris d'un autre élève. */
const idOk=(x,n)=>typeof x==="string"&&new RegExp("^[A-Za-z0-9._:-]{1,"+(n||80)+"}$").test(x);
function chapExt(ch){if(!ch||typeof ch!=="object"||!idOk(ch.id)||!idOk(ch.mat,40))return null;
  const pq=(Array.isArray(ch.paquets)?ch.paquets:[]).slice(0,4).filter(p=>p&&typeof p==="object").map((p,pi)=>({k:"p"+pi,nom:clip(p.nom,40)||"Cartes",cartes:(Array.isArray(p.cartes)?p.cartes:[]).filter(c=>c&&typeof c==="object"&&idOk(c.id)&&c.r&&c.v).slice(0,30).map(c=>({id:c.id,r:clip(c.r,160),v:clip(c.v,400),q:clip(c.q,60)}))})).filter(p=>p.cartes.length);
  const qz=(Array.isArray(ch.quiz)?ch.quiz:[]).slice(0,4).filter(s=>s&&typeof s==="object").map(s=>({nom:clip(s.nom,60)||"Quiz",d:clip(s.d,80),qs:(Array.isArray(s.qs)?s.qs:[]).filter(q=>q&&typeof q==="object"&&idOk(q.id)&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2).slice(0,15).map(q=>({id:q.id,q:clip(q.q,240),ok:clip(q.ok,160),no:q.no.slice(0,3).map(x=>clip(x,160)),why:clip(q.why,300)}))})).filter(s=>s.qs.length);
  const o={id:ch.id,mat:ch.mat,matNom:clip(ch.matNom,40),matCourt:clip(ch.matCourt,18),titre:clip(ch.titre,80)||"Chapitre",court:clip(ch.court,24),vis:typeof ch.vis==="string"?ch.vis.slice(0,40):"",
    auteur:cleanNick(typeof ch.auteur==="string"?ch.auteur:""),src:"import",etat:clip(ch.etat,40),cree:typeof ch.cree==="string"?ch.cree.slice(0,40):"",ordre:Number.isFinite(+ch.ordre)?+ch.ordre:0,paquets:pq,quiz:qz};
  if(typeof ch.suit==="string"&&/^#[0-9a-f]{6}$/i.test(ch.suit))o.suit=ch.suit;return o}
function echExt(e){if(!e||typeof e!=="object"||!idOk(e.id)||!isoOk(e.date)||!["controle","oral"].includes(e.type))return null;
  return {id:e.id,date:e.date,type:e.type,titre:clip(e.titre,90),matNom:clip(e.matNom,40),mat:typeof e.mat==="string"?clip(e.mat,40):"",vis:typeof e.vis==="string"?e.vis.slice(0,40):"",auteur:cleanNick(typeof e.auteur==="string"?e.auteur:"")}}
function visibleImp(ch,author){if(author===UID)return true;const v=ch.vis||"hub";if(v==="hub")return false;if(v.startsWith("ligue:"))return myCodes().includes(v.slice(6));return false}
function mergeAll(){
  C.M=Object.assign({},C.M0||{});C.chaps=Object.assign({},(IMP.isOwner||UID==="demo")?(C.chaps0||{}):{});
  const addMat=(id,nom,court,suit)=>{if(!id||C.M[id])return;C.M[id]={id,nom:clip(nom||id,40),court:clip(court||nom||id,18),suit:/^#[0-9a-f]{6}$/i.test(suit||"")?suit:suitFor(id),ordre:100+Object.keys(C.M).length}};
  progAdd(addMat);
  IMP.ech=IMP.ech.map(e=>{if(!e||e.mat||!e.matNom)return e;const M=resolveMat("",e.matNom);if(Array.isArray(P.mats)&&P.mats.length&&!P.mats.includes(M.id))P.mats.push(M.id);return Object.assign({},e,{mat:M.id,matNom:M.nom})});
  const addCh=(ch,author,own)=>{if(!own)ch=chapExt(ch);if(!ch||!ch.id||!ch.mat)return;addMat(ch.mat,ch.matNom,ch.matCourt,ch.suit);C.chaps["u."+ch.id]=Object.assign({},ch,{id:"u."+ch.id,_doc:ch.id,_author:author,_own:own})};
  Object.entries(IMP.pub).forEach(([a,list])=>list.forEach(ch=>{if(visibleImp(ch,a))addCh(ch,a,a===UID)}));
  Object.values(IMP.mine).forEach(ch=>addCh(Object.assign({},ch,{vis:"moi"}),UID,true));
  Object.values(GL.get("chap")).forEach(ch=>addCh(Object.assign({},ch,{vis:"moi"}),UID||"invite",true));
  const gEch=Object.values(GL.get("ech"));
  IMP.ech.forEach(e=>addMat(e.mat,e.matNom));gEch.forEach(e=>addMat(e.mat,e.matNom));
  const own=new Set([...IMP.ech,...gEch].map(e=>e.date+"|"+e.mat)),shared=[];
  Object.entries(IMP.pubEch).forEach(([a,list])=>{if(a===UID)return;list.forEach(e=>{e=echExt(e);if(!e||!visibleImp(e,a))return;const k=e.date+"|"+e.mat;if(own.has(k))return;own.add(k);addMat(e.mat,e.matNom);shared.push(Object.assign({},e,{id:"s."+a.slice(-6)+"."+e.id,partage:true}))})});
  C.ech=[...(IMP.isOwner?(C.ech0||[]):[]),...IMP.ech,...gEch,...shared].filter(e=>e&&e.date);
  Object.values(FI.ext).forEach(f=>addMat(f.mat,f.matNom));
}
function matOn(id){if(String(id).startsWith("x-"))return ADM();if(Array.isArray(P.mats)&&P.mats.length)return P.mats.includes(id);
  return Object.values(C.chaps||{}).some(c=>c.mat===id&&((c.paquets||[]).some(p=>(p.cartes||[]).length)||(c.quiz||[]).length))||(IMP.isOwner&&!!(C.M0&&C.M0[id]))||IMP.ech.some(e=>e.mat===id)}
function rebuild(){if(!C.ready)return;mergeAll();reindex();if(view==="import"||(view==="ligue"&&LG.defi)||(view==="duel"&&inDuel))return;render()}
async function impInit(){
  if(!DB)return;
  try{IMP.sample=await window.claude?.use?.("sample")}catch(e){IMP.sample=null}
  if(IMP.sample){try{IMP.caps=await IMP.sample.limits()}catch(e){IMP.caps=null}}
  progInit();defiLoad();
  DB.collection("fiches").onSnapshot(s=>{FI.prete={};s.docs.forEach(d=>{const v=d.data();if(v)FI.prete[d.id]=Object.assign({},v,{id:d.id})});FI.loaded=true;if(view==="fiches"&&(FI.mode==="list"||FI.mode==="read"))renderFiches()},()=>{FI.loaded=true});
  if(!UID)return;
  DB.collection("biblio").onSnapshot(s=>{s.docs.forEach(d=>{const a=d.id;if(IMP.subs[a])return;IMP.subs[a]=1;
    DB.collection("biblio/"+a+"/chap").onSnapshot(s2=>{IMP.pub[a]=s2.docs.map(x=>Object.assign({},x.data()||{},{id:x.id}));rebuild()},()=>{});
    DB.collection("biblio/"+a+"/ech").onSnapshot(s3=>{IMP.pubEch[a]=s3.docs.map(x=>Object.assign({},x.data()||{},{id:x.id}));rebuild()},()=>{});
    DB.collection("biblio/"+a+"/fiche").onSnapshot(s4=>{FI.pub[a]=s4.docs.map(x=>Object.assign({},x.data()||{},{id:x.id}));fiExt();if(view==="fiches"&&FI.mode==="list")renderFiches()},()=>{});
    DB.collection("biblio/"+a+"/msg").onSnapshot(s5=>{CH.by[a]=s5.docs.map(x=>Object.assign({},x.data()||{},{id:x.id}));if(view==="clubs"&&EX.club)paintChat()},()=>{})})},()=>{});
  DB.collection("data/users/"+UID+"/fiche").onSnapshot(s=>{FI.mine={};s.docs.forEach(d=>{FI.mine[d.id]=Object.assign({},d.data()||{},{id:d.id})});fiExt();if(view==="fiches"&&FI.mode==="list")renderFiches()},()=>{});
  DB.collection("data/users/"+UID+"/chap").onSnapshot(s=>{IMP.mine={};s.docs.forEach(d=>{IMP.mine[d.id]=Object.assign({},d.data()||{},{id:d.id})});rebuild()},()=>{});
  DB.collection("data/users/"+UID+"/ech").onSnapshot(s=>{IMP.ech=s.docs.map(d=>Object.assign({},d.data()||{},{id:d.id}));rebuild()},()=>{});
  DB.collection("data/users/"+UID+"/cadeau").onSnapshot(s=>giftsIn(s.docs.map(d=>Object.assign({},d.data()||{},{id:d.id}))),()=>{});
}
function giftsIn(list){let n=0;P.gx=P.gx||{};
  list.forEach(g=>{if(!g||!g.id||P.gx[g.id])return;const xp=Math.max(0,Math.min(1e12,Math.round(+g.xp||0))),co=Math.max(0,Math.min(1e12,Math.round(+g.co||0)));if(!xp&&!co)return;
    P.gx[g.id]={xp,co,d:String(g.date||new Date().toISOString()).slice(0,10),r:clip(g.raison,80)};n++;
    toast(`<span class="tm">+</span><div><b>Cadeau de l’admin${xp?" : +"+fmtN(xp)+" XP":""}${co?(xp?", ":" : ")+"+"+fmtN(co)+" pièces":""}</b><span>${esc(clip(g.raison,80)||"Bravo !")}</span></div>`)});
  if(n){saveP();lgPush();checkRewards(true);if(C.ready&&!inDuel&&view!=="jeu")render()}}
function openImport(tab){IMPV.need=true;if(tab)IMPV.tab=tab;if(view!=="import")IMPV.prev=view;go("import")}
const STOPW=["et","de","des","du","la","le","les","d","l","llc","spe","specialite","option"];
const matToks=t=>String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(/[^a-z0-9]+/).filter(w=>w&&!STOPW.includes(w));
function sameMat(a,b){const A=matToks(a),B=matToks(b);if(!A.length||!B.length)return false;if(A.join("-")===B.join("-"))return true;
  const [s,l]=A.length<=B.length?[A,B]:[B,A];
  if(s.length===1&&l.length>1&&s[0]===l.map(w=>w[0]).join(""))return true;
  if(s.length<Math.min(2,l.length))return false;let j=0;for(const w of s){while(j<l.length&&!l[j].startsWith(w))j++;if(j>=l.length)return false;j++}return s.length>=l.length-1}
function resolveMat(m,nom){m=clip(m,40);nom=clip(nom,40);
  if(m&&C.M[m])return {id:m,nom:C.M[m].nom};
  const want=slug(nom||m);const hit=Object.values(C.M).find(x=>slug(x.nom)===want||slug(x.court||"")===want)||Object.values(C.M).find(x=>sameMat(nom||m,x.nom)||sameMat(nom||m,x.court||""));
  if(hit)return {id:hit.id,nom:hit.nom};return {id:"x-"+want,nom:nom||m||"Matière"}}
function visLabel(v){return v==="moi"?"pour toi seul":v&&v.startsWith("ligue:")?"ton club « "+ligName(v.slice(6))+" »":"tout le hub"}
function sampleErr(e){const c=e&&e.code;return c==="not_granted"?"Tu as refusé que la page utilise Claude. Recharge la page pour qu’elle te le redemande.":c==="rate_limited"?"Trop de demandes pour l’instant. Réessaie dans quelques minutes.":c==="refused"?"Claude n’a pas voulu traiter ce texte. Essaie avec un autre extrait.":c==="prompt_too_large"?"Texte trop long : colle une seule séance à la fois.":c==="image_rejected"?"Photo refusée : essaie une image JPEG ou PNG plus légère.":c==="invalid_json"||c==="empty_completion"?"Réponse illisible. Réessaie, ou colle un texte plus court.":c==="session_expired"?"Ta session claude.ai a expiré : reconnecte-toi.":c==="sampling_disabled"||c==="capability_disabled"?"Ton compte ne permet pas de demander à Claude depuis cette page.":c==="cancelled"?"Arrêté.":"Ça n’a pas marché. Réessaie dans un instant."}
/* Refus de la base (code refus_base, message en français fabriqué par p26-runtime.js) : on affiche la raison. */
const refusBase=e=>e&&e.code==="refus_base"&&typeof e.message==="string"&&e.message?e.message:"";
function writeErr(e){return refusBase(e)?refusBase(e):e&&e.code==="invalid_argument"?"Enregistrement refusé. Reconnecte-toi et réessaie.":"Enregistrement impossible pour l’instant. Réessaie."}
function renderImport(){
  const box=$("#imp");
  if(!C.ready||!DB){box.innerHTML=`<div class="ihead"><h1>Importer</h1></div><p class="lgsub">Ouvre la page connecté sur claude.ai pour importer tes cours.</p>`;return}
  const tabs=[["ech","Contrôles et devoirs"],["cours","Un cours"],["fiche","Une fiche"],["auto","Avec ton Claude"],["mes","Mes imports"],["pronote","Fichier Pont"]];
  box.innerHTML=`<div class="ihead"><h1>Importer</h1><button class="linkbtn" type="button" id="impBack">Retour</button></div><div data-slot="import"></div>
   <p class="lgsub">Dans cette version du site, Claude ne lit pas tes fichiers directement. Utilise « Avec ton Claude » : ton Claude (ou une autre IA) prépare le JSON, tu le colles ici.</p>${GUEST?`<p class="guestnote"><b>Mode invité.</b> Ce que tu importes reste sur ce téléphone, visible par toi seul.</p>`:""}
   <div class="pick sm" id="impTabs">${tabs.map(t=>`<button type="button" class="${IMPV.tab===t[0]?"on":""}" data-k="${t[0]}">${t[1]}</button>`).join("")}</div><div id="impZone"></div>`;
  P26ui.slot("import",box.querySelector('[data-slot="import"]'));$("#impBack").onclick=()=>go(IMPV.prev&&IMPV.prev!=="import"?IMPV.prev:"cours");
  $("#impTabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{IMPV.tab=b.dataset.k;renderImport()});
  const z=$("#impZone");
  if(IMPV.tab==="fiche"){IMPV.tab="ech";FI.mode="new";FI.prefill=null;go("fiches");return}
  if(IMPV.tab==="pronote")impPronote(z);else if(IMPV.tab==="cours")impCours(z);else if(IMPV.tab==="ech")impEch(z);else if(IMPV.tab==="auto")impAuto(z);else impMes(z);
}
// Étape 4 : visibilité des contenus créés par les utilisateurs.
// Le propriétaire conserve la publication publique.
function canPublishHub(){return false}
function validUserVis(v){
  if(v==="moi")return true;
  if(GUEST)return false;
  if(v==="hub")return canPublishHub();
  return typeof v==="string"&&v.startsWith("ligue:")&&myCodes().includes(v.slice(6));
}
function visField(name,def){
  const cs=GUEST?[]:myCodes(),publicOK=canPublishHub();
  const selected=typeof def==="string"&&def.startsWith("ligue:")?def.slice(6):"";
  const leagueOK=cs.length>0&&(!selected||cs.includes(selected));
  const choice=def==="hub"&&publicOK?"hub":
    (def==="ligue"||selected)&&leagueOK?"ligue":"moi";
  return `<fieldset class="vis"><legend class="lab">Qui le voit</legend>
   ${publicOK?`<label><input type="radio" name="${name}" value="hub" ${choice==="hub"?"checked":""}> Tout le hub <small>publication du propriétaire</small></label>`:""}
   <label><input type="radio" name="${name}" value="ligue" ${cs.length?"":"disabled"} ${choice==="ligue"?"checked":""}> Mon club ${cs.length?`<select id="${name}Lig">${cs.map(c=>`<option value="${esc(c)}"${c===selected?" selected":""}>${esc(ligName(c))}</option>`).join("")}</select>`:`<small>crée ou rejoins un club d’abord</small>`}</label>
   <label><input type="radio" name="${name}" value="moi" ${choice==="moi"?"checked":""}> Moi seul <small>personne d’autre ne le voit</small></label></fieldset>`;
}
function readVis(name){
  if(GUEST)return "moi";
  const r=document.querySelector(`input[name="${name}"]:checked`);
  let v=r?r.value:"moi";
  if(v==="ligue"){
    const s=$("#"+name+"Lig");
    v=s&&s.value?"ligue:"+s.value:"moi";
  }
  return validUserVis(v)?v:"moi";
}
function impCours(z){
  if(IMPV.draft){impPreview(z);return}
  const can=!!IMP.sample,im=IMP.caps&&IMP.caps.images;
  z.innerHTML=`<div class="iform">
   <label class="lab" for="iMat">Matière</label>
   <select id="iMat" class="inp">${(C.matsAll||[]).map(m=>`<option value="${esc(m.id)}"${m.id===sel.mat?" selected":""}>${esc(m.nom)}</option>`).join("")}<option value="@new">Autre matière…</option></select>
   <input id="iMatNew" class="inp" maxlength="40" placeholder="Ex. Philosophie" hidden>
   <label class="lab" for="iTitre">Chapitre <span>(facultatif)</span></label>
   <input id="iTitre" class="inp" maxlength="80" placeholder="Ex. La conscience">
   <label class="lab" for="iTxt">Ton cours</label>
   <textarea id="iTxt" class="inp" placeholder="Colle ici le texte de ton cours. Dans Pronote : Cahier de textes, puis Contenu et ressources. Ouvre la séance et copie son contenu. Une fiche ou un résumé marche aussi."></textarea>
   ${mediaField("iMed","Ou des captures, photos, une vidéo d’écran ou un PDF")}
   ${GUEST?"":visField("iv","hub")}
   <div class="exrow"><button class="btn light" type="button" id="iGo"${can?"":" disabled"}>Créer les cartes</button><button class="btn ghost" type="button" id="iStop" hidden>Arrêter</button><span class="istat" id="iStat" role="status"></span></div>
   ${can?"":`<p class="istat err">Ici, la page ne peut pas demander à Claude. Ouvre-la depuis claude.ai, ou utilise l’onglet « Avec ton Claude ».</p>`}
   <p class="note" style="margin-top:14px">Claude ne garde que ce qui est dans ton texte ou tes photos. Tu relis tout avant d’enregistrer. Chaque import utilise un peu de ton quota Claude.</p></div>`;
  $("#iMat").onchange=()=>{$("#iMatNew").hidden=$("#iMat").value!=="@new";if(!$("#iMatNew").hidden)$("#iMatNew").focus()};
  bindMedia("iMed");
  if(IMPV.prefill){const pf=IMPV.prefill;IMPV.prefill=null;
    if(C.M[pf.mat])$("#iMat").value=pf.mat;else{$("#iMat").value="@new";$("#iMatNew").hidden=false;$("#iMatNew").value=pf.matNom}
    $("#iTitre").value=pf.titre||"";$("#iTxt").value=pf.texte||"";$("#iStat").textContent="Séance reprise de ton Pronote. Vérifie, puis crée les cartes."}
  $("#iGo").onclick=async()=>{
    const st=$("#iStat");st.className="istat";
    const mv=$("#iMat").value,nn=$("#iMatNew").value.trim();if(mv==="@new"&&!nn){st.className="istat err";st.textContent="Écris le nom de la matière.";return}
    let txt=$("#iTxt").value.trim().slice(0,60000),files=[];
    if(!txt&&!mediaCount("iMed")){st.className="istat err";st.textContent="Colle un texte ou ajoute une capture, une vidéo ou un PDF.";return}
    const M=mv==="@new"?resolveMat("",nn):{id:mv,nom:matName(mv)};const titre=clip($("#iTitre").value,80),vis=GUEST?"moi":readVis("iv");
    if(mediaCount("iMed")){$("#iGo").disabled=true;try{const md=await readMedia("iMed",t=>{st.textContent=t});files=md.images;if(md.text)txt=(txt?txt+"\n\n":"")+md.text.slice(0,60000-txt.length)}catch(e){st.className="istat err";st.textContent=e&&e.message?e.message:"Fichier illisible.";$("#iGo").disabled=false;return}}
    const prompt=`Tu fabriques des cartes de révision pour un élève de Première générale (lycée en France).
Matière : ${M.nom}.${titre?" Titre du chapitre donné par l’élève : "+titre+".":""}
Source : ${txt?"le texte ci-dessous, copié de Pronote, d’un PDF ou d’un cours":""}${txt&&files.length?", et ":""}${files.length?"les images jointes (photos de cahier ou de manuel, captures d’écran de Pronote, ou images tirées d’une vidéo d’écran : ignore les doublons et les menus)":""}.

Règles :
- N’utilise que ce qui est dans la source. N’ajoute aucun fait extérieur. Si la source est maigre, fais moins de cartes.
- En français. Recto court : une notion, un auteur, une date, une définition à donner ou une question. Verso exact et concis : 40 mots au plus.
- 6 à 30 cartes, rangées en 1 à 3 paquets nommés selon leur nature (par exemple Notions, Auteurs et citations, Dates, Méthode).
- Quiz : 4 à 12 questions à choix multiple, une bonne réponse, trois fausses plausibles, une explication d’une phrase.
- Formules mathématiques entre $ et $ en LaTeX.

Réponds uniquement avec ce JSON :
{"titre":"titre du chapitre","court":"2 ou 3 mots","paquets":[{"nom":"Notions","cartes":[{"r":"recto","v":"verso","q":"Donne la définition"}]}],"quiz":[{"q":"question","ok":"bonne réponse","no":["fausse 1","fausse 2","fausse 3"],"why":"explication"}]}
${txt?"\n<source>\n"+txt+"\n</source>":""}`;
    IMPV.ctl=new AbortController();$("#iGo").disabled=true;$("#iStop").hidden=false;$("#iStop").onclick=()=>IMPV.ctl&&IMPV.ctl.abort();
    st.textContent="Claude lit ton cours… Ça peut prendre une minute.";
    try{
      const d=await IMP.sample.json(prompt,{signal:IMPV.ctl.signal,images:files.length?files:undefined});
      const pq=(Array.isArray(d&&d.paquets)?d.paquets:[]).slice(0,4).map(p=>({nom:clip(p&&p.nom,40)||"Cartes",cartes:(Array.isArray(p&&p.cartes)?p.cartes:[]).filter(c=>c&&c.r&&c.v).slice(0,30).map(c=>({r:clip(c.r,160),v:clip(c.v,400),q:clip(c.q,60)}))})).filter(p=>p.cartes.length);
      const qz=(Array.isArray(d&&d.quiz)?d.quiz:[]).filter(q=>q&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2).slice(0,15).map(q=>({q:clip(q.q,240),ok:clip(q.ok,160),no:q.no.slice(0,3).map(x=>clip(x,160)),why:clip(q.why,300)}));
      if(!pq.length&&!qz.length){st.className="istat err";st.textContent="Claude n’a rien trouvé à mettre en cartes. Colle un texte plus complet.";return}
      IMPV.draft={mat:M.id,matNom:M.nom,titre:titre||clip(d.titre,80)||"Chapitre importé",court:clip(d.court,24)||clip(titre||d.titre,24),vis,paquets:pq,quiz:qz};
      renderImport();
    }catch(e){st.className="istat"+(e&&e.code==="cancelled"?"":" err");st.textContent=sampleErr(e)}
    finally{IMPV.ctl=null;if($("#iGo"))$("#iGo").disabled=false;if($("#iStop"))$("#iStop").hidden=true}
  };
}
function impPreview(z){
  const D=IMPV.draft,n=D.paquets.reduce((a,p)=>a+p.cartes.length,0);
  z.innerHTML=`<div class="iprev"><label class="lab" for="pTitre" style="color:var(--felt-ink)">Titre du chapitre</label><input id="pTitre" class="inp" maxlength="80" value="${esc(D.titre)}">
   <p class="note" style="margin:8px 0 0">${n} carte${n>1?"s":""} · ${D.quiz.length} question${D.quiz.length>1?"s":""} de quiz · ${esc(D.matNom)} · visible par ${esc(visLabel(D.vis))}</p>
   ${D.paquets.map((p,pi)=>`<h3>${esc(p.nom)}</h3>${p.cartes.map((c,ci)=>`<div class="pc"><b>${tex(c.r)}</b><span>${tex(c.v)}</span><button class="x" type="button" data-p="${pi}" data-i="${ci}">Retirer</button></div>`).join("")}`).join("")}
   ${D.quiz.length?`<h3>Quiz</h3>${D.quiz.map((q,qi)=>`<div class="pc"><b>${tex(q.q)}</b><span>${tex(q.ok)}</span><button class="x" type="button" data-q="${qi}">Retirer</button></div>`).join("")}`:""}
   <div class="exrow"><button class="btn light" type="button" id="pSave">Enregistrer</button><button class="btn ghost" type="button" id="pRedo">Recommencer</button><span class="istat" id="pStat" role="status"></span></div></div>`;
  z.querySelectorAll(".pc .x").forEach(b=>b.onclick=()=>{D.titre=$("#pTitre").value;if(b.dataset.q!=null)D.quiz.splice(+b.dataset.q,1);else{D.paquets[+b.dataset.p].cartes.splice(+b.dataset.i,1);D.paquets=D.paquets.filter(p=>p.cartes.length)}impPreview(z)});
  $("#pRedo").onclick=()=>{IMPV.draft=null;renderImport()};
  $("#pSave").onclick=async()=>{
    const st=$("#pStat");D.titre=clip($("#pTitre").value,80)||D.titre;
    if(!D.paquets.length&&!D.quiz.length){st.className="istat err";st.textContent="Il ne reste rien à enregistrer.";return}
    const cid=hash(UID||"invite").slice(0,4)+Date.now().toString(36);
    const doc={id:cid,mat:D.mat,matNom:D.matNom,matCourt:(C.M[D.mat]&&C.M[D.mat].court)||D.matNom.slice(0,14),suit:(C.M[D.mat]&&/^#/.test(C.M[D.mat].suit)&&C.M[D.mat].suit)||suitFor(D.mat),
      titre:D.titre,court:D.court||D.titre.slice(0,24),vis:D.vis,auteur:LG.nick||OL.nick||"",src:"import",etat:"importé",cree:new Date().toISOString(),ordre:Date.now(),
      paquets:D.paquets.map((p,pi)=>({k:"p"+pi,nom:p.nom,cartes:p.cartes.map((c,ci)=>({id:cid+"."+pi+"."+ci,r:c.r,v:c.v,q:c.q||""}))})),
      quiz:D.quiz.length?[{nom:"Quiz · "+(D.court||D.titre).slice(0,30),d:D.titre,qs:D.quiz.map((q,qi)=>({id:cid+".q"+qi,q:q.q,ok:q.ok,no:q.no,why:q.why}))}]:[]};
    $("#pSave").disabled=true;st.className="istat";st.textContent="Enregistrement…";
    try{
      const where=await putDoc("chap",D.vis==="moi",cid,doc);
      if(Array.isArray(P.mats)&&P.mats.length&&!P.mats.includes(D.mat)){P.mats.push(D.mat);saveP()}
      IMPV.draft=null;toast(`<span class="tm">+</span><div><b>Chapitre ajouté</b><span>${where==="local"?"gardé sur ce téléphone":esc(doc.titre)}</span></div>`);
      if(where==="local")doc.vis="moi";else if(D.vis==="moi")IMP.mine[cid]=doc;else{IMP.pub[UID]=(IMP.pub[UID]||[]).filter(x=>x.id!==cid).concat([doc])}
      mergeAll();reindex();sel.mat=D.mat;sel.chap="u."+cid;go("cours");
    }catch(e){$("#pSave").disabled=false;st.className="istat err";st.textContent=writeErr(e)}
  };
}
function impEch(z){
  const can=!!IMP.sample,E=IMPV.eDraft;
  const mine=[...IMP.ech,...Object.values(GL.get("ech"))].sort((a,b)=>a.date<b.date?-1:1);
  z.innerHTML=`<div class="iform">
   ${mediaField("eMed","Captures d’écran ou vidéo de ton Pronote",true)}
   <p class="note" style="margin:8px 0 0">Sur téléphone : ouvre Pronote, va dans <b>Travail à faire</b>, fais des captures ou lance l’enregistrement d’écran et fais défiler doucement toute la liste. Sur PC : touches <b>Windows + Maj + S</b>.</p>
   <label class="lab" for="eTxt">Ou colle le texte <span>(facultatif)</span></label>
   <textarea id="eTxt" class="inp" placeholder="Dans Pronote : Cahier de textes, puis Travail à faire. Sélectionne toute la liste et copie-la ici."></textarea>
   <div class="exrow"><button class="btn light" type="button" id="eGo"${can?"":" disabled"}>Lire mes dates</button><span class="istat" id="eStat" role="status"></span></div></div>
   ${E?`<div class="sec"><h2>À ajouter</h2><span>${E.length} trouvé${E.length>1?"s":""}</span></div><div id="eList">${E.map((e,i)=>`<label class="eli"><input type="checkbox" data-i="${i}" checked><span><b>${esc(e.matNom)}</b> · ${esc(e.titre)}<small>${esc(e.type==="controle"?"Contrôle":e.type==="oral"?"Oral":"Devoir")} · ${fmtShort.format(parseIso(e.date))}</small></span><span></span></label>`).join("")}</div>${!GUEST&&myCodes().length?`<label class="share"><input type="checkbox" id="eShare"> Partager mes contrôles et oraux avec ma ligue <select id="eLig">${myCodes().map(c=>`<option value="${esc(c)}">${esc(ligName(c))}</option>`).join("")}</select></label><p class="note" style="margin:4px 0 0">Mode classe : ta ligue voit ces dates, avec ton pseudo. Tes devoirs restent privés.</p>`:""}<div class="exrow"><button class="btn light" type="button" id="eSave">Ajouter à mon agenda</button><span class="istat" id="eSStat"></span></div>`:""}
   <div class="sec"><h2>Mon agenda importé</h2><span>visible par toi seul</span></div>
   <div>${mine.length?mine.map(e=>`<div class="eli"><span></span><span><b>${esc(matName(e.mat))}</b> · ${esc(e.titre)}<small>${esc(e.type==="controle"?"Contrôle":e.type==="oral"?"Oral":"Devoir")} · ${fmtShort.format(parseIso(e.date))}</small></span><button class="x" type="button" data-del="${esc(e.id)}">Supprimer</button></div>`).join(""):`<p class="muted" style="margin:0">Rien pour l’instant.</p>`}</div>`;
  bindMedia("eMed");
  $("#eGo").onclick=async()=>{
    const st=$("#eStat");let txt=$("#eTxt").value.trim().slice(0,40000),files=[];st.className="istat";
    if(!txt&&!mediaCount("eMed")){st.className="istat err";st.textContent="Ajoute une capture, une vidéo ou colle ta liste.";return}
    if(mediaCount("eMed")){$("#eGo").disabled=true;try{const md=await readMedia("eMed",t=>{st.textContent=t});files=md.images;if(md.text)txt=(txt?txt+"\n\n":"")+md.text.slice(0,40000)}catch(e){st.className="istat err";st.textContent=e&&e.message?e.message:"Fichier illisible.";$("#eGo").disabled=false;return}}
    const known=(C.matsAll||[]).map(m=>m.id+" = "+m.nom).join("\n");
    const prompt=`Aujourd’hui nous sommes le ${fmtLong.format(NOW)} ${NOW.getFullYear()} (${TODAY_ISO}).
Voici ${txt&&files.length?"un texte et des images":files.length?"des images":"un texte"} venant du Pronote d’un élève de Première : son travail à faire et ses évaluations.${files.length?" Les images sont des captures d’écran ou des images tirées d’un enregistrement d’écran qui fait défiler la liste : une même ligne peut apparaître sur plusieurs images, ne la compte qu’une fois. Ignore les menus et les boutons.":""}
Extrais chaque devoir ou évaluation qui tombe aujourd’hui ou plus tard.
- date : AAAA-MM-JJ. Si la date est relative (« pour lundi »), calcule-la à partir d’aujourd’hui.
- mat : l’identifiant de la liste ci-dessous si la matière y figure, sinon le nom de la matière.
- type : "controle" pour un contrôle, DS, interrogation ou évaluation écrite ; "oral" pour un exposé ou un oral ; "devoir" sinon.
- titre : 12 mots au plus, sans le nom de la matière.
N’invente rien. Si une ligne n’a pas de date, ignore-la.
Matières connues :
${known}
Réponds uniquement avec un tableau JSON : [{"date":"2026-10-12","mat":"maths","type":"controle","titre":"DS chapitres 1 et 2"}]
${txt?"<texte>\n"+txt+"\n</texte>":""}`;
    $("#eGo").disabled=true;st.className="istat";st.textContent="Claude lit tes dates… Ça peut prendre une minute.";
    try{const arr=await IMP.sample.json(prompt,files.length?{images:files}:{});
      const out=(Array.isArray(arr)?arr:[]).filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.date>=TODAY_ISO&&x.titre).slice(0,40).map(x=>{const m=resolveMat(x.mat,x.mat);return {date:x.date,mat:m.id,matNom:m.nom,type:["controle","oral","devoir"].includes(x.type)?x.type:"devoir",titre:clip(x.titre,90)}});
      if(!out.length){st.className="istat err";st.textContent="Aucune date à venir trouvée dans ce texte.";return}
      IMPV.eDraft=out;MEDIA.eMed=[];impEch(z);
    }catch(e){st.className="istat err";st.textContent=sampleErr(e)}finally{if($("#eGo"))$("#eGo").disabled=false}
  };
  if($("#eSave"))$("#eSave").onclick=async()=>{const st=$("#eSStat");const pick=[...z.querySelectorAll("#eList input:checked")].map(i=>E[+i.dataset.i]);
    if(!pick.length){st.className="istat err";st.textContent="Coche au moins une ligne.";return}
    $("#eSave").disabled=true;st.className="istat";st.textContent="Ajout…";
    const share=$("#eShare")&&$("#eShare").checked?$("#eLig").value:null;
    try{for(const e of pick){const id="i"+hash(e.date+e.mat+e.titre),row=Object.assign({id,src:"import"},e);const w=await putDoc("ech",true,id,row);if(w!=="local")IMP.ech=IMP.ech.filter(x=>x.id!==id).concat([row]);
        if(share&&w!=="local"&&e.type!=="devoir")await putDoc("ech",false,id,Object.assign({},row,{vis:"ligue:"+share,auteur:myNick()}),true)}mergeAll();reindex();
      IMPV.eDraft=null;toast(`<span class="tm">${pick.length}</span><div><b>Agenda mis à jour</b><span>${pick.length} date${pick.length>1?"s":""} ajoutée${pick.length>1?"s":""}</span></div>`);
      if(Array.isArray(P.mats)&&P.mats.length){pick.forEach(e=>{if(!P.mats.includes(e.mat))P.mats.push(e.mat)});saveP()}
      impEch(z)}catch(e){$("#eSave").disabled=false;st.className="istat err";st.textContent=writeErr(e)}};
  z.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{const id=b.dataset.del;const g=GL.get("ech");if(g[id]){delete g[id];GL.set("ech",g);mergeAll();reindex();impEch(z);return}try{await DB.doc("data/users/"+UID+"/ech/"+id).delete();IMP.ech=IMP.ech.filter(x=>x.id!==id);mergeAll();reindex();impEch(z)}catch(e){b.textContent="Échec"}});
}
function autoPrompt(vis){const short=hash(UID).slice(0,4);
  const mats=(C.matsAll||[]).map(m=>`${m.id} = ${m.nom}`).join(", ");
  const dest=vis==="moi"?`la collection « data/users/me/chap » (visible par moi seul)`:`la collection « biblio/${UID}/chap » (visible par ${vis==="hub"?"tout le hub":"ma ligue "+ligName(vis.slice(6))}), avec vis = "${vis}"`;
  return `<contexte>
Tu mets à jour mon espace dans le hub de révision « Première 2026 » à partir de mon Pronote. Je suis élève de Première.
Hub : ${HUB_URL}
Tu lis et écris la base du hub avec l’outil ArtifactData (lis un document avant de le remplacer et passe sa version en if_version).
Mon identifiant dans le hub : ${UID}
Mon pseudo : ${LG.nick||OL.nick||"(mon pseudo)"}
</contexte>

<regles>
- Tu ne saisis JAMAIS d’identifiant ni de mot de passe. Si Pronote ou l’ENT affiche une page de connexion, arrête-toi et dis-moi de me connecter moi-même.
- Tu ne soumets rien sur Pronote : pas de case cochée, pas de dépôt, pas de message.
- Tu n’inventes ni date ni contenu. Tu ne stockes aucune note.
- Tu écris seulement dans « data/users/me/… » et « biblio/${UID}/… ».
</regles>

<etapes>
1. Avec Claude dans Chrome, va sur l’onglet Pronote déjà connecté et lis le texte de la page avec get_page_text.
2. Cahier de textes > Travail à faire : pour chaque devoir ou évaluation daté d’aujourd’hui ou plus tard, écris un document dans « data/users/me/ech » :
   {id: "a${short}-<matière>-<MMJJ>", date: "AAAA-MM-JJ", mat: <identifiant de matière>, matNom: <nom>, type: "controle" | "oral" | "devoir", titre: <12 mots max>, src: "auto"}.
3. Cahier de textes > Contenus et ressources : pour chaque séance des 14 derniers jours qui a un vrai contenu, crée un chapitre dans ${dest}.
   Modèle : {id: "a${short}<suffixe unique>", mat, matNom, matCourt, titre, court, vis, auteur: <mon pseudo>, src: "auto", etat: "importé", cree: <date ISO>, ordre: <timestamp>,
   paquets: [{k: "p0", nom, cartes: [{id: "<id du chapitre>.0.<n>", r: <recto court>, v: <verso exact, 40 mots max>, q: <consigne courte>}]}],
   quiz: [{nom: "Quiz", d: <titre>, qs: [{id: "<id du chapitre>.q<n>", q, ok, no: [3 fausses réponses plausibles], why: <une phrase>}]}]}.
   Les cartes viennent uniquement du contenu de la séance. Si un chapitre au même titre existe déjà, complète-le au lieu d’en créer un deuxième.
4. Si tu as écrit dans « biblio/${UID}/chap », écris aussi le document « biblio/${UID} » = {nick: <mon pseudo>, upd: <timestamp>}.
5. Matières : réutilise ces identifiants quand la matière existe : ${mats}. Sinon utilise « x-<nom en minuscules sans accents> » et remplis matNom.
</etapes>

<compte_rendu>
3 lignes au plus : contrôles et devoirs ajoutés, chapitres créés, ce qui manquait sur Pronote.
</compte_rendu>`}
function autoPromptJSON(){const mats=(C.matsAll||[]).map(m=>`${m.id} = ${m.nom}`).join(", ");
  return `Tu prépares mes révisions pour le hub « Première 2026 ». Je suis élève de Première.
Je vais te donner mon cours (texte copié, photo ou capture de Pronote). À partir de ça et de rien d’autre, fabrique des cartes et un quiz, puis réponds UNIQUEMENT avec ce JSON, sans commentaire :
{"format":"p26-import","chapitres":[{"mat":"<identifiant>","matNom":"<nom de la matière>","titre":"<titre du chapitre>","court":"<2 ou 3 mots>","paquets":[{"nom":"Notions","cartes":[{"r":"recto court","v":"verso exact, 40 mots au plus","q":"consigne courte"}]}],"quiz":[{"q":"question","ok":"bonne réponse","no":["fausse 1","fausse 2","fausse 3"],"why":"explication en une phrase"}]}],"echeances":[{"date":"AAAA-MM-JJ","mat":"<identifiant>","matNom":"<nom>","type":"controle|oral|devoir","titre":"12 mots au plus"}]}
Règles : 6 à 30 cartes par chapitre, 4 à 12 questions de quiz avec trois fausses réponses plausibles, formules entre $ et $ en LaTeX. Matières connues : ${mats}. Sinon mat = "x-<nom en minuscules sans accents>". Si je ne donne pas de dates, "echeances" reste vide. N’invente rien.`}
function impAuto(z){
  z.innerHTML=`<p class="note" style="margin:0 0 10px">Tu as un compte Claude (le gratuit suffit) ou une autre IA ? Donne-lui ton cours, elle te rend un texte en JSON, tu le colles ici. Rien ne sort du site.</p>
   <ol class="steps2"><li>Copie le texte ci-dessous et colle-le dans une discussion Claude, puis ajoute ton cours (texte ou photo).</li>
   <li>Copie la réponse de Claude (le bloc qui commence par <b>{</b>).</li>
   <li>Colle-la dans la case en bas et enregistre.</li></ol>
   <textarea class="prompt" id="aTxt" readonly></textarea>
   <div class="exrow"><button class="btn light" type="button" id="aCopy">Copier le texte</button><span class="istat" id="aStat" role="status"></span></div>
   <label class="lab" for="aJson" style="margin-top:18px">La réponse de Claude</label><textarea id="aJson" class="inp" placeholder="Colle ici le JSON" style="min-height:120px"></textarea>
   ${GUEST?"":visField("av","moi")}
   
   <div class="exrow"><button class="btn light" type="button" id="aGo">Enregistrer</button><span class="istat" id="aJStat" role="status"></span></div>`;
  const AC=IMPV.autoCours;$("#aTxt").value=autoPromptJSON()+(AC?`\n\nMatière : ${AC.matNom}. Chapitre : ${AC.titre}.\nMon cours (copié de Pronote) :\n${AC.texte}`:"");
  if(AC){$("#aStat").textContent="Ton cours « "+AC.titre+" » est déjà dans le texte : copie-le tel quel.";IMPV.autoCours=null}
  $("#aCopy").onclick=async()=>{const t=$("#aTxt");try{await navigator.clipboard.writeText(t.value);$("#aStat").textContent="Copié."}catch(e){t.focus();t.select();$("#aStat").textContent="Sélectionné : copie-le avec Ctrl+C."}};
  $("#aGo").onclick=async()=>{const st=$("#aJStat");st.className="istat";let j;
    try{const raw=$("#aJson").value;const i=raw.indexOf("{"),k=raw.lastIndexOf("}");j=JSON.parse(raw.slice(i,k+1))}catch(e){st.className="istat err";st.textContent="Je ne lis pas ce texte. Colle exactement le bloc JSON de Claude.";return}
    const vis=GUEST?"moi":readVis("av"),ALL=!!(IMP.isOwner&&$("#aAll")&&$("#aAll").checked);let nC=0,nE=0;$("#aGo").disabled=true;st.textContent="Enregistrement…";
    try{for(const ch of (Array.isArray(j.chapitres)?j.chapitres:[]).slice(0,10)){const M=resolveMat(ch.mat,ch.matNom||ch.mat);const okId=ALL&&/^[a-z0-9][a-z0-9-]{1,40}$/.test(String(ch.id||""));const cid=okId?String(ch.id):(ALL?M.id.slice(0,6)+"-"+Date.now().toString(36)+nC:hash(UID||"x").slice(0,4)+Date.now().toString(36)+nC);
        const pq=(Array.isArray(ch.paquets)?ch.paquets:[]).slice(0,4).map((p,pi)=>({k:"p"+pi,nom:clip(p&&p.nom,40)||"Cartes",cartes:(Array.isArray(p&&p.cartes)?p.cartes:[]).filter(c=>c&&c.r&&c.v).slice(0,30).map((c,ci)=>({id:cid+"."+pi+"."+ci,r:clip(c.r,160),v:clip(c.v,400),q:clip(c.q,60)}))})).filter(p=>p.cartes.length);
        const qz=(Array.isArray(ch.quiz)?ch.quiz:[]).filter(q=>q&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2).slice(0,15).map((q,qi)=>({id:cid+".q"+qi,q:clip(q.q,240),ok:clip(q.ok,160),no:q.no.slice(0,3).map(x=>clip(x,160)),why:clip(q.why,300)}));
        if(!pq.length&&!qz.length)continue;const titre=clip(ch.titre,80)||"Chapitre importé";
        const doc={id:cid,mat:M.id,matNom:M.nom,matCourt:(C.M[M.id]&&C.M[M.id].court)||M.nom.slice(0,14),suit:(C.M[M.id]&&/^#/.test(C.M[M.id].suit)&&C.M[M.id].suit)||suitFor(M.id),titre,court:clip(ch.court,24)||titre.slice(0,24),vis,auteur:myNick(),src:"import",etat:"importé",cree:new Date().toISOString(),ordre:Date.now(),paquets:pq,quiz:qz.length?[{nom:"Quiz · "+titre.slice(0,30),d:titre,qs:qz}]:[]};
        if(ALL){const old=(C.chaps0&&C.chaps0[cid])||{};const sd=Object.assign({},old,{id:cid,mat:M.id,titre,court:doc.court,etat:clip(ch.etat,40)||old.etat||"",src:old.src||"import",ordre:old.ordre!=null?old.ordre:Date.now()%1e6,paquets:pq,quiz:doc.quiz});delete sd.vis;
          await DB.doc("chapitres/"+cid).set(sd);C.chaps0=Object.assign({},C.chaps0||{},{[cid]:Object.assign({},sd)})}
        else{const w=await putDoc("chap",vis==="moi",cid,doc);if(w==="db"){if(vis==="moi")IMP.mine[cid]=doc;else IMP.pub[UID]=(IMP.pub[UID]||[]).filter(x=>x.id!==cid).concat([doc])}}
        if(Array.isArray(P.mats)&&P.mats.length&&!P.mats.includes(M.id)){P.mats.push(M.id);saveP()}nC++}
      for(const e of (Array.isArray(j.echeances)?j.echeances:[]).slice(0,40)){if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||e.date<TODAY_ISO||!e.titre)continue;const M=resolveMat(e.mat,e.matNom||e.mat);
        const row={date:e.date,mat:M.id,matNom:M.nom,type:["controle","oral","devoir"].includes(e.type)?e.type:"devoir",titre:clip(e.titre,90),src:"import"};const id="i"+hash(row.date+row.mat+row.titre);row.id=id;
        if(ALL){await DB.doc("echeances/"+id).set(row);C.ech0=(C.ech0||[]).filter(x=>x.id!==id).concat([row]);nE++;continue}
        const w=await putDoc("ech",true,id,row);if(w!=="local")IMP.ech=IMP.ech.filter(x=>x.id!==id).concat([row]);nE++}
      mergeAll();reindex();st.textContent=(nC||nE)?`${nC} chapitre${nC>1?"s":""} et ${nE} date${nE>1?"s":""} enregistrés.`:"Rien à enregistrer dans ce texte.";if(nC||nE)toast(`<span class="tm">+</span><div><b>Import terminé</b><span>${nC} chapitre${nC>1?"s":""} · ${nE} date${nE>1?"s":""}</span></div>`)}
    catch(e){st.className="istat err";st.textContent=writeErr(e)}finally{$("#aGo").disabled=false}};
}
function impAutoOld(z){
  const v=IMPV.autoVis||"hub";
  z.innerHTML=`<p class="note" style="margin:0 0 10px">Si tu as Claude payant, ton propre Claude peut lire ton Pronote tout seul, chaque soir s’il le faut, et remplir ton espace ici. Ton mot de passe ne sort jamais de ton navigateur.</p>
   <ol class="steps2"><li>Installe l’extension <b>Claude dans Chrome</b> et connecte-toi à Pronote dans Chrome.</li>
   <li>Copie le texte ci-dessous et colle-le dans une discussion Claude. Pour le faire chaque soir, colle-le dans une <b>tâche programmée</b> (ton PC doit être allumé, Chrome ouvert).</li>
   <li>La première fois, Claude te demande d’autoriser l’accès à cette page : accepte.</li></ol>
   ${visField("av",v.startsWith("ligue:")?"ligue":v)}
   <textarea class="prompt" id="aTxt" readonly></textarea>
   <div class="exrow"><button class="btn light" type="button" id="aCopy">Copier le texte</button><span class="istat" id="aStat" role="status"></span></div>`;
  const upd=()=>{IMPV.autoVis=readVis("av");$("#aTxt").value=autoPrompt(IMPV.autoVis)};upd();
  z.querySelectorAll('input[name="av"]').forEach(r=>r.onchange=upd);if($("#avLig"))$("#avLig").onchange=upd;
  $("#aCopy").onclick=async()=>{const t=$("#aTxt");try{await navigator.clipboard.writeText(t.value);$("#aStat").textContent="Copié."}catch(e){t.focus();t.select();$("#aStat").textContent="Sélectionné : copie-le avec Ctrl+C."}};
}
function impMes(z){
  const pub=(IMP.pub[UID]||[]).map(c=>({c,path:"biblio/"+UID+"/chap/"+c.id})),pri=Object.values(IMP.mine).map(c=>({c:Object.assign({},c,{vis:"moi"}),path:"data/users/"+UID+"/chap/"+c.id}));
  const loc=Object.values(GL.get("chap")).map(c=>({c:Object.assign({},c,{vis:"moi"}),path:"@local/"+c.id}));
  const all=[...pub,...pri,...loc].sort((a,b)=>(b.c.ordre||0)-(a.c.ordre||0));
  z.innerHTML=all.length?`<div>${all.map((x,i)=>{const n=(x.c.paquets||[]).reduce((a,p)=>a+(p.cartes||[]).length,0);return `<div class="eli"><span></span><span><b>${esc(x.c.titre)}</b> · ${esc(x.c.matNom||matName(x.c.mat))}<small>${n} cartes · ${x.path.startsWith("@local/")?"sur ce téléphone":"visible par "+esc(visLabel(x.c.vis))}</small></span><span style="display:flex;gap:12px"><button class="linkbtn" type="button" data-see="${i}">Voir</button><button class="x" type="button" data-del="${i}">Supprimer</button></span></div>`}).join("")}</div>`
    :`<div class="empty2"><h2>Aucun import</h2><p>Importe un premier cours : il apparaîtra ici, avec qui peut le voir.</p></div>`;
  z.querySelectorAll("[data-see]").forEach(b=>b.onclick=()=>{const c=all[+b.dataset.see].c;sel.mat=c.mat;sel.chap="u."+c.id;go("cours")});
  z.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{const x=all[+b.dataset.del];if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Confirmer";return}
    if(x.path.startsWith("@local/")){const g=GL.get("chap");delete g[x.c.id];GL.set("chap",g);mergeAll();reindex();impMes(z);return}
    try{await DB.doc(x.path).delete();if(x.path.startsWith("data/"))delete IMP.mine[x.c.id];else IMP.pub[UID]=(IMP.pub[UID]||[]).filter(c=>c.id!==x.c.id);mergeAll();reindex();impMes(z)}catch(e){b.textContent="Échec"}});
}

/* ================= FICHIER PONT PRONOTE ================= */
function pfClean(j){if(!j||j.format!=="pont-pronote"||!Array.isArray(j.echeances)||!Array.isArray(j.seances))throw new Error("format");
  j=Object.assign({},j);
  j.echeances=j.echeances.filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.date>=TODAY_ISO).slice(0,80).map(e=>({id:clip(e.id,40),date:e.date,matNom:clip(e.matNom,40),type:["controle","oral","devoir"].includes(e.type)?e.type:"devoir",titre:clip(e.titre,90)||"Travail à faire"}));
  j.seances=j.seances.filter(x=>x&&x.matNom).slice(0,60).map(x=>({date:/^\d{4}-\d{2}-\d{2}$/.test(x.date)?x.date:TODAY_ISO,matNom:clip(x.matNom,40),titre:clip(x.titre,120)||"Séance",texte:clip(x.texte,8000)}));
  return j}
function impPronote(z){
  if(!IMPV.pfile&&!IMPV.pAsk&&DB&&UID&&!GUEST){IMPV.pAsk=1;DB.doc("data/users/"+UID+"/pont").get().then(s=>{const j=s.exists?s.data():null;if(j){try{IMPV.pfile=pfClean(j);IMPV.pfDb=1;if(IMPV.tab==="pronote"||$("#pfIn"))impPronote(z)}catch(e){}}}).catch(()=>{})}
  const F=IMPV.pfile,cs=myCodes();
  let h=`<p class="dlnote"><b>Pont Pronote 2</b> est un petit programme pour PC Windows qui se connecte à ton Pronote avec le QR code, comme Papillon. Tu cliques sur « Synchroniser » : tes devoirs et contrôles arrivent dans ton agenda ici, tout seuls, et tes contenus de cours s’affichent ci-dessous. Ton mot de passe Pronote reste sur ton PC.${IMPV.pfDb?"":" Tu peux aussi choisir le fichier qu’il range dans Documents › Pont Pronote."}</p>
   <label class="pfile"><input type="file" id="pfIn" accept=".json,application/json"><b>${F?"Choisir un autre fichier":"Choisir mon fichier Pronote"}</b>Il s’appelle pronote-AAAA-MM-JJ.json, dans Documents › Pont Pronote</label>
   <p class="istat" id="pfStat" role="status"></p>`;
  if(F){
    const mine=new Map(IMP.ech.map(e=>[e.id,e]));
    const rows=F.echeances.map((e,i)=>{const m=resolveMat("",e.matNom),id="p"+String(e.id).replace(/[^a-z0-9]/gi,"").slice(0,24),old=mine.get(id);
      return Object.assign({},e,{i,mid:m.id,mnom:m.nom,hid:id,etat:!old?"new":old.date!==e.date?"mv":"ok",avant:old&&old.date})});
    IMPV.prows=rows;
    const nNew=rows.filter(r=>r.etat==="new").length,nMv=rows.filter(r=>r.etat==="mv").length;
    h+=`<div class="sec"><h2>Tes dates</h2><span>${IMPV.pfDb?"synchro":"fichier"} du ${new Date(F.exporte).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</span></div>
      <p class="note" style="margin:0 0 6px">${nNew} nouvelle${nNew>1?"s":""}${nMv?" · "+nMv+" déplacée"+(nMv>1?"s":""):""} · ${rows.length-nNew-nMv} déjà dans ton agenda</p>
      <div id="pfList">${rows.map(r=>`<label class="eli"><input type="checkbox" data-i="${r.i}" ${r.etat==="ok"?"":"checked"}><span><b>${esc(r.mnom)}</b> · ${esc(r.titre)}${r.etat==="new"?'<span class="ptag new">nouveau</span>':r.etat==="mv"?'<span class="ptag mv">déplacé</span>':'<span class="ptag ok">déjà là</span>'}<small>${esc(r.type==="controle"?"Contrôle":r.type==="oral"?"Oral":"Devoir")} · ${fmtShort.format(parseIso(r.date))}${r.etat==="mv"?" (avant : "+fmtShort.format(parseIso(r.avant))+")":""}</small></span><span></span></label>`).join("")||'<p class="muted">Aucune date à venir dans ce fichier.</p>'}</div>
      ${cs.length?`<label class="share"><input type="checkbox" id="pfShare"> Partager mes contrôles et oraux avec ma ligue <select id="pfLig">${cs.map(c=>`<option value="${esc(c)}">${esc(ligName(c))}</option>`).join("")}</select></label><p class="note" style="margin:4px 0 0">Mode classe : tes camarades de cette ligue voient ces dates dans leurs contrôles, avec ton pseudo. Tes devoirs restent privés.</p>`:""}
      <div class="exrow"><button class="btn light" type="button" id="pfSave"${rows.length?"":" disabled"}>Mettre à jour mon agenda</button><span class="istat" id="pfSStat" role="status"></span></div>
      <div class="sec"><h2>Tes cours récents</h2><span>${F.seances.length} séance${F.seances.length>1?"s":""}</span></div>
      <div>${F.seances.slice(0,30).map((x,i)=>`<div class="sea"><span><b>${esc(resolveMat("",x.matNom).nom)}</b> · ${esc(x.titre)} <span class="via">${fmtShort.format(parseIso(x.date))}</span></span><small>${esc(String(x.texte||"").slice(0,180))}</small><button class="btn ghost" type="button" data-s="${i}"${x.texte?"":" disabled"}>Faire des cartes</button></div>`).join("")||'<p class="muted">Pas de contenu de cours dans les trois dernières semaines.</p>'}</div>`;
  }
  z.innerHTML=h;
  $("#pfIn").onchange=async e=>{const f=e.target.files[0],st=$("#pfStat");if(!f)return;st.className="istat";
    try{if(f.size>3e6)throw new Error("gros");const j=JSON.parse(await f.text());
      if(!j||j.format!=="pont-pronote"||!Array.isArray(j.echeances)||!Array.isArray(j.seances))throw new Error("format");
      j.echeances=j.echeances.filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.date>=TODAY_ISO).slice(0,80).map(e=>({id:clip(e.id,40),date:e.date,matNom:clip(e.matNom,40),type:["controle","oral","devoir"].includes(e.type)?e.type:"devoir",titre:clip(e.titre,90)||"Travail à faire"}));
      j.seances=j.seances.filter(x=>x&&x.matNom).slice(0,60).map(x=>({date:/^\d{4}-\d{2}-\d{2}$/.test(x.date)?x.date:TODAY_ISO,matNom:clip(x.matNom,40),titre:clip(x.titre,120)||"Séance",texte:clip(x.texte,8000)}));
      IMPV.pfile=pfClean(j);IMPV.pfDb=0;impPronote(z)}
    catch(err){st.className="istat err";st.textContent="Ce fichier n’est pas un export de Pont Pronote."}};
  if(!F)return;
  $("#pfSave")&&($("#pfSave").onclick=async()=>{const st=$("#pfSStat");const pick=[...z.querySelectorAll("#pfList input:checked")].map(i=>IMPV.prows[+i.dataset.i]);
    if(!pick.length){st.className="istat err";st.textContent="Coche au moins une ligne.";return}
    const share=$("#pfShare")&&$("#pfShare").checked?$("#pfLig").value:null;
    $("#pfSave").disabled=true;st.className="istat";st.textContent="Mise à jour…";
    try{for(const r of pick){const row={id:r.hid,date:r.date,mat:r.mid,matNom:r.mnom,type:r.type,titre:r.titre,src:"pont"};
        await DB.collection("data/users/"+UID+"/ech").doc(r.hid).set(row);IMP.ech=IMP.ech.filter(x=>x.id!==r.hid).concat([row]);
        if(share&&r.type!=="devoir"){await DB.doc("biblio/"+UID).set({nick:LG.nick||OL.nick||"",upd:Date.now()});await DB.collection("biblio/"+UID+"/ech").doc(r.hid).set(Object.assign({},row,{vis:"ligue:"+share,auteur:LG.nick||OL.nick||""}))}}
      if(Array.isArray(P.mats)&&P.mats.length){pick.forEach(r=>{if(!P.mats.includes(r.mid))P.mats.push(r.mid)});saveP()}
      mergeAll();reindex();toast(`<span class="tm">${pick.length}</span><div><b>Agenda à jour</b><span>${share?"partagé avec « "+esc(ligName(share))+" »":"depuis ton Pronote"}</span></div>`);impPronote(z)}
    catch(e){$("#pfSave").disabled=false;st.className="istat err";st.textContent=writeErr(e)}});
  z.querySelectorAll(".sea [data-s]").forEach(b=>b.onclick=()=>{const x=F.seances[+b.dataset.s],m=resolveMat("",x.matNom);
    if(!IMP.sample){IMPV.autoCours={matNom:m.nom,titre:x.titre,texte:x.texte};IMPV.tab="auto";renderImport();return}
    IMPV.prefill={mat:m.id,matNom:m.nom,titre:x.titre,texte:x.texte};IMPV.draft=null;IMPV.tab="cours";renderImport()});
}

/* Mes matières */
function renderMatsPick(){const box=$("#matsPick");if(!box)return;if(!box.dataset.open){box.innerHTML="";return}
  const ids=(C.matsAll||[]).map(m=>m.id),on=Array.isArray(P.mats)&&P.mats.length?P.mats:(C.mats||[]).map(m=>m.id);
  box.innerHTML=`<div class="mpick"><p>Touche une matière pour l’afficher ou la masquer partout (Table, Jeu, Duel, Cours).</p>${(C.matsAll||[]).map(m=>`<button type="button" class="${on.includes(m.id)?"on":""}" data-m="${esc(m.id)}">${esc(m.nom)}</button>`).join("")}</div>`;
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{let cur=(Array.isArray(P.mats)&&P.mats.length?P.mats:on).filter(x=>ids.includes(x));const m=b.dataset.m;
    cur=cur.includes(m)?cur.filter(x=>x!==m):cur.concat([m]);P.mats=cur.length?cur:null;saveP();reindex();renderTable();renderMatsPick()});
}
$("#tImp").onclick=()=>openImport("ech");$("#cImp").onclick=()=>openImport("cours");
$("#tMats").onclick=()=>{const b=$("#matsPick");if(b.dataset.open)delete b.dataset.open;else b.dataset.open="1";renderMatsPick()};



/* ================= MODE INVITÉ : tout reste sur le téléphone ================= */
let GUEST=false;
const GL={get:k=>{const v=LS.get("g_"+k,{});return v&&typeof v==="object"?v:{}},set:(k,v)=>LS.set("g_"+k,v)};
function guestOn(silent){if(GUEST)return;GUEST=true;document.body.dataset.guest="1";if(!silent)toast(`<span class="tm">i</span><div><b>Mode invité</b><span>Ce que tu fais reste sur ce téléphone</span></div>`)}
const myNick=()=>LG.nick||OL.nick||"";
const DENY=e=>e&&(e.code==="invalid_argument"||e.code==="not_granted"||e.code==="revoked");
/* Écrit un document de l'élève : privé (data/users), partagé (biblio), ou sur le téléphone en mode invité */
async function putDoc(kind,priv,id,doc,noLocal){
  // Contrôle avant toute écriture des fiches et cours importés.
  // Une protection contre un client modifié exige aussi des règles
  // côté base de données ; ce fichier HTML seul ne les impose pas.
  if(kind==="fiche"||kind==="chap"){
    if(GUEST){
      doc=Object.assign({},doc,{vis:"moi"});
      priv=true;
    }else{
      if(!doc||!validUserVis(doc.vis)){
        throw new Error("Visibilité non autorisée. Choisis Moi seul ou un de tes clubs.");
      }
      priv=doc.vis==="moi";
    }
  }
  if(!GUEST&&DB&&UID){try{
      if(priv)await DB.collection("data/users/"+UID+"/"+kind).doc(id).set(doc);
      else{await DB.doc("biblio/"+UID).set({nick:myNick(),upd:Date.now()});await DB.collection("biblio/"+UID+"/"+kind).doc(id).set(doc)}
      return "db"}catch(e){if(!DENY(e))throw e;guestOn()}}
  if(noLocal)return "skip";
  const m=GL.get(kind);m[id]=Object.assign({},doc,{vis:"moi",_local:1});GL.set(kind,m);return "local"}

/* ================= MÉDIAS : captures, photos, vidéo d'écran, PDF ================= */
const MEDIA={};
const pickEven=(a,n)=>a.length<=n?a:Array.from({length:n},(_,i)=>a[Math.round(i*(a.length-1)/Math.max(1,n-1))]);
function mediaField(id,label,lead){const im=IMP.caps&&IMP.caps.images;MEDIA[id]=MEDIA[id]||[];
  const acc=[...(im?(im.mediaTypes||["image/jpeg","image/png"]):[]),...(im?["video/*"]:[]),"application/pdf"].join(",");
  return `<label class="lab" for="${id}">${label}${im?"":" <span>(PDF seulement ici)</span>"}</label>
   <label class="drop" id="${id}Drop"><input id="${id}" type="file" multiple accept="${esc(acc)}"><b>${im?(lead?"Ajouter mes captures ou ma vidéo":"Ajouter des captures, une vidéo ou un PDF"):"Ajouter un PDF"}</b><span>${im?"Images, enregistrement d’écran (on en tire les images utiles) ou PDF du prof.":"Cette page ne peut pas envoyer d’images à Claude ici."}</span></label>
   <div class="mlist" id="${id}List"></div>`}
function mediaKind(f){const t=f.type||"";return t.startsWith("video/")?"video":t==="application/pdf"||/\.pdf$/i.test(f.name)?"pdf":"img"}
function bindMedia(id){const inp=$("#"+id),drop=$("#"+id+"Drop");if(!inp)return;
  const add=fl=>{const im=IMP.caps&&IMP.caps.images;[...fl].forEach(f=>{const k=mediaKind(f);if(k!=="pdf"&&!im)return;if(MEDIA[id].length<20)MEDIA[id].push({k,f})});paintMedia(id)};
  inp.onchange=()=>{add(inp.files);inp.value=""};
  if(drop){drop.ondragover=e=>{e.preventDefault();drop.classList.add("over")};drop.ondragleave=()=>drop.classList.remove("over");drop.ondrop=e=>{e.preventDefault();drop.classList.remove("over");add(e.dataTransfer.files)}}
  paintMedia(id)}
function paintMedia(id){const box=$("#"+id+"List");if(!box)return;const L=MEDIA[id]||[];
  box.innerHTML=L.map((m,i)=>`<span class="mchip"><i>${m.k==="video"?"Vidéo":m.k==="pdf"?"PDF":"Image"}</i><span></span><button type="button" data-i="${i}" aria-label="Retirer">×</button></span>`).join("");
  box.querySelectorAll(".mchip").forEach((c,i)=>{c.querySelector("span").textContent=L[i].f.name||"fichier"});
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{L.splice(+b.dataset.i,1);paintMedia(id)})}
const mediaCount=id=>(MEDIA[id]||[]).length;
async function toJpeg(src,maxW){const W0=src.videoWidth||src.width,H0=src.videoHeight||src.height,k=Math.min(1,maxW/W0),cv=document.createElement("canvas");cv.width=Math.round(W0*k);cv.height=Math.round(H0*k);cv.getContext("2d").drawImage(src,0,0,cv.width,cv.height);return await new Promise(ok=>cv.toBlob(ok,"image/jpeg",.84))}
async function fixImage(f,im){if((im.mediaTypes||[]).includes(f.type)&&f.size<=(im.maxInputBytes||5e6))return f;
  try{const d=await readDataURL(f);const img=new Image();await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko;img.src=d});return await toJpeg(img,1600)}catch(e){throw new Error("Image illisible : "+(f.name||"fichier")+". Essaie une capture en PNG ou JPEG.")}}
async function videoFrames(file,max,onStat){if(max<1)return [];
  const url=URL.createObjectURL(file),v=document.createElement("video");v.muted=true;v.playsInline=true;v.setAttribute("playsinline","");v.preload="auto";v.src=url;
  try{
    await new Promise((ok,ko)=>{v.onloadeddata=ok;v.onerror=()=>ko(new Error("Vidéo illisible ici. Essaie avec des captures d’écran."));setTimeout(()=>ko(new Error("La vidéo met trop de temps à s’ouvrir. Essaie une vidéo plus courte.")),20000)});
    try{await v.play();v.pause()}catch(e){}
    const d=isFinite(v.duration)&&v.duration>0?v.duration:0;if(!d)throw new Error("Vidéo illisible ici. Essaie avec des captures d’écran.");
    const n=Math.min(60,Math.max(max,Math.ceil(d/0.8)));
    const th=document.createElement("canvas");th.width=64;th.height=64;const tg=th.getContext("2d",{willReadFrequently:true});
    const kept=[];let prev=null;
    for(let i=0;i<n;i++){const t=Math.min(d-0.05,(i+0.5)*d/n);
      await new Promise(ok=>{let done=false;const h=()=>{if(done)return;done=true;v.removeEventListener("seeked",h);ok()};v.addEventListener("seeked",h);v.currentTime=t;setTimeout(h,2500)});
      if(onStat)onStat("Lecture de la vidéo… "+Math.round(100*(i+1)/n)+" %");
      tg.drawImage(v,0,0,64,64);const px=tg.getImageData(0,0,64,64).data,sig=new Float32Array(4096);for(let k=0,j=0;k<px.length;k+=4,j++)sig[j]=(px[k]+px[k+1]+px[k+2])/3;
      if(prev){let df=0;for(let k=0;k<4096;k++)df+=Math.abs(sig[k]-prev[k]);if(df/4096<0.2)continue}
      prev=sig;const b=await toJpeg(v,1400);if(b)kept.push(b)}
    return pickEven(kept,max);
  }finally{URL.revokeObjectURL(url);v.removeAttribute("src");try{v.load()}catch(e){}}}
let PDFJS=null;
function loadPdfJs(){if(PDFJS)return PDFJS;const base="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  PDFJS=new Promise((ok,ko)=>{if(window.pdfjsLib){ok(window.pdfjsLib);return}const sc=document.createElement("script");sriSrc(sc,base+"pdf.min.js");
    sc.onload=()=>{const L=window.pdfjsLib;if(!L){ko(new Error("pdf"));return}L.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.js";ok(L)};sc.onerror=()=>ko(new Error("pdf"));document.head.appendChild(sc)});
  PDFJS.catch(()=>{PDFJS=null});return PDFJS}
async function pdfRead(file,maxImgs,onStat){let L;try{L=await loadPdfJs()}catch(e){throw new Error("Le lecteur de PDF ne se charge pas ici. Fais plutôt des captures de ton PDF.")}
  let doc;try{doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise}catch(e){throw new Error("Ce PDF ne s’ouvre pas. Fais plutôt des captures.")}
  let text="";const N=Math.min(doc.numPages,40);
  for(let p=1;p<=N;p++){if(onStat)onStat("Lecture du PDF… page "+p+" sur "+N);const pg=await doc.getPage(p);const tc=await pg.getTextContent();text+=tc.items.map(i=>i.str+(i.hasEOL?"\n":" ")).join("")+"\n\n";if(text.length>60000)break}
  const imgs=[];
  if(text.replace(/\s/g,"").length<300&&maxImgs>0){for(let p=1;p<=Math.min(doc.numPages,maxImgs);p++){const pg=await doc.getPage(p),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(2,1400/v0.width)});
    const cv=document.createElement("canvas");cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;const b=await new Promise(ok=>cv.toBlob(ok,"image/jpeg",.85));if(b)imgs.push(b)}}
  return {text:text.trim(),imgs}}
/* Rassemble tout ce qu'un champ médias contient : images pour Claude et texte des PDF */
async function readMedia(id,onStat){const L=MEDIA[id]||[],im=IMP.caps&&IMP.caps.images,max=im?im.maxCount||4:0;
  const imgs=L.filter(m=>m.k==="img"),vids=L.filter(m=>m.k==="video"),pdfs=L.filter(m=>m.k==="pdf");
  let images=[],text="";
  for(const m of imgs)images.push(await fixImage(m.f,im));
  images=pickEven(images,max);
  let left=max-images.length;
  for(let i=0;i<vids.length;i++){const share=Math.max(1,Math.floor(left/(vids.length-i)));const fr=await videoFrames(vids[i].f,Math.min(share,left),onStat);images.push(...fr);left=max-images.length;if(left<=0)break}
  for(const m of pdfs){const r=await pdfRead(m.f,Math.max(0,left),onStat);if(r.text)text+=(text?"\n\n":"")+r.text;if(r.imgs.length){images.push(...r.imgs.slice(0,left));left=max-images.length}
    if(!r.text&&!r.imgs.length)throw new Error("Ce PDF semble vide ou scanné. Fais des captures à la place.")}
  if(vids.length&&!images.length&&!text)throw new Error("Rien d’utilisable dans la vidéo. Essaie des captures d’écran.");
  if(onStat)onStat(images.length?images.length+" image"+(images.length>1?"s":"")+" prête"+(images.length>1?"s":"")+", Claude lit…":"Claude lit…");
  return {images:images.slice(0,max),text}}

/* ================= PROFIL ================= */
const AVC=["#E7C66B","#7BE0A4","#A6E6F2","#FF9C9C","#C9B6F2","#F2C49B","#EAF3EE"];
function avData(){const a=P.pf&&P.pf.av;return typeof a==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a)&&a.length<40000?a:""}
function initials(n){const w=String(n||"?").trim().split(/\s+/).filter(Boolean);return ((w[0]||"?")[0]+(w[1]?w[1][0]:"")).toUpperCase()}
function avParts(r){const a=r&&typeof r.av==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.av)&&r.av.length<40000?r.av:"";
  const k=avKOk(r&&r.avk);let col=AVC[parseInt(hash(String((r&&r.nick)||"?")),36)%AVC.length];
  if(k&&(k.t==="i"||k.t==="e"))col=AVBG[k.c];
  if(k&&k.t==="b")return {col,inner:persoSVG(k.a)};
  if(k&&k.t==="e")return {col,inner:`<span class="em">${esc(k.x||AV_EMO[k.e])}</span>`};
  if(k&&k.t==="i"&&k.f){const f=AV_FONTS[k.f];return {col,inner:`<span class="fi" style="font-family:'${f[0]}',var(--sans);font-weight:${f[1]};font-size:${f[2]}em">${esc(initials(r&&r.nick))}</span>`}}
  if(a&&(!k||k.t==="p"))return {col,inner:`<img alt="" src="${a}">`};
  return {col,inner:esc(initials(r&&r.nick))}}
function avHTML(r,cls){const {col,inner}=avParts(r);
  const chx=r&&r.sk&&CHR.includes(r.sk.ch)?r.sk.ch:"";
  return `<span class="av ${cls||""}" style="--av:${col}"${chx?` data-ch="${chx}"`:""}${P26ui._cadre(r)}>${inner}</span>`}
function paintMyAv(){const tc=$("#tCoin");if(tc){tc.innerHTML=`<i aria-hidden="true"></i>${fmtN(coins())}`;tc.onclick=()=>go("ligue")}if(typeof ntPaint==="function"){ntPaint();const tb=$("#tBell");if(tb)tb.onclick=()=>{amisLoad(true).then(()=>{if(view==="notifs")renderNotifs()});go("notifs")}}const t=$("#tAv");if(!t)return;const {col,inner}=avParts({nick:myNick()||"Moi",av:avData(),avk:avK()});t.style.setProperty("--av",col);t.innerHTML=inner}
/* Lecture d'image sans blob: (la page publiée refuse les images blob:) */
function readDataURL(f){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(r.error||new Error("lecture"));r.readAsDataURL(f)})}
async function loadPic(f){
  try{const d=await readDataURL(f);const img=new Image();await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko;img.src=d});if(img.naturalWidth)return {src:img,w:img.naturalWidth,h:img.naturalHeight}}catch(e){}
  if(window.createImageBitmap){try{const b=await createImageBitmap(f);return {src:b,w:b.width,h:b.height}}catch(e){}}
  const u=URL.createObjectURL(f);try{const img=new Image();await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko;img.src=u});return {src:img,w:img.naturalWidth,h:img.naturalHeight}}finally{URL.revokeObjectURL(u)}}
function picErr(f){return /heic|heif/i.test((f&&f.type)||"")||/\.(heic|heif)$/i.test((f&&f.name)||"")?"Photo au format HEIC illisible ici. Fais une capture d’écran de la photo, puis choisis la capture.":"Cette image ne s’ouvre pas. Fais une capture d’écran de la photo, puis choisis la capture."}
async function cropAvatar(file){const pic=await loadPic(file);
  const S=Math.min(pic.w,pic.h),cv=document.createElement("canvas");cv.width=cv.height=112;const g=cv.getContext("2d");
  g.drawImage(pic.src,(pic.w-S)/2,(pic.h-S)/2,S,S,0,0,112,112);let q=.8,d=cv.toDataURL("image/jpeg",q);while(d.length>30000&&q>.3){q-=.15;d=cv.toDataURL("image/jpeg",q)}if(pic.src.close)pic.src.close();return d}
/* Avatars : photo, initiales, emoji, personnage */
const AV_EMO=["🦊","🐼","🐯","🦁","🐸","🐙","🦄","🐲","🐧","🦉","🐨","🐺","🔥","⚡","🌙","⭐","🎧","🎮","⚽","🏀","🎨","📚","🚀","👑"];
const AV_FONTS=[["Figtree",800,1],["Bodoni Moda",900,1],["Fredoka",600,1],["Pacifico",400,.9],["Permanent Marker",400,.95],["Press Start 2P",400,.62],["Bebas Neue",400,1.15],["Caveat",700,1.2],["Righteous",400,1],["Space Mono",700,.95]];
const AVBG=["#E7C66B","#7BE0A4","#A6E6F2","#FF9C9C","#C9B6F2","#F2C49B","#EAF3EE","#7B52C9","#B3E5FF","#7FD3FF","#1E4FA3","#C8FFE8","#6EF0B4","#3DAE73","#DFFFC4","#A8F08A","#FFF2A1","#FFC870","#E2924A","#D14B57"];
const AV_PEAU=["#FCE3D3","#F6D2BA","#EFC3A4","#E8B48F","#DDA27A","#D19268","#C2825A","#B3724D","#A06240","#8D5436","#7B472D","#6A3C27","#5A3221","#4A291B","#3B2016"];
const AV_CHEV=["#141414","#2B1D16","#4A2E1E","#6B4226","#8B5A2B","#A0522D","#C2652E","#D9A54A","#EAD7A1","#9A9A9A","#EDEDED","#E77FB2","#7A4FD1","#2E7FB8","#2F9E6A"];
const AV_YC=["#2B1D16","#6B4226","#8C6A2E","#4F8A3C","#2E8C8C","#3E73C9","#7A8C99","#8A4FB0"];
const AV_GLC=["#1F1F1F","#7A4A2A","#C8553D","#E58FB0","#D9C6A5","#3E6FB0","#E7C66B","#F2F2EA"];
const AV_HATC=["#1F2A30","#7A5BB5","#2F6B4F","#C8553D","#3E6FB0","#E7C66B","#E58FB0","#F2F2EA","#8B5A2B","#2E9E9E"];
const AV_TOPC=["#9F6BC9","#3A9AC9","#62B144","#F0C238","#E8902E","#B82A55","#F2B8D6","#E8E8E8","#2A2A2A","#2F6B4F","#C8553D","#1F3F8F"];
/* 0 peau,1 corps,2 couleur yeux,3 expression,4 bouche,5 couleur cheveux,6 coupe,7 couleur barbe,8 barbe,9 couleur lunettes,10 lunettes,11 piercing,12 couleur couvre-chef,13 couvre-chef,14 couleur haut,15 haut,16 fond,17 extras */
const AV_N=[15,3,8,8,6,15,20,15,6,8,6,4,10,8,12,4,20,4];
const AV_LAB={corps:["Fin","Moyen","Large"],yeux:["Ronds","Joyeux","Clin d’œil","Calme","Étonné","Déterminé","Fermés","Pétillants"],bouche:["Sourire","Rire","Calme","Surpris","Langue","En coin"],
  coupe:["Chauve","Rasé","Court","Dégradé","Houppe","Crépu court","Afro","Macarons","Vanilles","Locs courtes","Locs longues","Tresses collées","Box braids","Carré","Long lisse","Ondulé","Bouclé","Queue de cheval","Chignon","Mèche"],
  barbe:["Aucune","Moustache","Bouc","Barbe courte","Barbe pleine","Collier"],lunettes:["Aucune","Rondes","Carrées","Fines","Soleil","Œil de chat"],piercing:["Aucun","Anneau au nez","Point au nez","Sourcil"],
  tete:["Aucun","Hijab","Turban","Foulard","Bonnet","Casquette","Durag","Bandeau"],haut:["T-shirt","Sweat à capuche","Chemise","Col roulé"],extras:["Aucun","Casque audio","Boucles d’oreilles","Taches de rousseur"]};
const AV_CATS=[["peau","Peau",[[0,AV_PEAU,"Couleur de peau"]],null],["corps","Corps",[],[1,"corps"]],["yeux","Yeux",[[2,AV_YC,"Couleur des yeux"]],[3,"yeux"]],["bouche","Bouche",[],[4,"bouche"]],
  ["cheveux","Cheveux",[[5,AV_CHEV,"Couleur"]],[6,"coupe"]],["barbe","Barbe",[[7,AV_CHEV,"Couleur"]],[8,"barbe"]],["lunettes","Lunettes",[[9,AV_GLC,"Couleur"]],[10,"lunettes"]],["piercing","Piercings",[],[11,"piercing"]],
  ["tete","Couvre-chef",[[12,AV_HATC,"Couleur"]],[13,"tete"]],["haut","Haut",[[14,AV_TOPC,"Couleur"]],[15,"haut"]],["extras","Extras",[],[17,"extras"]],["fond","Fond",[[16,AVBG,"Couleur du fond"]],null]];
const AV_FACE=new Set(["yeux","bouche","barbe","lunettes","piercing"]);
function emoOk(x){if(typeof x!=="string")return "";x=x.trim();if(!x)return "";
  if(window.Intl&&Intl.Segmenter){const g=[...new Intl.Segmenter("fr",{granularity:"grapheme"}).segment(x)];x=g.length?g[0].segment:""}
  return x.length<=16&&/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|[\u{1F1E6}-\u{1F1FF}]|[\u{E0020}-\u{E007F}])+$/u.test(x)&&/[^\d#*\u200d\ufe0f]/u.test(x)?x:""}
function avMig(o){const [pe,co,ch,ye,bo,te,fo,ac]=o,a=[[0,3,5,8,10,12][pe],1,0,[0,1,2,0][ye],bo,[0,2,4,7,6,13,14,10][ch],[2,1,6,14,12,18,2][co],[0,2,4,7,6,13,14,10][ch],0,0,ye===3?1:0,0,0,co===6?5:ac===3?7:0,[9,3,11,10,0,8,6,7][te],0,fo,ac===1?1:ac===2?2:0];return a}
function avKOk(k){if(!k||typeof k!=="object")return null;const t=k.t,ci=x=>Number.isInteger(x)&&x>=0&&x<AVBG.length?x:0;
  if(t==="p")return {t};if(t==="i")return {t,c:ci(k.c),f:Number.isInteger(k.f)&&k.f>=0&&k.f<AV_FONTS.length?k.f:0};
  if(t==="e"){const x=emoOk(k.x);return x?{t,c:ci(k.c),x}:{t,c:ci(k.c),e:Number.isInteger(k.e)&&k.e>=0&&k.e<AV_EMO.length?k.e:0}}
  if(t==="a"&&Array.isArray(k.a)&&k.a.length===8&&k.a.every(v=>Number.isInteger(v)&&v>=0&&v<9))return {t:"b",a:avMig(k.a)};
  if(t==="b"&&Array.isArray(k.a)&&k.a.length===AV_N.length&&k.a.every((v,i)=>Number.isInteger(v)&&v>=0&&v<AV_N[i]))return {t,a:k.a.slice()};return null}
function avK(){return avKOk(P.pf&&P.pf.avk)}
function avRand(){const r=n=>Math.floor(Math.random()*n),a=AV_N.map(r);[8,10,11,13,17].forEach(i=>{if(Math.random()<.7)a[i]=0});a[7]=a[5];return a}
function persoSVG(a,face){const [pe,bd,yc,ex,bo,hci,hs,bci,bs,lci,ls,pi,cci,cs,tci,ts,fd,xx]=a,sk=AV_PEAU[pe],hc=AV_CHEV[hci],bc=AV_CHEV[bci],lc=AV_GLC[lci],cc=AV_HATC[cci],tc=AV_TOPC[tci],ink="#1D1D1B",dk=`fill="#000" opacity=".16"`;
  const hideAll=cs===1||cs===2||cs===3||cs===6,hideFront=hideAll||cs===4||cs===5;
  const C=`<path d="M30 41Q29 18 50 18Q71 18 70 41Q64 28 50 28Q36 28 30 41Z" fill="${hc}"/>`;
  const ln=(pts,w,col)=>`<path d="${pts}" stroke="${col||hc}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  let hb="",hf="";
  switch(hs){case 1:hf=C.replace("/>",' opacity=".55"/>');break;case 2:hf=C;break;
   case 3:hf=`<path d="M32 33Q34 18 50 18Q66 18 68 33Q60 25 50 25Q40 25 32 33Z" fill="${hc}"/><path d="M30 42Q30 33 33 30L34 40ZM70 42Q70 33 67 30L66 40Z" fill="${hc}" opacity=".5"/>`;break;
   case 4:hf=C+`<path d="M36 26Q40 8 62 11Q58 17 66 22Q52 18 36 26Z" fill="${hc}"/>`;break;
   case 5:hf=C+[[32,34],[35,26],[41,21],[50,19],[59,21],[65,26],[68,34]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.6" fill="${hc}"/>`).join("");break;
   case 6:hb=`<circle cx="50" cy="36" r="28" fill="${hc}"/>`;hf=C;break;
   case 7:hb=`<circle cx="26" cy="22" r="11" fill="${hc}"/><circle cx="74" cy="22" r="11" fill="${hc}"/>`;hf=C;break;
   case 8:hf=C+ln("M34 26L28 17M42 21L40 10M50 19V8M58 21L60 10M66 26L72 17",5.5);break;
   case 9:hb=ln("M31 36V60M37 31V62M63 31V62M69 36V60",5.5);hf=C+ln("M41 28V35M50 27V34M59 28V35",4.5);break;
   case 10:hb=ln("M30 38V84M36 32V88M64 32V88M70 38V84",5.5);hf=C;break;
   case 11:hf=C+`<path d="M38 22Q37 30 36 38M44 19V30M50 18V29M56 19V30M62 22Q63 30 64 38" stroke="#000" stroke-opacity=".28" stroke-width="1.6" fill="none"/>`;break;
   case 12:hb=ln("M28 40V90M33 34V92M38 30V92M62 30V92M67 34V92M72 40V90",4.2);hf=C;break;
   case 13:hb=`<path d="M27 42Q27 16 50 16Q73 16 73 42V62Q67 64 65 58H35Q33 64 27 62Z" fill="${hc}"/>`;hf=`<path d="M30 38Q31 19 50 19Q69 19 70 38Z" fill="${hc}"/>`;break;
   case 14:hb=`<path d="M28 40Q28 15 50 15Q72 15 72 40L75 80Q62 74 60 58H40Q38 74 25 80Z" fill="${hc}"/>`;hf=`<path d="M30 43Q31 19 50 19Q69 19 70 43Q61 30 45 32Q36 34 30 43Z" fill="${hc}"/>`;break;
   case 15:hb=`<path d="M28 40Q26 15 50 15Q74 15 72 40Q78 50 72 58Q78 68 70 80Q62 74 60 58H40Q38 74 30 80Q22 68 28 58Q22 50 28 40Z" fill="${hc}"/>`;hf=`<path d="M30 43Q31 19 50 19Q69 19 70 43Q61 30 45 32Q36 34 30 43Z" fill="${hc}"/>`;break;
   case 16:hb=[[30,36],[27,48],[30,61],[70,36],[73,48],[70,61],[36,24],[50,18],[64,24]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="${hc}"/>`).join("");hf=C;break;
   case 17:hb=`<path d="M64 26Q88 30 82 66Q76 48 66 38Z" fill="${hc}"/>`;hf=C;break;
   case 18:hb=`<circle cx="50" cy="15" r="9" fill="${hc}"/>`;hf=C;break;
   case 19:hf=C+`<path d="M44 22Q29 26 30 50Q34 36 47 29Z" fill="${hc}"/>`;break}
  if(hideAll)hb="";if(hideFront)hf="";
  const BW=[[24,76],[16,84],[9,91]][bd];
  let top=`<path d="M${BW[0]} 100Q${BW[0]+3} 73 50 71Q${BW[1]-3} 73 ${BW[1]} 100Z" fill="${tc}"/>`;
  if(ts===1)top+=`<path d="M33 75Q50 86 67 75Q63 66 50 66Q37 66 33 75Z" fill="${tc}"/><path d="M33 75Q50 86 67 75Q63 66 50 66Q37 66 33 75Z" ${dk}/>`;
  const neck=`<rect x="44" y="58" width="12" height="16" rx="4" fill="${sk}"/>`;let topF="";
  if(ts===0)topF=`<path d="M42 72Q50 79 58 72" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>`;
  if(ts===1)topF=ln("M46 78V88M54 78V88",1.6,"#fff");
  if(ts===2)topF=`<path d="M42 70L50 79L45 82L39 73ZM58 70L50 79L55 82L61 73Z" fill="#F2F2EA"/><path d="M50 79V100" stroke="#000" stroke-opacity=".2" stroke-width="1.5"/>`;
  if(ts===3)topF=`<rect x="42" y="62" width="16" height="13" rx="5" fill="${tc}"/><rect x="42" y="62" width="16" height="13" rx="5" ${dk}/>`;
  const ears=cs===1?"":`<circle cx="30" cy="47" r="4.5" fill="${sk}"/><circle cx="70" cy="47" r="4.5" fill="${sk}"/>`;
  const hij=cs===1?`<path d="M50 16Q24 16 24 47Q24 66 30 78Q20 84 16 100H84Q80 84 70 78Q76 66 76 47Q76 16 50 16Z" fill="${cc}"/><ellipse cx="50" cy="46" rx="22" ry="24" ${dk}/>`:"";
  const head=`<ellipse cx="50" cy="45" rx="20" ry="22" fill="${sk}"/>`;
  const cheek=`<circle cx="38" cy="54" r="3.5" fill="#E8776F" opacity=".28"/><circle cx="62" cy="54" r="3.5" fill="#E8776F" opacity=".28"/>`+(xx===3?[[36,52],[39,54],[37,56],[41,52],[64,52],[61,54],[63,56],[59,52]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="#8A4A2A" opacity=".55"/>`).join(""):"");
  const BEARD=["",`<path d="M42 54Q50 50 58 54Q55 57 50 55Q45 57 42 54Z" fill="${bc}"/>`,`<path d="M42 54Q50 50 58 54Q55 57 50 55Q45 57 42 54Z" fill="${bc}"/><path d="M45 62Q50 70 55 62Q53 60 50 61Q47 60 45 62Z" fill="${bc}"/>`,
    `<path d="M30 46Q31 66 50 68Q69 66 70 46Q68 58 60 60Q50 64 40 60Q32 58 30 46Z" fill="${bc}" opacity=".45"/>`,
    `<path d="M30 44Q30 72 50 73Q70 72 70 44Q68 58 60 59Q50 62 40 59Q32 58 30 44Z" fill="${bc}"/><path d="M42 54Q50 50 58 54Q55 57 50 55Q45 57 42 54Z" fill="${bc}"/>`,
    `<path d="M31 48Q32 68 50 69Q68 68 69 48Q67 63 50 64Q33 63 31 48Z" fill="${bc}"/>`][bs];
  const nose=`<path d="M49 49Q50.5 52.5 52.5 51" stroke="#000" stroke-opacity=".3" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const yy=AV_YC[yc],eye=x=>`<ellipse cx="${x}" cy="46" rx="4.3" ry="4.7" fill="#fff"/><circle cx="${x}" cy="46.5" r="2.9" fill="${yy}"/><circle cx="${x}" cy="46.5" r="1.4" fill="${ink}"/><circle cx="${x+1}" cy="45.3" r=".9" fill="#fff"/>`,
    arc=x=>ln(`M${x-4} 47Q${x} 42 ${x+4} 47`,2.4,ink),shut=x=>ln(`M${x-4} 46Q${x} 49.5 ${x+4} 46`,2.2,ink),brow=(d)=>ln(d,2.2,hc==="#EDEDED"?"#9A9A9A":hc);
  let e="";const sb=brow("M38 39.5Q42 38 46 39.5")+brow("M54 39.5Q58 38 62 39.5");
  switch(ex){case 1:e=arc(42)+arc(58)+sb;break;case 2:e=eye(42)+arc(58)+sb;break;
   case 3:e=eye(42)+eye(58)+`<path d="M37.5 46A4.5 4.7 0 0 1 46.5 46ZM53.5 46A4.5 4.7 0 0 1 62.5 46Z" fill="${sk}"/>`+ln("M37.5 46H46.5M53.5 46H62.5",1.4,ink)+sb;break;
   case 4:e=eye(42)+eye(58)+brow("M38 37Q42 34 46 37")+brow("M54 37Q58 34 62 37");break;
   case 5:e=eye(42)+eye(58)+brow("M38 38L46 40.5")+brow("M62 38L54 40.5");break;
   case 6:e=shut(42)+shut(58)+sb;break;
   case 7:e=eye(42)+eye(58)+`<path d="M44.5 42.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6zM60.5 42.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#fff"/>`+sb;break;
   default:e=eye(42)+eye(58)+sb}
  const M=[ln("M43 57Q50 63 57 57",2.4,ink),`<path d="M42 56Q50 67 58 56Z" fill="#7A2E2E"/><path d="M45 61Q50 64 55 61Q50 59 45 61Z" fill="#E8776F"/>`,ln("M45 59H55",2.4,ink),`<ellipse cx="50" cy="59" rx="3" ry="4" fill="#7A2E2E"/>`,
    ln("M43 57Q50 63 57 57",2.4,ink)+`<path d="M47 60Q50 66 53 60Z" fill="#E8776F"/>`,ln("M44 58Q51 61 57 55",2.4,ink)][bo];
  let hat="";if(cs===2)hat=`<path d="M29 40Q25 13 50 12Q75 13 71 40Q66 30 50 29Q34 30 29 40Z" fill="${cc}"/>`+ln("M33 22Q50 30 66 18M50 12Q46 22 50 29",2,"rgba(0,0,0,.2)");
  if(cs===3)hat=`<path d="M29 40Q24 10 50 9Q76 10 71 40Q66 30 50 29Q34 30 29 40Z" fill="${cc}"/><ellipse cx="44" cy="8" rx="7" ry="5" fill="${cc}"/><ellipse cx="57" cy="8" rx="7" ry="5" fill="${cc}"/><ellipse cx="50" cy="9" rx="4" ry="4" ${dk}/>`;
  if(cs===4)hat=`<path d="M29 37Q29 12 50 12Q71 12 71 37Z" fill="${cc}"/><rect x="28" y="31" width="44" height="9" rx="4" fill="${cc}"/><rect x="28" y="31" width="44" height="9" rx="4" ${dk}/><circle cx="50" cy="10" r="5" fill="${cc}"/>`;
  if(cs===5)hat=`<path d="M28 39Q29 15 50 15Q71 15 72 39Z" fill="${cc}"/><path d="M50 37H85Q85 43 71 42H50Z" fill="${cc}"/><path d="M50 37H85Q85 43 71 42H50Z" ${dk}/>`;
  if(cs===6)hat=`<path d="M66 33Q82 44 79 68Q74 50 63 42Z" fill="${cc}"/><path d="M30 40Q29 17 50 17Q71 17 70 40Q64 30 50 30Q36 30 30 40Z" fill="${cc}"/>`+ln("M38 22Q50 18 62 22",1.6,"rgba(255,255,255,.35)");
  if(cs===7)hat=`<path d="M30 34Q50 26 70 34V39Q50 31 30 39Z" fill="${cc}"/>`;
  const G=[ "",`<g stroke="${lc}" stroke-width="2" fill="none"><circle cx="42" cy="46" r="6.5"/><circle cx="58" cy="46" r="6.5"/><path d="M48.5 46H51.5M35.5 45L31 44M64.5 45L69 44"/></g>`,
    `<g stroke="${lc}" stroke-width="2.2" fill="none"><rect x="35" y="41" width="14" height="11" rx="2.5"/><rect x="51" y="41" width="14" height="11" rx="2.5"/><path d="M49 46H51M35 45L31 44M65 45L69 44"/></g>`,
    `<g stroke="${lc}" stroke-width="1.4" fill="none"><rect x="35" y="43" width="14" height="7" rx="2"/><rect x="51" y="43" width="14" height="7" rx="2"/><path d="M49 46H51M35 45L31 44M65 45L69 44"/></g>`,
    `<g fill="${lc==="#F2F2EA"?"#1F1F1F":lc}"><rect x="34.5" y="41" width="15" height="10" rx="4"/><rect x="50.5" y="41" width="15" height="10" rx="4"/></g><path d="M49.5 45H50.5M34.5 44L31 43.5M65.5 44L69 43.5" stroke="#1F1F1F" stroke-width="1.6"/><path d="M37 43.5H42M53 43.5H58" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>`,
    `<g stroke="${lc}" stroke-width="2.2" fill="none"><path d="M34 42Q42 39 49 43Q48 51 42 51Q35 51 34 42ZM66 42Q58 39 51 43Q52 51 58 51Q65 51 66 42Z"/><path d="M49 45H51"/></g>`][ls];
  const PI=["",`<path d="M51.2 51.8a2 2 0 1 0 2.4 1.2" stroke="#E7C66B" stroke-width="1.2" fill="none"/>`,`<circle cx="53.4" cy="50.6" r="1.1" fill="#E7C66B"/>`,`<circle cx="60.5" cy="38.4" r=".95" fill="#C9C9C9"/><circle cx="62.6" cy="38.9" r=".95" fill="#C9C9C9"/>`][pi];
  let ext="";if(xx===1)ext=`<path d="M27 46Q27 14 50 14Q73 14 73 46" stroke="#2A2D31" stroke-width="4" fill="none"/><rect x="22" y="40" width="9" height="15" rx="4" fill="#2A2D31"/><rect x="69" y="40" width="9" height="15" rx="4" fill="#2A2D31"/>`;
  if(xx===2&&cs!==1)ext=`<circle cx="30" cy="53" r="2.6" fill="#E7C66B"/><circle cx="70" cy="53" r="2.6" fill="#E7C66B"/>`;
  return `<svg viewBox="${face==="h"?"8 0 84 84":face?"20 14 60 60":"0 0 100 100"}" aria-hidden="true"><rect x="0" y="0" width="100" height="100" fill="${AVBG[fd]}"/>${hb}${top}${neck}${topF}${hij}${ears}${head}${cheek}${BEARD}${nose}${e}${M}${hf}${hat}${G}${PI}${ext}</svg>`}
function renderProfil(){const box=$("#pf");P.pf=P.pf||{};
  if(P.pf.avv===undefined){const k=avKOk(P.pf.avk);if(k&&k.t==="b"){P.pf.avk={t:"b",a:AV_DEF.slice()};P.pf.ava=P.pf.avk.a}P.pf.avv=[];saveP();lgPush();paintMyAv()}
  const n=myNick(),tot=totalXP(),tr=trophies().filter(t=>t.got).length,cs=myCodes();
  box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="pfBack">Retour</button></div>
   <div class="pfhead">${avHTML(P26ui._moi({nick:n||"Moi",av:avData(),avk:avK()}),"xl")}<div><h1>${esc(n||"Ton profil")}</h1>${(x=>x?`<small class="p1s">${x}</small>`:"")(P26ui.sousHTML(P26ui._moi({nick:n})))}<p>${esc(P.pf.cl||"Première")}${LG.nick?" · "+DIVS[LG.div||0]:""}</p>${GUEST?`<p><span class="gbadge">Mode invité</span></p>`:""}</div></div>
   <div data-slot="profil"></div>
   <div class="sec"><h2>Ma classe et mes révisions</h2></div>
   ${P.cls?`<div class="clsbox"><b>${esc(CLS[clsOk(P.cls).niv].nom)}</b><span>${CLS[clsOk(P.cls).niv].nspe?"Spécialités : "+clsOk(P.cls).spes.map(m=>esc(MATDEF[m].court)).join(", ")+" · ":""}${CLS[clsOk(P.cls).niv].tronc.includes("lvb")?"LVB : "+esc(MATDEF[clsOk(P.cls).lvb].court)+" · ":""}${clsMats(P.cls).reduce((a,m)=>a+clsOk(P.cls).th[m].length,0)} thèmes</span>
     <div class="clsact"><button class="btn ghost" type="button" data-onb="0">Classe</button><button class="btn ghost" type="button" data-onb="1">${CLS[clsOk(P.cls).niv].tronc.includes("lvb")?"Spécialités et LVB":"Spécialités"}</button><button class="btn ghost" type="button" data-onb="2">Ce que je révise</button></div></div>`
   :`<div class="exrow" style="margin:0"><button class="btn light" type="button" data-onb="0">Choisir ma classe</button></div>`}
   <div class="sec"><h2>Mon avatar</h2></div>
   <div class="seg" id="avTabs" role="tablist"><span class="segi" aria-hidden="true"></span>${[["p","Photo"],["i","Initiales"],["e","Emoji"],["a","Personnage"]].map(([k,l])=>`<button type="button" role="tab" class="${avTab()===k?"on":""}" data-k="${k}">${l}</button>`).join("")}</div>
   <div class="aved" id="avEd">${avEditor()}</div>
   <p class="istat" id="avStat" role="status"></p>
   <p class="note" style="margin:6px 0 0">${GUEST?"Ton avatar reste sur ce téléphone.":"Ton avatar s’affiche à côté de ton nom dans la ligue globale et tes clubs."}</p>
   <div class="iform"><label class="lab" for="pfNick">Pseudo <span>(celui de ton compte)</span></label><input id="pfNick" class="inp" maxlength="16" autocomplete="off" readonly>
   <label class="lab" for="pfCl">Classe <span>(facultatif)</span></label><input id="pfCl" class="inp" maxlength="16" autocomplete="off" placeholder="Ex. 1re G3">
   <div class="exrow"><button class="btn light" type="button" id="pfSave">Enregistrer</button><span class="istat" id="pfStat" role="status"></span></div></div>
   <div class="sec"><h2>En chiffres</h2></div>
   ${xpExplainHTML()}<div class="pfstat"><div><b>${streakNow()}</b><span>soirs d’affilée</span></div><div><b>${tr}</b><span>trophées</span></div><div><b>${fmtN(giftSum("xp"))}</b><span>XP en cadeau</span></div></div>
   ${IMP.isOwner?`<div class="sec"><h2>Administration</h2></div><div class="admsw"><label class="sw"><input type="checkbox" id="pfAdm" ${ADM()?"checked":""}><span></span></label><div><b>Mode admin</b><small>${ADM()?"Activé sur cet appareil.":"Désactivé : tu vois le site comme un élève."}</small></div></div>${ADM()?`<div class="exrow"><button class="btn light" type="button" id="pfAdmGo">Ouvrir le panneau admin</button></div>`:""}`:""}
   <div class="sec"><h2>Affichage</h2></div>
   <div class="pick sm" id="pfTheme">${[["","Sombre"],["clair","Clair"],["auto","Comme mon téléphone"]].map(([k,l])=>`<button type="button" class="${(P.theme||"")===k?"on":""}" data-k="${k}">${l}</button>`).join("")}</div>
   <div data-slot="profil.reglages"></div>
   <div class="sec"><h2>Mes matières</h2><span>${(C.mats||[]).length}</span></div>
   <div class="pick sm" style="flex-wrap:wrap;overflow:visible;-webkit-mask-image:none;mask-image:none">${(C.mats||[]).map(m=>`<button type="button" style="--suit:${m.suit}" disabled><span class="dot"></span>${esc(m.court||m.nom)}</button>`).join("")}<button type="button" id="pfMats">Changer</button></div>
   <div class="sec"><h2>Mes clubs</h2><span>${cs.length}</span></div>
   <p class="note" style="margin:0">${cs.length?cs.map(c=>esc(ligName(c))+" ("+esc(c)+")").join(" · "):"Aucune pour l’instant."} <button class="linkbtn" type="button" id="pfLig">Ouvrir mes clubs</button></p>
   <div class="sec"><h2>Compte</h2></div>
   <p class="note" style="margin:0 0 10px">Ta progression est enregistrée dans ton compte Première 2026 : connecte-toi sur n’importe quel appareil pour la retrouver. Pronote n’est pas relié au hub : importe tes devoirs avec une capture ou une vidéo d’écran.</p>
   <div class="p26acct"><div class="row"><button class="btn ghost" type="button" id="pfImp">Importer mes devoirs</button><button class="btn ghost" type="button" id="pfOut">Se déconnecter</button></div>
   <div class="row"><button class="linkbtn" type="button" id="pfCode">Nouveau code de secours</button><button class="linkbtn" type="button" id="pfPwd">Changer mon mot de passe</button><button class="linkbtn" type="button" id="pfExp">Exporter mes données</button><label class="linkbtn" style="cursor:pointer">Importer un export<input type="file" id="pfImpJ" accept=".json,application/json" hidden></label></div>
   <div id="pfAcctBox"></div><p class="istat" id="pfAcct" role="status"></p></div>`;
  $("#pfNick").value=n;$("#pfCl").value=P.pf.cl||"";P26ui.slot("profil",box.querySelector('[data-slot="profil"]'));P26ui.slot("profil.reglages",box.querySelector('[data-slot="profil.reglages"]'));
  if($("#pfAdm"))$("#pfAdm").onchange=e=>{LS.set("adm",!!e.target.checked);mergeAll();reindex();renderProfil()};
  if($("#pfAdmGo"))$("#pfAdmGo").onclick=()=>go("admin");
  $("#pfBack").onclick=()=>go(LS.get("view","table")==="profil"?"table":LS.get("view","table"));
  avTabsWire();avWire();
  $("#pfSave").onclick=async()=>{const nk=cleanNick($("#pfNick").value),cl=clip($("#pfCl").value,16),st=$("#pfStat");
    if(!nk){st.className="istat err";st.textContent="Choisis un pseudo.";return}
    P.pf.cl=cl;OL.nick=nk;LS.set("nick",nk);const join=!LG.nick;LG.nick=nk;saveP();
    if(LG.ok&&!GUEST)await lgPush(true);paintMyAv();st.className="istat";st.textContent=join&&LG.ok&&!LG.ro?"Enregistré. Tu es dans la ligue.":"Enregistré.";if(LG.ro)guestOn()};
  $("#pfOut").onclick=()=>{if(confirm("Te déconnecter de cet appareil ?"))window.P26.account.signOut()};
  $("#pfCode").onclick=()=>{const st=$("#pfAcct");st.className="istat";st.textContent="";
    $("#pfAcctBox").innerHTML=`<form class="invbox" id="pfProofF" novalidate><label class="lab" for="pfProof">Ton mot de passe ou ton code de secours actuel</label><div class="olrow"><input class="inp" id="pfProof" type="password" autocomplete="current-password" maxlength="200"><button class="btn light" type="submit" id="pfProofGo">Créer un nouveau code</button></div><p class="exnote" style="margin:6px 0 0">L’ancien code ne marchera plus.</p></form>`;
    $("#pfProof").focus();
    $("#pfProofF").onsubmit=async e=>{e.preventDefault();const v=$("#pfProof").value;if(!v){st.className="istat err";st.textContent="Tape ton mot de passe ou ton code actuel.";return}
      $("#pfProofGo").disabled=true;st.className="istat";st.textContent="…";
      try{const c=await window.P26.account.newRecoveryCode(v);if(!c)throw {code:"refuse"};$("#pfAcctBox").innerHTML=`<div class="invbox"><p style="margin:0 0 6px"><b>Ton nouveau code de secours.</b> Note-le : il ne sera plus affiché.</p><p class="codebig" style="text-align:center">${esc(c)}</p></div>`;st.textContent=""}
      catch(err){st.className="istat err";st.textContent=err&&err.code==="refuse"?"Mot de passe ou code incorrect. Après 5 erreurs, il faut attendre 15 minutes.":"Impossible pour l’instant.";if($("#pfProof"))$("#pfProof").value=""}
      finally{if($("#pfProofGo"))$("#pfProofGo").disabled=false}}};
  $("#pfPwd").onclick=()=>{const st=$("#pfAcct");st.className="istat";st.textContent="";
    $("#pfAcctBox").innerHTML=`<form class="invbox" id="pfPwdF" novalidate><label class="lab" for="pfOld">Mot de passe actuel</label><input class="inp" id="pfOld" type="password" autocomplete="current-password" maxlength="200"><label class="lab" for="pfNew">Nouveau mot de passe (8 caractères au moins)</label><input class="inp" id="pfNew" type="password" autocomplete="new-password" maxlength="200"><div class="exrow"><button class="btn light" type="submit" id="pfPwdGo">Changer</button></div></form>`;
    $("#pfOld").focus();
    $("#pfPwdF").onsubmit=async e=>{e.preventDefault();const a=$("#pfOld").value,n=$("#pfNew").value;
      if(!a){st.className="istat err";st.textContent="Tape ton mot de passe actuel.";return}
      if(n.length<8){st.className="istat err";st.textContent="Le nouveau mot de passe fait 8 caractères au moins.";return}
      $("#pfPwdGo").disabled=true;st.className="istat";st.textContent="…";
      try{await window.P26.account.changePassword(a,n);$("#pfAcctBox").innerHTML="";st.className="istat";st.textContent="Mot de passe changé."}
      catch(err){st.className="istat err";st.textContent=err&&err.code==="refuse"?"Mot de passe actuel incorrect.":err&&err.code==="invalid_argument"?"Le nouveau mot de passe fait 8 caractères au moins.":"Impossible pour l’instant.";if($("#pfOld"))$("#pfOld").value=""}
      finally{if($("#pfPwdGo"))$("#pfPwdGo").disabled=false}}};
  $("#pfExp").onclick=async()=>{const st=$("#pfAcct");st.className="istat";st.textContent="Préparation…";
    try{const j=await window.P26.account.exportAll();await dlSave("premiere-2026-"+String(j.pseudo||"export").replace(/[^A-Za-z0-9]+/g,"-")+".json",JSON.stringify(j,null,1),st)}catch(e){st.className="istat err";st.textContent="Export impossible pour l’instant."}};
  $("#pfImpJ").onchange=async e=>{const f=e.target.files[0],st=$("#pfAcct");if(!f)return;st.className="istat";st.textContent="Import…";
    try{const j=JSON.parse(await f.text());const n=await window.P26.account.importAll(j,r=>{if(mergeP(r))saveP()});st.textContent="Import terminé : "+n+" document"+(n>1?"s":"")+" repris. Ta progression a été fusionnée.";mergeAll();reindex();renderProfil();$("#pfAcct").textContent="Import terminé : "+n+" document"+(n>1?"s":"")+" repris."}catch(err){st.className="istat err";st.textContent=err&&err.message?err.message:"Fichier illisible."}};
  $("#pfMats").onclick=()=>{go("table");const b=$("#matsPick");b.dataset.open="1";renderMatsPick();b.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"})};
  $("#pfLig").onclick=()=>go("clubs");box.querySelectorAll("[data-onb]").forEach(b=>b.onclick=()=>{ONB.later=false;onbOpen(+b.dataset.onb)});
  $("#pfTheme").querySelectorAll("button").forEach(b=>b.onclick=()=>{P.theme=b.dataset.k;LS.set("theme",P.theme);saveP();applyTheme();renderProfil()});$("#pfImp").onclick=()=>openImport("ech");
}

let AVTAB="",AVCAT="peau",CROP=null,AVFADE=false;
const AV_DEF=[6,1,0,0,0,0,0,0,0,0,0,0,0,0,7,0,6,0];
function avTab(){if(AVTAB)return AVTAB;const k=avK();return k?(k.t==="b"?"a":k.t):(avData()?"p":"i")}
function avSet(k){P.pf=P.pf||{};P.pf.avk=k;if(k.t==="b")P.pf.ava=k.a;saveP();lgPush();paintMyAv();avRefresh()}
function avSeg(){const t=$("#avTabs");if(!t)return;const cur=avTab();let on=null;t.querySelectorAll("button").forEach(b=>{const o=b.dataset.k===cur;b.classList.toggle("on",o);b.setAttribute("aria-selected",o);if(o)on=b});
  const ind=t.querySelector(".segi");if(ind&&on){ind.style.width=on.offsetWidth+"px";ind.style.transform=`translateX(${on.offsetLeft}px)`}}
function avRefresh(){const ed=$("#avEd");if(!ed)return renderProfil();const cats=ed.querySelector(".avcats"),sl=cats?cats.scrollLeft:0;
  ed.innerHTML=avEditor();const c2=ed.querySelector(".avcats");if(c2){c2.scrollLeft=sl;const on=c2.querySelector(".on");if(on&&AVFADE){const l=on.offsetLeft-12,r=l+on.offsetWidth+24;if(l<c2.scrollLeft||r>c2.scrollLeft+c2.clientWidth)c2.scrollTo({left:Math.max(0,l-40),behavior:reduce?"auto":"smooth"})}}
  if(AVFADE){const b=ed.querySelector(".avbody");if(b)b.classList.add("fade")}AVFADE=false;
  const hd=$(".pfhead .av");if(hd)hd.outerHTML=avHTML({nick:myNick()||"Moi",av:avData(),avk:avK(),sk:{ch:chromaNow()}},"xl");
  avSeg();avWire()}
function avTabsWire(){const t=$("#avTabs");if(!t)return;
  t.querySelectorAll("button").forEach(b=>b.onclick=()=>{const k=b.dataset.k,o=avK()||{};if(avTab()===k&&k!=="p")return;AVTAB=k;CROP=null;AVFADE=true;
    if(k==="i")avSet({t:"i",c:o.c||0,f:o.t==="i"?o.f:0});else if(k==="e")avSet(o.t==="e"?o:{t:"e",c:o.c||2,e:0});
    else if(k==="a")avSet({t:"b",a:avCur()});else if(avData())avSet({t:"p"});else avRefresh()});
  requestAnimationFrame(avSeg)}
function avCur(){const k=avK();if(k&&k.t==="b")return k.a;const v=P.pf.avv&&P.pf.avv.length&&avKOk({t:"b",a:P.pf.ava});return v?v.a:AV_DEF.slice()}
function avDone(){return (Array.isArray(P.pf.avv)?P.pf.avv:[]).filter(c=>AV_CATS.some(x=>x[0]===c))}
function avSw(arr,on,attr){return `<div class="swr">${arr.map((c,i)=>`<button type="button" class="sw${on===i?" on":""}" style="--c:${c}" ${attr}="${i}" aria-label="Couleur ${i+1}"></button>`).join("")}</div>`}
function avEditor(){const t=avTab(),k=avK()||{};
  if(t==="p"){if(CROP)return `<div class="crop" id="cropBox"><canvas id="cropCv" width="560" height="560"></canvas></div>
      <label class="lab" for="cropZ" style="margin-top:12px">Zoom</label><input id="cropZ" type="range" min="1" max="4" step="0.01" value="${CROP.z}" class="rng">
      <p class="note" style="margin:6px 0 0">Fais glisser la photo avec ton doigt, et pince pour zoomer.</p>
      <div class="exrow"><button class="btn light" type="button" id="cropOk">Valider</button><button class="btn ghost" type="button" id="cropNo">Annuler</button></div>`;
    return `<div class="pfphoto" style="margin:0"><label class="btn light"><input type="file" id="pfImg" accept="image/*">${avData()?"Changer de photo":"Choisir une photo"}</label>${avData()?`<button class="btn ghost" type="button" id="pfNoImg">Retirer</button>`:""}</div><p class="note" style="margin:8px 0 0">Tu choisis ensuite toi-même le cadrage.</p>`}
  if(t==="i"){const ini=esc(initials(myNick()||"Moi"));return `<h3>Police</h3><div class="swr">${AV_FONTS.map((f,i)=>`<button type="button" class="avo${k.t==="i"&&k.f===i?" on":""}" data-f="${i}" aria-label="${f[0]}"><span class="av" style="--av:${AVBG[k.t==="i"?k.c:0]};font-family:'${f[0]}',var(--sans);font-weight:${f[1]};font-size:${(1.05*f[2]).toFixed(2)}rem">${ini}</span></button>`).join("")}</div><h3>Couleur du fond</h3>${avSw(AVBG,k.t==="i"?k.c:-1,"data-c")}<p class="note" style="margin:8px 0 0">Les lettres viennent de ton pseudo.</p>`}
  if(t==="e")return `<h3>Choisis un emoji</h3><div class="swr emr">${AV_EMO.map((e,i)=>`<button type="button" class="avo${k.t==="e"&&!k.x&&k.e===i?" on":""}" data-e="${i}">${e}</button>`).join("")}</div>
     <h3>Ou n’importe quel emoji de ton clavier</h3><div class="emrow"><input id="avEmo" class="inp" maxlength="16" autocomplete="off" enterkeyhint="done" placeholder="Touche 🌐 ou 😀 sur ton clavier" value="${k.x?esc(k.x):""}"><button class="btn light" type="button" id="avEmoOk">Utiliser</button></div>
     <h3>Couleur du fond</h3>${avSw(AVBG,k.t==="e"?k.c:-1,"data-c")}`;
  const a=avCur(),cat=AV_CATS.find(c=>c[0]===AVCAT)||AV_CATS[0],face=AV_FACE.has(cat[0]);
  const done=avDone(),ci=AV_CATS.indexOf(cat),nx=AV_CATS[ci+1];
  let h=`<div class="avprev">${avHTML({avk:{t:"b",a}},"xl")}<div class="avpg"><b>Étape ${ci+1} sur ${AV_CATS.length}</b><span class="bar"><i style="width:${Math.round(done.length/AV_CATS.length*100)}%"></i></span><small>${done.length?done.length+" rubrique"+(done.length>1?"s":"")+" personnalisée"+(done.length>1?"s":""):"Ton avatar est vierge : à toi de le créer."}</small>
      <span class="avpgb"><button class="linkbtn" type="button" id="avRnd">Au hasard</button>${done.length?`<button class="linkbtn" type="button" id="avRaz">Recommencer</button>`:""}</span></div></div>
    <div class="pick sm avcats">${AV_CATS.map(c=>`<button type="button" class="${c[0]===cat[0]?"on":""}" data-cat="${c[0]}">${done.includes(c[0])?'<span class="ck">✓</span>':""}${c[1]}</button>`).join("")}</div><div class="avbody">`;
  cat[2].forEach(([i,arr,lab])=>{h+=`<h3>${lab}</h3>`+avSw(arr,a[i],`data-i="${i}" data-v`)});
  if(cat[3]){const [i,key]=cat[3];h+=`<h3>${cat[2].length?"Style":cat[1]}</h3><div class="swr avgrid">${AV_LAB[key].map((l,v)=>{const b=a.slice();b[i]=v;if(i===8&&v&&b[7]===undefined)b[7]=b[5];
      return `<button type="button" class="avo${a[i]===v?" on":""}" data-i="${i}" data-v="${v}" aria-label="${esc(l)}"><span class="av">${persoSVG(b,face)}</span><small>${esc(l)}</small></button>`}).join("")}</div>`}
  h+=`<div class="exrow" style="margin-top:14px">${nx?`<button class="btn light" type="button" id="avNext">Suivant : ${nx[1]}</button>`:`<button class="btn light" type="button" id="avFin">Terminé</button>`}</div></div>`;
  return h}
function cropDraw(){if(!CROP)return;const cv=$("#cropCv");if(!cv)return;const g=cv.getContext("2d"),S=560,s=S/Math.min(CROP.w,CROP.h)*CROP.z,w=CROP.w*s,h=CROP.h*s;
  CROP.x=Math.min(0,Math.max(S-w,CROP.x));CROP.y=Math.min(0,Math.max(S-h,CROP.y));g.fillStyle="#000";g.fillRect(0,0,S,S);g.drawImage(CROP.src,CROP.x,CROP.y,w,h)}
function cropZoom(z,cx,cy){const S=560,old=S/Math.min(CROP.w,CROP.h)*CROP.z;z=Math.min(4,Math.max(1,z));const nw=S/Math.min(CROP.w,CROP.h)*z;
  cx=cx==null?S/2:cx;cy=cy==null?S/2:cy;CROP.x=cx-(cx-CROP.x)*nw/old;CROP.y=cy-(cy-CROP.y)*nw/old;CROP.z=z;const r=$("#cropZ");if(r)r.value=z;cropDraw()}
function cropWire(){const box=$("#cropBox"),pts=new Map();let pinch=0,pz=1;cropDraw();
  const loc=e=>{const r=box.getBoundingClientRect();return [(e.clientX-r.left)*560/r.width,(e.clientY-r.top)*560/r.height]};
  box.onpointerdown=e=>{box.setPointerCapture(e.pointerId);pts.set(e.pointerId,loc(e));if(pts.size===2){const [p,q]=[...pts.values()];pinch=Math.hypot(p[0]-q[0],p[1]-q[1]);pz=CROP.z}};
  box.onpointermove=e=>{if(!pts.has(e.pointerId))return;const n=loc(e),o=pts.get(e.pointerId);pts.set(e.pointerId,n);
    if(pts.size===1){CROP.x+=n[0]-o[0];CROP.y+=n[1]-o[1];cropDraw()}else if(pts.size===2&&pinch){const [p,q]=[...pts.values()];cropZoom(pz*Math.hypot(p[0]-q[0],p[1]-q[1])/pinch,(p[0]+q[0])/2,(p[1]+q[1])/2)}};
  box.onpointerup=box.onpointercancel=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0};
  box.onwheel=e=>{e.preventDefault();const [x,y]=loc(e);cropZoom(CROP.z*(e.deltaY<0?1.08:1/1.08),x,y)};
  $("#cropZ").oninput=e=>cropZoom(+e.target.value);
  $("#cropNo").onclick=()=>{if(CROP.src.close)CROP.src.close();CROP=null;avRefresh()};
  $("#cropOk").onclick=()=>{const cv=document.createElement("canvas");cv.width=cv.height=160;const g=cv.getContext("2d"),k=160/560,s=560/Math.min(CROP.w,CROP.h)*CROP.z;
    g.drawImage(CROP.src,CROP.x*k,CROP.y*k,CROP.w*s*k,CROP.h*s*k);let q=.85,d=cv.toDataURL("image/jpeg",q);while(d.length>30000&&q>.3){q-=.12;d=cv.toDataURL("image/jpeg",q)}
    if(CROP.src.close)CROP.src.close();CROP=null;P.pf.av=d;avSet({t:"p"})}}
function avWire(){const ed=$("#avEd");if(!ed)return;const t=avTab(),k=avK()||{};
  if(t==="p"){if(CROP)return cropWire();const fi=$("#pfImg");if(fi)fi.onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=$("#avStat");st.className="istat";st.textContent="Ouverture de la photo…";
      let pic;try{pic=await loadPic(f)}catch(err){st.className="istat err";st.textContent=picErr(f);return}
      if(!pic||!pic.w){st.className="istat err";st.textContent=picErr(f);return}
      st.textContent="";CROP={...pic,z:1,x:0,y:0};const S=560,s=S/Math.min(pic.w,pic.h);CROP.x=(S-pic.w*s)/2;CROP.y=(S-pic.h*s)/2;avRefresh();const b=$("#cropBox");if(b)b.scrollIntoView({block:"center",behavior:"auto"})};
    if($("#pfNoImg"))$("#pfNoImg").onclick=()=>{delete P.pf.av;AVTAB="i";avSet({t:"i",c:0,f:0})};return}
  if(t==="i"){ed.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>avSet({t:"i",c:k.t==="i"?k.c:0,f:+b.dataset.f}));ed.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>avSet({t:"i",c:+b.dataset.c,f:k.t==="i"?k.f:0},1));return}
  if(t==="e"){const c=k.t==="e"?k.c:2;ed.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>avSet({t:"e",c,e:+b.dataset.e},1));
    ed.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>avSet(k.x?{t:"e",c:+b.dataset.c,x:k.x}:{t:"e",c:+b.dataset.c,e:k.t==="e"?k.e:0},1));
    const use=()=>{const x=emoOk($("#avEmo").value),st=$("#avStat");if(!x){st.className="istat err";st.textContent="Mets un seul emoji, sans lettres.";return}st.textContent="";avSet({t:"e",c,x},1)};
    $("#avEmoOk").onclick=use;$("#avEmo").onkeydown=e=>{if(e.key==="Enter")use()};return}
  const a=avCur(),mark=c=>{const d=avDone();if(!d.includes(c)){d.push(c);P.pf.avv=d}};
  ed.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{if(AVCAT===b.dataset.cat)return;AVCAT=b.dataset.cat;AVFADE=true;avRefresh()});
  ed.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const v=a.slice(),i=+b.dataset.i;v[i]=+b.dataset.v;if(i===5&&a[7]===a[5])v[7]=v[5];mark(AVCAT);avSet({t:"b",a:v})});
  const go2=c=>{AVCAT=c;AVFADE=true;avRefresh();const p=$("#avEd .avprev");if(p&&p.getBoundingClientRect().top<0)p.scrollIntoView({block:"start",behavior:reduce?"auto":"smooth"})};
  if($("#avNext"))$("#avNext").onclick=()=>{mark(AVCAT);const i=AV_CATS.findIndex(c=>c[0]===AVCAT);saveP();go2(AV_CATS[i+1][0])};
  if($("#avFin"))$("#avFin").onclick=()=>{mark(AVCAT);saveP();const st=$("#avStat");avRefresh();if(st){st.className="istat";st.textContent="Avatar enregistré."}};
  if($("#avRnd"))$("#avRnd").onclick=()=>{P.pf.avv=AV_CATS.map(c=>c[0]);avSet({t:"b",a:avRand()})};
  if($("#avRaz"))$("#avRaz").onclick=()=>{P.pf.avv=[];AVCAT="peau";AVFADE=true;avSet({t:"b",a:AV_DEF.slice()})}}

/* ================= FICHES ================= */
const FI={prete:{},mine:{},pub:{},ext:{},loaded:false,mat:null,open:null,mode:"list",draft:null,prefill:null,ctl:null};
function normFiche(f){const L=(a,n,m)=>(Array.isArray(a)?a:[]).map(x=>clip(x,m)).filter(Boolean).slice(0,n),P2=(a,n)=>(Array.isArray(a)?a:[]).filter(x=>x&&x.t&&x.d).slice(0,n).map(x=>({t:clip(x.t,90),d:clip(x.d,320)}));
  return {titre:clip(f.titre,90)||"Fiche",essentiel:L(f.essentiel,8,320),defs:P2(f.defs,12),cles:P2(f.cles,14),pieges:L(f.pieges,6,260)}}
function fiExt(){FI.ext={};Object.entries(FI.pub).forEach(([a,l])=>l.forEach(f=>{if(f&&f.mat&&(a===UID||idOk(f.mat,40))&&visibleImp(f,a))FI.ext["u:"+a+":"+f.id]=Object.assign({},f,a===UID?{}:{titre:clip(f.titre,90),chapNom:clip(f.chapNom,80),matNom:clip(f.matNom,40)},{_a:a,_own:a===UID})}));
  Object.values(FI.mine).forEach(f=>{FI.ext["m:"+f.id]=Object.assign({},f,{vis:"moi",_own:true})});
  Object.values(GL.get("fiche")).forEach(f=>{FI.ext["g:"+f.id]=Object.assign({},f,{vis:"moi",_own:true,_local:true})});
  if(C.ready){mergeAll();reindex()}}
function allFiches(){const out=[];Object.values(FI.prete).forEach(f=>out.push(Object.assign({},f,{_k:"p:"+f.id,_kind:"p"})));
  Object.entries(FI.ext).forEach(([k,f])=>out.push(Object.assign({},f,{_k:k,_kind:f._own?"m":"l"})));return out}
const fGroup=f=>f.chap&&!String(f.chap).startsWith("@")?"c:"+f.chap:"t:"+f.mat+":"+slug(f.chapNom||f.titre);
function fGroupTitle(g,list){const k=g.slice(2);if(g.startsWith("c:")&&C.chaps[k])return C.chaps[k].titre;const p=list.find(f=>f._kind==="p");return (p||list[0]).chapNom||(p||list[0]).titre}
function fTag(f){return f._kind==="p"?`<span class="ftag p">Programme</span>`:f._kind==="m"?`<span class="ftag m">Ma fiche</span>`:`<span class="ftag l"></span>`}
function renderFiches(){const box=$("#fi");
  if(FI.mode==="new"){fiNew(box);return}if(FI.mode==="batch"){fiBatch(box);return}if(FI.mode==="preview"){fiPreview(box);return}
  if(!C.ready){box.innerHTML=`<p class="loading">${dbState==="off"?"Ouvre la page depuis claude.ai, connecté.":"Chargement des fiches…"}</p>`;return}
  if(FI.mode==="read"&&FI.open){fiRead(box);return}FI.mode="list";
  const all=allFiches();const mats=(C.mats||[]).filter(m=>true);
  if(FI.mat!=="*"&&(!FI.mat||!C.M[FI.mat]))FI.mat=sel.mat&&C.M[sel.mat]&&sel.mat[0]!=="@"?sel.mat:"*";
  const list=all.filter(f=>(FI.mat==="*"?(C.mats||[]).some(m=>m.id===f.mat):f.mat===FI.mat));
  const groups={};list.forEach(f=>{const g=fGroup(f);(groups[g]=groups[g]||[]).push(f)});
  const order=Object.entries(groups).map(([g,l])=>({g,l,mat:l[0].mat,o:(C.M[l[0].mat]&&C.M[l[0].mat].ordre||50)*1000+Math.min(...l.map(f=>f.ordre||99))})).sort((a,b)=>a.o-b.o);
  let h=`<div class="ihead"><h1>Fiches</h1><button class="btn focus" type="button" id="fiNew">Créer ma fiche</button></div>
   <p class="lgsub">Une fiche par chapitre, prête à réviser. Crée la tienne à partir de ton cours : elle se range à côté de celle du programme.</p>
   <div class="pick" id="fiMat"></div>`;
  if(!FI.loaded&&!list.length)h+=`<p class="loading">Chargement des fiches…</p>`;
  else if(!order.length)h+=`<div class="empty2"><h2>Pas encore de fiche ici</h2><p>Crée la première à partir de ton cours : une photo, une capture, un PDF ou un texte suffit.</p></div>`;
  let lastMat=null;
  order.forEach(({g,l,mat})=>{const t=fGroupTitle(g,l);l.sort((a,b)=>"pml".indexOf(a._kind)-"pml".indexOf(b._kind));
    if(FI.mat==="*"&&mat!==lastMat){lastMat=mat;const n=order.filter(o=>o.mat===mat).length;h+=`<div class="sec fsec" style="--suit:${esc(suitOf(mat))}"><h2>${esc(matName(mat))}</h2><span>${n} chapitre${n>1?"s":""}</span></div>`}
    h+=`<div class="fl" style="--suit:${esc(suitOf(mat))}"><button type="button" class="flmain" data-k="${esc(l[0]._k)}"><b>${esc(t)}</b><span class="flv">${l.map(f=>f._kind==="l"?`<span class="ftag l" data-a="${esc(f._k)}"></span>`:fTag(f)).join("")}</span></button>`+
      (l.some(f=>f._kind==="m")?"":`<button type="button" class="fladd" data-new="${esc(g)}">+ Ma<br>version</button>`)+`</div>`});
  box.innerHTML=h;
  pickRow($("#fiMat"),[{k:"*",l:"Toutes"},...(C.mats||[]).map(m=>({k:m.id,l:m.court||m.nom,suit:m.suit,dot:1}))],FI.mat,k=>{FI.mat=k;renderFiches()});
  box.querySelectorAll(".ftag.l").forEach(el=>{const f=list.find(x=>x._k===el.dataset.a);el.textContent=(f&&f.auteur)||"Ligue"});
  box.querySelectorAll(".flmain").forEach(b=>b.onclick=()=>{FI.open=b.dataset.k;FI.mode="read";renderFiches();window.scrollTo(0,0)});
  box.querySelectorAll(".fladd").forEach(b=>b.onclick=()=>{const l=groups[b.dataset.new],p=l[0];FI.prefill={mat:p.mat,chap:p.chap||"",chapNom:fGroupTitle(b.dataset.new,l)};FI.mode="new";renderFiches();window.scrollTo(0,0)});
  $("#fiNew").onclick=()=>{FI.prefill={mat:FI.mat!=="*"?FI.mat:null};FI.mode="new";renderFiches();window.scrollTo(0,0)};
}
function ficheBody(f){const n=normFiche(f);
  return `${n.essentiel.length?`<h2>L’essentiel</h2><ul>${n.essentiel.map(x=>`<li>${tex(x)}</li>`).join("")}</ul>`:""}
   ${n.defs.length?`<h2>Définitions</h2><dl>${n.defs.map(x=>`<div><dt>${tex(x.t)}</dt><dd>${tex(x.d)}</dd></div>`).join("")}</dl>`:""}
   ${n.cles.length?`<h2>À savoir par cœur</h2><dl>${n.cles.map(x=>`<div><dt>${tex(x.t)}</dt><dd>${tex(x.d)}</dd></div>`).join("")}</dl>`:""}
   ${n.pieges.length?`<h2>Pièges à éviter</h2><ul class="warn">${n.pieges.map(x=>`<li>${tex(x)}</li>`).join("")}</ul>`:""}`}
function fiRead(box){const all=allFiches(),f=all.find(x=>x._k===FI.open);if(!f){FI.mode="list";renderFiches();return}
  const g=fGroup(f),sibs=all.filter(x=>fGroup(x)===g).sort((a,b)=>"pml".indexOf(a._kind)-"pml".indexOf(b._kind));
  const ch=f.chap&&C.chaps[f.chap],nCards=ch?cardsOfChap(ch).length:0;
  const by=f._kind==="p"?`<span class="srcb programme">Programme officiel</span>`:f._kind==="m"?`<span class="srcb by">Ta fiche · ${f._local?"sur ce téléphone":esc(visLabel(f.vis))}</span>`:`<span class="srcb by"></span>`;
  box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="fiBack">Toutes les fiches</button></div>
   ${sibs.length>1?`<div class="pick sm fswitch" id="fiSw"></div>`:""}
   <article class="fiche" style="--suit:${esc(suitOf(f.mat))}"><span class="fmat">${esc(matName(f.mat))}${ch?" · "+esc(ch.court||ch.titre):f.chapNom&&f.chapNom!==f.titre?" · "+esc(f.chapNom):""}</span><h1>${esc(f.titre)}</h1>
    <div class="chapinfo">${by}</div>${ficheBody(f)}</article>
   <div class="exrow">${nCards?`<button class="btn light" type="button" id="fiPlay">Réviser en cartes (${nCards})</button>`:`<button class="btn light" type="button" id="fiCards">Faire des cartes</button>`}<button class="btn ghost" type="button" id="fiPdf">PDF</button>${f._kind==="p"&&!sibs.some(x=>x._kind==="m")?`<button class="btn ghost" type="button" id="fiMine">Ma version</button>`:""}${f._kind==="m"?`<button class="btn ghost" type="button" id="fiDel">Supprimer</button>`:""}<span class="istat" id="fiStat" role="status"></span></div>
   ${f._kind==="p"?`<p class="note" style="margin-top:14px">Cette fiche suit le programme national de Première. Ton prof peut insister sur d’autres points : compare-la avec ta propre fiche.</p>`:""}`;
  if(f._kind==="l")box.querySelector(".srcb.by").textContent="par "+(f.auteur||"un élève")+(f.vis&&f.vis.startsWith("ligue:")?" · ligue "+ligName(f.vis.slice(6)):"");
  if($("#fiSw")){const sw=$("#fiSw");sw.innerHTML=sibs.map(x=>`<button type="button" class="${x._k===f._k?"on":""}" data-k="${esc(x._k)}"></button>`).join("");
    sw.querySelectorAll("button").forEach((b,i)=>{const x=sibs[i];b.textContent=x._kind==="p"?"Programme":x._kind==="m"?"Ma fiche":(x.auteur||"Ligue");b.onclick=()=>{FI.open=x._k;renderFiches()}})}
  $("#fiBack").onclick=()=>{FI.mode="list";FI.open=null;renderFiches()};
  if($("#fiPlay"))$("#fiPlay").onclick=()=>{sel.mat=ch.mat;sel.chap=ch.id;sel.paq="*";go("jeu");startPile()};
  if($("#fiCards"))$("#fiCards").onclick=()=>{const n=normFiche(f);
    IMPV.prefill={mat:f.mat,matNom:matName(f.mat),titre:f.chapNom||f.titre,texte:[n.titre,...n.essentiel,...n.defs.map(x=>x.t+" : "+x.d),...n.cles.map(x=>x.t+" : "+x.d),...n.pieges.map(x=>"Piège : "+x)].join("\n")};IMPV.draft=null;openImport("cours")};
  if($("#fiMine"))$("#fiMine").onclick=()=>{FI.prefill={mat:f.mat,chap:f.chap||"",chapNom:f.chapNom||f.titre};FI.mode="new";renderFiches();window.scrollTo(0,0)};
  $("#fiPdf").onclick=()=>fichePdf(f);
  if($("#fiDel"))$("#fiDel").onclick=async()=>{const b=$("#fiDel");if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Confirmer";return}
    try{if(f._local){const m=GL.get("fiche");delete m[f.id];GL.set("fiche",m)}else if(f._k.startsWith("m:"))await DB.doc("data/users/"+UID+"/fiche/"+f.id).delete();else await DB.doc("biblio/"+UID+"/fiche/"+f.id).delete();
      if(f._k.startsWith("m:"))delete FI.mine[f.id];else if(!f._local)FI.pub[UID]=(FI.pub[UID]||[]).filter(x=>x.id!==f.id);fiExt();FI.mode="list";FI.open=null;renderFiches()}catch(e){b.textContent="Échec"}};
}
function fiNew(box){const pf=FI.prefill||{},can=!!IMP.sample;FI.prefill=pf;
  const mats=C.matsAll||[],m0=pf.mat&&C.M[pf.mat]?pf.mat:(C.mats[0]&&C.mats[0].id);
  box.innerHTML=`<div class="ihead"><h1>Ma fiche</h1><button class="linkbtn" type="button" id="fnBack">Annuler</button></div>
   <p class="lgsub">Choisis le chapitre, ajoute ton cours : Claude fait une fiche d’une page avec l’essentiel, les définitions et les pièges.</p>
   ${GUEST?`<p class="guestnote"><b>Mode invité.</b> Ta fiche reste sur ce téléphone.</p>`:""}
   <div class="iform"><label class="lab" for="fnMat">Matière</label>
   <select id="fnMat" class="inp">${mats.map(m=>`<option value="${esc(m.id)}"${m.id===m0?" selected":""}>${esc(m.nom)}</option>`).join("")}<option value="@new">Autre matière…</option></select>
   <input id="fnMatNew" class="inp" maxlength="40" placeholder="Ex. Philosophie" hidden>
   <label class="lab" for="fnChap">Chapitre</label><select id="fnChap" class="inp"></select>
   <input id="fnChapNew" class="inp" maxlength="80" placeholder="Titre du chapitre" hidden>
   ${mediaField("fnMed","Ton cours : captures, photos, vidéo d’écran ou PDF")}
   <p class="note">Plusieurs cours en photos ? <button type="button" class="linkbtn" id="fnBatch">Une fiche par photo</button></p>
   <label class="lab" for="fnTxt">Ou colle le texte <span>(facultatif)</span></label>
   <textarea id="fnTxt" class="inp" placeholder="Copie le contenu de la séance dans Pronote (Contenu et ressources), ou ton résumé."></textarea>
   ${GUEST?"":visField("fnv","moi")}
   <div class="exrow"><button class="btn light" type="button" id="fnGo"${can?"":" disabled"}>Créer la fiche</button><button class="btn ghost" type="button" id="fnStop" hidden>Arrêter</button><span class="istat" id="fnStat" role="status"></span></div>
   ${can?"":`<p class="istat err">Ici, la page ne peut pas demander à Claude. Ouvre-la depuis claude.ai.</p>`}
   <p class="note" style="margin-top:14px">Claude ne garde que ce qui est dans ton cours. Tu relis la fiche avant de l’enregistrer. Chaque fiche utilise un peu de ton quota Claude.</p></div>`;
  const fillCh=()=>{const mv=$("#fnMat").value,chs=mv==="@new"?[]:chapsOf(mv);
    $("#fnChap").innerHTML=chs.map(c=>`<option value="${esc(c.id)}">${esc(c.titre)}</option>`).join("")+`<option value="@new">Autre chapitre…</option>`;
    const byT=pf.chapNom&&chs.find(c=>c.titre===pf.chapNom);
    if(pf.chap&&chs.find(c=>c.id===pf.chap))$("#fnChap").value=pf.chap;else if(byT)$("#fnChap").value=byT.id;else if(pf.chapNom){$("#fnChap").value="@new";$("#fnChapNew").value=pf.chapNom}else if(!chs.length)$("#fnChap").value="@new";
    $("#fnChapNew").hidden=$("#fnChap").value!=="@new";$("#fnMatNew").hidden=mv!=="@new"};
  fillCh();$("#fnMat").onchange=()=>{pf.chap="";pf.chapNom="";fillCh()};$("#fnChap").onchange=()=>{$("#fnChapNew").hidden=$("#fnChap").value!=="@new";if(!$("#fnChapNew").hidden)$("#fnChapNew").focus()};
  bindMedia("fnMed");$("#fnBatch").onclick=()=>{FI.mode="batch";renderFiches()};
  $("#fnBack").onclick=()=>{FI.mode=FI.open?"read":"list";FI.prefill=null;renderFiches()};
  $("#fnGo").onclick=async()=>{const st=$("#fnStat");st.className="istat";
    const mv=$("#fnMat").value,nn=$("#fnMatNew").value.trim();if(mv==="@new"&&!nn){st.className="istat err";st.textContent="Écris le nom de la matière.";return}
    const cv=$("#fnChap").value,cn=$("#fnChapNew").value.trim();if(cv==="@new"&&!cn){st.className="istat err";st.textContent="Écris le titre du chapitre.";return}
    let txt=$("#fnTxt").value.trim().slice(0,60000),files=[];
    if(!txt&&!mediaCount("fnMed")){st.className="istat err";st.textContent="Ajoute ton cours : capture, photo, vidéo, PDF ou texte.";return}
    const M=mv==="@new"?resolveMat("",nn):{id:mv,nom:matName(mv)},chap=cv==="@new"?"":cv,chapNom=cv==="@new"?clip(cn,80):(C.chaps[cv]?C.chaps[cv].titre:""),vis=GUEST?"moi":readVis("fnv");
    $("#fnGo").disabled=true;
    if(mediaCount("fnMed")){try{const md=await readMedia("fnMed",t=>{st.textContent=t});files=md.images;if(md.text)txt=(txt?txt+"\n\n":"")+md.text.slice(0,60000-txt.length)}catch(e){st.className="istat err";st.textContent=e&&e.message?e.message:"Fichier illisible.";$("#fnGo").disabled=false;return}}
    const prompt=`Tu fais une fiche de révision d’une page pour un élève de Première générale (lycée en France).
Matière : ${M.nom}. Chapitre : ${chapNom||"à déduire de la source"}.
Source : ${txt?"le texte ci-dessous (copié de Pronote, d’un PDF ou d’un cours)":""}${txt&&files.length?", et ":""}${files.length?"les images jointes (photos de cahier, captures d’écran, ou images tirées d’une vidéo d’écran : ignore doublons et menus)":""}.

Règles :
- N’utilise que ce qui est dans la source. N’invente aucun fait. Si la source est courte, la fiche est courte.
- Écris en français, sauf pour une langue étrangère : garde alors les mots et exemples dans cette langue.
- Phrases courtes et claires, comme sur une fiche faite à la main.
- essentiel : 3 à 6 idées principales, une phrase chacune.
- defs : les notions à définir, 25 mots au plus par définition.
- cles : ce qui s’apprend par cœur (dates, formules, auteurs, œuvres, chiffres), avec ce qu’il faut en retenir.
- pieges : 2 à 4 erreurs fréquentes ou confusions à éviter.
- Formules mathématiques entre $ et $ en LaTeX.

Réponds uniquement avec ce JSON :
{"titre":"titre de la fiche","essentiel":["…"],"defs":[{"t":"notion","d":"définition"}],"cles":[{"t":"date ou formule","d":"à retenir"}],"pieges":["…"]}
${txt?"\n<source>\n"+txt+"\n</source>":""}`;
    FI.ctl=new AbortController();$("#fnStop").hidden=false;$("#fnStop").onclick=()=>FI.ctl&&FI.ctl.abort();st.className="istat";st.textContent="Claude écrit ta fiche… Ça peut prendre une minute.";
    try{const d=await IMP.sample.json(prompt,{signal:FI.ctl.signal,images:files.length?files:undefined});const n=normFiche(d||{});
      if(!n.essentiel.length&&!n.defs.length&&!n.cles.length){st.className="istat err";st.textContent="Claude n’a rien trouvé à mettre en fiche. Ajoute un cours plus complet.";return}
      FI.draft=Object.assign(n,{mat:M.id,matNom:M.nom,chap,chapNom:chapNom||n.titre,vis});MEDIA.fnMed=[];FI.mode="preview";renderFiches();window.scrollTo(0,0);
    }catch(e){st.className="istat"+(e&&e.code==="cancelled"?"":" err");st.textContent=sampleErr(e)}
    finally{FI.ctl=null;if($("#fnGo"))$("#fnGo").disabled=false;if($("#fnStop"))$("#fnStop").hidden=true}};
}
function fiPreview(box){const D=FI.draft;if(!D){FI.mode="list";renderFiches();return}
  box.innerHTML=`<div class="ihead"><h1>Relis ta fiche</h1></div><p class="lgsub">${esc(D.matNom)} · visible par ${esc(GUEST?"toi seul, sur ce téléphone":visLabel(D.vis))}</p>
   <label class="lab" for="fpTitre">Titre</label><input id="fpTitre" class="inp" maxlength="90" value="${esc(D.titre)}">
   <div style="height:14px"></div><article class="fiche" style="--suit:${esc(suitOf(D.mat))}"><span class="fmat">${esc(D.matNom)}</span>${ficheBody(D)}</article>
   <div class="exrow"><button class="btn light" type="button" id="fpSave">Enregistrer</button><button class="btn ghost" type="button" id="fpRedo">Recommencer</button><span class="istat" id="fpStat" role="status"></span></div>`;
  $("#fpRedo").onclick=()=>{FI.draft=null;FI.mode="new";renderFiches()};
  $("#fpSave").onclick=async()=>{const st=$("#fpStat");D.titre=clip($("#fpTitre").value,90)||D.titre;
    const id=hash(UID||"invite").slice(0,4)+Date.now().toString(36);
    const doc={id,mat:D.mat,matNom:D.matNom,chap:D.chap||"",chapNom:D.chapNom||"",titre:D.titre,essentiel:D.essentiel,defs:D.defs,cles:D.cles,pieges:D.pieges,vis:D.vis,auteur:myNick(),src:"cours",cree:new Date().toISOString(),ordre:Date.now()%1e6};
    $("#fpSave").disabled=true;st.className="istat";st.textContent="Enregistrement…";
    try{const w=await putDoc("fiche",D.vis==="moi"||GUEST,id,doc);
      if(w==="db"){if(D.vis==="moi")FI.mine[id]=doc;else FI.pub[UID]=(FI.pub[UID]||[]).filter(x=>x.id!==id).concat([doc])}
      fiExt();if(Array.isArray(P.mats)&&P.mats.length&&!P.mats.includes(D.mat)){P.mats.push(D.mat);saveP()}
      FI.draft=null;FI.prefill=null;FI.open=(w==="local"?"g:":D.vis==="moi"?"m:":"u:"+UID+":")+id;FI.mode="read";P.fc=(P.fc||0)+1;gainXP(5);saveP();checkRewards();
      toast(`<span class="tm">+</span><div><b>Fiche enregistrée</b><span>${w==="local"?"sur ce téléphone":esc(doc.titre)}</span></div>`);renderFiches();window.scrollTo(0,0)}
    catch(e){$("#fpSave").disabled=false;st.className="istat err";st.textContent=writeErr(e)}};
}
/* PDF : la fiche est dessinée sur des pages A4 (toutes les lettres passent), puis assemblée par jsPDF */
let JSPDF=null;
function loadJsPdf(){if(JSPDF)return JSPDF;JSPDF=new Promise((ok,ko)=>{if(window.jspdf){ok(window.jspdf.jsPDF);return}const sc=document.createElement("script");sriSrc(sc,"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");sc.onload=()=>window.jspdf?ok(window.jspdf.jsPDF):ko(new Error("x"));sc.onerror=()=>ko(new Error("x"));document.head.appendChild(sc)});JSPDF.catch(()=>{JSPDF=null});return JSPDF}
let DL=null;
async function dlSave(filename,data,stEl){try{DL=DL||await window.claude?.use?.("downloads")}catch(e){DL=null}
  if(!DL){if(stEl){stEl.className="istat err";stEl.textContent="Le téléchargement n’est pas possible ici."}return false}
  try{await DL.save({filename,data});if(stEl){stEl.className="istat";stEl.textContent="Fichier enregistré."}return true}
  catch(e){if(stEl){stEl.className="istat"+(e&&e.code==="declined"?"":" err");stEl.textContent=e&&e.code==="declined"?"Téléchargement annulé.":e&&e.code==="rate_limited"?"Une fenêtre de téléchargement est déjà ouverte.":"Le téléchargement n’a pas marché."}return false}}
function fichePages(f){const n=normFiche(f),W=1240,H=1754,M=110,pages=[];let cv,g,y;
  const font=(w,sz,fam)=>`${w} ${sz}px ${fam||"Figtree, system-ui, sans-serif"}`;
  const newPage=()=>{cv=document.createElement("canvas");cv.width=W;cv.height=H;g=cv.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle=suitOf(f.mat).startsWith("#")?suitOf(f.mat):"#C1272D";g.fillRect(0,0,W,16);y=M;pages.push(cv)};
  const wrap=(t,x,maxW,sz,w,col,lh)=>{g.font=font(w,sz);g.fillStyle=col;const words=String(t).split(/\s+/);let line="";const lines=[];
    words.forEach(wd=>{const test=line?line+" "+wd:wd;if(g.measureText(test).width>maxW&&line){lines.push(line);line=wd}else line=test});if(line)lines.push(line);
    lines.forEach(l=>{if(y+lh>H-M){newPage();g.font=font(w,sz);g.fillStyle=col}g.fillText(l,x,y);y+=lh});};
  const P0=t=>plainTex(String(t).replace(/\$([^$]+)\$/g,"$1"));
  newPage();g.textBaseline="top";
  wrap(matName(f.mat)+(f.chapNom&&f.chapNom!==f.titre?" · "+P0(f.chapNom):""),M,W-2*M,26,"700","#5E6166",38);y+=6;
  wrap(P0(n.titre),M,W-2*M,54,"800","#1A1C1E",64);y+=10;
  const head=t=>{y+=26;if(y+70>H-M)newPage();g.textBaseline="top";wrap(t.toUpperCase(),M,W-2*M,24,"800","#5E6166",34);g.fillStyle="#E3E3DD";g.fillRect(M,y+2,W-2*M,2);y+=16};
  if(n.essentiel.length){head("L’essentiel");n.essentiel.forEach(x=>{const y0=y;g.fillStyle="#1A1C1E";g.beginPath();g.arc(M+8,y0+18,6,0,7);g.fill();wrap(P0(x),M+30,W-2*M-30,30,"500","#1A1C1E",42);y+=8})}
  const pairs=(t,a)=>{if(!a.length)return;head(t);a.forEach(x=>{wrap(P0(x.t),M,W-2*M,30,"800","#1A1C1E",40);wrap(P0(x.d),M+24,W-2*M-24,28,"500","#33363A",40);y+=10})};
  pairs("Définitions",n.defs);pairs("À savoir par cœur",n.cles);
  if(n.pieges.length){head("Pièges à éviter");n.pieges.forEach(x=>{g.font=font("900",30);g.fillStyle="#C1272D";if(y+42>H-M)newPage();g.fillText("!",M+4,y);wrap(P0(x),M+30,W-2*M-30,30,"500","#1A1C1E",42);y+=8})}
  pages.forEach((p,i)=>{const c=p.getContext("2d");c.textBaseline="alphabetic";c.font=font("600",22);c.fillStyle="#9A9DA2";c.fillText("Première 2026 · "+(f._kind==="p"?"programme officiel":"fiche de "+(f.auteur||"élève"))+(pages.length>1?" · "+(i+1)+"/"+pages.length:""),M,H-60)});
  return pages}
async function fichePdf(f){const st=$("#fiStat");if(st){st.className="istat";st.textContent="Préparation du PDF…"}
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;const pages=fichePages(f);let J;try{J=await loadJsPdf()}catch(e){J=null}
    const name="Fiche "+String(f.titre).replace(/[\\/:*?"<>|]/g,"").slice(0,60);
    if(J){const pdf=new J({unit:"pt",format:"a4"});pages.forEach((p,i)=>{if(i)pdf.addPage();pdf.addImage(p.toDataURL("image/jpeg",.9),"JPEG",0,0,595.28,841.89)});await dlSave(name+".pdf",pdf.output("blob"),st)}
    else{const b=await new Promise(ok=>pages[0].toBlob(ok,"image/png"));await dlSave(name+".png",b,st)}}
  catch(e){if(st){st.className="istat err";st.textContent="Le PDF n’a pas pu être préparé."}}}

$("#tProf").onclick=()=>go("profil");
document.addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".btn,.pick button,nav.dock button,.opt,.fcard,.flmain");if(!b||b.disabled)return;const fx=(P.sk&&P.sk.bx)||"";if(!fx)return;
  if(fx==="vib"){buzz(12);return}if(reduce)return;
  if(fx==="rebond"&&b.animate)b.animate([{transform:"scale(1)"},{transform:"scale(.9)",offset:.35},{transform:"scale(1.05)",offset:.7},{transform:"scale(1)"}],{duration:300,easing:"ease-out"});
  if(fx==="etincelles"){const col=getComputedStyle(document.body).getPropertyValue("--h2").trim()||"#E7C66B";for(let i=0;i<10;i++){const sp=document.createElement("i");sp.className="spark";sp.style.left=(e.clientX-3)+"px";sp.style.top=(e.clientY-3)+"px";sp.style.background=i%3?col:"#fff";document.body.appendChild(sp);
    const a=Math.PI*2*i/10+Math.random()*.4,d=22+Math.random()*26;sp.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(.3)`,opacity:0}],{duration:460,easing:"cubic-bezier(0.23,1,0.32,1)"}).onfinish=()=>sp.remove()}}
},{passive:true});



/* ================= BOUTIQUE : fonds, boutons, thèmes chromatiques ================= */
const MOIS_L=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const MON=TODAY_ISO.slice(0,7),PMON=(()=>{const d=new Date(NOW.getFullYear(),NOW.getMonth()-1,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)})();
function monthSum(m){let s=0;Object.entries(P.x).forEach(([k,v])=>{if(k.startsWith(m))s+=+v||0});return s}
const WALLS=[{id:"",nom:"Tapis",xp:0},{id:"quadrille",nom:"Quadrillé",xp:100},{id:"tableau",nom:"Tableau noir",xp:250},{id:"marbre",nom:"Marbre",xp:500},{id:"etoiles",nom:"Nuit étoilée",xp:900},{id:"neon",nom:"Néon",xp:1400},{id:"equipe",nom:"Équipe",rw:"equipe"},{id:"saison",nom:"Saison",rw:"saison"}];
const BF=[{id:"",nom:"Pilule",xp:0,r:"999px"},{id:"arrondi",nom:"Arrondi",xp:60,r:"14px"},{id:"carre",nom:"Carré",xp:200,r:"6px"}];
const BC=[{id:"",nom:"Blanc",xp:0,c:"#FAFAF7"},{id:"or",nom:"Or",xp:120,c:"#F3D27A"},{id:"menthe",nom:"Menthe",xp:300,c:"#B9F0CF"},{id:"ciel",nom:"Ciel",xp:450,c:"#BFE6F7"},{id:"rose",nom:"Rose",xp:650,c:"#F7C6D6"},{id:"corail",nom:"Corail",xp:850,c:"#FFC7AE"},{id:"violet",nom:"Violet",xp:1000,c:"#D6CBFA"},{id:"saison",nom:"Saison",rw:"saison",c:"#F3D27A"}];
const BX=[{id:"",nom:"Aucun",xp:0},{id:"rebond",nom:"Rebond",xp:80},{id:"vib",nom:"Vibration",xp:180},{id:"etincelles",nom:"Étincelles",xp:600}];
const CHR=["bronze","argent","or","diamant"];
[["dos",DOS],["w",WALLS],["bf",BF],["bc",BC],["bx",BX]].forEach(([k,L])=>L.forEach(it=>{it._k=k+":"+it.id}));
/* Un objet est à toi s'il est gratuit, gagné (récompense de ligue) ou acheté avec tes pièces. */
const owned=it=>it.rw?!!(P.rw&&P.rw[it.rw]):(!it.xp||!!(P.own&&P.own[it._k]));
/* Passage aux pièces : ce que l'XP avait déjà débloqué reste à toi, sans rien payer. */
function grandfather(t){P.own=P.own||{};[DOS,WALLS,BF,BC,BX].forEach(L=>L.forEach(it=>{if(!it.rw&&it.xp&&t>=it.xp)P.own[it._k]=1}))}
if(!P.ownV){P.ownXP=totalXP();grandfather(P.ownXP);P.ownV=1;try{LS.set("prog",P)}catch(e){}}
function buyItem(it){const k=it._k,price=+it.xp||0;if(owned(it)||it.rw)return true;if(coins()<price)return false;P.own[k]=1;P.buy[k]=price;saveP();return true}
function chromaNow(){const c=P.sk&&P.sk.ch;const i=CHR.indexOf(c);if(i<0)return "";return CHR[Math.min(i,LG.nick&&!LG.ro?(LG.div||0):0)]}
function applySkin(){const k=P.sk||{},b=document.body;
  b.dataset.wall=WALLS.find(w=>w.id===k.w&&owned(w))?k.w:"";
  const f=BF.find(x=>x.id===k.bf&&owned(x))||BF[0];b.style.setProperty("--btn-r",f.r);
  const c=BC.find(x=>x.id===k.bc&&owned(x));b.dataset.bc=c?(c.id==="saison"?"or":c.id):"";
  b.dataset.chroma=chromaNow()}
function shopCheck(silent){/* nouveaux objets débloqués par l'XP : une seule annonce */
  const all=[...WALLS.map(x=>["w",x]),...BF.map(x=>["f",x]),...BC.map(x=>["c",x]),...BX.map(x=>["x",x])].filter(([t,x])=>x.id&&owned(x)).map(([t,x])=>t+":"+x.id);
  const seen=Array.isArray(P.shn)?P.shn:null;P.shn=all;if(!seen)return;const nw=all.filter(k=>!seen.includes(k));
  if(nw.length&&!silent){toast(`<span class="tm">${nw.length}</span><div><b>Nouveau dans la boutique</b><span>${nw.length>1?nw.length+" objets débloqués":"Un objet débloqué"} · Ligue</span></div>`);markLigue(true)}}
function shopHTML(tot,head){const k=P.sk||{},tab=LG.shop||"dos",lock=(it)=>!owned(it),cost=it=>it.rw==="equipe"?"Objectif de ligue":it.rw==="saison"?"Podium de saison":fmtN(it.xp)+" pièces";
  const item=(kind,it,inner)=>{const on=(kind==="dos"?(P.dos||"classique"):(k[kind]||""))===it.id,lk=lock(it);return `<button type="button" class="${on?"on":""}${lk?" lock":""}" data-kind="${kind}" data-id="${esc(it.id)}" ${lk&&it.rw?'aria-disabled="true"':""} aria-label="${esc(it.nom)}${lk?(it.rw?", "+esc(cost(it)):", à acheter pour "+esc(cost(it))):""}">${inner}${on?"Choisi":lk?esc(cost(it)):esc(it.nom)}</button>`};
  let h=(head===false?"":`<div class="sec"><h2>Boutique</h2><span>${fmtN(coins())} pièces</span></div>`)+`<div class="pick sm" id="shopTabs">${[["dos","Dos de cartes"],["w","Fonds"],["b","Boutons"],["ch","Thèmes"],...P26ui.ongletsBoutique()].map(([t,l])=>`<button type="button" class="${tab===t?"on":""}" data-t="${t}">${l}</button>`).join("")}</div>`;
  if(tab==="dos")h+=`<div class="shop">${DOS.map(d=>item("dos",d,`<i class="dosv" data-d="${d.id}"></i>`)).join("")}</div>`;
  else if(tab==="w")h+=`<div class="shop">${WALLS.map(w=>item("w",w,`<i class="wallv" data-w="${w.id}"></i>`)).join("")}</div><p class="shopnote">Le fond s’affiche derrière tout le hub. Les sets Équipe et Saison se gagnent à plusieurs.</p>`;
  else if(tab==="b")h+=`<div class="shop wide" style="grid-template-columns:repeat(3,minmax(0,1fr))"><h4>Forme</h4>${BF.map(f=>item("bf",f,`<i class="bfv" style="border-radius:${f.r}">Jouer</i>`)).join("")}</div>
     <div class="shop"><h4>Couleur</h4>${BC.map(c=>item("bc",c,`<i class="bcv" style="--c:${c.c};border-radius:${(BF.find(x=>x.id===k.bf&&owned(x))||BF[0]).r}"></i>`)).join("")}</div>
     <div class="shop"><h4>Effet au toucher</h4>${BX.map(x=>item("bx",x,`<i class="bxv">${x.id==="etincelles"?"✦":x.id==="vib"?"≋":x.id==="rebond"?"◠":"·"}</i>`)).join("")}</div>
     <p class="shopnote">Un thème chromatique remplace la couleur des boutons.</p>`;
  else if(P26ui.ongletsBoutique().some(t=>t[0]===tab))h+=`<div data-slot="boutique.rayon" data-t="${esc(tab)}"></div>`;
  else{const dv=LG.nick&&!LG.ro?(LG.div||0):0;h+=`<div class="shop wide">${[{id:"",nom:"Aucun"},...CHR.map((c,i)=>({id:c,nom:DIVS[i],dv:i}))].map(c=>{const lk=c.id&&c.dv>dv,on=(k.ch||"")===c.id;
      return `<button type="button" class="${on?"on":""}${lk?" lock":""}" data-kind="ch" data-id="${c.id}" ${lk?'aria-disabled="true"':""}><i class="chv" data-c="${c.id}">${c.id?esc(c.nom):"Sans thème"}</i>${on?"Choisi":lk?"Division "+esc(c.nom):c.id?"Thème "+esc(c.nom):"Normal"}</button>`}).join("")}</div>
     <p class="shopnote">Chaque division débloque son thème et ceux du dessous. Si tu redescends, tu gardes seulement les thèmes de ta nouvelle division.${k.ch&&chromaNow()!==k.ch&&chromaNow()?" Ton thème "+esc(DIVS[CHR.indexOf(k.ch)])+" revient quand tu remontes.":""}</p>`}
  return h}
function bindShop(){const box=$("#lg");if(!box)return;P26ui.slot("boutique.rayon",box.querySelector('[data-slot="boutique.rayon"]'));
  box.querySelectorAll("#shopTabs button").forEach(b=>b.onclick=()=>{LG.shop=b.dataset.t;if(LG.ok)renderLigue();else{LG.ok=false;renderLigue()}});
  box.querySelectorAll(".shop button[data-kind]").forEach(b=>b.onclick=()=>{
    const L={dos:DOS,w:WALLS,bf:BF,bc:BC,bx:BX}[b.dataset.kind],it=L&&L.find(x=>x.id===b.dataset.id);
    if(b.classList.contains("lock")&&it&&!it.rw&&b.dataset.kind!=="ch"){const price=+it.xp||0,have=coins();
      if(have>=price){if(!b.classList.contains("buy")){box.querySelectorAll(".shop button.buy").forEach(x=>{x.classList.remove("buy");x.lastChild.textContent=x.dataset.lab||x.lastChild.textContent});b.dataset.lab=b.lastChild.textContent;b.classList.add("buy");b.lastChild.textContent="Acheter ? "+fmtN(price);return}
        buyItem(it);buzz(18);toast(`<span class="tm">✓</span><div><b>${esc(it.nom)} est à toi</b><span>−${fmtN(price)} pièces · il t’en reste ${fmtN(coins())}</span></div>`);b.classList.remove("lock","buy");}
      else{buzz([8,60,8]);toast(`<span class="tm">·</span><div><b>Il te manque ${fmtN(price-have)} pièces</b><span>1 XP gagné = 1 pièce. Tes pièces : ${fmtN(have)}.</span></div>`);if(!reduce&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260});return}}
    if(b.classList.contains("lock")){buzz([8,60,8]);if(!reduce&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260});return}
    const kind=b.dataset.kind,id=b.dataset.id;
    if(kind==="dos"){P.dos=id;document.body.dataset.dos=id}else{P.sk=Object.assign({},P.sk||{});P.sk[kind]=id}
    saveP();applySkin();lgPush();renderLigue();
    if(kind==="bx"&&id==="vib")buzz(14)})}

/* ================= OBJECTIF DE LIGUE ================= */
const GOAL=1000;
function goalNow(){const rows=LG.rows.filter(r=>r.nick&&inCur(r)&&r.id!==UID);return rows.reduce((a,r)=>a+(r.sem===WEEK?(+r.xp||0):0),0)+(LG.nick?weekSum():0)}
function goalHTML(){const v=goalNow(),done=v>=GOAL,n=LG.rows.filter(r=>r.nick&&inCur(r)&&r.id!==UID).length+1;
  return `<div class="goal${done?" done":""}"><b>${done?"Objectif réussi : set Équipe débloqué":"Objectif de "+esc(ligName(LG.cur))+" : "+GOAL.toLocaleString("fr-FR")+" XP"}</b><small>${Math.min(v,GOAL).toLocaleString("fr-FR")} / ${GOAL.toLocaleString("fr-FR")} XP cette semaine, à ${n}. Récompense : dos, fond et thème de boutons Équipe.</small><span class="bar" style="--p:${Math.min(1,v/GOAL).toFixed(3)}"><i></i></span></div>`}
function goalCheck(){if(!LG.nick||LG.ro)return;const cs=["HUB"];const save=LG.cur;let ok=false;cs.forEach(c=>{LG.cur=c;if(goalNow()>=GOAL)ok=true});LG.cur=save;
  if(ok&&!(P.rw&&P.rw.equipe)){P.rw=Object.assign({},P.rw||{},{equipe:WEEK});saveP();checkRewards();toast(`<span class="tm">∞</span><div><b>Objectif de ligue réussi</b><span>Set Équipe débloqué dans la boutique</span></div>`);lgPush()}}

/* ================= SAISONS (un mois) ================= */
function seasonRank(code,m){const rows=LG.rows.filter(r=>r.nick&&(code==="HUB"||(r.codes||[]).includes(code))).map(r=>({id:r.id,nick:r.nick,x:r.id===UID?monthSum(m):(+(r.mo&&r.mo[m])||0)})).filter(r=>r.x>0).sort((a,b)=>b.x-a.x);return rows}
function seasonCheck(){if(!LG.nick||LG.ro||!LG.rows.length)return;if(P.sz===MON)return;
  let best=null;["HUB"].forEach(c=>{const r=seasonRank(c,PMON),i=r.findIndex(x=>x.id===UID);if(i>=0&&r.length>=2&&(best===null||i<best.rk))best={rk:i,n:r.length,c}});
  P.sz=MON;P.sres=best?{m:PMON,rk:best.rk+1,n:best.n,c:best.c}:null;
  if(best&&best.rk<=2){P.rw=Object.assign({},P.rw||{},{saison:PMON});if(best.rk===0)P.t.champion=P.t.champion||TODAY_ISO;toast(`<span class="tm">${best.rk+1}</span><div><b>Podium de la saison</b><span>Set Saison débloqué dans la boutique</span></div>`)}
  saveP();checkRewards(true);lgPush()}
function seasonResHTML(){const r=P.sres;if(!r||r.m!==PMON||LG.per!=="mois")return "";const mi=+r.m.slice(5)-1;
  return `<p class="lgres">Saison de ${MOIS_L[mi]} : <b>${r.rk}${r.rk===1?"er":"e"} sur ${r.n}</b> dans ${esc(ligName(r.c))}.${r.rk<=3?" Set Saison gagné.":""}</p>`}

/* ================= DUEL DU JOUR : un adversaire tiré au sort dans ta ligue ================= */
function duelPair(){if(!LG.nick)return null;const ids=[...new Set([UID,...LG.rows.filter(r=>r.nick&&inCur(r)).map(r=>r.id)])].sort();if(ids.length<2)return null;
  let seed=0;for(const ch of TODAY_ISO+LG.cur)seed=(seed*31+ch.charCodeAt(0))|0;const o=sshuffle(ids,rng(seed)),i=o.indexOf(UID);const j=i%2?i-1:i+1;if(j>=o.length)return null;return LG.rows.find(r=>r.id===o[j])||null}
function duelHTML(){const op=duelPair();if(!op)return "";const me=P.df[TODAY_ISO],them=op.jour&&op.jour.d===TODAY_ISO?op.jour:null;
  let res="";if(me&&them){const w=me.s>them.s||(me.s===them.s&&me.ms<them.ms);res=w?"Tu gagnes le duel du jour. +5 XP.":me.s===them.s&&me.ms===them.ms?"Égalité parfaite.":"Perdu cette fois. Revanche demain."}
  return `<div class="duel"><b>Ton duel du jour</b> dans ${esc(ligName(LG.cur))} : le meilleur score au défi gagne.
    <div class="vs"><div><div class="sc2">${me?me.s+"/10":"–"}</div><span>toi</span></div><div class="x">contre</div><div><div class="sc2">${them?(Math.round(+them.s)||0)+"/10":"–"}</div><span class="opn" data-n="${esc(op.nick)}">${esc(op.nick)}</span></div></div>${res?`<p style="margin:8px 0 0;font-weight:700;color:var(--card-ink)">${res}</p>`:!them?`<p style="margin:8px 0 0">Ton adversaire n’a pas encore joué.</p>`:""}</div>`}
function duelCheck(){const op=duelPair();if(!op)return;const me=P.df[TODAY_ISO],them=op.jour&&op.jour.d===TODAY_ISO?op.jour:null;P.dw=P.dw||{};
  if(me&&them&&!P.dw[TODAY_ISO]&&(me.s>them.s||(me.s===them.s&&me.ms<them.ms))){P.dw[TODAY_ISO]=op.id;saveP();gainXP(5)}}

/* ================= RÉACTIONS ================= */
const RX=["👏","🔥","😮","😂"];
function rxClean(o){const out={};Object.entries(o||{}).forEach(([k,v])=>{if(v&&v.w===WEEK&&RX.includes(v.e)&&Object.keys(out).length<40)out[k]={e:v.e,w:v.w}});return out}
const myRx=id=>{const v=(LG.myRx||{})[id];return v&&v.w===WEEK?v.e:""};
function rxFor(id){const c={};LG.rows.forEach(r=>{if(r.id===UID)return;const v=r.rx&&r.rx[id];if(v&&v.w===WEEK&&RX.includes(v.e))c[v.e]=(c[v.e]||0)+1});const mine=myRx(id);if(mine)c[mine]=(c[mine]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1])}
function setRx(id,e){LG.myRx=Object.assign({},rxClean((LG.me&&LG.me.rx)||{}),LG.myRx||{});if(myRx(id)===e)delete LG.myRx[id];else LG.myRx[id]={e,w:WEEK};LG.me=Object.assign({},LG.me||{},{rx:LG.myRx});LG.rxOpen=null;buzz(10);lgPush(true);renderLigue()}

/* ================= INVITATION ================= */
function inviteHTML(c){const t=`Rejoins ma ligue « ${ligName(c)} » sur Première 2026, le hub de révision : ${HUB_URL}\nVa dans Ligue, puis « Rejoindre avec un code » : ${c}\nSi la page te demande une invitation, envoie-moi ton e-mail.`;
  return `<div class="invbox"><textarea id="invTxt" readonly>${esc(t)}</textarea><div class="exrow" style="margin-top:10px"><button class="btn" type="button" id="invCopy">Copier</button>${navigator.share?`<button class="btn soft" type="button" id="invShare">Partager</button>`:""}<span class="istat" id="invSt" role="status" style="color:var(--card-mute)"></span></div></div>`}

/* ================= DÉFI ENTRE AMIS PAR CODE ================= */
const CAL="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function codeQs(seedStr){const pool=Object.values(C.qs).filter(x=>x.ch&&!x.ch._doc).map(x=>x.q).filter(q=>q&&q.ok&&(q.no||[]).length).sort((a,b)=>a.id<b.id?-1:1);
  let seed=0;for(const ch of seedStr)seed=(seed*31+ch.charCodeAt(0))|0;const r=rng(seed);return sshuffle(pool,r).slice(0,10).map(q=>({q,opts:optsOf(q,r)}))}
function parseCode(v){const m=String(v||"").toUpperCase().replace(/\s/g,"").match(/^([A-Z2-9]{5})-?(10|[0-9])?$/);return m?{seed:m[1],s:m[2]!=null?+m[2]:null}:null}
function friendsHTML(){const last=Object.entries(P.dc||{}).sort((a,b)=>(b[1].t||0)-(a[1].t||0)).slice(0,3);
  return `<div class="sec"><h2>Défier un ami</h2><span>sans compte</span></div><div class="defi"><p>Tu joues 10 questions, tu reçois un code. Ton ami tape le code et joue les mêmes questions. Ça marche même en invité.</p>
   <div class="friends"><button class="btn" type="button" id="dcNew">Créer un défi</button><button class="btn soft" type="button" id="dcHave">J’ai un code</button></div>
   <div id="dcForm"></div>${last.length?`<ol class="dlist">${last.map(([c,v])=>`<li><span class="r">${v.vs!=null?(v.s>v.vs?"G":v.s===v.vs?"=":"P"):"·"}</span><span>${esc(v.code||c)}</span><span>${v.s}/10${v.vs!=null?" contre "+v.vs+"/10":""}</span></li>`).join("")}</ol>`:""}</div>`}
function bindFriends(){if(!$("#dcNew"))return;
  $("#dcNew").onclick=()=>{let c="";for(let i=0;i<5;i++)c+=CAL[Math.floor(Math.random()*CAL.length)];const qs=codeQs(c);if(qs.length<10){$("#dcForm").innerHTML=`<p class="istat err">Pas assez de questions de quiz pour un défi.</p>`;return}LG.defi={qs,i:0,ok:0,ms:0,t0:0,code:c,own:true};renderDefi();window.scrollTo(0,0)};
  $("#dcHave").onclick=()=>{$("#dcForm").innerHTML=`<label class="lab" for="dcIn" style="color:var(--card-ink)">Code de ton ami</label><div class="olrow"><input id="dcIn" class="inp code" maxlength="8" autocomplete="off" placeholder="K7P2Q-8"><button class="btn" type="button" id="dcGo">Jouer</button></div><p class="olerr" id="dcErr" role="alert"></p>`;$("#dcIn").focus();
    $("#dcGo").onclick=()=>{const p=parseCode($("#dcIn").value);if(!p){$("#dcErr").textContent="Le code ressemble à K7P2Q-8.";return}
      if(P.dc&&P.dc[p.seed]){$("#dcErr").textContent="Tu as déjà joué ce défi : "+P.dc[p.seed].s+"/10.";return}
      const qs=codeQs(p.seed);if(qs.length<10){$("#dcErr").textContent="Pas assez de questions ici pour ce défi.";return}LG.defi={qs,i:0,ok:0,ms:0,t0:0,code:p.seed,vs:p.s};renderDefi();window.scrollTo(0,0)}}}
function codeEnd(D,box){const s=D.ok;D.done=true;P.dc=P.dc||{};const first=!P.dc[D.code];const full=D.code+"-"+s;
  P.dc[D.code]={s,ms:D.ms,vs:D.vs!=null?D.vs:null,code:D.own?full:D.code+(D.vs!=null?"-"+D.vs:""),t:Date.now()};
  if(first)gainXP(s);const win=D.vs!=null&&s>D.vs;if(win&&!P.t.ami){P.t.ami=TODAY_ISO}saveP();checkRewards();if(win)setTimeout(()=>P26ui.emit("victoire",{type:"defi",el:box}),0);
  const msg=D.own?`Envoie ce code à tes amis. Ils jouent les mêmes questions et voient s’ils te battent.`:win?`Tu bats ton ami : ${s}/10 contre ${D.vs}/10.`:D.vs===s?`Égalité : ${s}/10 chacun.`:D.vs!=null?`Ton ami gagne : ${D.vs}/10 contre ${s}/10.`:`Score enregistré.`;
  const share=`J’ai fait ${s}/10 au défi Première 2026. Bats-moi avec le code ${D.own?full:D.code+"-"+s} : Ligue, puis « Défier un ami », puis « J’ai un code ».`;
  box.innerHTML=`<div class="result"><div class="sc">${s}/10</div><p>${esc(msg)}</p>${D.own?`<p class="codebig" style="color:var(--gold)">${esc(full)}</p>`:""}
   <div class="invbox" style="text-align:left"><textarea id="invTxt" readonly>${esc(share)}</textarea><div class="exrow" style="margin-top:10px"><button class="btn" type="button" id="invCopy">Copier</button>${navigator.share?`<button class="btn soft" type="button" id="invShare">Partager</button>`:""}<button class="btn soft" type="button" id="dcCard">Carte de score</button><span class="istat" id="invSt" role="status" style="color:var(--card-mute)"></span></div></div>
   <button class="btn light" type="button" id="dfBack">Retour à la ligue</button></div>`;
  $("#dfBack").onclick=()=>{LG.defi=null;renderLigue()};
  $("#invCopy").onclick=async()=>{const t=$("#invTxt");t.select();let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){try{ok=document.execCommand("copy")}catch(e2){}}$("#invSt").textContent=ok?"Copié.":"Sélectionne le texte et copie-le."};
  if($("#invShare"))$("#invShare").onclick=async()=>{try{await navigator.share({text:share})}catch(e){}};
  $("#dcCard").onclick=()=>scoreCard({titre:D.own?"Défi entre amis":"Défi relevé",big:s+"/10",sub:D.own?"Bats-moi : "+full:D.vs!=null?"contre "+D.vs+"/10":""},$("#invSt"))}

/* ================= CARTE DE SCORE (image à partager) ================= */
async function scoreCard(o,st){if(st){st.className="istat";st.textContent="Préparation de l’image…"}
  try{if(document.fonts){await Promise.all([document.fonts.load('900 200px "Bodoni Moda"'),document.fonts.load('800 40px Figtree'),document.fonts.load('600 40px Figtree')]).catch(()=>{})}
    const W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
    const ch=chromaNow(),HC={bronze:["#C98B57","#F1C79B","#FFF0DC"],argent:["#AEB8BF","#E3EAEE","#FFFFFF"],or:["#D9B24F","#F6DC8C","#FFF6D6"],diamant:["#9FE3F2","#EAFBFF","#D2C6FF"]}[ch]||["#E7C66B","#F6E3A6","#FFF6D6"];
    const bg=g.createRadialGradient(W/2,0,60,W/2,H*.35,H);bg.addColorStop(0,"#2A6B52");bg.addColorStop(.5,"#1B4A38");bg.addColorStop(1,"#0E2A1E");g.fillStyle=bg;g.fillRect(0,0,W,H);
    const gl=g.createLinearGradient(0,0,W,0);gl.addColorStop(0,HC[0]);gl.addColorStop(.5,HC[2]);gl.addColorStop(1,HC[1]);g.fillStyle=gl;g.fillRect(0,0,W,18);g.fillRect(0,H-18,W,18);
    g.textAlign="center";g.fillStyle="rgba(234,243,238,.75)";g.font='800 40px Figtree, sans-serif';g.fillText("PREMIÈRE 2026",W/2,110);
    g.fillStyle="#EAF3EE";g.font='900 64px "Bodoni Moda", Georgia, serif';g.fillText(o.titre,W/2,250);
    g.fillStyle=gl;g.font='900 300px "Bodoni Moda", Georgia, serif';g.fillText(o.big,W/2,620);
    if(o.unit){g.font='800 56px Figtree, sans-serif';g.fillStyle="#EAF3EE";g.fillText(o.unit,W/2,700)}
    if(o.sub){g.font='600 44px Figtree, sans-serif';g.fillStyle="rgba(234,243,238,.85)";g.fillText(o.sub,W/2,o.unit?780:730)}
    const nick=myNick()||"Moi",cy=1000;const av=avData();
    g.save();g.beginPath();g.arc(W/2,cy,90,0,7);g.closePath();g.fillStyle=HC[1];g.fill();g.clip();
    if(av){const im=new Image();await new Promise(ok=>{im.onload=ok;im.onerror=ok;im.src=av});try{g.drawImage(im,W/2-90,cy-90,180,180)}catch(e){}}
    else{g.fillStyle="#1A1C1E";g.font='800 80px Figtree, sans-serif';g.fillText(initials(nick),W/2,cy+28)}
    g.restore();g.lineWidth=8;g.strokeStyle=HC[2];g.beginPath();g.arc(W/2,cy,94,0,7);g.stroke();
    g.fillStyle="#EAF3EE";g.font='800 56px Figtree, sans-serif';g.fillText(nick,W/2,cy+170);
    const line=[LG.nick&&!LG.ro?"Division "+DIVS[LG.div||0]:"",streakNow()?streakNow()+" soir"+(streakNow()>1?"s":"")+" d’affilée":""].filter(Boolean).join(" · ");
    g.font='600 38px Figtree, sans-serif';g.fillStyle="rgba(234,243,238,.75)";if(line)g.fillText(line,W/2,cy+228);
    const blob=await new Promise(ok=>cv.toBlob(ok,"image/png"));const name="Premiere-2026-"+o.titre.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-")+".png";
    if(navigator.canShare&&navigator.share){try{const f=new File([blob],name,{type:"image/png"});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],text:"Mon score sur Première 2026"});if(st)st.textContent="Partagé.";return}}catch(e){if(e&&e.name==="AbortError"){if(st)st.textContent="";return}}}
    await dlSave(name,blob,st)}catch(e){if(st){st.className="istat err";st.textContent="L’image n’a pas pu être préparée."}}}



/* ================= THÈME CLAIR OU SOMBRE ================= */
const mqDark=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(){const t=P.theme||LS.get("theme","")||"";const light=t==="clair"||(t==="auto"&&!mqDark.matches);document.body.dataset.theme=light?"clair":"";dyeMat="@";applyTint()}
try{mqDark.addEventListener("change",()=>{if((P.theme||"")==="auto")applyTheme()})}catch(e){}

/* ================= POINTS FAIBLES ================= */
function weakCards(){if(!C.ready)return [];return Object.values(C.cards).filter(x=>matOn(x.ch.mat)&&P.c[x.c.id]&&P.c[x.c.id][0]===0).sort((a,b)=>(P.c[b.c.id][2]||0)-(P.c[a.c.id][2]||0)).slice(0,40)}
function renderWeak(){const box=$("#weak");if(!box)return;const w=weakCards(),e=errCards().length;if(!w.length&&!e){box.innerHTML="";return}
  const by={};w.forEach(x=>{by[x.ch.mat]=(by[x.ch.mat]||0)+1});const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([m,n])=>esc((C.M[m]&&C.M[m].court)||m)+" ("+n+")").join(" et ");
  box.innerHTML=`<div class="weak"><b>À revoir ce soir : ${w.length?w.length+" carte"+(w.length>1?"s":"")+" ratée"+(w.length>1?"s":""):""}${w.length&&e?" et ":""}${e?e+" erreur"+(e>1?"s":"")+" de quiz":""}</b><small>${top?"Surtout en "+top+". ":""}Elles reviennent tant que tu ne les sais pas.</small><button class="btn" type="button" id="wkGo">Jouer</button></div>`;
  $("#wkGo").onclick=()=>{sel.mat=w.length?"@faibles":"@err";go("jeu");startPile()}}

/* ================= COMPTE À REBOURS ================= */
function nextEvals(){return C.ech.filter(e=>EVAL(e.type)&&e.date>=TODAY_ISO).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)}
function renderCountdown(){const box=$("#cdown");if(!box)return;const shown=$("#today .jj");const n=nextEvals()[0];
  if(!n||(shown&&C.ech.some(e=>e===n&&(e.chap||[]).length&&daysTo(e.date)<=7))){box.innerHTML="";return}
  const d=daysTo(n.date);
  box.innerHTML=`<div class="cdown" style="--suit:${suitOf(n.mat)}"><span class="n">${d===0?"J":"J-"+d}</span><b><span class="m"></span>${esc(matName(n.mat))} · ${esc(n.titre)}</b><small>${n.type==="oral"?"Oral":"Contrôle"} ${d===0?"aujourd’hui":d===1?"demain":fmtLong.format(parseIso(n.date))}</small><button class="btn ghost" type="button" id="cdGo">Réviser</button></div>`;
  $("#cdGo").onclick=()=>planGo({mat:n.mat,chap:(n.chap||[])[0],kind:d<=1?"faibles":"cartes"})}

/* ================= PLAN DE RÉVISION AUTOMATIQUE ================= */
const STEPS=[{j:7,kind:"cartes",t:"Cartes du chapitre"},{j:3,kind:"quiz",t:"Duel ou quiz du chapitre"},{j:1,kind:"faibles",t:"Points faibles et fiche"}];
function planItems(){const out=[];nextEvals().filter(e=>daysTo(e.date)<=21).forEach(e=>{const d=daysTo(e.date);
  STEPS.forEach(st=>{let at=d-st.j;if(at<0){if(st.j===1||d===0)return;at=0}const day=new Date(NOW);day.setDate(day.getDate()+at);const key=e.id+":"+st.j;
    if(out.some(o=>o.e===e&&o.at===at))return;out.push({key,e,at,iso:isoOf(day),kind:st.kind,t:st.t,mat:e.mat,chap:(e.chap||[])[0]})})});
  return out.sort((a,b)=>a.at-b.at||(a.e.date<b.e.date?-1:1))}
function planGo(it){const ch=it.chap&&C.chaps[it.chap]?C.chaps[it.chap]:chapsOf(it.mat).filter(c=>cardsOfChap(c).length).slice(-1)[0];
  if(it.kind==="faibles"&&weakCards().some(x=>x.ch.mat===it.mat)){sel.mat="@faibles";go("jeu");startPile();return}
  if(it.kind==="faibles"&&(FI.prete&&Object.values(allFiches()).some(f=>f.mat===it.mat))){FI.mat=it.mat;FI.mode="list";go("fiches");return}
  if(it.kind==="quiz"&&seriesOf(it.mat).length){duelMat=it.mat;go("duel");return}
  if(ch){sel.mat=ch.mat;sel.chap=ch.id;sel.paq="*";go("jeu");startPile()}else{FI.mat=it.mat;FI.mode="list";go("fiches")}}
function renderPlan(){const box=$("#plan");if(!box)return;const L=planItems().filter(i=>i.at<=10).slice(0,8);
  $("#plCount").textContent=L.length?L.filter(i=>!P.pl[i.key]).length+" séance"+(L.filter(i=>!P.pl[i.key]).length>1?"s":"")+" à faire":"";
  if(!L.length){box.innerHTML=`<p class="muted" style="margin:0">Pas de contrôle dans les trois semaines. Importe tes dates pour avoir un plan.</p>`;return}
  box.innerHTML=`<div class="plan">${L.map((i,k)=>`<label class="pli${i.at===0?" now":""}${P.pl[i.key]?" done":""}" style="--suit:${suitOf(i.mat)}"><input type="checkbox" data-k="${esc(i.key)}"${P.pl[i.key]?" checked":""}><b><span class="d">${i.at===0?"Aujourd’hui":i.at===1?"Demain":fmtShort.format(parseIso(i.iso))}</span> · ${esc(i.t)}</b><small>${esc(matName(i.mat))} · ${esc(i.e.titre)} (J-${daysTo(i.e.date)})</small>${i.at===0&&!P.pl[i.key]?`<button class="btn light" type="button" data-go="${k}">Go</button>`:""}</label>`).join("")}</div>
   <div class="calrow"><span class="lab">Rappels dans</span><span class="pick sm" id="calApp" style="margin:0;flex:1">${CALAPPS.map(([k,l])=>`<button type="button" class="${(P.cal||"")===k?"on":""}" data-k="${k}">${l}</button>`).join("")}</span></div><div id="calOut"></div>`;
  box.querySelectorAll("input[data-k]").forEach(c=>c.onchange=()=>{if(c.checked)P.pl[c.dataset.k]=TODAY_ISO;else delete P.pl[c.dataset.k];saveP();if(c.checked)gainXP(3);checkRewards();renderPlan()});
  box.querySelectorAll("[data-go]").forEach(b=>b.onclick=e=>{e.preventDefault();planGo(L[+b.dataset.go])});
  $("#calApp").querySelectorAll("button").forEach(b=>b.onclick=()=>{P.cal=b.dataset.k;saveP();renderPlan();calShow()});
  if(P.cal)calShow()}

/* ================= RAPPELS DANS L'AGENDA DE TON CHOIX ================= */
const CALAPPS=[["google","Google Agenda"],["apple","iPhone / iCloud"],["outlook","Outlook"],["autre","Samsung ou autre"]];
function calEvents(){const ev=[];planItems().filter(i=>i.at<=21).forEach(i=>ev.push({uid:"p26-"+hash(i.key),titre:"Révision "+matName(i.mat)+" : "+i.t,desc:"Pour "+i.e.titre+" ("+fmtLong.format(parseIso(i.e.date))+"). Ouvre Première 2026 : "+HUB_URL,day:i.iso,h:18,m:30,dur:30}));
  nextEvals().filter(e=>daysTo(e.date)<=60).forEach(e=>ev.push({uid:"p26-c-"+hash(e.id+e.date),titre:(e.type==="oral"?"Oral ":"Contrôle ")+matName(e.mat)+" : "+e.titre,desc:"Relevé dans Première 2026.",day:e.date,allDay:true}));return ev}
const cDt=(iso,h,m)=>iso.replace(/-/g,"")+"T"+pad(h)+pad(m)+"00";
function endOf(e){const d=new Date(+e.day.slice(0,4),+e.day.slice(5,7)-1,+e.day.slice(8,10),e.h||0,(e.m||0)+(e.dur||0));return {iso:isoOf(d),h:d.getHours(),m:d.getMinutes()}}
function gLink(e){const p=new URLSearchParams({action:"TEMPLATE",text:e.titre,details:e.desc,ctz:"Europe/Paris"});
  if(e.allDay){const n=new Date(parseIso(e.day));n.setDate(n.getDate()+1);p.set("dates",e.day.replace(/-/g,"")+"/"+isoOf(n).replace(/-/g,""))}else{const f=endOf(e);p.set("dates",cDt(e.day,e.h,e.m)+"/"+cDt(f.iso,f.h,f.m))}
  return "https://calendar.google.com/calendar/render?"+p.toString()}
function oLink(e){const f=endOf(e);const p=new URLSearchParams({path:"/calendar/action/compose",rru:"addevent",subject:e.titre,body:e.desc,startdt:e.allDay?e.day:e.day+"T"+pad(e.h)+":"+pad(e.m)+":00",enddt:e.allDay?e.day:f.iso+"T"+pad(f.h)+":"+pad(f.m)+":00",allday:e.allDay?"true":"false"});return "https://outlook.live.com/calendar/0/deeplink/compose?"+p.toString()}
function icsText(ev){const esc2=t=>String(t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");const st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Premiere 2026//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  ev.forEach(e=>{L.push("BEGIN:VEVENT","UID:"+e.uid+"@premiere2026","DTSTAMP:"+st,"SUMMARY:"+esc2(e.titre),"DESCRIPTION:"+esc2(e.desc));
    if(e.allDay){const n=new Date(parseIso(e.day));n.setDate(n.getDate()+1);L.push("DTSTART;VALUE=DATE:"+e.day.replace(/-/g,""),"DTEND;VALUE=DATE:"+isoOf(n).replace(/-/g,""))}
    else{const f=endOf(e);L.push("DTSTART;TZID=Europe/Paris:"+cDt(e.day,e.h,e.m),"DTEND;TZID=Europe/Paris:"+cDt(f.iso,f.h,f.m),"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+esc2(e.titre),"TRIGGER:-PT10M","END:VALARM")}
    L.push("END:VEVENT")});L.push("END:VCALENDAR");return L.join("\r\n")}
function calShow(){const box=$("#calOut");if(!box)return;const ev=calEvents(),app=P.cal;
  if(!ev.length){box.innerHTML=`<p class="note" style="margin:10px 0 0">Rien à ajouter pour l’instant.</p>`;return}
  if(app==="google"||app==="outlook"){box.innerHTML=`<p class="note" style="margin:10px 0 0">Touche chaque séance : ${app==="google"?"Google Agenda":"Outlook"} s’ouvre avec tout déjà rempli, il te reste à enregistrer.</p><div class="cals">${ev.slice(0,12).map(e=>`<a href="${esc(app==="google"?gLink(e):oLink(e))}" target="_blank" rel="noopener">${esc(e.titre)}<span>${e.allDay?"":"18 h 30 · "}${fmtShort.format(parseIso(e.day))}</span></a>`).join("")}</div>`;return}
  box.innerHTML=`<p class="note" style="margin:10px 0 0">${app==="apple"?"Ton iPhone propose de tout ajouter au Calendrier en une fois.":"Ton téléphone ouvre le fichier avec ton agenda (Samsung Calendar ou autre)."} ${ev.length} rappel${ev.length>1?"s":""}, 10 minutes avant chaque séance.</p><div class="exrow"><button class="btn light" type="button" id="icsGo">Ajouter les ${ev.length} rappels</button><span class="istat" id="icsSt" role="status"></span></div>`;
  $("#icsGo").onclick=async()=>{const st=$("#icsSt"),txt=icsText(ev),f=new File([txt],"revisions-premiere-2026.ics",{type:"text/calendar"});st.className="istat";
    try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Révisions Première 2026"});st.textContent="Choisis Calendrier dans la liste.";return}}catch(e){if(e&&e.name==="AbortError")return}
    try{const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);st.textContent="Si rien ne s’ouvre, choisis Google Agenda : ça marche partout, et Samsung Calendar peut l’afficher."}
    catch(e){st.className="istat err";st.textContent="Ce téléphone bloque le fichier ici. Choisis Google Agenda."}}}

/* ================= TA SEMAINE (statistiques) ================= */
function renderWeek(){const box=$("#wk");if(!box)return;const m0=mondayOf(NOW),days=[],JL=["L","M","M","J","V","S","D"];
  for(let i=0;i<7;i++){const d=new Date(m0);d.setDate(m0.getDate()+i);const iso=isoOf(d);days.push({iso,n:P.j[iso]||0,fut:iso>TODAY_ISO,t:iso===TODAY_ISO})}
  const max=Math.max(10,...days.map(d=>d.n)),tot=days.reduce((a,d)=>a+d.n,0),best=days.reduce((a,d)=>d.n>a.n?d:a,days[0]);
  const by={};days.forEach(d=>Object.entries(P.sm[d.iso]||{}).forEach(([m,n])=>{by[m]=(by[m]||0)+n}));const rows=Object.entries(by).filter(([m])=>C.M[m]).sort((a,b)=>b[1]-a[1]);const mx=Math.max(1,...rows.map(r=>r[1]));
  $("#wkSum").textContent=tot?tot+" réponse"+(tot>1?"s":""):"";
  box.innerHTML=`<div class="wktot"><span><b>${tot}</b>cartes et questions</span><span><b>${weekSum()}</b>XP</span><span><b>${days.filter(d=>d.n).length}</b>soir${days.filter(d=>d.n).length>1?"s":""} sur 7</span></div>
   <div role="img" aria-label="Cartes jouées par jour cette semaine : ${days.map((d,i)=>JL[i]+" "+d.n).join(", ")}"><div class="wkc">${days.map(d=>`<div class="${d.t?"t":""}" title="${fmtLong.format(parseIso(d.iso))} : ${d.n} réponse${d.n>1?"s":""}">${d.n&&(d.t||d===best)?`<em>${d.n}</em>`:""}<i style="height:${d.fut?0:Math.max(d.n?6:2,Math.round(100*d.n/max))}%"></i></div>`).join("")}</div>
   <div class="wkl">${JL.map((l,i)=>`<span${days[i].t?' style="color:var(--gold)"':""}>${l}</span>`).join("")}</div></div>
   ${rows.length?`<div class="wkm">${rows.slice(0,6).map(([m,n])=>`<div style="--suit:${suitOf(m)};--p:${(n/mx).toFixed(3)}" title="${esc(matName(m))} : ${n}"><span><i></i>${esc((C.M[m]&&C.M[m].court)||m)}</span><span class="b"><i></i></span><em>${n}</em></div>`).join("")}</div>`:`<p class="muted" style="margin:0;font-size:.86rem">Le détail par matière apparaît dès tes premières cartes de la semaine.</p>`}`}

/* ================= BAC BLANC ================= */
const BB={on:false,qs:[],i:0,res:[],t0:0,T:null,dur:20*60e3};
function bbPool(){const all=Object.values(C.qs).filter(x=>matOn(x.ch.mat)&&(!x.ch._doc||x.ch._own||(x.ch.vis||"hub")!=="moi"||true)).filter(x=>x.q&&x.q.ok&&(x.q.no||[]).length);
  const by={};all.forEach(x=>{(by[x.ch.mat]=by[x.ch.mat]||[]).push(x)});Object.keys(by).forEach(m=>by[m]=shuffle(by[m]));
  const out=[];const ms=shuffle(Object.keys(by));let k=0;while(out.length<20&&ms.some(m=>by[m].length)){const m=ms[k%ms.length];if(by[m].length)out.push(by[m].pop());k++}return out}
function bbCardHTML(){const n=bbPool().length,last=Object.entries(P.bb||{}).sort((a,b)=>a[0]<b[0]?1:-1)[0];
  return `<div class="bbcard"><h3>Bac blanc</h3><p>20 questions de toutes tes matières, 20 minutes, une note sur 20. Tes erreurs partent dans la pile du Jeu.${last?" Dernière note : <b>"+last[1].s+"/20</b>.":""}</p>${n>=10?`<button class="btn" type="button" id="bbGo">Commencer</button>`:`<p style="margin:0">Il faut plus de questions de quiz : importe des cours.</p>`}</div>`}
function bbStart(){const pool=bbPool();if(pool.length<10)return;BB.on=true;inDuel=true;BB.qs=pool.map(x=>({x,opts:optsOf(x.q)}));BB.i=0;BB.res=[];BB.t0=Date.now();clearInterval(BB.T);BB.T=setInterval(bbTick,1000);bbQ();window.scrollTo(0,0)}
function bbLeft(){return Math.max(0,BB.dur-(Date.now()-BB.t0))}
function bbTick(){const el=$("#bbClock");if(!BB.on){clearInterval(BB.T);return}const l=bbLeft();if(el)el.textContent=Math.floor(l/60e3)+":"+pad(Math.floor(l%60e3/1000));if(!l){clearInterval(BB.T);bbEnd()}}
function bbQ(){if(BB.i>=BB.qs.length){bbEnd();return}const Q=BB.qs[BB.i],ch=Q.x.ch;applyTint();JT=Date.now();
  $("#duel").innerHTML=`<div class="bbtime"><span>Bac blanc · ${BB.i+1} / ${BB.qs.length}</span><span><b id="bbClock"></b></span></div><div class="qcard" style="--suit:${suitOf(ch.mat)}"><div class="role"><span>${esc(matName(ch.mat))}</span><span>${esc(ch.court||"")}</span></div><h2>${tex(Q.x.q.q)}</h2>
   ${Q.opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="why"></div></div><div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" id="bbStop">Arrêter et voir ma note</button></div>`;bbTick();
  const btns=[...$("#duel").querySelectorAll(".opt")];
  btns.forEach(b=>b.onclick=()=>{const good=!!Q.opts[+b.dataset.i].ok;BB.res[BB.i]=good;jrn(Q.x.q.id,good,jms(),"examen");if(good)delete P.e[Q.x.q.id];else P.e[Q.x.q.id]=Date.now();tickMat(ch.mat);tickDay();saveP();
    btns.forEach(x=>{x.disabled=true;if(Q.opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});reactOpt(b,good,btns.find(x=>Q.opts[+x.dataset.i].ok));
    $("#why").innerHTML=`${good?"":`<p class="why">${tex(Q.x.q.why||"")}</p>`}<div style="margin-top:14px"><button class="btn" type="button" id="nx">${BB.i<BB.qs.length-1?"Question suivante":"Voir ma note"}</button></div>`;$("#nx").onclick=()=>{BB.i++;bbQ()};$("#nx").focus()});
  $("#bbStop").onclick=bbEnd}
function bbEnd(){if(!BB.on)return;BB.on=false;inDuel=false;clearInterval(BB.T);const n=BB.qs.length,ok=BB.res.filter(Boolean).length,ans=BB.res.filter(v=>v!=null).length,note=Math.round(ok/n*20*2)/2;
  const prev=P.bb[TODAY_ISO];if(!prev||note>prev.s)P.bb[TODAY_ISO]={s:note,n,ok};gainXP(ok);saveP();checkRewards();if(note>=15)setTimeout(()=>P26ui.emit("victoire",{type:"bac",el:$("#duel")}),0);
  const by={};BB.qs.forEach((Q,i)=>{const m=Q.x.ch.mat;by[m]=by[m]||{n:0,ok:0};by[m].n++;if(BB.res[i])by[m].ok++});
  const mins=Math.round((Date.now()-BB.t0)/60e3);const nf=String(note).replace(".",",");
  $("#duel").innerHTML=`<div class="result"><div class="sc">${nf}/20</div><p>${note>=16?"Très bien. Garde ce rythme.":note>=12?"Bien. Regarde la matière la plus faible ci-dessous.":note>=8?"Pas loin. Tes erreurs t’attendent dans le Jeu.":"Repasse par les fiches, puis retente dans quelques jours."} ${ans<n?(n-ans)+" question"+(n-ans>1?"s":"")+" sans réponse. ":""}${mins<1?"Moins d’une minute.":mins+" min."}</p>
   <div class="bbres">${Object.entries(by).sort((a,b)=>a[1].ok/a[1].n-b[1].ok/b[1].n).map(([m,v])=>`<div style="--suit:${suitOf(m)};--p:${(v.ok/v.n).toFixed(3)}"><span>${esc((C.M[m]&&C.M[m].court)||m)}</span><span class="b"><i></i></span><em>${v.ok}/${v.n}</em></div>`).join("")}</div>
   <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px"><button class="btn light" type="button" id="bbErr">Mes erreurs</button><button class="btn ghost" type="button" id="bbCard">Carte de score</button><button class="btn ghost" type="button" id="bbBack">Retour</button></div><p class="istat" id="bbSt" role="status"></p></div>`;
  $("#bbErr").onclick=()=>{sel.mat="@err";go("jeu");startPile()};$("#bbBack").onclick=renderSeries;$("#bbCard").onclick=()=>scoreCard({titre:"Bac blanc",big:nf+"/20",sub:ok+" bonnes réponses sur "+n},$("#bbSt"))}

/* ================= EXPLICATION PAR CLAUDE ================= */
const EXPL={ctl:null};
async function explain(c,box){if(!IMP.sample||!c)return;const {ch}=metaOf(c);if(EXPL.ctl)EXPL.ctl.abort();EXPL.ctl=new AbortController();
  box.innerHTML=`<div class="expl"><b>Claude explique</b><span id="exTxt">Je réfléchis…</span></div>`;
  const prompt=`Un élève de Première (lycée en France) révise une carte et ne la savait pas.
Matière : ${ch?matName(ch.mat):"?"}${ch?". Chapitre : "+ch.titre:""}.
Question : ${c.r}
Réponse attendue : ${c.v}
Explique-lui en 4 phrases au plus, simplement : pourquoi c’est la réponse, puis un moyen de s’en souvenir (exemple concret, image ou astuce). Tutoie-le. Pas de titre, pas de liste. Écris les formules entre $ et $.`;
  try{const r=await IMP.sample(prompt,{modelTier:"quick",signal:EXPL.ctl.signal,onText:({text})=>{const t=$("#exTxt");if(t)t.textContent=text}});const t=$("#exTxt");if(t)t.innerHTML=tex(r.text)}
  catch(e){const t=$("#exTxt");if(t&&!(e&&e.code==="cancelled"))t.textContent=sampleErr(e)}finally{EXPL.ctl=null}}
$("#bExp").onclick=()=>explain(cur,$("#repBox"));

/* ================= MODE ORAL : lecture à voix haute, réponse au micro ================= */
const ORAL={on:LS.get("oral",false),rec:null};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function oralLabel(){const b=$("#bOral");if(!b)return;b.hidden=!("speechSynthesis" in window);b.textContent="Mode oral : "+(ORAL.on?"activé":"coupé")}
function langOf(ch){const m=ch&&ch.mat;return m==="an"||m==="amc"?"en-GB":m==="es"?"es-ES":"fr-FR"}
function speak(t,ch){try{if(!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(plainTex(String(t).replace(/\$([^$]+)\$/g,"$1")).replace(/[«»"]/g,""));u.lang=langOf(ch);u.rate=.98;speechSynthesis.speak(u)}catch(e){}}
function oralCard(){const c=cur;if(!c)return;speak(c.r,metaOf(c).ch);const box=$("#oralBox");
  box.innerHTML=`<div class="oralbar"><button class="btn ghost" type="button" id="orAgain">Relire</button>${SR?`<button class="btn light" type="button" id="orMic">Répondre au micro</button>`:""}</div><p class="heard" id="orHeard">${SR?"Réponds à voix haute, puis retourne la carte.":"Dis ta réponse à voix haute, puis retourne la carte."}</p>`;
  $("#orAgain").onclick=()=>speak(c.r,metaOf(c).ch);
  if($("#orMic"))$("#orMic").onclick=()=>{try{if(ORAL.rec)ORAL.rec.abort();const r=new SR();ORAL.rec=r;r.lang=langOf(metaOf(c).ch);r.interimResults=false;r.maxAlternatives=1;
    $("#orHeard").textContent="J’écoute…";r.onresult=ev=>{const said=ev.results[0][0].transcript;const ok=matchAnswer(said,c.v);$("#orHeard").textContent="Tu as dit : « "+said+" ». "+(ok?"Ça ressemble à la bonne réponse.":"Compare avec la carte.");if(!flipped)flip()};
    r.onerror=ev=>{$("#orHeard").textContent=ev.error==="not-allowed"||ev.error==="service-not-allowed"?"Le micro n’est pas autorisé ici. Réponds à voix haute puis retourne la carte.":"Je n’ai rien entendu. Réessaie."};r.start()}catch(e){$("#orHeard").textContent="Le micro ne marche pas ici. Réponds à voix haute puis retourne la carte."}}}
function matchAnswer(said,ans){const toks=t=>plainTex(String(t).replace(/\$([^$]+)\$/g,"$1")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9]+/).filter(w=>w.length>3);
  const A=toks(ans),S=new Set(toks(said));if(!A.length)return false;const hit=A.filter(w=>S.has(w)).length;return hit/Math.min(A.length,6)>=.5}
$("#bOral").onclick=()=>{ORAL.on=!ORAL.on;LS.set("oral",ORAL.on);P.oral=ORAL.on?"1":"0";oralLabel();if(ORAL.on&&cur)oralCard();else{$("#oralBox").innerHTML="";try{speechSynthesis.cancel()}catch(e){}}};
oralLabel();
$("#bQuick").onclick=()=>focusOn(true);
function quickIds(){const due=Object.values(C.cards).filter(x=>matOn(x.ch.mat)&&P.c[x.c.id]&&isDue(x.c.id)).map(x=>x.c.id);
  const weak=weakCards().map(x=>x.c.id),fresh=buildDonne();const out=[];[...shuffle(due),...weak,...fresh].forEach(id=>{if(out.length<10&&!out.includes(id))out.push(id)});return out}
/* ================= EXTENSION : CLUBS, QUÊTES, FICHES EN LOT =================
   Clubs = tables clubs et club_membres de la base, par window.P26.clubs (mes, creer,
   rejoindre, quitter). Le code est tiré par la base. Visibilité « ligue:CODE ».
   Classement : une seule ligue globale (HUB).
   Messages de club : biblio/<auteur>/msg/<id>. Chacun n'écrit que dans sa partie.
   La base ne laisse lire un contenu de club qu'aux membres (et à l'administrateur),
   et seulement si l'auteur est encore membre. Mode démo : clubs locaux.
   Pas de jetons, pas de Premium : rien n'est vendu ici. */
const EX={club:null,quest:null,batch:[],batchBusy:false,batchCtl:null};
const CH={by:{}};
function exId(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>("0"+n.toString(16)).slice(-2)).join("")}
function exToast(t){toast('<span class="tm">✦</span><div><b>'+esc(t)+'</b></div>')}
function exHeader(title,sub){return `<div class="ihead"><h1>${title}</h1><button class="linkbtn" data-home type="button">Retour</button></div><p class="lgsub">${sub}</p>`}
function bindHome(box){box.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>go("table"))}

/* ---------- Quêtes : un sans-faute par matière et par semaine ---------- */
const QUEST_XP=25;
const QUEST_CATS=[{key:"math",name:"Mathématiques",re:/math/i},{key:"ses",name:"SES",re:/\bses\b|social|économ|econom/i},{key:"amc",name:"AMC",re:/\bamc\b|anglais|anglophone/i}];
function questList(){
  return QUEST_CATS.map(k=>{const m=(C.matsAll||C.mats||[]).find(m=>k.re.test(m.id+" "+m.nom));
    const entry=m&&C.ready?seriesOf(m.id).find(x=>!x.ch._doc&&(x.s.qs||[]).filter(q=>q.q&&q.ok&&(q.no||[]).length).length>=10):null;
    const id=WEEK+":"+k.key;return {...k,id,m,entry,done:!!(P.qw&&P.qw[id])}})}
function questsDone(){return questList().filter(q=>q.done).length}
function questWeeksFull(){const w={};Object.keys(P.qw||{}).forEach(k=>{const s=k.split(":")[0];w[s]=(w[s]||0)+1});return Object.values(w).some(n=>n>=QUEST_CATS.length)}
function renderExtras(){
  const box=$("#extras");if(!box)return;
  box.innerHTML=`<div class="exnav"><button type="button" data-go="clubs">Mes clubs <span>${myCodes().length}</span></button><button type="button" data-go="quetes">Quêtes <span>${questsDone()} / ${QUEST_CATS.length}</span></button></div>${DEMO?'<p class="exnote">Aperçu hors Claude : cours et classement d’exemple, progression gardée dans ce navigateur.</p>':""}`;
  box.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go))}
function renderQuetes(){const box=$("#quests");
  box.innerHTML='<div data-slot="quetes"></div>'+exHeader("Quêtes de révision",`Un sans-faute sur un quiz du programme : +${QUEST_XP} XP. Une fois par matière et par semaine.`)+
    `<div class="exsummary"><span>${questsDone()} / ${QUEST_CATS.length} réussies cette semaine</span><span>Bonus soumis au plafond de ${CAP} XP par jour</span></div><div class="excards">`+
    questList().map((q,i)=>`<article class="excard"><span class="eyebrow">${esc(q.name)}</span><h2>${q.entry?esc(q.entry.s.nom):"Bientôt disponible"}</h2><p>${q.entry?esc(q.entry.ch.titre):"Il faut un quiz du programme avec au moins 10 questions."}</p><div class="exreward">+${QUEST_XP} XP <span>pour un 10/10</span></div><button class="btn light" data-quest="${i}" type="button" ${!q.entry||q.done?"disabled":""}>${q.done?"Réussie cette semaine ✓":"Tenter le 10/10"}</button></article>`).join("")+"</div>";
  P26ui.slot("quetes",box.querySelector('[data-slot="quetes"]'));bindHome(box);box.querySelectorAll("[data-quest]").forEach(b=>b.onclick=()=>startQuest(+b.dataset.quest))}
function startQuest(i){const q=questList()[i];if(!q||!q.entry||q.done)return;
  EX.quest={id:q.id,name:q.name,qs:shuffle(q.entry.s.qs.filter(x=>x.q&&x.ok&&(x.no||[]).length)).slice(0,10),i:0,score:0,answered:false,done:false};renderQuestQuestion()}
function finishQuest(){const q=EX.quest;if(!q||q.done)return;q.done=true;
  let rewarded=false;if(q.score===10&&q.qs.length===10&&!(P.qw[q.id])){P.qw[q.id]={s:10,at:Date.now()};rewarded=true;tickDay();gainXP(QUEST_XP);saveP();checkRewards()}
  if(q.score===10&&q.qs.length===10)setTimeout(()=>P26ui.emit("victoire",{type:"quete",el:$("#quests")}),0);
  if(view!=="quetes"||EX.quest!==q)return;
  $("#quests").innerHTML=exHeader("Quête terminée","Chaque tentative te fait progresser.")+`<div class="result"><div class="sc">${q.score}/10</div><p>${rewarded?`Sans-faute ! +${QUEST_XP} XP.`:q.score===10?"Déjà réussie cette semaine.":"Il faut 10/10 pour la quête. Tu peux réessayer."}</p><button class="btn light" id="questBack" type="button">Mes quêtes</button></div>`;
  bindHome($("#quests"));$("#questBack").onclick=()=>{EX.quest=null;renderQuetes()}}
function renderQuestQuestion(){const d=EX.quest;if(!d)return renderQuetes();if(d.i>=d.qs.length){finishQuest();return}
  d.answered=false;const q=d.qs[d.i],opts=optsOf(q);$("#quests").innerHTML=exHeader("Quête · "+esc(d.name),"Objectif : 10/10")+`<div class="qcard"><div class="role"><span>Sans-faute</span><span>${d.i+1}/10</span></div><h2>${tex(q.q)}</h2>${opts.map((o,i)=>`<button class="opt" data-answer="${i}" type="button">${tex(o.t)}</button>`).join("")}<div id="questWhy" role="status"></div></div>`;
  bindHome($("#quests"));$("#quests").querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(d.answered)return;d.answered=true;const good=!!opts[+b.dataset.answer].ok;if(good)d.score++;
    $("#quests").querySelectorAll("[data-answer]").forEach(x=>{x.disabled=true;if(opts[+x.dataset.answer].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});
    $("#questWhy").innerHTML=`<p class="why">${tex(q.why||"La bonne réponse est : "+q.ok)}</p><button class="btn" type="button" id="questNext">${d.i===9?"Voir mon résultat":"Question suivante"}</button>`;
    $("#questNext").onclick=()=>{d.i++;renderQuestQuestion()}})}

/* ---------- Clubs : création, adhésion par code, discussion ---------- */
const CODE_AL="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function clubStop(){EX.club=null}
function canChat(){return DEMO||(!GUEST&&!!DB&&!!UID&&!!LG.nick)}
function renderClubs(){const box=$("#clubs"),cs=myCodes();if(clubApi()&&!DEMO&&!GUEST&&Date.now()-CLUB.t>60000)clubsLoad();
  box.innerHTML=exHeader("Mes clubs","Un seul classement pour tout le hub. Autant de clubs que tu veux pour partager des cours et discuter.")+
    `<div class="exrow"><button type="button" class="btn light" id="clubNew">Créer un club</button><button type="button" class="btn ghost" id="clubJoin">J’ai un code</button></div><div id="clubForm"></div><div class="clubtabs">${cs.map(c=>`<button class="${EX.club===c?"active":""}" type="button" data-club="${esc(c)}">${esc(ligName(c))}</button>`).join("")}</div><div id="clubRoom">${cs.length?"Choisis un club pour ouvrir sa discussion.":"Crée ton premier club, ou rejoins celui d’un ami avec son code."}</div>`;
  bindHome(box);$("#clubNew").onclick=()=>clubForm("new");$("#clubJoin").onclick=()=>clubForm("join");box.querySelectorAll("[data-club]").forEach(b=>b.onclick=()=>openClub(b.dataset.club));if(EX.club&&cs.includes(EX.club))openClub(EX.club)}
function clubForm(kind,pre){const f=$("#clubForm");if(!f)return;
  f.innerHTML=`<form class="excard" id="clubCreateForm"><label class="lab" for="clubInput">${kind==="new"?"Nom du club":"Code du club"}</label><div class="olrow"><input class="inp${kind==="join"?" code":""}" id="clubInput" maxlength="${kind==="new"?24:5}" required autocomplete="off" placeholder="${kind==="new"?"Ex. Les as des maths":"ABCDE"}"><button type="submit" class="btn light" id="clubSubmit">${kind==="new"?"Créer":"Rejoindre"}</button></div><p id="clubError" role="alert"></p></form>`;
  if(pre)$("#clubInput").value=pre;$("#clubInput").focus();
  $("#clubCreateForm").onsubmit=async e=>{e.preventDefault();const v=$("#clubInput").value.trim(),st=$("#clubError");
    if(!LG.nick){st.textContent="Choisis d’abord ton pseudo dans ton profil.";return}
    if(!DEMO&&(GUEST||!DB||!UID||LG.ro)){st.textContent="Connecte-toi pour créer ou rejoindre un club.";return}
    let c;const n=String(v).replace(/[\u0000-\u001f]/g,"").trim().slice(0,24);
    if(kind==="new"&&!n){st.textContent="Donne un nom à ton club.";return}
    if(kind!=="new"){c=String(v).toUpperCase().replace(/[^A-Z0-9]/g,"");if(c.length!==5){st.textContent="Le code fait 5 caractères.";return}}
    if(DEMO){P.lg=P.lg||{};P.lg.codes=Array.isArray(P.lg.codes)?P.lg.codes.slice():[];P.lg.mine=P.lg.mine||{};P.lg.joined=P.lg.joined||{};
      if(kind==="new"){do{c="";for(let i=0;i<5;i++)c+=CODE_AL[Math.floor(Math.random()*CODE_AL.length)]}while(P.lg.codes.includes(c));P.lg.mine[c]=n}
      else if(!(P.lg.mine&&P.lg.mine[c])){st.textContent="Aucun club avec ce code.";return}
      if(!P.lg.codes.includes(c))P.lg.codes.push(c);P.lg.joined[c]=Date.now();saveP();if(C.ready){mergeAll();reindex()}EX.club=c;renderClubs();return}
    const A=clubApi();if(!A){st.textContent="Les clubs ne sont pas disponibles pour l’instant. Réessaie plus tard.";return}
    const b=$("#clubSubmit");b.disabled=true;st.textContent="…";
    try{if(kind==="new"){c=await A.creer(n);if(typeof c!=="string"||!/^[A-Z0-9]{5}$/.test(c))throw new Error("code")}
      else{const r=await A.rejoindre(c);const M={inconnu:"Aucun club avec ce code.",limite:"Trop d’essais. Réessaie dans une heure.",plein:"Ce club est complet."};
        if(r!=="ok"&&r!=="deja"){st.textContent=M[r]||"Impossible de rejoindre ce club pour l’instant.";return}}
      CLUB.t=0;await clubsLoad();if(!myCodes().includes(c)){CLUB.list=(CLUB.list||[]).concat([{code:c,nom:kind==="new"?n:"Club "+c,createur:kind==="new",membres:1}]);clubCache()}
      if(C.ready){fiExt();mergeAll();reindex()}EX.club=c;renderClubs()}
    catch(err){st.textContent=refusBase(err)||(err&&err.code==="unavailable"?"Pas de réseau. Réessaie quand tu es connecté.":kind==="new"&&err&&(err.code==="invalid_argument"||err.code==="limite")&&err.message?err.message:kind==="new"?"Impossible de créer le club pour l’instant. Tu as peut-être atteint la limite de clubs.":"Impossible de rejoindre ce club pour l’instant.")}
    finally{if($("#clubSubmit"))$("#clubSubmit").disabled=false}}}
function clubMessages(code){const out=[];Object.entries(CH.by).forEach(([a,l])=>l.forEach(m=>{if(m&&m.club===code&&typeof m.text==="string"&&Number.isFinite(m.at))out.push(Object.assign({},m,{text:clip(m.text,500),_a:a}))}));
  return out.sort((a,b)=>a.at-b.at).slice(-100)}
function openClub(code){if(!myCodes().includes(code))return;EX.club=code;const z=$("#clubRoom");if(!z)return;
  $("#clubs").querySelectorAll("[data-club]").forEach(b=>b.classList.toggle("active",b.dataset.club===code));
  const ok=canChat();
  z.innerHTML=`<div class="excard"><span class="eyebrow">CLUB SUR CODE</span><h2>${esc(ligName(code))}</h2><div class="invitecode"><code>${esc(code)}</code><button class="linkbtn" id="clubCopy" type="button">Copier le code</button></div><p class="exnote" style="margin:0 0 8px">Lisible par les membres du club et l’administrateur. N’écris rien de confidentiel ici.</p><p id="clubStatus" role="status">${ok?"":"Lecture seule : connecte-toi pour écrire."}</p><div class="chatlog" id="chatLog" role="log" aria-label="Messages du club" aria-live="polite"></div><form id="chatForm"><label class="lab" for="chatText">Ton message</label><textarea id="chatText" class="inp" maxlength="500" rows="2" placeholder="On révise quel chapitre ?" required ${ok?"":"disabled"}></textarea><div class="exrow"><button class="btn light" id="chatSend" type="submit" ${ok?"":"disabled"}>Envoyer</button><button class="linkbtn" id="clubLeave" type="button">Quitter le club</button></div></form></div>`;
  $("#clubCopy").onclick=async()=>{try{await navigator.clipboard.writeText(code);$("#clubStatus").textContent="Code copié."}catch{$("#clubStatus").textContent="Copie ce code : "+code}};
  $("#clubLeave").onclick=async()=>{const A=clubApi();
    if(!DEMO){if(!A||GUEST){$("#clubStatus").textContent="Connecte-toi pour quitter ce club.";return}
      try{await A.quitter(code)}catch(err){$("#clubStatus").textContent=refusBase(err)||(err&&err.code==="unavailable"?"Pas de réseau. Réessaie quand tu es connecté.":"Impossible de quitter le club pour l’instant.");return}}
    clubForget(code);if(C.ready){fiExt();mergeAll();reindex()}clubStop();renderClubs();exToast("Club quitté. Tes partages dans ce club ne sont plus visibles.");if(!DEMO){CLUB.t=0;clubsLoad()}};
  $("#chatForm").onsubmit=async e=>{e.preventDefault();const inp=$("#chatText"),text=clip(inp.value,500);if(!text||!myCodes().includes(code)||!canChat())return;
    const id=exId(),msg={club:code,text,at:Date.now(),nick:LG.nick};$("#chatSend").disabled=true;
    try{if(DEMO){const l=CH.by.demo=CH.by.demo||[];l.push(Object.assign({id},msg));LS.set("chat",CH.by.demo.slice(-200))}
      else{await DB.doc("biblio/"+UID).set({nick:myNick(),upd:Date.now()});await DB.collection("biblio/"+UID+"/msg").doc(id).set(msg);pruneMsgs(code)}
      inp.value="";paintChat()}
    catch(err){$("#clubStatus").textContent=refusBase(err)||(DENY(err)?"Écriture refusée : reconnecte-toi.":"Message non envoyé. Ton texte est conservé.")}
    finally{if($("#chatSend"))$("#chatSend").disabled=!canChat()}};
  paintChat()}
async function pruneMsgs(code){const mine=(CH.by[UID]||[]).filter(m=>m.club===code).sort((a,b)=>a.at-b.at);const extra=mine.slice(0,Math.max(0,mine.length-80));
  for(const m of extra){try{await DB.doc("biblio/"+UID+"/msg/"+m.id).delete()}catch(e){}}}
function paintChat(){const box=$("#chatLog");if(!box||!EX.club)return;const list=clubMessages(EX.club),me=DEMO?"demo":UID;
  box.innerHTML=list.length?list.map(m=>`<div class="chatbubble ${m._a===me?"mine":""}"><b>${esc(cleanNick(m.nick||""))||"?"}</b><time>${new Date(m.at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</time><p>${esc(m.text)}</p></div>`).join(""):'<p class="muted">Aucun message pour l’instant.</p>';box.scrollTop=box.scrollHeight}

/* ---------- Fiches en lot : une photo = une fiche (gratuit) ---------- */
function fiBatch(box){const can=!!IMP.sample,im=!!(IMP.caps&&IMP.caps.images);
  box.innerHTML=`<div class="ihead"><h1>Fiches en lot</h1><button class="linkbtn" type="button" id="batchBack">Retour</button></div>
   <p class="lgsub">Une photo par cours : Claude fait une fiche pour chaque photo. Tu relis, puis tu gardes celles que tu veux. Elles restent privées.</p>
   ${GUEST?`<p class="guestnote"><b>Mode invité.</b> Tes fiches restent sur ce téléphone.</p>`:""}
   <div class="iform"><label class="lab" for="batchMat">Matière</label><select class="inp" id="batchMat">${(C.matsAll||C.mats||[]).map(m=>`<option value="${esc(m.id)}">${esc(m.nom)}</option>`).join("")}</select>
   <label class="lab" for="batchFiles">Photos des cours (20 maximum)</label><input id="batchFiles" type="file" class="inp" multiple accept="image/jpeg,image/png,image/webp" ${can&&im?"":"disabled"}>
   <div class="exrow"><button class="btn light" id="batchRun" type="button" ${can&&im?"":"disabled"}>Faire les fiches</button><button id="batchStop" type="button" class="btn ghost" hidden>Arrêter</button></div>
   <p id="batchStat" role="status">${!can?"La lecture des photos demande d’ouvrir la page connecté sur claude.ai.":!im?"Les images ne sont pas disponibles dans cette session.":""}</p><div id="batchResults"></div></div>`;
  $("#batchBack").onclick=()=>{if(EX.batchCtl)EX.batchCtl.abort();FI.mode="list";renderFiches()};
  $("#batchRun").onclick=batchGenerate;$("#batchStop").onclick=()=>EX.batchCtl&&EX.batchCtl.abort();paintBatch()}
async function batchGenerate(){if(EX.batchBusy||!IMP.sample)return;const files=[...$("#batchFiles").files],st=$("#batchStat");if(!files.length||files.length>20){st.textContent="Choisis entre 1 et 20 photos.";return}
  if(!(IMP.caps&&IMP.caps.images)){st.textContent="Les images ne sont pas disponibles dans cette session.";return}
  EX.batchBusy=true;EX.batchCtl=new AbortController();const ctl=EX.batchCtl,mid=$("#batchMat").value;EX.batch=[];$("#batchRun").disabled=true;$("#batchStop").hidden=false;
  for(let i=0;i<files.length;i++){if(ctl.signal.aborted)break;st.textContent=`Lecture ${i+1}/${files.length} : ${files[i].name}`;
    try{const pic=await fixImage(files[i],IMP.caps.images);const d=await IMP.sample.json('Lis uniquement le cours présent dans cette photo. Crée une fiche de révision fidèle en français, sans inventer. Réponds en JSON {"titre":"...","essentiel":["..."],"defs":[{"t":"...","d":"..."}],"cles":[{"t":"...","d":"..."}],"pieges":["..."]}. Matière : '+matName(mid),{images:[pic],signal:ctl.signal});const n=normFiche(d||{});if(!n.essentiel.length&&!n.defs.length&&!n.cles.length)throw new Error("Aucun contenu lisible.");EX.batch.push({...n,mat:mid,matNom:matName(mid),vis:"moi",saved:false,source:files[i].name})}
    catch(e){if(ctl.signal.aborted)break;EX.batch.push({error:sampleErr(e),source:files[i].name})}paintBatch()}
  EX.batchBusy=false;EX.batchCtl=null;if($("#batchRun"))$("#batchRun").disabled=false;if($("#batchStop"))$("#batchStop").hidden=true;if($("#batchStat"))$("#batchStat").textContent=ctl.signal.aborted?"Arrêté. Les fiches déjà faites restent là.":"Relis chaque fiche, puis enregistre celles que tu veux garder."}
function paintBatch(){const z=$("#batchResults");if(!z)return;z.innerHTML=EX.batch.map((f,i)=>f.error?`<p role="alert">${esc(f.source)} : ${esc(f.error)}</p>`:`<article class="batchfiche"><h3>${esc(f.titre)}</h3>${ficheBody(f)}<button class="btn light" type="button" data-save-batch="${i}" ${f.saved?"disabled":""}>${f.saved?"Enregistrée ✓":"Enregistrer en privé"}</button><p data-batch-status="${i}" role="status"></p></article>`).join("");
  z.querySelectorAll("[data-save-batch]").forEach(b=>b.onclick=async()=>{const f=EX.batch[+b.dataset.saveBatch];if(!f||f.saved||f.saving)return;f.saving=true;b.disabled=true;const id=exId(),doc={...normFiche(f),id,mat:f.mat,matNom:f.matNom,vis:"moi",auteur:myNick(),src:"cours",cree:new Date().toISOString(),ordre:Date.now()};
    try{const where=await putDoc("fiche",true,id,doc);if(where==="db")FI.mine[id]=doc;P.fc=(P.fc||0)+1;saveP();fiExt();f.saved=true;f.saving=false;checkRewards();paintBatch()}catch(e){f.saving=false;b.disabled=false;const st=z.querySelector(`[data-batch-status="${b.dataset.saveBatch}"]`);if(st)st.textContent=writeErr(e)}})}

/* ================= APERÇU LOCAL ISOLÉ =================
   Activé seulement sans window.claude.use (fichier ouvert hors Claude).
   Préfixe localStorage p26_demo_. Ces exemples ne vont jamais dans le hub. */
function bootDemo(){
  const raw={
    maths:{nom:"Mathématiques",court:"Maths",suit:"#6F63A8",titre:"Second degré",items:[
      ["Combien vaut le discriminant de x² − 5x + 6 ?","1",["−1","25","6"],"Δ = b² − 4ac = 25 − 24 = 1."],
      ["Quelles sont les racines de x² − 5x + 6 ?","2 et 3",["1 et 6","−2 et −3","0 et 5"],"(x − 2)(x − 3) = x² − 5x + 6."],
      ["Si Δ < 0, combien y a-t-il de racines réelles ?","Aucune",["Une","Deux","Trois"],"Un discriminant négatif ne donne aucune racine réelle."],
      ["Si Δ = 0, quelle est la racine de ax² + bx + c ?","−b / (2a)",["b / (2a)","−c / a","b / a"],"Il existe une racine double égale à −b / (2a)."],
      ["Quel est le sommet de la courbe de (x − 2)² + 3 ?","(2 ; 3)",["(−2 ; 3)","(3 ; 2)","(2 ; −3)"],"Dans la forme (x − α)² + β, le sommet est (α ; β)."],
      ["Comment factoriser x² − 9 ?","(x − 3)(x + 3)",["(x − 9)(x + 1)","(x − 3)²","(x + 3)²"],"On utilise a² − b² = (a − b)(a + b)."],
      ["Quel est le minimum de x² + 4 ?","4",["0","−4","2"],"x² est positif ou nul ; le minimum vaut 4, atteint en 0."],
      ["Quel est le coefficient de x² dans 3x² − 2x + 1 ?","3",["−2","1","2"],"Le coefficient a est le nombre qui multiplie x²."],
      ["Quelle est la somme des racines de x² − 7x + 10 ?","7",["10","−7","5"],"La somme des racines vaut −b / a, soit 7."],
      ["Quel est le signe de (x − 1)(x − 4) pour 1 < x < 4 ?","Négatif",["Positif","Nul","Impossible à déterminer"],"Un facteur positif et un facteur négatif donnent un produit négatif."]]},
    ses:{nom:"Sciences économiques et sociales",court:"SES",suit:"#AC773A",titre:"Le marché concurrentiel",items:[
      ["Sur un marché, l’offre correspond aux quantités…","que les vendeurs souhaitent vendre",["que les acheteurs souhaitent acheter","déjà consommées","gratuites"],"L’offre décrit les quantités proposées par les vendeurs pour différents prix."],
      ["La demande correspond aux quantités…","que les acheteurs souhaitent acheter",["produites l’an dernier","stockées par l’État","offertes gratuitement"],"La demande dépend notamment du prix et du revenu."],
      ["Toutes choses égales par ailleurs, une hausse du prix réduit généralement…","la quantité demandée",["le coût fixe","le nombre de produits existants","le revenu de tous"],"La courbe de demande est généralement décroissante."],
      ["Le prix d’équilibre égalise…","l’offre et la demande",["les salaires et les profits","les impôts et les dépenses","tous les revenus"],"À l’équilibre, les quantités offertes et demandées coïncident."],
      ["Un prix supérieur à l’équilibre tend à créer…","un excédent d’offre",["une pénurie","une demande infinie","un prix nul"],"Les vendeurs proposent davantage que les acheteurs ne souhaitent acheter."],
      ["Un prix inférieur à l’équilibre tend à créer…","une pénurie",["un excédent d’offre","une offre infinie","un profit certain"],"La quantité demandée dépasse alors la quantité offerte."],
      ["Une entreprise preneuse de prix…","ne peut pas influencer seule le prix du marché",["fixe tous les prix","interdit les concurrents","vend gratuitement"],"En concurrence parfaite, chaque acteur est trop petit pour fixer le prix."],
      ["Le coût marginal mesure…","le coût d’une unité supplémentaire",["la recette totale","le bénéfice total","le salaire moyen"],"Il mesure l’augmentation du coût total liée à une unité supplémentaire."],
      ["Un monopole désigne un marché avec…","un seul vendeur",["un seul acheteur","aucun vendeur","des prix identiques partout"],"Un monopole est une structure de marché avec un unique offreur."],
      ["Une externalité est un effet sur un tiers…","sans compensation monétaire directe",["toujours positif","toujours volontaire","toujours interdit"],"L’effet peut être positif ou négatif et n’est pas directement payé."]]},
    amc:{nom:"Anglais monde contemporain",court:"AMC",suit:"#487F98",titre:"Media and information",items:[
      ["What is a headline?","The title of a news article",["A full interview","A reader’s address","An advertisement only"],"A headline introduces the topic and attracts attention."],
      ["What does “reliable” mean?","Trustworthy",["Expensive","Recent only","Anonymous"],"A reliable source can be trusted, but claims still need checking."],
      ["What is a source?","Where information comes from",["A printing error","A newspaper price","A type of camera"],"Identifying the source helps assess a claim."],
      ["What is an opinion?","A personal view or judgement",["An automatically proven fact","A date","A quotation without context"],"An opinion expresses a view rather than a directly verifiable fact."],
      ["What does “to fact-check” mean?","To verify factual claims",["To share without reading","To delete opinions","To write headlines"],"Fact-checking involves examining evidence for claims."],
      ["What is a bias?","A tendency to favour a viewpoint",["A neutral date","An interview length","A spelling rule"],"Bias can affect selection and presentation of information."],
      ["Which action helps verify a story?","Comparing independent reliable sources",["Counting emojis","Trusting the headline alone","Ignoring the date"],"Independent corroboration is more useful than repeated copies of one claim."],
      ["What is misinformation?","False or inaccurate information",["Every opinion","All online news","Only advertisements"],"Misinformation is false or inaccurate, regardless of intent."],
      ["What is an eyewitness?","Someone who directly saw an event",["A newspaper owner","An anonymous computer","A future reader"],"An eyewitness reports something personally observed."],
      ["What is freedom of the press?","The ability of media to report without undue censorship",["A guarantee that all news is true","Free newspapers only","The absence of journalists"],"Press freedom concerns the ability to gather and publish information."]]}};
  C.M0={};C.chaps0={};let order=0;
  Object.entries(raw).forEach(([id,m])=>{C.M0[id]={id,nom:m.nom,court:m.court,suit:m.suit,ordre:order++};const cid="demo-"+id,qs=m.items.map((r,i)=>({id:cid+"-q"+i,q:r[0],ok:r[1],no:r[2],why:r[3]}));C.chaps0[cid]={id:cid,mat:id,titre:m.titre,court:m.titre,src:"programme",ordre:0,paquets:[{id:cid+"-p",nom:"Les essentiels",cartes:qs.map((q,i)=>({id:cid+"-c"+i,q:q.q,r:q.ok,i:String(i+1)}))}],quiz:[{nom:m.titre,d:"10 questions · exemple",qs}]}});
  const next=new Date(NOW);next.setDate(next.getDate()+3);C.ech0=[{id:"demo-controle",mat:"maths",titre:"Second degré",date:isoOf(next),type:"controle",chap:["demo-maths"]}];C.etat={};IMP.ech=C.ech0.map(e=>({...e}));
  UID="demo";LG.nick=cleanNick(LS.get("nick","Luc"));LG.ok=true;LG.ref=null;GUEST=true;
  if(!LS.get("demo-initialized",false)){P.x[TODAY_ISO]=84;P.j[TODAY_ISO]=8;P.lg={codes:["REVIS"],mine:{REVIS:"Les as de Première"},joined:{REVIS:Date.now()}};LS.set("demo-initialized",true);saveP()}
  CH.by.demo=LS.get("chat",[]);
  LG.rows=[{id:"demo",nick:LG.nick,sem:WEEK,xp:weekSum(),div:0,codes:["HUB",...myCodes()]},{id:"example-1",nick:"Camille · exemple",sem:WEEK,xp:126,div:1,codes:["HUB"]},{id:"example-2",nick:"Noé · exemple",sem:WEEK,xp:68,div:0,codes:["HUB"]}];
  FI.prete={"demo-fiche":{id:"demo-fiche",mat:"maths",matNom:"Mathématiques",titre:"Second degré",essentiel:["Calculer Δ = b² − 4ac pour déterminer le nombre de racines réelles."],defs:[{t:"Discriminant",d:"Nombre Δ qui détermine le nombre de racines réelles."}],cles:[{t:"Δ > 0",d:"Deux racines réelles distinctes."}],pieges:["Ne pas oublier le signe moins devant b."],src:"programme"}};
  fiExt();onContent()}


/* ================= XP ET PIÈCES : l'explication en trois compteurs ================= */
function xpExplainHTML(){const t=totalXP(),w=weekSum(),c=coins();
  return `<div class="xpx"><div><b>${fmtN(t)}</b><span>XP total</span><small>Tout ce que tu as gagné depuis le début. Il ne baisse jamais.</small></div>`+
    `<div><b>${fmtN(w)}</b><span>XP de la semaine</span><small>Ton score de ligue. Il repart à 0 chaque lundi, ton total reste.</small></div>`+
    `<div class="co"><b>${fmtN(c)}</b><span>Pièces</span><small>1 XP gagné = 1 pièce. Elles restent jusqu’à ce que tu les dépenses en boutique.</small></div></div>`}

/* ================= MODE ADMIN ================= */
const AD={need:true,tab:"el",sgt:"tout",ivc:null,bl:null,users:null,sig:null,jour:null,mat:null,tid:null,give:null,busy:false};
function admTime(ms){if(!ms)return "jamais";const d=Math.round((Date.now()-ms)/60000);if(d<2)return "à l’instant";if(d<60)return "il y a "+d+" min";const h=Math.round(d/60);if(h<24)return "il y a "+h+" h";const j=Math.round(h/24);return j<2?"hier":"il y a "+j+" jours"}
const admDate=s=>{try{return new Date(s).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}catch(e){return ""}};
const admUid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(x||""));
async function admUsers(force){if(AD.users&&!force)return AD.users;if(!window.P26||!window.P26.admin)throw Object.assign(new Error("Panneau admin indisponible ici."),{code:"unavailable"});
  const raw=await window.P26.admin.users();
  AD.users=raw.filter(u=>admUid(u.id)).map(u=>{const l=u.lig||{};return {id:u.id,pseudo:u.pseudo||"?",role:u.role,cree:u.cree,act:u.act||0,tot:+l.tot||0,sem:l.sem===WEEK?(+l.xp||0):0,div:+l.div||0,nch:typeof l.nch==="number"?l.nch:(u.nbib||0)}});
  return AD.users}
function renderAdmin(){AD.need=false;const box=$("#adm");if(!box)return;if(!ADM()){box.innerHTML="";return}
  box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="adBack">Retour</button></div>
   <h1 class="adh">Administration</h1>
   <p class="note" style="margin:0 0 14px">Toi seul vois cet écran. Ce que tu fais ici touche tout le site : relis avant de valider.</p>
   <div class="pick sm" id="adTabs">${[["el","Élèves"],["cb","Comptes"],["pg","Programme"],["sg","Signalements"],["an","Annonce"],["iv","Inviter"],["jr","Journal"]].map(([k,l])=>`<button type="button" class="${AD.tab===k?"on":""}" data-t="${k}">${l}</button>`).join("")}</div>
   <div id="adBody"></div>`;
  $("#adBack").onclick=()=>go("profil");
  box.querySelectorAll("#adTabs button").forEach(b=>b.onclick=()=>{AD.tab=b.dataset.t;renderAdmin()});
  const z=$("#adBody");(({el:admEleves,cb:admComptes,pg:admProg,sg:admSig,an:admAnnonce,iv:admInviter,jr:admJour})[AD.tab]||admEleves)(z)}

/* ----- Élèves ----- */
async function admEleves(z){
  if(!AD.users){z.innerHTML=`<p class="loading">Chargement des élèves…</p>`;try{await admUsers()}catch(e){z.innerHTML=`<p class="istat err">${esc(writeErr(e))}</p>`;return}if(view!=="admin"||AD.tab!=="el")return}
  const L=AD.users.slice().sort((a,b)=>(b.act||0)-(a.act||0));
  z.innerHTML=`<p class="note" style="margin:14px 0 10px">${L.length} compte${L.length>1?"s":""}. Tu vois ce que la ligue montre déjà à tous (pseudo, XP, division), la dernière activité et le nombre de chapitres importés. Le contenu des cours et la progression de chacun restent privés.</p>
   <div class="exrow"><button class="btn ghost" type="button" id="adRef">Actualiser</button><span class="istat" id="adSt" role="status"></span></div>
   <ul class="adl">${L.map((u,i)=>`<li>
     <div class="adt"><b class="adp"></b><small>${u.role==="admin"?"admin · ":""}${DIVS[Math.min(3,u.div)]||"Bronze"} · inscrit le ${esc(admDate(u.cree))} · actif ${esc(admTime(u.act))}</small></div>
     <div class="adn"><span><b>${fmtN(u.tot)}</b>XP total</span><span><b>${fmtN(u.sem)}</b>cette semaine</span><span><b>${fmtN(u.nch)}</b>chapitres</span></div>
     <button class="btn ghost adgb" type="button" data-i="${i}">${AD.give===u.id?"Fermer":"Donner XP ou pièces"}</button>
     ${AD.give===u.id?`<div class="adgive"><div class="adrow"><label>XP<input class="inp" type="number" inputmode="numeric" min="0" step="1" id="gXp" value="50"></label><label>Pièces<input class="inp" type="number" inputmode="numeric" min="0" step="1" id="gCo" value="0"></label></div>
       <label class="lab" for="gWhy">Pourquoi <span>(il le verra)</span></label><input class="inp" id="gWhy" maxlength="80" placeholder="Ex. Gagnant du tournoi de vendredi">
       <p class="note" style="margin:8px 0 0">L’XP donné compte dans son XP total et lui donne autant de pièces. Il ne compte pas dans le classement de la semaine.</p>
       <div class="exrow"><button class="btn light" type="button" id="gGo">Envoyer le cadeau</button><span class="istat" id="gSt" role="status"></span></div></div>`:""}</li>`).join("")}</ul>`;
  z.querySelectorAll(".adl .adp").forEach((b,i)=>b.textContent=L[i].pseudo);
  $("#adRef").onclick=async()=>{$("#adSt").textContent="…";try{await admUsers(true);admEleves(z)}catch(e){$("#adSt").className="istat err";$("#adSt").textContent=writeErr(e)}};
  z.querySelectorAll(".adgb").forEach(b=>b.onclick=()=>{const u=L[+b.dataset.i];AD.give=AD.give===u.id?null:u.id;admEleves(z);const f=$("#gXp");if(f)f.focus()});
  const go2=$("#gGo");if(go2)go2.onclick=async()=>{const u=L.find(x=>x.id===AD.give),st=$("#gSt");if(!u)return;
    const xp=Math.round(+$("#gXp").value||0),co=Math.round(+$("#gCo").value||0),why=clip($("#gWhy").value,80);
    if(!Number.isFinite(xp)||!Number.isFinite(co)||xp<0||co<0||xp>1e12||co>1e12||(!xp&&!co)){st.className="istat err";st.textContent="Entre un nombre positif d’XP ou de pièces (jusqu’à mille milliards).";return}
    if(!confirm(`Donner ${xp?fmtN(xp)+" XP":""}${xp&&co?" et ":""}${co?fmtN(co)+" pièces":""} à ${u.pseudo} ?`))return;
    go2.disabled=true;st.className="istat";st.textContent="Envoi…";
    const id=Date.now().toString(36)+Math.random().toString(36).slice(2,7),g={xp,co,raison:why,par:myNick()||(window.P26&&window.P26.profile&&window.P26.profile.pseudo)||"Admin",date:new Date().toISOString()};
    try{await DB.doc("data/users/"+u.id+"/cadeau/"+id).set(g);
      try{await DB.doc("data/users/"+UID+"/journal/"+id).set(Object.assign({pour:u.id,pseudo:u.pseudo},g));AD.jour=null}catch(e){}
      AD.give=null;admEleves(z);toast(`<span class="tm">+</span><div><b>Cadeau envoyé à ${esc(u.pseudo)}</b><span>Il le verra à sa prochaine ouverture du site.</span></div>`)}
    catch(e){go2.disabled=false;st.className="istat err";st.textContent=writeErr(e)}}}

/* ----- Programme ----- */
function progFetchAll(pm){return new Promise(res=>{if(PG.req[pm]===2)return res();progFetch(pm,res)})}
function admProgDoc(tid){const pd=progDocOf(tid);const d=pd.d;const nc=d?(d.paquets||[]).reduce((a,p)=>a+(p.cartes||[]).length,0):0,nq=d?(d.quiz||[]).reduce((a,z)=>a+(z.qs||[]).length,0):0;return Object.assign(pd,{nc,nq})}
const CLS_OF=pm=>Object.entries(CLS).filter(([k,K])=>K.tronc.map(x=>x==="lvb"?"":x).includes(pm)||K.spes.includes(pm)||(K.tronc.includes("lvb")&&LVB.includes(pm))).map(([k])=>k==="1G"?"Générale":k==="1STMG"?"STMG":"Bac pro MELEC");
async function admProg(z){
  if(!AD.mat){const c=clsOk(P.cls);AD.mat=c?clsMats(c)[0]:"maths"}
  const pm=AD.mat,M=MATDEF[pm];
  z.innerHTML=`<p class="note" style="margin:14px 0 10px">Le Programme est le même pour tous les élèves d’une classe. Tu peux remplacer les cartes d’un thème par une version corrigée, ou retirer des cartes pour tout le monde. Pour retirer une carte précise, tu peux aussi aller dans Cours › Programme avec le mode admin activé.</p>
   <label class="lab" for="adMat">Matière</label><select id="adMat" class="inp">${Object.entries(MATDEF).map(([id,m])=>`<option value="${id}"${id===pm?" selected":""}>${esc(m.nom)} · ${esc(CLS_OF(id).join(", "))}</option>`).join("")}</select>
   <div id="adTh"><p class="loading">Chargement du Programme…</p></div>`;
  $("#adMat").onchange=e=>{AD.mat=e.target.value;AD.tid=null;admProg(z)};
  await progFetchAll(pm);if(view!=="admin"||AD.tab!=="pg"||AD.mat!==pm)return;
  const th=$("#adTh");
  th.innerHTML=`<ul class="adl">${M.themes.map(t=>{const x=admProgDoc(t.id),nm=Object.keys(x.masque).length;return `<li class="${AD.tid===t.id?"open":""}"><button type="button" class="adth" data-t="${esc(t.id)}"><b>${esc(t.t)}</b><small>${x.nc} cartes · ${x.nq} questions${x.corrige?" · corrigé par toi":""}${nm?" · "+nm+" retirée"+(nm>1?"s":""):""}</small></button>${AD.tid===t.id?admThemeHTML(t,x):""}</li>`}).join("")}</ul>`;
  th.querySelectorAll(".adth").forEach(b=>b.onclick=()=>{AD.tid=AD.tid===b.dataset.t?null:b.dataset.t;admProg(z)});
  if(AD.tid)admThemeBind(z,M.themes.find(t=>t.id===AD.tid))}
function admThemeHTML(t,x){const ids=Object.keys(x.masque),all=x.d?[...(x.d.paquets||[]).flatMap(p=>p.cartes||[]),...(x.d.quiz||[]).flatMap(z=>z.qs||[])]:[];
  const lab=id=>{const c=all.find(y=>y.id===id);return c?(c.r||c.q||id):id};
  return `<div class="adtd">
   ${ids.length?`<p class="lab">Retirées pour tous</p><ul class="admq">${ids.map(id=>`<li><span>${tex(lab(id))}</span><button class="linkbtn" type="button" data-un="${esc(id)}">Remettre</button></li>`).join("")}</ul>`:""}
   <p class="lab">Remplacer les cartes de ce thème</p>
   <ol class="steps2"><li>Copie le texte ci-dessous et colle-le dans ton Claude.</li><li>Colle sa réponse (le JSON) dans la case du dessous.</li><li>Touche « Remplacer pour tout le monde ».</li></ol>
   <div class="exrow"><button class="btn ghost" type="button" id="tCopy">Copier le texte pour Claude</button><span class="istat" id="tCSt" role="status"></span></div>
   <textarea class="inp" id="tJson" rows="5" placeholder='{"paquets":[…],"quiz":[…]}'></textarea>
   <div class="exrow"><button class="btn light" type="button" id="tGo">Remplacer pour tout le monde</button>${x.corrige?`<button class="btn ghost" type="button" id="tBack">Revenir au contenu d’origine</button>`:""}<span class="istat" id="tSt" role="status"></span></div></div>`}
function admPrompt(t){const pm=t.id.slice(0,t.id.lastIndexOf("-")),M=MATDEF[pm],cl=CLS_OF(pm).join(" / ");
  return `Tu prépares des cartes de révision pour des élèves de Première (${cl}, lycée, France), matière « ${M.nom} », d’après le programme officiel de l’Éducation nationale.
Thème : « ${t.t} ». Notions du programme : ${t.n}.
Règles : reste strictement dans le programme officiel ; définitions exactes et simples ; pas d’invention ; français correct. 14 à 20 cartes réparties en 2 ou 3 paquets (ex. « Notions », « Dates et repères », « Méthode »), et 8 à 10 questions de quiz à 4 choix. Formules en LaTeX entre $…$.
Réponds uniquement avec ce JSON :
{"paquets":[{"nom":"Notions","cartes":[{"r":"recto court","v":"verso","q":"consigne courte"}]}],"quiz":[{"q":"question","ok":"bonne réponse","no":["fausse 1","fausse 2","fausse 3"],"why":"explication"}]}`}
function progNorm(d,tid){const st=Date.now().toString(36);
  const pq=(Array.isArray(d&&d.paquets)?d.paquets:[]).slice(0,4).map((p,pi)=>({k:"p"+pi,nom:clip(p&&p.nom,40)||"Cartes",cartes:(Array.isArray(p&&p.cartes)?p.cartes:[]).filter(c=>c&&c.r&&c.v).slice(0,30).map((c,ci)=>({id:"pa."+tid+"."+st+"."+pi+"."+ci,r:clip(c.r,160),v:clip(c.v,400),q:clip(c.q,60)}))})).filter(p=>p.cartes.length);
  const qs=(Array.isArray(d&&d.quiz)?d.quiz:[]).filter(q=>q&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2).slice(0,15).map((q,qi)=>({id:"pa."+tid+"."+st+".q"+qi,q:clip(q.q,240),ok:clip(q.ok,160),no:q.no.slice(0,3).map(x=>clip(x,160)),why:clip(q.why,300)}));
  return {pq,qs}}
function parseLooseJSON(txt){let t=String(txt||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)throw new Error("json");return JSON.parse(t.slice(a,b+1))}
function admThemeBind(z,t){if(!t)return;const pm=t.id.slice(0,t.id.lastIndexOf("-"));
  $("#tCopy").onclick=async()=>{const p=admPrompt(t);$("#tJson").placeholder="Colle ici la réponse de Claude";try{await navigator.clipboard.writeText(p);$("#tCSt").textContent="Copié."}catch(e){$("#tJson").value=p;$("#tJson").select();$("#tCSt").textContent="Le texte est dans la case : copie-le, puis remplace-le par la réponse."}};
  z.querySelectorAll("[data-un]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await admMasque(t.id,[b.dataset.un],false);admProg(z)}catch(e){b.disabled=false;$("#tSt").className="istat err";$("#tSt").textContent=writeErr(e)}});
  $("#tGo").onclick=async()=>{const st=$("#tSt");let d;try{d=parseLooseJSON($("#tJson").value)}catch(e){st.className="istat err";st.textContent="Ce n’est pas un JSON lisible. Colle toute la réponse de Claude.";return}
    const {pq,qs}=progNorm(d,t.id);if(pq.reduce((a,p)=>a+p.cartes.length,0)<4){st.className="istat err";st.textContent="Il faut au moins 4 cartes complètes (recto et verso).";return}
    if(!confirm(`Remplacer « ${t.c} » pour tout le monde par ${pq.reduce((a,p)=>a+p.cartes.length,0)} cartes et ${qs.length} questions ?`))return;
    $("#tGo").disabled=true;st.className="istat";st.textContent="Enregistrement…";
    const doc={tid:t.id,corr:true,mat:pm,titre:t.t,paquets:pq,quiz:qs.length?[{nom:"Quiz · "+t.c,d:t.t,qs}]:[],masque:{},par:myNick()||(window.P26&&window.P26.profile&&window.P26.profile.pseudo)||"Admin",date:new Date().toISOString()};
    try{await DB.doc("programme/"+t.id).set(doc);PG.shared[t.id]=doc;mergeAll();reindex();toast(`<span class="tm">✓</span><div><b>Programme mis à jour</b><span>${esc(t.c)} · pour tout le monde</span></div>`);admProg(z)}
    catch(e){$("#tGo").disabled=false;st.className="istat err";st.textContent=writeErr(e)}};
  if($("#tBack"))$("#tBack").onclick=async()=>{const st=$("#tSt");if(!confirm("Revenir aux cartes d’origine pour ce thème ? Ta version sera effacée."))return;
    try{const sn=await DB.doc("programme/"+t.id).get(),cur=(sn.exists&&sn.data())||{},m=cur.masque||{};if(Object.keys(m).length){const doc={tid:t.id,masque:m};await DB.doc("programme/"+t.id).set(doc);PG.shared[t.id]=doc}else{await DB.doc("programme/"+t.id).delete();delete PG.shared[t.id]}mergeAll();reindex();admProg(z)}
    catch(e){st.className="istat err";st.textContent=writeErr(e)}}}
async function admMasque(tid,ids,on){if(!tid||!/^[a-z]+-[a-z0-9]+$/.test(tid))throw Object.assign(new Error("Carte inconnue."),{code:"invalid_argument"});
  let cur=null;const sn=await DB.doc("programme/"+tid).get();cur=(sn.exists&&sn.data())||{tid};const m=Object.assign({},cur.masque||{});ids.forEach(i=>{if(on)m[i]=1;else delete m[i]});
  const doc=Object.assign({},cur,{tid,masque:m});
  if(!(Array.isArray(doc.paquets)&&doc.paquets.length)&&!Object.keys(m).length){await DB.doc("programme/"+tid).delete();delete PG.shared[tid]}
  else{await DB.doc("programme/"+tid).set(doc);PG.shared[tid]=doc}
  mergeAll();reindex();if(view!=="admin")render()}
const tidOfCard=id=>{const m=/^p[gab]\.([a-z]+-[a-z0-9]+)\./.exec(String(id||""));return m?m[1]:null};

/* ----- Signalements : cartes (par défaut), pseudos, bugs (paquet 1) ----- */
const SG_TYPES=[["tout","Tous"],["carte","Cartes"],["pseudo","Pseudos"],["bug","Bugs"]];
const SG_MOTIFS={insulte:"Pseudo insultant",usurpation:"Se fait passer pour quelqu’un",autre:"Autre"};
const sgType=r=>r&&(r.type==="pseudo"||r.type==="bug")?r.type:"carte";
async function admSig(z){z.innerHTML=`<p class="loading">Chargement des signalements…</p>`;
  let L=[];try{const s=await DB.collection("signalements").get();L=s.docs.map(d=>Object.assign({},d.data()||{},{_id:d.id})).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));try{await admUsers()}catch(e){}}
  catch(e){z.innerHTML=`<p class="istat err">${esc(writeErr(e))}</p>`;return}
  await Promise.all([...new Set(L.map(r=>tidOfCard(r.carte)).filter(Boolean).map(t=>t.slice(0,t.lastIndexOf("-"))))].map(progFetchAll));
  if(view!=="admin"||AD.tab!=="sg")return;
  const ft=SG_TYPES.some(t=>t[0]===AD.sgt)?AD.sgt:"tout",nb=k=>L.filter(r=>sgType(r)===k).length;
  if(ft!=="tout")L=L.filter(r=>sgType(r)===ft);
  const real=id=>{if(C.cards[id])return C.cards[id].c.r;const t=tidOfCard(id);const d=t&&progDocOf(t).d;const c=d&&[...(d.paquets||[]).flatMap(p=>p.cartes||[]),...(d.quiz||[]).flatMap(z=>z.qs||[])].find(x=>x.id===id);return c?(c.r||c.q):null};
  const who=id=>{const u=(AD.users||[]).find(x=>x.id===id);return u?u.pseudo:"un élève"};
  const tabs=`<div class="pick sm" id="sgTabs" style="margin-top:12px">${SG_TYPES.map(([k,l])=>`<button type="button" class="${ft===k?"on":""}" data-sgt="${k}">${l}${k!=="tout"&&nb(k)?" · "+nb(k):""}</button>`).join("")}</div>`;
  z.innerHTML=tabs+(L.length?`<p class="note" style="margin:14px 0 10px">${L.length} signalement${L.length>1?"s":""}. « Traité » l’efface de la liste.</p><ul class="adl">${L.map((r,i)=>{const t=sgType(r);return `<li data-type="${t}"><div class="adt"><span class="adtag">${t==="pseudo"?"Pseudo":t==="bug"?"Bug":"Carte"}</span><b class="sr"></b><small>${esc(admDate(r.date))} · <span class="sw2"></span></small></div><p class="adtx"></p>${t==="bug"?`<p class="adtx admeta"></p>`:""}
     <div class="exrow">${t==="carte"&&tidOfCard(r.carte)?`<button class="btn ghost" type="button" data-hide="${i}">Retirer la carte pour tous</button>`:""}${t==="pseudo"&&admUid(r.cible)?`<button class="btn ghost" type="button" data-blk="${i}">Bloquer ce compte</button>`:""}<button class="btn ghost" type="button" data-done="${i}">Traité</button><span class="istat" id="sgSt${i}" role="status"></span></div></li>`}).join("")}</ul>`
    :`<p class="note" style="margin:14px 0">Aucun signalement${ft==="tout"?"":" de ce type"}. Quand un élève signale une carte fausse, un pseudo ou un bug, il apparaît ici.</p>`);
  z.querySelectorAll("#sgTabs button").forEach(b=>b.onclick=()=>{AD.sgt=b.dataset.sgt;admSig(z)});
  z.querySelectorAll(".adl li").forEach((li,i)=>{const r=L[i],t=sgType(r);li.querySelector(".sw2").textContent="par "+who(r.par);
    if(t==="pseudo"){li.querySelector(".sr").textContent=String(r.pseudo==null?"?":r.pseudo).slice(0,16);li.querySelector(".adtx").textContent="Motif : "+(SG_MOTIFS[r.motif]||"Autre")}
    else if(t==="bug"){li.querySelector(".sr").textContent="Écran : "+String(r.vue||"inconnu").slice(0,24);li.querySelector(".adtx").textContent=String(r.texte||"").slice(0,500);
      li.querySelector(".admeta").textContent=["Version "+String(r.build||"?").slice(0,20),r.err?"Erreur : "+String(r.err).slice(0,200):"",r.ua?String(r.ua).slice(0,120):""].filter(Boolean).join(" · ")}
    else{const rr=real(r.carte);li.querySelector(".sr").textContent=rr||((r.recto||r.carte||"Carte")+" (texte envoyé par l’élève)");li.querySelector(".adtx").textContent=r.texte||""}});
  z.querySelectorAll("[data-hide]").forEach(b=>b.onclick=async()=>{const r=L[+b.dataset.hide],st=$("#sgSt"+b.dataset.hide);b.disabled=true;
    try{await admMasque(tidOfCard(r.carte),[r.carte],true);st.textContent="Carte retirée du Programme."}catch(e){b.disabled=false;st.className="istat err";st.textContent=writeErr(e)}});
  z.querySelectorAll("[data-blk]").forEach(b=>b.onclick=async()=>{const r=L[+b.dataset.blk],st=$("#sgSt"+b.dataset.blk);
    if(!confirm(`Bloquer « ${String(r.pseudo||"?").slice(0,16)} » ? Ce compte ne pourra plus se connecter.`))return;b.disabled=true;
    try{await admBloquer(r.cible,true);st.className="istat";st.textContent="Compte bloqué."}catch(e){b.disabled=false;st.className="istat err";st.textContent=admErr(e)}});
  z.querySelectorAll("[data-done]").forEach(b=>b.onclick=async()=>{const r=L[+b.dataset.done],st=$("#sgSt"+b.dataset.done);b.disabled=true;
    try{await DB.doc("signalements/"+r._id).delete();admSig(z)}catch(e){b.disabled=false;st.className="istat err";st.textContent=writeErr(e)}})}

/* ----- Paquet 1 : appels aux fonctions de la base (refusées par la base à qui n'est pas admin) ----- */
const admRpc=(n,a)=>{if(!window.P26||!window.P26.rpc)return Promise.reject(Object.assign(new Error("indisponible"),{code:"unavailable"}));return window.P26.rpc(n,a||{})};
const admErr=e=>e&&e.code==="absent"?"Cette partie attend le fichier SQL du paquet 1 (sql/8-paquet1.sql).":e&&e.code==="refus"?(e.texte||"Refusé par la base."):e&&e.code==="unavailable"?"La base ne répond pas pour l’instant.":writeErr(e);
async function admBloquer(uid,on){if(!admUid(uid))throw Object.assign(new Error("compte"),{code:"refus",texte:"Compte inconnu."});const r=await admRpc("admin_bloquer",{p_uid:uid,p_bloque:!!on});AD.bl=null;return r}

/* ----- Comptes : bloquer, débloquer ----- */
async function admComptes(z){z.innerHTML=`<p class="loading">Chargement des comptes…</p>`;let U,B;
  try{[U,B]=await Promise.all([admUsers(true),admRpc("admin_bloques")])}catch(e){z.innerHTML=`<p class="istat err">${esc(admErr(e))}</p>`;return}
  if(view!=="admin"||AD.tab!=="cb")return;
  const bl={};(Array.isArray(B)?B:[]).forEach(b=>{if(b&&admUid(b.uid))bl[b.uid]=b});
  const L=U.slice().sort((a,b)=>(bl[b.id]?1:0)-(bl[a.id]?1:0)||String(a.pseudo).localeCompare(String(b.pseudo)));
  z.innerHTML=`<p class="note" style="margin:14px 0 10px">Un compte bloqué ne peut plus se connecter et disparaît du classement. Débloquer lui rend l’accès. Tu ne peux bloquer ni toi ni un autre admin.</p>
   <ul class="adl">${L.map((u,i)=>`<li${bl[u.id]?' class="adbl"':""}><div class="adt"><b class="adp"></b><small>${u.role==="admin"?"admin · ":""}inscrit le ${esc(admDate(u.cree))}${bl[u.id]?" · bloqué le "+esc(admDate(bl[u.id].cree)):""}</small></div>
     ${u.role!=="admin"&&u.id!==UID?`<div class="exrow"><button class="btn ghost" type="button" data-cb="${i}">${bl[u.id]?"Débloquer":"Bloquer"}</button><span class="istat" id="cbSt${i}" role="status"></span></div>`:""}</li>`).join("")}</ul>`;
  z.querySelectorAll(".adl .adp").forEach((b,i)=>b.textContent=L[i].pseudo);
  z.querySelectorAll("[data-cb]").forEach(b=>b.onclick=async()=>{const u=L[+b.dataset.cb],on=!bl[u.id],st=$("#cbSt"+b.dataset.cb);
    if(on&&!confirm(`Bloquer ${u.pseudo} ? Ce compte ne pourra plus se connecter.`))return;b.disabled=true;st.className="istat";st.textContent="…";
    try{await admBloquer(u.id,on);admComptes(z)}catch(e){b.disabled=false;st.className="istat err";st.textContent=admErr(e)}})}

/* ----- Annonce à tous ----- */
async function admAnnonce(z){
  z.innerHTML=`<p class="note" style="margin:14px 0 10px">Chaque élève reçoit une notification et voit un bandeau sur l’accueil jusqu’à la fin de l’annonce. 3 annonces par jour au plus.</p>
   <label class="lab" for="anTx">Texte (160 caractères au plus)</label><textarea class="inp" id="anTx" maxlength="160" rows="3" style="width:100%;font:inherit;font-size:16px"></textarea><small class="muted" id="anN">0/160</small>
   <label class="lab" for="anJ">Durée</label><select class="inp" id="anJ">${Array.from({length:14},(_,i)=>i+1).map(j=>`<option value="${j}"${j===7?" selected":""}>${j} jour${j>1?"s":""}</option>`).join("")}</select>
   <div class="exrow"><button class="btn light" type="button" id="anGo">Envoyer à tous</button><span class="istat" id="anSt" role="status"></span></div>
   <div class="sec"><h2>En cours</h2></div><div id="anL"><p class="loading">Chargement…</p></div>`;
  const tx=$("#anTx");tx.oninput=()=>{$("#anN").textContent=[...tx.value].length+"/160"};
  $("#anGo").onclick=async()=>{const t=tx.value.replace(/^\s+|\s+$/g,""),j=Math.round(+$("#anJ").value),st=$("#anSt");
    if(!t||[...t].length>160){st.className="istat err";st.textContent="Écris un texte de 1 à 160 caractères.";return}
    if(!confirm("Envoyer cette annonce à tous les élèves ?"))return;$("#anGo").disabled=true;st.className="istat";st.textContent="Envoi…";
    try{const n=await admRpc("admin_annonce",{p_texte:t,p_jours:Math.max(1,Math.min(14,j||7))});tx.value="";$("#anN").textContent="0/160";st.textContent="Annonce envoyée ("+fmtN(Math.max(0,Math.round(+n)||0))+" notifications).";admAnnonceListe()}
    catch(e){st.className="istat err";st.textContent=admErr(e)}$("#anGo").disabled=false};
  admAnnonceListe()}
async function admAnnonceListe(){const box=$("#anL");if(!box)return;let L;
  try{L=await window.P26.lire("annonces",q=>q.select("id,texte,fin").gt("fin",new Date().toISOString()))}catch(e){box.innerHTML=`<p class="istat err">${esc(admErr(e))}</p>`;return}
  L=(L||[]).filter(a=>a&&Number.isInteger(a.id)).sort((a,b)=>b.id-a.id);
  box.innerHTML=L.length?`<ul class="adl">${L.map((a,i)=>`<li><p class="adtx" style="margin:0"></p><div class="exrow"><small class="muted">jusqu’au ${esc(admDate(a.fin))}</small><button class="btn ghost" type="button" data-anr="${i}">Retirer</button></div></li>`).join("")}</ul>`:`<p class="muted">Aucune annonce en cours.</p>`;
  box.querySelectorAll(".adl .adtx").forEach((p,i)=>p.textContent=String(L[i].texte||""));
  box.querySelectorAll("[data-anr]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await admRpc("admin_annonce_retirer",{p_id:L[+b.dataset.anr].id});admAnnonceListe()}catch(e){b.disabled=false;toast(`<div><b>${esc(admErr(e))}</b></div>`)}})}

/* ----- Inviter : QR code « Rejoins la ligue », codes d'invitation ----- */
const INVRE=/^[A-Z0-9]{8}$/;
async function admInviter(z){z.innerHTML=`<p class="loading">Chargement…</p>`;let req=false,codes=[],msg="";
  try{req=(await admRpc("invitation_requise"))===true}catch(e){msg=admErr(e)}
  if(!msg){try{codes=(await admRpc("admin_invitations"))||[]}catch(e){msg=admErr(e)}}
  if(view!=="admin"||AD.tab!=="iv")return;
  codes=(Array.isArray(codes)?codes:[]).filter(c=>c&&INVRE.test(c.code));
  const actifs=codes.filter(c=>c.restant>0&&Date.parse(c.expire)>Date.now());
  if(!req||!actifs.some(c=>c.code===AD.ivc))AD.ivc=req&&actifs[0]?actifs[0].code:null;
  const url=HUB_URL+(AD.ivc?"#invite="+AD.ivc:"");
  z.innerHTML=`<div class="adprint"><h2>Rejoins la ligue Première 2026</h2><div class="adqr" id="ivQr"><p class="loading">QR code…</p></div><p class="adurl" id="ivUrl"></p>${AD.ivc?`<p class="adcode">Code d’invitation : <b id="ivCode"></b></p>`:""}<p class="adpn">Révise avec tes amis : cartes, quiz, défi du jour et classement.</p></div>
   <div class="exrow"><button class="btn light" type="button" id="ivPrint">Imprimer l’affiche</button></div>
   <div class="sec"><h2>Codes d’invitation</h2></div>
   ${msg?`<p class="istat err">${esc(msg)}</p>`:`<p class="note" style="margin:0 0 10px">${req?"Un code d’invitation est <b>obligatoire</b> pour créer un compte. Le QR code contient le code choisi.":"Inscription <b>libre</b> : pas besoin de code. Les codes ne servent que si tu actives l’invitation obligatoire dans la base (config_privee)."}</p>
   <div class="exrow"><button class="btn ghost" type="button" id="ivNew">Créer un code (10 utilisations, 30 jours)</button><span class="istat" id="ivSt" role="status"></span></div>
   ${codes.length?`<ul class="adl">${codes.map((c,i)=>`<li><div class="adt"><b>${esc(c.code)}</b><small>${fmtN(Math.max(0,Math.round(+c.restant)||0))} utilisation${c.restant>1?"s":""} restante${c.restant>1?"s":""} · jusqu’au ${esc(admDate(c.expire))}</small></div><div class="exrow">${req&&actifs.includes(c)?`<button class="btn ghost" type="button" data-ivq="${i}">${AD.ivc===c.code?"Sur l’affiche":"Mettre sur l’affiche"}</button>`:""}<button class="btn ghost" type="button" data-ivr="${i}">Retirer</button></div></li>`).join("")}</ul>`:`<p class="muted">Aucun code.</p>`}`}`;
  $("#ivUrl").textContent=url;if($("#ivCode"))$("#ivCode").textContent=AD.ivc;
  $("#ivPrint").onclick=()=>{try{window.print()}catch(e){}};
  admQr($("#ivQr"),url);
  if($("#ivNew"))$("#ivNew").onclick=async()=>{const st=$("#ivSt");$("#ivNew").disabled=true;st.className="istat";st.textContent="…";
    try{const c=await admRpc("admin_invitation_creer",{p_usages:10,p_jours:30});if(INVRE.test(String(c))&&req)AD.ivc=c;admInviter(z)}catch(e){$("#ivNew").disabled=false;st.className="istat err";st.textContent=admErr(e)}};
  z.querySelectorAll("[data-ivq]").forEach(b=>b.onclick=()=>{AD.ivc=codes[+b.dataset.ivq].code;admInviter(z)});
  z.querySelectorAll("[data-ivr]").forEach(b=>b.onclick=async()=>{const c=codes[+b.dataset.ivr];if(!confirm(`Retirer le code ${c.code} ? Il ne marchera plus.`))return;b.disabled=true;
    try{await admRpc("admin_invitation_retirer",{p_code:c.code});if(AD.ivc===c.code)AD.ivc=null;admInviter(z)}catch(e){b.disabled=false;toast(`<div><b>${esc(admErr(e))}</b></div>`)}})}
async function admQr(el,url){if(!el)return;try{const qrcode=await loadLib(QR_GEN,"qrcode");const q=qrcode(0,"M");q.addData(url);q.make();el.innerHTML=q.createSvgTag({cellSize:8,margin:2,scalable:true})}
  catch(e){el.textContent="QR code indisponible : l’adresse ci-dessous suffit."}}

/* ----- Journal des cadeaux ----- */
async function admJour(z){z.innerHTML=`<p class="loading">Chargement du journal…</p>`;let L=[];
  try{const s=await DB.collection("data/users/"+UID+"/journal").get();L=s.docs.map(d=>d.data()||{}).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))}catch(e){z.innerHTML=`<p class="istat err">${esc(writeErr(e))}</p>`;return}
  if(view!=="admin"||AD.tab!=="jr")return;
  z.innerHTML=L.length?`<p class="note" style="margin:14px 0 10px">Tous les cadeaux que tu as donnés, du plus récent au plus ancien.</p><ul class="adl">${L.map(()=>`<li><div class="adt"><b class="jp"></b><small class="jd"></small></div><p class="adtx"></p></li>`).join("")}</ul>`
    :`<p class="note" style="margin:14px 0">Aucun cadeau donné pour l’instant.</p>`;
  z.querySelectorAll(".adl li").forEach((li,i)=>{const g=L[i];li.querySelector(".jp").textContent=(g.pseudo||"?")+" · "+[g.xp?"+"+fmtN(g.xp)+" XP":"",g.co?"+"+fmtN(g.co)+" pièces":""].filter(Boolean).join(", ");li.querySelector(".jd").textContent=admDate(g.date);li.querySelector(".adtx").textContent=g.raison||""})}

/* ================= ELO : classement permanent, calculé par la base ================= */
const ELO={map:{},ok:false,t:0};
const DIV_ELO=[0,1100,1250,1400];
const eloDiv=e=>{let d=0;DIV_ELO.forEach((s,i)=>{if((+e||1000)>=s)d=i});return d};
const myElo=()=>(ELO.map[UID]&&ELO.map[UID].elo)||1000;
const eloOf=id=>(ELO.map[id]&&ELO.map[id].elo)||1000;
const eloN=id=>(ELO.map[id]&&ELO.map[id].n)||0;
async function eloLoad(force){if(!window.P26||!window.P26.elo||GUEST||!UID)return;if(!force&&Date.now()-ELO.t<15000)return;ELO.t=Date.now();
  try{ELO.map=await window.P26.elo.list();ELO.ok=true;const d=eloDiv(myElo());if(d!==LG.div){LG.div=d;applySkin();lgPush()}if(view==="ligue"&&!LG.defi)renderLigue()}catch(e){}}
async function eloBoot(){if(!window.P26||!window.P26.elo||GUEST||!UID)return;try{await window.P26.elo.rattrapage()}catch(e){}eloLoad(true)}
/* Partie classée : ouverture (hôte), inscription (joueurs), score (chacun le sien), clôture */
const EG={id:null,sent:false};
async function eloOpen(n,sec,joue){try{return await window.P26.elo.ouvrir(Math.max(3,Math.min(50,n)),Math.max(5,Math.min(120,sec||60)),joue!==false)}catch(e){return null}}
async function eloJoin(id){if(!id||!window.P26||!window.P26.elo)return false;let ok=false;try{ok=await window.P26.elo.rejoindre(id)}catch(e){}EG.joined=EG.joined||{};EG.joined[id]=!!ok;return ok}
async function eloSend(id,score,sel){if(!id||!window.P26||!window.P26.elo)return;const paint=()=>{const el=$(sel);if(el)el.innerHTML=EG.html};
  if(EG.joined&&EG.joined[id]===false){EG.html="Partie classée, mais tu es arrivé après le départ : ton Elo ne bouge pas.";paint();return}EG.html="Calcul de l’Elo…";paint();
  try{await window.P26.elo.score(id,Math.max(0,Math.round(score)))}catch(e){}
  const show=async(k)=>{try{await window.P26.elo.cloturer(id)}catch(e){}let r=null;try{r=await window.P26.elo.resultat(id)}catch(e){}
    const me=r&&r.me;if(me&&typeof me.delta==="number"){eloLoad(true);EG.html=`Elo : <b>${fmtN(me.avant+me.delta)}</b> <span class="${me.delta>=0?"up":"dn"}">${me.delta>=0?"+":"−"}${Math.abs(me.delta)}</span>`;paint();return}
    if(k<8)setTimeout(()=>show(k+1),k<3?3000:12000);else{EG.html="Elo mis à jour à ta prochaine visite.";paint()}};
  setTimeout(()=>show(0),2500)}
const eloPaintAgain=(id,sel)=>{if(id&&EG.id===id&&EG.html){const el=$(sel);if(el)el.innerHTML=EG.html}};

/* ================= VERBES IRRÉGULIERS ================= */
const VERB_OF={ang:"verbes-ang",angp:"verbes-ang",amc:"verbes-ang",llcer:"verbes-ang",esp:"verbes-esp",all:"verbes-all",ita:"verbes-ita"};
const VERB_LANG={"verbes-ang":"Anglais","verbes-esp":"Espagnol","verbes-all":"Allemand","verbes-ita":"Italien"};
const VERB_HTML_LANG={"verbes-ang":"en","verbes-esp":"es","verbes-all":"de","verbes-ita":"it"};
function verbSets(){const s=new Set();const c=clsOk(P.cls);if(c)clsMats(c).forEach(pm=>{if(VERB_OF[pm])s.add(VERB_OF[pm])});if(ADM())Object.values(VERB_OF).forEach(v=>s.add(v));return [...s]}
const VB={set:null,niv:1,mode:"serie",q:null,list:[],i:0,ok:0,ko:0,t0:0,timer:null,done:false};
const vbNorm=s=>String(s||"").toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ").replace(/^to /,"").trim();
const vbBare=s=>vbNorm(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ß/g,"ss");
function vbCheck(user,expected){const alts=String(expected).split("/").map(vbNorm).filter(Boolean);const u=vbNorm(user);if(!u)return "vide";
  if(alts.includes(u)||vbNorm(expected)===u)return "ok";if(alts.map(vbBare).includes(vbBare(u)))return "accent";return "ko"}
function vbData(set){const d=PG.base[set];return d&&Array.isArray(d.verbes)?d:null}
function vbCols(d,set){return d.cols.map((c,i)=>({c,i})).filter(x=>!(set==="verbes-ang"&&/^Base/.test(x.c)))}
function vbPick(d,set,n){P.vb=P.vb||{};const L=d.verbes.filter(v=>(v.niv||2)<=VB.niv);
  const w=v=>{const s=P.vb[set+":"+v.inf]||{};return (s.ko||0)*3-(s.ok||0)+(s.ok?0:2)+Math.random()*2};
  return L.map(v=>[v,w(v)]).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0])}
function openVerbes(set){VB.set=set||VB.set||verbSets()[0]||"verbes-ang";VB.q=null;VB.done=false;go("verbes")}
function renderVerbes(){const box=$("#vb");if(!box)return;clearInterval(VB.timer);
  const sets=verbSets();if(!VB.set||(!sets.includes(VB.set)&&sets.length))VB.set=sets[0]||"verbes-ang";
  const d=vbData(VB.set);
  if(!d){box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="vbBack">Retour</button></div><p class="loading">Chargement des verbes…</p>`;$("#vbBack").onclick=()=>go(LS.get("view","duel"));progFetch(VB.set,()=>{if(view==="verbes")renderVerbes()});return}
  if(VB.q||VB.done){vbRenderQ();return}
  const best=(P.vbb&&P.vbb[VB.set])||0,seen=Object.keys(P.vb||{}).filter(k=>k.startsWith(VB.set+":")),known=seen.filter(k=>(P.vb[k].ok||0)>=2&&!(P.vb[k].ko>P.vb[k].ok)).length;
  box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="vbBack">Retour</button></div>
   <h1 class="adh">Verbes irréguliers</h1>
   <p class="note" style="margin:0 0 12px">Tu écris les formes toi-même : c’est comme ça qu’on les retient. Les verbes ratés reviennent plus souvent.</p>
   ${sets.length>1?`<div class="pick sm" id="vbSet">${sets.map(s=>`<button type="button" class="${s===VB.set?"on":""}" data-s="${s}">${esc(VERB_LANG[s])}</button>`).join("")}</div>`:""}
   <div class="vbstat"><div><b>${fmtN(known)}</b><span>sus sur ${fmtN(d.verbes.length)}</span></div><div><b>${fmtN(best)}</b><span>record au chrono</span></div></div>
   <p class="lab">Niveau</p><div class="pick sm" id="vbNiv">${[[1,"Essentiels"],[2,"+ Courants"],[3,"Tous"]].map(([n,l])=>`<button type="button" class="${VB.niv===n?"on":""}" data-n="${n}">${l} · ${d.verbes.filter(v=>(v.niv||2)<=n).length}</button>`).join("")}</div>
   <p class="lab">Mode</p><div class="pick sm" id="vbMode">${[["serie","Série de 15"],["chrono","Chrono 60 s"]].map(([m,l])=>`<button type="button" class="${VB.mode===m?"on":""}" data-m="${m}">${l}</button>`).join("")}</div>
   <div class="exrow"><button class="btn light" type="button" id="vbGo">C’est parti</button></div>
   <details class="plan"><summary>Voir le tableau</summary><div class="vbtab"><table><thead><tr><th>Verbe</th>${d.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${d.verbes.filter(v=>(v.niv||2)<=VB.niv).map(v=>`<tr><td><b>${esc(v.inf)}</b><small>${esc(v.fr)}</small></td>${v.f.map(f=>`<td>${esc(f)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
  $("#vbBack").onclick=()=>go(LS.get("view","duel"));
  box.querySelectorAll("#vbSet [data-s]").forEach(b=>b.onclick=()=>{VB.set=b.dataset.s;renderVerbes()});
  box.querySelectorAll("#vbNiv [data-n]").forEach(b=>b.onclick=()=>{VB.niv=+b.dataset.n;renderVerbes()});
  box.querySelectorAll("#vbMode [data-m]").forEach(b=>b.onclick=()=>{VB.mode=b.dataset.m;renderVerbes()});
  $("#vbGo").onclick=()=>{VB.list=vbPick(d,VB.set,VB.mode==="chrono"?200:15);VB.i=0;VB.ok=0;VB.ko=0;VB.done=false;VB.paid=false;VB.t0=Date.now();VB.q=VB.list[0]||null;VB.res=null;renderVerbes()}}
function vbRenderQ(){const box=$("#vb"),d=vbData(VB.set),cols=vbCols(d,VB.set),chrono=VB.mode==="chrono";
  const left=chrono?Math.max(0,60-Math.floor((Date.now()-VB.t0)/1000)):0;
  if(VB.done||!VB.q||(chrono&&left<=0)){clearInterval(VB.timer);VB.q=null;VB.done=true;if(!VB.paid){VB.paid=true;if(chrono){P.vbb=P.vbb||{};if(VB.ok>(P.vbb[VB.set]||0))P.vbb[VB.set]=VB.ok}saveP();if(VB.ok)gainXP(Math.min(30,VB.ok))}
    box.innerHTML=`<div class="result"><div class="sc">${VB.ok}</div><p>${chrono?"verbes justes en 60 secondes":"verbes justes sur "+(VB.ok+VB.ko)}</p>${chrono&&VB.ok>=((P.vbb&&P.vbb[VB.set])||0)&&VB.ok?"<p><b>Nouveau record !</b></p>":""}
     <div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="vbAgain">Rejouer</button><button class="btn ghost" type="button" id="vbHome">Changer de mode</button></div></div>`;
    $("#vbAgain").onclick=()=>{VB.list=vbPick(d,VB.set,chrono?200:15);VB.i=0;VB.ok=0;VB.ko=0;VB.done=false;VB.paid=false;VB.t0=Date.now();VB.q=VB.list[0];VB.res=null;renderVerbes()};
    $("#vbHome").onclick=()=>{VB.done=false;VB.q=null;renderVerbes()};return}
  const v=VB.q,lg=VERB_HTML_LANG[VB.set];
  box.innerHTML=`<div class="ihead"><span class="muted">${chrono?`<b id="vbLeft">${left}</b> s · ${VB.ok} juste${VB.ok>1?"s":""}`:`${VB.i+1} / ${VB.list.length}`}</span><button class="linkbtn" type="button" id="vbStop">Arrêter</button></div>
   <article class="qcard vbq"><div class="role"><span>${esc(VERB_LANG[VB.set])}</span><span>${["","Essentiel","Courant","Plus rare"][v.niv||2]}</span></div>
   <h2 lang="${lg}">${esc(v.inf)}</h2><p class="muted" style="color:var(--card-mute);margin:-10px 0 14px">${esc(v.fr)}</p>
   <form id="vbF" autocomplete="off">${cols.map(x=>`<label class="vbl"><span>${esc(x.c)}</span><input class="inp" lang="${lg}" data-i="${x.i}" autocapitalize="off" autocorrect="off" spellcheck="false" ${VB.res?"readonly":""}></label>`).join("")}
   <div id="vbRes"></div><div class="exrow"><button class="btn" type="submit" id="vbOk">${VB.res?"Suivant":"Vérifier"}</button></div></form></article>`;
  const inputs=[...box.querySelectorAll("#vbF input")];
  if(VB.res){inputs.forEach((inp,k)=>{const r=VB.res[k];inp.value=r.u;inp.classList.add(r.s==="ok"?"good":"bad")});
    $("#vbRes").innerHTML=`<p class="why">${VB.res.every(r=>r.s==="ok")?"<b>Juste.</b> ":VB.res.some(r=>r.s==="accent")?"<b>Presque : attention aux accents.</b> ":"<b>À revoir.</b> "}${cols.map(x=>esc(x.c)+" : <b>"+esc(v.f[x.i])+"</b>").join(" · ")}</p>`}
  else{VB.tq=Date.now();setTimeout(()=>inputs[0]&&inputs[0].focus(),30)}
  inputs.forEach((inp,k)=>inp.onkeydown=e=>{if(e.key==="Enter"&&k<inputs.length-1&&!VB.res){e.preventDefault();inputs[k+1].focus()}});
  $("#vbStop").onclick=()=>{VB.done=true;vbRenderQ()};
  $("#vbF").onsubmit=e=>{e.preventDefault();
    if(VB.res){VB.res=null;VB.i++;VB.q=VB.list[VB.i]||null;if(!VB.q)VB.done=true;vbRenderQ();return}
    VB.res=inputs.map(inp=>{const i=+inp.dataset.i;return {u:inp.value,s:vbCheck(inp.value,v.f[i])}});
    const good=VB.res.every(r=>r.s==="ok");jrn("vb."+VB.set+"."+v.inf,good,VB.tq?Date.now()-VB.tq:null,"verbe");P.vb=P.vb||{};const k=VB.set+":"+v.inf,st=P.vb[k]||{ok:0,ko:0};if(good){st.ok++;VB.ok++}else{st.ko++;VB.ko++}st.d=TODAY_ISO;P.vb[k]=st;saveP();
    buzz(good?14:[8,60,8]);
    if(chrono&&good){VB.res=null;VB.i++;VB.q=VB.list[VB.i]||null;vbRenderQ();return}
    vbRenderQ();setTimeout(()=>{const b=$("#vbOk");if(b)b.focus()},30)};
  if(chrono){clearInterval(VB.timer);VB.timer=setInterval(()=>{const l=Math.max(0,60-Math.floor((Date.now()-VB.t0)/1000)),el=$("#vbLeft");if(view!=="verbes"){clearInterval(VB.timer);return}if(el)el.textContent=l;if(l<=0){clearInterval(VB.timer);VB.res=null;vbRenderQ()}},250)}}

/* ================= ARÈNE : quiz en direct à plusieurs, façon Kahoot ================= */
const AR={g:null,code:"",host:false,unsub:null,ph:"",sel:new Set(),n:10,dur:20,ranked:true,other:false,mat:null,qs:null,i:-1,t0:0,timer:null,ans:{},score:{},nick:{},last:{},eloId:null,myAns:null,seenI:-1,seenPh:"",plays:true,err:""};
const arQid=(q,id)=>{if(/^[A-Za-z0-9._:-]{1,100}$/.test(id||""))return id;let h=2166136261;for(const c of String(q||""))h=Math.imul(h^c.charCodeAt(0),16777619);return "ar.h"+(h>>>0).toString(36)};
const AR_PTS=(ms,dur)=>Math.round(1000*(1-Math.min(Math.max(ms,0),dur)/dur/2));
/* Paquet 1 (T3) : messages rapides (liste fixe, pas de texte libre), cadre en présence, bonus de série x2 */
const AR_QM={gg:"GG",rev:"Revanche ?",bravo:"Bien joué !",oups:"Oups",merci:"Merci"};
const AR_X2=st=>st>3?2:1;                 // st = bonnes réponses de suite, celle-ci comprise : la 4e et les suivantes comptent double
function arPres(o){if(!AR.g)return Promise.resolve();AR.lp=Object.assign({},o);const x=Object.assign({},o);
  if(AR.qm&&Object.prototype.hasOwnProperty.call(AR_QM,AR.qm)){x.qm=AR.qm;x.qt=AR.qt}let c="";try{c=P26ui._champs().cad||""}catch(e){}if(c)x.cad=c;return AR.g.presence(x)}
function arPx(p){const s=(p&&p.presence)||{};return {qm:typeof s.qm==="string"&&Object.prototype.hasOwnProperty.call(AR_QM,s.qm)?s.qm:"",qt:Math.max(0,Math.min(9e15,Math.round(+s.qt)||0)),cad:typeof s.cad==="string"&&/^[a-z0-9-]{1,24}$/.test(s.cad)?s.cad:""}}
const arCadOf=k=>{const pk=String(k||"").replace(/^h:/,""),p=arPlayers().find(x=>x.peer===pk);return p?P26ui._cadre({cad:arPx(p).cad}):""};
function arMsgs(){const t=Date.now();AR.bul=AR.bul||{};AR.vus=AR.vus||{};
  arPlayers().forEach(p=>{const x=arPx(p);if(!x.qm||!x.qt)return;const k=p.peer+":"+x.qt;if(AR.vus[k])return;AR.vus[k]=1;if(Math.abs(t-x.qt)>30000)return;
    AR.bul[p.peer]={m:x.qm,fin:t+4000};if(x.qm==="rev"&&AR.host&&AR.ph==="end"&&!(p.isMe&&p.sameTab))AR.revanche=1});arBulPaint()}
function arBulPaint(){const box=$("#duel");if(!box||!AR.g)return;const t=Date.now(),B=AR.bul||{};
  box.querySelectorAll("[data-pk]").forEach(el=>{const b=B[String(el.dataset.pk).replace(/^h:/,"")];let s=el.querySelector(".arbul");if(!(b&&b.fin>t)){if(s)s.remove();return}
    if(!s){s=document.createElement("span");s.className="arbul";el.appendChild(s)}s.textContent=AR_QM[b.m]});
  const r=$("#arRelance");if(r)r.hidden=!AR.revanche;
  clearTimeout(AR.bt);const nx=Math.min(...Object.values(B).map(b=>b.fin).filter(f=>f>t));if(Number.isFinite(nx))AR.bt=setTimeout(arBulPaint,nx-t+30)}
function arQmHTML(){return `<div class="arqm" id="arQm" role="group" aria-label="Messages rapides">${Object.entries(AR_QM).map(([k,l])=>`<button type="button" class="btn ghost" data-qm="${k}">${l}</button>`).join("")}</div>`}
function arQmBind(){const bs=[...$("#duel").querySelectorAll("#arQm [data-qm]")],lock=()=>{const w=3000-(Date.now()-(AR.qt||0));bs.forEach(b=>b.disabled=w>0);if(w>0)setTimeout(()=>bs.forEach(b=>{if(b.isConnected)b.disabled=false}),w)};
  bs.forEach(b=>b.onclick=()=>{if(Date.now()-(AR.qt||0)<3000)return;AR.qm=b.dataset.qm;AR.qt=Date.now();arPres(AR.lp||{nick:arNick()}).catch(()=>{});lock()});if(AR.qt)lock()}
async function arRelance(){if(!AR.g||!AR.host)return;AR.ph="lobby";AR.qs=null;AR.eloId=null;AR.revanche=0;await arPres({nick:arNick(),ah:true,ph:"lobby"}).catch(()=>{});arRender();if($("#arGo"))arStart()}
const arNick=()=>cleanNick(LG.nick)||cleanNick((window.P26&&window.P26.profile&&window.P26.profile.pseudo)||"")||"";
const arCode=()=>{const al="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let c="";for(let i=0;i<5;i++)c+=al[Math.floor(Math.random()*al.length)];return c};
function arPlayers(){return (AR.g?AR.g.peers():[]).filter(p=>p.presence&&p.presence.nick)}
function arHostPeer(){const hs=arPlayers().filter(p=>p.presence.ah);if(AR.hk){const h=hs.find(p=>p.peer===AR.hk);if(h)return h}if(!hs.length)return null;
  const h=AR.host?hs.find(p=>p.isMe&&p.sameTab):hs.sort((a,b)=>(+a.presence.t||9e15)-(+b.presence.t||9e15)||(a.peer<b.peer?-1:1))[0];if(h)AR.hk=h.peer;return h||null}
const arStr=(x,n)=>clip(typeof x==="string"?x:"",n);
function arClean(hp){const ph=["lobby","start","q","rev","end"].includes(hp.ph)?hp.ph:"lobby",n=Math.max(0,Math.min(50,+hp.n|0)),i=Math.max(0,Math.min(49,+hp.i|0));
  const opts=Array.isArray(hp.opts)?hp.opts.slice(0,4).map(o=>arStr(o,160)):[];const ok=Math.max(0,Math.min(3,+hp.ok|0));
  const board=Array.isArray(hp.board)?hp.board.slice(0,60).map(r=>({k:arStr(r&&r.k,80),nick:cleanNick(arStr(r&&r.nick,40))||"?",s:Math.max(0,+(r&&r.s)|0),l:Math.max(0,+(r&&r.l)|0),x:Math.max(0,Math.min(50,+(r&&r.x)|0)),f:r&&r.f===1?1:0})):[];
  return {ph,n,i,q:arStr(hp.q,240),opts,ok,why:arStr(hp.why,300),dur:Math.max(5000,Math.min(60000,+hp.dur|0||20000)),board,eloId:/^[0-9a-f]{18}$/.test(hp.eloId||"")?hp.eloId:null,nick:cleanNick(arStr(hp.nick,40)),qid:/^[A-Za-z0-9._:-]{1,100}$/.test(hp.qid||"")?hp.qid:""}}
function arEntryHTML(){return `<div class="online arene"><h2>Arène</h2><p class="muted">Quiz en direct à plusieurs, façon Kahoot. Tout le monde a la même question au même moment : plus tu réponds vite, plus tu marques. Partie classée : ton Elo bouge.</p>
   <div class="olrow"><button class="btn light" type="button" id="arCreate">Créer une arène</button></div>
   <label class="lab" for="arCodeIn">Ou rejoins avec un code</label>
   <div class="olrow"><input id="arCodeIn" class="inp code" maxlength="5" autocomplete="off" placeholder="ABCDE"><button class="btn ghost" type="button" id="arJoin">Rejoindre</button></div>
   <div class="olrow"><label class="btn ghost qrscan"><input type="file" id="arQr" accept="image/*" capture="environment">Scanner un QR code</label></div>
   <p class="olerr" id="arErr" role="alert">${esc(AR.err||"")}</p></div>`}
function arEntryBind(){const need=()=>{if(!arNick()){$("#arErr").textContent="Ajoute ton pseudo dans ton profil.";return false}if(!ROOM||roomState!=="ok"){$("#arErr").textContent="Connexion au direct impossible pour l’instant.";return false}return true};
  if($("#arCreate"))$("#arCreate").onclick=()=>{if(need())arEnter(arCode(),true)};
  if($("#arJoin"))$("#arJoin").onclick=()=>{if(!need())return;const c=$("#arCodeIn").value.toUpperCase().replace(/[^A-Z0-9]/g,"");if(c.length!==5){$("#arErr").textContent="Le code fait 5 caractères.";return}arEnter(c,false)};
  if($("#arQr"))$("#arQr").onchange=async e=>{const f=e.target.files[0];if(!f||!need())return;$("#arErr").textContent="Lecture du QR code…";let c="";try{c=await qrRead(f)}catch(x){}const m=/([A-Z0-9]{5})$/i.exec(c||"");if(!m){$("#arErr").textContent="QR code illisible. Tape le code.";return}arEnter(m[1].toUpperCase(),false)};
  const m=/arene=([A-Z0-9]{5})/i.exec(location.hash||"");if(m&&!AR.autoTried&&!AR.g){$("#arCodeIn").value=m[1].toUpperCase();if(arNick()&&ROOM&&roomState==="ok"){history.replaceState(null,"",location.pathname+location.search);arEnter(m[1].toUpperCase(),false)}}}
addEventListener("hashchange",()=>{const m=/arene=([A-Z0-9]{5})/i.exec(location.hash||"");if(m){AR.autoTried=false;ntFollow("#arene="+m[1].toUpperCase())}});
async function arEnter(code,host){AR.err="";if(AR.g)await arLeave();if(typeof OL!=="undefined"&&OL.g)await leaveRoom();AR.autoTried=true;try{AR.g=await ROOM.join("arene-"+code.toLowerCase())}catch(e){AR.g=null;AR.err="Impossible de rejoindre l’arène. Réessaie.";renderSeries();return}
  Object.assign(AR,{code,host,ph:"lobby",qs:null,i:-1,ans:{},score:{},nick:{},last:{},eloId:null,myAns:null,seenI:-1,seenPh:"",sel:AR.sel||new Set()});inDuel=true;
  AR.hk=null;AR.t0c=Date.now();AR.mine=0;AR.got={};AR.mst=0;AR.st={};AR.nx={};AR.qm=null;AR.qt=0;AR.bul={};AR.vus={};AR.revanche=0;await arPres(host?{nick:arNick(),ah:true,ph:"lobby",t:AR.t0c}:{nick:arNick(),prop:[]}).catch(()=>{});
  AR.unsub=AR.g.onPeers(arPeers,()=>arLeave("La connexion à l’arène a été perdue."));arRender()}
async function arLeave(msg){clearInterval(AR.timer);clearTimeout(AR.bt);if(AR.unsub)AR.unsub();AR.unsub=null;if(AR.g)await AR.g.leave().catch(()=>{});AR.g=null;inDuel=false;AR.err=msg||"";renderSeries()}
function arPeers(){if(!AR.g)return;arMsgs();
  if(AR.host){if(AR.ph==="q")arCollect();if(AR.ph==="lobby"||AR.ph==="start")arRender();return}
  const h=arHostPeer();if(!h){if(AR.ph!=="lobby"){AR.ph="lobby";arRender()}else arRender();return}
  const hp=arClean(h.presence);
  if(hp.eloId&&hp.eloId!==AR.eloId){AR.eloId=hp.eloId;AR.mine=0;AR.got={};if(!GUEST&&hp.ph==="start")eloJoin(hp.eloId);else{EG.joined=EG.joined||{};EG.joined[hp.eloId]=false}}
  if(hp.ph==="q"&&hp.i!==AR.seenI){AR.seenI=hp.i;AR.myAns=null;AR.cur={i:hp.i,n:hp.n,q:hp.q,opts:hp.opts,dur:hp.dur,tl:performance.now(),qid:hp.qid};AR.ph="q";arRender();return}
  if(hp.ph==="start"&&AR.seenPh!=="start"){AR.mst=0;AR.got={};if(!hp.eloId)AR.mine=0}
  if(hp.ph==="rev"&&AR.myAns&&AR.myAns.i===hp.i&&!(AR.got||{})[hp.i]){AR.got=AR.got||{};AR.got[hp.i]=1;jrn(arQid(hp.q,AR.cur&&AR.cur.qid),AR.myAns.c===hp.ok,AR.myAns.ms,"arene");if(AR.myAns.c===hp.ok)AR.mine=(AR.mine||0)+AR_PTS(AR.myAns.ms,AR.cur?AR.cur.dur:hp.dur)*AR_X2(AR.mst=(AR.mst||0)+1);else AR.mst=0}
  else if(hp.ph==="rev"&&!(AR.got||{})[hp.i]){AR.got=AR.got||{};AR.got[hp.i]=1;AR.mst=0}   /* pas de réponse : la série s'arrête */
  if(hp.ph!==AR.seenPh||(hp.ph==="rev"&&AR.revI!==hp.i)){AR.seenPh=hp.ph;AR.revI=hp.i;AR.ph=hp.ph==="q"&&!AR.cur?"lobby":hp.ph;AR.hp=hp;arRender();return}
  AR.hp=hp;if(AR.ph==="lobby")arRender()}
/* --- côté hôte --- */
function arThemes(){const out=[];const own=new Set();
  (C.mats||[]).forEach(m=>{chapsOf2(m.id).forEach(ch=>{(ch.quiz||[]).forEach((s,si)=>{if((s.qs||[]).length){const k=ch._tid?"p:"+ch._tid:"c:"+ch.id+"#"+si;if(own.has(k))return;own.add(k);out.push({k,mat:m.id,matNom:m.court||m.nom,t:ch.court||ch.titre,n:s.qs.length})}})})});
  return out}
function chapsOf2(mid){return Object.values(C.chaps).filter(c=>c.mat===mid).sort((a,b)=>(isProg(a)?0:1)-(isProg(b)?0:1)||(a.ordre||0)-(b.ordre||0))}
function arOtherThemes(){const mine=new Set(arThemes().map(x=>x.k));const out=[];Object.entries(MATDEF).forEach(([pm,M])=>M.themes.forEach(t=>{const k="p:"+t.id;if(!mine.has(k))out.push({k,mat:"o-"+pm,matNom:M.court+" ("+CLS_OF(pm).join(", ")+")",t:t.c})}));
  Object.entries(VERB_LANG).forEach(([v,l])=>{const k="p:"+v;if(!mine.has(k))out.push({k,mat:"o-verbes",matNom:"Verbes irréguliers",t:l})});return out}
const arLabel=k=>{const a=[...arThemes(),...arOtherThemes()].find(x=>x.k===k);return a?a.matNom+" · "+a.t:k};
async function arBuild(){const pool=[];
  for(const k of AR.sel){if(k.startsWith("c:")){const [c,s]=k.slice(2).split("#"),ch=C.chaps[c];if(ch&&ch.quiz[+s])ch.quiz[+s].qs.forEach(q=>pool.push(q));continue}
    const tid=k.slice(2),pm=tid.startsWith("verbes-")?tid:tid.slice(0,tid.lastIndexOf("-"));await progFetchAll(pm);const d=progDocOf(tid).d;if(d)(d.quiz||[]).forEach(z=>(z.qs||[]).forEach(q=>pool.push(q)))}
  return shuffle(pool.filter(q=>q&&q.q&&q.ok&&(q.no||[]).length>=2)).slice(0,AR.n).map(q=>{const o=shuffle([q.ok,...q.no.slice(0,3)]);return {q:q.q,opts:o,ok:o.indexOf(q.ok),why:q.why||"",id:q.id||""}})}
async function arStart(){const st=$("#arSt");if(AR.starting)return;if(!AR.sel.size){st.textContent="Choisis au moins un thème.";return}
  AR.starting=true;$("#arGo").disabled=true;st.textContent="Préparation des questions…";const qs=await arBuild();
  if(qs.length<3){AR.starting=false;const s2=$("#arSt");if(s2)s2.textContent="Pas assez de questions dans ces thèmes (3 minimum).";if($("#arGo"))$("#arGo").disabled=false;return}
  AR.qs=qs;AR.score={};AR.last={};AR.st={};AR.nx={};AR.i=-1;AR.eloId=null;AR.revanche=0;
  const nb=arPlayers().filter(p=>!p.presence.ah).length+(AR.plays?1:0);AR.mine=0;AR.got={};if(AR.ranked&&nb>=2&&!GUEST){AR.eloId=await eloOpen(qs.length,AR.dur,AR.plays);EG.joined=EG.joined||{};if(AR.eloId)EG.joined[AR.eloId]=AR.plays}AR.starting=false;
  AR.ph="start";await arPres({nick:arNick(),ah:true,ph:"start",n:qs.length,eloId:AR.eloId}).catch(()=>{});arRender();
  setTimeout(()=>arNext(),3200)}
async function arNext(){if(!AR.g||!AR.host)return;AR.i++;
  if(AR.i>=AR.qs.length){AR.ph="end";const board=arBoard();await arPres({nick:arNick(),ah:true,ph:"end",n:AR.qs.length,eloId:AR.eloId,board}).catch(()=>{});arRender();return}
  const Q=AR.qs[AR.i];AR.ans={};AR.ph="q";AR.t0=performance.now();AR.myAns=null;
  AR.cur={i:AR.i,n:AR.qs.length,q:Q.q,opts:Q.opts,dur:AR.dur*1000,tl:performance.now(),qid:Q.id||""};
  await arPres({nick:arNick(),ah:true,ph:"q",i:AR.i,n:AR.qs.length,q:Q.q,qid:Q.id||"",opts:Q.opts,dur:AR.dur*1000,eloId:AR.eloId,ans:null}).catch(()=>{});
  arRender();clearInterval(AR.timer);AR.timer=setInterval(()=>{if(performance.now()-AR.t0>AR.dur*1000+800)arReveal();else arTick()},250)}
function arGather(){arPlayers().forEach(p=>{const a=p.presence.ans;if(!p.presence.ah&&a&&a.i===AR.i&&!AR.ans[p.peer])AR.ans[p.peer]=a});
  if(AR.plays&&AR.myAns&&AR.myAns.i===AR.i&&!AR.ans.__host)AR.ans.__host=AR.myAns}
function arCollect(){if(AR.ph!=="q")return;arGather();
  const need=arPlayers().filter(p=>!p.presence.ah).length+(AR.plays?1:0),got=Object.keys(AR.ans).length;
  const el=$("#arGot");if(el)el.textContent=got+" / "+need+" réponses";if(got>=need&&need>0)arReveal()}
async function arReveal(){if(AR.ph!=="q")return;AR.ph="rev";clearInterval(AR.timer);arGather();const Q=AR.qs[AR.i],dur=AR.dur*1000;if(AR.plays&&AR.myAns&&AR.myAns.i===AR.i)jrn(arQid(Q.q,Q.id),AR.myAns.c===Q.ok,AR.myAns.ms,"arene");
  const ps=arPlayers();ps.forEach(p=>{if(!p.presence.ah)AR.nick[p.peer]=cleanNick(p.presence.nick)});if(AR.plays)AR.nick.__host=arNick();
  AR.st=AR.st||{};AR.nx=AR.nx||{};Object.keys(AR.nick).forEach(k=>{const a=AR.ans[k],good=!!a&&a.c===Q.ok;AR.st[k]=good?(AR.st[k]||0)+1:0;const m=good?AR_X2(AR.st[k]):1;if(m>1)AR.nx[k]=(AR.nx[k]||0)+1;
    const pts=good?AR_PTS(Number.isFinite(+a.ms)?+a.ms:dur,dur)*m:0;AR.last[k]=pts;AR.score[k]=(AR.score[k]||0)+pts});
  const board=arBoard();
  await arPres({nick:arNick(),ah:true,ph:"rev",i:AR.i,n:AR.qs.length,ok:Q.ok,why:Q.why,q:Q.q,opts:Q.opts,eloId:AR.eloId,board}).catch(()=>{});
  arRender();clearTimeout(AR.nt);AR.nt=setTimeout(()=>{if(AR.ph==="rev")arNext()},6000)}
function arBoard(){return Object.keys(AR.nick).filter(k=>k!=="__host"||AR.plays).map(k=>({k:k==="__host"?"h:"+(AR.g&&AR.g.peers().find(p=>p.isMe&&p.sameTab)||{}).peer:k,nick:AR.nick[k],s:AR.score[k]||0,l:AR.last[k]||0,x:(AR.nx||{})[k]||0,f:((AR.st||{})[k]||0)>=3?1:0})).sort((a,b)=>b.s-a.s||a.nick.localeCompare(b.nick)).slice(0,60)}
function arTick(){const el=$("#arBar");if(!el||!AR.cur)return;const left=Math.max(0,AR.cur.dur-(performance.now()-AR.cur.tl));el.style.setProperty("--p",(left/AR.cur.dur).toFixed(3));const s=$("#arSec");if(s)s.textContent=Math.ceil(left/1000)}
/* --- rendu (hôte et joueurs) --- */
function arRender(){const box=$("#duel");if(!box||!AR.g)return;/* P26ui */if(AR.ph!=="end")AR.p1fin=0;const me=(AR.g.peers().find(p=>p.isMe&&p.sameTab)||{}).peer;
  if(AR.ph==="lobby"||AR.ph==="start"){const ps=arPlayers(),h=arHostPeer();
    box.innerHTML=`<div class="olhead"><div><span class="muted">Code de l’arène</span><div class="bigcode">${esc(AR.code)}</div><button class="linkbtn" type="button" id="arQuit">Quitter</button></div><div class="qrbox" id="arQrImg" aria-label="QR code de l’arène"></div></div>
     <p class="muted" style="margin:0 0 10px">Scanne le QR code avec l’appareil photo, ou va sur le site et tape le code dans Duel › Arène.</p>
     <h2 class="solo">Dans l’arène · ${ps.length}</h2><ul class="olplayers">${ps.map(p=>`<li data-pk="${esc(p.peer)}"><span class="arn"${arCadOf(p.peer)}></span>${p.presence.ah?"<em>hôte</em>":""}${p.isMe&&p.sameTab?"<em>toi</em>":""}</li>`).join("")}</ul>${arQmHTML()}
     ${AR.ph==="start"?`<div class="arbig"><b>Prêts ?</b><span>${AR.host?AR.qs.length:arClean(AR.hp||{}).n} questions${AR.eloId?" · partie classée":""}</span></div>`:AR.host?arHostLobbyHTML():arPlayerLobbyHTML(h)}`;
    box.querySelectorAll(".olplayers .arn").forEach((s,i)=>s.textContent=cleanNick(ps[i].presence.nick));
    const url=HUB_URL+"#arene="+AR.code;loadLib(QR_GEN,"qrcode").then(qrcode=>{const q=qrcode(0,"M");q.addData(url);q.make();const el=$("#arQrImg");if(el)el.innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true})}).catch(()=>{const el=$("#arQrImg");if(el)el.textContent="QR code indisponible."});
    $("#arQuit").onclick=()=>arLeave();if(AR.ph==="lobby")(AR.host?arHostLobbyBind:arPlayerLobbyBind)();arQmBind();arBulPaint();return}
  if(AR.ph==="q"&&AR.cur){const c=AR.cur,mine=AR.myAns;
    box.innerHTML=`<div class="qcard arq"><div class="role"><span>Arène ${esc(AR.code)}${(AR.host?(AR.plays?(AR.st||{}).__host:0):AR.mst)>=3?' <b class="arx2" title="Série de bonnes réponses : la prochaine compte double">x2</b>':""}</span><span>${c.i+1} / ${c.n}</span></div>
     <div class="arbar" id="arBar" style="--p:1"><i></i><b id="arSec">${Math.ceil(c.dur/1000)}</b></div>
     <h2>${tex(c.q)}</h2><div class="argrid">${c.opts.map((o,k)=>`<button type="button" class="aro a${k}${mine&&mine.c===k?" pick":""}" data-k="${k}" ${mine?"disabled":""}><i aria-hidden="true">${"▲◆●■"[k]}</i><span>${tex(o)}</span></button>`).join("")}</div>
     <p class="why" id="arGot">${mine?"Réponse envoyée. On attend les autres…":""}</p>${AR.host?`<div class="exrow"><button class="btn ghost" type="button" id="arSkip">Révéler maintenant</button></div>`:""}</div>`;
    box.querySelectorAll(".aro").forEach(b=>b.onclick=()=>{if(AR.myAns)return;const ms=Math.round(performance.now()-c.tl);AR.myAns={i:c.i,c:+b.dataset.k,ms};buzz(12);if(AR.host&&+b.dataset.k===AR.qs[AR.i].ok){AR.got=AR.got||{};}
      if(AR.host){arCollect()}else arPres({nick:arNick(),prop:[],ans:AR.myAns}).catch(()=>{});arRender()});
    if($("#arSkip"))$("#arSkip").onclick=()=>arReveal();
    if(!AR.host){clearInterval(AR.timer);AR.timer=setInterval(()=>{if(AR.ph!=="q"){clearInterval(AR.timer);return}arTick()},250)}arTick();if(AR.host)arCollect();return}
  if(AR.ph==="rev"){const hp=AR.host?{ok:AR.qs[AR.i].ok,why:AR.qs[AR.i].why,q:AR.qs[AR.i].q,opts:AR.qs[AR.i].opts,board:arBoard(),i:AR.i,n:AR.qs.length}:arClean(AR.hp||{});
    const myKey=AR.host?"__host":me,myRow=(hp.board||[]).find(r=>r.k===myKey||(AR.host&&String(r.k).startsWith("h:"))),mine=AR.myAns&&AR.myAns.i===hp.i?AR.myAns:null,good=mine&&mine.c===hp.ok;
    box.innerHTML=`<div class="qcard arq"><div class="role"><span>${good?"Bonne réponse":"Réponse"}</span><span>${(hp.i||0)+1} / ${hp.n||""}</span></div>
     <h2>${tex(hp.q||"")}</h2><div class="argrid">${(hp.opts||[]).map((o,k)=>`<div class="aro a${k}${k===hp.ok?" right":" dim"}${mine&&mine.c===k&&k!==hp.ok?" wrong":""}"><i aria-hidden="true">${"▲◆●■"[k]}</i><span>${tex(o)}</span></div>`).join("")}</div>
     ${hp.why?`<p class="why">${tex(hp.why)}</p>`:""}<p class="arme">${mine?(good?"+"+fmtN(myRow?myRow.l:0)+" points"+((AR.host?(AR.st||{}).__host:AR.mst)>3?' <b class="arx2">x2</b>':""):"Raté : 0 point"):"Pas de réponse : 0 point"}</p></div>
     ${arBoardHTML(hp.board||[],myKey,5)}${AR.host?`<div class="exrow"><button class="btn light" type="button" id="arNextB">${AR.i+1>=AR.qs.length?"Voir le podium":"Question suivante"}</button></div>`:""}`;
    if($("#arNextB"))$("#arNextB").onclick=()=>{clearTimeout(AR.nt);arNext()};return}
  if(AR.ph==="end"){const hp=AR.host?{board:arBoard(),eloId:AR.eloId}:arClean(AR.hp||{});const myKey=AR.host?"__host":me;const B=hp.board||[];
    const myRow=B.find(r=>r.k===myKey||(AR.host&&String(r.k).startsWith("h:")));
    box.innerHTML=`<h1 style="font-size:2rem;margin-bottom:6px">Podium</h1><div class="arpod">${[1,0,2].filter(i=>B[i]).map(i=>`<div class="p${i+1}"><b class="pn"></b><span>${fmtN(B[i].s)}</span><i>${i+1}</i></div>`).join("")}</div>
     ${arBoardHTML(B,myKey,60)}<p class="arelo" id="arElo">${hp.eloId?"":"Partie non classée."}</p>
     ${arQmHTML()}<div class="exrow">${AR.host?`<button class="btn light" type="button" id="arRelance" hidden>Relancer une partie</button><button class="btn light" type="button" id="arAgain">Nouvelle partie</button>`:""}${arShareOk()?`<button class="btn ghost" type="button" id="arShare">Partager le podium</button>`:""}<button class="btn ghost" type="button" id="arOut">Quitter l’arène</button></div>`;
    box.querySelectorAll(".arpod .pn").forEach((el,j)=>{const i=[1,0,2].filter(i=>B[i])[j];el.textContent=B[i].nick});
    /* P26ui */if(!AR.p1fin){AR.p1fin=1;const rg=myRow?B.indexOf(myRow)+1:0;P26ui.emit("arene.fin",{el:box,board:B,rang:rg,joueurs:B.length,host:!!AR.host})}
    $("#arOut").onclick=()=>arLeave();if($("#arRelance"))$("#arRelance").onclick=arRelance;if($("#arShare"))$("#arShare").onclick=()=>arShare(B);arQmBind();arBulPaint();if($("#arAgain"))$("#arAgain").onclick=async()=>{AR.ph="lobby";AR.qs=null;AR.eloId=null;await arPres({nick:arNick(),ah:true,ph:"lobby"}).catch(()=>{});arRender()};
    const mineS=AR.host?(AR.score.__host||0):(AR.mine||0);if(hp.eloId&&(!AR.host||AR.plays)&&!GUEST&&EG.id!==hp.eloId){EG.id=hp.eloId;eloSend(hp.eloId,mineS,"#arElo")}else eloPaintAgain(hp.eloId,"#arElo");
    if(myRow&&myRow===B[0]&&!AR.paid){AR.paid=1;gainXP(10)}return}}
const arShareOk=()=>!Array.isArray(window.P26_MODS)||window.P26_MODS.includes("partage.js");
function arShare(B){const b=$("#arShare");if(b)b.disabled=true;P26mod("partage").then(()=>{if(typeof P26ui.partagePodium!=="function")throw new Error("partage absent");
  return P26ui.partagePodium({titre:"Arène",lignes:(B||[]).slice(0,3).map(r=>({nick:r.nick,score:r.s}))})}).then(()=>{if(b)b.disabled=false},()=>{if(b)b.hidden=true})}
function arBoardHTML(B,myKey,max){return `<ol class="endlist">${B.slice(0,max).map((r,i)=>`<li data-pk="${esc(r.k)}" class="${r.k===myKey||(myKey==="__host"&&String(r.k).startsWith("h:"))?"me":""}"><span class="rk">${i+1}</span><span class="bn"${arCadOf(r.k)}>${esc(r.nick)}${r.x?` <b class="arx2" title="${r.x} réponse${r.x>1?"s":""} comptée${r.x>1?"s":""} double">x2</b>`:r.f?' <b class="arx2 on" title="Série en cours">x2</b>':""}</span><span>${r.l?"+"+fmtN(r.l):""}</span><b>${fmtN(r.s)}</b></li>`).join("")}</ol>`}
function arHostLobbyHTML(){const ps=arPlayers(),props={};ps.forEach(p=>(Array.isArray(p.presence.prop)?p.presence.prop:[]).slice(0,5).forEach(k=>{if(typeof k==="string"&&/^p:[a-z]+-[a-z0-9]+$/.test(k)){props[k]=props[k]||[];props[k].push(cleanNick(p.presence.nick))}}));
  const T=AR.other?arOtherThemes():arThemes(),mats=[...new Map(T.map(x=>[x.mat,x.matNom])).entries()];if(!AR.mat||!mats.find(m=>m[0]===AR.mat))AR.mat=mats[0]?mats[0][0]:null;
  return `${Object.keys(props).length?`<h2 class="solo">Propositions des joueurs</h2><div class="onbch" id="arProps">${Object.entries(props).map(([k,who])=>`<button type="button" class="${AR.sel.has(k)?"on":""}" data-k="${esc(k)}">${esc(arLabel(k))}<small>${esc(who.slice(0,3).join(", "))}</small></button>`).join("")}</div>`:""}
   <h2 class="solo">Thèmes choisis · ${AR.sel.size}</h2>${AR.sel.size?`<div class="onbch" id="arSel">${[...AR.sel].map(k=>`<button type="button" class="on" data-k="${esc(k)}">${esc(arLabel(k))} ✕</button>`).join("")}</div>`:`<p class="muted">Touche des thèmes ci-dessous.</p>`}
   <div class="pick sm" id="arWhich" style="margin-top:12px"><button type="button" class="${AR.other?"":"on"}" data-o="0">Mes matières</button><button type="button" class="${AR.other?"on":""}" data-o="1">Toutes les classes</button></div>
   <div class="pick sm" id="arMats">${mats.map(([id,nm])=>`<button type="button" class="${id===AR.mat?"on":""}" data-m="${esc(id)}">${esc(nm)}</button>`).join("")}</div>
   <div class="onbch" id="arThs">${T.filter(x=>x.mat===AR.mat).map(x=>`<button type="button" class="${AR.sel.has(x.k)?"on":""}" data-k="${esc(x.k)}">${esc(x.t)}</button>`).join("")||'<p class="muted">Aucun quiz dans cette matière.</p>'}</div>
   <h2 class="solo">Questions</h2><div class="onbch" id="arN">${[5,10,15,20].map(n=>`<button type="button" class="${AR.n===n?"on":""}" data-n="${n}">${n}</button>`).join("")}</div>
   <h2 class="solo">Temps par question</h2><div class="onbch" id="arD">${[10,20,30].map(n=>`<button type="button" class="${AR.dur===n?"on":""}" data-d="${n}">${n} s</button>`).join("")}</div>
   ${arInviteHTML()}
   <label class="share"><input type="checkbox" id="arRk" ${AR.ranked?"checked":""}> Partie classée (l’Elo bouge, 2 joueurs minimum)</label>
   <label class="share"><input type="checkbox" id="arPl" ${AR.plays?"checked":""}> Je joue aussi</label>
   <div class="exrow"><button class="btn light" type="button" id="arGo" ${AR.sel.size&&(ps.length>1||AR.plays)&&!AR.starting?"":"disabled"}>Lancer la partie</button><span class="istat" id="arSt" role="status"></span></div>`}
function arHostLobbyBind(){const box=$("#duel"),tog=k=>{AR.sel.has(k)?AR.sel.delete(k):AR.sel.add(k);arRender()};
  box.querySelectorAll("#arProps [data-k],#arSel [data-k],#arThs [data-k]").forEach(b=>b.onclick=()=>tog(b.dataset.k));
  box.querySelectorAll("#arWhich [data-o]").forEach(b=>b.onclick=()=>{AR.other=b.dataset.o==="1";AR.mat=null;arRender()});
  box.querySelectorAll("#arMats [data-m]").forEach(b=>b.onclick=()=>{AR.mat=b.dataset.m;arRender()});
  box.querySelectorAll("#arN [data-n]").forEach(b=>b.onclick=()=>{AR.n=+b.dataset.n;arRender()});
  box.querySelectorAll("#arD [data-d]").forEach(b=>b.onclick=()=>{AR.dur=+b.dataset.d;arRender()});
  arInviteBind();$("#arRk").onchange=e=>{AR.ranked=e.target.checked};$("#arPl").onchange=e=>{AR.plays=e.target.checked;arRender()};$("#arGo").onclick=arStart}
function arPlayerLobbyHTML(h){const T=arThemes().filter(x=>x.k.startsWith("p:")),mine=AR.prop||[];
  return `<p class="waitmsg">${h?"En attente du lancement par "+esc(cleanNick(h.presence.nick))+"…":"En attente de l’hôte…"}</p>
   <h2 class="solo">Proposer des thèmes</h2><p class="muted" style="margin:0 0 8px">L’hôte voit tes propositions (5 au plus).</p>
   <div class="onbch" id="arProp">${T.slice(0,80).map(x=>`<button type="button" class="${mine.includes(x.k)?"on":""}" data-k="${esc(x.k)}">${esc(x.matNom)} · ${esc(x.t)}</button>`).join("")||'<p class="muted">Choisis ta classe dans ton profil pour proposer des thèmes.</p>'}</div>`}
function arPlayerLobbyBind(){$("#duel").querySelectorAll("#arProp [data-k]").forEach(b=>b.onclick=()=>{AR.prop=AR.prop||[];const k=b.dataset.k,i=AR.prop.indexOf(k);if(i>=0)AR.prop.splice(i,1);else if(AR.prop.length<5)AR.prop.push(k);arPres({nick:arNick(),prop:AR.prop.slice()}).catch(()=>{});arRender()})}

/* ================= NOTIFICATIONS ET AMIS ================= */
const VAPID_PUBLIC="BEW1nBhPDKrfBBj3ILf_ShIl-Lk6hgqdjINGv8s-KC9SQfmn0WVXdU0q3kiqGlZMjdhbqMcnMh9tUMs9ly2X-Ks";
const NT={list:[],t:null,seen:+LS.get("ntSeen",0)||0,amis:[],amisT:0,busy:false};
const SOC=()=>window.P26&&window.P26.social&&!GUEST&&UID;
async function ntLoad(){if(!SOC())return;try{const L=await window.P26.social.notifs();const nw=L.filter(n=>!n.lu&&n.id>NT.seen);NT.list=L;
    if(nw.length&&NT.loaded){nw.slice(0,3).forEach(n=>toast(`<span class="tm">${n.type==="duel"?"⚔":n.type==="cadeau"?"+":"♥"}</span><div><b>${esc(n.texte)}</b><span>Touche la cloche pour répondre</span></div>`));buzz([10,40,10])}
    NT.loaded=true;if(L[0])NT.seen=Math.max(NT.seen,L[0].id);LS.set("ntSeen",NT.seen);ntPaint();if(view==="notifs")renderNotifs()}catch(e){}}
function ntStart(){if(NT.t||!SOC())return;ntLoad();pushResync();NT.t=setInterval(()=>{if(!document.hidden)ntLoad()},30000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)ntLoad()})}
function ntPaint(){const b=$("#tBell");if(!b)return;const n=NT.list.filter(x=>!x.lu).length;b.hidden=!SOC();b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15v1h15v-1L18 12.5V9a6 6 0 0 0-6-6zm-2 14a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>${n?`<span class="nb2">${n>9?"9+":n}</span>`:""}`;b.setAttribute("aria-label",n?n+" notification"+(n>1?"s":"")+" non lue"+(n>1?"s":""):"Notifications")}
async function amisLoad(force){if(!SOC())return NT.amis;if(!force&&Date.now()-NT.amisT<20000)return NT.amis;NT.amisT=Date.now();try{NT.amis=await window.P26.social.amis()}catch(e){}return NT.amis}
const PUSH={st:"?"};
function pushSupport(){return "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window}
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
async function pushState(){if(!pushSupport())return isIOS()&&!standalone()?"ios":"non";if(Notification.permission==="denied")return "bloque";
  try{const r=await navigator.serviceWorker.getRegistration();const s=r&&await r.pushManager.getSubscription();return s?"on":"off"}catch(e){return "off"}}
async function pushOn(st){try{if(Notification.permission!=="granted"){const p=await Notification.requestPermission();if(p!=="granted"){st.textContent="Tu as refusé. Pour changer d’avis, autorise les notifications dans les réglages du navigateur.";return}}
    const reg=await navigator.serviceWorker.register("sw.js");await navigator.serviceWorker.ready;
    const key=Uint8Array.from(atob(VAPID_PUBLIC.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-VAPID_PUBLIC.length%4)%4)),c=>c.charCodeAt(0));
    const sub=(await reg.pushManager.getSubscription())||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    await window.P26.social.abonner(sub);st.textContent="C’est activé sur cet appareil.";renderNotifs()}
  catch(e){st.textContent="Impossible d’activer ici : "+(e&&e.message?e.message:"erreur")+"."}}
async function pushOff(st){try{const r=await navigator.serviceWorker.getRegistration();const s=r&&await r.pushManager.getSubscription();if(s){await window.P26.social.desabonner(s.endpoint).catch(()=>{});await s.unsubscribe()}st.textContent="Désactivé sur cet appareil.";renderNotifs()}catch(e){st.textContent="Impossible pour l’instant."}}
async function renderNotifs(){const box=$("#nt");if(!box)return;const ps=await pushState();PUSH.st=ps;if(view!=="notifs")return;
  const L=NT.list,recus=(NT.amis||[]).filter(a=>a.recu);
  box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="ntBack">Retour</button></div><h1 class="adh">Notifications</h1>
   <div class="ntpush">${ps==="on"?`<p><b>Notifications du téléphone : activées.</b> Tu es prévenu même quand le site est fermé.</p><button class="linkbtn" type="button" id="ntOff">Désactiver sur cet appareil</button>`
     :ps==="ios"?`<p><b>Sur iPhone</b>, ajoute d’abord le site à ton écran d’accueil : bouton Partager, puis « Sur l’écran d’accueil ». Ouvre-le depuis l’icône, et reviens ici pour activer.</p>`
     :ps==="bloque"?`<p>Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur, puis reviens ici.</p>`
     :ps==="non"?`<p>Ce navigateur ne sait pas recevoir de notifications. Essaie Chrome, ou sur iPhone le site ajouté à l’écran d’accueil.</p>`
     :`<p><b>Reçois les demandes d’amis, les défis et les cadeaux sur ton téléphone</b>, comme une appli.</p><button class="btn light" type="button" id="ntOn">Activer les notifications</button>`}<p class="istat" id="ntSt" role="status"></p></div>
   ${recus.length?`<div class="sec"><h2>Demandes d’amis</h2></div><ul class="adl">${recus.map((a,i)=>`<li class="ntam"><b class="nn" data-i="${i}"></b><div class="exrow"><button class="btn light" type="button" data-acc="${esc(a.id)}">Accepter</button><button class="btn ghost" type="button" data-ref="${esc(a.id)}">Refuser</button></div></li>`).join("")}</ul>`:""}
   <div class="sec"><h2>Récentes</h2></div>${L.length?`<ul class="ntl">${L.map((n,i)=>`<li class="${n.lu?"":"new"}"><i>${n.type==="duel"?"⚔":n.type==="cadeau"?"+":n.type==="info"?"i":"♥"}</i><div><b class="nt" data-i="${i}"></b><small>${esc(admTime(Date.parse(n.cree)))}</small></div>${n.type==="duel"&&n.lien?`<button class="btn light" type="button" data-go="${esc(n.lien)}">Rejoindre</button>`:""}</li>`).join("")}</ul>`:`<p class="muted">Rien pour l’instant. Ajoute des amis dans Ligue › Mes amis.</p>`}`;
  /* P26ui */box.querySelector(".ntpush").insertAdjacentHTML("afterend",'<div data-slot="notifs"></div>');P26ui.slot("notifs",box.querySelector('[data-slot="notifs"]'));
  box.querySelectorAll(".nn").forEach(el=>el.textContent=recus[+el.dataset.i].pseudo+" veut t’ajouter en ami");
  box.querySelectorAll(".ntl .nt").forEach(el=>el.textContent=L[+el.dataset.i].texte);
  $("#ntBack").onclick=()=>go(LS.get("view","table"));
  if($("#ntOn"))$("#ntOn").onclick=()=>pushOn($("#ntSt"));if($("#ntOff"))$("#ntOff").onclick=()=>pushOff($("#ntSt"));
  box.querySelectorAll("[data-acc],[data-ref]").forEach(b=>b.onclick=async()=>{b.disabled=true;const id=b.dataset.acc||b.dataset.ref;try{await window.P26.social.repondre(id,!!b.dataset.acc);await amisLoad(true);toast(`<span class="tm">${b.dataset.acc?"♥":"·"}</span><div><b>${b.dataset.acc?"Vous êtes amis":"Demande refusée"}</b></div>`)}catch(e){}renderNotifs()});
  box.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>ntFollow(b.dataset.go));
  const unread=L.filter(n=>!n.lu).map(n=>n.id);if(unread.length){try{await window.P26.social.lues(unread)}catch(e){}L.forEach(n=>n.lu=true);ntPaint()}}
function ntFollow(lien){const m=/^#arene=([A-Z0-9]{5})$/.exec(lien||"");if(m){if(AR.g&&AR.code===m[1])return;if(AR.g&&!confirm("Quitter l’arène en cours pour rejoindre ce défi ?"))return;go("duel");setTimeout(()=>{if(arNick()&&ROOM&&roomState==="ok")arEnter(m[1],false);else{history.replaceState(null,"",location.pathname+lien);AR.autoTried=false}},50);return}
  /* P26ui */if(P26ui.suivre(lien))return;
  const v=(lien||"").slice(1);if(views.includes(v))go(v)}
/* Liste d'amis (onglet Ligue) */
function amisHTML(){if(!SOC())return "";const A=NT.amis||[],ok=A.filter(a=>a.ok).sort((a,b)=>eloOf(b.id)-eloOf(a.id)),env=A.filter(a=>!a.ok&&!a.recu),rec=A.filter(a=>a.recu);
  return `<div class="sec"><h2>Mes amis</h2><span>${ok.length}</span></div>
   <div class="olrow"><input id="amP" class="inp" maxlength="16" autocomplete="off" autocapitalize="off" placeholder="Pseudo de ton ami"><button class="btn" type="button" id="amAdd">Ajouter</button></div><p class="istat" id="amSt" role="status">${esc(NT.amMsg||"")}</p>
   ${rec.length?`<p class="lab">Demandes reçues</p><ul class="adl">${rec.map(a=>`<li class="ntam"><b class="ap" data-id="${esc(a.id)}"></b><div class="exrow"><button class="btn light" type="button" data-acc="${esc(a.id)}">Accepter</button><button class="btn ghost" type="button" data-ref="${esc(a.id)}">Refuser</button></div></li>`).join("")}</ul>`:""}
   ${ok.length?`<ul class="aml">${ok.map(a=>`<li><b class="ap" data-id="${esc(a.id)}"></b><span>${fmtN(eloOf(a.id))}<small>Elo</small></span><button class="btn light" type="button" data-def="${esc(a.id)}">Défier</button><button class="linkbtn" type="button" data-del="${esc(a.id)}" aria-label="Retirer">✕</button>${J1.mod("duelx")?`<button class="linkbtn amdx" type="button" data-dx="${esc(a.id)}">Duel à distance</button>`:""}</li>`).join("")}</ul>`:`<p class="muted" style="margin:6px 0 0">Ajoute tes amis avec leur pseudo : ils reçoivent une demande.</p>`}
   ${env.length?`<p class="muted" style="margin:8px 0 0">En attente : ${env.map(a=>`<span class="ap" data-id="${esc(a.id)}"></span>`).join(", ")}</p>`:""}`}
function amisBind(box){if(!$("#amAdd"))return;const A=NT.amis||[];box.querySelectorAll(".ap").forEach(el=>{const a=A.find(x=>x.id===el.dataset.id);el.textContent=a?a.pseudo:"?"});
  /* P26ui */box.querySelectorAll(".aml .ap").forEach(el=>{const a=A.find(x=>x.id===el.dataset.id);const h=P26ui.sousHTML(Object.assign({},(LG.rows||[]).find(x=>x.id===el.dataset.id)||{},{id:el.dataset.id,nick:a?a.pseudo:"",ami:true}));if(h)el.insertAdjacentHTML("afterend",'<small class="p1s">'+h+'</small>')});
  const add=async()=>{const p=$("#amP").value.trim(),st=$("#amSt");if(!p)return;$("#amAdd").disabled=true;let r="";try{r=await window.P26.social.demander(p)}catch(e){r="erreur"}
    NT.amMsg=st.textContent={envoye:"Demande envoyée.",ok:"Vous êtes amis !",deja:"Vous êtes déjà amis.",attente:"Demande déjà envoyée.",introuvable:"Aucun compte avec ce pseudo.",toi:"C’est toi !",limite:"Trop de demandes aujourd’hui."}[r]||"Impossible pour l’instant.";
    await amisLoad(true);renderLigue()};
  $("#amAdd").onclick=add;$("#amP").onkeydown=e=>{if(e.key==="Enter")add()};
  box.querySelectorAll(".aml [data-def]").forEach(b=>b.onclick=()=>amDefier([b.dataset.def]));
  box.querySelectorAll(".aml [data-dx]").forEach(b=>b.onclick=()=>P26ui.ouvrir("duelx","ami:"+b.dataset.dx));
  box.querySelectorAll(".aml [data-del]").forEach(b=>b.onclick=async()=>{const a=A.find(x=>x.id===b.dataset.del);if(!confirm("Retirer "+(a?a.pseudo:"cet ami")+" de tes amis ?"))return;try{await window.P26.social.retirer(b.dataset.del)}catch(e){}await amisLoad(true);renderLigue()});
  box.querySelectorAll("[data-acc],[data-ref]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await window.P26.social.repondre(b.dataset.acc||b.dataset.ref,!!b.dataset.acc)}catch(e){}await amisLoad(true);renderLigue()})}
async function amDefier(ids){if(!arNick()||!ROOM||roomState!=="ok"){toast(`<span class="tm">!</span><div><b>Défi impossible pour l’instant</b><span>Ajoute ton pseudo dans ton profil.</span></div>`);return}
  const code=arCode();go("duel");await arEnter(code,true);if(!AR.g)return;let n=0;for(const id of ids){try{if(await window.P26.social.defier(id,code))n++}catch(e){}}
  toast(`<span class="tm">⚔</span><div><b>${n?"Défi envoyé":"Défi non envoyé"}</b><span>${n?"Ton ami reçoit une notification avec le code "+code+".":"Réessaie dans une minute."}</span></div>`)}
function arInviteHTML(){const ok=(NT.amis||[]).filter(a=>a.ok);if(!SOC()||!ok.length)return "";return `<h2 class="solo">Inviter des amis</h2><div class="onbch" id="arInv">${ok.map(a=>`<button type="button" data-inv="${esc(a.id)}" class="${AR.inv&&AR.inv[a.id]?"on":""}"></button>`).join("")}</div>`}
function arInviteBind(){const ok=(NT.amis||[]).filter(a=>a.ok);$("#duel").querySelectorAll("#arInv [data-inv]").forEach(b=>{const a=ok.find(x=>x.id===b.dataset.inv);b.textContent=(AR.inv&&AR.inv[a.id]?"Invité · ":"")+(a?a.pseudo:"?");
  b.onclick=async()=>{AR.inv=AR.inv||{};if(AR.inv[a.id])return;b.disabled=true;let ok2=false;try{ok2=await window.P26.social.defier(a.id,AR.code)}catch(e){}if(ok2)AR.inv[a.id]=1;arRender()}})}

/* ================= Programme : verbes, et toutes les classes pour l'admin ================= */
const CLS_SHORT=pm=>CLS_OF(pm).map(x=>x==="Générale"?"1G":x==="Bac pro MELEC"?"MELEC":x).join(", ");
function progChapOf(tid,mid,meta,hide,local){const pd=progDocOf(tid,local),d=pd.d,mq=pd.masque;
  return Object.assign({id:"prog."+tid,mat:mid,origin:"prog",src:"programme",_tid:tid,_gen:!!d,_corr:pd.corrige,
    paquets:d?(d.paquets||[]).map(p=>({...p,cartes:(p.cartes||[]).filter(x=>!hide[x.id]&&!mq[x.id])})).filter(p=>p.cartes.length):[],
    quiz:d?(d.quiz||[]).map(z=>({...z,qs:(z.qs||[]).filter(q=>!mq[q.id])})):[]},meta)}
function progAdd8(c,addMat,hide,local){const done=new Set();
  clsMats(c).forEach(pm=>{const v=VERB_OF[pm];if(!v||done.has(v))return;done.add(v);const mid=pgId(pm);
    C.chaps["prog."+v]=progChapOf(v,mid,{_pm:v,titre:"Verbes irréguliers · "+VERB_LANG[v],court:"Verbes irréguliers",notions:"formes des verbes irréguliers",ordre:99,_verbes:true},hide,local)});
  if(!ADM())return;const own=new Set(clsMats(c));
  Object.entries(MATDEF).forEach(([pm,M])=>{if(own.has(pm))return;const mid="x-"+pm;addMat(mid,M.nom+" ("+CLS_SHORT(pm)+")",M.court+" "+CLS_SHORT(pm).split(",")[0],M.suit);
    M.themes.forEach((t,ti)=>{C.chaps["prog."+t.id]=progChapOf(t.id,mid,{_pm:pm,titre:t.t,court:t.c,notions:t.n,ordre:ti,_cls:"Première "+CLS_OF(pm).join(" / ")},hide,local)})});
  Object.keys(VERB_LANG).forEach(v=>{if(done.has(v))return;const mid="x-"+v;addMat(mid,"Verbes "+VERB_LANG[v].toLowerCase(),"Verbes "+VERB_LANG[v].slice(0,3)+".","#6B3FA0");
    C.chaps["prog."+v]=progChapOf(v,mid,{_pm:v,titre:"Verbes irréguliers · "+VERB_LANG[v],court:"Verbes irréguliers",notions:"formes des verbes irréguliers",ordre:0,_verbes:true},hide,local)})}
function progLoad8(c){const L=new Set();clsMats(c).forEach(pm=>{if(VERB_OF[pm])L.add(VERB_OF[pm])});
  if(ADM()){Object.keys(MATDEF).forEach(pm=>L.add(pm));Object.keys(VERB_LANG).forEach(v=>L.add(v))}
  L.forEach(pm=>{if(!PG.req[pm]&&!(PG.fail&&Date.now()-(PG.fail[pm]||0)<60000))progFetch(pm)})}
function verbCoursHTML(ch){return `<div class="vbcta"><p><b>Verbes irréguliers</b> : les cartes ci-dessous pour réviser, et l’entraînement où tu écris toi-même les formes (série ou chrono).</p><button class="btn light" type="button" id="vbGoC">S’entraîner à écrire les formes</button></div>`}
function arEntryPaint(){const a=$("#arEntry");if(a){a.innerHTML=arEntryHTML();arEntryBind()}
  const v=$("#vbEntry"),sets=verbSets();if(v){v.innerHTML=sets.length?`<div class="vbcard"><div><b>Verbes irréguliers</b><span>${sets.map(s=>VERB_LANG[s]).join(" · ")} : écris les formes, en série ou au chrono.</span></div><button class="btn light" type="button" id="vbOpen">S’entraîner</button></div>`:"";if($("#vbOpen"))$("#vbOpen").onclick=()=>openVerbes()}}

async function pushResync(){try{if(!pushSupport()||Notification.permission!=="granted")return;const r=await navigator.serviceWorker.getRegistration();const sub=r&&await r.pushManager.getSubscription();if(sub)await window.P26.social.abonner(sub)}catch(e){}}
/* ================= PAQUET 1 : JOUER (T3) =================
   Toujours chargé (dans app.js) : records publiés dans la ligue, fusion de P.p1 (sv, vf, dx), entrées des modules
   survie, vraifaux et duelx (chargés à la demande), suites de fin d'Arène. Les jeux eux-mêmes sont dans site/mod/. */
const J1={dx:null,dxT:0,dxAbs:false,
  mod:n=>!Array.isArray(window.P26_MODS)||window.P26_MODS.includes(n+".js"),
  rec:k=>{const v=Math.round(+((P.p1||{})[k]));return Number.isFinite(v)?Math.max(0,Math.min(10000,v)):0},
  // duels à distance (cache 20 s) ; fonction absente (SQL pas encore appliqué) : entrée cachée
  async duels(force){if(!SOC()||J1.dxAbs||!window.P26||!window.P26.rpc)return null;if(!force&&J1.dx&&Date.now()-J1.dxT<20000)return J1.dx;
    try{const L=await window.P26.rpc("duels_mes");J1.dx=Array.isArray(L)?L:[];J1.dxT=Date.now()}catch(e){if(e&&e.code==="absent")J1.dxAbs=true}return J1.dx},
  vus:()=>{const v=(P.p1||{}).dx;return Array.isArray(v)?v:[]},
  aFaire:L=>(L||[]).filter(d=>d&&(d.a_jouer||(d.etat==="fini"&&!J1.vus().includes(d.id)))).length};
P26ui.fusion("sv",(l,d)=>Math.max(+l||0,+d||0));
P26ui.fusion("vf",(l,d)=>Math.max(+l||0,+d||0));
P26ui.fusion("dx",(l,d)=>[...new Set([...(Array.isArray(l)?l:[]),...(Array.isArray(d)?d:[])])].filter(x=>typeof x==="string"&&/^[0-9a-f]{12}$/.test(x)).slice(-100));
P26ui.ligne(()=>{const o={},sv=J1.rec("sv"),vf=J1.rec("vf");if(sv)o.sv=sv;if(vf)o.vf=vf;return o});
// Onglet Jeu : Survie et Vrai ou faux express
P26ui.on("slot:jeu",el=>{const L=[["survie","Survie","sv"],["vraifaux","Vrai ou faux","vf"]].filter(x=>J1.mod(x[0]));if(!L.length)return;
  const d=P26ui.bloc(el,"jouer");d.className="p1jouer";
  d.innerHTML=L.map(([m,t,k])=>`<button class="btn ghost" type="button" data-m="${m}">${t}${J1.rec(k)?` <small>Record ${fmtN(J1.rec(k))}</small>`:""}</button>`).join("");
  d.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>P26ui.ouvrir(b.dataset.m))},40);
// Onglet Duel : duel à distance (compte connecté seulement)
P26ui.on("slot:duel",el=>{if(!SOC()||J1.dxAbs||!J1.mod("duelx"))return;const d=P26ui.bloc(el,"duelx");d.className="p1dx";
  d.innerHTML=`<div><b>Duel à distance</b><span>Tu joues maintenant, ton ami joue les mêmes questions plus tard. Classé à l’Elo.</span></div><button class="btn light" type="button">Jouer</button><small class="p1dxn" role="status"></small>`;
  d.querySelector("button").onclick=()=>P26ui.ouvrir("duelx");
  J1.duels().then(L=>{if(J1.dxAbs){d.remove();return}const n=J1.aFaire(L),s=d.querySelector(".p1dxn");if(s)s.textContent=n?(n>1?n+" duels t’attendent":"Un duel t’attend"):""})},40);
// Fin d'Arène (émis une fois par podium par maj8.js) : activité ; 1er avec au moins 3 joueurs : victoire et cadre « Champion de l'Arène »
P26ui.on("arene.fin",d=>{if(!d||!(d.rang>0))return;const n=Math.max(0,Math.min(60,+d.joueurs|0));
  P26ui.emit("activite",{type:"arene",rang:d.rang,joueurs:n});
  if(d.rang!==1||n<3)return;P26ui.emit("victoire",{type:"arene",el:d.el});   // 1er avec au moins 3 joueurs (plan §3.2 d)
  if(!P.t.champion_arene){P.t.champion_arene=1;saveP();toast(`<span class="tm">★</span><div><b>Cadre gagné : Champion de l’Arène</b><span>Choisis-le dans la boutique, onglet Cadres.</span></div>`)}},10);

/* ================= PROGRAMME OFFICIEL ET CLASSE ================= */
const AXES_LV=[["Identités et échanges","Identités","migrations, frontières, échanges culturels, mondialisation"],["Espace privé et espace public","Privé / public","vie privée, réseaux sociaux, place de l’individu dans la société"],["Art et pouvoir","Art et pouvoir","art engagé, propagande, censure, mécénat"],["Citoyenneté et mondes virtuels","Mondes virtuels","citoyenneté numérique, fake news, participation en ligne"],["Fictions et réalités","Fictions","mythes, utopies, héros, frontières entre réel et imaginaire"],["Innovations scientifiques et responsabilité","Innovations","progrès scientifique, éthique, environnement"],["Diversité et inclusion","Diversité","discriminations, égalité, minorités, inclusion"],["Territoire et mémoire","Mémoire","lieux de mémoire, héritage historique, identité régionale"]];
const LV_VOC="vocabulaire, expressions utiles et faits culturels pour l’oral et l’écrit";
const MATDEF={
 fr:{nom:"Français",court:"Français",suit:"#7A2E4D",th:[["La poésie du XIXe au XXIe siècle","Poésie","versification, mouvements (romantisme, symbolisme, surréalisme), œuvre intégrale et parcours associé"],["La littérature d’idées du XVIe au XVIIIe siècle","Littérature d’idées","argumentation, humanisme, Lumières, genres de l’argumentation"],["Le roman et le récit du Moyen Âge au XXIe siècle","Roman","narrateur, point de vue, personnage, registres, évolution du roman"],["Le théâtre du XVIIe au XXIe siècle","Théâtre","genres (comédie, tragédie), double énonciation, mise en scène"],["Méthode : commentaire et dissertation","Méthode","commentaire de texte, dissertation, épreuve orale, figures de style"]]},
 frt:{nom:"Français",court:"Français",suit:"#7A2E4D",th:[["La poésie du XIXe au XXIe siècle","Poésie","versification, mouvements poétiques, œuvre intégrale et parcours associé"],["La littérature d’idées du XVIe au XVIIIe siècle","Littérature d’idées","argumentation, humanisme, Lumières"],["Le roman et le récit du Moyen Âge au XXIe siècle","Roman","narrateur, point de vue, personnage, évolution du roman"],["Le théâtre du XVIIe au XXIe siècle","Théâtre","genres, double énonciation, mise en scène"],["Méthode : commentaire, contraction et essai","Méthode","commentaire, contraction de texte, essai, épreuve orale, figures de style"]]},
 hg:{nom:"Histoire-géographie",court:"Histoire-géo",suit:"#8A5A2B",th:[["L’Europe face aux révolutions","Révolutions","Révolution française, Empire napoléonien, Restauration, révolutions de 1830 et 1848"],["La France dans l’Europe des nationalités (1848-1871)","Nationalités","IIe République, Second Empire, unités italienne et allemande, industrialisation"],["La Troisième République avant 1914","IIIe République","enracinement de la République, laïcité, affaire Dreyfus, empire colonial"],["La Première Guerre mondiale","1914-1918","guerre totale, violences de masse, traités de paix, fin des empires"],["La métropolisation","Métropolisation","métropoles, mondialisation, inégalités, recompositions urbaines"],["Les espaces de la production","Production","acteurs, chaînes de valeur, mutations des espaces productifs"],["Les espaces ruraux","Espaces ruraux","multifonctionnalité, fragmentation, agriculture, tourisme"],["La Chine : des recompositions spatiales multiples","Chine","développement, inégalités, puissance, mondialisation"]]},
 hgt:{nom:"Histoire-géographie",court:"Histoire-géo",suit:"#8A5A2B",th:[["L’Europe bouleversée par la Révolution française (1789-1815)","Révolution","principes de 1789, Terreur, Napoléon, diffusion des idées"],["Les transformations de la France de 1848 à 1870","1848-1870","suffrage universel masculin, Second Empire, industrialisation"],["La Troisième République : un régime, un empire colonial","IIIe République","libertés, laïcité, colonisation"],["La Première Guerre mondiale et la fin des empires européens","1914-1918","guerre totale, génocide arménien, traités de paix"],["La métropolisation","Métropolisation","métropoles, mondialisation, inégalités"],["Les espaces de la production","Production","acteurs, mutations des espaces productifs"],["Les espaces ruraux","Espaces ruraux","multifonctionnalité, agriculture, tourisme"],["La Chine : des recompositions spatiales multiples","Chine","développement, inégalités, puissance"]]},
 emc:{nom:"Enseignement moral et civique",court:"EMC",suit:"#4D5B66",th:[["Fondements et fragilités du lien social","Lien social","solidarité, fraternité, intérêt général, engagement"],["Les recompositions du lien social","Recompositions","transformations de la famille, du travail, de l’école, du numérique"]]},
 ang:{nom:"Anglais (LVA)",court:"Anglais",suit:"#2C4F8A",th:AXES_LV.map(a=>[a[0],a[1],a[2]+", "+LV_VOC])},
 esp:{nom:"Espagnol (LVB)",court:"Espagnol",suit:"#8C3B2E",th:AXES_LV.map(a=>[a[0],a[1],a[2]+", "+LV_VOC])},
 all:{nom:"Allemand (LVB)",court:"Allemand",suit:"#5B4B8A",th:AXES_LV.map(a=>[a[0],a[1],a[2]+", "+LV_VOC])},
 ita:{nom:"Italien (LVB)",court:"Italien",suit:"#3E6B2F",th:AXES_LV.map(a=>[a[0],a[1],a[2]+", "+LV_VOC])},
 es:{nom:"Enseignement scientifique",court:"Ens. scientifique",suit:"#2F6F73",th:[["Une longue histoire de la matière","Matière","éléments chimiques, cristaux, cellule, atomes, radioactivité"],["Le Soleil, notre source d’énergie","Soleil","rayonnement solaire, bilan radiatif, photosynthèse, énergie"],["La Terre, un astre singulier","Terre","forme de la Terre, âge de la Terre, mouvements (Terre et Lune)"],["Son et musique, porteurs d’information","Son","onde sonore, fréquence, gamme, instruments, audition"]]},
 maths:{nom:"Mathématiques",court:"Maths",suit:"#2C4F8A",th:[["Second degré","Second degré","forme canonique, discriminant, racines, signe d’un trinôme"],["Suites numériques","Suites","suites arithmétiques et géométriques, sens de variation, sommes"],["Dérivation","Dérivation","nombre dérivé, tangente, fonctions dérivées, variations"],["Fonction exponentielle","Exponentielle","définition, propriétés algébriques, variations"],["Fonctions trigonométriques","Trigonométrie","cercle trigonométrique, radian, cosinus, sinus"],["Produit scalaire","Produit scalaire","définitions, propriétés, Al-Kashi, orthogonalité"],["Géométrie repérée","Géométrie repérée","équations de droites, vecteur normal, équation de cercle"],["Probabilités conditionnelles et indépendance","Probas conditionnelles","arbres pondérés, formule des probabilités totales, indépendance"],["Variables aléatoires","Variables aléatoires","loi, espérance, variance, écart type"],["Algorithmique et programmation","Algorithmique","listes en Python, boucles, fonctions"]]},
 pc:{nom:"Physique-chimie",court:"Physique-chimie",suit:"#5B4B8A",th:[["Suivi de l’évolution d’un système chimique","Transformations","quantité de matière, avancement, réactif limitant, oxydoréduction, titrage"],["De la structure des entités à la cohésion","Structure","schéma de Lewis, géométrie, polarité, interactions, solubilité"],["Synthèses de molécules organiques","Chimie organique","groupes caractéristiques, synthèse, rendement, combustion"],["Interactions fondamentales et champs","Champs","interactions électrostatique et gravitationnelle, champs, loi de Coulomb"],["Mouvement d’un système","Mouvement","vecteur vitesse, principe d’inertie, deuxième loi de Newton (approche)"],["Aspects énergétiques des phénomènes électriques","Énergie électrique","intensité, tension, puissance, effet Joule, rendement"],["Aspects énergétiques des phénomènes mécaniques","Énergie mécanique","énergie cinétique, potentielle, travail d’une force, théorème de l’énergie cinétique"],["Ondes mécaniques","Ondes","célérité, période, longueur d’onde, ondes périodiques"],["La lumière : images et couleurs, modèles","Lumière","lentilles, synthèse des couleurs, photon, modèle ondulatoire et particulaire"]]},
 svt:{nom:"Sciences de la vie et de la Terre",court:"SVT",suit:"#3E6B2F",th:[["Transmission, variation et expression du patrimoine génétique","Génétique","mitose, réplication, mutations, expression des gènes, protéines"],["La dynamique interne de la Terre","Terre interne","structure du globe, lithosphère, tectonique des plaques, divergence"],["Écosystèmes et services environnementaux","Écosystèmes","dynamique des écosystèmes, biodiversité, services rendus"],["Variation génétique et santé","Génétique et santé","maladies génétiques, cancers, résistance aux antibiotiques"],["Le fonctionnement du système immunitaire humain","Immunité","immunité innée et adaptative, anticorps, lymphocytes, vaccination"]]},
 ses:{nom:"Sciences économiques et sociales",court:"SES",suit:"#7A2E4D",th:[["Comment un marché concurrentiel fonctionne-t-il ?","Marché concurrentiel","offre, demande, prix d’équilibre, surplus"],["Comment les marchés imparfaitement concurrentiels fonctionnent-ils ?","Concurrence imparfaite","monopole, oligopole, pouvoir de marché, politique de la concurrence"],["Quelles sont les principales défaillances du marché ?","Défaillances","externalités, biens communs, biens collectifs, asymétries d’information"],["Comment les agents économiques se financent-ils ?","Financement","épargne, autofinancement, crédit, marchés financiers, taux d’intérêt"],["Qu’est-ce que la monnaie et comment est-elle créée ?","Monnaie","fonctions de la monnaie, création monétaire, banque centrale"],["Comment la socialisation contribue-t-elle à expliquer les différences de comportement ?","Socialisation","socialisation primaire et secondaire, instances, normes, valeurs"],["Comment se construisent et évoluent les liens sociaux ?","Liens sociaux","groupes sociaux, sociabilité, solidarité, réseaux"],["Quels sont les processus sociaux qui contribuent à la déviance ?","Déviance","norme, déviance, délinquance, contrôle social, étiquetage"],["Comment se forme et s’exprime l’opinion publique ?","Opinion publique","sondages, médias, opinion publique"],["Voter : une affaire individuelle ou collective ?","Vote","participation électorale, abstention, facteurs du vote"],["Comment l’assurance et la protection sociale contribuent-elles à la gestion des risques ?","Risques","risque, assurance, mutualisation, protection sociale"],["Comment les entreprises sont-elles organisées et gouvernées ?","Entreprises","types d’entreprises, gouvernance, parties prenantes"]]},
 hggsp:{nom:"Histoire-géo, géopolitique et sciences politiques",court:"HGGSP",suit:"#8A5A2B",th:[["Comprendre un régime politique : la démocratie","Démocratie","démocratie directe et représentative, Athènes, avancées et reculs"],["Analyser les dynamiques des puissances internationales","Puissances","formes de la puissance, hard et soft power, puissances émergentes"],["Étudier les divisions politiques du monde : les frontières","Frontières","tracés, fonctions des frontières, ouvertures et fermetures"],["S’informer : un regard critique sur les sources et modes de communication","S’informer","médias, liberté de la presse, information à l’ère numérique"],["Analyser les relations entre États et religions","États et religions","pouvoir politique et religion, laïcité, États confessionnels"]]},
 hlp:{nom:"Humanités, littérature et philosophie",court:"HLP",suit:"#4D5B66",th:[["Les pouvoirs de la parole","Parole","art de la parole, autorité de la parole, séductions de la parole"],["Les représentations du monde","Représentations","découverte du monde, pluralité des cultures, l’homme et l’animal"]]},
 amc:{nom:"LLCER Anglais, monde contemporain",court:"AMC",suit:"#6B3FA0",th:[["Production et circulation des savoirs","Savoirs","universités, découvertes, diffusion du savoir, vocabulaire anglais"],["Le défi de l’innovation","Innovation","inventions, révolutions technologiques, start-up, vocabulaire anglais"],["Science et responsabilité","Science et éthique","bioéthique, environnement, lanceurs d’alerte"],["Faire entendre sa voix : représentation et participation","Faire entendre sa voix","démocratie, minorités, mouvements sociaux, vote"],["Informer et s’informer","S’informer","médias, presse, fake news, liberté d’expression"],["Représenter le monde et se représenter","Représenter","arts, cinéma, photographie, stéréotypes"]]},
 llcer:{nom:"LLCER Anglais",court:"LLCER",suit:"#2C4F8A",th:[["Imaginaires","Imaginaires","imaginaires effrayants, utopies et dystopies, machines à rêves"],["Rencontres","Rencontres","l’amour, la relation à l’autre, la confrontation à la différence"]]},
 nsi:{nom:"Numérique et sciences informatiques",court:"NSI",suit:"#2F6F73",th:[["Représentation des données : types de base","Données de base","binaire, hexadécimal, entiers, flottants, booléens, texte"],["Représentation des données : types construits","Types construits","tuples, listes, dictionnaires"],["Traitement de données en tables","Tables","fichiers CSV, recherche, tri, fusion de tables"],["Interactions homme-machine sur le Web","Web","HTML, CSS, JavaScript, HTTP, formulaires"],["Architectures matérielles et systèmes d’exploitation","Architecture","von Neumann, réseaux, protocoles, commandes Linux"],["Langages et programmation","Programmation","Python, fonctions, spécification, tests"],["Algorithmique","Algorithmique","parcours, tris, dichotomie, algorithmes gloutons, k plus proches voisins"]]},
 si:{nom:"Sciences de l’ingénieur",court:"SI",suit:"#4D5B66",th:[["Innover","Innover","besoin, cahier des charges, démarche de projet"],["Analyser","Analyser","chaîne de puissance et d’information, architecture d’un produit"],["Modéliser et résoudre","Modéliser","modèles de comportement, statique, cinématique, grandeurs électriques"],["Expérimenter et simuler","Expérimenter","mesures, écarts, simulation numérique"],["Communiquer","Communiquer","schémas, croquis, présentation d’un projet"]]},
 mt:{nom:"Mathématiques",court:"Maths",suit:"#2C4F8A",th:[["Automatismes","Automatismes","proportions, pourcentages, évolutions, calcul numérique et littéral"],["Suites arithmétiques et géométriques","Suites","terme général, représentation, évolutions en pourcentage"],["Fonctions de référence et second degré","Fonctions","fonctions polynômes du second degré, représentation, racines"],["Dérivation","Dérivation","nombre dérivé, tangente, sens de variation"],["Tableaux croisés et fréquences","Statistiques","croisement de deux variables, fréquences conditionnelles"],["Probabilités conditionnelles","Probabilités","arbres, probabilités conditionnelles"],["Variables aléatoires","Variables aléatoires","loi, espérance, épreuve de Bernoulli"]]},
 sgn:{nom:"Sciences de gestion et numérique",court:"SGN",suit:"#2F6F73",th:[["De l’individu à l’acteur","Individu et acteur","individu dans l’organisation, motivation, travail collaboratif"],["Numérique et intelligence collective","Numérique","outils numériques, système d’information, données"],["Création de valeur et performance","Valeur et performance","création de valeur, performance, indicateurs"]]},
 mgt:{nom:"Management",court:"Management",suit:"#7A2E4D",th:[["À la rencontre du management des organisations","Organisations","organisations, finalités, management, environnement"],["Le management stratégique : du diagnostic à la fixation des objectifs","Diagnostic","diagnostic interne et externe, objectifs stratégiques"],["Les choix stratégiques des organisations","Choix stratégiques","stratégies globales, domaines d’activité, stratégies de domaine"]]},
 frp:{nom:"Français",court:"Français",suit:"#7A2E4D",th:[["Lire et suivre un personnage : itinéraires romanesques","Personnage","roman, personnage, narration, évolution du héros"],["Dire et se faire entendre : la parole, le théâtre, l’éloquence","Parole et théâtre","théâtre, argumentation orale, éloquence"],["Créer, fabriquer : l’invention, l’imaginaire","Imaginaire","poésie, invention, imaginaire, écriture créative"],["Méthode : lecture et écriture","Méthode","analyse de texte, expression écrite, figures de style"]]},
 hgp:{nom:"Histoire-géographie",court:"Histoire-géo",suit:"#8A5A2B",th:[["Les États-Unis et le monde (1776-1945)","États-Unis","indépendance, expansion, puissance mondiale"],["Guerres européennes, guerres mondiales, guerres totales (1789-1945)","Guerres","guerres napoléoniennes, Première et Seconde Guerres mondiales, guerre totale"],["La recomposition du territoire urbain en France","Territoire urbain","métropolisation, périurbanisation, mobilités"],["Les mobilités humaines transnationales","Mobilités","migrations, tourisme, flux de travailleurs"]]},
 mtp:{nom:"Mathématiques",court:"Maths",suit:"#2C4F8A",th:[["Automatismes","Automatismes","proportions, pourcentages, conversions, calcul"],["Statistique à deux variables","Statistiques","nuage de points, ajustement, moyenne"],["Probabilités","Probabilités","expériences aléatoires, fréquences, probabilités"],["Suites numériques","Suites","suites arithmétiques et géométriques"],["Fonctions polynômes du second degré","Second degré","représentation, sens de variation, résolution"],["Vecteurs et géométrie","Géométrie","vecteurs, coordonnées, trigonométrie"],["Algorithmique et programmation","Algorithmique","variables, boucles, Python"]]},
 pcp:{nom:"Physique-chimie",court:"Physique-chimie",suit:"#5B4B8A",th:[["Électricité : régime sinusoïdal, puissance et énergie","Électricité","tension alternative, valeur efficace, puissance, énergie"],["Mécanique : mouvements et forces","Mécanique","vitesse, forces, équilibre"],["Chimie : solutions et réactions","Chimie","solutions, pH, réactions chimiques"],["Signaux : sons et lumière","Signaux","fréquence, intensité sonore, lumière"],["Thermique : énergie et transferts","Thermique","température, chaleur, isolation"]]},
 angp:{nom:"Anglais",court:"Anglais",suit:"#2C4F8A",th:[["Vivre et agir au quotidien","Quotidien","vie quotidienne, services, vocabulaire courant"],["Le travail, hier, aujourd’hui et demain","Travail","métiers, entreprise, entretien, électricité en anglais"],["S’informer et comprendre","S’informer","médias, consignes, documentation technique"],["Se cultiver et se divertir","Culture","loisirs, culture anglophone"],["Voyager","Voyager","transports, réservations, orientation"],["Les sciences et les techniques","Sciences et techniques","innovations, énergie, outils"]]},
 pse:{nom:"Prévention santé environnement",court:"PSE",suit:"#2F6F73",th:[["L’individu responsable de son capital santé","Santé","sommeil, alimentation, activité physique, addictions"],["L’individu dans ses actes de consommation","Consommation","budget, contrats, consommation responsable"],["Prévention des risques professionnels","Risques pro","dangers, accidents du travail, prévention, EPI"],["Gestes de premiers secours","Secours","protéger, alerter, secourir"]]},
 ecog:{nom:"Économie-gestion",court:"Éco-gestion",suit:"#8C3B2E",th:[["Le contexte professionnel","Contexte pro","entreprise, secteur d’activité, partenaires"],["L’insertion dans l’organisation","Insertion","contrat de travail, droits et devoirs, organisation"],["L’organisation de l’activité professionnelle","Organisation","planification, qualité, relation client"]]},
 melec:{nom:"Enseignement professionnel MELEC",court:"MELEC",suit:"#B8860B",th:[["Préparer une opération","Préparation","dossier technique, schémas électriques, nomenclature, plan"],["Réaliser une installation","Réalisation","câblage, appareillage, NF C 15-100, conducteurs"],["Mettre en service et contrôler","Mise en service","essais, mesures, autocontrôle, multimètre"],["Maintenir et dépanner","Maintenance","diagnostic, recherche de panne, remplacement"],["Protection des personnes et des biens","Protections","disjoncteur, différentiel, mise à la terre, régimes de neutre"],["Habilitation et prévention du risque électrique","Habilitation","NF C 18-510, consignation, EPI, symboles d’habilitation"],["Moteurs et commande","Moteurs","moteur asynchrone, démarrage, contacteur, variateur"],["Réseaux et communication","Réseaux","VDI, Ethernet, domotique, objets connectés"],["Énergie et efficacité énergétique","Énergie","photovoltaïque, bornes de recharge, comptage"],["Communiquer avec le client et l’équipe","Communication","compte rendu, explication au client, travail en équipe"]]},
 de:{nom:"Droit et économie",court:"Droit-éco",suit:"#8C3B2E",th:[["Qu’est-ce que le droit ?","Le droit","règle de droit, sources, branches du droit"],["Comment le droit permet-il de régler un litige ?","Litiges","organisation judiciaire, procès, modes amiables"],["Qui peut faire valoir ses droits ?","Personnes","personnalité juridique, capacité, droits extrapatrimoniaux"],["Quels sont les droits reconnus aux personnes ?","Droits","droits patrimoniaux, propriété, contrats"],["Quelles sont les grandes questions économiques ?","Questions économiques","rareté, choix, agents économiques, circuit"],["Comment la richesse est-elle créée et répartie ?","Richesse","production, valeur ajoutée, PIB, répartition des revenus"],["Comment le marché fonctionne-t-il ?","Marché","offre, demande, prix, concurrence"],["Quelles sont les limites du marché ?","Limites du marché","défaillances, rôle de l’État"]]}
};
Object.entries(MATDEF).forEach(([id,m])=>{m.id=id;m.themes=m.th.map((t,i)=>({id:id+"-"+i,t:t[0],c:t[1],n:t[2]}))});
const CLS={"1G":{nom:"Première générale",tronc:["fr","hg","emc","ang","lvb","es"],spes:["maths","pc","svt","ses","hggsp","hlp","amc","llcer","nsi","si"],nspe:3},
  "1STMG":{nom:"Première STMG",tronc:["frt","hgt","emc","ang","lvb","mt"],spes:["sgn","mgt","de"],nspe:0},
  "1MELEC":{nom:"Première bac pro MELEC",tronc:["frp","hgp","emc","mtp","pcp","angp","pse","ecog"],spes:["melec"],nspe:0}};
const LVB=["esp","all","ita"];
function clsOk(c){if(!c||typeof c!=="object"||!CLS[c.niv])return null;const K=CLS[c.niv];
  const spes=K.nspe?(Array.isArray(c.spes)?c.spes.filter(x=>K.spes.includes(x)).slice(0,K.nspe):[]):K.spes.slice();
  const lvb=LVB.includes(c.lvb)?c.lvb:"esp",th={};
  const mats=[...K.tronc.map(x=>x==="lvb"?lvb:x),...spes];
  mats.forEach(m=>{const all=MATDEF[m].themes.map(t=>t.id),v=c.th&&Array.isArray(c.th[m])?c.th[m].filter(x=>all.includes(x)):all;th[m]=v});
  return {niv:c.niv,spes,lvb,th}}
function clsMats(c){c=clsOk(c);if(!c)return [];const K=CLS[c.niv];return [...K.tronc.map(x=>x==="lvb"?c.lvb:x),...c.spes]}
const PGA={};function pgId(mid){const M=MATDEF[mid],base=C.M0||{},vals=Object.values(base).filter(Boolean);if(!vals.length)return mid;if(PGA[mid])return PGA[mid];
  const same=x=>sameMat(M.nom,x.nom||"")||sameMat(M.court,x.court||"")||sameMat(M.court,x.nom||"")||sameMat(M.nom,x.court||"");
  const hit=vals.find(same);if(hit)return PGA[mid]=hit.id;return PGA[mid]=base[mid]?"p-"+mid:mid}
const clsIds=c=>clsMats(c).map(pgId);
const PG={shared:{},mine:{},base:{},req:{},subs:false};
function progFetch(pm,cb){if(PG.req[pm]===2){if(cb)cb();return}PG.wait=PG.wait||{};(PG.wait[pm]=PG.wait[pm]||[]).push(cb||null);if(PG.req[pm]===1)return;PG.req[pm]=1;
  const done=ok=>{PG.req[pm]=ok?2:0;if(!ok)(PG.fail=PG.fail||{})[pm]=Date.now();const w=PG.wait[pm]||[];PG.wait[pm]=[];w.forEach(f=>{try{if(f)f()}catch(e){}})};
  if(typeof fetch!=="function"){done(false);return}
  fetch("prog/"+pm+".json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{if(j&&typeof j==="object")Object.entries(j).forEach(([k,v])=>{if(v&&Array.isArray(v.paquets))PG.base[k]=v});done(!!j);if(j)rebuild()}).catch(()=>done(false))}
function progLoad(){const c=clsOk(P.cls);if(!c)return;clsMats(c).forEach(pm=>{if(!PG.req[pm]&&!(PG.fail&&Date.now()-(PG.fail[pm]||0)<60000))progFetch(pm)});progLoad8(c)}
function progDocOf(tid,local){const ov=PG.shared[tid]||null;local=local||GL.get("prog");const corr=!!(ov&&ov.corr===true&&Array.isArray(ov.paquets)&&ov.paquets.length);
  const d=(corr?ov:null)||PG.base[tid]||PG.mine[tid]||local[tid]||(ov&&Array.isArray(ov.paquets)&&ov.paquets.length?ov:null)||null;
  return {d,masque:(ov&&ov.masque&&typeof ov.masque==="object")?ov.masque:{},corrige:corr}}
const isProg=ch=>!!(ch&&ch.origin==="prog");
const hasSrc=(mid,prog)=>Object.values(C.chaps||{}).some(c=>c.mat===mid&&isProg(c)===prog);
function progReady(mid){return !!IMP.sample||Object.values(C.chaps||{}).some(c=>c.mat===mid&&isProg(c)&&c._gen)}
function srcOf(mid){if(!progReady(mid)&&hasSrc(mid,false))return "cours";const s=P.srcm&&P.srcm[mid];if(s==="prog"||s==="cours")return s;return hasSrc(mid,false)?"cours":"prog"}
function progAdd(addMat){const c=clsOk(P.cls);if(!c)return;const hide=P.hide||{},local=GL.get("prog");progLoad();
  clsMats(c).forEach((pm,mi)=>{const M=MATDEF[pm],mid=pgId(pm);addMat(mid,M.nom,M.court,M.suit);if(C.M[mid]&&C.M[mid].ordre>=100)C.M[mid].ordre=50+mi;
    M.themes.forEach((t,ti)=>{if(!c.th[pm].includes(t.id))return;const pd=progDocOf(t.id,local),d=pd.d,mq=pd.masque,cid="prog."+t.id;
      C.chaps[cid]={id:cid,mat:mid,_pm:pm,titre:t.t,court:t.c,notions:t.n,origin:"prog",src:"programme",ordre:ti,_tid:t.id,_gen:!!d,
        paquets:d?(d.paquets||[]).map(p=>({...p,cartes:(p.cartes||[]).filter(x=>!hide[x.id]&&!mq[x.id])})).filter(p=>p.cartes.length):[],quiz:d?(d.quiz||[]).map(z=>({...z,qs:(z.qs||[]).filter(q=>!mq[q.id])})):[],_corr:pd.corrige}})});progAdd8(c,addMat,hide,local)}
function progInit(){if(!DB||PG.subs)return;PG.subs=true;
  DB.collection("programme").onSnapshot(s=>{PG.shared={};s.docs.forEach(d=>{const v=d.data();if(v)PG.shared[d.id]=v});rebuild()},()=>{});
  if(UID)DB.collection("data/users/"+UID+"/prog").onSnapshot(s=>{PG.mine={};s.docs.forEach(d=>{const v=d.data();if(v)PG.mine[d.id]=v});rebuild()},()=>{})}
async function progGen(ch,btn,st){if(!IMP.sample){st.className="istat err";st.textContent="Ouvre la page connecté sur claude.ai pour que Claude prépare les cartes.";return}
  const M=MATDEF[ch._pm],K=CLS[clsOk(P.cls).niv],tid=ch._tid;btn.disabled=true;st.className="istat";st.textContent="Claude prépare les cartes du programme… Ça peut prendre une minute.";
  const prompt=`Tu prépares des cartes de révision pour un élève de ${K.nom} (lycée, France), matière « ${M.nom} », d’après le programme officiel de l’Éducation nationale.
Thème : « ${ch.titre} ». Notions du programme : ${ch.notions}.
Règles : reste strictement dans le programme officiel de ${K.nom} ; définitions exactes et simples ; pas d’invention ; français correct. 12 à 20 cartes réparties en 2 ou 3 paquets (ex. « Notions », « Dates et repères », « Méthode »), et 8 à 10 questions de quiz à 4 choix.
Réponds uniquement avec ce JSON :
{"paquets":[{"nom":"Notions","cartes":[{"r":"recto court","v":"verso","q":"consigne courte"}]}],"quiz":[{"q":"question","ok":"bonne réponse","no":["fausse 1","fausse 2","fausse 3"],"why":"explication"}]}`;
  try{const d=await IMP.sample.json(prompt);
    const pq=(Array.isArray(d&&d.paquets)?d.paquets:[]).slice(0,4).map((p,pi)=>({k:"p"+pi,nom:clip(p&&p.nom,40)||"Cartes",cartes:(Array.isArray(p&&p.cartes)?p.cartes:[]).filter(c=>c&&c.r&&c.v).slice(0,30).map((c,ci)=>({id:"pg."+tid+"."+pi+"."+ci,r:clip(c.r,160),v:clip(c.v,400),q:clip(c.q,60)}))})).filter(p=>p.cartes.length);
    const qs=(Array.isArray(d&&d.quiz)?d.quiz:[]).filter(q=>q&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2).slice(0,15).map((q,qi)=>({id:"pg."+tid+".q"+qi,q:clip(q.q,240),ok:clip(q.ok,160),no:q.no.slice(0,3).map(x=>clip(x,160)),why:clip(q.why,300)}));
    if(!pq.length){st.className="istat err";st.textContent="Claude n’a pas réussi. Réessaie.";btn.disabled=false;return}
    const doc={tid,mat:ch._pm,titre:ch.titre,niv:clsOk(P.cls).niv,paquets:pq,quiz:qs.length?[{nom:"Quiz · "+ch.court,d:ch.titre,qs}]:[],cree:new Date().toISOString()};
    let where="db";
    try{if(!DB||GUEST||!UID)throw 0;await DB.doc("data/users/"+UID+"/prog/"+tid).set(doc);PG.mine[tid]=doc}
    catch(e){where="local";const g=GL.get("prog");g[tid]=doc;GL.set("prog",g)}
    toast(`<span class="tm">+</span><div><b>Cartes du programme prêtes</b><span>${esc(ch.court)}${where==="local"?" · sur ce téléphone":""}</span></div>`);
    mergeAll();reindex();render()}
  catch(e){btn.disabled=false;st.className="istat"+(e&&e.code==="cancelled"?"":" err");st.textContent=sampleErr(e)}}
function srcSeg(el,mid,cb){if(!el)return;if(!mid||mid[0]==="@"||!hasSrc(mid,true)||!progReady(mid)){el.hidden=true;el.innerHTML="";return}el.hidden=false;
  const s=srcOf(mid),nC=Object.values(C.chaps).filter(c=>c.mat===mid&&!isProg(c)).length,nP=Object.values(C.chaps).filter(c=>c.mat===mid&&isProg(c)).length;
  el.innerHTML=`<span class="segi" aria-hidden="true"></span><button type="button" data-s="cours" class="${s==="cours"?"on":""}">Mon cours · ${nC}</button><button type="button" data-s="prog" class="${s==="prog"?"on":""}">Programme · ${nP}</button>`;
  const pos=()=>{const on=el.querySelector("button.on"),i=el.querySelector(".segi");if(on&&i){i.style.width=on.offsetWidth+"px";i.style.transform=`translateX(${on.offsetLeft}px)`}};requestAnimationFrame(pos);
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>{if(b.dataset.s===s)return;P.srcm=P.srcm||{};P.srcm[mid]=b.dataset.s;saveP();el.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));pos();setTimeout(cb,reduce?0:180)})}
function progCoursHTML(ch){if(!isProg(ch))return "";if(ch._verbes)return verbCoursHTML(ch);
  return `<p class="note progn">Programme officiel de ${esc(ch._cls||CLS[clsOk(P.cls).niv].nom)}, le même pour tout le monde${ch._corr?" (corrigé par l’administrateur)":""}. Ton prof a peut-être fait d’autres choix : masque les cartes qui ne te concernent pas, elles ne reviendront plus pour toi. Tes propres cours sont dans « Mon cours ».${ADM()?" <b>Mode admin</b> : « Masquer pour tous » retire la carte du Programme de tout le monde.":""}</p>
   ${ch._gen?"":`<div class="empty2"><h2>Cartes à préparer</h2><p>Au programme : ${esc(ch.notions)}.</p><div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="pgGo">Préparer les cartes de ce thème</button></div><p class="istat" id="pgSt" role="status"></p></div>`}`}
function progBind(ch){if(!isProg(ch))return;if(ch._verbes&&$("#vbGoC"))$("#vbGoC").onclick=()=>openVerbes(ch._tid);const b=$("#pgGo");if(b)b.onclick=()=>progGen(ch,b,$("#pgSt"));
  document.querySelectorAll("#cours .lc .hidec").forEach(x=>x.onclick=async()=>{if(ADM()){x.disabled=true;try{await admMasque(ch._tid,[x.dataset.id],true);toast(`<span class="tm">−</span><div><b>Carte retirée du Programme</b><span>Pour tout le monde.</span></div>`)}catch(e){x.disabled=false;toast(`<span class="tm">!</span><div><b>Refusé</b><span>${esc(writeErr(e))}</span></div>`)}return}P.hide=P.hide||{};P.hide[x.dataset.id]=1;saveP();toast(`<span class="tm">−</span><div><b>Carte masquée</b><span>Elle ne reviendra plus.</span></div>`);mergeAll();reindex();renderCours()})}

/* ---------- Questionnaire de départ ---------- */
const ONB={open:false,step:0,d:null,later:false};
let PLOADED=false;function onbCheck(){if(P.cls||ONB.open||ONB.later||(!PLOADED&&UID!=="demo"))return;onbOpen()}
function onbOpen(st){const c=clsOk(P.cls);ONB.d=c?JSON.parse(JSON.stringify(c)):{niv:"",spes:[],lvb:"esp",th:{}};ONB.step=c?(st==null?1:st):0;ONB.last=-1;ONB.open=true;let o=$("#onb");
  if(!o){o=document.createElement("div");o.id="onb";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");document.body.appendChild(o)}o.hidden=false;document.body.classList.add("onbon");onbRender()}
function onbClose(){ONB.open=false;const o=$("#onb");if(o)o.hidden=true;document.body.classList.remove("onbon")}
function onbRender(){const o=$("#onb"),D=ONB.d,K=CLS[D.niv],n=4,dots=`<div class="onbdots">${[0,1,2,3].map(i=>`<i class="${i<=ONB.step?"on":""}"></i>`).join("")}</div>`;let h="";
  if(ONB.step===0)h=`<p class="onbk">Bienvenue</p><h1>Tu es en quelle classe ?</h1><p class="onbs">Je prépare le programme officiel de ta classe. Tes cours importés resteront à part.</p>
    <div class="onbcl">${Object.entries(CLS).map(([k,v])=>`<button type="button" class="onbc${D.niv===k?" on":""}" data-niv="${k}"><b>${v.nom}</b><span>${k==="1G"?"Tu choisis tes 3 spécialités":k==="1STMG"?"Management, SGN, Droit et économie":"Électricité et environnements connectés"}</span></button>`).join("")}
    <button type="button" class="onbc" disabled><b>Autre classe</b><span>Bientôt : Seconde, Terminale, autres séries et bacs pro</span></button></div>`;
  if(ONB.step===1){const ns=D.spes.length;h=`<p class="onbk">${K.nom}</p>${K.nspe?`<h1>Tes 3 spécialités</h1><p class="onbs">${ns}/3 choisies</p>
      <div class="onbch">${K.spes.map(s=>`<button type="button" class="${D.spes.includes(s)?"on":""}" data-spe="${s}" ${!D.spes.includes(s)&&ns>=3?"disabled":""}>${esc(MATDEF[s].nom)}</button>`).join("")}</div>`
      :`<h1>${D.niv==="1MELEC"?"Ton métier":"Tes spécialités"}</h1><p class="onbs">${D.niv==="1MELEC"?"L’enseignement professionnel est inclus.":"En "+K.nom+", elles sont fixées."}</p><div class="onbch">${K.spes.map(s=>`<button type="button" class="on" disabled>${esc(MATDEF[s].nom)}</button>`).join("")}</div>`}
    ${K.tronc.includes("lvb")?`<h2 class="onbh">Ta langue vivante B</h2><div class="onbch">${LVB.map(l=>`<button type="button" class="${D.lvb===l?"on":""}" data-lvb="${l}">${MATDEF[l].court}</button>`).join("")}</div>`:""}`}
  if(ONB.step===2){const mats=clsMats(D);mats.forEach(m=>{if(!Array.isArray(D.th[m]))D.th[m]=MATDEF[m].themes.map(t=>t.id)});
    h=`<p class="onbk">${K.nom}</p><h1>Ce que tu veux réviser</h1><p class="onbs">Tout est coché. Décoche les thèmes que tu n’as pas, ou que ton prof t’a dit de laisser de côté. Tu pourras changer plus tard.</p>
    ${mats.map(m=>{const M=MATDEF[m],on=D.th[m];return `<details class="onbm" style="--suit:${M.suit}"><summary><span class="dot"></span><b>${esc(M.nom)}</b><em>${on.length}/${M.themes.length}</em></summary>
      <div class="onbt"><button type="button" class="linkbtn" data-all="${m}">${on.length===M.themes.length?"Tout décocher":"Tout cocher"}</button>${M.themes.map(t=>`<label><input type="checkbox" data-m="${m}" data-t="${t.id}" ${on.includes(t.id)?"checked":""}><span>${esc(t.t)}</span></label>`).join("")}</div></details>`}).join("")}`}
  if(ONB.step===3){const mats=clsMats(D),nt=mats.reduce((a,m)=>a+D.th[m].length,0);
    h=`<p class="onbk">C’est prêt</p><h1>${K.nom}</h1><p class="onbs">${mats.length} matières, ${nt} thèmes du programme officiel.</p>
     <div class="onbrec">${mats.map(m=>`<span style="--suit:${MATDEF[m].suit}"><i class="dot"></i>${esc(MATDEF[m].court)} · ${D.th[m].length}</span>`).join("")}</div>
     <div class="onbinfo"><p><b>Programme officiel</b> : Claude prépare les cartes de chaque thème quand tu l’ouvres. Tu masques celles qui ne te concernent pas.</p><p><b>Mon cours</b> : crée des cartes avec ton cours, depuis Pronote (capture, vidéo d’écran ou texte copié), une photo ou un PDF. Elles restent séparées du programme.</p></div>
     ${myNick()?"":`<label class="lab" for="onbNick">Ton pseudo</label><input id="onbNick" class="inp" maxlength="16" autocomplete="off" placeholder="Ex. Jeremy">`}`}
  const ok=ONB.step===0?!!D.niv:ONB.step===1?(!K.nspe||D.spes.length===3):ONB.step===2?clsMats(D).some(m=>D.th[m].length):true;
  o.innerHTML=`<div class="onbin">${P.cls?`<div class="onbtop"><button class="linkbtn" type="button" id="onbX">Fermer</button></div>`:""}${dots}<div class="onbbody">${h}</div><p class="istat" id="onbSt" role="status"></p>
   <div class="onbnav">${ONB.step?`<button class="btn ghost" type="button" id="onbBack">Retour</button>`:(P.cls?"<span></span>":`<button class="btn ghost" type="button" id="onbLater">Plus tard</button>`)}
   ${P.cls&&ONB.step<3?`<button class="btn ghost" type="button" id="onbSave" ${ok&&clsMats(D).some(m=>(D.th[m]||MATDEF[m].themes).length)?"":"disabled"}>Enregistrer</button>`:""}<button class="btn light" type="button" id="onbNext" ${ok?"":"disabled"}>${ONB.step===3?(P.cls?"Enregistrer":"C’est parti"):"Continuer"}</button></div></div>`;
  if(ONB.last!==ONB.step)o.querySelector(".onbbody").classList.add("fade");ONB.last=ONB.step;
  o.querySelectorAll("[data-niv]").forEach(b=>b.onclick=()=>{if(D.niv!==b.dataset.niv){D.niv=b.dataset.niv;D.spes=[];D.th={}}onbRender()});
  o.querySelectorAll("[data-spe]").forEach(b=>b.onclick=()=>{const s=b.dataset.spe;D.spes=D.spes.includes(s)?D.spes.filter(x=>x!==s):D.spes.concat(s).slice(0,3);onbRender()});
  o.querySelectorAll("[data-lvb]").forEach(b=>b.onclick=()=>{const old=D.lvb;D.lvb=b.dataset.lvb;delete D.th[old];onbRender()});
  o.querySelectorAll("input[data-t]").forEach(x=>x.onchange=()=>{const m=x.dataset.m,t=x.dataset.t;D.th[m]=x.checked?[...new Set(D.th[m].concat(t))]:D.th[m].filter(y=>y!==t);
    const det=x.closest("details");det.querySelector("em").textContent=D.th[m].length+"/"+MATDEF[m].themes.length;det.querySelector("[data-all]").textContent=D.th[m].length===MATDEF[m].themes.length?"Tout décocher":"Tout cocher";$("#onbNext").disabled=!clsMats(D).some(k=>D.th[k].length)});
  o.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{const m=b.dataset.all,all=MATDEF[m].themes.map(t=>t.id);D.th[m]=D.th[m].length===all.length?[]:all;const open=[...o.querySelectorAll("details[open] [data-all]")].map(x=>x.dataset.all);onbRender();o.querySelectorAll("details").forEach(d=>{if(open.includes(d.querySelector("[data-all]").dataset.all))d.open=true})});
  if($("#onbBack"))$("#onbBack").onclick=()=>{ONB.step--;onbRender()};
  if($("#onbLater"))$("#onbLater").onclick=()=>{ONB.later=true;onbClose()};
  if($("#onbX"))$("#onbX").onclick=onbClose;
  if($("#onbSave"))$("#onbSave").onclick=()=>{clsMats(D).forEach(m=>{if(!Array.isArray(D.th[m]))D.th[m]=MATDEF[m].themes.map(t=>t.id)});ONB.step=3;$("#onbNext").onclick.call(null,true)};
  $("#onbNext").onclick=(direct)=>{if(ONB.step<3&&direct!==true){ONB.step++;onbRender();o.scrollTop=0;return}
    const nk=$("#onbNick")?cleanNick($("#onbNick").value):"";if($("#onbNick")&&!nk){$("#onbSt").className="istat err";$("#onbSt").textContent="Choisis un pseudo.";return}
    if(nk){OL.nick=nk;LS.set("nick",nk);LG.nick=nk;if(LG.ok&&!GUEST)lgPush(true)}
    const before=clsIds(P.cls);P.cls=clsOk(D);const mats=clsIds(P.cls);
    const keep=(Array.isArray(P.mats)?P.mats:[]).filter(x=>!before.includes(x)||mats.includes(x)),extra=Object.keys(C.M||{}).filter(x=>!before.includes(x)&&!mats.includes(x)&&Object.values(C.chaps).some(c=>c.mat===x&&!isProg(c)));
    P.mats=[...new Set([...mats,...keep,...extra])];saveP();onbClose();mergeAll();reindex();go("table");
    toast(`<span class="tm">✓</span><div><b>${esc(CLS[P.cls.niv].nom)}</b><span>${before.length?"Modifications enregistrées.":"Ton programme est prêt."}</span></div>`);if(before.length)go("profil")};
}

/* ================= DÉMARRAGE ================= */
let DB=null,UID=null,dbState="wait";
function setSync(){}
function onContent(){mergeAll();reindex();C.ready=true;render();onbCheck();P26ui.emit("contenu")}
(async()=>{
  let db=null,user=null;
  try{[db,user]=await Promise.all([window.claude?.use?.("db"),window.claude?.use?.("user")])}catch(e){}
  if(!db){dbState="off";if(DEMO)bootDemo();else render();return}
  DB=db;dbState="ok";
  try{IMP.isOwner=user?await user.isOwner():false}catch(e){IMP.isOwner=false}
  try{if(user&&!IMP.isOwner&&(await user.can("data.write"))===false)guestOn(true)}catch(e){}
  let got={m:0,c:0,e:0,h:0};const maybe=()=>{if(got.m&&got.c&&got.e&&got.h)onContent();else if(C.ready)onContent()};
  db.collection("matieres").onSnapshot(s=>{C.M0={};s.docs.forEach(d=>{const v=d.data();if(v)C.M0[d.id]=Object.assign({id:d.id},v)});got.m=1;maybe()},()=>{});
  db.collection("chapitres").onSnapshot(s=>{C.chaps0={};s.docs.forEach(d=>{const v=d.data();if(v)C.chaps0[d.id]=Object.assign({id:d.id},v)});got.c=1;maybe()},()=>{});
  db.collection("echeances").onSnapshot(s=>{C.ech0=s.docs.map(d=>Object.assign({id:d.id},d.data()||{})).filter(e=>e.date);got.e=1;maybe()},()=>{});
  db.doc("hub/etat").onSnapshot(s=>{C.etat=s.exists?s.data():null;got.h=1;maybe()},()=>{got.h=1;maybe()});
  try{UID=user?await user.id():null}catch(e){UID=null}
  if(UID){pRef=db.doc("data/users/"+UID+"/progres");
    try{const s=await pRef.get();const r=s.exists?s.data():null;remoteOK=true;const changed=mergeP(r);LS.set("prog",P);
      if(!r||Object.keys(P.c).length>Object.keys((r&&r.c)||{}).length||changed){pDirty=true;flushP()}
      pRef.onSnapshot(sn=>{if(sn.exists&&!sn.metadata.hasPendingWrites&&mergeP(sn.data())){LS.set("prog",P);if(C.ready&&!inDuel&&view!=="jeu")render()}},()=>{});
    }catch(e){remoteOK=false}}
  PLOADED=true;if(C.ready){mergeAll();reindex();render();onbCheck()}
  if(!UID)guestOn(true);
  ligueInit();impInit();paintMyAv();eloBoot();ntStart();amisLoad(true).then(()=>{ntPaint();if(view==="ligue"&&!LG.defi)renderLigue()});
  if(C.ready)render();
})();
(async()=>{try{ROOM=await window.claude?.use?.("room")}catch(e){ROOM=null}roomState=ROOM?"ok":"off";if(view==="duel"&&!inDuel){renderOnlineEntry();arEntryPaint()}})();
document.body.dataset.view="table";document.body.dataset.dos=P.dos||"classique";applySkin();applyTheme();const h0=location.hash.slice(1);go(/^arene=/i.test(h0)?"duel":(views.includes(h0)&&!["verbes","notifs","admin","mod"].includes(h0))?h0:LS.get("view","table"));P26ui._demarrer();
requestAnimationFrame(()=>{dockTo(view);const hl=$("#dockHl");if(hl)requestAnimationFrame(()=>hl.classList.add("ready"))});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>dockTo(view));

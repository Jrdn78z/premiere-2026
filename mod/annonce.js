/* Paquet 1, Admin (T5) : annonce à tous (bandeau d'accueil), page « Nouveautés », entrée « Signaler un bug » du profil.
   Plan §3.4 g, h (et e pour le bouton du profil). Préchargé au démarrage.
   L'annonce est écrite par l'admin et lue dans la table annonces (fin > maintenant) : texte affiché par esc(). */
(function(){
  "use strict";
  /* ---------- Dernière erreur JS et dernier écran (pour « Signaler un bug ») ---------- */
  let ERR="",VUE="";
  addEventListener("error",e=>{try{ERR=String((e&&e.message)||"erreur").slice(0,200)}catch(x){}});
  addEventListener("unhandledrejection",e=>{try{const r=e&&e.reason;ERR=String((r&&r.message)||r||"promesse rejetée").slice(0,200)}catch(x){}});
  P26ui.derniereErreur=()=>ERR;
  P26ui.on("vue",v=>{if(typeof v==="string"&&!["profil","mod","admin","notifs"].includes(v))VUE=v});
  P26ui.derniereVue=()=>VUE||(typeof view==="string"?view:"");

  /* ---------- g) Annonce à tous : bandeau d'accueil ---------- */
  const ANN={t:0,L:null,p:null};
  const connecte=()=>{try{return !!(window.P26&&window.P26.lire&&UID&&!GUEST)}catch(e){return false}};
  const vues=()=>{const v=LS.get("annonce_vue",[]);return Array.isArray(v)?v.filter(x=>Number.isInteger(x)).slice(-30):[]};
  function charger(){if(!connecte())return Promise.resolve([]);if(ANN.L&&Date.now()-ANN.t<120000)return Promise.resolve(ANN.L);if(ANN.p)return ANN.p;
    ANN.p=window.P26.lire("annonces",q=>q.select("id,texte,fin").gt("fin",new Date().toISOString()))
      .then(L=>{ANN.L=(L||[]).filter(a=>a&&Number.isInteger(a.id)&&typeof a.texte==="string").sort((a,b)=>b.id-a.id);ANN.t=Date.now();ANN.p=null;return ANN.L},
        ()=>{ANN.p=null;ANN.t=Date.now();ANN.L=ANN.L||[];return ANN.L});
    return ANN.p}
  const aMontrer=()=>{const v=vues(),n=new Date().toISOString();return (ANN.L||[]).find(a=>!v.includes(a.id)&&String(a.fin)>n)||null};
  function bandeau(el,a){const d=P26ui.bloc(el,"annonce");if(el.firstChild!==d)el.insertBefore(d,el.firstChild);
    d.innerHTML=`<div class="p1ann" role="status"><span class="eyebrow">ANNONCE</span><p>${esc(a.texte.slice(0,160))}</p><button class="btn light" type="button">OK</button></div>`;
    d.querySelector("button").onclick=()=>{LS.set("annonce_vue",vues().concat(a.id).slice(-30));d.remove()}}
  P26ui.on("slot:accueil",el=>{const a=aMontrer();if(a)bandeau(el,a);
    charger().then(()=>{const b=aMontrer();if(!el.isConnected)return;const old=el.querySelector('[data-p1="annonce"]');
      if(b&&!(old&&old.querySelector("p")&&old.querySelector("p").textContent===b.texte.slice(0,160))){if(old)old.remove();bandeau(el,b)}else if(!b&&old)old.remove()})},5);

  /* ---------- h) Nouveautés ---------- */
  const NV=[{n:1,date:"Octobre 2026",titre:"Mise à jour 9, première partie",points:[
    "Épreuve anticipée de maths : automatismes en QCM, épreuve complète chronométrée et note sur 20.",
    "Compte à rebours vers le bac de français et l’épreuve de maths sur l’accueil.",
    "Nouveaux jeux : Survie, Vrai ou faux express et duel à distance classé à l’Elo.",
    "Niveaux de 1 à 100, quêtes de la semaine, série à deux et gel de série.",
    "Boutique : cadres, titres sous le pseudo et effets de victoire, à prix fixes.",
    "Entre amis : fil des amis, classement entre amis, podium à partager en image.",
    "Rappel du soir réglable dans Notifications, au plus un par jour.",
    "Taille du texte et police plus facile à lire dans Profil.",
    "Signaler un pseudo (appui long sur une ligne du classement) ou un bug (Profil).",
    "Raccourcis de l’icône (défi, Arène, verbes) : sur Android seulement, avec un appui long sur l’icône."]}];
  const DER=Math.max(...NV.map(x=>x.n));
  const vu=()=>{const v=Math.round(+(P.p1&&P.p1.nv));return Number.isFinite(v)?v:0};
  P26ui.fusion("nv",(l,d)=>{const a=Math.round(+l),b=Math.round(+d);return Math.max(Number.isFinite(a)?a:0,Number.isFinite(b)?b:0)});
  P26ui.vue("nouveautes",{titre:"Nouveautés",rendre(box){
    box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="p1nvBack">Retour</button></div><h1 class="adh">Nouveautés</h1>`+
      NV.slice().sort((a,b)=>b.n-a.n).map(x=>`<section class="p1nv"><span class="eyebrow">${esc(x.date)}</span><h2>${esc(x.titre)}</h2><ul>${x.points.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></section>`).join("");
    box.querySelector("#p1nvBack").onclick=()=>P26ui.retour();
    if(vu()<DER){P26ui.etat("nv",0);P.p1.nv=DER;saveP()}}});
  P26ui.on("slot:profil",el=>{const d=P26ui.bloc(el,"annonce");const neuf=vu()<DER;
    d.innerHTML=`<div class="exrow p1pf"><button class="btn ghost" type="button" data-a="nv">Nouveautés${neuf?` <span class="p1new">Nouveau</span>`:""}</button><button class="btn ghost" type="button" data-a="bug">Signaler un bug</button></div>`;
    d.querySelector('[data-a="nv"]').onclick=()=>P26ui.ouvrir("nouveautes");
    d.querySelector('[data-a="bug"]').onclick=()=>P26ui.ouvrir("signaler")},60);
})();
P26mod.ok("annonce");

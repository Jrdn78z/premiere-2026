/* ================= Lot P3 : thèmes complets de l'interface =================
   Module préchargé (P26ui.precharger). Cinq thèmes qui redéfinissent les variables CSS du site (--felt, --card, --gold, polices…)
   et ajoutent un motif de fond : Casino, Bibliothèque, Espace, Néon, Papier. Le thème de base reste gratuit. Prix fixes en pièces
   (1 XP gagné = 1 pièce), achats dans P.own / P.buy comme le reste de la boutique, choix dans P.sk.th. Aucun tirage, aucun hasard.
   Essai avant achat : 10 secondes, puis retour au thème d'avant. Un thème non possédé n'est jamais appliqué (revérifié à chaque
   application, y compris après rechargement). Les thèmes de division (chroma des boutons) restent indépendants.
   Rangés dans l'onglet Thèmes de la boutique (emplacement « boutique.themes » posé par patch12.py), avant les thèmes de division.
   Modes sombre et clair : chaque thème a ses deux palettes (themes.css), contrastes vérifiés ; mouvement réduit respecté. */
(function(){
  "use strict";
  const T=window.P3T=window.P3T||{};
  const THEMES=[
    {id:"papier",nom:"Papier",xp:400,desc:"Cahier à petits carreaux, encre et titres à la main."},
    {id:"bibliotheque",nom:"Bibliothèque",xp:500,desc:"Bois sombre, parchemin et lettres classiques."},
    {id:"casino",nom:"Casino",xp:900,desc:"Tapis rouge, or et grandes lettres de néon."},
    {id:"espace",nom:"Espace",xp:1200,desc:"Nuit bleue, étoiles et chiffres de vaisseau."},
    {id:"neon",nom:"Néon",xp:1800,desc:"Violet profond, rose et cyan qui brillent."}];
  const PAR={};THEMES.forEach(t=>{t._k="th:"+t.id;PAR[t.id]=t});
  const has=(o,k)=>!!o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
  const themeOk=id=>typeof id==="string"&&has(PAR,id)?PAR[id]:null;
  const rar=xp=>xp<=150?"c":xp<=500?"r":xp<=1200?"e":"l";
  const RNOM=()=>(window.P2B&&P2B.RNOM)||{c:"Commun",r:"Rare",e:"Épique",l:"Légendaire"};
  T.catalogue=THEMES.map(t=>({id:t.id,nom:t.nom,xp:t.xp,r:rar(t.xp)}));

  /* ---------------- Possession, choix, application ---------------- */
  const possede=t=>!!(t&&P.own&&P.own[t._k]);
  function monTheme(){const t=themeOk(P.sk&&P.sk.th);return t&&possede(t)?t.id:""}
  T.monTheme=monTheme;T.possede=id=>possede(themeOk(id));
  let ESSAI=null;                                           // {id, fin, t} pendant un aperçu
  let META0=null;
  function appliquer(){const id=ESSAI?ESSAI.id:monTheme();const b=document.body;if(!b)return;
    if(id)b.dataset.th=id;else b.removeAttribute("data-th");
    if(ESSAI)b.dataset.thEssai="1";else b.removeAttribute("data-th-essai");
    // Fond du document (zones de rebond) et couleur de la barre du navigateur : celles du thème.
    try{const cs=getComputedStyle(b),m=document.querySelector('meta[name="theme-color"]');if(m&&META0===null)META0=m.getAttribute("content")||"";
      document.documentElement.style.background=id?cs.getPropertyValue("--felt-lo").trim():"";
      if(m)m.setAttribute("content",id?cs.getPropertyValue("--felt").trim():META0)}catch(e){}}
  T.appliquer=appliquer;
  function choisir(id){P.sk=Object.assign({},P.sk||{});P.sk.th=id&&possede(themeOk(id))?id:"";saveP();appliquer();try{lgPush()}catch(e){}}
  T.choisir=choisir;
  appliquer();
  P26ui.on("contenu",appliquer);P26ui.on("vue",appliquer);
  // Passage du mode sombre au mode clair (réglage du profil) : fond du document et barre du navigateur suivent tout de suite.
  try{new MutationObserver(appliquer).observe(document.body,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}

  /* ---------------- Essai 10 secondes ---------------- */
  function essaiFin(){if(!ESSAI)return;clearInterval(ESSAI.t);ESSAI=null;const b=document.getElementById("p3tEssai");if(b)b.remove();appliquer();maj()}
  function essai(id){const t=themeOk(id);if(!t||possede(t))return false;essaiFin();ESSAI={id:t.id,fin:Date.now()+10000,t:null};appliquer();
    const d=document.createElement("div");d.id="p3tEssai";d.className="p3tess";d.setAttribute("role","status");d.setAttribute("aria-live","polite");
    d.innerHTML=`<b>Aperçu : ${esc(t.nom)}</b><span class="p3tcpt">10 s</span><button type="button" class="s2mini" data-p3tstop aria-label="Arrêter l’aperçu">Arrêter</button>`;
    document.body.appendChild(d);d.querySelector("[data-p3tstop]").onclick=essaiFin;
    ESSAI.t=setInterval(()=>{if(!ESSAI)return;const r=Math.max(0,Math.ceil((ESSAI.fin-Date.now())/1000));const s=d.querySelector(".p3tcpt");if(s)s.textContent=r+" s";if(r<=0)essaiFin()},250);
    return true}
  T.essai=essai;T.essaiEnCours=()=>ESSAI?ESSAI.id:"";

  /* ---------------- Achat à prix fixe, en deux touchers (8 s) ---------------- */
  const UI={arme:null,vu:""};
  const arme_=k=>!!(UI.arme&&UI.arme.k===k&&Date.now()-UI.arme.t<8000);
  function secoue(b){buzz([8,60,8]);if(!reduce&&b&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260})}
  function acheter(b,t){if(possede(t))return true;const pr=t.xp;
    if(coins()<pr){secoue(b);toast(`<span class="tm">·</span><div><b>Pas assez de pièces</b><span>Il te manque ${fmtN(pr-coins())} pièces. 1 XP gagné = 1 pièce.</span></div>`);return false}
    if(!arme_(t._k)){UI.arme={k:t._k,t:Date.now()};maj();return false}
    UI.arme=null;if(!buyItem(t))return false;buzz(18);essaiFin();choisir(t.id);try{paintMyAv()}catch(e){}
    toast(`<span class="tm">✓</span><div><b>Thème ${esc(t.nom)} est à toi</b><span>−${fmtN(pr)} pièces · il t’en reste ${fmtN(coins())}</span></div>`);return true}
  function maj(){try{if(typeof view!=="undefined"&&view==="ligue")renderLigue()}catch(e){}}

  /* ---------------- Boutique : rayon posé en tête de l'onglet Thèmes ---------------- */
  const vignette=t=>`<i class="p3tv" data-th="${t.id}" aria-hidden="true"><span class="p3tvc"><b>Aa</b><em></em></span><span class="p3tvb"></span></i>`;
  function rayonHTML(){const cour=monTheme(),R=RNOM();
    const base=`<button type="button" class="p3tt${cour?"":" on"}" data-p3th="" aria-pressed="${!cour}" aria-label="Thème de base, gratuit${cour?"":", choisi"}"><i class="p3tv p3tvbase" aria-hidden="true"><span class="p3tvc"><b>Aa</b><em></em></span><span class="p3tvb"></span></i><b>Tapis vert</b><small>${cour?"Gratuit":"Choisi"}</small></button>`;
    const tuiles=THEMES.map(t=>{const own=possede(t),on=cour===t.id,r=rar(t.xp),k=t._k;
      const etat=on?"Choisi":own?"À toi":fmtN(t.xp)+" pièces";
      return `<button type="button" class="p3tt${on?" on":""}${own?"":" lock"}" data-p3th="${t.id}" data-r="${r}" aria-pressed="${on}" aria-label="Thème ${esc(t.nom)}, ${esc(R[r])}, ${esc(etat)}${own?(on?". Retirer":". Choisir"):". Voir"}">${vignette(t)}<b>${esc(t.nom)}</b><span class="b2r" data-r="${r}">${esc(R[r])}</span><small>${esc(etat)}</small></button>`}).join("");
    const vu=themeOk(UI.vu)||THEMES.find(t=>t.id===cour)||null;
    const detail=vu?`<div class="p3td" data-r="${rar(vu.xp)}"><div><b>${esc(vu.nom)}</b> <span class="b2r" data-r="${rar(vu.xp)}">${esc(R[rar(vu.xp)])}</span><p>${esc(vu.desc)}</p></div>
      <div class="p3tact">${possede(vu)?`<button class="btn light" type="button" data-p3choisir="${vu.id}">${cour===vu.id?"Retirer":"Choisir"}</button>`
        :`<button class="btn ghost" type="button" data-p3essai="${vu.id}" aria-label="Essayer le thème ${esc(vu.nom)} pendant 10 secondes">Essayer 10 s</button>
           <button class="btn light${arme_(vu._k)?" buy":""}" type="button" data-p3achat="${vu.id}" aria-label="Acheter le thème ${esc(vu.nom)} pour ${fmtN(vu.xp)} pièces">${arme_(vu._k)?"Acheter ? "+fmtN(vu.xp):"Acheter · "+fmtN(vu.xp)}</button>`}</div></div>`:"";
    return `<h4 class="p3th4">Thèmes complets</h4><p class="b2note">Toute l’interface change : couleurs, cartes, boutons, polices et motif de fond. Essaie avant d’acheter ; le thème de base reste gratuit. Les thèmes de division ci-dessous restent indépendants.</p>
      <div class="p3tgrid">${base}${tuiles}</div>${detail}<h4 class="p3th4">Thèmes de division</h4>`}
  P26ui.on("slot:boutique.themes",el=>{const d=P26ui.bloc(el,"themes");d.className="p3t";d.innerHTML=rayonHTML();
    d.querySelectorAll("[data-p3th]").forEach(b=>b.onclick=()=>{const id=b.dataset.p3th;if(!id){UI.vu="";UI.arme=null;choisir("");maj();return}const t=themeOk(id);if(!t)return;buzz(8);
      if(possede(t)){choisir(monTheme()===t.id?"":t.id);UI.vu=t.id;maj();return}UI.vu=t.id;UI.arme=null;maj()});
    d.querySelectorAll("[data-p3choisir]").forEach(b=>b.onclick=()=>{const t=themeOk(b.dataset.p3choisir);if(!t||!possede(t))return;choisir(monTheme()===t.id?"":t.id);buzz(8);maj()});
    d.querySelectorAll("[data-p3essai]").forEach(b=>b.onclick=()=>{if(essai(b.dataset.p3essai))buzz(8)});
    d.querySelectorAll("[data-p3achat]").forEach(b=>b.onclick=()=>{const t=themeOk(b.dataset.p3achat);if(!t)return;if(acheter(b,t)){UI.vu=t.id;maj()}})},40);
})();
P26mod.ok("themes");

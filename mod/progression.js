/* ================= Paquet 1, Progresser (T4) : niveaux, quêtes de la semaine, gel de série, séries à deux =================
   Module préchargé (P26ui.precharger). Plan : /home/claude/plans/paquet1.md §3.3 a à d.
   État du compte : P.p1.niv (dernier niveau annoncé), P.p1.qs (compteurs des quêtes par semaine), P.p1.gel ({n, used}).
   Rien ne s'achète au hasard : le gel de série a un prix fixe (150 pièces), les quêtes donnent de l'XP fixe. */
(function(){
  "use strict";
  const T4=window.P1T4=window.P1T4||{};
  // Texte sous le pseudo : un seul fournisseur pour T4 (niveau, titre, flamme), dans cet ordre quel que soit l'ordre de chargement.
  if(!T4.sousPose){T4.sousPose=true;P26ui.sous(r=>["niv","titre","flamme"].map(k=>typeof T4[k]==="function"?T4[k](r):"").filter(Boolean).join(" · "))}

  const ISO=/^\d{4}-\d{2}-\d{2}$/;
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const jour=k=>{const d=new Date(NOW);d.setDate(d.getDate()+k);return isoOf(d)};
  const connecte=()=>typeof UID==="string"&&!!UID&&!(typeof GUEST!=="undefined"&&GUEST);
  const modPresent=m=>Array.isArray(window.P26_MODS)&&window.P26_MODS.includes(m+".js");
  const pousser=()=>{try{lgPush()}catch(e){}};
  const pieces=()=>{try{paintMyAv()}catch(e){}};

  /* ---------------- a) Niveaux 1 à 100 ---------------- */
  const NMAX=100;
  const seuil=n=>5*(n-1)*(n-1)+15*(n-1);                 // XP total pour atteindre le niveau n
  function niveau(xp){xp=Math.max(0,+xp||0);let n=1;while(n<NMAX&&xp>=seuil(n+1))n++;return n}
  T4.niveau=niveau;T4.seuil=seuil;
  const CADRES_NIV={10:"Niveau 10",25:"Niveau 25",50:"Niveau 50",100:"Niveau 100"};
  const annonceNiv=n=>n===5||n%10===0;                   // niveaux publiés dans le fil des amis
  P26ui.ligne(()=>({niv:niveau(totalXP())}));
  P26ui.fusion("niv",(l,d)=>Math.max(N(l,0,NMAX),N(d,0,NMAX)));
  // Niveau affiché : le mien recalculé ; celui d'un autre borné par son XP total publié (lgClean force tot).
  T4.niv=r=>{let n;if(r.me)n=niveau(totalXP());else{if(!("niv" in r))return "";n=N(r.niv,1,NMAX);if("tot" in r)n=Math.min(n,niveau(r.tot))}return "Niv. "+n};
  function nivTexte(){const t=totalXP(),n=niveau(t);
    if(n>=NMAX)return {n,txt:"Niveau 100 · niveau maximum",p:1};
    const a=seuil(n),b=seuil(n+1);return {n,txt:`Niveau ${n} · ${fmtN(b-t)} XP avant le niveau ${n+1}`,p:(t-a)/(b-a)}}
  function nivHTML(){const v=nivTexte();return `<div class="p1niv"><b>${v.txt}</b><span class="bar" style="--p:${Math.max(0,Math.min(1,v.p)).toFixed(3)}"><i></i></span></div>`}
  // annonce=false : mise à niveau silencieuse (premier passage, progression venue d'un autre appareil)
  function nivVerif(annonce){P26ui.etat("niv",0);const n=niveau(totalXP()),prev=N(P.p1.niv,0,NMAX);if(n<=prev)return;
    P.p1.niv=n;saveP();if(!annonce||!prev)return;
    toast(`<span class="tm">${n}</span><div><b>Niveau ${n} !</b><span>${n>=NMAX?"Niveau maximum atteint.":fmtN(seuil(n+1)-totalXP())+" XP avant le niveau "+(n+1)}</span></div>`);
    for(let k=prev+1;k<=n;k++){if(annonceNiv(k)&&window.P26&&P26.evenements)P26.evenements.add("niveau",{n:k});
      if(CADRES_NIV[k])toast(`<span class="tm">◎</span><div><b>Cadre gagné : ${CADRES_NIV[k]}</b><span>Choisis-le dans la boutique, onglet Cadres.</span></div>`)}
    pousser()}
  P26ui.on("xp",()=>{nivVerif(true);quVerif()});

  /* ---------------- b) Quêtes de la semaine ---------------- */
  const QUEST_BONUS=40;
  const QS=[
    {id:"rep",nom:"Réponds à 100 questions ou cartes",but:100,c:"r"},
    {id:"soirs",nom:"Révise 5 soirs différents",but:5,f:()=>soirs()},
    {id:"cartes",nom:"Gagne 30 cartes",but:30,c:"c"},
    {id:"survie",nom:"Atteins 15 en Survie",but:15,c:"sv",mod:"survie"},
    {id:"vf",nom:"Fais 20 bonnes réponses en Vrai ou faux express",but:20,c:"vf",mod:"vraifaux"},
    {id:"auto",nom:"Termine un entraînement d’automatismes",but:1,c:"ep",mod:"epreuve"},
    {id:"duelx",nom:"Joue un duel à distance",but:1,c:"dx",mod:"duelx"},
    {id:"arene",nom:"Joue une partie d’Arène",but:1,c:"ar"}];
  // Les mêmes pour tous : ordre tiré de hash(semaine) ; une quête dont le mode manque est remplacée par la suivante.
  function quetesDe(w){return sshuffle(QS,rng(parseInt(hash("quetes:"+w),36)|0)).filter(q=>!q.mod||modPresent(q.mod)).slice(0,3)}
  T4.quetesDe=quetesDe;
  function soirs(){let n=0;for(let i=0;i<7;i++){const d=new Date(mondayOf(NOW));d.setDate(d.getDate()+i);if(P.j[isoOf(d)])n++}return n}
  function sem(){const qs=P26ui.etat("qs",{});if(!qs||typeof qs!=="object"||Array.isArray(qs))P.p1.qs={};
    const S=P.p1.qs[WEEK]=P.p1.qs[WEEK]&&typeof P.p1.qs[WEEK]==="object"?P.p1.qs[WEEK]:{};if(!S.fait||typeof S.fait!=="object")S.fait={};
    const ks=Object.keys(P.p1.qs).filter(k=>ISO.test(k)).sort().reverse();Object.keys(P.p1.qs).forEach(k=>{if(!ks.slice(0,4).includes(k))delete P.p1.qs[k]});return S}
  const avance=q=>Math.min(q.but,q.f?q.f():N(sem()[q.c],0,1e6));
  function quVerif(){const S=sem();let gain=0;
    for(const q of quetesDe(WEEK)){if(S.fait[q.id]||avance(q)<q.but)continue;S.fait[q.id]=1;gain++;saveP();
      toast(`<span class="tm">✓</span><div><b>Quête réussie : ${esc(q.nom)}</b><span>+${QUEST_BONUS} XP (dans le plafond du jour)</span></div>`);gainXP(QUEST_BONUS)}
    if(gain&&view==="quetes")render()}
  P26ui.fusion("qs",(l,d)=>{const o={};for(const src of [l,d]){if(!src||typeof src!=="object"||Array.isArray(src))continue;
      for(const [w,v] of Object.entries(src)){if(!ISO.test(w)||!v||typeof v!=="object")continue;const t=o[w]=o[w]||{fait:{}};
        for(const [k,x] of Object.entries(v)){if(k==="fait"){if(x&&typeof x==="object")Object.keys(x).forEach(id=>{if(/^[a-z]{1,12}$/.test(id))t.fait[id]=1})}
          else if(/^[a-z]{1,4}$/.test(k))t[k]=Math.max(t[k]||0,N(x,0,1e6))}}}
    Object.keys(o).sort().reverse().slice(4).forEach(k=>delete o[k]);return o});
  const compte=(k,n,max)=>{const S=sem();S[k]=max?Math.max(N(S[k],0,1e6),n):N(S[k],0,1e6)+n;saveP()};
  P26ui.on("reponse",d=>{if(!d)return;compte("r",1);if(d.ok===true&&d.mode==="carte")compte("c",1);quVerif()});
  P26ui.on("activite",d=>{if(!d||typeof d!=="object")return;
    if(d.type==="survie")compte("sv",N(d.score,0,10000),true);
    else if(d.type==="vf")compte("vf",N(d.bonnes,0,1000));
    else if(d.type==="epreuve")compte("ep",1);
    else if(d.type==="duelx")compte("dx",1);
    else if(d.type==="arene")compte("ar",1,true);
    else return;quVerif()});
  P26ui.on("arene.fin",()=>{compte("ar",1,true);quVerif()});    // l'application l'émet elle-même (maj8.js)
  function quHTML(court){const L=quetesDe(WEEK),S=sem(),fini=L.filter(q=>S.fait[q.id]).length;
    if(court)return `<button type="button" class="p1qr" data-p1go="quetes"><b>Quêtes de la semaine</b><span>${fini} / ${L.length}</span></button>`;
    return `<div class="sec"><h2>Quêtes de la semaine</h2><span>${fini} / ${L.length}</span></div><p class="p1note">Les mêmes pour tout le monde. +${QUEST_BONUS} XP par quête, dans le plafond de ${CAP} XP par jour. Nouvelles quêtes lundi.</p>
      <ul class="p1ql">${L.map(q=>{const a=avance(q),ok=!!S.fait[q.id];return `<li class="${ok?"ok":""}"><b>${esc(q.nom)}</b><span class="bar" style="--p:${(a/q.but).toFixed(3)}"><i></i></span><small>${ok?"Réussie":fmtN(a)+" / "+fmtN(q.but)}</small></li>`}).join("")}</ul>`}
  P26ui.on("slot:quetes",el=>{P26ui.bloc(el,"progression").innerHTML=quHTML(false)},20);

  /* ---------------- Accueil et profil ---------------- */
  P26ui.on("slot:accueil",el=>{const d=P26ui.bloc(el,"progression");d.className="p1acc";d.innerHTML=nivHTML()+quHTML(true);
    d.querySelector("[data-p1go]").onclick=()=>go("quetes")},20);
  P26ui.on("slot:profil",el=>{P26ui.bloc(el,"progression").innerHTML=nivHTML()+gelHTML()},20);

  /* ---------------- c) Gel de série ---------------- */
  // Stock = gels achetés (clés P.buy « gel:<date> », réunies d'un appareil à l'autre) moins gels utilisés (P.p1.gel.used).
  const GEL_PRIX=150,GEL_MAX=2;
  function gelEtat(){const g=P26ui.etat("gel",{n:0,used:{}});if(!g||typeof g!=="object"||Array.isArray(g))P.p1.gel={n:0,used:{}};
    if(!P.p1.gel.used||typeof P.p1.gel.used!=="object"||Array.isArray(P.p1.gel.used))P.p1.gel.used={};return P.p1.gel}
  const gelAchetes=()=>Object.keys(P.buy||{}).filter(k=>/^gel:\d{1,15}$/.test(k)).length;
  function gelStock(){const g=gelEtat(),s=Math.max(0,gelAchetes()-Object.keys(g.used).length);g.n=s;return s}
  T4.gelStock=gelStock;T4.GEL_PRIX=GEL_PRIX;T4.GEL_MAX=GEL_MAX;
  T4.gelAcheter=()=>{if(gelStock()>=GEL_MAX)return "plein";if(coins()<GEL_PRIX)return "pieces";
    P.buy["gel:"+Date.now()]=GEL_PRIX;gelStock();saveP();pieces();return "ok"};
  P26ui.gel=iso=>{const g=P.p1&&P.p1.gel;return !!(g&&g.used&&typeof g.used==="object"&&g.used[iso])};
  P26ui.fusion("gel",(l,d)=>{const u={};[l,d].forEach(x=>{if(x&&x.used&&typeof x.used==="object")Object.keys(x.used).forEach(k=>{if(ISO.test(k))u[k]=1})});
    return {n:N(l&&l.n!=null?l.n:d&&d.n,0,GEL_MAX),used:u}});
  function gelAppliquer(){const h=jour(-1),ah=jour(-2),g=gelEtat();
    if(P.j[h]||g.used[h]||!(P.j[ah]||g.used[ah])||gelStock()<1)return false;
    g.used[h]=1;gelStock();saveP();toast(`<span class="tm">❄</span><div><b>Ton gel de série a protégé ta série d’hier.</b><span>Série : ${streakNow()} soir${streakNow()>1?"s":""}</span></div>`);return true}
  T4.gelAppliquer=gelAppliquer;
  function gelHTML(){const s=gelStock();return `<p class="p1note">Gel de série : ${s} sur ${GEL_MAX}. ${s?"Un soir raté sera pardonné.":"Achète-en dans la boutique, onglet Objets utiles."}</p>`}
  // Attend la progression du compte (sinon un soir révisé sur un autre appareil serait pris pour un soir raté).
  (function gelDemarrer(k){if(typeof remoteOK!=="undefined"&&!remoteOK&&connecte()&&k<6){setTimeout(()=>gelDemarrer(k+1),2000);return}
    nivVerif(false);if(gelAppliquer()&&typeof view!=="undefined"&&view==="table")render()})(0);

  /* ---------------- d) Séries à deux (calculées par la base, sans les jours de l'ami) ---------------- */
  const S2={rows:null,t:0,absent:false,cours:null};
  const nomAmi=id=>{const a=(typeof NT!=="undefined"&&NT.amis||[]).find(x=>x.id===id&&x.ok);return a?a.pseudo:""};
  const soirsTxt=n=>n+" soir"+(n>1?"s":"");
  function s2Charger(force){if(S2.absent||!connecte()||!window.P26||typeof P26.rpc!=="function")return Promise.resolve();
    if(S2.cours)return S2.cours;if(!force&&Date.now()-S2.t<60000)return Promise.resolve();S2.t=Date.now();
    S2.cours=P26.rpc("series_amis").then(d=>{const av=JSON.stringify(S2.rows);
        S2.rows=(Array.isArray(d)?d:[]).filter(x=>x&&typeof x.ami==="string"&&/^[0-9a-f-]{36}$/.test(x.ami)).map(x=>({ami:x.ami,n:N(x.n,0,10000)}));
        s2Fete();if(av!==JSON.stringify(S2.rows)&&view==="ligue"&&!LG.defi)renderLigue()},
      e=>{if(e&&e.code==="absent"){S2.absent=true;S2.rows=null;if(view==="ligue"&&!LG.defi)renderLigue()}}).finally(()=>{S2.cours=null});
    return S2.cours}
  T4.s2Charger=s2Charger;T4.S2=S2;
  function s2Fete(){const vu=LS.get("s2vu",{});let ch=false;
    for(const r of S2.rows||[]){if(r.n<7||r.n%7)continue;const nom=nomAmi(r.ami);if(!nom||vu[r.ami]===r.n)continue;vu[r.ami]=r.n;ch=true;
      toast(`<span class="tm">${r.n}</span><div><b>Série à deux : ${soirsTxt(r.n)} avec ${esc(nom)} !</b><span>Révisez encore ce soir pour la garder.</span></div>`)}
    if(ch)LS.set("s2vu",vu)}
  T4.flamme=r=>{if(!r||!r.ami||!S2.rows)return "";const x=S2.rows.find(s=>s.ami===r.id);return x&&x.n>0?`<span class="p1fl">${x.n} à deux</span>`:""};
  P26ui.on("slot:ligue.haut",el=>{s2Charger();if(S2.absent||!S2.rows||!connecte())return;
    const L=S2.rows.map(r=>({nom:nomAmi(r.ami),n:r.n})).filter(r=>r.nom);if(!L.length&&!(NT.amis||[]).some(a=>a.ok))return;
    const on=L.filter(r=>r.n>0).sort((a,b)=>b.n-a.n);
    P26ui.bloc(el,"progression").innerHTML=`<div class="p1s2"><b>Séries à deux</b> ${on.length?on.map(r=>`<span>${esc(r.nom)} ${soirsTxt(r.n)}</span>`).join(" · "):`<span>Révisez le même soir, toi et un ami, pour lancer une série à deux.</span>`}</div>`},30);
  if(window.P26&&P26.ready&&typeof P26.ready.then==="function")P26.ready.then(()=>setTimeout(()=>s2Charger(true),400),()=>{});

  /* ---------------- f) Ambiance : chargée à la demande (réglages du profil, barre du focus) ---------------- */
  const amb=()=>window.P26mod?window.P26mod("ambiance"):Promise.reject(new Error("P26mod absent"));
  P26ui.on("slot:profil.reglages",el=>{const d=P26ui.bloc(el,"ambiance");amb().then(()=>{if(T4.amb&&d.isConnected)T4.amb.bloc(d)},()=>{d.remove()})},60);
  // Pas d'emplacement dans la barre du focus (index.html fixe) : ambiance.js y ajoute sa rangée quand le focus est ouvert.
  P26ui.on("carte",()=>{if(document.body.classList.contains("focus"))amb().then(()=>{if(T4.amb)T4.amb.barre()},()=>{})});
})();
P26mod.ok("progression");

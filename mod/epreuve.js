/* Paquet 1, Réviser (T2) : entraînement à l'épreuve anticipée de maths (vue « epreuve », #m=epreuve, #m=epreuve:auto).
   Trois modes : automatismes (12 QCM, 20 min, /6 puis /20), épreuve complète (12 QCM puis 3 exercices de 7 questions
   du Programme de maths de la classe, 2 h, /20), par thème (sans chrono, correction immédiate).
   Données : prog/automatismes.json (build_auto.py) ; partie 2 : prog/maths.json (1G) ou prog/mt.json (1STMG).
   La carte d'entrée (onglet Duel) est posée par revision.js, préchargé. */
(function(){
  "use strict";
  const THEMES={"proportions":"Proportions","evolutions":"Évolutions","calcul-numerique":"Calcul numérique","calcul-algebrique":"Calcul algébrique",
    "fonctions":"Fonctions","second-degre":"Second degré","derivation":"Dérivation","suites":"Suites","exponentielle":"Exponentielle",
    "trigonometrie":"Trigonométrie","produit-scalaire":"Produit scalaire","statistiques":"Statistiques","probabilites":"Probabilités"};
  const MODES={auto:{nom:"Automatismes",dur:20*60e3},complete:{nom:"Épreuve complète",dur:120*60e3}};
  const NB_AUTO=12,NB_EX=3,NB_EXQ=7;
  const SOUS="Lundi 21 juin 2027, 2 h, sans calculatrice. Partie 1 : automatismes. Partie 2 : exercices.";
  const AVERT="Les exercices viennent des questions du Programme. Les vrais sujets ont des exercices rédigés : entraîne-toi aussi avec les sujets zéro officiels.";
  let DATA=null,DATAP=null;const PROG={};
  // EP.phase : accueil | intro | q | pause (entre les deux parties) | fin | theme | tq (question par thème) | tfin
  const EP={phase:"accueil",mode:"",qs:[],i:0,t0:0,dur:0,T:null,fin:null,partie:1,tq:0,theme:"",msg:""};
  let BOX=null;

  /* ---------- Outils ---------- */
  const virg=x=>String(Math.round(x*10)/10).replace(".",",");
  const demi=x=>Math.round(x*2)/2;
  const horloge=ms=>{const s=Math.ceil(Math.max(0,ms)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sc=s%60;return (h?h+":"+pad(m):m)+":"+pad(sc)};
  const classe=()=>{try{const c=clsOk(P.cls);return c?c.niv:""}catch(e){return ""}};
  const matDeLaClasse=()=>classe()==="1STMG"?"mt":"maths";
  const choix=(bonne,mauvaises)=>shuffle([{t:bonne,ok:1},...mauvaises.map(t=>({t,ok:0}))]);
  const ici=()=>BOX&&BOX.isConnected&&BOX.dataset.vue==="epreuve"&&view==="mod";

  function charger(){if(DATA)return Promise.resolve(DATA);if(DATAP)return DATAP;
    DATAP=fetch("prog/automatismes.json").then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.json()}).then(j=>{
      if(!j||j.format!=="premiere-2026-automatismes"||!Array.isArray(j.questions))throw new Error("format");
      DATA=j.questions.filter(q=>q&&/^auto-\d{2}$/.test(q.id)&&THEMES[q.theme]&&typeof q.enonce==="string"&&typeof q.bonne==="string"&&Array.isArray(q.mauvaises)&&q.mauvaises.length===3);
      return DATA}).catch(e=>{DATAP=null;throw e});
    return DATAP}
  function chargerProg(mat){if(PROG[mat])return Promise.resolve(PROG[mat]);
    return fetch("prog/"+mat+".json").then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.json()}).then(j=>{
      const L=[];Object.values(j||{}).forEach(ch=>{const qs=((ch&&ch.quiz&&ch.quiz[0]&&ch.quiz[0].qs)||[]).filter(q=>q&&q.id&&q.q&&q.ok&&Array.isArray(q.no)&&q.no.length>=2);
        if(qs.length>=NB_EXQ)L.push({titre:String(ch.titre||""),qs})});
      return PROG[mat]=L})}

  // 12 questions, au moins 6 thèmes différents : une par thème sur 6 thèmes tirés, puis 6 au hasard parmi les autres.
  function tirerAuto(qs){qs=qs||DATA||[];const th=shuffle(Object.keys(THEMES)).filter(t=>qs.some(q=>q.theme===t));
    const pris=th.slice(0,6).map(t=>shuffle(qs.filter(q=>q.theme===t))[0]);
    const reste=shuffle(qs.filter(q=>!pris.includes(q))).slice(0,NB_AUTO-pris.length);
    return shuffle([...pris,...reste])}
  const qAuto=q=>({id:q.id,partie:1,enonce:q.enonce,choix:choix(q.bonne,q.mauvaises),bonne:q.bonne,expl:q.explication||"",etiq:THEMES[q.theme]||"",rep:null,ms:0});
  function tirerExercices(L){return shuffle(L).slice(0,NB_EX).map((ch,k)=>shuffle(ch.qs).slice(0,NB_EXQ).map((q,n)=>
    ({id:q.id,partie:2,ex:k+1,n:n+1,enonce:q.q,choix:choix(q.ok,q.no.slice(0,3)),bonne:q.ok,expl:q.why||"",etiq:"Exercice "+(k+1)+" · "+ch.titre,rep:null,ms:0}))).flat()}
  // Points : automatismes 0,5 chacun (/6) ; exercices ramenés sur 14 (2/3 de point par question pour 21 questions). Note /20 au demi-point.
  function note(mode,b1,n1,b2,n2){const a=b1*0.5;if(mode==="auto"){const max=n1*0.5||6;return {a,e:null,n:demi(a/max*20)}}
    const e=n2?b2/n2*14:0;return {a,e,n:demi(a+e)}}

  /* ---------- Enregistrement ---------- */
  function garder(r){const ep=P26ui.etat("ep",{});const d=new Date();const k=isoOf(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
    ep[k]={a:r.a,e:r.e,n:r.n,ms:r.ms,mode:r.mode};const ks=Object.keys(ep).sort();ks.slice(0,Math.max(0,ks.length-30)).forEach(x=>delete ep[x]);saveP()}
  function derniers(){const ep=(P.p1&&P.p1.ep)||{};return Object.keys(ep).sort().reverse().slice(0,3).map(k=>Object.assign({k},ep[k]))}

  /* ---------- Déroulé de l'épreuve ---------- */
  function demarrer(mode){
    return charger().then(()=>{const qs=tirerAuto().map(qAuto);
      if(mode==="complete")return chargerProg(matDeLaClasse()).then(L=>({qs,ex:tirerExercices(L)}));return {qs,ex:[]}})
    .then(({qs,ex})=>{if(mode==="complete"&&!ex.length){EP.msg="Les exercices n’ont pas pu être préparés. Réessaie plus tard ou fais les automatismes.";EP.phase="intro";dessiner();return}
      Object.assign(EP,{phase:"q",mode,qs:qs.concat(ex),i:0,partie:1,t0:Date.now(),tq:Date.now(),dur:MODES[mode].dur,fin:null,msg:""});
      clearInterval(EP.T);EP.T=setInterval(tic,1000);dessiner();try{window.scrollTo(0,0)}catch(e){}})
    .catch(()=>{EP.msg="Les questions n’ont pas pu être chargées. Vérifie ta connexion puis réessaie.";dessiner()})}
  function reste(){return EP.dur-(Date.now()-EP.t0)}
  function tic(){if(EP.phase!=="q"&&EP.phase!=="pause"){clearInterval(EP.T);EP.T=null;return}
    const l=reste();const c=document.getElementById("epClock");if(c)c.textContent=horloge(l);
    if(l<=0)terminer(true)}
  function compter(){const Q=EP.qs[EP.i];if(Q&&EP.phase==="q"){Q.ms+=Date.now()-EP.tq}EP.tq=Date.now()}
  function aller(i){compter();EP.i=i;dessiner()}
  function terminer(tempsEcoule){if(EP.phase!=="q"&&EP.phase!=="pause")return;compter();clearInterval(EP.T);EP.T=null;
    const p1=EP.qs.filter(q=>q.partie===1),p2=EP.qs.filter(q=>q.partie===2);const juste=q=>q.rep!=null&&!!q.choix[q.rep].ok;
    EP.qs.forEach(q=>{if(q.rep!=null)jrn(q.id,juste(q),Math.round(q.ms)||null,"examen")});
    const b1=p1.filter(juste).length,b2=p2.filter(juste).length,r=note(EP.mode,b1,p1.length,b2,p2.length);
    const ms=Math.min(EP.dur,Date.now()-EP.t0);
    EP.fin=Object.assign({},r,{b1,n1:p1.length,b2,n2:p2.length,ms,mode:EP.mode,temps:!!tempsEcoule});EP.phase="fin";EP.vu=false;
    garder(EP.fin);try{gainXP(b1+b2)}catch(e){}
    P26ui.emit("activite",{type:"epreuve",note:r.n,mode:EP.mode});
    dessiner();
    if(r.n>=16)setTimeout(()=>P26ui.emit("victoire",{type:"epreuve",el:document.getElementById("modv")}),0)}

  /* ---------- Rendu ---------- */
  function entete(titre){return `<div class="ihead"><h1>${esc(titre)}</h1><button class="linkbtn" type="button" id="epBack">Retour</button></div>`}
  function dessiner(){if(!ici())return;const b=BOX;
    if(classe()==="1MELEC"){b.innerHTML=entete("Épreuve anticipée de maths")+`<p class="lgsub">L’épreuve anticipée de maths concerne la Première générale et la Première STMG. Ta classe n’est pas concernée.</p>`;lier();return}
    ({accueil:vAccueil,intro:vIntro,q:vQuestion,pause:vPause,fin:vFin,theme:vThemes,tq:vThemeQ,tfin:vThemeFin}[EP.phase]||vAccueil)(b);lier()}
  function lier(){const b=BOX;const k=b.querySelector("#epBack");if(k)k.onclick=()=>{if(EP.phase==="tq"||EP.phase==="tfin"){EP.phase="theme";dessiner()}else if(EP.phase==="intro"||EP.phase==="theme"||EP.phase==="fin"){EP.phase="accueil";EP.msg="";dessiner()}else P26ui.retour()};
    b.querySelectorAll("[data-ep]").forEach(x=>x.onclick=()=>choisir(x.dataset.ep))}
  function choisir(m){EP.msg="";if(m==="theme"){EP.phase="theme";dessiner();charger().then(dessiner,()=>{EP.msg="Les questions n’ont pas pu être chargées. Vérifie ta connexion puis réessaie.";dessiner()});return}
    if(MODES[m]){EP.mode=m;EP.phase="intro";dessiner()}}
  function histo(){const L=derniers();if(!L.length)return "";
    return `<div class="sec"><h2>Mes dernières notes</h2></div><div class="ephist">${L.map(x=>{const d=parseIso(x.k.slice(0,10));
      return `<div><span>${esc(fmtShort.format(d))}</span><span>${esc(x.mode==="complete"?"Épreuve complète":"Automatismes")}</span><b>${esc(virg(x.n))}/20</b></div>`}).join("")}</div>`}
  function vAccueil(b){b.innerHTML=entete("Épreuve anticipée de maths")+`<p class="lgsub">${esc(SOUS)}</p>
    <div class="epmodes">
     <button type="button" class="epmode" data-ep="auto"><b>Automatismes</b><span>12 questions à choix, 20 minutes, note sur 6 puis sur 20.</span></button>
     <button type="button" class="epmode" data-ep="complete"><b>Épreuve complète</b><span>Les automatismes, puis 3 exercices. 2 heures, note sur 20.</span></button>
     <button type="button" class="epmode" data-ep="theme"><b>Par thème</b><span>Les 13 thèmes des automatismes, sans chrono, correction tout de suite.</span></button>
    </div>${EP.msg?`<p class="istat err" role="status">${esc(EP.msg)}</p>`:""}${histo()}`}
  function vIntro(b){const M=MODES[EP.mode];
    b.innerHTML=entete(M.nom)+`<div class="bbcard epintro"><p class="epcalc">Calculatrice interdite : prends un brouillon.</p>
     <ul>${EP.mode==="auto"?`<li>12 questions à choix, une seule bonne réponse.</li><li>20 minutes. 0,5 point par bonne réponse : note sur 6, puis ramenée sur 20.</li>`
       :`<li>Partie 1 : 12 automatismes à choix (6 points).</li><li>Partie 2 : 3 exercices de 7 questions (14 points).</li><li>2 heures en tout. Une fois en partie 2, tu ne reviens plus aux automatismes.</li>`}
      <li>Tu peux changer de réponse et revenir en arrière. La correction arrive à la fin.</li></ul>
     ${EP.mode==="complete"?`<p class="epwarn">${esc(AVERT)}</p>`:""}
     <button class="btn" type="button" id="epGo">Commencer</button></div>${EP.msg?`<p class="istat err" role="status">${esc(EP.msg)}</p>`:""}`;
    b.querySelector("#epGo").onclick=e=>{e.target.disabled=true;demarrer(EP.mode)}}
  function vQuestion(b){const Q=EP.qs[EP.i];const part=EP.qs.filter(q=>q.partie===Q.partie),k=part.indexOf(Q);
    const titre=Q.partie===1?"Partie 1 · Automatismes":"Partie 2 · Exercices";const derniere=EP.i===EP.qs.length-1,finP1=EP.mode==="complete"&&Q.partie===1&&k===part.length-1;
    b.innerHTML=`<div class="bbtime"><span>${titre} · ${k+1} / ${part.length}</span><span><b id="epClock">${horloge(reste())}</b></span></div>
     <div class="qcard epq" style="--suit:${suitOf(matDeLaClasse())}"><div class="role"><span>${esc(Q.etiq)}</span><span>${Q.partie===2?"Question "+Q.n+" / "+NB_EXQ:"Sans calculatrice"}</span></div>
      <h2>${tex(Q.enonce)}</h2>
      <div role="group" aria-label="Réponses">${Q.choix.map((o,i)=>`<button class="opt${Q.rep===i?" on":""}" type="button" data-i="${i}" aria-pressed="${Q.rep===i}">${tex(o.t)}</button>`).join("")}</div>
      <div class="epnav"><button class="btn ghost" type="button" id="epPrev"${k===0?" disabled":""}>Précédente</button>
       ${derniere?`<button class="btn" type="button" id="epEnd">Rendre ma copie</button>`:finP1?`<button class="btn" type="button" id="epP2">Passer à la partie 2</button>`:`<button class="btn" type="button" id="epNext">Suivante</button>`}</div></div>
     <div class="dots epdots">${part.map(q=>`<i class="${q===Q?"cur":q.rep!=null?"w":""}"></i>`).join("")}</div>
     <div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" id="epStop">Rendre ma copie maintenant</button></div>`;
    b.querySelectorAll(".opt").forEach(x=>x.onclick=()=>{Q.rep=+x.dataset.i;b.querySelectorAll(".opt").forEach(y=>{const on=y===x;y.classList.toggle("on",on);y.setAttribute("aria-pressed",String(on))});
      const d=b.querySelectorAll(".epdots i")[k];if(d)d.className="cur w"});
    const pr=b.querySelector("#epPrev");pr.onclick=()=>{if(k>0)aller(EP.i-1)};
    const nx=b.querySelector("#epNext");if(nx)nx.onclick=()=>aller(EP.i+1);
    const p2=b.querySelector("#epP2");if(p2)p2.onclick=()=>{compter();EP.phase="pause";dessiner()};
    const en=b.querySelector("#epEnd");if(en)en.onclick=()=>terminer(false);
    b.querySelector("#epStop").onclick=()=>terminer(false)}
  function vPause(b){const n=EP.qs.filter(q=>q.partie===1&&q.rep==null).length;
    b.innerHTML=`<div class="bbtime"><span>Fin de la partie 1</span><span><b id="epClock">${horloge(reste())}</b></span></div>
     <div class="bbcard epintro"><h3>Partie 2 : exercices</h3><p>3 exercices de 7 questions, 14 points. ${n?n+" automatisme"+(n>1?"s":"")+" sans réponse : ":""}tu ne pourras plus revenir aux automatismes.</p>
      <p class="epwarn">${esc(AVERT)}</p>
      <div class="exrow"><button class="btn" type="button" id="epGo2">Commencer la partie 2</button><button class="btn ghost" type="button" id="epBack1">Revoir les automatismes</button></div></div>`;
    b.querySelector("#epGo2").onclick=()=>{EP.phase="q";EP.i=EP.qs.findIndex(q=>q.partie===2);EP.tq=Date.now();dessiner()};
    b.querySelector("#epBack1").onclick=()=>{EP.phase="q";EP.tq=Date.now();dessiner()}}
  function vFin(b){const F=EP.fin;EP.vu=true;const faux=EP.qs.filter(q=>q.rep==null||!q.choix[q.rep].ok);
    const msg=F.n>=16?"Très bien. Tu es prêt pour cette partie.":F.n>=12?"Bien. Relis les corrections ci-dessous.":F.n>=8?"Pas loin. Les corrections t’aident à progresser.":"Relis les corrections, puis refais un entraînement dans quelques jours.";
    b.innerHTML=entete(MODES[F.mode].nom)+(F.temps?`<p class="istat err" role="status">Temps écoulé : on corrige ce que tu as fait.</p>`:"")+`
     <div class="result"><div class="sc">${esc(virg(F.n))}/20</div><p class="epnote">Ta note : ${esc(virg(F.n))}/20</p><p>${msg}</p>
      <div class="ephist eppts"><div><span>Automatismes</span><span>${F.b1} / ${F.n1} justes</span><b>${esc(virg(F.a))}/6</b></div>${F.mode==="complete"?`<div><span>Exercices</span><span>${F.b2} / ${F.n2} justes</span><b>${esc(virg(F.e))}/14</b></div>`:""}</div>
      <div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="epAgain">Recommencer</button><button class="btn ghost" type="button" id="epHome">Autres entraînements</button></div></div>
     <div class="sec"><h2>Corrigé</h2><span>${faux.length?faux.length+" à revoir":"aucune erreur"}</span></div>
     ${faux.length?`<ol class="epcorr">${faux.map(q=>`<li><p class="epe"><small>${esc(q.etiq)}</small>${tex(q.enonce)}</p>
       <p>${q.rep==null?"<em>Pas de réponse.</em>":"Ta réponse : <s>"+tex(q.choix[q.rep].t)+"</s>"}</p><p>Bonne réponse : <b>${tex(q.bonne)}</b></p>${q.expl?`<p class="why">${tex(q.expl)}</p>`:""}</li>`).join("")}</ol>`
       :`<p class="muted">Un sans-faute. Bravo.</p>`}`;
    b.querySelector("#epAgain").onclick=()=>{EP.phase="intro";dessiner()};b.querySelector("#epHome").onclick=()=>{EP.phase="accueil";dessiner()}}
  function vThemes(b){const n=t=>(DATA||[]).filter(q=>q.theme===t).length;
    b.innerHTML=entete("Par thème")+`<p class="lgsub">Sans chrono. Tu vois la correction après chaque réponse.</p>
     ${DATA?`<div class="epthemes">${Object.keys(THEMES).map(t=>`<button type="button" class="serie" data-t="${esc(t)}"><span><b>${esc(THEMES[t])}</b><span>${n(t)} questions</span></span></button>`).join("")}</div>`
       :EP.msg?`<p class="istat err" role="status">${esc(EP.msg)}</p>`:`<p class="loading">Chargement…</p>`}`;
    b.querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>{const t=x.dataset.t;if(!THEMES[t])return;
      Object.assign(EP,{phase:"tq",theme:t,qs:shuffle(DATA.filter(q=>q.theme===t)).map(qAuto),i:0,tq:Date.now()});dessiner()})}
  function vThemeQ(b){const Q=EP.qs[EP.i];JT=Date.now();
    b.innerHTML=entete(THEMES[EP.theme])+`<div class="qcard epq" style="--suit:${suitOf(matDeLaClasse())}"><div class="role"><span>${esc(THEMES[EP.theme])}</span><span>${EP.i+1} / ${EP.qs.length}</span></div>
      <h2>${tex(Q.enonce)}</h2>${Q.choix.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="epWhy"></div></div>
      <div class="dots">${EP.qs.map((q,i)=>`<i class="${q.rep!=null?(q.choix[q.rep].ok?"w":"l"):i===EP.i?"cur":""}"></i>`).join("")}</div>`;
    const btns=[...b.querySelectorAll(".opt")];
    btns.forEach(x=>x.onclick=()=>{const i=+x.dataset.i,good=!!Q.choix[i].ok;Q.rep=i;jrn(Q.id,good,jms(),"quiz");if(good)try{gainXP(1)}catch(e){}
      btns.forEach(y=>{y.disabled=true;if(Q.choix[+y.dataset.i].ok)y.classList.add("good");else if(y===x)y.classList.add("bad")});
      try{reactOpt(x,good,btns.find(y=>Q.choix[+y.dataset.i].ok))}catch(e){}
      const last=EP.i>=EP.qs.length-1;
      b.querySelector("#epWhy").innerHTML=`<p class="why"><b>${good?"Juste.":"Pas tout à fait."}</b> ${tex(Q.expl)}</p><div style="margin-top:14px"><button class="btn" type="button" id="epNx">${last?"Voir mon score":"Question suivante"}</button></div>`;
      const nx=b.querySelector("#epNx");nx.onclick=()=>{if(last){EP.phase="tfin"}else EP.i++;dessiner()};nx.focus()})}
  function vThemeFin(b){const ok=EP.qs.filter(q=>q.rep!=null&&q.choix[q.rep].ok).length;
    b.innerHTML=entete(THEMES[EP.theme])+`<div class="result"><div class="sc">${ok}/${EP.qs.length}</div><p>${ok===EP.qs.length?"Thème maîtrisé.":"Refais ce thème dans quelques jours pour que ça reste."}</p>
     <div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="epRe">Refaire ce thème</button><button class="btn ghost" type="button" id="epTh">Autres thèmes</button></div></div>`;
    b.querySelector("#epRe").onclick=()=>{Object.assign(EP,{phase:"tq",qs:shuffle(DATA.filter(q=>q.theme===EP.theme)).map(qAuto),i:0});dessiner()};
    b.querySelector("#epTh").onclick=()=>{EP.phase="theme";dessiner()}}

  P26ui.vue("epreuve",{titre:"Épreuve anticipée de maths",
    rendre(box,arg){BOX=box;const a=String(arg||"");
      if(EP.phase==="q"||EP.phase==="pause"||(EP.phase==="fin"&&!EP.vu)){dessiner();return}         // épreuve en cours : on la reprend (le chrono a continué)
      if(a&&a!==EP.arg){EP.arg=a;EP.msg="";if(a==="theme")choisir("theme");else if(MODES[a]){EP.mode=a;EP.phase="intro"}}
      else if(!a&&EP.arg!==""){EP.arg="";if(EP.phase!=="fin")EP.phase="accueil"}
      dessiner()},
    quitter(){EP.arg=null;if(EP.phase==="tq"||EP.phase==="tfin")EP.phase="theme"},   // un entraînement par thème s'arrête quand on quitte la vue (réponses déjà au journal)
    occupe(){return EP.phase==="q"||EP.phase==="pause"||EP.phase==="tq"}});

  // Pour la carte d'entrée (revision.js) et les tests.
  window.P26ep={charger,tirerAuto,note,enCours:()=>EP.phase==="q"||EP.phase==="pause",etat:()=>({phase:EP.phase,mode:EP.mode,i:EP.i,n:EP.qs.length,fin:EP.fin,ids:EP.qs.map(q=>q.id),parties:EP.qs.map(q=>q.partie)}),
    bonnes:()=>EP.qs.map(q=>q.choix.findIndex(c=>c.ok))};
})();
P26mod.ok("epreuve");

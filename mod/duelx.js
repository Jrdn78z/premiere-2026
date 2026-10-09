/* Paquet 1 (T3) : Duel à distance, classé à l'Elo. Je joue maintenant, mon ami joue les mêmes questions plus tard.
   La base (sql/8 §4.1) fixe les questions, la graine, le temps, le score (bonnes*100 + vitesse) et l'Elo (elo_finir).
   RPC : duel_creer, duel_commencer, duel_finir, duel_refuser, duels_mes. Route #duelx=<12 hex>, vue « duelx ».
   Arguments de la vue : "" (liste), "<id>" (un duel), "ami:<uuid>" (nouveau duel avec cet ami). */
(function(){
  "use strict";
  const NBQ=10,DUREE=20000,QID=/^(pb\.[a-z0-9-]{1,40}\.q[0-9]{1,3}|auto-[0-9]{2})$/,ID=/^[0-9a-f]{12}$/;
  const D={jeu:null,box:null,auto:null,f:{ami:null,mat:null,ch:"*"},msg:""};
  const rpc=(n,a)=>window.P26.rpc(n,a);
  const err=e=>e&&e.code==="absent"?"Le duel à distance n’est pas encore disponible.":e&&e.code==="refus"?({"pas ami":"Vous devez être amis pour jouer un duel à distance.","trop de duels":"Trop de duels en cours avec cet ami (3 au plus), ou trop de duels aujourd’hui.","questions invalides":"Ces questions ne peuvent pas servir pour un duel.","duel invalide":"Ce duel n’est plus jouable.","score invalide":"Score refusé par la base."}[e.message]||e.texte||"Refusé par la base."):"La base ne répond pas pour l’instant. Réessaie dans un moment.";
  const tete=(box,t)=>{box.innerHTML=`<div class="ihead"><h1>${t}</h1><button class="linkbtn" type="button" id="dxBack">Retour</button></div><div id="dxC"></div>`;
    box.querySelector("#dxBack").onclick=()=>{if(box.dataset.dxv==="liste")P26ui.retour();else liste(box)};return box.querySelector("#dxC")};
  const quand=iso=>{const t=Date.parse(iso);if(!Number.isFinite(t))return "";const d=new Date(t);return d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}).replace(":"," h ")};
  const bonnes=s=>Math.max(0,Math.floor((+s||0)/100));
  const vus=()=>{const v=P26ui.etat("dx",[]);return Array.isArray(v)?v:(P.p1.dx=[])};
  /* ---------- Questions : Programme (pb.<tid>.q<n>) et automatismes (auto-NN) ---------- */
  async function autos(){if(D.auto)return D.auto;const r=await fetch("prog/automatismes.json");if(!r.ok)throw new Error("absent");const j=await r.json();const o={};
    (j.questions||[]).forEach(q=>{if(q&&QID.test(q.id)&&q.enonce&&q.bonne&&Array.isArray(q.mauvaises))o[q.id]={id:q.id,q:q.enonce,ok:q.bonne,no:q.mauvaises.slice(0,3),why:q.explication||""}});return D.auto=o}
  const pmOf=tid=>tid.startsWith("verbes-")?tid:tid.replace(/-\d+$/,"");
  const delai=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
  async function charger(ids){if(!Array.isArray(ids)||!ids.length||!ids.every(x=>typeof x==="string"&&QID.test(x)))return null;
    const A=ids.some(x=>x.startsWith("auto-"))?await autos().catch(()=>null):null;const out=[];
    for(const id of ids){if(id.startsWith("auto-")){if(!A||!A[id])return null;out.push(A[id]);continue}
      const tid=id.split(".")[1];await delai(progFetchAll(pmOf(tid)),10000);const d=progDocOf(tid).d;
      const q=d&&(d.quiz||[]).flatMap(z=>z.qs||[]).find(x=>x&&x.id===id);if(!q)return null;out.push(q)}return out}
  /* ---------- Liste ---------- */
  function etatTxt(d){const p=esc(d.pseudo||"?");
    if(d.etat==="refuse")return "Duel refusé.";
    if(d.etat==="expire")return d.moi_createur?(d.mon_score==null?"Duel expiré.":`Duel expiré : ${p} n’a pas joué, l’Elo ne bouge pas.`):"Duel expiré : tu n’as pas joué à temps, l’Elo ne bouge pas.";
    if(d.etat==="fini"){const a=bonnes(d.mon_score),b=bonnes(d.son_score),m=+d.mon_score||0,s=+d.son_score||0;
      const t=m>s?`Tu gagnes ${a} à ${b}.`:m<s?`Tu perds ${a} à ${b}.`:`Égalité ${a} à ${b}.`;
      return t+(d.delta!=null?` Elo ${d.delta>=0?"+":"−"}${fmtN(Math.abs(d.delta))}`:"")}
    if(d.a_jouer)return "À toi de jouer !";
    if(d.etat==="attente")return `En attente de ${p}`;
    if(d.etat==="en_cours")return `${p} est en train de jouer.`;
    return "En préparation."}
  async function liste(box){D.box=box;box.dataset.dxv="liste";const c=tete(box,"Duel à distance");
    c.innerHTML=`<p class="lgsub">Duel à distance : tu joues maintenant, ton ami joue les mêmes questions plus tard. Classé à l’Elo.</p>
      <div class="exrow"><button class="btn light" type="button" id="dxNew">Nouveau duel</button></div><p class="istat" role="status">${esc(D.msg)}</p>
      <div class="sec"><h2>Mes duels à distance</h2></div><div id="dxL"><p class="loading">Chargement…</p></div>`;D.msg="";
    c.querySelector("#dxNew").onclick=()=>creer(box,null);
    let L=null,e=null;try{L=await rpc("duels_mes");J1.dx=L;J1.dxT=Date.now()}catch(x){e=x}
    const el=box.querySelector("#dxL");if(!el)return;
    if(e){el.innerHTML=`<p class="muted">${esc(err(e))}</p>`;return}
    el.innerHTML=L.length?`<ul class="dxl">${L.map(d=>`<li class="${d.a_jouer?"afaire":""}${d.etat==="fini"&&!vus().includes(d.id)?" neuf":""}"><b class="dxp"></b><span>${etatTxt(d)}</span><button class="btn ${d.a_jouer?"light":"ghost"}" type="button" data-id="${esc(d.id)}">${d.a_jouer?"Jouer":"Voir"}</button></li>`).join("")}</ul>`
      :`<p class="muted">Aucun duel pour l’instant. Lance le premier !</p>`;
    el.querySelectorAll(".dxp").forEach((b,i)=>b.textContent=L[i].pseudo||"?");
    el.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>voir(box,b.dataset.id))}
  /* ---------- Création ---------- */
  function sources(){const out=[];(C.mats||[]).forEach(m=>{const chs=[];seriesOf(m.id).forEach(x=>{const ids=(x.s.qs||[]).filter(q=>q&&QID.test(q.id||""));if(ids.length&&x.ch._tid){const o=chs.find(c=>c.id===x.ch.id);if(o)o.qs.push(...ids);else chs.push({id:x.ch.id,t:x.ch.court||x.ch.titre,qs:ids.slice()})}});
      const tot=chs.reduce((a,c)=>a+c.qs.length,0);if(tot>=NBQ)out.push({id:m.id,t:m.court||m.nom,chs:chs.filter(c=>c.qs.length>=NBQ),tous:chs.flatMap(c=>c.qs)})});return out}
  async function creer(box,ami){D.box=box;box.dataset.dxv="creer";const c=tete(box,"Nouveau duel");if(ami)D.f.ami=ami;
    c.innerHTML=`<p class="loading">Chargement…</p>`;try{await amisLoad(true)}catch(e){}let A=null;try{await autos();A=D.auto}catch(e){}
    if(!box.isConnected||box.dataset.dxv!=="creer")return;
    const amis=(NT.amis||[]).filter(a=>a.ok),src=sources();if(A&&Object.keys(A).length>=NBQ)src.push({id:"@auto",t:"Automatismes (maths)",chs:[],tous:Object.values(A)});
    if(!amis.length){c.innerHTML=`<p class="muted">Ajoute d’abord un ami dans Ligue, Mes amis.</p>`;return}
    if(!src.length){c.innerHTML=`<p class="muted">Pas assez de questions du Programme pour ta classe.</p>`;return}
    if(!amis.find(a=>a.id===D.f.ami))D.f.ami=amis[0].id;if(!src.find(s=>s.id===D.f.mat))D.f.mat=src[0].id;const S0=src.find(s=>s.id===D.f.mat);if(D.f.ch!=="*"&&!S0.chs.find(x=>x.id===D.f.ch))D.f.ch="*";
    c.innerHTML=`<p class="lgsub">10 questions, 20 secondes chacune. Ton ami a 48 heures pour jouer.</p>
      <h2 class="solo">Contre</h2><div class="onbch" id="dxA">${amis.map(a=>`<button type="button" class="${a.id===D.f.ami?"on":""}" data-a="${esc(a.id)}"></button>`).join("")}</div>
      <h2 class="solo">Matière</h2><div class="pick sm" id="dxM">${src.map(s=>`<button type="button" class="${s.id===D.f.mat?"on":""}" data-m="${esc(s.id)}">${esc(s.t)}</button>`).join("")}</div>
      ${S0.chs.length?`<h2 class="solo">Chapitre</h2><div class="onbch" id="dxCh"><button type="button" class="${D.f.ch==="*"?"on":""}" data-c="*">Toute la matière</button>${S0.chs.map(x=>`<button type="button" class="${x.id===D.f.ch?"on":""}" data-c="${esc(x.id)}">${esc(x.t)}</button>`).join("")}</div>`:""}
      <div class="exrow"><button class="btn light" type="button" id="dxGo">Lancer le duel</button><span class="istat" id="dxSt" role="status"></span></div>`;
    c.querySelectorAll("#dxA [data-a]").forEach(b=>{const a=amis.find(x=>x.id===b.dataset.a);b.textContent=a?a.pseudo:"?";b.onclick=()=>{D.f.ami=b.dataset.a;creer(box)}});
    c.querySelectorAll("#dxM [data-m]").forEach(b=>b.onclick=()=>{D.f.mat=b.dataset.m;D.f.ch="*";creer(box)});
    c.querySelectorAll("#dxCh [data-c]").forEach(b=>b.onclick=()=>{D.f.ch=b.dataset.c;creer(box)});
    c.querySelector("#dxGo").onclick=async()=>{const go=c.querySelector("#dxGo"),st=c.querySelector("#dxSt");go.disabled=true;st.textContent="Préparation…";
      const pool=D.f.ch==="*"?S0.tous:S0.chs.find(x=>x.id===D.f.ch).qs,qs=shuffle(pool).slice(0,NBQ);
      try{const id=await rpc("duel_creer",{p_ami:D.f.ami,p_qs:qs.map(q=>q.id)});if(!ID.test(String(id)))throw new Error("id");J1.dx=null;await voir(box,id,true)}
      catch(e){st.textContent=err(e);go.disabled=false}}}
  /* ---------- Un duel ---------- */
  async function voir(box,id,lancer){D.box=box;box.dataset.dxv="duel";const c=tete(box,"Duel à distance");c.innerHTML=`<p class="loading">Chargement…</p>`;
    let L;try{L=await rpc("duels_mes");J1.dx=L;J1.dxT=Date.now()}catch(e){c.innerHTML=`<p class="muted">${esc(err(e))}</p>`;return}
    if(!box.isConnected||box.dataset.dxv!=="duel")return;
    const d=(L||[]).find(x=>x.id===id);if(!d){c.innerHTML=`<p class="muted">Ce duel n’existe pas, ou il n’est pas pour toi.</p>`;return}
    if(lancer&&d.a_jouer&&d.moi_createur)return jouer(box,d);
    const p=esc(d.pseudo||"?"),n=(d.qs||[]).length;
    if(d.a_jouer&&!d.moi_createur&&d.etat==="attente"){
      c.innerHTML=`<div class="dxcarte"><p><b class="dxp"></b> t’a lancé un duel à distance.</p><p class="muted">${n} questions, 20 secondes chacune. Tu as jusqu’au ${esc(quand(d.limite))} pour jouer.</p>
        <div class="exrow"><button class="btn light" type="button" id="dxOk">Accepter</button><button class="btn ghost" type="button" id="dxNo">Refuser</button></div><p class="istat" id="dxSt" role="status"></p></div>`;
      c.querySelector(".dxp").textContent=d.pseudo||"?";
      c.querySelector("#dxOk").onclick=()=>jouer(box,d);
      c.querySelector("#dxNo").onclick=async()=>{let ok=false;try{ok=await rpc("duel_refuser",{p_id:d.id})}catch(e){}J1.dx=null;D.msg=ok?"Duel refusé.":"Impossible de refuser ce duel.";liste(box)};return}
    if(d.a_jouer){c.innerHTML=`<div class="dxcarte"><p>À toi de jouer !</p><p class="muted">Contre <b class="dxp"></b>, ${n} questions.</p><div class="exrow"><button class="btn light" type="button" id="dxOk">Jouer</button></div></div>`;
      c.querySelector(".dxp").textContent=d.pseudo||"?";c.querySelector("#dxOk").onclick=()=>jouer(box,d);return}
    const fini=d.etat==="fini";
    c.innerHTML=`<div class="dxcarte dx-${esc(d.etat)}"><p class="dxres">${etatTxt(d)}</p>
      ${d.mon_score!=null?`<p class="muted">Tes bonnes réponses : ${bonnes(d.mon_score)} sur ${n} (score ${fmtN(d.mon_score)}).</p>`:""}
      ${fini&&d.son_score!=null?`<p class="muted">${p} : ${bonnes(d.son_score)} sur ${n} (score ${fmtN(d.son_score)}).</p>`:""}
      ${d.etat==="attente"&&d.moi_createur?`<p class="muted">Ton ami a 48 heures pour jouer.</p>`:""}
      <div class="exrow"><button class="btn light" type="button" id="dxRe">Nouveau duel</button><button class="btn ghost" type="button" id="dxL2">Mes duels</button></div></div>`;
    c.querySelector("#dxRe").onclick=()=>creer(box,d.adversaire);c.querySelector("#dxL2").onclick=()=>liste(box);P26ui.emit("duelx.rendu",{el:c,d,phase:d.etat});
    if(fini&&!vus().includes(d.id)){const v=vus();v.push(d.id);P.p1.dx=v.slice(-100);saveP();if((+d.mon_score||0)>(+d.son_score||0))P26ui.emit("victoire",{type:"duelx",el:c})}}
  /* ---------- Partie ---------- */
  async function jouer(box,d){const c=tete(box,"Duel à distance");box.dataset.dxv="jeu";c.innerHTML=`<p class="loading">Préparation des questions…</p>`;
    const qs=await charger(d.qs);if(!qs){c.innerHTML=`<p class="muted">Impossible de charger les questions de ce duel. Réessaie plus tard.</p>`;return}
    let ok=false,e=null;try{ok=await rpc("duel_commencer",{p_id:d.id})}catch(x){e=x}
    if(!ok){c.innerHTML=`<p class="muted">${e?esc(err(e)):"Ce duel n’est plus jouable."}</p>`;J1.dx=null;return}
    D.jeu={d,qs,i:0,bonnes:0,t0:Date.now(),timer:null,tq:0,c};question()}
  function question(){const J=D.jeu;if(!J)return;const c=J.c;if(J.i>=J.qs.length)return terminer();
    const q=J.qs[J.i],opts=optsOf(q,rng(((+J.d.graine)|0)+J.i));J.opts=opts;J.tq=Date.now();JT=J.tq;
    c.innerHTML=`<div class="qcard"><div class="role"><span>Contre <b class="dxp"></b></span><span>${J.i+1} / ${J.qs.length}</span></div>
      <div class="arbar" id="dxBar" style="--p:1"><i></i><b id="dxSec">20</b></div><h2>${tex(q.q)}</h2>
      ${opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}</div>`;
    c.querySelector(".dxp").textContent=J.d.pseudo||"?";P26ui.emit("duelx.rendu",{el:c,d:J.d,phase:"jeu",i:J.i});   // lot P2 : la main de l'ami, de dos
    const btns=[...c.querySelectorAll(".opt")];btns.forEach(b=>b.onclick=()=>rep(btns,b));
    clearInterval(J.timer);J.timer=setInterval(()=>{if(D.jeu!==J)return clearInterval(J.timer);const left=Math.max(0,DUREE-(Date.now()-J.tq));
      const bar=c.querySelector("#dxBar");if(bar)bar.style.setProperty("--p",(left/DUREE).toFixed(3));const s=c.querySelector("#dxSec");if(s)s.textContent=Math.ceil(left/1000);
      if(left<=0)rep(btns,null)},100)}
  function rep(btns,b){const J=D.jeu;if(!J||btns.some(x=>x.disabled))return;clearInterval(J.timer);const q=J.qs[J.i],good=!!b&&!!J.opts[+b.dataset.i].ok;
    if(good)J.bonnes++;jrn(q.id,good,Math.min(600000,Date.now()-J.tq),"duel");
    btns.forEach(x=>{x.disabled=true;if(J.opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});if(b)reactOpt(b,good,btns.find(x=>J.opts[+x.dataset.i].ok));
    J.i++;setTimeout(()=>{if(D.jeu===J)question()},reduce?300:700)}
  async function terminer(){const J=D.jeu;const c=J.c;c.innerHTML=`<p class="loading">Envoi de ton score…</p>`;
    const att=J.t0+J.qs.length*2000+400-Date.now();if(att>0)await new Promise(r=>setTimeout(r,att));   // la base refuse une fin trop rapide
    let e=null;for(let k=0;k<2;k++){try{await rpc("duel_finir",{p_id:J.d.id,p_bonnes:J.bonnes});e=null;break}catch(x){e=x;if(!(x&&x.code==="refus"&&x.message==="trop tôt"))break;await new Promise(r=>setTimeout(r,1500))}}
    D.jeu=null;J1.dx=null;
    if(e){c.innerHTML=`<p class="muted">${esc(err(e))}</p>`;return}
    P26ui.emit("activite",{type:"duelx",bonnes:J.bonnes});voir(D.box,J.d.id)}
  /* ---------- Vue et route ---------- */
  function connecte(box){if(typeof SOC==="function"&&SOC())return true;box.innerHTML=`<div class="ihead"><h1>Duel à distance</h1><button class="linkbtn" type="button" id="dxBack">Retour</button></div><p class="muted">Connecte-toi avec ton compte pour jouer un duel à distance.</p>`;
    box.querySelector("#dxBack").onclick=()=>P26ui.retour();return false}
  P26ui.vue("duelx",{titre:"Duel à distance",
    rendre(box,arg){if(D.jeu&&D.box===box)return;const k=String(arg||"");if(box.dataset.dxa===k&&box.dataset.vue==="duelx"&&box.querySelector("#dxC"))return;box.dataset.dxa=k;
      if(!connecte(box))return;if(ID.test(k))voir(box,k);else if(/^ami:[0-9a-f-]{36}$/.test(k))creer(box,k.slice(4));else liste(box)},
    occupe(){return !!D.jeu},
    quitter(){if(D.jeu)clearInterval(D.jeu.timer);D.jeu=null;if(D.box)delete D.box.dataset.dxa}});
  P26ui.route("duelx",v=>{P26ui.ouvrir("duelx",v&&ID.test(v)?v:"")});
  window.P26duelx={D};   // pour les tests
})();
P26mod.ok("duelx");

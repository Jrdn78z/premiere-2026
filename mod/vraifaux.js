/* Paquet 1 (T3) : Vrai ou faux express. 60 s ; affirmation = recto d'une carte + un verso (le sien = vrai, celui
   d'une autre carte du même paquet = faux, 50/50). Glisser à droite = Vrai, à gauche = Faux (seuil 80 px), boutons, flèches.
   Record P.p1.vf (champ de ligue vf, par maj8.js), journal jrn("vf."+id,ok,ms,"quiz"), record >= 15 : événement record {de:"vf"}. */
(function(){
  "use strict";
  const DUREE=60000,SEUIL=80;
  const S={on:false,t0:0,timer:null,cur:null,ok:0,n:0,err:[],box:null,finVue:false,rec:false,tq:0,bloque:false};
  const rec=()=>{const v=Math.round(+P26ui.etat("vf",0));return Number.isFinite(v)?Math.max(0,v):0};
  // Paquets d'au moins 2 cartes aux versos différents
  function paquets(){const out=[];Object.values(C.chaps||{}).forEach(ch=>(ch.paquets||[]).forEach(p=>{const cs=(p.cartes||[]).filter(c=>c&&c.id&&c.r&&c.v);
    if(new Set(cs.map(c=>c.v)).size>=2)out.push(cs)}));return out}
  function tirer(){const P2=paquets();if(!P2.length)return null;const cs=P2[Math.floor(Math.random()*P2.length)],c=cs[Math.floor(Math.random()*cs.length)];
    const vrai=Math.random()<.5;if(vrai)return {c,v:c.v,vrai:true};const autres=cs.filter(x=>x.v!==c.v);return {c,v:autres[Math.floor(Math.random()*autres.length)].v,vrai:false}}
  function accueil(box){S.on=false;S.finVue=false;clearInterval(S.timer);const ok=paquets().length>0;
    box.innerHTML=`<div class="ihead"><h1>Vrai ou faux</h1><button class="linkbtn" type="button" id="vfBack">Retour</button></div>
      <p class="lgsub">Vrai ou faux ? Glisse à droite si c’est vrai, à gauche si c’est faux. 60 secondes.</p>
      <p class="svrec">Record : <b>${fmtN(rec())}</b></p>
      ${ok?`<div class="exrow"><button class="btn light" type="button" id="vfGo">Jouer</button></div>`:`<p class="muted">Pas encore de cartes pour ta classe. Choisis ta classe dans ton profil.</p>`}`;
    box.querySelector("#vfBack").onclick=()=>P26ui.retour();const g=box.querySelector("#vfGo");if(g)g.onclick=()=>demarrer(box)}
  function demarrer(box){S.ok=0;S.n=0;S.err=[];S.rec=false;S.on=true;S.t0=Date.now();
    box.innerHTML=`<div class="vf"><div class="role vfhaut"><span>Vrai ou faux</span><span><b id="vfSc">0</b> bonnes</span></div>
      <div class="arbar" id="vfBar" style="--p:1"><i></i><b id="vfSec">60</b></div>
      <div class="vfpile" id="vfPile"></div>
      <div class="vfbtns"><button class="btn vfno" type="button" id="vfF">← Faux</button><button class="btn vfyes" type="button" id="vfV">Vrai →</button></div></div>`;
    box.querySelector("#vfF").onclick=()=>repondre(false);box.querySelector("#vfV").onclick=()=>repondre(true);
    clearInterval(S.timer);S.timer=setInterval(tic,200);suivante();tic()}
  function tic(){if(!S.on)return clearInterval(S.timer);const left=Math.max(0,DUREE-(Date.now()-S.t0)),b=S.box;
    const bar=b&&b.querySelector("#vfBar");if(bar)bar.style.setProperty("--p",(left/DUREE).toFixed(3));const s=b&&b.querySelector("#vfSec");if(s)s.textContent=Math.ceil(left/1000);
    if(left<=0)fin()}
  function suivante(){const pile=S.box&&S.box.querySelector("#vfPile");if(!pile)return;S.cur=tirer();if(!S.cur){fin();return}S.tq=Date.now();S.bloque=false;
    const el=document.createElement("div");el.className="vfc";el.setAttribute("role","group");el.setAttribute("aria-label","Affirmation");
    el.innerHTML=`<small>${esc(S.cur.c.q||"Vrai ou faux ?")}</small><h2>${tex(S.cur.c.r)}</h2><div class="vfv">${tex(S.cur.v)}</div><i class="vfh vfhv">Vrai</i><i class="vfh vfhf">Faux</i>`;
    pile.textContent="";pile.appendChild(el);glisser(el)}
  // Geste : la carte suit le doigt ; relâchée au-delà du seuil, elle part ; sinon elle revient (transition, donc interruptible)
  function glisser(el){let x0=null,dx=0,id=null;
    const pose=d=>{el.style.transform=reduce?`translateX(${d}px)`:`translateX(${d}px) rotate(${(d/18).toFixed(2)}deg)`;el.dataset.dir=d>SEUIL?"v":d<-SEUIL?"f":""};
    el.addEventListener("pointerdown",e=>{if(S.bloque||!S.on)return;x0=e.clientX;dx=0;id=e.pointerId;try{el.setPointerCapture(id)}catch(_){}el.style.transition="none"});
    el.addEventListener("pointermove",e=>{if(x0===null||e.pointerId!==id)return;dx=e.clientX-x0;pose(dx)});
    const lacher=e=>{if(x0===null||e.pointerId!==id)return;x0=null;if(dx>SEUIL)repondre(true);else if(dx<-SEUIL)repondre(false);
      else{el.style.transition="transform 200ms var(--ease)";el.style.transform="";el.dataset.dir=""}};
    el.addEventListener("pointerup",lacher);el.addEventListener("pointercancel",e=>{if(e.pointerId===id){dx=0;lacher(e)}})}
  function repondre(dit){if(!S.on||S.bloque||!S.cur)return;S.bloque=true;const st=S.cur,good=dit===st.vrai,ms=Math.min(600000,Date.now()-S.tq);
    S.n++;if(good)S.ok++;else{S.err.push(st);if(S.err.length>3)S.err.shift()}
    jrn("vf."+st.c.id,good,ms,"quiz");buzz(good?12:[8,60,8]);
    const sc=S.box&&S.box.querySelector("#vfSc");if(sc)sc.textContent=S.ok;
    const el=S.box&&S.box.querySelector(".vfc");
    if(el){el.classList.add(good?"juste":"faux");el.style.transition=reduce?"opacity 160ms ease-out":"transform 200ms var(--ease),opacity 200ms var(--ease)";
      if(!reduce)el.style.transform=`translateX(${dit?"":"-"}120%) rotate(${dit?"":"-"}12deg)`;el.style.opacity="0"}
    setTimeout(()=>{if(S.on)suivante()},reduce?170:210)}
  function fin(){if(!S.on)return;S.on=false;S.finVue=true;clearInterval(S.timer);const box=S.box,n=S.ok,r0=rec();S.rec=n>r0;
    if(S.rec){P.p1.vf=n;saveP();try{lgPush()}catch(e){}if(n>=15){try{window.P26&&window.P26.evenements&&window.P26.evenements.add("record",{n,de:"vf"})}catch(e){}}}
    else saveP();
    if(box&&box.isConnected){box.innerHTML=`<div class="result vffin"><p class="muted">Temps écoulé.</p><div class="sc">${fmtN(n)}</div><p>${n>1?"bonnes réponses":"bonne réponse"} sur ${fmtN(S.n)}</p>
      <p>${S.rec?"<b>Nouveau record !</b>":"Record : "+fmtN(rec())}</p>
      ${S.err.length?`<div class="sec"><h2>Tes dernières erreurs</h2></div><ul class="vferr">${S.err.slice().reverse().map(e=>`<li><b>${tex(e.c.r)}</b><span>${e.vrai?"C’était vrai : ":"C’était faux. La bonne réponse : "}${tex(e.c.v)}</span></li>`).join("")}</ul>`:""}
      <div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="vfRe">Rejouer</button><button class="btn ghost" type="button" id="vfOut">Retour</button></div></div>`;
      box.querySelector("#vfRe").onclick=()=>demarrer(box);box.querySelector("#vfOut").onclick=()=>accueil(box)}
    P26ui.emit("activite",{type:"vf",bonnes:n})}
  // Flèches du clavier pendant la partie
  addEventListener("keydown",e=>{if(!S.on||view!=="mod"||!S.box||S.box.dataset.vue!=="vraifaux")return;if(e.key==="ArrowRight"){e.preventDefault();repondre(true)}else if(e.key==="ArrowLeft"){e.preventDefault();repondre(false)}});
  P26ui.vue("vraifaux",{titre:"Vrai ou faux express",
    rendre(box){S.box=box;if(S.on||(S.finVue&&box.querySelector(".vffin")))return;accueil(box)},
    occupe(){return S.on},
    quitter(){S.on=false;S.finVue=false;clearInterval(S.timer)}});
  window.P26vf={S,tirer};   // pour les tests
})();
P26mod.ok("vraifaux");

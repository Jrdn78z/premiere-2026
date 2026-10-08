/* Paquet 1 (T3) : Survie. Questions de quiz du Programme de la classe, 15 s chacune, jusqu'à la première erreur.
   Record P.p1.sv (publié dans la ligue par maj8.js : champ sv), journal jrn(q.id,ok,ms,"quiz").
   Événements : activite {type:"survie",score} ; nouveau record >= 10 : record {n,de:"survie"} et victoire {type:"survie"}. */
(function(){
  "use strict";
  const DUREE=15000;
  const S={mat:"*",on:false,q:null,opts:null,score:0,t0:0,timer:null,pool:[],i:0,box:null,fin:null,rec:false,mem:[]};
  const rec=()=>{const v=Math.round(+P26ui.etat("sv",0));return Number.isFinite(v)?Math.max(0,v):0};
  const mats=()=>(C.mats||[]).filter(m=>seriesOf(m.id).length);
  function pool(){const L=S.mat==="*"?mats():mats().filter(m=>m.id===S.mat);
    return shuffle(L.flatMap(m=>seriesOf(m.id).flatMap(x=>(x.s.qs||[]).map(q=>({q,mat:m.id})))).filter(x=>x.q&&x.q.q&&x.q.ok&&(x.q.no||[]).length>=1))}
  function amisRang(){const ok=new Set(((typeof NT!=="undefined"&&NT.amis)||[]).filter(a=>a.ok).map(a=>a.id));
    const L=(LG.rows||[]).filter(r=>r.id===UID||ok.has(r.id)).map(r=>({id:r.id,nick:r.id===UID?(LG.nick||r.nick):r.nick,sv:r.id===UID?Math.max(rec(),+r.sv||0):(+r.sv||0)}));
    if(!L.some(r=>r.id===UID))L.push({id:UID,nick:LG.nick||"Toi",sv:rec()});
    return L.filter(r=>r.nick).sort((a,b)=>b.sv-a.sv||String(a.nick).localeCompare(String(b.nick)))}
  function accueil(box){S.on=false;S.finVue=false;clearInterval(S.timer);const M=mats(),R=amisRang();
    box.innerHTML=`<div class="ihead"><h1>Survie</h1><button class="linkbtn" type="button" id="svBack">Retour</button></div>
      <p class="lgsub">Survie : une erreur et c’est fini. 15 secondes par question.</p>
      <p class="svrec">Record : <b>${fmtN(rec())}</b></p>
      ${M.length?`<div class="pick sm" id="svMat"><button type="button" class="${S.mat==="*"?"on":""}" data-m="*">Toutes mes matières</button>${M.map(m=>`<button type="button" class="${S.mat===m.id?"on":""}" data-m="${esc(m.id)}">${esc(m.court||m.nom)}</button>`).join("")}</div>
      <div class="exrow"><button class="btn light" type="button" id="svGo">Jouer</button></div>`:`<p class="muted">Pas encore de quiz pour ta classe. Choisis ta classe dans ton profil.</p>`}
      ${R.length>1?`<div class="sec"><h2>Entre amis</h2></div><ol class="endlist svam">${R.slice(0,20).map((r,i)=>`<li class="${r.id===UID?"me":""}"><span class="rk">${i+1}</span><span class="bn">${esc(r.nick)}</span><span></span><b>${fmtN(r.sv)}</b></li>`).join("")}</ol>`:""}`;
    box.querySelector("#svBack").onclick=()=>P26ui.retour();
    box.querySelectorAll("#svMat [data-m]").forEach(b=>b.onclick=()=>{S.mat=b.dataset.m;accueil(box)});
    const g=box.querySelector("#svGo");if(g)g.onclick=()=>demarrer(box)}
  function demarrer(box){S.pool=pool();S.i=0;S.score=0;S.fin=null;S.rec=false;S.mem=[];if(!S.pool.length){accueil(box);return}S.on=true;question(box)}
  function question(box){if(S.i>=S.pool.length){S.pool=shuffle(S.pool);S.i=0}
    const x=S.pool[S.i++],q=x.q,opts=optsOf(q);S.q=q;S.opts=opts;S.t0=Date.now();JT=S.t0;
    box.innerHTML=`<div class="qcard svq" style="--suit:${suitOf(x.mat)}"><div class="role"><span>Survie</span><span>Score ${fmtN(S.score)}</span></div>
      <div class="arbar svbar" id="svBar" style="--p:1"><i></i><b id="svSec">15</b></div>
      <h2>${tex(q.q)}</h2>${opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${tex(o.t)}</button>`).join("")}<div id="svWhy"></div></div>`;
    const btns=[...box.querySelectorAll(".opt")];
    btns.forEach(b=>b.onclick=()=>repondre(box,btns,b));
    clearInterval(S.timer);S.timer=setInterval(()=>tic(box,btns),100);tic(box,btns)}
  function tic(box,btns){if(!S.on)return clearInterval(S.timer);const left=Math.max(0,DUREE-(Date.now()-S.t0));
    const bar=box.querySelector("#svBar");if(bar)bar.style.setProperty("--p",(left/DUREE).toFixed(3));const sec=box.querySelector("#svSec");if(sec)sec.textContent=Math.ceil(left/1000);
    if(left<=0)repondre(box,btns,null)}
  function repondre(box,btns,b){if(!S.on||btns.some(x=>x.disabled))return;clearInterval(S.timer);
    const good=!!b&&!!S.opts[+b.dataset.i].ok,ms=Math.min(600000,Date.now()-S.t0);
    jrn(S.q.id,good,ms,"quiz");if(!good)P.e[S.q.id]=Date.now();
    btns.forEach(x=>{x.disabled=true;if(S.opts[+x.dataset.i].ok)x.classList.add("good");else if(x===b)x.classList.add("bad")});
    if(b)reactOpt(b,good,btns.find(x=>S.opts[+x.dataset.i].ok));
    if(good){S.score++;setTimeout(()=>{if(S.on&&S.box===box&&box.isConnected)question(box)},reduce?250:550);return}
    S.mem={q:S.q,temps:!b};setTimeout(()=>{if(S.on)fin(box)},reduce?500:900)}
  function fin(box){S.on=false;S.finVue=true;clearInterval(S.timer);const r0=rec(),n=S.score;S.rec=n>r0;
    if(S.rec){P.p1.sv=n;saveP();try{lgPush()}catch(e){}
      if(n>=10){try{window.P26&&window.P26.evenements&&window.P26.evenements.add("record",{n,de:"survie"})}catch(e){}}}
    else saveP();
    const m=S.mem||{};
    box.innerHTML=`<div class="result svfin"><p class="muted">${m.temps?"Temps écoulé.":"Mauvaise réponse."}</p><div class="sc">${fmtN(n)}</div>
      <p>${S.rec?"<b>Nouveau record !</b>":"Record : "+fmtN(rec())}</p>
      ${m.q?`<p class="why">${tex(m.q.q)}<br><b>Réponse :</b> ${tex(m.q.ok)}</p>`:""}
      <div class="exrow" style="justify-content:center"><button class="btn light" type="button" id="svRe">Rejouer</button><button class="btn ghost" type="button" id="svOut">Retour</button></div></div>`;
    box.querySelector("#svRe").onclick=()=>demarrer(box);box.querySelector("#svOut").onclick=()=>accueil(box);
    if(!reduce){const sc=box.querySelector(".sc");if(sc&&sc.animate)sc.animate([{opacity:0,transform:"scale(.94)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE_OUT})}
    P26ui.emit("activite",{type:"survie",score:n});
    if(S.rec&&n>=10)P26ui.emit("victoire",{type:"survie",el:box})}
  P26ui.vue("survie",{titre:"Survie",
    rendre(box){S.box=box;if(S.on||(S.finVue&&box.querySelector(".svfin")))return;accueil(box)},
    occupe(){return S.on},
    quitter(){S.on=false;S.finVue=false;clearInterval(S.timer)}});
  window.P26survie={S,fin:()=>S.on&&S.box&&fin(S.box)};   // pour les tests
})();
P26mod.ok("survie");

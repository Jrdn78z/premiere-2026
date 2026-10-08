/* ================= Paquet 1, Progresser (T4) : ambiances sonores (pluie, bruit blanc, café) =================
   Sons fabriqués par le navigateur (Web Audio), aucun fichier, aucun compte. Démarrage seulement après un toucher (règle iPhone).
   Chargé à la demande par progression.js (réglages du profil, barre du focus). Plan : /home/claude/plans/paquet1.md §3.3 f. */
(function(){
  "use strict";
  const T4=window.P1T4=window.P1T4||{};
  const AC=()=>window.AudioContext||window.webkitAudioContext||null;
  const TYPES=[["pluie","Pluie"],["blanc","Bruit blanc"],["cafe","Café"]];
  const reg=()=>{const r=LS.get("amb",{});return {vol:Number.isFinite(+r.vol)?Math.max(0,Math.min(1,+r.vol)):.6,coupe:r.coupe!==false}};
  const A={ctx:null,master:null,cur:"",nodes:[],timers:[]};
  T4.ambEtat=()=>({cur:A.cur,state:A.ctx?A.ctx.state:"aucun"});

  function bruit(kind,sec){const c=A.ctx,n=Math.floor(c.sampleRate*sec),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
    let last=0,b0=0,b1=0,b2=0;
    for(let i=0;i<n;i++){const w=Math.random()*2-1;
      if(kind==="brun"){last=(last+.02*w)/1.02;d[i]=last*3.5}
      else if(kind==="rose"){b0=.99765*b0+w*.099046;b1=.963*b1+w*.2965164;b2=.57*b2+w*1.0526913;d[i]=(b0+b1+b2+w*.1848)*.11}
      else d[i]=w}
    return b}
  function source(buf,loop){const s=A.ctx.createBufferSource();s.buffer=buf;s.loop=!!loop;A.nodes.push(s);return s}
  function filtre(type,f,q){const x=A.ctx.createBiquadFilter();x.type=type;x.frequency.value=f;if(q)x.Q.value=q;A.nodes.push(x);return x}
  function gain(v){const g=A.ctx.createGain();g.gain.value=v;A.nodes.push(g);return g}
  function chaine(...L){for(let i=0;i<L.length-1;i++)L[i].connect(L[i+1]);return L[L.length-1]}
  function boucle(fn,min,max){const tic=()=>{if(!A.cur)return;fn();A.timers.push(setTimeout(tic,min+Math.random()*(max-min)))};A.timers.push(setTimeout(tic,min))}
  const SONS={
    blanc(){const s=source(bruit("blanc",3),true);chaine(s,filtre("lowpass",8000),gain(.32),A.master);s.start()},
    pluie(){const s=source(bruit("rose",4),true);chaine(s,filtre("highpass",350),filtre("lowpass",2600),gain(.55),A.master);s.start();
      const court=bruit("blanc",.04);
      boucle(()=>{const c=A.ctx,t=c.currentTime,g=c.createGain(),f=c.createBiquadFilter(),s2=c.createBufferSource();s2.buffer=court;f.type="bandpass";f.frequency.value=1800+Math.random()*3500;f.Q.value=4;
        g.gain.setValueAtTime(.05+Math.random()*.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);chaine(s2,f,g,A.master);s2.start(t);s2.stop(t+.06)},35,140)},
    cafe(){const s=source(bruit("brun",4),true);chaine(s,filtre("lowpass",650),gain(.7),A.master);s.start();
      const m=source(bruit("rose",5),true),g=gain(.22),lfo=A.ctx.createOscillator(),lg=gain(.1);lfo.frequency.value=.18;A.nodes.push(lfo);
      chaine(lfo,lg);lg.connect(g.gain);chaine(m,filtre("bandpass",480,.8),g,A.master);m.start();lfo.start();
      boucle(()=>{const c=A.ctx,t=c.currentTime,o=c.createOscillator(),g2=c.createGain();o.type="sine";o.frequency.value=2400+Math.random()*1600;
        g2.gain.setValueAtTime(.045,t);g2.gain.exponentialRampToValueAtTime(.0005,t+.45);chaine(o,g2,A.master);o.start(t);o.stop(t+.5)},2500,7500)}};
  function vider(){A.timers.forEach(clearTimeout);A.timers=[];A.nodes.forEach(n=>{try{if(n.stop)n.stop()}catch(e){}try{n.disconnect()}catch(e){}});A.nodes=[]}
  // À appeler depuis un toucher (clic) : crée le contexte audio la première fois.
  function lancer(type){const C=AC();if(!C||!SONS[type])return false;
    try{if(!A.ctx){A.ctx=new C();A.master=A.ctx.createGain();A.master.gain.value=reg().vol;A.master.connect(A.ctx.destination)}
      vider();A.cur=type;if(A.ctx.state!=="running")A.ctx.resume().catch(()=>{});SONS[type]()}
    catch(e){vider();A.cur="";return false}
    peindre();return true}
  function arreter(){vider();A.cur="";if(A.ctx&&A.ctx.state==="running")A.ctx.suspend().catch(()=>{});peindre()}
  T4.ambLancer=lancer;T4.ambArreter=arreter;
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&A.cur&&reg().coupe)arreter()});

  /* ---------------- Interface : réglages du profil et barre du focus ---------------- */
  const boutons=()=>TYPES.map(([k,l])=>`<button type="button" data-amb="${k}" class="${A.cur===k?"on":""}" aria-pressed="${A.cur===k}">${l}</button>`).join("")+`<button type="button" data-amb="" ${A.cur?"":"disabled"}>Arrêter</button>`;
  function brancher(el){el.querySelectorAll("button[data-amb]").forEach(b=>b.onclick=()=>{const k=b.dataset.amb;if(k&&A.cur!==k)lancer(k);else arreter()})}
  function peindre(){document.querySelectorAll("[data-p1amb]").forEach(g=>{g.innerHTML=boutons();brancher(g)})}
  T4.amb={
    bloc(d){if(!AC()){d.innerHTML=`<div class="p1amb"><b>Ambiance</b><p class="p1note">Ton navigateur ne peut pas jouer d’ambiance.</p></div>`;return}
      const r=reg();
      d.innerHTML=`<div class="p1amb"><b>Ambiance</b><p class="p1note">Un fond sonore fabriqué par le site, sans fichier ni compte. Il démarre quand tu touches un bouton.</p>
        <div class="pick sm" role="group" aria-label="Ambiance" data-p1amb></div>
        <label class="p1vol"><span>Volume</span><input type="range" min="0" max="100" step="5" value="${Math.round(r.vol*100)}" aria-label="Volume de l’ambiance"></label>
        <label class="p1chk"><input type="checkbox" ${r.coupe?"checked":""}> <span>Couper quand je quitte le site</span></label></div>`;
      peindre();
      d.querySelector('input[type="range"]').oninput=e=>{const v=Math.max(0,Math.min(1,(+e.target.value||0)/100));LS.set("amb",Object.assign(reg(),{vol:v}));if(A.master)A.master.gain.value=v};
      d.querySelector('input[type="checkbox"]').onchange=e=>LS.set("amb",Object.assign(reg(),{coupe:!!e.target.checked}))},
    barre(){const fb=document.getElementById("fbar");if(!fb||!AC()||fb.querySelector(".p1famb"))return;
      const row=document.createElement("div");row.className="p1famb";row.innerHTML=`<span>Ambiance</span><div class="pick sm" role="group" aria-label="Ambiance" data-p1amb></div>`;fb.appendChild(row);peindre()}};
  if(document.body.classList.contains("focus"))T4.amb.barre();
})();
P26mod.ok("ambiance");

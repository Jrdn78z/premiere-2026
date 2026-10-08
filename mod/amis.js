/* Paquet 1, Entre amis (T5) : fil d'actualité des amis, classement entre amis, partage du podium, signaler un pseudo,
   réglage du rappel du soir, événements « division » et « série ». Plan : /home/claude/plans/paquet1.md §3.4 a, b, c, d, e.
   Règles : aucun texte libre d'un autre compte (fil = phrases fixes de P26.evenements.fil, pseudos par esc) ; aucun on...=. */
(function(){
  "use strict";
  const connecte=()=>{try{return !!SOC()}catch(e){return false}};
  const amisOk=()=>new Set((NT.amis||[]).filter(a=>a&&a.ok).map(a=>a.id));
  const modeAmis=()=>{try{return LS.get("lgf","hub")==="amis"}catch(e){return false}};

  /* ---------- b) Classement entre amis : moi + amis acceptés ---------- */
  P26ui.filtreLigue=rows=>{if(!modeAmis()||!connecte())return rows;const s=amisOk();return rows.filter(r=>r.me||s.has(r.id))};

  /* ---------- a) Fil des amis (phrases fixes, cache 30 s) ---------- */
  const FIL={t:0,L:null,p:null};
  function fil(){if(FIL.L&&Date.now()-FIL.t<30000)return Promise.resolve(FIL.L);if(FIL.p)return FIL.p;
    FIL.p=window.P26.evenements.fil().then(L=>{FIL.L=(L||[]).filter(e=>!e.moi);FIL.t=Date.now();FIL.p=null;return FIL.L},()=>{FIL.p=null;return FIL.L||[]});return FIL.p}
  const quand=c=>{try{return admTime(Date.parse(c))}catch(e){return ""}};
  function filHTML(L,n){if(!L.length)return `<p class="muted p1vide">Rien de neuf chez tes amis pour l’instant.</p>`;
    return `<ul class="p1fil">${L.slice(0,n).map(e=>`<li><b>${esc(e.pseudo)}</b> ${esc(e.texte)}<small>${esc(quand(e.cree))}</small></li>`).join("")}</ul>`}
  function remplirFil(el,n){if(!el)return;if(FIL.L)el.innerHTML=filHTML(FIL.L,n);fil().then(L=>{if(el.isConnected)el.innerHTML=filHTML(L,n)})}

  /* ---------- e) Signaler un pseudo (module signaler chargé à la demande) ---------- */
  function candidats(){const out=[],vu=new Set();const add=(id,nick)=>{if(!id||id===UID||vu.has(id)||!nick)return;vu.add(id);out.push({id,nick:String(nick).slice(0,16)})};
    try{lgRanking().forEach(r=>add(r.id,r.nick))}catch(e){}(NT.amis||[]).forEach(a=>add(a.id,a.pseudo));return out}
  function signaler(liste){if(!liste.length){toast(`<div><b>Personne à signaler ici.</b></div>`);return}
    window.P26mod("signaler").then(()=>P26ui.signalerPseudo(liste)).catch(()=>toast(`<div><b>Cette partie du site n’est pas disponible pour l’instant.</b></div>`))}
  // Appui long (0,6 s) ou clic droit sur une ligne du classement ou un ami : aucun élément ajouté dans les lignes de l'application.
  (function(){const lg=document.getElementById("lg");if(!lg)return;let t=null,x0=0,y0=0;
    const cible=el=>{const li=el&&el.closest&&el.closest(".lgl li[data-id]:not(.me), .aml li");if(!li)return null;
      const id=li.dataset.id||(li.querySelector(".ap")||{dataset:{}}).dataset.id;if(!id||id===UID)return null;
      const r=candidats().find(c=>c.id===id);return r||null};
    const stop=()=>{if(t){clearTimeout(t);t=null}};
    lg.addEventListener("contextmenu",e=>{const c=cible(e.target);if(!c||!connecte())return;e.preventDefault();signaler([c])});
    lg.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;const c=cible(e.target);if(!c||!connecte())return;x0=e.clientX;y0=e.clientY;stop();t=setTimeout(()=>{t=null;signaler([c])},600)});
    lg.addEventListener("pointermove",e=>{if(t&&(Math.abs(e.clientX-x0)>10||Math.abs(e.clientY-y0)>10))stop()});
    ["pointerup","pointercancel","pointerleave"].forEach(k=>lg.addEventListener(k,stop))})();

  /* ---------- c) Partage du podium ---------- */
  function partager(st){const top=lgRanking().slice(0,3).map(r=>({nick:r.nick,score:r.wx}));if(!top.length)return;
    st.className="istat";st.textContent="Préparation de l’image…";
    window.P26mod("partage").then(()=>P26ui.partagePodium({titre:"Classement Elo",lignes:top},st)).catch(()=>{st.className="istat err";st.textContent="Partage indisponible pour l’instant."})}

  /* ---------- Emplacement « ligue.haut » : bascule, partage, signalement, fil (3 derniers) ---------- */
  P26ui.on("slot:ligue.haut",el=>{verifDivision();if(!connecte())return;const d=P26ui.bloc(el,"amis");const am=modeAmis(),nA=amisOk().size;
    d.innerHTML=`<div class="pick sm p1lgf" role="group" aria-label="Qui voir dans le classement"><button type="button" data-f="hub" class="${am?"":"on"}" aria-pressed="${am?"false":"true"}">Tout le hub</button><button type="button" data-f="amis" class="${am?"on":""}" aria-pressed="${am?"true":"false"}">Mes amis</button></div>
     ${am&&!nA?`<p class="muted p1vide">Ajoute des amis avec leur pseudo pour les voir ici.</p>`:""}
     <div class="exrow"><button class="btn ghost" type="button" data-a="podium">Partager le podium</button><button class="linkbtn" type="button" data-a="sigp">Signaler un pseudo</button><span class="istat" role="status"></span></div>
     <div class="sec p1sec"><h2>Fil des amis</h2></div><div class="p1filb"></div>`;
    d.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{LS.set("lgf",b.dataset.f==="amis"?"amis":"hub");renderLigue()});
    d.querySelector('[data-a="podium"]').onclick=()=>partager(d.querySelector(".istat"));
    d.querySelector('[data-a="sigp"]').onclick=()=>signaler(candidats());
    remplirFil(d.querySelector(".p1filb"),3)},40);

  /* ---------- d) Réglage du rappel du soir (emplacement « notifs ») ---------- */
  const REG={t:0,v:null,abs:false,p:null};
  function reglages(force){if(REG.abs)return Promise.resolve(null);if(!force&&REG.v&&Date.now()-REG.t<60000)return Promise.resolve(REG.v);if(REG.p)return REG.p;
    REG.p=window.P26.rpc("notif_reglages_mes").then(r=>{const x=Array.isArray(r)?r[0]:r;REG.p=null;if(!x||typeof x!=="object")return REG.v;
        const h=Math.round(+x.heure),ha=Math.round(+x.heure_auto);REG.v={rappel:x.rappel!==false,heure:h>=17&&h<=21?h:null,auto:ha>=17&&ha<=21?ha:18};REG.t=Date.now();return REG.v},
      e=>{REG.p=null;if(e&&e.code==="absent")REG.abs=true;return null});return REG.p}
  function rappelHTML(v){return `<div class="sec p1sec"><h2>Rappel du soir</h2></div>
     <label class="admsw"><span class="sw"><input type="checkbox" class="p1rap"${v.rappel?" checked":""}><span></span></span><span><b>Me rappeler de réviser</b><small>Au plus une notification par jour, seulement si tu n’as pas encore révisé.</small></span></label>
     <label class="lab" for="p1rh">Heure</label><select class="inp p1rh" id="p1rh"${v.rappel?"":" disabled"}><option value="">Automatique (vers ${v.auto} h, d’après tes habitudes)</option>${[17,18,19,20,21].map(h=>`<option value="${h}"${v.heure===h?" selected":""}>${h} h</option>`).join("")}</select>
     ${(typeof PUSH==="object"&&PUSH.st!=="on")?`<p class="muted p1vide">Le rappel arrive comme une notification du téléphone : active-les plus haut.</p>`:""}
     <p class="istat p1rst" role="status"></p>`}
  function rappelBind(box){const cb=box.querySelector(".p1rap"),sel=box.querySelector(".p1rh"),st=box.querySelector(".p1rst");if(!cb||!sel)return;
    const envoyer=async()=>{const v={rappel:cb.checked,heure:sel.value?Math.round(+sel.value):null};cb.disabled=sel.disabled=true;st.className="istat p1rst";st.textContent="Enregistrement…";
      try{await window.P26.rpc("notif_regler",{p_rappel:v.rappel,p_heure:v.heure});REG.v=Object.assign({},REG.v,v);REG.t=Date.now();st.textContent="Réglage enregistré."}
      catch(e){st.className="istat p1rst err";st.textContent=e&&e.texte?e.texte:"Réglage impossible pour l’instant.";if(REG.v){cb.checked=REG.v.rappel;sel.value=REG.v.heure==null?"":String(REG.v.heure)}}
      cb.disabled=false;sel.disabled=!cb.checked};
    cb.onchange=envoyer;sel.onchange=envoyer}
  function remplirRappel(el){if(!el)return;const go=v=>{if(!el.isConnected)return;if(!v){el.innerHTML="";return}el.innerHTML=rappelHTML(v);rappelBind(el)};
    if(REG.v)go(REG.v);reglages().then(v=>{if(v&&el.isConnected&&!el.querySelector(".p1rap:disabled"))go(v)})}
  P26ui.on("slot:notifs",el=>{if(!connecte())return;const d=P26ui.bloc(el,"amis");
    d.innerHTML=`<div class="sec p1sec"><h2>Fil des amis</h2></div><div class="p1filb"></div><div class="p1rapb"></div>`;
    remplirFil(d.querySelector(".p1filb"),10);remplirRappel(d.querySelector(".p1rapb"))},10);

  /* ---------- a) Événements émis : division (montée), série (7, 30, 100 soirs) ---------- */
  const DIVN=["bronze","argent","or","diamant"];
  const etatAm=()=>{const s=P26ui.etat("am",{});return s&&typeof s==="object"&&!Array.isArray(s)?s:(P.p1.am={})};
  function verifDivision(){try{if(!connecte()||typeof ELO==="undefined"||!ELO.ok)return;const d=eloDiv(myElo()),st=etatAm();
      if(typeof st.dv!=="number"){st.dv=d;saveP();return}
      if(d>st.dv&&DIVN[d])window.P26.evenements.add("division",{n:DIVN[d]});
      if(d!==st.dv){st.dv=d;saveP()}}catch(e){}}
  let base=null;
  function verifSerie(){try{if(!connecte()||base===null)return;const s=streakNow(),st=etatAm();
      for(const m of [7,30,100]){if(base<m&&s>=m){const deb=new Date(NOW);deb.setDate(deb.getDate()-(s-1));const k=m+":"+isoOf(deb);
        const vus=Array.isArray(st.se)?st.se:[];if(!vus.includes(k)){st.se=vus.concat(k).slice(-6);saveP();window.P26.evenements.add("serie",{n:m})}}}
      base=s}catch(e){}}
  // La série de départ est relevée après le chargement (progression du compte fusionnée), pour n'annoncer que ce qui se passe maintenant.
  const relever=()=>setTimeout(()=>{try{if(base===null)base=streakNow()}catch(e){}},2500);
  P26ui.on("contenu",relever);if(typeof C!=="undefined"&&C.ready)relever();
  P26ui.on("xp",()=>{verifSerie();verifDivision()});
  P26ui.on("vue",()=>{verifSerie();verifDivision()});
})();
P26mod.ok("amis");

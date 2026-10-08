/* Paquet 1, Réviser (T2), module préchargé :
   - accueil : compte à rebours du bac de français et de l'épreuve anticipée de maths, maîtrise des 3 matières les plus faibles ;
   - Duel : carte « Épreuve anticipée de maths » (ouvre la vue epreuve, module epreuve.js) ;
   - Jeu : bouton « 2 minutes », interrupteur « Écrire la réponse » (champ sous la carte, vérifié par matchAnswer) ;
   - Profil : maîtrise de toutes les matières, lien « Relier Pronote » ; réglages : taille du texte, police pour la dyslexie ;
   - Importer : lien « Relier Pronote » (vue pronote, module pronote.js).
   État : P.p1.txt, P.p1.dys (réglages, copiés aussi dans le stockage du téléphone pour s'appliquer tout de suite), P.p1.ep (notes d'épreuve). */
(function(){
  "use strict";
  // Dates vérifiées sur education.gouv.fr le 7 octobre 2026 (à revoir chaque année).
  const BAC=[{id:"fr",iso:"2027-06-15",nom:"Bac de français",quand:"mardi 15 juin 2027, 8 h"},
             {id:"maths",iso:"2027-06-21",nom:"Maths, épreuve anticipée",quand:"lundi 21 juin 2027, 8 h"}];
  const TAILLES=[90,100,115,130];
  const niv=()=>{try{const c=clsOk(P.cls);return c?c.niv:""}catch(e){return ""}};
  const concerne=()=>niv()!=="1MELEC";                       // 1G, 1STMG (et classe pas encore choisie)
  const ouvrirEpreuve=a=>P26ui.ouvrir("epreuve",a||"");

  /* ---------- Taille du texte et police ---------- */
  function reglage(k){const p=P.p1&&P.p1[k];if(p!==undefined)return p;return LS.get(k==="txt"?"txt":"dys",undefined)}
  function taille(){const v=+reglage("txt");return TAILLES.includes(v)?v:100}
  function appliquer(){const t=taille(),H=document.documentElement;H.style.fontSize=t===100?"":t+"%";
    if(t===100)H.removeAttribute("data-p1txt");else H.setAttribute("data-p1txt",String(t));
    if(reglage("dys")===true)document.body.setAttribute("data-police","dys");else document.body.removeAttribute("data-police")}
  function regler(k,v){P26ui.etat(k);P.p1[k]=v;LS.set(k,v);saveP();appliquer()}
  appliquer();
  P26ui.on("contenu",appliquer);

  /* ---------- Fusion des notes d'épreuve (union, 30 dernières) ---------- */
  P26ui.fusion("ep",(loc,dist)=>{const o=Object.assign({},dist&&typeof dist==="object"?dist:{},loc&&typeof loc==="object"?loc:{});
    const ks=Object.keys(o).filter(k=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(k)).sort().slice(-30);const r={};ks.forEach(k=>r[k]=o[k]);return r});

  /* ---------- Maîtrise par matière ---------- */
  function maitrise(){const by={};Object.values(C.cards||{}).forEach(x=>{const m=x&&x.ch&&x.ch.mat;if(!m)return;(by[m]=by[m]||{n:0,s:0}).n++;if(boxOf(x.c.id)>=3)by[m].s++});
    return (C.mats||[]).filter(m=>by[m.id]&&by[m.id].n).map(m=>({id:m.id,nom:m.court||m.nom,long:m.nom||m.court,suit:m.suit,n:by[m.id].n,s:by[m.id].s,p:Math.round(by[m.id].s/by[m.id].n*100)}))}
  function maitriseHTML(L){return `<div class="p1mai">${L.map(x=>{const phrase="Maîtrise : "+x.p+" % des cartes de "+x.long+" sont sues.";
    return `<div class="p1m" style="--suit:${suitOf(x.id)};--p:${(x.p/100).toFixed(2)}" data-m="${esc(x.id)}" data-pct="${x.p}" title="${esc(phrase)}"><span class="n">${esc(x.nom)}</span><span class="b" aria-hidden="true"><i></i></span><b>${x.p} %</b><span class="sr">${esc(phrase)}</span></div>`}).join("")}</div>`}

  /* ---------- Accueil ---------- */
  P26ui.on("slot:accueil",el=>{if(!C.ready)return;const d=P26ui.bloc(el,"revision");let h="";
    if(concerne()){const L=BAC.map(b=>Object.assign({n:daysTo(b.iso)},b)).filter(b=>b.n>=0);
      if(L.length)h+=`<div class="p1bac" role="group" aria-label="Épreuves anticipées">${L.map(b=>`<div class="p1pas" data-bac="${b.id}"><span class="j">${b.n===0?"J":"J-"+b.n}</span><span class="t"><b>${esc(b.nom)}</b><small>${b.n===0?"C’est aujourd’hui. Bon courage !":esc(b.quand)}</small></span></div>`).join("")}
        <button class="btn ghost p1bacgo" type="button" data-p1go="ep">Réviser les maths</button></div>`}
    const M=maitrise().sort((a,b)=>a.p-b.p||a.nom.localeCompare(b.nom)).slice(0,3);
    if(M.length)h+=`<div class="p1sec"><h3>Maîtrise par matière</h3><button class="linkbtn" type="button" data-p1go="pf">Toutes</button></div>`+maitriseHTML(M);
    d.innerHTML=h;
    const g=d.querySelector('[data-p1go="ep"]');if(g)g.onclick=()=>ouvrirEpreuve("");
    const f=d.querySelector('[data-p1go="pf"]');if(f)f.onclick=()=>go("profil")});

  /* ---------- Duel : carte de l'épreuve anticipée ---------- */
  P26ui.on("slot:duel",el=>{if(!concerne())return;const d=P26ui.bloc(el,"revision");
    const ep=(P.p1&&P.p1.ep)||{},k=Object.keys(ep).sort().pop(),der=k&&ep[k]&&Number.isFinite(+ep[k].n)?String(+ep[k].n).replace(".",","):"";
    const enCours=!!(window.P26ep&&window.P26ep.enCours());
    d.innerHTML=`<div class="bbcard epcard"><h3>Épreuve anticipée de maths</h3><p>Lundi 21 juin 2027, 2 h, sans calculatrice. Partie 1 : automatismes. Partie 2 : exercices.${der?" Dernière note : <b>"+esc(der)+"/20</b>.":""}</p>
      <div class="eprow">${enCours?`<button class="btn" type="button" data-ep="">Reprendre l’épreuve en cours</button>`
        :`<button class="btn" type="button" data-ep="auto">Automatismes, 20 min</button><button class="btn ghost" type="button" data-ep="complete">Épreuve complète, 2 h</button><button class="btn ghost" type="button" data-ep="theme">Par thème</button>`}</div></div>`;
    d.querySelectorAll("[data-ep]").forEach(b=>b.onclick=()=>ouvrirEpreuve(b.dataset.ep))});

  /* ---------- Jeu : 2 minutes et « Écrire la réponse » ---------- */
  const ecrire=()=>LS.get("ecrire",false)===true;
  P26ui.on("slot:jeu",el=>{const d=P26ui.bloc(el,"revision");
    d.innerHTML=`<div class="opts p1jeu"><button class="btn focus" type="button" data-p1="deux">2 minutes</button><button class="linkbtn" type="button" data-p1="ecr" aria-pressed="${ecrire()}">Écrire la réponse : ${ecrire()?"activé":"coupé"}</button></div>`;
    d.querySelector('[data-p1="deux"]').onclick=()=>{focusOn(true,2);P26ui.emit("activite",{type:"deux-minutes"})};
    d.querySelector('[data-p1="ecr"]').onclick=e=>{LS.set("ecrire",!ecrire());const b=e.currentTarget;b.textContent="Écrire la réponse : "+(ecrire()?"activé":"coupé");b.setAttribute("aria-pressed",String(ecrire()));champ(cur)}});

  const longueur=v=>plainTex(String(v||"").replace(/\$([^$]+)\$/g,"$1")).replace(/\s+/g," ").trim().length;
  function boite(){let b=document.getElementById("p1ecr");const st=document.getElementById("stage");if(!st)return null;
    if(!b){b=document.createElement("div");b.id="p1ecr";b.setAttribute("data-p1","revision");st.insertAdjacentElement("afterend",b);
      new MutationObserver(()=>{if(!document.getElementById("play"))b.textContent=""}).observe(st,{childList:true})}
    return b}
  function champ(c){const b=boite();if(!b)return;b.textContent="";if(!ecrire()||!c||!document.getElementById("play"))return;
    if(longueur(c.v)>80){b.innerHTML=`<p class="p1ecrl">Réponse longue : retourne la carte et dis-la à voix basse.</p>`;return}
    b.innerHTML=`<form class="p1ecrf" novalidate><label for="p1ecrIn">Ta réponse</label><div class="r"><input id="p1ecrIn" class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200"><button class="btn" type="submit">Vérifier</button></div><p class="p1ecrv" role="status" aria-live="polite"></p></form>`;
    const f=b.querySelector("form"),inp=f.querySelector("input"),out=f.querySelector(".p1ecrv");
    f.onsubmit=e=>{e.preventDefault();const s=inp.value.trim();if(!s){inp.focus();return}
      if(!flipped)flip();const ok=matchAnswer(s,c.v);
      out.className="p1ecrv "+(ok?"ok":"ko");out.textContent=ok?"Juste !":"Pas tout à fait. Compare avec la réponse.";
      inp.blur()}}
  P26ui.on("carte",x=>champ(x&&x.cur));

  /* ---------- Profil ---------- */
  P26ui.on("slot:profil",el=>{const d=P26ui.bloc(el,"revision");const M=C.ready?maitrise().sort((a,b)=>a.p-b.p||a.nom.localeCompare(b.nom)):[];
    d.innerHTML=(M.length?`<div class="p1sec"><h3>Maîtrise par matière</h3><span>cartes sues</span></div>${maitriseHTML(M)}`:"")+
      `<button class="p1lien" type="button" data-p1go="pronote"><b>Relier Pronote</b><span>Tes devoirs et contrôles arrivent tout seuls, avec Pont Pronote sur ton ordinateur.</span></button>`;
    d.querySelector('[data-p1go="pronote"]').onclick=()=>P26ui.ouvrir("pronote","")});
  P26ui.on("slot:profil.reglages",el=>{const d=P26ui.bloc(el,"revision");const t=taille(),dys=reglage("dys")===true;
    d.innerHTML=`<p class="p1lab" id="p1txtL">Taille du texte</p><div class="pick sm" role="group" aria-labelledby="p1txtL">${TAILLES.map(v=>`<button type="button" class="${v===t?"on":""}" data-txt="${v}" aria-pressed="${v===t}">${v} %</button>`).join("")}</div>
      <div class="admsw p1dys"><label class="sw"><input type="checkbox" id="p1dys"${dys?" checked":""}><span></span></label><label for="p1dys"><b>Police plus facile à lire (pour la dyslexie)</b><small>OpenDyslexic, sur tout le site.</small></label></div>`;
    d.querySelectorAll("[data-txt]").forEach(b=>b.onclick=()=>{regler("txt",+b.dataset.txt);d.querySelectorAll("[data-txt]").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",String(on))})});
    d.querySelector("#p1dys").onchange=e=>regler("dys",!!e.target.checked)});

  /* ---------- Importer ---------- */
  P26ui.on("slot:import",el=>{const d=P26ui.bloc(el,"revision");
    d.innerHTML=`<button class="p1lien" type="button" data-p1go="pronote"><b>Relier Pronote</b><span>Télécharger Pont Pronote, le guide en 5 étapes et l’état de ta dernière synchro.</span></button>`;
    d.querySelector('[data-p1go="pronote"]').onclick=()=>P26ui.ouvrir("pronote","")});

  window.P26rev={maitrise,taille,appliquer};
})();
P26mod.ok("revision");

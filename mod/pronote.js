/* Paquet 1, Réviser (T2) : page « Relier Pronote » (vue pronote, #m=pronote).
   Téléchargement de Pont Pronote (Windows, Mac), guide en 5 étapes, état de la dernière synchro (document data/users/<UID>/pont).
   Les adresses de téléchargement restent vides tant que le dépôt GitHub de Pont Pronote n'existe pas : bouton « Bientôt disponible ». */
(function(){
  "use strict";
  const PONT={win:"",mac:"",version:"2.0"};
  const URL_OK=u=>typeof u==="string"&&/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\//.test(u);
  let ST={etat:"?",doc:null};

  function quand(iso){const d=new Date(iso);if(isNaN(d))return "";
    return fmtLong.format(d)+" à "+d.getHours()+" h "+pad(d.getMinutes())}
  function etatHTML(){
    if(ST.etat==="?")return `<p class="loading">Je regarde ta dernière synchro…</p>`;
    if(ST.etat==="ok"){const j=ST.doc,n=Array.isArray(j.echeances)?j.echeances.length:0,q=quand(j.exporte);
      if(q)return `<p class="pnst ok">Dernière synchro : ${esc(q)}, ${n} date${n>1?"s":""}.</p>`}
    if(ST.etat==="err")return `<p class="pnst">Impossible de lire l’état de la synchro pour l’instant.</p>`;
    return `<p class="pnst">Pas encore de synchro.</p>`}
  function lire(box){ST={etat:"?",doc:null};
    if(typeof DB==="undefined"||!DB||!UID||(typeof GUEST!=="undefined"&&GUEST)){ST.etat="vide";return}
    DB.doc("data/users/"+UID+"/pont").get().then(s=>{const j=s&&s.exists?s.data():null;
      ST=j&&j.format==="pont-pronote"?{etat:"ok",doc:j}:{etat:"vide",doc:null}},()=>{ST={etat:"err",doc:null}})
      .then(()=>{const e=box.querySelector("#pnEtat");if(e&&box.dataset.vue==="pronote")e.innerHTML=etatHTML()})}
  function bouton(url,nom){return URL_OK(url)?`<a class="btn" href="${esc(url)}" rel="noopener noreferrer" target="_blank" download>Télécharger pour ${nom}</a>`
    :`<button class="btn" type="button" disabled aria-disabled="true">Bientôt disponible</button>`}

  P26ui.vue("pronote",{titre:"Relier Pronote",
    rendre(box){const neuf=box.dataset.pnv!=="1";box.dataset.pnv="1";if(neuf)lire(box);
      box.innerHTML=`<div class="ihead"><h1>Relier Pronote</h1><button class="linkbtn" type="button" id="pnBack">Retour</button></div>
       <p class="lgsub">Pont Pronote ${esc(PONT.version)} est un petit programme pour ton ordinateur. Il lit tes devoirs et tes contrôles sur Pronote et les range dans ton agenda ici, tout seuls. Ton mot de passe Pronote reste sur ton ordinateur.</p>
       <div class="pnetat" id="pnEtat">${etatHTML()}</div>
       <div class="pndl">
        <div class="pnos"><b>Windows</b><span>Windows 10 ou 11.</span>${bouton(PONT.win,"Windows")}</div>
        <div class="pnos"><b>Mac</b><span>Version Mac non testée sur un vrai Mac.</span>${bouton(PONT.mac,"Mac")}</div>
       </div>
       <p class="pnlim">Pont Pronote tourne sur un ordinateur, pas sur un téléphone.</p>
       <div class="sec"><h2>Le guide en 5 étapes</h2></div>
       <ol class="pnguide">
        <li><b>Télécharge</b> Pont Pronote pour ton ordinateur avec le bouton ci-dessus.</li>
        <li><b>Ouvre-le.</b> Windows : clique sur « Informations complémentaires » puis « Exécuter quand même ». Mac : clic droit sur le programme puis « Ouvrir ».</li>
        <li><b>Connecte-toi à Pronote</b> avec le QR code de ton appli Pronote, comme sur ton téléphone.</li>
        <li><b>Clique sur « Relier mon site »</b> : l’adresse du site, ton pseudo et ton mot de passe du site. Une seule fois.</li>
        <li><b>C’est tout.</b> Pont Pronote fait la synchro chaque soir, tant que ton ordinateur est allumé.</li>
       </ol>`;
      box.querySelector("#pnBack").onclick=()=>P26ui.retour()},
    quitter(){const b=document.getElementById("modv");if(b)delete b.dataset.pnv}});
  window.P26pronote={PONT};
})();
P26mod.ok("pronote");

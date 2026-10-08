/* Paquet 1, Admin et sécurité (T5) : signaler un pseudo, signaler un bug. Plan §3.4 e.
   Écrit dans signalements/<id> (lisible par l'admin seulement ; l'auteur « par » est posé par la base).
   Motifs fixes, pas de capture d'écran (décision R7) : vue, BUILD, dernière erreur JS, navigateur (120 caractères). */
(function(){
  "use strict";
  const MOTIFS=[["insulte","Pseudo insultant"],["usurpation","Se fait passer pour quelqu’un"],["autre","Autre"]];
  const UIDRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const erreur=e=>{try{return writeErr(e)}catch(x){return "Envoi impossible pour l’instant. Réessaie."}};

  /* ---------- Pseudo : fenêtre avec motifs fixes ---------- */
  function fermer(){const m=document.querySelector(".p1modal");if(m)m.remove();document.removeEventListener("keydown",echap)}
  function echap(e){if(e.key==="Escape")fermer()}
  P26ui.signalerPseudo=liste=>{fermer();const L=(Array.isArray(liste)?liste:[]).filter(c=>c&&UIDRE.test(String(c.id))).slice(0,200).map(c=>({id:c.id,nick:String(c.nick==null?"?":c.nick).slice(0,16)}));
    if(!L.length)return false;
    const m=document.createElement("div");m.className="p1modal";
    m.innerHTML=`<div class="p1dlg" role="dialog" aria-modal="true" aria-labelledby="p1sgT"><h2 id="p1sgT">Signaler un pseudo</h2>
      ${L.length===1?`<p>Pseudo : <b>${esc(L[0].nick)}</b></p>`:`<label class="lab" for="p1sgW">Quel pseudo ?</label><select class="inp" id="p1sgW">${L.map((c,i)=>`<option value="${i}">${esc(c.nick)}</option>`).join("")}</select>`}
      <div class="p1mot" role="radiogroup" aria-label="Pourquoi ?">${MOTIFS.map(([k,l],i)=>`<label><input type="radio" name="p1sgM" value="${k}"${i===0?" checked":""}> ${esc(l)}</label>`).join("")}</div>
      <p class="muted" style="font-size:.85rem">L’admin voit le pseudo et le motif. Il peut bloquer le compte.</p>
      <div class="exrow"><button class="btn" type="button" id="p1sgGo">Envoyer</button><button class="btn ghost" type="button" id="p1sgNo">Annuler</button></div><p class="istat" id="p1sgSt" role="status"></p></div>`;
    document.body.appendChild(m);document.addEventListener("keydown",echap);
    m.addEventListener("click",e=>{if(e.target===m)fermer()});
    m.querySelector("#p1sgNo").onclick=fermer;
    const go=m.querySelector("#p1sgGo");go.onclick=async()=>{const st=m.querySelector("#p1sgSt");const w=m.querySelector("#p1sgW");const c=L[w?Math.max(0,Math.min(L.length-1,+w.value||0)):0];
      const r=m.querySelector('input[name="p1sgM"]:checked'),motif=r&&MOTIFS.some(x=>x[0]===r.value)?r.value:"autre";
      go.disabled=true;st.className="istat";st.textContent="Envoi…";
      try{await DB.collection("signalements").add({type:"pseudo",cible:c.id,pseudo:c.nick,motif,date:new Date().toISOString()});
        st.textContent="Merci, l’admin va regarder.";setTimeout(fermer,1500)}
      catch(e){go.disabled=false;st.className="istat err";st.textContent=erreur(e)}};
    go.focus();return true};

  /* ---------- Bug : vue « signaler » (#m=signaler) ---------- */
  P26ui.vue("signaler",{titre:"Signaler un bug",rendre(box){
    if(box.querySelector("#p1bgT")&&box.dataset.vue==="signaler"&&box.querySelector("#p1bgTxt"))return; // déjà affichée : garder la saisie
    box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="p1bgBack">Retour</button></div>
      <h1 class="adh" id="p1bgT">Signaler un bug</h1>
      <label class="lab" for="p1bgTxt">Décris ce qui ne marche pas (500 caractères au plus).</label>
      <textarea class="inp" id="p1bgTxt" rows="5" maxlength="500" style="width:100%;font:inherit;font-size:16px"></textarea>
      <p class="muted" style="font-size:.85rem;margin:6px 0">Sont envoyés avec ton texte : l’écran où tu étais, la version du site, la dernière erreur technique et le type de navigateur. Pas de capture d’écran. N’écris rien de personnel.</p>
      <div class="exrow"><button class="btn light" type="button" id="p1bgGo">Envoyer</button><span class="istat" id="p1bgSt" role="status"></span></div>`;
    box.querySelector("#p1bgBack").onclick=()=>P26ui.retour();
    const go=box.querySelector("#p1bgGo");go.onclick=async()=>{const st=box.querySelector("#p1bgSt"),t=clip(box.querySelector("#p1bgTxt").value,500);
      if(!t){st.className="istat err";st.textContent="Décris ce qui ne marche pas (500 caractères au plus).";return}
      let err="",vue="";try{err=String((P26ui.derniereErreur&&P26ui.derniereErreur())||"").slice(0,200)}catch(e){}try{vue=String((P26ui.derniereVue&&P26ui.derniereVue())||"").slice(0,24)}catch(e){}
      go.disabled=true;st.className="istat";st.textContent="Envoi…";
      try{await DB.collection("signalements").add({type:"bug",texte:t,vue,build:String(window.P26_BUILD||"").slice(0,20),err,ua:String(navigator.userAgent||"").slice(0,120),date:new Date().toISOString()});
        box.querySelector("#p1bgTxt").value="";st.textContent="Merci, l’admin va regarder.";go.disabled=false}
      catch(e){go.disabled=false;st.className="istat err";st.textContent=erreur(e)}}}});
})();
P26mod.ok("signaler");

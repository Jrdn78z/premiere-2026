/* ================= Lot P3 : carte du Programme façon jeu vidéo =================
   Module préchargé (P26ui.precharger). Dans l'onglet Cours, sous un bouton « Carte » : une carte par matière, dessinée en SVG.
   Chaque chapitre du Programme est une île reliée à la suivante par un chemin. L'île s'allume selon la maîtrise du chapitre,
   calculée EXACTEMENT comme ailleurs sur le site : stats(cardsOfChap(ch)) de l'application (boîte 3 et plus = carte sue, la même
   règle que la maîtrise par matière de revision.js). Grise = pas commencée, colorée = en cours, qui brille = 80 % et plus,
   drapeau = 100 %. Toucher une île ouvre le chapitre dans l'onglet Cours (comme les puces de chapitres).
   Le Personnage de l'élève (avec son skin et son accessoire, par avHTML) est posé sur la dernière île travaillée.
   La carte défile horizontalement à l'intérieur de son cadre, jamais la page. Réglage local : carte ouverte ou repliée. */
(function(){
  "use strict";
  const K=window.P3C=window.P3C||{};
  const DX=118,X0=66,H=250;
  const ouverte=()=>{try{return LS.get("p3_carte",true)!==false}catch(e){return true}};
  const N1=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const pos=i=>({x:X0+i*DX,y:Math.round(122+56*Math.sin(i*1.25+.6))});
  const court=(t,n)=>{t=String(t||"").trim();return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,"")+"…":t};

  /* ---------------- Données : chapitres d'une matière, maîtrise par chapitre (même calcul que l'application) ---------------- */
  function chapitres(mat){try{return typeof chapsOf==="function"?chapsOf(mat):[]}catch(e){return []}}
  // p : maîtrise (cartes sues, boîte 3 et plus, comme stats()). a : avancement, qui compte aussi les cartes déjà vues (à moitié),
  // pour qu'une île commencée ne reste pas à 0 %.
  function etat(ch){const cartes=cardsOfChap(ch),st=stats(cartes);const n=st.n,p=n?Math.round(st.m/n*100):0;
    let der=0,vues=0;for(const c of cartes){const v=P.c&&P.c[c.id];if(Array.isArray(v)){vues++;if(+v[2]>der)der=+v[2]}}
    const a=n?Math.round((st.m+Math.max(0,vues-st.m)*.5)/n*100):0;
    let k="vide";if(n){k=vues===0?"gris":p>=100?"fini":p>=80?"brille":"cours"}
    return {n,m:st.m,g:st.g,p,a,vues,k,der}}
  K.etat=ch=>etat(ch);
  function zones(mat){return chapitres(mat).map((ch,i)=>Object.assign({ch,i,id:String(ch.id||ch.tid||""),titre:String(ch.court||ch.titre||"Chapitre "+(i+1))},etat(ch),pos(i)))}
  K.zones=mat=>zones(mat).map(z=>({id:z.id,titre:z.titre,p:z.p,a:z.a,vues:z.vues,k:z.k,n:z.n}));

  /* ---------------- Dessin ---------------- */
  // Île : contour organique (7 points, rayon qui ondule selon l'indice), fermé par des courbes lisses.
  function ile(z){const pts=[];for(let k=0;k<7;k++){const a=k/7*Math.PI*2,r=30+6*Math.sin(z.i*2.1+k*2.6)+3*Math.cos(k*1.7+z.i);pts.push([z.x+Math.cos(a)*r*1.18,z.y+Math.sin(a)*r*.86])}
    let d="";for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;d+=(k?"":`M${mx.toFixed(1)} ${my.toFixed(1)}`)+` Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${((b[0]+pts[(k+2)%pts.length][0])/2).toFixed(1)} ${((b[1]+pts[(k+2)%pts.length][1])/2).toFixed(1)}`}
    return d+"Z"}
  const chemin=(a,b)=>`M${a.x} ${a.y} C${a.x+DX*.45} ${a.y} ${b.x-DX*.45} ${b.y} ${b.x} ${b.y}`;
  const drapeau=z=>`<g class="p3cflag" transform="translate(${z.x+16} ${z.y-40})"><path d="M0 0V30" stroke="#5B3A12" stroke-width="2.2" stroke-linecap="round"/><path d="M1 1H19L14 7L19 13H1Z" fill="var(--gold)"/></g>`;
  function svg(Z){const W=Z.length?X0*2+DX*(Z.length-1):X0*2;
    const routes=Z.slice(1).map((z,i)=>`<path class="p3cr${Z[i].k==="brille"||Z[i].k==="fini"?" fait":""}" d="${chemin(Z[i],z)}"/>`).join("");
    const iles=Z.map(z=>`<g class="p3ci" data-k="${z.k}" style="--p:${(z.a/100).toFixed(2)}"><path class="p3cs" d="${ile(z)}" transform="translate(3 7)"/><path class="p3cb" d="${ile(z)}"/>
      ${z.k==="brille"||z.k==="fini"?`<path class="p3cg" d="${ile(z)}"/>`:""}<text class="p3cn" x="${z.x}" y="${z.y+6}" text-anchor="middle">${z.i+1}</text>${z.k==="fini"?drapeau(z):""}</g>`).join("");
    return {W,html:`<svg class="p3csvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${routes}${iles}</svg>`}}
  const libelle=z=>z.k==="vide"?"bientôt":z.k==="gris"?"à jouer":z.k==="fini"?"100 %":z.k==="cours"?Math.max(1,z.a)+" %":z.p+" %";
  const phrase=z=>z.k==="vide"?"pas encore de cartes":z.k==="gris"?"pas commencé":z.k==="fini"?"chapitre su, 100 %":z.k==="cours"?"avancement "+Math.max(1,z.a)+" %, "+z.vues+" carte"+(z.vues>1?"s":"")+" vue"+(z.vues>1?"s":"")+" sur "+z.n+", maîtrise "+z.p+" %":"maîtrise "+z.p+" %, presque fini";
  function moiHTML(){try{return avHTML({id:typeof UID==="string"?UID:"",nick:myNick()||"Moi",av:avData(),avk:avK(),me:true},"sm")}catch(e){return ""}}

  function carteHTML(mat){const Z=zones(mat);if(!Z.length)return `<p class="p1note">Aucun chapitre pour cette matière.</p>`;
    const {W,html}=svg(Z);let der=Z[0];for(const z of Z)if(z.der>der.der)der=z;
    const sus=Z.filter(z=>z.k==="fini").length,bien=Z.filter(z=>z.k==="brille"||z.k==="fini").length;
    const boutons=Z.map(z=>`<button type="button" class="p3cz" data-p3ch="${esc(z.id)}" data-k="${z.k}" style="left:${z.x}px;top:${z.y}px" aria-label="Chapitre ${z.i+1}, ${esc(z.titre)} : ${esc(phrase(z))}. Ouvrir"${sel.chap===z.id?' aria-current="true"':""}>
        <span class="p3cl">${esc(court(z.titre,34))}</span><b class="p3cpill">${esc(libelle(z))}</b></button>`).join("");
    const perso=`<span class="p3cav" style="left:${der.x+24}px;top:${der.y-34}px" title="Tu es ici">${moiHTML()}</span>`;
    return `<p class="p3cres">${sus?`<b>${sus}</b> chapitre${sus>1?"s":""} su${sus>1?"s":""} sur ${Z.length}`:`<b>${Z.length}</b> chapitre${Z.length>1?"s":""} à explorer`}${bien>sus?` · ${bien-sus} presque`:""}</p>
      <div class="p3cwrap" tabindex="0" aria-label="Carte des chapitres, défile de gauche à droite"><div class="p3cplan" style="width:${W}px;height:${H}px;--suit:${suitOf(mat)}">${html}${boutons}${perso}</div></div>
      <p class="p3cleg"><i data-k="gris"></i> à jouer <i data-k="cours"></i> en cours <i data-k="brille"></i> 80 % et plus <i data-k="fini"></i> su</p>`}

  /* ---------------- Onglet Cours : bouton « Carte » et carte de la matière choisie ---------------- */
  function rendre(d){const mat=typeof sel!=="undefined"&&sel.mat&&sel.mat[0]!=="@"&&C.M[sel.mat]?sel.mat:"";if(!mat||!C.ready){d.textContent="";return}
    const on=ouverte();
    d.innerHTML=`<div class="p3chead"><button type="button" class="btn ghost p3cbtn" data-p3carte aria-pressed="${on}" aria-expanded="${on}" aria-label="${on?"Replier":"Afficher"} la carte des chapitres de ${esc(matName(mat))}">${on?"Replier la carte":"Carte"}</button><span>${esc(matName(mat))}</span></div>
      ${on?`<div class="p3carte" style="--suit:${suitOf(mat)}">${carteHTML(mat)}</div>`:""}`;
    d.querySelector("[data-p3carte]").onclick=()=>{try{LS.set("p3_carte",!on)}catch(e){}buzz(8);rendre(d);
      if(!on){const w=d.querySelector(".p3cwrap"),cur=d.querySelector('.p3cz[aria-current="true"]');if(w&&cur)w.scrollLeft=Math.max(0,parseFloat(cur.style.left)-w.clientWidth/2)}};
    d.querySelectorAll("[data-p3ch]").forEach(b=>b.onclick=()=>{const id=b.dataset.p3ch;if(!C.chaps[id]||C.chaps[id].mat!==mat)return;buzz(8);sel.chap=id;sel.paq="*";
      try{renderCours()}catch(e){}setTimeout(()=>{const c=document.getElementById("cours");if(c&&c.scrollIntoView)c.scrollIntoView({block:"start",behavior:reduce?"auto":"smooth"})},40)});
    const w=d.querySelector(".p3cwrap"),cur=d.querySelector('.p3cz[aria-current="true"]');if(w&&cur)w.scrollLeft=Math.max(0,parseFloat(cur.style.left)-w.clientWidth/2)}
  P26ui.on("slot:cours.haut",el=>{const d=P26ui.bloc(el,"carte");d.className="p3c";rendre(d)},30);
  K.rendre=()=>{const d=document.querySelector('[data-slot="cours.haut"] [data-p1="carte"]');if(d)rendre(d)};
})();
P26mod.ok("carte");

/* ================= Lot P3 : compagnon qui grandit =================
   Module préchargé (P26ui.precharger). Une petite créature originale (cinq espèces dessinées pour le site, aucun personnage
   existant) adoptée gratuitement, qui grandit avec les soirs de révision : œuf, bébé, jeune, adulte, selon le nombre de soirs
   distincts avec au moins une réponse depuis l'adoption (journal P.j de l'application, le même que la série). Elle s'endort
   après 3 jours sans réviser et se réveille à la prochaine réponse ; elle réagit (contente, surprise, endormie) à une bonne série,
   à un trophée ou une victoire, à un retour. Elle vit sur la carte d'accueil (Table) et porte un accessoire déjà acheté en
   boutique (dessins acc-* de boutique2.js, réutilisés tels quels). Les amis la voient sur mon profil : espèce et stade publiés
   dans la ligne de classement (champ « cpg », revérifié par liste blanche et borné à l'affichage).
   Aucun achat obligatoire ; changer d'espèce remet au stade œuf (prévenu avant). État du compte : P.p1.cp. */
(function(){
  "use strict";
  const CP=window.P3CP=window.P3CP||{};
  const ISO=/^\d{4}-\d{2}-\d{2}$/,NOM=/^[\p{L}\p{N} '’-]{1,14}$/u;
  const ACC_ID=/^[a-z0-9-]{0,24}$/;
  const has=(o,k)=>!!o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const SEUILS=[3,10,25];                                   // soirs pour devenir bébé, jeune, adulte
  const STADES=["Œuf","Bébé","Jeune","Adulte"];
  const DODO_JOURS=3;
  const connecte=()=>typeof UID==="string"&&!!UID&&!(typeof GUEST!=="undefined"&&GUEST);
  CP.SEUILS=SEUILS;CP.STADES=STADES;

  /* ---------------- Espèces (dessins originaux, boîte 100 x 100 comme le Personnage : les accessoires s'y posent) ---------------- */
  const SP={
    goutte:{nom:"Plouf",lab:"Goutte d’eau",c:["#5EC1F0","#2A8BC7","#D8F3FF"],fond:"#123C57"},
    pousse:{nom:"Brindille",lab:"Jeune pousse",c:["#86D176","#3E8F3A","#F0FAE0"],fond:"#1B3A22"},
    braise:{nom:"Flammèche",lab:"Petite flamme",c:["#FFA04A","#D9542B","#FFE7B3"],fond:"#3F1A0E"},
    caillou:{nom:"Galet",lab:"Caillou vivant",c:["#B1A5CC","#6C5F8E","#EAE5F7"],fond:"#262038"},
    nuage:{nom:"Nimbus",lab:"Petit nuage",c:["#EAF1FA","#9FB8D6","#FFFFFF"],fond:"#1F2E48"}};
  const ESP=Object.keys(SP);
  const espOk=e=>typeof e==="string"&&has(SP,e)?e:"";
  CP.especes=()=>ESP.map(e=>({id:e,nom:SP[e].nom,lab:SP[e].lab}));
  const Pa=(d,f,x)=>`<path d="${d}" fill="${f}"${x||""}/>`;
  const Ci=(cx,cy,r,f,x)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${x||""}/>`;
  const El=(cx,cy,rx,ry,f,x)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${x||""}/>`;
  const Ln=(d,s,w)=>`<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ECH=[1,.72,.88,1];                                  // taille du corps par stade
  // Corps au stade adulte, centré en (50,50), haut vers y = 18 : le même dessin est réduit pour bébé et jeune.
  function corps(e,c){
    if(e==="goutte")return Pa("M50 17C60 33 72 43 72 59A22 22 0 0 1 28 59C28 43 40 33 50 17Z",c[0])+Pa("M38 50Q36 64 46 72Q36 68 34 56Z",c[2],' opacity=".55"');
    if(e==="pousse")return El(50,54,22,28,c[0])+Pa("M50 26Q56 40 50 56Q44 40 50 26Z",c[1],' opacity=".3"');
    if(e==="braise")return Pa("M50 15C58 29 73 39 70 58A20 20 0 0 1 30 58C27 39 42 29 50 15Z",c[0])+Pa("M50 36C54 44 61 50 60 60A10 10 0 0 1 40 60C39 50 46 44 50 36Z",c[2],' opacity=".75"');
    if(e==="caillou")return Pa("M29 46C28 28 43 18 56 20C70 22 75 36 73 50C71 68 60 81 45 79C31 77 30 62 29 46Z",c[0])+Pa("M38 32Q46 26 54 28",c[2],' opacity=".45"');
    return Pa("M31 62A13 13 0 0 1 35 38A16 16 0 0 1 63 33A14 14 0 0 1 72 58A11 11 0 0 1 68 76H34A12 12 0 0 1 31 62Z",c[0])+Pa("M36 46A11 11 0 0 1 56 40",c[2],' opacity=".6"')}
  // Détails qui apparaissent avec l'âge (jeune, adulte).
  function deco(e,st,c){if(st<2)return "";
    if(e==="goutte")return (st>=2?El(27,56,6,10,c[1],' transform="rotate(-20 27 56)"')+El(73,56,6,10,c[1],' transform="rotate(20 73 56)"'):"")+(st>=3?Ci(38,14,3.2,c[2])+Ci(46,8,2.2,c[2])+Ci(31,21,1.8,c[2]):"");
    if(e==="pousse")return Ln("M50 26V14",c[1],2.4)+Pa("M50 20Q40 10 34 16Q40 24 50 20Z",c[0])+Pa("M50 17Q60 7 66 13Q60 21 50 17Z",c[0])+(st>=3?[0,72,144,216,288].map(a=>El(50,6,4.6,3.2,"#FFD6E8",` transform="rotate(${a} 50 11)"`)).join("")+Ci(50,11,3,"#F3D27A"):"");
    if(e==="braise")return (st>=2?Pa("M30 60Q18 56 20 46Q28 50 30 60Z",c[0])+Pa("M70 60Q82 56 80 46Q72 50 70 60Z",c[0]):"")+(st>=3?Pa("M26 30L28 35L33 37L28 39L26 44L24 39L19 37L24 35Z",c[2])+Pa("M74 22L75.5 26L79 27.5L75.5 29L74 33L72.5 29L69 27.5L72.5 26Z",c[2])+Ci(62,12,1.8,c[2]):"");
    if(e==="caillou")return (st>=2?Pa("M40 22Q48 12 58 20Q52 26 44 26Z","#7CCB6C")+Ci(60,18,2.2,"#9FE08F"):"")+(st>=3?Pa("M60 22L66 8L72 24Z","#CFE8FF")+Pa("M63 22L66 12L69 22Z","#FFFFFF",' opacity=".7"')+Pa("M34 28L37 18L41 28Z","#CFE8FF"):"");
    return (st>=2?Pa("M40 80Q40 88 44 90Q48 88 48 80Z","#9FD8FF")+Pa("M58 80Q58 88 62 90Q66 88 66 80Z","#9FD8FF"):"")+(st>=3?Ln("M24 30A26 26 0 0 1 76 30","#FF8C8C",3)+Ln("M28 30A22 22 0 0 1 72 30","#FFD66B",3)+Ln("M32 30A18 18 0 0 1 68 30","#8CE0A4",3)+Ln("M36 30A14 14 0 0 1 64 30","#8CC8FF",3):"")}
  // Œuf : coquille aux couleurs de l'espèce, taches, petite fissure quand il est sur le point d'éclore.
  function oeuf(e,c,pres){return El(50,53,22,28,c[2])+El(50,53,22,28,c[0],' opacity=".35"')+[[42,40,4],[57,46,3.2],[47,62,3.6],[60,66,2.6],[38,56,2.4]].map(([x,y,r])=>Ci(x,y,r,c[1],' opacity=".55"')).join("")
    +(pres?Ln("M40 30L45 36L41 41L47 47","#1D1D1B",1.6):"")}
  // Visage selon l'humeur : normal, content, dort, surpris.
  function visage(st,h,c){const big=st===1,r=big?4.6:3.8,y=46;const oeil=(x)=>Ci(x,y,r,"#1D1D1B")+Ci(x+1.3,y-1.4,1.3,"#FFFFFF");
    const joues=Ci(37,53,3.4,"#FF8C8C",' opacity=".45"')+Ci(63,53,3.4,"#FF8C8C",' opacity=".45"');
    if(h==="dort")return Ln(`M37 ${y}Q42 ${y+3} 47 ${y}`,"#1D1D1B",2)+Ln(`M53 ${y}Q58 ${y+3} 63 ${y}`,"#1D1D1B",2)+Ln("M46 59Q50 61 54 59","#1D1D1B",1.8);
    if(h==="content")return Ln(`M37 ${y+1}Q42 ${y-5} 47 ${y+1}`,"#1D1D1B",2.4)+Ln(`M53 ${y+1}Q58 ${y-5} 63 ${y+1}`,"#1D1D1B",2.4)+Pa("M42 57Q50 67 58 57Z","#1D1D1B")+joues
      +Pa("M22 28L24 33L29 35L24 37L22 42L20 37L15 35L20 33Z","#F3D27A")+Pa("M78 36L79.5 40L83 41.5L79.5 43L78 47L76.5 43L73 41.5L76.5 40Z","#F3D27A");
    if(h==="surpris")return Ci(42,y,r+1.4,"#FFFFFF")+Ci(58,y,r+1.4,"#FFFFFF")+Ci(42,y,2.4,"#1D1D1B")+Ci(58,y,2.4,"#1D1D1B")+El(50,60,3.2,4.2,"#1D1D1B")+Ln(`M36 ${y-9}Q42 ${y-12} 48 ${y-9}`,"#1D1D1B",1.6)+Ln(`M52 ${y-9}Q58 ${y-12} 64 ${y-9}`,"#1D1D1B",1.6);
    return oeil(42)+oeil(58)+Ln("M45 58Q50 62 55 58","#1D1D1B",2)}
  // Accessoire (dessins de boutique2.js, boîte 100 x 100) posé sur la tête, à l'échelle du stade.
  function accSVG(id){const B2=window.P2B;if(!id||!B2||!B2.SVGA||!has(B2.SVGA,id)||typeof B2.a4!=="function")return "";const it=(B2.catalogue4&&B2.catalogue4.acc||[]).find(x=>x.id===id);
    return it&&B2.a4(it)?B2.SVGA[id]:""}
  function dessin(e,st,h,acc,cls){const s=SP[espOk(e)||"goutte"],c=s.c,k=ECH[st]||1,tr=k===1?"":`transform="translate(50 ${54}) scale(${k}) translate(-50 -54)"`;
    const inner=st===0?oeuf(e,c,false):corps(e,c)+deco(e,st,c)+visage(st,h,c);
    const zzz=h==="dort"?`<text x="74" y="30" font-size="12" font-weight="800" fill="${c[2]}" font-family="Figtree,sans-serif" class="p3cpz">z</text><text x="83" y="19" font-size="9" font-weight="800" fill="${c[2]}" font-family="Figtree,sans-serif" class="p3cpz p3cpz2">z</text>`:"";
    return `<svg class="p3cpv ${cls||""}" viewBox="0 0 100 100" role="img" aria-label="${esc(s.nom)}, ${STADES[st].toLowerCase()}${h==="dort"?", endormi":""}" data-h="${h}"><circle cx="50" cy="52" r="46" fill="${s.fond}"/><g ${tr}>${inner}${accSVG(acc)}</g>${zzz}</svg>`}
  CP.dessin=(e,st,h,acc)=>dessin(espOk(e)||"goutte",N(st,0,3),["normal","content","dort","surpris"].includes(h)?h:"normal",acc);

  /* ---------------- Mon compagnon (état du compte) ---------------- */
  // Lu à chaque usage : espèce et date d'adoption obligatoires, nom et accessoire revérifiés (une valeur étrangère est vidée).
  function cp(){const o=P26ui.etat("cp",null);if(!(o&&typeof o==="object"&&!Array.isArray(o)&&espOk(o.e)&&ISO.test(o.d||"")))return null;
    if(typeof o.nom!=="string"||!NOM.test(o.nom))o.nom="";if(typeof o.acc!=="string"||!ACC_ID.test(o.acc))o.acc="";return o}
  const propre=o=>o&&typeof o==="object"&&espOk(o.e)&&ISO.test(o.d||"")?{e:o.e,d:o.d,t:N(o.t,0,9e15),nom:NOM.test(String(o.nom||""))?String(o.nom):"",acc:typeof o.acc==="string"&&ACC_ID.test(o.acc)?o.acc:"",vu:N(o.vu,0,3)}:null;
  P26ui.fusion("cp",(l,d)=>{const a=propre(l),b=propre(d);if(!a)return b||undefined;if(!b)return a;return b.t>a.t?b:a});
  // Date du jour recalculée à chaque appel (TODAY_ISO de l'application est figé au chargement : la page peut rester ouverte après minuit).
  const auj=()=>{try{return isoOf(new Date())}catch(e){return TODAY_ISO}};
  function soirs(o){o=o||cp();if(!o)return 0;let n=0;for(const [k,v] of Object.entries(P.j||{}))if(ISO.test(k)&&k>=o.d&&k<=auj()&&+v>0)n++;return n}
  function stade(o){const n=soirs(o);let s=0;for(const t of SEUILS)if(n>=t)s++;return s}
  function dernierSoir(){let d="";for(const [k,v] of Object.entries(P.j||{}))if(ISO.test(k)&&k<=auj()&&+v>0&&k>d)d=k;return d}
  const joursDepuis=iso=>iso?Math.round((new Date(auj()+"T12:00:00")-new Date(iso+"T12:00:00"))/864e5):-1;
  function dort(o){o=o||cp();if(!o)return false;const d=dernierSoir();if(!d||d<o.d)return joursDepuis(o.d)>=DODO_JOURS;return joursDepuis(d)>=DODO_JOURS}
  CP.soirs=()=>soirs();CP.stade=()=>stade();CP.dort=()=>dort();CP.mon=()=>{const o=cp();return o?Object.assign({},o,{s:stade(o),n:soirs(o),dort:dort(o)}):null};
  const nomDe=o=>o.nom||SP[o.e].nom;
  function adopter(e,nom){e=espOk(e);if(!e)return false;P26ui.etat("cp",null);P.p1.cp={e,d:auj(),t:Date.now(),nom:NOM.test(String(nom||""))?String(nom):"",acc:"",vu:0};saveP();try{lgPush()}catch(e2){}return true}
  CP.adopter=adopter;
  function nommer(nom){const o=cp();if(!o)return;o.nom=NOM.test(String(nom||""))?String(nom):"";o.t=Date.now();saveP()}
  function habiller(acc){const o=cp();if(!o)return;o.acc=accSVG(acc)?acc:"";o.t=Date.now();saveP()}
  // Publié dans ma ligne de classement : « espece-stade », revérifié chez les autres.
  P26ui.ligne(()=>{const o=cp();return {cpg:o?o.e+"-"+stade(o):""}});
  const CPG=/^([a-z]{3,10})-([0-3])$/;
  function cpgDe(v){const m=CPG.exec(String(v||""));if(!m||!espOk(m[1]))return null;return {e:m[1],s:+m[2]}}
  CP.cpgDe=cpgDe;

  /* ---------------- Humeur passagère et réactions ---------------- */
  let HUM={h:"",fin:0,t:null};
  function humeur(h,ms){clearTimeout(HUM.t);HUM={h,fin:Date.now()+ms,t:setTimeout(()=>{HUM={h:"",fin:0,t:null};peindre()},ms)};peindre()}
  const humeurNow=()=>HUM.h&&Date.now()<HUM.fin?HUM.h:dort()?"dort":"normal";
  let SUITE=0,DORMAIT=null,STV=null;
  function eclosion(){const o=cp();if(!o)return;const s=stade(o);if(s<=N(o.vu,0,3))return;o.vu=s;saveP();try{lgPush()}catch(e){}
    const t=s===1?`${esc(nomDe(o))} est né !`:s===2?`${esc(nomDe(o))} grandit : stade Jeune`:`${esc(nomDe(o))} est adulte !`;
    toast(`<span class="tm">${s===1?"🐣":"★"}</span><div><b>${t}</b><span>${s===1?"Ton œuf a éclos après "+SEUILS[0]+" soirs de révision.":"Continue de réviser pour le garder en forme."}</span></div>`);humeur("content",5000)}
  P26ui.on("reponse",d=>{if(!d||typeof d!=="object")return;const o=cp();if(!o)return;
    if(DORMAIT===true){DORMAIT=false;humeur("surpris",2200);setTimeout(()=>{if(cp())humeur("content",3000)},2300)}
    if(d.ok===true){SUITE++;if(SUITE===3||SUITE===5||SUITE===10||(SUITE>10&&SUITE%10===0))humeur("content",3000)}else if(d.ok===false)SUITE=0;
    eclosion();if(STV!==stade(o)){STV=stade(o);peindre()}});
  P26ui.on("trophee",()=>{if(cp())humeur("content",4000)});
  P26ui.on("victoire",()=>{if(cp())humeur("content",4000)});
  P26ui.on("xp",()=>{document.querySelectorAll(".p3cpv").forEach(s=>{if(reduce||!s.animate)return;s.animate([{transform:"translateY(0)"},{transform:"translateY(-6px)"},{transform:"translateY(0)"}],{duration:420,easing:"cubic-bezier(.23,1,.32,1)"})})});

  /* ---------------- Rendu : carte d'accueil, vue, profil d'un ami ---------------- */
  function texteStade(o){const s=stade(o),n=soirs(o);if(s>=3)return `Adulte · ${n} soir${n>1?"s":""} de révision`;
    const reste=SEUILS[s]-n;return `${STADES[s]} · encore ${reste} soir${reste>1?"s":""} pour ${s===0?"éclore":"grandir"}`}
  function carteHTML(o){const h=humeurNow(),s=stade(o);
    return `<button type="button" class="p3cpc" data-p3cpgo aria-label="${esc(nomDe(o))}, ${STADES[s].toLowerCase()}${h==="dort"?", endormi":""}. ${esc(texteStade(o))}. Ouvrir">${dessin(o.e,s,h,o.acc)}<span><b>${esc(nomDe(o))}</b><small>${esc(texteStade(o))}</small>${h==="dort"?`<em>Endormi : réponds à une carte pour le réveiller.</em>`:h==="content"?`<em>Tout content !</em>`:""}</span></button>`}
  function peindre(){document.querySelectorAll('[data-p1="compagnon"]').forEach(d=>{const o=cp();if(!o)return;if(d.classList.contains("p3cpa")){d.innerHTML=carteHTML(o);d.querySelector("[data-p3cpgo]").onclick=()=>P26ui.ouvrir("compagnon")}});
    try{if(typeof view!=="undefined"&&view==="mod"&&P26ui._vueCourante()==="compagnon")P26ui._rendre()}catch(e){}}
  P26ui.on("slot:accueil",el=>{const o=cp(),d=P26ui.bloc(el,"compagnon");d.className="p3cpa";
    if(!o){d.innerHTML=`<button type="button" class="p3cpc p3cpnew" data-p3cpgo aria-label="Adopter un compagnon qui grandit avec tes soirs de révision">${dessin("goutte",0,"normal","")}<span><b>Adopte un compagnon</b><small>Il grandit avec tes soirs de révision. Gratuit.</small></span></button>`}
    else d.innerHTML=carteHTML(o);
    d.querySelector("[data-p3cpgo]").onclick=()=>P26ui.ouvrir("compagnon")},15);

  const V={choix:"",arme:0};
  function grilleHTML(cour){return `<div class="p3cpg" role="group" aria-label="Choisir une espèce">${ESP.map(e=>`<button type="button" class="p3cpt${V.choix===e?" on":""}" data-p3esp="${e}" aria-pressed="${V.choix===e}" aria-label="${esc(SP[e].nom)}, ${esc(SP[e].lab)}${cour===e?", ton espèce actuelle":""}">${dessin(e,3,"normal","","p3cpmini")}<b>${esc(SP[e].nom)}</b><small>${esc(SP[e].lab)}</small></button>`).join("")}</div>`}
  function vueHTML(){const o=cp();
    if(!o)return `<h1 class="adh">Mon compagnon</h1><p class="p1note">Une petite créature qui grandit avec tes soirs de révision : œuf, bébé, jeune, adulte. Elle s’endort si tu ne révises pas pendant ${DODO_JOURS} jours et se réveille à ta prochaine réponse. L’adoption est gratuite.</p>
      ${grilleHTML("")}<label class="lab" for="p3cpNom">Son nom (facultatif)</label><input id="p3cpNom" class="inp" maxlength="14" autocomplete="off" placeholder="${esc(V.choix?SP[V.choix].nom:"Plouf")}">
      <div class="exrow"><button class="btn light" type="button" data-p3adopt ${V.choix?"":"disabled"}>Adopter</button></div>`;
    const s=stade(o),n=soirs(o),h=humeurNow(),B2=window.P2B;
    const accs=B2&&B2.catalogue4&&Array.isArray(B2.catalogue4.acc)?B2.catalogue4.acc.filter(x=>B2.a4(x)):[];
    const bar=s>=3?1:Math.min(1,(n-(s?SEUILS[s-1]:0))/(SEUILS[s]-(s?SEUILS[s-1]:0)));
    return `<h1 class="adh">Mon compagnon</h1>
      <div class="p3cph" data-h="${h}">${dessin(o.e,s,h,o.acc,"p3cpbig")}<div><b class="p3cpn"></b><span>${esc(SP[o.e].nom)} · ${esc(STADES[s])}</span>
        <span class="bar" style="--p:${bar.toFixed(3)}"><i></i></span><small>${esc(texteStade(o))}</small>
        ${h==="dort"?`<em>Endormi depuis ${DODO_JOURS} jours sans révision. Une carte et il se réveille.</em>`:""}</div></div>
      <div class="p3cpst" role="list" aria-label="Les stades">${STADES.map((t,i)=>`<div role="listitem" class="${i<=s?"ok":""}">${dessin(o.e,i,"normal","","p3cpmini")}<b>${esc(t)}</b><small>${i?SEUILS[i-1]+" soirs":"adopté"}</small></div>`).join("")}</div>
      <h2 class="p3cph2">Son nom</h2><div class="p3cprow"><input id="p3cpNom" class="inp" maxlength="14" autocomplete="off" value="${esc(o.nom)}" placeholder="${esc(SP[o.e].nom)}" aria-label="Nom du compagnon"><button class="s2mini" type="button" data-p3nom>OK</button></div>
      <h2 class="p3cph2">Accessoire</h2>${accs.length?`<div class="pick sm" role="group" aria-label="Accessoire du compagnon"><button type="button" class="${o.acc?"":"on"}" data-p3acc="" aria-pressed="${!o.acc}">Aucun</button>${accs.map(x=>`<button type="button" class="${o.acc===x.id?"on":""}" data-p3acc="${x.id}" aria-pressed="${o.acc===x.id}">${esc(x.nom)}</button>`).join("")}</div>`
        :`<p class="p1note">Les accessoires achetés en boutique (onglet Accessoires) se posent aussi sur ton compagnon. Tu n’en as pas encore.</p>`}
      <h2 class="p3cph2">Changer d’espèce</h2><p class="p1note">Changer d’espèce remet ton compagnon au stade œuf : les soirs repartent de zéro.</p>
      ${grilleHTML(o.e)}<div class="exrow"><button class="btn ghost${V.arme&&Date.now()-V.arme<8000?" buy":""}" type="button" data-p3change ${V.choix&&V.choix!==o.e?"":"disabled"}>${V.arme&&Date.now()-V.arme<8000?"Confirmer : repartir de l’œuf":"Changer d’espèce"}</button></div>`}
  P26ui.vue("compagnon",{titre:"Mon compagnon",rendre(box){
    box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="p3cpBack">Retour</button></div><div class="p3cp">${vueHTML()}</div>`;
    box.querySelector("#p3cpBack").onclick=()=>P26ui.retour();const o=cp();
    const nm=box.querySelector(".p3cpn");if(nm&&o)nm.textContent=nomDe(o);
    box.querySelectorAll("[data-p3esp]").forEach(b=>b.onclick=()=>{V.choix=espOk(b.dataset.p3esp);V.arme=0;buzz(8);P26ui._rendre()});
    const ad=box.querySelector("[data-p3adopt]");if(ad)ad.onclick=()=>{const nom=(box.querySelector("#p3cpNom")||{}).value||"";if(!adopter(V.choix,nom.trim()))return;buzz(18);
      toast(`<span class="tm">🥚</span><div><b>${esc(nomDe(cp()))} est adopté</b><span>Révise ${SEUILS[0]} soirs et l’œuf éclot.</span></div>`);V.choix="";P26ui._rendre();try{if(typeof render==="function"&&view==="table")render()}catch(e){}};
    const bn=box.querySelector("[data-p3nom]");if(bn)bn.onclick=()=>{const v=(box.querySelector("#p3cpNom")||{}).value||"";nommer(v.trim());buzz(8);P26ui._rendre()};
    box.querySelectorAll("[data-p3acc]").forEach(b=>b.onclick=()=>{habiller(b.dataset.p3acc);buzz(8);P26ui._rendre()});
    const ch=box.querySelector("[data-p3change]");if(ch)ch.onclick=()=>{if(!o||!V.choix||V.choix===o.e)return;
      if(!(V.arme&&Date.now()-V.arme<8000)){V.arme=Date.now();P26ui._rendre();return}
      const nom=o.nom;adopter(V.choix,nom);V.arme=0;V.choix="";buzz(18);toast(`<span class="tm">🥚</span><div><b>Nouvel œuf : ${esc(SP[cp().e].nom)}</b><span>Les soirs repartent de zéro.</span></div>`);P26ui._rendre()}}});

  // Profil d'un ami (vue « ami » de jeux2.js) : son compagnon, d'après le champ publié, revérifié.
  P26ui.on("ami.rendu",o=>{try{if(!o||!o.el||!o.r)return;const g=cpgDe(o.r.cpg);const h=o.el.querySelector(".j2amih");if(!h)return;
    const d=document.createElement("div");d.className="p3cpami";d.setAttribute("data-p1","compagnon");
    d.innerHTML=g?`${dessin(g.e,g.s,"normal","","p3cpmini")}<div><b>Son compagnon</b><span>${esc(SP[g.e].nom)} · ${esc(STADES[g.s].toLowerCase())}</span></div>`:`<div><b>Son compagnon</b><span>Pas encore adopté.</span></div>`;
    h.insertAdjacentElement("afterend",d)}catch(e){}});

  /* ---------------- Page restée ouverte : minuit passé, retour sur l'onglet ---------------- */
  // Toutes les minutes et au retour sur la page : si le jour, le sommeil ou le stade ont changé, on redessine ; un compagnon qui vient
  // de s'endormir sera « surpris » à la prochaine réponse, comme après un rechargement.
  let ETAT_V="";
  function verifier(){const o=cp();const v=o?auj()+":"+dort(o)+":"+stade(o):"";if(v===ETAT_V)return false;const avant=ETAT_V;ETAT_V=v;
    if(o&&dort(o))DORMAIT=true;if(avant)peindre();return true}
  CP._verifier=verifier;
  setInterval(verifier,60000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")verifier()});

  /* ---------------- Démarrage : attend la progression du compte (soirs révisés ailleurs), puis sommeil et éclosion ---------------- */
  // Sommeil connu tout de suite d'après la copie locale, lue sans rien écrire dans P (une réponse donnée avant l'arrivée du compte le
  // réveille « surpris ») ; recalculé au démarrage.
  {let o0=null;try{const v=P.p1&&P.p1.cp;if(v&&typeof v==="object"&&espOk(v.e)&&ISO.test(v.d||""))o0=v}catch(e){}DORMAIT=o0?dort(o0):null}
  (function demarrer(k){if(typeof remoteOK!=="undefined"&&!remoteOK&&connecte()&&k<6){setTimeout(()=>demarrer(k+1),2000);return}
    const o=cp();DORMAIT=o?dort(o):null;STV=o?stade(o):null;try{eclosion()}catch(e){}verifier();peindre()})(0);
})();
P26mod.ok("compagnon");

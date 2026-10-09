/* ================= Lot P2 : boutique (raretés, album, boutique du jour, accessoires, style, joker 50/50, cadeaux) =================
   Module préchargé (P26ui.precharger), chargé après boutique.js et skins.js qu'il complète sans les modifier.
   Prix fixes en pièces (1 XP gagné = 1 pièce). Aucun coffre, aucune roue, aucun tirage, aucun argent réel.
   La boutique du jour se déduit de la date seule : la même sélection pour tout le monde ce jour-là.
   Achats dans P.own / P.buy comme le reste de la boutique ; choix dans P.sk.acc, P.sk.pc, P.sk.son ; jokers comme le gel de série.
   Ce que les autres revendiquent (accessoire « acc », couleur du pseudo « pc ») est revérifié à l'affichage par liste blanche,
   et l'arc-en-ciel par la division Diamant (Elo de la base). Un identifiant inconnu n'est jamais affiché ni injecté. */
(function(){
  "use strict";
  const B2=window.P2B=window.P2B||{};
  const has=(o,k)=>!!o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
  const RAR=["c","r","e","l"],RNOM={c:"Commun",r:"Rare",e:"Épique",l:"Légendaire"};
  B2.RAR=RAR;B2.RNOM=RNOM;
  const connecte=()=>typeof UID==="string"&&!!UID&&!(typeof GUEST!=="undefined"&&GUEST);

  /* ---------------- Catalogue du module (prix fixes) ---------------- */
  const ACC=[
    {id:"casquette",nom:"Casquette",r:"c",xp:250,z:"tete"},
    {id:"noeud",nom:"Nœud papillon",r:"c",xp:200,z:"cou"},
    {id:"lunettes",nom:"Lunettes de soleil",r:"c",xp:300,z:"yeux"},
    {id:"ecouteurs",nom:"Écouteurs",r:"r",xp:600,z:"oreilles"},
    {id:"couronne",nom:"Couronne",r:"e",xp:1200,z:"tete"},
    {id:"aureole",nom:"Auréole",r:"l",xp:2000,z:"dessus"}];
  const PC=[
    {id:"or",nom:"Or",r:"c",xp:200},{id:"menthe",nom:"Menthe",r:"c",xp:200},
    {id:"ciel",nom:"Ciel",r:"r",xp:350},{id:"corail",nom:"Corail",r:"r",xp:350},
    {id:"lilas",nom:"Lilas",r:"r",xp:350,nof:1},
    {id:"arc",nom:"Arc-en-ciel",r:"l",div:3}];
  const EMO=[
    {id:"revision",nom:"Révision",r:"c",xp:150,e:[["📚","livres"],["🧠","cerveau"],["✏️","crayon"],["💡","bonne idée"]]},
    {id:"fete",nom:"Fête",r:"r",xp:300,nof:1,e:[["🎉","fête"],["🥳","trop content"],["🎊","confettis"],["👏","bravo"]]},
    {id:"feu",nom:"En feu",r:"r",xp:300,e:[["🔥","en feu"],["⚡","éclair"],["💥","boum"],["🚀","fusée"]]},
    {id:"animaux",nom:"Animaux",r:"e",xp:600,e:[["🦉","chouette"],["🐢","tortue"],["🦊","renard"],["🐝","abeille"]]},
    {id:"tapis",nom:"Tapis vert",r:"l",xp:1000,e:[["🃏","carte"],["♠️","pique"],["♥️","cœur"],["👑","couronne"]]}];
  const SONS=[
    {id:"cloche",nom:"Clochette",r:"c",xp:150},{id:"arpege",nom:"Arpège",r:"r",xp:300},{id:"piece",nom:"Pièce d’or",r:"r",xp:350},
    {id:"harpe",nom:"Harpe",r:"e",xp:700},{id:"fanfare",nom:"Fanfare",r:"l",xp:1200}];
  const L4={acc:ACC,pc:PC,emo:EMO,son:SONS};
  const P4={};Object.entries(L4).forEach(([k,L])=>{P4[k]={};L.forEach(it=>{it.k=k;it._k=k+":"+it.id;P4[k][it.id]=it})});
  const trouve4=(k,id)=>typeof id==="string"&&has(P4[k],id)?P4[k][id]:null;
  // nof : achetable mais pas offrable (absent de la liste blanche de cadeau_offrir, sql/10-boutique.sql : la base refuserait le cadeau).
  const EMOK={};EMO.forEach(p=>p.e.forEach(([e,n],i)=>{EMOK[p.id+"-"+i]={e,n,p:p.id}}));
  B2.catalogue4=L4;B2.EMOK=EMOK;

  /* ---------------- Possession et choix (mes données) ---------------- */
  const maDiv=()=>{try{return connecte()&&typeof ELO!=="undefined"&&ELO.ok?eloDiv(myElo()):0}catch(e){return 0}};
  function a4(it){if(!it)return false;if(it.div!=null)return maDiv()>=it.div;return !!(P.own&&P.own[it._k])}
  const choix=k=>{const it=trouve4(k,P.sk&&P.sk[k]);return it&&a4(it)?it.id:""};
  const monAcc=()=>choix("acc"),monPc=()=>choix("pc"),monSon=()=>choix("son");
  B2.monAcc=monAcc;B2.monPc=monPc;B2.monSon=monSon;B2.a4=a4;
  P26ui.ligne(()=>({acc:monAcc(),pc:monPc()}));

  /* ---------------- Ce que les autres revendiquent : revérifié ---------------- */
  const ligneDe=id=>(typeof LG!=="undefined"&&Array.isArray(LG.rows)?LG.rows:[]).find(x=>x&&x.id===id)||{};
  const estMoi=r=>!!r&&(r.me===true||(typeof UID==="string"&&!!UID&&r.id===UID));
  function champ(r,k){const v=has(r,k)?r[k]:ligneDe(r&&r.id)[k];return typeof v==="string"?v:""}
  function accDe(r){if(!r)return "";if(estMoi(r))return monAcc();const v=champ(r,"acc");return trouve4("acc",v)?v:""}
  function pcDe(r){if(!r)return "";if(estMoi(r))return monPc();const v=champ(r,"pc"),it=trouve4("pc",v);if(!it)return "";
    if(it.div!=null){let e=1000;try{e=eloOf(r.id)}catch(x){}return eloDiv(e)>=it.div?v:""}return v}
  B2.accDe=accDe;B2.pcDe=pcDe;

  /* ---------------- Accessoires : calques SVG (boîte 100 x 100 du Personnage) ---------------- */
  const SVGA={
    casquette:'<g data-acc="casquette"><path d="M29 33Q29 11 50 11Q71 11 71 33Z" fill="#C1272D"/><path d="M50 11.5V32M39.5 13.5Q37.5 22 37.5 32M60.5 13.5Q62.5 22 62.5 32" stroke="#000" stroke-opacity=".18" stroke-width="1.2" fill="none"/><path d="M33 26Q50 21 67 26" stroke="#FAFAF7" stroke-opacity=".35" stroke-width="1.4" fill="none"/><circle cx="50" cy="11.6" r="2.2" fill="#8E1B22"/><path d="M25 34Q50 27.5 75 34Q74 39.5 50 39.5Q26 39.5 25 34Z" fill="#8E1B22"/><path d="M28 34Q50 29.5 72 34" stroke="#FFFFFF" stroke-opacity=".22" stroke-width="1" fill="none"/></g>',
    noeud:'<g data-acc="noeud"><path d="M50 75L40.5 69.5Q38.8 75 40.5 80.5Z" fill="#C1272D"/><path d="M50 75L59.5 69.5Q61.2 75 59.5 80.5Z" fill="#C1272D"/><path d="M50 75L40.5 80.5Q39.6 77.6 39.7 75Z" fill="#000" opacity=".16"/><path d="M50 75L59.5 80.5Q60.4 77.6 60.3 75Z" fill="#000" opacity=".16"/><rect x="47.2" y="72.2" width="5.6" height="5.6" rx="1.8" fill="#8E1B22"/></g>',
    lunettes:'<g data-acc="lunettes"><path d="M34.2 44.6L29.6 43.4M65.8 44.6L70.4 43.4" stroke="#14141A" stroke-width="1.6" stroke-linecap="round"/><rect x="34" y="40.8" width="14.6" height="10.4" rx="4.6" fill="#1B2533"/><rect x="51.4" y="40.8" width="14.6" height="10.4" rx="4.6" fill="#1B2533"/><rect x="34" y="40.8" width="14.6" height="10.4" rx="4.6" fill="none" stroke="#14141A" stroke-width="1.2"/><rect x="51.4" y="40.8" width="14.6" height="10.4" rx="4.6" fill="none" stroke="#14141A" stroke-width="1.2"/><path d="M48.6 44.4Q50 42.8 51.4 44.4" stroke="#14141A" stroke-width="1.8" fill="none"/><path d="M36.6 43.6L40.4 43.6M54 43.6L57.8 43.6" stroke="#9FE8FF" stroke-opacity=".7" stroke-width="1.3" stroke-linecap="round"/></g>',
    ecouteurs:'<g data-acc="ecouteurs"><path d="M27.6 44Q26.4 13.6 50 13.6Q73.6 13.6 72.4 44" stroke="#2B2F3A" stroke-width="3.8" fill="none" stroke-linecap="round"/><path d="M30 28Q34.5 17.6 50 17.1" stroke="#FFFFFF" stroke-opacity=".25" stroke-width="1" fill="none" stroke-linecap="round"/><rect x="22.4" y="38.6" width="10.4" height="16.4" rx="5.2" fill="#FF6B6B"/><rect x="67.2" y="38.6" width="10.4" height="16.4" rx="5.2" fill="#FF6B6B"/><rect x="25" y="41.4" width="5.2" height="10.8" rx="2.6" fill="#000" opacity=".18"/><rect x="69.8" y="41.4" width="5.2" height="10.8" rx="2.6" fill="#000" opacity=".18"/></g>',
    couronne:'<g data-acc="couronne"><path d="M33 29.5L31.6 14.8L40.4 21.6L45 9.6L50 19L55 9.6L59.6 21.6L68.4 14.8L67 29.5Z" fill="#F3D27A" stroke="#B8902F" stroke-width="1.2" stroke-linejoin="round"/><rect x="32.4" y="25" width="35.2" height="5.2" rx="1.6" fill="#E7C66B" stroke="#B8902F" stroke-width="1"/><circle cx="50" cy="27.6" r="1.9" fill="#C1272D"/><circle cx="41" cy="27.6" r="1.4" fill="#1F3F8F"/><circle cx="59" cy="27.6" r="1.4" fill="#1F3F8F"/><circle cx="45" cy="9.6" r="1.6" fill="#FAFAF7"/><circle cx="55" cy="9.6" r="1.6" fill="#FAFAF7"/><circle cx="31.6" cy="14.8" r="1.4" fill="#FAFAF7"/><circle cx="68.4" cy="14.8" r="1.4" fill="#FAFAF7"/></g>',
    aureole:'<g data-acc="aureole"><ellipse cx="50" cy="8.2" rx="16" ry="4.2" fill="none" stroke="#FFF3B0" stroke-width="5.2" opacity=".35"/><ellipse cx="50" cy="8.2" rx="16" ry="4.2" fill="none" stroke="#F3D27A" stroke-width="2.6"/><path d="M38 6.2Q50 3 62 6.2" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="1" fill="none"/></g>'};
  const S2=()=>window.P2S||null;
  const skinPar=id=>{const s=S2();return s&&Array.isArray(s.catalogue)&&typeof id==="string"?s.catalogue.find(x=>x.id===id)||null:null};
  function skinDe(r){const s=S2();if(!s)return null;if(estMoi(r))return typeof s.monSkin==="function"?s.monSkin():null;return skinPar(champ(r,"skn"))}
  // Personnage (18 réglages) + skin éventuel + accessoire. Un couvre-chef (casquette, couronne) remplace celui du skin et du Personnage,
  // sauf hijab et turban qu'on garde ; les lunettes remplacent celles du Personnage.
  function compose(a,accId,s){const A=trouve4("acc",accId);const a2=a.slice();const garde=a2[13]===1||a2[13]===2;
    if(A){if(A.z==="tete"&&!garde)a2[13]=0;if(A.z==="yeux")a2[10]=0}
    let inner;const sk=S2();
    if(s&&sk&&typeof sk.habille==="function"){const s2=A&&(A.z==="tete"||(A.z==="yeux"&&s.h==="lunettes"))?Object.assign({},s,{h:""}):s;inner=sk.habille(a2,s2)}
    else inner=persoSVG(a2);
    if(A&&typeof inner==="string"&&/<\/svg>$/.test(inner))inner=inner.replace(/<\/svg>$/,()=>SVGA[A.id]+"</svg>");
    return inner}
  B2.compose=compose;
  function poser(){if(B2.avOrig||typeof avParts!=="function")return;B2.avOrig=window.avParts;
    window.avParts=function(r){const o=B2.avOrig(r);try{const k=avKOk(r&&r.avk);if(!k||k.t!=="b")return o;const id=accDe(r);if(!id)return o;
        const s=skinDe(r),inner=compose(k.a,id,s);if(typeof inner!=="string"||!inner)return o;return {col:s?s.c[1]:o.col,inner}}
      catch(e){try{console.warn("[boutique2]",e)}catch(_){}return o}};
    try{paintMyAv()}catch(e){}try{if(typeof view!=="undefined"&&view==="ligue")renderLigue()}catch(e){}}

  /* ---------------- Raretés de tout le catalogue ---------------- */
  const rarPrix=xp=>{xp=+xp||0;return xp<=150?"c":xp<=500?"r":xp<=1200?"e":"l"};
  const rarDiv=d=>["c","r","e","l"][Math.max(0,Math.min(3,d|0))];
  const rarNiv=n=>n>=50?"l":n>=25?"e":"r";
  const CAT=[["dos","Dos de cartes","dos"],["fond","Fonds","w"],["bouton","Boutons","b"],["theme","Thèmes","ch"],["cadre","Cadres","cadres"],["titre","Titres","titres"],
    ["effet","Effets de victoire","victoire"],["skin","Skins","skins"],["acc","Accessoires","b2acc"],["pc","Couleurs de pseudo","b2style"],["emo","Émojis d’Arène","b2style"],["son","Sons de bonne réponse","b2style"]];
  const CATNOM={};CAT.forEach(([k,n])=>CATNOM[k]=n);
  const GNOM=()=>{const o={};((S2()||{}).GRP||[]).forEach(([g,n])=>o[g]=n);return o};
  function niveauMoi(){try{const T4=window.P1T4;return T4&&typeof T4.niveau==="function"?T4.niveau(totalXP()):1}catch(e){return 1}}
  function gagneT4(it){if(it.div!=null)return maDiv()>=it.div;if(it.niv!=null)return niveauMoi()>=it.niv;if(it.tr)return !!(P.t&&P.t[it.tr]);return false}
  const gagnableT4=it=>it.div!=null||it.niv!=null||!!it.tr;
  function rarT4(it){if(it.div!=null)return rarDiv(it.div);if(it.niv!=null)return rarNiv(it.niv);if(it.tr)return "e";return rarPrix(it.xp)}
  // Liste complète, dans un ordre fixe (même pour tout le monde) : {cat,_k,nom,r,xp (prix si achetable, sinon 0),cond,tab,a(),vis()}
  let CACHE=null,CLE="";
  const pretCat=()=>{const T4=window.P1T4,sk=S2();return !!(T4&&T4.catalogue&&Array.isArray(T4.catalogue.CAD)&&sk&&Array.isArray(sk.catalogue))};
  function catalogue(){const T4=window.P1T4||{},K=(T4.catalogue||{}),sk=S2();
    const cle=[(K.CAD||[]).length,(K.TIT||[]).length,(K.VIC||[]).length,sk&&sk.catalogue?sk.catalogue.length:0].join(",");
    if(CACHE&&cle===CLE)return CACHE;CLE=cle;const L=[];
    const prixOuCond=(x,cond)=>x.rw?{xp:0,cond:x.rw==="equipe"?"Objectif de ligue":"Podium de saison"}:{xp:+x.xp||0,cond};
    const base=(cat,tab,list,kind,vis)=>(list||[]).forEach(x=>{if(!x.id||!x.xp&&!x.rw)return;const pc=prixOuCond(x);
      L.push({cat,tab,_k:x._k||kind+":"+x.id,nom:x.nom,r:x.rw?(x.rw==="saison"?"l":"e"):rarPrix(x.xp),xp:pc.xp,cond:pc.cond,a:()=>{try{return owned(x)}catch(e){return false}},vis:()=>vis(x)})});
    if(typeof DOS!=="undefined")base("dos","dos",DOS,"dos",d=>`<i class="dosv" data-d="${d.id}"></i>`);
    if(sk&&Array.isArray(sk.catalogue))sk.catalogue.forEach(s=>L.push({cat:"dos",tab:"packs",_k:"dos:"+s.dos,nom:"Dos "+s.nom,r:s.r,xp:sk.RAR[s.r].dos,don:s.don?s.g:"",
      a:()=>!!(P.own&&P.own["dos:"+s.dos]),vis:()=>`<i class="dosv" data-d="${s.dos}"></i>`}));
    if(typeof WALLS!=="undefined")base("fond","w",WALLS,"w",w=>`<i class="wallv" data-w="${w.id}"></i>`);
    if(typeof BF!=="undefined")base("bouton","b",BF,"bf",f=>`<i class="bfv" style="border-radius:${f.r}">Jouer</i>`);
    if(typeof BC!=="undefined")base("bouton","b",BC,"bc",c=>`<i class="bcv" style="--c:${c.c}"></i>`);
    if(typeof BX!=="undefined")base("bouton","b",BX,"bx",x=>`<i class="bxv">${x.id==="etincelles"?"✦":x.id==="vib"?"≋":"◠"}</i>`);
    if(typeof CHR!=="undefined")CHR.forEach((c,i)=>L.push({cat:"theme",tab:"ch",_k:"ch:"+c,nom:"Thème "+DIVS[i],r:rarDiv(i),xp:0,cond:"Division "+DIVS[i],
      a:()=>typeof LG!=="undefined"&&!!LG.nick&&!LG.ro&&(LG.div||0)>=i,vis:()=>`<i class="chv" data-c="${c}">${esc(DIVS[i])}</i>`}));
    (K.CAD||[]).forEach(c=>{if(!c.id||c.g==="k"||/^es-/.test(c.id))return;const g=gagnableT4(c);
      L.push({cat:"cadre",tab:"cadres",_k:c._k,nom:"Cadre "+c.nom,r:rarT4(c),xp:g?0:+c.xp||0,cond:g?c.cond:"",a:()=>g?gagneT4(c):!!(P.own&&P.own[c._k]),vis:()=>avCadre(c.id)})});
    if(sk&&Array.isArray(sk.catalogue))sk.catalogue.forEach(s=>L.push({cat:"cadre",tab:"packs",_k:"cad:"+s.cad,nom:"Cadre "+s.nom,r:s.r,xp:sk.RAR[s.r].cad,don:s.don?s.g:"",
      a:()=>!!(P.own&&P.own["cad:"+s.cad]),vis:()=>avCadre(s.cad)}));
    (K.TIT||[]).forEach(t=>{if(!t.id)return;const g=gagnableT4(t)||t.sv!=null||t.vf!=null;
      L.push({cat:"titre",tab:"titres",_k:t._k,nom:"Titre "+t.nom,r:g?"e":rarPrix(t.xp),xp:g?0:+t.xp||0,cond:g?t.cond:"",a:()=>g?gagneT4(t):!!(P.own&&P.own[t._k]),vis:()=>`<i class="b2tv">${esc(t.nom)}</i>`})});
    (K.VIC||[]).forEach(v=>{if(!v.id)return;L.push({cat:"effet",tab:"victoire",_k:v._k,nom:"Effet "+v.nom,r:rarPrix(v.xp),xp:+v.xp||0,a:()=>!!(P.own&&P.own[v._k]),vis:()=>`<i class="p1vv" data-fx="${v.id}"></i>`})});
    if(sk&&Array.isArray(sk.catalogue))sk.catalogue.forEach(s=>L.push({cat:"skin",tab:"skins",_k:"skn:"+s.id,nom:"Skin "+s.nom,r:s.r,xp:sk.RAR[s.r].skn,don:s.don?s.g:"",
      a:()=>!!(P.own&&P.own["skn:"+s.id]),vis:()=>avSkin(s)}));
    ACC.forEach(x=>L.push({cat:"acc",tab:"b2acc",_k:x._k,nom:x.nom,r:x.r,xp:x.xp,a:()=>a4(x),vis:()=>avAcc(x.id)}));
    PC.forEach(x=>L.push({cat:"pc",tab:"b2style",_k:x._k,nom:"Pseudo "+x.nom,r:x.r,xp:x.xp||0,cond:x.div!=null?"Division Diamant":"",a:()=>a4(x),vis:()=>`<i class="b2pcv"><span class="b2pc" data-pc="${x.id}">Aa</span></i>`}));
    EMO.forEach(x=>L.push({cat:"emo",tab:"b2style",_k:x._k,nom:"Émojis "+x.nom,r:x.r,xp:x.xp||0,cond:"",a:()=>a4(x),vis:()=>`<i class="b2emov">${x.e.slice(0,3).map(e=>e[0]).join("")}</i>`}));
    SONS.forEach(x=>L.push({cat:"son",tab:"b2style",_k:x._k,nom:"Son "+x.nom,r:x.r,xp:x.xp,a:()=>a4(x),vis:()=>`<i class="b2sonv" aria-hidden="true">♪</i>`}));
    const vus=new Set();CACHE=L.filter(x=>x&&x._k&&!vus.has(x._k)&&(vus.add(x._k),true));return CACHE}
  B2.catalogue=()=>catalogue();
  B2.rarete=k=>{const it=catalogue().find(x=>x._k===k);return it?it.r:""};
  const pret=Promise.all(["boutique","skins"].map(n=>window.P26mod?P26mod(n).catch(()=>null):null));
  pret.then(()=>{CACHE=null;poser();maj()});

  /* ---------------- Petits visuels ---------------- */
  const monPerso=()=>{try{const k=avK();return k&&k.t==="b"?k.a:null}catch(e){return null}};
  const MANNEQUIN=()=>typeof AV_DEF!=="undefined"?AV_DEF.slice():[6,1,0,0,0,0,0,0,0,0,0,0,0,0,7,0,6,0];
  function avAcc(id,cls){const a=monPerso()||MANNEQUIN();const sk=S2(),s=sk&&typeof sk.monSkin==="function"?sk.monSkin():null;let inner="";try{inner=compose(a,id,s)}catch(e){}
    return `<span class="av b2av ${cls||""}" style="--av:${s?s.c[1]:"var(--gold)"}">${inner}</span>`}
  function avSkin(s){let inner="";try{inner=S2().habille(MANNEQUIN(),s)||""}catch(e){}return `<span class="av b2av" style="--av:${s.c[1]}">${inner}</span>`}
  function avCadre(id){let col="var(--gold)",inner="";try{const r=avParts({nick:myNick()||"Moi",av:avData(),avk:avK(),me:true});col=r.col;inner=r.inner}catch(e){}
    return `<span class="av b2av" style="--av:${col}" data-cadre="${/^[a-z0-9-]{1,24}$/.test(id)?id:""}">${inner}</span>`}
  const badge=r=>`<span class="b2r" data-r="${r}">${RNOM[r]}</span>`;

  /* ---------------- Raretés posées sur les rayons existants (sans les modifier) ---------------- */
  function itemDe(kind,id){const L=catalogue();if(kind==="ch")return L.find(x=>x._k==="ch:"+id)||null;const k={dos:"dos",w:"w",bf:"bf",bc:"bc",bx:"bx",cad:"cad",tit:"tit",vic:"vic"}[kind];
    if(!k)return null;const it=L.find(x=>x._k===k+":"+id);if(it)return it;
    if(k==="cad"&&/^s-/.test(id))return L.find(x=>x._k==="cad:"+id)||null;return null}
  function marquer(b,kind,id){const it=id?itemDe(kind,id):null;b.dataset.rar=it?it.r:"";if(it){const a=b.getAttribute("aria-label");b.setAttribute("aria-label",(a||it.nom)+", "+RNOM[it.r])}}
  function decorer(){const lg=document.getElementById("lg");if(lg){
      lg.querySelectorAll(".shop button[data-kind][data-id]:not([data-rar])").forEach(b=>marquer(b,b.dataset.kind,b.dataset.id));
      lg.querySelectorAll("button[data-p1b][data-id]:not([data-rar])").forEach(b=>marquer(b,b.dataset.p1b,b.dataset.id));
      lg.querySelectorAll(".lgl li[data-id] .n").forEach(n=>{const li=n.closest("li");teindre(n,pcDe(Object.assign({},ligneDe(li.dataset.id),{id:li.dataset.id,me:typeof UID==="string"&&li.dataset.id===UID})))})}
    const h=document.querySelector(".pfhead h1");if(h)teindre(h,monPc());
    document.querySelectorAll(".aml .ap[data-id]").forEach(el=>teindre(el,pcDe(Object.assign({},ligneDe(el.dataset.id),{id:el.dataset.id}))))}
  // Le pseudo (premier nœud texte) est entouré d'un <span class="b2pc" data-pc="…"> ; la valeur vient d'une liste blanche.
  function teindre(n,pc){if(!n)return;let sp=n.querySelector(":scope>.b2pc");
    if(!pc||!trouve4("pc",pc)){if(sp)sp.replaceWith(document.createTextNode(sp.textContent));return}
    if(!sp){const t=n.firstChild;if(!t||t.nodeType!==3||!t.textContent.trim())return;sp=document.createElement("span");sp.className="b2pc";n.insertBefore(sp,t);sp.appendChild(t)}
    if(sp.dataset.pc!==pc)sp.dataset.pc=pc}
  B2.decorer=decorer;
  let prevu=false;
  const MO=new MutationObserver(()=>{if(prevu)return;prevu=true;queueMicrotask(()=>{prevu=false;try{decorer()}catch(e){}})});
  if(document.body)MO.observe(document.body,{childList:true,subtree:true});

  /* ---------------- Achat en deux touchers (gardé 8 s, même si la page se redessine) ---------------- */
  const UI=B2.ui=B2.ui||{arme:null,alb:"",manq:false,vu:""};
  const arme_=k=>!!(UI.arme&&UI.arme.k===k&&Date.now()-UI.arme.t<8000);
  function secoue(b){buzz([8,60,8]);if(!reduce&&b&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260})}
  const manque=(b,pr)=>{secoue(b);toast(`<span class="tm">·</span><div><b>Pas assez de pièces</b><span>Il te manque ${fmtN(pr-coins())} pièces. 1 XP gagné = 1 pièce.</span></div>`)};
  // Rend true si l'achat est fait. Premier toucher : le bouton demande confirmation.
  function acheter(b,k,pr,nom,faire){if(coins()<pr){manque(b,pr);return false}
    if(!arme_(k)){UI.arme={k,t:Date.now()};document.querySelectorAll("[data-b2buy].buy").forEach(x=>{x.classList.remove("buy");if(x.dataset.lab)x.textContent=x.dataset.lab});
      b.dataset.lab=b.textContent;b.classList.add("buy");b.setAttribute("data-b2buy","");b.textContent="Acheter ? "+fmtN(pr);return false}
    UI.arme=null;faire();saveP();buzz(18);try{paintMyAv()}catch(e){}
    toast(`<span class="tm">✓</span><div><b>${esc(nom)} est à toi</b><span>−${fmtN(pr)} pièces · il t’en reste ${fmtN(coins())}</span></div>`);return true}
  const payer=(k,pr)=>()=>{P.own=P.own||{};P.buy=P.buy||{};P.own[k]=1;P.buy[k]=(+P.buy[k]||0)+pr};
  function choisir(k,id){P.sk=Object.assign({},P.sk||{});P.sk[k]=id;saveP();try{lgPush()}catch(e){}try{paintMyAv()}catch(e){}}
  function maj(){try{if(typeof view!=="undefined"&&view==="ligue")renderLigue()}catch(e){}}

  /* ---------------- Onglets ---------------- */
  P26ui.on("boutique.onglets",L=>L.push(["b2jour","Du jour"]),10);
  P26ui.on("boutique.onglets",L=>L.push(["b2acc","Accessoires"],["b2style","Style"],["b2album","Album"],["b2offrir","Offrir"]),70);
  P26ui.on("slot:boutique.rayon",el=>{const t=el.dataset.t;const f={b2jour:rayonJour,b2acc:rayonAcc,b2style:rayonStyle,b2album:rayonAlbum,b2offrir:rayonOffrir}[t];
    if(t==="objets"){const d=P26ui.bloc(el,"boutique2");d.innerHTML=jokerHTML();brancherJoker(d);return}
    if(!f)return;const d=P26ui.bloc(el,"boutique2");d.className="b2";d.innerHTML=f();brancher(d,t)},60);

  /* ---------------- Boutique du jour ---------------- */
  function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h>>>0}
  function suite(a){return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  const REMISE=.15;
  const prixJour=it=>Math.max(10,Math.round(it.xp*(1-REMISE)/10)*10);
  // Les 3 objets du jour : rares ou mieux, achetables, de 3 catégories différentes. Seule la date compte.
  function jour(iso){iso=/^\d{4}-\d{2}-\d{2}$/.test(iso||"")?iso:TODAY_ISO;if(!pretCat())return [];
    const pool=catalogue().filter(it=>it.xp>0&&it.r!=="c").slice().sort((a,b)=>a._k<b._k?-1:a._k>b._k?1:0);
    const R=suite(fnv("jour:"+iso));for(let i=pool.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const x=pool[i];pool[i]=pool[j];pool[j]=x}
    const out=[],cats=new Set();for(const it of pool){if(out.length>=3)break;if(cats.has(it.cat))continue;cats.add(it.cat);out.push(it)}return out}
  B2.jour=iso=>jour(iso).map(it=>({k:it._k,nom:it.nom,r:it.r,xp:it.xp,prix:prixJour(it)}));
  function resteJour(){const d=new Date(),m=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);const mn=Math.max(1,Math.round((m-d)/60000));return Math.floor(mn/60)+" h "+String(mn%60).padStart(2,"0")}
  function rayonJour(){const L=jour();
    const c=it=>{const own=it.a(),p=prixJour(it),k="j:"+it._k;
      return `<article class="b2jc" data-r="${it.r}"><div class="b2jv">${it.vis()}</div><div class="b2ji">${badge(it.r)}<b>${esc(it.nom)}</b><small>${esc(CATNOM[it.cat]||"")}</small>
        <div class="b2jp"><s aria-label="prix habituel">${fmtN(it.xp)}</s> <b>${fmtN(p)}</b> pièces</div>
        ${own?`<span class="b2ok">À toi</span>`:`<button class="btn light${arme_(k)?" buy":""}" type="button" data-b2j="${esc(it._k)}" aria-label="Acheter ${esc(it.nom)} pour ${fmtN(p)} pièces au lieu de ${fmtN(it.xp)}">${arme_(k)?"Acheter ? "+fmtN(p):"Acheter · "+fmtN(p)}</button>`}</div></article>`};
    return `<div class="b2jh"><b>Boutique du jour</b><span>Nouvelle sélection dans ${resteJour()}</span></div>
      <p class="b2note">Trois objets rares ou mieux, ${Math.round(REMISE*100)} % moins chers aujourd’hui seulement. La même sélection pour tout le monde, à prix fixe.</p>
      <div class="b2jl">${L.map(c).join("")||`<p class="b2note">La sélection arrive, reviens dans un instant.</p>`}</div>`}

  /* ---------------- Accessoires du Personnage ---------------- */
  function rayonAcc(){const vu=trouve4("acc",UI.vu)||trouve4("acc",monAcc())||ACC[0],perso=!!monPerso(),mien=monAcc();
    const own=a4(vu),on=mien===vu.id,k="acc:"+vu.id;
    const haut=`<div class="b2top">${avAcc(vu.id,"b2big")}<div><b>${esc(vu.nom)}</b> ${badge(vu.r)}<small>${own?(on?"Porté":"À toi"):fmtN(vu.xp)+" pièces"}</small>
      <div class="b2act">${own?`<button class="btn light" type="button" data-b2porte="${vu.id}">${on?"Retirer":"Porter"}</button>`
        :`<button class="btn light${arme_(k)?" buy":""}" type="button" data-b2a="${vu.id}" aria-label="Acheter ${esc(vu.nom)} pour ${fmtN(vu.xp)} pièces">${arme_(k)?"Acheter ? "+fmtN(vu.xp):"Acheter · "+fmtN(vu.xp)}</button>`}</div></div></div>`;
    const note=perso?"":`<p class="b2note">Les accessoires se posent sur ton Personnage. Crée-le dans ton profil, onglet Personnage. En attendant, l’aperçu montre un mannequin.</p>`;
    const tuiles=ACC.map(x=>{const o=a4(x),p=mien===x.id;return `<button type="button" class="b2t${p?" on":""}${UI.vu===x.id?" vu":""}${o?"":" lock"}" data-b2vu="${x.id}" data-r="${x.r}" aria-pressed="${UI.vu===x.id}" aria-label="${esc(x.nom)}, ${RNOM[x.r]}${p?", porté":o?", à toi":", "+fmtN(x.xp)+" pièces"}">${avAcc(x.id)}<b>${esc(x.nom)}</b><small>${p?"Porté":o?"À toi":fmtN(x.xp)}</small></button>`}).join("");
    return `${haut}${note}<div class="b2grid">${tuiles}</div><p class="shopnote">Un accessoire va avec tous les skins. Les autres le voient sur ton Personnage : classement, amis, Arène et Duel.</p>`}

  /* ---------------- Style : couleur du pseudo, émojis d'Arène, sons ---------------- */
  function etatPc(x){if(x.div!=null)return a4(x)?(monPc()===x.id?"Choisie":"À toi"):"Division Diamant";if(a4(x))return monPc()===x.id?"Choisie":"À toi";return fmtN(x.xp)+" pièces"}
  function rayonStyle(){const nick=esc((typeof myNick==="function"&&myNick())||"Ton pseudo");const sonOn=typeof SON!=="undefined"&&!!SON;
    const pcs=PC.map(x=>{const o=a4(x),on=monPc()===x.id,k="pc:"+x.id;return `<button type="button" class="b2pcb${on?" on":""}${o?"":" lock"}${arme_(k)?" buy":""}" data-b2pc="${x.id}" data-r="${x.r}" aria-pressed="${on}" aria-label="Couleur ${esc(x.nom)}, ${RNOM[x.r]}, ${esc(etatPc(x))}"><span class="b2pc" data-pc="${x.id}">${nick}</span><small>${arme_(k)?"Acheter ? "+fmtN(x.xp):esc(etatPc(x))}</small></button>`}).join("");
    const aucun=`<button type="button" class="b2pcb${monPc()?"":" on"}" data-b2pc="" aria-pressed="${!monPc()}" aria-label="Couleur normale"><span>${nick}</span><small>${monPc()?"Normale":"Choisie"}</small></button>`;
    const emos=EMO.map(x=>{const o=a4(x),k="emo:"+x.id;return `<div class="b2ep" data-r="${x.r}"><span class="b2epe" aria-hidden="true">${x.e.map(e=>e[0]).join(" ")}</span><div><b>${esc(x.nom)}</b> ${badge(x.r)}</div>
      ${o?`<span class="b2ok">À toi</span>`:`<button class="s2mini b2mini${arme_(k)?" buy":""}" type="button" data-b2e="${x.id}" aria-label="Acheter les émojis ${esc(x.nom)} pour ${fmtN(x.xp)} pièces">${arme_(k)?"Acheter ? "+fmtN(x.xp):fmtN(x.xp)}</button>`}</div>`}).join("");
    const sons=SONS.map(x=>{const o=a4(x),on=monSon()===x.id,k="son:"+x.id;return `<div class="b2sn${on?" on":""}" data-r="${x.r}"><button class="b2play" type="button" data-b2ecoute="${x.id}" aria-label="Écouter le son ${esc(x.nom)}">▶</button><div><b>${esc(x.nom)}</b> ${badge(x.r)}</div>
      ${o?`<button class="s2mini b2mini${on?" on":""}" type="button" data-b2son="${x.id}" aria-pressed="${on}" aria-label="${on?"Retirer":"Choisir"} le son ${esc(x.nom)}">${on?"Choisi":"Choisir"}</button>`
        :`<button class="s2mini b2mini${arme_(k)?" buy":""}" type="button" data-b2s="${x.id}" aria-label="Acheter le son ${esc(x.nom)} pour ${fmtN(x.xp)} pièces">${arme_(k)?"Acheter ? "+fmtN(x.xp):fmtN(x.xp)}</button>`}</div>`}).join("");
    return `<h3 class="b2h">Couleur du pseudo</h3><div class="b2pcs">${aucun}${pcs}</div><p class="b2note">Ta couleur s’affiche dans le classement, ton profil et la liste d’amis. L’arc-en-ciel est réservé à la division Diamant.</p>
      <h3 class="b2h">Émojis d’Arène</h3><div class="b2eps">${emos}</div><p class="b2note">Tes émojis s’ajoutent aux messages rapides de l’Arène, dans la salle, à la révélation et au podium.</p>
      <h3 class="b2h">Son de bonne réponse</h3><div class="b2sns">${sons}</div><p class="b2note">${sonOn?"Le son est activé : ton son se joue à chaque bonne réponse.":"Le son est coupé sur cet appareil : active-le dans ton profil pour entendre ton son."}</p>`}

  /* ---------------- Album de la collection ---------------- */
  function rayonAlbum(){const L=catalogue(),n=L.filter(x=>x.a()).length;
    const parR=RAR.map(r=>{const T=L.filter(x=>x.r===r);return `<span class="b2ar" data-r="${r}"><b>${T.filter(x=>x.a()).length}</b> / ${T.length}<small>${RNOM[r]}</small></span>`}).join("");
    const tete=`<div class="b2alh"><div><b class="b2big-n">${n} / ${L.length}</b><span>objets dans ta collection</span></div><span class="bar" style="--p:${(L.length?n/L.length:0).toFixed(3)}"><i></i></span></div><div class="b2ars">${parR}</div>`;
    const cat=CAT.find(c=>c[0]===UI.alb);
    if(!cat){const lignes=CAT.map(([k,nom])=>{const T=L.filter(x=>x.cat===k);if(!T.length)return "";const m=T.filter(x=>x.a()).length;
        return `<button type="button" class="b2cat" data-b2alb="${k}" aria-label="${esc(nom)} : ${m} sur ${T.length}"><b>${esc(nom)}</b><span class="bar" style="--p:${(m/T.length).toFixed(3)}"><i></i></span><small>${m} / ${T.length}</small></button>`}).join("");
      return `${tete}<div class="b2cats">${lignes}</div><p class="b2note">Touche une catégorie pour voir chaque objet. Ceux qui te manquent sont en silhouette, avec la façon de les obtenir.</p>`}
    const g=GNOM();const T=L.filter(x=>x.cat===cat[0]&&(!UI.manq||!x.a()));
    const tuiles=T.map(x=>{const o=x.a();const how=o?"À toi":x.xp?fmtN(x.xp)+" pièces"+(x.don?" ou offert après 100 cartes en "+(g[x.don]||x.don):""):(x.cond||"Se gagne");
      return `<div class="b2al${o?"":" b2miss"}" data-r="${x.r}" role="listitem" aria-label="${esc(x.nom)}, ${RNOM[x.r]}, ${esc(how)}"><div class="b2alv" aria-hidden="true">${x.vis()}</div><b>${esc(x.nom)}</b><small>${esc(how)}</small></div>`}).join("");
    return `${tete}<div class="b2alnav"><button class="linkbtn" type="button" data-b2alb="">Toutes les catégories</button><button type="button" class="b2tg${UI.manq?" on":""}" data-b2manq aria-pressed="${UI.manq}">Manquants seulement</button></div>
      <h3 class="b2h">${esc(cat[1])}</h3><div class="b2als" role="list">${tuiles||`<p class="b2note">Tu as tout dans cette catégorie.</p>`}</div>`}
  B2.album=()=>{const L=catalogue();const o={total:L.length,n:L.filter(x=>x.a()).length,cats:{},rar:{}};
    L.forEach(x=>{const c=o.cats[x.cat]=o.cats[x.cat]||[0,0];c[1]++;if(x.a())c[0]++;const r=o.rar[x.r]=o.rar[x.r]||[0,0];r[1]++;if(x.a())r[0]++});return o};

  /* ---------------- Offrir un objet à un ami (fonction SQL cadeau_offrir, sql/10-boutique.sql) ---------------- */
  const OF=B2.of=B2.of||{dispo:null,ami:"",obj:"",cours:false};
  const offrables=()=>[...ACC,...PC,...EMO,...SONS].filter(x=>x.xp>0&&x.div==null&&!x.nof);
  const objetBase=it=>it.k+"-"+it.id;    // identifiant dans la table objets (sql/5) : [a-z0-9-]
  B2.offrables=()=>offrables().map(objetBase);
  // Une seule question à la base par minute : la fonction existe-t-elle ? (appel sans arguments, refusé sans rien écrire)
  function sonder(){if(OF.dispo!==null||OF.cours||!connecte()||!window.P26||typeof P26.rpc!=="function"||Date.now()-(OF.t||0)<60000)return;OF.cours=true;OF.t=Date.now();
    P26.rpc("cadeau_offrir",{p_ami:null,p_objet:null}).then(()=>{OF.dispo=true},e=>{const c=e&&e.code;OF.dispo=c==="absent"?false:c==="unavailable"?null:true})
      .finally(()=>{OF.cours=false;if(OF.dispo!==null)maj()})}
  B2.sonder=sonder;
  const amisOk=()=>(typeof NT!=="undefined"&&Array.isArray(NT.amis)?NT.amis:[]).filter(a=>a&&a.ok&&typeof a.id==="string"&&/^[0-9a-f-]{36}$/.test(a.id));
  function rayonOffrir(){if(!connecte())return `<p class="b2note">Connecte-toi avec ton compte pour offrir un objet à un ami.</p>`;
    sonder();const off=OF.dispo!==true,A=amisOk(),O=offrables(),obj=O.find(x=>objetBase(x)===OF.obj)||null;
    const msg=OF.dispo===false?`<p class="b2warn" role="status">Bientôt disponible : la base du site doit d’abord être mise à jour.</p>`:OF.dispo===null?`<p class="b2note" role="status">Vérification…</p>`:"";
    const amis=A.length?A.map(a=>`<option value="${esc(a.id)}"${OF.ami===a.id?" selected":""}></option>`).join(""):"";
    const k="don:"+(obj?objetBase(obj):"");
    return `<h3 class="b2h">Offrir un objet à un ami</h3>${msg}
      <p class="b2note">Tu paies l’objet avec tes pièces et il arrive chez ton ami. Seulement entre amis confirmés, 5 cadeaux par jour au plus. Les objets gagnés et ceux de division ne s’offrent pas.</p>
      <fieldset class="b2of"${off?" disabled":""}><label class="lab" for="b2ofA">Ami</label><select id="b2ofA" class="inp">${A.length?`<option value="">Choisis un ami</option>`+amis:`<option value="">Aucun ami confirmé</option>`}</select>
      <label class="lab" for="b2ofO">Objet</label><select id="b2ofO" class="inp"><option value="">Choisis un objet</option>${O.map(x=>`<option value="${objetBase(x)}"${OF.obj===objetBase(x)?" selected":""}>${esc(x.nom)} · ${fmtN(x.xp)} pièces</option>`).join("")}</select>
      <button class="btn light${arme_(k)?" buy":""}" type="button" id="b2ofGo" ${!obj||!OF.ami?"disabled":""}>${obj?(arme_(k)?"Offrir ? "+fmtN(obj.xp):"Offrir · "+fmtN(obj.xp)+" pièces"):"Offrir"}</button></fieldset>`}
  async function offrir(b){const obj=offrables().find(x=>objetBase(x)===OF.obj),ami=amisOk().find(a=>a.id===OF.ami);if(!obj||!ami||OF.dispo!==true)return;
    const pr=obj.xp,k="don:"+objetBase(obj);if(coins()<pr){manque(b,pr);return}
    if(!arme_(k)){UI.arme={k,t:Date.now()};b.classList.add("buy");b.textContent="Offrir ? "+fmtN(pr);return}
    UI.arme=null;b.disabled=true;let r="";try{r=await P26.rpc("cadeau_offrir",{p_ami:ami.id,p_objet:objetBase(obj)})}catch(e){r=e&&e.code==="absent"?"absent":e&&e.texte?"refus:"+e.texte:"erreur"}
    const nom=cleanNick(ami.pseudo||"")||"ton ami";
    if(r==="ok"){P.buy=P.buy||{};P.buy[k+":"+Date.now()]=pr;saveP();try{paintMyAv()}catch(e){}buzz(18);toast(`<span class="tm">✓</span><div><b>${esc(obj.nom)} offert à ${esc(nom)}</b><span>−${fmtN(pr)} pièces</span></div>`)}
    else{const t={deja:`${nom} l’a déjà.`,limite:"Tu as déjà offert 5 cadeaux aujourd’hui.",ami:"Seulement entre amis confirmés.",absent:"Pas encore disponible.",erreur:"La base ne répond pas, réessaie plus tard."}[r]||(String(r).startsWith("refus:")?String(r).slice(6):"Cadeau refusé.");
      if(r==="absent")OF.dispo=false;toast(`<span class="tm">·</span><div><b>Cadeau non envoyé</b><span>${esc(t)}</span></div>`)}
    maj()}
  // Cadeaux reçus : lignes de la table objets (origine « cadeau ») qui correspondent à la liste blanche.
  function recus(){if(!connecte()||!window.P26||typeof P26.lire!=="function")return Promise.resolve(0);
    return P26.lire("objets",q=>q.select("objet,origine,de").eq("origine","cadeau")).then(rows=>{let n=0;P.own=P.own||{};
      (rows||[]).forEach(x=>{const m=/^(acc|pc|emo|son)-([a-z0-9]{1,20})$/.exec(String(x&&x.objet||""));const it=m&&trouve4(m[1],m[2]);if(!it||it.div!=null||P.own[it._k])return;
        P.own[it._k]=1;n++;const de=amisOk().find(a=>a.id===x.de);toast(`<span class="tm">🎁</span><div><b>Cadeau reçu : ${esc(it.nom)}</b><span>${de?"De la part de "+esc(cleanNick(de.pseudo||"")):"De la part d’un ami"}</span></div>`)});
      if(n){saveP();maj()}return n},()=>0)}
  B2.recus=recus;
  if(window.P26&&P26.ready&&typeof P26.ready.then==="function")P26.ready.then(()=>setTimeout(recus,1500),()=>{});

  /* ---------------- Joker 50/50 (Arène) : objet à prix fixe, 3 au plus, comme le gel de série ---------------- */
  const JK_PRIX=120,JK_MAX=3;
  function jkEtat(){const g=P26ui.etat("jk",{used:{}});if(!g||typeof g!=="object"||Array.isArray(g)||!g.used||typeof g.used!=="object"||Array.isArray(g.used))P.p1.jk={used:{}};return P.p1.jk}
  const jkGagnes=()=>Object.keys(P.buy||{}).filter(k=>/^j50:[a-z0-9-]{1,30}$/.test(k)).length;
  function jkStock(){return Math.max(0,jkGagnes()-Object.keys(jkEtat().used).length)}
  P26ui.fusion("jk",(l,d)=>{const u={};[l,d].forEach(x=>{if(x&&x.used&&typeof x.used==="object")Object.keys(x.used).forEach(k=>{if(/^[a-z0-9-]{1,30}$/.test(k))u[k]=1})});return {used:u}});
  B2.jkStock=jkStock;B2.JK_MAX=JK_MAX;B2.JK_PRIX=JK_PRIX;
  // Joker offert (passe de saison de saison.js, désactivé pour l'instant) : false si le stock est plein.
  B2.jkDonner=cle=>{if(!/^[a-z0-9-]{1,30}$/.test(cle)||jkStock()>=JK_MAX)return false;P.buy=P.buy||{};if(has(P.buy,"j50:"+cle))return false;P.buy["j50:"+cle]=0;saveP();return true};
  function jokerHTML(){const s=jkStock(),plein=s>=JK_MAX,k="jk";
    return `<div class="p1obj b2jo"><i class="b2jkv" aria-hidden="true">50<em>/</em>50</i><div><b>Joker 50/50</b><p>En Arène, retire 2 mauvaises réponses sur une question. Ton score reste calculé normalement.</p><small>Tu en as ${s} sur ${JK_MAX}.</small></div>
      <button class="btn light${!plein&&arme_(k)?" buy":""}" type="button" data-b2jk ${plein?"disabled":""}>${plein?"Stock plein":arme_(k)?"Acheter ? "+fmtN(JK_PRIX):fmtN(JK_PRIX)+" pièces"}</button></div>`}
  function brancherJoker(d){const b=d.querySelector("[data-b2jk]");if(!b)return;b.onclick=()=>{if(jkStock()>=JK_MAX)return;
    if(acheter(b,"jk",JK_PRIX,"Joker 50/50",()=>{P.buy=P.buy||{};P.buy["j50:"+Date.now().toString(36)]=JK_PRIX}))maj()}}
  // Bonne réponse : l'hôte la connaît ; un joueur la retrouve dans ses propres chapitres (même texte de question).
  function* banques(){try{if(typeof C!=="undefined"&&C.chaps)for(const ch of Object.values(C.chaps))for(const z of (ch&&ch.quiz)||[])yield z&&z.qs}catch(e){}
    try{if(typeof PG!=="undefined")for(const src of [PG.base,PG.mine,PG.shared])if(src&&typeof src==="object")for(const d of Object.values(src))for(const z of (d&&d.quiz)||[])yield z&&z.qs}catch(e){}
    try{const l=typeof GL!=="undefined"?GL.get("prog"):null;if(l&&typeof l==="object")for(const d of Object.values(l))for(const z of (d&&d.quiz)||[])yield z&&z.qs}catch(e){}}
  function bonne(){if(typeof AR==="undefined"||!AR.cur)return -1;const c=AR.cur;
    if(AR.host&&Array.isArray(AR.qs)&&AR.qs[AR.i]&&AR.i===c.i)return +AR.qs[AR.i].ok;
    const q=clip(c.q,240),opts=(c.opts||[]).map(o=>clip(o,160));
    for(const qs of banques()){if(!Array.isArray(qs))continue;for(const x of qs){if(!x||typeof x.ok!=="string"||clip(x.q,240)!==q)continue;const i=opts.indexOf(clip(x.ok,160));if(i>=0)return i}}return -1}
  let JK=null;
  function jkPoser(){const box=document.getElementById("duel");if(!box||typeof AR==="undefined"||!AR.g||AR.ph!=="q"||!AR.cur)return;
    const grid=box.querySelector(".argrid");if(!grid)return;const cle=AR.code+":"+AR.cur.i;
    if(JK&&JK.cle===cle)JK.out.forEach(k=>{const b=grid.querySelector(`.aro[data-k="${k}"]`);if(b){b.classList.add("b2out");b.disabled=true;b.setAttribute("aria-hidden","true");b.tabIndex=-1}});
    let w=box.querySelector(".b2jk");const n=jkStock();
    if(AR.myAns||(JK&&JK.cle===cle)||n<1){if(w)w.remove();return}
    if(!w){w=document.createElement("div");w.className="b2jk";grid.insertAdjacentElement("afterend",w)}
    w.innerHTML=`<button type="button" class="b2jkb" aria-label="Joker 50/50 : retire 2 mauvaises réponses. Il t’en reste ${n}."><b>50/50</b><span>Joker · ${n}</span></button>`;
    w.querySelector("button").onclick=()=>jkJouer(cle)}
  function jkJouer(cle){if(typeof AR==="undefined"||!AR.cur||AR.myAns||AR.ph!=="q"||AR.code+":"+AR.cur.i!==cle||(JK&&JK.cle===cle)||jkStock()<1)return;
    const ok=bonne(),n=(AR.cur.opts||[]).length;
    if(ok<0||ok>=n||n<3){toast(`<span class="tm">·</span><div><b>Joker indisponible pour cette question</b><span>Ton joker est gardé.</span></div>`);return}
    const faux=[];for(let k=0;k<n;k++)if(k!==ok)faux.push(k);for(let i=faux.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const x=faux[i];faux[i]=faux[j];faux[j]=x}
    JK={cle,out:faux.slice(0,2)};jkEtat().used[Date.now().toString(36)+"-"+(AR.cur.i|0)]=1;saveP();buzz(12);jkPoser()}
  B2.jkJouer=()=>{if(typeof AR!=="undefined"&&AR.cur)jkJouer(AR.code+":"+AR.cur.i)};

  /* ---------------- Émojis d'Arène (en plus des messages rapides) ---------------- */
  let MON=null;const VU={};let FIL=[];
  P26ui.on("arene.pres",x=>{if(!x||typeof x!=="object")return;if(MON&&Date.now()-MON.t<8000)x.b2={e:MON.e,t:MON.t}});
  const mesEmos=()=>EMO.filter(a4).flatMap(p=>p.e.map((e,i)=>[p.id+"-"+i,e[0],e[1]]));
  function emoPeer(){try{return (AR.g.peers().find(p=>p.isMe&&p.sameTab)||{}).peer||""}catch(e){return ""}}
  function emoMontrer(peer,nick,e){const E=EMOK[e];if(!E)return;FIL.push({peer,nick,e,fin:Date.now()+3200});FIL=FIL.slice(-4);emoPeindre();setTimeout(emoPeindre,3300)}
  function emoPeindre(){const box=document.getElementById("duel");if(!box||typeof AR==="undefined"||!AR.g)return;const t=Date.now();FIL=FIL.filter(x=>x.fin>t);
    const f=box.querySelector(".b2emofil");if(f){f.textContent="";FIL.forEach(x=>{const s=document.createElement("span");s.textContent=x.nick+" "+EMOK[x.e].e;f.appendChild(s)})}
    box.querySelectorAll("[data-pk]").forEach(el=>{const pk=String(el.dataset.pk).replace(/^h:/,"");const x=FIL.slice().reverse().find(y=>y.peer===pk);let s=el.querySelector(".b2bul");
      if(!x){if(s)s.remove();return}if(!s){s=document.createElement("span");s.className="b2bul";s.setAttribute("aria-hidden","true");el.appendChild(s)}s.textContent=EMOK[x.e].e})}
  function emoLire(){if(typeof AR==="undefined"||!AR.g)return;for(const p of arPlayers()){if(p.isMe&&p.sameTab)continue;const b=p.presence&&p.presence.b2;
      const e=b&&typeof b.e==="string"&&has(EMOK,b.e)?b.e:"",t=b&&Number.isFinite(+b.t)?+b.t:0;
      if(!has(VU,p.peer)){VU[p.peer]=t;continue}if(!e||t===VU[p.peer])continue;VU[p.peer]=t;emoMontrer(p.peer,cleanNick(String(p.presence.nick||""))||"?",e)}}
  function emoBarre(){const box=document.getElementById("duel");if(!box||typeof AR==="undefined"||!AR.g)return;let w=box.querySelector(".b2emo");
    if(AR.ph==="q"||!["lobby","start","rev","end"].includes(AR.ph)){if(w)w.remove();return}
    const L=mesEmos();if(!w){w=document.createElement("div");w.className="b2emo";const qm=box.querySelector("#arQm");if(qm)qm.insertAdjacentElement("afterend",w);else box.appendChild(w)}
    w.innerHTML=(L.length?`<div class="b2emob" role="group" aria-label="Réagir avec un émoji">${L.map(([k,e,n])=>`<button type="button" data-b2emo="${k}" aria-label="Réagir : ${esc(n)}">${e}</button>`).join("")}</div>`:"")+`<div class="b2emofil" aria-live="polite"></div>`;
    w.querySelectorAll("[data-b2emo]").forEach(b=>b.onclick=()=>{const k=b.dataset.b2emo;if(!has(EMOK,k)||!a4(P4.emo[EMOK[k].p]))return;if(MON&&Date.now()-MON.t<1500)return;
      MON={e:k,t:Date.now()};try{arPres(AR.lp||{nick:arNick()}).catch(()=>{})}catch(e){}buzz(8);emoMontrer(emoPeer(),"Toi",k)});emoPeindre()}
  P26ui.on("arene.rendu",()=>{try{jkPoser()}catch(e){}try{emoLire();emoBarre()}catch(e){}});
  P26ui.on("arene.pairs",()=>{try{emoLire();emoPeindre()}catch(e){}});

  /* ---------------- Sons de bonne réponse (Web Audio, aucun fichier ; rien si le son est coupé) ---------------- */
  let AC2=null;
  function note(f,t0,d,type,vol){const o=AC2.createOscillator(),g=AC2.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);
    g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+.012);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(g);g.connect(AC2.destination);o.start(t0);o.stop(t0+d+.03)}
  const MOTIF={cloche:t=>{note(1318.5,t,.45,"sine",.1);note(2637,t,.3,"sine",.035)},
    arpege:t=>[523.3,659.3,784].forEach((f,i)=>note(f,t+i*.07,.2,"triangle",.1)),
    piece:t=>{note(987.8,t,.08,"square",.04);note(1318.5,t+.08,.3,"square",.04)},
    harpe:t=>[587.3,659.3,784,880,1046.5].forEach((f,i)=>note(f,t+i*.045,.5,"sine",.07)),
    fanfare:t=>[[523.3,0,.12],[659.3,.12,.12],[784,.24,.12],[1046.5,.36,.42]].forEach(([f,s,d])=>note(f,t+s,d,"sawtooth",.03))};
  function jouerSon(id){if(typeof SON==="undefined"||!SON||!has(MOTIF,id))return false;
    try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;AC2=AC2||new A();if(AC2.state==="suspended")AC2.resume().catch(()=>{});MOTIF[id](AC2.currentTime+.02);B2.dernierSon={id,t:Date.now()};return true}catch(e){return false}}
  B2.jouerSon=jouerSon;
  P26ui.on("reponse",d=>{if(d&&d.ok===true){const s=monSon();if(s)jouerSon(s)}});

  /* ---------------- Branchements des rayons ---------------- */
  function brancher(d,t){
    d.querySelectorAll("[data-b2j]").forEach(b=>b.onclick=()=>{const it=jour().find(x=>x._k===b.dataset.b2j);if(!it||it.a())return;const p=prixJour(it);
      if(acheter(b,"j:"+it._k,p,it.nom,payer(it._k,p)))maj()});
    d.querySelectorAll("[data-b2vu]").forEach(b=>b.onclick=()=>{const x=trouve4("acc",b.dataset.b2vu);if(!x)return;UI.vu=x.id;buzz(8);maj()});
    d.querySelectorAll("[data-b2porte]").forEach(b=>b.onclick=()=>{const x=trouve4("acc",b.dataset.b2porte);if(!x||!a4(x))return;choisir("acc",monAcc()===x.id?"":x.id);maj()});
    d.querySelectorAll("[data-b2a]").forEach(b=>b.onclick=()=>{const x=trouve4("acc",b.dataset.b2a);if(!x||a4(x))return;
      if(acheter(b,"acc:"+x.id,x.xp,x.nom,payer(x._k,x.xp))){choisir("acc",x.id);maj()}});
    d.querySelectorAll("[data-b2pc]").forEach(b=>b.onclick=()=>{const id=b.dataset.b2pc;if(!id){choisir("pc","");maj();return}const x=trouve4("pc",id);if(!x)return;
      if(a4(x)){choisir("pc",monPc()===x.id?"":x.id);maj();return}
      if(x.div!=null){secoue(b);toast(`<span class="tm">◎</span><div><b>Réservé à la division Diamant</b><span>Atteins 1400 d’Elo en Arène classée.</span></div>`);return}
      if(acheter(b,"pc:"+x.id,x.xp,"Couleur "+x.nom,payer(x._k,x.xp))){choisir("pc",x.id);maj()}});
    d.querySelectorAll("[data-b2e]").forEach(b=>b.onclick=()=>{const x=trouve4("emo",b.dataset.b2e);if(!x||a4(x)||!x.xp)return;if(acheter(b,"emo:"+x.id,x.xp,"Émojis "+x.nom,payer(x._k,x.xp)))maj()});
    d.querySelectorAll("[data-b2s]").forEach(b=>b.onclick=()=>{const x=trouve4("son",b.dataset.b2s);if(!x||a4(x))return;if(acheter(b,"son:"+x.id,x.xp,"Son "+x.nom,payer(x._k,x.xp))){choisir("son",x.id);maj()}});
    d.querySelectorAll("[data-b2son]").forEach(b=>b.onclick=()=>{const x=trouve4("son",b.dataset.b2son);if(!x||!a4(x))return;choisir("son",monSon()===x.id?"":x.id);maj()});
    d.querySelectorAll("[data-b2ecoute]").forEach(b=>b.onclick=()=>{if(!jouerSon(b.dataset.b2ecoute))toast(`<span class="tm">♪</span><div><b>Le son est coupé</b><span>Active-le dans ton profil pour écouter.</span></div>`)});
    d.querySelectorAll("[data-b2alb]").forEach(b=>b.onclick=()=>{UI.alb=b.dataset.b2alb;maj();setTimeout(()=>{const h=document.querySelector(".b2alh");if(h&&h.scrollIntoView)h.scrollIntoView({block:"start",behavior:reduce?"auto":"smooth"})},30)});
    const mq=d.querySelector("[data-b2manq]");if(mq)mq.onclick=()=>{UI.manq=!UI.manq;maj()};
    if(t==="b2offrir"){const sa=d.querySelector("#b2ofA"),so=d.querySelector("#b2ofO"),go=d.querySelector("#b2ofGo");
      if(sa){sa.querySelectorAll("option[value]").forEach(o=>{const a=amisOk().find(x=>x.id===o.value);if(a)o.textContent=cleanNick(a.pseudo||"")||"?"});sa.onchange=()=>{OF.ami=sa.value;UI.arme=null;maj()}}
      if(so)so.onchange=()=>{OF.obj=so.value;UI.arme=null;maj()};if(go)go.onclick=()=>offrir(go)}}

  try{decorer()}catch(e){}
})();
P26mod.ok("boutique2");

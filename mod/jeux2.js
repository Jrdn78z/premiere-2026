/* ================= Lot P2 : jeux de cartes =================
   Module préchargé (P26ui.precharger). Cinq jeux où l'on voit les dos de cartes et les skins :
   Memory, Bataille royale (seul contre des adversaires simulés, nommés « Bot »), Cartes à trous, Pendu, « Qui suis-je ? ».
   Les questions viennent toutes du contenu du site, jamais de ce fichier : cartes et quiz de C.chaps (Programme de site/prog/
   et cartes de l'élève), verbes irréguliers (prog/verbes-*.json, par vbData). « Qui suis-je ? » n'utilise que les notions
   du Programme qui ont une définition (cartes « Définis ») ; ses indices sont des morceaux de cette définition, le nom
   du thème et la forme du mot.
   Les cartes face cachée portent MON dos (P.dos, y compris les dos des packs de skins.js, revérifié par P2S.dosOk).
   XP par gainXP (plafond du jour de l'application), journal jrn() (quête « réponds à 100 questions », trophées secrets de saison.js),
   événements activite et victoire (effet de victoire choisi), records dans P.p1.j2 (fusion entre appareils), publiés dans la
   ligne de classement (champ j2, bornés et revérifiés à l'affichage), événement « record » dans le fil des amis,
   trois titres à gagner (P.t : royale, elephant, detective). Rien ne s'achète ici, aucun tirage payant. */
(function(){
  "use strict";
  const J=window.P2J=window.P2J||{};
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const alea=n=>Math.floor(Math.random()*n);
  const norm=s=>String(s==null?"":s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const plat=s=>String(s==null?"":s).replace(/\$([^$]+)\$/g,(m,t)=>{try{return plainTex(t)}catch(e){return t}});
  const lab=s=>esc(plat(s));                               // texte d'un aria-label
  const ms2s=ms=>(Math.round(ms/100)/10).toLocaleString("fr-FR",{minimumFractionDigits:1})+" s";
  const tard=ms=>reduce?Math.min(ms,Math.max(120,Math.round(ms*.5))):ms;

  /* ---------------- Parties : minuteurs propres à chaque jeu ---------------- */
  function jeu(nom){return {nom,on:false,fin:false,box:null,src:"*",tm:[],iv:null}}
  function stop(G){G.tm.forEach(clearTimeout);G.tm=[];clearInterval(G.iv);G.iv=null}
  const vit=(G,box)=>G.on&&G.box===box&&box.isConnected&&box.dataset.vue===G.nom;
  function apres(G,box,ms,f){const t=setTimeout(()=>{G.tm=G.tm.filter(x=>x!==t);if(vit(G,box))f()},ms);G.tm.push(t);return t}

  /* ---------------- XP, records, titres ---------------- */
  // XP vraiment ajouté (le plafond du jour peut le réduire). Les quêtes réussies au passage ne sont pas comptées ici.
  function gagne(n,el){n=Math.max(0,Math.round(+n||0));if(!n)return 0;const k=TODAY_ISO,a=+((P.x||{})[k])||0;try{gainXP(n,el)}catch(e){}
    return Math.min(n,Math.max(0,(+((P.x||{})[k])||0)-a))}
  const RK=["mem","br","bp","ct","pe","qs"],MIN=new Set(["mem","bp"]);   // mem : moins de coups ; bp : meilleure place ; les autres : le plus haut
  function recs(){const o=P26ui.etat("j2",{});if(!o||typeof o!=="object"||Array.isArray(o))P.p1.j2={};return P.p1.j2}
  const rec=k=>N(recs()[k],0,10000);
  function noter(k,v){const o=recs(),a=N(o[k],0,10000);v=N(v,0,10000);const mieux=MIN.has(k)?v>0&&(!a||v<a):v>a;if(mieux){o[k]=v;if(k!=="bp")evRecord(k)}return mieux}
  function victoire(){recs().br=N(rec("br")+1,0,10000);evRecord("br")}
  // Records publiés dans ma ligne de classement (champ j2 de P26ui) ; ceux des autres sont revérifiés à l'affichage par ces bornes.
  const BORNE={mem:[6,500],br:[1,10000],bp:[1,8],ct:[1,8],pe:[1,5],qs:[1,20]};
  function borner(o){const out={};if(o&&typeof o==="object"&&!Array.isArray(o))for(const k of RK){const v=Math.round(+o[k]),b=BORNE[k];if(Number.isFinite(v)&&v>=b[0]&&v<=b[1])out[k]=v}return out}
  const estMoi=r=>!!r&&(r.me===true||(typeof UID==="string"&&!!UID&&r.id===UID));
  function recDe(r){return !r?{}:estMoi(r)?borner(recs()):borner(r.j2)}
  J.recDe=recDe;J.borner=borner;
  P26ui.ligne(()=>({j2:borner(recs())}));
  // Nouveau record : événement « record » dans le fil des amis (evenement_ajouter ; sql/5-fondations.sql, evenement_data_ok :
  // {n entier de 0 à 1 000 000, de identifiant [a-z0-9_-]{1,30}}). Seulement un vrai résultat, un par jeu et par jour, compte connecté.
  const EVDE={mem:"memory",br:"royale",ct:"trous",pe:"pendu",qs:"qui"},EVOK={mem:v=>v<=14,br:v=>v>=1,ct:v=>v>=5,pe:v=>v>=3,qs:v=>v>=10};
  function evRecord(k){const de=EVDE[k],v=rec(k);if(!de||!v||!EVOK[k](v))return false;let soc=false;try{soc=!!SOC()}catch(e){}
    if(!soc||!window.P26||!window.P26.evenements||typeof window.P26.evenements.add!=="function")return false;
    let vu={};try{vu=LS.get("j2ev",{})||{}}catch(e){}if(vu[k]===TODAY_ISO)return false;vu=Object.assign({},vu,{[k]:TODAY_ISO});try{LS.set("j2ev",vu)}catch(e){}
    J.dernierEv={n:v,de};try{Promise.resolve(window.P26.evenements.add("record",{n:v,de})).catch(()=>{})}catch(e){}return true}
  P26ui.fusion("j2",(l,d)=>{const o={};for(const k of RK){const a=N(l&&l[k],0,10000),b=N(d&&d[k],0,10000);
    const v=MIN.has(k)?(a&&b?Math.min(a,b):a||b):Math.max(a,b);if(v)o[k]=v}return o});
  const TITRES=[{id:"royale",nom:"Dernier debout",tr:"royale",cond:"gagne une Bataille royale"},
    {id:"elephant",nom:"Mémoire d’éléphant",tr:"elephant",cond:"finis un Memory en 9 coups ou moins"},
    {id:"detective",nom:"Détective",tr:"detective",cond:"fais 16 points ou plus à « Qui suis-je ? »"}];
  J.TITRES=TITRES;
  function titre(tr){P.t=P.t||{};if(P.t[tr])return false;P.t[tr]=TODAY_ISO;saveP();try{lgPush()}catch(e){}
    const t=TITRES.find(x=>x.tr===tr);if(t)toast(`<span class="tm">◎</span><div><b>Titre gagné : ${esc(t.nom)}</b><span>Choisis-le dans la boutique, onglet Titres.</span></div>`);return true}
  // Titres ajoutés au catalogue de boutique.js (onglet Titres, groupe « À gagner »), revérifiés chez les autres par la liste tr publiée.
  const pretB=window.P26mod?window.P26mod("boutique").catch(()=>null):Promise.resolve();
  pretB.then(()=>{const T4=window.P1T4;if(!T4||!T4.catalogue||!Array.isArray(T4.catalogue.TIT))return;const L=T4.catalogue.TIT;
    TITRES.forEach(t=>{if(!L.some(x=>x.id===t.id))L.push(Object.assign({},t,{_k:"tit:"+t.id,k:"tit"}))});J.titres=true});
  function finir(type,data,victoire,el){saveP();try{lgPush()}catch(e){}
    P26ui.emit("activite",Object.assign({type},data));if(victoire)P26ui.emit("victoire",{type,el})}

  /* ---------------- Dos de cartes et avatars ---------------- */
  const S2=()=>window.P2S||null;
  function dosOk(id){const s=S2();if(s&&typeof s.dosOk==="function")return s.dosOk(id);return typeof id==="string"&&typeof DOS!=="undefined"&&DOS.some(d=>d.id===id)?id:"classique"}
  const monDos=()=>dosOk((P&&P.dos)||"classique");
  J.monDos=monDos;
  const dos=(d,cls,st)=>`<i class="dosv j2back${cls?" "+cls:""}" data-d="${dosOk(d)}"${st?` style="${st}"`:""} aria-hidden="true"></i>`;
  // Carte qui se retourne : le dos d'un côté, la face de l'autre (même case de grille, la plus haute fixe la taille).
  const carte=(face,o)=>{o=o||{};return `<span class="j2in">${o.back||dos(o.dos||monDos())}<span class="j2face${o.fc?" "+o.fc:""}">${face}</span></span>`};
  function eventail(L){return `<span class="j2fan" aria-hidden="true">${L.map((d,i)=>dos(d,"",`--i:${i};--n:${L.length}`)).join("")}</span>`}
  function monAv(cls){try{return avHTML({id:typeof UID==="string"?UID:"",nick:myNick()||"Moi",av:avData(),avk:avK(),me:true},cls||"sm")}catch(e){return ""}}

  /* ---------------- Contenu ---------------- */
  const mats=()=>(typeof C!=="undefined"&&Array.isArray(C.mats)?C.mats:[]).filter(m=>m&&m.id);
  const matNom=mid=>{const m=mats().find(x=>x.id===mid);return m?(m.court||m.nom||""):""};
  const estVerbes=ch=>!!(ch&&(ch._verbes||/^verbes-/.test(String(ch._tid||""))));
  const chapsDe=mid=>Object.values((typeof C!=="undefined"&&C.chaps)||{}).filter(c=>c&&c.mat===mid);
  function cartesDe(mid){const out=[];for(const ch of chapsDe(mid))for(const p of ch.paquets||[])for(const c of p.cartes||[])
    if(c&&c.id&&typeof c.r==="string"&&typeof c.v==="string"&&c.r.trim()&&c.v.trim())out.push({c,ch,p,mat:mid});return out}
  const partout=f=>mats().flatMap(m=>f(m.id));
  // Choix du contenu : « Toutes mes matières » puis chaque matière qui a assez de matière pour ce jeu.
  function sources(f,min){const L=mats().filter(m=>f(m.id).length>=min).map(m=>[m.id,m.court||m.nom]);return L.length?[["*","Toutes mes matières"],...L]:[]}
  const pris=(G,L)=>{if(!L.some(x=>x[0]===G.src))G.src=L.length?L[0][0]:"*";return G.src};
  const STOP=new Set("lorsque pendant depuis encore chaque celles toutes autres permet peuvent ensemble toujours souvent beaucoup plusieurs certains certaines entre contre parmi dessus dessous autour aupres quelque quelques plutot ailleurs cependant pourtant neanmoins egalement notamment surtout seulement environ presque autant combien comment pourquoi laquelle lequel lesquels lesquelles duquel auquel desquels celui ceux cette leurs notre votre nous vous elles their there these those which where while about would could should other after before being because through between".split(" "));
  const MOT=/^[\p{L}]+$/u;
  function phrases(v){return String(v).split(/(?<=[.!?])\s+(?=[\p{Lu}0-9«"])/u).map(s=>s.trim()).filter(Boolean)}
  // Cache le terme (et ses mots de 4 lettres ou plus, et les mots de même racine) dans un texte, hors formules $...$.
  function masquer(t,terme){const mots=String(terme).replace(/\([^)]*\)/g," ").split(/[^\p{L}\p{N}]+/u).map(norm).filter(w=>w.length>=4);if(!mots.length)return String(t);
    const pareil=n=>mots.some(m=>n===m||(m.length>=5&&n.length>=5&&n.slice(0,Math.min(6,m.length))===m.slice(0,Math.min(6,m.length))));
    return String(t).split(/(\$[^$]+\$)/g).map(seg=>seg.length>2&&seg[0]==="$"&&seg[seg.length-1]==="$"?seg:seg.replace(/[\p{L}\p{N}]+/gu,w=>pareil(norm(w))?"…":w)).join("")}
  J.masquer=masquer;
  const court=(t,n)=>{t=String(t);if(t.length<=n)return t;const p=phrases(t);let o="";for(const s of p){if((o+" "+s).trim().length>n)break;o=(o+" "+s).trim()}return o||t.slice(0,n-1).replace(/\s+\S*$/,"")+"…"};

  /* ---------------- Onglet Jeu : les cinq jeux ---------------- */
  const LISTE=[["royale","Bataille royale"],["memory","Memory"],["trous","Cartes à trous"],["pendu","Pendu"],["quisuisje","Qui suis-je ?"]];
  function recTxt(k){if(k==="memory")return rec("mem")?"Record "+fmtN(rec("mem"))+" coups":"";if(k==="royale")return rec("br")?fmtN(rec("br"))+" victoire"+(rec("br")>1?"s":""):rec("bp")?"Meilleure place "+rec("bp")+"e":"";
    if(k==="trous")return rec("ct")?"Record "+rec("ct")+" / 8":"";if(k==="pendu")return rec("pe")?"Record "+rec("pe")+" / 5":"";if(k==="quisuisje")return rec("qs")?"Record "+rec("qs")+" / 20":"";return ""}
  const SOUS={royale:"Toi contre 5 Bots : une erreur et tu sors",memory:"Retrouve les paires question et réponse",trous:"Le mot caché de la phrase de cours",pendu:"Vocabulaire des cours et verbes",quisuisje:"Des indices de plus en plus faciles"};
  P26ui.on("slot:jeu",el=>{const d=P26ui.bloc(el,"jeux2");d.className="j2menu";const md=monDos(),fan=[md,md,md];
    const s=S2(),cat=s&&Array.isArray(s.catalogue)?s.catalogue:[],autres=cat.slice(0,24).filter((x,i)=>i%5===1).map(x=>x.dos).slice(0,4);
    d.innerHTML=`<div class="j2mh"><b>Jeux de cartes</b><span>Tes cartes, ton dos</span></div><div class="j2tiles">${LISTE.map(([k,t])=>{const r=recTxt(k);
      return `<button type="button" class="j2tile${k==="royale"?" j2big":""}" data-j2="${k}" aria-label="${esc(t)}. ${esc(SOUS[k])}${r?". "+esc(r):""}">${eventail(k==="royale"?[md,...autres]:fan)}<b>${esc(t)}</b><small>${esc(SOUS[k])}</small>${r?`<em>${esc(r)}</em>`:""}</button>`}).join("")}</div>`;
    d.querySelectorAll("[data-j2]").forEach(b=>b.onclick=()=>P26ui.ouvrir(b.dataset.j2))},45);

  /* ---------------- Écrans communs ---------------- */
  function accueil(G,box,o){G.on=false;G.fin=false;stop(G);
    box.innerHTML=`<div class="j2 j2acc"><div class="ihead"><h1>${esc(o.titre)}</h1><button class="linkbtn" type="button" data-j2back aria-label="Retour">Retour</button></div>
      <div class="j2hero">${o.hero||eventail([monDos(),monDos(),monDos(),monDos(),monDos()])}</div>
      <p class="lgsub">${o.regle}</p>${o.rec?`<p class="svrec">${o.rec}</p>`:""}${o.cle?amisRecHTML(o.cle):""}
      ${o.src.length?`<div class="pick sm" role="group" aria-label="Choisir le contenu">${o.src.map(([k,l])=>`<button type="button" class="${G.src===k?"on":""}" data-src="${esc(k)}" aria-pressed="${G.src===k}" aria-label="${esc(l)}">${esc(l)}</button>`).join("")}</div>
      <div class="exrow"><button class="btn light" type="button" data-j2go aria-label="Jouer à ${esc(o.titre)}">Jouer</button></div>`:`<p class="muted">${o.vide||"Pas encore de cartes pour ta classe. Choisis ta classe dans ton profil."}</p>`}</div>`;
    box.querySelector("[data-j2back]").onclick=()=>P26ui.retour();
    box.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{G.src=b.dataset.src;o.re()});
    const g=box.querySelector("[data-j2go]");if(g)g.onclick=()=>o.go()}
  function fin(G,box,o){G.on=false;G.fin=true;stop(G);
    box.innerHTML=`<div class="result j2fin" data-j2fin="${G.nom}"><p class="muted">${o.sur}</p>${o.haut||""}<div class="sc">${o.sc}</div><p>${o.sous}</p>${o.extra||""}
      <p class="j2xp">${o.xp?`+${fmtN(o.xp)} XP`:o.n?"XP du jour au plafond : pas d’XP en plus":"Pas d’XP cette fois"}</p>
      <p>${o.rec}</p><div class="exrow" style="justify-content:center"><button class="btn light" type="button" data-j2re aria-label="Rejouer">Rejouer</button><button class="btn ghost" type="button" data-j2out aria-label="Retour au menu du jeu">Retour</button></div></div>`;
    box.querySelector("[data-j2re]").onclick=o.re;box.querySelector("[data-j2out]").onclick=o.out;
    if(!reduce){const sc=box.querySelector(".sc");if(sc&&sc.animate)sc.animate([{opacity:0,transform:"scale(.94)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE_OUT})}}
  const vue=(nom,titre,G,acc)=>P26ui.vue(nom,{titre,
    rendre(box){G.box=box;if(G.on||(G.fin&&box.querySelector(".j2fin")))return;acc(box)},
    occupe(){return G.on},quitter(){G.on=false;G.fin=false;stop(G)}});

  /* ================= 1. MEMORY ================= */
  const MEM=Object.assign(jeu("memory"),{cs:[],ouv:[],paires:0,coups:0,t0:0,bloque:false,NP:6});
  const memOk=x=>x.c.r.length<=44&&x.c.v.length<=90&&!/[<>]/.test(x.c.r+x.c.v);
  const memPool=mid=>(mid==="*"?partout(cartesDe):cartesDe(mid)).filter(memOk);
  function memAcc(box){const L=sources(memPool,MEM.NP);pris(MEM,L);
    accueil(MEM,box,{titre:"Memory",regle:"Toutes les cartes sont face cachée. Retourne-en deux : une question et sa réponse forment une paire. Trouve les 6 paires en un minimum de coups.",
      rec:rec("mem")?`Record : <b>${fmtN(rec("mem"))}</b> coups`:"",cle:"mem",src:L,re:()=>memAcc(box),go:()=>memGo(box)})}
  function memTirer(){const vus=new Set(),out=[];for(const x of shuffle(memPool(MEM.src))){const a=norm(x.c.r),b=norm(x.c.v);if(vus.has(a)||vus.has(b))continue;vus.add(a);vus.add(b);out.push(x);if(out.length>=MEM.NP)break}return out}
  function memGo(box){const L=memTirer();if(L.length<MEM.NP){memAcc(box);return}
    MEM.cs=shuffle(L.flatMap(x=>[{id:x.c.id,k:"q",t:x.c.r,l:x.c.q||"Question",mat:x.mat},{id:x.c.id,k:"r",t:x.c.v,l:"Réponse",mat:x.mat}]));
    Object.assign(MEM,{on:true,fin:false,ouv:[],paires:0,coups:0,t0:Date.now(),bloque:false});stop(MEM);
    box.innerHTML=`<div class="j2 j2mem"><div class="role j2top"><span>Memory</span><span>Paires <b data-j2p>0</b> / ${MEM.NP} · Coups <b data-j2k>0</b></span></div>
      <div class="j2grid" role="group" aria-label="Cartes du Memory">${MEM.cs.map((c,i)=>`<button type="button" class="j2c j2m" data-i="${i}" aria-label="Carte ${i+1}, face cachée">${carte(`<small>${esc(c.l)}</small><span class="j2t${c.k==="r"?" rep":""}">${tex(c.t)}</span>`,{fc:c.k==="q"?"j2q":"j2r"})}</button>`).join("")}</div>
      <div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-j2stop aria-label="Arrêter la partie">Arrêter</button></div></div>`;
    box.querySelectorAll(".j2m").forEach(b=>{const c=MEM.cs[+b.dataset.i];b.style.setProperty("--suit",suitOf(c.mat));b.onclick=()=>memClic(box,b)});
    box.querySelector("[data-j2stop]").onclick=()=>memAcc(box);
    if(!reduce)box.querySelectorAll(".j2m").forEach((b,i)=>{if(b.animate)b.animate([{opacity:0,transform:"translateY(10px) scale(.96)"},{opacity:1,transform:"none"}],{duration:260,delay:i*28,easing:EASE_OUT,fill:"backwards"})})}
  function memClic(box,b){if(!vit(MEM,box)||MEM.bloque)return;const i=+b.dataset.i;if(b.classList.contains("vue")||b.classList.contains("paire"))return;
    const c=MEM.cs[i];b.classList.add("vue");b.setAttribute("aria-label",`Carte ${i+1} : ${plat(c.l)}, ${plat(c.t)}`);buzz(6);MEM.ouv.push(i);if(MEM.ouv.length<2)return;
    MEM.coups++;const [x,y]=MEM.ouv;MEM.ouv=[];const bx=box.querySelector(`.j2m[data-i="${x}"]`),by=b;const k=box.querySelector("[data-j2k]");if(k)k.textContent=MEM.coups;
    if(MEM.cs[x].id===MEM.cs[y].id){MEM.paires++;const p=box.querySelector("[data-j2p]");if(p)p.textContent=MEM.paires;buzz(14);try{snd()}catch(e){}
      apres(MEM,box,tard(380),()=>{[bx,by].forEach(e=>{e.classList.add("paire");e.setAttribute("aria-label",e.getAttribute("aria-label")+" (paire trouvée)")})});
      if(MEM.paires>=MEM.NP){MEM.bloque=true;apres(MEM,box,tard(900),()=>memFin(box))}return}
    MEM.bloque=true;apres(MEM,box,tard(950),()=>{[bx,by].forEach((e,n)=>{e.classList.remove("vue");e.setAttribute("aria-label",`Carte ${[x,y][n]+1}, face cachée`)});MEM.bloque=false})}
  function memFin(box){const n=MEM.coups,ms=Date.now()-MEM.t0,r0=rec("mem"),neuf=noter("mem",n);
    const dem=MEM.NP+(n<=9?4:n<=12?2:0),xp=gagne(dem,box.querySelector(".j2grid"));if(n<=9)titre("elephant");
    fin(MEM,box,{sur:"Les 6 paires sont trouvées.",sc:fmtN(n),sous:`coups, en ${fmtN(Math.round(ms/1000))} secondes`,xp,n:dem,rec:neuf?"<b>Nouveau record !</b>":"Record : "+fmtN(rec("mem"))+" coups",re:()=>memGo(box),out:()=>memAcc(box)});
    finir("memory",{coups:n,record:neuf},n<=10&&(neuf||!r0),box)}
  vue("memory","Memory",MEM,memAcc);

  /* ================= 2. CARTES À TROUS ================= */
  const TR=Object.assign(jeu("trous"),{L:[],i:0,ok:0,tq:0,NQ:8});
  const trSimple=x=>!estVerbes(x.ch)&&!/[$<>]/.test(x.c.v)&&x.c.v.length>=40&&!/^(Traduis|Utilise|Construis)/.test(x.c.q||"");
  const EXEMPLE=/^(Ex|Ej|Bsp|Es|E\.g)\b\.?\s*:?/i;
  const trPool=mid=>(mid==="*"?partout(cartesDe):cartesDe(mid)).filter(trSimple);
  const motsDe=s=>String(s).split(/[^\p{L}]+/u).filter(w=>w.length>=6&&MOT.test(w)&&!/^\p{Lu}/u.test(w)&&!STOP.has(norm(w)));
  function trBanque(pool){const m=new Map();for(const x of pool)for(const w of motsDe(x.c.v)){const k=norm(w);if(!m.has(k))m.set(k,w)}return [...m.values()]}
  function trItem(x,banque){const c=x.c,ph=phrases(c.v).filter(s=>s.length>=30&&s.length<=220&&!EXEMPLE.test(s));if(!ph.length)return null;const s=ph[0],toks=s.split(/([\p{L}]+)/u),rN=norm(c.r);
    const cand=[];for(let i=1;i<toks.length;i+=2){const w=toks[i];if(w.length<6||/^\p{Lu}/u.test(w)||STOP.has(norm(w))||rN.includes(norm(w).slice(0,5)))continue;cand.push(i)}
    if(!cand.length)return null;cand.sort((a,b)=>toks[b].length-toks[a].length);const i=cand[alea(Math.min(3,cand.length))],mot=toks[i],mN=norm(mot);
    const dans=new Set(motsDe(s).map(norm)),pl=w=>/[sx]$/.test(w),fem=w=>/e$/.test(w);
    const ok=(w,ecart)=>{const n=norm(w);return n!==mN&&!dans.has(n)&&Math.abs(w.length-mot.length)<=ecart&&pl(n)===pl(mN)};
    let d=[];for(const ecart of [2,4,8]){d=shuffle(banque.filter(w=>ok(w,ecart)&&fem(norm(w))===fem(mN)));if(d.length<3)d=shuffle(banque.filter(w=>ok(w,ecart)));if(d.length>=3)break}
    const vus=new Set(),d3=[];for(const w of d){const n=norm(w);if(vus.has(n))continue;vus.add(n);d3.push(w);if(d3.length===3)break}
    if(d3.length<3)return null;
    return {id:c.id,r:c.r,mat:x.mat,av:toks.slice(0,i).join(""),ap:toks.slice(i+1).join(""),mot,opts:shuffle([mot,...d3])}}
  J.trItem=trItem;J.trBanque=trBanque;J.trPool=trPool;
  function trAcc(box){const L=sources(trPool,TR.NQ);pris(TR,L);
    accueil(TR,box,{titre:"Cartes à trous",regle:"Une phrase de cours, un mot caché sous une carte. Choisis le bon mot parmi quatre. 8 phrases par partie.",
      rec:rec("ct")?`Record : <b>${rec("ct")}</b> / 8`:"",cle:"ct",src:L,re:()=>trAcc(box),go:()=>trGo(box)})}
  function trGo(box){const pool=trPool(TR.src),B={},L=[],vus=new Set();
    for(const x of shuffle(pool)){if(vus.has(x.c.id))continue;const banque=B[x.mat]=B[x.mat]||trBanque(trPool(x.mat));const it=trItem(x,banque);if(it){vus.add(x.c.id);L.push(it)}if(L.length>=TR.NQ)break}
    if(L.length<4){trAcc(box);return}Object.assign(TR,{L,i:0,ok:0,on:true,fin:false});stop(TR);trQ(box)}
  function trQ(box){const it=TR.L[TR.i];TR.tq=Date.now();JT=TR.tq;
    box.innerHTML=`<div class="j2 j2tr"><div class="qcard" style="--suit:${suitOf(it.mat)}"><div class="role"><span>Cartes à trous · ${TR.i+1} / ${TR.L.length}</span><span>${TR.ok} juste${TR.ok>1?"s":""}</span></div>
      <h3 class="j2tit">${tex(it.r)}</h3><p class="j2phr">${esc(it.av)}<span class="j2c j2trou" style="--w:${Math.max(4,it.mot.length)}ch" aria-label="mot caché">${carte(`<b>${esc(it.mot)}</b>`)}</span>${esc(it.ap)}</p>
      <div class="j2opts">${it.opts.map((w,k)=>`<button class="opt" type="button" data-k="${k}" aria-label="Choisir le mot ${esc(w)}">${esc(w)}</button>`).join("")}</div>
      <div class="j2suite" aria-live="polite"></div></div><div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-j2stop aria-label="Arrêter la partie">Arrêter</button></div></div>`;
    const bs=[...box.querySelectorAll(".j2opts .opt")];bs.forEach(b=>b.onclick=()=>trRep(box,bs,b));box.querySelector("[data-j2stop]").onclick=()=>trAcc(box)}
  function trRep(box,bs,b){if(!vit(TR,box)||bs.some(x=>x.disabled))return;const it=TR.L[TR.i],w=it.opts[+b.dataset.k],good=w===it.mot,ms=Math.min(600000,Date.now()-TR.tq);
    jrn("trou."+it.id,good,ms,"quiz");if(good)TR.ok++;
    bs.forEach(x=>{x.disabled=true;if(it.opts[+x.dataset.k]===it.mot)x.classList.add("good");else if(x===b)x.classList.add("bad")});
    reactOpt(b,good,bs.find(x=>it.opts[+x.dataset.k]===it.mot));
    const t=box.querySelector(".j2trou");if(t){t.classList.add("vue",good?"bon":"faux");t.setAttribute("aria-label","mot caché : "+it.mot)}
    const der=TR.i>=TR.L.length-1,suite=()=>{TR.i++;if(TR.i>=TR.L.length)trFin(box);else trQ(box)};
    if(good){apres(TR,box,tard(1000),suite);return}
    const s=box.querySelector(".j2suite");if(s){s.innerHTML=`<button class="btn" type="button" data-j2next aria-label="${der?"Voir le résultat":"Phrase suivante"}">${der?"Voir le résultat":"Suivante"}</button>`;s.querySelector("button").onclick=()=>{if(vit(TR,box))suite()}}}
  function trFin(box){const n=TR.ok,T=TR.L.length,neuf=noter("ct",n),dem=n+(n===T?2:0),xp=gagne(dem,box);
    fin(TR,box,{sur:"Partie terminée.",sc:`${n}<small>/${T}</small>`,sous:n>1?"mots retrouvés":"mot retrouvé",xp,n:dem,rec:neuf?"<b>Nouveau record !</b>":"Record : "+rec("ct")+" / 8",re:()=>trGo(box),out:()=>trAcc(box)});
    finir("trous",{bonnes:n,sur:T},n===T&&T>=8,box)}
  vue("trous","Cartes à trous",TR,trAcc);

  /* ================= 3. PENDU ================= */
  const PE=Object.assign(jeu("pendu"),{L:[],i:0,ok:0,err:0,vus:null,tq:0,NM:5,ERR:7,fini:false});
  const lettresOk=s=>/^[a-z]+$/.test(norm(s).replace(/[ '’-]/g,""));
  function motDe(r){const t=String(r).replace(/\s*\([^)]*\)\s*$/,"").trim();const n=norm(t).replace(/[^a-z]/g,"").length;
    if(n<4||t.length>18||t.split(/\s+/).length>2||!lettresOk(t)||/^[-'’ ]|[-'’ ]$/.test(t))return "";return t}
  J.motDe=motDe;
  const peVoc=mid=>cartesDe(mid).filter(x=>!estVerbes(x.ch)).map(x=>({x,mot:motDe(x.c.r)})).filter(o=>o.mot&&o.x.c.v.length>=8);
  const ensembles=()=>{try{return typeof verbSets==="function"?verbSets():[]}catch(e){return []}};
  const vData=set=>{try{return typeof vbData==="function"?vbData(set):null}catch(e){return null}};
  function peVerbes(set){const d=vData(set);if(!d)return [];const out=[];
    d.verbes.forEach(v=>(v.f||[]).forEach((f,i)=>{const col=(d.cols||[])[i]||"";if(set==="verbes-ang"&&/^Base/.test(col))return;f=String(f||"").trim();
      if(!f||/[\/ ]/.test(f)||!lettresOk(f)||norm(f).length<3||norm(f)===norm(v.inf))return;
      out.push({id:"verbe."+set+"."+norm(v.inf).replace(/[^a-z]/g,"")+"."+i,mot:f,ind:`${v.inf} (${v.fr}) · ${col} ?`,verbe:true,lang:VERB_HTML_LANG[set]||"",mat:""})}));return out}
  function peSources(){const L=mats().filter(m=>peVoc(m.id).length>=PE.NM).map(m=>[m.id,m.court||m.nom]);
    ensembles().forEach(s=>L.push(["v:"+s,"Verbes "+String(VERB_LANG[s]||s).toLowerCase()]));return L.length?[["*","Toutes mes matières"],...L]:[]}
  function pePool(src){if(src.startsWith("v:"))return peVerbes(src.slice(2));
    const voc=(src==="*"?partout(peVoc):peVoc(src)).map(o=>({id:"pendu."+o.x.c.id,cid:o.x.c.id,mot:o.mot,ind:court(masquer(o.x.c.v,o.mot),170),q:o.x.c.q||"",mat:o.x.mat}));
    return src==="*"?voc.concat(ensembles().flatMap(peVerbes).filter(()=>Math.random()<.15)):voc}
  J.pePool=pePool;
  function peAcc(box){ensembles().forEach(s=>{if(!vData(s)&&typeof progFetch==="function")progFetch(s,()=>{if(PE.box===box&&!PE.on&&!PE.fin&&box.isConnected&&box.dataset.vue==="pendu")peAcc(box)})});
    const L=peSources();pris(PE,L);
    accueil(PE,box,{titre:"Pendu",regle:"Trouve le mot lettre par lettre. Chaque lettre est une carte face cachée. 7 erreurs et le pendu est complet. 5 mots par partie : vocabulaire des cours ou verbes irréguliers.",
      rec:rec("pe")?`Record : <b>${rec("pe")}</b> / 5`:"",cle:"pe",src:L,re:()=>peAcc(box),go:()=>peGo(box)})}
  function peGo(box){const vus=new Set(),L=[];for(const o of shuffle(pePool(PE.src))){const k=norm(o.mot);if(vus.has(k))continue;vus.add(k);L.push(o);if(L.length>=PE.NM)break}
    if(L.length<3){peAcc(box);return}Object.assign(PE,{L,i:0,ok:0,on:true,fin:false});stop(PE);peMot(box)}
  const CLAV=["AZERTYUIOP","QSDFGHJKLM","WXCVBN"];
  const lettre=ch=>norm(ch).replace(/[^a-z]/g,"");
  function peSvg(){return `<svg class="j2pendu" viewBox="0 0 120 120" aria-hidden="true">${[
    "M10 112H78","M26 112V10","M26 10H84M26 30L46 10","M84 10V28","C","M84 48V78","M84 56L70 68M84 56L98 68M84 78L72 98M84 78L96 98"]
    .map((d,i)=>`<g data-e="${i+1}">${d==="C"?`<circle pathLength="1" cx="84" cy="38" r="10"/>`:`<path pathLength="1" d="${d}"/>`}</g>`).join("")}</svg>`}
  function peMot(box){const o=PE.L[PE.i];PE.err=0;PE.vus=new Set();PE.fini=false;PE.tq=Date.now();JT=PE.tq;
    let k=0;const cases=o.mot.split(" ").map(w=>`<span class="j2w">${[...w].map(ch=>{k++;return lettre(ch)?`<span class="j2c j2l" data-k="${k}" data-l="${lettre(ch)}">${carte(esc(ch.toUpperCase()))}</span>`:`<span class="j2sg">${esc(ch)}</span>`}).join("")}</span>`).join("");
    const lmax=Math.max(...o.mot.split(" ").map(w=>w.length));
    box.innerHTML=`<div class="j2 j2pe"${o.mat?` style="--suit:${suitOf(o.mat)}"`:""}><div class="role j2top"><span>Pendu · mot ${PE.i+1} / ${PE.L.length}</span><span><b>${PE.ok}</b> trouvé${PE.ok>1?"s":""} · <b data-j2e>${PE.ERR}</b> essais</span></div>
      <div class="j2peh">${peSvg()}<div class="j2ind"><small>${o.verbe?"Verbe irrégulier":esc(o.q||"Indice")}</small><p${o.lang&&o.verbe?` lang="fr"`:""}>${tex(o.ind)}</p></div></div>
      <div class="j2mot" style="--n:${lmax}" role="group" aria-label="Mot de ${[...o.mot].filter(lettre).length} lettres"${o.lang?` lang="${o.lang}"`:""}>${cases}</div>
      <div class="j2suite" aria-live="polite"></div>
      <div class="j2clav" role="group" aria-label="Clavier">${CLAV.map(r=>`<div>${[...r].map(l=>`<button type="button" data-l="${l.toLowerCase()}" aria-label="Lettre ${l}">${l}</button>`).join("")}</div>`).join("")}</div>
      <div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-j2stop aria-label="Arrêter la partie">Arrêter</button></div></div>`;
    box.querySelectorAll(".j2clav [data-l]").forEach(b=>b.onclick=()=>peLettre(box,b.dataset.l));box.querySelector("[data-j2stop]").onclick=()=>peAcc(box)}
  function peLettre(box,l){if(!vit(PE,box)||PE.fini||!/^[a-z]$/.test(l)||PE.vus.has(l))return;PE.vus.add(l);const o=PE.L[PE.i];
    const k=box.querySelector(`.j2clav [data-l="${l}"]`),cs=[...box.querySelectorAll(`.j2l[data-l="${l}"]`)];if(k)k.disabled=true;
    if(cs.length){if(k)k.classList.add("bon");buzz(8);cs.forEach((c,n)=>{if(reduce)c.classList.add("vue");else apres(PE,box,n*70,()=>c.classList.add("vue"))});
      if([...box.querySelectorAll(".j2l")].every(c=>PE.vus.has(c.dataset.l))){PE.fini=true;PE.ok++;jrn(o.id,true,Math.min(600000,Date.now()-PE.tq),o.verbe?"verbe":"quiz");try{snd()}catch(e){}
        const s=box.querySelector(".j2suite");if(s)s.innerHTML=`<p class="j2bravo">Trouvé : <b>${esc(o.mot)}</b></p>`;apres(PE,box,tard(1100),()=>peSuite(box))}return}
    if(k)k.classList.add("faux");PE.err++;buzz([8,60,8]);const g=box.querySelector(`.j2pendu [data-e="${PE.err}"]`);if(g)g.classList.add("on");
    const e=box.querySelector("[data-j2e]");if(e)e.textContent=PE.ERR-PE.err;
    if(PE.err>=PE.ERR){PE.fini=true;jrn(o.id,false,Math.min(600000,Date.now()-PE.tq),o.verbe?"verbe":"quiz");
      box.querySelectorAll(".j2l:not(.vue)").forEach(c=>c.classList.add("vue","rate"));box.querySelectorAll(".j2clav button").forEach(b=>b.disabled=true);
      const der=PE.i>=PE.L.length-1,s=box.querySelector(".j2suite");
      if(s){s.innerHTML=`<p>Le mot était <b>${esc(o.mot)}</b>.</p><button class="btn light" type="button" aria-label="${der?"Voir le résultat":"Mot suivant"}">${der?"Voir le résultat":"Mot suivant"}</button>`;s.querySelector("button").onclick=()=>{if(vit(PE,box))peSuite(box)}}}}
  function peSuite(box){PE.i++;if(PE.i>=PE.L.length)peFin(box);else peMot(box)}
  function peFin(box){const n=PE.ok,T=PE.L.length,neuf=noter("pe",n),dem=2*n,xp=gagne(dem,box);
    fin(PE,box,{sur:"Partie terminée.",sc:`${n}<small>/${T}</small>`,sous:n>1?"mots trouvés":"mot trouvé",xp,n:dem,rec:neuf?"<b>Nouveau record !</b>":"Record : "+rec("pe")+" / 5",re:()=>peGo(box),out:()=>peAcc(box)});
    finir("pendu",{trouves:n,sur:T},n===T&&T>=5,box)}
  addEventListener("keydown",e=>{if(!PE.on||PE.fini||typeof view==="undefined"||view!=="mod"||!PE.box||PE.box.dataset.vue!=="pendu"||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return;const l=lettre(e.key||"");if(l.length===1){e.preventDefault();peLettre(PE.box,l)}});
  vue("pendu","Pendu",PE,peAcc);

  /* ================= 4. QUI SUIS-JE ? ================= */
  const QS=Object.assign(jeu("quisuisje"),{L:[],i:0,pts:0,k:1,tq:0,NQ:5});
  const defs=mid=>cartesDe(mid).filter(x=>x.ch.origin==="prog"&&!estVerbes(x.ch)&&/^pb\./.test(x.c.id)&&x.c.q==="Définis"&&x.c.v.length>=30&&x.c.r.length<=60);
  // Indices, du plus vague au plus précis : où se trouve la notion, un morceau de sa définition, la définition, la forme du mot.
  const maj=t=>String(t).replace(/^\s*\p{Ll}/u,a=>a.toUpperCase());
  function coupe(s){const L=[];const re=/\s:\s|\s;\s|,\s/g;let m;while((m=re.exec(s)))L.push([m.index,m[0].length]);
    const bons=L.filter(([i])=>i>=s.length*.3&&i<=s.length*.7).sort((a,b)=>Math.abs(a[0]-s.length/2)-Math.abs(b[0]-s.length/2));
    return bons.length?maj(s.slice(bons[0][0]+bons[0][1])):""}
  function indices(x){const c=x.c,m=t=>masquer(t||"",c.r),ph=phrases(m(c.v));
    const chap=x.ch.titre||x.ch.court||"",th=x.p&&x.p.nom&&!/^(notions?|définitions?|vocabulaire|repères|dates|personnages|cours|essentiel|bases?|à retenir)$/i.test(String(x.p.nom).trim())?x.p.nom:"",lieu=[matNom(x.mat),chap&&"chapitre « "+m(chap)+" »"].filter(Boolean).join(", ");
    const L=[];
    if(ph.length>=2){L.push(`Je suis une notion de ${lieu}${th?", thème « "+m(th)+" »":""}.`);L.push(ph.slice(1).join(" "));L.push(ph[0])}
    else{const s=ph[0]||"",bout=coupe(s);
      if(bout){L.push(`Je suis une notion de ${lieu}${th?", thème « "+m(th)+" »":""}.`);L.push(bout);L.push(s)}
      else{L.push(`Je suis une notion de ${lieu}.`);L.push(th?`Mon thème : « ${m(th)} ».`:`Mon chapitre : « ${m(chap)} ».`);L.push(s)}}
    const mots=String(c.r).trim().split(/\s+/),nl=[...String(c.r)].filter(ch=>/\p{L}/u.test(ch)).length,init=(String(c.r).trim().match(/\p{L}/u)||["?"])[0].toUpperCase();
    L.push(`Mon nom : ${mots.length>1?mots.length+" mots, ":""}${nl} lettres, il commence par « ${init} ».`);return L.map(t=>court(t,240))}
  J.indices=indices;
  function qsItem(x,pool){const meme=pool.filter(y=>y.c.id!==x.c.id&&norm(y.c.r)!==norm(x.c.r)),ch=shuffle(meme.filter(y=>y.ch===x.ch)),au=shuffle(meme.filter(y=>y.ch!==x.ch));
    const vus=new Set([norm(x.c.r)]),o=[];for(const y of ch.concat(au)){const n=norm(y.c.r);if(vus.has(n))continue;vus.add(n);o.push(y.c.r);if(o.length===3)break}
    if(o.length<3)return null;return {id:x.c.id,r:x.c.r,mat:x.mat,ind:indices(x),opts:shuffle([x.c.r,...o])}}
  function qsAcc(box){const L=sources(defs,QS.NQ);pris(QS,L);
    accueil(QS,box,{titre:"Qui suis-je ?",regle:"Une notion du Programme se cache derrière quatre cartes indices, de la plus difficile à la plus facile. Réponds dès que tu sais : 4 points au premier indice, puis 3, 2, 1. 5 notions par partie.",
      rec:rec("qs")?`Record : <b>${rec("qs")}</b> / 20`:"",cle:"qs",src:L,re:()=>qsAcc(box),go:()=>qsGo(box)})}
  function qsGo(box){const L=[],vus=new Set();const bymat={};const pool=QS.src==="*"?partout(defs):defs(QS.src);
    for(const x of shuffle(pool)){if(vus.has(x.c.id))continue;const P0=bymat[x.mat]=bymat[x.mat]||defs(x.mat);const it=qsItem(x,P0.length>=4?P0:pool);if(it){vus.add(x.c.id);L.push(it)}if(L.length>=QS.NQ)break}
    if(L.length<3){qsAcc(box);return}Object.assign(QS,{L,i:0,pts:0,on:true,fin:false});stop(QS);qsQ(box)}
  function qsQ(box){const it=QS.L[QS.i];QS.k=1;QS.tq=Date.now();JT=QS.tq;
    box.innerHTML=`<div class="j2 j2qs" style="--suit:${suitOf(it.mat)}"><div class="role j2top"><span>Qui suis-je ? · ${QS.i+1} / ${QS.L.length}</span><span><b>${QS.pts}</b> point${QS.pts>1?"s":""}</span></div>
      <ol class="j2ind4">${it.ind.map((t,k)=>{const pts=`${4-k} point${4-k>1?"s":""}`;return `<li class="j2c j2i${k===0?" vue":""}" data-k="${k}">${carte(`<small>Indice ${k+1} · ${pts}</small><span>${tex(t)}</span>`,{back:`<span class="j2back j2pan" aria-hidden="true">${dos(monDos(),"j2pc")}<b>Indice ${k+1}</b><small>${pts}</small></span>`})}</li>`}).join("")}</ol>
      <div class="exrow j2plus"><button class="btn ghost" type="button" data-j2plus aria-label="Retourner l’indice suivant, un point de moins">Indice suivant · −1 point</button></div>
      <div class="j2opts j2opts1">${it.opts.map((w,k)=>`<button class="opt" type="button" data-k="${k}" aria-label="Je suis : ${lab(w)}">${tex(w)}</button>`).join("")}</div>
      <div class="j2suite" aria-live="polite"></div><div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-j2stop aria-label="Arrêter la partie">Arrêter</button></div></div>`;
    box.querySelector("[data-j2plus]").onclick=()=>qsPlus(box);const bs=[...box.querySelectorAll(".j2opts .opt")];bs.forEach(b=>b.onclick=()=>qsRep(box,bs,b));
    box.querySelector("[data-j2stop]").onclick=()=>qsAcc(box)}
  function qsPlus(box){if(!vit(QS,box)||QS.k>=4)return;const c=box.querySelector(`.j2i[data-k="${QS.k}"]`);if(c)c.classList.add("vue");QS.k++;buzz(6);
    if(QS.k>=4){const b=box.querySelector("[data-j2plus]");if(b){b.disabled=true;b.textContent="Dernier indice"}}}
  function qsRep(box,bs,b){if(!vit(QS,box)||bs.some(x=>x.disabled))return;const it=QS.L[QS.i],w=it.opts[+b.dataset.k],good=w===it.r,gain=good?5-QS.k:0;
    jrn("qui."+it.id,good,Math.min(600000,Date.now()-QS.tq),"quiz");QS.pts+=gain;
    bs.forEach(x=>{x.disabled=true;if(it.opts[+x.dataset.k]===it.r)x.classList.add("good");else if(x===b)x.classList.add("bad")});reactOpt(b,good,bs.find(x=>it.opts[+x.dataset.k]===it.r));
    box.querySelectorAll(".j2i").forEach((c,n)=>{if(reduce)c.classList.add("vue");else apres(QS,box,n*90,()=>c.classList.add("vue"))});const pl=box.querySelector("[data-j2plus]");if(pl)pl.disabled=true;
    const der=QS.i>=QS.L.length-1,s=box.querySelector(".j2suite");
    if(s){s.innerHTML=`<p>${good?`<b>+${gain} point${gain>1?"s":""}</b>`:`C’était <b>${tex(it.r)}</b>.`}</p><button class="btn" type="button" aria-label="${der?"Voir le résultat":"Notion suivante"}">${der?"Voir le résultat":"Suivante"}</button>`;
      s.querySelector("button").onclick=()=>{if(!vit(QS,box))return;QS.i++;if(QS.i>=QS.L.length)qsFin(box);else qsQ(box)}}}
  function qsFin(box){const n=QS.pts,T=QS.L.length*4,neuf=noter("qs",n),dem=Math.ceil(n/2),xp=gagne(dem,box);if(n>=16)titre("detective");
    fin(QS,box,{sur:"Partie terminée.",sc:`${n}<small>/${T}</small>`,sous:"points",xp,n:dem,rec:neuf?"<b>Nouveau record !</b>":"Record : "+rec("qs")+" / 20",re:()=>qsGo(box),out:()=>qsAcc(box)});
    finir("quisuisje",{points:n,sur:T},n>=16,box)}
  vue("quisuisje","Qui suis-je ?",QS,qsAcc);

  /* ================= 5. BATAILLE ROYALE (seul contre des Bots) ================= */
  // Chaque manche : une question, chacun pose sa réponse face cachée. Erreur ou temps écoulé : éliminé.
  // La réponse juste la plus rapide gagne la manche (une couronne). Si personne n'a juste, la manche est rejouée.
  // À partir de la manche 8 (mort subite), le plus lent des justes sort aussi. Dernier debout : vainqueur.
  const BR=Object.assign(jeu("royale"),{js:[],pool:[],pi:0,manche:0,q:null,opts:null,mat:"",t0:0,phase:"",moi:null,DUREE:15000,MORT:8,NB:5});
  const BOTS=["Bot Atlas","Bot Iris","Bot Kiwi","Bot Lumen","Bot Orion","Bot Nova","Bot Pixel","Bot Zéphyr"];
  const quizDe=mid=>{try{return seriesOf(mid).flatMap(x=>(x.s.qs||[]).map(q=>({q,mat:mid}))).filter(x=>x.q&&x.q.id&&x.q.q&&x.q.ok&&(x.q.no||[]).length>=1)}catch(e){return []}};
  function bots(n){const s=S2(),cat=s&&Array.isArray(s.catalogue)?s.catalogue:[],sk=shuffle(cat).slice(0,n),noms=shuffle(BOTS).slice(0,n);
    const base=typeof DOS!=="undefined"?DOS.map(d=>d.id).filter(d=>d!=="classique"):[],deja=new Set([monDos()]);
    return noms.map((nick,i)=>{const s0=sk[i]||null;let a=null;try{a=typeof avRand==="function"?avRand():null}catch(e){}
      let d=s0&&(i%2===0||!base.length)?s0.dos:base.filter(x=>!deja.has(x))[0]||(s0?s0.dos:"classique");if(deja.has(d)&&s0)d=s0.dos;d=dosOk(d);deja.add(d);
      return {id:"bot-"+(i+1),nick,bot:true,avk:a?{t:"b",a}:null,skn:s0?s0.id:"",cad:s0&&i%3!==2?s0.cad:"",dos:d,acc:.6+Math.random()*.28,mu:3000+Math.random()*4500,vivant:true,cour:0,bonnes:0,out:0,place:0,plan:null,pose:false}})}
  J.bots=bots;
  function brAv(j){if(j.me)return monAv("sm");try{return avHTML({id:j.id,nick:j.nick,avk:j.avk,skn:j.skn,cad:j.cad},"sm")}catch(e){return ""}}
  function brAcc(box){const L=sources(quizDe,10);pris(BR,L);const B=BR.apercu=BR.apercu&&BR.apercu.length===BR.NB?BR.apercu:bots(BR.NB);
    accueil(BR,box,{titre:"Bataille royale",regle:"Toi contre 5 Bots. À chaque manche, tout le monde pose sa réponse face cachée. Une erreur ou le temps écoulé : éliminé. La réponse juste la plus rapide gagne une couronne. À partir de la manche 8, le plus lent sort aussi. Dernier debout : vainqueur.",
      hero:`<div class="j2bots" aria-label="Tes adversaires">${B.map(j=>`<span class="j2bot">${brAv(j)}${dos(j.dos,"j2mini")}<b>${esc(j.nick)}</b></span>`).join("")}</div>`,
      rec:rec("br")||rec("bp")?`Victoires : <b>${fmtN(rec("br"))}</b>${rec("bp")?` · meilleure place : ${rec("bp")}e`:""}`:"",cle:"br",src:L,
      vide:"Pas encore de quiz pour ta classe. Choisis ta classe dans ton profil.",re:()=>brAcc(box),go:()=>brGo(box)});
    const p=box.querySelector(".lgsub");if(p)p.insertAdjacentHTML("afterend",`<p class="j2note">En solo, les adversaires sont des Bots, simulés sur ton téléphone.</p>`);
    amisBloc(box)}
  /* Entre amis : partie en direct (module royale-amis.js, chargé à la demande), 2 à 8 joueurs avec un code. */
  function amisBloc(box){const acc=box.querySelector(".j2acc");if(!acc)return;
    const d=document.createElement("section");d.className="j2amis";d.setAttribute("aria-label","Bataille royale entre amis");
    d.innerHTML=`<div class="j2amh"><b>Entre amis</b><span>2 à 8 joueurs en direct</span></div>
      <p>Crée une partie et donne le code à tes amis. Les places vides peuvent être prises par des Bots. Pas d’Elo, mais des XP comme en solo.</p>
      <div class="exrow"><button class="btn ghost" type="button" data-j2ra="creer" aria-label="Créer une partie entre amis">Créer une partie</button></div>
      <label class="lab" for="j2raCode">Ou rejoins avec un code</label>
      <div class="olrow"><input id="j2raCode" class="inp code" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="ABCDE" aria-label="Code de la partie"><button class="btn ghost" type="button" data-j2ra="rej" aria-label="Rejoindre la partie entre amis">Rejoindre</button></div>
      <p class="olerr" role="alert"></p>`;
    acc.appendChild(d);const err=d.querySelector(".olerr"),inp=d.querySelector("#j2raCode");
    const lancer=(host,code)=>{err.textContent="";const b=d.querySelectorAll("[data-j2ra]");b.forEach(x=>x.disabled=true);
      const fin=t=>{b.forEach(x=>x.disabled=false);if(t&&err.isConnected)err.textContent=t};
      (window.P26mod?P26mod("royale-amis"):Promise.reject(new Error("P26mod absent"))).then(()=>window.P2RA.entrer(host?"":code,{src:BR.src}).then(t=>fin(t||"")),()=>fin("Cette partie du site n’est pas disponible pour l’instant."))};
    d.querySelector('[data-j2ra="creer"]').onclick=()=>lancer(true);
    d.querySelector('[data-j2ra="rej"]').onclick=()=>{const c=String(inp.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(c.length!==5){err.textContent="Le code fait 5 caractères.";return}lancer(false,c)};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")d.querySelector('[data-j2ra="rej"]').click()})}
  function brGo(box){const pool=shuffle(BR.src==="*"?partout(quizDe):quizDe(BR.src));if(pool.length<10){brAcc(box);return}
    const moi={id:"moi",nick:"Toi",me:true,dos:monDos(),vivant:true,cour:0,bonnes:0,out:0,place:0,pose:false};
    Object.assign(BR,{js:[moi,...(BR.apercu||bots(BR.NB))],pool,pi:0,manche:0,moi,on:true,fin:false});BR.apercu=null;stop(BR);brManche(box)}
  function brTirer(){if(BR.pi>=BR.pool.length){BR.pool=shuffle(BR.pool);BR.pi=0}return BR.pool[BR.pi++]}
  function brPlan(j,opts){const iok=opts.findIndex(o=>o.ok),juste=Math.random()<j.acc;let ms=Math.round(j.mu*(.55+Math.random()*.9));if(ms>=BR.DUREE)ms=null;
    let i=iok;if(!juste){const f=opts.map((o,k)=>k).filter(k=>k!==iok);i=f[alea(f.length)]}return {ok:juste&&ms!=null,ms,i}}
  function brSieges(){return `<div class="j2table" role="list" aria-label="Les joueurs">${BR.js.map(j=>`<div class="j2seat${j.me?" moi":""}${j.vivant?"":" out"}" role="listitem" data-j="${j.id}" aria-label="${esc(j.nick)}${j.cour?", "+j.cour+" couronne"+(j.cour>1?"s":""):""}${j.vivant?"":", éliminé"}">
      <span class="j2av">${brAv(j)}${j.cour?`<i class="j2cr" aria-hidden="true">♛${j.cour>1?j.cour:""}</i>`:""}</span><b class="j2n">${esc(j.nick)}</b>
      <span class="j2c j2s" data-etat="${j.vivant?"vide":"out"}">${carte(`<b>?</b>`,{dos:j.dos})}</span></div>`).join("")}</div>`}
  function brManche(box){if(!vit(BR,box))return;BR.manche++;const x=brTirer();BR.q=x.q;BR.mat=x.mat;BR.opts=optsOf(x.q);BR.phase="q";BR.t0=Date.now();JT=BR.t0;
    BR.js.forEach(j=>{j.pose=false;j.plan=j.bot&&j.vivant?brPlan(j,BR.opts):null});BR.moi.plan=null;
    const viv=BR.js.filter(j=>j.vivant).length;
    box.innerHTML=`<div class="j2 j2br">${brSieges()}<p class="j2ban" role="status" aria-live="polite">Manche ${BR.manche}${BR.manche>=BR.MORT?" · mort subite":""}</p>
      <div class="qcard j2brq" style="--suit:${suitOf(BR.mat)}"><div class="role"><span>Manche ${BR.manche}</span><span>${viv} en jeu</span></div>
      <div class="arbar" data-j2bar style="--p:1"><i></i><b data-j2sec>15</b></div><h2>${tex(BR.q.q)}</h2>
      ${BR.opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}" aria-label="Réponse : ${lab(o.t)}">${tex(o.t)}</button>`).join("")}</div>
      <div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-j2stop aria-label="Abandonner la partie">Abandonner</button></div></div>`;
    const bs=[...box.querySelectorAll(".j2brq .opt")];bs.forEach(b=>b.onclick=()=>brRep(box,bs,b));
    box.querySelector("[data-j2stop]").onclick=()=>{if(!vit(BR,box))return;BR.moi.vivant=false;BR.moi.out=BR.manche;BR.moi.place=BR.js.filter(j=>j.vivant).length+1;brSimuler(box)};
    BR.js.forEach(j=>{if(j.plan&&j.plan.ms!=null)apres(BR,box,j.plan.ms,()=>{if(BR.phase==="q")brPose(box,j)})});
    clearInterval(BR.iv);BR.iv=setInterval(()=>brTic(box,bs),100);brTic(box,bs)}
  function brTic(box,bs){if(!vit(BR,box)||BR.phase!=="q"){clearInterval(BR.iv);return}const left=Math.max(0,BR.DUREE-(Date.now()-BR.t0));
    const bar=box.querySelector("[data-j2bar]");if(bar)bar.style.setProperty("--p",(left/BR.DUREE).toFixed(3));const s=box.querySelector("[data-j2sec]");if(s)s.textContent=Math.ceil(left/1000);
    if(left<=0&&!BR.moi.plan)brRep(box,bs,null)}
  function brPose(box,j){if(j.pose)return;j.pose=true;const c=box.querySelector(`.j2seat[data-j="${j.id}"] .j2s`);if(c){c.dataset.etat="pose";c.setAttribute("aria-label","a répondu")}}
  function brRep(box,bs,b){if(!vit(BR,box)||BR.phase!=="q"||BR.moi.plan)return;const ms=b?Math.min(BR.DUREE,Date.now()-BR.t0):null,i=b?+b.dataset.i:-1,ok=!!b&&!!BR.opts[i].ok;
    BR.moi.plan={ok,ms,i};jrn(BR.q.id,ok,ms,"quiz");bs.forEach(x=>{x.disabled=true;if(x===b)x.classList.add("choisi")});if(b){brPose(box,BR.moi);buzz(10)}
    BR.phase="attente";clearInterval(BR.iv);
    // Les Bots qui n'ont pas encore posé leur carte la posent vite (leur temps reste celui tiré au départ).
    const reste=BR.js.filter(j=>j.bot&&j.vivant&&!j.pose&&j.plan&&j.plan.ms!=null).sort((a,b)=>a.plan.ms-b.plan.ms);
    BR.tm.forEach(clearTimeout);BR.tm=[];reste.forEach((j,n)=>apres(BR,box,tard(160+n*120),()=>brPose(box,j)));
    apres(BR,box,tard(160+reste.length*120+520),()=>brReveler(box,bs))}
  function brReveler(box,bs){BR.phase="rev";const viv=BR.js.filter(j=>j.vivant),R=viv.map(j=>({j,ok:!!(j.plan&&j.plan.ok),ms:j.plan?j.plan.ms:null}));
    bs.forEach(x=>{const o=BR.opts[+x.dataset.i];if(o&&o.ok)x.classList.add("good");else if(x.classList.contains("choisi"))x.classList.add("bad")});
    R.forEach((x,n)=>{const c=box.querySelector(`.j2seat[data-j="${x.j.id}"] .j2s`);if(!c)return;const f=c.querySelector(".j2face");
      if(f)f.innerHTML=`<b>${x.ok?"✓":x.ms==null?"⏱":"✗"}</b>${x.ms!=null?`<small>${ms2s(x.ms)}</small>`:""}`;f.classList.add(x.ok?"bon":"faux");
      c.setAttribute("aria-label",x.ok?"juste en "+ms2s(x.ms):x.ms==null?"temps écoulé":"faux");
      const go=()=>{c.dataset.etat="vue";c.classList.add("vue")};if(reduce)go();else apres(BR,box,n*70,go)});
    R.forEach(x=>{if(x.ok)x.j.bonnes++});
    const justes=R.filter(x=>x.ok).sort((a,b)=>a.ms-b.ms);let elim=[],msg;
    if(!justes.length)msg="Personne n’a juste : la manche est rejouée.";
    else{elim=R.filter(x=>!x.ok).map(x=>x.j);justes[0].j.cour++;msg=(justes[0].j.me?"Tu gagnes":esc(justes[0].j.nick)+" gagne")+" la manche ♛";
      if(BR.manche>=BR.MORT&&justes.length>=2&&viv.length-elim.length>=2){const lent=justes[justes.length-1].j;elim.push(lent);msg+=` · mort subite : ${lent.me?"tu sors":esc(lent.nick)+" sort"}`}}
    const reste=viv.length-elim.length;elim.forEach(j=>{j.vivant=false;j.out=BR.manche;j.place=reste+1});
    if(elim.length&&!msg.includes("mort subite"))msg+=` · ${elim.length} éliminé${elim.length>1?"s":""}`;
    const ban=box.querySelector(".j2ban");if(ban){ban.innerHTML=msg;ban.classList.add("on")}
    apres(BR,box,tard(700),()=>{elim.forEach(j=>{const s=box.querySelector(`.j2seat[data-j="${j.id}"]`);if(s){s.classList.add("out");s.setAttribute("aria-label",j.nick+", éliminé")}});
      justes.slice(0,1).forEach(x=>{const a=box.querySelector(`.j2seat[data-j="${x.j.id}"] .j2av`);if(a){let i=a.querySelector(".j2cr");if(!i){i=document.createElement("i");i.className="j2cr";i.setAttribute("aria-hidden","true");a.appendChild(i)}i.textContent="♛"+(x.j.cour>1?x.j.cour:"");if(!reduce&&i.animate)i.animate([{transform:"scale(.4)",opacity:0},{transform:"scale(1.15)",opacity:1,offset:.6},{transform:"none"}],{duration:380,easing:EASE_OUT})}})});
    apres(BR,box,tard(2300),()=>{if(!BR.moi.vivant){brSimuler(box);return}if(BR.js.filter(j=>j.vivant).length<=1){BR.moi.place=1;brFin(box);return}brManche(box)})}
  // Je suis sorti : la fin de la partie entre Bots est jouée tout de suite, sans écran.
  function brSimuler(box){let k=0;while(BR.js.filter(j=>j.vivant).length>1&&k<80){k++;BR.manche++;const viv=BR.js.filter(j=>j.vivant);
      const R=viv.map(j=>{const p=brPlan(j,[{ok:1},{ok:0},{ok:0},{ok:0}]);return {j,ok:p.ok,ms:p.ms}}),justes=R.filter(x=>x.ok).sort((a,b)=>a.ms-b.ms);if(!justes.length)continue;
      justes[0].j.cour++;R.forEach(x=>{if(x.ok)x.j.bonnes++});const elim=R.filter(x=>!x.ok).map(x=>x.j);
      if(BR.manche>=BR.MORT&&justes.length>=2&&viv.length-elim.length>=2)elim.push(justes[justes.length-1].j);
      const reste=viv.length-elim.length;elim.forEach(j=>{j.vivant=false;j.out=BR.manche;j.place=reste+1})}
    const viv=BR.js.filter(j=>j.vivant).sort((a,b)=>b.cour-a.cour);viv.forEach((j,i)=>{j.place=i+1;if(i)j.vivant=false});brFin(box)}
  function brFin(box){const moi=BR.moi,place=moi.place||1,gagne1=place===1,T=BR.js.length;
    if(gagne1){victoire();titre("royale")}const meil=noter("bp",place);
    const dem=Math.min(15,moi.bonnes)+(gagne1?5:place<=3?2:0),xp=gagne(dem,box);
    const L=BR.js.slice().sort((a,b)=>(a.place||99)-(b.place||99)||b.cour-a.cour);
    const pod=`<ol class="j2pod">${L.map(j=>`<li class="${j.me?"me":""}${j.place===1?" un":""}"><span class="rk">${j.place}</span>${brAv(j)}<span class="bn">${esc(j.nick)}</span>${dos(j.dos,"j2mini")}<small>${j.place===1?"Vainqueur":"sorti manche "+j.out}${j.cour?" · ♛ "+j.cour:""}</small></li>`).join("")}</ol>`;
    fin(BR,box,{sur:gagne1?"Dernier debout !":`Éliminé à la manche ${moi.out}.`,haut:gagne1?`<p class="j2win">Victoire royale</p>`:"",sc:`${place}<sup>${place===1?"re":"e"}</sup>`,
      sous:`sur ${T} joueurs · ${moi.bonnes} bonne${moi.bonnes>1?"s":""} réponse${moi.bonnes>1?"s":""} · ${moi.cour} couronne${moi.cour>1?"s":""}`,extra:pod,xp,n:dem,
      rec:`Victoires : ${fmtN(rec("br"))}${meil&&!gagne1?" · <b>meilleure place !</b>":""}`,re:()=>brGo(box),out:()=>brAcc(box)});
    finir("royale",{place,joueurs:T,bonnes:moi.bonnes},gagne1,box)}
  vue("royale","Bataille royale",BR,brAcc);

  Object.assign(J,{MEM,TR,PE,QS,BR,rec,recs,memPool,defs,quizDe,peVoc,peVerbes});   // pour les tests
  // Outils partagés avec la Bataille royale entre amis (royale-amis.js)
  J.ui={dos,carte,eventail,monAv,brAv,monDos,dosOk,quizDe,partout,sources,pris,gagne,rec,recs,noter,victoire,titre,finir,tard,ms2s,lab,bots,BOTS};

  /* ================= Records chez les amis : classement entre amis, profil d'un ami ================= */
  const modeAmis=()=>{try{return LS.get("lgf","hub")==="amis"}catch(e){return false}};
  const amisOk=()=>{try{return (NT.amis||[]).filter(a=>a&&a.ok&&typeof a.id==="string"&&/^[0-9a-f-]{36}$/.test(a.id))}catch(e){return []}};
  const ligneDe=id=>(typeof LG!=="undefined"&&Array.isArray(LG.rows)?LG.rows:[]).find(r=>r&&r.id===id)||null;
  const pl=(n,mot)=>fmtN(n)+" "+mot+(n>1?"s":"");
  const JEUX=[["royale","Bataille royale","br"],["memory","Memory","mem"],["trous","Cartes à trous","ct"],["pendu","Pendu","pe"],["quisuisje","Qui suis-je ?","qs"]];
  const rang=n=>n===1?"1re":n+"e";
  function recTexte(k,o){const v=o[k];if(k==="br")return v?pl(v,"victoire"):o.bp?"0 victoire":"";
    if(!v)return "";return k==="mem"?pl(v,"coup"):k==="ct"?v+" / 8":k==="pe"?v+" / 5":v+" / 20"}
  const recPlus=(k,o)=>k==="br"&&o.bp?"meilleure place "+rang(o.bp):"";
  // Classement de la ligue en mode « Mes amis » : les records sous le pseudo.
  const COURT={br:v=>"Royale ♛ "+fmtN(v),mem:v=>"Memory "+v,ct:v=>"Trous "+v+"/8",pe:v=>"Pendu "+v+"/5",qs:v=>"Qui suis-je "+v+"/20"};
  P26ui.sous(r=>{if(typeof view==="undefined"||view!=="ligue"||!modeAmis()||!r)return "";const o=recDe(r);
    const L=["br","mem","ct","pe","qs"].filter(k=>o[k]).map(k=>COURT[k](o[k]));return L.length?`<span class="j2rs">${esc(L.join(" · "))}</span>`:""});
  // Accueil de chaque jeu : mon record face à ceux de mes amis.
  const UNITE={mem:"en coups, le moins possible",br:"victoires",ct:"sur 8",pe:"sur 5",qs:"sur 20"};
  function amisRecHTML(k){const A=amisOk();if(!A.length)return "";
    const L=A.map(a=>{const row=ligneDe(a.id);return {nick:cleanNick(a.pseudo||(row&&row.nick)||"")||"?",v:row?recDe(row)[k]||0:0}}).filter(x=>x.v);if(!L.length)return "";
    if(rec(k))L.push({nick:"Toi",v:rec(k),me:true});L.sort((a,b)=>MIN.has(k)?a.v-b.v:b.v-a.v);
    return `<div class="sec j2ams"><h2>Entre amis</h2><span>${esc(UNITE[k])}</span></div><ol class="endlist j2amr" aria-label="Records entre amis">${L.slice(0,10).map((x,i)=>`<li class="${x.me?"me":""}"><span class="rk">${i+1}</span><span class="bn">${esc(x.nick)}</span><span></span><b>${fmtN(x.v)}</b></li>`).join("")}</ol>`}
  J.amisRecHTML=amisRecHTML;
  // Liste d'amis (ligue) : un lien vers le profil de chaque ami.
  P26ui.on("slot:ligue.haut",()=>{document.querySelectorAll("#lg .aml li").forEach(li=>{const ap=li.querySelector(".ap[data-id]");if(!ap||li.querySelector("[data-j2ami]"))return;
    const id=ap.dataset.id;if(!amisOk().some(a=>a.id===id))return;const b=document.createElement("button");b.type="button";b.className="linkbtn j2amip";b.dataset.j2ami=id;
    b.setAttribute("aria-label","Voir le profil et les records de "+(cleanNick(ap.textContent)||"cet ami"));b.textContent="Profil et records";b.onclick=()=>P26ui.ouvrir("ami",id);li.appendChild(b)})},80);
  P26ui.vue("ami",{titre:"Profil d’un ami",rendre(box,arg){const id=String(arg||""),a=amisOk().find(x=>x.id===id);
    if(!a){box.innerHTML=`<div class="j2 j2ami"><div class="ihead"><h1>Profil</h1><button class="linkbtn" type="button" data-j2back aria-label="Retour">Retour</button></div><p class="muted">Ce profil n’est visible que pour tes amis.</p></div>`;
      box.querySelector("[data-j2back]").onclick=()=>P26ui.retour();return}
    const row=ligneDe(id)||{},nick=cleanNick(a.pseudo||row.nick||"")||"?",r=Object.assign({},row,{id,nick,me:false}),o=recDe(r),mo=recDe({me:true});
    let elo=1000,div=0;try{elo=eloOf(id);div=eloDiv(elo)}catch(e){}let av="";try{av=avHTML(r,"xl")}catch(e){}
    const sous=P26ui.sousHTML(Object.assign({},r,{ami:true}));
    box.innerHTML=`<div class="j2 j2ami"><div class="ihead"><span></span><button class="linkbtn" type="button" data-j2back aria-label="Retour">Retour</button></div>
      <div class="j2amih">${av}<div><h1 class="j2amin"></h1>${sous?`<small class="p1s">${sous}</small>`:""}<span>${fmtN(elo)} d’Elo · ${esc((typeof DIVS!=="undefined"&&DIVS[div])||"")}</span></div></div>
      <div class="sec"><h2>Jeux de cartes</h2><span>records</span></div>
      <ul class="j2recs">${JEUX.map(([g,t,k])=>{const lui=recTexte(k,o),moi=recTexte(k,mo),plus=recPlus(k,o),mplus=recPlus(k,mo);
        return `<li><b>${esc(t)}</b><span class="${lui?"":"vide"}">${esc(lui||"Pas encore de record")}</span><small>${plus?esc(plus)+" · ":""}Toi : ${esc(moi?moi+(mplus?", "+mplus:""):"pas encore de record")}</small></li>`}).join("")}</ul>
      <p class="j2note">Records publiés dans le classement, revérifiés à l’affichage.</p></div>`;
    box.querySelector(".j2amin").textContent=nick;box.querySelector("[data-j2back]").onclick=()=>P26ui.retour()}});
})();
P26mod.ok("jeux2");

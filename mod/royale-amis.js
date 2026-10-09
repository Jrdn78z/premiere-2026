/* ================= Lot P2 : Bataille royale entre amis =================
   Module chargé à la demande (bouton « Entre amis » de la Bataille royale, lien #royale-amis=CODE). 2 à 8 joueurs.
   Temps réel : les mêmes mécanismes que l'Arène (maj8.js), rien d'autre : salle ROOM.join("royale-"+code) (présence
   Supabase Realtime), code de 5 caractères (arCode), l'hôte pilote toute la partie dans SA présence (phase, manche, question,
   joueurs, résultats). Chaque joueur ne publie que son pseudo, son apparence (p2 : dos, skin, Personnage, cadre, comme skins.js)
   et SA réponse {m,c,ms}. Aucun changement de base, pas d'Elo ; des XP, records et titre comme la version solo (jeux2.js).
   Revérifié à la réception : pseudo (cleanNick), skin, dos, cadre et Personnage par liste blanche (P2S.joueur, P2S.catalogue,
   avKOk), Bots nommés « Bot … », textes par esc()/tex(), nombres bornés. Un joueur n'annonce aucun score : les résultats viennent
   de l'hôte seul, rangés par clé de présence (on ne répond que pour soi). L'hôte retenu est le premier vu : un autre joueur
   qui se dit hôte ensuite est ignoré. Limite connue, la même qu'en Arène : la réponse d'un joueur est dans sa présence, lisible
   avec un outil de développement avant la révélation ; la page, elle, ne la montre jamais. */
(function(){
  "use strict";
  const RA=window.P2RA=window.P2RA||{};
  try{P26mod.css("royale-amis").catch(()=>{})}catch(e){}
  const U=()=>(window.P2J&&window.P2J.ui)||{};
  const S2=()=>window.P2S||null;
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const DUREE=15000,MORT=8,MAXJ=8,GRACE=1500,PH=["lobby","start","q","rev","end"];
  const KEY=/^(?:[0-9a-f-]{36}:[A-Za-z0-9]{1,16}|bot-[1-8])$/,CODE=/^[A-Z0-9]{5}$/;
  const pseudo=()=>{try{return typeof arNick==="function"?arNick():""}catch(e){return ""}};
  const pret=()=>{try{return !!ROOM&&roomState==="ok"}catch(e){return false}};
  const uidDe=k=>{const m=/^([0-9a-f-]{36}):/.exec(String(k||""));return m?m[1]:""};
  const pl=(n,mot)=>n+" "+mot+(n>1?"s":"");

  /* ---------------- État ---------------- */
  const S=RA.S={g:null,code:"",host:false,unsub:null,me:"",hk:"",t:0,box:null,cle:"",hp:null,cur:null,mine:null,bon:{},fin:null,
    perdu:"",hAbs:0,iv:null,tm:[],tmH:[],src:"*",note:"",H:null};
  const moi=()=>{if(!S.me&&S.g){try{S.me=(S.g.peers().find(p=>p.isMe&&p.sameTab)||{}).peer||""}catch(e){}}return S.me};
  const apres=(ms,f)=>{const t=setTimeout(()=>{S.tm=S.tm.filter(x=>x!==t);f()},ms);S.tm.push(t);return t};
  const apresH=(ms,f)=>{const t=setTimeout(()=>{S.tmH=S.tmH.filter(x=>x!==t);if(S.g&&S.host)f()},ms);S.tmH.push(t);return t};
  function peers(){try{return S.g?S.g.peers().filter(p=>p&&p.presence&&p.presence.nick):[]}catch(e){return []}}

  // Ce que j'annonce : mon dos, mon skin, mon Personnage (jamais la photo), mon cadre. Les autres le revérifient (P2S.joueur).
  function apparence(){const s=S2();let k=null,d="classique",c="";try{const a=avK();k=a&&a.t!=="p"?a:null}catch(e){}
    try{d=U().monDos()}catch(e){}try{c=(P26ui._champs()||{}).cad||""}catch(e){}
    return {d,s:s&&typeof s.monSkin==="function"?((s.monSkin()||{}).id||""):"",k,c}}
  function maPresence(){const hp=S.hp,a=S.mine&&hp&&hp.ph==="q"&&S.mine.m===hp.m&&S.mine.g===hp.id?{g:hp.id,m:S.mine.m,c:S.mine.c,ms:S.mine.ms}:null;
    return {nick:pseudo(),t:S.t,p2:apparence(),ans:a}}

  /* ---------------- Ce que publie l'hôte : nettoyé à la réception ---------------- */
  const txt=(x,n)=>clip(typeof x==="string"?x:"",n);
  function propre(x){x=x&&typeof x==="object"?x:{};const ph=PH.includes(x.ph)?x.ph:"lobby",vus=new Set();
    const js=(Array.isArray(x.js)?x.js:[]).slice(0,MAXJ).map(e=>{e=e&&typeof e==="object"?e:{};const k=typeof e.k==="string"&&KEY.test(e.k)?e.k:"";
      if(!k||vus.has(k))return null;vus.add(k);const b=/^bot-/.test(k)?1:0;
      return {k,b,n:cleanNick(txt(e.n,40)),s:b?txt(e.s,24):"",d:b?txt(e.d,24):"",c:b?txt(e.c,24):"",a:b&&Array.isArray(e.a)?e.a.slice(0,18).map(v=>N(v,0,99)):null,
        v:e.v===1?1:0,cr:N(e.cr,0,500),o:N(e.o,0,500),p:N(e.p,0,MAXJ),x:e.x===1?1:0,r:e.r===1?1:e.r===0?0:e.r===-1?-1:null,ms:e.ms==null||!Number.isFinite(+e.ms)?null:N(e.ms,0,60000)}}).filter(Boolean);
    const o=(Array.isArray(x.o)?x.o:[]).slice(0,4).map(v=>txt(v,160));
    return {ph,id:typeof x.id==="string"&&/^[a-z0-9]{1,12}$/.test(x.id)?x.id:"",m:N(x.m,0,500),q:txt(x.q,240),o,dur:N(x.dur,5000,30000),ok:Number.isInteger(x.ok)&&x.ok>=0&&x.ok<o.length?x.ok:-1,js,
      w:typeof x.w==="string"&&vus.has(x.w)?x.w:"",l:typeof x.l==="string"&&vus.has(x.l)?x.l:""}}
  RA.propre=propre;

  // Hôte : le premier vu qui se dit hôte, retenu pour toute la partie.
  function hote(){const ps=peers();if(S.host)return ps.find(p=>p.isMe&&p.sameTab)||null;
    if(S.hk)return ps.find(p=>p.peer===S.hk&&p.presence.ah)||null;
    const hs=ps.filter(p=>p.presence.ah&&!(p.isMe&&p.sameTab)).sort((a,b)=>(N(a.presence.t,1,9e15))-(N(b.presence.t,1,9e15))||(a.peer<b.peer?-1:1));
    if(hs[0])S.hk=hs[0].peer;return hs[0]||null}

  /* ---------------- Joueurs à l'écran (revérifiés) ---------------- */
  const skinOk=id=>{const s=S2();return typeof id==="string"&&s&&Array.isArray(s.catalogue)&&s.catalogue.some(x=>x.id===id)?id:""};
  const cadOk=c=>{const s=S2();return typeof c==="string"&&s&&Array.isArray(s.catalogue)&&s.catalogue.some(x=>x.cad===c)?c:""};
  const botNom=n=>{n=cleanNick(String(n||""));return /^Bot [\p{L}]{2,12}$/u.test(n)?n:"Bot"};
  RA.botNom=botNom;
  function joueurDe(e){const me=e.k===moi();
    if(e.b){let avk=null;try{avk=e.a?avKOk({t:"b",a:e.a}):null}catch(x){}return {k:e.k,id:e.k,nick:botNom(e.n),bot:true,avk,skn:skinOk(e.s),dos:U().dosOk(e.d),cad:cadOk(e.c)}}
    const p=peers().find(x=>x.peer===e.k);const nick=cleanNick(String((p&&p.presence.nick)||e.n||""))||"?";let j=null;
    try{j=S2().joueur(uidDe(e.k),p?p.presence:null,nick)}catch(x){}
    j=Object.assign({id:uidDe(e.k),avk:null,av:"",skn:"",dos:"classique",cad:""},j||{},{nick});
    if(me)j.dos=U().monDos();
    return Object.assign(j,{k:e.k,me,nick:me?"Toi":j.nick})}
  RA.joueurDe=joueurDe;
  function avDe(j){if(j.me)return U().monAv("sm");try{return avHTML({id:j.id,nick:j.nick,avk:j.avk,av:j.av,skn:j.skn,cad:j.cad},"sm")}catch(e){return ""}}
  const hoteCle=()=>S.host?moi():S.hk;
  function siege(e,j,etat,face,fc,sous){const out=etat==="out";
    return `<div class="j2seat${j.me?" moi":""}${out?" out":""}" role="listitem" data-k="${esc(e.k)}" aria-label="${esc(j.nick)}${j.bot?", Bot":""}${e.k===hoteCle()?", hôte":""}${e.cr?", "+pl(e.cr,"couronne"):""}${out?", éliminé":etat==="pose"?", carte posée face cachée":""}">
      <span class="j2av">${avDe(j)}${e.cr?`<i class="j2cr" aria-hidden="true">♛${e.cr>1?e.cr:""}</i>`:""}</span><b class="j2n">${esc(j.nick)}${sous?` <em class="ra-tag">${sous}</em>`:""}</b>
      <span class="j2c j2s" data-etat="${etat}">${U().carte(face||"<b>?</b>",{dos:j.dos,fc})}</span></div>`}

  /* ================= Hôte : pilote la partie ================= */
  function humains(){const vus=new Set();return peers().filter(p=>(p.isMe&&p.sameTab)||!p.presence.ah)
    .sort((a,b)=>{const am=a.isMe&&a.sameTab,bm=b.isMe&&b.sameTab;if(am!==bm)return am?-1:1;return N(a.presence.t,1,9e15)-N(b.presence.t,1,9e15)||(a.peer<b.peer?-1:1)})
    .filter(p=>{const u=uidDe(p.peer);if(!u||vus.has(u))return false;vus.add(u);return true}).slice(0,MAXJ)}
  function botsReserve(){let L=[];try{L=U().bots(MAXJ)}catch(e){}
    return L.map((b,i)=>({k:"bot-"+(i+1),bot:true,nick:botNom(b.nick),skn:b.skn||"",dos:b.dos||"classique",cad:b.cad||"",a:b.avk&&Array.isArray(b.avk.a)?b.avk.a.slice(0,18):null,acc:+b.acc||.7,mu:+b.mu||5000}))}
  function lineup(){const H=S.H,hum=humains(),nb=Math.max(0,Math.min(H.bots.length,MAXJ-hum.length));
    return hum.map(p=>({k:p.peer,bot:false,nick:cleanNick(p.presence.nick)||"?"})).concat(H.bots.slice(0,nb))}
  const neuf=j=>Object.assign({},j,{v:1,cr:0,o:0,p:0,x:0,r:null,ms:null,bn:0});
  function hpres(){const H=S.H,ph=H.ph,L=ph==="lobby"?lineup().map(neuf):H.js,rev=ph==="rev"||ph==="end";
    return {nick:pseudo(),ah:true,t:S.t,ph,id:H.gid||"",p2:apparence(),m:H.m,dur:DUREE,ans:null,
      q:ph==="q"||ph==="rev"?H.q.q:"",o:ph==="q"||ph==="rev"?H.opts.map(o=>o.t):[],ok:ph==="rev"?H.ok:-1,w:ph==="rev"?H.win:"",l:ph==="rev"?H.lent:"",
      js:L.map(j=>({k:j.k,b:j.bot?1:0,n:j.nick,s:j.bot?j.skn:"",d:j.bot?j.dos:"",c:j.bot?j.cad:"",a:j.bot?j.a:null,v:j.v?1:0,cr:j.cr|0,o:j.o|0,p:j.p|0,x:j.x?1:0,
        r:rev?j.r:null,ms:rev?j.ms:null}))}}
  function publier(){if(!S.g||!S.host||!S.H)return;const x=hpres();S.g.presence(x).catch(()=>{});recevoir(propre(x))}
  RA.publier=publier;
  function hotePairs(){const H=S.H;if(!H)return;
    if(H.ph==="lobby"){const sig=JSON.stringify(lineup().map(j=>j.k));if(sig!==H.sig){H.sig=sig;publier()}else peindre()}
    else if(H.ph==="q")cueillir();else peindre()}
  function lancer(){const H=S.H;if(!S.host||!H||H.ph!=="lobby")return;const L=lineup();if(L.length<2)return;const u=U();
    let pool=[];try{pool=shuffle(S.src==="*"?u.partout(u.quizDe):u.quizDe(S.src))}catch(e){}
    if(pool.length<10){S.note="Pas assez de questions dans ce contenu : choisis « Toutes mes matières ».";peindre(true);return}
    S.note="";Object.assign(H,{pool,pi:0,m:0,js:L.map(neuf),ph:"start",gid:Date.now().toString(36).slice(-6)+Math.floor(Math.random()*1296).toString(36)});publier();apresH(3000,manche)}
  function plan(j){const H=S.H,juste=Math.random()<j.acc;let ms=Math.round(j.mu*(.55+Math.random()*.9));if(ms>=DUREE)ms=null;let c=H.ok;
    if(!juste){const f=H.opts.map((o,k)=>k).filter(k=>k!==H.ok);c=f[Math.floor(Math.random()*f.length)]}return {c,ms}}
  function manche(){const H=S.H;if(!H||(H.ph!=="start"&&H.ph!=="rev"))return;H.m++;if(H.pi>=H.pool.length){H.pool=shuffle(H.pool);H.pi=0}const x=H.pool[H.pi++];
    Object.assign(H,{q:x.q,opts:optsOf(x.q),ans:{},win:"",lent:"",ph:"q",t0:performance.now(),ferme:false});H.ok=H.opts.findIndex(o=>o.ok);
    H.js.forEach(j=>{j.x=0;j.r=null;j.ms=null});const m=H.m;
    H.js.filter(j=>j.bot&&j.v).forEach(j=>{const p=plan(j);H.ans[j.k]=p;if(p.ms!=null)apresH(p.ms,()=>{if(H.ph==="q"&&H.m===m&&!j.x){j.x=1;publier();verifier()}})});
    publier();clearInterval(H.iv);H.iv=setInterval(()=>{if(!S.g||H.ph!=="q"){clearInterval(H.iv);return}if(performance.now()-H.t0>DUREE+GRACE)reveler()},250)}
  // Réponses des joueurs : seulement celle que chacun publie dans SA présence, pour la manche en cours.
  function cueillir(){const H=S.H;if(!H||H.ph!=="q")return;let ch=false;
    for(const p of peers()){if(p.isMe&&p.sameTab)continue;const j=H.js.find(x=>!x.bot&&x.k===p.peer);if(!j||!j.v||j.x)continue;const a=p.presence.ans;
      if(!a||typeof a!=="object"||a.g!==H.gid||N(a.m,0,500)!==H.m)continue;/* réponse de cette partie et de cette manche seulement */const c=Math.round(+a.c);if(!Number.isInteger(c)||c<0||c>=H.opts.length)continue;
      H.ans[j.k]={c,ms:N(a.ms,0,60000)};j.x=1;ch=true}
    if(ch)publier();else peindre();verifier()}
  // Tous les joueurs encore là ont posé : les Bots qui allaient répondre posent vite (même règle que la version solo), puis révélation.
  function verifier(){const H=S.H;if(!H||H.ph!=="q"||H.ferme)return;const la=new Set(peers().map(p=>p.peer));
    if(!H.js.filter(j=>!j.bot&&j.v).every(j=>j.x||!la.has(j.k)))return;H.ferme=true;const m=H.m;
    const reste=H.js.filter(j=>j.bot&&j.v&&!j.x&&H.ans[j.k]&&H.ans[j.k].ms!=null).sort((a,b)=>H.ans[a.k].ms-H.ans[b.k].ms);
    reste.forEach((j,n)=>apresH(160+n*120,()=>{if(H.ph==="q"&&H.m===m&&!j.x){j.x=1;publier()}}));
    apresH(160+reste.length*120+500,()=>{if(H.ph==="q"&&H.m===m)reveler()})}
  function reveler(){const H=S.H;if(!H||H.ph!=="q")return;H.ph="rev";clearInterval(H.iv);
    const viv=H.js.filter(j=>j.v),R=viv.map(j=>{const a=H.ans[j.k],ms=j.x&&a&&a.ms!=null&&a.ms<=DUREE?a.ms:null,ok=ms!=null&&a.c===H.ok;j.r=ok?1:ms==null?-1:0;j.ms=ms;return {j,ok,ms}});
    R.forEach(x=>{if(x.ok)x.j.bn++});const justes=R.filter(x=>x.ok).sort((a,b)=>a.ms-b.ms);let elim=[];
    if(justes.length){elim=R.filter(x=>!x.ok).map(x=>x.j);justes[0].j.cr++;H.win=justes[0].j.k;
      if(H.m>=MORT&&justes.length>=2&&viv.length-elim.length>=2){const lent=justes[justes.length-1].j;elim.push(lent);H.lent=lent.k}}
    const reste=viv.length-elim.length;elim.forEach(j=>{j.v=0;j.o=H.m;j.p=reste+1});
    publier();
    apresH(3400,()=>{const vv=H.js.filter(j=>j.v);if(vv.length<=1){terminer();return}if(!vv.some(j=>!j.bot)){simuler();terminer();return}manche()})}
  // Plus aucun humain en jeu : les Bots finissent tout de suite, sans écran (comme la version solo).
  function simuler(){const H=S.H;let k=0;while(H.js.filter(j=>j.v).length>1&&k<80){k++;H.m++;const viv=H.js.filter(j=>j.v);
    const R=viv.map(j=>{const juste=Math.random()<j.acc;let ms=Math.round(j.mu*(.55+Math.random()*.9));if(ms>=DUREE)ms=null;return {j,ok:juste&&ms!=null,ms}}),justes=R.filter(x=>x.ok).sort((a,b)=>a.ms-b.ms);
    if(!justes.length)continue;justes[0].j.cr++;const elim=R.filter(x=>!x.ok).map(x=>x.j);
    if(H.m>=MORT&&justes.length>=2&&viv.length-elim.length>=2)elim.push(justes[justes.length-1].j);
    const reste=viv.length-elim.length;elim.forEach(j=>{j.v=0;j.o=H.m;j.p=reste+1})}
    H.js.filter(j=>j.v).sort((a,b)=>b.cr-a.cr).forEach((j,i)=>{if(i){j.v=0;j.o=H.m;j.p=i+1}})}
  function terminer(){const H=S.H;H.js.forEach(j=>{if(j.v)j.p=1});H.ph="end";publier()}

  /* ================= Tous : réception de l'état de l'hôte ================= */
  function pairs(){if(!S.g)return;if(S.host){hotePairs();return}
    const h=hote();if(!h){if(S.hp&&!S.hAbs&&!S.perdu){S.hAbs=Date.now();apres(4000,()=>{if(S.g&&S.hAbs&&!hote())perdre("L’hôte a quitté la partie.")})}return}
    S.hAbs=0;recevoir(propre(h.presence))}
  function recevoir(hp){const old=S.hp;S.hp=hp;
    if(old&&((old.ph==="end"||old.ph==="rev"||old.ph==="q")&&(hp.ph==="lobby"||hp.ph==="start")||(hp.id&&old.id!==hp.id))){S.fin=null;S.bon={};S.cur=null;S.mine=null}
    if(hp.ph==="q"&&(!S.cur||S.cur.m!==hp.m)){S.cur={m:hp.m,dur:hp.dur,tl:performance.now()};S.mine=null}
    if(hp.ph==="rev"){const e=hp.js.find(x=>x.k===moi());if(e&&e.r===1)S.bon[hp.m]=1}
    if(hp.ph==="end"&&!S.fin)finClient(hp);
    peindre()}
  // Fin de partie : mes XP, mes records et le titre, comme la version solo. Ma place vient de l'hôte, mes bonnes réponses aussi.
  function finClient(hp){const e=hp.js.find(x=>x.k===moi());S.fin={spect:!e};if(!e)return;const u=U();
    const place=e.v?1:N(e.p,1,MAXJ),T=hp.js.length,bonnes=Object.keys(S.bon).length,win=place===1;
    if(win){if(typeof u.victoire==="function")u.victoire();else u.recs().br=N(u.rec("br")+1,0,10000);u.titre("royale")}
    const meil=u.noter("bp",place),dem=Math.min(15,bonnes)+(win?5:place<=3?2:0),xp=u.gagne(dem,boxOk());
    Object.assign(S.fin,{place,T,bonnes,dem,xp,meil});
    try{u.finir("royale",{place,joueurs:T,bonnes,amis:1},win,boxOk())}catch(x){}}

  /* ================= Entrer, partir ================= */
  RA.entrer=async function(code,o){o=o||{};if(!pseudo())return "Ajoute ton pseudo dans ton profil pour jouer entre amis.";
    if(!pret())return "Connexion au direct impossible pour l’instant.";
    const host=!code;code=host?(typeof arCode==="function"?arCode():""):String(code).toUpperCase();if(!CODE.test(code))return "Le code fait 5 caractères.";
    if(S.g)await partir();
    try{if(typeof AR!=="undefined"&&AR.g&&typeof arLeave==="function")await arLeave()}catch(e){}
    try{if(typeof OL!=="undefined"&&OL.g&&typeof leaveRoom==="function")await leaveRoom()}catch(e){}
    let g;try{g=await ROOM.join("royale-"+code.toLowerCase())}catch(e){return "Impossible de rejoindre la partie. Réessaie."}
    Object.assign(S,{g,code,host,me:"",hk:"",t:Date.now(),hp:null,cur:null,mine:null,bon:{},fin:null,perdu:"",hAbs:0,cle:"",note:"",src:typeof o.src==="string"?o.src:"*",
      H:host?{ph:"lobby",bots:[],reserve:botsReserve(),js:[],m:0,sig:"",iv:null}:null});
    S.unsub=g.onPeers(pairs,()=>perdre("La connexion à la partie a été perdue."));
    if(host)publier();
    else{await g.presence(maPresence()).catch(()=>{});apres(6000,()=>{if(S.g===g&&!S.hp&&!S.perdu)perdre("Aucune partie avec ce code. Vérifie-le avec l’hôte.")})}
    await P26ui.ouvrir("royale-amis");return ""};
  async function partir(){clearInterval(S.iv);if(S.H)clearInterval(S.H.iv);S.tm.forEach(clearTimeout);S.tm=[];S.tmH.forEach(clearTimeout);S.tmH=[];
    if(S.unsub){try{S.unsub()}catch(e){}}S.unsub=null;const g=S.g;Object.assign(S,{g:null,hp:null,H:null,cur:null,mine:null,cle:""});if(g)await g.leave().catch(()=>{})}
  RA.partir=partir;
  function perdre(t){S.perdu=t;peindre(true)}
  const sortir=()=>partir().then(()=>P26ui.ouvrir("royale"));

  /* ================= Rendu ================= */
  function boxOk(){const b=S.box;return b&&b.isConnected&&b.dataset.vue==="royale-amis"?b:null}
  function peindre(force){const box=boxOk();if(!box)return;const hp=S.hp;
    const cle=S.perdu?"perdu":!S.g?"off":!hp?"cherche":hp.ph+":"+hp.m;
    if(!force&&cle===S.cle){maj(box);return}S.cle=cle;
    if(S.perdu||!S.g){box.innerHTML=`<div class="j2 j2ra"><div class="ihead"><h1>Bataille royale</h1></div><div class="ra-vide" role="status"><b>${esc(S.perdu||"Pas de partie en cours.")}</b><span>Crée une partie ou rejoins tes amis avec leur code.</span></div>
      <div class="exrow" style="justify-content:center"><button class="btn light" type="button" data-raret aria-label="Retour à la Bataille royale">Retour</button></div></div>`;brancher(box);return}
    if(!hp){box.innerHTML=`<div class="j2 j2ra"><div class="ihead"><h1>Bataille royale</h1><button class="linkbtn" type="button" data-raq aria-label="Quitter la partie">Quitter</button></div>
      <div class="ra-vide" role="status"><b>Recherche de la partie ${esc(S.code)}…</b><span>Un instant.</span></div></div>`;brancher(box);return}
    if(hp.ph==="lobby"||hp.ph==="start")salle(box,hp);else if(hp.ph==="end")podium(box,hp);else table(box,hp)}
  RA.peindre=peindre;

  function salle(box,hp){const L=hp.js,n=L.length,dans=L.some(e=>e.k===moi());let hn="l’hôte";try{const h=hote();if(h)hn=cleanNick(h.presence.nick)||hn}catch(e){}
    const seats=L.map(e=>siege(e,joueurDe(e),"pose","","",e.k===hoteCle()?"hôte":e.b?"Bot":"")).join("");let bas;
    if(hp.ph==="start")bas=`<div class="arbig ra-go" role="status"><b>Prêts ?</b><span>${n} joueurs · une erreur et tu sors</span></div>`;
    else if(S.host){const u=U(),src=u.sources(u.quizDe,10),H=S.H,nb=Math.min(H.bots.length,MAXJ-humains().length),libre=MAXJ-n;if(!src.some(x=>x[0]===S.src))S.src=src.length?src[0][0]:"*";
      bas=`<div class="ra-bots" role="group" aria-label="Compléter avec des Bots"><button type="button" class="ra-pm" data-rab="-1" aria-label="Retirer un Bot" ${nb?"":"disabled"}>−</button><span><b>${nb}</b> ${nb>1?"Bots":"Bot"}</span><button type="button" class="ra-pm" data-rab="1" aria-label="Ajouter un Bot" ${libre>0?"":"disabled"}>+</button></div>
       ${src.length?`<div class="pick sm ra-src" role="group" aria-label="Choisir le contenu des questions">${src.map(([k,l])=>`<button type="button" class="${S.src===k?"on":""}" data-rasrc="${esc(k)}" aria-pressed="${S.src===k}" aria-label="${esc(l)}">${esc(l)}</button>`).join("")}</div>`
         :`<p class="ra-att">Pas encore de quiz pour ta classe : choisis ta classe dans ton profil pour lancer une partie.</p>`}
       <div class="exrow" style="justify-content:center"><button class="btn light" type="button" data-rago aria-label="Lancer la partie" ${n>=2&&src.length?"":"disabled"}>Lancer la partie</button></div>
       <p class="ra-st" role="status">${esc(S.note||(n<2?"Il faut au moins 2 joueurs : attends un ami ou ajoute un Bot.":"Les questions viennent de tes matières. Une erreur et c’est fini."))}</p>`}
    else bas=`<p class="ra-att" role="status">${dans?"Tu es dans la partie. ":"La salle est pleine : tu regarderas la partie. "}${esc(hn)} la lance quand tout le monde est là.</p>`;
    box.innerHTML=`<div class="j2 j2ra"><div class="ihead"><h1>Bataille royale</h1><button class="linkbtn" type="button" data-raq aria-label="Quitter la partie">Quitter</button></div>
      <div class="ra-code"><span>Code de la partie</span><b class="bigcode" aria-label="Code de la partie : ${[...S.code].join(" ")}">${esc(S.code)}</b><small>Tes amis le tapent dans Jeu, Bataille royale, Entre amis.</small></div>
      <div class="sec"><h2>Joueurs</h2><span>${n} / ${MAXJ}</span></div>
      <div class="j2table ra-salle" role="list" aria-label="Joueurs de la partie">${seats||`<p class="ra-att">Connexion…</p>`}</div>${bas}</div>`;
    brancher(box)}

  function banniere(hp){const nom=k=>{const e=hp.js.find(x=>x.k===k);if(!e)return "?";const j=joueurDe(e);return j.me?null:j.nick};
    if(!hp.w)return "Personne n’a juste : la manche est rejouée.";const w=nom(hp.w);let m=(w===null?"Tu gagnes":esc(w)+" gagne")+" la manche ♛";
    const elim=hp.js.filter(e=>!e.v&&e.o===hp.m);
    if(hp.l){const l=nom(hp.l);m+=` · mort subite : ${l===null?"tu sors":esc(l)+" sort"}`}else if(elim.length)m+=` · ${elim.length} éliminé${elim.length>1?"s":""}`;
    return m}
  function table(box,hp){const rev=hp.ph==="rev",moiE=hp.js.find(e=>e.k===moi()),vivant=!!(moiE&&moiE.v)||(rev&&moiE&&moiE.o===hp.m),viv=hp.js.filter(e=>e.v||e.o===hp.m).length;
    const mine=S.mine&&S.mine.m===hp.m?S.mine:null,u=U();
    const seats=hp.js.map(e=>{const j=joueurDe(e);let etat,face="<b>?</b>",fc="";
      if(!e.v&&e.o<hp.m)etat="out";
      else if(rev){etat=e.r==null?"vide":"pose";face=`<b>${e.r===1?"✓":e.r===-1?"⏱":"✗"}</b>${e.ms!=null?`<small>${u.ms2s(e.ms)}</small>`:""}`;fc=e.r===1?"bon":"faux"}
      else etat=e.x||(e.k===moi()&&mine)?"pose":"vide";
      return siege(e,j,etat,face,fc,"")}).join("");
    const opts=hp.o.map((o,i)=>{let c="opt";if(rev){if(i===hp.ok)c+=" good";else if(mine&&mine.c===i)c+=" bad"}else if(mine&&mine.c===i)c+=" choisi";
      return `<button class="${c}" type="button" data-i="${i}" aria-label="Réponse : ${u.lab(o)}" ${rev||!vivant||mine?"disabled":""}>${tex(o)}</button>`}).join("");
    const etatMoi=!moiE?"Tu regardes":rev?(moiE.r===1?"Juste":moiE.r===-1?"Temps écoulé":moiE.r===0?"Raté":""):!vivant?"Tu regardes":mine?"Carte posée":"À toi";
    box.innerHTML=`<div class="j2 j2br j2ra"><div class="role j2top"><span>Bataille royale · ${esc(S.code)}</span><span>${viv} en jeu</span></div>
      <div class="j2table" role="list" aria-label="Les joueurs">${seats}</div>
      <p class="j2ban${rev?" on":""}" role="status" aria-live="polite">${rev?banniere(hp):`Manche ${hp.m}${hp.m>=MORT?" · mort subite":""}`}</p>
      <div class="qcard j2brq"><div class="role"><span>Manche ${hp.m}</span><span data-raetat>${etatMoi}</span></div>
      ${rev?"":`<div class="arbar" data-rabar style="--p:1"><i></i><b data-rasec>${Math.ceil(hp.dur/1000)}</b></div>`}<h2>${tex(hp.q)}</h2>${opts}</div>
      ${!moiE?`<p class="j2note ra-spect">Partie en cours : tu regardes. Tu joueras à la prochaine.</p>`:!vivant&&!rev?`<p class="j2note ra-spect">Tu es éliminé : tu regardes la fin de la partie.</p>`:""}
      <div class="exrow" style="justify-content:center"><button class="linkbtn" type="button" data-raq aria-label="Quitter la partie">Quitter</button></div></div>`;
    brancher(box);
    if(rev){[...box.querySelectorAll('.j2s[data-etat="pose"]')].forEach((c,n)=>{const go=()=>{c.dataset.etat="vue";c.classList.add("vue")};if(reduce)go();else apres(80+n*70,go)});
      const sortis=hp.js.filter(e=>!e.v&&e.o===hp.m).map(e=>e.k);
      apres(reduce?0:750,()=>sortis.forEach(k=>{const s=[...box.querySelectorAll(".j2seat")].find(x=>x.dataset.k===k);if(s)s.classList.add("out")}))}
    else{clearInterval(S.iv);S.iv=setInterval(tic,100);tic()}}
  function tic(){const hp=S.hp;if(!S.cur||!hp||hp.ph!=="q"){clearInterval(S.iv);return}const box=boxOk();if(!box)return;
    const left=Math.max(0,S.cur.dur-(performance.now()-S.cur.tl));const bar=box.querySelector("[data-rabar]");if(bar)bar.style.setProperty("--p",(left/S.cur.dur).toFixed(3));
    const s=box.querySelector("[data-rasec]");if(s)s.textContent=Math.ceil(left/1000);
    if(left<=0){box.querySelectorAll(".j2brq .opt").forEach(b=>b.disabled=true);const e=box.querySelector("[data-raetat]");if(e&&!(S.mine&&S.mine.m===hp.m)&&hp.js.some(x=>x.k===moi()&&x.v))e.textContent="Temps écoulé"}}
  // Pendant une manche : seules les cartes posées changent (face cachée, au dos de chacun).
  function maj(box){const hp=S.hp;if(!hp)return;if(hp.ph==="lobby"){salle(box,hp);return}if(hp.ph!=="q")return;const mine=S.mine&&S.mine.m===hp.m;
    hp.js.forEach(e=>{if(!e.v)return;const s=[...box.querySelectorAll(".j2seat")].find(x=>x.dataset.k===e.k);const c=s&&s.querySelector(".j2s");if(!c)return;
      if((e.x||(e.k===moi()&&mine))&&c.dataset.etat==="vide"){c.dataset.etat="pose";s.setAttribute("aria-label",s.getAttribute("aria-label")+", carte posée face cachée")}})}
  function podium(box,hp){const moiE=hp.js.find(e=>e.k===moi()),R=S.fin||{},T=hp.js.length,u=U();
    const L=hp.js.slice().sort((a,b)=>(a.p||99)-(b.p||99)||b.cr-a.cr);
    const pod=`<ol class="j2pod" aria-label="Podium">${L.map(e=>{const j=joueurDe(e);return `<li class="${j.me?"me":""}${e.p===1?" un":""}"><span class="rk">${e.p||"·"}</span>${avDe(j)}<span class="bn">${esc(j.nick)}${j.bot?` <em class="ra-tag">Bot</em>`:""}</span>${u.dos(j.dos,"j2mini")}<small>${e.p===1?"Vainqueur":"sorti manche "+e.o}${e.cr?" · ♛ "+e.cr:""}</small></li>`}).join("")}</ol>`;
    const p=R.place||0;
    box.innerHTML=`<div class="j2 j2ra"><div class="result j2fin" data-j2fin="royale-amis">${moiE&&p?`<p class="muted">${p===1?"Dernier debout !":`Éliminé à la manche ${moiE.o}.`}</p>${p===1?`<p class="j2win">Victoire royale</p>`:""}
      <div class="sc">${p}<sup>${p===1?"re":"e"}</sup></div><p>sur ${T} joueurs · ${(R.bonnes||0)>1?R.bonnes+" bonnes réponses":(R.bonnes||0)+" bonne réponse"} · ${pl(moiE.cr,"couronne")}</p>`:`<p class="muted">Partie terminée.</p><div class="sc">♛</div>`}
      ${pod}${moiE&&p?`<p class="j2xp">${R.xp?`+${fmtN(R.xp)} XP`:R.dem?"XP du jour au plafond : pas d’XP en plus":"Pas d’XP cette fois"}</p>`:""}
      <div class="exrow" style="justify-content:center">${S.host?`<button class="btn light" type="button" data-raagain aria-label="Rejouer avec les mêmes joueurs">Rejouer</button>`:""}<button class="btn ghost" type="button" data-raq aria-label="Quitter la partie">Quitter</button></div>
      ${S.host?"":`<p class="ra-att">L’hôte peut relancer une partie avec les mêmes joueurs.</p>`}</div></div>`;
    brancher(box);if(!reduce){const sc=box.querySelector(".sc");if(sc&&sc.animate)sc.animate([{opacity:0,transform:"scale(.94)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE_OUT})}}

  /* ---------------- Gestes ---------------- */
  function repondre(i,b){const hp=S.hp;if(!hp||hp.ph!=="q"||!S.cur||S.cur.m!==hp.m)return;const e=hp.js.find(x=>x.k===moi());if(!e||!e.v||(S.mine&&S.mine.m===hp.m&&S.mine.g===hp.id))return;
    if(!Number.isInteger(i)||i<0||i>=hp.o.length)return;const ms=Math.round(performance.now()-S.cur.tl);if(ms>hp.dur)return;
    S.mine={g:hp.id,m:hp.m,c:i,ms};buzz(10);const box=boxOk();
    if(box){box.querySelectorAll(".j2brq .opt").forEach(x=>{x.disabled=true;if(x===b)x.classList.add("choisi")});const t=box.querySelector("[data-raetat]");if(t)t.textContent="Carte posée";maj(box)}
    if(S.host){const H=S.H,j=H&&H.js.find(x=>x.k===e.k);if(j&&j.v&&!j.x&&H.ph==="q"){H.ans[j.k]={c:i,ms};j.x=1;publier();verifier()}}
    else S.g.presence(maPresence()).catch(()=>{})}
  function brancher(box){
    box.querySelectorAll("[data-raq]").forEach(b=>b.onclick=sortir);
    box.querySelectorAll("[data-raret]").forEach(b=>b.onclick=sortir);
    box.querySelectorAll(".j2brq .opt").forEach(b=>b.onclick=()=>repondre(+b.dataset.i,b));
    box.querySelectorAll("[data-rab]").forEach(b=>b.onclick=()=>{const H=S.H;if(!S.host||!H||H.ph!=="lobby")return;
      if(+b.dataset.rab>0){if(lineup().length<MAXJ&&H.bots.length<H.reserve.length)H.bots.push(H.reserve[H.bots.length])}else H.bots.pop();
      buzz(8);H.sig="";publier()});
    box.querySelectorAll("[data-rasrc]").forEach(b=>b.onclick=()=>{S.src=b.dataset.rasrc;S.note="";peindre(true)});
    const go=box.querySelector("[data-rago]");if(go)go.onclick=()=>{buzz(14);lancer()};
    const ag=box.querySelector("[data-raagain]");if(ag)ag.onclick=()=>{const H=S.H;if(!S.host||!H)return;Object.assign(H,{ph:"lobby",js:[],m:0,sig:""});publier()}}

  P26ui.vue("royale-amis",{titre:"Bataille royale entre amis",rendre(box){S.box=box;S.cle="";peindre(true)},quitter(){partir()}});
  // Lien #royale-amis=CODE : attend la connexion au direct (8 s au plus) avant d'entrer.
  const directPret=()=>new Promise(res=>{let n=0;(function f(){let w=false;try{w=typeof roomState!=="undefined"&&roomState==="wait"}catch(e){}if(!w||n++>=40){res();return}setTimeout(f,200)})()});
  P26ui.route("royale-amis",v=>{const c=String(v||"").toUpperCase();if(!CODE.test(c))return;try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
    directPret().then(()=>RA.entrer(c)).then(t=>{if(t)toast(`<span class="tm">!</span><div><b>Bataille royale entre amis</b><span>${esc(t)}</span></div>`)})});
  Object.assign(RA,{lineup:()=>S.H?lineup():[],hote,MAXJ,DUREE});   // pour les tests
})();
P26mod.ok("royale-amis");

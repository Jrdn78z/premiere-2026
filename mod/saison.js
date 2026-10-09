/* ================= Lot P2 : progression et saisons =================
   Module préchargé (P26ui.precharger). Passe de saison gratuit (30 paliers par mois, débloqués par l'XP du mois) :
   DÉSACTIVÉ pour l'instant (interrupteur PASSE_ACTIF ci-dessous, décision de Jeremy) ; son code reste là pour le remettre plus tard.
   Toujours actifs : trophées secrets (seulement ce que la page voit vraiment), cadeau de retour après 5 jours d'absence,
   objectif de cartes par semaine et par matière, saisons Elo mensuelles (cadre exclusif selon la meilleure division du mois).
   État du compte : P.p1.ps (paliers reçus par mois), P.p1.ts (trophées secrets), P.p1.rt (dernier cadeau de retour),
   P.p1.ob (objectifs par matière), P.p1.es (meilleure division par mois). Pièces offertes : P.gx, comme les cadeaux.
   Aucun coffre, aucune roue, aucun tirage, aucun argent réel : chaque palier donne une récompense fixe, annoncée.
   Cadre de saison d'un autre joueur : montré seulement si la base le confirme (table elo_saisons, sql/10-boutique.sql). */
(function(){
  "use strict";
  // Passe de saison : false = aucune trace visible (ni carte, ni paliers, ni « Récupérer », ni cadre « Passe complet »).
  // Remettre true pour le réactiver : la vue, la carte d'accueil et le cadre reviennent tels quels.
  const PASSE_ACTIF=false;
  const SA=window.P2SA=window.P2SA||{};
  SA.PASSE_ACTIF=PASSE_ACTIF;
  const NOM_VUE=PASSE_ACTIF?"Passe de saison":"Ma saison";
  const ISO=/^\d{4}-\d{2}-\d{2}$/,MOIS=/^\d{4}-\d{2}$/;
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const has=(o,k)=>!!o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
  const connecte=()=>typeof UID==="string"&&!!UID&&!(typeof GUEST!=="undefined"&&GUEST);
  const B2=()=>window.P2B||null;
  const MNOM=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const moisCourant=()=>String(TODAY_ISO).slice(0,7);
  const moisNom=m=>MNOM[N(+m.slice(5,7)-1,0,11)]+" "+m.slice(0,4);
  const pousser=()=>{try{lgPush()}catch(e){}};
  const piecesTop=()=>{try{paintMyAv()}catch(e){}};
  function obj(cle,init){const o=P26ui.etat(cle,init);if(!o||typeof o!=="object"||Array.isArray(o))P.p1[cle]=init;return P.p1[cle]}
  function gx(id,co,r){P.gx=P.gx||{};if(has(P.gx,id))return false;P.gx[id]={xp:0,co:N(co,0,100000),d:TODAY_ISO,r:String(r).slice(0,80)};return true}
  const vue=()=>typeof view!=="undefined"&&view==="mod"&&P26ui._vueCourante()==="saison";
  function rafraichir(){try{if(vue())P26ui._rendre()}catch(e){}}

  /* ---------------- Passe de saison ---------------- */
  const PALIERS=30;
  const seuilP=k=>50*k+k*k;                                   // XP du mois pour atteindre le palier k (palier 30 : 2 400 XP)
  function xpMois(m){m=m||moisCourant();let s=0;for(const [d,v] of Object.entries(P.x||{}))if(d.slice(0,7)===m&&ISO.test(d))s+=Math.max(0,+v||0);return s}
  function palier(xp){let k=0;while(k<PALIERS&&xp>=seuilP(k+1))k++;return k}
  // Récompense fixe de chaque palier
  function recomp(k){if(k===5||k===25)return {t:"joker",txt:"1 joker 50/50",equiv:120};
    if(k===10)return {t:"objet",k:"pc:lilas",txt:"Couleur de pseudo Lilas",equiv:150};
    if(k===20)return {t:"objet",k:"emo:fete",txt:"Émojis d’Arène Fête",equiv:200};
    if(k===15)return {t:"pieces",n:100,txt:"100 pièces"};
    if(k===30)return {t:"final",n:300,txt:"300 pièces et le cadre Passe complet"};
    const n=20+2*k;return {t:"pieces",n,txt:n+" pièces"}}
  SA.recomp=recomp;SA.seuil=seuilP;SA.palier=palier;SA.xpMois=xpMois;SA.PALIERS=PALIERS;
  P26ui.fusion("ps",(l,d)=>{const o={};[l,d].forEach(x=>{if(x&&typeof x==="object"&&!Array.isArray(x))Object.entries(x).forEach(([m,v])=>{if(MOIS.test(m))o[m]=Math.max(o[m]||0,N(v,0,PALIERS))})});
    Object.keys(o).sort().reverse().slice(3).forEach(m=>delete o[m]);return o});
  function donner(m,i){const id="ps-"+m+"-"+String(i).padStart(2,"0"),R=recomp(i),raison="Passe de saison, palier "+i;
    if(R.t==="pieces"||R.t==="final")gx(id,R.n,raison);
    if(R.t==="joker"){const b=B2();if(!(b&&typeof b.jkDonner==="function"&&b.jkDonner(id)))gx(id,R.equiv,raison+" (stock de jokers plein)")}
    if(R.t==="objet"){P.own=P.own||{};if(P.own[R.k])gx(id,R.equiv,raison+" (déjà à toi)");else P.own[R.k]=1}
    if(R.t==="final"&&P.t&&!P.t.passe_saison)P.t.passe_saison=TODAY_ISO}
  // Paliers atteints mais pas encore récupérés. Rien n'est crédité tout seul : l'élève touche « Récupérer ».
  function dispo(m){if(!PASSE_ACTIF)return 0;m=m||moisCourant();return Math.max(0,palier(xpMois(m))-N(obj("ps",{})[m],0,PALIERS))}
  SA.dispo=dispo;
  function recuperer(annonce){if(!PASSE_ACTIF)return 0;const m=moisCourant(),ps=obj("ps",{}),deja=N(ps[m],0,PALIERS),k=palier(xpMois(m));if(k<=deja)return 0;
    for(let i=deja+1;i<=k;i++)donner(m,i);ps[m]=k;Object.keys(ps).filter(x=>MOIS.test(x)).sort().reverse().slice(3).forEach(x=>delete ps[x]);
    saveP();pousser();piecesTop();
    if(annonce){const R=recomp(k);toast(`<span class="tm">${k}</span><div><b>Passe de saison : ${k-deja>1?(k-deja)+" récompenses récupérées":"palier "+k+" récupéré"}</b><span>${esc(k-deja>1?"Jusqu’au palier "+k:R.txt)}</span></div>`)}
    rafraichir();return k-deja}
  SA.passeVerif=recuperer;SA.recuperer=recuperer;
  P26ui.on("xp",()=>rafraichir());

  /* ---------------- Cadre « Passe complet » : se gagne (trophée publié tr = passe_saison), revérifié chez les autres ---------------- */
  const pretB=window.P26mod?P26mod("boutique").catch(()=>null):Promise.resolve();
  pretB.then(()=>{const T4=window.P1T4;if(!T4||!T4.catalogue||!Array.isArray(T4.catalogue.CAD))return;const CAD=T4.catalogue.CAD;
    if(PASSE_ACTIF&&!CAD.some(c=>c.id==="passe"))CAD.push({id:"passe",nom:"Passe complet",g:"w",tr:"passe_saison",cond:"termine les 30 paliers d’un passe de saison",_k:"cad:passe",k:"cad"});
    esCadres();cadreGarde()});

  /* ---------------- Trophées secrets ---------------- */
  const SECRETS=[
    {id:"minuit",nom:"Oiseau de nuit",cond:"Réviser entre minuit et 5 h du matin"},
    {id:"aurore",nom:"Aurore",cond:"Réviser entre 5 h et 7 h du matin"},
    {id:"rafale",nom:"Rafale",cond:"10 bonnes réponses en moins de 30 secondes"},
    {id:"sansfaute",nom:"Sans faute",cond:"20 bonnes réponses de suite"},
    {id:"geant",nom:"Plus fort qu’un Diamant",cond:"Finir devant un joueur de la division Diamant en Arène"},
    {id:"weekend",nom:"Week-end studieux",cond:"Réviser le samedi et le dimanche du même week-end"},
    {id:"retour",nom:"Le grand retour",cond:"Revenir réviser après 5 jours d’absence"}];
  SA.SECRETS=SECRETS;
  P26ui.fusion("ts",(l,d)=>{const o={};[l,d].forEach(x=>{if(x&&typeof x==="object"&&!Array.isArray(x))Object.entries(x).forEach(([k,v])=>{if(SECRETS.some(s=>s.id===k)&&ISO.test(v))o[k]=o[k]&&o[k]<v?o[k]:v})});return o});
  // Pas de message qui coupe la révision : la carte « Ma saison » (ou « Passe de saison ») de l'accueil signale le nouveau trophée jusqu'à l'ouverture de la vue.
  function secret(id){const s=SECRETS.find(x=>x.id===id);if(!s)return false;const ts=obj("ts",{});if(ts[id])return false;ts[id]=TODAY_ISO;saveP();rafraichir();return true}
  P26ui.fusion("tsv",(l,d)=>Math.max(N(l,0,99),N(d,0,99)));
  const secretsNeufs=()=>Math.max(0,Object.keys(obj("ts",{})).length-N(P26ui.etat("tsv",0),0,99));
  SA.secret=secret;
  const BONS=[];let SUITE=0;
  P26ui.on("reponse",d=>{if(!d||typeof d!=="object")return;const now=new Date(),h=now.getHours();
    if(h<5)secret("minuit");else if(h<7)secret("aurore");
    if(d.ok===true){SUITE++;BONS.push(Date.now());while(BONS.length>10)BONS.shift();if(BONS.length===10&&BONS[9]-BONS[0]<=30000)secret("rafale");if(SUITE>=20)secret("sansfaute")}
    else if(d.ok===false){SUITE=0;BONS.length=0}
    if(now.getDay()===0){const o=new Date(now);o.setDate(o.getDate()-1);if(P.j&&P.j[isoOf(o)])secret("weekend")}
    objectifVu(d)});
  // Arène : finir devant un joueur Diamant (Elo lu dans la base)
  P26ui.on("arene.fin",d=>{try{if(!d||!Array.isArray(d.board)||!(d.rang>0)||typeof ELO==="undefined"||!ELO.ok)return;
    const ps=typeof arPlayers==="function"?arPlayers():[];
    for(const row of d.board.slice(d.rang)){const k=String(row&&row.k||"").replace(/^h:/,"");const p=ps.find(x=>x.peer===k);const m=p&&/^([0-9a-f-]{36}):/.exec(String(p.peer));
      if(m&&m[1]!==UID&&eloDiv(eloOf(m[1]))>=3){secret("geant");break}}}catch(e){}});

  /* ---------------- Cadeau de retour (5 jours sans réviser) ---------------- */
  const RETOUR_JOURS=5,RETOUR_PIECES=150;
  const dateMax=(l,d)=>{const a=ISO.test(l||"")?l:"",b=ISO.test(d||"")?d:"";return a>b?a:b};
  P26ui.fusion("rt",dateMax);P26ui.fusion("rd",dateMax);
  const iso1=k=>{P26ui.etat(k,"");return ISO.test(P.p1[k]||"")?P.p1[k]:""};
  // Au démarrage : 5 jours ou plus sans réviser -> un cadeau attend (P.p1.rd). Il reste en attente jusqu'à ce que l'élève le récupère.
  function retourVerif(){const jours=Object.keys(P.j||{}).filter(x=>ISO.test(x)&&x<TODAY_ISO&&P.j[x]).sort();if(!jours.length)return false;const der=jours[jours.length-1];
    const ecart=Math.round((new Date(TODAY_ISO+"T12:00:00")-new Date(der+"T12:00:00"))/864e5);if(ecart<RETOUR_JOURS)return false;
    const rt=iso1("rt"),rd=iso1("rd");if(rt&&rt>der)return false;        // déjà offert depuis la dernière révision
    if(rd&&rd>der)return true;P.p1.rd=TODAY_ISO;P.p1.re=ecart;saveP();rafraichir();return true}
  const retourEnAttente=()=>{const rd=iso1("rd");return !!rd&&iso1("rt")<rd};
  function retourRecuperer(){if(!retourEnAttente())return false;const rd=iso1("rd");P.p1.rt=rd;gx("retour-"+rd,RETOUR_PIECES,"Cadeau de retour");saveP();piecesTop();
    toast(`<span class="tm">🎁</span><div><b>Bon retour ! ${RETOUR_PIECES} pièces pour toi</b><span>Une carte ce soir et c’est reparti.</span></div>`);
    secret("retour");try{if(typeof view!=="undefined"&&view==="table")render()}catch(e){}rafraichir();return true}
  SA.retourVerif=retourVerif;SA.retourRecuperer=retourRecuperer;SA.retourEnAttente=retourEnAttente;SA.RETOUR_PIECES=RETOUR_PIECES;

  /* ---------------- Objectif de cartes par semaine et par matière ---------------- */
  P26ui.fusion("ob",(l,d)=>{const src=l&&typeof l==="object"&&!Array.isArray(l)?l:d;const o={};if(src&&typeof src==="object"&&!Array.isArray(src))Object.entries(src).forEach(([k,v])=>{if(/^[a-z0-9_-]{1,24}$/.test(k))o[k]=N(v,0,500)});return o});
  function matieres(){let L=[];try{if(typeof clsMats==="function"&&P.cls)L=clsMats(P.cls)}catch(e){}
    const M=typeof C!=="undefined"&&C.M&&typeof C.M==="object"?C.M:{};if(!L.length)L=Object.keys(M);
    // Seulement les matières qui ont du contenu (C.M) : pas d'identifiant brut à l'écran.
    return [...new Set(L)].filter(m=>typeof m==="string"&&/^[a-z0-9_-]{1,24}$/.test(m)&&has(M,m))}
  const nomMat=m=>{try{const M=typeof C!=="undefined"&&C.M&&C.M[m];return M&&(M.nom||M.court)?String(M.nom||M.court):m}catch(e){return m}};
  function semaine(m){const d0=mondayOf(NOW);let s=0;for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);const x=P.sm&&P.sm[isoOf(d)];if(x&&typeof x==="object")s+=N(x[m],0,1e6)}return s}
  function objectifs(){const ob=obj("ob",{});return matieres().map(m=>({m,nom:nomMat(m),but:N(ob[m],0,500),fait:semaine(m)}))}
  SA.objectifs=objectifs;
  function fixer(m,n){const ob=obj("ob",{});ob[m]=N(n,0,500);if(!ob[m])delete ob[m];saveP()}
  SA.fixer=fixer;
  const OBV={};
  function objectifVu(d){if(!d||d.ok!==true||d.mode!=="carte")return;setTimeout(()=>{for(const o of objectifs()){if(!o.but||o.fait<o.but)continue;const k=WEEK+":"+o.m;
      const vu=LS.get("sa_ob",{});if(vu[k]||OBV[k])continue;OBV[k]=1;vu[k]=1;try{LS.set("sa_ob",Object.fromEntries(Object.entries(vu).filter(([x])=>x.startsWith(WEEK))))}catch(e){}
      toast(`<span class="tm">✓</span><div><b>Objectif atteint en ${esc(o.nom)} !</b><span>${o.fait} cartes cette semaine.</span></div>`)}rafraichir()},0)}

  /* ---------------- Saisons Elo mensuelles ---------------- */
  const DIVN=["bronze","argent","or","diamant"];
  P26ui.fusion("es",(l,d)=>{const o={};[l,d].forEach(x=>{if(x&&typeof x==="object"&&!Array.isArray(x))Object.entries(x).forEach(([m,v])=>{if(MOIS.test(m))o[m]=Math.max(o[m]||0,N(v,0,3))})});
    Object.keys(o).sort().reverse().slice(12).forEach(m=>delete o[m]);return o});
  const esId=(m,d)=>"es-"+m.slice(2,4)+m.slice(5,7)+"-"+DIVN[d];
  function esParse(id){const x=/^es-(\d{2})(\d{2})-(argent|or|diamant)$/.exec(String(id||""));if(!x)return null;const mm=+x[2];if(mm<1||mm>12)return null;
    const m="20"+x[1]+"-"+x[2];if(m>=moisCourant())return null;return {m,d:DIVN.indexOf(x[3]),id}}
  function esObserver(){if(!connecte()||typeof ELO==="undefined"||!ELO.ok)return;const d=eloDiv(myElo()),m=moisCourant(),es=obj("es",{});
    if(d>N(es[m],0,3)){es[m]=d;saveP()}}
  // Base : table elo_saisons (sql/10-boutique.sql). Absente tant que le SQL n'est pas appliqué : on ne montre alors que mes propres cadres.
  const ESV={map:null,absent:false,t:0,cours:null};
  function esCharger(force){if(ESV.absent||!connecte()||!window.P26||typeof P26.lire!=="function")return Promise.resolve();if(ESV.cours)return ESV.cours;
    if(!force&&Date.now()-ESV.t<300000)return Promise.resolve();ESV.t=Date.now();
    ESV.cours=P26.lire("elo_saisons",q=>q.select("uid,mois,div").limit(5000)).then(rows=>{const mp={};(rows||[]).forEach(r=>{if(!r||typeof r.uid!=="string"||!/^[0-9a-f-]{36}$/.test(r.uid))return;
        const m=String(r.mois||"").slice(0,7);if(!MOIS.test(m))return;(mp[r.uid]=mp[r.uid]||{})[m]=Math.max((mp[r.uid]||{})[m]||0,N(r.div,0,3))});ESV.map=mp;
        if(mp[UID]){const es=obj("es",{});let ch=false;Object.entries(mp[UID]).forEach(([m,d])=>{if(d>N(es[m],0,3)){es[m]=d;ch=true}});if(ch){saveP();esDonner()}}
        try{if(typeof view!=="undefined"&&view==="ligue"&&!LG.defi)renderLigue()}catch(e){}},
      e=>{if(e&&e.code==="absent")ESV.absent=true}).finally(()=>{ESV.cours=null});return ESV.cours}
  SA.ESV=ESV;SA.esCharger=esCharger;
  function esGagnes(){const es=obj("es",{}),m0=moisCourant();return Object.keys(es).filter(m=>MOIS.test(m)&&m<m0&&N(es[m],0,3)>=1).sort().map(m=>{const d=N(es[m],0,3);return {m,d,id:esId(m,d)}})}
  SA.esGagnes=esGagnes;
  function esCadres(){const T4=window.P1T4;if(!T4||!T4.catalogue||!Array.isArray(T4.catalogue.CAD))return;const CAD=T4.catalogue.CAD;
    esGagnes().forEach(g=>{if(!CAD.some(c=>c.id===g.id))CAD.push({id:g.id,nom:"Saison "+moisNom(g.m)+" · "+DIVS[g.d],xp:1,g:"es",_k:"cad:"+g.id,k:"cad"})})}
  function esDonner(){esCadres();let n=0;P.own=P.own||{};for(const g of esGagnes()){const k="cad:"+g.id;if(P.own[k])continue;P.own[k]=1;n++;
      toast(`<span class="tm">◆</span><div><b>Cadre de saison gagné : ${esc(moisNom(g.m))} · ${esc(DIVS[g.d])}</b><span>Ta meilleure division du mois. Choisis-le dans ${NOM_VUE}.</span></div>`)}
    if(n){saveP();rafraichir()}return n}
  SA.esDonner=esDonner;SA.esId=esId;
  // Cadre de saison d'un autre joueur : seulement si la base confirme sa division ce mois-là. Le mien : vérifié par boutique.js (P.own).
  function cadreGarde(){if(SA.cadOrig||typeof P26ui.cadre!=="function")return;SA.cadOrig=P26ui.cadre;
    P26ui.cadre=r=>{if(r&&typeof r.cad==="string"&&/^es-/.test(r.cad)&&!(r.me===true||r.id===UID)){const g=esParse(r.cad);
        const ok=g&&ESV.map&&ESV.map[r.id]&&N(ESV.map[r.id][g.m],0,3)>=g.d;return ok?` data-cadre="${g.id}"`:""}
      return SA.cadOrig(r)}}
  function choisirCadre(id){P.sk=Object.assign({},P.sk||{});P.sk.cad=P.sk.cad===id?"":id;saveP();pousser();piecesTop();rafraichir()}
  P26ui.on("slot:ligue.haut",()=>{esObserver();esCharger()},90);
  P26ui.on("arene.fin",()=>setTimeout(()=>{esObserver();},4000));
  setInterval(()=>{if(document.visibilityState==="visible")esObserver()},60000);

  /* ---------------- Vue « Ma saison » (« Passe de saison » si PASSE_ACTIF) ---------------- */
  const etatV={sel:0};
  function joursRestants(){const d=new Date(NOW),f=new Date(d.getFullYear(),d.getMonth()+1,1);return Math.max(1,Math.round((f-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5))}
  const ico=R=>R.t==="joker"?"½":R.t==="objet"?"◆":R.t==="final"?"★":"●";
  function passeHTML(){const m=moisCourant(),xp=xpMois(m),k=palier(xp),ps=obj("ps",{}),recu=N(ps[m],0,PALIERS);
    const nx=Math.min(PALIERS,k+1),a=seuilP(k),b=seuilP(nx),p=k>=PALIERS?1:(xp-a)/Math.max(1,b-a);
    const sel=etatV.sel>=1&&etatV.sel<=PALIERS?etatV.sel:Math.min(PALIERS,Math.max(1,k+1));const R=recomp(sel);
    const cases=Array.from({length:PALIERS},(_,i)=>{const n=i+1,Rn=recomp(n),fait=n<=recu,pret=!fait&&n<=k,cur=n===k+1;
      return `<button type="button" class="sa-p${fait?" fait":""}${pret?" pret":""}${cur?" cur":""}${n===sel?" sel":""}${Rn.t!=="pieces"?" spe":""}" data-sap="${n}" aria-pressed="${n===sel}" aria-label="Palier ${n}${fait?", reçu":pret?", à récupérer":", "+fmtN(seuilP(n))+" XP"} : ${esc(Rn.txt)}"><b>${n}</b><i aria-hidden="true">${fait?"✓":pret?"!":ico(Rn)}</i></button>`}).join("");
    const nd=Math.max(0,k-recu);
    return `<section class="sa-head"><span class="eyebrow">Passe de saison · ${esc(moisNom(m))}</span><div class="sa-big"><b>Palier ${k}</b><span>/ ${PALIERS}</span></div>
        <span class="bar sa-bar" style="--p:${Math.max(0,Math.min(1,p)).toFixed(3)}"><i></i></span>
        <p>${fmtN(xp)} XP ce mois-ci${k>=PALIERS?" · passe terminé, bravo !":` · encore ${fmtN(b-xp)} XP pour le palier ${nx}`}</p>
        <small>Gratuit pour tout le monde. Nouveau passe dans ${joursRestants()} jour${joursRestants()>1?"s":""}.</small>
        ${nd?`<button class="btn light sa-rec" type="button" data-sarec>Récupérer ${nd} récompense${nd>1?"s":""}</button>`:""}</section>
      <div class="sa-grille">${cases}</div>
      <div class="sa-det" aria-live="polite"><b>Palier ${sel}</b><span>${esc(R.txt)}</span><small>${sel<=recu?"Reçu":sel<=k?"Atteint : à récupérer":fmtN(seuilP(sel))+" XP dans le mois"}</small></div>`}
  function objHTML(){const L=objectifs();if(!L.length)return "";
    const atteints=L.filter(o=>o.but&&o.fait>=o.but).length,fixes=L.filter(o=>o.but).length;
    return `<div class="sec"><h2>Objectifs de la semaine</h2><span>${fixes?atteints+" / "+fixes:"à fixer"}</span></div>
      <p class="p1note">Choisis combien de cartes tu veux revoir par matière cette semaine. Le compteur repart lundi.</p>
      <ul class="sa-obj">${L.map(o=>{const p=o.but?Math.min(1,o.fait/o.but):0;return `<li class="${o.but&&o.fait>=o.but?"ok":""}"><b>${esc(o.nom)}</b>
        <span class="bar" style="--p:${p.toFixed(3)}"><i></i></span><small>${o.but?fmtN(o.fait)+" / "+fmtN(o.but)+" cartes":fmtN(o.fait)+" cartes, pas d’objectif"}</small>
        <span class="sa-step"><button type="button" class="sa-pm" data-sao="${esc(o.m)}" data-d="-5" aria-label="Baisser l’objectif en ${esc(o.nom)}" ${o.but?"":"disabled"}>−</button><output aria-live="polite">${o.but||0}</output><button type="button" class="sa-pm" data-sao="${esc(o.m)}" data-d="5" aria-label="Monter l’objectif en ${esc(o.nom)}">+</button></span></li>`}).join("")}</ul>`}
  function secretsHTML(){const ts=obj("ts",{}),n=SECRETS.filter(s=>ts[s.id]).length;
    return `<div class="sec"><h2>Trophées secrets</h2><span>${n} / ${SECRETS.length}</span></div><p class="p1note">Ils se débloquent en jouant. Leur condition reste cachée tant que tu ne les as pas.</p>
      <div class="sa-sec">${SECRETS.map(s=>ts[s.id]?`<div class="sa-s ok"><i aria-hidden="true">★</i><b>${esc(s.nom)}</b><small>${esc(s.cond)}</small></div>`:`<div class="sa-s" aria-label="Trophée secret pas encore trouvé"><i aria-hidden="true">?</i><b>Secret</b><small>Continue à jouer.</small></div>`).join("")}</div>`}
  function esHTML(){if(!connecte())return "";const m=moisCourant(),es=obj("es",{}),d=N(es[m],0,3),G=esGagnes().slice().reverse(),choisi=(P.sk&&P.sk.cad)||"";
    const avc=id=>{try{const r=avParts({nick:myNick()||"Moi",av:avData(),avk:avK(),me:true});return `<span class="av sm" style="--av:${r.col}" data-cadre="${id}">${r.inner}</span>`}catch(e){return ""}};
    return `<div class="sec"><h2>Saisons Elo</h2><span>${esc(moisNom(m))}</span></div>
      <p class="p1note">Ta meilleure division du mois en Arène classée te donne un cadre exclusif le 1er du mois suivant. ${d>=1?`Ce mois-ci : <b>${esc(DIVS[d])}</b>.`:"Atteins la division Argent (1100 d’Elo) pour gagner le cadre du mois."}</p>
      ${G.length?`<div class="sa-es">${G.map(g=>`<div class="sa-e">${avc(g.id)}<div><b>${esc(moisNom(g.m))}</b><small>${esc(DIVS[g.d])}</small></div><button type="button" class="s2mini" data-saes="${g.id}" aria-pressed="${choisi===g.id}" aria-label="${choisi===g.id?"Retirer":"Choisir"} le cadre de saison ${esc(moisNom(g.m))}">${choisi===g.id?"Choisi":"Choisir"}</button></div>`).join("")}</div>`:""}`}
  P26ui.vue("saison",{titre:NOM_VUE,rendre(box){
    const nts=Object.keys(obj("ts",{})).length;if(N(P26ui.etat("tsv",0),0,99)!==nts){P.p1.tsv=nts;saveP()}
    box.innerHTML=`<div class="ihead"><span></span><button class="linkbtn" type="button" id="saBack">Retour</button></div><h1 class="adh">${NOM_VUE}</h1><div class="sa">${retourHTML()}${PASSE_ACTIF?passeHTML():""}${objHTML()}${secretsHTML()}${esHTML()}</div>`;
    box.querySelector("#saBack").onclick=()=>P26ui.retour();
    const rc=PASSE_ACTIF&&box.querySelector("[data-sarec]");if(rc)rc.onclick=()=>{buzz(18);recuperer(true);P26ui._rendre()};
    const rr=box.querySelector("[data-saret]");if(rr)rr.onclick=()=>{buzz(18);retourRecuperer();P26ui._rendre()};
    box.querySelectorAll("[data-sap]").forEach(b=>b.onclick=()=>{etatV.sel=+b.dataset.sap;P26ui._rendre()});
    box.querySelectorAll("[data-sao]").forEach(b=>b.onclick=()=>{const m=b.dataset.sao;const o=objectifs().find(x=>x.m===m);if(!o)return;fixer(m,o.but+(+b.dataset.d||0));buzz(8);P26ui._rendre()});
    box.querySelectorAll("[data-saes]").forEach(b=>b.onclick=()=>{const g=esGagnes().find(x=>x.id===b.dataset.saes);if(!g||!(P.own&&P.own["cad:"+g.id]))return;esCadres();choisirCadre(g.id)})}});
  function retourHTML(){return retourEnAttente()?`<div class="sa-ret"><i aria-hidden="true">🎁</i><div><b>Bon retour !</b><span>${RETOUR_PIECES} pièces t’attendent${N(P.p1.re,0,999)>=RETOUR_JOURS?" après "+N(P.p1.re,0,999)+" jours sans réviser":""}.</span></div><button class="btn light" type="button" data-saret>Récupérer</button></div>`:""}
  P26ui.on("slot:accueil",el=>{const m=moisCourant(),d=P26ui.bloc(el,"saison");d.className="sa-acc";
    const L=objectifs().filter(o=>o.but),at=L.filter(o=>o.fait>=o.but).length,ns=secretsNeufs();
    if(PASSE_ACTIF){const xp=xpMois(m),k=palier(xp),nd=dispo(m);
      const puce=nd?`<em class="sa-new">${nd} à récupérer</em>`:ns?`<em class="sa-new">★ Nouveau trophée secret</em>`:"";
      d.innerHTML=retourHTML()+`<button type="button" class="sa-card" aria-label="Passe de saison : palier ${k} sur ${PALIERS}${nd?", "+nd+" récompense"+(nd>1?"s":"")+" à récupérer":""}${ns?", nouveau trophée secret":""}. Ouvrir"><span><b>Passe de saison</b><small>${L.length?"Objectifs "+at+" / "+L.length+" · ":""}${esc(MNOM[N(+m.slice(5,7)-1,0,11)])}</small>${puce}</span><span class="sa-k">${k}<em>/${PALIERS}</em></span><span class="bar" style="--p:${(k/PALIERS).toFixed(3)}"><i></i></span></button>`}
    else{const nt=SECRETS.filter(s=>obj("ts",{})[s.id]).length,T=SECRETS.length;
      const puce=ns?`<em class="sa-new">★ Nouveau trophée secret</em>`:"";
      d.innerHTML=retourHTML()+`<button type="button" class="sa-card" aria-label="Ma saison : ${nt} trophée${nt>1?"s":""} secret${nt>1?"s":""} sur ${T}${L.length?", objectifs "+at+" sur "+L.length:""}${ns?", nouveau trophée secret":""}. Ouvrir"><span><b>Ma saison</b><small>${L.length?"Objectifs "+at+" / "+L.length+" · ":"Objectifs, "}trophées secrets</small>${puce}</span><span class="sa-k">${nt}<em>/${T}</em></span><span class="bar" style="--p:${(nt/T).toFixed(3)}"><i></i></span></button>`}
    d.querySelector(".sa-card").onclick=()=>P26ui.ouvrir("saison");const rr=d.querySelector("[data-saret]");if(rr)rr.onclick=()=>{buzz(18);retourRecuperer()}},25);

  /* ---------------- Musique pour réviser : lecteur YouTube (mode sans cookie) ----------------
     La CSP du site n'autorise qu'un seul cadre : https://www.youtube-nocookie.com (frame-src, split.py). Rien n'est chargé depuis YouTube
     avant l'appui sur « Lancer ». Le cadre est isolé (sandbox sans fenêtres surgissantes), l'identifiant de vidéo est vérifié (11 caractères). */
  const YT_ID=/^[A-Za-z0-9_-]{11}$/;
  function ytId(t){t=String(t||"").trim();if(YT_ID.test(t))return t;let u;try{u=new URL(t)}catch(e){return ""}
    if(u.protocol!=="https:"&&u.protocol!=="http:")return "";const h=u.hostname.replace(/^(www|m|music)\./,"");let id="";
    if(h==="youtu.be")id=u.pathname.slice(1).split("/")[0];
    else if(h==="youtube.com"||h==="youtube-nocookie.com"){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else{const m=/^\/(embed|shorts|live)\/([^/?#]+)/.exec(u.pathname);if(m)id=m[2]}}
    return YT_ID.test(id)?id:""}
  SA.ytId=ytId;
  function ytFermer(){const d=document.getElementById("saYt");if(d)d.remove()}
  function ytOuvrir(id){if(!YT_ID.test(id))return false;ytFermer();try{LS.set("sa_yt",id)}catch(e){}
    const d=document.createElement("div");d.id="saYt";d.className="sa-yt";d.setAttribute("role","region");d.setAttribute("aria-label","Lecteur de musique");
    d.innerHTML=`<div class="sa-yth"><b>Musique</b><button type="button" class="sa-ytb" data-saytp aria-label="Réduire le lecteur" aria-pressed="false">–</button><button type="button" class="sa-ytb" data-saytx aria-label="Fermer le lecteur">×</button></div>`;
    const f=document.createElement("iframe");f.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0&playsinline=1";f.title="Lecteur YouTube";
    f.setAttribute("allow","autoplay; encrypted-media; picture-in-picture");f.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
    f.setAttribute("sandbox","allow-scripts allow-same-origin allow-presentation");f.setAttribute("loading","lazy");d.appendChild(f);document.body.appendChild(d);
    d.querySelector("[data-saytx]").onclick=ytFermer;
    d.querySelector("[data-saytp]").onclick=e=>{const p=d.classList.toggle("petit");e.currentTarget.setAttribute("aria-pressed",String(p));e.currentTarget.setAttribute("aria-label",p?"Agrandir le lecteur":"Réduire le lecteur");e.currentTarget.textContent=p?"+":"–"};
    return true}
  SA.ytOuvrir=ytOuvrir;SA.ytFermer=ytFermer;
  P26ui.on("slot:profil.reglages",el=>{const d=P26ui.bloc(el,"saison");d.className="sa-ytr";let der="";try{der=LS.get("sa_yt","")}catch(e){}
    d.innerHTML=`<b>Musique pendant les révisions</b><p class="p1note">Colle le lien d’une vidéo YouTube. Le lecteur se charge seulement quand tu appuies sur Lancer, en mode sans cookie, et reste ouvert d’une page à l’autre.</p>
      <div class="sa-ytf"><label class="lab" for="saYtIn">Lien YouTube</label><input id="saYtIn" class="inp" inputmode="url" autocomplete="off" placeholder="https://youtu.be/…" value="${esc(YT_ID.test(der)?"https://youtu.be/"+der:"")}">
      <button class="btn ghost" type="button" id="saYtGo">Lancer</button></div><p class="sa-yterr" role="status"></p>`;
    const i=d.querySelector("#saYtIn"),e=d.querySelector(".sa-yterr");
    d.querySelector("#saYtGo").onclick=()=>{const id=ytId(i.value);if(!id){e.textContent="Ce lien n’est pas une vidéo YouTube.";return}e.textContent="";ytOuvrir(id)}},70);

  /* ---------------- Démarrage : attend la progression du compte (sinon un soir révisé ailleurs serait pris pour une absence) ---------------- */
  // Les jokers du passe (s'il est actif) passent par boutique2.js : on l'attend aussi.
  const pretB2=window.P26mod&&Array.isArray(window.P26_MODS)&&P26_MODS.includes("boutique2.js")?P26mod("boutique2").catch(()=>null):Promise.resolve();
  Promise.all([pretB,pretB2]).then(()=>(function demarrer(k){if(typeof remoteOK!=="undefined"&&!remoteOK&&connecte()&&k<6){setTimeout(()=>demarrer(k+1),2000);return}
    try{retourVerif()}catch(e){}try{esObserver();esDonner()}catch(e){}
    if(window.P26&&P26.ready&&typeof P26.ready.then==="function")P26.ready.then(()=>esCharger(true),()=>{})})(0));
})();
P26mod.ok("saison");

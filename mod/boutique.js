/* ================= Paquet 1, Progresser (T4) : boutique, cadres, titres, effets de victoire, objets utiles =================
   Module préchargé (P26ui.precharger). Plan : /home/claude/plans/paquet1.md §3.3 c et e.
   Prix fixes en pièces (1 XP gagné = 1 pièce) : aucun coffre, aucune roue, aucun tirage. Rien ne s'achète avec de l'argent.
   Choix gardés dans P.sk.cad, P.sk.tit, P.sk.vic ; achats dans P.own / P.buy comme le reste de la boutique (buyItem).
   Ce que les autres voient (cadre, titre) est revérifié à l'affichage : liste blanche, division par l'Elo de la base,
   niveau par l'XP total publié, objets gagnés par les trophées publiés (tr). */
(function(){
  "use strict";
  const T4=window.P1T4=window.P1T4||{};
  if(!T4.sousPose){T4.sousPose=true;P26ui.sous(r=>["niv","titre","flamme"].map(k=>typeof T4[k]==="function"?T4[k](r):"").filter(Boolean).join(" · "))}
  const N=(x,lo,hi)=>{const n=Math.round(+x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};
  const niveau=xp=>{if(typeof T4.niveau==="function")return T4.niveau(xp);xp=Math.max(0,+xp||0);let n=1;while(n<100&&xp>=5*n*n+15*n)n++;return n};

  /* ---------------- Catalogue (prix fixes) ---------------- */
  const CAD=[
    {id:"",nom:"Aucun",xp:0,g:"s"},
    {id:"or",nom:"Or",xp:80,g:"s"},{id:"menthe",nom:"Menthe",xp:80,g:"s"},{id:"corail",nom:"Corail",xp:120,g:"s"},
    {id:"pointilles",nom:"Pointillés",xp:150,g:"s"},{id:"double",nom:"Double",xp:200,g:"s"},{id:"encre",nom:"Encre",xp:250,g:"s"},
    {id:"neon",nom:"Néon",xp:600,g:"a"},{id:"flammes",nom:"Flammes",xp:900,g:"a"},{id:"arc",nom:"Arc-en-ciel",xp:1200,g:"a"},{id:"or-vivant",nom:"Or vivant",xp:1500,g:"a"},
    {id:"div-argent",nom:"Argent",g:"w",div:1,cond:"atteins la division Argent"},
    {id:"div-or",nom:"Or",g:"w",div:2,cond:"atteins la division Or"},
    {id:"div-diamant",nom:"Diamant",g:"w",div:3,cond:"atteins la division Diamant"},
    {id:"niv-10",nom:"Niveau 10",g:"w",niv:10,cond:"atteins le niveau 10"},{id:"niv-25",nom:"Niveau 25",g:"w",niv:25,cond:"atteins le niveau 25"},
    {id:"niv-50",nom:"Niveau 50",g:"w",niv:50,cond:"atteins le niveau 50"},{id:"niv-100",nom:"Niveau 100",g:"w",niv:100,cond:"atteins le niveau 100"},
    {id:"champion",nom:"Champion",g:"w",tr:"champion_arene",cond:"finis 1er d’une Arène à 3 joueurs ou plus"},
    {id:"verbes-100",nom:"100 verbes",g:"w",tr:"centverbes",cond:"sache 100 verbes irréguliers"}];
  const TIT=[
    {id:"",nom:"Aucun",xp:0},
    {id:"silence",nom:"Révise en silence",xp:100},{id:"couche-tard",nom:"Couche-tard",xp:150},{id:"leve-tot",nom:"Lève-tôt",xp:150},
    {id:"fan-maths",nom:"Fan de maths",xp:200},{id:"polyglotte",nom:"Polyglotte",xp:200},{id:"bibliothecaire",nom:"Bibliothécaire",xp:300},
    {id:"survivant",nom:"Survivant",tr:"survivant",sv:25,cond:"atteins 25 en Survie"},
    {id:"eclair",nom:"Éclair",tr:"eclair",vf:30,cond:"fais 30 au Vrai ou faux express"},
    {id:"stratege",nom:"Stratège",tr:"stratege",cond:"obtiens 16/20 à l’épreuve de maths"},
    {id:"centurion",nom:"Centurion",niv:25,cond:"atteins le niveau 25"}];
  const VIC=[{id:"",nom:"Aucun",xp:0},{id:"confettis",nom:"Confettis",xp:300},{id:"etoiles",nom:"Étoiles",xp:450},{id:"feu",nom:"Feu d’artifice",xp:600}];
  [["cad",CAD],["tit",TIT],["vic",VIC]].forEach(([k,L])=>L.forEach(it=>{it._k=k+":"+it.id;it.k=k}));
  const LISTE={cad:CAD,tit:TIT,vic:VIC};
  const trouve=(k,id)=>(LISTE[k]||[]).find(x=>x.id===id&&typeof id==="string");
  T4.catalogue={CAD,TIT,VIC};

  /* ---------------- Ce que j'ai gagné (mes données) ---------------- */
  function verbesSus(){const s=new Set();Object.entries(P.vb||{}).forEach(([k,v])=>{if(v&&(v.ok||0)>=2&&!((v.ko||0)>(v.ok||0)))s.add(k.split(":").slice(1).join(":"))});return s.size}
  function noteMaxEpreuve(){let m=0;const ep=P.p1&&P.p1.ep;if(ep&&typeof ep==="object")Object.values(ep).forEach(v=>{if(v&&typeof v==="object")m=Math.max(m,+v.n||0)});return m}
  // Trophées publiés dans ma ligne de ligue (tr) : servent aux autres à vérifier mes cadres et titres gagnés.
  function gagnesSync(){const add=k=>{if(!P.t[k]){P.t[k]=TODAY_ISO;return true}return false};let ch=false;
    const p1=P.p1||{};
    if(N(p1.sv,0,1e4)>=25)ch=add("survivant")||ch;
    if(N(p1.vf,0,1e4)>=30)ch=add("eclair")||ch;
    if(noteMaxEpreuve()>=16)ch=add("stratege")||ch;
    if(verbesSus()>=100)ch=add("centverbes")||ch;
    if(ch){saveP();try{lgPush()}catch(e){}}return ch}
  T4.gagnesSync=gagnesSync;
  function gagneMoi(it){
    if(it.div!=null)return eloDiv(myElo())>=it.div;
    if(it.niv!=null)return niveau(totalXP())>=it.niv;
    if(it.tr==="champion_arene")return !!P.t.champion_arene;
    if(it.tr)return !!P.t[it.tr];
    return false}
  const gagnable=it=>it.div!=null||it.niv!=null||!!it.tr;
  const possede=it=>!!it&&(gagnable(it)?gagneMoi(it):(!it.xp||!!(P.own&&P.own[it._k])));
  const choisi=k=>{const id=P.sk&&P.sk[k];const it=trouve(k,id||"");return it&&it.id&&possede(it)?it.id:""};
  T4.choisi=choisi;

  /* ---------------- Ce que les autres revendiquent : revérifié ---------------- */
  function gagneAutre(it,r){const row=(LG.rows||[]).find(x=>x.id===r.id)||{};const v=k=>k in r?r[k]:row[k];
    const tr=Array.isArray(r.tr)?r.tr:Array.isArray(row.tr)?row.tr:[];
    if(it.div!=null)return eloDiv(eloOf(r.id))>=it.div;
    if(it.niv!=null){const tot=v("tot");if(tot==null)return false;const n=Math.min(niveau(tot),"niv" in r||"niv" in row?N(v("niv"),1,100):100);return n>=it.niv}
    if(it.tr&&tr.includes(it.tr))return true;
    if(it.sv&&N(v("sv"),0,1e4)>=it.sv)return true;
    if(it.vf&&N(v("vf"),0,1e4)>=it.vf)return true;
    return false}
  // Achetés : pas vérifiables par la base au paquet 1 (achats dans la progression du compte, voir plan R9) ; seule la liste blanche compte.
  const montrable=(it,r)=>!gagnable(it)||gagneAutre(it,r);
  P26ui.cadre=r=>{if(!r||typeof r.id!=="string"||!r.id)return "";
    if(r.me){const id=choisi("cad");return id?` data-cadre="${id}"`:""}
    const it=trouve("cad",r.cad);if(!it||!it.id||!montrable(it,r))return "";return ` data-cadre="${it.id}"`};
  T4.titre=r=>{let it;if(r.me)it=trouve("tit",choisi("tit"));else{it=trouve("tit",r.tit);if(it&&!montrable(it,r))it=null}
    return it&&it.id?`<span class="p1tit">${esc(it.nom)}</span>`:""};
  P26ui.ligne(()=>({cad:choisi("cad"),tit:choisi("tit")}));

  /* ---------------- Effets de victoire (1,5 s, rien si mouvement réduit) ---------------- */
  const COUL=["#E7C66B","#C1272D","#1F3F8F","#FAFAF7","#7BE0A4","#F7C6D6"];
  function jouer(id){if(!id||reduce||!document.body)return null;
    const box=document.createElement("div");box.className="p1fx";box.setAttribute("aria-hidden","true");box.dataset.fx=id;document.body.appendChild(box);
    const W=innerWidth,H=innerHeight,R=Math.random,part=(cls,x,y,c)=>{const p=document.createElement("i");p.className=cls;p.style.left=x+"px";p.style.top=y+"px";p.style.background=c;box.appendChild(p);return p};
    const fin=()=>box.remove();
    if(id==="confettis"){for(let i=0;i<44;i++){const p=part("p1cf",R()*W,-20,COUL[i%COUL.length]);const dx=(R()-.5)*120,dy=H*(.55+R()*.5),rot=(R()-.5)*900;
        p.animate([{transform:"translate(0,0) rotate(0)",opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rot}deg)`,opacity:.9,offset:.85},{transform:`translate(${dx*1.1}px,${dy*1.08}px) rotate(${rot*1.1}deg)`,opacity:0}],{duration:1300+R()*200,delay:R()*150,easing:"cubic-bezier(.2,.6,.4,1)",fill:"forwards"})}}
    else if(id==="etoiles"){const cx=W/2,cy=H*.42;for(let i=0;i<18;i++){const p=part("p1st",cx-8,cy-8,COUL[i%3===0?3:0]);const a=Math.PI*2*i/18+R()*.3,d=90+R()*120;
        p.animate([{transform:"translate(0,0) scale(.2) rotate(0)",opacity:0},{transform:`translate(${Math.cos(a)*d*.6}px,${Math.sin(a)*d*.6}px) scale(1.1) rotate(90deg)`,opacity:1,offset:.35},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(.4) rotate(200deg)`,opacity:0}],{duration:1400,delay:R()*120,easing:"cubic-bezier(.23,1,.32,1)",fill:"forwards"})}}
    else if(id==="feu"){for(let b=0;b<3;b++){const cx=W*(.25+.25*b)+(R()-.5)*40,cy=H*(.25+R()*.2),c=COUL[[0,1,4][b]];
        for(let i=0;i<22;i++){const p=part("p1fw",cx-3,cy-3,i%4?c:COUL[3]);const a=Math.PI*2*i/22,d=60+R()*50;
          p.animate([{transform:"translate(0,0) scale(1)",opacity:0},{transform:"translate(0,0) scale(1)",opacity:1,offset:.05},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+30}px) scale(.3)`,opacity:0}],{duration:1050,delay:b*220,easing:"cubic-bezier(.16,1,.3,1)",fill:"forwards"})}}}
    else {fin();return null}
    setTimeout(fin,1600);return box}
  T4.jouer=jouer;
  P26ui.on("victoire",()=>{const id=choisi("vic");if(id)jouer(id)});
  P26ui.on("activite",()=>gagnesSync());

  /* ---------------- Onglets et rayons ---------------- */
  P26ui.on("boutique.onglets",L=>L.push(["cadres","Cadres"],["titres","Titres"],["victoire","Victoire"],["objets","Objets utiles"]));
  const prix=it=>fmtN(it.xp)+" pièces";
  function apercuCadre(id){let col="var(--gold)",inner="";try{const a=avParts({nick:myNick()||"Moi",av:avData(),avk:avK()});col=a.col;inner=a.inner}catch(e){inner=""}
    return `<span class="av p1av" style="--av:${col}"${id?` data-cadre="${id}"`:""}>${inner}</span>`}
  function bouton(it,inner){const k=it.k,on=(choisi(k)||"")===it.id&&(it.id||!choisi(k)),own=possede(it),gg=gagnable(it);
    const etat=on?"Choisi":own?esc(it.nom):gg?"Se gagne":prix(it);
    const aria=esc(it.nom)+(on?", choisi":own?"":gg?", se gagne : "+esc(it.cond):", à acheter pour "+prix(it));
    return `<button type="button" class="${on?"on":""}${own?"":" lock"}" data-p1b="${k}" data-id="${esc(it.id)}" aria-label="${aria}" aria-pressed="${on}">${inner}<span>${etat}</span></button>`}
  function rayon(t){const k=P.sk||{};
    if(t==="cadres"){const g=x=>CAD.filter(c=>c.g===x).map(c=>bouton(c,`<i class="p1v">${apercuCadre(c.id)}</i>`)).join("");
      return `<div class="shop p1shop"><h4>Simples</h4>${g("s")}</div><div class="shop p1shop"><h4>Animés</h4>${g("a")}</div><div class="shop p1shop"><h4>À gagner</h4>${g("w")}</div>
        <p class="shopnote">Ton cadre entoure ton avatar dans le classement, ton profil, la liste d’amis et l’Arène. Les cadres de division restent tant que tu es dans la division.</p>`}
    if(t==="titres"){const g=f=>TIT.filter(f).map(x=>bouton(x,`<i class="p1v p1tv">${x.id?esc(x.nom):"Sans titre"}</i>`)).join("");
      return `<div class="shop p1shop wide"><h4>À acheter</h4>${g(x=>!gagnable(x))}</div><div class="shop p1shop wide"><h4>À gagner</h4>${g(gagnable)}</div>
        <p class="shopnote">Le titre s’affiche sous ton pseudo, pour tout le monde.</p>`}
    if(t==="victoire")return `<div class="shop p1shop wide">${VIC.map(x=>bouton(x,`<i class="p1v p1vv" data-fx="${x.id||"aucun"}"></i>`)).join("")}</div>
        <p class="shopnote">L’effet se joue quand tu gagnes : duel, défi, Arène, bac blanc, quête parfaite. Touche un effet à toi pour le revoir.${reduce?" Animations réduites sur cet appareil : aucun effet ne sera joué.":""}</p>`;
    if(t==="objets"){const s=typeof T4.gelStock==="function"?T4.gelStock():0,max=T4.GEL_MAX||2,pr=T4.GEL_PRIX||150,plein=s>=max;
      return `<div class="p1obj"><i class="p1gelv" aria-hidden="true"></i><div><b>Gel de série</b><p>Un soir raté pardonné : si tu oublies de réviser un soir, ta série continue.</p><small>Tu en as ${s} sur ${max}.</small></div>
        <button class="btn light" type="button" data-p1gel ${plein?"disabled":""}>${plein?"Stock plein":fmtN(pr)+" pièces"}</button></div>`}
    return ""}
  function secoue(b){buzz([8,60,8]);if(!reduce&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260})}
  function choisir(k,id){P.sk=Object.assign({},P.sk||{});P.sk[k]=id;saveP();try{lgPush()}catch(e){}renderLigue();if(k==="vic"&&id)jouer(id)}
  function brancher(d){
    d.querySelectorAll("button[data-p1b]").forEach(b=>b.onclick=()=>{const it=trouve(b.dataset.p1b,b.dataset.id);if(!it)return;
      if(possede(it)){choisir(it.k,it.id);return}
      if(gagnable(it)){secoue(b);toast(`<span class="tm">◎</span><div><b>Se gagne : ${esc(it.cond)}</b><span>${esc(it.nom)}</span></div>`);return}
      const pr=+it.xp||0,have=coins();
      if(have<pr){secoue(b);toast(`<span class="tm">·</span><div><b>Pas assez de pièces</b><span>Il te manque ${fmtN(pr-have)} pièces. 1 XP gagné = 1 pièce.</span></div>`);return}
      if(!b.classList.contains("buy")){d.querySelectorAll("button.buy").forEach(x=>{x.classList.remove("buy");x.lastChild.textContent=x.dataset.lab||x.lastChild.textContent});
        b.dataset.lab=b.lastChild.textContent;b.classList.add("buy");b.lastChild.textContent="Acheter ? "+fmtN(pr);return}
      if(!buyItem(it))return;buzz(18);try{paintMyAv()}catch(e){}
      toast(`<span class="tm">✓</span><div><b>${esc(it.nom)} est à toi</b><span>−${fmtN(pr)} pièces · il t’en reste ${fmtN(coins())}</span></div>`);choisir(it.k,it.id)});
    const g=d.querySelector("[data-p1gel]");if(g)g.onclick=()=>{if(typeof T4.gelAcheter!=="function"){toast(`<span class="tm">·</span><div><b>Pas disponible pour l’instant</b></div>`);return}
      const pr=T4.GEL_PRIX||150;
      if(T4.gelStock()<(T4.GEL_MAX||2)&&coins()>=pr&&!g.classList.contains("buy")){g.classList.add("buy");g.textContent="Acheter ? "+fmtN(pr);return}
      const r=T4.gelAcheter();
      if(r==="ok")toast(`<span class="tm">❄</span><div><b>Gel de série acheté</b><span>−${fmtN(pr)} pièces · tu en as ${T4.gelStock()} sur ${T4.GEL_MAX||2}</span></div>`);
      else if(r==="pieces"){secoue(g);toast(`<span class="tm">·</span><div><b>Pas assez de pièces</b><span>Il te manque ${fmtN(pr-coins())} pièces.</span></div>`)}
      else toast(`<span class="tm">·</span><div><b>Tu as déjà ${T4.GEL_MAX||2} gels</b><span>C’est le maximum.</span></div>`);
      renderLigue()}}
  P26ui.on("slot:boutique.rayon",el=>{const t=el.dataset.t;if(!["cadres","titres","victoire","objets"].includes(t))return;
    const d=P26ui.bloc(el,"boutique");d.innerHTML=rayon(t);brancher(d)});

  gagnesSync();
})();
P26mod.ok("boutique");

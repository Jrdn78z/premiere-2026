/* ================= Lot P2 : skins de Personnage, dos et cadres assortis, packs =================
   Module préchargé (P26ui.precharger). Un skin habille le Personnage dessiné (avatar « b ») : tenue sur le torse,
   couvre-chef, accessoire et fond à thème. Chaque skin a un dos de cartes et un cadre assortis ; les trois forment un pack.
   Prix fixes en pièces (1 XP gagné = 1 pièce), achats dans P.own / P.buy comme le reste de la boutique.
   Un pack par matière est offert quand on a réussi 100 cartes de cette matière (P.c, case 1 ou plus).
   Aucun coffre, aucune roue, aucun tirage, aucun argent réel. Tous les dessins sont faits pour le site.
   Ce que les autres revendiquent (skin publié « skn » dans la ligne de classement, dos, présence d'Arène et de Duel)
   est revérifié à l'affichage par liste blanche : un identifiant inconnu n'est jamais affiché ni injecté. */
(function(){
  "use strict";
  const S2=window.P2S=window.P2S||{};
  const ID=/^[a-z0-9-]{1,24}$/;

  /* ---------------- Raretés et prix ---------------- */
  const RAR={c:{nom:"Commun",skn:200,dos:100,cad:100,pack:300},r:{nom:"Rare",skn:450,dos:250,cad:250,pack:700},
    e:{nom:"Épique",skn:1000,dos:500,cad:500,pack:1500},l:{nom:"Légendaire",skn:2000,dos:1000,cad:1000,pack:3000}};

  /* ---------------- Matières (groupes) : identifiants de MATDEF regroupés ---------------- */
  const GRP=[["maths","Maths",["maths","mt","mtp"]],["pc","Physique-chimie",["pc","pcp"]],["svt","SVT",["svt"]],
    ["hg","Histoire-géo",["hg","hgt","hgp","hggsp"]],["fr","Français",["fr","frt","frp"]],["ang","Anglais",["ang","angp","amc","llcer"]],
    ["esp","Espagnol",["esp"]],["ses","SES",["ses"]],["nsi","NSI",["nsi"]],["all","Allemand",["all"]],["ita","Italien",["ita"]],
    ["es","Ens. scientifique",["es"]],["hlp","HLP",["hlp"]],["emc","EMC",["emc"]],["si","SI",["si"]],["melec","MELEC",["melec"]],
    ["pse","PSE",["pse"]],["eco","Éco-gestion et droit",["ecog","sgn","mgt","de"]],["bonus","Hors matière",[]]];
  const GNOM={},GDE={};GRP.forEach(([g,n,L])=>{GNOM[g]=n;L.forEach(m=>GDE[m]=g)});

  /* ---------------- Catalogue des skins ----------------
     [id, nom, matière, rareté, couleurs [tenue, fond, accent, chapeau, second], tenue, emblème, couvre-chef, accessoire, fond, motif du dos, offert] */
  const L0=[
    ["geometre","Géomètre","maths","c",["#2F4A7A","#DCE6F2","#E7C66B","#C1272D","#F4F1E8"],"veste","equerre","beret","compas","grille","grille"],
    ["pi","Pi","maths","r",["#3949AB","#1C2560","#F3D27A","#F3D27A","#2A3590"],"sweat","pi","bonnet","rapporteur","chiffres","diag",1],
    ["fractale","Fractale","maths","e",["#5B2A86","#241034","#7BE0A4","#3A1A5C","#7BE0A4"],"cape","sier","pointu","sier","fractale","tri"],
    ["infini","Infini","maths","l",["#1A2350","#0B1026","#F3D27A","#F3D27A","#2D3B7A"],"combi","inf","aureole","etoile","cosmos","rayons"],
    ["labo","Labo","pc","c",["#F4F4F0","#CFEDE6","#2E9E8F","#2E9E8F","#3E73C9"],"blouse","erlen","lunettes","erlen","hexa","hexa"],
    ["atome","Atome","pc","r",["#167A7A","#0E2E3A","#7DF9FF","#7DF9FF","#0F5A5A"],"combi","atome","orbites","atome","particules","points",1],
    ["electricite","Électricité","pc","e",["#2B2F3A","#14182E","#FFD43B","#FFD43B","#3A4250"],"veste","eclair","statique","eclair","zigzag","zigzag"],
    ["prisme","Prisme","pc","l",["#F4F4F0","#10142A","#FF6B6B","#BFE6F7","#7B52C9"],"toge","prisme","diademe","prisme","arcenciel","arc"],
    ["botaniste","Botaniste","svt","c",["#4F8A3C","#E3F2D3","#F2C49B","#E8D29A","#F4F1E8"],"gilet","feuille","paille","pousse","feuilles","points"],
    ["adn","ADN","svt","r",["#F4F4F0","#1E3B5C","#FF6FA3","#4C9BE8","#4C9BE8"],"blouse","adn","bandeau","adn","cellules","diag",1],
    ["volcan","Volcan","svt","e",["#B8BEC6","#2A0F0A","#FF6A2B","#FF8C1A","#7A7F86"],"combi","flamme","casque","volcan","lave","points"],
    ["ocean","Océan","svt","l",["#0F4C81","#0A2E4F","#7FE3F0","#FFC857","#1E6FB0"],"combi","vague","plongee","poisson","vagues","vagues"],
    ["explorateur","Explorateur","hg","c",["#B59A6A","#E9DFC4","#8B5A2B","#7A5530","#EFE6D0"],"gilet","boussole","aventurier","boussole","carte","damier"],
    ["cartographe","Cartographe","hg","r",["#2E5C4E","#EADFC2","#C1272D","#1F2A30","#F4F1E8"],"veste","rose","tricorne","parchemin","meridiens","grille"],
    ["revolution","Révolution","hg","r",["#1F3F8F","#F2EEE3","#C1272D","#C1272D","#FAFAF7"],"jabot","cocarde","phrygien","drapeau","bandes3","bandes",1],
    ["legionnaire","Légionnaire","hg","r",["#B0B6BE","#E8D5A8","#B3261E","#C9CED4","#B3261E"],"bandes","laurier","galea","bouclier","colonnes","diag"],
    ["chevalier","Chevalier","hg","e",["#C9CED4","#23324F","#E7C66B","#AEB5BE","#1F3F8F"],"armure","bouclier","heaume","epee","blason","losanges"],
    ["pharaon","Pharaon","hg","l",["#F3EBD6","#E9C46A","#1F4FA3","#E7C66B","#1F4FA3"],"usekh","pyramide","nemes","crosse","pyramides","rayons"],
    ["plume","Plume","fr","c",["#7A2E4D","#F6F1E1","#1F3F8F","#3B3B3B","#F4F1E8"],"gilet","plume","gavroche","plume","cahier","lignes"],
    ["theatre","Théâtre","fr","r",["#8E1B2C","#3A0A12","#E7C66B","#1F1F1F","#5A0E1B"],"cape","masques","mousquetaire","masques","rideau","losanges",1],
    ["poete","Poète","fr","e",["#23324F","#121A33","#F3D27A","#6BAA5A","#F4F1E8"],"jabot","lune","laurier","livre","nuit","points"],
    ["lumieres","Lumières","fr","l",["#4A6FA5","#F7E7B4","#E7C66B","#EDEDED","#F4F1E8"],"redingote","bougie","perruque","bougie","soleil","rayons"],
    ["teatime","Tea time","ang","c",["#D9C6A5","#F4E9E1","#C1272D","#1F1F1F","#8B5A2B"],"gilet","tasse","melon","tasse","vichy","damier"],
    ["london","London","ang","r",["#C9A66B","#8E1B1B","#C1272D","#1F1F1F","#1F3F8F"],"trench","parapluie","hautdeforme","parapluie","briques","damier",1],
    ["rock","Rock","ang","e",["#1F1F1F","#2A1240","#FF3B6B","#C1272D","#F4F4F0"],"perfecto","note","bandana","guitare","scene","zigzag"],
    ["sol","Sol","esp","c",["#F2B33D","#FFE7A8","#E8562E","#E8562E","#FFF6DA"],"chemise","soleil","visiere","soleil","rayons","rayons"],
    ["fiesta","Fiesta","esp","r",["#FAFAF7","#FFE08A","#D62828","#D62828","#D62828"],"foulard","fanion","beret","fanions","fanions","diag",1],
    ["flamenco","Flamenco","esp","e",["#C1121F","#2A0A0E","#FAFAF7","#C1121F","#1F1F1F"],"volants","eventail","fleur","eventail","pois","points"],
    ["sondage","Sondage","ses","c",["#5E6B7A","#E6EEF5","#2F9E6A","#2F9E6A","#F4F1E8"],"chemise","pourcent","casquette","sondage","barres","bandes"],
    ["economiste","Économiste","ses","r",["#2B3A4A","#E9F0E6","#2F9E6A","#5A5F66","#F4F1E8"],"veste","courbe","feutre","courbe","courbes","grille",1],
    ["trader","Trader","ses","e",["#F4F4F0","#0E1A14","#39D98A","#2BB673","#1F3F8F"],"bretelles","fleche","visiere","fleche","cours","diag"],
    ["pixel","Pixel","nsi","c",["#7B52C9","#1B1036","#FF6FA3","#FF6FA3","#3DDC97"],"tshirt","coeurpx","casquette","manette","pixels","damier"],
    ["robot","Robot","nsi","r",["#9AA5B1","#12243A","#7DF9FF","#9AA5B1","#5B6875"],"robot","engrenage","antennes","cle","circuit","grille",1],
    ["hacker","Hacker","nsi","e",["#1A1F1C","#050A07","#39FF88","#1A1F1C","#2A332E"],"sweat","code","capuche","terminal","code","code"],
    ["bretzel","Bretzel","all","c",["#2F5D3A","#DDEBF7","#C8963E","#2F5D3A","#F4F1E8"],"gilet","bretzel","tyrolien","bretzel","losanges","losanges",1],
    ["venise","Venise","ita","r",["#1F2A44","#0D6E6E","#E7C66B","#1F1F1F","#E7C66B"],"cape","masque","tricorne","masque","arches","losanges",1],
    ["climat","Climat","es","c",["#3DAE73","#CFEFFF","#1E6FB0","#F2B33D","#FAFAF7"],"tshirt","globe","bob","eolienne","nuages","points",1],
    ["philosophe","Philosophe","hlp","r",["#F4F1E8","#3A3550","#7B52C9","#F4F1E8","#7B52C9"],"toge","chouette","pensee","chouette","marbre","diag",1],
    ["citoyen","Citoyen","emc","c",["#1F3F8F","#EDF2FA","#C1272D","#1F3F8F","#FAFAF7"],"veste","bulle","bonnet","urne","bulles","bandes",1],
    ["ingenieur","Ingénieur","si","r",["#2E6DB4","#123A6B","#FFB703","#FAFAF7","#FFB703"],"salopette","engrenage","casque","engrenage","plan","grille",1],
    ["electricien","Électricien","melec","r",["#22314F","#2A2E38","#FFD43B","#FFD43B","#C9CED4"],"combi","ampoule","casque","ampoule","schema","zigzag",1],
    ["secouriste","Secouriste","pse","c",["#2F9E44","#EAF7EE","#FAFAF7","#2F9E44","#C9CED4"],"secours","croix","casquette","trousse","ecg","bandes",1],
    ["entrepreneur","Entrepreneur","eco","c",["#3A4A5C","#FFF1DC","#FF8C42","#FF8C42","#F4F1E8"],"veste","fleche","casquette","mallette","fleches","diag",1],
    ["juriste","Juriste","eco","r",["#1F1F1F","#E9E2D0","#E7C66B","#1F1F1F","#FAFAF7"],"avocat","balance","toque","balance","livres","bandes"],
    ["diplome","Diplômé","bonus","r",["#1F1F1F","#E8F0FF","#E7C66B","#1F1F1F","#E7C66B"],"diplome","mortier","mortier","diplome","confettis","points"],
    ["neon","Néon","bonus","e",["#14141F","#0B0B18","#FF3DF2","#3DF2FF","#3DF2FF"],"neon","etoile","neon","etoile","synthwave","zigzag"],
    ["astronaute","Astronaute","bonus","l",["#EDEFF2","#070B1F","#FF8C42","#DDE6F0","#1F3F8F"],"spatiale","fusee","bocal","fusee","espace","points"],
    ["batteur","Batteur","bonus","r",["#C1272D","#1C1C28","#F3D27A","#1F1F1F","#F4F4F0"],"tshirt","tambour","bandeau","baguettes","ondes","zigzag"],
    ["karateka","Karatéka","bonus","r",["#FAFAF7","#E9DCC0","#1F1F1F","#C1272D","#1F1F1F"],"kimono","","hachimaki","ceinture","tatami","damier"],
    ["as","As de cœur","bonus","l",["#9B1B30","#0E4A30","#E7C66B","#E7C66B","#FAFAF7"],"roi","coeur","couronne","cartes","tapis","losanges"],
    ["artiste","Artiste","bonus","c",["#3E73C9","#FFF7EA","#FF6B6B","#C1272D","#F4F1E8"],"salopette","palette","beret","pinceau","taches","points"]];
  const SK=L0.map(([id,nom,g,r,c,t,e,h,a,f,d,don])=>({id,nom,g,r,c,t,e,h,a,f,d,don:!!don,dos:"s-"+id,cad:"s-"+id}));
  const PAR={};SK.forEach(s=>PAR[s.id]=s);
  const skinOk=id=>typeof id==="string"&&ID.test(id)&&Object.prototype.hasOwnProperty.call(PAR,id)?PAR[id]:null;
  S2.catalogue=SK;S2.RAR=RAR;S2.GRP=GRP;

  /* ---------------- Petites aides SVG ---------------- */
  const Pa=(d,f,x)=>`<path d="${d}" fill="${f}"${x||""}/>`;
  const Ln=(d,s,w,x)=>`<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${x||""}/>`;
  const Ci=(cx,cy,r,f,x)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${x||""}/>`;
  const El=(cx,cy,rx,ry,f,x)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${x||""}/>`;
  const Re=(x,y,w,h,f,rx,ex)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx||0}" fill="${f}"${ex||""}/>`;
  const Tx=(x,y,s,f,t)=>`<text x="${x}" y="${y}" font-size="${s}" fill="${f}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700">${t}</text>`;
  const G=(tr,s)=>`<g transform="${tr}">${s}</g>`;
  const DK=` opacity=".2"`,SOMB="#000",BL="#FFFFFF";
  const op=o=>` opacity="${o}"`;
  function rgba(h,a){const n=parseInt(String(h).slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}

  /* ---------------- Icônes (emblème sur le torse, accessoire, emblème du dos) : boîte -6..6, une couleur k ---------------- */
  const IC={
    equerre:k=>Pa("M-5 5V-5L5 5Z",k)+Pa("M-2.6 2.6V-0.8L0.8 2.6Z",SOMB,op(.35))+Ln("M-5 1.5h1.2M-5-1.5h1.2",SOMB,.5,op(.4)),
    compas:k=>Ci(0,-4.6,1.4,k)+Ln("M0-4L-3.6 5.4M0-4L3.6 5.4",k,1.4)+Ln("M-2 1.2Q0 2 2 1.2",k,.8),
    pi:k=>Tx(0,4.6,14,k,"π"),
    rapporteur:k=>Pa("M-6 3A6 6 0 0 1 6 3Z",k)+Pa("M-3.4 3A3.4 3.4 0 0 1 3.4 3Z",SOMB,op(.3))+Ln("M0 3V-2.6M-4.2-.9L-3.2-.1M4.2-.9L3.2-.1",SOMB,.5,op(.5)),
    sier:k=>Pa("M0-5.6L6 4.8H-6Z",k)+Pa("M0 4.8L-3-.4H3Z",SOMB,op(.45))+Pa("M-3-.4L-4.5 2.2H-1.5ZM3-.4L1.5 2.2H4.5ZM0-5.6L-1.5-3H1.5Z",SOMB,op(.3)),
    inf:k=>Ln("M0 0C-2-3.6-6-3.6-6 0S-2 3.6 0 0S6-3.6 6 0S2 3.6 0 0Z",k,1.6),
    etoile:k=>Pa("M0-6L1.8-1.9L6.2-1.9L2.7 0.8L4 5.4L0 2.6L-4 5.4L-2.7 0.8L-6.2-1.9L-1.8-1.9Z",k),
    erlen:k=>Pa("M-1.8-6H1.8V-2L5.4 4.6Q5.8 5.6 4.8 5.6H-4.8Q-5.8 5.6-5.4 4.6L-1.8-2Z",k)+Pa("M-3.9 2H3.9L5.1 4.6Q5.4 5.2 4.6 5.2H-4.6Q-5.4 5.2-5.1 4.6Z",BL,op(.5))+Ci(-1,3.4,.7,BL,op(.8)),
    atome:k=>Ci(0,0,1.6,k)+`<g fill="none" stroke="${k}" stroke-width="1"><ellipse rx="6" ry="2.3"/><ellipse rx="6" ry="2.3" transform="rotate(60)"/><ellipse rx="6" ry="2.3" transform="rotate(-60)"/></g>`,
    eclair:k=>Pa("M1.5-6.5L-4.5 1H-0.5L-2 6.5L4.5-1.2H0.4Z",k),
    prisme:k=>Pa("M0-5.5L5.5 4.5H-5.5Z",k,op(.9))+Ln("M-6.5-1.5L-2.4-0.4",BL,1)+Pa("M2.2-.6L6.5-2.6V.2Z","#FF6B6B",op(.9))+Pa("M2.4 0L6.5 0.4V2.6Z","#FFD43B",op(.9))+Pa("M2.6 .6L6.5 3V4.8Z","#6BC3FF",op(.9)),
    feuille:k=>Pa("M-5 5Q-6-4 5-5.5Q5 4-5 5Z",k)+Ln("M-5 5L2.5-2.5",SOMB,.7,op(.35)),
    pousse:k=>Re(-3.8,1.4,7.6,4.6,"#B8693E",1)+Ln("M0 1.4V-2",k,1)+Pa("M0-2Q-5-2-5-6Q-.5-6 0-2Z",k)+Pa("M0-1Q4.5-1 4.8-4.6Q.6-4.8 0-1Z",k),
    adn:k=>Ln("M-3-6C3-3-3 3 3 6M3-6C-3-3 3 3-3 6",k,1.3)+Ln("M-1.6-4H1.6M-2.2 0H2.2M-1.6 4H1.6",k,.8,op(.7)),
    flamme:k=>Pa("M0-6Q5-1 3 3.5Q2 6 0 6Q-2 6-3 3.5Q-4.5 0-1-2Q-1.5 1 .5 2Q2 0 0-6Z",k),
    volcan:k=>Pa("M-6.5 6L-2.2-1.5H2.2L6.5 6Z","#6B4A3A")+Pa("M-2.2-1.5H2.2L1 1L0-.4L-1 1Z",k)+Ci(-1.6,-4,1.3,k,op(.8))+Ci(1.2,-5.2,1,k,op(.6))+Ci(.2,-3,1.1,k),
    vague:k=>Pa("M-6 2Q-4-4 0-2Q2-1 1 1Q4 0 4.5-3Q7 3 2 5H-6Z",k),
    poisson:k=>Pa("M-4.5 0Q-1-4.5 3 0Q-1 4.5-4.5 0Z",k)+Pa("M2.6 0L6-3V3Z",k)+Ci(-2.6,-.6,.6,SOMB,op(.6)),
    boussole:k=>Ci(0,0,5.6,k)+Ci(0,0,4.4,SOMB,op(.35))+Pa("M0-4L1.2 0L0 4L-1.2 0Z",BL)+Pa("M0-4L1.2 0H-1.2Z","#C1272D"),
    rose:k=>Pa("M0-6L1.2-1.2L6 0L1.2 1.2L0 6L-1.2 1.2L-6 0L-1.2-1.2Z",k)+Pa("M0-6L1.2-1.2L0 0Z",SOMB,op(.35))+Pa("M6 0L1.2 1.2L0 0Z",SOMB,op(.35)),
    parchemin:k=>Re(-4.4,-4.2,8.8,8.4,k,1)+El(-4.4,0,1.4,4.4,SOMB,op(.25))+El(4.4,0,1.4,4.4,SOMB,op(.25))+Ln("M-2.4-1.6L-.6 0L1 -2L2.6 1.6",SOMB,.6,op(.45))+Ci(2.6,1.6,.7,"#C1272D"),
    cocarde:k=>Ci(0,0,5.6,"#1F3F8F")+Ci(0,0,3.8,"#FAFAF7")+Ci(0,0,2,"#C1272D"),
    drapeau:k=>Ln("M-5-6V6",SOMB,1.1,op(.7))+Re(-4.6,-5.6,3.4,6.4,"#1F3F8F")+Re(-1.2,-5.6,3.4,6.4,"#FAFAF7")+Re(2.2,-5.6,3.4,6.4,"#C1272D"),
    laurier:k=>{let s="";for(let i=0;i<5;i++){const a=(200+i*22)*Math.PI/180,b=(-20-i*22)*Math.PI/180;s+=El((5*Math.cos(a)).toFixed(2),(5*Math.sin(a)+1).toFixed(2),1.7,.8,k,` transform="rotate(${(200+i*22+90)} ${(5*Math.cos(a)).toFixed(2)} ${(5*Math.sin(a)+1).toFixed(2)})"`)+El((5*Math.cos(b)).toFixed(2),(-5*Math.sin(b)+1).toFixed(2),1.7,.8,k,` transform="rotate(${(-(-20-i*22)+90)} ${(5*Math.cos(b)).toFixed(2)} ${(-5*Math.sin(b)+1).toFixed(2)})"`)}return s},
    bouclier:k=>Pa("M0-6L5.5-4V0Q5 4.5 0 6.2Q-5 4.5-5.5 0V-4Z",k)+Pa("M0-6L5.5-4V0Q5 4.5 0 6.2Z",SOMB,op(.2))+Pa("M0-3L1-.8H3.2L1.5.6L2.1 3L0 1.6L-2.1 3L-1.5.6L-3.2-.8H-1Z",BL,op(.85)),
    epee:k=>Pa("M-.8-6.5H.8V3H-.8Z","#E9EEF2")+Pa("M-.8-6.5L0-7.6L.8-6.5Z","#E9EEF2")+Re(-3.4,2.6,6.8,1.3,k,.6)+Re(-.7,3.9,1.4,2.6,"#6B4A3A")+Ci(0,6.8,.9,k),
    pyramide:k=>Pa("M0-5.5L6.5 5H-6.5Z",k)+Pa("M0-5.5L6.5 5H1.5Z",SOMB,op(.22))+Ln("M-3.2 0H2.6M-5 2.6H4.6",SOMB,.5,op(.25)),
    crosse:k=>Ln("M1.5 6.5V-3Q1.5-6-1.6-6Q-4.2-6-4-3.6",k,1.8)+Ln("M1.5 4.6V3.4M1.5 1.2V0M1.5-2.2V-3",SOMB,1.9,op(.3)),
    plume:k=>Pa("M5.5-6Q-3-4-4 4.5Q-1-3 5.5-6Z",k)+Ln("M5.5-6L-4.6 5.6",SOMB,.6,op(.4))+Re(-6.4,3.8,3.8,2.6,"#2B2B2B",.6),
    masques:k=>Pa("M-6.2-4.5Q-3.4-6-0.6-4.5V-.5Q-.6 3.2-3.4 3.2Q-6.2 3.2-6.2-.5Z",k)+Ln("M-4.8-2.2h1M-2.6-2.2h1",SOMB,.8)+Ln("M-4.8 .4Q-3.4 1.8-2 .4",SOMB,.7)
      +Pa("M.6-3Q3.4-4.5 6.2-3V1Q6.2 4.7 3.4 4.7Q.6 4.7.6 1Z",SOMB,op(.55))+Ln("M1.8-.6h1M4-.6h1",BL,.8)+Ln("M2 3Q3.4 1.6 4.8 3",BL,.7),
    lune:k=>Pa("M2-6A6 6 0 1 0 6 2A4.6 4.6 0 1 1 2-6Z",k),
    livre:k=>Pa("M0-3.6Q-3-5.6-6-4.4V4.6Q-3 3.4 0 5.2Z",k)+Pa("M0-3.6Q3-5.6 6-4.4V4.6Q3 3.4 0 5.2Z",k,op(.82))+Ln("M-4.6-1.8L-1.4-1M-4.6.6L-1.4 1.4M1.4-1L4.6-1.8M1.4 1.4L4.6.6",SOMB,.5,op(.35)),
    bougie:k=>Re(-1.8,-1.6,3.6,6.4,"#FAFAF7",.6)+Pa("M0-6.4Q1.6-4 0-2.4Q-1.6-4 0-6.4Z",k)+El(0,5.2,4.4,1.3,k,op(.85)),
    tasse:k=>Pa("M-4.8-2H3.2V2Q3.2 5-0.8 5Q-4.8 5-4.8 2Z",k)+Ln("M3.2-1Q6-1 5.4 1.4Q5 2.6 3 2.4",k,1)+Ln("M-2.4-4.4Q-1.6-5.4-2.4-6.4M0-4.4Q.8-5.4 0-6.4",k,.6,op(.6))+El(-.8,5.5,5.2,.9,k,op(.6)),
    parapluie:k=>Pa("M-6 0Q-6-6 0-6Q6-6 6 0Q4.5-1.2 3-0Q1.5-1.2 0 0Q-1.5-1.2-3 0Q-4.5-1.2-6 0Z",k)+Ln("M0-6V4.4Q0 6-1.6 6",SOMB,.9,op(.75)),
    note:k=>Ln("M-1 4V-5L5-6.4V2.6",k,1.1)+El(-2.8,4,2,1.5,k)+El(3.2,2.6,2,1.5,k),
    guitare:k=>Ci(-2.2,2.4,3.6,k)+Ci(.4,-.4,2.6,k)+Ln("M.6-.6L5.4-5.4",SOMB,1.2,op(.7))+Re(4.4,-6.6,2.2,1.6,SOMB,.4,` transform="rotate(-45 5.5 -5.8)"`)+Ci(-1.6,1.8,.9,SOMB,op(.6)),
    soleil:k=>Ci(0,0,3,k)+Ln("M0-6V-4.4M0 6V4.4M-6 0H-4.4M6 0H4.4M-4.2-4.2L-3.1-3.1M4.2 4.2L3.1 3.1M-4.2 4.2L-3.1 3.1M4.2-4.2L3.1-3.1",k,1.2),
    fanion:k=>Pa("M-5-4.6H5L0 5Z",k)+Pa("M-2.6-4.6H2.6L0 .8Z",BL,op(.3)),
    fanions:k=>Ln("M-6.4-4Q0-1 6.4-4",SOMB,.5,op(.5))+Pa("M-5.6-3.6L-3.4-3.1L-4.8.2Z",k)+Pa("M-1.6-2.7H1.6L0 1Z","#FFD43B")+Pa("M3.4-3.1L5.6-3.6L4.8.2Z","#3E73C9"),
    eventail:k=>Pa("M0 4.6L-6-2.4A7.8 7.8 0 0 1 6-2.4Z",k)+Ln("M0 4.6L-3.8-4.4M0 4.6L0-5.4M0 4.6L3.8-4.4",SOMB,.5,op(.35))+Ci(0,4.6,.9,SOMB,op(.6))+Ln("M-6-2.4A7.8 7.8 0 0 1 6-2.4",BL,.6,op(.5)),
    pourcent:k=>Tx(0,4.4,13,k,"%"),
    sondage:k=>Re(-4.6,-6,9.2,12,"#FAFAF7",1)+Re(-1.8,-6.8,3.6,1.8,"#6B6F75",.6)+Re(-3.2,1,1.6,3.4,k)+Re(-.8,-1.6,1.6,6,k)+Re(1.6,-3.6,1.6,8,k),
    courbe:k=>Ln("M-5.6-5.6V5.6H5.6",SOMB,.8,op(.6))+Ln("M-4.4-4.2Q-1 3.6 4.6 3.6",k,1.1)+Ln("M-4.4 3.6Q1-1 4.6-4.4",k,1.1),
    fleche:k=>Ln("M-5.6 4.6L-1.6 .6L1 3L5.6-2.6",k,1.6)+Pa("M5.6-5.2V-.6L1.6-4.4Z",k),
    coeurpx:k=>Pa("M-5-3H-3V-5H-1V-3H1V-5H3V-3H5V1H3V3H1V5H-1V3H-3V1H-5Z",k)+Re(-3,-3,2,2,BL,0,op(.5)),
    manette:k=>Pa("M-6 1Q-6-3-3-3H3Q6-3 6 1Q6 4.6 3.6 3.6L2 2H-2L-3.6 3.6Q-6 4.6-6 1Z",k)+Ln("M-3.8-.4h2.4M-2.6-1.6v2.4",BL,.8)+Ci(2.4,-1,.7,BL)+Ci(3.8,.4,.7,BL),
    engrenage:k=>{let d="";for(let i=0;i<8;i++){const a=i*Math.PI/4;d+=`M${(4.2*Math.cos(a-.22)).toFixed(2)} ${(4.2*Math.sin(a-.22)).toFixed(2)}L${(6*Math.cos(a-.16)).toFixed(2)} ${(6*Math.sin(a-.16)).toFixed(2)}L${(6*Math.cos(a+.16)).toFixed(2)} ${(6*Math.sin(a+.16)).toFixed(2)}L${(4.2*Math.cos(a+.22)).toFixed(2)} ${(4.2*Math.sin(a+.22)).toFixed(2)}Z`}return Pa(d,k)+Ci(0,0,4.6,k)+Ci(0,0,1.8,SOMB,op(.45))},
    cle:k=>Ln("M-4.6 4.6L1.4-1.4",k,2)+Pa("M1-3.4A3.2 3.2 0 1 1 3.4 1L2.4-.2L3.4-1.6L2-2.6L.6-1.8Z",k),
    code:k=>Ln("M-2.8-3.6L-6 0L-2.8 3.6M2.8-3.6L6 0L2.8 3.6",k,1.3)+Ln("M1-5L-1 5",k,1.1),
    terminal:k=>Re(-5.6,-4.6,11.2,7.6,"#1A1F1C",1,` stroke="${k}" stroke-width=".8"`)+Ln("M-3.6-2.2L-1.8-.8L-3.6.6M-1 .8H1.6",k,.8)+Pa("M-6.6 3.4H6.6L5.4 5.2H-5.4Z","#3A423E"),
    bretzel:k=>Ln("M-1 4.8Q-6 4-5.6-1Q-5.2-5.4-1.6-4.4Q1.6-3.4 2.4 1.6M1 4.8Q6 4 5.6-1Q5.2-5.4 1.6-4.4Q-1.6-3.4-2.4 1.6",k,1.8)+Ci(-2.4,-2.4,.4,BL,op(.9))+Ci(2.8,-1.4,.4,BL,op(.9))+Ci(0,1.6,.4,BL,op(.9)),
    masque:k=>Pa("M-6.4-1.6Q-3.6-4.2 0-2.2Q3.6-4.2 6.4-1.6Q6.2 2.8 2.4 2.6Q.8 2.4 0 1Q-.8 2.4-2.4 2.6Q-6.2 2.8-6.4-1.6Z",k)+El(-2.9,-.6,1.4,.9,SOMB,op(.8))+El(2.9,-.6,1.4,.9,SOMB,op(.8))+Ln("M5.8-1.6Q7-4.6 6.2-6.4",k,.6),
    globe:k=>Ci(0,0,5.8,"#3E8FD8")+Pa("M-3.6-3.6Q-1-4.4 0-2.6Q-1.4-1-.6.4Q-2.6 1.4-3.4-.6Q-5-1.8-3.6-3.6ZM1.4 1.4Q3.4.8 4.4 2.4Q3.4 4.6 1.6 4.4Q.6 3.2 1.4 1.4ZM2-4.4Q3.6-4 4.4-2.2Q3-2.4 2-4.4Z",k),
    eolienne:k=>Ln("M0 6V-1",k,1)+Pa("M0-1.2L-.6-6.4Q0-7 .6-6.4Z",k)+Pa("M0-1.2L4.6 1.4Q4.8 2.2 4 2.2Z",k)+Pa("M0-1.2L-4.6 1.4Q-4.8 2.2-4 2.2Z",k)+Ci(0,-1.2,.9,SOMB,op(.4)),
    chouette:k=>Pa("M-4.6 5.6Q-6-4 0-4.6Q6-4 4.6 5.6Z",k)+Pa("M-4.6-3.4L-3.6-6.2L-1.6-4.4ZM4.6-3.4L3.6-6.2L1.6-4.4Z",k)+Ci(-2,-1.4,1.7,BL)+Ci(2,-1.4,1.7,BL)+Ci(-2,-1.4,.8,SOMB)+Ci(2,-1.4,.8,SOMB)+Pa("M-.6 .2H.6L0 1.4Z","#E7A93A"),
    bulle:k=>Pa("M-5.6-4.4Q-5.6-5.6-4.4-5.6H4.4Q5.6-5.6 5.6-4.4V1.6Q5.6 2.8 4.4 2.8H-.6L-3.6 5.6V2.8H-4.4Q-5.6 2.8-5.6 1.6Z",k)+Ci(-2.6,-1.4,.8,SOMB,op(.4))+Ci(0,-1.4,.8,SOMB,op(.4))+Ci(2.6,-1.4,.8,SOMB,op(.4)),
    urne:k=>Re(-5,-1.6,10,7.4,k,.8,op(.85))+Re(-2.6,-1.9,5.2,.8,SOMB,.3,op(.6))+Re(-2,-6.2,4,5,"#FAFAF7",.4,` transform="rotate(-8)"`),
    ampoule:k=>Pa("M0-6Q4.4-6 4.4-1.6Q4.4 1 2.2 2.6V3.6H-2.2V2.6Q-4.4 1-4.4-1.6Q-4.4-6 0-6Z",k)+Re(-2.2,3.6,4.4,2,"#9AA5B1",.6)+Ln("M-1.2-.6L0 1L1.2-.6",SOMB,.6,op(.4)),
    croix:k=>Pa("M-1.9-5.6H1.9V-1.9H5.6V1.9H1.9V5.6H-1.9V1.9H-5.6V-1.9H-1.9Z",k),
    trousse:k=>Re(-5.8,-3,11.6,8.6,"#FAFAF7",1.4)+Ln("M-2.2-3V-4.6H2.2V-3",SOMB,.8,op(.5))+Pa("M-1.1-.4H1.1V.8H2.3V3H1.1V4.2H-1.1V3H-2.3V.8H-1.1Z",k),
    mallette:k=>Re(-6,-2.8,12,8.2,k,1.2)+Ln("M-2.2-2.8V-4.8H2.2V-2.8",k,1)+Ln("M-6 .8H6",SOMB,.6,op(.35))+Re(-1,-.2,2,1.8,"#E7C66B",.3),
    balance:k=>Ln("M0-5.6V5M-3.6 5.4H3.6M-5-3.6H5",k,1)+Pa("M-7.2 .2Q-5 2.6-2.8.2Z",k)+Pa("M2.8.2Q5 2.6 7.2.2Z",k)+Ln("M-5-3.6L-6.8.2M-5-3.6L-3.2.2M5-3.6L3.2.2M5-3.6L6.8.2",k,.4)+Ci(0,-5.8,.9,k),
    mortier:k=>Pa("M-6.4-1.6L0-4.6L6.4-1.6L0 1.4Z",k)+Pa("M-3.6-.4V2.4Q0 4.2 3.6 2.4V-.4L0 1.4Z",k,op(.85))+Ln("M0-1.6L4.8-.6V3.4",SOMB,.5,op(.5))+Ci(4.8,3.6,.7,"#E7C66B"),
    diplome:k=>Re(-6,-2.2,12,4.4,"#FAF3E0",2.2)+El(-6,0,1,2.2,"#E2D5B5")+Re(-.9,-2.3,1.8,4.6,k)+Pa("M-.9 2.2L-2.2 5.6L-.2 4.6ZM.9 2.2L2.2 5.6L.2 4.6Z",k),
    fusee:k=>Pa("M0-6.6Q3.2-4 3.2 1.2V3.2H-3.2V1.2Q-3.2-4 0-6.6Z",k)+Ci(0,-1.6,1.3,"#6BC3FF")+Pa("M-3.2 .6L-5.4 3.8V4.8L-3.2 3.6ZM3.2 .6L5.4 3.8V4.8L3.2 3.6Z","#C1272D")+Pa("M-1.8 3.4Q0 7.6 1.8 3.4Z","#FFB13B"),
    tambour:k=>El(0,-2.6,5.6,2,"#F4F4F0")+Pa("M-5.6-2.6V3Q0 6.6 5.6 3V-2.6Q0 .8-5.6-2.6Z",k)+Ln("M-5.6-2.6L-2.8 4.4L0-.8L2.8 4.4L5.6-2.6",SOMB,.5,op(.4)),
    baguettes:k=>Ln("M-5.4 5.4L3.6-4.2M5.4 5.4L-3.6-4.2",k,1.2)+Ci(3.8,-4.4,1,k)+Ci(-3.8,-4.4,1,k),
    ceinture:k=>Re(-6,-1.2,12,2.6,k,.6)+Pa("M0-.2L-3.4 5.6H-1.4L0 2.4L1.4 5.6H3.4Z",k)+Re(-1.4,-1.8,2.8,3.4,k,.6),
    coeur:k=>Pa("M0 5.6Q-6.4 1-6-2.6Q-5.6-6-2.6-5.8Q-.8-5.6 0-3.6Q.8-5.6 2.6-5.8Q5.6-6 6-2.6Q6.4 1 0 5.6Z",k),
    cartes:k=>Re(-6,-4.8,6.4,9,"#FAFAF7",1,` transform="rotate(-14 -2.8 0)"`)+Re(-2.6,-5.4,6.4,9,"#FAFAF7",1,` stroke="#CFCFC8" stroke-width=".3"`)+G("translate(.6 -.8) scale(.42)",Pa("M0 5.6Q-6.4 1-6-2.6Q-5.6-6-2.6-5.8Q-.8-5.6 0-3.6Q.8-5.6 2.6-5.8Q5.6-6 6-2.6Q6.4 1 0 5.6Z",k))+Tx(-1.2,-1.6,2.6,k,"A"),
    palette:k=>Pa("M0-5.6Q6-5.6 6-.6Q6 2.4 3.4 2.2Q1.6 2 1.8 3.6Q2 5.6 0 5.6Q-6 5.6-6 0Q-6-5.6 0-5.6Z","#E9D3A9")+Ci(-3,-1.4,1.1,k)+Ci(-1,-3.4,1.1,"#3E73C9")+Ci(2,-3.4,1.1,"#FFD43B")+Ci(-2.6,2.2,1.1,"#3DAE73"),
    pinceau:k=>Ln("M-5 5L2.2-2.2",SOMB,1.6,op(.65))+Re(1.4,-4.6,2.4,3.6,"#C9CED4",.4,` transform="rotate(45 2.6 -2.8)"`)+Pa("M3.2-4.4Q6.6-7.4 6.4-4Q5.6-2.4 4.6-3.2Z",k)};
  const icone=(n,k)=>IC[n]?IC[n](k):"";

  /* ---------------- Tenues : torse (largeur selon le corps), puis détails et emblème ---------------- */
  const BW=[[24,76],[16,84],[9,91]];
  const torse=(x0,x1,f,x)=>Pa(`M${x0} 100Q${x0+3} 73 50 71Q${x1-3} 73 ${x1} 100Z`,f,x);
  const ombre=(x0)=>Pa(`M${x0} 100Q${x0+3} 73 50 71V100Z`,SOMB,op(.08));
  const emb=(s,x,y,sc)=>s.e?G(`translate(${x||50} ${y||88}) scale(${sc||.72})`,icone(s.e,s.c[2])):"";
  const TN={
    veste:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M43 72L50 86L57 72Q50 70.5 43 72Z",s.c[4])+Pa("M48.6 75H51.4L52.3 78L50 90L47.7 78Z",s.c[2])
      +Ln("M43 72L48.6 90M57 72L51.4 90",SOMB,1.4,op(.28))+emb(s,64,86,.5),
    sweat:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M35 77Q50 64 65 77Q60 69.5 50 69.5Q40 69.5 35 77Z",s.c[4])+Ln("M46 77V86M54 77V86",BL,1.2,op(.8))
      +Pa(`M38 100V94Q50 91 62 94V100Z`,SOMB,op(.14))+emb(s,50,88,.75),
    cape:(s,x0,x1)=>torse(x0,x1,s.c[4])+Pa(`M${x0} 100Q${x0+3} 73 47 71L42 100Z`,s.c[0])+Pa(`M${x1} 100Q${x1-3} 73 53 71L58 100Z`,s.c[0])+ombre(x0)
      +Ci(44,74,2,"#E7C66B")+Ci(56,74,2,"#E7C66B")+Ln("M44 74Q50 77 56 74",s.c[2],.9)+emb(s,50,89,.6),
    combi:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M41 72.5Q50 77 59 72.5Q55 70.6 50 70.6Q45 70.6 41 72.5Z",s.c[4])+Ln("M50 76V100",SOMB,1,op(.3))
      +Re(54,82,11,9,s.c[4],1.5)+Ci(57,86.5,1,s.c[2])+Ci(60.5,86.5,1,s.c[2])+emb(s,42,86,.55),
    blouse:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M44 72L50 82L56 72Q50 70.6 44 72Z",s.c[4])+Ln("M44 72L49 100M56 72L51 100",SOMB,1.1,op(.2))
      +Re(57,85,8,6,SOMB,1,op(.08))+Ln("M59 85V80",s.c[2],1.4)+Ci(52,88,.9,SOMB,op(.25))+Ci(52,94,.9,SOMB,op(.25))+emb(s,39,87,.5),
    toge:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa(`M${x0+5} 86Q30 76 58 71.5L63 74.5Q38 82 ${x0+12} 100H${x0+3}Z`,s.c[4])+Ln(`M${x0+9} 92Q34 82 60 73`,SOMB,.8,op(.2))
      +emb(s,62,88,.55),
    gilet:(s,x0,x1)=>torse(x0,x1,s.c[4])+Pa(`M${x0} 100Q${x0+3} 73 45 71.5L47.5 100Z`,s.c[0])+Pa(`M${x1} 100Q${x1-3} 73 55 71.5L52.5 100Z`,s.c[0])+ombre(x0)
      +Re(33,86,8,6,SOMB,1,op(.12))+Re(59,86,8,6,SOMB,1,op(.12))+emb(s,63,82,.45),
    jabot:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M44 72L50 92L56 72Q50 70.5 44 72Z",s.c[4])+[76,80,84,88].map(y=>El(50,y,3.2,1.8,s.c[4])+Ln(`M47 ${y}Q50 ${y+1.6} 53 ${y}`,SOMB,.5,op(.2))).join("")
      +Ln("M44 72L49 98M56 72L51 98",s.c[2],1,op(.7))+emb(s,64,86,.5),
    bandes:(s,x0,x1)=>torse(x0,x1,s.c[4])+[78,84,90,96].map(y=>Pa(`M${x0+5} ${y+4}Q50 ${y-2} ${x1-5} ${y+4}L${x1-4} ${y+8}Q50 ${y+2} ${x0+4} ${y+8}Z`,s.c[0])).join("")
      +El(x0+9,79,8,5,s.c[0])+El(x1-9,79,8,5,s.c[0])+Ln(`M${x0+3} 80Q${x0+9} 75 ${x0+16} 80M${x1-3} 80Q${x1-9} 75 ${x1-16} 80`,SOMB,.8,op(.25)),
    armure:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+El(x0+9,80,9,6,s.c[0],` stroke="${rgba("#000000",.25)}" stroke-width=".8"`)+El(x1-9,80,9,6,s.c[0],` stroke="${rgba("#000000",.25)}" stroke-width=".8"`)
      +Pa("M40 74H60L59 100H41Z",s.c[4])+Ln("M40 74H60",s.c[2],1.4)+emb(s,50,88,.8),
    usekh:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Ln("M37 73Q50 92 63 73",s.c[1],3.2)+Ln("M34 75Q50 98 66 75",s.c[2],3)+Ln("M31.5 78Q50 104 68.5 78",s.c[1],2.6)
      +[[38,80],[44,86],[50,88],[56,86],[62,80]].map(([x,y])=>Ci(x,y,1,"#2EC4B6")).join(""),
    redingote:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M44 72L50 88L56 72Q50 70.5 44 72Z",s.c[4])+Pa("M46.5 73H53.5L52 80Q50 82 48 80Z",s.c[4],` stroke="${rgba("#000000",.15)}" stroke-width=".5"`)
      +Ln("M44 72L47 100M56 72L53 100",s.c[2],1.6)+Ln("M41 80Q38 84 41 88M59 80Q62 84 59 88",s.c[2],.9)+Ci(46,92,1,s.c[2])+Ci(54,92,1,s.c[2]),
    trench:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M41 71.5L50 84L59 71.5L63 78L52 86H48L37 78Z",s.c[0],` stroke="${rgba("#000000",.2)}" stroke-width=".8"`)
      +Re(x0+4,92,x1-x0-8,3.4,SOMB,0,op(.2))+[[45,88],[55,88],[45,97],[55,97]].map(([x,y])=>Ci(x,y,1.1,"#5A4630")).join("")+Pa("M47 72.5L50 78L53 72.5Z",s.c[4]),
    perfecto:(s,x0,x1)=>torse(x0,x1,s.c[0])+Pa("M45 72L50 84L55 72Q50 70.5 45 72Z",s.c[4])+Ln("M53 79L44 100",s.c[4],.9,op(.8))+Pa("M43 72L37 80L46 86ZM57 72L63 80L54 86Z",SOMB,op(.35))
      +Ci(38,88,.9,"#C9CED4")+Ci(62,88,.9,"#C9CED4")+emb(s,64,92,.45),
    chemise:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M43 71.5L50 77L48 81ZM57 71.5L50 77L52 81Z",s.c[4])+Ln("M50 78V100",SOMB,.7,op(.25))
      +[84,90,96].map(y=>Ci(50,y,.8,SOMB,op(.3))).join("")+Re(56,84,8,6,SOMB,1,op(.1))+emb(s,60,87,.42),
    foulard:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M41 71.5Q50 78 59 71.5L55 81L50 79L45 81Z",s.c[2])+Pa("M48 79L50 90L52 79Z",s.c[2])
      +Re(x0+4,93,x1-x0-8,5,s.c[2])+Ln("M50 82V92",SOMB,.6,op(.2)),
    volants:(s,x0,x1)=>torse(x0,x1,s.c[0])+[[40,74],[45,77],[50,78],[55,77],[60,74]].map(([x,y])=>Ci(x,y,3.4,s.c[0])+Ln(`M${x-3} ${y+1}Q${x} ${y+4} ${x+3} ${y+1}`,SOMB,.5,op(.3))).join("")
      +[[34,88],[44,92],[56,90],[66,86],[40,98],[60,98],[50,85]].map(([x,y])=>Ci(x,y,1.6,s.c[2])).join("")+ombre(x0),
    bretelles:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M43 71.5L50 76L48 80ZM57 71.5L50 76L52 80Z",s.c[0],` stroke="${rgba("#000000",.2)}" stroke-width=".6"`)
      +Ln(`M41 73L42 100M59 73L58 100`,s.c[4],3)+Pa("M48.8 76H51.2L52 79L50 90L48 79Z",s.c[2],` transform="rotate(6 50 80)"`)+emb(s,66,92,.4),
    tshirt:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Ln("M42 72.4Q50 78 58 72.4",s.c[4],1.6)+emb(s,50,88,.9),
    robot:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Re(39,79,22,16,s.c[4],2)+Ci(44,84,1.6,s.c[2])+Ci(50,84,1.6,"#FFD43B")+Ci(56,84,1.6,"#FF6B6B")
      +Re(42,89,16,2.4,s.c[2],1,op(.7))+[[x0+6,90],[x1-6,90],[x0+10,82],[x1-10,82]].map(([x,y])=>Ci(x,y,.9,SOMB,op(.35))).join("")+Re(43,70,14,4,s.c[4],1.5),
    secours:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Re(x0+3,88,x1-x0-6,3,s.c[4],0,op(.95))+Re(x0+3,94,x1-x0-6,3,s.c[4],0,op(.95))
      +Re(44,77,12,9,BL,1.5)+Pa("M48.8 78.4H51.2V80.6H53.4V83H51.2V85.2H48.8V83H46.6V80.6H48.8Z",s.c[0])+Ln("M42 72.4Q50 77 58 72.4",SOMB,1,op(.25)),
    avocat:(s,x0,x1)=>torse(x0,x1,s.c[0])+Ln(`M${x0+8} 84Q${x0+10} 92 ${x0+9} 100M${x1-8} 84Q${x1-10} 92 ${x1-9} 100`,"#3A3A3A",1)+Pa("M46.6 72.5H53.4V75H46.6Z",s.c[4])
      +Pa("M46.8 75H49.6V84L48.2 82.6L46.8 84ZM50.4 75H53.2V84L51.8 82.6L50.4 84Z",s.c[4])+Ln("M44 72L48 100M56 72L52 100",s.c[2],.6,op(.4)),
    diplome:(s,x0,x1)=>torse(x0,x1,s.c[0])+Pa("M41 71.5L46 100H52L45 71Z",s.c[2])+Pa("M59 71.5L54 100H48L55 71Z",s.c[2])+Pa("M44 72L50 80L56 72Q50 70.5 44 72Z",s.c[4],op(0))
      +Ln("M45 71.5Q50 75 55 71.5",SOMB,1,op(.4)),
    neon:(s,x0,x1)=>torse(x0,x1,s.c[0])+Ln(`M${x0+2} 99Q${x0+4} 76 50 73Q${x1-4} 76 ${x1-2} 99`,s.c[2],1.4)+Ln(`M${x0+2} 99Q${x0+4} 76 50 73Q${x1-4} 76 ${x1-2} 99`,s.c[2],4,op(.25))
      +Ln("M44 73L50 86L56 73",s.c[4],1.2)+Ln("M44 73L50 86L56 73",s.c[4],3.6,op(.25))+emb(s,64,90,.4),
    spatiale:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+El(50,73,15,4.6,"#C9D3DE")+Re(39,82,9,7,s.c[4],1.2)+Re(52,82,9,7,s.c[2],1.2)+Ci(43.5,85.5,1.6,BL)
      +Ln("M54 85.5H59",BL,1)+Ln(`M${x0+6} 94H${x1-6}`,SOMB,1,op(.15)),
    kimono:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Ln("M42.5 71.6L58 96",SOMB,1.2,op(.35))+Ln("M57.5 71.6L46 88",SOMB,1.2,op(.3))+Pa("M42.5 71.6L50 84L46 88L41 74Z",SOMB,op(.06))
      +Re(x0+4,92,x1-x0-8,4.2,s.c[2])+Pa("M49 93L45 100H47.6L50 95.8L52.4 100H55L51 93Z",s.c[2]),
    roi:(s,x0,x1)=>torse(x0,x1,s.c[0])+ombre(x0)+Pa("M44 72L47.5 100H52.5L56 72Q50 70.5 44 72Z",s.c[4])+[78,84,90,96].map(y=>Ci(48.6,y,.7,"#1F1F1F")+Ci(51.4,y+3,.7,"#1F1F1F")).join("")
      +Ln("M40 74Q50 86 60 74",s.c[2],1.4)+G("translate(50 84) scale(.4)",IC.coeur(s.c[2]))+G("translate(36 88) scale(.4)",IC.coeur(s.c[4]))+G("translate(64 88) scale(.4)",IC.coeur(s.c[4])),
    salopette:(s,x0,x1)=>torse(x0,x1,s.c[4])+Ln("M42.4 72.4Q50 76 57.6 72.4",SOMB,1,op(.2))+Pa(`M39 84H61V100H39Z`,s.c[0])+Ln("M41 73L40.5 85M59 73L59.5 85",s.c[0],2.6)
      +Ci(41,84,1.1,"#E7C66B")+Ci(59,84,1.1,"#E7C66B")+Re(45,88,10,6,SOMB,1,op(.15))+Ci(36,94,1.8,"#FF6B6B",op(.9))+Ci(63,90,1.4,"#FFD43B")+Ci(56,97,1.2,"#3DAE73")};

  /* ---------------- Couvre-chefs : « tout » cache aussi les cheveux ---------------- */
  const HT={
    beret:{f:s=>El(46,24,24,9,s.c[3],` transform="rotate(-8 46 24)"`)+Ln("M30 32Q50 26 70 32",SOMB,3,op(.25))+Ci(43,15.5,2.1,s.c[3])},
    bonnet:{f:s=>Pa("M29 37Q29 12 50 12Q71 12 71 37Z",s.c[3])+Re(28,31,44,8,s.c[4]||s.c[3],4)+Re(28,31,44,8,SOMB,4,op(.18))+Ci(50,10,5,s.c[2])},
    pointu:{f:s=>Pa("M31 33L55 1L70 33Z",s.c[3])+Pa("M55 1L70 33H60Z",SOMB,op(.2))+El(50,33,25,4.4,s.c[3])+El(50,33,25,4.4,SOMB,op(.25))+G("translate(55 22) scale(.55)",IC.sier(s.c[2]))+Ci(46,26,1,s.c[2])+Ci(58,12,.9,s.c[2])},
    aureole:{f:s=>El(50,9,15,5,s.c[3],op(.18))+Ln("M50 9C47 4 38 4 38 9S47 14 50 9S62 4 62 9S53 14 50 9Z",s.c[3],2.4)+Ln("M50 9C47 4 38 4 38 9S47 14 50 9S62 4 62 9S53 14 50 9Z",BL,.7,op(.6))},
    lunettes:{f:s=>Ln("M29 33Q50 26 71 33",SOMB,3.2,op(.85))+Re(36,24,12,10,s.c[3],4,` opacity=".55" stroke="#2A2D31" stroke-width="2"`)+Re(52,24,12,10,s.c[3],4,` opacity=".55" stroke="#2A2D31" stroke-width="2"`)+Ln("M39 26.5l3 3M55 26.5l3 3",BL,1,op(.8))},
    orbites:{f:s=>`<g fill="none" stroke="${s.c[3]}" stroke-width="1.6"><ellipse cx="50" cy="20" rx="25" ry="6" transform="rotate(-14 50 20)"/><ellipse cx="50" cy="20" rx="25" ry="6" transform="rotate(14 50 20)"/></g>`+Ci(50,11,3.4,s.c[3])+Ci(27,24,1.8,s.c[3])+Ci(73,24,1.8,s.c[3])},
    statique:{tout:1,f:(s,a)=>{const hc=typeof AV_CHEV!=="undefined"&&AV_CHEV[a[5]]||"#2B1D16";let d="M27 42";for(let i=0;i<=12;i++){const t=Math.PI*(1+i/12),r=i%2?17:31;d+=`L${(50+r*Math.cos(t)).toFixed(1)} ${(40+r*Math.sin(t)*1.05).toFixed(1)}`}d+="L73 42Q60 30 50 30Q40 30 27 42Z";
      return Pa(d,hc)+G("translate(24 14) scale(.5)",IC.eclair(s.c[3]))+G("translate(78 16) scale(.45)",IC.eclair(s.c[3]))}},
    diademe:{f:s=>Ln("M32 31Q50 24 68 31",s.c[4],2.6)+Pa("M45 28L50 11L55 28Z",s.c[3])+Pa("M50 11L55 28H50Z",BL,op(.5))+Pa("M37 30L40 19L44 28Z",s.c[3],op(.9))+Pa("M56 28L60 19L63 30Z",s.c[3],op(.9))+Ci(50,24,1.4,s.c[2])},
    paille:{f:s=>El(50,31,31,7,s.c[3])+Pa("M35 31Q35 14 50 14Q65 14 65 31Z",s.c[3])+Re(35,25,30,5,s.c[0])+Ln("M38 20Q50 17 62 20M24 32Q50 38 76 32",SOMB,.6,op(.2))+Ci(61,27,3,"#FF6FA3")+Ci(61,27,1.2,"#FFD43B")},
    bandeau:{f:s=>Pa("M29 30Q50 23 71 30V36Q50 29 29 36Z",s.c[3])+Ln("M29 33Q50 26 71 33",BL,.8,op(.6))},
    casque:{f:s=>Pa("M28 34Q28 12 50 12Q72 12 72 34Z",s.c[3])+Pa("M24 34H76Q76 39 70 39H30Q24 39 24 34Z",s.c[3])+Pa("M24 34H76Q76 39 70 39H30Q24 39 24 34Z",SOMB,op(.15))+Re(47.5,12,5,22,SOMB,2,op(.14))+Ln("M34 22Q38 16 44 15",BL,1.4,op(.55))},
    plongee:{f:s=>Ln("M29 32Q50 25 71 32",SOMB,3,op(.85))+Re(35,21,30,13,s.c[2],6,` opacity=".55" stroke="${s.c[3]}" stroke-width="2.4"`)+Ln("M39 24Q42 22 46 23",BL,1,op(.8))+Ln("M71 34V12Q71 8 75 8",s.c[3],3)},
    aventurier:{f:s=>El(50,31,30,6.5,s.c[3])+Pa("M34 31Q33 14 42 13Q50 16 58 13Q67 14 66 31Z",s.c[3])+Re(34,25,32,5,SOMB,0,op(.3))+El(50,31,30,6.5,SOMB,op(.12))},
    tricorne:{f:s=>Pa("M21 30Q33 14 50 16Q67 14 79 30Q66 24 50 33Q34 24 21 30Z",s.c[3])+Ln("M21 30Q34 24 50 33Q66 24 79 30",s.c[2],1.4)+Ci(50,22,2,s.c[2])},
    phrygien:{f:s=>Pa("M30 36Q27 12 52 10Q71 9 75 22Q67 18 64 24Q71 30 70 36Z",s.c[3])+Pa("M64 24Q71 30 70 36H62Z",SOMB,op(.18))+Ci(35,31,4,"#1F3F8F")+Ci(35,31,2.7,"#FAFAF7")+Ci(35,31,1.4,"#C1272D")},
    galea:{f:s=>Pa("M36 15Q50-3 64 15Q57 9 50 9Q43 9 36 15Z",s.c[2])+Pa("M29 36Q29 14 50 14Q71 14 71 36Z",s.c[3])+Pa("M29 34L27 51Q31 53 34 47L34 36ZM71 34L73 51Q69 53 66 47L66 36Z",s.c[3])
      +Re(29,32,42,4,SOMB,1,op(.2))+Ln("M36 20Q42 16 48 16",BL,1.2,op(.5))},
    heaume:{tout:1,f:s=>Pa("M27 46Q26 13 50 12Q74 13 73 46L71 62Q65 64 64 58V41Q50 35 36 41V58Q35 64 29 62Z",s.c[3])+Ln("M36 41Q50 35 64 41",SOMB,1.6,op(.35))+Ln("M50 12V36",SOMB,1.2,op(.2))
      +Pa("M50 12Q53 2 63 0Q59 6 61 11Q56 8 50 12Z",s.c[2])+Ci(31,52,1,SOMB,op(.35))+Ci(69,52,1,SOMB,op(.35))},
    nemes:{tout:1,f:s=>{const st=[40,46,52,58,64].map(y=>Ln(`M27 ${y}L35 ${y-1}M65 ${y-1}L73 ${y}`,s.c[4],2.4)).join("");
      return Pa("M28 30Q28 14 50 14Q72 14 72 30L76 70Q66 67 64 52V34Q50 30 36 34V52Q34 67 24 70Z",s.c[3])+st+Ln("M32 20Q50 12 68 20M30 26Q50 18 70 26",s.c[4],2.2)+Re(36,31,28,3.4,s.c[4],1)+Ci(50,29,2,"#E7C66B")}},
    gavroche:{f:s=>Pa("M29 34Q28 15 50 14Q73 15 72 31Q70 35 60 34Z",s.c[3])+Pa("M29 33Q40 39 56 35Q46 31 29 33Z",s.c[3])+Pa("M29 33Q40 39 56 35Q46 31 29 33Z",SOMB,op(.3))+Ci(50,15.5,1.8,SOMB,op(.3))+Ln("M50 16L46 32M50 16L61 31",SOMB,.6,op(.2))},
    mousquetaire:{f:s=>Pa("M57 22Q76 2 91 9Q78 11 64 26Z",s.c[2])+Ln("M60 23Q74 9 89 9",SOMB,.5,op(.3))+El(50,30,30,6,s.c[3],` transform="rotate(-6 50 30)"`)+Pa("M35 30Q35 13 50 13Q65 13 65 29Z",s.c[3])+Re(35,24,30,4,s.c[2],0,op(.8))},
    laurier:{f:s=>{let o="";for(let i=0;i<7;i++){const t=Math.PI*(1.06+i*.08),x=(50+21*Math.cos(t)).toFixed(1),y=(36+16*Math.sin(t)).toFixed(1),x2=(100-x).toFixed(1);const r=(t*180/Math.PI+70).toFixed(0);
      o+=El(x,y,3.6,1.6,s.c[3],` transform="rotate(${r} ${x} ${y})"`)+El(x2,y,3.6,1.6,s.c[3],` transform="rotate(${180-r} ${x2} ${y})"`)}return Ln("M30 34Q50 16 70 34",SOMB,.6,op(.25))+o}},
    perruque:{tout:1,f:s=>Pa("M27 50Q24 14 50 14Q76 14 73 50Q70 40 68 30Q60 22 50 22Q40 22 32 30Q30 40 27 50Z",s.c[3])+[[28,38],[27,48],[72,38],[73,48]].map(([x,y])=>Ci(x,y,5.6,s.c[3])+`<circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="1.2"/>`).join("")+Ln("M36 20Q50 16 64 20",SOMB,.8,op(.12))},
    melon:{f:s=>Pa("M33 30Q33 12 50 12Q67 12 67 30Z",s.c[3])+Pa("M27 30Q50 36 73 30Q73 34 70 34Q50 38 30 34Q27 34 27 30Z",s.c[3])+Re(33,26,34,4,SOMB,0,op(.35))+Ln("M39 17Q44 14 49 14",BL,1.2,op(.3))},
    hautdeforme:{f:s=>Re(36,1,28,29,s.c[3],2)+El(50,30,22,4.4,s.c[3])+Re(36,22,28,5,s.c[2])+Ln("M40 5V20",BL,1.4,op(.2))},
    bandana:{f:s=>Pa("M29 33Q29 14 50 14Q71 14 71 33Q50 27 29 33Z",s.c[3])+Pa("M69 29L81 24L79 34Z",s.c[3])+Pa("M69 30L80 36L74 39Z",s.c[3])+[[40,22],[50,19],[60,22],[45,28],[55,27]].map(([x,y])=>Ci(x,y,1,BL,op(.85))).join("")},
    visiere:{f:s=>Ln("M29 30Q50 24 71 30",s.c[3],3.6)+Pa("M33 31Q50 27 67 31Q66 41 50 42Q34 41 33 31Z",s.c[3],op(.72))+Ln("M37 33Q50 30 63 33",BL,.8,op(.5))},
    fleur:{f:s=>Pa("M36 22Q50 3 64 22Q50 15 36 22Z","#3A2418",op(.85))+[[0,-4],[3.8,-1.2],[2.4,3.2],[-2.4,3.2],[-3.8,-1.2]].map(([x,y])=>Ci(33+x,28+y,3.6,s.c[3])).join("")+Ci(33,28,2,"#FFD43B")+El(40,32,3,1.4,"#2F7A3A",` transform="rotate(30 40 32)"`)},
    casquette:{f:s=>Pa("M28 33Q29 15 50 15Q71 15 72 33Z",s.c[3])+Pa("M50 31H84Q84 37 72 36H50Z",s.c[3])+Pa("M50 31H84Q84 37 72 36H50Z",SOMB,op(.2))+Ci(50,15.5,1.6,SOMB,op(.3))+G("translate(44 25) scale(.5)",icone(s.e||"etoile",s.c[2]))},
    feutre:{f:s=>Pa("M34 30Q33 15 42 14Q50 18 58 14Q67 15 66 30Z",s.c[3])+Pa("M24 30Q50 36 76 30Q74 34 50 36Q26 34 24 30Z",s.c[3])+Re(34,25,32,4.4,SOMB,0,op(.35))},
    antennes:{f:s=>Ln("M40 26L34 9M60 26L66 9",s.c[3],2)+Ci(34,8,3,s.c[2])+Ci(66,8,3,s.c[2])+Pa("M29 32Q50 23 71 32V36Q50 27 29 36Z",s.c[3])+Ci(29,42,5,s.c[3])+Ci(71,42,5,s.c[3])+Ci(29,42,2,SOMB,op(.3))+Ci(71,42,2,SOMB,op(.3))},
    capuche:{tout:1,f:s=>Pa("M50 12Q21 12 22 48Q23 68 34 76H66Q77 68 78 48Q79 12 50 12ZM50 24Q33 24 32 44Q32 64 50 66Q68 64 68 44Q67 24 50 24Z",s.c[3],` fill-rule="evenodd"`)+Ln("M50 24Q33 24 32 44Q32 64 50 66Q68 64 68 44Q67 24 50 24Z",SOMB,1.6,op(.35))+Ln("M44 70V78M56 70V78",s.c[2],.8)},
    tyrolien:{f:s=>Pa("M60 23Q69 6 77 4Q73 13 64 26Z",s.c[2])+Pa("M34 29Q35 13 50 12Q65 13 66 29Z",s.c[3])+Pa("M26 29Q50 35 74 29Q72 33 50 34Q28 33 26 29Z",s.c[3])+Pa("M26 29Q50 35 74 29Q72 33 50 34Q28 33 26 29Z",SOMB,op(.2))+Ln("M34 25Q50 28 66 25",s.c[2],1.4)},
    bob:{f:s=>Pa("M34 29Q34 15 50 15Q66 15 66 29Z",s.c[3])+Pa("M30 28L26 37Q50 42 74 37L70 28Z",s.c[3])+Pa("M30 28L26 37Q50 42 74 37L70 28Z",SOMB,op(.15))+Ln("M28 33Q50 38 72 33",SOMB,.5,op(.3))},
    pensee:{f:s=>Ci(65,21,2,BL,op(.95))+Ci(70,14,3,BL,op(.95))+El(64,4,13,7,BL,op(.95))+Ci(56,6,5,BL,op(.95))+Ci(72,6,5,BL,op(.95))+Tx(64,8.5,9,s.c[2],"?")},
    mortier:{f:s=>Pa("M36 26V34Q50 40 64 34V26Z",s.c[3])+Pa("M22 22L50 12L78 22L50 32Z",s.c[3])+Pa("M22 22L50 32L78 22",SOMB,op(.25))+Ln("M50 22L71 25V37",s.c[2],1.2)+Ci(71,38,2.2,s.c[2])+Ci(50,22,1.6,s.c[2])},
    neon:{f:s=>Ln("M29 32Q50 25 71 32",s.c[3],8,op(.25))+Ln("M29 32Q50 25 71 32",s.c[3],2.6)+Ln("M36 29L40 26M44 27.5L47 25M53 25L56 27.5M60 26L64 29",s.c[2],1.4)},
    bocal:{f:s=>Ci(50,44,31,"#BFE6F7",op(.18))+`<circle cx="50" cy="44" r="31" fill="none" stroke="${s.c[3]}" stroke-width="3.6"/>`+Ln("M30 30Q36 19 47 16",BL,2.4,op(.7))+El(50,75,22,5,s.c[3])+El(50,75,22,5,SOMB,op(.12))},
    hachimaki:{f:s=>Pa("M29 32Q50 25 71 32V37Q50 30 29 37Z",s.c[3])+Pa("M30 33L17 38L19 45L31 37Z",s.c[3])+Pa("M30 34L21 47L26 49L32 37Z",s.c[3],op(.9))},
    couronne:{f:s=>Pa("M31 31L31 14L39 22L45 9L50 20L55 9L61 22L69 14L69 31Z",s.c[3])+Re(31,26,38,5,s.c[3])+Re(31,26,38,5,SOMB,0,op(.15))+Ci(40,28.5,1.6,"#C1272D")+Ci(50,28.5,1.8,"#1F3F8F")+Ci(60,28.5,1.6,"#2F9E6A")+Ci(45,9,1.3,BL)+Ci(55,9,1.3,BL)},
    toque:{f:s=>Pa("M35 30Q34 16 50 15Q66 16 65 30Z",s.c[3])+Re(33,26,34,5,s.c[3],2)+Ln("M37 21Q50 18 63 21",BL,.6,op(.25))}};

  /* ---------------- Fonds (100 x 100, base couleur fond, motif clair) ---------------- */
  const pt=(f)=>{let s="";for(let y=6;y<100;y+=12)for(let x=(y/12%2?12:6);x<100;x+=12)s+=f(x,y);return s};
  const FD={
    grille:s=>Ln(Array.from({length:9},(_,i)=>`M${i*12+4} 0V100M0 ${i*12+4}H100`).join(""),s.c[0],.5,op(.18)),
    chiffres:s=>[["3,14",18,22],["159",70,16],["2653",20,68],["58",80,62],["9793",64,90],["23",12,92]].map(([t,x,y])=>Tx(x,y,9,s.c[2],t).replace("<text","<text opacity=\".22\"")).join(""),
    fractale:s=>[[20,20,12],[78,26,10],[16,70,9],[86,72,8]].map(([x,y,r])=>G(`translate(${x} ${y}) scale(${r/6})`,IC.sier(s.c[2]))).join("").replace(/<path/g,"<path opacity=\".3\"").replace(/<path opacity=".3" d="([^"]*)" fill="#000"/g,"<path d=\"$1\" fill=\"#000\""),
    cosmos:s=>pt((x,y)=>Ci(x+(x*7%5),y+(y*3%4),(x+y)%3?.6:1.1,BL,op((x*y)%5?.5:.9)))+Ln("M50 50C40 30 10 30 10 50S40 70 50 50S90 30 90 50S60 70 50 50Z",s.c[2],.6,op(.25)),
    hexa:s=>{let o="";for(let y=0;y<110;y+=15)for(let x=(y/15%2?9:0);x<110;x+=18)o+=`<path d="M${x} ${y-8}l7 4v8l-7 4l-7-4v-8z" fill="none" stroke="${s.c[2]}" stroke-width=".8" opacity=".35"/>`;return o},
    particules:s=>pt((x,y)=>Ci(x,y,(x+y)%4?1:1.8,s.c[2],op(.35)))+Ln("M0 30Q30 20 50 40T100 40",s.c[2],.5,op(.3)),
    zigzag:s=>[20,46,72].map(y=>Ln(`M0 ${y}L10 ${y-8}L20 ${y}L30 ${y-8}L40 ${y}L50 ${y-8}L60 ${y}L70 ${y-8}L80 ${y}L90 ${y-8}L100 ${y}`,s.c[2],1.2,op(.28))).join(""),
    arcenciel:s=>["#FF6B6B","#FFC46B","#FFE66B","#7BE0A4","#6BC3FF","#C79BFF"].map((c,i)=>Ln(`M-10 ${110-i*5}Q50 ${10-i*5} 110 ${110-i*5}`,c,4.4,op(.55))).join(""),
    feuilles:s=>[[14,16,30],[82,20,-40],[10,64,60],[88,66,-20],[30,90,10],[70,92,80]].map(([x,y,r])=>G(`translate(${x} ${y}) rotate(${r})`,IC.feuille("#4F8A3C")).replace("<path","<path opacity=\".45\"")).join(""),
    cellules:s=>[[16,18,10],[82,22,9],[14,74,8],[86,76,11],[50,8,5]].map(([x,y,r])=>Ci(x,y,r,s.c[2],op(.2))+Ci(x+r/4,y-r/5,r/3.2,s.c[2],op(.35))).join(""),
    lave:s=>Ln("M0 80Q20 70 40 84T80 78T110 86",s.c[2],5,op(.45))+Ln("M0 92Q25 84 50 96T100 90",s.c[3],4,op(.4))+pt((x,y)=>y<60&&(x+y)%3===0?Ci(x,y,1,s.c[3],op(.7)):""),
    vagues:s=>[18,36,54,72,90].map(y=>Ln(`M0 ${y}Q12.5 ${y-6} 25 ${y}T50 ${y}T75 ${y}T100 ${y}`,s.c[2],1.1,op(.32))).join("")+Ci(80,30,1.6,BL,op(.4))+Ci(84,22,1.1,BL,op(.4)),
    carte:s=>Ln("M8 80Q20 60 34 66T56 46T80 40",s.c[2],1.4,` opacity=".5" stroke-dasharray="3 3"`)+Ln("M76 34l8 8M84 34l-8 8",s.c[3],1.8,op(.7))+Ln("M0 18Q20 10 40 20T100 14",s.c[0],.8,op(.35)),
    meridiens:s=>Ln("M50 0Q20 50 50 100M50 0Q80 50 50 100M50 0V100M0 30Q50 22 100 30M0 50H100M0 70Q50 78 100 70",s.c[0],.7,op(.28)),
    bandes3:s=>Re(0,0,33,100,"#1F3F8F",0,op(.14))+Re(67,0,33,100,"#C1272D",0,op(.14)),
    colonnes:s=>[10,90].map(x=>Re(x-5,20,10,80,BL,0,op(.35))+Re(x-7,18,14,4,BL,0,op(.45))+Ln(`M${x-2} 24V100M${x+2} 24V100`,SOMB,.5,op(.15))).join(""),
    blason:s=>{let o="";for(let y=0;y<100;y+=14)for(let x=(y/14%2?7:0);x<100;x+=14)o+=Pa(`M${x} ${y-7}L${x+7} ${y}L${x} ${y+7}L${x-7} ${y}Z`,s.c[2],op(.12));return o},
    pyramides:s=>Ci(78,22,8,"#FFF2C2",op(.8))+Pa("M-4 100L26 52L56 100Z","#C9A04E",op(.7))+Pa("M40 100L66 60L92 100Z","#B88B3E",op(.7))+Pa("M26 52L56 100H36Z",SOMB,op(.1)),
    cahier:s=>Ln(Array.from({length:12},(_,i)=>`M0 ${i*8+6}H100`).join(""),"#6B9AD8",.6,op(.45))+Ln("M16 0V100","#E06A6A",.8,op(.6)),
    rideau:s=>[0,14,28].map(x=>Pa(`M${x} 0Q${x+8} 50 ${x+3} 100H${x+14}Q${x+18} 50 ${x+14} 0Z`,"#B3263B",op(.6))).join("")+[72,86,100].map(x=>Pa(`M${x} 0Q${x-6} 50 ${x-3} 100H${x-14}Q${x-18} 50 ${x-14} 0Z`,"#B3263B",op(.6))).join("")+Pa("M0 0H100V8Q50 14 0 8Z",s.c[2],op(.6)),
    nuit:s=>Ci(80,18,7,"#FFF2C2")+Ci(84,16,6,s.c[1])+pt((x,y)=>(x*y)%7===0?Ci(x,y,.8,BL,op(.8)):""),
    soleil:s=>{let o="";for(let i=0;i<16;i++){const a=i*Math.PI/8;o+=Pa(`M50 50L${(50+80*Math.cos(a-.1)).toFixed(1)} ${(50+80*Math.sin(a-.1)).toFixed(1)}L${(50+80*Math.cos(a+.1)).toFixed(1)} ${(50+80*Math.sin(a+.1)).toFixed(1)}Z`,s.c[2],op(.16))}return o},
    vichy:s=>Array.from({length:8},(_,i)=>Re(i*13,0,6.5,100,s.c[2],0,op(.12))+Re(0,i*13,100,6.5,s.c[2],0,op(.12))).join(""),
    briques:s=>{let o="";for(let y=0;y<100;y+=10)for(let x=(y/10%2?-10:0);x<100;x+=20)o+=Re(x+1,y+1,18,8,"#B33A2E",1,op(.55));return o},
    scene:s=>Pa("M20 0L4 100H40Z",BL,op(.08))+Pa("M80 0L60 100H96Z",BL,op(.08))+pt((x,y)=>(x+y)%5===0?Ci(x,y,.7,s.c[2],op(.6)):""),
    rayons:s=>{let o="";for(let i=0;i<12;i++){const a=i*Math.PI/6;o+=Pa(`M50 60L${(50+90*Math.cos(a-.13)).toFixed(1)} ${(60+90*Math.sin(a-.13)).toFixed(1)}L${(50+90*Math.cos(a+.13)).toFixed(1)} ${(60+90*Math.sin(a+.13)).toFixed(1)}Z`,s.c[2],op(.14))}return o},
    fanions:s=>[10,26].map((y,j)=>Ln(`M-5 ${y}Q50 ${y+12} 105 ${y}`,SOMB,.4,op(.4))+[0,1,2,3,4,5,6].map(i=>{const x=i*16+(j?8:0);return Pa(`M${x} ${y+3}L${x+10} ${y+4}L${x+5} ${y+12}Z`,["#D62828","#FFD43B","#3E73C9","#2F9E6A"][(i+j)%4],op(.75))}).join("")).join(""),
    pois:s=>pt((x,y)=>Ci(x,y,2.4,s.c[2],op(.22))),
    barres:s=>[[8,40],[22,58],[36,30],[50,70],[64,48],[78,80],[92,62]].map(([x,h])=>Re(x-4,100-h,8,h,s.c[2],1,op(.18))).join(""),
    courbes:s=>Ln("M6 10V94H96",s.c[0],1,op(.3))+Ln("M14 18Q40 80 92 86",s.c[2],1.6,op(.4))+Ln("M14 86Q50 70 92 16",s.c[0],1.6,op(.35)),
    cours:s=>[[8,60,20],[18,50,24],[28,56,18],[38,40,26],[48,44,20],[58,30,22],[68,34,18],[78,20,24],[88,16,20]].map(([x,y,h],i)=>Ln(`M${x} ${y-4}V${y+h+4}`,s.c[2],.6,op(.5))+Re(x-2.6,y,5.2,h,i%3===2?"#FF5C5C":s.c[2],.6,op(.45))).join(""),
    pixels:s=>pt((x,y)=>(x*3+y)%5===0?Re(x-3,y-3,6,6,["#FF6FA3","#3DDC97","#7DF9FF","#FFD43B"][(x+y)%4],0,op(.45)):""),
    circuit:s=>Ln("M0 20H30L40 30V60M100 30H70L60 40V80M10 100V80H30L40 70M90 0V14L80 24",s.c[2],1,op(.4))+[[40,60],[60,80],[30,80],[80,24],[30,20]].map(([x,y])=>Ci(x,y,2,s.c[2],op(.55))).join(""),
    code:s=>[8,22,36,64,78,92].map((x,i)=>Array.from({length:8},(_,j)=>Tx(x,j*13+8+(i*5%9),7,s.c[2],(i+j)%3?"1":"0").replace("<text","<text opacity=\""+(.15+((i*j)%4)*.1).toFixed(2)+"\"")).join("")).join(""),
    losanges:s=>{let o="";for(let y=0;y<110;y+=16)for(let x=(y/16%2?8:0);x<110;x+=16)o+=Pa(`M${x} ${y-8}L${x+8} ${y}L${x} ${y+8}L${x-8} ${y}Z`,"#3E8FD8",op(.22));return o},
    arches:s=>[10,50,90].map(x=>Pa(`M${x-16} 100V62Q${x-16} 44 ${x} 44Q${x+16} 44 ${x+16} 62V100Z`,s.c[2],op(.16))).join("")+Ln("M0 92Q25 88 50 92T100 92",BL,.8,op(.3)),
    nuages:s=>[[20,20],[76,30],[30,80],[84,84]].map(([x,y])=>El(x,y,10,5,BL,op(.9))+Ci(x-3,y-3,5,BL,op(.9))+Ci(x+4,y-2,4,BL,op(.9))).join(""),
    marbre:s=>Ln("M0 20Q30 30 40 10T90 0M0 60Q20 50 50 70T100 60M30 100Q40 80 70 90T100 80",BL,.8,op(.25))+Ln("M10 40Q30 46 50 36",BL,.4,op(.25)),
    bulles:s=>[[16,18],[84,24],[14,78],[86,80]].map(([x,y],i)=>G(`translate(${x} ${y}) scale(1.3)`,IC.bulle(["#1F3F8F","#C1272D","#1F3F8F","#C1272D"][i])).replace("<path","<path opacity=\".25\"")).join(""),
    plan:s=>Ln(Array.from({length:10},(_,i)=>`M${i*10+5} 0V100M0 ${i*10+5}H100`).join(""),BL,.4,op(.18))+`<circle cx="22" cy="24" r="10" fill="none" stroke="#FFF" stroke-width=".8" opacity=".4"/>`+Ln("M60 70H92V90H60ZM60 70L92 90",BL,.8,op(.4)),
    schema:s=>Ln("M0 24H20L24 18L30 30L36 18L42 30L46 24H70M70 14V34M76 18V30M76 24H100M0 76H30M30 66V86M36 70V82M36 76H60Q66 66 72 76T84 76H100",s.c[2],1,op(.4)),
    ecg:s=>Ln("M0 50H30L36 40L42 64L50 20L58 74L64 50H100",s.c[0],1.6,op(.4))+Ln(Array.from({length:10},(_,i)=>`M${i*10} 0V100M0 ${i*10}H100`).join(""),s.c[0],.3,op(.2)),
    fleches:s=>[[18,80],[50,60],[82,40]].map(([x,y])=>Pa(`M${x-6} ${y+10}V${y}H${x-10}L${x} ${y-12}L${x+10} ${y}H${x+6}V${y+10}Z`,s.c[2],op(.25))).join(""),
    livres:s=>[0,40,80].map(y=>Re(0,y+28,100,3,"#8B5A2B",0,op(.5))+[4,12,19,28,34,44,52,60,66,76,84,92].map((x,i)=>Re(x,y+28-(14+i%3*4),6+i%2,14+i%3*4,["#7A2E4D","#1F3F8F","#2F5D3A","#C8963E"][i%4],.6,op(.55))).join("")).join(""),
    confettis:s=>pt((x,y)=>Re(x-1.4,y-2.4,2.8,4.8,["#E7C66B","#C1272D","#3E73C9","#2F9E6A"][(x+y)%4],.6,` opacity=".7" transform="rotate(${(x*7+y*3)%90} ${x} ${y})"`)),
    synthwave:s=>Ci(50,54,22,s.c[2],op(.55))+Re(28,58,44,2,s.c[1])+Re(28,64,44,3,s.c[1])+Re(28,71,44,4,s.c[1])+Ln("M0 76H100M0 82H100M0 90H100M50 76L20 100M50 76L80 100M50 76V100M50 76L0 90M50 76L100 90",s.c[3],.6,op(.6)),
    espace:s=>Ci(82,22,9,"#FF8C42",op(.85))+El(82,22,15,3,"none",` stroke="#FFD43B" stroke-width="1" opacity=".7" transform="rotate(-20 82 22)"`)+pt((x,y)=>(x*y)%3?Ci(x,y,(x+y)%4?.5:1,BL,op(.8)):""),
    ondes:s=>[14,24,34].map(r=>`<circle cx="50" cy="50" r="${r+14}" fill="none" stroke="${s.c[2]}" stroke-width="1" opacity="${(.5-r/90).toFixed(2)}"/>`).join(""),
    tatami:s=>Re(0,0,50,100,SOMB,0,op(.04))+Ln("M50 0V100M0 50H50M50 25H100M50 75H100",SOMB,.8,op(.15)),
    tapis:s=>pt((x,y)=>(x+y)%3===0?G(`translate(${x} ${y}) scale(.35)`,[IC.coeur,IC.etoile,IC.coeur][(x+y)%3]("#FFFFFF")).replace("<path","<path opacity=\".14\""):""),
    taches:s=>[[18,20,"#FF6B6B"],[80,24,"#FFD43B"],[16,78,"#3DAE73"],[84,80,"#3E73C9"]].map(([x,y,c])=>Ci(x,y,6,c,op(.45))+Ci(x+5,y+4,2.4,c,op(.45))+Ci(x-5,y+5,1.6,c,op(.45))).join("")};

  /* ---------------- Habillage : persoSVG d'origine + calques du skin ---------------- */
  const GARDE=new Set([1,2]);  // hijab et turban : on les garde, le skin ne pose pas de couvre-chef par-dessus
  function habille(a,s){if(!Array.isArray(a)||!s)return null;
    const keep=GARDE.has(a[13]),H=HT[s.h],a2=a.slice();a2[15]=0;
    if(H&&!keep){a2[13]=0;if(H.tout)a2[6]=0}
    let svg=persoSVG(a2);
    const fond=`<rect x="0" y="0" width="100" height="100" fill="${s.c[1]}"/>`+(FD[s.f]?FD[s.f](s):"");
    svg=svg.replace(/<rect x="0" y="0" width="100" height="100" fill="[^"]*"\/>/,()=>`<g data-skin="${s.id}">${fond}</g>`);
    const bd=BW[a[1]]||BW[1],tenue=TN[s.t]?TN[s.t](s,bd[0],bd[1]):"";
    const marques=['<path d="M50 16Q24 16 24 47','<circle cx="30" cy="47" r="4.5"','<ellipse cx="50" cy="45" rx="20" ry="22"'];
    let at=-1;marques.forEach(m=>{const i=svg.indexOf(m);if(i>=0&&(at<0||i<at))at=i});
    if(at>=0)svg=svg.slice(0,at)+tenue+svg.slice(at);
    const haut=(H&&!keep?H.f(s,a):"")+(IC[s.a]?G("translate(79 67) scale(1.55)",G("translate(.5 .7)",icone(s.a,"#000").replace(/<(path|circle|ellipse|rect|text)/g,'<$1 opacity=".22"'))+icone(s.a,s.c[2])):"");
    return svg.replace(/<\/svg>$/,haut+"</svg>")}
  S2.habille=habille;

  /* ---------------- Ce que je possède, ce que j'ai choisi ---------------- */
  const it=(k,s)=>{const r=RAR[s.r];return k==="skn"?{_k:"skn:"+s.id,xp:r.skn,nom:"Skin "+s.nom}:k==="dos"?{_k:"dos:"+s.dos,xp:r.dos,nom:"Dos "+s.nom}:{_k:"cad:"+s.cad,xp:r.cad,nom:"Cadre "+s.nom}};
  const a_moi=(k,s)=>!!(P.own&&P.own[it(k,s)._k]);
  const prixManquant=s=>["skn","dos","cad"].reduce((t,k)=>t+(a_moi(k,s)?0:it(k,s).xp),0);
  const prixSepare=s=>RAR[s.r].skn+RAR[s.r].dos+RAR[s.r].cad;
  const prixPack=s=>{const m=prixManquant(s),t=prixSepare(s);if(!m)return 0;return Math.max(10,Math.round(RAR[s.r].pack*m/t/10)*10)};
  function monSkin(){const id=P.sk&&P.sk.skn;const s=skinOk(id);return s&&a_moi("skn",s)?s:null}
  S2.monSkin=monSkin;
  P26ui.ligne(()=>({skn:(monSkin()||{}).id||""}));
  // Skin d'une ligne : le mien (choix vérifié), sinon celui publié, revérifié par liste blanche.
  function skinDe(r){if(!r)return null;if(r.me)return monSkin();return skinOk(r.skn)}

  /* avParts enveloppé : le Personnage reçoit les calques du skin. Toute erreur rend l'avatar d'origine. */
  if(!S2.avOrig&&typeof avParts==="function"){S2.avOrig=avParts;
    window.avParts=function(r){const o=S2.avOrig(r);try{const k=avKOk(r&&r.avk);if(k&&k.t==="b"){const s=skinDe(r);if(s){const inner=habille(k.a,s);if(inner)return {col:s.c[1],inner}}}}catch(e){try{console.warn("[skins]",e)}catch(_){}}return o}}
  if(!S2.paintOrig&&typeof paintMyAv==="function"){S2.paintOrig=paintMyAv;
    window.paintMyAv=function(){const t=$("#tAv");if(!t)return;const {col,inner}=avParts({nick:myNick()||"Moi",av:avData(),avk:avK(),me:true});t.style.setProperty("--av",col);t.innerHTML=inner}}

  /* ---------------- Dos et cadres : feuille de style fabriquée depuis le catalogue ---------------- */
  const MOTIF={grille:x=>`repeating-linear-gradient(0deg,${x} 0 1px,transparent 1px 9px),repeating-linear-gradient(90deg,${x} 0 1px,transparent 1px 9px)`,
    diag:x=>`repeating-linear-gradient(45deg,${x} 0 2px,transparent 2px 9px)`,
    tri:x=>`linear-gradient(135deg,${x} 25%,transparent 25%) -6px 0/12px 12px,linear-gradient(225deg,${x} 25%,transparent 25%) -6px 0/12px 12px`,
    rayons:x=>`repeating-conic-gradient(from 0deg at 50% 50%,${x} 0 9deg,transparent 9deg 18deg)`,
    hexa:x=>`radial-gradient(circle,transparent 3.5px,${x} 3.5px 4.5px,transparent 4.5px) 0 0/12px 12px`,
    points:x=>`radial-gradient(circle,${x} 0 1.3px,transparent 1.8px) 0 0/9px 9px`,
    zigzag:x=>`linear-gradient(135deg,${x} 25%,transparent 25%) 0 0/10px 10px,linear-gradient(225deg,${x} 25%,transparent 25%) 0 0/10px 10px`,
    arc:x=>`linear-gradient(115deg,rgba(255,107,107,.55),rgba(255,214,102,.55),rgba(123,224,164,.55),rgba(107,195,255,.55),rgba(199,155,255,.55))`,
    vagues:x=>`radial-gradient(circle at 50% 0,transparent 5px,${x} 5px 6.5px,transparent 6.5px) 0 0/14px 8px`,
    damier:x=>`conic-gradient(${x} 25%,transparent 0 50%,${x} 0 75%,transparent 0) 0 0/12px 12px`,
    losanges:x=>`linear-gradient(45deg,${x} 25%,transparent 25% 75%,${x} 75%) 0 0/12px 12px,linear-gradient(45deg,${x} 25%,transparent 25% 75%,${x} 75%) 6px 6px/12px 12px`,
    bandes:x=>`repeating-linear-gradient(0deg,${x} 0 3px,transparent 3px 10px)`,
    lignes:x=>`repeating-linear-gradient(0deg,${x} 0 1px,transparent 1px 7px)`,
    code:x=>`repeating-linear-gradient(90deg,${x} 0 2px,transparent 2px 6px),repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.45) 3px 6px)`};
  // Luminance relative (WCAG) : sur un dos clair, un emblème trop pâle prend la couleur de la tenue.
  const lum=h=>{const n=parseInt(String(h).slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)};
  const contraste=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const encre=s=>contraste(s.c[2],s.c[1])>=2.2?s.c[2]:contraste(s.c[0],s.c[1])>=2.2?s.c[0]:"#1F1F1F";
  function embleme(s){const k=encre(s),ic=s.e?icone(s.e,k):icone("ceinture",k);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><circle r="9" fill="${rgba(s.c[1],.85)}" stroke="${k}" stroke-width=".8"/>${ic}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29")}")`}
  function feuille(){const o=[];
    SK.forEach(s=>{const x=rgba(encre(s),.32),m=(MOTIF[s.d]||MOTIF.diag)(x);
      o.push(`[data-dos="${s.dos}"],.dosv[data-d="${s.dos}"]{--da:${s.c[1]};--db:${s.c[0]};--dp:${embleme(s)} center/58% no-repeat,${m}}`);
      const c1=s.c[0]===s.c[1]?s.c[2]:s.c[0],c3=s.c[2];
      if(s.r==="c")o.push(`.av[data-cadre="${s.cad}"]{box-shadow:0 0 0 var(--cw) ${c3}}`);
      else if(s.r==="r")o.push(`.av[data-cadre="${s.cad}"]{box-shadow:0 0 0 var(--cw) ${c3},0 0 0 calc(var(--cw) + 1.5px) ${c1}}`);
      else if(s.r==="e")o.push(`.av[data-cadre="${s.cad}"]{box-shadow:0 0 0 var(--cw) ${c3},0 0 0 calc(var(--cw) + 1.5px) ${c1},0 0 10px 2px ${rgba(c3,.55)}}`);
      else o.push(`.av[data-cadre="${s.cad}"]{--s2a:${c3};--s2b:${c1};box-shadow:0 0 0 var(--cw) ${c3},0 0 0 calc(var(--cw) + 2px) ${c1},0 0 10px 2px ${rgba(c3,.6)};animation:s2leg 3.2s ease-in-out infinite}`)});
    return o.join("\n")}
  if(!document.getElementById("s2css")){const st=document.createElement("style");st.id="s2css";st.textContent=feuille();document.head.appendChild(st)}

  /* Dos : identifiants reconnus (ceux de la page + ceux des skins). Un autre identifiant devient « classique ». */
  const dosOk=id=>typeof id==="string"&&ID.test(id)&&((typeof DOS!=="undefined"&&DOS.some(d=>d.id===id))||SK.some(s=>s.dos===id))?id:"classique";
  S2.dosOk=dosOk;

  /* ---------------- Cadres : ajoutés au catalogue de boutique.js (onglet Cadres inchangé, groupe « k ») ---------------- */
  const pret=window.P26mod?window.P26mod("boutique").catch(()=>null):Promise.resolve();
  pret.then(()=>{const T4=window.P1T4;if(!T4||!T4.catalogue||!Array.isArray(T4.catalogue.CAD))return;const CAD=T4.catalogue.CAD;
    SK.forEach(s=>{if(!CAD.some(c=>c.id===s.cad))CAD.push({id:s.cad,nom:s.nom,xp:RAR[s.r].cad,g:"k",_k:"cad:"+s.cad,k:"cad"})});S2.cadres=true;
    try{if(typeof renderLigue==="function"&&view==="ligue")renderLigue()}catch(e){}});

  /* ---------------- Packs offerts : 100 cartes réussies dans une matière ---------------- */
  const SEUIL=100;
  // Matière d'une carte : celle de son chapitre (cours importés), sinon celle de l'identifiant du Programme (pb.<matière>-<n>.…).
  function matDe(id){const x=typeof C!=="undefined"&&C.cards&&C.cards[id];if(x&&x.ch&&typeof x.ch.mat==="string")return x.ch.mat;const m=/^pb\.([a-z]+)-\d+\./.exec(id);return m?m[1]:""}
  // Groupe d'une matière : d'après son nom quand le contenu la décrit (les cours importés ont leurs propres identifiants,
  // par exemple « es » pour Espagnol), sinon d'après les identifiants de MATDEF.
  const MOTS=[[/espagnol/i,"esp"],[/anglais/i,"ang"],[/allemand/i,"all"],[/italien/i,"ita"],[/math/i,"maths"],[/physique|chimie/i,"pc"],[/svt|vie et de la terre/i,"svt"],
    [/scientifique/i,"es"],[/histoire|géo/i,"hg"],[/français|lettres/i,"fr"],[/économiques et sociales|^ses\b/i,"ses"],[/informatique|^nsi\b/i,"nsi"],[/humanités|philo|^hlp\b/i,"hlp"],
    [/moral et civique|^emc\b/i,"emc"],[/ingénieur/i,"si"],[/melec|électri/i,"melec"],[/prévention santé|^pse\b/i,"pse"],[/gestion|management|droit/i,"eco"]];
  const GMEMO={};
  function groupeMat(mid){if(!mid)return "";if(GMEMO[mid]!==undefined)return GMEMO[mid];const M=typeof C!=="undefined"&&C.M&&C.M[mid];const t=M?String(M.nom||"")+" "+String(M.court||""):"";let g="";
    if(t.trim())for(const [re,x] of MOTS){if(re.test(t)){g=x;break}}if(!g)g=GDE[mid]||"";if(M)GMEMO[mid]=g;return g}
  function reussies(){const n={};Object.entries(P.c||{}).forEach(([id,v])=>{if(!Array.isArray(v)||!(v[0]>=1))return;const g=groupeMat(matDe(id));if(g)n[g]=(n[g]||0)+1});return n}
  S2.reussies=reussies;
  const donDe=g=>SK.find(s=>s.g===g&&s.don);
  // Le message (toast, avec vibration) attend le premier toucher de la page : le navigateur refuse de vibrer avant.
  function annonce(h){const u=navigator.userActivation;if(u&&!u.hasBeenActive){addEventListener("pointerdown",()=>setTimeout(()=>toast(h),300),{once:true});return}toast(h)}
  function dons(silence){const n=reussies();let ch=false;P.own=P.own||{};
    GRP.forEach(([g])=>{const s=donDe(g);if(!s||(n[g]||0)<SEUIL||P.own["don:"+g])return;P.own["don:"+g]=1;["skn","dos","cad"].forEach(k=>{P.own[it(k,s)._k]=1});ch=true;
      if(!silence)annonce(`<span class="tm">✓</span><div><b>Pack ${esc(s.nom)} offert</b><span>${SEUIL} cartes réussies en ${esc(GNOM[g])}. Skin, dos et cadre sont à toi.</span></div>`)});
    if(ch){saveP();try{if(typeof view!=="undefined"&&view==="ligue")renderLigue()}catch(e){}}return ch}
  S2.dons=dons;
  let dT=0;const donsBientot=()=>{clearTimeout(dT);dT=setTimeout(()=>dons(false),400)};
  P26ui.on("reponse",donsBientot);P26ui.on("contenu",()=>dons(false));P26ui.on("xp",donsBientot);

  /* ---------------- Boutique : onglets Skins et Packs ---------------- */
  P26ui.on("boutique.onglets",L=>L.push(["skins","Skins"],["packs","Packs"]));
  const etatUI=S2.ui=S2.ui||{f:"",vu:"",arme:null};
  // Achat en deux touchers : le premier « arme » l'achat (8 s), le second le confirme. Gardé si la page se redessine entre les deux.
  const arme_=k=>!!(etatUI.arme&&etatUI.arme.k===k&&Date.now()-etatUI.arme.t<8000);
  const lib=(k,txt,pr)=>arme_(k)?"Acheter ? "+fmtN(pr):txt;
  function mesGroupes(){try{if(typeof clsMats==="function"&&P.cls){const g=new Set(clsMats(P.cls).map(m=>GDE[m]||groupeMat(m)).filter(Boolean));g.add("bonus");return g}}catch(e){}return null}
  function filtres(){const mg=mesGroupes(),L=[["","Tout"]];if(mg)L.unshift(["moi","Pour toi"]);GRP.forEach(([g,n])=>{if(SK.some(s=>s.g===g))L.push([g,n])});
    if(!etatUI.f)etatUI.f=mg?"moi":"tout";return L}
  function visibles(){const f=etatUI.f,mg=mesGroupes();return SK.filter(s=>f==="moi"?(!mg||mg.has(s.g)):f&&f!=="tout"?s.g===f:true)}
  function chips(){const L=filtres();return `<div class="pick sm s2f" role="group" aria-label="Filtrer par matière">${L.map(([k,n])=>{const kk=k||"tout";return `<button type="button" class="${etatUI.f===kk?"on":""}" data-s2f="${kk}" aria-pressed="${etatUI.f===kk}">${esc(n)}</button>`}).join("")}</div>`}
  const monPerso=()=>{const k=avK();return k&&k.t==="b"?k.a:null};
  const MANNEQUIN=()=>typeof AV_DEF!=="undefined"?AV_DEF.slice():[6,1,0,0,0,0,0,0,0,0,0,0,0,0,7,0,6,0];
  function avSkin(s,cls,cad){const a=monPerso()||MANNEQUIN();const inner=s?habille(a,s):persoSVG(a);return `<span class="av s2av ${cls||""}" style="--av:${s?s.c[1]:"var(--gold)"}"${cad?` data-cadre="${cad}"`:""}>${inner}</span>`}
  function avCadre(cad){let col="var(--gold)",inner="";try{const r=avParts({nick:myNick()||"Moi",av:avData(),avk:avK(),me:true});col=r.col;inner=r.inner}catch(e){}return `<span class="av s2av" style="--av:${col}" data-cadre="${cad}">${inner}</span>`}
  const badge=s=>`<span class="s2r" data-r="${s.r}">${RAR[s.r].nom}</span>`;
  function rayonSkins(){const s=skinOk(etatUI.vu)||monSkin(),perso=!!monPerso(),choisi=(monSkin()||{}).id||"";
    let haut="";
    if(s){const own=a_moi("skn",s),on=choisi===s.id,pr=RAR[s.r].skn;
      haut=`<div class="s2top">${avSkin(s,"s2big")}<div><b>${esc(s.nom)}</b> ${badge(s)}<small>${esc(GNOM[s.g])} · ${own?(on?"Porté":"À toi"):fmtN(pr)+" pièces"}</small>
        <div class="s2act">${own?`<button class="btn light" type="button" data-s2porter="${s.id}">${on?"Retirer le skin":"Porter ce skin"}</button>`
          :`<button class="btn light${arme_("skn:"+s.id)?" buy":""}" type="button" data-s2b="skn:${s.id}" aria-label="Acheter le skin ${esc(s.nom)} pour ${fmtN(pr)} pièces">${lib("skn:"+s.id,"Acheter · "+fmtN(pr),pr)}</button>`}
        <button class="linkbtn" type="button" data-s2pack="${s.id}">Voir le pack</button></div></div></div>`}
    else haut=`<div class="s2top">${avSkin(null,"s2big")}<div><b>Choisis un skin</b><small>Touche un skin pour l’essayer sur ton Personnage.</small></div></div>`;
    const note=perso?"":`<p class="s2note">Les skins habillent ton Personnage. Tu n’en as pas encore : <button class="linkbtn" type="button" data-s2perso>crée-le dans ton profil</button>.</p>`;
    const L=visibles(),groupes=GRP.filter(([g])=>L.some(x=>x.g===g));
    const tuiles=groupes.map(([g,n])=>`<h4>${esc(n)}</h4>`+L.filter(x=>x.g===g).map(x=>{const own=a_moi("skn",x),on=choisi===x.id,vu=s&&s.id===x.id;
      return `<button type="button" class="s2t${on?" on":""}${vu?" vu":""}${own?"":" lock"}" data-s2vu="${x.id}" data-r="${x.r}" aria-pressed="${vu}" aria-label="Skin ${esc(x.nom)}, ${RAR[x.r].nom}${on?", porté":own?", à toi":", "+fmtN(RAR[x.r].skn)+" pièces"}">${avSkin(x)}<b>${esc(x.nom)}</b><small>${on?"Porté":own?"À toi":fmtN(RAR[x.r].skn)}</small></button>`}).join("")).join("");
    return `${haut}${note}${chips()}<div class="s2grid">${tuiles}</div><p class="shopnote">Un skin habille ton Personnage partout : classement, profil, amis, Arène et Duel. Les autres le voient aussi.</p>`}
  function piece(k,s){const o=it(k,s),own=a_moi(k,s),on=k==="skn"?(monSkin()||{}).id===s.id:k==="dos"?(P.dos||"classique")===s.dos:(P.sk&&P.sk.cad)===s.cad;
    const lab=k==="skn"?"Skin":k==="dos"?"Dos":"Cadre",vis=k==="skn"?avSkin(s):k==="dos"?`<i class="dosv s2dos" data-d="${s.dos}"></i>`:avCadre(s.cad);
    const kk=k+":"+s.id,txt=on?"Choisi":own?"Choisir":lib(kk,fmtN(o.xp),o.xp);
    return `<figure class="s2pc">${vis}<figcaption>${lab}</figcaption><button type="button" class="s2mini${on?" on":""}${!own&&arme_(kk)?" buy":""}" data-s2b="${k}:${s.id}" aria-pressed="${on}" aria-label="${esc(o.nom)}${on?", choisi":own?", choisir":", acheter pour "+fmtN(o.xp)+" pièces"}">${txt}</button></figure>`}
  function rayonPacks(){const n=reussies(),L=visibles();
    const cartes=L.map(s=>{const pp=prixPack(s),sep=prixSepare(s),tout=!pp;const don=s.don?donDe(s.g)===s:false;const nb=Math.min(SEUIL,n[s.g]||0),offert=!!(P.own&&P.own["don:"+s.g]);
      return `<article class="s2p" id="s2p-${s.id}" data-r="${s.r}"><header><b>Pack ${esc(s.nom)}</b>${badge(s)}<small>${esc(GNOM[s.g])}</small></header>
        <div class="s2trio">${piece("skn",s)}${piece("dos",s)}${piece("cad",s)}</div>
        <div class="s2buy">${tout?`<span class="s2ok">${offert&&don?"Pack offert : tout est à toi":"Tout est à toi"}</span>`
          :`<button class="btn light${arme_("pak:"+s.id)?" buy":""}" type="button" data-s2achat="${s.id}" aria-label="Acheter le pack ${esc(s.nom)} pour ${fmtN(pp)} pièces">${lib("pak:"+s.id,"Pack · "+fmtN(pp),pp)}</button><small>${pp<RAR[s.r].pack?"Prix ajusté à ce qui te manque. ":""}Séparément : <s>${fmtN(prixManquant(s))}</s></small>`}</div>
        ${don&&!offert?`<div class="s2don"><b>Offert après ${SEUIL} cartes réussies en ${esc(GNOM[s.g])}</b><span class="bar" style="--p:${(nb/SEUIL).toFixed(3)}"><i></i></span><small>${nb} / ${SEUIL}</small></div>`:""}</article>`}).join("");
    return `${chips()}<p class="s2note">Un pack = un skin, son dos de cartes et son cadre, moins cher que les trois achetés à part. Chaque pièce se vend aussi seule.</p><div class="s2packs">${cartes}</div>`}
  function secoue(b){buzz([8,60,8]);if(!reduce&&b.animate)b.animate([{transform:"translateX(0)"},{transform:"translateX(-5px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:260})}
  const manque=(b,pr)=>{secoue(b);toast(`<span class="tm">·</span><div><b>Pas assez de pièces</b><span>Il te manque ${fmtN(pr-coins())} pièces. 1 XP gagné = 1 pièce.</span></div>`)};
  function arme(d,b,k,pr){if(arme_(k)){etatUI.arme=null;return false}etatUI.arme={k,t:Date.now()};
    d.querySelectorAll(".buy").forEach(x=>{x.classList.remove("buy");if(x.dataset.lab)x.textContent=x.dataset.lab});b.dataset.lab=b.textContent;b.classList.add("buy");b.textContent="Acheter ? "+fmtN(pr);return true}
  function equipe(k,s,force){P.sk=Object.assign({},P.sk||{});
    if(k==="skn")P.sk.skn=force||P.sk.skn!==s.id?s.id:"";
    else if(k==="cad")P.sk.cad=force||P.sk.cad!==s.cad?s.cad:"";
    else{P.dos=force||P.dos!==s.dos?s.dos:"classique";document.body.dataset.dos=P.dos}
    saveP();try{lgPush()}catch(e){}try{paintMyAv()}catch(e){}}
  function maj(){try{renderLigue()}catch(e){}}
  function brancher(d){
    d.querySelectorAll("[data-s2f]").forEach(b=>b.onclick=()=>{etatUI.f=b.dataset.s2f;maj()});
    d.querySelectorAll("[data-s2vu]").forEach(b=>b.onclick=()=>{const s=skinOk(b.dataset.s2vu);if(!s)return;etatUI.vu=s.id;buzz(8);maj()});
    d.querySelectorAll("[data-s2porter]").forEach(b=>b.onclick=()=>{const s=skinOk(b.dataset.s2porter);if(!s||!a_moi("skn",s))return;equipe("skn",s);maj()});
    d.querySelectorAll("[data-s2perso]").forEach(b=>b.onclick=()=>{try{AVTAB="a"}catch(e){}go("profil");setTimeout(()=>{const t=document.querySelector('#avTabs [data-k="a"]');if(t&&!t.classList.contains("on"))t.click();const e=document.getElementById("avEd");if(e&&e.scrollIntoView)e.scrollIntoView({block:"center"})},60)});
    d.querySelectorAll("[data-s2pack]").forEach(b=>b.onclick=()=>{const s=skinOk(b.dataset.s2pack);if(!s)return;etatUI.f=s.g;LG.shop="packs";maj();setTimeout(()=>{const e=document.getElementById("s2p-"+s.id);if(e&&e.scrollIntoView)e.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"})},40)});
    d.querySelectorAll("[data-s2b]").forEach(b=>b.onclick=()=>{const [k,id]=b.dataset.s2b.split(":"),s=skinOk(id);if(!s||!["skn","dos","cad"].includes(k))return;
      if(a_moi(k,s)){equipe(k,s);maj();return}
      const o=it(k,s);if(coins()<o.xp){manque(b,o.xp);return}
      if(arme(d,b,k+":"+s.id,o.xp))return;
      if(!buyItem(o))return;buzz(18);equipe(k,s,true);
      toast(`<span class="tm">✓</span><div><b>${esc(o.nom)} est à toi</b><span>−${fmtN(o.xp)} pièces · il t’en reste ${fmtN(coins())}</span></div>`);maj()});
    d.querySelectorAll("[data-s2achat]").forEach(b=>b.onclick=()=>{const s=skinOk(b.dataset.s2achat);if(!s)return;const pr=prixPack(s);if(!pr)return;
      if(coins()<pr){manque(b,pr);return}
      if(arme(d,b,"pak:"+s.id,pr))return;
      P.own=P.own||{};P.buy=P.buy||{};const kk="pak:"+s.id;P.buy[kk]=(+P.buy[kk]||0)+pr;["skn","dos","cad"].forEach(k=>{P.own[it(k,s)._k]=1});saveP();
      buzz(18);["skn","dos","cad"].forEach(k=>equipe(k,s,true));
      toast(`<span class="tm">✓</span><div><b>Pack ${esc(s.nom)} à toi</b><span>Skin, dos et cadre équipés · −${fmtN(pr)} pièces</span></div>`);maj()})}
  P26ui.on("slot:boutique.rayon",el=>{const t=el.dataset.t;if(t!=="skins"&&t!=="packs")return;const d=P26ui.bloc(el,"skins");d.className="s2";d.innerHTML=t==="skins"?rayonSkins():rayonPacks();brancher(d)});

  /* ---------------- Adversaires : dos, avatar et skin des autres joueurs (Arène, Duel, Duel à distance) ---------------- */
  // Une personne : sa ligne de classement (LG.rows, par identifiant de compte) passe devant ce qu'elle annonce en direct (p2).
  function joueur(uid,pres,nick){const row=(typeof LG!=="undefined"&&Array.isArray(LG.rows)?LG.rows:[]).find(r=>r&&r.id===uid)||null;const x=pres&&pres.p2&&typeof pres.p2==="object"?pres.p2:{};
    const avk=avKOk(row&&row.avk)||(()=>{const k=avKOk(x.k);return k&&k.t!=="p"?k:null})();
    return {id:uid,nick:cleanNick(nick||(row&&row.nick)||"")||"?",avk,av:row&&typeof row.av==="string"?row.av:"",skn:skinOk(row&&row.skn)?row.skn:skinOk(x.s)?x.s:"",
      dos:dosOk(row&&row.dos&&row.dos!=="classique"?row.dos:x.d),cad:row&&typeof row.cad==="string"?row.cad:typeof x.c==="string"?x.c:""}}
  S2.joueur=joueur;
  const uidDe=peer=>{const m=/^([0-9a-f-]{36}):/.exec(String(peer||""));return m?m[1]:""};
  const dos1=(dos,cls)=>`<i class="dosv s2c${cls?" "+cls:""}" data-d="${dosOk(dos)}" aria-hidden="true"></i>`;
  function eventail(dos,n,max){n=Math.max(0,n|0);const v=Math.min(n,max||7);let o="";for(let i=0;i<v;i++){const r=v>1?(-18+36*i/(v-1)):0;o+=`<i class="dosv s2c" data-d="${dosOk(dos)}" style="--r:${r.toFixed(1)}deg;--i:${i}" aria-hidden="true"></i>`}
    return `<span class="s2fan" aria-label="${n} carte${n>1?"s":""} de dos">${o}${n>v?`<b>+${n-v}</b>`:""}</span>`}
  S2.eventail=eventail;
  function siege(j,carte,extra){const r={id:j.id,nick:j.nick,avk:j.avk,av:j.av,skn:j.skn,cad:j.cad};let av="";try{av=avHTML(r,"sm")}catch(e){}
    return `<div class="s2seat" data-uid="${esc(j.id)}">${av}<b class="s2n"></b>${carte||""}${extra||""}</div>`}
  function nommer(box,L){box.querySelectorAll(".s2seat .s2n").forEach((b,i)=>{if(L[i])b.textContent=L[i].nick})}
  const p2=()=>{const k=avK();return {d:dosOk(P.dos||"classique"),s:(monSkin()||{}).id||"",k:k&&k.t!=="p"?k:null,c:(P26ui._champs()||{}).cad||""}};
  // Ce que j'annonce en direct : mon dos, mon skin, mon Personnage (jamais la photo).
  P26ui.on("arene.pres",x=>{if(x&&typeof x==="object")x.p2=p2()});
  // Arène, hôte qui joue : il ne publie jamais sa réponse (maj8.js la garde chez lui). Pour que sa carte soit posée de dos chez les
  // autres, sa présence annonce seulement « hr » = numéro de la question à laquelle il a répondu (jamais le choix), -1 sinon.
  // Sa réponse juste ou fausse n'apparaît qu'à la révélation, par le tableau des scores qu'il publie alors (points de la question).
  const hrOk=()=>typeof AR!=="undefined"&&AR.host&&AR.myAns&&AR.myAns.i===AR.i&&(AR.ph==="q"||AR.ph==="rev")&&Number.isInteger(AR.i);
  P26ui.on("arene.pres",x=>{if(x&&typeof x==="object"&&typeof AR!=="undefined"&&AR.host)x.hr=hrOk()?AR.i:-1});
  const HRPUB=new WeakSet();
  P26ui.on("arene.rendu",()=>{try{if(!hrOk()||AR.ph!=="q"||!AR.lp||!Array.isArray(AR.qs))return;const Q=AR.qs[AR.i];if(!Q||typeof Q!=="object"||HRPUB.has(Q))return;
    HRPUB.add(Q);arPres(AR.lp).catch(()=>{})}catch(e){}},5);
  P26ui.on("duel.pres",x=>{if(x&&typeof x==="object")x.p2=p2()});

  /* Arène : la table des autres joueurs ; pendant une question, la carte d'un joueur qui a répondu est posée face cachée. */
  function areneTable(){const box=document.getElementById("duel");if(!box||typeof AR==="undefined"||!AR.g)return;
    const ph=AR.ph;let t=box.querySelector(".s2table");
    if(ph!=="q"&&ph!=="rev"){if(t)t.remove();return}
    const ps=arPlayers().filter(p=>!(p.isMe&&p.sameTab));
    const hp=AR.host?null:(typeof arClean==="function"?arClean(AR.hp||{}):{}),i=ph==="q"?(AR.cur?AR.cur.i:-1):(AR.host?AR.i:hp.i),ok=ph==="rev"?(AR.host?(AR.qs&&AR.qs[AR.i]?AR.qs[AR.i].ok:-1):hp.ok):-1;
    const L=ps.map(p=>{const j=joueur(uidDe(p.peer),p.presence,p.presence&&p.presence.nick);const a=p.presence&&p.presence.ans;
      const ah=!!(p.presence&&p.presence.ah),hr=ah&&Number.isInteger(p.presence.hr)&&p.presence.hr===i&&i>=0;   // hôte qui a répondu (sans dire quoi)
      const pid=AR.host?AR.pid:hp&&hp.pid;   // réponse de la partie en cours seulement (pas une réponse restée d'une partie précédente)
      const rep=(!ah&&a&&typeof a==="object"&&a.i===i&&a.p===pid)||hr;
      let c;if(ah&&!rep)c=`<span class="s2tag">hôte</span>`;
      else if(!rep)c=`<i class="s2c vide" aria-label="pas encore répondu"></i>`;
      else if(ph==="q")c=dos1(j.dos,"pose")+`<span class="s2tag">a répondu</span>`;
      else{const row=hr&&hp&&Array.isArray(hp.board)?hp.board.find(r=>r&&r.k==="h:"+p.peer):null;const g=hr?!!(row&&row.l>0):+a.c===ok;c=`<i class="s2c face ${g?"bon":"faux"}" aria-label="${g?"bonne réponse":"mauvaise réponse"}">${g?"✓":"✗"}</i>`}
      return {j,c}});
    if(!L.length){if(t)t.remove();return}
    const html=L.map(x=>siege(x.j,x.c)).join("");
    if(!t){t=document.createElement("div");t.className="s2table";t.setAttribute("aria-label","Les autres joueurs");const q=box.querySelector(".qcard");if(q)q.parentNode.insertBefore(t,q);else box.prepend(t)}
    if(t.dataset.h!==html){t.innerHTML=html;t.dataset.h=html;nommer(t,L.map(x=>x.j))}}
  // Lobby et podium : l'avatar (avec son skin) devant chaque pseudo.
  function areneAvatars(){const box=document.getElementById("duel");if(!box||typeof AR==="undefined"||!AR.g)return;
    const ps=arPlayers();box.querySelectorAll("[data-pk]").forEach(li=>{if(li.querySelector(".s2mini-av"))return;const pk=String(li.dataset.pk).replace(/^h:/,"");const p=ps.find(x=>x.peer===pk);if(!p)return;
      const j=joueur(uidDe(p.peer),p.presence,p.presence&&p.presence.nick);let av="";try{av=avHTML({id:j.id,nick:j.nick,avk:j.avk,av:j.av,skn:j.skn,me:p.isMe&&p.sameTab},"sm")}catch(e){}
      if(!av)return;const sp=document.createElement("span");sp.className="s2mini-av";sp.innerHTML=av;const cible=li.querySelector(".bn")||li;cible.insertBefore(sp,cible.firstChild)})}
  P26ui.on("arene.rendu",()=>{try{areneTable();areneAvatars()}catch(e){try{console.warn("[skins] arène",e)}catch(_){}}});
  P26ui.on("arene.pairs",()=>{try{areneTable()}catch(e){}});

  /* Duel en direct : la main de chaque adversaire, en éventail de dos (cartes restantes), et ses cartes déjà jouées. */
  function duelTable(fin){const box=document.getElementById("duel");if(!box||typeof OL==="undefined"||!OL.g||!OL.game)return;
    const N=OL.game.qs.length,ps=players().filter(p=>!(p.isMe&&p.sameTab)&&p.presence.epoch===OL.epoch);let t=box.querySelector(".s2table");
    if(!ps.length){if(t)t.remove();return}
    const L=ps.map(p=>{const j=joueur(uidDe(p.peer),p.presence,p.presence.nick);const qi=Math.max(0,Math.min(N,+p.presence.qi||0));
      return {j,c:fin||p.presence.done?eventail(j.dos,N,6)+`<span class="s2tag">${p.presence.done?"a fini":qi+" / "+N}</span>`:eventail(j.dos,N-qi,6)+(qi?`<span class="s2pile">${dos1(j.dos)}<b>${qi}</b></span>`:"")}});
    const html=L.map(x=>siege(x.j,x.c)).join("");
    if(!t){t=document.createElement("div");t.className="s2table";t.setAttribute("aria-label","Les cartes de tes adversaires");const a=box.querySelector("#board,.result");if(a)a.parentNode.insertBefore(t,fin?a.nextSibling:a);else box.prepend(t)}
    if(t.dataset.h!==html){t.innerHTML=html;t.dataset.h=html;nommer(t,L.map(x=>x.j))}}
  function duelSalle(){const box=document.getElementById("duel");if(!box||typeof OL==="undefined"||!OL.g)return;const ps=players();
    box.querySelectorAll(".olplayers li").forEach((li,i)=>{const p=ps[i];if(!p||li.querySelector(".s2mini-av"))return;const j=joueur(uidDe(p.peer),p.presence,p.presence.nick);let av="";
      try{av=avHTML({id:j.id,nick:j.nick,avk:j.avk,av:j.av,skn:j.skn,me:p.isMe&&p.sameTab},"sm")}catch(e){}if(!av)return;const sp=document.createElement("span");sp.className="s2mini-av";sp.innerHTML=av;li.insertBefore(sp,li.firstChild)})}
  P26ui.on("duel.plateau",()=>{try{duelTable(false)}catch(e){}});
  P26ui.on("duel.fin",()=>{try{duelTable(true)}catch(e){}});
  P26ui.on("duel.salle",()=>{try{duelSalle()}catch(e){}});

  /* Duel à distance : la main de l'ami en éventail de dos, pendant la partie et sur le résultat. */
  P26ui.on("duelx.rendu",o=>{try{if(!o||!o.el||!o.d)return;const d=o.d,uid=typeof d.adversaire==="string"&&/^[0-9a-f-]{36}$/.test(d.adversaire)?d.adversaire:"";
    const j=joueur(uid,null,d.pseudo),n=(d.qs||[]).length||10,fini=d.etat==="fini";
    const extra=o.phase==="jeu"?`<span class="s2tag">${esc(j.nick)} joue ${fini?"":"plus tard "}les mêmes ${n} cartes</span>`:fini&&d.son_score!=null?`<span class="s2tag">${Math.max(0,Math.floor((+d.son_score||0)/100))} / ${n}</span>`:`<span class="s2tag">${n} cartes</span>`;
    const t=document.createElement("div");t.className="s2table s2x";t.setAttribute("aria-label","La main de ton adversaire");t.innerHTML=siege(j,eventail(j.dos,n,7),extra);nommer(t,[j]);
    const old=o.el.querySelector(".s2table");if(old)old.remove();o.el.insertBefore(t,o.el.firstChild)}catch(e){}});

  dons(false);   // première visite après la mise à jour : un pack déjà mérité est offert, avec son message
  try{paintMyAv()}catch(e){}
  try{if(typeof view!=="undefined"&&view==="ligue")renderLigue()}catch(e){}
})();
P26mod.ok("skins");

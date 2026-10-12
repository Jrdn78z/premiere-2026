/* ================= Lot P3 : musique pour réviser avec Spotify =================
   Module préchargé (P26ui.precharger). Lecteur Spotify embarqué (cadre https://open.spotify.com/embed/…, seul cadre ajouté à la CSP
   avec YouTube). Rien n'est chargé depuis Spotify avant l'appui sur « Lancer » (ou l'ouverture d'une matière qui a sa playlist).
   Titres entiers si l'élève est connecté à Spotify dans son navigateur, sinon extraits : c'est Spotify qui décide dans son cadre.
   Aucun identifiant inventé : tout vient de liens collés par l'élève (titre, album, playlist, épisode), vérifiés par une
   expression stricte avant d'être transformés en lien embed. Ce que les autres publient (champ « mus » de la ligne de classement)
   est revérifié par la même expression à l'affichage ; rien n'est injecté dans le HTML sans esc().
   Pause : le cadre Spotify obéit aux messages postMessage {command:"pause"|"resume"|"toggle"} (ceux que l'API iFrame officielle
   de Spotify envoie elle-même), sans charger aucun script de Spotify : la CSP script-src ne change pas. Le lecteur se met en
   pause quand une question d'Arène, de Duel en direct ou de Bataille royale tombe, et quand le mode oral parle.
   État du compte : P.p1.mus (lien par matière), P.p1.musl (mon lien publié pour la ligue), P.p1.muslok (avertissement accepté).
   Vie privée : une playlist créée par l'élève montre le nom de son compte Spotify ; une phrase le dit près de « Publier » et le
   premier partage demande une confirmation. Dernier lien lancé : stockage local. */
(function(){
  "use strict";
  const M=window.P3M=window.P3M||{};
  const ORIG="https://open.spotify.com";
  // Lien collé : https://open.spotify.com/(intl-xx/)?(track|album|playlist|episode)/<22 caractères>, avec ou sans ?si=…
  const LIEN=/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{22})(?:[?#]\S*)?$/;
  // Forme gardée, publiée et acceptée des autres : jamais autre chose.
  const STRICT=/^https:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/[A-Za-z0-9]{22}$/;
  const TYPES={track:"Titre",album:"Album",playlist:"Playlist",episode:"Épisode"};
  const MAT=/^[a-z0-9_-]{1,24}$/;
  const has=(o,k)=>!!o&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
  const connecte=()=>typeof UID==="string"&&!!UID&&!(typeof GUEST!=="undefined"&&GUEST);
  function lien(t){t=String(t||"").trim();const m=LIEN.exec(t);if(!m)return null;return {type:m[1],id:m[2],url:ORIG+"/"+m[1]+"/"+m[2]}}
  const lienSur=u=>typeof u==="string"&&STRICT.test(u)?lien(u):null;
  M.lien=lien;M.STRICT=STRICT;
  const embed=l=>ORIG+"/embed/"+l.type+"/"+l.id+"?utm_source=generator";

  /* ---------------- État du compte ---------------- */
  function parMatiere(){const o=P26ui.etat("mus",{});if(!o||typeof o!=="object"||Array.isArray(o))P.p1.mus={};return P.p1.mus}
  function monLigue(){const v=P26ui.etat("musl","");return STRICT.test(v)?v:""}
  function propre(o){const r={};if(o&&typeof o==="object"&&!Array.isArray(o))for(const [k,v] of Object.entries(o)){if(MAT.test(k)&&STRICT.test(v)&&Object.keys(r).length<30)r[k]=v}return r}
  // Un lien changé ou retiré ici il y a moins de 2 min l'emporte sur la copie du serveur (sinon un envoi encore en route
  // ferait revenir une playlist qu'on vient de retirer) ; au-delà, on garde ce qui existe d'un côté ou de l'autre.
  let MODIF=0;const recent=()=>Date.now()-MODIF<120000;
  P26ui.fusion("mus",(l,d)=>recent()?propre(l):Object.assign(propre(d),propre(l)));
  P26ui.fusion("musl",(l,d)=>STRICT.test(l||"")?l:recent()?"":STRICT.test(d||"")?d:"");
  P26ui.fusion("muslok",(l,d)=>l===1||d===1?1:0);                  // avertissement vie privée déjà accepté sur un appareil
  function fixerMat(m,url){const o=parMatiere();if(url)o[m]=url;else delete o[m];MODIF=Date.now();saveP()}
  function publier(url){P26ui.etat("musl","");P.p1.musl=STRICT.test(url||"")?url:"";MODIF=Date.now();saveP();try{lgPush()}catch(e){}}
  P26ui.ligne(()=>({mus:monLigue()}));
  M.monLigue=monLigue;M.parMatiere=()=>Object.assign({},propre(parMatiere()));

  /* ---------------- Matières (celles qui ont du contenu) ---------------- */
  function matieres(){let L=[];try{if(typeof clsMats==="function"&&P.cls)L=clsMats(P.cls)}catch(e){}
    const CM=typeof C!=="undefined"&&C.M&&typeof C.M==="object"?C.M:{};if(!L.length)L=Object.keys(CM);
    return [...new Set(L)].filter(m=>typeof m==="string"&&MAT.test(m)&&has(CM,m))}
  const nomMat=m=>{try{const x=C.M[m];return x&&(x.nom||x.court)?String(x.nom||x.court):m}catch(e){return m}};

  /* ---------------- Lecteur ---------------- */
  let IF=null;
  M.etat={ouvert:null,pret:false,pause:null,dernierOrdre:null};
  function ordre(cmd){if(!IF||!IF.contentWindow)return false;try{IF.contentWindow.postMessage({command:cmd},ORIG)}catch(e){return false}
    M.etat.dernierOrdre={cmd,t:Date.now()};return true}
  M.ordre=ordre;
  function majBouton(){const b=document.querySelector("#p3Mus [data-p3mp]");if(!b)return;const p=M.etat.pause===true;
    b.textContent=p?"▶":"❚❚";b.setAttribute("aria-label",p?"Reprendre la musique":"Mettre la musique en pause")}
  function pause(raison){if(!IF)return false;const ok=ordre("pause");if(ok){M.etat.pause=true;M.etat.raison=raison||"";majBouton()}return ok}
  M.pause=pause;
  addEventListener("message",e=>{if(e.origin!==ORIG||!IF||e.source!==IF.contentWindow)return;const d=e.data;if(!d||typeof d!=="object")return;
    if(d.type==="ready"){M.etat.pret=true;ordre("load_complete_ack")}
    if(d.type==="playback_update"&&d.payload&&typeof d.payload==="object"){M.etat.pause=!!d.payload.isPaused;majBouton()}});
  function fermer(){const d=document.getElementById("p3Mus");if(d)d.remove();IF=null;M.etat.ouvert=null;M.etat.pret=false;M.etat.pause=null;veille(false)}
  M.fermer=fermer;
  // src : "main" (bouton Lancer), "mat" (playlist de la matière), "ligue" (playlist d'un ami)
  function ouvrir(l,src){if(!l||!STRICT.test(l.url))return false;if(IF&&M.etat.ouvert&&M.etat.ouvert.url===l.url)return true;fermer();
    try{if(window.P2SA&&typeof P2SA.ytFermer==="function")P2SA.ytFermer()}catch(e){}
    const d=document.createElement("div");d.id="p3Mus";d.className="p3m";d.setAttribute("role","region");d.setAttribute("aria-label","Lecteur Spotify");
    d.innerHTML=`<div class="p3mh"><b>Musique</b><span class="p3mt">${esc(TYPES[l.type]||"")}</span>
      <button type="button" class="p3mb" data-p3mp aria-label="Mettre la musique en pause">❚❚</button>
      <button type="button" class="p3mb" data-p3mr aria-label="Réduire le lecteur" aria-pressed="false">–</button>
      <button type="button" class="p3mb" data-p3mx aria-label="Fermer le lecteur">×</button></div>`;
    const f=document.createElement("iframe");f.src=embed(l);f.title="Lecteur Spotify";f.width="100%";f.height="152";
    f.setAttribute("allow","autoplay; clipboard-write; encrypted-media; picture-in-picture");f.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
    f.setAttribute("sandbox","allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation");f.setAttribute("loading","lazy");
    d.appendChild(f);document.body.appendChild(d);IF=f;M.etat.ouvert={url:l.url,type:l.type,src:src||"main"};M.etat.pret=false;M.etat.pause=null;
    d.querySelector("[data-p3mx]").onclick=fermer;
    d.querySelector("[data-p3mp]").onclick=()=>{if(M.etat.pause===true){if(ordre("resume")){M.etat.pause=false;majBouton()}}else pause("bouton")};
    d.querySelector("[data-p3mr]").onclick=e=>{const p=d.classList.toggle("petit");e.currentTarget.setAttribute("aria-pressed",String(p));e.currentTarget.setAttribute("aria-label",p?"Agrandir le lecteur":"Réduire le lecteur");e.currentTarget.textContent=p?"+":"–"};
    try{LS.set("p3_mus",l.url)}catch(e){}veille(true);return true}
  M.ouvrir=(u,src)=>ouvrir(lien(u),src);

  /* ---------------- Pause automatique ---------------- */
  P26ui.on("arene.rendu",d=>{if(d&&d.ph==="q")pause("arene")});
  P26ui.on("duel.plateau",()=>pause("duel"));
  // Bataille royale (seul contre des Bots, ou entre amis) : chaque question redessine la vue du module (enfants directs de #modv).
  // On n'observe que ces enfants directs (pas tout l'arbre), et seulement tant que le lecteur est ouvert.
  function veille(on){if(!on){if(M.mo){M.mo.disconnect();M.mo=null}return}if(M.mo)return;const box=document.getElementById("modv");if(!box)return;
    M.mo=new MutationObserver(()=>{const v=box.dataset.vue;if(v!=="royale"&&v!=="royale-amis"){M.cleQ="";return}
      const opts=box.querySelectorAll(".j2br .opt:not([disabled])");if(!opts.length){M.cleQ="";return}
      let cle=v+":";for(const b of opts)cle+=b.textContent.slice(0,40)+"|";if(cle===M.cleQ)return;M.cleQ=cle;pause("royale")});
    M.mo.observe(box,{childList:true})}
  // Mode oral : la carte est lue à voix haute, la musique se tait.
  const oral=()=>typeof ORAL!=="undefined"&&!!ORAL&&ORAL.on===true;
  P26ui.on("carte",()=>{if(oral())pause("oral")});
  const bo=document.getElementById("bOral");if(bo)bo.addEventListener("click",()=>setTimeout(()=>{if(oral())pause("oral")},0));

  /* ---------------- Playlist de la matière : s'ouvre quand on la révise (après un premier geste sur la page) ---------------- */
  P26ui.on("carte",x=>{try{const c=x&&x.cur;if(!c||oral())return;const meta=typeof metaOf==="function"?metaOf(c):null;const m=meta&&meta.ch&&meta.ch.mat;
    const url=m&&propre(parMatiere())[m];if(!url)return;
    if(IF&&M.etat.ouvert){if(M.etat.ouvert.url===url||M.etat.ouvert.src!=="mat")return}
    else{const u=navigator.userActivation;if(!u||!u.hasBeenActive)return}      // jamais de lecture sans un geste de l'élève sur la page
    ouvrir(lien(url),"mat")}catch(e){}});

  /* ---------------- Profil, réglages : lancer un lien, playlists par matière, playlist publiée ---------------- */
  function blocReglages(d){let der="";try{der=LS.get("p3_mus","")}catch(e){}der=STRICT.test(der)?der:"";
    const mats=matieres(),o=propre(parMatiere()),pub=monLigue();
    d.innerHTML=`<b>Spotify</b><p class="p1note">Colle un lien Spotify (titre, album, playlist ou épisode). Le lecteur se charge seulement quand tu appuies sur Lancer et reste ouvert d’une page à l’autre. Titres entiers si tu es connecté à Spotify dans ton navigateur, sinon des extraits.</p>
      <div class="sa-ytf"><label class="lab" for="p3MusIn">Lien Spotify</label><input id="p3MusIn" class="inp" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/playlist/…" value="${esc(der)}">
      <button class="btn ghost" type="button" id="p3MusGo">Lancer</button></div><p class="p3merr" role="status"></p>
      ${mats.length?`<b class="p3mh2">Mes playlists par matière</b><p class="p1note">Associe un lien à chaque matière : le bon lecteur s’ouvre quand tu révises cette matière.</p>
      <ul class="p3mats">${mats.map(m=>`<li><label class="lab" for="p3m-${esc(m)}">${esc(nomMat(m))}</label><div class="p3mrow"><input id="p3m-${esc(m)}" class="inp" inputmode="url" autocomplete="off" placeholder="Lien Spotify" value="${esc(o[m]||"")}" data-p3mat="${esc(m)}"><button type="button" class="s2mini" data-p3save="${esc(m)}" aria-label="Enregistrer le lien pour ${esc(nomMat(m))}">OK</button></div></li>`).join("")}</ul>`:""}
      ${connecte()?`<b class="p3mh2">Ma playlist pour la ligue</b><p class="p1note">Un seul lien, visible par les membres de la ligue dans l’onglet Ligue.</p>
      <p class="p3mpriv">Attention : Spotify affiche le nom du compte qui a créé la playlist (souvent un vrai nom). Partage plutôt une playlist créée par Spotify ou par un compte sans ton nom.</p>
      <div class="sa-ytf"><label class="lab" for="p3MusPub">Lien publié</label><input id="p3MusPub" class="inp" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/playlist/…" value="${esc(pub)}">
      <button class="btn ghost" type="button" id="p3MusPubGo">${pub?"Modifier":"Publier"}</button></div>
      <div class="p3mconf" role="alertdialog" aria-labelledby="p3MusConfT" hidden><p id="p3MusConfT"><b>Publier cette playlist ?</b> Les membres de la ligue verront le lien et, en l’ouvrant, le nom du compte Spotify qui l’a créée. Vérifie que ce n’est pas ton vrai nom.</p>
      <div class="p3mconfb"><button class="btn light" type="button" id="p3MusConfOui">Oui, publier</button><button class="btn ghost" type="button" id="p3MusConfNon">Annuler</button></div></div>
      ${pub?`<button class="linkbtn" type="button" id="p3MusPubX">Retirer ma playlist</button>`:""}`:""}`;
    const i=d.querySelector("#p3MusIn"),e=d.querySelector(".p3merr");
    d.querySelector("#p3MusGo").onclick=()=>{const l=lien(i.value);if(!l){e.textContent="Ce lien n’est pas un lien Spotify (titre, album, playlist ou épisode).";return}e.textContent="";i.value=l.url;ouvrir(l,"main")};
    d.querySelectorAll("[data-p3save]").forEach(b=>b.onclick=()=>{const m=b.dataset.p3save,inp=d.querySelector(`[data-p3mat="${m}"]`);if(!inp||!MAT.test(m))return;const v=inp.value.trim();
      if(!v){fixerMat(m,"");b.textContent="Retiré";toast(`<span class="tm">♪</span><div><b>Playlist retirée</b><span>${esc(nomMat(m))}</span></div>`);return}
      const l=lien(v);if(!l){e.textContent="Ce lien n’est pas un lien Spotify (titre, album, playlist ou épisode).";inp.focus();return}
      e.textContent="";inp.value=l.url;fixerMat(m,l.url);b.textContent="Gardé";buzz(8);toast(`<span class="tm">♪</span><div><b>Playlist de ${esc(nomMat(m))} gardée</b><span>Elle s’ouvrira quand tu réviseras cette matière.</span></div>`)});
    const pg=d.querySelector("#p3MusPubGo"),pi=d.querySelector("#p3MusPub"),cf=d.querySelector(".p3mconf");
    const go=l=>{e.textContent="";publier(l.url);pi.value=l.url;buzz(8);toast(`<span class="tm">♪</span><div><b>Playlist publiée</b><span>Les membres de la ligue la voient dans l’onglet Ligue.</span></div>`);blocReglages(d)};
    if(pg)pg.onclick=()=>{const l=lien(pi.value);if(!l){e.textContent="Ce lien n’est pas un lien Spotify (titre, album, playlist ou épisode).";pi.focus();return}
      if(P26ui.etat("muslok",0)===1){go(l);return}                         // déjà confirmé une fois sur ce compte
      e.textContent="";cf.hidden=false;pg.disabled=true;const oui=d.querySelector("#p3MusConfOui");oui.focus();
      oui.onclick=()=>{P.p1.muslok=1;saveP();go(l)};d.querySelector("#p3MusConfNon").onclick=()=>{cf.hidden=true;pg.disabled=false;pg.focus()}};
    const px=d.querySelector("#p3MusPubX");if(px)px.onclick=()=>{publier("");blocReglages(d)}}
  P26ui.on("slot:profil.reglages",el=>{const d=P26ui.bloc(el,"musique");d.className="sa-ytr p3mr";blocReglages(d)},71);

  /* ---------------- Ligue : la playlist de chaque membre, revérifiée ---------------- */
  const rows=()=>(typeof LG!=="undefined"&&Array.isArray(LG.rows)?LG.rows:[]);
  function listeLigue(){const out=[];for(const r of rows()){if(!r||typeof r.id!=="string"||!r.nick)continue;const moi=typeof UID==="string"&&r.id===UID;
      const l=lienSur(moi?monLigue():r.mus);if(!l)continue;out.push({id:r.id,nick:cleanNick(r.nick)||"?",moi,l})}
    return out.sort((a,b)=>a.moi?-1:b.moi?1:a.nick.localeCompare(b.nick)).slice(0,60)}
  M.listeLigue=()=>listeLigue().map(x=>({id:x.id,nick:x.nick,url:x.l.url,type:x.l.type}));
  P26ui.on("slot:ligue.haut",el=>{if(!connecte())return;const L=listeLigue(),d=P26ui.bloc(el,"musique");d.className="p3ml";
    const cour=IF&&M.etat.ouvert?M.etat.ouvert.url:"";
    d.innerHTML=`<div class="p3mlh"><b>Playlist de la ligue</b><span>${L.length?L.length+" lien"+(L.length>1?"s":""):"Spotify"}</span></div>
      ${L.length?`<ul class="p3mll" aria-label="Playlists des membres">${L.map(x=>`<li${x.moi?' class="moi"':""}><span class="p3mln"></span><small>${esc(TYPES[x.l.type]||"")}</small>
        <button type="button" class="s2mini${cour===x.l.url?" on":""}" data-p3ecoute="${esc(x.l.url)}" aria-label="Écouter ${x.moi?"ta playlist":"la playlist de "+esc(x.nick)}">${cour===x.l.url?"En cours":"Écouter"}</button></li>`).join("")}</ul>`
        :`<p class="p1note">Personne n’a encore publié de lien. Publie le tien dans ton profil, rubrique Affichage.</p>`}
      ${monLigue()?"":`<p class="p1note p3mlnote">Chaque membre peut publier un lien Spotify : profil, rubrique Affichage.</p>`}`;
    d.querySelectorAll(".p3mln").forEach((s,i)=>{s.textContent=L[i].moi?"Toi":L[i].nick});
    d.querySelectorAll("[data-p3ecoute]").forEach(b=>b.onclick=()=>{const l=lienSur(b.dataset.p3ecoute);if(!l)return;buzz(8);ouvrir(l,"ligue");
      d.querySelectorAll("[data-p3ecoute]").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.textContent=on?"En cours":"Écouter"})})},60);
})();
P26mod.ok("musique");

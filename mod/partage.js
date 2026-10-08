/* Paquet 1, Entre amis (T5) : partage d'un podium en image (canvas 1080 x 1350, PNG).
   P26ui.podiumImage({titre, lignes:[{nick,score}]}) -> Promise<Blob> ; P26ui.partagePodium(o, st) -> "partage" | "telecharge" | false.
   Pseudos dessinés par fillText (jamais de HTML), aucune image d'un autre domaine. Plan §3.4 c. */
(function(){
  "use strict";
  const propre=o=>{o=o&&typeof o==="object"?o:{};
    const titre=String(o.titre==null?"Podium":o.titre).replace(/[\u0000-\u001f]/g,"").slice(0,40)||"Podium";
    const lignes=(Array.isArray(o.lignes)?o.lignes:[]).slice(0,3).map(l=>{l=l&&typeof l==="object"?l:{};const n=Math.round(+l.score);
      return {nick:String(l.nick==null?"?":l.nick).replace(/[\u0000-\u001f]/g,"").slice(0,16)||"?",score:Number.isFinite(n)?Math.max(0,Math.min(n,1e7)):0}});
    return {titre,lignes}};
  const nombre=n=>{try{return fmtN(n)}catch(e){return String(n)}};
  async function image(o){const {titre,lignes}=propre(o);
    try{if(document.fonts)await Promise.all([document.fonts.load('900 120px "Bodoni Moda"'),document.fonts.load('800 40px Figtree')]).catch(()=>{})}catch(e){}
    const W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
    const bg=g.createRadialGradient(W/2,0,60,W/2,H*.35,H);bg.addColorStop(0,"#2A6B52");bg.addColorStop(.5,"#1B4A38");bg.addColorStop(1,"#0E2A1E");g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.fillStyle="#E7C66B";g.fillRect(0,0,W,18);g.fillRect(0,H-18,W,18);
    g.textAlign="center";g.fillStyle="#EAF3EE";g.font='900 72px "Bodoni Moda", Georgia, serif';g.fillText("1re 2026",W/2,130);
    g.fillStyle="rgba(234,243,238,.8)";g.font='800 52px Figtree, sans-serif';g.fillText(titre,W/2,220);
    // Podium : 2e à gauche, 1er au centre, 3e à droite
    const place=[{i:1,x:W/2-330,h:300,c:"#C9D1D6"},{i:0,x:W/2,h:420,c:"#E7C66B"},{i:2,x:W/2+330,h:220,c:"#C98B57"}],base=1080;
    for(const p of place){const l=lignes[p.i];if(!l)continue;
      g.fillStyle=p.c;g.fillRect(p.x-150,base-p.h,300,p.h);
      g.fillStyle="#1A1C1E";g.font='900 120px "Bodoni Moda", Georgia, serif';g.fillText(String(p.i+1),p.x,base-p.h+140);
      g.fillStyle="#EAF3EE";g.font='800 46px Figtree, sans-serif';g.fillText(l.nick,p.x,base-p.h-90,300);
      g.fillStyle="rgba(234,243,238,.85)";g.font='700 38px Figtree, sans-serif';g.fillText(nombre(l.score),p.x,base-p.h-36,300)}
    let date="";try{date=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}catch(e){}
    g.fillStyle="rgba(234,243,238,.75)";g.font='600 38px Figtree, sans-serif';g.fillText(date,W/2,1180);
    return await new Promise((ok,ko)=>cv.toBlob(b=>b?ok(b):ko(new Error("image")),"image/png"))}
  P26ui.podiumImage=image;
  P26ui.partagePodium=async(o,st)=>{const dit=(t,err)=>{if(st){st.className="istat"+(err?" err":"");st.textContent=t}};
    try{const blob=await image(o);const name="Premiere-2026-podium.png";
      if(navigator.canShare&&navigator.share){try{const f=new File([blob],name,{type:"image/png"});
        if(navigator.canShare({files:[f]})){await navigator.share({files:[f],text:"Notre podium sur Première 2026"});dit("Partagé.");return "partage"}}
        catch(e){if(e&&e.name==="AbortError"){dit("");return false}}}
      return (await dlSave(name,blob,st))?"telecharge":false}
    catch(e){dit("L’image n’a pas pu être préparée.",true);return false}};
})();
P26mod.ok("partage");

/* ==========================================================================
   js/io/dxf-export.js
   DXF eksport

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= export =================
// File delivery is explicit: starting a download is not proof it reached disk.
let deliveryInFlight=null;
function downloadFile(content,filename,mime,textFallback=null){
 if(deliveryInFlight)return Promise.resolve(false);
 if(window.desktop?.exportFile){
  deliveryInFlight=(async()=>{try{
   const data=content instanceof Blob?new Uint8Array(await content.arrayBuffer()):content;
   return !!(await window.desktop.exportFile(data,filename));
  }catch(e){alert('Eksport saqlanmadi: '+e.message);return false;}finally{deliveryInFlight=null;}})();
  return deliveryInFlight;
 }
 const dialog=document.getElementById('fileDeliveryDialog'),link=document.getElementById('fileDeliveryLink'),status=document.getElementById('fileDeliveryStatus'),text=document.getElementById('fileDeliveryText');
 let url;try{url=URL.createObjectURL(new Blob([content],{type:mime}));}catch(e){alert('Fayl tayyorlanmadi: '+e.message);return Promise.resolve(false);}
 link.href=url;link.download=filename;link.textContent=filename+' — yuklab olish';text.value=typeof content==='string'?content:(textFallback||'');document.getElementById('fileDeliveryTextWrap').hidden=!text.value;
 status.textContent='Havolani bosing. Fayl Downloads / Yuklamalar papkasida paydo bo‘lgach “Fayl saqlandi” ni bosing.';
 const confirm=document.getElementById('fileDeliveryConfirm'),cancel=document.getElementById('fileDeliveryCancel');
 dialog.showModal();
 deliveryInFlight=new Promise(resolve=>{
  const finish=ok=>{confirm.removeEventListener('click',yes);cancel.removeEventListener('click',no);dialog.removeEventListener('cancel',escape);dialog.close();link.removeAttribute('href');URL.revokeObjectURL(url);deliveryInFlight=null;resolve(ok);};
  const yes=()=>finish(true),no=()=>finish(false),escape=e=>{e.preventDefault();finish(false);};confirm.addEventListener('click',yes);cancel.addEventListener('click',no);dialog.addEventListener('cancel',escape);
 });
 return deliveryInFlight;
}
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const dxf = buildDXF();
  if(!dxf || (dxf.indexOf('POLYLINE')===-1 && dxf.indexOf('\nCIRCLE\n')===-1 && dxf.indexOf('\nARC\n')===-1)){
    alert('Chizmada eksport qilinadigan geometriya yo\'q. Avval biror shakl chizing yoki DXF import qiling.');
    return;
  }
  downloadFile(dxf, 'edited.dxf', 'application/dxf');
});
document.getElementById('exportSvgBtn').addEventListener('click', ()=>{
  // gather every polyline (imported + drawn) into SVG paths, in world coords
  const allPaths=[];
  buildModifiedPaths().forEach(nodes=>{ if(nodes&&nodes.length) allPaths.push({pts:nodes, closed:!!nodes.closed}); });
  const drawnMod = buildDrawnModifiedPaths();
  drawnLines.forEach((line,idx)=>{
    const isSmooth = line.kind==='circle' || line.kind==='arc' || (!line.kind && line.center);
    if(isSmooth){ allPaths.push({pts:line.points, closed:!!line.closed}); }
    else if(drawnMod[idx]){ allPaths.push({pts:drawnMod[idx], closed:!!drawnMod[idx].closed}); }
  });
  if(!allPaths.length){ alert('Eksport qilinadigan chizma yo\'q.'); return; }
  // bounds
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  allPaths.forEach(p=>p.pts.forEach(pt=>{ minX=Math.min(minX,pt.x);minY=Math.min(minY,pt.y);maxX=Math.max(maxX,pt.x);maxY=Math.max(maxY,pt.y); }));
  const pad=(maxX-minX+maxY-minY)*0.02+5;
  minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;
  const w=maxX-minX, h=maxY-minY;
  // SVG y grows downward, world y grows upward → flip y
  let body='';
  allPaths.forEach(p=>{
    let d='';
    p.pts.forEach((pt,i)=>{ d += (i===0?'M':'L')+pt.x.toFixed(3)+' '+(maxY-(pt.y-minY)+minY).toFixed(3)+' '; });
    if(p.closed) d+='Z';
    body += '<path d="'+d+'" fill="none" stroke="black" stroke-width="'+(Math.max(w,h)/400).toFixed(3)+'"/>\n';
  });
  const svg='<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+minX.toFixed(2)+' '+minY.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+'" width="'+w.toFixed(0)+'mm" height="'+h.toFixed(0)+'mm">\n'+body+'</svg>';
  downloadFile(svg, 'drawing.svg', 'image/svg+xml');
});
// Emit one old-style POLYLINE entity (R12/AC1009). R12 uses POLYLINE + VERTEX +
// SEQEND rather than LWPOLYLINE, and needs no handles or subclass markers, which
// is exactly why strict importers (3ds Max, AutoCAD) accept it reliably.
function hexToAci(hex){
  const found = COLOR_PALETTE.find(c=>c.hex.toLowerCase()===(hex||'').toLowerCase());
  return found ? found.aci : 7; // default white
}
function polylineR12(verts, closed, layer, aci){
  let s = '0\nPOLYLINE\n8\n'+layer+'\n';
  if(aci!=null){ s += '62\n'+aci+'\n'; } // entity color (AutoCAD Color Index)
  s += '66\n1\n70\n'+(closed?1:0)+'\n';
  verts.forEach(v=>{
    s += '0\nVERTEX\n8\n'+layer+'\n10\n'+v.x+'\n20\n'+v.y+'\n30\n0\n';
    if(Math.abs(v.bulge||0)>1e-12){ s += '42\n'+v.bulge+'\n'; }
  });
  s += '0\nSEQEND\n8\n'+layer+'\n';
  return s;
}
function nodesToLWPolylineDXF(nodes, layer, aci){
  if(!nodes || !nodes.length) return '';
  const n = nodes.length;
  const closed = !!nodes.closed;
  const verts = [];
  for(let i=0;i<n;i++){
    const cur = nodes[i];
    let bulge = 0;
    if(closed || i<n-1){
      const nxt = nodes[(i+1)%n];
      if(nxt && nxt.arc){
        bulge = nxt.arc.ccw ? Math.tan(nxt.arc.sweep/4) : -Math.tan(nxt.arc.sweep/4);
      }
    }
    verts.push({x:cur.x, y:cur.y, bulge});
  }
  return polylineR12(verts, closed, layer, aci);
}
function buildDXF(){
  // Rock-solid AutoCAD R12 (AC1009) DXF. This is the most universally accepted
  // DXF flavor — 3ds Max, AutoCAD, Blender, Fusion, etc. all read it, because it
  // needs no object handles, no subclass markers, and no extended dictionaries.
  let s = '';
  // ---- HEADER ----
  s += '0\nSECTION\n2\nHEADER\n';
  s += '9\n$ACADVER\n1\nAC1009\n';   // R12
  s += '9\n$INSUNITS\n70\n4\n';      // 4 = millimeters
  s += '9\n$MEASUREMENT\n70\n1\n';   // 1 = metric
  s += '0\nENDSEC\n';
  // ---- TABLES: write every layer we use ----
  const dxfLayerName = ly => (ly.name||ly.id).replace(/[^A-Za-z0-9_]/g,'_').slice(0,31) || ly.id;
  s += '0\nSECTION\n2\nTABLES\n';
  s += '0\nTABLE\n2\nLAYER\n70\n'+(layers.length+1)+'\n';
  s += '0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n'; // layer 0 always present
  layers.forEach(ly=>{
    s += '0\nLAYER\n2\n'+dxfLayerName(ly)+'\n70\n0\n62\n'+(ly.aci||7)+'\n6\nCONTINUOUS\n';
  });
  s += '0\nENDTAB\n';
  s += '0\nENDSEC\n';
  // ---- ENTITIES ----
  s += '0\nSECTION\n2\nENTITIES\n';
  buildModifiedPaths().forEach(nodes=>{ s += nodesToLWPolylineDXF(nodes, '0'); });
  const drawnModified = buildDrawnModifiedPaths();
  drawnLines.forEach((line,idx)=>{
    const ly = layerOf(line);
    const layerName = dxfLayerName(ly);
    const aci = hexToAci(shapeColor(line));
    // Native CIRCLE — exact, one entity, no facets
    if(line.kind==='circle' && line.center && line.radius>0){
      s += '0\nCIRCLE\n8\n'+layerName+'\n62\n'+aci+'\n10\n'+line.center.x+'\n20\n'+line.center.y+'\n30\n0\n40\n'+line.radius+'\n';
      return;
    }
    // Native ARC — DXF arcs always run counter-clockwise from start to end
    if(line.kind==='arc' && line.arcA && line.arcMid && line.arcB){
      const ai = segArcInfo({t:'A', a:line.arcA, m:line.arcMid, b:line.arcB});
      if(ai){
        const degOf = p => { let d=Math.atan2(p.y-ai.cy, p.x-ai.cx)*180/Math.PI; return d<0?d+360:d; };
        const sA = ai.ccw ? degOf(line.arcA) : degOf(line.arcB);
        const eA = ai.ccw ? degOf(line.arcB) : degOf(line.arcA);
        s += '0\nARC\n8\n'+layerName+'\n62\n'+aci+'\n10\n'+ai.cx+'\n20\n'+ai.cy+'\n30\n0\n40\n'+ai.r+'\n50\n'+sA+'\n51\n'+eA+'\n';
        return;
      }
    }
    const nodes = drawnModified[idx];
    if(nodes) s += nodesToLWPolylineDXF(nodes, layerName, aci);
  });
  // ---- matn annotatsiyalari → DXF TEXT ----
  // R12 TEXT: 10/20 = boshlanish nuqtasi, 40 = balandlik, 50 = burilish,
  // 1 = matn. Ko'p qatorli matn har qatori alohida TEXT bo'lib yoziladi,
  // chunki R12 da MTEXT yo'q.
  if(typeof texts!=='undefined' && texts.length){
    texts.forEach(t=>{
      const ly = (typeof layerOf==='function') ? layerOf(t) : {id:'0', name:'0', aci:7};
      if(ly.visible===false) return;
      const layerName = dxfLayerName(ly);
      const aci = hexToAci(t.color || ly.color || '#ffffff');
      const H = t.size || 10;
      const rot = t.rot || 0;
      const lineH = H * (typeof TEXT_LINE_H!=='undefined' ? TEXT_LINE_H : 1.35);
      const a = rot*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
      String(t.text||'').split('\n').forEach((L,i)=>{
        if(!L) return;
        // har qator burilish yo'nalishiga perpendikulyar ravishda pastga suriladi
        const off = -lineH*i;
        const x = t.x - off*sa;
        const y = t.y + off*ca;
        s += '0\nTEXT\n8\n'+layerName+'\n62\n'+aci+
             '\n10\n'+x+'\n20\n'+y+'\n30\n0\n40\n'+H+
             '\n50\n'+rot+'\n1\n'+L.replace(/\n/g,' ')+'\n';
      });
    });
  }
  s += '0\nENDSEC\n0\nEOF\n';
  return s;
}

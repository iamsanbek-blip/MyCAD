/* ==========================================================================
   js/model/shapes.js
   Shakl yo'llarini qayta qurish (reliefni qo'llash, node/bulge)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= build modified paths =================
// each polygon -> array of nodes {x,y}; nodes[i] connects to nodes[i+1] via
// either a straight line (arc:null) or an arc (arc:{cx,cy,r,ccw,sweep})
function buildShapeNodes(pts, closed, source, pi){
  const n = pts.length;
  const nodes = [];
  // ---- PASS 1: how far would each corner cut into its two walls? ----
  // (needed because two adjacent corners share a wall; if their cuts overlap
  //  the wall gets "torn", so we must check the pair, not each corner alone)
  const trimOf = new Array(n).fill(0);
  for(let vi=0; vi<n; vi++){
    const c = corners.find(cc=>cc.source===source && cc.pi===pi && cc.vi===vi);
    if(!c || c.mode==='ignore') continue;
    const r=c.size, cosH=Math.cos(c.theta/2), sinH=Math.sin(c.theta/2);
    const Dbase=r/sinH;
    let t=0;
    if(c.mode==='fillet'){
      const ext=Math.max(-Dbase, Math.min(c.offset||0, Dbase));
      t = ext*cosH + Math.sqrt(Math.max(0, r*r - ext*ext*sinH*sinH));
    } else if(c.mode==='chamfer'){
      t = r/Math.tan(c.theta/2) + (c.offset||0);
    } else if(c.mode==='dogbone'){
      const ext=Math.max(-r, Math.min(c.offset||0, Dbase));
      t = -ext*cosH + Math.sqrt(Math.max(0, r*r - ext*ext*sinH*sinH));
    } else if(c.mode==='tbone'){
      t = (c.size + (c.offset||0)) + c.size; // reaches this far along the chosen wall
    }
    trimOf[vi] = isFinite(t) ? Math.max(0,t) : 0;
  }
  // ---- PASS 2: reject corners whose cut would collide on a shared wall ----
  const skip = new Array(n).fill(false);
  const lim = closed ? n : n-1;
  for(let i=0;i<lim;i++){
    const a=pts[i], b=pts[(i+1)%n];
    const L=Math.hypot(b.x-a.x, b.y-a.y);
    const need = trimOf[i] + trimOf[(i+1)%n];
    if(need > L*0.98){
      // this wall can't host both reliefs — drop the one that overruns most
      if(trimOf[i] >= trimOf[(i+1)%n]) skip[i]=true; else skip[(i+1)%n]=true;
    }
  }
  // an open shape's first/last vertices have only one wall — still guard them
  if(!closed){ if(trimOf[0] > 0 && n>1){ const L=Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y); if(trimOf[0] > L*0.98) skip[0]=true; } }
  for(let vi=0; vi<n; vi++){
    const c = corners.find(cc=>cc.source===source && cc.pi===pi && cc.vi===vi);
    const C = {x:pts[vi].x, y:pts[vi].y};
    if(!c || c.mode==='ignore' || skip[vi]){
      nodes.push({x:C.x, y:C.y, arc:null});
      continue;
    }
    const r = c.size;
    const cosH = Math.cos(c.theta/2), sinH = Math.sin(c.theta/2);
    const Dbase = r/sinH; // distance at which the circle is exactly tangent to both walls
    const wallLimit = Math.min(c.e1Len||Infinity, c.e2Len||Infinity) * 0.98;
    if(c.mode==='fillet'){
      // ext can go negative too: this flips the circle's center to the
      // OPPOSITE side of the corner (same side dogbone uses), letting a
      // fillet be applied outward instead of inward when a shape's winding
      // direction makes the default side look wrong for a given corner.
      const ext = Math.max(-Dbase, Math.min(c.offset||0, Dbase));
      const O = add(C, scl(c.bis, ext));
      const disc = Math.max(0, r*r - ext*ext*sinH*sinH);
      const t = ext*cosH + Math.sqrt(disc); // exact intersection of wall-line with circle
      if(t > wallLimit){ nodes.push({x:C.x,y:C.y,arc:null}); continue; } // too big → skip (avoid overlap artifact)
      const T1 = add(C, scl(c.e1, t));
      const T2 = add(C, scl(c.e2, t));
      const dir = pickDirection(O,T1,T2, Math.PI - c.theta);
      nodes.push({x:T1.x,y:T1.y, arc:null});
      nodes.push({x:T2.x,y:T2.y, arc:{cx:O.x,cy:O.y,r,ccw:dir.ccw,sweep:dir.sweep}, from:T1});
    } else if(c.mode==='chamfer'){
      const chTrim = r/Math.tan(c.theta/2) + (c.offset||0);
      if(chTrim > wallLimit || chTrim<=0){ nodes.push({x:C.x,y:C.y,arc:null}); continue; }
      const T1 = add(C, scl(c.e1, chTrim));
      const T2 = add(C, scl(c.e2, chTrim));
      nodes.push({x:T1.x,y:T1.y, arc:null});
      nodes.push({x:T2.x,y:T2.y, arc:null});
    } else if(c.mode==='dogbone'){
      // "Extension" (c.offset) = how far the circle's center is pushed from the
      // corner point C along the bisector. 0 = center AT the corner (moderate
      // bulge). Positive, up to Dbase = pushed outward, into the solid, up to
      // the exact-tangent point (max bulge). Negative, down to -r = pushed
      // toward the interior side, shrinking the bulge down to nothing at -r.
      // At every value in [-r, Dbase] the circle stays mathematically exactly
      // tangent/intersecting the two wall lines (verified: |O-P1|=|O-P2|=r).
      const ext = Math.max(-r, Math.min(c.offset||0, Dbase));
      const O = sub(C, scl(c.bis, ext)); // outward, into the solid
      const disc = Math.max(0, r*r - ext*ext*sinH*sinH);
      const t = -ext*cosH + Math.sqrt(disc);
      if(t > wallLimit){ nodes.push({x:C.x,y:C.y,arc:null}); continue; } // radius too big for this corner
      const P1 = add(C, scl(c.e1, t));
      const P2 = add(C, scl(c.e2, t));
      const dir = pickDirection(O,P1,P2, Math.PI + c.theta); // reflex/major arc, bulges into solid
      nodes.push({x:P1.x,y:P1.y, arc:null});
      nodes.push({x:P2.x,y:P2.y, arc:{cx:O.x,cy:O.y,r,ccw:dir.ccw,sweep:dir.sweep}, from:P1});
    } else if(c.mode==='tbone'){
      const offs = c.offset||0;
      const edge = resolveTboneEdge(c);
      const d = r + offs; // distance from corner to circle center along the wall
      if(d+r > (edge===c.e1 ? (c.e1Len||Infinity) : (c.e2Len||Infinity))*0.98){ nodes.push({x:C.x,y:C.y,arc:null}); continue; } // won't fit on the chosen wall
      const O = add(C, scl(edge, d));
      const Pfar = add(C, scl(edge, d+r));
      const Pnear = add(C, scl(edge, d-r));
      // pick the semicircle (of the two possible) that bulges AWAY from the
      // interior/pocket (i.e. outward, into the solid) — same convention as dogbone
      const aFar = Math.atan2(Pfar.y-O.y, Pfar.x-O.x);
      const aNear = Math.atan2(Pnear.y-O.y, Pnear.x-O.x);
      const ccwSweep = normAngle(aNear-aFar);
      const pMidCCW = {x:O.x+r*Math.cos(aFar+ccwSweep/2), y:O.y+r*Math.sin(aFar+ccwSweep/2)};
      const pMidCW  = {x:O.x+r*Math.cos(aFar-(TWO_PI()-ccwSweep)/2), y:O.y+r*Math.sin(aFar-(TWO_PI()-ccwSweep)/2)};
      const scoreCCW = dot(sub(pMidCCW,C), c.bis);
      const scoreCW  = dot(sub(pMidCW,C), c.bis);
      let useCCW = scoreCCW <= scoreCW; // pick the one pointing AWAY from bisector/interior
      if(c.tboneMirror) useCCW = !useCCW; // manual override: flip to the opposite side
      const sweep = Math.PI;
      if(edge===c.e1){
        nodes.push({x:Pfar.x,y:Pfar.y, arc:null});
        nodes.push({x:Pnear.x,y:Pnear.y, arc:{cx:O.x,cy:O.y,r,ccw:useCCW,sweep}, from:Pfar});
      } else {
        nodes.push({x:Pnear.x,y:Pnear.y, arc:null});
        nodes.push({x:Pfar.x,y:Pfar.y, arc:{cx:O.x,cy:O.y,r,ccw:useCCW,sweep}, from:Pnear});
      }
    }
  }
  nodes.closed = closed;
  return nodes;
}

function buildModifiedPaths(){
  const out = [];
  polygons.forEach((poly, pi)=>{
    out.push(buildShapeNodes(poly.points, poly.closed, 'poly', pi));
  });
  return out;
}
// same as buildModifiedPaths, but for the user-drawn rect/polygon/line shapes
// (circles and arcs pass through untouched — they have no real corners)
function buildDrawnModifiedPaths(){
  const out = [];
  drawnLines.forEach((line, pi)=>{
    const isSmooth = line.kind==='circle' || line.kind==='arc' || (!line.kind && line.center);
    if(isSmooth){ out.push(null); return; } // circle/arc drawn separately
    const segs = shapeToSegs(line);
    if(!segs.length){ out.push(null); return; }
    // apply dogbone / T-bone / fillet / chamfer on the segment chain, then
    // hand the renderer & DXF exporter real arc nodes
    const relieved = applyReliefsToSegs(segs, !!line.closed, 'drawn', pi);
    out.push(segsToNodes(relieved, !!line.closed));
  });
  return out;
}
// Convert grips + segMeta into node list with arc data (for DXF bulge export)
function segMetaToNodes(grips, segMeta, closed){
  const nodes=[];
  nodes.push({x:grips[0].x, y:grips[0].y, arc:null});
  for(let g=1; g<grips.length; g++){
    const meta=segMeta[g];
    if(meta==='arcMid'){ continue; } // handled by the following arcEnd
    if(meta==='arcEnd'){
      const A=grips[g-2], M=grips[g-1], B=grips[g];
      const circ=circleFrom3Pts(A,M,B);
      if(circ){
        // determine sweep direction and angle
        const a0=Math.atan2(A.y-circ.y, A.x-circ.x);
        const a1=Math.atan2(B.y-circ.y, B.x-circ.x);
        const am=Math.atan2(M.y-circ.y, M.x-circ.x);
        const norm=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
        let ce=norm(a1-a0), cm=norm(am-a0);
        const ccw = cm<=ce;
        const sweep = ccw ? ce : (Math.PI*2-ce);
        nodes.push({x:B.x, y:B.y, arc:{cx:circ.x, cy:circ.y, r:circ.r, ccw, sweep}, from:A});
      } else {
        nodes.push({x:B.x, y:B.y, arc:null});
      }
    } else {
      nodes.push({x:grips[g].x, y:grips[g].y, arc:null});
    }
  }
  nodes.closed = closed;
  return nodes;
}

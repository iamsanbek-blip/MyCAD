/* ==========================================================================
   js/geometry/core.js
   Asosiy matematika: vektor, burchak, masofa yordamchilari

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= geometry helpers =================
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y};}
function add(a,b){return {x:a.x+b.x,y:a.y+b.y};}
function scl(a,s){return {x:a.x*s,y:a.y*s};}
function len(a){return Math.hypot(a.x,a.y);}
function norm(a){const l=len(a)||1;return {x:a.x/l,y:a.y/l};}
function dot(a,b){return a.x*b.x+a.y*b.y;}
function TWO_PI(){return Math.PI*2;}
function normAngle(a){while(a<0)a+=TWO_PI(); while(a>=TWO_PI())a-=TWO_PI(); return a;}
function safeSize(v, fallback){ const n=parseNum(v, NaN); return (isFinite(n) && n>0.02) ? n : fallback; }
// TUZATILDI: O'zbek/rus klaviaturasida o'nlik ajratgich VERGUL bo'ladi.
// type="number" maydon vergulli matnni butunlay rad etadi va .value BO'SH
// qaytaradi — natijada "-1,8" yozilganda qiymat 0 bo'lib qolardi va
// foydalanuvchiga maydon "qotib qolgan"dek tuyulardi. Endi vergul ham,
// nuqta ham qabul qilinadi.
function parseNum(v, fallback){
  if(v==null) return fallback;
  const s = String(v).trim().replace(',', '.');
  if(s==='' || s==='-' || s==='.' || s==='-.') return fallback;
  const n = parseFloat(s);
  return isFinite(n) ? n : fallback;
}
function safeOffset(v){ return parseNum(v, 0); }

// given center O and two points A,B (both radius r from O), find which rotational
// direction (world CCW=true / CW=false) achieves a sweep closest to target S.
function pickDirection(O,A,B,targetSweep){
  const a1 = Math.atan2(A.y-O.y, A.x-O.x);
  const a2 = Math.atan2(B.y-O.y, B.x-O.x);
  const ccwDelta = normAngle(a2-a1);
  const cwDelta = TWO_PI()-ccwDelta;
  if(Math.abs(ccwDelta-targetSweep) <= Math.abs(cwDelta-targetSweep)){
    return {ccw:true, sweep:ccwDelta};
  }
  return {ccw:false, sweep:cwDelta};
}

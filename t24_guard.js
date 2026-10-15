// Behavior coverage for field input boundaries; native key entry is also
// exercised in tests/electron-smoke.cjs on the Windows runner.
const assert=require('node:assert/strict');
const {createHarness}=require('./tests/browser-harness.cjs');
const h=createHarness(),pending=[];
h.sb.setTimeout=f=>pending.push(f);h.sb.requestAnimationFrame=f=>pending.push(f);
const first=h.document.getElementById('filletR'),next=h.document.getElementById('textSize');
h.document.emit('mousedown',{target:first});first.focus();next.focus();pending.splice(0).forEach(f=>f());
assert.equal(h.document.activeElement,next,'Deferred recovery must not steal later focus');
for(const tag of ['input','textarea','select']){
 const el=h.element(tag);h.sb.el=el;assert.equal(h.run('isTextInputTarget(el)'),true);
}
const editable=h.element('div');editable.isContentEditable=true;h.sb.el=editable;
assert.equal(h.run('isTextInputTarget(el)'),true);
h.run("panning=true;selecting=true;draggingRef={id:'stale'};draggingGrip={li:0,gi:0}");
h.document.emit('mousedown',{target:next});
assert.equal(h.run('panning||selecting||draggingRef||draggingGrip'),null);
let draws=0;h.sb.__draw=()=>draws++;h.run("draw=__draw;setAppMode('draw')");draws=0;
next.focus();
h.window.emit('mousemove',{target:next,clientX:30,clientY:30,buttons:0});
assert.equal(draws,0,'Panel hover must not trigger a geometry redraw');
h.document.activeElement=h.document.body;
h.window.emit('mousemove',{target:h.document.getElementById('cv'),clientX:30,clientY:30,buttons:0});
assert.ok(draws>0,'Canvas previews remain active');
console.log('PASS: native fields, focus transfer, drag cleanup and canvas event boundaries');

'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
module.exports=async function checkInputAndRegion(app,page,temporary,artifactDir){
  const checks=[];
  const win=await app.browserWindow(page);
  await win.evaluate(window=>window.setContentSize(1600,950));
  await page.waitForFunction(()=>innerWidth===1600 && innerHeight===950);
  const ids=['filletR','joinDistInp','dimTextSize','dimUnit','textSize','textRot','gridStepInp','angleStepInp'];
  const timings=[];
  await page.evaluate(()=>{offsetMode=true;offsetPick=null;});
  for(let round=0;round<3;round++){
    for(const id of ids){
      const field=page.locator('#'+id),value=round===0?'12.75':round===1?'-0.15':'70';
      await field.click();
      const box=await field.boundingBox();
      await page.evaluate(()=>{window.__inputDraws=0;window.__inputOriginalDraw=draw;draw=function(){window.__inputDraws++;return window.__inputOriginalDraw();};});
      try{
        await page.mouse.move(box.x+4,box.y+box.height/2,{steps:6});
        assert.equal(await page.evaluate(()=>window.__inputDraws),0,'Panel hover must not rebuild geometry');
      }finally{await page.evaluate(()=>{draw=window.__inputOriginalDraw;});}
      const started=Date.now();
      await field.press('Control+a');
      await field.pressSequentially(value,{delay:5});
      assert.equal(await field.inputValue(),value,id+' accepts actual keyboard events');
      assert.equal(await page.evaluate(()=>document.activeElement.id),id);
      const elapsed=Date.now()-started;timings.push(elapsed);
      assert.ok(elapsed<5000,id+' must not stall for 10–30 seconds');
    }
  }
  await page.evaluate(()=>finishOffset());
  const focus=await page.evaluate(async()=>{
    const a=document.getElementById('filletR'),b=document.getElementById('textSize');
    a.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));a.focus();b.focus();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return document.activeElement.id;
  });
  assert.equal(focus,'textSize','Old recovery timers cannot steal focus after a field switch');
  checks.push('8 fields accept 3 rounds of real numeric keyboard input; stable focus; no panel-hover rebuilds (max '+Math.max(...timings)+' ms)');

  await page.evaluate(()=>{
    document.activeElement.blur();finishOffset();setDrawTool('none');
    document.getElementById('dimTextSize').value='10';document.getElementById('textSize').value='10';
    document.getElementById('dimUnit').value='mm';
    document.getElementById('gridStepInp').value='10';document.getElementById('angleStepInp').value='15';
    const shape=(x0,y0,x1,y1,color)=>({kind:'rect',closed:true,selected:false,layer:'cut',color,filled:true,
      grips:[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}],points:[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}]});
    drawnLines=[shape(150,150,250,250,'#ff0000'),shape(450,150,550,250,'#0000ff')];
    polygons=[];dimensions=[];texts=[];view={scale:1,ox:40,oy:850};detectCorners();draw();
  });
  const before=await page.evaluate(()=>JSON.stringify({drawnLines,dimensions,texts,historyIndex,projectDirty}));
  await page.locator('#exportPngRegionBtn').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pngRegionOverlay').count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify({drawnLines,dimensions,texts,historyIndex,projectDirty})),before);
  checks.push('PNG crop Escape cancels without modifying geometry or history');

  await app.evaluate(({session},dir)=>{
    globalThis.__rugbyDownload=null;
    session.defaultSession.on('will-download',(_event,item)=>{
      item.setSavePath(dir+'/'+item.getFilename());
      globalThis.__rugbyDownload={name:item.getFilename(),state:'started'};
      item.once('done',(_ev,state)=>{globalThis.__rugbyDownload.state=state;});
    });
  },temporary);
  async function downloaded(name){
    const end=Date.now()+15000;
    while(Date.now()<end){
      const d=await app.evaluate(()=>globalThis.__rugbyDownload);
      if(d?.name===name && d.state!=='started'){assert.equal(d.state,'completed');return path.join(temporary,name);}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw new Error('PNG download did not complete: '+name);
  }
  // Drag bottom-right to top-left, proving reversed rectangles also work.
  await page.locator('#exportPngRegionBtn').click();
  const points=await page.evaluate(()=>{
    const r=canvas.getBoundingClientRect(),a=toScreen({x:300,y:100}),b=toScreen({x:100,y:300});
    return {a:{x:a.x+r.left,y:a.y+r.top},b:{x:b.x+r.left,y:b.y+r.top}};
  });
  await page.mouse.move(points.a.x,points.a.y);await page.mouse.down();
  await page.mouse.move(points.b.x,points.b.y,{steps:10});await page.mouse.up();
  const cropped=await downloaded('drawing-region.png');
  async function pixels(file){
    return page.evaluate(async base64=>{
      const im=new Image();im.src='data:image/png;base64,'+base64;await im.decode();
      const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
      const bytes=x.getImageData(0,0,c.width,c.height).data;
      let red=0,blue=0;for(let i=0;i<bytes.length;i+=4){if(bytes[i]>100 && bytes[i+1]<40 && bytes[i+2]<40)red++;if(bytes[i+2]>100 && bytes[i]<40 && bytes[i+1]<40)blue++;}
      return {width:im.width,height:im.height,red,blue};
    },fs.readFileSync(file).toString('base64'));
  }
  const cropPixels=await pixels(cropped);
  assert.equal(cropPixels.width,1600);assert.equal(cropPixels.height,1600);
  assert.ok(cropPixels.red>10000);assert.equal(cropPixels.blue,0,'Outside blue object must be clipped');
  assert.equal(await page.evaluate(()=>JSON.stringify({drawnLines,dimensions,texts,historyIndex,projectDirty})),before);
  await page.locator('#exportPngBtn').click();
  const full=await downloaded('drawing.png'),fullPixels=await pixels(full);
  assert.ok(fullPixels.red>10000);assert.ok(fullPixels.blue>10000,'Full export still includes both objects');
  checks.push('real PNG region download is 1600×1600 with inside object only; full PNG includes both objects');
  if(artifactDir){fs.mkdirSync(artifactDir,{recursive:true});fs.copyFileSync(cropped,path.join(artifactDir,'region-export.png'));
    fs.writeFileSync(path.join(artifactDir,'input-region.json'),JSON.stringify({status:'passed',timingsMs:timings,cropPixels,fullPixels},null,2));}
  return checks;
};

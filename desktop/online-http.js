'use strict';
// HTTPS allowlists live at call sites. Never attach credentials to redirects.
async function request(url,options={},fetcher=globalThis.fetch){
  const {maxBytes=8*1024*1024,timeout=30000,...init}=options;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const r=await fetcher(url,{...init,redirect:'error',signal:controller.signal});
    if(!r.ok){const e=Error(r.status===401?'Kirish kaliti noto‘g‘ri yoki muddati tugagan.':r.status===403?'Xizmatga ruxsat yo‘q.':r.status===429?'Xizmat limiti tugagan; keyinroq urinib ko‘ring.':'Internet xizmati xatosi: '+r.status);e.status=r.status;throw e;}
    const length=Number(r.headers?.get('content-length'));if(length>maxBytes)throw Error('Javob hajmi limitdan oshdi.');
    const chunks=[];let bytes=0;for await(const chunk of r.body){bytes+=chunk.length;if(bytes>maxBytes){controller.abort();throw Error('Javob hajmi limitdan oshdi.');}chunks.push(Buffer.from(chunk));}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch(e){if(e.name==='AbortError')throw Error('Internet so‘rovi vaqti tugadi.');throw e;}finally{clearTimeout(timer);}
}
module.exports={request};

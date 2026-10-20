/* Browser-only entry points; the same drawing engine remains desktop compatible. */
(function(){
 if(window.desktop)return;
 const section=document.createElement('div');section.className='section';
 const title=document.createElement('strong');title.textContent='Rugby Web · 1.1.1';
 const note=document.createElement('p');note.className='sub';note.textContent='Brauzerda sinov. Chizmalarni Saqlash orqali .dbe faylga saqlang. Yangilashdan oldin saqlashni unutmang.';
 const sample=document.createElement('button');sample.type='button';sample.id='browserSampleBtn';sample.textContent='▧ 3D korpus namunasini ochish';
 sample.addEventListener('click',async()=>{sample.disabled=true;try{const r=await fetch('samples/korpus-3d.dbe');if(!r.ok)throw Error('Namuna yuklanmadi');if(await acceptProjectFile(await r.text(),'korpus-3d.dbe'))setAppMode('model3d');}catch(e){alert(e.message);}finally{sample.disabled=false;}});
 section.append(title,note,sample);document.getElementById('sidebar').prepend(section);
})();

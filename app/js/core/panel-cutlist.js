(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RugbyCutList=api;})(globalThis,function(){
 const columns={name:'Nomi',height:'Bo‘yi, mm',width:'Eni, mm',thickness:'Qalinlik, mm',quantity:'Soni',page:'Sahifa'};
 function rows(pages){const groups=new Map();for(const page of pages)for(const p of page.scene3d.panels){const shape=p.outline.map(v=>[v.x/p.baseWidth,v.y/p.baseHeight]);const key=JSON.stringify([page.id,p.name,p.type||'Panel',p.width,p.height,p.thickness,shape]);if(groups.has(key))groups.get(key).quantity+=(p.quantity||1);else groups.set(key,{name:p.name,height:p.height,width:p.width,thickness:p.thickness,quantity:p.quantity||1,page:page.name});}return [...groups.values()];}
 function safe(v){return typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?"'"+v:String(v);}
 function serialize(rows,order,csv,options={}){const decimal=options.decimal===','?',':'.',separator=options.separator===';'?';':',';const data=rows.map(r=>order.map(k=>typeof r[k]==='number'?String(r[k]).replace('.',decimal):safe(r[k])));if(options.header!==false)data.unshift(order.map(k=>columns[k]));return (csv?'\ufeff':'')+data.map(row=>row.map(v=>csv?'"'+String(v).replace(/"/g,'""')+'"':String(v).replace(/[\t\r\n]+/g,' ')).join(csv?separator:'\t')).join('\r\n');}
 return{columns,rows,serialize};
});

/* Declarative CAD plans: no generated JavaScript, eval, shell, or network here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RugbyAssistantPlan=api;})(globalThis,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const schemas={
    panel:['name','width','height','thickness','position','rotation'],
    cabinet:['name','width','height','depth','thickness','shelves','position'],
    shelves:['name','width','height','depth','thickness','count','position'],
    move:['delta'],array:['copies','delta'],distribute:['axis','gap'],
    rectangle:['width','height','position'],calculate:['expression'],
    layout:['dock'],hotkey:['command','key'],template:['id','position']
  };
  function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
  function fields(v,allowed){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Noma’lum yoki noto‘g‘ri parametr.');}
  function number(v,label,min=-1000000,max=1000000){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+' noto‘g‘ri.');return v;}
  function integer(v,label,min,max){number(v,label,min,max);if(!Number.isInteger(v))throw Error(label+' butun son bo‘lsin.');return v;}
  function string(v,max=160){if(typeof v!=='string'||v.length>max||/[\x00-\x08]/.test(v))throw Error('Matn noto‘g‘ri.');return v;}
  function vector(v,n=3){if(!Array.isArray(v)||v.length!==n)throw Error('Koordinata noto‘g‘ri.');return v.map(x=>number(x,'Koordinata'));}
  function calculate(text){
    string(text,300);const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+*/-]/gi)||[];
    if(tokens.join('')!==text.replace(/\s/g,'')||tokens.length>150)throw Error('Faqat sonlar, + − * / va qavslar mumkin.');let i=0;
    function atom(){const t=tokens[i++];if(t==='+'||t==='-')return(t==='-'?-1:1)*atom();if(t==='('){const v=sum();if(tokens[i++]!==')')throw Error('Qavs yopilmagan.');return v;}if(t===undefined||!/^\d|^\./.test(t))throw Error('Hisob ifodasi noto‘g‘ri.');return Number(t);}
    function product(){let v=atom();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],b=atom();if(op==='/'&&b===0)throw Error('Nolga bo‘lish mumkin emas.');v=op==='*'?v*b:v/b;}return v;}
    function sum(){let v=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],b=product();v=op==='+'?v+b:v-b;}return v;}
    const result=sum();if(i!==tokens.length||!Number.isFinite(result)||Math.abs(result)>1e15)throw Error('Hisob natijasi noto‘g‘ri yoki juda katta.');return result;
  }
  function action(raw){
    if(!object(raw)||!Object.hasOwn(schemas,raw.type))throw Error('Bu amal qo‘llanmaydi: '+String(raw?.type));
    fields(raw,['type',...schemas[raw.type]]);const a=clone(raw);
    for(const k of ['width','height','depth','thickness'])if(k in a)number(a[k],k,.1,100000);
    if('name'in a)string(a.name,80);
    if('position'in a)vector(a.position,a.type==='rectangle'?2:3);
    if('rotation'in a)vector(a.rotation);
    switch(a.type){
      case 'panel':for(const k of ['width','height','thickness'])number(a[k],k,.1,100000);break;
      case 'cabinet':case 'shelves':
        for(const k of ['width','height','depth','thickness'])number(a[k],k,.1,100000);
        integer(a.type==='cabinet'?a.shelves:a.count,'Polka soni',a.type==='cabinet'?0:1,100);
        if(a.type==='cabinet'&&(a.width<=2*a.thickness||a.height<=(a.shelves+2)*a.thickness))throw Error('Korpus ichida polkalar uchun joy yetarli emas.');
        if(a.type==='shelves'&&a.height<=a.count*a.thickness)throw Error('Sof oraliq uchun balandlik yetarli emas.');break;
      case 'move':vector(a.delta);break;
      case 'array':integer(a.copies,'Qo‘shimcha nusxalar',1,100);vector(a.delta);break;
      case 'distribute':if(!['x','y','z'].includes(a.axis))throw Error('O‘q noto‘g‘ri.');number(a.gap,'Oraliq',0,100000);break;
      case 'rectangle':number(a.width,'En',.1,100000);number(a.height,'Bo‘y',.1,100000);break;
      case 'calculate':calculate(a.expression);break;
      case 'layout':if(!['left','right','bottom'].includes(a.dock))throw Error('Konsol joyi noto‘g‘ri.');break;
      case 'hotkey':string(a.command,120);string(a.key,50);break;
      case 'template':string(a.id,120);break;
    }
    return a;
  }
  function validate(raw){
    fields(raw,['version','summary','questions','actions']);if(raw.version!==1)throw Error('AI reja versiyasi qo‘llanmaydi.');
    string(raw.summary,6000);if(!Array.isArray(raw.questions)||raw.questions.length>15)throw Error('Savollar ro‘yxati noto‘g‘ri.');raw.questions.forEach(q=>string(q,1000));
    if(!Array.isArray(raw.actions)||raw.actions.length>100)throw Error('Rejada ko‘pi bilan 100 amal mumkin.');
    if(raw.questions.length&&raw.actions.length)throw Error('Noaniq o‘lchamlarni avval aniqlashtiring.');
    return{version:1,summary:raw.summary,questions:[...raw.questions],actions:raw.actions.map(action)};
  }
  function parse(text){string(text,150000);const s=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return validate(JSON.parse(s));}
  // Matrix convention matches Three.js Euler XYZ; full panel AABB extents.
  function extent(p,axis){const [x,y,z]=p.rotation.map(v=>v*Math.PI/180),a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
    const rows=[[c*e,-c*f,d],[a*f+b*d*e,a*e-b*d*f,-b*c],[b*f-a*d*e,b*e+a*d*f,a*c]];
    return rows[axis].reduce((n,v,i)=>n+Math.abs(v)*[p.width,p.height,p.thickness][i],0);
  }
  function prepare(raw,context,panels){
    const plan=validate(raw),scene=panels.normalize(context.scene),selected=new Set(context.selected||[]),results=[],settings=[],rectangles=[];let created=0;
    const add=(name,w,h,t,pos,rot=[0,0,0])=>{const p=panels.instantiate(panels.template([{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],name),t);p.position=pos;p.rotation=rot;scene.panels.push(p);created++;return p;};
    const picked=()=>{const found=scene.panels.filter(p=>selected.has(p.id));if(!found.length)throw Error('Avval 3D panelni tanlang.');return found;};
    for(const a of plan.actions){
      const pos=a.position||[0,0,0],name=a.name||'AI panel';
      if(a.type==='panel')add(name,a.width,a.height,a.thickness,pos,a.rotation||[0,0,0]);
      if(a.type==='cabinet'){
        const {width:w,height:h,depth:d,thickness:t,shelves:n}=a,[x,y,z]=pos;
        add(name+' · O‘ng yon',d,h,t,[x+w-t/2,y+d/2,z+h/2],[90,90,0]);
        add(name+' · Chap yon',d,h,t,[x+t/2,y+d/2,z+h/2],[90,90,0]);
        add(name+' · Dno',w-2*t,d,t,[x+w/2,y+d/2,z+t/2]);
        add(name+' · Krisha',w-2*t,d,t,[x+w/2,y+d/2,z+h-t/2]);
        const gap=(h-(n+2)*t)/(n+1);
        for(let i=0;i<n;i++)add(name+' · Polka '+(i+1),w-2*t,d,t,[x+w/2,y+d/2,z+t+gap+(t+gap)*i+t/2]);
        results.push('Korpus: '+w+' × '+d+' × '+h+' mm; sof oraliq '+gap.toFixed(3)+' mm. Fasad va orqa devor kiritilmagan.');
      }
      if(a.type==='shelves'){
        const gap=(a.height-a.count*a.thickness)/(a.count+1);
        for(let i=0;i<a.count;i++)add(name+' '+(i+1),a.width,a.depth,a.thickness,[pos[0]+a.width/2,pos[1]+a.depth/2,pos[2]+gap+(gap+a.thickness)*i+a.thickness/2]);
        results.push('Polkalar orasidagi va chetlardagi sof oraliq: '+gap.toFixed(3)+' mm.');
      }
      if(a.type==='move')for(const p of picked())p.position=p.position.map((v,i)=>v+a.delta[i]);
      if(a.type==='array'){const source=picked();if(source.length*a.copies>1000)throw Error('Bir amalda ko‘pi bilan 1000 yangi panel mumkin.');for(let n=1;n<=a.copies;n++)for(const p of source){const c=clone(p);c.id=panels.id();delete c.sourceDrawingId;c.position=c.position.map((v,i)=>v+a.delta[i]*n);scene.panels.push(c);created++;}}
      if(a.type==='distribute'){const axis='xyz'.indexOf(a.axis),source=picked().sort((a,b)=>a.position[axis]-b.position[axis]);if(source.length<2)throw Error('Kamida 2 panel tanlang.');let edge=source[0].position[axis]+extent(source[0],axis)/2;for(const p of source.slice(1)){const size=extent(p,axis);p.position[axis]=edge+a.gap+size/2;edge+=a.gap+size;}}
      if(a.type==='rectangle')rectangles.push({width:a.width,height:a.height,position:a.position||[0,0]});
      if(a.type==='calculate')results.push(a.expression+' = '+calculate(a.expression));
      if(a.type==='layout'||a.type==='hotkey')settings.push(a);
      if(a.type==='template'){const block=context.templates?.[a.id];if(!block)throw Error('Shablon topilmadi.');for(const p of block.panels){const c=clone(p);c.id=panels.id();delete c.sourceDrawingId;c.position=c.position.map((v,i)=>v+pos[i]);scene.panels.push(c);created++;}}
      if(created>1000||scene.panels.length>10000)throw Error('Panel limiti oshdi.');
    }
    return{plan,scene:panels.normalize(scene),settings,results,rectangles,created,geometry:plan.actions.some(a=>!['layout','hotkey','calculate'].includes(a.type))};
  }
  const help={version:1,summary:'Natija va taxminlarni o‘zbekcha yozing.',questions:[],actions:Object.entries(schemas).map(([type,fields])=>({type,fields}))};
  return{validate,parse,action,prepare,calculate,extent,help,clone};
});

# Rugby brauzer (bitta HTML) versiyasini yig'ish: python3 scripts/build-web.py chiqish.html
import re,base64,sys,os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','app'))
rd=lambda p:open(p,encoding='utf-8').read()
html=rd('index.html')
html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>\n'+rd(m.group(1))+'\n</style>',html)
html=html.replace('src="assets/logo-mark.png"','src="data:image/png;base64,'+base64.b64encode(open('assets/logo-mark.png','rb').read()).decode()+'"')
shim='''<script>
(function(){
 window.showSaveFilePicker=undefined;window.showOpenFilePicker=undefined;
 window.__webSave=async function(data,name){
  let dl=null;try{if(typeof claude!=='undefined')dl=await claude.use('downloads')}catch(e){}
  if(!dl){alert("Bu ko'rinishda faylni yuklab olish mavjud emas.");return false}
  let fn=name;if(/\\.dbe$/i.test(fn))fn=fn.replace(/\\.dbe$/i,'.json');else if(/\\.(dxf|obj)$/i.test(fn))fn=fn+'.txt';
  try{await dl.save({filename:fn,data});return true}catch(e){if(!e||e.code!=='declined')alert("Saqlab bo'lmadi: "+((e&&(e.message||e.code))||e));return false}};
 window.downloadFile=function(content,filename){return window.__webSave(content,filename)};
})();
</script>
'''
def inline(m):
    src=m.group(1);code=rd(src)
    if src=='js/io/raster.js':
        old=re.search(r"    const url=URL\.createObjectURL\(blob\);\n.*?\n.*?\n    setTimeout\(.*?\n",code,re.S);assert old
        code=code.replace(old.group(0),"    window.__webSave(blob,crop?'drawing-region.png':'drawing.png');\n")
    return (shim if src=='js/app.js' else '')+'<script>\n'+code.replace('</script','<\\/script')+'\n</script>'
html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
if 'name="viewport"' not in html:html=html.replace('<head>','<head>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',1)
open(sys.argv[1] if len(sys.argv)>1 else '../rugby-web.html','w',encoding='utf-8').write(html)

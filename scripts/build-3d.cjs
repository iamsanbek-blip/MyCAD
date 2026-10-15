require('esbuild').buildSync({entryPoints:['src/three/viewport.js'],outfile:'app/vendor/three-viewport.js',bundle:true,minify:true,format:'iife',target:'chrome126',legalComments:'eof'});

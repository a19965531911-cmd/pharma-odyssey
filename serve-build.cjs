const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(process.env.PHARMA_BUILD_DIR||path.join(__dirname,'dist'));
const port=Number(process.argv[2]||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let file;
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+pathname);if(file===root)file=path.join(root,'index.html');}catch{res.writeHead(400);res.end('Bad URL');return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('Pharma Odyssey: http://127.0.0.1:'+port+'/'));

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const production=process.argv.includes('--production');
const vite=production?null:await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.gz':'application/gzip'};
const server=http.createServer(async(req,res)=>{
  try {
    if(req.url.startsWith('/api/')) { const {handleApi}=await import('./src/market-api.mjs'); return await handleApi(req,res); }
    if(vite)return vite.middlewares(req,res);
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(root,'dist',pathname==='/'?'index.html':'.'+pathname);
    if(!target.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);return res.end();}
    const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Harbour is ready at http://127.0.0.1:4173'));

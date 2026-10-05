import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
await mkdir(path.join(root,'public/fonts'),{recursive:true});
const r=await fetch('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&display=swap',{headers:{'User-Agent':'Mozilla/5.0'}});
if(!r.ok)throw Error('Could not fetch font styles');let css=await r.text();const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];let i=0;
for(const url of urls){const res=await fetch(url);if(!res.ok)throw Error('Could not download font');const ext=new URL(url).pathname.split('.').at(-1);const name=`harbour-${i++}.${ext}`;await writeFile(path.join(root,'public/fonts',name),Buffer.from(await res.arrayBuffer()));css=css.split(url).join('/fonts/'+name);}
await writeFile(path.join(root,'src/fonts.css'),css);console.log(`${urls.length} font files installed locally.`);

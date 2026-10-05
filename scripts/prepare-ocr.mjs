import {mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
for(const d of ['public/ocr/core','public/ocr/lang'])await mkdir(path.join(root,d),{recursive:true});
await copyFile(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(root,'public/ocr/worker.min.js'));
for(const f of await readdir(path.join(root,'node_modules/tesseract.js-core'))){if(/\.wasm(?:\.js)?$/.test(f))await copyFile(path.join(root,'node_modules/tesseract.js-core',f),path.join(root,'public/ocr/core',f));}
const response=await fetch('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz');
if(!response.ok)throw new Error('Could not download English OCR language data');
await writeFile(path.join(root,'public/ocr/lang/eng.traineddata.gz'),Buffer.from(await response.arrayBuffer()));
console.log('OCR worker, engine, and English language data are installed locally.');

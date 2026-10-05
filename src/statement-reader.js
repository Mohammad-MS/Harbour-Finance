let ocrWorker;
async function ocr(input,progress){
 const {createWorker}=await import('tesseract.js');
 ocrWorker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',logger:m=>{if(m.status==='recognizing text')progress(`Reading text locally… ${Math.round(m.progress*100)}%`);}});
 try{return (await ocrWorker.recognize(input)).data.text;}finally{await ocrWorker.terminate();ocrWorker=null;}
}
export async function extractStatement(file,progress){
 if(/\.pdf$/i.test(file.name)){
  const pdfjs=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
  const data=new Uint8Array(await file.arrayBuffer());
  const task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true});
  const doc=await task.promise;let result='';
  try{if(doc.numPages>60)throw new Error('Please split statements longer than 60 pages before importing.');
   for(let n=1;n<=doc.numPages;n++){
    progress(`Reading PDF page ${n} of ${doc.numPages} locally…`);const page=await doc.getPage(n),content=await page.getTextContent();
    const lines=new Map();for(const item of content.items){if(!item.str)continue;const y=Math.round(item.transform[5]/3)*3;const key=[...lines.keys()].find(k=>Math.abs(k-y)<3)??y;if(!lines.has(key))lines.set(key,[]);lines.get(key).push({x:item.transform[4],text:item.str});}
    let text=[...lines.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');
    if(text.trim().length<30){const canvas=document.createElement('canvas'),viewport=page.getViewport({scale:1.8});if(viewport.width*viewport.height>18000000)throw new Error('This scanned page is too large. Import a smaller screenshot instead.');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text=await ocr(canvas,progress);canvas.width=0;canvas.height=0;}
    result+=text+'\n';page.cleanup();
   }
  }finally{await task.destroy();}
  return result;
 }
 if(/\.(png|jpe?g|webp)$/i.test(file.name))return ocr(file,progress);
 throw new Error('Choose a PDF, PNG, JPG, WEBP, CSV, or text file.');
}

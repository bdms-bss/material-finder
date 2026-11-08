import {TOPICS} from './ai-topics.js';
let lib,textPipeline,imagePipeline,topicEmbeddings;
const progress=(text)=>self.postMessage({type:'progress',text});
async function library(){
 if(!lib){progress('กำลังโหลดระบบ AI บนเครื่อง…');lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');lib.env.allowLocalModels=false;lib.env.backends.onnx.wasm.numThreads=1;lib.env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/dist/';}
 return lib;
}
const download=event=>{if(event.status==='progress')progress(`ดาวน์โหลดโมเดล ${event.file?.split('/').pop()||''} · ${Math.round(event.progress||0)}%`)};
async function textAI(){if(!textPipeline){const {pipeline}=await library();progress('โหลดโมเดลภาษาไทย/อังกฤษครั้งแรก ประมาณ 118 MB…');textPipeline=await pipeline('feature-extraction','Xenova/paraphrase-multilingual-MiniLM-L12-v2',{dtype:'q8',device:'wasm',progress_callback:download})}return textPipeline}
async function imageAI(){if(!imagePipeline){const {pipeline}=await library();progress('โหลดโมเดลวิเคราะห์ภาพครั้งแรก ประมาณ 154 MB…');imagePipeline=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8',device:'wasm',progress_callback:download})}return imagePipeline}
const segments=text=>[...new Intl.Segmenter('th',{granularity:'word'}).segment(text.toLowerCase())].filter(s=>s.isWordLike&&s.segment.length>2&&!['เครื่อง','ของ','อยาก','ได้','ต้องการ','ใช้','ใส่','สำหรับ','คนไข้','สินค้า','ผู้ป่วย','ค่า','บริการ','อุปกรณ์'].includes(s.segment)).map(s=>s.segment);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
async function embed(texts){const pipeline=await textAI();return (await pipeline(texts,{pooling:'mean',normalize:true})).tolist()}
self.onmessage=async({data})=>{const {id,task,query,image,candidates}=data;try{
 let result;
 if(task==='topics'){
  if(image){const classify=await imageAI();progress('กำลังวิเคราะห์ภาพบนเครื่อง…');const labels=TOPICS.map(t=>t.en);const predictions=await classify(image,labels);result=predictions.slice(0,4).map(p=>({...TOPICS.find(t=>t.en===p.label),score:p.score}));}
  else{await textAI();progress('กำลังทำความเข้าใจความหมายของคำค้น…');topicEmbeddings??=await embed(TOPICS.map(t=>t.th+' '+t.en));const [q]=await embed([query]);result=TOPICS.map((t,i)=>({...t,score:dot(q,topicEmbeddings[i])+segments(query).filter(w=>(t.th+' '+t.en).toLowerCase().includes(w)).length*0.07})).sort((a,b)=>b.score-a.score).slice(0,4);}
 }else if(task==='rank'){
  if(image){const classify=await imageAI();progress('กำลังเทียบภาพกับรายการจาก master…');const labels=candidates.map(c=>c.description+'; '+c.groupName);const unique=[...new Set(labels)];const predictions=await classify(image,unique);const scores=new Map(predictions.map(p=>[p.label,p.score]));result=candidates.map((c,i)=>({id:c.id,score:scores.get(labels[i])||0})).sort((a,b)=>b.score-a.score);}
  else{progress('กำลังเทียบความหมายกับรายการจาก master…');const embeddings=await embed([query,...candidates.map(c=>c.description+' '+c.groupName)]);result=candidates.map((c,i)=>({id:c.id,score:dot(embeddings[0],embeddings[i+1])})).sort((a,b)=>b.score-a.score);}
 }else throw Error('Unknown AI task');
 self.postMessage({id,type:'result',result});
 }catch(e){self.postMessage({id,type:'error',error:e.message||'Local AI failed'})}
};

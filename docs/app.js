import {retrieveCandidates} from './candidate-search.js?v=cloud-9';
import {excludedGroupCode,isDirectPay,resultCategory,materialGroupType,groupTypeLabels,summarizeMaterialTypes} from './master-core.js?v=cloud-9';
import {openAssistant,cancelAssistant,suggest} from './assistant.js?v=cloud-9';
import {classifyBudget,budgetLabels} from './classification.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value).toLowerCase().normalize('NFKC');
const synonyms={'laptop':'notebook portable computer','ถุงมือ':'glove','เครื่องวัดความดัน':'blood pressure sphygmomanometer','คอมพิวเตอร์':'computer','โน้ตบุ๊ก':'notebook laptop','รถเข็น':'wheelchair','เตียง':'bed','หน้ากาก':'mask','เครื่องพิมพ์':'printer','เก้าอี้':'chair','แอร์':'air conditioner','กระดาษ':'paper'};
let db,groups,items=[],results=[],baseResults=[],shown=20,searched=false,browseAll=false,imageMode=false,image=null,selectedRecord=null,toastTimer;
const recordId=i=>i.kind+':'+i.code;
const budget=i=>budgetLabels[classifyBudget(i.g)];
const l0=i=>i.g.levels[0]?.some(Boolean)?i.g.levels[0].filter(Boolean).join(' · '):'ยังไม่มีข้อมูล L0';
const hasFilters=()=>['commodity','budget'].some(id=>$(id).value!=='');
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
async function copy(text,button){
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
  else throw Error();
 }catch{
  const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;top:0;left:0;opacity:.01';(document.querySelector('dialog[open]')||document.body).append(field);field.select();
  let success=false;try{success=document.execCommand('copy')}catch{}field.remove();button?.focus();
  if(!success){notify('คัดลอกไม่สำเร็จ กรุณาเลือกรหัสแล้วคัดลอกด้วยตนเอง');return}
 }
 notify('คัดลอกข้อมูลอ้างอิงแล้ว');
 if(button){const old=button.textContent;button.textContent='คัดลอกแล้ว ✓';setTimeout(()=>{if(button.isConnected)button.textContent=old},2000)}
 if($('detail').open)$('detailCopyStatus').textContent='คัดลอกข้อมูลแล้ว';
}
function tokensFor(query){const terms=normalize(query).split(/\s+/).filter(Boolean);for(const [term,expansion]of Object.entries(synonyms))if(normalize(query).includes(term))terms.push(...expansion.split(' '));return [...new Set(terms)]}
function search({scroll=false}={}){
 if(!db)return;
 shown=20;const query=$('query').value.trim(),q=normalize(query),tokens=tokensFor(query);
 const start=(!searched||!q)&&!browseAll;
 $('welcome').hidden=!start;$('resultSummary').hidden=start||!searched||!q;$('sort').disabled=start;$('emptyState').hidden=true;
 $('clearQuery').hidden=!query;
 renderFilters();
 if(start){results=[];$('groupMatchNotice').hidden=true;$('resultTitle').textContent='ข้อมูลอ้างอิง Material Master';$('status').textContent='เลือกคำแนะนำ หรือพิมพ์ชื่อสินค้าในช่องค้นหา';$('list').replaceChildren();$('more').hidden=true;return}
 baseResults=items.map(i=>{
  let score=q?(normalize(i.code)===q?1000:normalize(i.g.code)===q?500:normalize(i.name).includes(q)?100:normalize(i.g.name).includes(q)?60:0):1;
  if(q)for(const t of tokens)if(i.text.includes(t))score+=10;
  return {...i,score};
 }).filter(i=>i.score>0&&(!$('commodity').value||resultCategory(i).key===$('commodity').value));
 renderSummary();
 results=baseResults.filter(i=>!$('budget').value||materialGroupType(i.g)===$('budget').value);
 const matchedGroups=q?db.groups.filter(g=>normalize(g.code)===q||normalize(g.name).includes(q)).slice(0,3):[];
 $('groupMatchNotice').hidden=Boolean(baseResults.length||!matchedGroups.length);
 if(!baseResults.length&&matchedGroups.length)$('groupMatchNotice').textContent='พบ Material group '+matchedGroups.map(g=>g.code+' · '+g.name).join(', ')+' แต่ไม่พบ Material code ที่ตรงกับคำค้นและตัวกรองปัจจุบัน จึงยังไม่มีรหัสสินค้าให้เลือก';
 const sort=$('sort').value;
 results.sort((a,b)=>sort==='code'?a.code.localeCompare(b.code):sort==='name'?a.name.localeCompare(b.name):b.score-a.score||a.name.localeCompare(b.name));
 $('resultTitle').textContent=query?`ผลการค้นหา “${query}”`:'รายการใน Material Master';
 renderResults();
 if(scroll)$('resultsSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
function renderSummary(){
 const area=$('summaryCards');area.replaceChildren();
 $('resultSummary').hidden=!searched||!$('query').value.trim()||!baseResults.length;
 const buckets=[{key:'',name:'ทั้งหมด',total:baseResults.length},...summarizeMaterialTypes(baseResults)];
 for(const bucket of buckets){
  const button=document.createElement('button');button.type='button';button.className='summary-card';button.dataset.type=bucket.key;button.setAttribute('aria-pressed',String($('budget').value===bucket.key));
  button.setAttribute('aria-label',bucket.name+' '+bucket.total.toLocaleString()+' Material codes');
  button.innerHTML=`<span>${esc(bucket.name)}</span><b>${bucket.total.toLocaleString()}</b>`;
  button.onclick=()=>{const next=$('budget').value===bucket.key?'':bucket.key;$('budget').value=next;search();[...$('summaryCards').querySelectorAll('button')].find(b=>b.dataset.type===next)?.focus({preventScroll:true})};area.append(button);
 }
}
function renderFilters(){
 const area=$('activeFilters');area.replaceChildren();
 for(const id of ['commodity','budget']){
  const select=$(id);if(!select.value)continue;
  const b=document.createElement('button');b.textContent=select.selectedOptions[0].textContent+' ×';b.setAttribute('aria-label','ล้างตัวกรอง '+select.selectedOptions[0].textContent);b.onclick=()=>{select.value='';search()};area.append(b);
 }
 $('resetFilters').disabled=!hasFilters();
}
function renderResults(){
 $('status').textContent=`พบ ${results.length.toLocaleString()} Material codes${results.length?' · แสดง '+Math.min(shown,results.length).toLocaleString()+' รายการ':''}`;
 $('list').innerHTML=results.slice(0,shown).map((i,n)=>{
  const type=materialGroupType(i.g),gl=[...new Set(Object.values(i.g.gl))];
  return `<article class="card" aria-labelledby="result-${n}">
   <div class="card-top"><div><span class="record-type">${i.m?'MATERIAL CODE · รหัสใน MASTER':'MATERIAL GROUP · กลุ่มสินค้า'}</span><span class="code">${esc(i.code)}</span></div><span class="record-badges"><span class="badge badge-${type}">${esc(groupTypeLabels[type])}</span></span></div>
   <h3 id="result-${n}"><button class="result-link" data-detail="${n}">${esc(i.name)}</button></h3>
   <span class="l0"><b>L0</b> ${esc(l0(i))}</span>
   <dl class="card-meta"><div><dt>Material group</dt><dd>${esc(i.g.code)}<span class="group-name">${esc(i.g.name)}</span></dd></div><div><dt>GL account</dt><dd>${esc(gl.join(' / ')||'ยังไม่มีข้อมูล')}</dd></div><div><dt>Asset class</dt><dd>${esc(i.g.assets.join(', ')||'ยังไม่มีข้อมูล')}</dd></div></dl>
   <div class="card-actions"><button class="detail-action" data-detail="${n}" aria-label="ดูรายละเอียด ${esc(i.name)}">ดูรายละเอียด <span aria-hidden="true">→</span></button><button class="copy-action" data-copy="${n}" aria-label="คัดลอก ${i.m?'Material code':'Material group'} ${esc(i.code)}">${i.m?'คัดลอกรหัส':'คัดลอก Group'}</button></div>
  </article>`;
 }).join('');
 $('emptyState').hidden=results.length>0;$('emptyReset').hidden=!hasFilters();$('more').hidden=results.length<=shown;
 if(results.length>shown)$('more').firstChild.textContent=`แสดงอีก ${Math.min(20,results.length-shown)} รายการ `;
 for(const b of $('list').querySelectorAll('[data-detail]'))b.onclick=()=>detail(results[+b.dataset.detail]);
 for(const b of $('list').querySelectorAll('[data-copy]'))b.onclick=()=>copy(results[+b.dataset.copy].code,b);
}
function detail(i){
 selectedRecord=i;const g=i.g,type=classifyBudget(g);
 $('detailBody').innerHTML=`<section class="detail-identity"><span class="record-type">${i.m?'MATERIAL CODE · รหัสใน MASTER':'MATERIAL GROUP · กลุ่มสินค้า'}</span><h2 id="detailTitle">${esc(i.name)}</h2><div class="detail-code-row"><span class="code">${esc(i.code)}</span><button id="copyCode">${i.m?'คัดลอกรหัส':'คัดลอก Group'}</button><span class="badge badge-${type}">${esc(budget(i))}</span>${isDirectPay(g.code)?'<span class="route-badge">Direct Pay · Group Z*</span>':''}</div><p class="master-detail-note">เป็นข้อมูลใน Material Master ยังไม่ได้ยืนยันรายการ Catalog ระดับ Plant โปรดตรวจสอบก่อนเปิด PR</p>${!i.m?'<p class="group-warning">รายการนี้เป็นกลุ่มสินค้า ยังไม่ใช่ Material code สำหรับสินค้าเฉพาะรายการ</p>':''}</section>
 <section class="detail-section"><h3>ข้อมูลอ้างอิงส่วนกลาง</h3><dl class="detail-grid"><dt>Material group</dt><dd><strong>${esc(g.code)}</strong><br>${esc(g.name)}</dd><dt>หน่วยนับ / Type</dt><dd>${esc(i.m?i.m[3]+' / '+i.m[4]:'ไม่มีข้อมูลระดับสินค้า')}</dd><dt>Purchasing group</dt><dd>${esc(g.purchasingGroup||'ยังไม่มีข้อมูล')}</dd><dt>หมวดสินค้า · L0</dt><dd>${esc(l0(i))}</dd></dl></section>
 <section class="detail-section"><h3>บัญชีและประเภทค่าใช้จ่าย</h3><div class="account-list">${Object.entries(g.gl).map(([d,c])=>`<div class="account-row"><span>${esc(d==='A'?'GL-A · Admin expense':d==='C'?'GL-C · Cost':'GL-'+d)}</span><div><b>${esc(c)}</b><small>${esc(db.gl[c]||'ยังไม่มีคำอธิบายบัญชี')}</small></div></div>`).join('')||'<p class="field-hint">ยังไม่มี GL mapping ในข้อมูลอ้างอิง</p>'}${g.assets.map(a=>`<div class="account-row"><span>Asset class</span><div><b>${esc(a)}</b><small>${esc(db.assets[a]||'ยังไม่มีคำอธิบาย')}</small></div></div>`).join('')}</div><div class="info-box"><b>${esc(budget(i))}</b><p>${type==='both'?'มีทั้ง Asset class และ GL-A/GL-C จึงใช้ได้ทั้ง CAPEX และ OPEX ให้เลือกตามวัตถุประสงค์ของ PR':type==='capex'?'จัดเป็น CAPEX จาก Asset class ที่ผูกใน master':type==='opex'?'จัดเป็น OPEX จาก GL-A หรือ GL-C ที่ผูกใน master':'ยังไม่มี Asset class หรือ GL-A/GL-C เพียงพอสำหรับจัดประเภท โปรดให้ทีมบัญชีตรวจสอบ'}</p></div></section>
 <section class="detail-section"><h3>Data taxonomy · L0–L4</h3><ol class="taxonomy">${g.levels.map((l,n)=>l.some(Boolean)?`<li><span>L${n}</span><div><b>${esc(l[0])}</b><small>${esc(l[1])}</small></div></li>`:'').join('')||'<li>ยังไม่มีข้อมูล Taxonomy</li>'}</ol></section><p class="field-hint">อ้างอิง master snapshot 30 ต.ค. 2026 · ตรวจชนิด ขนาด และวัตถุประสงค์การใช้ก่อนเปิด PR</p>`;
 $('copyCode').onclick=()=>copy(i.code,$('copyCode'));$('detailCopyStatus').textContent='';
 if(!$('detail').open)$('detail').showModal();
 $('detailBody').scrollTop=0;
}
function summary(i){return [i.name,i.m?'Material code: '+i.code:'Material code: ไม่มี (รายการระดับกลุ่ม)','Material group: '+i.g.code+' — '+i.g.name,'L0: '+l0(i),'ประเภทค่าใช้จ่าย: '+budget(i),'ประเภทกลุ่ม: '+(isDirectPay(i.g.code)?'Direct Pay (Z*)':'ตาม Commodity L0'),...Object.entries(i.g.gl).map(([d,c])=>'GL-'+d+': '+c+' — '+(db.gl[c]||'')),'Asset class: '+(i.g.assets.join(', ')||'ยังไม่มีข้อมูล'),...i.g.levels.flatMap((l,n)=>l.some(Boolean)?['L'+n+': '+l[0]+' — '+l[1]]:[]),'อ้างอิง Material Master 30 ต.ค. 2026','ไม่มีข้อมูล Catalog ระดับ Plant ในระบบนี้ โปรดตรวจสอบก่อนนำไปเปิด PR'].join('\n')}
function resetFilters(){for(const id of ['commodity','budget'])$(id).value='';browseAll=false;search()}
function setMode(isImage){
 imageMode=isImage;$('textSearchPanel').hidden=isImage;$('imagePanel').hidden=!isImage;
 for(const [id,selected]of [['textTab',!isImage],['imageTab',isImage]]){$(id).setAttribute('aria-selected',String(selected));$(id).tabIndex=selected?0:-1}
 $('searchButtonLabel').textContent=isImage?'ค้นหาจากภาพด้วย AI':'ค้นหารายการ';
 $('searchHint').textContent=isImage?'แนบภาพเพื่อให้ AI cloud ช่วยค้นหารายการใน Master':'ค้นหาได้ทั้งภาษาไทย อังกฤษ และรหัสสินค้า';
}
function removeImage(){image=null;$('imageError').hidden=true;$('photo').value='';$('imageSelected').hidden=true;$('preview').removeAttribute('src');$('assistantImageNote').hidden=true}

async function askAI({fromDrawer=false}={}){
 if(fromDrawer){if(imageMode)$('imageQuery').value=$('assistantQuery').value;else $('query').value=$('assistantQuery').value}
 const query=imageMode?$('imageQuery').value:$('query').value;
 if(!db){openAssistant();$('assistantStatus').textContent='กำลังเตรียม master data โปรดรอสักครู่ แล้วกดวิเคราะห์อีกครั้ง';return}
 await suggest(query,imageMode?image:null,terms=>retrieveCandidates(items,terms),id=>{const i=items.find(i=>recordId(i)===id);if(i)detail(i)});
}
$('form').onsubmit=e=>{e.preventDefault();if(imageMode){if(!image){notify('เลือกรูปสินค้าก่อนเริ่มค้นหาจากภาพ');$('photo').focus();return}askAI()}else{if(!$('query').value.trim()){notify('พิมพ์ชื่อ รหัสสินค้า หรือ Material group ก่อนค้นหา');$('query').focus();return}searched=true;browseAll=false;search({scroll:true})}};
for(const id of ['commodity','budget','sort'])$(id).onchange=()=>search();
for(const b of document.querySelectorAll('[data-q]'))b.onclick=()=>{setMode(false);$('query').value=b.dataset.q;searched=true;browseAll=false;search({scroll:true})};
for(const b of document.querySelectorAll('[data-commodity]'))b.onclick=()=>{setMode(false);$('query').value='';$('commodity').value=b.dataset.commodity;searched=false;browseAll=true;search({scroll:true})};
document.querySelector('.skip-link').onclick=()=>setMode(false);
$('query').oninput=()=>{$('clearQuery').hidden=!$('query').value;if(!$('query').value.trim()){searched=false;browseAll=false;search()}};
$('clearQuery').onclick=()=>{$('query').value='';searched=false;browseAll=false;search();$('query').focus()};
$('resetFilters').onclick=resetFilters;$('emptyReset').onclick=resetFilters;
$('browseAll').onclick=()=>{searched=false;browseAll=true;search()};
$('more').onclick=()=>{const old=shown;shown+=20;renderResults();$('list').querySelector(`[data-detail="${old}"]`)?.focus({preventScroll:true})};
$('detail').querySelector('.close').onclick=()=>$('detail').close();$('closeDetail').onclick=()=>$('detail').close();$('copySummary').onclick=()=>{if(selectedRecord)copy(summary(selectedRecord),$('copySummary'))};
for(const id of ['detail','helpDialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close()}});
$('helpButton').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
$('settings').onclick=openAssistant;$('sidebarAI').onclick=openAssistant;$('aiButton').onclick=()=>askAI();
$('closeAssistant').onclick=()=>$('assistantPanel').close();$('assistantPanel').addEventListener('close',()=>$('assistantPanel').hidden=true);
$('cancelAI').onclick=cancelAssistant;$('sendContext').onclick=()=>askAI({fromDrawer:true});
$('textTab').onclick=()=>setMode(false);$('imageTab').onclick=()=>setMode(true);
for(const id of ['textTab','imageTab'])$(id).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const isImage=e.key==='End'||(['ArrowLeft','ArrowRight'].includes(e.key)&&id==='textTab');setMode(isImage);$(isImage?'imageTab':'textTab').focus()}};
$('removeImage').onclick=removeImage;
$('photo').onchange=()=>{
 const file=$('photo').files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){removeImage();$('imageError').textContent='ใช้รูป JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB กรุณาเลือกรูปใหม่';$('imageError').hidden=false;return}
 $('imageError').hidden=true;const reader=new FileReader();reader.onload=()=>{image=reader.result;$('preview').src=image;$('photoName').textContent=file.name;$('imageSelected').hidden=false};reader.onerror=()=>{$('imageError').textContent='อ่านรูปไม่สำเร็จ กรุณาเลือกรูปใหม่';$('imageError').hidden=false};reader.readAsDataURL(file);
};
document.addEventListener('keydown',e=>{const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if(e.key==='/'&&!editing&&!document.querySelector('dialog[open]')){e.preventDefault();setMode(false);$('query').focus()}});
const mobileFilters=matchMedia('(max-width: 800px)');const resizeFilters=()=>$('filterPanel').open=!mobileFilters.matches;resizeFilters();mobileFilters.addEventListener('change',resizeFilters);
async function loadMaster(){
 $('resultSummary').hidden=true;$('dataError').hidden=true;$('searchButton').disabled=true;$('resultsSection').setAttribute('aria-busy','true');$('stats').textContent='กำลังเตรียมข้อมูลสำหรับค้นหา…';$('status').textContent='กำลังโหลดข้อมูล…';$('welcome').hidden=true;$('emptyState').hidden=true;$('more').hidden=true;$('list').innerHTML='<div class="skeleton" aria-hidden="true"></div><div class="skeleton" aria-hidden="true"></div><div class="skeleton" aria-hidden="true"></div>';
 try{
  const response=await fetch('data.json?v=cloud-9',{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error();
  db=await response.json();db.groups=db.groups.filter(g=>!excludedGroupCode(g.code));db.materials=db.materials.filter(m=>!excludedGroupCode(m[2]));groups=new Map(db.groups.map(g=>[g.code,g]));
  const fallback=code=>({code,name:'ยังไม่มีข้อมูลกลุ่มสินค้า',levels:[],gl:{},assets:[],keywords:[]});
  items=db.materials.map(m=>({kind:'materials',code:m[0],name:m[1],m,g:groups.get(m[2])||fallback(m[2])}));
  for(const i of items)i.text=normalize([i.code,i.name,i.g.code,i.g.name,isDirectPay(i.g.code)?'direct pay จ่ายตรง':'',...i.g.levels.flat(),...i.g.keywords].join(' '));
  const categories=new Map(items.map(i=>{const c=resultCategory(i);return [c.key,c]}));
  $('commodity').innerHTML='<option value="">ทุกหมวดผลค้นหา</option>';
  for(const [key,category]of [...categories].sort((a,b)=>a[0].localeCompare(b[0]))){const option=document.createElement('option');option.value=key;option.textContent=category.label;$('commodity').append(option)}
  const commodityCount=new Set(db.groups.filter(g=>g.levels[0]?.[0]).map(g=>g.levels[0][0])).size;
  $('stats').innerHTML=`<span><b>${db.materials.length.toLocaleString()}</b> รหัสสินค้า</span><span><b>${db.groups.length.toLocaleString()}</b> กลุ่มสินค้า</span><span><b>${commodityCount}</b> หมวด L0</span>`;
  $('searchButton').disabled=false;search();
 }catch{db=null;$('dataError').hidden=false;$('stats').textContent='ยังไม่พร้อมค้นหา · กรุณาโหลดข้อมูลใหม่';$('status').textContent='โหลด master data ไม่สำเร็จ';$('list').replaceChildren()}
 finally{$('resultsSection').setAttribute('aria-busy','false')}
}
$('retryData').onclick=loadMaster;
loadMaster();

const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const artifacts=process.env.UI_ARTIFACT_DIR||path.join(require('os').tmpdir(),'material-finder-ui');
fs.mkdirSync(artifacts,{recursive:true});
const root=path.resolve(__dirname,'../docs');
const master=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://local').pathname.replace(/^\/$/,'/index.html'));
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[],violations=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.workerMode='success';window.aiCandidates=[];
  window.Worker=class{
   postMessage(data){setTimeout(()=>{
    if(window.workerMode==='wait')return;
    if(window.workerMode==='fail')return this.onmessage({data:{id:data.id,type:'error',error:'Test download error'}});
    if(data.candidates)window.aiCandidates=data.candidates;
    const result=data.task==='topics'?[{id:1,en:'disposable examination gloves',th:'ถุงมือตรวจโรค',terms:['glove'],score:.8}]:data.candidates.map((c,i)=>({id:c.id,score:1-i*.01}));
    this.onmessage({data:{id:data.id,type:'result',result}});
   },25)}
   terminate(){}
  };
 });
 const base=`http://127.0.0.1:${server.address().port}/`;
 async function axe(name){
  if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:process.env.AXE_SCRIPT_PATH||require.resolve('axe-core/axe.min.js')});
  const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
  console.log('AXE',name,result.violations.map(v=>({id:v.id,impact:v.impact})));violations.push(...result.violations);
 }
 async function query(text){await page.locator('#query').fill(text);await page.locator('#searchButton').click()}
 async function onlyMaterials(){
  const labels=await page.locator('#list .record-type').allTextContents();assert.ok(labels.length);assert.ok(labels.every(t=>t.includes('MATERIAL CODE')));
 }
 await page.goto(base);await page.waitForSelector('#welcome:not([hidden])');
 assert.equal(await page.locator('.brand-logo').evaluate(el=>el.complete&&el.naturalWidth>0),true);
 assert.equal(await page.locator('#kind').count(),0);
 assert.equal(await page.locator('#resultSummary').isHidden(),true);assert.equal(await page.locator('.card').count(),0);
 await page.selectOption('#budget','direct-pay');assert.equal(await page.locator('#resultSummary').isHidden(),true);assert.equal(await page.locator('.card').count(),0);
 await page.locator('#resetFilters').click();await axe('home');
 await page.screenshot({path:path.join(artifacts,'home.png'),fullPage:true});
 await page.locator('#browseAll').click();await onlyMaterials();assert.equal(await page.locator('#resultSummary').isHidden(),true);
 await page.locator('.brand').click();await page.waitForSelector('#welcome:not([hidden])');
 // An exact group-code query must retrieve the linked material codes, not a group card.
 const linked=master.groups.find(g=>g.code==='B01031011');assert.ok(linked);
 const expected=master.materials.filter(m=>m[2]===linked.code).length;
 await query(linked.code);await onlyMaterials();assert.ok((await page.locator('#status').innerText()).includes(expected.toLocaleString()+' Material codes'));
 assert.equal(await page.locator('#resultSummary').isVisible(),true);
 const counts=await page.locator('.summary-card b').allTextContents();const values=counts.map(n=>Number(n.replaceAll(',','')));assert.equal(values[0],expected);assert.equal(values.slice(1).reduce((a,b)=>a+b,0),expected);
 const geometry=await page.locator('.summary-card').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,height:n.getBoundingClientRect().height})));
 assert.ok(geometry.every(n=>n.top===geometry[0].top&&n.height<=48),'Summary must remain one compact row');
 await page.locator('#resultSummary').screenshot({path:path.join(artifacts,'compact-types.png')});await axe('compact-type-facets');
 await page.locator('.copy-action').first().click();assert.ok(await page.evaluate(()=>navigator.clipboard.readText()));
 await page.locator('.detail-action').first().click();assert.match(await page.locator('#detailBody').innerText(),/GL-A/);
 await page.locator('#copySummary').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Catalog ระดับ Plant/);await axe('detail');await page.keyboard.press('Escape');
 const direct=master.materials.find(m=>m[2].startsWith('Z'));assert.ok(direct);
 await query(direct[0]);await page.locator('[data-type="direct-pay"]').click();assert.equal(await page.locator('#budget').inputValue(),'direct-pay');assert.equal(await page.locator('[data-type="direct-pay"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.card').count(),1);assert.match(await page.locator('.card .badge').innerText(),/Direct Pay/);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.type),'direct-pay');
 await page.locator('[data-type="direct-pay"]').click();assert.equal(await page.locator('#budget').inputValue(),'');
 // A group without a linked material remains searchable as context, never selectable as a product.
 const linkedCodes=new Set(master.materials.map(m=>m[2]));const emptyGroup=master.groups.find(g=>!linkedCodes.has(g.code));await query(emptyGroup.code);
 assert.equal(await page.locator('.card').count(),0);assert.equal(await page.locator('#groupMatchNotice').isVisible(),true);assert.match(await page.locator('#groupMatchNotice').innerText(),new RegExp(emptyGroup.code));
 await query(linked.name);await onlyMaterials();
 await query('glove');await page.locator('#more').click();assert.equal(await page.locator('.card').count(),40);await page.selectOption('#sort','code');
 const codes=await page.locator('.card .code').allTextContents();assert.deepEqual(codes,[...codes].sort((a,b)=>a.localeCompare(b)));
 await query('nonexistent999999');assert.equal(await page.locator('#emptyState').isVisible(),true);await page.locator('#aiButton').click();
 await page.locator('#assistantQuery').fill('ถุงมือ');await page.locator('#sendContext').click();await page.waitForSelector('.aiRecommendation');
 assert.ok(await page.evaluate(()=>window.aiCandidates.every(c=>c.materialCode&&c.id.startsWith('materials:'))),'AI must only recommend material-code candidates');
 await axe('AI');await page.locator('.aiRecommendation button').first().click();assert.equal(await page.locator('#detail').isVisible(),true);await page.keyboard.press('Escape');
 await page.evaluate(()=>window.workerMode='wait');await page.locator('#sendContext').click();await page.locator('#cancelAI').click();await page.waitForFunction(()=>!document.getElementById('sendContext').disabled);assert.match(await page.locator('#assistantStatus').innerText(),/ยกเลิก/);
 await page.evaluate(()=>window.workerMode='fail');await page.locator('#sendContext').click();await page.waitForFunction(()=>!document.getElementById('sendContext').disabled);assert.match(await page.locator('#assistantOutput').innerText(),/ไม่ใช่ผล AI/);await page.keyboard.press('Escape');
 await page.locator('#clearQuery').click();assert.equal(await page.locator('#resultSummary').isHidden(),true);assert.equal(await page.locator('.card').count(),0);
 await page.locator('#imageTab').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#textTab').getAttribute('aria-selected'),'true');
 await page.locator('#helpButton').click();assert.equal(await page.locator('#helpDialog').isVisible(),true);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await query('glove');await onlyMaterials();await axe('mobile-results');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const mobileGeometry=await page.locator('.summary-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));assert.ok(mobileGeometry.every(n=>n===mobileGeometry[0]));
 await page.locator('#resultsSection').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,'mobile-materials.png')});
 await page.locator('#settings').click();assert.equal(await page.locator('.aiRecommendation').count(),0);await page.keyboard.press('Escape');
 await page.locator('#imageTab').click();await page.locator('#photo').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('bad image')});assert.equal(await page.locator('#imageError').isVisible(),true);
 await page.setViewportSize({width:320,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const retryPage=await context.newPage();let requests=0;await retryPage.route('**/data.json*',r=>++requests===1?r.fulfill({status:503,body:'Unavailable'}):r.continue());await retryPage.goto(base);await retryPage.waitForSelector('#dataError:not([hidden])');await retryPage.locator('#retryData').click();await retryPage.waitForSelector('#welcome:not([hidden])');
 assert.deepEqual(errors,[]);assert.deepEqual(violations.map(v=>v.id),[]);
 console.log('PASS: material-code-only results/AI, group code/name search, unlinked group notice, Direct Pay, search-only compact row, counts, copy, keyboard, cancellation, mobile and accessibility');
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});

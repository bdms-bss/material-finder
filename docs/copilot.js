// Custom canvas SSO based on Microsoft's complete Entra ID sample:
// https://github.com/microsoft/CopilotStudioSamples/tree/main/sso/entra-id
let config, msalClient, account, directLine, store, ready=false, connecting=null;
const el=id=>document.getElementById(id);
export function validateConfig(c){
  if(!c)return false;
  const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!guid.test(c.tenantId)||!guid.test(c.clientId)||!c.tokenExchangeScope)return false;
  try {const u=new URL(c.tokenEndpoint);return u.protocol==='https:'&&/\.(environment\.api\.powerplatform\.com|api\.powerva\.microsoft\.com|api\.powerplatform\.com)$/.test(u.hostname)&&!u.username&&!u.password;}catch{return false}
}
function status(text){el('copilotStatus').textContent=text;}
function script(src,check){if(check())return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>check()?resolve():reject(Error('โหลด Microsoft library ไม่สำเร็จ'));s.onerror=()=>{s.remove();reject(Error('โหลด Microsoft library ไม่สำเร็จ กรุณาลองใหม่'))};document.head.append(s)})}
export async function openCopilot(){el('copilotPanel').hidden=false;try{config??=await (await fetch('copilot-config.json')).json();if(!validateConfig(config)){status('ยังไม่ได้เชื่อมต่อ agent ขององค์กร — รอผู้ดูแลตั้งค่า Copilot Studio และ Microsoft Entra ID');el('copilotLogin').disabled=true;return}el('copilotLogin').disabled=false;status(account?`ลงชื่อเข้าใช้แล้ว: ${account.name||account.username}`:'ลงชื่อเข้าใช้ด้วยบัญชี Microsoft ขององค์กรเพื่อเริ่มสนทนา')}catch{status('โหลดการตั้งค่า Copilot ไม่สำเร็จ')}}
async function connect(){if(ready)return;if(connecting)return connecting;connecting=(async()=>{await script('https://cdn.botframework.com/botframework-webchat/4.18.0/webchat.js',()=>Boolean(window.WebChat));
 const res=await fetch(config.tokenEndpoint,{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('เชื่อมต่อ agent ไม่สำเร็จ');const {token}=await res.json();if(!token)throw Error('ไม่พบ conversation token');
 const userID=account.localAccountId.slice(0,64);
 directLine=window.WebChat.createDirectLine({token});
 store=window.WebChat.createStore({},({dispatch})=>next=>action=>{
  if(action.type==='DIRECT_LINE/CONNECT_FULFILLED')dispatch({type:'DIRECT_LINE/POST_ACTIVITY',payload:{activity:{type:'event',name:'startConversation',channelData:{postBack:true}}}});
  if(action.type==='DIRECT_LINE/INCOMING_ACTIVITY'){
   const activity=action.payload.activity;
   const attachment=activity.from?.role==='bot'?activity.attachments?.find(a=>a.contentType==='application/vnd.microsoft.card.oauth'&&a.content?.tokenExchangeResource):null;
   if(attachment){const card=attachment.content;
    if(card.tokenExchangeResource.uri!==config.tokenExchangeScope)return next(action);
    msalClient.acquireTokenSilent({account,scopes:[config.tokenExchangeScope]}).then(r=>{directLine.postActivity({type:'invoke',name:'signin/tokenExchange',from:{id:userID,name:account.name||account.username,role:'user'},value:{id:card.tokenExchangeResource.id,connectionName:card.connectionName,token:r.accessToken}}).subscribe(id=>{if(id==='retry')next(action)},()=>next(action))}).catch(()=>next(action));return;
   }
  }return next(action);
 });
 window.WebChat.renderWebChat({directLine,store,userID,username:account.name||account.username,locale:'th-TH',styleOptions:{accent:'#007f83',hideUploadButton:false,botAvatarInitials:'AI',userAvatarInitials:'คุณ'}},el('webchat'));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{sub.unsubscribe();reject(Error('เชื่อมต่อแชตหมดเวลา'))},25000);const sub=directLine.connectionStatus$.subscribe(s=>{if(s===2){clearTimeout(timer);resolve()}if(s===4||s===5){clearTimeout(timer);ready=false;el('copilotLogin').hidden=false;el('copilotLogout').hidden=true;status('การเชื่อมต่อแชตสิ้นสุด กรุณาลงชื่อเข้าใช้อีกครั้ง');reject(Error('การเชื่อมต่อแชตสิ้นสุด กรุณา login ใหม่'))}})});
 ready=true;status(`เชื่อมต่อ Copilot แล้ว · ${account.name||account.username}`);el('copilotLogout').hidden=false;el('copilotLogin').hidden=true;
})().catch(e=>{directLine?.end();directLine=null;store=null;ready=false;throw e}).finally(()=>{connecting=null});return connecting}
export async function loginCopilot(){el('copilotLogin').disabled=true;try{if(!validateConfig(config))throw Error('ยังไม่ได้ตั้งค่า agent');await script('https://alcdn.msauth.net/browser/2.32.0/js/msal-browser.min.js',()=>Boolean(window.msal));msalClient??=new window.msal.PublicClientApplication({auth:{clientId:config.clientId,authority:`https://login.microsoftonline.com/${config.tenantId}`,redirectUri:config.redirectUri},cache:{cacheLocation:'sessionStorage',storeAuthStateInCookie:false}});const result=await msalClient.loginPopup({scopes:['openid','profile',config.tokenExchangeScope],prompt:'select_account'});account=result.account;if(account.tenantId.toLowerCase()!==config.tenantId.toLowerCase())throw Error('กรุณาใช้บัญชีองค์กรที่กำหนด');msalClient.setActiveAccount(account);await connect()}catch(e){status(e.message||'ลงชื่อเข้าใช้ไม่สำเร็จ')}finally{el('copilotLogin').disabled=false}}
export async function logoutCopilot(){ready=false;directLine?.end();directLine=null;store=null;el('webchat').replaceChildren();el('copilotLogout').hidden=true;el('copilotLogin').hidden=false;const old=account;account=null;status('ออกจาก Copilot แล้ว');if(msalClient&&old)try{await msalClient.logoutPopup({account:old,postLogoutRedirectUri:config.redirectUri})}catch{status('ปิดแชตแล้ว แต่ Microsoft sign-out ไม่สำเร็จ กรุณาออกจากบัญชี Microsoft โดยตรง')}}
export async function sendToCopilot(query,image,candidates){await openCopilot();if(!ready){status(validateConfig(config)?'กรุณากดลงชื่อเข้าใช้ จากนั้นกดถาม Copilot อีกครั้ง':'ยังไม่ได้เชื่อมต่อ agent ขององค์กร — ผู้ดูแลต้องตั้งค่าก่อน');return}
 const text=`ช่วยหา Material code / Material group สำหรับ: ${query||'สินค้าจากรูปภาพแนบ'}\nข้อมูลต่อไปนี้เป็น candidate จาก master ตามคำค้นปัจจุบัน ไม่ใช่ catalog ทั้งหมด หากไม่ตรงให้แนะนำคำค้นไทย/อังกฤษใหม่และถามข้อมูลเพิ่ม ห้ามสร้างรหัสที่ไม่มีในข้อมูล\nเกณฑ์: มี Asset class = CAPEX; มี GL-A/GL-C = OPEX; มีทั้งสอง = CAPEX/OPEX\nข้อมูล candidate:\n${JSON.stringify(candidates)}\nโปรดตอบเป็นภาษาไทย พร้อม Material code, Material group, Commodity L0, Taxonomy L0-L4, GL และ Asset class ที่พบ อธิบายเหตุผลและความไม่แน่ใจ`;
 const activity={type:'message',text,from:{id:account.localAccountId.slice(0,64),name:account.name||account.username,role:'user'}};
 if(image)activity.attachments=[{contentType:image.slice(5,image.indexOf(';')),contentUrl:image,name:'material-image'}];
 status('กำลังส่งคำถามและ candidate ไปยัง Copilot ขององค์กร…');directLine.postActivity(activity).subscribe(id=>{if(id==='retry')status('ส่งไม่สำเร็จ กรุณาลองใหม่');else status('ส่งแล้ว · คำตอบจะแสดงในแชต Copilot')},()=>status('ส่งไม่สำเร็จ กรุณาลองใหม่ หรือแนบรูปในช่องแชตโดยตรง'));
}

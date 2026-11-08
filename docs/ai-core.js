export const MODELS = [
  ['openai/gpt-4.1-mini', 'OpenAI · GPT-4.1 mini'],
  ['google/gemini-2.5-flash', 'Google · Gemini 2.5 Flash'],
  ['anthropic/claude-sonnet-4.5', 'Anthropic · Claude Sonnet 4.5'],
];
export const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function pkceChallenge(verifier) {
  return base64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
}
export function validCallback(pending,state,now=Date.now()) {
  return Boolean(pending && typeof pending.verifier==='string' && pending.verifier.length>=43 && typeof state==='string' && state && pending.state===state && now>=pending.created && now-pending.created<600000);
}
export function parseJson(content) {
  if(typeof content!=='string')throw Error('AI ไม่ส่งคำตอบข้อความ');
  return JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));
}
export function verifiedRecommendations(output,candidates) {
  const allowed=new Map(candidates.map(c=>[c.id,c]));
  const seen=new Set();
  return (Array.isArray(output.suggestions)?output.suggestions:[]).filter(s=>typeof s?.id==='string'&&allowed.has(s.id)&&!seen.has(s.id)&&seen.add(s.id)).slice(0,6).map(s=>({record:allowed.get(s.id),reason:typeof s.reason==='string'?s.reason.slice(0,800):''}));
}

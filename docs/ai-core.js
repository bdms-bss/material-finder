// A recommendation can only refer to a candidate already retrieved from the master.
export function verifiedRanks(candidates,ranks,limit=6){
 const allowed=new Map(candidates.map(c=>[c.id,c])),seen=new Set();
 return ranks.filter(r=>typeof r?.id==='string'&&Number.isFinite(r.score)&&allowed.has(r.id)&&!seen.has(r.id)&&seen.add(r.id)).slice(0,limit).map(r=>({record:allowed.get(r.id),score:r.score}));
}

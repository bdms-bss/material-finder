// Business rule confirmed by BDMS BSS: asset mapping = CAPEX; GL-A/C = OPEX.
export function classifyBudget(group) {
  const capex = Boolean(group.assets?.length);
  const opex = Boolean(group.gl?.A || group.gl?.C);
  return capex && opex ? 'both' : capex ? 'capex' : opex ? 'opex' : 'unknown';
}
export const budgetLabels = {capex:'CAPEX',opex:'OPEX',both:'CAPEX / OPEX',unknown:'ไม่พบข้อมูลจัดประเภท'};

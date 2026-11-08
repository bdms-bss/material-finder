import openpyxl,json,sys,pathlib,collections
w=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
def rows(s,n):
 for r in w[s].iter_rows(min_row=n,values_only=True):
  yield ['' if v is None else str(v).strip() for v in r]
groups={}
for r in rows('sap_MaterialGroup',6):
 if r[1]: groups[r[1]]={'code':r[1],'name':r[2],'levels':[],'gl':{},'assets':[],'keywords':[]}
for r in rows('Master_DataTaxonomy',5):
 if r[11] in groups:
  g=groups[r[11]]; g['levels']=[[r[i],r[i+1]] for i in (1,3,5,7,9)]; g['keywords']=[x for x in r[13:17] if x];g['purchasingGroup']=r[17]
for r in rows('sap_MaterialGroup_GL',6):
 if r[1] in groups and r[2] and r[3]:groups[r[1]]['gl'][r[2]]=r[3]
for r in rows('sap_MaterialGroup_Asset',6):
 if r[1] in groups and r[2] and r[2] not in groups[r[1]]['assets']:groups[r[1]]['assets'].append(r[2])
capex={r[5] for r in rows('Master_MaterialCAPEX',6) if r[5]}
materials=[]
for r in rows('sap_MaterialCode',6):
 if r[1]:materials.append([r[1],r[2],r[5],r[3],r[4],bool(r[7]),r[1] in capex])
data={'groups':list(groups.values()),'materials':materials,'gl':{r[1]:r[3] for r in rows('sap_GL',5) if r[1]},'assets':{r[1]:r[2] for r in rows('sap_AssetClass',5) if r[1]},'source':'H BDMS DCT-PRD-DataTaxonomy(20261030).xlsx','date':'2026-10-30'}
p=pathlib.Path(__file__).resolve().parents[1]/'docs/data.json';p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'materials':len(materials),'groups':len(groups),'capex':len(capex),'bytes':p.stat().st_size}))

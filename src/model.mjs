export const TROY_OUNCE_GRAMS = 31.1034768;
export const DEFAULT_FX = 3.6725;
export const CATEGORIES = [
 {id:'rent',name:'Rent & housing',icon:'house',color:'#516782'},
 {id:'utilities',name:'Utilities',icon:'zap',color:'#96b6a3'},
 {id:'groceries',name:'Groceries',icon:'shopping-basket',color:'#80a1bd'},
 {id:'dining',name:'Dining & coffee',icon:'coffee',color:'#c8aa7b'},
 {id:'transport',name:'Transport',icon:'car',color:'#9a98b6'},
 {id:'shopping',name:'Shopping',icon:'shopping-bag',color:'#bd96a1'},
 {id:'health',name:'Health',icon:'heart-pulse',color:'#8faab0'},
 {id:'subscriptions',name:'Subscriptions',icon:'repeat',color:'#a9b581'},
 {id:'other',name:'Other spending',icon:'shapes',color:'#a4aab3'}
];
export const PRESETS=[
 {id:'ada',name:'Cardano',symbol:'ADA',type:'crypto',providerId:'cardano',marketSymbol:'ADA-USD',color:'#4275be',mark:'A'},
 {id:'flux',name:'Flux',symbol:'FLUX',type:'crypto',providerId:'zelcash',marketSymbol:'FLUX-USD',color:'#446be0',mark:'F'},
 {id:'render',name:'Render',symbol:'RENDER',type:'crypto',providerId:'render-token',marketSymbol:'RENDER-USD',color:'#b95057',mark:'R'},
 {id:'xrp',name:'XRP',symbol:'XRP',type:'crypto',providerId:'ripple',marketSymbol:'XRP-USD',color:'#353f4f',mark:'X'},
 {id:'gold',name:'24k physical gold',symbol:'XAU',type:'gold',providerId:'XAU',marketSymbol:'GC=F',color:'#b59550',mark:'Au'}
];
export const TYPES={expense:'Expense',income:'Income',refund:'Refund',transfer:'Transfer',investment:'Investment'};
export const uid=()=>globalThis.crypto.randomUUID();
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const monthNow=()=>localDate().slice(0,7);
export const sum=a=>a.reduce((s,n)=>s+n,0);
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function freshState(){return {version:1,settings:{currency:'AED',fx:DEFAULT_FX,autoRefresh:true},holdings:PRESETS.map(h=>({...h,quantity:0,costUSD:null,manualUSD:null})),plans:{},transactions:[],quotes:{},snapshots:[],imports:[]};}
export function defaultPlan(){return {income:0,reserve:0,categories:Object.fromEntries(CATEGORIES.map(c=>[c.id,0]))};}
export function monthlySummary(state,month){
 const plan=state.plans[month]||defaultPlan(),rows=state.transactions.filter(t=>t.date.startsWith(month));
 const actual=Object.fromEntries(CATEGORIES.map(c=>[c.id,round(sum(rows.filter(t=>t.category===c.id).map(t=>t.type==='expense'?t.amount:t.type==='refund'?-t.amount:0)))]));
 const spent=round(sum(Object.values(actual))),planned=round(sum(Object.values(plan.categories)));
 const income=round(sum(rows.filter(t=>t.type==='income').map(t=>t.amount))),invested=round(sum(rows.filter(t=>t.type==='investment').map(t=>t.amount)));
 const remaining=round(sum(CATEGORIES.map(c=>Math.max(0,(plan.categories[c.id]||0)-(actual[c.id]||0)))));
 const projected=round(spent+remaining);
 return {plan,rows,actual,spent,planned,income,invested,remaining,projected,room:round(plan.income-projected-plan.reserve-invested),cashRemainder:round(income-spent-invested),over:Math.max(0,round(spent-planned)),hasPlan:!!state.plans[month]};
}
export function holdingValue(h,quotes){const q=quotes[h.id];const price=h.manualUSD??q?.priceUSD;return {price,source:h.manualUSD!==null&&h.manualUSD!==undefined?'Manual':q?.source||'Unavailable',quote:q,value:price==null?null:h.quantity*price,cost:h.costUSD==null?null:h.quantity*h.costUSD};}
export function portfolioSummary(state){
 let total=0,cost=0,pricedCost=0,gain=0,missing=0,unknownCost=0;
 const allocation={crypto:0,etf:0,gold:0};
 for(const h of state.holdings){const v=holdingValue(h,state.quotes);if(h.quantity<=0)continue;if(v.value==null){missing++;continue;}total+=v.value;allocation[h.type]+=v.value;if(v.cost==null){unknownCost++;continue;}cost+=v.cost;pricedCost+=v.value;gain+=v.value-v.cost;}
 return {total,cost,gain,returnPct:cost>0?gain/cost*100:null,missing,unknownCost,allocation};
}
export function fingerprint(t){return `${t.account.trim().toLowerCase()}|${t.date}|${t.description.trim().toLowerCase().replace(/\s+/g,' ')}|${round(t.amount).toFixed(2)}|${t.type}`;}
export function duplicateFlags(rows,existing){const seen=new Set(existing.map(fingerprint));return rows.map(t=>{const key=fingerprint(t),duplicate=seen.has(key);seen.add(key);return duplicate;});}
export function classify(description){
 const s=description.toLowerCase();
 if(/salary|payroll|wages/.test(s))return {type:'income',category:'other'};
 if(/credit card payment|cc payment|internal transfer|own account|card settlement/.test(s))return {type:'transfer',category:'other'};
 if(/broker|binance|coinbase|kraken|interactive brokers|investment/.test(s))return {type:'investment',category:'other'};
 const rules=[['rent',/rent|landlord|housing|property/],['utilities',/dewa|sewa|etisalat|du telecom|electric|water bill|internet|utility/],['groceries',/carrefour|lulu|spinneys|waitrose|grocer|supermarket|aldi|tesco/],['dining',/talabat|deliveroo|restaurant|cafe|coffee|starbucks|mcdonald|dining/],['transport',/uber|careem|taxi|metro|rta|salik|petrol|enoc|adnoc|fuel/],['subscriptions',/netflix|spotify|apple.com|subscription|youtube|openai/],['health',/hospital|pharmacy|clinic|medical|dental/],['shopping',/amazon|noon|mall|ikea|zara|shop/]];
 return {type:/refund|reversal/.test(s)?'refund':'expense',category:rules.find(([,r])=>r.test(s))?.[0]||'other'};
}
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function parseDate(raw,order='DMY'){
 const s=String(raw).trim();if(validDate(s))return s;
 const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
 if(m){let [,a,b,y]=m;if(y.length===2)y='20'+y;const result=`${y}-${(order==='DMY'?b:a).padStart(2,'0')}-${(order==='DMY'?a:b).padStart(2,'0')}`;return validDate(result)?result:null;}
 const named=s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{4})$/);if(named){const d=new Date(`${named[2]} ${named[1]}, ${named[3]} 12:00:00 UTC`);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;}return null;
}
export function parseMoney(value){let s=String(value??'').trim();if(!s)return null;const negative=/^\(|^-|DR$/i.test(s);s=s.replace(/AED|USD|د\.إ|[,$\s()]|CR|DR/gi,'').replace(/^[-+]/,'');if(!/^\d+(\.\d+)?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n*(negative?-1:1):null;}
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;const first=text.split(/\r?\n/)[0],delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);if(quoted)throw new Error('CSV has an unclosed quoted field.');return rows;
}
export function csvTransactions(table,map,{currency='AED',fx=DEFAULT_FX,account='Main account',dateOrder='DMY',positive='expense'}={}){
 const result=[],issues=[];
 table.slice(1).forEach((row,index)=>{
  const date=parseDate(row[map.date],dateOrder),description=row[map.description]?.trim();
  const debit=map.debit>=0?parseMoney(row[map.debit]):null,credit=map.credit>=0?parseMoney(row[map.credit]):null;
  let amount=map.amount>=0?parseMoney(row[map.amount]):null,classification=classify(description||''),type=classification.type;
  if(map.debit>=0||map.credit>=0){if(debit&&credit){issues.push(`Row ${index+2}: both debit and credit are populated. Review it manually.`);return;}if(debit){amount=Math.abs(debit);if(type==='income')type='expense';}else if(credit){amount=Math.abs(credit);if(type==='expense')type='income';}else amount=null;}
  else if(amount!==null){if(!['refund','transfer','investment'].includes(type)){if(amount<0)type=positive==='expense'?'income':'expense';else if(type==='expense')type=positive;}amount=Math.abs(amount);}
  if(!date||!description||amount===null||amount<=0){issues.push(`Row ${index+2}: missing or invalid date, description, or amount.`);return;}
  result.push({id:uid(),date,description,amount:round(currency==='USD'?amount*fx:amount),type,category:classification.category,account,source:'CSV',reviewed:false});
 });return {rows:result,issues};
}
export function textTransactions(text,{currency='AED',fx=DEFAULT_FX,account='Main account',dateOrder='DMY'}={}){
 const rows=[],issues=[];
 for(const line of text.split('\n').map(x=>x.trim()).filter(Boolean)){
  const dateMatch=line.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}[\s-]+[A-Za-z]{3,9}[\s-]+\d{4})\s+/);
  if(!dateMatch)continue;const date=parseDate(dateMatch[1],dateOrder),rest=line.slice(dateMatch[0].length);
  const amounts=[...rest.matchAll(/(?:^|\s)((?:[-+]?\d[\d,]*\.\d{2}|\(\d[\d,]*\.\d{2}\))(?:\s?(?:CR|DR))?)(?=\s|$)/gi)];
  if(!date||!amounts.length){issues.push(`Could not read: ${line}`);continue;}
  const token=amounts[0],money=parseMoney(token[1]),description=rest.slice(0,token.index).trim().replace(/\s+/g,' ');
  if(money===null||!description||money===0){issues.push(`Review manually: ${line}`);continue;}
  const c=classify(description);let type=c.type;if(/CR$/i.test(token[1])&&type==='expense')type='income';
  rows.push({id:uid(),date,description,amount:round(Math.abs(money)*(currency==='USD'?fx:1)),type,category:c.category,account,source:'Statement',reviewed:false,uncertain:true,rawLine:line});
 }
 return {rows,issues};
}
export function validateTransaction(t){return !!t&&typeof t.id==='string'&&validDate(t.date)&&typeof t.description==='string'&&t.description.trim().length>0&&t.description.length<=500&&Number.isFinite(t.amount)&&t.amount>0&&t.amount<=1e12&&Object.hasOwn(TYPES,t.type)&&CATEGORIES.some(c=>c.id===t.category)&&typeof t.account==='string'&&t.account.length<=120;}
// Saving an unchanged converted input must not round the original value again.
export function preserveAmount(input,original,displayed,convert){return original!=null&&Number(input)===Number(displayed)?original:convert(Number(input));}
export function validateState(s){
 if(!s||s.version!==1||!['AED','USD'].includes(s.settings?.currency)||!Number.isFinite(s.settings.fx)||s.settings.fx<=0||s.settings.fx>100)throw new Error('This is not a valid Harbour backup.');
 if(!Array.isArray(s.holdings)||s.holdings.length>500||!Array.isArray(s.transactions)||s.transactions.length>100000||!s.transactions.every(validateTransaction))throw new Error('Backup contains invalid records.');
 const ids=new Set();for(const h of s.holdings){if(!h||typeof h.id!=='string'||ids.has(h.id)||!['crypto','etf','gold'].includes(h.type)||!Number.isFinite(h.quantity)||h.quantity<0||h.quantity>1e15||typeof h.name!=='string'||h.name.length>120||typeof h.symbol!=='string'||h.symbol.length>30||![h.costUSD,h.manualUSD].every(n=>n==null||(Number.isFinite(n)&&n>=0&&n<1e12)))throw new Error('Backup contains an invalid holding.');ids.add(h.id);}
 if(!s.plans||typeof s.plans!=='object'||Array.isArray(s.plans))throw new Error('Invalid budget plans.');
 for(const [month,p] of Object.entries(s.plans)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!p||![p.income,p.reserve,...CATEGORIES.map(c=>p.categories?.[c.id])].every(n=>Number.isFinite(n)&&n>=0&&n<=1e12))throw new Error('Backup contains an invalid budget.');}
 // Market data is refetched; do not trust cached external values from backups.
 return {...freshState(),settings:{...s.settings},holdings:s.holdings.map(h=>({...h})),plans:s.plans,transactions:s.transactions.map(t=>({...t})),imports:Array.isArray(s.imports)?s.imports.filter(i=>typeof i.name==='string'&&Number.isFinite(i.count)&&typeof i.at==='string').slice(0,100):[]};
}
export function demoState(){
 const s=freshState(),month=monthNow();s.isDemo=true;s.holdings.forEach((h,i)=>{h.quantity=[12500,18000,850,4400,50][i];h.costUSD=[.21,.06,1.6,1.2,110][i];s.quotes[h.id]={priceUSD:[.245,.069,1.94,1.48,133.23][i],change24h:[2.6,-1.4,3.2,.8,null][i],source:'Example',asOf:new Date().toISOString()};});
 s.holdings.push({id:'voo',name:'Vanguard S&P 500',symbol:'VOO',type:'etf',quantity:18,costUSD:590,manualUSD:null,color:'#87a694',mark:'V'});s.quotes.voo={priceUSD:710.79,change24h:.54,source:'Example',asOf:new Date().toISOString()};
 s.plans[month]={income:20000,reserve:2500,categories:{rent:5500,utilities:800,groceries:1400,dining:1000,transport:700,shopping:750,health:300,subscriptions:250,other:300}};
 const values=[['Rent payment',5500,'rent',1],['DEWA utilities',640,'utilities',5],['Carrefour market',428,'groceries',7],['Spinneys groceries',312,'groceries',18],['Dinner with friends',385,'dining',12],['Coffee & meals',490,'dining',20],['Careem rides',320,'transport',16],['Noon purchase',825,'shopping',21],['Pharmacy',115,'health',22],['Spotify & subscriptions',189,'subscriptions',23]];
 s.transactions=values.map(([description,amount,category,day])=>({id:uid(),date:`${month}-${String(day).padStart(2,'0')}`,description,amount,category,type:'expense',account:'Example account',source:'Example'}));
 s.transactions.push({id:uid(),date:`${month}-01`,description:'Monthly salary',amount:20000,category:'other',type:'income',account:'Example account',source:'Example'});return s;
}

import {TROY_OUNCE_GRAMS} from './model.mjs';
const cache=new Map();
async function json(url){const r=await fetch(url,{headers:{'User-Agent':'HarbourLocal/1.0'},signal:AbortSignal.timeout(16000)});if(!r.ok)throw new Error(`Provider returned ${r.status}. Try again later.`);return r.json();}
async function cached(key,ttl,fn){const prev=cache.get(key);if(prev&&Date.now()-prev.at<ttl)return prev.data;const data=await fn();cache.set(key,{data,at:Date.now()});return data;}
const isId=s=>typeof s==='string'&&/^[a-z0-9-]{1,90}$/.test(s);
const isSymbol=s=>typeof s==='string'&&/^[A-Za-z0-9.^=_-]{1,25}$/.test(s);
export async function quotesFor(holdings){
 const quotes={},errors={};const cryptos=holdings.filter(h=>h.type==='crypto'&&isId(h.providerId));
 if(cryptos.length){try{const ids=[...new Set(cryptos.map(h=>h.providerId))].sort().join(',');const data=await cached('crypto:'+ids,60000,()=>json(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`));for(const h of cryptos){const v=data[h.providerId];if(!v||!Number.isFinite(v.usd)||!v.last_updated_at){errors[h.id]='Price unavailable from CoinGecko';continue;}quotes[h.id]={priceUSD:v.usd,change24h:v.usd_24h_change??null,asOf:new Date(v.last_updated_at*1000).toISOString(),fetchedAt:new Date().toISOString(),source:'CoinGecko',currency:'USD'};}}catch(e){for(const h of cryptos)errors[h.id]=e.message;}}
 await Promise.all(holdings.filter(h=>h.type!=='crypto').map(async h=>{try{
  if(h.type==='gold'){const d=await cached('gold',60000,()=>json('https://api.gold-api.com/price/XAU'));if(!Number.isFinite(d.price)||d.price<=0||d.currency!=='USD')throw new Error('Gold quote unavailable or not denominated in USD');quotes[h.id]={priceUSD:d.price/TROY_OUNCE_GRAMS,change24h:null,asOf:d.updatedAt,fetchedAt:new Date().toISOString(),source:'Gold API · spot / gram',currency:'USD'};}
  else if(h.type==='etf'&&isSymbol(h.symbol)){const d=await cached('etf:'+h.symbol,60000,()=>json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(h.symbol)}?interval=1d&range=5d`));const result=d.chart?.result?.[0],m=result?.meta;if(!m||!Number.isFinite(m.regularMarketPrice))throw new Error('Ticker not found. Use the exact exchange ticker.');if(m.instrumentType!=='ETF')throw new Error('This ticker is not identified as an ETF.');if(m.currency!=='USD')throw new Error(`This fund trades in ${m.currency}. Use a USD listing or a manual converted USD price.`);const closes=result.indicators?.quote?.[0]?.close?.filter(Number.isFinite)||[];const prior=closes.length>1?closes.at(-2):null;quotes[h.id]={priceUSD:m.regularMarketPrice,change24h:prior?(m.regularMarketPrice/prior-1)*100:null,asOf:new Date(m.regularMarketTime*1000).toISOString(),fetchedAt:new Date().toISOString(),source:'Yahoo Finance · last trade',currency:m.currency,name:m.longName};}
 }catch(e){errors[h.id]=e.message;}}));return {quotes,errors};
}
export async function marketHistory(symbol,range){return cached('history:'+symbol+range,300000,async()=>{const d=await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`);const r=d.chart?.result?.[0];if(!r)throw new Error('History is unavailable for this symbol.');if(r.meta.currency!=='USD')throw new Error('History is only supported for USD listings.');const closes=r.indicators?.quote?.[0]?.close||[];return {currency:'USD',source:'Yahoo Finance · daily close',points:(r.timestamp||[]).flatMap((t,i)=>Number.isFinite(closes[i])?[{time:t*1000,value:closes[i]}]:[])};});}
export async function handleApi(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const host=req.headers.host;if(!['127.0.0.1:4173','localhost:4173'].includes(host)){res.writeHead(403);return res.end(JSON.stringify({error:'Local requests only'}));}
 if(req.headers.origin&&!['http://127.0.0.1:4173','http://localhost:4173'].includes(req.headers.origin)){res.writeHead(403);return res.end(JSON.stringify({error:'Origin not allowed'}));}
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/quotes'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)throw new Error('Too many holdings');}const {holdings}=JSON.parse(body);if(!Array.isArray(holdings)||holdings.length>60||holdings.some(h=>!h||typeof h.id!=='string'||h.id.length>100))throw new Error('Invalid holdings');res.end(JSON.stringify(await quotesFor(holdings)));}
  else if(u.pathname==='/api/history'&&req.method==='GET'){const symbol=u.searchParams.get('symbol'),range=u.searchParams.get('range')||'1mo';if(!isSymbol(symbol)||!['1mo','3mo','1y'].includes(range))throw new Error('Invalid history request');res.end(JSON.stringify(await marketHistory(symbol,range)));}
  else{res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));}
 }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e.message}));}
}

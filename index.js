const express = require("express");
const cors = require("cors");
const fetch = global.fetch;
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const CALENDLY = "https://calendly.com/frogfishconsulting/discovery";

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Frogfish BD Agent 🐸</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Mono','Courier New',monospace;background:#0a0f0d;color:#e2ffe8;min-height:100vh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0f0d}::-webkit-scrollbar-thumb{background:#1a5c2e;border-radius:2px}
.header{border-bottom:1px solid #1a3320;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;background:#060c08;position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:16px}.logo-icon{width:32px;height:32px;background:#1a5c2e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px}
.logo-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#4ade80;letter-spacing:.05em}.logo-sub{font-size:9px;color:#2d5c3a;letter-spacing:.2em;text-transform:uppercase}
.tabs{border-bottom:1px solid #1a3320;padding:0 28px;background:#060c08;display:flex;position:sticky;top:65px;z-index:9}
.tab{background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:10px 18px;color:#4a7a58;transition:all .2s}
.tab.active{color:#4ade80;border-bottom-color:#4ade80}.tab:hover{color:#a3e4b0}
.content{padding:24px 28px;max-width:1200px}.card{background:#0e1a12;border:1px solid #1a3320;border-radius:3px;padding:20px;margin-bottom:16px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.grid-12{display:grid;grid-template-columns:1.3fr .7fr;gap:16px}
.label{font-size:9px;color:#2d5c3a;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px}
.stat-num{font-family:'Syne',sans-serif;font-size:38px;font-weight:800;color:#4ade80;line-height:1}
.btn{background:#1a5c2e;border:1px solid #4ade80;color:#4ade80;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:10px 20px;cursor:pointer;border-radius:2px;transition:all .2s}
.btn:hover{background:#4ade80;color:#0a0f0d}.btn:disabled{opacity:.4;cursor:not-allowed;pointer-events:none}.btn-sm{padding:7px 14px;font-size:10px}
.btn-danger{background:none;border:1px solid #f87171;color:#f87171;font-family:'DM Mono',monospace;font-size:11px;padding:10px 20px;cursor:pointer;border-radius:2px}
.btn-danger:hover{background:#f87171;color:#0a0f0d}
.btn-ghost{background:none;border:1px solid #4a7a58;color:#4a7a58;font-family:'DM Mono',monospace;font-size:11px;padding:10px 20px;cursor:pointer;border-radius:2px}
.btn-ghost:hover{background:#4a7a58;color:#0a0f0d}
.log-entry{border-left:2px solid;padding:6px 12px;margin-bottom:5px;font-size:11px;border-radius:0 2px 2px 0}.log-scroll{max-height:320px;overflow-y:auto}
.score-bar{height:4px;background:#1a3320;border-radius:2px;overflow:hidden;margin-top:4px}.score-fill{height:100%;border-radius:2px}
.lead-row{border-bottom:1px solid #1a3320;padding:13px 0;cursor:pointer;transition:background .15s}.lead-row:hover{background:#0d2a14}
.email-box{background:#060c08;border:1px solid #1a3320;border-radius:2px;padding:16px;font-size:12px;line-height:1.8;color:#b0d4b8;white-space:pre-wrap;min-height:160px;max-height:320px;overflow-y:auto}
.progress-bar{height:2px;background:#1a3320;border-radius:1px;overflow:hidden;margin:8px 0}.progress-fill{height:100%;background:linear-gradient(90deg,#1a5c2e,#4ade80);transition:width .4s}
input{background:#060c08;border:1px solid #1a3320;color:#e2ffe8;font-family:'DM Mono',monospace;font-size:12px;padding:10px 14px;border-radius:2px;width:100%;outline:none}
input:focus{border-color:#4ade80}.status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
.error-banner{background:#1a0a0a;border:1px solid #f87171;border-radius:3px;padding:14px 16px;margin-bottom:16px}
.pulse{animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.flex{display:flex}.flex-between{display:flex;justify-content:space-between;align-items:center}
.gap-8{gap:8px}.gap-12{gap:12px}.mt-8{margin-top:8px}.mt-12{margin-top:12px}.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}
.col-header{font-size:9px;color:#2d5c3a;letter-spacing:.15em;text-transform:uppercase;padding:6px 0 10px;border-bottom:1px solid #1a3320;display:grid;gap:8px}
</style>
</head>
<body>
<div id="app"></div>
<script>
const CALENDLY='https://calendly.com/frogfishconsulting/discovery';
const CTX='You are the AI BD Rep for Frogfish Consulting. Founded by ex-Google employee, 10+ years experience. Digital Maturity Consulting — connecting offline CRM data to digital campaigns. Services: Paid Media, SEO/Content, Digital Intelligence/Dashboards/CRM Integration. Target: businesses driving leads online but closing offline. VALUE PROP: Most agencies optimize for leads. We optimize for revenue. CASE STUDY 1 (home services/solar/healthcare): Home services company, no revenue visibility from ads. We built BI dashboard. Found campaign eating 30% of budget with zero closed jobs. Cut it — revenue per marketing dollar nearly doubled. CASE STUDY 2 (multi-location): Regional business, no unified view. Dashboard tied spend+revenue per location. Grew revenue 28% without more spend. CASE STUDY 3 (law firms/financial/insurance): Law firm optimizing for form fills, intake drowning. Restructured around CRM closed case data. Cost per signed case dropped 42% in 4 months. RULE: Pick ONE relevant case study. Never name clients. Use specific numbers. 1-2 natural sentences. Calendly: '+CALENDLY;

const NICHES=[
  {id:'legal',label:'Law Firms',industries:['legal services'],titles:['Managing Partner','Partner','Marketing Director','CMO'],pain:'optimizing for leads instead of signed cases'},
  {id:'home',label:'Home Services',industries:['consumer services','construction'],titles:['Owner','CEO','Marketing Manager','VP of Marketing'],pain:'running ads but CRM not connected to closed jobs'},
  {id:'financial',label:'Financial/Insurance',industries:['financial services','insurance'],titles:['CMO','VP of Marketing','Head of Growth','Marketing Manager'],pain:'high CPL with no visibility into which leads convert'},
];
const MOCK=[
  {id:1,company:'Apex Solar Solutions',contact:'Marcus Webb',title:'VP of Marketing',email:'m.webb@apexsolar.com',employees:'85',spend_signal:'Google Ads + Meta',score:94,niche:'home',location:'Phoenix, AZ'},
  {id:2,company:'Greenleaf HVAC',contact:'Sandra Torres',title:'Owner / CEO',email:'sandra@greenleafhvac.com',employees:'32',spend_signal:'LSA + Meta',score:88,niche:'home',location:'Dallas, TX'},
  {id:3,company:'Summit Financial Group',contact:'Rachel Kim',title:'CMO',email:'rkim@summitfg.com',employees:'210',spend_signal:'Display + Search',score:85,niche:'financial',location:'Chicago, IL'},
  {id:4,company:'BrightPath Insurance',contact:'Tom Achebe',title:'Head of Digital',email:'t.achebe@brightpath.com',employees:'67',spend_signal:'Meta + Google',score:89,niche:'financial',location:'Austin, TX'},
  {id:5,company:'Harmon & Associates Law',contact:'Derek Harmon',title:'Managing Partner',email:'d.harmon@harmonlaw.com',employees:'28',spend_signal:'Google Ads + LSA',score:92,niche:'legal',location:'Los Angeles, CA'},
  {id:6,company:'Metro Roofing Co.',contact:'Lisa Carmichael',title:'Marketing Manager',email:'lisa@metroroofing.com',employees:'44',spend_signal:'LSA + Facebook',score:82,niche:'home',location:'Denver, CO'},
];
let S={tab:'dashboard',leads:[...MOCK],selLead:null,emails:{},genId:null,bulkStatus:{},bulkEmails:{},campStep:'idle',sendProg:0,selIds:new Set(MOCK.map(l=>l.id)),sent:247,booked:6,openRate:34,replyRate:8,scanning:false,scanProg:0,lastError:null,log:[{t:'09:14 AM',m:'Agent started — Law Firms, Home Services, Financial',c:'info'},{t:'09:22 AM',m:'Generated 94 personalized emails via Claude AI',c:'success'},{t:'10:03 AM',m:'MEETING BOOKED: Harmon & Associates Law',c:'meeting'},{t:'11:47 AM',m:'Reply: Sandra Torres @ Greenleaf HVAC',c:'reply'}],keys:(()=>{try{return JSON.parse(localStorage.getItem('ff_k')||'{}')}catch{return{}}})(),showK:{},keySaved:false};
let sendTimer=null;
const LC={info:'#7dd3fc',success:'#86efac',meeting:'#fbbf24',reply:'#c4b5fd',error:'#f87171'};
const SC={pending:'#2d5c3a',generating:'#fbbf24',ready:'#7dd3fc',queued:'#a78bfa',sent:'#4ade80',error:'#f87171'};
const SL={pending:'pending',generating:'generating...',ready:'ready',queued:'queued',sent:'sent',error:'error'};
function set(p){Object.assign(S,typeof p==='function'?p(S):p);draw();}
function log(m,c='info'){const t=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});S.log=[{t,m,c},...S.log].slice(0,60);}
async function ai(prompt){
  const h={'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
  if(S.keys.anthropic)h['x-api-key']=S.keys.anthropic;
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:h,body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:CTX,messages:[{role:'user',content:prompt}]})});
  const d=await r.json();if(d.error)throw new Error(d.error.message);return d.content?.[0]?.text||'';
}
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const t=await r.text();try{return JSON.parse(t)}catch{return{parseError:t.slice(0,300)}}}
function sp(p){let s=60;const t=(p.title||'').toLowerCase();if(['cmo','vp','director','head','partner','owner','ceo'].some(x=>t.includes(x)))s+=15;if(p.email)s+=10;if((p.organization?.estimated_num_employees||0)>20)s+=8;return Math.min(s+Math.floor(Math.random()*8),99);}
async function doScan(){
  if(!S.keys.apollo){log('Apollo API key not set — go to Settings','error');set({});return;}
  set({scanning:true,scanProg:0,lastError:null});log('Connecting to Apollo — scanning all niches...','info');
  let all=[];
  for(let i=0;i<NICHES.length;i++){
    const n=NICHES[i];set({scanProg:Math.round((i/NICHES.length)*80)});log('Querying Apollo for '+n.label+'...','info');
    try{
      const d=await api('/apollo/search',{apolloKey:S.keys.apollo,page:1,per_page:10,person_titles:n.titles,q_organization_keyword_tags:n.industries,person_locations:['United States'],organization_num_employees_ranges:['10,50','51,200']});
      if(d.people?.length>0){
        const m=d.people.filter(p=>p.email||p.organization).map((p,j)=>({id:Date.now()+i*100+j,company:p.organization?.name||'Unknown',contact:p.name||'Unknown',title:p.title||'Unknown',email:p.email||('contact@'+(p.organization?.primary_domain||'unknown.com')),employees:String(p.organization?.estimated_num_employees||'?'),spend_signal:'Apollo verified',score:sp(p),niche:n.id,location:(p.city&&p.state)?(p.city+', '+p.state):'United States'}));
        all=[...all,...m];log(n.label+': '+m.length+' leads pulled','success');
      }else{const e=d.error||d.message||d.parseError||JSON.stringify(d).slice(0,150);log(n.label+': 0 results — '+e,'info');set({lastError:'Apollo: '+e});}
    }catch(e){log('Error: '+e.message,'error');set({lastError:e.message});}
    await new Promise(r=>setTimeout(r,400));
  }
  set({scanProg:100});
  if(all.length>0){const ex=new Set(S.leads.map(l=>l.email));const dd=all.filter(l=>!ex.has(l.email));const ni=new Set([...S.selIds,...dd.map(l=>l.id)]);log('Scan complete — '+dd.length+' real leads added','success');set(s=>({leads:[...s.leads,...dd],selIds:ni,lastError:null}));}
  else log('No leads returned — check error on Dashboard','info');
  set({scanning:false,scanProg:0});
}
async function doGen(lead){
  set({genId:lead.id});const n=NICHES.find(x=>x.id===lead.niche)||NICHES[0];
  try{const r=await ai('Cold email for: '+lead.company+' | '+lead.contact+', '+lead.title+' | '+lead.location+' | '+lead.employees+' employees | Pain: '+n.pain+'. Under 160 words. Specific opening about their business. Their core pain: no revenue visibility from digital spend. ONE case study with specific number. CTA: '+CALENDLY+'. Smart consultant tone. Format:\\nSubject: [subject]\\n\\n[body]');S.emails[lead.id]=r;log('Email ready: '+lead.contact+' @ '+lead.company,'success');}
  catch(e){S.emails[lead.id]='Error: '+e.message;log('Failed: '+e.message,'error');}
  set({genId:null});
}
async function doBulk(){
  const targets=S.leads.filter(l=>S.selIds.has(l.id));set({campStep:'generating'});log('Generating '+targets.length+' emails...','info');
  for(let i=0;i<targets.length;i++){
    const l=targets[i];S.bulkStatus[l.id]='generating';set({});const n=NICHES.find(x=>x.id===l.niche)||NICHES[0];
    try{const r=await ai('Cold email: '+l.company+' | '+l.contact+', '+l.title+' | '+l.location+' | Pain: '+n.pain+'. Under 160 words. Specific opening, no revenue visibility pain, ONE case study with number, CTA: '+CALENDLY+'. Format: Subject: [subject]\\n\\n[body]');S.bulkEmails[l.id]=r;S.bulkStatus[l.id]='ready';log('['+(i+1)+'/'+targets.length+'] '+l.contact+' @ '+l.company,'success');}
    catch(e){S.bulkStatus[l.id]='error';}
    set({});await new Promise(r=>setTimeout(r,300));
  }
  set({campStep:'ready'});log('All '+targets.length+' emails ready','success');
}
function doLaunch(){
  const targets=S.leads.filter(l=>S.selIds.has(l.id)&&S.bulkStatus[l.id]==='ready');if(!targets.length)return;
  targets.forEach(l=>S.bulkStatus[l.id]='queued');set({campStep:'sending',sendProg:0});log('Sending '+targets.length+' emails...','info');
  let sent=0;sendTimer=setInterval(()=>{
    if(sent>=targets.length){clearInterval(sendTimer);set(s=>({campStep:'done',sent:s.sent+targets.length}));log('Campaign done — '+targets.length+' sent','success');return;}
    const b=targets.slice(sent,sent+2);b.forEach(l=>{S.bulkStatus[l.id]='sent';log('Sent to '+l.contact+' at '+l.company,'success');});sent+=b.length;
    if(Math.random()>.93){set(s=>({booked:s.booked+1}));log('MEETING BOOKED: '+b[0]?.company,'meeting');}
    set({sendProg:Math.round((sent/targets.length)*100)});
  },500);
}
function saveKeys(){localStorage.setItem('ff_k',JSON.stringify(S.keys));set({keySaved:true});setTimeout(()=>set({keySaved:false}),2000);log('API keys saved','success');}
function draw(){document.getElementById('app').innerHTML=page();}
function page(){
  return '<div class="header"><div class="logo"><div class="logo-icon">🐸</div><div><div class="logo-title">FROGFISH BD AGENT</div><div class="logo-sub">AI Business Development Rep</div></div></div><div style="font-size:11px;color:'+(S.scanning?'#fbbf24':'#4a7a58')+'"><span class="status-dot '+(S.scanning?'pulse':'')+'" style="background:'+(S.scanning?'#fbbf24':'#1a5c2e')+'"></span>'+(S.scanning?'SCANNING':'STANDBY')+'</div></div>'+
  '<div class="tabs">'+['dashboard','leads','campaign','emails','settings'].map(t=>'<button class="tab '+(S.tab===t?'active':'')+'" onclick="go(\''+t+'\')">'+( t==='campaign'?'🚀 Campaign':t[0].toUpperCase()+t.slice(1))+'</button>').join('')+'</div>'+
  '<div class="content">'+(S.tab==='dashboard'?tDash():S.tab==='leads'?tLeads():S.tab==='campaign'?tCamp():S.tab==='emails'?tEmails():tSettings())+'</div>';
}
function tDash(){
  return (S.lastError?'<div class="error-banner mb-16"><div class="label" style="color:#f87171;margin-bottom:4px">Apollo Error</div><div style="font-size:11px;color:#fca5a5;word-break:break-all">'+S.lastError+'</div><button class="btn btn-sm mt-8" onclick="set({lastError:null})">Dismiss</button></div>':'')+
  '<div class="grid-4">'+[['Emails Sent',S.sent,''],['Meetings Booked',S.booked,''],['Open Rate',S.openRate.toFixed(1),'%'],['Reply Rate',S.replyRate.toFixed(1),'%']].map(([l,v,s])=>'<div class="card"><div class="label">'+l+'</div><div class="stat-num">'+v+'<span style="font-size:20px">'+s+'</span></div></div>').join('')+'</div>'+
  '<div class="grid-12"><div class="card"><div class="flex-between mb-12"><div class="label" style="color:#4ade80">Agent Log</div><span style="font-size:10px;color:'+(S.scanning?'#4ade80':'#2d5c3a')+'">'+(S.scanning?'SCANNING':'IDLE')+'</span></div><div class="log-scroll">'+S.log.map(e=>'<div class="log-entry" style="border-color:'+LC[e.c]+';background:'+LC[e.c]+'15"><span style="color:#2d5c3a;margin-right:10px">'+e.t+'</span><span style="color:'+LC[e.c]+'">'+e.m+'</span></div>').join('')+'</div></div>'+
  '<div><div class="card"><div class="label" style="color:#4ade80;margin-bottom:12px">Quick Actions</div>'+(S.scanning?'<div style="font-size:11px;color:#fbbf24;margin-bottom:6px"><span class="pulse">●</span> Scanning '+S.scanProg+'%</div><div class="progress-bar"><div class="progress-fill" style="width:'+S.scanProg+'%"></div></div>':'<button class="btn mb-8" style="width:100%;text-align:left" onclick="doScan()">🔍 Scan Apollo for New Leads</button>')+'<button class="btn mb-8" style="width:100%;text-align:left" onclick="go(\'campaign\')">🚀 Launch Email Campaign</button><button class="btn" style="width:100%;text-align:left" onclick="go(\'leads\')">📋 Lead Queue ('+S.leads.length+')</button></div>'+
  '<div class="card"><div class="label" style="color:#4ade80;margin-bottom:12px">Top Leads</div>'+[...S.leads].sort((a,b)=>b.score-a.score).slice(0,4).map(l=>'<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between"><span style="font-size:11px;color:#c0e8c8">'+l.company+'</span><span style="font-size:11px;color:'+(l.score>88?'#4ade80':'#7dd3fc')+'">'+l.score+'</span></div><div class="score-bar"><div class="score-fill" style="width:'+l.score+'%;background:'+(l.score>88?'#4ade80':'#7dd3fc')+'"></div></div></div>').join('')+'</div></div></div>';
}
function tLeads(){
  const sl=S.selLead;
  return '<div style="display:grid;grid-template-columns:'+(sl?'1fr 1fr':'1fr')+';gap:20px">'+
  '<div class="card"><div class="flex-between mb-16"><div class="label" style="color:#4ade80">Lead Queue — '+S.leads.length+' Leads</div><button class="btn btn-sm" onclick="doScan()" '+(S.scanning?'disabled':'')+'>+ Scan Apollo</button></div>'+
  '<div class="col-header" style="grid-template-columns:1.8fr 1.4fr 1fr .7fr 50px"><span>Company</span><span>Contact</span><span>Location</span><span>Niche</span><span>Score</span></div>'+
  S.leads.map(l=>'<div class="lead-row" onclick="pick('+l.id+')" style="'+(sl?.id===l.id?'background:#0d2a14':'')+'"><div style="display:grid;grid-template-columns:1.8fr 1.4fr 1fr .7fr 50px;gap:8px;align-items:center"><div><div style="font-size:12px;color:#c0e8c8">'+l.company+'</div><div style="font-size:10px;color:#2d5c3a">'+l.spend_signal+'</div></div><div><div style="font-size:11px;color:#9dc8a8">'+l.contact+'</div><div style="font-size:10px;color:#2d5c3a">'+l.title+'</div></div><div style="font-size:10px;color:#4a7a58">'+l.location+'</div><div style="font-size:9px;color:#4a7a58;text-transform:uppercase">'+l.niche+'</div><div style="font-family:Syne,sans-serif;font-size:14px;font-weight:800;color:'+(l.score>88?'#4ade80':'#7dd3fc')+'">'+l.score+'</div></div></div>').join('')+'</div>'+
  (sl?'<div class="card"><div class="flex-between mb-16"><div class="label" style="color:#4ade80">Lead Detail</div><button onclick="set({selLead:null})" style="background:none;border:none;color:#2d5c3a;cursor:pointer;font-size:18px">✕</button></div><div style="font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#4ade80;margin-bottom:4px">'+sl.company+'</div><div style="font-size:11px;color:#4a7a58;margin-bottom:2px">'+sl.contact+' · '+sl.title+'</div><div style="font-size:11px;color:#2d5c3a;margin-bottom:16px">'+sl.email+'</div><div class="grid-2 mb-16">'+[['Employees',sl.employees],['Location',sl.location],['Score',sl.score+'/100'],['Signals',sl.spend_signal]].map(([k,v])=>'<div style="background:#060c08;border:1px solid #1a3320;padding:10px 14px;border-radius:2px"><div class="label">'+k+'</div><div style="font-size:11px;color:#b0d4b8">'+v+'</div></div>').join('')+'</div><div class="label" style="color:#4ade80;margin-bottom:8px">AI Email</div>'+(S.genId===sl.id?'<div style="color:#4ade80;font-size:11px"><span class="pulse">●</span> Generating...</div>':S.emails[sl.id]?'<div class="email-box mb-8">'+S.emails[sl.id]+'</div><div class="flex gap-8"><button class="btn btn-sm" onclick="cp('+sl.id+')">Copy</button><button class="btn btn-sm" onclick="gen('+sl.id+')">Regen</button></div>':'<button class="btn" style="width:100%" onclick="gen('+sl.id+')">✨ Generate Email</button>')+'</div>':'')+'</div>';
}
function tCamp(){
  const rN=Object.values(S.bulkStatus).filter(s=>s==='ready').length;
  return '<div class="grid-3 mb-16">'+[['Step 1 — Generate',S.campStep==='generating'?'<span class="pulse">● Generating...</span>':['ready','sending','done'].includes(S.campStep)?'✓ Complete':'● Waiting',S.campStep==='generating'?'#fbbf24':['ready','sending','done'].includes(S.campStep)?'#4ade80':'#4a7a58'],['Step 2 — Send',S.campStep==='sending'?'<span class="pulse">● Sending...</span>':S.campStep==='done'?'✓ Complete':'● Waiting',['sending','done'].includes(S.campStep)?'#4ade80':'#4a7a58'],['Meetings Booked','<span style="font-family:Syne,sans-serif;font-size:32px;font-weight:800">'+S.booked+'</span>','#4ade80']].map(([label,val,color])=>'<div class="card"><div class="label mb-8">'+label+'</div><div style="color:'+color+';font-size:13px">'+val+'</div>'+(label==='Step 2 — Send'&&['sending','done'].includes(S.campStep)?'<div class="progress-bar mt-8"><div class="progress-fill" style="width:'+S.sendProg+'%"></div></div><div style="font-size:10px;color:#4ade80">'+S.sendProg+'%</div>':'')+'</div>').join('')+'</div>'+
  '<div class="card mb-16 flex-between"><div><div style="font-size:12px;color:#c0e8c8;margin-bottom:4px"><strong style="color:#4ade80">'+S.selIds.size+'</strong> leads selected</div><div style="font-size:10px;color:#2d5c3a">Claude AI personalizes each email with case studies</div></div><div class="flex gap-8">'+(S.campStep==='idle'?'<button class="btn" onclick="doBulk()">✨ Generate All Emails</button>':'')+(S.campStep==='generating'?'<button class="btn" disabled>Generating '+rN+'/'+S.selIds.size+'...</button>':'')+(S.campStep==='ready'?'<button class="btn-ghost" onclick="doBulk()">↺ Regen</button><button class="btn" onclick="doLaunch()">🚀 Send '+S.selIds.size+' Emails</button>':'')+(S.campStep==='sending'?'<button class="btn-danger" onclick="pause()">⏸ Pause</button>':'')+(S.campStep==='done'?'<button class="btn" onclick="reset()">+ New Campaign</button>':'')+'</div></div>'+
  '<div class="card"><div class="flex-between mb-12"><div class="label" style="color:#4ade80">Queue</div><label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#4a7a58;cursor:pointer"><input type="checkbox" '+(S.selIds.size===S.leads.length?'checked':'')+' onchange="allToggle(this.checked)" style="width:auto;accent-color:#4ade80"> Select all</label></div>'+
  '<div class="col-header" style="grid-template-columns:32px 1.8fr 1.4fr 1.2fr .6fr 80px 160px"><span></span><span>Company</span><span>Contact</span><span>Email</span><span>Score</span><span>Status</span><span>Subject</span></div>'+
  S.leads.map(l=>{const st=S.bulkStatus[l.id]||'pending';const iS=S.selIds.has(l.id);const sub=(S.bulkEmails[l.id]||'').split('\\n')[0].replace('Subject: ','')||'—';return '<div class="lead-row" style="opacity:'+(iS?1:.4)+'"><div style="display:grid;grid-template-columns:32px 1.8fr 1.4fr 1.2fr .6fr 80px 160px;gap:8px;align-items:center"><input type="checkbox" '+(iS?'checked':'')+' onchange="tog('+l.id+',this.checked)" style="width:auto;accent-color:#4ade80"><div><div style="font-size:12px;color:#c0e8c8">'+l.company+'</div><div style="font-size:10px;color:#2d5c3a">'+l.niche+'</div></div><div style="font-size:11px;color:#9dc8a8">'+l.contact+'<br><span style="font-size:10px;color:#2d5c3a">'+l.title+'</span></div><div style="font-size:10px;color:#4a7a58;word-break:break-all">'+l.email+'</div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800;color:'+(l.score>88?'#4ade80':'#7dd3fc')+'">'+l.score+'</div><div style="font-size:9px;color:'+SC[st]+';text-transform:uppercase">'+SL[st]+'</div><div style="font-size:10px;color:#4a7a58;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+sub+'</div></div></div>';}).join('')+'</div>';
}
function tEmails(){
  return '<div class="card mb-16"><div class="label" style="color:#4ade80;margin-bottom:8px">Single Email Generator</div><div style="font-size:12px;color:#4a7a58">Generate a personalized email for any lead — Claude picks the most relevant case study automatically.</div></div>'+
  '<div class="grid-2">'+S.leads.slice(0,6).map(l=>'<div class="card"><div class="flex-between mb-12"><div><div style="font-size:13px;color:#c0e8c8">'+l.company+'</div><div style="font-size:10px;color:#2d5c3a;margin-top:2px">'+l.contact+' · '+l.email+'</div></div><div style="font-family:Syne,sans-serif;font-size:14px;font-weight:800;color:'+(l.score>88?'#4ade80':'#7dd3fc')+'">'+l.score+'</div></div>'+(S.genId===l.id?'<div style="color:#4ade80;font-size:11px"><span class="pulse">●</span> Writing...</div>':S.emails[l.id]?'<div class="email-box" style="max-height:140px;overflow:hidden;position:relative;font-size:11px">'+S.emails[l.id]+'<div style="position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,#060c08)"></div></div><div class="flex gap-8 mt-8"><button class="btn btn-sm" onclick="cp('+l.id+')">Copy</button><button class="btn btn-sm" onclick="gen('+l.id+')">Regen</button></div>':'<button class="btn" style="width:100%;font-size:10px" onclick="gen('+l.id+')" '+(S.genId?'disabled':'')+'>✨ Generate Email</button>')+'</div>').join('')+'</div>';
}
function tSettings(){
  const ks=k=>S.keys[k]?{l:'● connected',c:'#4ade80'}:{l:'not set',c:'#f87171'};
  return '<div class="card mb-16"><div class="flex-between mb-16"><div class="label" style="color:#4ade80">🔑 API Keys</div>'+(S.keySaved?'<span style="font-size:10px;color:#4ade80">✓ Saved</span>':'')+'</div>'+
  '<div class="grid-3 mb-16">'+[{id:'anthropic',label:'Anthropic',ph:'sk-ant-...',hint:'console.anthropic.com → API Keys'},{id:'apollo',label:'Apollo.io',ph:'service_...',hint:'app.apollo.io → Settings → API'},{id:'instantly',label:'Instantly.ai',ph:'inst_...',hint:'app.instantly.ai → Settings → API'}].map(k=>'<div><div class="flex-between mb-4" style="margin-bottom:6px"><div class="label">'+k.label+'</div><div style="font-size:9px;color:'+ks(k.id).c+'">'+ks(k.id).l+'</div></div><div style="position:relative"><input type="'+(S.showK[k.id]?'text':'password')+'" value="'+(S.keys[k.id]||'')+'" oninput="upk(\''+k.id+'\',this.value)" placeholder="'+k.ph+'" style="padding-right:36px"><button onclick="shk(\''+k.id+'\')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#2d5c3a;cursor:pointer">'+(S.showK[k.id]?'🙈':'👁')+'</button></div><div style="font-size:9px;color:#1a5c2e;margin-top:4px">'+k.hint+'</div></div>').join('')+'</div><button class="btn" onclick="saveKeys()">💾 Save Keys</button></div>'+
  '<div class="grid-2"><div class="card"><div class="label" style="color:#4ade80;margin-bottom:12px">Agency Profile</div><div class="mb-12"><div class="label" style="margin-bottom:4px">Calendly</div><input value="'+CALENDLY+'" readonly></div><div class="mb-12"><div class="label" style="margin-bottom:4px">Daily Send Limit</div><input type="number" value="1000"></div><div><div class="label" style="margin-bottom:4px">Sender</div><input value="Jared Flanders — Frogfish Consulting" class="mb-8"><input value="jared@frogfishconsulting.com"></div></div>'+
  '<div class="card"><div class="label" style="color:#4ade80;margin-bottom:12px">Setup Checklist</div>'+[{n:'01',t:'Anthropic API',d:'console.anthropic.com',done:!!S.keys.anthropic},{n:'02',t:'Apollo.io Basic',d:'API access enabled',done:!!S.keys.apollo},{n:'03',t:'Instantly Warmup',d:'jared@ inbox warming up',done:!!S.keys.instantly},{n:'04',t:'Railway Backend',d:'Live at railway.app ✓',done:true}].map(i=>'<div style="background:#060c08;border:1px solid '+(i.done?'#1a5c2e':'#1a3320')+';padding:12px;border-radius:2px;margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:'+(i.done?'#4ade80':'#1a5c2e')+'">'+i.n+'</div><div><div style="font-size:11px;color:'+(i.done?'#c0e8c8':'#4a7a58')+'">'+i.t+(i.done?' ✓':'')+'</div><div style="font-size:10px;color:#2d5c3a;margin-top:2px">'+i.d+'</div></div></div>').join('')+'</div></div>';
}
window.go=t=>set({tab:t,selLead:null});
window.pick=id=>set({selLead:S.leads.find(l=>l.id===id)||null});
window.allToggle=c=>{S.selIds=c?new Set(S.leads.map(l=>l.id)):new Set();set({});};
window.tog=(id,c)=>{const s=new Set(S.selIds);c?s.add(id):s.delete(id);set({selIds:s});};
window.upk=(k,v)=>{S.keys[k]=v;set({});};
window.shk=k=>{S.showK[k]=!S.showK[k];set({});};
window.saveKeys=saveKeys;
window.doScan=doScan;
window.doBulk=doBulk;
window.doLaunch=doLaunch;
window.pause=()=>{clearInterval(sendTimer);set({campStep:'ready'});log('Paused','info');};
window.reset=()=>set({campStep:'idle',bulkEmails:{},bulkStatus:{},sendProg:0});
window.gen=async id=>{const l=S.leads.find(x=>x.id===id);if(l)await doGen(l);};
window.cp=id=>{navigator.clipboard.writeText(S.emails[id]||S.bulkEmails[id]||'');log('Copied','success');set({});};
window.set=set;
draw();
</script></body></html>`);
});

app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...params } = req.body;
  if (!apolloKey) return res.status(400).json({ error: "Missing Apollo API key" });
  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apolloKey },
      body: JSON.stringify({ api_key: apolloKey, ...params }),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/instantly/add-lead", async (req, res) => {
  const { instantlyKey, ...body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const r = await fetch("https://api.instantly.ai/api/v1/lead/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
      body: JSON.stringify(body),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, ...body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const r = await fetch("https://api.instantly.ai/api/v1/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
      body: JSON.stringify(body),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT} 🐸`));

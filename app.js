'use strict';
const PEOPLE=['Daksh','Nikhil','Anuj','Ritik','Babu','Nini'];
const KEY='flatmateLedger.shared.v2', THEME='flatmateLedger.theme';
const $=id=>document.getElementById(id);
const fresh=()=>({shared:[],personal:[],nutrition:[],learning:[],work:[],review:{}});
let state=load();
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const month=date=>(date||'').slice(0,7);
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n)||0);
const paise=n=>Math.round((Number(n)||0)*100);
const rupees=n=>n/100;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s&&typeof s==='object'?{...fresh(),...s}:fresh()}catch{return fresh()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function toast(s){$('toast').textContent=s;clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').textContent='',3500)}
function dateLabel(d){return d?new Date(d+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function fillSelect(id,all=false){$(id).innerHTML=(all?'<option value="all">All flatmates</option>':'')+PEOPLE.map(p=>`<option>${p}</option>`).join('')}
['sPayer','pPerson','wPerson'].forEach(x=>fillSelect(x));
fillSelect('personalPersonFilter',true);fillSelect('workPersonFilter',true);
$('sDate').value=$('pDate').value=$('nDate').value=$('lDate').value=$('wDate').value=today();
$('members').innerHTML=PEOPLE.map((p,i)=>`<div class="member"><strong>${esc(p)}</strong><small>Household member ${i+1}</small></div>`).join('');
function showPage(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('pageTitle').textContent=({dashboard:'Overview',shared:'Shared expenses',personal:'Personal spending',nutrition:'Food & nutrition',learning:'Learning journal',work:'Work tracker',reports:'Reports & backup',settings:'Setup & sync'})[p]||'Overview';$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>showPage(b.dataset.goto));
$('menuToggle').onclick=()=>$('sidebar').classList.toggle('open');
function balance(items){
 const total=items.reduce((s,x)=>s+paise(x.amount),0),base=Math.floor(total/PEOPLE.length),rem=total%PEOPLE.length;
 const rows=PEOPLE.map((name,i)=>{const paid=items.filter(x=>x.payer===name).reduce((s,x)=>s+paise(x.amount),0),share=base+(i<rem?1:0);return {name,paid,share,net:paid-share}});
 const debt=rows.filter(x=>x.net<0).map(x=>({name:x.name,n:-x.net})),credit=rows.filter(x=>x.net>0).map(x=>({name:x.name,n:x.net})),payments=[];let i=0,j=0;
 while(i<debt.length&&j<credit.length){const n=Math.min(debt[i].n,credit[j].n);if(n>0)payments.push({from:debt[i].name,to:credit[j].name,amount:rupees(n)});debt[i].n-=n;credit[j].n-=n;if(!debt[i].n)i++;if(!credit[j].n)j++}
 return {rows,payments,total,share:base};
}
function monthsFor(selectId,items){const el=$(selectId),old=el.value||'all',ms=[...new Set(items.map(x=>month(x.date)).filter(Boolean))].sort().reverse();el.innerHTML='<option value="all">All dates</option>'+ms.map(m=>`<option value="${m}">${new Date(m+'-15T12:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`).join('');el.value=[...el.options].some(o=>o.value===old)?old:'all'}
function renderDashboard(){
 const m=today().slice(0,7),s=state.shared.filter(x=>x.pool==='shared'&&month(x.date)===m),p=state.personal.filter(x=>month(x.date)===m),c=balance(s);
 $('dashShared').textContent=money(rupees(c.total));$('dashShare').textContent=money(rupees(c.share));$('dashSharedCount').textContent=s.length+' transactions';$('dashPersonal').textContent=money(p.reduce((a,x)=>a+Number(x.amount),0));$('dashPersonalCount').textContent=p.length+' entries';$('dashSettlementCount').textContent=c.payments.length;
 $('dashBalances').innerHTML=c.rows.map(x=>`<div class="balance-row"><div><strong>${esc(x.name)}</strong><small>Paid ${money(rupees(x.paid))} · Share ${money(rupees(x.share))}</small></div><strong class="${x.net>=0?'positive':'negative'}">${x.net>=0?'+':'−'}${money(Math.abs(rupees(x.net)))}</strong></div>`).join('');
 const recent=[...state.shared].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);$('recentActivity').innerHTML=recent.length?recent.map(x=>`<div class="balance-row"><div><strong>${esc(x.description)}</strong><small>${dateLabel(x.date)} · ${esc(x.payer)}</small></div><strong>${money(x.amount)}</strong></div>`).join(''):'<div class="empty">No expenses yet.</div>';
}
function renderShared(){
 const pool=$('sharedPoolFilter').value||'all',m=$('sharedMonth').value||'all',q=$('sharedSearch').value.toLowerCase().trim();
 const rows=state.shared.filter(x=>(pool==='all'||x.pool===pool)&&(m==='all'||month(x.date)===m)&&`${x.description} ${x.payer} ${x.category}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
 $('sharedRows').innerHTML=rows.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><strong>${esc(x.description)}</strong><br><span class="muted">${esc(x.category||'Other')}</span></td><td><span class="tag ${x.pool==='market'?'market':''}">${x.pool==='market'?'Saturday Market':'Shared household'}</span></td><td>${esc(x.payer)}</td><td><strong>${money(x.amount)}</strong></td><td><button class="btn" data-edit-shared="${esc(x.id)}">Edit</button> <button class="btn" data-delete-shared="${esc(x.id)}">Delete</button></td></tr>`).join('');
 $('sharedEmpty').classList.toggle('hidden',rows.length>0);
 $('sharedTotal').textContent=money(state.shared.filter(x=>x.pool==='shared').reduce((s,x)=>s+Number(x.amount),0));$('marketTotal').textContent=money(state.shared.filter(x=>x.pool==='market').reduce((s,x)=>s+Number(x.amount),0));$('sharedCount').textContent=state.shared.length;
 const all=state.shared.filter(x=>x.pool==='shared'&&( $('settlementMonth').value==='all'||month(x.date)===$('settlementMonth').value)),c=balance(all);
 $('settleTotal').textContent=money(rupees(c.total));$('settleShare').textContent=money(rupees(c.share));$('settleCount').textContent=c.payments.length;
 $('settlementRows').innerHTML=c.payments.length?c.payments.map(x=>`<tr><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td><strong>${money(x.amount)}</strong></td></tr>`).join(''):'<tr><td colspan="3">No payments required for this period.</td></tr>';
}
function renderPersonal(){
 const q=$('personalSearch').value.toLowerCase().trim(),p=$('personalPersonFilter').value||'all',m=$('personalMonth').value||'all';
 const rows=state.personal.filter(x=>(p==='all'||x.person===p)&&(m==='all'||month(x.date)===m)&&`${x.description} ${x.person} ${x.category}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
 $('personalRows').innerHTML=rows.map(x=>`<tr><td>${dateLabel(x.date)}</td><td>${esc(x.person)}</td><td>${esc(x.description)}</td><td>${esc(x.category)}</td><td>${money(x.amount)}</td><td><button class="btn" data-delete-personal="${esc(x.id)}">Delete</button></td></tr>`).join('');
 $('personalEmpty').classList.toggle('hidden',rows.length>0);$('personalTotal').textContent=money(rows.reduce((s,x)=>s+Number(x.amount),0));$('personalCount').textContent=rows.length;
 const cats={};rows.forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));$('personalTop').textContent=Object.keys(cats).sort((a,b)=>cats[b]-cats[a])[0]||'—';
}
function renderNutrition(){
 const f=$('nutritionFilterDate').value,rows=state.nutrition.filter(x=>!f||x.date===f).sort((a,b)=>b.date.localeCompare(a.date));
 $('nutritionRows').innerHTML=rows.map(x=>`<tr><td>${dateLabel(x.date)}</td><td>${esc(x.type)}</td><td><strong>${esc(x.name)}</strong><br><span class="muted">${esc(x.serving||'')}</span></td><td>${Number(x.calories||0)} kcal</td><td>${Number(x.protein||0)} g</td><td>${Number(x.iron||0)} mg</td><td><button class="btn" data-delete-nutrition="${esc(x.id)}">Delete</button></td></tr>`).join('');
 $('nutritionEmpty').classList.toggle('hidden',rows.length>0);const t=state.nutrition.filter(x=>x.date===today());$('nTodayCalories').textContent=t.reduce((s,x)=>s+Number(x.calories||0),0)+' kcal';$('nTodayProtein').textContent=t.reduce((s,x)=>s+Number(x.protein||0),0)+' g';$('nTodayCount').textContent=t.length;
}
function renderLearning(){
 const rows=[...state.learning].sort((a,b)=>b.date.localeCompare(a.date));$('learningRows').innerHTML=rows.map(x=>`<div class="panel"><div class="panel-head"><div><strong>${dateLabel(x.date)} · ${Number(x.hours||0)} hours</strong><div class="muted">${esc(x.project||'Learning')}</div></div><button class="btn" data-delete-learning="${esc(x.id)}">Delete</button></div><h3>${esc(x.learned)}</h3>${x.done?`<p><strong>Completed:</strong> ${esc(x.done)}</p>`:''}${x.mistakes?`<p><strong>Blockers:</strong> ${esc(x.mistakes)}</p>`:''}${x.next?`<p><strong>Next:</strong> ${esc(x.next)}</p>`:''}<span class="tag">${esc(x.status)}</span></div>`).join('');
 $('learningEmpty').classList.toggle('hidden',rows.length>0);$('lTotalHours').textContent=rows.reduce((s,x)=>s+Number(x.hours||0),0);$('lDays').textContent=new Set(rows.map(x=>x.date)).size;$('lCompleted').textContent=rows.filter(x=>x.status==='Completed').length;
}
function renderWork(){
 const p=$('workPersonFilter').value||'all',s=$('workStatusFilter').value||'all',rows=state.work.filter(x=>(p==='all'||x.person===p)&&(s==='all'||x.status===s)).sort((a,b)=>b.date.localeCompare(a.date));
 $('workRows').innerHTML=rows.map(x=>`<tr><td>${dateLabel(x.date)}</td><td><strong>${esc(x.task)}</strong></td><td>${esc(x.person)}</td><td><span class="tag">${esc(x.status)}</span></td><td>${esc(x.notes||'')}</td><td><button class="btn" data-work-done="${esc(x.id)}">${x.status==='Completed'?'Reopen':'Complete'}</button> <button class="btn" data-delete-work="${esc(x.id)}">Delete</button></td></tr>`).join('');$('workEmpty').classList.toggle('hidden',rows.length>0);
}
function renderReports(){$('rSharedCount').textContent=state.shared.length;$('rPersonalCount').textContent=state.personal.length;$('rLearningCount').textContent=state.learning.length;document.querySelectorAll('[data-review]').forEach(e=>e.checked=!!state.review[e.dataset.review])}
function render(){
 monthsFor('sharedMonth',state.shared);monthsFor('settlementMonth',state.shared);monthsFor('personalMonth',state.personal);
 renderDashboard();renderShared();renderPersonal();renderNutrition();renderLearning();renderWork();renderReports();
}
function toggleForm(panel,form,open){$(panel).classList.toggle('hidden',!open);if(open){$(form).reset();const d=$(form).querySelector('input[type=date]');if(d)d.value=today();$(panel).scrollIntoView({behavior:'smooth',block:'start'})}}
$('toggleSharedForm').onclick=()=>toggleForm('sharedFormPanel','sharedForm',$('sharedFormPanel').classList.contains('hidden'));$('cancelShared').onclick=()=>toggleForm('sharedFormPanel','sharedForm',false);
$('togglePersonalForm').onclick=()=>toggleForm('personalFormPanel','personalForm',$('personalFormPanel').classList.contains('hidden'));$('cancelPersonal').onclick=()=>toggleForm('personalFormPanel','personalForm',false);
$('toggleNutritionForm').onclick=()=>toggleForm('nutritionFormPanel','nutritionForm',$('nutritionFormPanel').classList.contains('hidden'));$('cancelNutrition').onclick=()=>toggleForm('nutritionFormPanel','nutritionForm',false);
$('toggleLearningForm').onclick=()=>toggleForm('learningFormPanel','learningForm',$('learningFormPanel').classList.contains('hidden'));$('cancelLearning').onclick=()=>toggleForm('learningFormPanel','learningForm',false);
$('toggleWorkForm').onclick=()=>toggleForm('workFormPanel','workForm',$('workFormPanel').classList.contains('hidden'));$('cancelWork').onclick=()=>toggleForm('workFormPanel','workForm',false);
$('sharedForm').onsubmit=e=>{e.preventDefault();const x={id:id(),description:$('sDesc').value.trim(),amount:Number($('sAmount').value),payer:$('sPayer').value,date:$('sDate').value,pool:$('sPool').value,category:$('sCategory').value,notes:$('sNotes').value.trim()};if(!x.description||!x.date||!Number.isFinite(x.amount)||x.amount<=0)return toast('Enter a description, date and positive amount.');state.shared.push(x);save();toggleForm('sharedFormPanel','sharedForm',false);toast('Expense saved on this device.')};
$('personalForm').onsubmit=e=>{e.preventDefault();const x={id:id(),person:$('pPerson').value,description:$('pDesc').value.trim(),amount:Number($('pAmount').value),date:$('pDate').value,category:$('pCategory').value};if(!x.description||!x.date||!Number.isFinite(x.amount)||x.amount<=0)return toast('Enter a description, date and positive amount.');state.personal.push(x);save();toggleForm('personalFormPanel','personalForm',false);toast('Personal expense saved locally.')};
$('nutritionForm').onsubmit=e=>{e.preventDefault();const x={id:id(),date:$('nDate').value,type:$('nType').value,name:$('nName').value.trim(),serving:$('nServing').value.trim(),calories:Number($('nCalories').value)||0,protein:Number($('nProtein').value)||0,fibre:Number($('nFibre').value)||0,iron:Number($('nIron').value)||0,zinc:Number($('nZinc').value)||0,calcium:Number($('nCalcium').value)||0,vitaminD:Number($('nVitaminD').value)||0,b12:Number($('nB12').value)||0,notes:$('nNotes').value.trim()};if(!x.name||!x.date)return toast('Enter a name and date.');state.nutrition.push(x);save();toggleForm('nutritionFormPanel','nutritionForm',false);toast('Nutrition entry saved locally.')};
$('learningForm').onsubmit=e=>{e.preventDefault();const x={id:id(),date:$('lDate').value,hours:Number($('lHours').value)||0,project:$('lProject').value.trim(),status:$('lStatus').value,learned:$('lLearned').value.trim(),done:$('lDone').value.trim(),mistakes:$('lMistakes').value.trim(),next:$('lNext').value.trim()};if(!x.learned||!x.date)return toast('Enter what you learned and the date.');state.learning.push(x);save();toggleForm('learningFormPanel','learningForm',false);toast('Study log saved locally.')};
$('workForm').onsubmit=e=>{e.preventDefault();const x={id:id(),task:$('wTask').value.trim(),person:$('wPerson').value,date:$('wDate').value,status:$('wStatus').value,notes:$('wNotes').value.trim()};if(!x.task||!x.date)return toast('Enter a task and date.');state.work.push(x);save();toggleForm('workFormPanel','workForm',false);toast('Task saved locally.')};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.deleteShared){if(confirm('Delete this shared expense?')){state.shared=state.shared.filter(x=>x.id!==b.dataset.deleteShared);save();toast('Expense deleted')}} 
 if(b.dataset.editShared){const x=state.shared.find(y=>y.id===b.dataset.editShared);if(x){$('sDesc').value=x.description;$('sAmount').value=x.amount;$('sPayer').value=x.payer;$('sDate').value=x.date;$('sPool').value=x.pool;$('sCategory').value=x.category;$('sNotes').value=x.notes||'';state.shared=state.shared.filter(y=>y.id!==x.id);toggleForm('sharedFormPanel','sharedForm',true);$('sDesc').value=x.description;$('sAmount').value=x.amount;$('sPayer').value=x.payer;$('sDate').value=x.date;$('sPool').value=x.pool;$('sCategory').value=x.category;$('sNotes').value=x.notes||'';toast('Editing is staged as a new save. Save to replace the original entry.')}} 
 if(b.dataset.deletePersonal){if(confirm('Delete this personal entry?')){state.personal=state.personal.filter(x=>x.id!==b.dataset.deletePersonal);save()}}
 if(b.dataset.deleteNutrition){if(confirm('Delete this nutrition entry?')){state.nutrition=state.nutrition.filter(x=>x.id!==b.dataset.deleteNutrition);save()}}
 if(b.dataset.deleteLearning){if(confirm('Delete this learning entry?')){state.learning=state.learning.filter(x=>x.id!==b.dataset.deleteLearning);save()}}
 if(b.dataset.deleteWork){if(confirm('Delete this task?')){state.work=state.work.filter(x=>x.id!==b.dataset.deleteWork);save()}}
 if(b.dataset.workDone){state.work=state.work.map(x=>x.id===b.dataset.workDone?{...x,status:x.status==='Completed'?'Pending':'Completed'}:x);save()}
});
['sharedSearch','sharedMonth','sharedPoolFilter'].forEach(x=>$(x).addEventListener(x==='sharedSearch'?'input':'change',renderShared));$('settlementMonth').onchange=renderShared;
['personalSearch','personalPersonFilter','personalMonth'].forEach(x=>$(x).addEventListener(x==='personalSearch'?'input':'change',renderPersonal));$('nutritionFilterDate').onchange=renderNutrition;
document.querySelectorAll('[data-review]').forEach(x=>x.onchange=()=>{state.review[x.dataset.review]=x.checked;localStorage.setItem(KEY,JSON.stringify(state))});
function download(content,type,name){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(v){let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function csv(rows,name){if(!rows.length)return toast('No data to export.');const keys=[...new Set(rows.flatMap(x=>Object.keys(x)))];download('\ufeff'+[keys.map(csvCell).join(','),...rows.map(x=>keys.map(k=>csvCell(x[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8',name)}
function backup(){download(JSON.stringify({app:'Flatmate Ledger',version:2,exportedAt:new Date().toISOString(),data:state},null,2),'application/json',`flatmate-ledger-backup-${today()}.json`)}
$('exportBackup').onclick=$('exportBackupTop').onclick=backup;
$('sharedCsv').onclick=$('sharedReportCsv').onclick=()=>csv(state.shared,`shared-expenses-${today()}.csv`);$('personalCsv').onclick=$('personalReportCsv').onclick=()=>csv(state.personal,`personal-expenses-${today()}.csv`);$('nutritionCsv').onclick=()=>csv(state.nutrition,`nutrition-${today()}.csv`);
$('printShared').onclick=()=>{showPage('shared');window.print()};$('printPersonal').onclick=()=>{showPage('personal');window.print()};$('printLearning').onclick=()=>{showPage('learning');window.print()};
$('importBackup').onclick=()=>$('backupFile').click();$('backupFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('File exceeds 10 MB.');const p=JSON.parse(await f.text()),d=p.data||p;if(!['shared','personal','nutrition','learning','work'].every(k=>Array.isArray(d[k]??[])))throw Error('Invalid backup structure.');if(!confirm('Replace this device’s current local data with the imported backup? Export current data first if needed.'))return;state={...fresh(),...d};save();toast('Backup imported.')}catch(err){toast('Import failed: '+err.message)}finally{e.target.value=''}};
$('clearLocal').onclick=()=>{if(confirm('Delete all local records from this browser? This cannot be undone unless you have a backup.')){state=fresh();save();toast('Local records deleted.')}};
$('themeToggle').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem(THEME,t)};
document.documentElement.dataset.theme=localStorage.getItem(THEME)||'light';
$('supabaseForm').onsubmit=e=>{e.preventDefault();const url=$('sbUrl').value.trim(),key=$('sbKey').value.trim();if(!url||!key)return toast('Enter both the project URL and publishable/anon key.');if(!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url))return toast('Use the Supabase project URL shown in your dashboard.');localStorage.setItem('flatmateLedger.supabaseConfig',JSON.stringify({url,key}));toast('Configuration saved in this browser. Cloud sync is not enabled by these fields alone.');};
$('clearSupabase').onclick=()=>{localStorage.removeItem('flatmateLedger.supabaseConfig');$('sbUrl').value='';$('sbKey').value='';toast('Local configuration cleared.')};
try{const c=JSON.parse(localStorage.getItem('flatmateLedger.supabaseConfig')||'null');if(c){$('sbUrl').value=c.url||'';$('sbKey').value=c.key||''}}catch{}
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();

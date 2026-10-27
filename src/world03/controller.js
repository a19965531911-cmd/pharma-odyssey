import {createIcons,X,RotateCcw,ArrowLeft,ArrowRight,Anchor,Sailboat,BookOpen,Map,MoveUp,Check,Compass} from 'lucide';
import {regions,byId,drugs,bossPhases,sourceNote,references} from './data.js';
import {CirculationSimulation,ecgAt} from './simulation.js';
import {progress,unlocked,completeRegion} from './quests.js';
import {links} from './geography.js';
import {TransitController} from './transport.js';
import './pulse.css';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}"></i>`;
const tools={X,RotateCcw,ArrowLeft,ArrowRight,Anchor,Sailboat,BookOpen,Map,MoveUp,Check,Compass};
export function createPulseController({store,getWorld,startWorld,toast}){
 const $=s=>document.querySelector(s),p=()=>progress(store.state);let simulation=new CirculationSimulation(),current=null,feedback='',lastTick=0,review=null,endingTimer=null;
 const open=()=>store.state.scene==='pulse'&&!!getWorld()?.city&&getWorld().definition.id==='pulse'&&!getWorld().loading;
 const save=()=>{const s=p();s.sim=simulation.serialize();if(getWorld()?.definition.id==='pulse'){getWorld().cityState={sim:simulation.read(),complete:s.complete};getWorld().city.state.complete=s.complete;}store.save();};
 function close(){clearTimeout(endingTimer);$('#pulse-overlay')?.remove();current=null;feedback='';if(getWorld()){getWorld().paused=false;getWorld().keys.clear();}document.body.classList.remove('pulse-panel-open');}
 function shell(html,wide=false){$('#pulse-overlay')?.remove();const root=document.createElement('section');root.id='pulse-overlay';root.className=wide?'pulse-screen':'pulse-panel';root.setAttribute('role','dialog');root.setAttribute('aria-label','脉流群岛档案');root.innerHTML=html;document.body.append(root);document.body.classList.add('pulse-panel-open');getWorld().paused=true;getWorld().keys.clear();$('[data-pulse-close]')?.addEventListener('click',close);createIcons({icons:tools});}
 const header=(en,title)=>`<header><div><small>${esc(en)}</small><h2>${esc(title)}</h2></div><button data-pulse-close title="返回探索" aria-label="返回探索">${icon('x')}</button></header>`;
 const status=r=>p().complete.includes(r.id)?'已同步':unlocked(store.state,r.id)?'待修复':'待前置回路';
 const nearest=()=>regions.reduce((a,b)=>Math.hypot(a.x-getWorld().position.x,a.z-getWorld().position.z)<Math.hypot(b.x-getWorld().position.x,b.z-getWorld().position.z)?a:b);
 function anchors(){getWorld().setAnchors([...regions.flatMap(r=>[{id:r.id,type:'prop',label:r.name+' · 循环装置',position:[r.x,r.h,r.z+4.5]},{id:'dock-'+r.id,type:'portal',label:r.name+'码头',position:[r.x+5.5,r.h,r.z+5.5]},{id:'npc-'+r.id,type:'npc',label:r.npc,position:[r.x-4.5,r.h,r.z+2.5]}]),{id:'nerve-return',type:'portal',label:'返航 · 神经城',position:[-4,0,34]},{id:'lift-H',type:'prop',label:'核心升降台',position:[28,6,-50.5]}]);}
 function ready(){
  document.body.classList.remove('world02');document.body.classList.add('world03');$('#pulse-entry')?.remove();$('#nerve-entry')?.remove();
  simulation=new CirculationSimulation(p().sim);getWorld().cityState={sim:simulation.read(),complete:p().complete};getWorld().city.state.complete=p().complete;getWorld().city.state.dock=p().transport.dock||'A';getWorld().rebuildNavigation();
  getWorld().transit=new TransitController(p().transport);getWorld().onTransitFrame=frame=>{getWorld().city.state.dock=p().transport.dock||'A';if(frame.arrived){save();toast(frame.lift!==undefined?'升降台核验完成，核心封印已解除。':'已靠岸 · '+byId(p().transport.dock).name);anchors();if(frame.lift!==undefined&&!p().complete.includes('H'))boss();}};
  if(p().transport.liftUnlocked)getWorld().city.parts.H.lift.position.y=.02;
  $('#world-canvas').setAttribute('aria-label','脉流群岛八岛连续探索3D世界');$('.brand small span').textContent='WORLD 03';$('#ambient-caption').textContent='当世界的心跳不再一致。';
  if(!$('#pulse-minimap')){const mini=document.createElement('button');mini.id='pulse-minimap';mini.title='脉流航图';mini.onclick=map;document.querySelector('#game').append(mini);}
  anchors();updateHud();save();
 }
 function depart(){
  if(!store.state.storyFlags.world02Complete&&!store.state.done.world02){toast('先修复神经城的中央审查系统。');return;}
  p().nervePosition={...getWorld().position};$('#nerve-overlay')?.remove();$('#overlay-root').replaceChildren();store.state.position=p().position||{x:0,y:.08,z:32.5};startWorld('pulse');
 }
 function leave(){if(getWorld().transit?.active){toast('靠岸后再返航。');return;}p().position={...getWorld().position};save();close();$('#pulse-minimap')?.remove();document.body.classList.remove('world03');store.state.position=p().nervePosition||{x:3,y:.08,z:31};store.save();startWorld('nerve');}
 function chartSvg(mini=false){
  const x=r=>52+(r.x+34)*4.3,y=r=>25+(r.z+58)*3.2;
  return `<svg viewBox="0 0 370 340" aria-label="脉流群岛实体桥梁航图">${links.map(([a,b])=>`<line x1="${x(byId(a))}" y1="${y(byId(a))}" x2="${x(byId(b))}" y2="${y(byId(b))}" stroke="${a==='D'&&b==='G'&&!p().complete.includes('E')?'#a96d88':'#8baaa2'}" stroke-width="${mini?3:2}" ${a==='D'&&b==='G'?'stroke-dasharray="5 4"':''}/>`).join('')}${regions.map(r=>`<g><circle cx="${x(r)}" cy="${y(r)}" r="${mini?9:13}" fill="${p().complete.includes(r.id)?'#f2d38e':r.color}" stroke="#d7e9dd" stroke-width="1"/><text x="${x(r)}" y="${y(r)+4}" text-anchor="middle" fill="#123e49">${r.id}</text>${mini?'':`<text x="${x(r)}" y="${y(r)+29}" text-anchor="middle" fill="#e1eee3">${r.name}</text>`}</g>`).join('')}<circle cx="${52+(getWorld().position.x+34)*4.3}" cy="${25+(getWorld().position.z+58)*3.2}" r="5" fill="#fff" stroke="#133f4c" stroke-width="2"/></svg>`;
 }
 function updateHud(){
  if(!open())return;const s=p(),r=nearest(),t=s.transport;
  if(!getWorld().transit?.active&&Math.hypot(r.x-getWorld().position.x,r.z-getWorld().position.z)<10){s.region=r.id;if(!s.visited.includes(r.id)){s.visited.push(r.id);save();}}
  $('#scene-title').textContent=getWorld().transit?.active?'脉流航船 · '+({boarding:'登船',sailing:'航行',mooring:'靠岸',lifting:'升降核验'}[t.mode]||'') :r.name;
  $('#scene-subtitle').textContent='WORLD 03 / '+r.en;$('#quest-title').textContent=s.complete.includes('H')?'下一段失落记录 · 潮息港':r.goal;
  $('#quest-description').textContent=getWorld().transit?.active?'目的地：'+byId(t.to).name:unlocked(store.state,r.id)?r.story:'前置回路：'+r.needs.filter(n=>!s.complete.includes(n)).map(n=>byId(n).name).join('、');
  $('#quest-progress').textContent=`群岛同步 ${s.complete.length} / 8 · 航行 ${t.trips||0} 次`;$('#xp').textContent=store.state.xp;
  const mini=$('#pulse-minimap');if(mini)mini.innerHTML=chartSvg(true)+`<span>脉流航图 · ${s.complete.length}/8</span>`;
 }
 function instrument(){return `<div class="pulse-instruments">${[['heartRate','HR / 心率'],['strokeVolume','SV / 每搏量'],['cardiacOutput','CO / 心输出量'],['vascularResistance','SVR / 阻力'],['meanArterialPressure','MAP / 平均压'],['bloodVolume','容量']].map(([k,label])=>`<div><span>${label}</span><b data-meter="${k}"></b></div>`).join('')}</div><div class="pulse-oxygen"><label>O₂ 供给 <b data-meter="oxygenSupply"></b><meter min="0" max="3" data-bar="oxygenSupply"></meter></label><label>O₂ 需求 <b data-meter="oxygenDemand"></b><meter min="0" max="3" data-bar="oxygenDemand"></meter></label></div><small class="pulse-model">相对基线 ×1 · CO = HR × SV · MAP ≈ CO × SVR（忽略中心静脉压）。所有参数为教学假设，非临床数值或患者预测。</small><canvas id="pulse-ecg" width="720" height="130" aria-label="教学 ECG 相位示意"></canvas><small class="pulse-model">ECG 教学示意 · 横轴：归一化心动周期相位 0–1；纵轴：相对振幅，无诊断时间标尺。</small><div class="pulse-probes">${[['conductionState.avSpeed','AV 传导'],['conductionState.naSpeed','Na 传导'],['conductionState.refractoryPeriod','不应期'],['conductionState.qt','复极指数']].map(([k,label])=>`<span>${label}<b data-meter="${k}"></b></span>`).join('')}</div>`;}
 function mechanismExtras(r){
  if(r.id==='B')return '<canvas id="pulse-ap" width="720" height="110" aria-label="快反应心肌与结区动作电位示意"></canvas><small class="pulse-model">快反应心肌 / 慢反应结区对照：示意 Na 上升支、Ca 依赖结区传导和复极。非电生理求解器。</small>';
  if(r.id==='F'||r.id==='D')return `<div class="pulse-probes">${[['renin','肾素'],['angiotensinII','Ang II'],['at1Signal','AT1 信号'],['aldosterone','醛固酮效应'],['bradykinin','缓激肽']].map(([k,l])=>`<span>${l}<b data-meter="${k}"></b></span>`).join('')}</div>${r.id==='F'?'<p class="pulse-model">节段装置：近端小管 SGLT2 → 髓袢升支粗段 NKCC2 → 远曲小管 NCC → 集合管醛固酮受体。基础机制观察，未推出课件正式考试。</p>':''}`;
  if(r.id==='E')return `<div class="pulse-probes">${[['contractility','收缩力'],['preload','前负荷'],['afterload','后负荷'],['bloodVolume','容量'],['renin','神经内分泌代理']].map(([k,l])=>`<span>${l}<b data-meter="${k}"></b></span>`).join('')}</div><p class="pulse-model">长期重构获益不能用即时输出判断；模型只显示急性机制方向，慢性结局由证据与情境题区分。</p>`;
  if(r.id==='G')return `<div class="pulse-probes">${[['plateletActivity','血小板活化'],['coagulation','凝血'],['clotFormation','形成速率'],['clotClearance','清除速率'],['bleedingRisk','出血风险代理']].map(([k,l])=>`<span>${l}<b data-meter="${k}"></b></span>`).join('')}</div>`;
  return '';
 }
 function showQuestion(question,index,handler){
  return `<section class="pulse-question"><small>${handler==='boss'?'CIRCULATORY TRIAL':'机制推理'} · ${index+1}</small><h3>${esc(question.prompt)}</h3>${question.options.map((option,i)=>`<button data-pulse-answer="${i}" data-handler="${handler}"><span>${String.fromCharCode(65+i)}</span>${esc(option)}</button>`).join('')}</section>`;
 }
 function render(r){
  current=r.id;const s=p(),obs=s.observations[r.id]||[],done=s.complete.includes(r.id),index=s.answers[r.id]||0,isReview=review===r.id;
  const ready=r.ops.every(op=>obs.includes(op.id))&&(!r.case||s.cases[r.id]);
  shell(header(r.en,r.id+' / '+r.name)+`<div class="pulse-scroll"><div class="pulse-region-status"><span>${status(r)}</span><span>${obs.length}/${r.ops.length} 观察 · ${(s.answers[r.id]||0)}/${r.questions.length} 校对</span></div><p class="pulse-intro">${esc(r.intro)}</p><div class="pulse-controls" role="group" aria-label="机制实验">${r.ops.map(op=>`<button data-pulse-op="${op.id}" aria-pressed="${simulation.drug===op.drug||!op.drug&&obs.at(-1)===op.id}" title="${esc(op.note)}">${obs.includes(op.id)?'<span class="pulse-check">✓</span>':''}${esc(op.label)}</button>`).join('')}</div><div class="pulse-tools"><button id="pulse-reset" title="复位当前实验">${icon('rotate-ccw')}</button><span>${esc(simulation.drug?drugs[simulation.drug].en:'对照实验')}</span></div>${instrument()}${mechanismExtras(r)}${r.id==='A'?`<div class="pulse-sliders">${[['heartRate','泵速'],['vascularResistance','阻力'],['bloodVolume','容量']].map(([k,l])=>`<label>${l}<input data-pulse-input="${k}" aria-label="${l}" type="range" min="0.5" max="1.8" step="0.05" value="${simulation.inputs[k]||1}"></label>`).join('')}</div>`:''}<p class="pulse-feedback" role="status">${esc(feedback||'白榆：让机制与记录相互核对，保留每个结论的条件。')}</p>${r.case?`<section class="pulse-case"><small>虚构教学病例</small><p>${esc(r.case.prompt)}</p><button id="pulse-case-check">${icon('check')}核验机制方案</button><span class="pulse-case-status">${s.cases[r.id]?'已核验':''}</span></section>`:''}${done&&!isReview?`<div class="pulse-success">${icon('check')} 回路已同步</div><p class="pulse-story">${esc(r.story)}</p><button id="pulse-review" class="pulse-command">${icon('book-open')}复习本区</button>`:ready&&index<r.questions.length?showQuestion(r.questions[index],index,'region'):'<p class="pulse-model">原始记录仍未齐备。</p>'}<footer class="pulse-source">${sourceNote}</footer></div>`);
  $('[data-pulse-close]').onclick=close;
  document.querySelectorAll('[data-pulse-op]').forEach(b=>b.onclick=()=>operate(r,b.dataset.pulseOp));
  $('#pulse-reset').onclick=()=>{simulation.reset(r.preset);feedback='实验已回到情境对照；观察与通关记录保留。';save();render(r);};
  document.querySelectorAll('[data-pulse-input]').forEach(input=>input.oninput=()=>{simulation.setInput(input.dataset.pulseInput,+input.value);save();draw();});
  $('#pulse-case-check')?.addEventListener('click',()=>{const ok=simulation.drug===r.case.drug&&r.case.test(simulation.read());if(ok){s.cases[r.id]=true;feedback='机制匹配。'+drugs[r.case.drug].mechanism+' 注意：'+drugs[r.case.drug].risk;}else{feedback='方案未满足病例的靶点与目标。先复位病例，再检查药物机制；数值下降并不等于适用。';logError(r.id,'病例机制核验',feedback);}save();render(r);});
  $('#pulse-review')?.addEventListener('click',()=>{review=r.id;s.answers[r.id]=0;feedback='复习记录已开启，航路与奖励保留。';save();render(r);});
  wireAnswers(r);draw();
 }
 function operate(r,id){
  const op=r.ops.find(o=>o.id===id);if(!op)return;const s=p();if(op.preset)simulation.reset(op.preset);if(op.drug){simulation.apply(op.drug);if(!s.codex.includes(op.drug))s.codex.push(op.drug);}if(op.inputs)for(const [key,value] of Object.entries(op.inputs))simulation.setInput(key,value);
  (s.observations[r.id] ||= []);if(!s.observations[r.id].includes(id))s.observations[r.id].push(id);feedback=op.note+(op.drug?' 典型风险：'+drugs[id].risk:'');save();render(r);
 }
 function logError(region,question,explanation,choice){const s=p();s.errors.push({region,question,explanation,choice:choice??null,time:new Date().toISOString()});s.errors=s.errors.slice(-500);store.state.mistakes++;}
 function wireAnswers(r){document.querySelectorAll('[data-pulse-answer]').forEach(b=>b.onclick=()=>{
  if(b.dataset.handler==='boss'){bossAnswer(+b.dataset.pulseAnswer);return;}
  const s=p(),i=s.answers[r.id]||0,q=r.questions[i];if(!q)return;
  if(+b.dataset.pulseAnswer!==q.answer){feedback='需要重新核对。'+q.explanation;logError(r.id,q.prompt,q.explanation,+b.dataset.pulseAnswer);save();render(r);return;}
  s.answers[r.id]=i+1;feedback='校对正确。'+q.explanation;
  if(i+1===r.questions.length){const first=completeRegion(store.state,r.id);review=null;if(first){getWorld().city.state.complete=s.complete;getWorld().rebuildNavigation();toast(r.name+'已同步'+(r.id==='E'?' · 暗礁闸桥开启':''));}}
  save();updateHud();render(r);
 });}
 function interact(a){
  if(getWorld().transit?.active)return;
  if(a.id==='nerve-return'){leave();return;}
  if(a.id.startsWith('dock-')){dock(a.id.slice(5));return;}
  if(a.id.startsWith('npc-')){const r=byId(a.id.slice(4));shell(header('PULSE ARCHIVES / RESIDENT',r.npc)+`<div class="pulse-scroll"><p class="pulse-intro">${esc(r.intro)}</p><p class="pulse-story">${esc(p().complete.includes(r.id)?r.story:unlocked(store.state,r.id)?r.goal:'阿苓：前面的回路还没有恢复，我们先回去核对记录。')}</p></div>`);return;}
  if(a.id==='lift-H'){if(!unlocked(store.state,'H')){toast('七条外围回路尚未全部同步。');return;}close();getWorld().transit.startLift('H');save();return;}
  const r=byId(a.id);if(!r)return;if(!unlocked(store.state,r.id)){toast('先修复：'+r.needs.filter(n=>!p().complete.includes(n)).map(n=>byId(n).name).join('、'));return;}
  current=r.id;feedback='';if(r.id==='H'){if(!p().transport.liftUnlocked){interact({id:'lift-H'});return;}if(p().complete.includes('H'))ending();else boss();return;}
  if(p().activeExperiment!==r.id){simulation.reset(r.preset);p().activeExperiment=r.id;}save();render(r);
 }
 function navigate(id,kind='region'){
  const r=byId(id);if(!r)return;close();const anchor=getWorld().anchors.find(a=>a.id===(kind==='dock'?'dock-':'')+id);getWorld().approach(anchor);
  if(getWorld().distance(anchor)>=1.7&&!getWorld().path.length)toast(id==='G'||id==='H'?'暗礁航路尚未接通，先修复心衰泵站。':'这条步行路线暂不可达。');
 }
 function map(){
  if(getWorld().transit?.active){toast('航船正在运行，靠岸后展开航图。');return;}
  shell(header('PULSE ARCHIPELAGO / WORLD CHART','脉流群岛航图')+`<div class="pulse-map-layout"><div class="pulse-chart">${chartSvg()}<p>机械桥梁 · 血流航道 · 暗礁闸桥</p></div><div class="pulse-route-list">${regions.map(r=>`<article><div><b>${r.id} ${r.name}</b><small>${r.en} · ${status(r)}</small></div><button data-pulse-nav="${r.id}" title="追踪${r.name}" aria-label="追踪${r.name}">${icon('compass')}</button><button data-dock-nav="${r.id}" title="${r.name}码头" aria-label="${r.name}码头">${icon('anchor')}</button></article>`).join('')}</div></div>`,true);
  document.querySelectorAll('[data-pulse-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.pulseNav));document.querySelectorAll('[data-dock-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.dockNav,'dock'));
 }
 function dock(id){
  const s=p();if(!unlocked(store.state,id)){toast('这处码头的循环控制尚未接通。');return;}s.transport.dock=id;getWorld().city.state.dock=id;save();
  shell(header('PULSE FERRY / '+byId(id).en,'脉流航船 · '+byId(id).name)+`<div class="pulse-scroll"><p class="pulse-intro">桨轮已校准，船灯等待下一段航线。</p><div class="pulse-voyages">${regions.filter(r=>r.id!==id).map(r=>`<div><span>${r.name}<small>${status(r)}</small></span><button data-sail="${r.id}" ${unlocked(store.state,r.id)?'':'disabled'} title="登船前往${r.name}">${icon('sailboat')}启航</button>${s.fastTravel&&unlocked(store.state,r.id)?`<button data-fast-sail="${r.id}" title="快速航行至${r.name}">${icon('arrow-right')}</button>`:''}</div>`).join('')}</div>${s.fastTravel?'<p class="pulse-model">同步航道已开放 · 快速航行</p>':''}</div>`);
  const sail=(to,fast)=>{close();getWorld().transit.start(id,to,fast);save();};document.querySelectorAll('[data-sail]').forEach(b=>b.onclick=()=>sail(b.dataset.sail,false));document.querySelectorAll('[data-fast-sail]').forEach(b=>b.onclick=()=>sail(b.dataset.fastSail,true));
 }
 function boss(){
  current='H';const s=p(),n=s.boss.phase;if(n>=4){ending();return;}const phase=bossPhases[n];
  if(s.boss.activePhase!==n){if(n<3)simulation.reset(phase.preset);s.boss.activePhase=n;s.boss.mechanism=false;save();}
  const q=phase.questions[s.boss.index];shell(header('THE INVERTED PULSE / '+phase.en,'逆脉之王 · '+phase.name)+`<div class="pulse-scroll"><div class="pulse-boss-track">${bossPhases.map((ph,i)=>`<span class="${i===n?'current':i<n?'past':''}">${i+1} ${ph.name}</span>`).join('')}</div><p class="pulse-intro">${esc(phase.goal||'Restore the original conditions. Every conclusion requires its limits.')}</p>${n<3?`${instrument()}<div class="pulse-controls">${[...new Set([phase.drug,n===0?'digoxin':n===1?'enalapril':'dobutamine',n===0?'amiodarone':n===1?'furosemide':'metoprolol'])].map(id=>`<button data-boss-drug="${id}">${esc(drugs[id].name)}</button>`).join('')}</div><div class="pulse-tools"><button id="pulse-boss-reset" title="复位本阶段">${icon('rotate-ccw')}</button><span>${s.boss.mechanism?'靶点已校正':'中央指令待校正'}</span></div>`:''}<p class="pulse-feedback" role="status">${esc(feedback||'逆脉之王：只要让数字一致，条件便不再重要。')}</p>${n===3||s.boss.mechanism?showQuestion(q,s.boss.index,'boss'):'<p class="pulse-model">中央指令尚未通过机制核验。</p>'}<footer class="pulse-source">${sourceNote}</footer></div>`);
  document.querySelectorAll('[data-boss-drug]').forEach(b=>b.onclick=()=>{simulation.apply(b.dataset.bossDrug);s.boss.mechanism=b.dataset.bossDrug===phase.drug;feedback=s.boss.mechanism?'靶点匹配。'+drugs[phase.drug].mechanism:'指令不匹配。'+drugs[b.dataset.bossDrug].risk;if(!s.boss.mechanism)logError('H',phase.name+'机制',feedback);save();boss();});
  $('#pulse-boss-reset')?.addEventListener('click',()=>{simulation.reset(phase.preset);s.boss.mechanism=false;feedback='本阶段装置已复位，已校对的问题保留。';save();boss();});
  wireAnswers(byId('H'));draw();
 }
 function bossAnswer(choice){
  const s=p(),phase=bossPhases[s.boss.phase],q=phase.questions[s.boss.index];if(!q)return;
  if(choice!==q.answer){feedback=(s.boss.phase===3?'Recheck the mechanism. ':'校对未通过。')+q.explanation;logError('H',q.prompt,q.explanation,choice);save();boss();return;}
  feedback=q.explanation;s.boss.index++;
  if(s.boss.index>=phase.questions.length){s.boss.phase++;s.boss.index=0;delete s.boss.activePhase;}
  if(s.boss.phase>=4){completeRegion(store.state,'H');save();updateHud();close();toast('八岛同步 · 航灯正在逐一点亮');endingTimer=setTimeout(ending,3200);return;}
  save();boss();
 }
 function ending(){
  p().endingSeen=true;save();shell(header('WORLD 03 COMPLETE / LOST RECORD 03','当世界重新听见彼此')+`<div class="pulse-ending"><span class="pulse-seal">Ⅲ</span><p>第一盏航灯在心源港亮起，随后是齿轮岛、悬桥、峡谷。八颗机械心脏终于在同一拍回应。</p><p>阿苓没有丢掉那份被篡改的指令。她把原始批注覆在上面：“我们恢复的不是一个好看的数字，是每个判断背后的条件。”</p><p>核心留下一段声音：“把呼吸交给港口，把名字留在潮汐之前。”那枚缺角签章，第一次显出完整的轮廓。</p><h3>第四岛 · 潮息港</h3><p>下一段航路指向呼吸与潮汐。目的地已发现，第四章尚未开发。</p><div class="pulse-ending-actions"><button id="pulse-ending-close" class="pulse-command">${icon('map')}返回群岛航图</button><button id="pulse-ending-neural" class="pulse-command">${icon('arrow-left')}返航神经城</button></div></div>`,true);$('#pulse-ending-close').onclick=()=>{close();map();};$('#pulse-ending-neural').onclick=leave;
 }
 function journal(kind='tasks'){
  const s=p();if(getWorld().transit?.active){toast('靠岸后再核对档案。');return;}
  const entries=kind==='glossary'?s.codex.map(id=>{const d=drugs[id];return `<article><h3>${esc(d.name)} <small>${esc(d.en)}</small></h3><p>${esc(d.category+' · '+d.target)}</p><p>${esc(d.mechanism)}</p><p>用途：${esc(d.use)}</p><p class="pulse-risk">风险与禁忌：${esc(d.risk)}</p><small>${esc(d.source)}</small></article>`;}).join(''):kind==='errors'?s.errors.slice().reverse().map(e=>`<article><h3>${esc(e.question)}</h3><p>${esc(e.explanation)}</p><button data-log-nav="${esc(e.region)}" title="回到对应区域复习">${icon('compass')}返回${byId(e.region)?.name||'核心'}</button></article>`).join(''):regions.map(r=>`<article><h3>${r.id} ${r.name} <small>${status(r)}</small></h3><p>${esc(r.goal)}</p><p>${esc(s.complete.includes(r.id)?r.story:r.intro)}</p><button data-log-nav="${r.id}">${icon('compass')}追踪</button></article>`).join('');
  shell(header('PULSE ARCHIVES',kind==='glossary'?'药理知识图鉴':kind==='errors'?'复习与错题':'群岛任务日志')+`<div class="pulse-scroll pulse-log">${entries||'<p class="pulse-intro">尚无记录。</p>'}<footer class="pulse-source">${sourceNote}<br>${references.map(r=>`<a href="${r.url}" target="_blank" rel="noopener">${esc(r.title)}</a>`).join('<br>')}</footer></div>`);
  document.querySelectorAll('[data-log-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.logNav));
 }
 function draw(){
  const s=simulation.read();document.querySelectorAll('[data-meter]').forEach(el=>{const value=el.dataset.meter.split('.').reduce((a,k)=>a[k],s);el.textContent=value.toFixed(2)+'×';});document.querySelectorAll('[data-bar]').forEach(el=>el.value=s[el.dataset.bar]);
  const canvas=$('#pulse-ecg');if(canvas){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.fillStyle='#173e49';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#365e66';ctx.lineWidth=1;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(i*w/12,0);ctx.lineTo(i*w/12,h);ctx.stroke();}for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,i*h/4);ctx.lineTo(w,i*h/4);ctx.stroke();}ctx.strokeStyle='#a2e4b7';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<w;i++){const value=ecgAt(i/w,s),y=100-value*70;if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}ctx.stroke();const sweep=(performance.now()/1000*s.heartRate*.6)%1*w;ctx.fillStyle='#f2d292';ctx.fillRect(sweep,5,2,h-10);}
  const ap=$('#pulse-ap');if(ap){const ctx=ap.getContext('2d'),c=s.conductionState;ctx.fillStyle='#173e49';ctx.fillRect(0,0,720,110);for(const [row,col,speed] of [[0,'#f2c989',c.naSpeed],[1,'#9ee2ce',c.avSpeed]]){const y=45+row*50;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(100,y);ctx.lineTo(100+20/speed,y-30);ctx.lineTo(250*c.refractoryPeriod,y-25);ctx.lineTo(350*c.qt,y);ctx.lineTo(690,y);ctx.stroke();ctx.fillStyle=col;ctx.font='14px sans-serif';ctx.fillText(row?'结区 Ca':'心肌 Na',530,y-12);}}
 }
 function tick(t){if(t-lastTick>160){lastTick=t;if(open()){updateHud();if(current)draw();}}requestAnimationFrame(tick);}
 requestAnimationFrame(tick);setInterval(()=>{if(open()){p().position={...getWorld().position};save();}},4000);
 window.addEventListener('pagehide',()=>{if(open()){p().position={...getWorld().position};save();}});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&open())close();});
 return {ready,open,depart,interact,close,map,journal,leave};
}

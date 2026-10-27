import './ui/game.css';
import './ui/hall-refinement.css';
import {store} from './persistence/store.js';
import {World} from './engine/world.ts';
import {initLearning} from './learning/legacy.js';
import {lessonProps,canEnter,canStudy,completeEvidence,questFor,dialogue,evidence} from './story/story.js';
import {createNerveController} from './world02/controller.js';
import {createPulseController} from './world03/controller.js';
import './world02/departure.css';
import {createIcons,Map,NotebookTabs,BookOpen,FilePenLine,Settings2,Menu} from 'lucide';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ASSET_BASE=import.meta.env.BASE_URL;
const sceneData={harbor:{model:'harbor',title:'雨夜码头',subtitle:'RAIN HARBOR'},hall:{model:'hall',title:'起源学院大厅',subtitle:'ORIGIN ACADEMY'},pd:{model:'pd',title:'药效机制塔',subtitle:'MECHANISM TOWER'},pk:{model:'pk',title:'药动河谷',subtitle:'KINETIC VALLEY'},factors:{model:'factors',title:'个体差异森林',subtitle:'VARIATION FOREST'},boss:{model:'boss',title:'总论守护者',subtitle:'THE FINAL GUARDIAN'},ending:{model:'ending',title:'塔顶航灯',subtitle:'THE FIRST SEA CHART'}};
let world,learning,audio={};
const nerve=createNerveController({store,getWorld:()=>world,startWorld,toast});
const pulse=createPulseController({store,getWorld:()=>world,startWorld,toast});
Object.defineProperty(window,'PharmaWorld',{get:()=>world});

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function play(name,loop=false){const src=`${ASSET_BASE}assets/audio/${name}.wav`;if(!audio[name])audio[name]=new Audio(src);audio[name].loop=loop;audio[name].volume=store.state.settings.volume*.35;audio[name].play().catch(()=>{});}
function quest(scene){const q=questFor(store.state,scene);$('#quest-title').textContent=q.title;$('#quest-description').textContent=q.text;$('#quest-progress').innerHTML=q.items.map(([text,done])=>`<span class="${done?'done':''}">${done?'✓':'○'} ${text}</span>`).join('  ')}
function avatarForm(){
 const root=$('#overlay-root');root.innerHTML=`<div class="overlay menu-screen"><section class="sheet"><header><div><span class="eyebrow">ORIGIN ISLAND · PLAYER SETUP</span><h2>创建见习航图师</h2></div></header><p>昵称、发型、发色、服装和配饰会随存档保留。称呼保持中性，角色不预设性别。</p><div class="avatar-grid"><div class="field wide"><label for="avatar-name">昵称 / Callsign</label><input id="avatar-name" type="text" maxlength="18" placeholder="例如：澜 / Lan" autofocus></div><div class="field"><label for="avatar-hair">发型 / Hair</label><select id="avatar-hair"><option value="short">短发 / Short</option><option value="long">长发 / Long</option><option value="wave">卷发 / Wave</option></select></div><div class="field"><label for="avatar-accessory">配饰 / Accessory</label><select id="avatar-accessory"><option value="none">无 / None</option><option value="pin">黄铜校徽 / Brass pin</option><option value="scarf">雾青围巾 / Teal scarf</option></select></div><div class="field"><label>发色 / Hair color</label><div class="swatches"><button type="button" data-color="#352c38" class="selected" style="background:#352c38"></button><button type="button" data-color="#8c5a43" style="background:#8c5a43"></button><button type="button" data-color="#d6b16d" style="background:#d6b16d"></button></div></div><div class="field"><label>外套 / Coat</label><div class="swatches"><button type="button" data-coat="#477b70" class="selected" style="background:#477b70"></button><button type="button" data-coat="#9c7359" style="background:#9c7359"></button><button type="button" data-coat="#6c6b9d" style="background:#6c6b9d"></button></div></div></div><footer><button id="avatar-back" class="secondary">返回</button><button id="start-game" class="primary">登船出发 · Begin</button></footer></section></div>`;
 let hairColor='#352c38',coat='#477b70';$$('[data-color]').forEach(b=>b.onclick=()=>{hairColor=b.dataset.color;$$('[data-color]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});$$('[data-coat]').forEach(b=>b.onclick=()=>{coat=b.dataset.coat;$$('[data-coat]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});$('#avatar-back').onclick=showMenu;$('#start-game').onclick=()=>{store.state.avatar={nickname:$('#avatar-name').value.trim()||'见习生',name:$('#avatar-name').value.trim()||'见习生',hair:$('#avatar-hair').value,hairColor,coat,accessory:$('#avatar-accessory').value};store.state.storyFlags={created:true};store.state.scene='harbor';store.state.position={x:0,y:.08,z:4};store.save();root.replaceChildren();startWorld('harbor');};
}
function showMenu(){if(world)world.paused=true;const root=$('#overlay-root');root.innerHTML=`<div class="overlay menu-screen"><section class="menu-sheet"><span class="eyebrow">A PHARMACOLOGY ADVENTURE</span><h1>PHARMA<br>ODYSSEY</h1><div class="subtitle">《雾海失序》</div><p>一座被覆盖的知识航图，一所藏在雾海里的学院。</p><div class="menu-actions"><button id="new-game" class="primary">新游戏 · New game</button><button id="continue-game" class="secondary" ${store.state.avatar?'':'disabled'}>继续航行 · Continue</button><button id="menu-settings" class="secondary">设置与存档</button></div><small class="menu-version">Origin Island · v0.3</small></section></div>`;$('#new-game').onclick=avatarForm;$('#continue-game').onclick=()=>{root.replaceChildren();startWorld(store.state.scene||'harbor')};$('#menu-settings').onclick=settings;}
function anchorMap(id){const s=world.definition;const all=[...(s.props||[]).map(p=>({id:p.id,type:'prop',label:labelFor(p.id),position:p.position})),...(s.npcs||[]).map(n=>({id:n.id,type:'npc',label:labelFor(n.id),position:n.position}))];if(id==='harbor')all.push({id:'hall-gate',type:'portal',label:'前往学院',position:[0,0,-4.2],destination:'hall'});if(id==='hall'){all.push({id:'pd-gate',type:'portal',label:'药效机制塔',position:[-4.6,0,-4],destination:'pd'});}if(id==='pd')all.push({id:'pk-gate',type:'portal',label:'药动河谷',position:[6.5,0,4.2],destination:'pk'});if(id==='pk')all.push({id:'factors-gate',type:'portal',label:'个体差异森林',position:[-6.2,0,4.2],destination:'factors'});if(id==='factors')all.push({id:'boss-gate',type:'portal',label:'总论守护者',position:[6.2,0,-4.2],destination:'boss'});if(id==='boss')all.push({id:'ending-gate',type:'portal',label:'塔顶航灯',position:[0,0,-4],destination:'ending'});return all;}
function labelFor(id){return ({lumi:'Lumi · 小灯',lan:'岚舟',bai:'白榆',cataloguer:'总论守护者',notice:'覆盖的警告牌',boat:'返航小艇',gate:'学院方向路牌',register:'登记簿',table:'木桌与校对便条',instrument:'双环仪',receptor:'双球仪 · 受体实验',curve:'量效曲线台',safety:'安全指数台',cabinet:'旧档案柜',label:'错误曲线标签',conditions:'实验前提',timetable:'河谷时间表',adme:'ADME 河道',half:'时间沙漏',clue_body:'线索 A · 观察对象',clue_pathogen:'线索 B · 被合并页码',adapt:'耐受病例',interaction:'相互作用病例',case:'合并档案',guardian:'总论试炼',index:'无来源索引',chart:'海域航图'})[id]||id;}
function setupAnchors(){
 const anchors=anchorMap(store.state.scene);
 if(store.state.scene==='ending'&&(store.state.storyFlags.neuralCityUnlocked||store.state.done.boss)){
  anchors.push({id:'nerve-entry',type:'portal',label:'启航 · 神经城',position:[3,0,3],destination:'nerve'});
  if(!$('#nerve-entry')){const button=document.createElement('button');button.id='nerve-entry';button.className='nerve-departure';button.textContent='启航 · 神经城 →';document.querySelector('#game').append(button);}
 }else $('#nerve-entry')?.remove();
 world.setAnchors(anchors);
}
function startWorld(scene){
 if(scene==='pulse'){
  if(!store.state.storyFlags.world02Complete&&!store.state.done.world02){toast('先完成神经城的最终审查，取得脉流群岛航图。');return;}
  if(!world)world=new World($('#world-canvas'));
  $('#nerve-overlay')?.remove();$('#pulse-entry')?.remove();document.body.classList.remove('world02');
  world.paused=false;world.onReady=()=>pulse.ready();world.onPosition=p=>{store.state.position={...p};if(store.state.world03)store.state.world03.position={...p};};world.onInteract=a=>pulse.interact(a);
  store.state.scene='pulse';store.save();world.load('pulse',store.state.position,store.state.avatar).catch(e=>{console.error(e);toast('场景加载失败，请保留存档并重试。');});return;
 }
 $('#pulse-entry')?.remove();$('#pulse-minimap')?.remove();document.body.classList.remove('world03');
 if(scene==='nerve'){
  $('#nerve-entry')?.remove();
  if(!store.state.storyFlags.neuralCityUnlocked&&!store.state.done.boss){toast('先完成起源岛并取得航图。');return;}
  if(!world)world=new World($('#world-canvas'));
  world.paused=false;world.onReady=()=>nerve.ready();world.onPosition=p=>{store.state.position={...p};};world.onInteract=a=>a.id==='pulse-route'?pulse.depart():nerve.interact(a);
  store.state.scene='nerve';store.save();world.load('nerve',store.state.position,store.state.avatar);return;
 }
 document.body.classList.remove('world02');
 const allowed=canEnter(store.state,scene)||scene==='harbor'||scene==='hall';if(!allowed){toast('航路尚未修复，请完成当前区域的调查和课程。');return;}
 if(!world)world=new World($('#world-canvas'));world.paused=false;world.onReady=()=>{setupAnchors();quest(scene);$('#scene-title').textContent=sceneData[scene].title;$('#scene-subtitle').textContent=sceneData[scene].subtitle;play(scene==='harbor'?'harbor-rain':scene==='pk'?'valley-water':scene==='factors'?'forest-chimes':'brass',true)};world.onPosition=p=>{store.state.position={x:p.x,y:p.y,z:p.z};if(Math.random()<.02)store.save()};world.onInteract=onInteract;world.load(sceneData[scene].model,store.state.position,store.state.avatar);store.state.scene=scene;store.save();}
function speak(scene,id){const lines=dialogue[scene]?.[id]||dialogue[scene]?.lumi||[];if(!lines.length){toast('这位角色暂时没有新的对白。');return;}let index=0;const root=$('#dialogue-root');const render=()=>{const [speaker,text]=lines[index];root.innerHTML=`<section class="dialogue"><div class="dialogue-speaker">${speaker}<span class="dialogue-step">${index+1} / ${lines.length}</span></div><div class="dialogue-text">${text}</div><footer><button class="secondary" id="dialogue-skip">跳过</button><button class="primary" id="dialogue-next">${index===lines.length-1?'结束':'继续'}</button></footer></section>`;$('#dialogue-next').onclick=()=>{if(index===lines.length-1){root.replaceChildren();afterDialogue(sceneCurrent(),id)}else{index++;render()}};$('#dialogue-skip').onclick=()=>{root.replaceChildren();afterDialogue(sceneCurrent(),id)};};render();}
function sceneCurrent(){return store.state.scene||'harbor'}
function afterDialogue(scene,id){store.state.storyFlags[`talk_${id}`]=true;if(scene==='harbor'&&id==='lumi'){completeEvidence(store.state,'notice');store.state.storyFlags.metLumi=true;store.save();toast('Lumi 加入队伍。学院方向牌已点亮。');setupAnchors();return;}if(scene==='hall'&&['lan','bai','lumi'].includes(id)){store.save();quest(scene);}}
function openLesson(id){if(!canStudy(store.state,id)){toast('先完成当前区域的调查线索。');return;}world.paused=true;learning.startLesson(id);}
function onInteract(a){const scene=sceneCurrent();if(a.type==='npc'){speak(scene,a.id);return;}if(a.type==='portal'){const destination=a.destination;if(!canEnter(store.state,destination)){toast('这条航路仍被缺失的证据锁住。');return;}store.state.scene=destination;store.state.position={x:0,y:.08,z:4};store.save();play('transition');startWorld(destination);return;}if(a.type==='prop'){if(a.id==='guardian'){world.paused=true;learning.openBoss();return;}if(a.id==='chart'){mapPanel();return;}if(lessonProps[a.id]){completeEvidence(store.state,a.id);store.save();quest(scene);setupAnchors();openLesson(lessonProps[a.id]);return;}if(evidence[a.id]){completeEvidence(store.state,a.id);store.save();quest(scene);toast(`${labelFor(a.id)}：${evidence[a.id][1]}`);setupAnchors();return;}if(a.id==='case'){store.state.storyFlags.caseReviewed=true;store.save();quest(scene);toast('两份档案已拆开，信息不足时先保留“需要核验”。');return;}if(a.id==='index'){completeEvidence(store.state,'index');store.state.storyFlags.endingSeen=true;store.save();showEnding();return;}}}
function showEnding(){world.paused=true;const root=$('#overlay-root');root.innerHTML=`<div class="overlay"><section class="sheet"><span class="stamp">CHAPTER 01 COMPLETE</span><h1>来源之光</h1><p>总论守护者的试炼已经通过。你找回了没有来源与条件的索引记录，也看见了苍白编目官的灰白徽记。</p><div class="ending-summary"><div><h3>岚舟</h3><p>“我们只找回了第一部分。别急着把它叫作真相。”</p></div><div><h3>白榆</h3><p>“找到删去注释的人。”</p></div><div><h3>Lumi</h3><p>“先确认地图，再出发。”</p></div><div><h3>下一幕</h3><p class="ending-quote">神经城<br><small>NEURAL CITY</small></p></div></div><footer><button class="primary" id="close-ending">展开下一幕航图</button></footer></section></div>`;$('#close-ending').onclick=()=>{store.state.storyFlags.endingSeen=true;store.state.storyFlags.neuralCityUnlocked=true;store.state.scene='ending';store.save();root.replaceChildren();startWorld('ending');};}
function mapPanel(){if(world)world.paused=true;const root=$('#overlay-root');root.innerHTML=`<div class="overlay"><section class="sheet"><header><div><span class="eyebrow">WORLD CHART · ORIGIN ISLAND</span><h2>起源岛航图</h2></div><button class="sheet-close" id="map-close">×</button></header><p>每个区域必须通过调查、机制实验和知识考核才能通行。</p><div class="island-routes">${Object.entries(sceneData).map(([id,x])=>`<button class="${canEnter(store.state,id)||id===store.state.scene?'primary':'secondary'}" data-route="${id}" ${canEnter(store.state,id)||id===store.state.scene?'':'disabled'}>${x.title}</button>`).join('')}</div><ol class="chapter-list">${['航路一 · 起源岛','航路二 · 神经城','航路三 · 脉流群岛','航路四 · 潮息港','航路五 · 时序庭院','航路六 · 微生物边境','航路七 · 细胞穹顶','航路八 · 终焉灯塔'].map((x,i)=>`<li><span class="chapter-number">0${i+1}</span><div><strong>${x}</strong><small>${i===0?'当前已开放 · 四区八课与总论守护者':i===1&&store.state.storyFlags.neuralCityUnlocked?'已发现入口 · 教学内容待接入':'远期航路 · 未开放'}</small></div></li>`).join('')}</ol></section></div>`;$('#map-close').onclick=()=>{root.replaceChildren();if(world)world.paused=false};$$('[data-route]').forEach(b=>b.onclick=()=>{root.replaceChildren();startWorld(b.dataset.route)});}
function tasksPanel(){const root=$('#overlay-root'),q=questFor(store.state,sceneCurrent());root.innerHTML=`<div class="overlay"><section class="sheet"><header><div><span class="eyebrow">FIELD LOG · TASKS</span><h2>冒险日志</h2></div><button class="sheet-close" id="tasks-close">×</button></header><h3>${q.title}</h3><p>${q.text}</p><ul class="task-list">${q.items.map(([x,d])=>`<li><span>${x}</span><b class="${d?'done':''}">${d?'已完成':'待完成'}</b></li>`).join('')}</ul><h3>已收集证据</h3><div class="evidence-list">${(store.state.inventory||[]).map(x=>`<article><h3>${x.title}</h3><p>${x.text}</p></article>`).join('')||'<p>还没有证据。去调查场景里的热点。</p>'}</div></section></div>`;$('#tasks-close').onclick=()=>root.replaceChildren();}
function settings(){const root=$('#overlay-root');root.innerHTML=`<div class="overlay"><section class="sheet"><header><div><span class="eyebrow">SETTINGS · SAVE</span><h2>设置与存档</h2></div><button class="sheet-close" id="settings-close">×</button></header><div class="setting-row"><label>音量 / Volume</label><input id="setting-volume" type="range" min="0" max="1" step=".05" value="${store.state.settings.volume}"></div><div class="setting-row"><label>字体大小 / Font size</label><input id="setting-font" type="range" min="12" max="24" step="1" value="${store.state.settings.fontSize}"></div><div class="setting-row"><label>减少动画 / Reduced motion</label><input id="setting-motion" type="checkbox" ${store.state.settings.reducedMotion?'checked':''}></div><hr class="setting-divider"><div class="save-actions"><button id="save-now" class="primary">立即保存</button><button id="export-save" class="secondary">导出存档</button><label class="secondary">导入存档<input id="import-save" type="file" accept=".json" hidden></label><button id="reset-save" class="secondary danger">重置本机存档</button></div><p class="save-note">存档 key：${store.key}<br>${store.note||'保存到浏览器本机。'}</p></section></div>`;const close=()=>root.replaceChildren();$('#settings-close').onclick=close;$('#setting-volume').oninput=e=>{store.state.settings.volume=+e.target.value;store.save()};$('#setting-font').oninput=e=>{store.state.settings.fontSize=+e.target.value;document.documentElement.style.setProperty('--body-size',`${e.target.value}px`);store.save()};$('#setting-motion').onchange=e=>{store.state.settings.reducedMotion=e.target.checked;document.body.classList.toggle('reduced-motion',e.target.checked);store.save()};$('#save-now').onclick=()=>{store.save();toast('进度已保存')};$('#export-save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([store.export()],{type:'application/json'}));a.download='pharma-odyssey-save.json';a.click();toast('存档已导出')};$('#import-save').onchange=async e=>{try{store.import(await e.target.files[0].text());toast('存档已导入');close();startWorld(store.state.scene)}catch{toast('存档格式不兼容，当前进度未更改')}};$('#reset-save').onclick=()=>{if(confirm('删除本机进度并返回主菜单？')){store.reset();close();showMenu();}};}
 function wire(){
 learning=initLearning();window.PharmaLearning=learning;
 const resume=()=>{if(!world)return;world.paused=false;quest(sceneCurrent());setupAnchors();};
 new MutationObserver(()=>{
  const box=$('#dialogue-root .dialogue');
  if(!box){if(world&& !$('#modal').classList.contains('show'))world.paused=false;return;}
  if(world)world.paused=true;
  if(box.querySelector('.dialogue-portrait'))return;
  const speaker=box.querySelector('.dialogue-speaker').textContent;
  const actor=speaker.includes('岚舟')?'lan':speaker.includes('白榆')?'bai':speaker.includes('Lumi')?'lumi':null;
  if(actor){const image=document.createElement('img');image.src=`${ASSET_BASE}assets/portraits/${actor}.png`;image.alt='';image.className='dialogue-portrait';box.prepend(image);box.classList.add('with-portrait');}
 }).observe($('#dialogue-root'),{childList:true,subtree:true});
 document.body.addEventListener('click',e=>{
  if(e.target.closest('#map-button'))mapPanel();
  if(e.target.closest('#tasks-button'))tasksPanel();
  if(e.target.closest('#settings-button')||e.target.closest('#menu-button'))settings();
  if(e.target.closest('#glossary')){if(world)world.paused=true;learning.openGlossary()}
  if(e.target.closest('#journal')){if(world)world.paused=true;learning.openJournal()}
 });
 window.addEventListener('pharma:learning-close',resume);
 document.body.addEventListener('click',e=>{if(e.target.closest('[aria-label="关闭图鉴"]'))resume();});
 window.addEventListener('pharma:lesson-complete',resume);
 window.addEventListener('pharma:boss-complete',e=>{resume();if(e.detail.passed){store.state.done.boss=true;store.save();toast('总论守护者已通过。前往塔顶航灯。');}});
 }
 wire();showMenu();
 $('#quest-hud').onclick=tasksPanel;
 $('#quest-hud').setAttribute('title','打开冒险日志');
 createIcons({icons:{Map,NotebookTabs,BookOpen,FilePenLine,Settings2,Menu}});
 // Capture routes shared by the legacy island UI before its delegated handlers.
 document.body.addEventListener('click',e=>{
  const target=e.target;
  if(target.closest('#nerve-entry')){e.stopImmediatePropagation();$('#overlay-root').replaceChildren();store.state.position={x:0,y:.08,z:31};startWorld('nerve');return;}
  if(target.closest('#pulse-entry')||target.closest('#nerve-sail-pulse')){e.stopImmediatePropagation();pulse.depart();return;}
  if(pulse.open()){
   const routes={'#map-button':()=>pulse.map(),'#tasks-button':()=>pulse.journal(),'#glossary':()=>pulse.journal('glossary'),'#journal':()=>pulse.journal('errors'),'#quest-hud':()=>pulse.journal()};
   for(const [selector,action] of Object.entries(routes))if(target.closest(selector)){e.stopImmediatePropagation();action();return;}
  }
  if(!nerve.open())return;
  const routes={'#map-button':()=>nerve.map(),'#tasks-button':()=>nerve.journal(),'#glossary':()=>nerve.journal('glossary'),'#journal':()=>nerve.journal('errors')};
  for(const [selector,action] of Object.entries(routes))if(target.closest(selector)){e.stopImmediatePropagation();action();return;}
 },true);

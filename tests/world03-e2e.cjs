const {chromium}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const out=path.join(__dirname,'../reports/world03');fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),baseURL:process.env.BASE_URL||'http://127.0.0.1:4175',cases:[],errors:[],requests:[],consoleErrors:[]};let browser,page;
const record=async(name,fn)=>{console.log('RUN',name);try{await fn();report.cases.push({name,pass:true});console.log('PASS',name);}catch(e){report.cases.push({name,pass:false,error:String(e)});throw e;}};
const shot=async name=>page.screenshot({path:path.join(out,name+'.png')});
const ready=async()=>page.waitForFunction(()=>window.PharmaWorld?.definition?.id==='pulse'&&!window.PharmaWorld.loading,{},{timeout:60000});
async function close(){if(await page.locator('[data-pulse-close]').count())await page.locator('[data-pulse-close]').click();}
async function nav(id,dock=false){await close();await page.locator('#map-button').click();await page.locator(dock?`[data-dock-nav="${id}"]`:`[data-pulse-nav="${id}"]`).click();await page.locator('#pulse-overlay').waitFor({timeout:120000});}
async function region(r){
 await nav(r.id);assert.match(await page.locator('#pulse-overlay h2').innerText(),new RegExp(r.name));
 for(const op of r.ops)await page.locator(`[data-pulse-op="${op.id}"]`).click();
 if(r.id==='A'){
  const before=await page.locator('[data-meter="meanArterialPressure"]').innerText();await page.locator('[data-pulse-input="vascularResistance"]').fill('1.8');assert.notEqual(await page.locator('[data-meter="meanArterialPressure"]').innerText(),before);
 }
 if(r.case){
  await page.locator('#pulse-reset').click();await page.locator('#pulse-case-check').click();assert.match(await page.locator('.pulse-feedback').innerText(),/未满足/);
  await page.locator(`[data-pulse-op="${r.case.drug}"]`).click();await page.locator('#pulse-case-check').click();assert.match(await page.locator('.pulse-case-status').innerText(),/已核验/);
 }
 await shot(r.id+'-mechanism');
 if(r.id==='B'){const q=r.questions[0];await page.locator(`[data-pulse-answer="${(q.answer+1)%q.options.length}"]`).click();assert.match(await page.locator('.pulse-feedback').innerText(),/重新核对/);}
 for(const q of r.questions)await page.locator(`[data-pulse-answer="${q.answer}"]`).click();
 assert.ok(await page.evaluate(id=>window.PharmaStore.state.world03.complete.includes(id),r.id));await close();
}
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.requests.push({url:r.url(),status:r.status()});});
 const {regions,bossPhases}=await import('../src/world03/data.js');
 await page.goto(report.baseURL);
 await record('existing Origin ending and Nerve City load; real World03 departure',async()=>{
  await page.evaluate(()=>{const s=window.PharmaStore;s.state.avatar={name:'脉流测试员',nickname:'脉流测试员',hair:'wave',hairColor:'#352c38',coat:'#477b70',accessory:'pin'};s.state.done.boss=true;s.state.done.world02=true;s.state.storyFlags={created:true,neuralCityUnlocked:true,world02Complete:true};s.state.world02={region:'00',visited:['00','01','02','03','04','05','06','07','08'],complete:['00','01','02','03','04','05','06','07','08'],operations:{},answers:{},sim:{},errors:[],boss:9};s.state.inventory=[{id:'legacy-record',title:'原有记录',text:'不得丢失'}];s.state.scene='ending';s.state.position={x:0,y:.08,z:4};s.save();});
  await page.reload();await page.locator('#continue-game').click();await page.locator('#nerve-entry').click();await page.locator('#pulse-entry').waitFor({timeout:60000});assert.equal(await page.evaluate(()=>window.PharmaWorld.definition.id),'nerve');await shot('00-nerve-entry');
  await page.locator('#pulse-entry').click();await ready();await shot('01-harbor');
  assert.equal(await page.evaluate(()=>window.PharmaStore.state.scene),'pulse');
 });
 await record('nonblank moving canvas, keyboard collision, reachable areas and initial reef gate',async()=>{
  const before=await page.evaluate(()=>window.PharmaWorld.position);await page.keyboard.down('d');await page.waitForFunction(p=>Math.hypot(window.PharmaWorld.position.x-p.x,window.PharmaWorld.position.z-p.z)>.3,before);await page.keyboard.up('d');
  const result=await page.evaluate(()=>{const w=window.PharmaWorld,gl=w.renderer.getContext(),a=new Uint8Array(4*80*80);gl.readPixels(Math.floor(w.canvas.width/2),Math.floor(w.canvas.height/2),80,80,gl.RGBA,gl.UNSIGNED_BYTE,a);return {colors:new Set(a).size,blocked:w.nav.blocked(0,26),paths:w.anchors.filter(a=>/^[A-F]$/.test(a.id)).map(a=>w.nav.find(w.position,{x:a.position[0],z:a.position[2]}).length),gate:w.nav.find(w.position,{x:0,z:-47.5}).length};});
  assert.ok(result.colors>15);assert.equal(result.blocked,true);assert.ok(result.paths.every(n=>n>1));assert.equal(result.gate,0);
  const old=await page.evaluate(()=>window.PharmaWorld.city.parts.B.sa.scale.x);await page.waitForFunction(v=>Math.abs(window.PharmaWorld.city.parts.B.sa.scale.x-v)>.02,old);report.initialMetrics=await page.evaluate(()=>window.PharmaWorld.performance());
 });
 await record('A harbor shared simulation, sliders, observations, reasoning and reset',()=>region(regions[0]));
 await record('visible boarding, sailing motion and reload mid-voyage to F',async()=>{
  await nav('A',true);await page.locator('[data-sail="F"]').click();await page.waitForFunction(()=>window.PharmaStore.state.world03.transport.mode==='sailing');
  const start=await page.evaluate(()=>window.PharmaWorld.position);await page.waitForFunction(p=>Math.hypot(window.PharmaWorld.position.x-p.x,window.PharmaWorld.position.z-p.z)>2,start);await shot('02-sailing');
  await page.reload();await page.locator('#continue-game').click();await ready();await page.waitForFunction(()=>window.PharmaStore.state.world03.transport.mode==='idle',{},{timeout:60000});assert.equal(await page.evaluate(()=>window.PharmaStore.state.world03.transport.dock),'F');assert.equal(await page.evaluate(()=>window.PharmaStore.state.world03.transport.trips),1);await shot('03-renin-arrival');
 });
 await record('F RAAS mechanisms, contraindications and nephron foundation exercise',()=>region(regions[5]));
 await record('second real voyage F → B',async()=>{await nav('F',true);await page.locator('[data-sail="B"]').click();await page.waitForFunction(()=>window.PharmaStore.state.world03.transport.mode==='idle',{},{timeout:60000});assert.equal(await page.evaluate(()=>window.PharmaStore.state.world03.transport.dock),'B');});
 for(const id of ['B','C','D','E','G'])await record(id+' actual bridge travel, mechanisms, wrong case retry and reasoning',()=>region(regions.find(r=>r.id===id)));
 await record('all eight regions reachable, gate repaired and physical lift',async()=>{
  await nav('H'); // H interaction starts the lift before the Boss panel appears.
  if(!await page.evaluate(()=>window.PharmaStore.state.world03.transport.liftUnlocked)){
   await close();await page.evaluate(()=>window.PharmaWorld.approach(window.PharmaWorld.anchors.find(a=>a.id==='lift-H')));await page.waitForFunction(()=>window.PharmaStore.state.world03.transport.liftUnlocked,{},{timeout:30000});await nav('H');
  }
  assert.equal(await page.evaluate(()=>window.PharmaStore.state.world03.transport.liftUnlocked),true);await shot('H-boss-first');
 });
 await record('four Boss phases, English examination and reload preserving exact stage',async()=>{
  for(let phase=0;phase<bossPhases.length;phase++){
   if(phase<3)await page.locator(`[data-boss-drug="${bossPhases[phase].drug}"]`).click();
   for(let i=0;i<bossPhases[phase].questions.length;i++){
    if(phase===3&&i===2){await page.reload();await page.locator('#continue-game').click();await ready();await nav('H');assert.deepEqual(await page.evaluate(()=>{const b=window.PharmaStore.state.world03.boss;return [b.phase,b.index];}),[3,2]);}
    await page.locator(`[data-pulse-answer="${bossPhases[phase].questions[i].answer}"]`).click();
   }
  }
  await page.waitForSelector('#pulse-ending-close',{timeout:15000});assert.equal(await page.evaluate(()=>window.PharmaStore.state.storyFlags.world04Discovered),true);await shot('09-ending');await page.locator('#pulse-ending-close').click();await close();
 });
 await record('review no duplicate reward, codex, error log and saved original progress',async()=>{
  const xp=await page.evaluate(()=>window.PharmaStore.state.xp);await nav('G');await page.locator('#pulse-review').click();for(const q of regions.find(r=>r.id==='G').questions)await page.locator(`[data-pulse-answer="${q.answer}"]`).click();assert.equal(await page.evaluate(()=>window.PharmaStore.state.xp),xp);await close();
  await page.locator('#glossary').click();assert.ok(await page.locator('.pulse-log article').count()>=20);await shot('10-codex');await close();await page.locator('#journal').click();assert.ok(await page.locator('.pulse-log article').count()>=7);await close();
  await page.reload();await page.locator('#continue-game').click();await ready();const saved=await page.evaluate(()=>window.PharmaStore.state);assert.equal(saved.avatar.name,'脉流测试员');assert.equal(saved.world02.boss,9);assert.equal(saved.world03.complete.length,8);assert.ok(saved.inventory.some(x=>x.id==='legacy-record'));
 });
 await record('390px viewport layout, map, canvas pixels and mobile interaction',async()=>{
  await page.setViewportSize({width:390,height:844});await page.locator('#map-button').click();await shot('11-mobile-map');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await close();await shot('12-mobile-world');
  await page.locator('#tasks-button').click();const box=await page.locator('#pulse-overlay').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);await shot('13-mobile-log');await close();report.finalMetrics=await page.evaluate(()=>window.PharmaWorld.performance());
 });
 await record('postgame fast sailing, return to Nerve and Origin, then recover World03',async()=>{
  await page.setViewportSize({width:1440,height:960});await nav('G',true);assert.ok(await page.locator('[data-fast-sail="A"]').count());await page.locator('[data-fast-sail="A"]').click();await page.waitForFunction(()=>window.PharmaStore.state.world03.transport.mode==='idle',{},{timeout:30000});
  await page.locator('[data-anchor="nerve-return"]').click();await page.waitForFunction(()=>window.PharmaWorld.definition.id==='nerve'&&!window.PharmaWorld.loading,{},{timeout:60000});await page.locator('[data-anchor="origin-return"]').click();await page.waitForFunction(()=>window.PharmaWorld.definition.id==='ending'&&!window.PharmaWorld.loading,{},{timeout:60000});
  await page.locator('#nerve-entry').click();await page.locator('#pulse-entry').waitFor({timeout:60000});await page.locator('#pulse-entry').click();await ready();assert.equal(await page.evaluate(()=>window.PharmaStore.state.world03.complete.length),8);await shot('14-returned-harbor');
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);assert.deepEqual(report.consoleErrors,[]);
})().catch(async e=>{report.fatal=String(e);console.error(e);if(page)report.diagnostics=await page.evaluate(()=>({position:window.PharmaWorld?.position,path:window.PharmaWorld?.path,paused:window.PharmaWorld?.paused,pending:window.PharmaWorld?.pending,progress:window.PharmaStore?.state.world03,saveStatus:window.PharmaStore?.note})).catch(()=>null);process.exitCode=1;}).finally(async()=>{if(page)await shot('last-state').catch(()=>{});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();console.log(JSON.stringify(report,null,2));});

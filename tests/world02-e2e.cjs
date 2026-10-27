const {chromium}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const out=path.join(__dirname,'../reports/world02');fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),cases:[],errors:[],requests:[]};
let browser,page;
const record=async(name,fn)=>{console.log('RUN',name);try{await fn();report.cases.push({name,pass:true});console.log('PASS',name);}catch(e){report.cases.push({name,pass:false,error:String(e)});if(page)report.diagnostics=await page.evaluate(()=>({position:window.PharmaWorld?.position,path:window.PharmaWorld?.path,paused:window.PharmaWorld?.paused,pending:window.PharmaWorld?.pending,progress:window.PharmaStore?.state.world02})).catch(()=>null);throw e;}};
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
 page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>report.errors.push(e.stack||String(e)));page.on('response',r=>{if(r.status()>=400)report.requests.push({url:r.url(),status:r.status()});});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
 const {regions}=await import('../src/world02/data.js');
 await record('origin completed-save fixture → real departure → nerve city',async()=>{
  await page.evaluate(()=>{const s=window.PharmaStore;s.state.avatar={name:'测试航图师',nickname:'测试航图师',hair:'short',hairColor:'#352c38',coat:'#477b70',accessory:'pin'};s.state.done.boss=true;s.state.storyFlags.neuralCityUnlocked=true;s.state.scene='ending';s.state.position={x:0,y:.08,z:4};s.save();});
  await page.reload();await page.locator('#continue-game').click();await page.locator('#nerve-entry').waitFor({timeout:30000});await page.locator('#nerve-entry').click();
  await page.waitForFunction(()=>window.PharmaWorld?.city&&!window.PharmaWorld.loading);assert.equal(await page.evaluate(()=>window.PharmaStore.state.scene),'nerve');
 });
 await record('keyboard movement, collision, nine-node navigability and nonblank canvas',async()=>{
  const before=await page.evaluate(()=>window.PharmaWorld.position);await page.keyboard.down('d');await page.waitForFunction(p=>Math.hypot(window.PharmaWorld.position.x-p.x,window.PharmaWorld.position.z-p.z)>.4,before);await page.keyboard.up('d');
  const paths=await page.evaluate(()=>window.PharmaWorld.anchors.filter(a=>/^0[0-8]$/.test(a.id)).map(a=>({id:a.id,path:window.PharmaWorld.nav.find(window.PharmaWorld.position,{x:a.position[0],z:a.position[2]})})));assert.ok(paths.every(p=>p.path.length>1));
  assert.equal(await page.evaluate(()=>window.PharmaWorld.nav.blocked(0,-2)),true);
  const pixels=await page.evaluate(()=>{const w=window.PharmaWorld,gl=w.renderer.getContext(),a=new Uint8Array(4*20*20);gl.readPixels(Math.floor(w.canvas.width/2),Math.floor(w.canvas.height/2),20,20,gl.RGBA,gl.UNSIGNED_BYTE,a);return [...new Set(a)].length;});assert.ok(pixels>8);
  await page.screenshot({path:path.join(out,'01-harbor-desktop.png')});
 });
 async function navigate(r){await page.locator('#map-button').click();await page.locator(`[data-nav="${r.id}"]`).click();await page.waitForSelector('[data-op],[data-answer],.nerve-success',{timeout:120000});}
 for(const r of regions){await record(r.id+' '+r.name+' physical travel, operations and quiz',async()=>{
  await navigate(r);
  if(r.id==='01'){await page.locator('[data-answer]').count().then(n=>assert.equal(n,0));}
  for(const [id] of r.ops)await page.locator(`[data-op="${id}"]`).click();
  if(['02','03','04','05','06','07'].includes(r.id))await page.screenshot({path:path.join(out,r.id+'-mechanism.png')});
  if(r.id==='05'){const v=await page.evaluate(()=>window.PharmaWorld.city.parts['05'].gauges[2].rotation.z);assert.notEqual(v,0);}
  if(r.id==='02'){await page.locator('[data-answer="1"]').click();assert.match(await page.locator('.nerve-explanation').innerText(),/矛盾/);}
  for(let i=0;i<r.questions.length;i++){
   await page.locator(`[data-answer="${r.questions[i][2]}"]`).click();
   if(r.id==='08'&&i===3){await page.locator('[data-close]').click();await page.reload();await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.city&&!window.PharmaWorld.loading);await navigate(r);assert.equal(await page.evaluate(()=>window.PharmaStore.state.world02.boss),4);}
  }
  assert.ok(await page.evaluate(id=>window.PharmaStore.state.world02.complete.includes(id),r.id));
  if(r.id!=='08')await page.locator('[data-close]').click();
 });}
 await record('ending, saved avatar, review without duplicate reward, return and reload',async()=>{
  await page.screenshot({path:path.join(out,'09-ending.png')});await page.locator('#nerve-return-city').click();
  const xp=await page.evaluate(()=>window.PharmaStore.state.xp);await navigate(regions[7]);await page.locator('#nerve-review').click();for(const q of regions[7].questions)await page.locator(`[data-answer="${q[2]}"]`).click();assert.equal(await page.evaluate(()=>window.PharmaStore.state.xp),xp);await page.locator('[data-close]').click();
  await page.reload();await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.city&&!window.PharmaWorld.loading);assert.equal(await page.evaluate(()=>window.PharmaStore.state.avatar.name),'测试航图师');assert.equal(await page.evaluate(()=>window.PharmaStore.state.world02.complete.length),9);
  await page.setViewportSize({width:390,height:844});await page.locator('#map-button').click();await page.screenshot({path:path.join(out,'10-mobile-map.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-close]').click();await page.screenshot({path:path.join(out,'11-mobile-city.png')});
  report.metrics=await page.evaluate(()=>window.PharmaWorld.performance());
 });
 await record('return to origin through physical harbor route and reenter with saved city',async()=>{
  await page.setViewportSize({width:1440,height:960});await navigate(regions[0]);await page.locator('[data-close]').click();
  await page.locator('[data-anchor="ali"]').click();await page.waitForSelector('#nerve-overlay h2');assert.match(await page.locator('#nerve-overlay h2').innerText(),/阿苓/);await page.locator('[data-close]').click();
  await page.locator('[data-anchor="origin-return"]').click();await page.waitForFunction(()=>window.PharmaStore.state.scene==='ending'&&!window.PharmaWorld.loading);await page.locator('#nerve-entry').click();await page.waitForFunction(()=>window.PharmaWorld?.city&&!window.PharmaWorld.loading);assert.equal(await page.evaluate(()=>window.PharmaStore.state.world02.complete.length),9);
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);
})().catch(e=>{report.fatal=String(e);console.error(e);process.exitCode=1;}).finally(async()=>{if(page)await page.screenshot({path:path.join(out,'last-state.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();console.log(JSON.stringify(report,null,2));});

const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../art/validation/v04');
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE;
const url=process.env.GAME_URL||'http://127.0.0.1:5173';
(async()=>{
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await page.locator('#new-game').click();await page.locator('#avatar-name').fill('Visual QA');await page.locator('#start-game').click();
  await page.waitForFunction(()=>window.PharmaWorld&&!window.PharmaWorld.loading);
  // Isolated visual fixture; traversal/story acceptance is separately reported.
  await page.evaluate(async()=>{const s=window.PharmaStore.state;s.scene='hall';s.position={x:0,y:.08,z:4.4};s.storyFlags.metLumi=true;s.storyFlags.notice=true;window.PharmaStore.save();await window.PharmaWorld.load('hall',s.position,s.avatar);});
  await page.reload();await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.definition?.id==='hall'&&!window.PharmaWorld.loading);
  const pixels=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),p=new Uint8Array(4),colors=new Set();for(let y=100;y<c.height;y+=80)for(let x=100;x<c.width;x+=80){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);colors.add(Array.from(p).join(','));}return colors.size;});
  assert.ok(pixels>30,'live canvas must contain diverse rendered pixels');
  let target=null,occlusion=null;
  if(!process.env.VISUAL_MEASURE_ONLY){
  await page.screenshot({path:path.join(out,'hall-1920.png')});
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.join(out,'hall-1366.png')});
  await page.setViewportSize({width:1920,height:1080});
  target=await page.evaluate(()=>{const w=window.PharmaWorld;const a=w.anchors.find(a=>a.id==='lan');return a;});
  await page.locator('[data-anchor="lan"]').press('Enter');await page.locator('#dialogue-next').waitFor();
  await page.screenshot({path:path.join(out,'npc-dialogue.png')});await page.locator('#dialogue-skip').click();
  await page.locator('#glossary').click();assert.equal(await page.locator('.glossary-overlay').count(),1);
  await page.locator('#gloss-search').fill('EC50');await page.screenshot({path:path.join(out,'medical-archive.png')});await page.getByRole('button',{name:'关闭图鉴',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.PharmaWorld.paused),false);
  await page.locator('[data-anchor="instrument"]').press('Enter');
  await page.waitForFunction(()=>{const p=window.PharmaWorld.position;return Math.hypot(p.x-2.8,p.z-1.5)<1.8;});
  await page.screenshot({path:path.join(out,'near-instrument.png')});
  await page.evaluate(()=>{const w=window.PharmaWorld;w.pending=null;w.path=w.nav.find(w.position,{x:-7,z:0}).slice(1);});
  await page.waitForFunction(()=>{const p=window.PharmaWorld.position;return Math.hypot(p.x+7,p.z)<.3;},null,{timeout:120000});
  await page.screenshot({path:path.join(out,'behind-shelf.png')});
  occlusion=await page.evaluate(()=>({position:window.PharmaWorld.position,pathRemaining:window.PharmaWorld.path.length}));
  await page.evaluate(()=>{const w=window.PharmaWorld;w.path=w.nav.find(w.position,{x:0,z:3}).slice(1);});
  await page.waitForFunction(()=>window.PharmaWorld.path.length===0,null,{timeout:120000});
  fs.writeFileSync(path.join(out,'interaction-results.json'),JSON.stringify({occlusion,npc:target,errors,pixels,timestamp:new Date().toISOString()},null,2));
  }
  await page.evaluate(()=>{window.PharmaWorld.frameTimes=[]});
  await page.waitForFunction(()=>window.PharmaWorld.frameTimes.length>=120,null,{timeout:120000});
  const performance=await page.evaluate(()=>window.PharmaWorld.performance());
  fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify({performance,occlusion,npc:target,errors,conditions:'Headless Chromium, 1920x1080 CSS, DPR1; browser renderer reported by WebGL. Isolated visual fixture.',timestamp:new Date().toISOString()},null,2));
  for(const view of ['reference','before']){
   await page.goto(url+'/?view='+view);await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.definition?.id==='hall'&&!window.PharmaWorld.loading);
   await page.screenshot({path:path.join(out,view==='reference'?'reference-runtime.png':'before-reference.png')});
  }
  assert.deepEqual(errors,[]);console.log(process.env.VISUAL_MEASURE_ONLY?'Rendering, reference captures and performance checks passed':'Visual captures, collision route, dialogue, archive and rendering checks passed');
 }catch(error){
  console.error('Visual failure state:',await page.evaluate(()=>({position:window.PharmaWorld?.position,path:window.PharmaWorld?.path,paused:window.PharmaWorld?.paused,pending:window.PharmaWorld?.pending})));
  await page.screenshot({path:path.join(out,'visual-failure.png')});
  throw error;
 }finally{await browser.close();}
 })().catch(e=>{console.error(e);process.exitCode=1});

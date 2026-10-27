const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='reports/pd-apparatus';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
  await page.evaluate(()=>{const s=window.PharmaStore;s.state.avatar={name:'球仪测试',coat:'#477b70'};s.state.scene='pd';s.state.storyFlags={metLumi:true,notice:true};s.state.learning.direction={complete:true};s.state.position={x:0,y:.08,z:4};s.save();});
  await page.reload();await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.definition.id==='pd'&&!window.PharmaWorld.loading);
  const point=await page.evaluate(()=>{const w=window.PharmaWorld,p=w.player.position.clone().set(0,2,-1).project(w.camera),r=w.canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
  await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('调查线索'));
  assert.equal(await page.locator('#modal').evaluate(e=>e.classList.contains('show')),false);
  await page.evaluate(()=>{window.PharmaStore.state.storyFlags.label=true;window.PharmaStore.state.storyFlags.conditions=true;window.PharmaStore.save();});
  await page.mouse.click(point.x,point.y);await page.locator('#lesson-body').waitFor();
  assert.match(await page.locator('#modaltitle').innerText(),/受体/);
  await page.screenshot({path:out+'/receptor-open.png'});assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/results.json',JSON.stringify({passed:true,tests:['model click preserves investigation prerequisites','model click opens receptor lesson'],errors},null,2));console.log('PASS: sphere model click opens receptor lesson and respects prerequisites');
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

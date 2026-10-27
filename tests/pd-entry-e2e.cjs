const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='reports/pd-entry';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
  await page.evaluate(()=>{const s=window.PharmaStore;s.state.avatar={name:'入口测试',nickname:'入口测试',coat:'#477b70',hair:'short',hairColor:'#352c38',accessory:'none'};s.state.scene='hall';s.state.storyFlags={metLumi:true,notice:true};s.state.learning.direction={complete:true};s.state.position={x:-5.1434,y:.08,z:4.75};s.save();});
  await page.reload();await page.locator('#continue-game').click();await page.waitForFunction(()=>window.PharmaWorld?.player&&!window.PharmaWorld.loading);
  const gate=await page.evaluate(()=>{const w=window.PharmaWorld,a=w.anchors.find(a=>a.id==='pd-gate');return {position:a.position,blocked:w.nav.blocked(a.position[0],a.position[2])};});
  assert.equal(gate.blocked,false);await page.screenshot({path:out+'/hall-before.png'});
  await page.locator('[data-anchor="pd-gate"]').click();
  await page.waitForFunction(()=>window.PharmaStore.state.scene==='pd'&&!window.PharmaWorld.loading,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>window.PharmaWorld.definition.id),'pd');assert.deepEqual(errors,[]);
  await page.screenshot({path:out+'/tower-entered.png'});
  fs.writeFileSync(out+'/results.json',JSON.stringify({passed:true,startedAt:'previous stuck corner',gate,scene:'pd',errors},null,2));console.log('PASS: clicked tower portal from the previously stuck corner and entered pd');
 }catch(e){await page.screenshot({path:out+'/failure.png'});fs.writeFileSync(out+'/results.json',JSON.stringify({passed:false,error:String(e),errors},null,2));throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

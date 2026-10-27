const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5185');
  await page.evaluate(()=>{const s=window.PharmaStore;s.state.avatar={name:'位置复验',coat:'#477b70'};s.state.scene='pd';s.state.position={x:0,y:.08,z:4};s.state.learning.direction={complete:true};s.save();});
  await page.reload();await page.locator('#continue-game').click();
  await page.waitForFunction(()=>window.PharmaWorld?.definition.id==='pd'&&!window.PharmaWorld.loading);
  await page.waitForFunction(()=>document.querySelector('[data-anchor="lumi"]')?.style.left);
  const a=await page.locator('[data-anchor="lumi"]').boundingBox(),b=await page.locator('[data-anchor="receptor"]').boundingBox();
  assert.ok(a&&b);assert.ok(a.x+a.width<b.x||b.x+b.width<a.x||a.y+a.height<b.y||b.y+b.height<a.y,'Lumi and receptor buttons must not overlap');
  fs.mkdirSync('reports/pd-spacing',{recursive:true});
  await page.screenshot({path:'reports/pd-spacing/separated.png'});
  await page.locator('[data-anchor="lumi"]').press('Enter');
  await page.locator('#dialogue-next').waitFor({timeout:120000});
  assert.match(await page.locator('#dialogue-root').innerText(),/Lumi/);
  await page.locator('#dialogue-skip').click();
  await page.evaluate(()=>{window.PharmaStore.state.storyFlags.label=true;window.PharmaStore.state.storyFlags.conditions=true;});
  await page.locator('[data-anchor="receptor"]').press('Enter');
  await page.locator('#lesson-body').waitFor({timeout:120000});
  assert.match(await page.locator('#modaltitle').innerText(),/受体/);
  fs.writeFileSync('reports/pd-spacing/results.json',JSON.stringify({passed:true,resolution:[1366,768],lumi:a,receptor:b,checks:['separate buttons','Lumi dialogue','receptor lesson'],timestamp:new Date().toISOString()},null,2));
  console.log('PASS: separated Lumi and receptor, both interactions work');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/32433/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
}
const baseURL = process.env.GAME_URL || process.env.BASE_URL || 'http://localhost:4173';
const out = path.join(__dirname, '../reports/learning');
fs.mkdirSync(out, {recursive: true});
const report = {startedAt: new Date().toISOString(), baseURL, cases: [], pageErrors: []};
let browser, page;
const click = name => page.getByRole('button', {name, exact: true}).click();
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.PharmaStore.state)));
async function record(name, fn) {
  const start = Date.now();
  try { await fn(); report.cases.push({name, passed: true, durationMs: Date.now()-start}); }
  catch (e) { report.cases.push({name, passed: false, error: e.stack}); throw e; }
}
async function range(id, value) {
  await page.locator(id).fill(String(value));
  await page.locator(id).dispatchEvent('input');
}
async function operate(kind, guided) {
  if (kind === 'curve') { await range('#ec', guided ? -1 : -.5); await range('#em', guided ? 60 : 80); }
  else if (kind === 'half') { await range('#value', guided ? 2 : 3); assert.match(await page.locator('#amount').innerText(), guided ? /25 mg/ : /12\.5 mg/); }
  else if (kind === 'safety') { await range('#value', guided ? 200 : 300); assert.match(await page.locator('#amount').innerText(), guided ? /= 20/ : /= 30/); }
  else if (kind === 'receptor') { await page.locator('#antagonist').click(); await range('#agonist', 10); assert.match(await page.locator('#receptor-output').innerText(), /Emax/); }
  else if (kind === 'adme') { for (let i=0; i<4; i++) await page.locator(`[data-process="${i}"]`).click(); }
  else await page.locator(`[data-connect="${({route:guided?1:0,adapt:guided?1:0,interaction:guided?0:1})[kind]}"]`).click();
}
async function openLesson(id) { await page.evaluate(id => window.PharmaLearning.startLesson(id), id); await page.locator('#lesson-body').waitFor(); }
async function lesson(l, {wrong=false, english=false}={}) {
  await openLesson(l.id);
  await page.locator('#review').click();
  const phases = [];
  async function phase(n, text) { assert.match(await page.locator('#lesson-body').innerText(), new RegExp(text)); phases.push(n); }
  await phase(1, '概念教学');
  assert.match(await page.locator('.source').innerText(), /PDF/);
  await click('观察机制 →');
  await phase(2, '机制可视化');
  assert.equal(await page.getByRole('button',{name:'跟随导师操作 →',exact:true}).isDisabled(), true);
  await page.locator('#walk-step').click(); await page.locator('#walk-step').click();
  await click('跟随导师操作 →');
  await phase(3, '导师示范');
  assert.equal(await page.getByRole('button',{name:'操作达标，继续 →',exact:true}).isDisabled(), true);
  await operate(l.kind, true);
  assert.equal(await page.getByRole('button',{name:'操作达标，继续 →',exact:true}).isDisabled(), true, 'mentor gate cannot be bypassed by correct input');
  await page.locator('#demo').click();
  // ADME buttons keep their pre-demonstration state; other labs may already be at target.
  if (l.kind === 'curve') await range('#ec', 0);
  if (l.kind === 'half' || l.kind === 'safety') await range('#value', l.kind === 'half' ? 0 : 100);
  await operate(l.kind, true); await click('操作达标，继续 →');
  await phase(4, '理解检查');
  if (wrong) { await page.locator(`[data-answer="${1-l.check.a}"]`).click(); assert.match(await page.locator('.feedback').innerText(), /Try again/); }
  await page.locator(`[data-answer="${l.check.a}"]`).click(); await click('理解了，继续 →');
  await phase(5, '独立机制挑战'); await operate(l.kind, false); await click('操作达标，继续 →');
  await phase(6, '情境应用'); await page.locator(`[data-answer="${l.application.a}"]`).click(); await click('理解了，继续 →');
  await phase(7, '英文考试挑战');
  await click(english ? '进入英文考试 · 隐藏中文' : '双语挑战 · 推荐');
  if (english) assert.equal(await page.locator('#question .question .chinese').isHidden(), true);
  await page.locator(`[data-answer="${l.exam.a}"]`).click();
  assert.equal(await page.locator('.feedback .chinese').isVisible(), true, 'feedback remains bilingual');
  await click('点亮本课遗迹 ✓');
  assert.equal((await state()).learning[l.id].complete, true);
  assert.deepEqual(phases, [1,2,3,4,5,6,7]);
  await page.locator('#close').click();
}
async function boss(english, correct) {
  await page.evaluate(() => window.PharmaLearning.openBoss());
  await click(english ? '英文考试 · 确认隐藏中文' : '双语试炼 →');
  for (let i=0; i<8; i++) {
    if (english) assert.equal(await page.locator('#boss-question .question .chinese').isHidden(), true);
    await page.locator(`[data-answer="${correct?0:1}"]`).click();
    assert.equal(await page.locator('.feedback .chinese').isVisible(), true);
    await click('下一道封印 →');
  }
  assert.match(await page.locator('#content').innerText(), correct ? /8 \/ 8/ : /0 \/ 8/);
  await page.screenshot({path: path.join(out, correct ? 'boss-pass.png' : 'boss-fail.png')});
  await click('返回地图');
}

(async () => {
  browser = await playwright.chromium.launch({headless: true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push(e.message));
  await page.goto(baseURL);
  await page.waitForFunction(() => window.PharmaStore && window.PharmaLearning && window.COURSE);
  // This suite isolates teaching from travel. World acceptance is a separate real exploration run.
  const lessons = await page.evaluate(() => JSON.parse(JSON.stringify(window.COURSE.lessons)));
  await record('new-player avatar UI', async () => {
    await page.locator('#new-game').click(); await page.locator('#avatar-name').fill('QA Traveler');
    await page.locator('#start-game').click(); await page.locator('#world-canvas').waitFor({state:'visible'});
  });
  await record('Boss stays locked until all eight lessons complete', async () => {
    await page.evaluate(() => window.PharmaLearning.openBoss());
    assert.equal(await page.getByRole('button',{name:'双语试炼 →',exact:true}).isDisabled(), true);
    await page.locator('#close').click();
  });
  for (let i=0; i<lessons.length; i++) await record(`seven real stages: ${lessons[i].id}`, () => lesson(lessons[i], {wrong:i===0,english:i===7}));
  await record('all four regions, 420 XP, wrong-answer journal and glossary', async () => {
    const s = await state(); assert.equal(s.xp,420); assert.equal(s.mistakes,1);
    for (const zone of ['intro','pd','pk','factors']) assert.equal(s.done[zone],true);
    await page.evaluate(() => window.PharmaLearning.openJournal()); assert.match(await page.locator('#content').innerText(), /renal drug excretion/); await page.locator('#close').click();
    await page.evaluate(() => window.PharmaLearning.openGlossary()); await page.locator('#gloss-search').fill('EC50'); assert.match(await page.locator('#gloss-results').innerText(), /半最大效应浓度/);
    await page.screenshot({path:path.join(out,'glossary.png')}); await click('关闭图鉴');
  });
  await record('repeating full lesson grants no duplicate XP', async () => { await lesson(lessons[0]); assert.equal((await state()).xp,420); });
  await record('Boss failure records mistakes without reward', async () => { await boss(false,false); const s=await state(); assert.equal(s.xp,420); assert.equal(s.mistakes,9); assert.ok(!s.done.boss); });
  await record('English Boss retake passes, bilingual explanation, first reward', async () => { await boss(true,true); const s=await state(); assert.equal(s.xp,570); assert.equal(s.done.boss,true); assert.equal(s.bossBest,8); });
  await record('Boss repeat grants no duplicate XP', async () => { await boss(false,true); assert.equal((await state()).xp,570); });
  await record('save survives reload', async () => { const before=await state(); await page.reload(); await page.waitForFunction(()=>window.PharmaStore); const after=await state(); assert.equal(after.xp,before.xp); assert.deepEqual(after.learning,before.learning); });
  await record('mid-lesson exit resumes exact teaching phase', async () => {
    await openLesson('curve'); await page.locator('#review').click(); await click('观察机制 →'); await page.locator('#close').click();
    await page.reload(); await page.waitForFunction(()=>window.PharmaLearning); await openLesson('curve'); assert.match(await page.locator('#lesson-body').innerText(),/02 · 机制可视化/); await page.locator('#close').click();
  });
  await record('legacy v2 migration preserves XP, badges, glossary and phase', async () => {
    const legacy = {version:2,xp:215,done:{intro:true,boss:true},seen:{Pharmacology:true},bossBest:7,learning:{half:{phase:4,complete:false,correct:1}},errors:[],welcome:true,mode:'english_assisted'};
    await page.evaluate(value=>{localStorage.setItem(window.PharmaStore.key,JSON.stringify(value));}, legacy);
    await page.reload(); await page.waitForFunction(()=>window.PharmaStore); const s=await state(); assert.equal(s.xp,215); assert.equal(s.done.intro,true); assert.equal(s.done.boss,true); assert.equal(s.seen.Pharmacology,true); assert.equal(s.bossBest,7); assert.equal(s.learning.half.phase,4);
  });
  await record('invalid import does not modify current progress', async () => {
    const before = await state();
    const outcome = await page.evaluate(async () => { try { await window.PharmaStore.import('{broken'); return false; } catch { return true; } });
    assert.equal(outcome,true,'invalid JSON import must report rejection'); assert.deepEqual(await state(),before);
    const rejected = await page.evaluate(async () => { try { await window.PharmaStore.import(JSON.stringify({version:2,xp:100,learning:[]})); return false; } catch { return true; } });
    assert.equal(rejected,true,'invalid learning structure must be rejected'); assert.deepEqual(await state(),before);
  });
  await record('corrupt storage is preserved or backed up before recovery', async () => {
    await page.evaluate(()=>localStorage.setItem(window.PharmaStore.key,'{corrupt-qa-save'));
    await page.reload(); await page.waitForFunction(()=>window.PharmaStore);
    const recovery = await page.evaluate(()=>({s:window.PharmaStore.state,values:Object.values(localStorage)}));
    assert.ok(Number.isFinite(recovery.s.xp) && recovery.s.xp>=0); assert.ok(recovery.values.includes('{corrupt-qa-save'),'unreadable original must be preserved for recovery');
  });
  assert.deepEqual(report.pageErrors,[]);
})().catch(async e => { report.error=e.stack; if(page) await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{}); process.exitCode=1; }).finally(async () => {
  report.finishedAt=new Date().toISOString(); report.passed=!report.error && report.cases.every(c=>c.passed);
  fs.writeFileSync(path.join(out,'results.json'), JSON.stringify(report,null,2));
  if(browser) await browser.close();
  console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failed:report.cases.filter(c=>!c.passed).map(c=>c.name),report:path.join(out,'results.json')},null,2));
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/content/lessons.js'), 'utf8'), sandbox);
const lessons = sandbox.window.COURSE.lessons;

test('all eight original lessons and four knowledge regions survive integration', () => {
  assert.deepEqual(Array.from(lessons, l => l.id), ['direction','curve','receptor','safety','adme','half','adapt','interaction']);
  assert.deepEqual([...new Set(lessons.map(l => l.zone))], ['intro','pd','pk','factors']);
  for (const l of lessons) {
    assert.equal(l.steps.length, 3, `${l.id}: mechanism walkthrough`);
    assert.equal(l.demo.length, 2, `${l.id}: bilingual mentor demonstration`);
    for (const name of ['check','application','exam']) {
      const q = l[name];
      for (const key of ['zh','en','why','whyEn']) assert.ok(q[key]?.trim(), `${l.id}.${name}.${key}`);
      assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length);
      q.opts.forEach(option => assert.ok(option[0] && option[1]));
    }
  }
});

test('every concept retains bilingual definition, lesson provenance and review status', () => {
  let terms = 0;
  for (const l of lessons) {
    for (const key of ['source_file','source_page','learning_objective','reviewed_status','misconception']) {
      assert.ok(l[key]?.trim(), `${l.id}: missing ${key}`);
    }
    assert.match(l.source_file, /\.pdf$/i);
    assert.match(l.source_page, /\d/);
    for (const term of l.terms) {
      terms++;
      for (const key of ['title_zh','full_term_en','definition_zh','explain_zh','explain_en']) assert.ok(term[key]?.trim(), `${l.id}: term ${key}`);
    }
  }
  assert.ok(terms >= 34, 'original vocabulary coverage must not shrink');
});

test('pharmacology answer baselines preserve PD/PK, potency, TI and elimination distinctions', () => {
  const byId = Object.fromEntries(lessons.map(l => [l.id, l]));
  const answer = (id, q) => byId[id][q].opts[byId[id][q].a].join(' / ');
  assert.match(answer('direction','check'), /PK/);
  assert.match(answer('direction','application'), /PD/);
  assert.match(answer('curve','application'), /Higher potency, same efficacy/);
  assert.match(answer('receptor','application'), /Preserved/);
  assert.match(answer('safety','exam'), /LD50 \/ ED50/);
  assert.match(answer('half','check'), /25 mg/);
  assert.match(answer('half','application'), /12\.5%/);
  assert.match(answer('adme','check'), /already in blood/);
  assert.match(answer('adapt','exam'), /Resistance/);
  assert.match(answer('interaction','check'), /Incompatibility/);
});

test('actual production Hill curve has its half-max point at log EC50', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/learning/legacy.js'), 'utf8');
  const declaration = source.match(/function curvePath\(ec,em\)\{[^\n]*?return d\}/);
  assert.ok(declaration, 'production curvePath must remain auditable');
  const scope = {};
  vm.runInNewContext(declaration[0], scope);
  const points = scope.curvePath(0, 100).slice(1).split('L').map(p => p.split(',').map(Number));
  assert.equal(points.length, 81);
  assert.equal(points[40][1], 140, 'E=50 at log concentration = log EC50=0');
  assert.ok(points[0][1] > points[40][1] && points[40][1] > points[80][1], 'response increases monotonically');
  const lower = scope.curvePath(0, 60).slice(1).split('L').map(p => p.split(',').map(Number));
  assert.equal(lower[40][1], 174, 'half of Emax=60 is 30, not 50');
});

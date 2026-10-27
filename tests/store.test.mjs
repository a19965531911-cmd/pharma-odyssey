import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,createDefault,migrate,validate} from '../src/persistence/store.js';
const KEY = 'pharma-odyssey-general-v1';
function memory(raw) {
  const data = new Map(raw === undefined ? [] : [[KEY, raw]]);
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('defaults are independent and include settings, exploration and learning', () => {
  const a = createDefault(), b = createDefault();
  a.done.direction = true;
  assert.equal(b.done.direction, undefined);
  assert.equal(a.version, 3);
  assert.equal(a.settings.textSpeed, 35);
  assert.equal(a.settings.volume, .4);
  assert.deepEqual(a.position, { x: 0, y: 0, z: 0 });
});

test('v2 migration preserves all learning, errors, flags, XP and makes raw backup', () => {
  const old = { version: 2, done: { direction: true }, seen: { PD: true }, xp: 42, mistakes: 2, bossBest: 6, mode: 'exam_english', learning: { curve: { stage: 4 } }, errors: [{ question: 'Q' }], welcome: true };
  const raw = JSON.stringify(old), storage = memory(raw), store = createStore(storage);
  assert.equal(store.state.learning.curve.stage, 4);
  assert.equal(store.state.xp, 42);
  assert.equal(store.state.mode, 'exam_english');
  assert.deepEqual(store.state.errors, old.errors);
  assert.equal(storage.getItem(KEY), raw);
  assert.ok([...storage.data.entries()].some(([key, value]) => key !== KEY && value === raw));
});

test('save emits stable state; replace, reset and import retain top-level identity', () => {
  const storage = memory(), store = createStore(storage), state = store.state, reasons = [];
  const stop = store.subscribe((value, reason) => { assert.equal(value, state); reasons.push(reason); });
  state.xp = 12; store.save();
  store.replace({ version: 2, xp: 34 });
  assert.equal(state.xp, 34);
  store.import(JSON.stringify({ version: 3, xp: 56 }));
  assert.equal(state.xp, 56);
  assert.equal(JSON.parse(store.export()).xp, 56);
  store.reset();
  assert.equal(state.xp, 0);
  assert.deepEqual(reasons, ['save', 'replace', 'import', 'replace']);
  stop(); store.save(); assert.equal(reasons.length, 4);
});

test('invalid imports leave original local storage and state exactly intact', () => {
  const storage = memory(JSON.stringify({ version: 2, xp: 23 })), store = createStore(storage);
  const before = JSON.stringify(store.state), persisted = [...storage.data];
  for (const invalid of ['{', 'null', '[]', '{}', '{"version":99}', '{"version":2,"done":[]}', '{"version":3,"avatar":"x"}', '{"version":3,"settings":{"volume":"loud"}}']) {
    assert.throws(() => store.import(invalid));
    assert.equal(JSON.stringify(store.state), before);
    assert.deepEqual([...storage.data], persisted);
  }
});

test('corrupt saved JSON is preserved even when autosave is attempted', () => {
  const storage = memory('{broken'), store = createStore(storage);
  assert.equal(store.status, 'error');
  assert.equal(store.save(), false);
  assert.equal(storage.getItem(KEY), '{broken');
  store.reset();
  assert.equal(JSON.parse(storage.getItem(KEY)).version, 3);
  assert.ok([...storage.data.values()].includes('{broken'));
});

test('numeric values sanitize and old errors remain accessible above active cap', () => {
  const errors = Array.from({ length: 2100 }, (_, n) => ({ n }));
  const state = migrate({ version: 2, xp: -3, mistakes: -4, bossBest: 100, errors });
  assert.equal(state.xp, 0); assert.equal(state.mistakes, 0); assert.equal(state.bossBest, 8);
  assert.equal(state.errors.length + state.errorsArchive.length, 2100);
  assert.deepEqual([...state.errorsArchive, ...state.errors], errors);
  assert.throws(() => validate({ version: 3, position: { x: 'bad', y: 0 } }));
});

test('failed storage import rolls back state and protects previous record', () => {
  const storage = memory(JSON.stringify({ version: 2, xp: 23 })), store = createStore(storage);
  const before = JSON.stringify(store.state), raw = storage.getItem(KEY), set = storage.setItem;
  storage.setItem = (key, value) => { if (key === KEY) throw new Error('quota'); set(key, value); };
  assert.throws(() => store.import('{"version":3,"xp":99}'));
  assert.equal(JSON.stringify(store.state), before);
  assert.equal(storage.getItem(KEY), raw);
});

test('autosave keeps active lesson and avatar references usable', () => {
  const store = createStore(memory());
  store.state.learning.curve = { stage: 2 };
  store.state.avatar = { name: 'Traveler' };
  const lesson = store.state.learning.curve, avatar = store.state.avatar;
  store.save();
  lesson.stage = 3; avatar.name = 'Updated';
  assert.equal(store.state.learning.curve.stage, 3);
  assert.equal(store.state.avatar.name, 'Updated');
});

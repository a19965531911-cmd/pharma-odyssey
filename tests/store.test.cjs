'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const moduleReady = import(pathToFileURL(path.join(__dirname, '../src/persistence/store.js')).href);
function memory(initial={}) {
  const data = new Map(Object.entries(initial));
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};
}

test('v2 migration preserves earned progress and keeps the original backup', async () => {
  const {createStore,SAVE_KEY}=await moduleReady;
  const old={version:2,xp:215,done:{intro:true},seen:{Pharmacology:true},learning:{half:{phase:4,correct:1}},errors:[],mode:'english_assisted',bossBest:7};
  const original=JSON.stringify(old), storage=memory({[SAVE_KEY]:original}), store=createStore(storage);
  assert.equal(store.state.version,3); assert.equal(store.state.xp,215);
  assert.deepEqual(store.state.learning,old.learning); assert.deepEqual(store.state.done,old.done);
  assert.equal(store.state.settings.language,'english_assisted'); assert.equal(store.state.bossBest,7);
  assert.ok([...storage.data.entries()].some(([key,value])=>key!==SAVE_KEY && value===original));
});

test('malformed imports and prototype keys cannot replace valid current progress', async () => {
  const {createStore}=await moduleReady;
  const store=createStore(memory()); store.state.xp=99; assert.equal(store.save(),true);
  const before=store.export();
  for (const text of ['{bad','null','[]','{"version":999,"xp":4}','{"learning":[]}','{"xp":4,"__proto__":{"polluted":true}}']) {
    assert.throws(()=>store.import(text)); assert.equal(store.export(),before);
  }
  assert.equal({}.polluted,undefined);
});

test('unreadable stored data survives automatic saving until explicit recovery', async () => {
  const {createStore,SAVE_KEY}=await moduleReady;
  const raw='{unreadable original', storage=memory({[SAVE_KEY]:raw}), store=createStore(storage);
  store.state.xp=20;
  assert.equal(store.save(),false); assert.equal(storage.getItem(SAVE_KEY),raw);
  assert.equal(store.state.xp,20); assert.ok(store.errors.length>0);
});

test('storage failure during import is transactional', async () => {
  const {createStore,SAVE_KEY}=await moduleReady;
  const storage=memory(), store=createStore(storage); store.state.xp=75; store.save();
  const persisted=storage.getItem(SAVE_KEY), before=store.export();
  storage.setItem=()=>{throw new Error('quota full');};
  assert.throws(()=>store.import('{"version":2,"xp":800}'),/quota full/);
  assert.equal(store.export(),before); assert.equal(storage.getItem(SAVE_KEY),persisted);
});

test('large mistake history is archived without losing any entries', async () => {
  const {migrate}=await moduleReady;
  const errors=Array.from({length:2010},(_,index)=>({question:`question ${index}`}));
  const migrated=migrate({version:2,xp:0,errors});
  assert.equal(migrated.errors.length,2000); assert.equal(migrated.errorsArchive.length,10);
  assert.deepEqual([...migrated.errorsArchive,...migrated.errors],errors);
});

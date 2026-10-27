import {drugs,bossPhases} from '../world03/data.js';
import {presets} from '../world03/simulation.js';
export const SAVE_KEY = 'pharma-odyssey-general-v1';
const ERROR_LIMIT = 2000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const number = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(min, Math.min(max, result)) : fallback;
};

export function createDefault() {
  return {
    version: 3, done: {}, seen: {}, xp: 0, mistakes: 0, bossBest: 0,
    mode: 'beginner_bilingual', learning: {}, errors: [], errorsArchive: [], welcome: false,
    avatar: null, storyFlags: {}, scene: 'harbor', position: { x: 0, y: 0, z: 0 }, inventory: [],
    settings: { volume: .4, textSpeed: 35, skipAnimations: false, language: 'beginner_bilingual', reducedMotion: false, fontSize: 16 },
    ui: { panel: null, activeLesson: null }, resume: {},
  };
}

function safeTree(value, depth = 0) {
  if (depth > 80) throw new Error('Save nesting is too deep.');
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe save field.');
      safeTree(value[key], depth + 1);
    }
  }
}

// Validate structure before migrating; malformed imports must never erase progress.
export function validate(input) {
  if (!object(input)) throw new Error('Save must be a JSON object.');
  safeTree(input);
  if (input.version !== undefined && ![1, 2, 3].includes(input.version)) throw new Error('Unsupported save version.');
  if (!['version', 'done', 'seen', 'xp', 'learning', 'storyFlags', 'avatar'].some(key => Object.hasOwn(input, key))) throw new Error('This file is not a Pharma Odyssey save.');
  for (const key of ['done', 'seen', 'learning', 'storyFlags', 'settings', 'position', 'ui', 'resume']) {
    if (input[key] !== undefined && !object(input[key])) throw new Error(`Invalid ${key}.`);
  }
  for (const key of ['errors', 'errorsArchive', 'inventory']) {
    if (input[key] !== undefined && !Array.isArray(input[key])) throw new Error(`Invalid ${key}.`);
  }
  if (input.avatar !== undefined && input.avatar !== null && !object(input.avatar)) throw new Error('Invalid avatar.');
  if(input.world02!==undefined){
    const p=input.world02;
    if(!object(p)||!Array.isArray(p.complete)||!Array.isArray(p.errors)||!Array.isArray(p.visited)||!object(p.operations)||!object(p.answers)||!object(p.sim))throw new Error('Invalid world02 progress.');
    if(!Number.isInteger(p.boss)||p.boss<0||p.boss>9)throw new Error('Invalid world02 Boss progress.');
    const validId=id=>typeof id==='string'&&/^0[0-8]$/.test(id);
    if(!p.complete.every(validId)||!p.visited.every(validId)||!validId(p.region))throw new Error('Invalid world02 region.');
    if(Object.values(p.operations).some(v=>!Array.isArray(v)||!v.every(x=>typeof x==='string'))||Object.values(p.answers).some(v=>!Array.isArray(v)||!v.every(Number.isInteger)))throw new Error('Invalid world02 records.');
  }
  if(input.world03!==undefined){
    const p=input.world03,valid=id=>typeof id==='string'&&/^[A-H]$/.test(id);
    if(!object(p)||p.version!==1||!valid(p.region)||!Array.isArray(p.complete)||!p.complete.every(valid)||!Array.isArray(p.visited)||!p.visited.every(valid)||!Array.isArray(p.errors)||!Array.isArray(p.codex))throw new Error('Invalid world03 progress.');
    for(const key of ['observations','answers','cases','sim','boss','transport'])if(!object(p[key]))throw new Error('Invalid world03 '+key);
    if(!Number.isInteger(p.boss.phase)||p.boss.phase<0||p.boss.phase>4||!Number.isInteger(p.boss.index)||p.boss.index<0||p.boss.index>6)throw new Error('Invalid world03 Boss progress.');
    if(p.boss.phase<4?p.boss.index>=bossPhases[p.boss.phase].questions.length:p.boss.index!==0)throw new Error('Invalid world03 phase question.');
    if(!p.codex.every(id=>typeof id==='string'&&Object.hasOwn(drugs,id)))throw new Error('Invalid world03 codex.');
    if(!Object.hasOwn(presets,p.sim.preset)||p.sim.drug!==null&&!Object.hasOwn(drugs,p.sim.drug))throw new Error('Invalid world03 simulation.');
    const inputKeys=['heartRate','bloodVolume','contractility','vascularResistance','venousTone','coronaryTone','renin','aceActivity','at1Availability','aldosteroneReceptor','remodeling','naSpeed','avSpeed','refractory','qt','plateletActivity','coagulation','fibrinolysis','bleedingRisk'];
    if(Object.keys(p.sim.inputs||{}).some(k=>!inputKeys.includes(k)))throw new Error('Invalid world03 input key.');
    if(Object.values(p.observations).some(v=>!Array.isArray(v)||!v.every(x=>typeof x==='string'))||Object.values(p.answers).some(v=>!Number.isInteger(v)||v<0||v>2))throw new Error('Invalid world03 observations.');
    if(!p.codex.every(x=>typeof x==='string')||!['idle','boarding','sailing','mooring','lifting'].includes(p.transport.mode))throw new Error('Invalid world03 transport.');
    const t=p.transport;
    if(t.mode!=='idle'&&(!valid(t.from)||!valid(t.to)||!Number.isFinite(t.elapsed)||t.elapsed<0))throw new Error('Invalid world03 voyage.');
    if(t.dock!==undefined&&!valid(t.dock))throw new Error('Invalid world03 dock.');
    if(typeof p.fastTravel!=='boolean'||typeof p.endingSeen!=='boolean')throw new Error('Invalid world03 flags.');
    if(p.sim.inputs!==undefined&&(!object(p.sim.inputs)||Object.values(p.sim.inputs).some(v=>typeof v!=='number'||!Number.isFinite(v))))throw new Error('Invalid world03 model inputs.');
  }
  for (const key of ['mode', 'scene']) if (input[key] !== undefined && typeof input[key] !== 'string') throw new Error(`Invalid ${key}.`);
  for (const key of ['x', 'y', 'z']) if (input.position?.[key] !== undefined && (typeof input.position[key] !== 'number' || !Number.isFinite(input.position[key]))) throw new Error('Invalid player position.');
  for (const key of ['volume', 'textSpeed', 'fontSize']) if (input.settings?.[key] !== undefined && (typeof input.settings[key] !== 'number' || !Number.isFinite(input.settings[key]))) throw new Error(`Invalid settings.${key}.`);
  for (const key of ['skipAnimations', 'reducedMotion']) if (input.settings?.[key] !== undefined && typeof input.settings[key] !== 'boolean') throw new Error(`Invalid settings.${key}.`);
  if (input.settings?.language !== undefined && typeof input.settings.language !== 'string') throw new Error('Invalid settings.language.');
  if (input.avatar) for (const key of ['nickname', 'name', 'hair', 'hairColor', 'coat', 'accessory']) if (input.avatar[key] !== undefined && typeof input.avatar[key] !== 'string') throw new Error(`Invalid avatar.${key}.`);
  return true;
}

export function migrate(input) {
  validate(input);
  const defaults = createDefault(), value = clone(input);
  const next = { ...defaults, ...value, version: 3 };
  for (const key of ['done', 'seen', 'learning', 'storyFlags', 'ui', 'resume']) next[key] = { ...defaults[key], ...(value[key] || {}) };
  next.position = { ...defaults.position, ...(value.position || {}) };
  next.settings = { ...defaults.settings, language: value.mode || defaults.mode, ...(value.settings || {}) };
  next.settings.volume = number(next.settings.volume, .4, 0, 1);
  next.settings.textSpeed = number(next.settings.textSpeed, 35, 0, 200);
  next.settings.fontSize = number(next.settings.fontSize, 16, 12, 28);
  next.xp = number(value.xp);
  next.mistakes = Math.floor(number(value.mistakes));
  next.bossBest = Math.floor(number(value.bossBest, 0, 0, 8));
  next.welcome = Boolean(value.welcome);
  next.inventory = value.inventory || [];
  const errors = value.errors || [];
  next.errorsArchive = [...(value.errorsArchive || []), ...errors.slice(0, Math.max(0, errors.length - ERROR_LIMIT))];
  next.errors = errors.slice(-ERROR_LIMIT);
  if (next.avatar) {
    next.avatar = { nickname: '', name: '', hair: 'short', hairColor: '#352c38', coat: 'teal', accessory: 'none', ...next.avatar };
    next.avatar.nickname = next.avatar.nickname || next.avatar.name;
    next.avatar.name = next.avatar.name || next.avatar.nickname;
  }
  return next;
}

export function createStore(storage = null) {
  const state = createDefault(), subscribers = new Set(), notices = [];
  let status = 'ready', note = '', protectedRaw = false, backupCounter = 0;
  const report = error => {
    status = 'error'; note = error?.message || String(error);
    notices.push({ time: new Date().toISOString(), message: note });
  };
  const emit = reason => {
    for (const fn of subscribers) {
      try { fn(state, reason); } catch (error) { console.error('Save subscriber failed:', error); }
    }
  };
  const assign = next => {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, next);
  };
  const backup = (raw, label = 'rollback') => {
    if (storage && raw !== null) {
      const key = `${SAVE_KEY}:backup:${label}:${Date.now()}:${backupCounter++}`;
      storage.setItem(key, raw);
      return key;
    }
    return null;
  };
  if (storage) {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== null) {
        const old = JSON.parse(raw), next = migrate(old);
        if (old.version !== 3) backup(raw, `v${old.version || 1}`);
        assign(next);
        note = old.version === 3 ? 'Save loaded.' : 'Previous save migrated; original backup retained.';
      }
    } catch (error) { protectedRaw = true; report(error); }
  }
  function replace(input, reason = 'replace') {
    const next = migrate(input);
    const serialized = JSON.stringify(next);
    try {
      if (storage) {
        backup(storage.getItem(SAVE_KEY));
        // Persist before mutation so quota/security failures retain the current state.
        storage.setItem(SAVE_KEY, serialized);
      }
    } catch (error) { report(error); throw error; }
    assign(next); protectedRaw = false; status = 'saved'; note = 'Save restored.';
    emit(reason);
    return state;
  }
  return {
    key: SAVE_KEY,
    get state() { return state; },
    get status() { return status; },
    get note() { return note; },
    get errors() { return notices.slice(); },
    save() {
      if (protectedRaw) { note = 'Unreadable original save protected. Export or explicitly import/reset to continue saving.'; emit('save'); return false; }
      try {
        const next = migrate(state);
        if (storage) storage.setItem(SAVE_KEY, JSON.stringify(next));
        for (const key of ['xp', 'mistakes', 'bossBest']) state[key] = next[key];
        Object.assign(state.settings, next.settings);
        status = 'saved'; note = 'Saved.';
      } catch (error) { report(error); emit('save'); return false; }
      emit('save'); return true;
    },
    replace,
    reset() { return replace(createDefault()); },
    subscribe(fn) {
      if (typeof fn !== 'function') throw new TypeError('Subscriber must be a function.');
      subscribers.add(fn); return () => subscribers.delete(fn);
    },
    export() { return JSON.stringify(migrate(state), null, 2); },
    import(text) {
      if (typeof text !== 'string' || text.length > 20 * 1024 * 1024) throw new Error('Invalid or oversized save file.');
      return replace(JSON.parse(text), 'import');
    },
  };
}

let browserStorage = null;
try { browserStorage = typeof window !== 'undefined' ? window.localStorage : null; } catch { /* Sandboxed browsers can disable storage. */ }
export const store = createStore(browserStorage);
if (typeof window !== 'undefined') window.PharmaStore = store;

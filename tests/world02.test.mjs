import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adrenergic,enzyme,muscle} from '../src/world02/simulation.js';
import {regions,links,unlocked,progress} from '../src/world02/data.js';
import {createStore} from '../src/persistence/store.js';
import {createNavigator} from '../src/engine/navigation.js';
import {walkable} from '../src/world02/city.js';

test('receptor effects, reversal and beta selectivity agree with mechanisms',()=>{
 const normal=adrenergic(),alpha=adrenergic('epinephrine','alpha');
 assert.ok(normal.map>90);assert.ok(alpha.map<90);assert.ok(alpha.dbp<76);
 assert.ok(adrenergic('norepinephrine').hr<72);
 assert.ok(adrenergic('isoprenaline').hr>100);assert.ok(adrenergic('isoprenaline').dbp<76);
 assert.equal(adrenergic('epinephrine','propranolol').airway,1);
 assert.ok(adrenergic('epinephrine','metoprolol').airway>1);
 assert.ok(enzyme('neo').ach>enzyme('normal').ach);assert.ok(enzyme('pam').activity>enzyme('op').activity);
 assert.equal(enzyme('age').activity,enzyme('op').activity);
 assert.equal(muscle('sux',3),0);assert.equal(muscle('tubo',1),0);assert.notEqual(muscle('tuboneo',1),0);
});
test('both routes are required and progress survives export/import without avatar loss',()=>{
 const store=createStore();store.state.avatar={name:'澜',coat:'#477b70'};const p=progress(store.state);
 assert.equal(unlocked(store.state,'07'),false);p.complete.push('00','01','02','03','04');
 assert.equal(unlocked(store.state,'05'),true);assert.equal(unlocked(store.state,'07'),false);
 p.complete.push('05','06');assert.equal(unlocked(store.state,'07'),true);
 p.answers['08']=[0,1];p.boss=2;p.sim['02']='age';const restored=createStore();restored.import(store.export());
 assert.equal(restored.state.avatar.name,'澜');assert.equal(restored.state.world02.boss,2);assert.equal(restored.state.world02.sim['02'],'age');
 assert.equal(regions.length,9);assert.equal(links.length,9);
});
test('all city path segments remain on walkable geometry, including concave bridge junctions',()=>{
 const nav=createNavigator({bounds:{min:[-34,-5,-69],max:[35,20,38]},walkable,colliders:regions.map(r=>({min:[r.x-2.9,0,r.z-4.75],max:[r.x+2.9,8,r.z-.45]}))});
 for(const [a,b] of links){for(const [from,to] of [[a,b],[b,a]]){
  const start=regions.find(r=>r.id===from),end=regions.find(r=>r.id===to),path=nav.find({x:start.x,z:start.z+3},{x:end.x,z:end.z+3});assert.ok(path.length>1);
  for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],n=Math.ceil(Math.hypot(p.x-q.x,p.z-q.z)/.03);for(let j=0;j<=n;j++)assert.equal(nav.blocked(p.x+(q.x-p.x)*j/n,p.z+(q.z-p.z)*j/n),false,from+' → '+to);}
 }}
});

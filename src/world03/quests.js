import {byId} from './data.js';
import {CirculationSimulation} from './simulation.js';
export function progress(state){
 return state.world03 ||= {version:1,region:'A',visited:['A'],complete:[],observations:{},answers:{},cases:{},errors:[],codex:[],boss:{phase:0,index:0},sim:new CirculationSimulation().serialize(),transport:{mode:'idle',dock:'A',trips:0,liftUnlocked:false},fastTravel:false,endingSeen:false};
}
export const unlocked=(state,id)=>!!byId(id)&&byId(id).needs.every(n=>progress(state).complete.includes(n));
export function completeRegion(state,id){
 const p=progress(state);if(!unlocked(state,id)||p.complete.includes(id))return false;
 p.complete.push(id);state.xp=(state.xp||0)+(id==='H'?240:45);
 state.inventory ||= [];if(!state.inventory.some(x=>x.id==='pulse-'+id))state.inventory.push({id:'pulse-'+id,title:byId(id).name+' · 循环记录',text:byId(id).story,chapter:3});
 if(id==='H'){state.storyFlags ||= {};state.done ||= {};state.storyFlags.world03Complete=true;state.storyFlags.world04Discovered=true;state.done.world03=true;p.fastTravel=true;}
 return true;
}

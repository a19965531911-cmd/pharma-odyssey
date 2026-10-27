import {dockPosition} from './geography.js';
import {byId} from './data.js';
const mix=(a,b,t)=>a+(b-a)*t;
export class TransitController {
 constructor(state){this.state=state;}
 get active(){return this.state.mode!=='idle';}
 start(from,to,fast=false){if(this.active||from===to||!byId(from)||!byId(to))return false;Object.assign(this.state,{mode:'boarding',from,to,elapsed:0,fast});return true;}
 startLift(id){if(this.active||id!=='H')return false;Object.assign(this.state,{mode:'lifting',from:id,to:id,elapsed:0});return true;}
 tick(dt){
  const s=this.state;if(!this.active)return {mode:'idle',position:dockPosition(s.dock||'A')};
  s.elapsed+=Math.max(0,Math.min(.1,dt));const a=dockPosition(s.from),b=dockPosition(s.to);
  if(s.mode==='lifting'){const t=Math.min(1,s.elapsed/3),lift=Math.sin(t*Math.PI);const position={x:byId('H').x,y:byId('H').h+.08+lift*2.5,z:byId('H').z+4.5};if(t>=1){s.mode='idle';s.liftUnlocked=true;s.dock='H';}return {mode:'lifting',position,lift,arrived:t>=1};}
  let position,boat;
  if(s.mode==='boarding'){const t=Math.min(1,s.elapsed/1.2);position={x:a.x+mix(0,2,t),y:mix(a.y,a.y-.6,t),z:a.z+mix(0,2,t)};boat={x:a.x+2,y:a.y-.6,z:a.z+2};if(t>=1){s.mode='sailing';s.elapsed=0;}}
  else if(s.mode==='sailing'){
   const duration=s.fast?3:Math.max(5,Math.hypot(a.x-b.x,a.z-b.z)/4.5),t=Math.min(1,s.elapsed/duration);
   // A raised arc clears intervening floating cliffs and exposes the moving hull.
   const arc=Math.sin(t*Math.PI);boat={x:mix(a.x+2,b.x+2,t)+arc*7,y:mix(a.y,b.y,t)-.6+arc*10,z:mix(a.z+2,b.z+2,t)+arc*7};position={...boat,y:boat.y+.35};
   if(t>=1){s.mode='mooring';s.elapsed=0;}
  }else{const t=Math.min(1,s.elapsed/1.2);boat={x:b.x+2,y:b.y-.6,z:b.z+2};position={x:mix(b.x+2,b.x,t),y:mix(b.y-.25,b.y,t),z:mix(b.z+2,b.z,t)};if(t>=1){s.mode='idle';s.dock=s.to;s.trips=(s.trips||0)+1;}}
  return {mode:s.mode,position,boat,arrived:s.mode==='idle'};
 }
}

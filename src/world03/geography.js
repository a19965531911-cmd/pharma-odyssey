import {regions,byId} from './data.js';
export const links=[['A','B'],['B','C'],['C','D'],['D','E'],['E','F'],['F','A'],['D','G'],['G','H']];
export const bounds={min:[-44,-10,-68],max:[43,24,40]};
export function bridgeProjection(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z;const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return {t,d:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
export function walkable(x,z,state={complete:[]}){
 if(regions.some(r=>Math.hypot(x-r.x,z-r.z)<9))return true;
 return links.some(([a,b])=>{if(a==='D'&&b==='G'&&!state.complete.includes('E'))return false;const p=bridgeProjection(x,z,byId(a),byId(b));return p.d<1.8;});
}
export function heightAt(x,z){
 const region=regions.find(r=>Math.hypot(x-r.x,z-r.z)<9);if(region)return region.h;
 let best={d:Infinity,h:0};for(const [a,b] of links){const r=byId(a),s=byId(b),p=bridgeProjection(x,z,r,s);const len=Math.hypot(s.x-r.x,s.z-r.z);const t=Math.max(0,Math.min(1,(p.t*len-8)/(len-16)));if(p.d<best.d)best={d:p.d,h:r.h+(s.h-r.h)*t};}
 return best.h;
}
export const dockPosition=id=>{const r=byId(id);return {x:r.x+5.5,y:r.h+.08,z:r.z+5.5};};

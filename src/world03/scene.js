import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {regions,byId} from './data.js';
import {links,bounds,heightAt,walkable,dockPosition} from './geography.js';
import {CirculationSimulation,ecgAt} from './simulation.js';

function batchStatic(root,excluded){
 root.updateWorldMatrix(true,true);const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),batches=new Map(),remove=[];
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||excluded.has(o))return;const key=o.material.uuid;const batch=batches.get(key)||{material:o.material,geometries:[]};const transform=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld);const geo=o.geometry.clone().applyMatrix4(transform);batch.geometries.push(geo);batches.set(key,batch);remove.push(o);});
 remove.forEach(o=>o.removeFromParent());
 for(const b of batches.values()){const geometry=mergeGeometries(b.geometries,false);if(geometry){const m=new T.Mesh(geometry,b.material);m.receiveShadow=true;root.add(m);}b.geometries.forEach(g=>g.dispose());}
 const old=new Set(remove.map(m=>m.geometry));old.forEach(g=>g.dispose());
}

export function buildArchipelago(){
 const root=new T.Group(),parts={},dynamic=new Set(),materials=new Map(),colliders=[],flow=[],gears=[],hearts=[],gauges=[],lamps=[];
 const state={complete:[],model:new CirculationSimulation().read()};
 const mat=(color,emissive=false)=>{const key=color+emissive;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.65,metalness:emissive?.25:.15,emissive:emissive?color:'#000000',emissiveIntensity:emissive?.7:0}));return materials.get(key);};
 const mesh=(geometry,color,x=0,y=0,z=0,parent=root,glow=false)=>{const m=new T.Mesh(geometry,mat(color,glow));m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,w,h,d,c,p=root)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
 const cyl=(x,y,z,r,h,c,p=root,n=16)=>mesh(new T.CylinderGeometry(r,r,h,n),c,x,y,z,p);
 const ball=(x,y,z,r,c,p=root)=>mesh(new T.SphereGeometry(r,14,10),c,x,y,z,p);
 const ring=(x,y,z,r,c,p=root)=>mesh(new T.TorusGeometry(r,.12,6,36),c,x,y,z,p);
 const moving=o=>{o.traverse(m=>dynamic.add(m));return o;};
 const text=(str,x,y,z,p=root,size=1)=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#143a46cc';ctx.fillRect(0,0,768,96);ctx.font='500 38px Microsoft YaHei, sans-serif';ctx.fillStyle='#f6edc7';ctx.textAlign='center';ctx.fillText(str,384,62);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));s.position.set(x,y,z);s.scale.set(7.2*size,.9*size,1);p.add(s);return s;};
 const gear=(x,y,z,r,c,p=root)=>{const geo=[new T.TorusGeometry(r,.22,6,32),new T.CylinderGeometry(.3,.3,.35,12).rotateX(Math.PI/2)];for(let i=0;i<12;i++){const a=i*Math.PI/6;geo.push(new T.BoxGeometry(.28,.5,.28).rotateZ(-a).translate(Math.sin(a)*(r+.15),Math.cos(a)*(r+.15),0));}for(let i=0;i<4;i++)geo.push(new T.BoxGeometry(.12,r*2,.12).rotateZ(i*Math.PI/4));const g=mesh(mergeGeometries(geo,false),c,x,y,z,p);geo.forEach(g=>g.dispose());moving(g);gears.push(g);return g;};
 const heart=(x,y,z,scale,p)=>{const shape=new T.Shape();shape.moveTo(0,-1.1);shape.bezierCurveTo(-2,-.1,-1.5,1.6,-.5,1.2);shape.bezierCurveTo(-.2,1.1,0,.8,0,.65);shape.bezierCurveTo(.3,1.55,1.7,1.5,1.7,.45);shape.bezierCurveTo(1.7,-.2,.5,-.8,0,-1.1);const g=new T.Group();g.position.set(x,y,z);p.add(g);const h=mesh(new T.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.16,bevelThickness:.18,curveSegments:16}),'#c2546d',0,0,0,g);h.scale.setScalar(scale);moving(g);hearts.push({g,scale});for(const sx of [-.6,.65]){const tube=cyl(x+sx*scale,y+1.2*scale,z+.2,.3*scale,1.3*scale,'#d9b77a',p);tube.rotation.z=sx<0?-.35:.35;}return g;};
 const pump=(x,y,z,p)=>{cyl(x,y,z,1.1,2.8,'#d6e4dd',p);ring(x,y+.7,z+1.04,.7,'#cba86a',p);const piston=moving(cyl(x,y+2.1,z,.35,1.5,'#7c9c9c',p));return piston;};
 const gauge=(x,y,z,p)=>{const face=cyl(x,y,z,.65,.13,'#ede9d0',p,24);face.rotation.x=Math.PI/2;ring(x,y,z+.1,.66,'#c6a66e',p);const g=new T.Group();g.position.set(x,y,z+.15);p.add(g);box(0,.22,0,.06,.55,.06,'#b54456',g);moving(g);gauges.push(g);return g;};
 const pipe=(a,b,r,c,p=root)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a));const m=mesh(new T.CylinderGeometry(r,r,v.length(),10),c,...new T.Vector3(...a).addScaledVector(v,.5).toArray(),p);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const sea=mesh(new T.PlaneGeometry(270,270,48,48),'#267d91',0,-8,-15);sea.rotation.x=-Math.PI/2;sea.material.roughness=.35;moving(sea);const seaBase=sea.geometry.attributes.position.array.slice();
 const ripples=new T.InstancedMesh(new T.BoxGeometry(1,.025,.09),mat('#8ed4d3',true),140),matrix=new T.Matrix4();
 for(let i=0;i<140;i++){matrix.compose(new T.Vector3(Math.sin(i*37.1)*115,-7.7,Math.cos(i*15.3)*115-15),new T.Quaternion(),new T.Vector3(1+i%4,1,1));ripples.setMatrixAt(i,matrix);}root.add(ripples);dynamic.add(ripples);
 for(const [a,b] of links){
  const r=byId(a),s=byId(b),dx=s.x-r.x,dz=s.z-r.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),n=Math.ceil(len/.8);
  for(let i=0;i<n;i++){const t=(i+.5)/n,x=r.x+dx*t,z=r.z+dz*t,y=heightAt(x,z),tile=box(x,y-.16,z,3.7,.32,len/n+.04,'#dce4d9');tile.rotation.y=angle;
   for(const side of [-1,1]){const xx=x+Math.cos(angle)*1.7*side,zz=z-Math.sin(angle)*1.7*side;const rail=box(xx,y+.64,zz,.1,.12,len/n+.04,'#c6ae77');rail.rotation.y=angle;if(i%4===0)cyl(xx,y+.3,zz,.065,.75,'#315b66');}
   if(i%3===0){const p=moving(box(x,y+.02,z,.18,.03,.65,a==='G'?'#d0b7ef':'#78efce'));p.rotation.y=angle;flow.push({mesh:p,i});}
  }
  for(const t of [.3,.65]){const x=r.x+dx*t,z=r.z+dz*t,y=heightAt(x,z);cyl(x,y-1.25,z,.38,2,'#648d93');const wing=box(x,y-2.5,z,3,.18,1,'#d7bd83');wing.rotation.y=angle;}
  if(a==='D'&&b==='G'){const gate=new T.Group();gate.position.set((r.x+s.x)/2,heightAt((r.x+s.x)/2,(r.z+s.z)/2), (r.z+s.z)/2);gate.rotation.y=angle;root.add(gate);box(0,1.1,0,3.5,2.2,.3,'#7f496b',gate);for(const x of [-1.5,1.5])cyl(x,1,0,.16,2.8,'#d0b077',gate);moving(gate);parts.gate=gate;}
 }
 for(const r of regions){
  const g=new T.Group();g.position.set(r.x,r.h,r.z);root.add(g);parts[r.id]={group:g};
  const cliff=mesh(new T.CylinderGeometry(9.2,5.8,5.5,12,3),'#527f89',0,-2.9,0,g);cliff.rotation.y=.12;
  cyl(0,-.35,0,9.3,.55,'#e2e6d9',g,48);cyl(0,-.04,0,8.95,.12,'#9bbdb3',g,48);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const buttress=box(Math.sin(a)*7.5,-1.9,Math.cos(a)*7.5,.55,3.5,1,'#96aca2',g);buttress.rotation.y=a;}
  const band=ring(0,-2.5,0,6.5,'#c5a46a',g);band.rotation.x=Math.PI/2;
  const under=mesh(new T.ConeGeometry(3.8,5,7),'#426a79',0,-6,0,g);under.rotation.x=Math.PI;
  for(const side of [-1,1]){
   const x=side*6.1;box(x,.3,2.6,1.7,.6,1.3,'#e1dfce',g);for(let k=0;k<3;k++)ball(x+(k-1)*.38,.85,2.6,.45,k===1?'#bfc586':'#66a68d',g);
   cyl(side*4,1.2,4,.08,2.4,'#c4a96c',g);const l=ball(side*4,2.5,4,.22,'#ffdf8d',g);l.material=mat('#ffdf8d',true);moving(l);lamps.push({l,id:r.id});box(side*4,2.8,4,.75,.12,.7,'#315e69',g);
  }
  for(let i=0;i<6;i++){const a=-.3+i*.45;pipe([Math.cos(a)*7.8,-.05,Math.sin(a)*7.8],[Math.cos(a+.3)*7.8,-.05,Math.sin(a+.3)*7.8],.15,r.color,g);}
  // Each region has a different central silhouette, not a shared building skin.
  if(r.id==='A'){
   for(const x of [-5.7,5.7]){box(x,1.5,-3.5,2.5,3,3,'#e4e5d5',g);const roof=mesh(new T.ConeGeometry(2.2,1.4,4),'#2b737c',x,3.7,-3.5,g);roof.rotation.y=Math.PI/4;box(x,1.5,-1.98,1,1.4,.06,'#d8b879',g);cyl(x,4.8,-3.5,.12,1.2,'#c2a770',g);
    for(const side of [-1,1]){box(x+side*.93,1.5,-1.95,.12,2.9,.1,'#849a87',g);box(x+side*.65,2.5,-1.93,.5,.65,.1,'#476f79',g);box(x+side*.65,2.5,-1.86,.04,.65,.04,'#d9bd82',g);}box(x,.9,-1.9,.8,1.8,.12,'#47646a',g);box(x,1.9,-1.9,2.5,.1,.1,'#c6b987',g);box(x,.13,-1.65,1.2,.26,.7,'#c2c4ae',g);colliders.push({min:[r.x+x-1.4,0,r.z-5.1],max:[r.x+x+1.4,6,r.z-1.8]});}
   cyl(0,.3,-2,3.5,.6,'#d5daca',g);ring(0,3.6,-2,2.2,'#b9a16a',g);heart(0,3.5,-2,1.4,g);for(const x of [-2.5,2.5])parts.A['pump'+x]=pump(x,1.5,-2,g);
   for(let i=0;i<3;i++)gauge(-1.6+i*1.6,1.25,.4,g);
   for(let i=0;i<5;i++)box(-4+i*2,.04,4.5,1.7,.08,1.2,'#cbd7c5',g);
   text('CO = HR × SV    MAP ≈ CO × SVR',0,6.4,-2,g,.9);
  }
  if(r.id==='B'){
   cyl(0,.6,-2,3.6,1.2,'#944c5c',g);for(const [x,y,rr] of [[-2,3,1.4],[1.4,4.5,2],[-.5,6.7,.8]])gear(x,y,-2,rr,'#cbae75',g);
   pipe([-3,1,-2],[-3,7,-2],.2,'#e5d6ba',g);pipe([3,1,-2],[3,7,-2],.2,'#e5d6ba',g);
   const sa=ball(-.5,6.7,-1.6,.24,'#98f6c9',g);sa.material=mat('#98f6c9',true);moving(sa);parts.B.sa=sa;
   const av=ball(-2,3,-1.6,.24,'#f8df8c',g);av.material=mat('#f8df8c',true);moving(av);parts.B.av=av;
   text('SA • 窦房结    AV • 房室结',0,8.4,-2,g,.85);
  }
  if(r.id==='C'){
   for(const x of [-3,3]){cyl(x,3,-2,.5,6,'#ead5a0',g);const cap=ball(x,6,-2,.8,'#c7a16b',g);cap.scale.y=.5;}
   pipe([-3,6,-2],[3,6,-2],.23,'#bf985e',g);heart(0,3.7,-3,1.3,g);
   for(const [i,c] of [[0,'#7cd5d4'],[1,'#e9b66c']]){box(-2+i*4,1.2,0,1,2.4,.8,'#244e68',g);const bar=moving(box(-2+i*4,1.2,.46,.65,2.2,.08,c,g));parts.C[i?'demand':'supply']=bar;}
   for(let i=0;i<14;i++){const a=i*Math.PI/7;const arch=ring(0,2,-2,3.1+i%2*.15,'#e5d4a7',g);arch.rotation.y=a;}
   text('O₂ SUPPLY      O₂ DEMAND',0,7.8,-2,g,.8);
  }
  if(r.id==='D'){
   for(let i=0;i<4;i++){const z=-4+i*1.2;const tube=cyl(0,2.3,z,1.5,5.7,i%2?'#aeb9dd':'#626eac',g,24);tube.rotation.z=Math.PI/2;moving(tube);parts.D.tubes ||= [];parts.D.tubes.push(tube);for(const side of [-1,1]){const collar=ring(side*2.8,2.3,z,1.6,'#cdb780',g);collar.rotation.y=Math.PI/2;}}
   gauge(0,3.2,0,g);gear(-3.5,2.5,-2,1,'#dbc18a',g);text('SVR   ↔   CO   ↔   MAP',0,5.3,-2,g,.9);
  }
  if(r.id==='E'){
   for(const x of [-2,2]){parts.E['pump'+x]=pump(x,2.2,-2,g);pipe([x,1,-2],[x,1,1],.35,'#b8a271',g);}
   box(0,.5,-2,6,1,5,'#557781',g);for(const x of [-3.4,3.4]){cyl(x,3.5,-3.4,.18,7,'#dec99a',g);box(x,7,-3.4,1,.25,1,'#627d82',g);}
   heart(0,5,-2,1.2,g);gear(0,2.3,.6,1.1,'#c9a16c',g);text('CHRONIC ≠ ACUTE',0,8.2,-2,g,.85);
  }
  if(r.id==='F'){
   for(let i=0;i<4;i++){const x=-3+i*2;const tower=cyl(x,1.4+i*.5,-2,.6,2.8+i,'#d6e5dd',g);const top=ball(x,2.8+i,-2,.65,i%2?'#b1b6e1':'#5fd5bf',g);top.scale.y=.4;if(i<3)pipe([x,2.2+i*.4,-2],[x+2,2.6+i*.4,-2],.14,'#c9ad71',g);tower.material=mat(i%2?'#c6d3e6':'#d6e5dd');}
   const water=moving(cyl(0,.55,1,2.7,.65,'#55b9bf',g,32));parts.F.water=water;ring(0,.9,1,2.8,'#dfd8b0',g).rotation.x=Math.PI/2;
   text('RENIN → ACE → AT1 → ALDO',0,7.3,-2,g,.85);
  }
  if(r.id==='G'){
   for(let i=0;i<7;i++){const x=-3+i;const rock=mesh(new T.OctahedronGeometry(.8+i%3*.2),'#785979',x,1,-2+Math.sin(i)*1.2,g);rock.rotation.z=i;}
   const fibrin=new T.Group();g.add(fibrin);for(let i=0;i<12;i++){const a=i*Math.PI/6;pipe([Math.cos(a)*3,1,-2+Math.sin(a)*2],[Math.cos(a+2)*3,4,-2+Math.sin(a+2)*2],.06,'#e8bdad',fibrin);}moving(fibrin);parts.G.fibrin=fibrin;
   parts.G.platelets=[];for(let i=0;i<8;i++){const p=moving(ball(Math.cos(i)*2,2+Math.sin(i),-1.5+Math.sin(i)*1.2,.26,'#df9b8d',g));parts.G.platelets.push(p);}
   text('PLATELETS   •   FIBRIN   •   LYSIS',0,6,-2,g,.85);
  }
  if(r.id==='H'){
   box(0,1.25,-2,7,2.5,5,'#575073',g);heart(0,5,-2,2.2,g);
   for(let i=0;i<3;i++){const o=moving(ring(0,5,-2,3.1+i*.4,i%2?'#b2e7da':'#d9bb86',g));o.rotation.y=i*.7;parts.H.rings ||= [];parts.H.rings.push(o);}
   for(const x of [-3.8,3.8]){cyl(x,3,-2,.2,6,'#d5c399',g);ball(x,6.2,-2,.4,'#c29ada',g);}
   parts.H.lift=moving(box(0,.02,4.5,3,.2,2.5,'#dbc79a',g));text('THE INVERTED PULSE',0,10,-2,g,.9);
  }
  colliders.push({id:r.id,min:[r.x-3.8,0,r.z-5.4],max:[r.x+3.8,20,r.z+.4]});
  // Docks, small lamps and residential details keep the islands inhabited.
  for(let j=0;j<6;j++)box(5.6,.05,4+j*.45,2,.16,.38,'#c8af7c',g);
  box(6.4,.85,5.5,.1,1.7,.1,'#c3aa75',g);const pennant=box(6.1,1.5,5.5,.65,.45,.06,r.color,g);pennant.rotation.y=.25;
  text(r.id+' / '+r.name,0,.65,5.1,g,.65);
  for(let i=0;i<5;i++){const a=-2.9+i*.3;const rock=mesh(new T.DodecahedronGeometry(.5+i%2*.35,0),'#769b94',Math.cos(a)*7.3,-1.7-i%2,Math.sin(a)*7.3,g);rock.scale.y=1.5;}
  // Spatial batches retain island-level frustum culling instead of drawing the entire map.
  batchStatic(g,dynamic);g.traverse(o=>{if(o.isMesh)dynamic.add(o);});
 }
 // Instance distant clouds and wind-carved rocks; keep the main scene opaque.
 const clouds=new T.InstancedMesh(new T.SphereGeometry(1,10,7),mat('#d9e9de'),70);
 for(let i=0;i<70;i++){const x=Math.sin(i*41.33)*105,z=Math.cos(i*28.17)*105-12;matrix.compose(new T.Vector3(x,-4.5+(i%3)*.3,z),new T.Quaternion(),new T.Vector3(3+i%4,.55,1.7+i%3));clouds.setMatrixAt(i,matrix);}root.add(clouds);dynamic.add(clouds);
 const sparks=new T.InstancedMesh(new T.SphereGeometry(.07,5,4),mat('#d8f2c2',true),65);root.add(sparks);dynamic.add(sparks);
 const boat=new T.Group();root.add(boat);const hull=ball(0,-.45,0,1,'#315569',boat);hull.scale.set(1.05,.65,2);box(0,0,0,1.8,.18,3,'#d8bb7e',boat);for(const x of [-1,1])pipe([x,0,-1.1],[x,0,1.1],.09,'#eadbb6',boat);cyl(0,1,0,.07,2,'#dfc58e',boat);const sail=box(.5,1.4,0,1,1.1,.05,'#e9eee0',boat);sail.rotation.y=.25;gear(0,.45,-1.4,.45,'#d6b879',boat);moving(boat);const dp=dockPosition('A');boat.position.set(dp.x+2,dp.y-.6,dp.z+2);
 const excluded=new Set(dynamic);batchStatic(root,excluded);
 const definition={id:'pulse',bounds,colliders,npcs:regions.map(r=>({id:'resident-'+r.id,position:[r.x-4.5,r.h,r.z+2.5]})),props:[],spawn:{x:0,z:32.5},camera:{position:[17,23,55],target:[0,0,29],size:28},walkable:(x,z)=>walkable(x,z,state),heightAt};
 const rendered=new T.Vector3(),boatTarget=new T.Vector3();let syncStart=null;
 function update(t,sim=state.model,completed=state.complete){
  state.model=sim;state.complete=completed;
  const s=sim,pulse=Math.sin(t*4.8*s.heartRate),repaired=completed.includes('H');
  if(repaired&&syncStart===null)syncStart=t;
  hearts.forEach(({g},i)=>{const beat=repaired?pulse:Math.sin(t*4.8*s.heartRate*(1+i*.04)+i*1.7);g.scale.setScalar(1+beat*.055*s.contractility);});
  gears.forEach((g,i)=>{if(g.parent===boat)g.rotation.z=t*3;else g.rotation.z=t*(i%2?-1:1)*s.conductionState.naSpeed*(i<3?s.conductionState.avSpeed:1)*.65;});
  gauges.forEach((g,i)=>g.rotation.z=(1-(i%3===0?s.heartRate:i%3===1?s.meanArterialPressure:s.cardiacOutput))*1.1);
  for(const id of ['A','E'])for(const key of Object.keys(parts[id]))if(key.startsWith('pump'))parts[id][key].position.y=(id==='A'?3.6:4.3)+pulse*.3*s.contractility;
  parts.B.sa.scale.setScalar(1+Math.max(0,pulse)*.5);parts.B.av.scale.setScalar(1+Math.max(0,Math.sin(t*4.8*s.heartRate-.6/s.conductionState.avSpeed))*.5);
  parts.C.supply.scale.y=Math.min(1.6,s.oxygenSupply);parts.C.demand.scale.y=Math.min(1.6,s.oxygenDemand);
  parts.D.tubes.forEach(tube=>{tube.scale.x=tube.scale.z=Math.max(.6,1.4-s.vascularResistance*.35);});
  parts.F.water.scale.y=s.bloodVolume;parts.F.water.position.y=.5+(s.bloodVolume-1)*.3;
  parts.G.fibrin.scale.setScalar(Math.max(.4,Math.min(1.3,s.clotFormation/(1+s.clotClearance))));parts.G.platelets.forEach((p,i)=>{p.scale.setScalar(.6+s.plateletActivity*.4);p.position.y=2+Math.sin(t*s.coagulation+i)*.4;});
  parts.H.rings.forEach((r,i)=>{r.rotation.z=t*.18*(i+1);r.rotation.y=Math.sin(t*.2+i)*.6;});
  parts.gate.position.y=heightAt(.5,-38)+(completed.includes('E')?-3:0);
  flow.forEach(({mesh,i})=>{mesh.visible=Math.sin(t*3*Math.min(2,s.cardiacOutput)-i*.9)>(repaired?-.7:-.1);});
  lamps.forEach(({l,id})=>{const synchronized=repaired&&t-syncStart>regions.findIndex(r=>r.id===id)*.3;l.material=mat(synchronized?'#fff2ae':completed.includes(id)?'#ffe3a1':'#a8dec8',true);l.scale.setScalar(synchronized?1.25+pulse*.1:1);});
  const pos=sea.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(seaBase[i*3]*.08+t*.5)*.22+Math.cos(seaBase[i*3+1]*.1+t*.3)*.15);pos.needsUpdate=true;
  for(let i=0;i<65;i++){const r=regions[i%8];matrix.makeTranslation(r.x+Math.sin(t*.2+i*3.2)*6, r.h+1+(t*.22+i*.17)%5, r.z+Math.cos(t*.3+i*1.8)*6);sparks.setMatrixAt(i,matrix);}sparks.instanceMatrix.needsUpdate=true;
  if(!state.traveling){const d=dockPosition(state.dock||'A');boatTarget.set(d.x+2,d.y-.6+Math.sin(t*1.4)*.07,d.z+2);boat.position.lerp(boatTarget,.12);boat.rotation.z=Math.sin(t)*.025;}
  if(rendered.distanceTo(boat.position)>0.01)rendered.copy(boat.position);
 }
 function setTransit(frame){state.traveling=frame.mode!=='idle';if(frame.boat){const target=new T.Vector3(frame.boat.x,frame.boat.y,frame.boat.z);const dir=target.clone().sub(boat.position);if(dir.length()>.01)boat.rotation.y=Math.atan2(dir.x,dir.z);boat.position.copy(target);}if(frame.lift!==undefined)parts.H.lift.position.y=.02+frame.lift*2.5;}
 function dispose(){const geometries=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(m=>{mats.add(m);if(m.map)textures.add(m.map);});});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 return {root,definition,parts,state,boat,update,setTransit,heightAt,dispose,ecgAt};
}

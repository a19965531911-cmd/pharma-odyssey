import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {regions,links,byId} from './data.js';
import {adrenergic,enzyme,muscle} from './simulation.js';

export function elevation(z){return z<-45?Math.min(2.8,(-45-z)*.2):0;}
export function roadDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
export function walkable(x,z){return regions.some(r=>Math.hypot(x-r.x,z-r.z)<7.7)||links.some(([a,b])=>roadDistance(x,z,byId(a),byId(b))<2.25);}
export function buildCity(){
 const root=new T.Group(),colliders=[],parts={},animated=[],materials=new Map();
 const mat=(color,metalness=.25,opacity=1)=>{const key=[color,metalness,opacity].join();if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness,roughness:.48,transparent:opacity<1,opacity,side:opacity<1?T.DoubleSide:T.FrontSide}));return materials.get(key);};
 const mesh=(geo,color,x,y,z,parent=root,metal=.25,opacity=1)=>{const m=new T.Mesh(geo,mat(color,metal,opacity));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,w,h,d,c,p=root)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
 const cyl=(x,y,z,r,h,c,p=root,n=16)=>mesh(new T.CylinderGeometry(r,r,h,n),c,x,y,z,p);
 const sphere=(x,y,z,r,c,p=root)=>mesh(new T.SphereGeometry(r,16,12),c,x,y,z,p);
 const torus=(x,y,z,r,c,p=root)=>{const m=mesh(new T.TorusGeometry(r,.1,6,32),c,x,y,z,p,.65);return m;};
 const glow=(x,y,z,c,p=root)=>{const m=sphere(x,y,z,.16,c,p);m.material=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2});return m;};
 const text=(label,x,y,z,p=root,size=1.6)=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#143c40';ctx.fillRect(0,0,768,96);ctx.strokeStyle='#d3b776';ctx.lineWidth=5;ctx.strokeRect(3,3,762,90);ctx.font='500 44px Microsoft YaHei';ctx.fillStyle='#f3edca';ctx.textAlign='center';ctx.fillText(label,384,64);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));s.position.set(x,y,z);s.scale.set(size*3.8,size*.48,1);p.add(s);};
 // The sea is geometry; paths and raised terraces are separate physical meshes.
 const sea=mesh(new T.PlaneGeometry(260,260,40,40),'#417f91',0,-1.35,-12);sea.rotation.x=-Math.PI/2;sea.material.roughness=.2;sea.material.metalness=.45;
 for(let i=0;i<55;i++){const x=Math.sin(i*17.19)*70,z=Math.cos(i*5.77)*85;const wave=box(x,-1.26,z,1.2+i%3*.5,.025,.07,'#8dc4ce');animated.push({kind:'wave',mesh:wave,seed:i});}
 for(const [aId,bId] of links){const a=byId(aId),b=byId(bId),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),steps=Math.ceil(len/.75);const angle=Math.atan2(dx,dz);
  for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=a.x+dx*t,z=a.z+dz*t,y=elevation(z);const tile=box(x,y-.15,z,4.7,.3,len/steps+.025,'#b6c7c2');tile.rotation.y=angle;
   for(const side of [-1,1]){const rail=box(x+Math.cos(angle)*2.35*side,y+.43,z-Math.sin(angle)*2.35*side,.12,.14,len/steps+.02,'#526b67');rail.rotation.y=angle;if(i%4===0){box(x+Math.cos(angle)*2.35*side,y+.27,z-Math.sin(angle)*2.35*side,.17,.75,.17,'#b49c62');}}
   const pulse=box(x,y+.025,z,.09,.035,.42,a.x<0||b.x<0?'#78e3c6':'#f4c56d');pulse.rotation.y=angle;animated.push({kind:'pulse',mesh:pulse,seed:i});
  }
  for(let t=.25;t<1;t+=.25){const z=a.z+dz*t;cyl(a.x+dx*t,-1.9,z,.55,3+elevation(z),'#526d70');}
 }
 const windowTransforms=[];
 for(const r of regions){const g=new T.Group();g.position.set(r.x,elevation(r.z),r.z);root.add(g);parts[r.id]={group:g};
  cyl(0,-1.35,0,8,2.3,'#576f75',g,12);cyl(0,-.27,0,8.05,.35,'#d3d6c8',g,32);cyl(0,-.055,0,7.6,.12,'#9eafab',g,32);
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2;box(Math.cos(a)*7.7,.18,Math.sin(a)*7.7,.3,.45,.3,'#c7b57f',g);}
  const buildingZ=-2.6,bodyColor=r.id==='08'?'#4c4665':r.x>0?'#a47e60':'#487d7b';
  const base=box(0,1.5,buildingZ,5.2,3,3.7,bodyColor,g);colliders.push({id:r.id,min:[r.x-2.9,0,r.z-4.75],max:[r.x+2.9,8,r.z-.45]});
  box(0,.12,1,3,.24,2.2,'#e1dcca',g);box(0,.32,-.05,2.5,.22,.55,'#f2e3b8',g);
  for(const x of [-2.5,2.5]){cyl(x,1.6,buildingZ+1.8,.16,3.2,'#c8b57c',g);sphere(x,3.3,buildingZ+1.8,.24,'#dac48a',g);}
  box(0,1.2,buildingZ+1.88,1.1,2.4,.12,'#234b52',g);torus(0,2.3,buildingZ+1.98,.45,'#e3cb89',g);
  for(const x of [-1.65,1.65])for(const y of [1.1,2.25]){const m=new T.Matrix4().compose(new T.Vector3(r.x+x,elevation(r.z)+y,r.z+buildingZ+1.91),new T.Quaternion(),new T.Vector3(.65,.67,.07));windowTransforms.push(m);}
  // Distinct silhouettes and animated apparatus identify each district.
  if(r.id==='00'){base.visible=false;for(let i=0;i<13;i++)box(0,.02,3-i*.43,5,.12,.38,'#ad9a76',g);const hull=mesh(new T.SphereGeometry(1,20,12),'#3f5b65',-4,-.5,3,g);hull.scale.set(1.4,.8,3);box(-4,.15,3,2.1,.2,4.2,'#d0b684',g);cyl(-4,1.7,3,.06,3,'#d5c48d',g);const sail=box(-3.4,1.9,3,1.2,1.6,.06,'#e8e6cf',g);sail.rotation.y=-.25;text('雾舟 · 下一班通往起源岛',0,4,-2,g,1.3);}
  if(r.id==='01'){base.visible=false;const ring=torus(0,1.8,-2,2.4,'#d3ba76',g);parts['01'].ring=ring;for(const x of [-1.6,1.6]){cyl(x,.65,-1.8,.6,1.3,'#356b69',g);glow(x,1.5,-1.8,x<0?'#63f1c9':'#ffd383',g);}text('ACh     M · N   /   NA     α · β',0,4,-2,g,1.4);}
  if(r.id==='02'){const pool=cyl(0,3.1,-2.6,2.6,.22,'#65c6c0',g);pool.material.transparent=true;pool.material.opacity=.8;const wheel=torus(0,4.5,-2.6,1.25,'#d4bc73',g);for(let i=0;i<8;i++){const spoke=box(0,0,0,.09,2.3,.09,'#d4bc73',wheel);spoke.rotation.z=i*Math.PI/4;}parts['02'].wheel=wheel;parts['02'].particles=[];for(let i=0;i<56;i++){const p=glow(0,3.5,-2.6,'#7dffb7',g);p.scale.setScalar(.5);parts['02'].particles.push(p);}}
  if(r.id==='03'||r.id==='07'){const dome=mesh(new T.SphereGeometry(3,24,16,0,Math.PI*2,0,Math.PI/2),r.id==='03'?'#a1dfd5':'#e5e6d0',0,3,-2.6,g,.3,.34);for(let i=0;i<8;i++){const rib=torus(0,3,-2.6,3,'#c9bb8e',g);rib.rotation.y=i*Math.PI/8;rib.scale.y=.9;}dome.castShadow=false;if(r.id==='03'){const eye=sphere(0,4.1,-.1,.9,'#ecede0',g);eye.scale.z=.35;const pupil=sphere(0,4.1,.23,.3,'#173d43',g);pupil.scale.z=.2;parts['03'].pupil=pupil;const lens=torus(0,4.1,.3,.7,'#a5b882',g);parts['03'].lens=lens;parts['03'].glands=[];for(let i=0;i<6;i++)parts['03'].glands.push(glow(-2+i*.8,2.8,-.45,'#9dedcf',g));const gut=torus(-1.4,1.2,-.55,.45,'#e4aa9b',g);parts['03'].gut=gut;parts['03'].heart=sphere(1.4,1.4,-.5,.45,'#df8b86',g);}else{box(0,3.1,.6,3.4,1.7,.18,'#173a42',g);parts['07'].monitor=[];for(let i=0;i<18;i++)parts['07'].monitor.push(box(-1.5+i*.17,3.1,.73,.09,.25,.05,'#83e7bd',g));box(0,4.7,-2.6,.45,1.8,.4,'#dc917e',g);box(0,4.7,-2.6,1.5,.45,.4,'#dc917e',g);}}
  if(r.id==='04'){for(const x of [-1.8,1.8]){cyl(x,4,-2.6,.4,3,'#a3b7b0',g);cyl(x,5.5,-2.6,.6,.25,'#d0ba7c',g);}const arm=new T.Group();arm.position.set(0,3.5,-.5);g.add(arm);box(0,1,0,.6,2,.6,'#d9b477',arm);const elbow=sphere(0,2,0,.5,'#8c9e9d',arm);box(.8,2,0,1.7,.55,.55,'#c7d5cc',arm);parts['04'].arm=arm;elbow.material.metalness=.8;}
  if(r.id==='05'){cyl(0,5,-2.6,1.8,6,'#b48f68',g);mesh(new T.ConeGeometry(2.5,2,8),'#365960',0,9,-2.6,g);const face=cyl(0,6.5,-.75,1.35,.1,'#e9dfb6',g,32);face.rotation.x=Math.PI/2;const hand=box(0,6.5,-.64,.08,1.8,.08,'#344a4e',g);parts['05'].hand=hand;parts['05'].gauges=[];for(let i=0;i<3;i++){const face=cyl(-1.8+i*1.8,2.3,-.6,.65,.15,'#d9d6b7',g,24);face.rotation.x=Math.PI/2;const needle=box(-1.8+i*1.8,2.3,-.45,.06,.9,.07,'#b16f5e',g);parts['05'].gauges.push(needle);}text('心脏    血压    气道',0,3.5,-.4,g,1);}
  if(r.id==='06'){for(let i=0;i<5;i++){const mirror=box(-2+i,3.8,-2.6,.7,2.5,.2,i%2?'#c9d9e3':'#c7acd6',g);mirror.rotation.y=.35;const ray=box(-2+i,1.3,.3,.08,2,.08,'#edce8b',g);ray.rotation.z=.4;parts['06'].rays ||= [];parts['06'].rays.push(ray);}}
  if(r.id==='08'){const crystal=mesh(new T.OctahedronGeometry(1.7,0),'#b99cdd',0,4.8,-2.6,g,.65);parts['08'].crystal=crystal;for(let i=0;i<3;i++){const ring=torus(0,4.8,-2.6,2.2+i*.3,'#a5b4c7',g);ring.rotation.x=i*.8;animated.push({kind:'ring',mesh:ring,seed:i});}}
  // Street furniture, copper pipes, planters and arcaded residential wings.
  for(const side of [-1,1]){const x=side*5.3;for(let j=0;j<2;j++){box(x,1.1,-2-j*2,1.7,2.2,1.6,'#7d9392',g);mesh(new T.ConeGeometry(1.4,1.1,4),'#49606a',x,2.75,-2-j*2,g).rotation.y=Math.PI/4;}box(side*5.4,.35,2.2,1.8,.6,1.2,'#c5bd9f',g);for(let i=0;i<4;i++)sphere(side*5.4+(i%2)*.4-.2,.85,2+(i>>1)*.35,.4,'#7baf91',g);cyl(side*3.9,1.3,3,.08,2.6,'#bbab79',g);glow(side*3.9,2.7,3,'#ffe2a1',g);box(side*3.9,2.5,3,.45,.08,.45,'#485f5a',g);}
  const pipe=torus(3.1,1.1,-2.6,1.1,'#c39a68',g);pipe.rotation.y=Math.PI/2;
  text(r.id+'  '+r.name,0,Math.max(r.id==='05'?10.6:7.1,5),-2.6,g,1.15);
  const beacon=cyl(0,.3,3,.6,.12,r.color,g,32);parts[r.id].beacon=beacon;
 }
 const windows=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'#ffdf95',emissive:'#e2b55c',emissiveIntensity:.45}),windowTransforms.length);windowTransforms.forEach((m,i)=>windows.setMatrixAt(i,m));root.add(windows);
 // Low-cost distant rocks give the unframed city a readable coastline.
 for(let i=0;i<28;i++){const x=Math.sin(i*18.3)*45,z=Math.cos(i*7.31)*65;if(!walkable(x,z)){const rock=mesh(new T.DodecahedronGeometry(1.4+i%3),'#71959c',x,-1.5,z);rock.scale.y=.6;}}
 const definition={id:'nerve',bounds:{min:[-34,-5,-69],max:[35,20,38]},colliders,npcs:[{id:'lan',position:[-2,0,29]}],props:[],spawn:{x:0,z:31},camera:{position:[16,22,49],target:[0,0,28],size:26},walkable};
 let modeAt=0,lastMode='';
 function update(t,sim={},completed=[]){
  const e=enzyme(sim['02']);parts['02'].wheel.rotation.z=t*e.activity;
  parts['02'].particles.forEach((p,i)=>{p.visible=i<e.ach;const a=i*2.4+t*.8;p.position.set(Math.cos(a)*(1+i%3*.5),3.5+Math.sin(t+i)*.35,-2.6+Math.sin(a)*(1+i%3*.5));});
  const drug=sim['03']||'baseline',blocked=drug!=='baseline',eyeScale=drug==='anisodamine'?1.3:blocked?2:1;parts['03'].pupil.scale.set(eyeScale,eyeScale,.2);parts['03'].lens.rotation.z=blocked?0:Math.sin(t)*.1;parts['03'].gut.scale.setScalar(1+Math.sin(t*(blocked?1:4))*(blocked?.025:.16));parts['03'].heart.scale.setScalar(1+Math.sin(t*(blocked?9:6))*.09);parts['03'].glands.forEach((p,i)=>{p.visible=!blocked||i<1;p.position.y=2.6+Math.sin(t*2+i)*.2;});
  if(lastMode!==sim['04']){modeAt=t;lastMode=sim['04'];}parts['04'].arm.rotation.z=muscle(sim['04'],t-modeAt);
  const a=adrenergic(sim['05']||'epinephrine','none',sim.strength||1);parts['05'].hand.rotation.z=-t*.1;parts['05'].gauges.forEach((g,i)=>g.rotation.z=-(i===0?(a.hr-50)/60:i===1?(a.sbp-90)/65:a.airway-1)*1.4);
  const b=adrenergic('epinephrine',sim['06']==='alpha'?'alpha':sim['06']||'none');parts['06'].rays.forEach((r,i)=>{r.rotation.z=(b.map<90?-.6:.6)+Math.sin(t+i)*.05;r.material.color.set(b.map<90?'#7bddc9':'#efbc79');});
  parts['07'].monitor.forEach((m,i)=>m.scale.y=.3+Math.abs(Math.sin(t*3-i*.7))*((sim['07']==='adB'||sim['07']==='pamA')?1:2.5));
  parts['01'].ring.rotation.y=t*.2;parts['08'].crystal.rotation.y=t*.25;parts['08'].crystal.position.y=4.8+Math.sin(t)*.2;
  for(const r of regions)parts[r.id].beacon.material.color.set(completed.includes(r.id)?'#e8e6a0':r.color);
  for(const a of animated){if(a.kind==='ring')a.mesh.rotation.z=t*.15*(a.seed+1);else if(a.kind==='wave')a.mesh.position.y=-1.26+Math.sin(t+a.seed)*.03;else a.mesh.visible=Math.sin(t*2-a.seed*.5)>.1;}
 }
 // Merge static geometry by material; leave the apparatus and sprites independently animated.
 const dynamic=new Set();
 const preserve=value=>{if(value?.isObject3D)value.traverse(o=>dynamic.add(o));else if(Array.isArray(value))value.forEach(preserve);};
 Object.values(parts).forEach(part=>Object.entries(part).forEach(([key,value])=>{if(key!=='group')preserve(value);}));
 animated.forEach(a=>preserve(a.mesh));
 root.updateMatrixWorld(true);
 const batches=new Map(),remove=[];
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||dynamic.has(o)||!o.visible)return;const key=o.material.uuid;const batch=batches.get(key)||{material:o.material,geometries:[]};const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);batch.geometries.push(geo);batches.set(key,batch);remove.push(o);});
 remove.forEach(o=>o.removeFromParent());
 for(const batch of batches.values()){const geo=mergeGeometries(batch.geometries,false);if(geo){const merged=new T.Mesh(geo,batch.material);merged.castShadow=true;merged.receiveShadow=true;root.add(merged);}batch.geometries.forEach(g=>g.dispose());}
 return {root,definition,update,parts};
}

import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import data from './scene-data.json';
import {createNavigator} from './navigation.js';
import {buildCity,elevation} from '../world02/city.js';

type Anchor={id:string;position:number[];type?:string;label?:string;destination?:string};
export class World {
 canvas:HTMLCanvasElement;renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera:THREE.OrthographicCamera;
 root=new THREE.Group();characters=new THREE.Group();player:THREE.Object3D;nav:any;definition:any;anchors:Anchor[]=[];labels:HTMLButtonElement[]=[];
 path:{x:number,z:number}[]=[];pending:Anchor|null=null;keys=new Set<string>();models=new Map<string,THREE.Object3D>();actors:any[]=[];last=0;time=0;paused=true;loading=false;
 onInteract:(a:Anchor)=>void=()=>{};onPosition:(p:any)=>void=()=>{};onReady:()=>void=()=>{};nearest:Anchor|null=null;
 frameTimes:number[]=[];metrics={drawCalls:0,triangles:0,sceneLoadMs:0,frames:0};loader=new GLTFLoader();
 city:any=null;cityState:any={};zoom=26;
 constructor(canvas:HTMLCanvasElement){
 this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
 this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 this.scene.background=new THREE.Color('#a6c1bd');this.scene.fog=new THREE.FogExp2('#9db8b3',.012);
 this.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,150);this.scene.add(this.root,this.characters);
 const hemi=new THREE.HemisphereLight('#e1f5f1','#5e5b4c',2.5);this.scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe5be',3.5);sun.position.set(-6,17,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:60});sun.shadow.normalBias=.04;this.scene.add(sun);
 const fill=new THREE.DirectionalLight('#b7dcf1',1.5);fill.position.set(10,8,-5);this.scene.add(fill);
 this.canvas.addEventListener('pointerdown',e=>this.clickGround(e));
 this.canvas.addEventListener('wheel',e=>{if(!this.city)return;e.preventDefault();this.zoom=Math.max(18,Math.min(52,this.zoom+e.deltaY*.025));this.resize();},{passive:false});
 window.addEventListener('resize',()=>this.resize());window.addEventListener('blur',()=>this.keys.clear());
 window.addEventListener('keydown',e=>{if(this.paused||this.loading||this.isTextInput(e.target))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(e.key.toLowerCase())){e.preventDefault();this.keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat&&this.nearest)this.onInteract(this.nearest);}});
 window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
 requestAnimationFrame(t=>this.loop(t));
 }
 isTextInput(target:any){return target?.matches?.('input,textarea,select');}
 async model(path:string){if(!this.models.has(path)){const gltf=await this.loader.loadAsync('/'+path);gltf.scene.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.models.set(path,gltf.scene);}return clone(this.models.get(path)!);}
 async load(id:string,position?:any,avatar?:any){
 if(this.loading)return;this.loading=true;const start=performance.now();this.path=[];this.pending=null;this.keys.clear();
 this.city=id==='nerve'?buildCity():null;
 this.definition=this.city?this.city.definition:data.scenes.find(s=>s.id===id)||data.scenes[0];const def=this.definition;this.canvas.dataset.scene=id;
 this.renderer.toneMappingExposure=id==='hall'?.58:1.3;
 this.canvas.style.filter=id==='hall'?'brightness(.64) contrast(1.2) saturate(1.04)':'none';
 document.getElementById('loading')!.classList.remove('hidden');
 try{
 const [map,player]=await Promise.all([this.city?Promise.resolve(this.city.root):this.model(def.model),this.model(data.characters.player.model)]);
 this.root.clear();this.characters.clear();this.actors=[];this.tuneSceneMaterials(map,id);this.root.add(map);this.player=player;player.scale.setScalar(.78);this.characters.add(player);this.applyAvatar(avatar);
 const npcColliders=def.npcs.filter(n=>n.id!=='lumi').map(n=>({id:n.id,min:[n.position[0]-.27,0,n.position[2]-.27],max:[n.position[0]+.27,2,n.position[2]+.27]}));
 this.nav=createNavigator({...def,colliders:[...def.colliders,...npcColliders]});
 const pos=position&&typeof position.z==='number'&&!this.nav.blocked(position.x,position.z)?position:def.spawn;
 player.position.set(pos.x,.08+(this.city?elevation(pos.z):0),pos.z);this.path=[];
 for(const n of def.npcs){const actor=await this.model(data.characters[n.id]?.model||data.characters.lan.model);actor.scale.setScalar(n.id==='lumi'?.7:.78);actor.position.fromArray(n.position);actor.rotation.y=.4;this.characters.add(actor);this.actors.push({model:actor,base:actor.position.clone(),id:n.id});}
 const cam=def.camera;this.camera.position.fromArray(cam.position);this.camera.lookAt(new THREE.Vector3().fromArray(cam.target));if(this.city){this.camera.position.copy(player.position).add(new THREE.Vector3(17,23,23));this.camera.lookAt(player.position);this.scene.background=new THREE.Color('#9fc6cf');this.scene.fog=new THREE.FogExp2('#a8cbd0',.009);}this.resize();
 this.metrics.sceneLoadMs=performance.now()-start;this.onPosition(this.position);this.onReady();
 }finally{this.loading=false;document.getElementById('loading')!.classList.add('hidden');}
 }
 tuneSceneMaterials(map:THREE.Object3D,id:string){
  if(id!=='hall')return;
  map.traverse((o:any)=>{
   if(!o.isMesh||!o.material)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const m of mats){
    if(m.color)m.color.multiplyScalar(.62);
    if(m.emissive){m.emissiveIntensity=Math.min(m.emissiveIntensity||0,.12);m.emissive.multiplyScalar(.35);}
    if('roughness' in m)m.roughness=Math.max(m.roughness||0,.58);
   }
  });
 }
 applyAvatar(avatar:any){if(!this.player||!avatar)return;this.player.traverse((o:any)=>{if(!o.isMesh)return;let mats=Array.isArray(o.material)?o.material:[o.material];mats=mats.map((m:any)=>{const copy=m.clone();if(m.name.includes('Coat'))copy.color.set(avatar.coat||'#456d6c');if(m.name.includes('Hair'))copy.color.set(avatar.hairColor||'#453a33');if(m.name.includes('Accessory')){copy.color.set('#d3b56a');o.visible=avatar.accessory!=='none';}return copy;});o.material=Array.isArray(o.material)?mats:mats[0];if(/hair/i.test(o.name)&&avatar.hair==='short')o.scale.y=.7;});}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight,aspect=w/h;const size=this.city?this.zoom:this.definition?.camera?.size||17;const visible=Math.max(size,26/aspect);this.camera.left=-visible*aspect/2;this.camera.right=visible*aspect/2;this.camera.top=visible/2;this.camera.bottom=-visible/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 setAnchors(anchors:Anchor[]){this.anchors=anchors;const root=document.getElementById('world-labels')!;root.replaceChildren();this.labels=anchors.map(a=>{const el=document.createElement('button');el.className='world-anchor '+a.type;el.dataset.anchor=a.id;el.title=a.label||a.id;el.innerHTML=`<span class="anchor-symbol">${a.type==='portal'?'↗':a.type==='npc'?'◌':'✦'}</span><span class="anchor-name">${a.label||a.id}</span>`;el.onclick=()=>this.approach(a);root.append(el);return el;});}
 approach(a:Anchor){if(this.paused||this.loading)return;const target={x:a.position[0],z:a.position[2]};if(this.distance(a)<1.7){this.onInteract(a);return}this.pending=a;this.path=this.nav.find(this.position,target).slice(1);if(!this.path.length)this.pending=null;}
 distance(a:Anchor){return Math.hypot(a.position[0]-this.player.position.x,a.position[2]-this.player.position.z);}
 clickGround(e:PointerEvent){if(this.paused||this.loading||!this.player)return;const rect=this.canvas.getBoundingClientRect();const mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.camera);const hit=new THREE.Vector3();if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.08),hit)){this.pending=null;this.path=this.nav.find(this.position,hit).slice(1);}}
 get position(){return this.player?{x:this.player.position.x,y:this.player.position.y,z:this.player.position.z}:{x:0,y:.08,z:4};}
 get screenPosition(){const p=this.player.position.clone().project(this.camera);return {x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2};}
 loop(t:number){const dt=Math.min((t-this.last)/1000,.05);this.last=t;this.time=t/1000;if(!document.hidden){this.frameTimes.push(dt*1000);if(this.frameTimes.length>600)this.frameTimes.shift();}
 let walking=false;
 if(this.player&&!this.paused&&!this.loading){
 let dx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),dz=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));
 if(dx||dz){this.path=[];this.pending=null;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);const forward=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right);const v=right.multiplyScalar(dx).add(forward.multiplyScalar(-dz)).normalize();dx=v.x;dz=v.z;}else if(this.path.length){const p=this.path[0];dx=p.x-this.player.position.x;dz=p.z-this.player.position.z;const len=Math.hypot(dx,dz);if(len<(this.city?.025:.1)){this.path.shift();dx=0;dz=0;}else{dx/=len;dz/=len;}}
 if(dx||dz){const step=this.path.length?Math.min(dt*(this.city?6:3.2),Math.hypot(this.path[0].x-this.player.position.x,this.path[0].z-this.player.position.z)):dt*(this.city?6:3.2);const next=this.nav.moveSliding(this.position,dx*step,dz*step);walking=Math.hypot(next.x-this.player.position.x,next.z-this.player.position.z)>.001;this.player.position.x=next.x;this.player.position.z=next.z;if(this.city)this.player.position.y=.08+elevation(next.z);this.player.rotation.y=Math.atan2(dx,dz);this.onPosition(this.position);}
 if(this.pending&&this.distance(this.pending)<1.7){const a=this.pending;this.pending=null;this.path=[];this.onInteract(a);}
 this.nearest=this.anchors.filter(a=>this.distance(a)<1.8).sort((a,b)=>this.distance(a)-this.distance(b))[0]||null;
 }
 if(this.player)this.animateActor(this.player,walking,this.time);
 if(this.city&&this.player){const target=this.player.position.clone();this.camera.position.lerp(target.clone().add(new THREE.Vector3(17,23,23)),1-Math.exp(-dt*5));this.camera.lookAt(this.camera.position.clone().sub(new THREE.Vector3(17,23,23)));this.city.update(this.time,this.cityState.sim,this.cityState.complete);}
 for(const a of this.actors){if(a.id==='lumi')a.model.position.y=a.base.y+Math.sin(this.time*2)*.11;this.animateActor(a.model,false,this.time);}
 this.projectLabels();this.renderer.render(this.scene,this.camera);this.metrics.drawCalls=this.renderer.info.render.calls;this.metrics.triangles=this.renderer.info.render.triangles;this.metrics.frames++;requestAnimationFrame(n=>this.loop(n));
 }
 animateActor(model:THREE.Object3D,walking:boolean,t:number){const swing=walking?Math.sin(t*10)*.5:Math.sin(t*1.5)*.025;for(const [name,sign] of [['pivot_arm_L',1],['pivot_arm_R',-1],['pivot_leg_L',-1],['pivot_leg_R',1]] as const){const obj=model.getObjectByName(name);if(obj)obj.rotation.x=swing*sign;}for(const side of ['L','R']){const wing=model.getObjectByName('pivot_wing_'+side);if(wing)wing.rotation.z=Math.sin(t*3)*.17;}}
 projectLabels(){if(!this.player)return;for(let i=0;i<this.anchors.length;i++){const a=this.anchors[i],el=this.labels[i],near=this.distance(a)<2.2;const v=new THREE.Vector3(a.position[0],(a.type==='npc'?2.2:1.1)+(this.city?elevation(a.position[2]):0),a.position[2]).project(this.camera);el.style.left=(v.x+1)*50+'%';el.style.top=(1-v.y)*50+'%';el.classList.toggle('near',near);el.hidden=v.z>1||v.x < -1||v.x>1||v.y < -1||v.y>1;}
 const prompt=document.getElementById('interaction-prompt');if(prompt){prompt.classList.toggle('visible',!!this.nearest&&!this.paused);prompt.textContent=this.nearest?'E  ·  '+this.nearest.label:'';}}
 performance(){const times=this.frameTimes.filter(n=>n>0).sort((a,b)=>a-b);return {...this.metrics,meanFrameMs:times.reduce((a,b)=>a+b,0)/(times.length||1),p95FrameMs:times[Math.floor(times.length*.95)]||0,renderer:this.renderer.getContext().getParameter(this.renderer.getContext().RENDERER),canvas:[this.canvas.width,this.canvas.height]};}
}

import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
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
 city:any=null;cityState:any={};transit:any=null;onTransitFrame:(frame:any)=>void=()=>{};zoom=26;lighting=new THREE.Group();composer:EffectComposer;ao:SSAOPass;hallFrame:any=null;view=new URLSearchParams(location.search).get('view');
 constructor(canvas:HTMLCanvasElement){
 this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
 this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 this.renderer.info.autoReset=false;
 this.scene.background=new THREE.Color('#a6c1bd');this.scene.fog=new THREE.FogExp2('#9db8b3',.012);
 this.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,150);this.scene.add(this.root,this.characters);
 this.composer=new EffectComposer(this.renderer);this.ao=new SSAOPass(this.scene,this.camera,1,1,16);
 this.ao.kernelRadius=6;this.ao.minDistance=.001;this.ao.maxDistance=.12;
 this.composer.addPass(new RenderPass(this.scene,this.camera));this.composer.addPass(this.ao);this.composer.addPass(new OutputPass());
 this.scene.add(this.lighting);
 this.canvas.addEventListener('pointerdown',e=>this.clickGround(e));
 this.canvas.addEventListener('wheel',e=>{if(!this.city)return;e.preventDefault();this.zoom=Math.max(18,Math.min(52,this.zoom+e.deltaY*.025));this.resize();},{passive:false});
 window.addEventListener('resize',()=>this.resize());window.addEventListener('blur',()=>this.keys.clear());
 window.addEventListener('keydown',e=>{if(this.paused||this.loading||this.isTextInput(e.target))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(e.key.toLowerCase())){e.preventDefault();this.keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat&&this.nearest)this.onInteract(this.nearest);}});
 window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
 requestAnimationFrame(t=>this.loop(t));
 }
 isTextInput(target:any){return target?.matches?.('input,textarea,select');}
 async model(path:string){if(!this.models.has(path)){const gltf=await this.loader.loadAsync(path.startsWith('/')||path.startsWith('http')?path:'/'+path);gltf.scene.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.models.set(path,gltf.scene);}return clone(this.models.get(path)!);}
 async load(id:string,position?:any,avatar?:any){
 if(this.loading)return;this.loading=true;const start=performance.now();this.path=[];this.pending=null;this.keys.clear();
 const previousCity=this.city;this.transit=null;
 this.city=id==='nerve'?buildCity():id==='pulse'?(await import('../world03/scene.js')).buildArchipelago():null;
 this.definition=this.city?this.city.definition:data.scenes.find(s=>s.id===id)||data.scenes[0];const def=this.definition;this.canvas.dataset.scene=id;
 this.configureLighting(id);
 document.getElementById('loading')!.classList.remove('hidden');
 try{
 const mapPath=id==='hall'&&this.view==='before'?new URL('../../art/backups/v04-before/hall.glb',import.meta.url).href:def.model;
 const [map,player]=await Promise.all([this.city?Promise.resolve(this.city.root):this.model(mapPath),this.model(data.characters.player.model)]);
 if(id==='hall'&&this.view==='albedo')map.traverse((o:any)=>{if(o.isMesh){const basic=(m:any)=>new THREE.MeshBasicMaterial({color:m.color,map:m.map,side:m.side});o.material=Array.isArray(o.material)?o.material.map(basic):basic(o.material);}});
 this.scene.overrideMaterial=this.view==='normals'?new THREE.MeshNormalMaterial():null;
 this.root.clear();previousCity?.dispose?.();this.characters.clear();this.actors=[];this.root.add(map);this.player=player;player.scale.setScalar(id==='hall'?1:.78);this.characters.add(player);this.applyAvatar(avatar);
 const npcColliders=def.npcs.filter(n=>n.id!=='lumi').map(n=>({id:n.id,min:[n.position[0]-.27,0,n.position[2]-.27],max:[n.position[0]+.27,2,n.position[2]+.27]}));
 this.nav=createNavigator({...def,colliders:[...def.colliders,...npcColliders]});
 const pos=position&&typeof position.z==='number'&&!this.nav.blocked(position.x,position.z)?position:def.spawn;
 player.position.set(pos.x,.08+this.surface(pos.x,pos.z),pos.z);this.path=[];
 for(const n of def.npcs){const actor=await this.model(data.characters[n.id]?.model||data.characters.lan.model);actor.scale.setScalar(n.id==='lumi'?.7:id==='hall'?1:.78);actor.position.fromArray(n.position);actor.rotation.y=.4;this.characters.add(actor);this.actors.push({model:actor,base:actor.position.clone(),id:n.id});}
 const cam=def.camera;this.camera.position.fromArray(id==='hall'?[11,15,18]:cam.position);this.camera.lookAt(new THREE.Vector3().fromArray(id==='hall'?[0,1.7,-.6]:cam.target));if(this.city){this.camera.position.copy(player.position).add(new THREE.Vector3(17,23,23));this.camera.lookAt(player.position);this.scene.background=new THREE.Color('#9fc6cf');this.scene.fog=new THREE.FogExp2('#a8cbd0',.009);}this.resize();
 if(id==='pulse'){this.zoom=28;this.scene.background=new THREE.Color('#b3dcd8');this.scene.fog=new THREE.FogExp2('#b3dcd8',.006);this.renderer.shadowMap.enabled=false;this.renderer.toneMappingExposure=1.08;this.resize();}else this.renderer.shadowMap.enabled=true;
 this.metrics.sceneLoadMs=performance.now()-start;this.frameTimes=[];this.onPosition(this.position);this.onReady();
 }finally{this.loading=false;document.getElementById('loading')!.classList.add('hidden');}
 }
 surface(x:number,z:number){return this.city?(this.city.heightAt?this.city.heightAt(x,z):elevation(z)):0;}
 rebuildNavigation(){if(this.definition)this.nav=createNavigator({...this.definition,colliders:[...this.definition.colliders,...this.definition.npcs.filter(n=>n.id!=='lumi').map(n=>({min:[n.position[0]-.27,0,n.position[2]-.27],max:[n.position[0]+.27,2,n.position[2]+.27]}))]});}
 configureLighting(id:string){
  this.lighting.clear();const hall=id==='hall'&&this.view!=='before';
  this.renderer.toneMappingExposure=hall?1:1.3;
  this.scene.background=new THREE.Color(hall?'#344b4d':'#a6c1bd');
  this.scene.fog=hall?null:new THREE.FogExp2('#9db8b3',.012);
  this.lighting.add(new THREE.HemisphereLight('#c6e3ed','#5c4b35',hall?.8:2.5));
  const sun=new THREE.DirectionalLight('#ffe0ae',hall?2.2:3.5);
  sun.position.set(-5,12,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.1,far:55});
  sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;this.lighting.add(sun);
  const fill=new THREE.DirectionalLight('#b0dbef',hall?1:1.5);fill.position.set(0,8,-8);this.lighting.add(fill);
  if(hall){
   for(const [x,y,z] of [[-4.5,2.11,1.2],[3.2,2.11,-2.65],[-3.7,2.08,4.4],[-7,4.05,-4.4],[-2.5,4.05,-4.4],[2.5,4.05,-4.4],[7,4.05,-4.4]]){
    const lamp=new THREE.PointLight('#ffbc70',12,5,2);lamp.position.set(x,y,z);this.lighting.add(lamp);
   }
  }
 }
 applyAvatar(avatar:any){if(!this.player||!avatar)return;this.player.traverse((o:any)=>{if(!o.isMesh)return;let mats=Array.isArray(o.material)?o.material:[o.material];mats=mats.map((m:any)=>{const copy=m.clone();if(m.name.includes('Coat'))copy.color.set(avatar.coat||'#456d6c');if(m.name.includes('Hair'))copy.color.set(avatar.hairColor||'#453a33');if(m.name.includes('Accessory')){copy.color.set('#d3b56a');o.visible=avatar.accessory!=='none';}return copy;});o.material=Array.isArray(o.material)?mats:mats[0];if(/hair/i.test(o.name)&&avatar.hair==='short')o.scale.y=.7;});}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight,aspect=w/h;const size=this.city?this.zoom:this.definition?.camera?.size||17;let visible=Math.max(size,26/aspect);
 if(this.definition?.id==='hall'&&['reference','before'].includes(this.view||'')){
  this.camera.position.set(11,15,18);this.camera.lookAt(0,1.6,-.6);this.hallFrame=null;visible=22/aspect;
 }else if(this.definition?.id==='hall'&&this.root.children.length){
  this.camera.position.set(11,15,18);this.camera.lookAt(0,1.7,-.6);this.camera.updateMatrixWorld();this.root.updateMatrixWorld(true);
  const extent=new THREE.Box2();const point=new THREE.Vector3();
  this.root.traverse((object:any)=>{if(!object.isMesh)return;const vertices=object.geometry.getAttribute('position');for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld).applyMatrix4(this.camera.matrixWorldInverse);extent.expandByPoint(new THREE.Vector2(point.x,point.y));}});
  const span=extent.getSize(new THREE.Vector2()),center=extent.getCenter(new THREE.Vector2());
  visible=Math.max(span.y/.88,span.x/(aspect*.92));
  const shift=new THREE.Vector3(center.x,center.y+visible*.025,0).transformDirection(this.camera.matrixWorld);
  // transformDirection normalizes; preserve the measured offset in world units.
  shift.multiplyScalar(Math.hypot(center.x,center.y+visible*.025));
  this.hallFrame=this.camera.position.clone().add(shift);this.camera.position.copy(this.hallFrame);this.camera.lookAt(this.camera.position.clone().sub(new THREE.Vector3(11,13.3,18.6)));
 }
 this.camera.left=-visible*aspect/2;this.camera.right=visible*aspect/2;this.camera.top=visible/2;this.camera.bottom=-visible/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.composer.setSize(w,h);this.ao.setSize(Math.round(w*.65),Math.round(h*.65));}
 setAnchors(anchors:Anchor[]){this.anchors=anchors;const root=document.getElementById('world-labels')!;root.replaceChildren();this.labels=anchors.map(a=>{const el=document.createElement('button');el.className='world-anchor '+a.type;el.dataset.anchor=a.id;el.title=a.label||a.id;el.innerHTML=`<span class="anchor-symbol">${a.type==='portal'?'↗':a.type==='npc'?'◌':'✦'}</span><span class="anchor-name">${a.label||a.id}</span>`;el.onclick=()=>this.approach(a);root.append(el);return el;});}
 approach(a:Anchor){if(this.paused||this.loading||this.transit?.active)return;const target={x:a.position[0],z:a.position[2]};if(this.distance(a)<1.7){this.onInteract(a);return}this.pending=a;this.path=this.nav.find(this.position,target).slice(1);if(!this.path.length)this.pending=null;}
 distance(a:Anchor){return Math.hypot(a.position[0]-this.player.position.x,a.position[2]-this.player.position.z);}
 clickGround(e:PointerEvent){if(this.paused||this.loading||!this.player||this.transit?.active)return;const rect=this.canvas.getBoundingClientRect();const mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.camera);const hit=new THREE.Vector3();
 // The exported tower meshes are batched by material; use the apparatus volume as its hit target.
 if(this.definition?.id==='pd'&&ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(0,2,-1),1.65),hit)){
  const receptor=this.anchors.find(a=>a.id==='receptor');if(receptor){this.approach(receptor);return;}
 }
 if(this.definition?.id==='pulse'){const hits=ray.intersectObjects(this.root.children,true);const surface=hits.find(h=>this.definition.walkable(h.point.x,h.point.z)&&Math.abs(h.point.y-this.surface(h.point.x,h.point.z))<.45);if(surface){this.pending=null;this.path=this.nav.find(this.position,surface.point).slice(1);}return;}
 if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.08),hit)){this.pending=null;this.path=this.nav.find(this.position,hit).slice(1);}}
 get position(){return this.player?{x:this.player.position.x,y:this.player.position.y,z:this.player.position.z}:{x:0,y:.08,z:4};}
 get screenPosition(){const p=this.player.position.clone().project(this.camera);return {x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2};}
 loop(t:number){const elapsed=t-this.last,dt=Math.min(elapsed/1000,.05);this.last=t;this.time=t/1000;if(!document.hidden&&elapsed>0){this.frameTimes.push(elapsed);if(this.frameTimes.length>600)this.frameTimes.shift();}
 let walking=false;
 if(this.player&&!this.paused&&!this.loading&&this.transit?.active){const frame=this.transit.tick(dt);if(frame.position)this.player.position.set(frame.position.x,frame.position.y,frame.position.z);this.path=[];this.pending=null;this.keys.clear();this.nearest=null;this.city?.setTransit?.(frame);this.onPosition(this.position);this.onTransitFrame(frame);}
 else if(this.player&&!this.paused&&!this.loading){
 let dx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),dz=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));
 if(dx||dz){this.path=[];this.pending=null;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);const forward=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right);const v=right.multiplyScalar(dx).add(forward.multiplyScalar(-dz)).normalize();dx=v.x;dz=v.z;}else if(this.path.length){const p=this.path[0];dx=p.x-this.player.position.x;dz=p.z-this.player.position.z;const len=Math.hypot(dx,dz);if(len<.025){this.path.shift();dx=0;dz=0;}else{dx/=len;dz/=len;}}
 if(dx||dz){const step=this.path.length?Math.min(dt*(this.city?6:3.2),Math.hypot(this.path[0].x-this.player.position.x,this.path[0].z-this.player.position.z)):dt*(this.city?6:3.2);const next=this.nav.moveSliding(this.position,dx*step,dz*step);walking=Math.hypot(next.x-this.player.position.x,next.z-this.player.position.z)>.001;this.player.position.x=next.x;this.player.position.z=next.z;if(this.city)this.player.position.y=.08+this.surface(next.x,next.z);this.player.rotation.y=Math.atan2(dx,dz);this.onPosition(this.position);}
 if(this.pending&&this.distance(this.pending)<1.7){const a=this.pending;this.pending=null;this.path=[];this.onInteract(a);}
 this.nearest=this.anchors.filter(a=>this.distance(a)<1.8).sort((a,b)=>this.distance(a)-this.distance(b))[0]||null;
 }
 if(this.player)this.animateActor(this.player,walking,this.time);
 if(this.city&&this.player){const target=this.player.position.clone();this.camera.position.lerp(target.clone().add(new THREE.Vector3(17,23,23)),1-Math.exp(-dt*5));this.camera.lookAt(this.camera.position.clone().sub(new THREE.Vector3(17,23,23)));this.city.update(this.time,this.cityState.sim,this.cityState.complete);}
 if(this.definition?.id==='hall'&&this.player&&this.hallFrame){const offset=new THREE.Vector3(THREE.MathUtils.clamp(this.player.position.x*.08,-.5,.5),0,THREE.MathUtils.clamp(this.player.position.z*.06,-.3,.3));const target=this.hallFrame.clone().add(offset);if(this.camera.position.distanceToSquared(target)<.000004)this.camera.position.copy(target);else this.camera.position.lerp(target,1-Math.exp(-dt*2));this.camera.lookAt(this.camera.position.clone().sub(new THREE.Vector3(11,13.3,18.6)));}
 for(const a of this.actors){if(this.definition?.id==='pulse')a.model.visible=!!this.player&&a.model.position.distanceTo(this.player.position)<36;if(a.id==='lumi')a.model.position.y=a.base.y+Math.sin(this.time*2)*.11;if(a.model.visible)this.animateActor(a.model,false,this.time);}
 this.projectLabels();this.renderer.info.reset();if(this.definition?.id==='hall'&&!['before','no-ao','albedo','normals'].includes(this.view||''))this.composer.render();else this.renderer.render(this.scene,this.camera);this.metrics.drawCalls=this.renderer.info.render.calls;this.metrics.triangles=this.renderer.info.render.triangles;this.metrics.frames++;
 if(this.metrics.frames%60===0&&location.hostname==='127.0.0.1'){this.canvas.dataset.position=JSON.stringify(this.position);this.canvas.dataset.performance=JSON.stringify(this.performance());const p=new THREE.Vector3(-7,.08,0).project(this.camera);this.canvas.dataset.shelfTarget=JSON.stringify([(p.x+1)*this.canvas.clientWidth/2,(1-p.y)*this.canvas.clientHeight/2]);}
 requestAnimationFrame(n=>this.loop(n));
 }
 animateActor(model:THREE.Object3D,walking:boolean,t:number){const swing=walking?Math.sin(t*10)*.5:Math.sin(t*1.5)*.025;for(const [name,sign] of [['pivot_arm_L',1],['pivot_arm_R',-1],['pivot_leg_L',-1],['pivot_leg_R',1]] as const){const obj=model.getObjectByName(name);if(obj)obj.rotation.x=swing*sign;}for(const side of ['L','R']){const wing=model.getObjectByName('pivot_wing_'+side);if(wing)wing.rotation.z=Math.sin(t*3)*.17;}}
 projectLabels(){if(!this.player)return;for(let i=0;i<this.anchors.length;i++){const a=this.anchors[i],el=this.labels[i],near=this.distance(a)<2.2;const v=new THREE.Vector3(a.position[0],(a.type==='npc'?2.2:1.1)+this.surface(a.position[0],a.position[2]),a.position[2]).project(this.camera);el.style.left=(v.x+1)*50+'%';el.style.top=(1-v.y)*50+'%';el.classList.toggle('near',near);el.hidden=v.z>1||v.x < -1||v.x>1||v.y < -1||v.y>1||(this.definition?.id==='pulse'&&(this.distance(a)>20||this.transit?.active));}
 const prompt=document.getElementById('interaction-prompt');if(prompt){prompt.classList.toggle('visible',!!this.nearest&&!this.paused);prompt.textContent=this.nearest?'E  ·  '+this.nearest.label:'';}}
 performance(){const times=this.frameTimes.filter(n=>n>0).sort((a,b)=>a-b),gl=this.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {...this.metrics,samples:times.length,meanFrameMs:times.reduce((a,b)=>a+b,0)/(times.length||1),p95FrameMs:times[Math.floor(times.length*.95)]||0,renderer:gl.getParameter(gl.RENDERER),deviceRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',canvas:[this.canvas.width,this.canvas.height]};}
}

import PF from 'pathfinding';
export function createNavigator(scene,radius=.25){
 const minX=scene.bounds.min[0]+radius,maxX=scene.bounds.max[0]-radius,minZ=scene.bounds.min[2]+radius,maxZ=scene.bounds.max[2]-radius,cell=.2;
 const cols=Math.ceil((maxX-minX)/cell)+1,rows=Math.ceil((maxZ-minZ)/cell)+1;
 const epsilon=1e-6;
 const blocked=(x,z)=>x<minX-epsilon||x>maxX+epsilon||z<minZ-epsilon||z>maxZ+epsilon||(scene.walkable&&!scene.walkable(x,z))||scene.colliders.some(c=>x>c.min[0]-radius+epsilon&&x<c.max[0]+radius-epsilon&&z>c.min[2]-radius+epsilon&&z<c.max[2]+radius-epsilon);
 // Reserve clearance around city grid cells so edges cannot cross a concave shoreline.
 const routeBlocked=(x,z)=>blocked(x,z)||(scene.walkable&&[-.12,.12].some(dx=>[-.12,.12].some(dz=>blocked(x+dx,z+dz))));
 const grid=new PF.Grid(cols,rows);for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)if(routeBlocked(minX+x*cell,minZ+z*cell))grid.setWalkableAt(x,z,false);
 const node=p=>[Math.max(0,Math.min(cols-1,Math.round((p.x-minX)/cell))),Math.max(0,Math.min(rows-1,Math.round((p.z-minZ)/cell)))];
 const position=n=>({x:minX+n[0]*cell,z:minZ+n[1]*cell});
 function nearest(p){const n=node(p);if(grid.isWalkableAt(...n))return n;let best=null,dist=Infinity;for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const d=(x-n[0])**2+(z-n[1])**2;if(d<dist&&grid.isWalkableAt(x,z)){dist=d;best=[x,z]}}return best;}
 function find(start,end){const a=nearest(start),b=nearest(end);if(!a||!b)return [];const path=new PF.AStarFinder({allowDiagonal:true,dontCrossCorners:true}).findPath(...a,...b,grid.clone());return PF.Util.compressPath(path).map(position);}
 function moveSliding(p,dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));let x=p.x,z=p.z;for(let i=0;i<steps;i++){if(!blocked(x+dx/steps,z))x+=dx/steps;if(!blocked(x,z+dz/steps))z+=dz/steps;}return {x,z};}
 return {blocked,find,moveSliding,nearest:p=>position(nearest(p))};
}

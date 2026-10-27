"""Asset payload audit and reproducible Blender contact sheet renders."""
import bpy, struct, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/validation';OUT.mkdir(parents=True,exist_ok=True)
report=[]
for path in sorted((ROOT/'public/assets/world').glob('*.glb')):
    raw=path.read_bytes();magic,version,total=struct.unpack_from('<III',raw);length,kind=struct.unpack_from('<II',raw,12);data=json.loads(raw[20:20+length]);tris=0
    for me in data.get('meshes',[]):
        for p in me['primitives']:
            if 'indices' in p:tris+=data['accessors'][p['indices']]['count']//3
    assert magic==0x46546C67 and version==2 and total==len(raw)
    names=[n.get('name','') for n in data.get('nodes',[])]
    if path.stem in ['player','lan','bai','cataloguer']:
        for name in ['pivot_arm_L','pivot_arm_R','pivot_leg_L','pivot_leg_R']:assert name in names,(path,name)
    if path.stem=='hall':assert not any(n.startswith(('Apprentice','Lan mentor','Bai archivist','Lumi')) for n in names)
    report.append({'file':path.name,'bytes':len(raw),'nodes':len(names),'meshes':len(data.get('meshes',[])),'triangles':tris,'materials':len(data.get('materials',[])),'validGlb':True})
manifest={'license':'Original procedural authored Blender geometry; source hall retained from supplied project. No external models/textures used.','coordinateSystem':'glTF Y-up, meters, characters face +Z','exporter':'Blender 4.5.3 LTS bundled glTF exporter','assets':report}
(OUT/'asset-validation.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

def render(id,angle=0):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/blender'/(id+'.blend')))
    # Rendering is independent of the live engine lights, for source asset inspection.
    bpy.ops.object.camera_add(location=(3.5*math.sin(angle),-5.5*math.cos(angle),3))
    cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.4;bpy.context.scene.camera=cam
    for loc,power,col in [((3,-4,6),800,(1,.84,.63)),((-3,1,4),900,(.48,.72,.85))]:
        bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.color=col;light.data.shape='DISK';light.data.size=4;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=512;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.12,.18,.19);scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(id+('-front' if angle==0 else '-back')+'.png'));bpy.ops.render.render(write_still=True)

for id in ['player','lan','bai','cataloguer','lumi']:render(id)
render('player',math.pi)
for id in ['harbor','hall','pd','pk','factors','boss','ending']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/blender'/(id+'.blend')))
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(id+'-scene.png'));bpy.ops.render.render(write_still=True)
print('ASSET_VALIDATION',json.dumps(report))

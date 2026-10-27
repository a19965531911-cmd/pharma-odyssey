"""Reproducible original Blender world export. Run with Blender 4.5 --background --python."""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'phase1_hall/art/source/blender/origin_academy_hall_v01.blend'
OUT = ROOT / 'public/assets/world'
BLENDS = ROOT / 'art/source/blender'
OUT.mkdir(parents=True, exist_ok=True)
BLENDS.mkdir(parents=True, exist_ok=True)
random.seed(3103)
SCENES = []

def xyz(v):
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]

def export(name):
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLENDS / (name + '.blend')))
    if name in ['harbor','hall','pd','pk','factors','boss','ending']:
        # Merge static geometry by equivalent exported PBR material, keeping the
        # editable .blend untouched and avoiding thousands of runtime draw calls.
        bpy.ops.object.select_all(action='DESELECT')
        for o in bpy.context.scene.objects:
            if o.type in ['MESH','CURVE']:o.select_set(True)
        bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.select_get())
        bpy.ops.object.convert(target='MESH')
        canonical={};groups={}
        for o in list(bpy.context.scene.objects):
            if o.type!='MESH' or not o.data.materials:continue
            m=o.data.materials[0];p=m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
            signature=tuple(round(v,4) for v in m.diffuse_color)
            if p:signature+=tuple(round(p.inputs[k].default_value,4) for k in ['Roughness','Metallic','Emission Strength'])
            if signature not in canonical:canonical[signature]=m
            o.data.materials[0]=canonical[signature];groups.setdefault(signature,[]).append(o)
        for index,objects in enumerate(groups.values()):
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            if len(objects)>1:bpy.ops.object.join()
            bpy.context.object.name='Static_'+str(index)+'_'+bpy.context.object.data.materials[0].name
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB', export_apply=True, export_lights=True, export_cameras=True, export_extras=True)

def anchor(id, x, z, y=0):
    return {'id': id, 'position': [x,y,z]}

def boxcol(id, x, z, sx, sz, height=2):
    return {'id':id, 'min':[x-sx/2,0,z-sz/2], 'max':[x+sx/2,height,z+sz/2]}

def entry(id, bounds, props, cols, npcs=None, spawn=None, size=17):
    d={'id':id, 'model':f'assets/world/{id}.glb','spawn':spawn or {'x':0,'y':.08,'z':4}, 'bounds':{'min':[bounds[0],0,bounds[1]],'max':[bounds[2],3,bounds[3]]}, 'colliders':cols,'props':props,'npcs':npcs or [], 'camera':{'type':'orthographic','position':[14,19,24],'target':[0,1,0],'size':size}}
    SCENES.append(d)

def hall():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    for o in list(bpy.data.objects):
        if any(o.name.startswith(n) for n in ['Apprentice','Lan mentor','Bai archivist','Lumi']):
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            o.hide_render=False
    # Original procedural textures remain in the saved source. glTF uses authored base colors.
    for o in bpy.context.scene.objects:
        if o.type=='LIGHT' and o.data.type=='AREA':
            o['source_light_type']='AREA'
    export('hall')
    cols=[boxcol('library',-6.2,0,1.8,11),boxcol('desk',-3.4,1.3,3.7,1.8),boxcol('register',4.55,-2.65,4.4,1.8),boxcol('instrument',3.85,1.6,1.6,1.6),boxcol('reading-table',-3.2,4.5,2.6,2.6)]
    entry('hall',[-7.2,-5.1,7.2,5.4],[anchor('register',4.6,-1.4),anchor('table',-2.3,.1),anchor('instrument',2.8,1.5),anchor('cabinet',5.9,-4.2)],cols,[anchor('lan',.8,-1.9),anchor('bai',4.4,-.4),anchor('lumi',1,3,1.6)],{'x':0,'y':.08,'z':4.4},16)
    (ROOT/'src/engine').mkdir(parents=True,exist_ok=True)
    (ROOT/'src/engine/scene-data.json').write_text(json.dumps({'version':3,'scenes':SCENES},indent=2),encoding='utf-8')

def material(n,c,metal=0,emission=0):
    m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.62;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
    return m

def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    global stone,trim,wood,brass,teal,glass,paper,dark,warm,red,green
    stone=material('Salt limestone',(.28,.37,.36));trim=material('Carved pale stone',(.57,.61,.56));wood=material('Walnut',(.25,.13,.09));brass=material('Aged brass',(.61,.40,.17),.68);teal=material('Enamel teal',(.035,.22,.24));glass=material('Sea glass',(.15,.43,.48),.2);paper=material('Archive paper',(.82,.76,.60));dark=material('Ink iron',(.035,.065,.07),.2);warm=material('Lantern warm glass',(1,.62,.20),0,2);red=material('Oxide leather',(.41,.16,.10));green=material('Botanical green',(.12,.29,.21))

def cube(n,p,s,m,b=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if b:mod=o.modifiers.new('Crafted bevel','BEVEL');mod.width=b;mod.segments=2;o.modifiers.new('Corner normals','WEIGHTED_NORMAL')
    return o

def sphere(n,p,s,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=p);o=bpy.context.object;o.name=n;o.scale=s;o.data.materials.append(m)
    for f in o.data.polygons:f.use_smooth=True
    return o

def cyl(n,p,r,h,m,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p);o=bpy.context.object;o.name=n;o.data.materials.append(m)
    mod=o.modifiers.new('Rim bevel','BEVEL');mod.width=.025;mod.segments=2;o.modifiers.new('Corner normals','WEIGHTED_NORMAL');return o

def tube(n,pts,r,m):
    c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;p=c.splines.new('POLY');p.points.add(len(pts)-1)
    for q,v in zip(p.points,pts):q.co=(*v,1)
    o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o

def ring(n,p,r,m,rotation=(0,0,0),thick=.04):
    bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,major_radius=r,minor_radius=thick,location=p,rotation=rotation);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o

def lamp(x,y,z=2.9):
    cyl('Lamp iron standard',(x,y,z/2),.055,z,brass);cyl('Lantern base',(x,y,z),.23,.09,brass)
    sphere('Lantern amber chimney',(x,y,z+.3),(.16,.16,.30),warm)
    for a in range(4):
        t=a*math.pi/2;tube('Lantern cage',[(x+.2*math.cos(t),y+.2*math.sin(t),z),(x+.16*math.cos(t),y+.16*math.sin(t),z+.65)],.025,brass)
    cyl('Lantern roof',(x,y,z+.65),.25,.1,brass)

def table(x,y,w=2.4,d=1.2):
    cube('Archive table top',(x,y,1.1),(w,d,.16),wood)
    for xx in [-w/2+.15,w/2-.15]:
        for yy in [-d/2+.15,d/2-.15]:cube('Turned table leg',(x+xx,y+yy,.55),(.12,.12,1.1),wood)
    cube('Brass archive corner',(x-w/2+.16,y-d/2+.07,1.2),(.22,.16,.035),brass)
    for i in range(3):
        cube('Folio leather',(x-.6+i*.45,y,1.23),(.38,.66,.1),[teal,red,brass][i]);cube('Folio paper',(x-.6+i*.45,y-.01,1.28),(.33,.60,.03),paper)

def shelf(x,y):
    cube('Archive case',(x,y,1.6),(2.5,.5,3.2),wood)
    for z in [.25,1,1.75,2.5]:
        cube('Shelf edge',(x,y-.32,z),(2.65,.2,.12),brass)
        for i in range(12):
            cube('Bound archive',(x-1.13+i*.2,y-.30,z+.35),(.15,.35,random.uniform(.40,.62)),random.choice([teal,red,paper,green]))

def frame(x,y,z=2.2):
    cube('Display brass frame',(x,y,z),(1.6,.13,1.35),brass);cube('Display dark face',(x,y-.08,z),(1.42,.06,1.18),teal)
    for a in range(4):cube('Blank archive line',(x,y-.12,z+.36-a*.23),(1.05,.025,.025),paper)
    for xx in [-.56,.56]:cube('Display legs',(x+xx,y,.7),(.07,.07,1.4),brass)

def floor(w=16,d=12):
    cube('Foundation',(0,0,-.22),(w+.3,d+.3,.4),dark)
    for x in range(w):
        for y in range(d):cube('Chiselled limestone slab',(x-w/2+.5,y-d/2+.5,0),(.98,.98,.12),trim if (x+y)%4==0 else stone,.02)

def room():
    floor();cube('North wall',(0,5.9,2.7),(16,.25,5.4),stone);cube('West wall',(-7.9,0,2.7),(.25,12,5.4),stone)
    for x in [-7.4,-3.7,0,3.7,7.4]:
        cube('Carved pier',(x,5.55,2.5),(.35,.6,5),trim);cube('Pier capital',(x,5.5,4.95),(.70,.8,.22),trim)
    for x in [-5.5,-1.85,1.85,5.5]:
        cube('Tall sea window',(x,5.72,3.05),(2.4,.06,3.1),glass)
        for z in [1.5,3.1,4.6]:cube('Window transom',(x,5.6,z),(2.5,.1,.07),brass)
        cube('Window mullion',(x,5.6,3.1),(.06,.1,3),brass)
    lamp(-6,4);lamp(6,4)

def camera():
    bpy.ops.object.camera_add(location=(14,-24,19));c=bpy.context.object;c.rotation_euler=(Vector((0,0,1))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=21;bpy.context.scene.camera=c
    bpy.context.scene.world.color=(.22,.27,.3)
    bpy.ops.object.light_add(type='AREA',location=(0,-4,12));bpy.context.object.data.energy=1700;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=10
    bpy.context.object.rotation_euler=(Vector((0,0,0))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT';bpy.context.scene.render.resolution_x=1280;bpy.context.scene.render.resolution_y=720;bpy.context.scene.render.resolution_percentage=100

def harbor():
    reset();sea=material('Night sea',(.035,.14,.19),.3)
    cube('Open water',(0,0,-.35),(38,28,.25),sea)
    for x in range(16):
        for y in range(12):cube('Wet timber pier',(x-7.5,y-5.5,0),(.98,.96,.16),wood,.015)
    for x in [-7.7,7.7]:
        for y in range(-5,6,2):
            cyl('Pier mooring post',(x,y,.65),.13,1.3,wood);ring('Mooring brass collar',(x,y,.9),.135,brass)
        tube('Harbor railing',[(x,-5,.85),(x,5,.85)],.045,brass)
    for x,y in [(-6,-3),(6,3),(-6,4)]:lamp(x,y)
    # A physically modeled ferry, visible beside the walkable dock.
    sphere('Ferry walnut hull',(-10,-1,.15),(2,4,.8),wood);cube('Ferry deck',(-10,-1,.65),(2.8,6,.16),red)
    cube('Ferry cabin',(-10,0,1.5),(2,2.6,1.65),teal);cube('Cabin roof',(-10,0,2.4),(2.6,3.2,.16),dark)
    for y in [-.75,.1,.95]:cube('Cabin warm window',(-8.96,y,1.65),(.03,.55,.65),warm)
    frame(-4,3);cube('Post box',(-4,3,.8),(.6,.6,1),teal)
    for x,y in [(4,2),(5.3,2),(4,3.2)]:
        cube('Shipping crate',(x,y,.6),(1.1,1.1,1.2),wood)
        for z in [.15,1.05]:cube('Crate strap',(x,y-.56,z),(1.12,.035,.08),brass)
    for x in [-2,2]:cube('Academy gate pier',(x,5,2),(.7,.8,4),trim)
    cube('Academy gate arch',(0,5,3.95),(4.8,.8,.35),trim)
    # Distant tower establishes island silhouette.
    cyl('Distant lighthouse',(10,13,3.5),1.2,7,stone);cyl('Lighthouse lantern',(10,13,7.2),1.5,.8,warm);cyl('Lighthouse roof',(10,13,7.8),1.7,.3,teal)
    for y in range(-12,12,2):tube('Sea surface glint',[(-16,y,-.18),(-12,y+.3,-.18),(-7,y,-.18)],.012,glass)
    camera();export('harbor')
    entry('harbor',[-7,-5.1,7,5.1],[anchor('notice',-3.9,-2),anchor('boat',-6.3,1),anchor('gate',0,-4.6)],[boxcol('crates',4.7,-2.6,3,2.5),boxcol('noticeboard',-4,-3,1.8,.6)],[anchor('lumi',.9,3.2,1.6)],size=18)

def pd():
    reset();room();cols=[]
    cyl('Mechanism stone plinth',(0,1,.45),1.2,.9,trim);cyl('Mechanism brass base',(0,1,.95),1.35,.16,brass)
    for rot in [(0,0,0),(math.pi/2,0,0),(0,math.pi/2,0)]:ring('Receptor armillary',(0,1,2),1.35,brass,rot,.065)
    sphere('Mechanism core',(0,1,2),(.54,.54,.54),glass)
    for i in range(7):
        a=i*math.tau/7;sphere('Receptor binding site',(math.cos(a)*1.5,1+math.sin(a)*1.5,2.5),(.17,.17,.17),teal)
    for x,y in [(-4,2),(4,2),(-4,-2),(4,-2)]:table(x,y);frame(x,y+.6)
    shelf(-5,5);shelf(5,5);camera();export('pd')
    props=[anchor('label',-4,-.7),anchor('conditions',4,-.7),anchor('curve',-4,3.2),anchor('receptor',0,2.7),anchor('safety',4,3.2)]
    cols=[boxcol('armillary',0,-1,2.8,2.8)]+[boxcol('bench',x,-y,2.6,1.4) for x,y in [(-4,2),(4,2),(-4,-2),(4,-2)]]
    entry('pd',[-7,-4.8,7,5],props,cols,[anchor('lan',2,0),anchor('lumi',.8,3.4,1.6)])

def pk():
    reset();floor();water=material('River turquoise',(.08,.34,.37),.25)
    cube('Canal water',(0,2,-.02),(16,2.4,.12),water)
    for y in [.72,3.28]:cube('Canal stone quay',(0,y,.1),(16,.28,.35),trim)
    for y in [1,1.4,1.8,2.2,2.6,3]:cube('Central bridge plank',(0,y,.18),(3,.36,.2),wood)
    for x in [-1.5,1.5]:
        tube('Bridge brass rail',[(x,.5,1.1),(x,3.5,1.1)],.05,brass)
        for y in [.5,2,3.5]:cyl('Bridge stanchion',(x,y,.6),.045,1.2,brass)
    for x in [-5,-2.5,2.5,5]:
        cyl('Transport reservoir',(x,4.5,1),.65,2,glass);ring('Reservoir collar',(x,4.5,1.7),.67,brass)
        tube('Transport pipe',[(x,4.5,.4),(x,3.5,.4),(x,3.5,1)],.12,brass)
    frame(-4,-1);table(4,-2);frame(4,-1.6);lamp(-6,-4);lamp(6,-4)
    for x in [-6,6]:cube('Valley retaining wall',(x,5.7,2),(3,.3,4),stone)
    camera();export('pk')
    cols=[boxcol('canal-left',-4.8,-2,6.4,2.1,.5),boxcol('canal-right',4.8,-2,6.4,2.1,.5),boxcol('bench',4,2,2.7,1.4),boxcol('timetable',-4,1,1.8,.6)]
    entry('pk',[-7,-5,7,5],[anchor('timetable',-4,2.5),anchor('adme',0,-3.8),anchor('half',4,3.3)],cols,[anchor('lan',2,3),anchor('lumi',-1,3,1.6)])

def plant(x,y,scale=1):
    cyl('Terracotta planter',(x,y,.27),.42,.55,red)
    for i in range(9):
        a=i*2.4;h=random.uniform(.9,1.8)*scale;dx=math.cos(a)*.5;dy=math.sin(a)*.5
        tube('Botanical stem',[(x,y,.4),(x+dx,y+dy,h)],.024,green)
        o=sphere('Lanceolate botanical leaf',(x+dx,y+dy,h),(.13,.09,.45),green);o.rotation_euler=(dy,dx,a)

def factors():
    reset();floor()
    for x in [-7,7]:
        for y in [-4,-1,2,5]:
            plant(x,y,1.4);tube('Greenhouse rib',[(x,y,0),(x,y,4.5),(0,y,6)],.065,brass)
    for y in [-4,-1,2,5]:tube('Glasshouse roof spine',[(-7,y,4.5),(0,y,6),(7,y,4.5)],.06,brass)
    for x,y in [(-4,2),(4,2),(-4,-2),(4,-2)]:
        table(x,y);frame(x,y+.6);plant(x+1.5,y)
    table(0,4.4,2.5);lamp(-1,-3);lamp(1,3)
    camera();export('factors')
    pts=[(-4,-2),(4,-2),(-4,2),(4,2),(0,-4.4)]
    entry('factors',[-6.5,-5.1,6.5,5.1],[anchor(id,x,z+1.1) for id,(x,z) in zip(['clue_body','clue_pathogen','adapt','interaction','case'],pts)],[boxcol('case-bench',x,z,2.6,1.4) for x,z in pts],[anchor('bai',0,0),anchor('lumi',1,3,1.6)])

def boss():
    reset();floor();cyl('Catalog rotunda',(0,0,-.02),5.5,.2,teal,64)
    for r in [3.2,4.4,5.2]:ring('Catalog floor inlay',(0,0,.10),r,brass,thick=.025)
    for i in range(9):
        a=(i/8)*math.pi; x=6.4*math.cos(a);y=5*math.sin(a)
        cube('Rotunda stone column',(x,y,2.6),(.55,.55,5.2),trim);lamp(x*.93,y*.93,3.6)
    for x in [-5,-2.5,0,2.5,5]:shelf(x,5.6)
    cyl('Guardian lectern base',(0,1.4,.5),.75,1,trim);cube('Guardian catalogue',(0,1.4,1.25),(2.6,1.3,.25),paper)
    for x in [-1.36,1.36]:cube('Catalogue brass binding',(x,1.4,1.3),(.12,1.4,.3),brass)
    for i in range(7):tube('Catalogue folded pages',[(-1.2,1.1+i*.10,1.4),(0,1.1+i*.10,1.55),(1.2,1.1+i*.10,1.4)],.015,wood)
    ring('Guardian logic halo',(0,2,3),1.4,brass,(math.pi/2,0,0),.06)
    camera();export('boss')
    entry('boss',[-6.8,-4.5,6.8,5],[anchor('guardian',0,.4)],[boxcol('guardian',0,-1.4,2.8,1.6)],[anchor('cataloguer',0,-2.8),anchor('lan',-3,2),anchor('bai',3,2)])

def ending():
    reset();floor();cyl('Lighthouse plinth',(0,3,.25),2.6,.5,trim,48)
    for x in [-2,2]:
        cube('Lighthouse lantern pier',(x,3,2.6),(.3,.3,4.8),brass)
    cyl('Beacon optics',(0,3,2.5),1,2.5,glass);sphere('Beacon source',(0,3,2.5),(.5,.5,1),warm)
    for z in [1.2,2.5,3.8]:ring('Fresnel lens brass rim',(0,3,z),1.07,brass,thick=.055)
    cyl('Beacon canopy',(0,3,4.6),2.8,.25,teal,48)
    for x in range(-7,8):
        cyl('Balcony stanchion',(x,5.6,.6),.04,1.2,brass)
    tube('Balcony rail',[(-7.5,5.6,1.2),(7.5,5.6,1.2)],.065,brass)
    for x in [-7.5,7.5]:tube('Side balcony rail',[(x,-5,1.2),(x,5.6,1.2)],.065,brass)
    table(-4,0);frame(4,0);lamp(-6,-3);lamp(6,-3)
    for i in range(9):
        x=-12+i*3;cube('Distant neural city tower',(x,17,random.uniform(1,3)),(1.4,1.4,random.uniform(3,6)),stone)
        sphere('Distant city beacon',(x,17,5),(.07,.07,.07),warm)
    camera();export('ending')
    entry('ending',[-7,-5,7,5],[anchor('index',-4,1.3),anchor('chart',4,1.3)],[boxcol('beacon',0,-3,4.4,4.4),boxcol('archive',-4,0,2.6,1.4),boxcol('chart',4,0,1.8,.6)],[anchor('lan',-2,2.7),anchor('bai',2,2.7),anchor('lumi',.8,2,1.6)])

def write_data():
    (ROOT/'src/engine/scene-data.json').write_text(json.dumps({'version':3,'scenes':SCENES},indent=2),encoding='utf-8')

if __name__=='__main__':
    hall()
    for build in [harbor,pd,pk,factors,boss,ending]:
        build();write_data()

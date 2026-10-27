"""Original sculpted geometric characters with named articulated limb pivots."""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_world as w

def mesh(n,verts,faces,mat):
    me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    for f in me.polygons:f.use_smooth=True
    mod=o.modifiers.new('Tailored seam bevel','BEVEL');mod.width=.015;mod.segments=2;o.modifiers.new('Tailored normals','WEIGHTED_NORMAL')
    return o

def profile(n,rings,mat):
    verts=[];segments=12
    for z,rx,ry in rings:
        verts.extend([(rx*math.cos(i*math.tau/segments),ry*math.sin(i*math.tau/segments),z) for i in range(segments)])
    faces=[tuple(range(segments-1,-1,-1))]
    for k in range(len(rings)-1):
        for i in range(segments):faces.append((k*segments+i,k*segments+(i+1)%segments,(k+1)*segments+(i+1)%segments,(k+1)*segments+i))
    faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)));return mesh(n,verts,faces,mat)

def parent(o,p):
    bpy.context.view_layer.update()
    world=o.matrix_world.copy();o.parent=p;o.matrix_world=world
    bpy.context.view_layer.update()
    return o

def pivot(name,p):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=p;return o

def build_person(id,coatcolor,haircolor,skincolor,style=0,old=False):
    w.reset();skin=w.material('Skin',skincolor);hair=w.material('Hair',haircolor);coat=w.material('Coat',coatcolor);shirt=w.material('Shirt',(.76,.79,.73));boots=w.material('Boots',(.065,.075,.075));accent=w.material('Accessory',(.61,.40,.17),.6)
    # 3.25 head silhouette; layered coat panel, distinct lapels and seams.
    body=profile('Coat_main',[(.64,.34,.22),(.76,.32,.21),(1.13,.28,.20),(1.42,.38,.21),(1.50,.20,.16)],coat)
    neck=profile('Skin_neck',[(1.42,.12,.11),(1.63,.12,.11)],skin)
    head=profile('Skin_face',[(1.57,.12,.13),(1.61,.22,.20),(1.73,.29,.25),(1.97,.31,.26),(2.12,.26,.23),(2.18,.14,.14)],skin)
    # Face points towards Blender -Y (Three +Z).
    for x in [-.27,.27]:w.sphere('Skin_ear',(x,0,1.86),(.065,.065,.10),skin)
    w.sphere('Skin_nose',(0,-.255,1.81),(.05,.055,.07),skin)
    for x in [-.105,.105]:
        w.sphere('Eye_white',(x,-.236,1.89),(.062,.025,.067),shirt);w.sphere('Eye_iris',(x,-.261,1.89),(.032,.012,.039),w.dark)
        w.tube('Hair_eyebrow',[(x-.05,-.261,1.98),(x+.04,-.266,1.99)],.014,hair)
    w.tube('Smile',[(-.045,-.234,1.723),(0,-.245,1.713),(.045,-.234,1.723)],.009,w.red)
    # Hair is a scalp shell plus irregular swept sculpted locks, with open face.
    profile('Hair_back',[(1.78,.25,.18),(1.94,.32,.25),(2.13,.29,.25),(2.23,.16,.15)],hair).location.y=.055
    for i in range(9):
        x=-.28+i*.067; tip=1.95+(.07 if i%3 else -.02)+abs(x)*.2
        verts=[(x-.055,-.18,2.13),(x+.065,-.18,2.18),(x+.045,-.27,tip+.03),(x+.005,-.285,tip),(x-.055,-.26,tip+.08),(x,-.20,2.24)]
        mesh('Hair_lock_'+str(i),verts,[(0,1,2,3,4),(0,5,1),(1,5,2),(2,5,3),(3,5,4),(4,5,0)],hair)
    if style==1:
        for side in [-1,1]:
            for j in range(3):w.sphere('Hair_side_lock',(side*(.28-j*.02),.06,1.8-j*.09),(.075,.18,.17),hair)
    if style==2:
        w.tube('Hair_braid',[(.12,.22,2),(.19,.27,1.8),(.17,.27,1.6),(.22,.28,1.45)],.075,hair)
    if old:
        for x in [-.105,.105]:w.ring('Accessory_spectacles',(x,-.278,1.89),.082,accent,(math.pi/2,0,0),.009)
        w.tube('Accessory_glasses_bridge',[(-.025,-.28,1.89),(.025,-.28,1.89)],.009,accent)
    # Shirt visible between sculpted triangular lapels.
    w.cube('Shirt_front',(0,-.208,1.32),(.21,.03,.30),shirt,.01)
    for side in [-1,1]:
        mesh('Coat_lapel',[(side*.03,-.24,1.40),(side*.23,-.24,1.50),(side*.30,-.23,1.32),(side*.08,-.25,1.19)],[(0,1,2,3)],shirt)
        w.cube('Coat_patch_pocket',(side*.20,-.215,.92),(.16,.04,.18),coat,.02)
        w.cube('Coat_pocket_trim',(side*.20,-.24,1.01),(.18,.02,.025),accent,.004)
    for z in [.86,1.02,1.17]:w.sphere('Accessory_coat_button',(0,-.235,z),(.027,.018,.027),accent)
    w.tube('Coat_back_seam',[(0,.222,.7),(0,.205,1.3)],.008,shirt)
    for side,label in [(-1,'L'),(1,'R')]:
        p=pivot('pivot_arm_'+label,(side*.35,0,1.38))
        sleeve=profile('Coat_sleeve_'+label,[(.84,.10,.10),(1.02,.12,.12),(1.35,.14,.14),(1.44,.11,.11)],coat);sleeve.location.x=side*.39;parent(sleeve,p)
        parent(w.cube('Coat_cuff_'+label,(side*.39,-.01,.88),(.20,.22,.09),shirt,.02),p)
        parent(w.sphere('Skin_hand_'+label,(side*.39,-.02,.76),(.095,.085,.13),skin),p)
        legpivot=pivot('pivot_leg_'+label,(side*.15,0,.7))
        leg=profile('Trouser_'+label,[(.14,.11,.11),(.42,.105,.11),(.75,.13,.13)],w.teal);leg.location.x=side*.15;parent(leg,legpivot)
        parent(w.cube('Boot_'+label,(side*.15,-.06,.12),(.24,.39,.24),boots,.07),legpivot)
        parent(w.cube('Boot_sole_'+label,(side*.15,-.07,.035),(.25,.40,.06),w.wood,.02),legpivot)
    w.tube('Accessory_satchel_strap',[(-.28,-.23,1.4),(0,-.26,1.1),(.29,-.24,.8)],.025,accent)
    w.cube('Accessory_satchel',(.32,.07,.80),(.30,.22,.36),w.red,.05);w.cube('Accessory_satchel_flap',(.32,-.055,.9),(.32,.05,.17),w.wood,.025)
    if old:
        w.cube('Accessory_case',(-.5,0,.48),(.50,.22,.38),w.wood,.035);w.ring('Accessory_case_handle',(-.5,0,.72),.08,accent,(math.pi/2,0,0),.017)
    w.export(id)

def lumi():
    w.reset();w.sphere('Lumi_glass_core',(0,0,.30),(.20,.20,.30),w.warm)
    for z in [.02,.60]:w.cyl('Lumi_brass_cap',(0,0,z),.27,.09,w.brass)
    for i in range(6):
        a=i*math.tau/6;w.tube('Lumi_cage',[(.23*math.cos(a),.23*math.sin(a),.02),(.26*math.cos(a),.26*math.sin(a),.30),(.23*math.cos(a),.23*math.sin(a),.60)],.023,w.brass)
    w.ring('Lumi_handle',(0,0,.79),.17,w.brass,(math.pi/2,0,0),.025)
    for side,label in [(-1,'L'),(1,'R')]:
        p=pivot('pivot_wing_'+label,(side*.25,0,.35))
        parent(mesh('Lumi_wing_'+label,[(side*.24,0,.35),(side*.65,.02,.46),(side*.50,-.02,.16),(side*.27,-.03,.25)],[(0,1,2,3)],w.brass),p)
    for x in [-.08,.08]:w.sphere('Lumi_eye',(x,-.21,.35),(.027,.02,.040),w.dark)
    w.tube('Lumi_smile',[(-.045,-.213,.24),(0,-.22,.22),(.045,-.213,.24)],.009,w.dark)
    w.export('lumi')

if __name__=='__main__':
    build_person('player',(.70,.69,.57),(.14,.075,.045),(.66,.46,.32))
    build_person('lan',(.44,.46,.43),(.53,.53,.46),(.65,.48,.35),old=True)
    build_person('bai',(.05,.25,.22),(.10,.12,.11),(.73,.55,.39),style=2)
    build_person('cataloguer',(.67,.74,.76),(.78,.80,.77),(.78,.69,.58),style=1,old=True)
    lumi()
    p=w.ROOT/'src/engine/scene-data.json';d=json.loads(p.read_text(encoding='utf-8'));d['characters']={id:{'model':f'assets/world/{id}.glb','height':2.25 if id!='lumi' else .98,'forward':'+Z'} for id in ['player','lan','bai','cataloguer','lumi']};p.write_text(json.dumps(d,indent=2),encoding='utf-8')

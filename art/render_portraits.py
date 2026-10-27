"""Render dialogue portraits from the shipped character sources, not stand-ins."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[1]
out=root/'public/assets/portraits'
out.mkdir(parents=True,exist_ok=True)
for name in ['lan','bai','lumi']:
    bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/blender'/f'{name}.blend'))
    target=Vector((0,0,1.25 if name!='lumi' else .43))
    bpy.ops.object.camera_add(location=(3,-7,3.2) if name!='lumi' else (1.5,-4,1.8))
    camera=bpy.context.object
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=2.75 if name!='lumi' else 1.25
    scene=bpy.context.scene;scene.camera=camera
    for location,color,energy,size in [((-3,-4,5),(1,.82,.60),300,4),((3,1,4),(.60,.83,1),230,3)]:
        bpy.ops.object.light_add(type='AREA',location=location)
        light=bpy.context.object;light.data.energy=energy;light.data.color=color;light.data.shape='DISK';light.data.size=size
        light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.3,.4,.42,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
    scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=512;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(out/f'{name}.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/source/blender'/f'{name}_portrait.blend'))
    bpy.ops.render.render(write_still=True)

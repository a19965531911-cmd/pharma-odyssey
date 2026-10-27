"""Convert source procedural colors to portable, packed glTF PBR textures."""
import bpy
import math
from mathutils import noise, Vector

def convert_materials():
    canonical = {}
    for material in list(bpy.data.materials):
        if not material.use_nodes:
            continue
        nodes = material.node_tree.nodes
        shader = nodes.get('Principled BSDF')
        if not shader:
            continue
        base = shader.inputs['Base Color']
        if not base.is_linked:
            continue
        color = tuple(material.diffuse_color)
        grain = 'wood' in material.name.lower() or 'walnut' in material.name.lower()
        key = (color, grain)
        if key not in canonical:
            size = 256
            tex = bpy.data.images.new('PBR ' + material.name, width=size, height=size)
            pixels = []
            for y in range(size):
                for x in range(size):
                    u, v = x / size, y / size
                    n = noise.noise_vector(Vector((u * (3 if grain else 22), v * 38, 2.7)))[0]
                    variation = .88 + .15 * n
                    if grain:
                        variation += .07 * math.sin(v * 170 + n * 9)
                    pixels.extend([max(0, min(1, c * variation)) ** (1 / 2.2) for c in color[:3]] + [1])
            tex.pixels.foreach_set(pixels)
            tex.pack()
            canonical[key] = tex
        for link in list(base.links):
            material.node_tree.links.remove(link)
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = canonical[key]
        material.node_tree.links.new(texture.outputs['Color'], base)
        # Exported normals come from beveled geometry; unsupported procedural bump
        # must not silently replace the authored base color with white.
        for link in list(shader.inputs['Normal'].links):
            material.node_tree.links.remove(link)
    sea = bpy.data.materials.get('Mist beyond windows')
    if sea:
        size = 512
        image = bpy.data.images.new('Mist sea coastal panorama',width=size,height=size)
        pixels=[]
        for y in range(size):
            for x in range(size):
                u,v=x/size,y/size
                c=(.28+.18*v,.43+.20*v,.46+.22*v)
                ridge=.29+.035*math.sin(u*19)+.018*math.cos(u*47)
                if v<ridge:c=(.26,.38,.38)
                if .36<u<.39 and ridge<v<.48:c=(.31,.41,.40)
                if .35<u<.40 and .47<v<.50:c=(.48,.49,.38)
                if v<.24:
                    ripple=.015*math.sin(v*420+math.sin(u*24)*2)
                    c=(.29+ripple,.46+ripple,.48+ripple)
                mist=math.exp(-((v-.32)/.055)**2)*.38
                pixels.extend([a*(1-mist)+b*mist for a,b in zip(c,(.58,.67,.67))]+[1])
        image.pixels.foreach_set(pixels);image.pack()
        p=sea.node_tree.nodes.get('Principled BSDF')
        tex=sea.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        sea.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
        sea.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value=.45

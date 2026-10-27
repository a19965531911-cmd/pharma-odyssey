# Pharma Odyssey original Blender assets

This directory contains reproducible source geometry, original editable Blender scenes,
and source inspection renders. Runtime resources are in `public/assets/world`.
The supplied `phase1_hall/art/source/blender/origin_academy_hall_v01.blend` is read only;
it is never overwritten. Its authored walls, books, carved furniture, lights and camera
are retained in the exported hall source. Static original people were removed so that
the same articulated character assets can inhabit every map.

## Rebuild on Windows

From the workspace parent directory, using the already supplied Blender installation:

```powershell
& '.\phase1_hall\tools\blender-4.5.3-windows-x64\blender.exe' --background --python '.\PharmaOdyssey-v0.3\art\build_world.py'
& '.\phase1_hall\tools\blender-4.5.3-windows-x64\blender.exe' --background --python '.\PharmaOdyssey-v0.3\art\build_characters.py'
& '.\phase1_hall\tools\blender-4.5.3-windows-x64\blender.exe' --background --python '.\PharmaOdyssey-v0.3\art\verify_assets.py'
```

The generation scripts use only Blender's bundled Python. No external models, image
textures, fonts or third-party artwork are required. The original Blender materials
are retained in source. Procedural noise is not represented by glTF; glTF uses the
authored base PBR colors. Area lights are retained in Blender sources but are not
supported by the glTF light extension. The engine supplies its own scene illumination.

## Runtime Contract

`src/engine/scene-data.json` uses Y-up meters. Blender source is Z-up, automatically
converted by the official glTF exporter: `(x,y,z)` becomes `(x,z,-y)`.
Every scene provides bounds, 3D obstacle AABB boxes, interaction anchors, NPC anchors,
spawn and orthographic camera settings. Bounds min/max X and Z define traversable
ground; collision boxes exclude ground slabs. The canal is blocked outside the bridge.
Interaction IDs match the gameplay runtime contract. Portals are managed by the engine.

The scene .blend files remain individually editable. Static GLB geometry is merged
by equivalent PBR material for rendering efficiency; interaction and collision data
is maintained independently and does not depend on individual static mesh names.

Characters `player`, `lan`, `bai`, `cataloguer` stand 2.25 meters high and face +Z.
The hierarchy names `pivot_arm_L`, `pivot_arm_R`, `pivot_leg_L`, `pivot_leg_R` identify
local limb rotations for engine-driven walking. `lumi` has `pivot_wing_L/R`.
Character materials include `Skin`, `Hair`, `Coat`, `Shirt`, `Accessory`. Color tinting
uses those names. Coat lapels, pockets, buttons, braid/swept hair, ears, noses, boots,
satchel and spectacles are actual geometry. No animation clips are claimed: animation
is explicitly driven by the game runtime.

`validation/asset-validation.json` verifies GLB binary headers and lengths, scene
triangle/material counts, removal of original static people and character limb names.
Its PNGs are Blender source inspection renders, not evidence of browser gameplay.
Browser gameplay, accessibility, loading, occlusion and performance must be validated
by the integrated application test suite.

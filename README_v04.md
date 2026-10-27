# Pharma Odyssey: Origin Academy Visual Revision

This is the existing unified Three.js game, with an Origin Academy rendering revision.
The original README.md describes the historical HTML v0.2 release and is retained as provenance.

## Windows

Run `start_windows.cmd`, or use `npm run dev` in this folder and open http://127.0.0.1:5173/.
The packaged launcher needs Node.js and dist/ only; it has no npm runtime dependencies.
Source development requires the project dependencies. Restore them with `npm ci` when needed.
Do not double-click index.html: GLB loading and ES modules require the local server.
Save data is browser-origin specific. Keep the same browser and port, or export/import in Settings.

## Build

`npm run build` produces `dist/`. Serve it using `npm run preview`.
`npm run check` runs lint, TypeScript, unit tests, and production build.
`npm run test:e2e` runs the isolated eight-lesson, Boss and save regression suite.
Set `GAME_URL` for its server and `PLAYWRIGHT_EXECUTABLE` when using an existing browser executable.
The teaching suite exercises course controls directly; it does not prove the entire travel/story route.

## Art Sources

`art/source/blender/hall.blend` contains the revised editable hall and packed PBR textures.
Character and portrait Blender sources are in the same folder.
`art/build_world.py`, `art/hall_materials.py`, `art/build_characters.py`, and `art/render_portraits.py`
are the reproducible export tools. The bundled Blender is in the parent phase1_hall/tools folder.
To export only the hall, add the art directory to Blender's Python path, import build_world, then call hall().
Do not run write_data() after a hall-only export: that would omit the other scene definitions.

## Diagnostic Views

On the development server, add `?view=albedo`, `?view=normals`, `?view=no-ao`,
`?view=reference`, or `?view=before`, then Continue into the hall.
Reference and before use the original Blender camera direction and 22-unit horizontal framing.
Before uses the backed-up GLB and legacy runtime lighting, without the old CSS darkening patch.
The exploration camera fits the actual projected geometry and follows within a constrained range.

## Evidence

See `art/validation/v04/`, `reports/learning/results.json`, and `reports/V04_ACCEPTANCE.md`.
The acceptance report distinguishes verified fixes from remaining visual and workflow gaps.

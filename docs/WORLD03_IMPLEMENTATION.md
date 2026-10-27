# WORLD 03 implementation record

## Brief and Audit

Implement the supplied Pulse Archipelago chapter inside the current game. Preserve Origin Island, Nerve City, avatar customization, inventory, save key and learning records. Use existing Three.js/GLTF, pathfinding and Lucide. No new runtime dependencies.

The active source is `src/main.js`, `src/engine/world.ts`, `src/world02/*` and `src/persistence/store.js`. There is no Git repository and no World03 draft. Before changes, source, tests, configuration and launchers were copied to `backup/world03-before-20261022-190548`. Existing first-island GLBs remain cached. The second island uses a generated scene, shared avatar and graph navigation. Its documented software-rendering performance is insufficient; batch static geometry and instance scenery for this chapter.

Workspace reference PDFs cover general pharmacology and a syllabus, not cardiovascular specialist course material. World03 content is an original foundation module, not a reconstruction of course examinations. All simulated hemodynamics use normalized ratios, explicit assumptions and deterministic mechanisms, with no patient prediction or dosing.

## Architecture

- `src/world03/data.js`: eight regions, narrative, structured drug targets, bilingual knowledge entries, questions and four Boss phases.
- `src/world03/simulation.js`: one bounded, deterministic CirculationSimulation; CO = HR x SV, normalized MAP = CO x SVR, oxygen and RAAS indices and conduction state.
- `src/world03/geography.js`: island elevations, bridge topology, physical walkability and gated reef access.
- `src/world03/transport.js`: visible boat boarding, sailing, mooring, disembarkation and lift motion with serializable progress.
- `src/world03/scene.js`: generated 3D floating cliffs, distinct apparatus, mechanical bridges, ocean, instanced clouds/particles, state-driven animations and merged static meshes.
- `src/world03/quests.js`: unlocks, observations, reasoning and idempotent rewards.
- `src/world03/controller.js` / `pulse.css`: chapter orchestration, nearby interactions, instruments, cases, chart, codex, error review and ending.
- Existing engine: generalize generated-scene elevation and external transport without changing previous scene semantics. Lazy-load World03 geometry on arrival and dispose generated geometry on exit.
- Existing main/Nerve controller: physical portal and ending departure, chapter route handlers, eligibility checks, retain per-world positions.
- Store: additive validated `world03` progress; retain version 3 and all prior fields.

## Execution and Verification

- [x] Audit, source backup and executable validation (Windows PowerShell, Node 24.18.0).
- [ ] Write meaningful model, transport, progression and save tests; run them before implementation.
- [ ] Implement shared simulation, authored content, geography and progression; run unit checks.
- [ ] Integrate entry, generated scene, transport and state-driven mechanisms with existing engine.
- [ ] Implement nearby experiments, mechanism-specific cases, NPC story, Boss and ending.
- [ ] Validate save imports, resume interrupted travel and Boss; preserve prior worlds.
- [ ] Run lint, TypeScript, tests, production build and real browser journeys.
- [ ] Inspect desktop/mobile screenshots, canvas pixels, network and console, travel and frame metrics.
- [ ] Deliver README, changelog, factual test report and runnable local URL.

## Review Focus

Reload while on a boat or lift must resume safely. Wrong choices must explain and allow retry. Completed-region review must not award duplicate XP or relock routes. Imported malformed progress must not overwrite existing saves. Island heights and bridge corners must remain navigable in both directions. Clinical contraindications and acute/chronic HF distinctions must be explicit. Hardware performance must not be inferred from software WebGL measurements.

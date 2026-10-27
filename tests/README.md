# Pharma Odyssey QA

Run against the built game or a running Vite server:

```powershell
node --test tests/content.test.cjs tests/store.test.cjs
$env:BASE_URL = 'http://localhost:4173'
node tests/learning-e2e.cjs
```

The E2E runner first resolves a project Playwright installation and then the existing Codex bundled installation. `PLAYWRIGHT_MODULE` may override the bundled absolute path. A failing assertion exits with code 1 and writes `reports/learning/results.json` plus a failure screenshot. A report is evidence only for the source and server actually tested.

## Coverage and Limits

- Content baseline: original eight lessons, four regions, bilingual questions and explanations, vocabulary, source PDF/page metadata and review status.
- Actual production Hill curve: 81 sample points, increasing effect, EC50 half maximum and reduced Emax baseline.
- Lesson integration: each of seven stages for all eight lessons through actual DOM buttons, gated walkthrough, demonstration prerequisite, all mechanism controls, quizzes and completion.
- Numerical experiments: two and three half-lives produce 25 mg and 12.5 mg; TI at LD50 200/300 and ED50 10 produces 20/30.
- Progress: all four regions, 420 teaching XP, no duplicate lesson XP, wrong-answer journal, glossary search and bilingual feedback.
- Boss: entry prerequisite, all-wrong failure, English retake, eight correct answers, first-time reward, no repeat reward.
- Saves: page reload, exact phase continuation, v2 migration, malformed import rejection and unreadable-storage recovery without destroying the original.
- Store units: migration backups, prototype-key rejection, storage-quota transaction failure and complete mistake-history archiving.

This suite opens lessons through the public `PharmaLearning` API so the teaching regression is independent of travel. It does not prove the rain dock, free movement, collision, NPC discovery, story unlocks or complete chapter ending. Those require the separate world acceptance suite and actual gameplay screenshots.

## Public Contracts Exercised

`window.PharmaStore.state` exposes original root learning fields: `xp`, `done`, `seen`, `learning`, `errors`, `mistakes`, `bossBest`, `mode`. `PharmaStore.key` identifies persistent storage. `PharmaStore.import(jsonString)` rejects incompatible or structurally malformed saves by throwing without altering current state. Migration may normalize old numeric fields. Corrupt persistent input is retained in place or copied to another localStorage key before replacement.

`window.PharmaLearning` exposes `startLesson(id)`, `openBoss()`, `openGlossary()`, `openJournal()` and `close()`. The teaching regression does not use internal answers or force completion state. Expected correct answers are from the retained course data; all model controls and answer submissions are real UI actions.

The avatar flow uses `#new-game`, `#avatar-name`, `#start-game` and a visible `#world-canvas`. Teaching retains its documented original DOM IDs and button text. Changes to a public contract should be reviewed and reflected in tests together with the product change.

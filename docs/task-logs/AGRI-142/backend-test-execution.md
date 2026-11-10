# Backend test execution — 2026-11-05

- Branch: `AGRI-134-142-integration`, HEAD `c029423`, with the existing uncommitted feature work preserved.
- User authorized Unit, Integration and API execution. Initial results: Unit 213/213; Integration 59/73; API 264/272. All initial failures are retained in local TRX evidence.
- Corrected API name expectations to reflect approved first-character capitalization. Corrected catalog-import test seeding/reads to use only columns available in the intentionally historical schema. Changed only `CatalogContractTests.cs` and `CatalogImportTests.cs` during this execution follow-up; production source and historical migrations were not changed.
- Rebuilt successfully with the diagnostic `-p:LangVersion=12.0` flag. Corrected API passed 272/272 and Integration passed 73/73; Unit remains 213/213. Zero skipped cases in these ordinary suites. RealCheckpoint/RealR2 are explicitly excluded.
- The repository result checker accepted all three suite reports. Merged backend branch coverage: 1179/1436 = 82.10%, passing the 70% CI floor. Integration also passed 73/73 in each of three fresh processes (VSTest durations: 2 min 54 s, 1 min 59 s, 2 min 2 s); stability evidence is recorded in the technical report. `git diff --check` passed; no paths were staged.
- Default-language solution compilation still fails with CS0453 on this host SDK. No permanent language/package workaround was introduced; default build/CI readiness is not claimed.
- No frontend/browser test, live migration, deployment, commit, push or PR was performed in this follow-up.
- Evidence, commands and remaining limits: [technical report](../../reports/AGRI-142/backend-test-execution.md).

# Essential Baseline (0-30 days)

## Goal
Conclude the essential stabilization phase required to move from conditional staging approval to production readiness gate.

## Workstreams

### 1) Release Gates (Automated)
- Command: `npm run verify:essential`
- Must pass:
  - lint
  - tests
  - build
  - `npm audit --audit-level=high`

### 2) Interactive Staging Validation (Manual)
- Runbook: `docs/STAGING_SMOKE_RUNBOOK_4_SCENARIOS.md`
- Mandatory:
  - ImportSessionsDialog XLSX
  - AdminDiagnosticsPage batch XLSX
  - StudentReportsPage lazy flow
  - Export PDF

### 3) SLO v1 (Initial)
- Availability (frontend critical routes): `>= 99.5%`
- API success rate (critical flows): `>= 99.0%`
- P95 response (core app actions): `< 1500ms`
- Error budget: `0.5%` monthly

### 4) Data Contract v1 (Platform Integration)
- Define canonical event payloads for:
  - session created/updated
  - report generated/exported
  - import completed (xlsx)
- Include:
  - required fields
  - version field (`contract_version`)
  - producer/consumer ownership

## Exit Criteria (Essential Phase Done)
- [ ] `verify:essential` passing on CI and local
- [ ] 4/4 staging interactive smoke scenarios PASS with evidence
- [ ] SLO v1 published and owner assigned
- [ ] Data contract v1 documented and approved
- [ ] Production GO explicitly signed off

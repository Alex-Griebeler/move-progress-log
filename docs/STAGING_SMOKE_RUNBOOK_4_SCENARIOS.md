# Staging Smoke Runbook (4 Critical Scenarios)

## Objective
Close the production gate for the **current release candidate** by validating the 4 mandatory interactive scenarios in staging.

## Preconditions
- Staging deployed with latest `main`
- Authenticated admin/trainer test account
- Test fixture file for XLSX import
- Browser DevTools open (Console + Network tabs)

### Accepted XLSX header aliases (Scenario 1)
- Student: `Aluno`, `Nome`, `Nome do aluno`
- Date: `Data`
- Time: `Hora`, `Horário`
- Exercise: `Exercicio`, `Exercício`, `Nome exercício`
- Reps: `Reps`, `Nº Reps`, `Repetições`
- Load: `Carga (kg)`, `Carga`, `Peso`
- Notes: `Observações`, `Observacoes`, `Obs`

## Pass Criteria (Global)
- All 4 scenarios marked as `PASS`
- No blocking error in Console/Network
- Expected success UI feedback shown in each flow
- Evidence captured (screenshots + key response payload/status)

## Scenario 1: ImportSessionsDialog - XLSX Upload
1. Open Sessions page and launch `ImportSessionsDialog`.
2. Upload a valid XLSX fixture with 2+ students and multiple exercises.
3. Confirm parser/import finishes with success feedback.
4. Validate sessions were created and appear in list/detail views.

Expected:
- No parser crash
- Success toast/state shown
- Imported sessions visible and consistent

Evidence to collect:
- Screenshot of import success
- Screenshot/list showing created sessions
- Network request status (2xx) for import action

## Scenario 2: AdminDiagnosticsPage - XLSX Batch Import
1. Open `AdminDiagnosticsPage`.
2. Run XLSX import via diagnostics flow.
3. Observe batch progress updates.
4. Confirm final summary with insert/update/skipped counts.

Expected:
- Batch progress updates without freeze
- Final summary rendered
- No runtime error

Evidence to collect:
- Screenshot of progress state
- Screenshot of final summary
- Network request status (2xx) for batch calls

## Scenario 3: StudentReportsPage - Lazy Load
1. Open `StudentReportsPage`.
2. Trigger report generation dialog open/close.
3. Open an existing report view.
4. Navigate away and back to ensure stable lazy-loaded flow.

Expected:
- Dialog/view open correctly
- No lazy-load crash
- No blank/error screen

Evidence to collect:
- Screenshot of report dialog loaded
- Screenshot of report view loaded
- Console tab showing no blocking errors

## Scenario 4: Export PDF - Download
1. In student report view, click `Export PDF`.
2. Wait for generation to finish.
3. Confirm browser download starts and file is valid.

Expected:
- Export action completes
- Downloaded file opens correctly
- No runtime exception on PDF generation

Evidence to collect:
- Screenshot during export and after success
- Downloaded filename + file size
- Console/Network with no blocking errors

## Final Approval Checklist
Mark all items before production promotion:

- [ ] Scenario 1 PASS
- [ ] Scenario 2 PASS
- [ ] Scenario 3 PASS
- [ ] Scenario 4 PASS
- [ ] No blocking console/network errors
- [ ] Evidence archived with date, environment, and tester name

## GO Rule
- If any item above is not PASS: **No production GO**
- If all items are PASS: **Production GO unlocked**

# Zyger ERP — Comprehensive Development Plan

> Generated: 2026-08-22
> Scope: Quality Module Fixes + Production Module Improvements + Full ERP Enhancement Plan
> Constraint: User directive — "don't change backend" (frontend-only work preferred)

---

## Part A: Quality Module — Critical Fixes (Doc Number Traceability)

### Problem Statement
ALL inspection documents display as "IQC" regardless of inspection type. This destroys traceability.

### Root Cause Analysis (3 defects)

#### Defect 1 (CRITICAL): Hardcoded IQC in auto-generation
**File**: `zygererp/.../service/DocumentFacade.java:515-516`

```java
qi.setDocNo(numbers.next("quality-inspection"));        // Generic "QI" prefix
qi.setInspectionType(QualityInspectionType.IQC);        // HARDCODED IQC for ALL sources!
```

Every inward document with `qcRequired=Yes` (PO Inward, LO Inward, JO Inward, General Inward) creates inspections typed as IQC with a generic "QI" prefix — even labour-order receipts and job-order outputs.

#### Defect 2: Next-number endpoint lacks type awareness
**File**: `zygererp/.../controller/QualityController.java:70-73`

```java
@GetMapping("/inspections/next-number")
public Map<String, Object> nextNumber() {
    return Map.of("nextNumber", docs.nextNumber(QualityInspectionService.KEY));
}
```

No `inspectionType` parameter — always returns `QI-2026-nnnn` preview.

#### Defect 3: Frontend defaults to IQC
**File**: `zyger-erp-frontend/src/pages/quality/inspection/QualityForm.tsx:167`

```tsx
inspectionType: (defaultInspectionType ?? 'IQC') as InspectionType,
```

Generic Quality page passes no default type — manual creations default to IQC.

### Fix Plan

| # | Fix | Where | Impact |
|---|-----|-------|--------|
| Q1 | Map source key to inspection type in `createQualityInspectionIfRequired` | Backend `DocumentFacade.java:515-516` | po-inward->IQC, lo-inward->LO, jo-inward->FAI, general-inward->IQC |
| Q2 | Call `numbers.next(KEY, prefixFor(type))` instead of `numbers.next(KEY)` | Backend `DocumentFacade.java:515` | Each type gets correct prefix |
| Q3 | Add `inspectionType` query param to `/inspections/next-number` | Backend `QualityController.java:70-73` | Preview shows correct prefix for selected type |
| Q4 | Frontend: populate defaultInspectionType from route context | Frontend `QualityForm.tsx` | Navigate from LO Inward page -> opens with LO type pre-selected |
| Q5 | Add per-type sequence keys in DocTypes (optional) | Backend `DocTypes.java` | IQC-2026-0001, FAI-2026-0001 as independent sequences |

### Correct Behavior After Fix

| Source | Auto-created type | Prefix | Example |
|--------|------------------|--------|---------|
| PO Inward (qcRequired=Yes) | IQC | IQC | IQC-2026-0001 |
| LO Inward | LO | LO | LO-2026-0001 |
| JO Inward | FAI | FAI | FAI-2026-0001 |
| General Inward | IQC | IQC | IQC-2026-0002 |
| Manual (QualityForm) | User selects | User choice | IPQC-2026-0001 |
| Manual (LO page) | LO | LO | LO-2026-0002 |

---

## Part B: Production Module — Bug Fixes and Auto-Fill Improvements

### B1. Critical Bugs to Fix

| # | Bug | Location | Fix |
|---|-----|----------|-----|
| P1 | `inProgressJobCards` counts `IN_PROCESS` but DB stores `IN_PROGRESS` -> KPI always 0 | `ProductionController.java:1051` | Change to `countByStatus("IN_PROGRESS")` |
| P2 | Return condition mismatch: frontend sends GOOD/DAMAGED/REWORKABLE/SCRAP; backend maps SCRAP->SCRAP, REWORK->QC_HOLD, rest->FREE | `ProductionReturnScreen.tsx:109` + `ProductionController.java:689-691` | Frontend: change options to GOOD/REWORK/SCRAP or add backend mapping |
| P3 | JoSchedulePage still has hardcoded fallback data (5 records with fake dates/prices) | `JoSchedulePage.tsx:59-77` | Remove all fake fallback data, show empty state |

### B2. Auto-Fill Improvements

| # | Screen | Current State | Improvement |
|---|--------|--------------|-------------|
| AF1 | ProductionEntryScreen | 100% manual, no auto-fill from JC | Add job card lookup -> auto-fill partCode, partDescription, machineCode, operatorCode, operationCode, shiftCode |
| AF2 | IdleTimeScreen | Duration manual, not computed from start/end | Auto-compute duration = endTime - startTime |
| AF3 | IdleTimeScreen | Machine/operator/shift are free text | Add master-data dropdown lookups from /master/machines, /master/users |
| AF4 | LogSheetScreen | Header WO/JC/machine/operator/shift are free text | Add master-data dropdown lookups |
| AF5 | ProductConversionScreen | All items, warehouses are free text | Add item lookup from /master/items; validate WO/JC exist |
| AF6 | ProductionReturnScreen | Items are free text | Add item lookup; auto-fill from original issue reference |
| AF7 | WorkOrderScreen | bomId/routeId typed as raw numbers | Add BOM picker; add Route Sheet picker |
| AF8 | JobCardScreen subjobs | machine/workCenter/operator are free text | Add dropdown lookups from masters |

### B3. UI Improvements

| # | Screen | Improvement |
|---|--------|-------------|
| UI1 | IdleTimeScreen | Add Cancel button (backend supports, UI missing) |
| UI2 | LogSheetScreen | Add Cancel button |
| UI3 | ProductConversionScreen | Add Cancel button |
| UI4 | ProductionReturnScreen | Add Cancel button |
| UI5 | ProductionDashboard | Fix IN_PROGRESS bug + add charts (PieChart by status, BarChart by priority) |
| UI6 | PlanningDashboard | Add charts (WO status pie, timeline view) |
| UI7 | ProductionPendingScreen | Add click-through links to Job Cards |
| UI8 | All production screens | Add CSV/XLSX export buttons |
| UI9 | IdleTimeScreen | Add print/PDF support (missing on both sides) |
| UI10 | Traceability | Create TraceabilityPage.tsx using existing /api/v1/traceability endpoints |

### B4. Missing Features

| # | Feature | Backend Ready? | Frontend Needed |
|---|---------|---------------|----------------|
| MF1 | Traceability chain visualization | Yes (TraceabilityController) | TraceabilityPage with forward/reverse lookup |
| MF2 | Production export (CSV/XLSX) | Partial (planning export exists) | Add export for entries, job-cards, returns, log-sheets, idle-time |
| MF3 | Dashboard drilldowns | No | Click KPI card -> filtered list view |
| MF4 | Idle time print | No | Backend print case + frontend button |
| MF5 | Batch/heat tracking in production | Partial (fields exist) | Link to inventory batch tracking |

---

## Part C: Full ERP Enhancement Plan — Phase Roadmap

### Phase 1: Quality Module Fixes (1-2 days)
**Priority: CRITICAL — traceability is broken**

1. Fix `createQualityInspectionIfRequired` — source key -> type mapping
2. Fix next-number endpoint — add type parameter
3. Fix frontend default inspection type
4. Verify all 8 inspection types get correct prefixes
5. Test: create PO Inward with qcRequired -> verify IQC-2026-nnnn (not QI-2026-nnnn)
6. Test: create LO Inward -> verify LO-2026-nnnn
7. Test: manual creation from FAI page -> verify FAI-2026-nnnn

### Phase 2: Production Bug Fixes (1 day)
**Priority: HIGH**

1. Fix IN_PROGRESS vs IN_PROCESS bug in dashboard
2. Fix return condition mapping (DAMAGED/REWORKABLE -> proper stock status)
3. Remove JoSchedulePage hardcoded data
4. Auto-compute idle-time duration from start/end

### Phase 3: Production Auto-Fill (2-3 days)
**Priority: HIGH**

1. Production Entry — job card lookup + auto-fill (partCode, machine, operator, shift, operation)
2. Idle Time — master data dropdowns (machine, operator, shift)
3. Log Sheet — master data dropdowns (WO, JC, machine, operator, shift)
4. Product Conversion — item lookup + WO/JC validation
5. Production Return — item lookup + original issue reference auto-fill
6. Work Order — BOM picker + Route Sheet picker (instead of raw ID input)
7. Job Card subjobs — machine/work center/operator dropdowns

### Phase 4: Production UI Enhancements (2 days)
**Priority: MEDIUM**

1. Add Cancel buttons to all 4 screens (idle, log, conversion, return)
2. Production Dashboard — fix KPI + add charts (PieChart, BarChart, trend)
3. Planning Dashboard — add charts
4. Production Pending — add click-through to job cards
5. Add CSV export to all production screens

### Phase 5: Quality Module Enhancements (2-3 days)
**Priority: MEDIUM**

1. Quality Dashboard — add charts (first-pass yield trend, NCR by severity, inspection by type)
2. Add inspection-specific characteristic templates per type (not just IQC)
3. Add instrument/calibration linkage to inspection lines
4. Wire quality test certificates to inspection completion
5. Add quality trend analysis page

### Phase 6: Cross-Module Improvements (3-4 days)
**Priority: MEDIUM**

1. Traceability page (forward/reverse chain visualization)
2. Production export (CSV/XLSX for all doc types)
3. Idle time print support (backend + frontend)
4. Dashboard drilldowns across all modules
5. Activity log seeding from production events
6. Notification wiring for production overdue, quality pending

### Phase 7: Advanced Features (5-7 days)
**Priority: LOW**

1. Real-time WebSocket updates for dashboard KPIs
2. Advanced reporting (date range filters, multi-dimensional analytics)
3. Barcode/QR integration for batch tracking
4. Mobile-responsive production entry forms
5. Batch-wise production cost rollup
6. Machine utilization heatmaps
7. Predictive maintenance alerts (based on MTBF data)

---

## Part D: Implementation Checklist

### Quality Module Fixes
- [ ] Q1: DocumentFacade.java — map source key -> QualityInspectionType
- [ ] Q2: DocumentFacade.java — call numbers.next(KEY, prefixFor(type))
- [ ] Q3: QualityController.java — add inspectionType param to next-number
- [ ] Q4: QualityForm.tsx — pass defaultInspectionType from route context
- [ ] Q5: DocTypes.java — optional: per-type sequence keys
- [ ] Test all 8 inspection type prefixes
- [ ] Test auto-created inspections from all 4 inward types

### Production Bug Fixes
- [ ] P1: ProductionController.java:1051 — IN_PROCESS -> IN_PROGRESS
- [ ] P2: ProductionReturnScreen.tsx — fix condition options
- [ ] P3: JoSchedulePage.tsx — remove hardcoded fallback data
- [ ] Idle time duration auto-compute

### Production Auto-Fill
- [ ] AF1: ProductionEntryScreen — JC lookup + auto-fill
- [ ] AF2: IdleTimeScreen — auto-compute duration
- [ ] AF3: IdleTimeScreen — master data dropdowns
- [ ] AF4: LogSheetScreen — master data dropdowns
- [ ] AF5: ProductConversionScreen — item lookup + validation
- [ ] AF6: ProductionReturnScreen — item lookup + issue reference
- [ ] AF7: WorkOrderScreen — BOM picker + Route Sheet picker
- [ ] AF8: JobCardScreen subjobs — machine/work center/operator dropdowns

### Production UI Improvements
- [ ] UI1-UI4: Cancel buttons on 4 screens
- [ ] UI5: Production Dashboard charts + IN_PROGRESS fix
- [ ] UI6: Planning Dashboard charts
- [ ] UI7: Production Pending click-through
- [ ] UI8: CSV export on all production screens
- [ ] UI9: Idle time print support
- [ ] UI10: TraceabilityPage creation

### Quality Enhancements
- [ ] Quality Dashboard charts
- [ ] Per-type inspection templates
- [ ] Instrument/calibration linkage
- [ ] Test certificate wiring
- [ ] Quality trend analysis page

### Cross-Module
- [ ] Traceability visualization
- [ ] Production export endpoints + UI
- [ ] Dashboard drilldowns
- [ ] Activity log from production
- [ ] Notification wiring

---

## Part E: Current Codebase Status Summary

### What Works Well
- Generic document engine (DocumentFacade, 1154 lines) handles 49 doc types
- Auto-numbering via DocSequence with optimistic locking
- Workflow state machine (DRAFT->SUBMITTED->APPROVED->POSTED) on all docs
- RBAC permission layer (13 roles x 11 modules x 9 actions)
- Stock posting on POST (LedgerLine entries)
- Audit logging (AuditEntityListener -> master_audit_log)
- 42/42 API endpoints verified working

### What Needs Fixing
- Quality inspection doc numbers (all show IQC/QI — traceability broken)
- Production dashboard IN_PROCESS vs IN_PROGRESS (KPI always 0)
- Production return condition mapping (DAMAGED/REWORKABLE -> FREE stock)
- JoSchedulePage hardcoded fallback data
- Free-text fields throughout production module (no master-data lookups)
- No CSV/XLSX export in production module
- No charts/dashboards in production or planning
- Traceability API exists but has no frontend page
- No idle time print support
- Missing cancel buttons in 4 production screens

### Architecture Notes
- Backend: user directive says "don't change backend" — Q1-Q3 are backend fixes needed for traceability
- Frontend: React 19 + Vite 8 + TypeScript, all screens use apiClient (axios with /api prefix)
- ESLint: no-explicit-any=warn, caughtErrors=none, argsIgnorePattern='^_'
- Forms use Tailwind CSS classes, StatusBadge component, toast notifications

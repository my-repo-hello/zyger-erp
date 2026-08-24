# Zyger ERP — Gap Analysis vs FRS (`Zyger_ERP_FRS.md`)

Scope: backend `zygererp/` (Spring Boot, migrations V1–V18), frontend `zyger-erp-frontend/`.
Legend: **P0** = critical / blocks go-live · **P1** = major functional gap · **P2** = partial / polish.

---

## 1. Executive Summary

The system is a broad but shallow implementation: nearly every FRS screen has a counterpart, document CRUD + generic workflow + PDF/XLSX export exist everywhere, and the Quality inspection engine is genuinely strong. However, **the platform's foundational guarantees are broken**: authorization is effectively disabled, there is no stock-balance layer (every balance is a full ledger scan), several flows double-count stock into the ledger, the field-audit log is never written, and MRP/FG-Possible/planning analytics are largely stubs. Cross-module quantity chains (SO→DC→Invoice, PR→PO→GRN, allotment→issue, return eligibility) are mostly not enforced.

---

## 2. P0 — Critical Gaps

| # | Area | Finding | FRS Ref |
|---|------|---------|---------|
| C1 | **RBAC is non-functional** | `SecurityConfig` ends with `.anyRequest().permitAll()`; only 1 of 15 controllers (`TraceabilityController`) uses `@RequirePermission`; `RbacAspect` merely prints `[RBAC SECURITY]` to stderr and **never throws**. Any endpoint is callable without a token. | A.6, A.6.1, D.2 #5 |
| C2 | **No Role/Permission data model** | `AppUser.role` is a single string; no roles / permissions / user_roles / role_permissions tables; no admin UI to map Role→Module→Screen→Action. | A.6.1 |
| C3 | **No Stock Balance table** | Every balance/on-hand query does a full-table scan of `stock_ledger` and sums rows (O(N) per call). No periodic balance snapshot, no per-(item,store,batch,status) bucket. | INV-LDG-02 |
| C4 | **Ledger ignores stock status** | Single `stock_ledger` with no QC_HOLD / BLOCKED dimension; `StockService.available()` subtracts nothing for held/blocked stock. | INV-ARCH-04 |
| C5 | **Double/triple stock posting** | PO Inward posts IN `receivedQty` **and** GRN posts IN `acceptedQty` again; JO Inward posts IN **and** `QualityInspectionService.create()` posts another IN. Same material counted 2–3× in one ledger with no status separation. | GBL-16, INV-GRN-01 |
| C6 | **Negative-stock check bypassed on main issue path** | Generic `DocumentFacade.post()` writes OUT rows directly without calling `verifyStockAvailability`. Only the Sales-DC path checks. RM Issue / general issue can drive stock negative. | GBL-11 |
| C7 | **MasterAuditLog never written** | Entity + repo + read endpoint exist; zero writers anywhere (no `@EntityListeners`, no AOP). Field-level audit trail is dead code. | GBL-04 |
| C8 | **MRP is a stub** | Single-level BOM explosion only (no recursion into child BOMs); on-hand supply **hardcoded to 0**; no scrap %, lead-time offset, lot-sizing, pegging, or auto-PR/WO generation. | PLN-MRP-01…05 |
| C9 | **FG Possible has no backend** | Frontend calls `POST /v1/planning/fg-possible/check` — no such endpoint exists server-side (404). | PLN-FGP-01/02 |
| C10 | **Production ↔ Stock disconnected** | Job-card completion, production entries, product conversion, and production returns post **zero** stock transactions: no RM consumption, no FG receipt; conversion is a bare status flip; return-receive skips stock-in. | PRD-JC-06, PRD-ENT-01/03 |
| C11 | **Sales order chain not enforced** | Credit-limit check receives `orderAmount = null` (never triggers); no ordered/dispatched/invoiced/pending quantity tracking on SO lines; DC dispatch qty never validated against SO pending. | SAL-SO-02/03, SAL-DC-02 |
| C12 | **Returns unvalidated** | Customer/vendor returns accept any quantity (no reference to original DC/invoice or eligible-return balance); returned goods hit unrestricted stock immediately regardless of disposition (rework/scrap decision ignored). | SAL-RTN-01, INV-RET-02 |

---

## 3. Cross-Cutting GBL Rules

| Rule | Status | Detail |
|------|--------|--------|
| GBL-01 Multi-company/division | **Missing** | No company/division entity anywhere; all data global. |
| GBL-02 Referential integrity on delete | **Violated** | `MasterController` hard-deletes masters (`deleteById`) with no in-use checks. |
| GBL-03 Number generation | Partial | `DocNumberService` pessimistic-lock works, but uses **calendar year not FY**, no company/division segment, prefixes/padding hardcoded (not configurable per type). |
| GBL-04 Audit log | **Dead** | See C7. |
| GBL-05 Revision/amendment | Partial | `BaseDoc` has `@Version` + updatedAt/by, but approved/cancelled actor+timestamp fields missing; statuses are free strings; production entries editable in *any* status. |
| GBL-07 Configurable workflows | **Missing** | One generic 6-state machine (DRAFT→SUBMITTED→APPROVED→POSTED…) shared by *all* doc types; no per-type state definitions. |
| GBL-08 Approval matrix | **Missing** | No amount/threshold-based routing anywhere (PO, SO, etc.). |
| GBL-09 Traceability | Partial | V18 view joins heat↔GRN↔WO↔inspection but with OR-fuzzy matches (false positives); reverse chain RM Issue→Heat→GRN→PO absent. |
| GBL-10 Batch/heat capture enforcement | Partial | Flags exist on `ItemMaster`, but generic doc lines never validate them. |
| GBL-11 Negative stock control | Partial | Check exists in `StockService` but bypassed by generic postings (C6) and racy (check-then-insert, no lock). |
| GBL-13 Idempotency | **Dead code** | `@Idempotent` + aspect implemented, used **nowhere**. |
| GBL-15 Attachments | Partial | Byte[] blobs in DB, hard cap 3 files, wired only for supplier invoices; no virus/size policy beyond 10 MB, no external storage. |
| GBL-16 Ledger completeness | Violated | See C5/C10; also Transfer DC posts OUT with **no TRANSFER_IN** at destination and no in-transit state. |

---

## 4. Module Findings

### 4.1 Master
- Hard deletes everywhere (GBL-02); business logic living in controllers.
- `ItemMaster` is rich (batch/heat/serial flags, min/max/reorder, alt/substitute items, customer-owned flag ✓) but no expiry/lifecycle fields and flags are unenforced downstream.
- User screen assigns a free-text role; no role management UI (C2).
- Company Info screen exists but is not linked to documents (GBL-01).

### 4.2 Inventory
- All inward/issue/DC/return/allotment/adjustment docs run through the **generic** `DocumentFacade` — none of the type-specific validations exist:
  - PO Inward: no approved-PO check, no supplier match, no received ≤ PO-balance check (INV-POI-02).
  - GRN: no heat/lot mandatory enforcement per item config (GBL-10).
  - General Inward: reason code not enforced (INV-GNI-01).
  - Return Management: no return ≤ issued check (INV-RET-02).
  - Allotment/Release: no allotment-balance enforcement on release (INV-ALL-01/02).
  - Adjustment: amendment reason codes not enforced (INV-ADJ-01).
- Transfer DC: no in-transit state, no destination receipt transaction (INV-DC-02).
- List/filter/pagination done in memory over `findAll()`.
- Low-stock report exists ✓; stock-ageing / ABC / FSN absent.

### 4.3 Purchase
- PR→PO linkage, quotation comparison, JO flow present structurally.
- Price history: `previousPrice` always null (PUR-PRC-02).
- No PO approval thresholds (GBL-08); no schedule auto-generation from MRP (PUR-SCH-01).
- Dashboard counts use wrong semantics/hardcoded zeros.

### 4.4 Sales
- PI/SO/Invoice/DC/returns screens exist; credit limit dead (C11); dispatch chain unenforced (C11/C12).
- `countByStatus` bug: reads `page.getContent().size()` with size=1 → counts capped at 1.

### 4.5 Planning
- WO/BOM/Route/Material-plan/Dispatch-plan/Machine-load/ECR/Gap-analysis/Cost-estimation screens exist.
- WO release validates BOM/route **only if IDs provided** (PLN-WO-03 partial); no auto material-plan trigger (PLN-WO-04).
- MRP stub (C8); FG Possible missing (C9).
- ECR: simple status flips — no multi-level approval chain, impact analysis, BOM/route revision bumping, old-stock disposition (PLN-ECR-01/02).
- Gap analysis covers material + delivery only (no capacity/tool/manpower/subcontract gaps).
- Machine load ignores maintenance downtime & shift calendars (PLN-MLP-03).

### 4.6 Production
- Reconciliation (issued ≥ consumed) enforced at entry creation ✓ (GBL-16 here only).
- No overproduction check (PRD-ENT-02); entries editable in any status (GBL-05).
- Zero stock integration (C10); job-completion quality gate is a no-op comment (PRD-JC-07).
- Shop-floor entry, idle time, log sheet present structurally.

### 4.7 Quality *(strongest module)*
- Full inspection engine: IQC/LO/JOMIN/FAI/IPQC/LINE/LAST_OFF/FINAL, characteristic-level tolerance evaluation with auto PASS/FAIL, expired-instrument calibration guard, qty reconciliation (accepted+rejected ≤ inspected), NCR required before closing failed inspections. Test certificates, concession, NCR, complaint/CAPA/8D, calibration records all present.
- Gaps: `create()` posts stock IN immediately to location "MAIN" — no QC-hold state (QUA-IQC-01, see C4/C5); FAI linkage to route operation is loose; no SPC/trend analytics.

### 4.8 Maintenance
- Breakdown/rectification, PM plan→schedule→completion, tool service, calibration, utilities, RCA, downtime/MTBF/MTTR reports all present.
- Gaps: machine status **not** auto-updated on breakdown (MNT-BRK-04); breakdown start-time auto-capture approximate; spare-parts consumption creates **no** inventory transactions (B.8.7); MTBF formulas are rough approximations; PM completion doesn't feed machine health/analytics back.

### 4.9 Auth & Security
- JWT + BCrypt + account lockout (5 tries / 15 min) + CSP/HSTS headers ✓.
- Lockout state is in-memory (resets on restart, breaks behind multiple instances).
- Password policy: config default 8 but code enforces 6; no complexity/expiry/history (A.6.2 partial).
- Signup is public and self-assigns roles — combined with C1 this is an open door.

### 4.10 Reports & Dashboards
- Only inventory-side reporting exists (dashboard summary, ledger, current-stock, drilldown+export, low-stock, inward log/chart/pending).
- Missing: business reports suite (sales/purchase/production/quality/maintenance analytics), stock ageing, ABC/FSN, consumption variance, OEE.
- Module dashboards partially hardcoded (purchase/sales zeros, wrong count semantics).

---

## 5. What Is Solid (keep/build on)

1. Quality inspection engine end-to-end (types, tolerances, calibration guard, NCR gate).
2. GBL-16 reconciliation rule in production entry creation.
3. JWT auth plumbing, lockout, security headers.
4. `BaseDoc` soft-delete + audit columns + optimistic locking pattern.
5. Pessimistic-lock document numbering core (needs FY/company config only).
6. Print/PDF + XLSX export infrastructure across modules.
7. Flyway migration discipline incl. V18 traceability view.
8. Frontend navigation covers ~95% of FRS screens (backend must catch up).

---

## 6. Recommended Remediation Order

1. **Security first (C1/C2):** flip `anyRequest().authenticated()`, make `RbacAspect` throw, seed permission tables, annotate endpoints.
2. **Ledger integrity (C3–C6, GBL-16):** add stock-balance table + status dimension; route ALL postings through `StockService` with availability checks; de-duplicate inward postings (choose GRN as the stock-in point).
3. **Audit (C7):** AOP/entity-listener writer for `MasterAuditLog`.
4. **Quantity chains (C11/C12):** SO line dispatched/invoiced/pending tracking; return-eligibility balances; allotment/release balances.
5. **Planning depth (C8/C9):** recursive BOM explosion, real on-hand/on-order inputs, scrap/lead-time/lot-sizing, fg-possible endpoint.
6. **Production stock hooks (C10)** and QC-hold flow (Quality create → hold → release on acceptance).
7. Workflow configurability (GBL-07/08), numbering FY/company config (GBL-03), idempotency adoption (GBL-13), soft-delete enforcement (GBL-02).
8. Reports/dashboards completion and password-policy fixes.

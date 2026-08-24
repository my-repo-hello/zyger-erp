# Functional Requirement Specification (FRS)
# Zyger ERP — Quality Module & Maintenance Module

**Version:** 1.0
**Date:** 23-Aug-2026
**Platform:** Spring Boot 4.1.0 / Java 25 / React 19 / PostgreSQL 16

---

## Table of Contents

1. [Quality Module](#1-quality-module)
   - 1.1 [Overview](#11-overview)
   - 1.2 [Inspection Engine](#12-inspection-engine)
   - 1.3 [Non-Conformance Reports (NCR)](#13-non-conformance-reports-ncr)
   - 1.4 [Concession Entries](#14-concession-entries)
   - 1.5 [Test Certificates](#15-test-certificates)
   - 1.6 [Calibration Instrument Master](#16-calibration-instrument-master)
   - 1.7 [Calibration Records](#17-calibration-records)
   - 1.8 [Customer Complaints](#18-customer-complaints)
   - 1.9 [CAPA](#19-capa)
   - 1.10 [8D Reports](#110-8d-reports)
   - 1.11 [Quality Dashboard](#111-quality-dashboard)
   - 1.12 [Traceability](#112-traceability)
   - 1.13 [Quality Document Workflow (Generic Engine)](#113-quality-document-workflow-generic-engine)
   - 1.14 [API Reference](#114-api-reference)
   - 1.15 [Data Model](#115-data-model)
2. [Maintenance Module](#2-maintenance-module)
   - 2.1 [Overview](#21-overview)
   - 2.2 [Machine Master](#22-machine-master)
   - 2.3 [Breakdown Intimation](#23-breakdown-intimation)
   - 2.4 [Breakdown Rectification](#24-breakdown-rectification)
   - 2.5 [Preventive Maintenance (PM)](#25-preventive-maintenance-pm)
   - 2.6 [PM Schedule](#26-pm-schedule)
   - 2.7 [PM Completion](#27-pm-completion)
   - 2.8 [Tool Service Intimation](#28-tool-service-intimation)
   - 2.9 [Tool Service Rectification](#29-tool-service-rectification)
   - 2.10 [Calibration Schedule](#210-calibration-schedule)
   - 2.11 [Calibration Entry](#211-calibration-entry)
   - 2.12 [Power Consumption](#212-power-consumption)
   - 2.13 [Water Consumption](#213-water-consumption)
   - 2.14 [Root Cause Analysis (RCA)](#214-root-cause-analysis-rca)
   - 2.15 [Maintenance Dashboard](#215-maintenance-dashboard)
   - 2.16 [MTBF / MTTR Analysis](#216-mtbf--mttr-analysis)
   - 2.17 [API Reference](#217-api-reference)
   - 2.18 [Data Model](#218-data-model)

---

# 1. Quality Module

## 1.1 Overview

The Quality Module provides end-to-end quality management across the ERP lifecycle — from incoming material inspection through in-process checks to final dispatch. It covers 8 inspection types, non-conformance management, corrective/preventive actions, customer complaint handling, 8D reports, calibration management, test certificates, and traceability.

**Key Principles:**
- All quality documents share the generic document engine (BaseDoc lifecycle: numbering, status transitions, audit, export)
- Quality inspections use a custom inspection engine (`QualityInspectionService`) layered on top of the generic engine
- Calibration instruments can warn/block measurement entry when calibration is expired or failed
- RBAC enforced via `@RequirePermission(module = "QUALITY", screen = *, action = *)`

**Quality Document Types:**

| Doc Key | Entity | Lines? | Lifecycle |
|---------|--------|--------|-----------|
| `quality-inspection` | QualityInspection | QualityInspectionLine | Custom (inspection engine) |
| `quality-ncr` | QualityNcr | QualityNcrLine | Generic |
| `quality-concession` | QualityConcession | — | Generic |
| `quality-test-certificate` | QualityTestCertificate | QualityTestCertificateLine | Generic |
| `quality-calibration-record` | QualityCalibrationRecord | — | Generic (with instrument refresh on approve) |
| `quality-customer-complaint` | QualityCustomerComplaint | — | Generic (with status hook) |
| `quality-capa` | QualityCapa | — | Generic (with status hook) |
| `quality-8d` | Quality8d | Quality8dDiscipline | Generic (with auto-seed D1-D8) |

---

## 1.2 Inspection Engine

### 1.2.1 Inspection Types

Defined by enum `QualityInspectionType`:

| Type | Prefix | Description |
|------|--------|-------------|
| `IQC` | IQC | Incoming Quality Control — supplier material inspection on GRN |
| `LO` | LO | Labour Order Inward — outsourced part inspection |
| `JOMIN` | JOMIN | Job Order Inward — purchased component inspection before production |
| `FAI` | FAI | First Article Inspection — initial production validation |
| `IPQC` | IPQC | In-Process Quality Control — periodic checks during machining |
| `LINE` | LIN | Line Inspection — inline check at work center |
| `LAST_OFF` | LOF | Last-Off Inspection — end-of-batch check |
| `FINAL` | FIN | Final Inspection — pre-dispatch clearance |

### 1.2.2 Header Fields (QualityInspection → `quality_inspection`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `inspectionType` | Enum (QualityInspectionType) | Inspection classification |
| `docNo` / `inspectionNumber` | String(60) | System-generated with prefix |
| `docDate` / `inspectionDate` | LocalDate | Inspection date |
| `sourceType` | String(30) | Source entity type (PURCHASE_ORDER, JOB_ORDER, etc.) |
| `sourceId` | String(60) | Source entity ID |
| `sourceNumber` | String(60) | Source document number |
| `referenceType` / `referenceId` / `referenceNumber` | String(60) | Secondary reference |
| `purchaseOrderNumber` | String(60) | Linked PO number |
| `poInwardNumber` | String(60) | Linked PO Inward number |
| `labourOrderNumber` | String(60) | Linked Labour Order number |
| `loInwardNumber` | String(60) | Linked LO Inward number |
| `jobOrderNumber` | String(60) | Linked Job Order number |
| `joInwardNumber` | String(60) | Linked JO Inward number |
| `salesOrderNumber` | String(60) | Linked Sales Order number |
| `itemCode` | String(60) | Material being inspected |
| `itemDescription` | String(120) | Material description |
| `drawingNumber` | String(60) | Engineering drawing reference |
| `drawingRevision` | String(30) | Drawing revision |
| `batchNumber` | String(60) | Batch/lot identifier |
| `lotNumber` | String(60) | Lot identifier |
| `serialNumber` | String(60) | Serial number |
| `heatNumber` | String(60) | Heat/charge number |
| `machine` | String(60) | Machine performing the operation |
| `workCenter` | String(60) | Work center |
| `operation` | String | Operation description |
| `operationSequence` | Integer | Operation sequence number |
| `programNumber` | String(60) | CNC program number |
| `setupNumber` | String(60) | CNC setup number |
| `inspector` | String(60) | Assigned inspector name/code |
| `assignedInspector` | String(60) | Inspector assigned at start |
| `receivedQuantity` | BigDecimal | Quantity received |
| `inspectionQuantity` | BigDecimal | Quantity to be inspected |
| `sampleSize` | BigDecimal | Sample size for attribute inspection |
| `inspectionStatus` | String(30) | Workflow status |
| `decisionStatus` | String(30) | Disposition status |
| `acceptedQuantity` | BigDecimal | Quantity accepted |
| `rejectedQuantity` | BigDecimal | Quantity rejected |
| `holdQuantity` | BigDecimal | Quantity on hold |
| `reworkQuantity` | BigDecimal | Quantity for rework |
| `scrapQuantity` | BigDecimal | Quantity scrapped |
| `returnQuantity` | BigDecimal | Quantity returned to supplier |
| `concessionQuantity` | BigDecimal | Quantity accepted on concession |
| `finalDecision` | String(30) | Final disposition (PASS/FAIL/HOLD) |
| `decisionRemarks` | String(500) | Decision notes |
| `approvedBy` | String(60) | Approver |
| `approvedAt` | Instant | Approval timestamp |
| `closedAt` | Instant | Closure timestamp |
| `cancelledAt` | Instant | Cancellation timestamp |
| `cancellationReason` | String(500) | Cancellation notes |
| `reopenReason` | String(500) | Reopen notes |
| `hasCriticalCharacteristic` | Boolean | Flag for critical dimensions |
| `hasSpecialCharacteristic` | Boolean | Flag for special characteristics |
| `requiresCustomerApproval` | Boolean | Customer sign-off needed |
| `customerApprovalReceived` | Boolean | Customer sign-off received |
| `customerApprovalEvidence` | String(60) | Evidence document |
| `dueDate` | LocalDate | Due date for completion |
| `inspectionPlanId` | String(60) | Inspection plan reference |
| `status` (BaseDoc) | String(30) | Generic doc status (DRAFT/SUBMITTED/etc.) |

### 1.2.3 Inspection Status Lifecycle

```
DRAFT → IN_PROGRESS → SUBMITTED → HOLD → (release-hold → SUBMITTED)
                                     ↓
                              PASS / FAIL
                              ↓           ↓
                           APPROVED    FAIL
                           ↓              ↓
                         CLOSED      (NCR Created)
                                        ↓
                                     CLOSED

CANCELLED (from DRAFT or SUBMITTED)
REOPENED (from CLOSED → IN_PROGRESS)
```

### 1.2.4 Workflow Actions

| Action | Allowed From | Effect |
|--------|-------------|--------|
| `start` | DRAFT, PENDING, REJECTED | Sets `inspectionStatus=IN_PROGRESS`, records `assignedInspector` |
| `save-measurements` | IN_PROGRESS, DRAFT | Saves measurement values for characteristics; auto-evaluates PASS/FAIL |
| `submit` | IN_PROGRESS, DRAFT | Validates mandatory lines have measurements, validates quantities; sets `inspectionStatus=SUBMITTED`, `decisionStatus=PENDING` |
| `decision` | SUBMITTED | Sets PASS/FAIL/HOLD with optional remarks. PASS auto-blocked if critical characteristic failed → forced HOLD |
| `approve` | SUBMITTED | Sets `inspectionStatus=APPROVED`. Blocked if any critical characteristic failed |
| `hold` | SUBMITTED, IN_PROGRESS | Puts inspection on hold with reason |
| `release-hold` | HOLD | Returns to SUBMITTED |
| `close` | SUBMITTED, PASS, HOLD, APPROVED | If FAIL status, requires existing NCR. Sets `inspectionStatus=CLOSED` |
| `cancel` | DRAFT, SUBMITTED | Sets `inspectionStatus=CANCELLED` with reason |
| `reopen` | CLOSED | Returns to `IN_PROGRESS` with reason |

### 1.2.5 Characteristic Evaluation Rules

**QualityInspectionLine fields:**

| Field | Type | Description |
|-------|------|-------------|
| `balloonNo` | String(30) | Drawing balloon reference |
| `characteristicCode` | String(60) | Characteristic identifier |
| `characteristicName` | String(120) | Characteristic description |
| `dataType` | String(30) | Numeric / Text / Visual |
| `specificationText` | String(200) | Text specification for visual/text checks |
| `nominalValue` | BigDecimal | Target value |
| `targetValue` | BigDecimal | Alternative target |
| `lowerLimit` | BigDecimal | Lower tolerance limit |
| `upperLimit` | BigDecimal | Upper tolerance limit |
| `tolerance` | BigDecimal | Tolerance band |
| `uom` | String(30) | Unit of measurement |
| `isMandatory` | Boolean | Required for submission |
| `isCritical` | Boolean | Critical characteristic (blocks approve on fail) |
| `isSpecial` | Boolean | Special characteristic flag |
| `measurementMethod` | String(120) | How to measure |
| `requiredInstrumentId` | String(60) | Required instrument |
| `instrumentCode` | String(60) | Instrument used |
| `calibrationStatus` | String(30) | Instrument calibration status |
| `actualValue` | BigDecimal | Measured value |
| `actualText` | String(200) | Text/visual result |
| `actualMin` | BigDecimal | Minimum of multiple readings |
| `actualMax` | BigDecimal | Maximum of multiple readings |
| `actualAvg` | BigDecimal | Average of multiple readings |
| `result` | String(20) | Auto-evaluated: PASS / FAIL / PENDING / NA / PENDING_REVIEW |
| `deviation` | BigDecimal | Computed deviation from nominal |
| `measuredBy` | String(60) | Measuring person |
| `measuredAt` | Instant | Measurement timestamp |
| `sampleNumber` | Integer | Sample identifier |
| `pieceNumber` | Integer | Piece identifier |
| `qty` | BigDecimal | Quantity (default 1) |

**Auto-evaluation logic (`evaluate()`):**

1. **No actual value + not mandatory** → `NA`
2. **No actual value + mandatory** → `PENDING`
3. **Text/Visual** (`actualText` present): Compare with `specificationText` (case-insensitive); match = `PASS`, else `FAIL`
4. **Numeric** (`actualValue` present):
   - Both limits present: `lowerLimit ≤ actual ≤ upperLimit` → `PASS`
   - Only upper limit: `actual ≤ upperLimit` → `PASS`
   - Only lower limit: `actual ≥ lowerLimit` → `PASS`
   - No limits defined → `PENDING_REVIEW` (manual review required)
   - Deviation computed from nominal or midpoint of limits
5. **Text without spec** → `PENDING_REVIEW`

### 1.2.6 Quantity Reconciliation

On `submit` and `approve`:
- `inspectionQuantity ≤ receivedQuantity` enforced
- Sum of `acceptedQuantity + rejectedQuantity + holdQuantity + reworkQuantity + scrapQuantity + returnQuantity + concessionQuantity ≤ inspectionQuantity`

### 1.2.7 Critical Characteristic Guard

- If any characteristic with `isCritical=true` has `result=FAIL`:
  - `approve` action is **blocked** with error message
  - `decision(PASS)` action is **forced to HOLD** with warning message

### 1.2.8 Mandatory Characteristic Guard

- On `submit`: all lines with `isMandatory=true` must have a result other than `PENDING`. Blocked if any mandatory line is still pending.

### 1.2.9 Calibration Instrument Guard

When recording a measurement with `instrumentCode`:
- System looks up `QualityCalibrationInstrument` by `instrumentCode`
- If instrument status is `EXPIRED`, `FAILED`, `UNDER_REPAIR`, or `RETIRED`: **soft warning logged** (does not block)
- Instrument's calibration status is recorded on the inspection line

---

## 1.3 Non-Conformance Reports (NCR)

### 1.3.1 Header Fields (QualityNcr → `quality_ncr`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `ncrNumber` / `docNo` | String(60) | System-generated NCR number |
| `inspectionId` | Long | FK to originating QualityInspection |
| `sourceType` | String(30) | Source of non-conformance |
| `sourceId` / `sourceNumber` | String(60) | Source reference |
| `itemCode` | String(60) | Non-conforming item |
| `itemDescription` | String(120) | Item description |
| `batchNumber` / `lotNumber` / `serialNumber` / `heatNumber` | String(60) | Traceability identifiers |
| `quantityAffected` | BigDecimal | Quantity affected |
| `uom` | String(30) | Unit |
| `defectCode` | String(60) | Defect classification |
| `defectDescription` | String(1024) | Detailed defect description |
| `severity` | String(30) | CRITICAL / MAJOR / MINOR |
| `identifiedBy` | String(60) | Who identified the NCR |
| `identifiedAt` | Instant | When identified |
| `contained` | Boolean | Containment done? |
| `containmentAction` | String(1024) | Containment description |
| `rootCauseRequired` | Boolean | Root cause needed? (default true) |
| `disposition` | String(60) | Disposition decision |
| `dispositionType` | String(30) | Rework / Scrap / Return / Concession |
| `status` | String(30) | DRAFT / SUBMITTED / APPROVED / CLOSED |
| `closedAt` | Instant | Closure timestamp |

### 1.3.2 NCR Line Fields (QualityNcrLine → `quality_ncr_line`)

| Field | Type | Description |
|-------|------|-------------|
| `ncrId` | Long (FK) | Parent NCR |
| `batchNumber` / `lotNumber` / `serialNumber` / `heatNumber` | String(60) | Affected traceability |
| `quantityAffected` | BigDecimal | Affected quantity |
| `uom` | String(30) | Unit |
| `defectCode` | String(60) | Defect code |
| `defectDescription` | String(512) | Defect description |
| `severity` | String(20) | CRITICAL / MAJOR / MINOR |
| `remark` | String(500) | Notes |

### 1.3.3 NCR Workflow

Standard document engine: DRAFT → SUBMITTED → APPROVED → CLOSED

NCR is automatically required when inspection closes with FAIL status. Inspection `close()` action fails if the inspection has failed lines and no linked NCR exists.

---

## 1.4 Concession Entries

### 1.4.1 Fields (QualityConcession → `quality_concession`)

| Field | Type | Description |
|-------|------|-------------|
| `concessionNumber` / `docNo` | String(60) | System-generated |
| `inspectionId` | Long | FK to originating inspection |
| `ncrId` | Long | FK to originating NCR |
| `itemCode` | String(60) | Non-conforming item |
| `drawingNumber` / `drawingRevision` | String(60/30) | Drawing reference |
| `batchNumber` / `serialNumber` / `heatNumber` | String(60) | Traceability |
| `quantityCovered` | BigDecimal | Quantity under concession |
| `uom` | String(30) | Unit |
| `deviationDescription` | String(1024) | What deviates from spec |
| `deviationReason` | String(1024) | Why concession is acceptable |
| `customerApprovalRequired` | Boolean | Customer approval needed? |
| `customerApprovalReceived` | Boolean | Customer approved? |
| `customerApprovalEvidence` | String(1024) | Evidence |
| `approvalAuthority` | String(60) | Who authorized |
| `validFrom` / `validTo` | LocalDate | Concession validity window |
| `approvedBy` / `approvalDate` | String / LocalDate | Approval details |

### 1.4.2 Workflow

Standard document engine: DRAFT → SUBMITTED → APPROVED → CLOSED

---

## 1.5 Test Certificates

### 1.5.1 Header Fields (QualityTestCertificate → `quality_test_certificate`)

| Field | Type | Description |
|-------|------|-------------|
| `certificateType` | String(20) | INWARD / INTERNAL / OUTWARD |
| `certificateNumber` / `docNo` | String(60) | System-generated |
| `certificateDate` / `expiryDate` | LocalDate | Validity |
| `partyCode` / `partyName` | String(60/120) | Supplier (inward) or Customer (outward) |
| `purchaseOrderNumber` / `inwardNumber` / `grnNumber` | String(60) | Inward references |
| `jobOrderNumber` / `salesOrderNumber` / `dcNumber` / `invoiceNumber` | String(60) | Outward references |
| `inspectionId` | Long | FK to originating inspection |
| `salesOrderRef` / `dcRef` / `invoiceRef` | String(30) | Outward certificate links |
| `itemCode` / `customerPartNumber` | String(60) | Item identification |
| `drawingNumber` / `drawingRevision` | String(60/30) | Drawing reference |
| `batchNumber` / `lotNumber` / `heatNumber` | String(60) | Traceability |
| `uom` | String(30) | Unit |
| `testType` | String(60) | Type of test |
| `specificationReference` | String(1024) | Spec reference |
| `overallResult` | String(20) | PASS / FAIL / PENDING |
| `verifiedBy` / `verificationDate` | String / LocalDate | Verification |
| `preparedBy` / `approvedBy` / `approvalDate` | String / LocalDate | Approval |

### 1.5.2 Certificate Line Fields (QualityTestCertificateLine)

| Field | Type | Description |
|-------|------|-------------|
| `parameterName` | String(120) | Test parameter |
| `specification` | String(240) | Required specification |
| `nominalValue` | String(60) | Target |
| `resultValue` | String(120) | Actual result |
| `uom` | String(30) | Unit |
| `instrumentCode` | String(60) | Instrument used |
| `result` | String(20) | PASS / FAIL / NA |

---

## 1.6 Calibration Instrument Master

### 1.6.1 Fields (QualityCalibrationInstrument → `quality_calibration_instrument`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `instrumentCode` | String(60, unique) | Unique code |
| `instrumentName` | String(120) | Name |
| `instrumentType` | String(60) | Type (CMM, Micrometer, Gauge, etc.) |
| `make` / `model` | String | Manufacturer info |
| `serialNumber` | String(60) | Manufacturer serial |
| `measurementRange` | String(120) | Range (e.g., "0-25mm") |
| `leastCount` | String(60) | Resolution |
| `accuracy` | String(60) | Accuracy class |
| `location` | String | Physical location |
| `departmentId` | String(60) | Owning department |
| `ownerUserId` | String(60) | Responsible person |
| `calibrationFrequencyDays` | Integer | Days between calibrations |
| `calibrationType` | String(30) | INTERNAL / EXTERNAL |
| `lastCalibrationDate` | LocalDate | Last calibration done |
| `nextDueDate` | LocalDate | Next calibration due |
| `calibrationAgency` | String(120) | External agency name |
| `certificateNumber` | String(60) | Calibration certificate number |
| `status` | String(30) | VALID / DUE_SOON / EXPIRED / FAILED / UNDER_REPAIR / RETIRED |
| `calibrationPolicy` | String(20) | WARN / BLOCK |
| `retiredDate` | LocalDate | When retired |
| `retiredReason` | String(500) | Why retired |

### 1.6.2 Status Computation

```
if nextDueDate is null → VALID
if nextDueDate < today → EXPIRED
if nextDueDate ≤ today + 30 days → DUE_SOON
otherwise → VALID
```

### 1.6.3 Lifecycle Actions

- **Save**: Create or update instrument; status auto-computed
- **Retire**: Sets status=RETIRED, records retiredDate and reason
- **Approval of Calibration Record**: Refreshes instrument dates/status

---

## 1.7 Calibration Records

### 1.7.1 Fields (QualityCalibrationRecord → `quality_calibration_record`)

| Field | Type | Description |
|-------|------|-------------|
| `calibrationNumber` / `docNo` | String(60) | System-generated |
| `instrumentId` | Long | FK to QualityCalibrationInstrument |
| `instrumentCode` / `instrumentName` | String(60/120) | Instrument details |
| `calibrationDate` | LocalDate | When calibration performed |
| `calibrationType` | String(30) | INTERNAL / EXTERNAL |
| `performedBy` | String(60) | Calibrator |
| `externalAgency` | String(120) | External agency name |
| `certificateNumber` | String(60) | Cert number |
| `result` | String(20) | PASS / FAIL |
| `nextDueDate` | LocalDate | Next calibration due |
| `approvedBy` / `approvalDate` | String / LocalDate | Approval |

### 1.7.2 Approval Side Effects

When calibration record is approved:
1. If FAIL: instrument status → `FAILED`
2. If PASS: instrument `lastCalibrationDate` = calibration date, `nextDueDate` computed from frequency, status recalculated

---

## 1.8 Customer Complaints

### 1.8.1 Fields (QualityCustomerComplaint → `quality_customer_complaint`)

| Field | Type | Description |
|-------|------|-------------|
| `complaintNumber` / `docNo` | String(60) | System-generated |
| `complaintDate` | LocalDate | Date received |
| `customerCode` / `customerName` | String(60/120) | Customer |
| `customerPo` / `salesOrderNumber` / `dispatchReference` / `invoiceNumber` | String(60) | References |
| `itemCode` / `customerPartNumber` / `drawingNumber` / `drawingRevision` | String | Item details |
| `batchNumber` / `serialNumber` | String(60) | Traceability |
| `quantityComplained` | BigDecimal | Quantity affected |
| `complaintType` | String(60) | Category |
| `complaintDescription` | String(2048) | Full description |
| `severity` | String(30) | CRITICAL / MAJOR / MINOR |
| `receivedChannel` | String(60) | Email / Phone / Letter |
| `responsiblePerson` | String(60) | Assigned to |
| `initialResponseDate` | LocalDate | First response deadline |
| `containmentAction` / `rootCause` / `correctiveAction` / `customerResponse` | String(1024) | Investigation details |
| `capaId` / `eightDId` | Long | Linked CAPA/8D |
| `complaintStatus` | String(30) | OPEN / UNDER_REVIEW / INVESTIGATION / ACTION_PLANNED / ACTION_IMPLEMENTED / RESPONSE_SENT / CLOSED / REOPENED |

### 1.8.2 Workflow Status Transitions

| Action | From | To |
|--------|------|----|
| submit | OPEN | UNDER_REVIEW |
| approve | any | CLOSED (with closedAt) |
| reject | any | REOPENED |
| cancel | any | CLOSED |

---

## 1.9 CAPA

### 1.9.1 Fields (QualityCapa → `quality_capa`)

| Field | Type | Description |
|-------|------|-------------|
| `capaNumber` / `docNo` | String(60) | System-generated |
| `sourceType` | String(40) | CUSTOMER_COMPLAINT / INTERNAL_REJECTION / INSPECTION_FAILURE / SUPPLIER_REJECTION / AUDIT / REPEATED_DEFECT |
| `sourceReference` | String(60) | Source document number |
| `complaintId` / `inspectionId` / `ncrId` | Long | FK references |
| `sourceComplaintId` | Long | FK to quality_customer_complaint (FRS §10.5) |
| `sourceNcrId` | Long | FK to quality_ncr (FRS §10.5) |
| `problemDescription` | String(2048) | Problem description |
| `rootCause` / `correctiveAction` / `preventiveAction` | String(1024) | Action plan |
| `responsiblePerson` / `dueDate` / `completionDate` | String / LocalDate | Ownership & dates |
| `evidence` / `effectivenessResult` / `effectivenessDate` | String / LocalDate | Verification |
| `approvedBy` | String(60) | Approver |
| `capaStatus` | String(30) | OPEN / IN_PROGRESS / ACTION_COMPLETED / VERIFICATION / CLOSED / OVERDUE |

### 1.9.2 Workflow

| Action | Status Change |
|--------|--------------|
| submit | OPEN → IN_PROGRESS |
| approve | any → CLOSED (with closedAt, approvedBy) |

---

## 1.10 8D Reports

### 1.10.1 Header Fields (Quality8d → `quality_8d`)

| Field | Type | Description |
|-------|------|-------------|
| `reportNumber` / `docNo` | String(60) | System-generated |
| `sourceType` | String(40) | CUSTOMER_COMPLAINT / SUPPLIER_PROBLEM / INTERNAL_DEFECT / REPEATED_ISSUE / MAJOR_FAILURE |
| `sourceReference` / `complaintId` / `ncrId` / `capaId` | String/Long | Source references |
| `sourceComplaintId` / `sourceCapaId` / `sourceNcrId` | Long | FK links (FRS §10.5) |
| `customerCode` / `customerName` / `itemCode` | String | Customer & item |
| `problemStatement` | String(2048) | Problem description |
| `teamLead` | String(60) | Team leader |
| `targetCloseDate` | LocalDate | Target completion |
| `reportStatus` | String(30) | OPEN / IN_PROGRESS / CLOSED |

### 1.10.2 Discipline Lines (Quality8dDiscipline → `quality_8d_discipline`)

Auto-seeded on creation:

| Discipline | Code | Name |
|-----------|------|------|
| D1 | Team Formation | Assemble cross-functional team |
| D2 | Problem Description | Define the problem clearly |
| D3 | Containment Action | Immediate actions to contain |
| D4 | Root Cause Analysis | Identify root cause |
| D5 | Corrective Action Selection | Select best corrective actions |
| D6 | Corrective Action Implementation | Implement corrective actions |
| D7 | Prevent Recurrence | Prevent recurrence system-wide |
| D8 | Closure | Verify effectiveness and close |

Each discipline line has: `disciplineCode`, `disciplineName`, `description`, `responsiblePerson`, `dueDate`, `completionDate`, `evidence`, `status` (PENDING / IN_PROGRESS / COMPLETED / VERIFIED), `verificationResult`.

### 1.10.3 Workflow

- On `approve`: sets `reportStatus=CLOSED`, `closedAt=now()`

---

## 1.11 Quality Dashboard

**Endpoint:** `GET /api/v1/quality/dashboard`

Returns aggregated counts:

| Metric | Source |
|--------|--------|
| `pendingByType` | Count of inspections by type in DRAFT/PENDING/IN_PROGRESS/SUBMITTED |
| `pendingTotal` | Sum of all pending inspections |
| `openNcr` | NCRs in DRAFT/SUBMITTED or APPROVED without disposition |
| `openConcession` | Concessions in DRAFT/SUBMITTED |
| `openComplaints` | Complaints not CLOSED |
| `openCapa` | CAPA not CLOSED |
| `open8d` | 8D reports not CLOSED |
| `pass` / `fail` / `hold` | Decision status counts for KPIs |
| `calibration` | Sub-object: total, dueWithin7Days, dueWithin30Days, overdue, underRepair, failed |

---

## 1.12 Traceability

**Endpoint:** `GET /api/v1/quality/traceability`

The traceability page provides forward and backward trace:
- **Backward (from finished product → raw material):** Given a finished good, trace back through production, job orders, purchase orders, to supplier lots
- **Forward (from raw material → finished product):** Given a raw material lot, trace forward through purchases, productions, to finished goods and sales

---

## 1.13 Quality Document Workflow (Generic Engine)

All quality secondary documents (NCR, Concession, Test Certificate, Calibration Record, Complaint, CAPA, 8D) share the common `DocumentFacade` engine:

- **Numbering:** Auto-generated via `DocNumberService.nextNumber(docKey)`
- **CRUD:** `create`, `getRow`, `update`, `remove` via DocumentFacade
- **Workflow:** `action(key, id, action, note, user)` — submit/approve/reject/cancel/reopen
- **Export:** `GET /api/v1/quality/docs/{type}/export` — XLSX, CSV, PDF
- **Audit:** Full audit trail via `MasterAuditLog`

Quality-specific hooks in `QualitySupportService`:
- `quality-8d` creation: auto-seeds D1-D8 discipline lines
- `quality-calibration-record` approval: refreshes instrument dates/status
- `quality-customer-complaint` actions: maps to `complaintStatus`
- `quality-capa` actions: maps to `capaStatus`

---

## 1.14 API Reference

### Inspection Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/quality/inspections` | List inspections (paginated, filterable) |
| POST | `/api/v1/quality/inspections` | Create inspection |
| GET | `/api/v1/quality/inspections/{id}` | Get inspection |
| PUT | `/api/v1/quality/inspections/{id}` | Update inspection (DRAFT/REJECTED only) |
| DELETE | `/api/v1/quality/inspections/{id}` | Delete inspection |
| GET | `/api/v1/quality/inspections/next-number?inspectionType=` | Next doc number |
| POST | `/api/v1/quality/inspections/{id}/start` | Start inspection |
| POST | `/api/v1/quality/inspections/{id}/save-measurements` | Save measurements |
| POST | `/api/v1/quality/inspections/{id}/submit` | Submit for decision |
| POST | `/api/v1/quality/inspections/{id}/decision` | Make decision (PASS/FAIL/HOLD) |
| POST | `/api/v1/quality/inspections/{id}/approve` | Approve inspection |
| POST | `/api/v1/quality/inspections/{id}/hold` | Hold inspection |
| POST | `/api/v1/quality/inspections/{id}/release-hold` | Release from hold |
| POST | `/api/v1/quality/inspections/{id}/close` | Close inspection |
| POST | `/api/v1/quality/inspections/{id}/cancel` | Cancel inspection |
| POST | `/api/v1/quality/inspections/{id}/reopen` | Reopen closed inspection |
| GET | `/api/v1/quality/inspections/{id}/characteristics` | Get inspection characteristics |
| PUT | `/api/v1/quality/inspections/{id}/characteristics` | Replace characteristics |
| POST | `/api/v1/quality/inspections/{id}/characteristics/bulk-save` | Bulk save measurements |
| GET | `/api/v1/quality/inspection-pending/count` | Pending inspection count |

### NCR Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/quality/ncrs` | List NCRs |
| POST | `/api/v1/quality/ncrs` | Create NCR |
| GET | `/api/v1/quality/ncrs/{id}` | Get NCR |
| PUT | `/api/v1/quality/ncrs/{id}` | Update NCR |
| DELETE | `/api/v1/quality/ncrs/{id}` | Delete NCR |
| GET | `/api/v1/quality/ncrs/next-number` | Next NCR number |

### Generic Document Endpoints (NCR, Concession, TC, Cal Record, Complaint, CAPA, 8D)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/quality/docs/{type}` | List documents |
| POST | `/api/v1/quality/docs/{type}` | Create document |
| GET | `/api/v1/quality/docs/{type}/{id}` | Get document |
| GET | `/api/v1/quality/docs/{type}/by-number/{docNo}` | Get by doc number |
| PUT | `/api/v1/quality/docs/{type}/{id}` | Update document |
| DELETE | `/api/v1/quality/docs/{type}/{id}` | Delete document |
| GET | `/api/v1/quality/docs/{type}/next-number` | Next number |
| POST | `/api/v1/quality/docs/{type}/{id}/actions/{action}` | Workflow action |
| GET | `/api/v1/quality/docs/{type}/export` | Export to XLSX/CSV/PDF |

### Calibration Instrument Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/quality/calibration/instruments` | List instruments |
| POST | `/api/v1/quality/calibration/instruments` | Create/update instrument |
| DELETE | `/api/v1/quality/calibration/instruments/{id}` | Retire instrument |
| GET | `/api/v1/quality/calibration/stats` | Calibration statistics |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/quality/dashboard` | Aggregated quality dashboard |

---

## 1.15 Data Model

### Database Tables

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `quality_inspection` | `id` (BIGSERIAL) | Inspection header |
| `quality_inspection_line` | `id` (BIGSERIAL) | Inspection characteristic lines |
| `quality_ncr` | `id` (BIGSERIAL) | Non-conformance report |
| `quality_ncr_line` | `id` (BIGSERIAL) | NCR affected lot/batch lines |
| `quality_concession` | `id` (BIGSERIAL) | Concession entries |
| `quality_test_certificate` | `id` (BIGSERIAL) | Test certificate header |
| `quality_test_certificate_line` | `id` (BIGSERIAL) | Test certificate parameters |
| `quality_calibration_instrument` | `id` (BIGSERIAL) | Calibration instrument master |
| `quality_calibration_record` | `id` (BIGSERIAL) | Calibration events |
| `quality_customer_complaint` | `id` (BIGSERIAL) | Customer complaints |
| `quality_capa` | `id` (BIGSERIAL) | CAPA records |
| `quality_8d` | `id` (BIGSERIAL) | 8D report header |
| `quality_8d_discipline` | `id` (BIGSERIAL) | 8D D1-D8 discipline lines |

### Indexes

| Table | Index | Columns |
|-------|-------|---------|
| `quality_inspection` | `idx_qi_type` | `inspection_type` |
| `quality_inspection` | `idx_qi_status` | `inspection_status, decision_status` |
| `quality_inspection` | `idx_qi_source` | `source_type, source_id` |
| `quality_inspection` | `idx_qi_item` | `item_code` |
| `quality_inspection` | `idx_qi_due` | `due_date` |
| `quality_inspection` | `idx_qi_inspector` | `inspector` |
| `quality_inspection` | `idx_qi_docNo` | `doc_no` |
| `quality_inspection_line` | `idx_qil_doc` | `doc_id` |
| `quality_inspection_line` | `idx_qil_char` | `characteristic_code` |
| `quality_ncr` | `idx_qn_doc` | `doc_no` |
| `quality_ncr` | `idx_qn_insp` | `inspection_id` |
| `quality_ncr` | `idx_qn_status` | `status` |
| `quality_ncr` | `idx_qn_item` | `item_code` |
| `quality_ncr_line` | `idx_qnl_ncr` | `ncr_id` |
| `quality_concession` | `idx_qc_doc` | `doc_no` |
| `quality_concession` | `idx_qc_insp` | `inspection_id` |
| `quality_concession` | `idx_qc_ncr` | `ncr_id` |
| `quality_concession` | `idx_qc_status` | `status` |
| `quality_test_certificate` | `idx_qtc_doc` | `doc_no` |
| `quality_test_certificate` | `idx_qtc_type` | `certificate_type` |
| `quality_test_certificate` | `idx_qtc_item` | `item_code` |
| `quality_test_certificate` | `idx_qtc_status` | `status` |
| `quality_test_certificate_line` | `idx_qtcl_cert` | `certificate_id` |
| `quality_calibration_instrument` | `idx_qci_code` | `instrument_code` |
| `quality_calibration_instrument` | `idx_qci_next` | `next_due_date` |
| `quality_calibration_instrument` | `idx_qci_status` | `status` |
| `quality_calibration_record` | `idx_qcr_doc` | `doc_no` |
| `quality_calibration_record` | `idx_qcr_instrument` | `instrument_id` |
| `quality_calibration_record` | `idx_qcr_status` | `status` |
| `quality_customer_complaint` | `idx_qcc_doc` | `doc_no` |
| `quality_customer_complaint` | `idx_qcc_customer` | `customer_code` |
| `quality_customer_complaint` | `idx_qcc_status` | `status` |
| `quality_customer_complaint` | `idx_qcc_item` | `item_code` |
| `quality_capa` | `idx_qcapa_doc` | `doc_no` |
| `quality_capa` | `idx_qcapa_status` | `status` |
| `quality_capa` | `idx_qcapa_source` | `source_type` |
| `quality_8d` | `idx_q8d_doc` | `doc_no` |
| `quality_8d` | `idx_q8d_status` | `status` |
| `quality_8d` | `idx_q8d_source` | `source_type` |
| `quality_8d_discipline` | `idx_q8dd_report` | `report_id` |

### Frontend Screens

| Screen | Path | Description |
|--------|------|-------------|
| QualityDashboard | `/quality/dashboard` | Aggregated dashboard with charts |
| QualityPage | `/quality/inspections` | Inspection list |
| QualityForm | `/quality/inspections/new` | Create/edit inspection (8 TYPE_TEMPLATES) |
| QualityList | `/quality/inspections/list` | Inspection list view |
| InspectionPendingPage | `/quality/pending` | Pending inspection queue |
| IqcInspectionPage | `/quality/inspection/iqc` | IQC-specific |
| LoInspectionPage | `/quality/inspection/lo` | Labour Order inspection |
| JominInspectionPage | `/quality/inspection/jomin` | Job Order Inward inspection |
| FaiInspectionPage | `/quality/inspection/fai` | First Article Inspection |
| IpqcInspectionPage | `/quality/inspection/ipqc` | In-Process QC |
| LineInspectionPage | `/quality/inspection/line` | Line inspection |
| LastOffInspectionPage | `/quality/inspection/last-off` | Last-Off inspection |
| FinalInspectionPage | `/quality/inspection/final` | Final inspection |
| NcrPage | `/quality/ncr` | NCR management |
| ConcessionPage | `/quality/concession` | Concession management |
| InwardTestCertificatePage | `/quality/certificate/inward` | Inward TC |
| InternalTestCertificatePage | `/quality/certificate/internal` | Internal TC |
| OutwardTestCertificatePage | `/quality/certificate/outward` | Outward TC |
| CalibrationPage | `/quality/calibration` | Calibration instrument master |
| CalibrationRecordPage | `/quality/calibration/record` | Calibration records |
| ComplaintPage | `/quality/complaint` | Customer complaints |
| CapaPage | `/quality/capa` | CAPA management |
| EightDPage | `/quality/8d` | 8D report |
| TraceabilityPage | `/quality/traceability` | Forward/backward traceability |
| QualityDocScreen | `/quality/docs` | Generic quality doc screen |

---

# 2. Maintenance Module

## 2.1 Overview

The Maintenance Module manages the complete lifecycle of machine maintenance — from breakdown intimation through root cause analysis, preventive maintenance scheduling, tool servicing, calibration scheduling, and utility consumption tracking.

**Key Principles:**
- Each maintenance entity has its own number generation (prefix-based)
- Breakdown → Rectification flow with machine status auto-update
- Preventive Maintenance: Plan → Schedule → Completion three-tier flow
- Tool Service: Intimation → Rectification parallel to machine breakdown
- Calibration Schedule → Entry within maintenance module
- MTBF/MTTR analytics for reliability engineering
- All entities have soft delete (`deleted` flag) and audit fields

---

## 2.2 Machine Master

### 2.2.1 Fields (MachineMaster → `machine_master`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `version` | Long | Optimistic locking |
| `code` | String(60) | Unique machine code |
| `name` | String(200) | Machine name |
| `make` | String(100) | Manufacturer |
| `model` | String(100) | Model number |
| `serialNumber` | String(60) | Serial number |
| `location` | String(200) | Physical location |
| `workCenter` | String(60) | Work center assignment |
| `yearOfManufacture` | Integer | Manufacturing year |
| `preventiveFrequencyDays` | Integer | PM frequency |
| `remarks` | String(500) | Notes |
| `brand` | String(200) | Brand name |
| `machineType` | String(60) | CNC / VMC / HMC / Lathe / etc. |
| `machineGroup` | String(60) | Machine grouping |
| `workCenterCode` | String(60) | Work center code |
| `machineCost` | BigDecimal(14,2) | Machine cost |
| `gstRate` / `gstAmount` / `totalCostWithGst` | BigDecimal | Tax details |
| `capacity` | BigDecimal | Production capacity |
| `hourlyRate` | BigDecimal | Hourly operating rate |
| `status` | String(30) | AVAILABLE / RUNNING / IN_USE / IDLE / UNDER_MAINTENANCE / BREAKDOWN |
| `controllerBrand` | String(100) | CNC controller brand |
| `spindleSpeed` | Integer | RPM |
| `spindlePower` | BigDecimal(10,2) | kW |
| `toolCapacity` | String(100) | Tool magazine capacity |
| `maxMachiningDia` / `maxMachiningLength` | BigDecimal | Envelope |
| `xAxisTravel` / `yAxisTravel` / `zAxisTravel` | BigDecimal | Axis travels |
| `rapidTraverse` | BigDecimal | Rapid traverse rate |
| `tailstockType` / `tailstockStroke` | String / BigDecimal | Tailstock details |
| `quillDiameter` / `quillTaper` | BigDecimal / String | Spindle taper |
| `coolantCapacity` | BigDecimal | Coolant tank capacity |
| `maintenanceScheduleRef` | String(60) | PM schedule reference |
| `skillRequirement` | String(100) | Required operator skill |
| `programReference` | String(100) | CNC program reference |
| `notes` | TEXT | Free text notes |
| `active` | Boolean | Active flag (default true) |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | String / Instant | Audit trail |

### 2.2.2 Machine Status Lifecycle

| Status | Trigger |
|--------|---------|
| `AVAILABLE` | Default on creation; restored when breakdown rectified (no other open breakdowns) |
| `RUNNING` / `IN_USE` | Set by production module during job execution |
| `IDLE` | Set when machine has no active jobs |
| `UNDER_MAINTENANCE` | Set during PM activities |
| `BREAKDOWN` | Auto-set when CRITICAL or HIGH priority breakdown intimation created |

**Auto-update rules (implemented in `MaintenanceController`):**
- Breakdown intimation with CRITICAL/HIGH priority → `machine.status = BREAKDOWN`
- Breakdown rectification complete/close → check if other open breakdowns exist; if none → `machine.status = AVAILABLE`

---

## 2.3 Breakdown Intimation

### 2.3.1 Fields (BreakdownIntimation → `breakdown_intimation`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `breakdownNumber` | String(60, unique) | Auto-generated (prefix: BDI) |
| `breakdownDate` | LocalDate | Date of breakdown |
| `breakdownTime` | LocalTime | Time of breakdown |
| `machineCode` | String(60) | FK to machine |
| `machineStatus` | String(30) | Machine status at time of breakdown |
| `reportedBy` | String(60) | Who reported |
| `operatorCode` | String(60) | Operator on duty |
| `shiftCode` | String(60) | Shift |
| `breakdownCategory` | String(60) | Category (Mechanical / Electrical / Hydraulic / etc.) |
| `cncAlarmCode` | String(60) | CNC alarm code |
| `problemDescription` | TEXT | Detailed description |
| `productionImpact` | String(30) | Impact level |
| `priority` | String(20) | CRITICAL / HIGH / MEDIUM / LOW |
| `status` | String(30) | OPEN / ASSIGNED / DIAGNOSED / CLOSED / CANCELLED |
| `breakdownStartTime` | Instant | When breakdown started |
| `assignedTo` | String(60) | Assigned technician |
| `diagnosis` | TEXT | Diagnosis notes |
| `remarks` | String(500) | Additional notes |
| `version` | Long | Optimistic locking |
| `deleted` | Boolean | Soft delete |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | String / Instant | Audit |

### 2.3.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `assign` | any → ASSIGNED | Sets `assignedTo` |
| `diagnose` | any → DIAGNOSED | Sets `diagnosis` |
| `close` | any → CLOSED | Requires at least one rectification; releases machine status |
| `cancel` | any → CANCELLED | Releases machine status |

### 2.3.3 Auto-behaviors

- On creation with CRITICAL/HIGH priority: `machine.status = BREAKDOWN`
- On close/cancel: if no other open breakdowns for same machine → `machine.status = AVAILABLE`

---

## 2.4 Breakdown Rectification

### 2.4.1 Fields (BreakdownRectification → `breakdown_rectification`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `rectificationNumber` | String(60, unique) | Auto-generated (prefix: BDR) |
| `breakdownId` | Long | FK to breakdown |
| `breakdownNumber` | String(60) | Reference number |
| `machineCode` | String(60) | Machine being repaired |
| `technicianCode` | String(60) | Repair technician |
| `failureCause` | TEXT | Root cause of failure |
| `correctiveAction` | TEXT | Action taken |
| `sparePartsUsed` | TEXT | Parts consumed |
| `labourHours` | BigDecimal(10,2) | Hours spent |
| `startTime` / `endTime` | Instant | Repair window |
| `downtimeMinutes` | BigDecimal(10,2) | Auto-computed from start/end |
| `externalVendor` | String(120) | External service provider |
| `serviceCost` | BigDecimal(18,2) | Cost of repair |
| `testingResult` | String(30) | PASS / FAIL |
| `status` | String(30) | IN_PROGRESS / COMPLETED / CLOSED |

### 2.4.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `complete` | any → COMPLETED | Sets endTime, releases machine status |
| `close` | any → CLOSED | Releases machine status |
| `pass` | any | Sets testingResult=PASS |
| `fail` | any | Sets testingResult=FAIL |

### 2.4.3 Auto-behaviors

- On create/update with both `startTime` and `endTime`: `downtimeMinutes = ChronoUnit.MINUTES.between(start, end)`

---

## 2.5 Preventive Maintenance (PM)

### 2.5.1 PM Plan Fields (PMPlan)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `planNumber` | String(60, unique) | Auto-generated (prefix: PMP) |
| `machineCode` | String(60) | Target machine |
| `maintenanceType` | String(60) | Type of PM |
| `frequency` | String(30) | DAILY / WEEKLY / MONTHLY / QUARTERLY / YEARLY |
| `description` | String(2048) | PM checklist description |
| `lastMaintenanceDate` | LocalDate | Last PM done |
| `nextDueDate` | LocalDate | Next PM due |
| `status` | String(30) | ACTIVE / INACTIVE |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | String / Instant | Audit |

### 2.5.2 PM Plan Workflow

| Action | Status Change |
|--------|--------------|
| `activate` | INACTIVE → ACTIVE |
| `deactivate` | ACTIVE → INACTIVE |

### 2.5.3 Generate Schedule

`POST /api/v1/maintenance/pm-plans/{id}/generate-schedule`

- Generates 12 PMSchedule entries based on frequency starting from `nextDueDate`
- Updates plan's `lastMaintenanceDate` and `nextDueDate`

---

## 2.6 PM Schedule

### 2.6.1 Fields (PMSchedule)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `scheduleNumber` | String(60, unique) | Auto-generated (prefix: PMS) |
| `planId` | Long | FK to PMPlan |
| `planNumber` | String(60) | Plan reference |
| `machineCode` | String(60) | Machine |
| `scheduledDate` / `dueDate` / `completedDate` | LocalDate | Dates |
| `status` | String(30) | UPCOMING / IN_PROGRESS / COMPLETED / SKIPPED / OVERDUE |
| `priority` | String(20) | Priority level |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | String / Instant | Audit |

### 2.6.2 Workflow Actions

| Action | Status Change |
|--------|--------------|
| `start` | UPCOMING → IN_PROGRESS |
| `complete` | IN_PROGRESS → COMPLETED (sets completedDate) |
| `skip` | any → SKIPPED |
| `overdue` | any → OVERDUE |

---

## 2.7 PM Completion

### 2.7.1 Fields (PMCompletion)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `completionNumber` | String(60, unique) | Auto-generated (prefix: PMC) |
| `scheduleId` | Long | FK to PMSchedule |
| `scheduleNumber` | String(60) | Schedule reference |
| `machineCode` | String(60) | Machine |
| `taskDescription` | String(2048) | Tasks performed |
| `performedBy` | String(60) | Technician |
| `startTime` / `endTime` | Instant | Work window |
| `durationHours` | BigDecimal | Duration |
| `labourHours` | BigDecimal | Labour hours |
| `sparePartsUsed` | TEXT | Parts consumed |
| `findings` | TEXT | Observations |
| `result` | String(30) | PASS / FAILED |
| `verified` | Boolean | Verification status |
| `status` | String(30) | DRAFT / SUBMITTED / COMPLETED / VERIFIED |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | String / Instant | Audit |

### 2.7.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `submit` | DRAFT → SUBMITTED | — |
| `complete` | SUBMITTED → COMPLETED | Sets endTime; updates PMSchedule to COMPLETED |
| `verify` | COMPLETED → VERIFIED | Sets verified=true; updates PMSchedule to COMPLETED |
| `fail` | SUBMITTED → COMPLETED | Sets result=FAILED |

---

## 2.8 Tool Service Intimation

### 2.8.1 Fields (ToolServiceIntimation → `tool_service_intimation`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `serviceNumber` | String(60, unique) | Auto-generated (prefix: TSI) |
| `toolId` | String(60) | FK to tool |
| `toolType` | String(60) | Tool type |
| `toolDescription` | String(255) | Description |
| `toolSerialNumber` | String(60) | Serial number |
| `currentLocation` | String(60) | Where the tool is |
| `reportedBy` | String(60) | Who reported |
| `serviceDate` | LocalDate | Service date |
| `problemDescription` | TEXT | Problem description |
| `serviceReason` | String(120) | Reason for service |
| `toolCondition` | String(30) | Current condition |
| `priority` | String(20) | CRITICAL / HIGH / MEDIUM / LOW |
| `vendor` | String(120) | Service vendor |
| `status` | String(30) | OPEN / ASSIGNED / IN_PROGRESS / CLOSED / CANCELLED |
| `remarks` | String(500) | Notes |

### 2.8.2 Workflow Actions

| Action | Status Change |
|--------|--------------|
| `assign` | any → ASSIGNED |
| `in-progress` | any → IN_PROGRESS |
| `close` | any → CLOSED |
| `cancel` | any → CANCELLED |

---

## 2.9 Tool Service Rectification

### 2.9.1 Fields (ToolServiceRectification → `tool_service_rectification`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `rectificationNumber` | String(60, unique) | Auto-generated (prefix: TSR) |
| `serviceId` | Long | FK to ToolServiceIntimation |
| `serviceNumber` | String(60) | Service reference |
| `toolId` | String(60) | Tool being serviced |
| `technicianCode` | String(60) | Technician |
| `rootCause` | TEXT | Root cause |
| `correctiveAction` | TEXT | Action taken |
| `serviceStart` / `serviceEnd` | Instant | Service window |
| `partsUsed` | TEXT | Parts consumed |
| `serviceCost` | BigDecimal(18,2) | Cost |
| `toolConditionAfter` | String(30) | Condition after service |
| `result` | String(30) | PASS / FAIL |
| `status` | String(30) | IN_PROGRESS / COMPLETED / CLOSED |

### 2.9.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `complete` | any → COMPLETED | Sets serviceEnd |
| `close` | any → CLOSED | — |
| `pass` | any | Sets result=PASS |
| `fail` | any | Sets result=FAIL |

---

## 2.10 Calibration Schedule

### 2.10.1 Fields (CalibrationSchedule → `calibration_schedule`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `scheduleNumber` | String(60, unique) | Auto-generated (prefix: CLS) |
| `instrumentId` | String(60) | Instrument reference |
| `instrumentName` | String(120) | Instrument name |
| `serialNumber` | String(60) | Serial number |
| `rangeValue` | String(60) | Measurement range |
| `accuracy` | String(60) | Accuracy class |
| `location` | String(60) | Location |
| `department` | String(60) | Department |
| `calibrationFrequency` | String(30) | Frequency |
| `lastCalibrationDate` | LocalDate | Last calibration |
| `nextDueDate` | LocalDate | Next due |
| `calibrationAgency` | String(120) | Agency |
| `calibrationStatus` | String(30) | VALID / UNDER_CALIBRATION / FAILED / OUT_OF_SERVICE |
| `status` | String(30) | ACTIVE / IN_PROGRESS / INACTIVE |

### 2.10.2 Workflow Actions

| Action | Status Change |
|--------|--------------|
| `send` | → IN_PROGRESS (calibrationStatus=UNDER_CALIBRATION) |
| `valid` | → ACTIVE (calibrationStatus=VALID) |
| `fail` | → INACTIVE (calibrationStatus=FAILED) |
| `deactivate` | → INACTIVE (calibrationStatus=OUT_OF_SERVICE) |

---

## 2.11 Calibration Entry

### 2.11.1 Fields (CalibrationEntry → `calibration_entry`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `calibrationNumber` | String(60, unique) | Auto-generated (prefix: CLE) |
| `scheduleId` | Long | FK to CalibrationSchedule |
| `scheduleNumber` | String(60) | Schedule reference |
| `instrumentId` / `instrumentName` | String(60/120) | Instrument |
| `calibrationDate` | LocalDate | Calibration date |
| `calibrationAgency` | String(120) | Agency |
| `certificateNumber` | String(60) | Certificate |
| `standardUsed` | String(120) | Reference standard |
| `observedValues` | TEXT | Recorded values |
| `permissibleLimits` | TEXT | Acceptable limits |
| `result` | String(30) | PASS / FAIL |
| `nextDueDate` | LocalDate | Next calibration due |
| `calibrationCost` | BigDecimal(18,2) | Cost |
| `status` | String(30) | DRAFT / SUBMITTED / COMPLETED |

### 2.11.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `submit` | DRAFT → SUBMITTED | — |
| `pass` | any → COMPLETED | Updates linked CalibrationSchedule: calibrationStatus=VALID, dates refreshed |
| `fail` | any → COMPLETED | Updates linked CalibrationSchedule: calibrationStatus=FAILED, status=INACTIVE |

---

## 2.12 Power Consumption

### 2.12.1 Fields (PowerConsumption → `power_consumption`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `entryNumber` | String(60, unique) | Auto-generated (prefix: PWC) |
| `readingDate` | LocalDate | Reading date |
| `machineCode` | String(60) | Machine |
| `meterNumber` | String(60) | Meter |
| `openingReading` / `closingReading` | BigDecimal(18,2) | Meter readings |
| `consumption` | BigDecimal(18,2) | Auto-computed: closing - opening |
| `unit` | String(20) | Default: kWh |
| `shiftCode` | String(60) | Shift |
| `department` | String(60) | Department |
| `status` | String(30) | DRAFT / VERIFIED / APPROVED |
| `remarks` | String(500) | Notes |

### 2.12.2 Workflow Actions

| Action | Status Change |
|--------|--------------|
| `verify` | DRAFT → VERIFIED |
| `approve` | VERIFIED → APPROVED |

---

## 2.13 Water Consumption

### 2.13.1 Fields (WaterConsumption → `water_consumption`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `entryNumber` | String(60, unique) | Auto-generated (prefix: WTC) |
| `readingDate` | LocalDate | Reading date |
| `meterNumber` | String(60) | Meter |
| `openingReading` / `closingReading` | BigDecimal(18,2) | Meter readings |
| `consumption` | BigDecimal(18,2) | Auto-computed: closing - opening |
| `unit` | String(20) | Default: Liters |
| `department` | String(60) | Department |
| `usageType` | String(30) | Usage type |
| `shiftCode` | String(60) | Shift |
| `status` | String(30) | DRAFT / VERIFIED / APPROVED |
| `remarks` | String(500) | Notes |

### 2.13.2 Workflow Actions

| Action | Status Change |
|--------|--------------|
| `verify` | DRAFT → VERIFIED |
| `approve` | VERIFIED → APPROVED |

---

## 2.14 Root Cause Analysis (RCA)

### 2.14.1 Fields (RootCauseAnalysis → `root_cause_analysis`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (PK) | Auto-generated |
| `rcaNumber` | String(60, unique) | Auto-generated (prefix: RCA) |
| `machineCode` | String(60) | Machine |
| `breakdownId` | Long | FK to BreakdownIntimation |
| `breakdownNumber` | String(60) | Breakdown reference |
| `problemDescription` | TEXT | Problem description |
| `immediateCause` | TEXT | Immediate cause |
| `rootCause` | TEXT | Root cause |
| `contributingCause` | TEXT | Contributing factors |
| `correctiveAction` | TEXT | Corrective action |
| `preventiveAction` | TEXT | Preventive action |
| `responsiblePerson` | String(60) | Assigned to |
| `targetDate` | LocalDate | Target completion |
| `verificationDate` | LocalDate | When verified |
| `verifiedBy` | String(60) | Verifier |
| `status` | String(30) | OPEN / VERIFIED / CLOSED |

### 2.14.2 Workflow Actions

| Action | Status Change | Side Effect |
|--------|--------------|-------------|
| `verify` | OPEN → VERIFIED | Sets verificationDate, verifiedBy |
| `close` | VERIFIED → CLOSED | — |
| `reopen` | CLOSED → OPEN | — |

---

## 2.15 Maintenance Dashboard

**Endpoint:** `GET /api/v1/maintenance/dashboard`

| Metric | Source |
|--------|--------|
| `openBreakdowns` | Breakdowns in OPEN or ASSIGNED status |
| `criticalBreakdowns` | CRITICAL priority breakdowns not CLOSED |
| `machinesDown` | Distinct machines with OPEN/ASSIGNED breakdowns |
| `pmDueToday` | PM schedules with dueDate=today and UPCOMING status |
| `pmOverdue` | PM schedules with dueDate < today and UPCOMING status |
| `pmCompleted` | PM schedules in COMPLETED status |
| `calibrationDue` | Calibration schedules due (nextDueDate ≤ today, ACTIVE) |
| `calibrationOverdue` | Calibration schedules overdue (nextDueDate < yesterday, ACTIVE) |
| `mtbf` | Mean Time Between Failures |
| `mttr` | Mean Time To Repair |
| `totalBreakdowns` | Total breakdown count |
| `totalPmSchedules` | Total PM schedule count |
| `totalCalibrations` | Total calibration count |

---

## 2.16 MTBF / MTTR Analysis

**Per-machine endpoint:** `GET /api/v1/maintenance/mtbf/{machineCode}`

Returns: `totalFailures`, `totalDowntimeMinutes`, `mtbfMinutes`, `mttrMinutes`

**Aggregate analysis endpoint:** `GET /api/v1/maintenance/analysis/mtbf`

Returns per-machine MTBF/MTTR calculations.

**Downtime analysis endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/maintenance/analysis/downtime` | Per-machine total downtime, hours, breakdown count, avg downtime per breakdown |
| `GET /api/v1/maintenance/analysis/downtime/categories` | Breakdown count grouped by category |
| `GET /api/v1/maintenance/analysis/downtime/priority` | Breakdown count grouped by priority |

---

## 2.17 API Reference

### Breakdown Intimation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/breakdowns` | List breakdowns |
| POST | `/api/v1/maintenance/breakdowns` | Create breakdown |
| GET | `/api/v1/maintenance/breakdowns/{id}` | Get breakdown |
| PUT | `/api/v1/maintenance/breakdowns/{id}` | Update breakdown |
| DELETE | `/api/v1/maintenance/breakdowns/{id}` | Delete breakdown |
| POST | `/api/v1/maintenance/breakdowns/{id}/actions/{action}` | Workflow action |

### Breakdown Rectification

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/breakdown-rectifications` | List rectifications |
| POST | `/api/v1/maintenance/breakdown-rectifications` | Create rectification |
| GET | `/api/v1/maintenance/breakdown-rectifications/{id}` | Get rectification |
| PUT | `/api/v1/maintenance/breakdown-rectifications/{id}` | Update rectification |
| DELETE | `/api/v1/maintenance/breakdown-rectifications/{id}` | Delete rectification |
| POST | `/api/v1/maintenance/breakdown-rectifications/{id}/actions/{action}` | Workflow action |

### PM Plan

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/pm-plans` | List PM plans |
| POST | `/api/v1/maintenance/pm-plans` | Create PM plan |
| GET | `/api/v1/maintenance/pm-plans/{id}` | Get PM plan |
| PUT | `/api/v1/maintenance/pm-plans/{id}` | Update PM plan |
| DELETE | `/api/v1/maintenance/pm-plans/{id}` | Delete PM plan |
| POST | `/api/v1/maintenance/pm-plans/{id}/actions/{action}` | Activate/deactivate |
| POST | `/api/v1/maintenance/pm-plans/{id}/generate-schedule` | Generate 12-month schedule |

### PM Schedule

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/pm-schedules` | List PM schedules |
| POST | `/api/v1/maintenance/pm-schedules` | Create PM schedule |
| GET | `/api/v1/maintenance/pm-schedules/{id}` | Get PM schedule |
| PUT | `/api/v1/maintenance/pm-schedules/{id}` | Update PM schedule |
| DELETE | `/api/v1/maintenance/pm-schedules/{id}` | Delete PM schedule |
| POST | `/api/v1/maintenance/pm-schedules/{id}/actions/{action}` | Workflow action |

### PM Completion

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/pm-completions` | List completions |
| POST | `/api/v1/maintenance/pm-completions` | Create completion |
| GET | `/api/v1/maintenance/pm-completions/{id}` | Get completion |
| PUT | `/api/v1/maintenance/pm-completions/{id}` | Update completion |
| DELETE | `/api/v1/maintenance/pm-completions/{id}` | Delete completion |
| POST | `/api/v1/maintenance/pm-completions/{id}/actions/{action}` | Submit/complete/verify/fail |

### Tool Service

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/tool-services` | List tool services |
| POST | `/api/v1/maintenance/tool-services` | Create tool service |
| GET | `/api/v1/maintenance/tool-services/{id}` | Get tool service |
| PUT | `/api/v1/maintenance/tool-services/{id}` | Update tool service |
| DELETE | `/api/v1/maintenance/tool-services/{id}` | Delete tool service |
| POST | `/api/v1/maintenance/tool-services/{id}/actions/{action}` | Workflow action |

### Tool Rectification

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/tool-rectifications` | List rectifications |
| POST | `/api/v1/maintenance/tool-rectifications` | Create rectification |
| GET | `/api/v1/maintenance/tool-rectifications/{id}` | Get rectification |
| PUT | `/api/v1/maintenance/tool-rectifications/{id}` | Update rectification |
| DELETE | `/api/v1/maintenance/tool-rectifications/{id}` | Delete rectification |
| POST | `/api/v1/maintenance/tool-rectifications/{id}/actions/{action}` | Workflow action |

### Calibration Schedule (Maintenance)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/calibration-schedules` | List schedules |
| POST | `/api/v1/maintenance/calibration-schedules` | Create schedule |
| GET | `/api/v1/maintenance/calibration-schedules/{id}` | Get schedule |
| PUT | `/api/v1/maintenance/calibration-schedules/{id}` | Update schedule |
| DELETE | `/api/v1/maintenance/calibration-schedules/{id}` | Delete schedule |
| POST | `/api/v1/maintenance/calibration-schedules/{id}/actions/{action}` | Send/valid/fail/deactivate |

### Calibration Entry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/calibration-entries` | List entries |
| POST | `/api/v1/maintenance/calibration-entries` | Create entry |
| GET | `/api/v1/maintenance/calibration-entries/{id}` | Get entry |
| PUT | `/api/v1/maintenance/calibration-entries/{id}` | Update entry |
| DELETE | `/api/v1/maintenance/calibration-entries/{id}` | Delete entry |
| POST | `/api/v1/maintenance/calibration-entries/{id}/actions/{action}` | Pass/fail/submit |

### Power Consumption

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/power-consumptions` | List entries |
| POST | `/api/v1/maintenance/power-consumptions` | Create entry |
| GET | `/api/v1/maintenance/power-consumptions/{id}` | Get entry |
| PUT | `/api/v1/maintenance/power-consumptions/{id}` | Update entry |
| DELETE | `/api/v1/maintenance/power-consumptions/{id}` | Delete entry |
| POST | `/api/v1/maintenance/power-consumptions/{id}/actions/{action}` | Verify/approve |

### Water Consumption

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/water-consumptions` | List entries |
| POST | `/api/v1/maintenance/water-consumptions` | Create entry |
| GET | `/api/v1/maintenance/water-consumptions/{id}` | Get entry |
| PUT | `/api/v1/maintenance/water-consumptions/{id}` | Update entry |
| DELETE | `/api/v1/maintenance/water-consumptions/{id}` | Delete entry |
| POST | `/api/v1/maintenance/water-consumptions/{id}/actions/{action}` | Verify/approve |

### Root Cause Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/rca` | List RCA |
| POST | `/api/v1/maintenance/rca` | Create RCA |
| GET | `/api/v1/maintenance/rca/{id}` | Get RCA |
| PUT | `/api/v1/maintenance/rca/{id}` | Update RCA |
| DELETE | `/api/v1/maintenance/rca/{id}` | Delete RCA |
| POST | `/api/v1/maintenance/rca/{id}/actions/{action}` | Verify/close/reopen |

### Dashboard & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/dashboard` | Dashboard summary |
| GET | `/api/v1/maintenance/mtbf/{machineCode}` | Per-machine MTBF/MTTR |
| GET | `/api/v1/maintenance/analysis/downtime` | Downtime analysis |
| GET | `/api/v1/maintenance/analysis/downtime/categories` | Breakdown by category |
| GET | `/api/v1/maintenance/analysis/downtime/priority` | Breakdown by priority |
| GET | `/api/v1/maintenance/analysis/mtbf` | MTBF analysis |

---

## 2.18 Data Model

### Database Tables

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `machine_master` | `id` (BIGSERIAL) | Machine master |
| `breakdown_intimation` | `id` (BIGSERIAL) | Breakdown reports |
| `breakdown_rectification` | `id` (BIGSERIAL) | Repair records |
| `pm_plan` | `id` (BIGSERIAL) | PM plan definitions |
| `pm_schedule` | `id` (BIGSERIAL) | PM schedule entries |
| `pm_completion` | `id` (BIGSERIAL) | PM completion records |
| `tool_master` | `id` (BIGSERIAL) | Tool master |
| `tool_service_intimation` | `id` (BIGSERIAL) | Tool service requests |
| `tool_service_rectification` | `id` (BIGSERIAL) | Tool service records |
| `calibration_schedule` | `id` (BIGSERIAL) | Calibration schedules |
| `calibration_entry` | `id` (BIGSERIAL) | Calibration results |
| `power_consumption` | `id` (BIGSERIAL) | Power readings |
| `water_consumption` | `id` (BIGSERIAL) | Water readings |
| `root_cause_analysis` | `id` (BIGSERIAL) | RCA records |

### Number Prefixes

| Entity | Prefix | Format |
|--------|--------|--------|
| Breakdown Intimation | BDI | BDI-YYYY-NNNNN |
| Breakdown Rectification | BDR | BDR-YYYY-NNNNN |
| PM Plan | PMP | PMP-YYYY-NNNNN |
| PM Schedule | PMS | PMS-YYYY-NNNNN |
| PM Completion | PMC | PMC-YYYY-NNNNN |
| Tool Service Intimation | TSI | TSI-YYYY-NNNNN |
| Tool Service Rectification | TSR | TSR-YYYY-NNNNN |
| Calibration Schedule | CLS | CLS-YYYY-NNNNN |
| Calibration Entry | CLE | CLE-YYYY-NNNNN |
| Power Consumption | PWC | PWC-YYYY-NNNNN |
| Water Consumption | WTC | WTC-YYYY-NNNNN |
| Root Cause Analysis | RCA | RCA-YYYY-NNNNN |

### Frontend Screens

| Screen | Path | Description |
|--------|------|-------------|
| MaintenanceDashboard | `/maintenance/dashboard` | Dashboard with KPIs |
| BreakdownIntimationScreen | `/maintenance/breakdown/intimation` | Create/manage breakdowns |
| BreakdownRectificationScreen | `/maintenance/breakdown/rectification` | Repair records |
| PmPlanScreen | `/maintenance/pm/plan` | PM plan definitions |
| PmScheduleScreen | `/maintenance/pm/schedule` | PM scheduling |
| PmCompletionScreen | `/maintenance/pm/completion` | PM completion records |
| ToolServiceIntimationScreen | `/maintenance/tools/intimation` | Tool service requests |
| ToolServiceRectificationScreen | `/maintenance/tools/rectification` | Tool service records |
| CalibrationScheduleScreen | `/maintenance/calibration/schedule` | Calibration scheduling |
| CalibrationEntryScreen | `/maintenance/calibration/entry` | Calibration results |
| PowerConsumptionScreen | `/maintenance/utilities/power` | Power meter readings |
| WaterConsumptionScreen | `/maintenance/utilities/water` | Water meter readings |
| MaintenanceAnalysisScreen | `/maintenance/analysis` | Downtime & reliability analysis |
| RootCauseAnalysisScreen | `/maintenance/analysis/rca` | Root cause analysis |
| MaintenanceReportsScreen | `/maintenance/reports` | Reports |

---

*End of FRS Document*

# Zyger ERP — Current State FRS (Functional Requirements Specification)

> Auto-generated from codebase analysis — 169 backend entities + frontend forms + API endpoints  
> Date: 2026-08-22

---

## 1. Architecture Overview

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 4.1.0, Java 25, Gradle |
| Frontend | React 19 + Vite 8 + TypeScript |
| Database | PostgreSQL 16 (`zyger_erp`) |
| Auth | JWT (HMAC-SHA), session in sessionStorage |
| Port | Backend: 9090, Frontend: 5173 |

### Generic Document Engine (DocumentFacade, 1154 lines)
~49 document entities extend `BaseDoc` and share:
- **Auto-numbering**: `DocSequence` table, optimistic locking per (docType, year)
- **Workflow**: `DRAFT -> SUBMITTED -> APPROVED -> POSTED` + REJECTED, CANCELLED, REOPEN
- **Soft-delete**: `@SQLRestriction("deleted = false")` on all BaseDoc children
- **Stock posting**: On POST, lines become `LedgerLine` entries via `StockService`
- **Audit logging**: `AuditEntityListener` captures field-level changes to `master_audit_log`
- **Idempotency**: `@Idempotent` + `X-Idempotency-Key` header
- **Print**: `PrintService` generates branded A4 PDFs (delivery challan, GRN)
- **Export**: CSV/Excel export via `ExportService`

### BaseDoc Fields (inherited by ~49 entities)

| Field | Type | Constraints |
|-------|------|-------------|
| id | Long | PK, IDENTITY |
| docNo | String | UNIQUE |
| status | String | DRAFT/SUBMITTED/APPROVED/POSTED/REJECTED/CANCELLED |
| docDate | LocalDate | |
| remarks | String | len(500) |
| createdBy/updatedBy | String | audit |
| createdAt/updatedAt | Instant | audit |
| deleted | Boolean | NOT NULL, default false |
| deletedAt/deletedBy | String/Instant | soft-delete |
| version | Long | @Version optimistic lock |

### BaseLine Fields (inherited by ~30 line entities)

| Field | Type | Constraints |
|-------|------|-------------|
| id | Long | PK, IDENTITY |
| lineNo | Integer | |
| itemCode | String | len(60) |
| batchNo | String | len(60) |
| heatNo | String | len(60) |
| location | String | len(60) |
| warehouse | String | len(60) |
| remarks | String | len(300) |

### Document Type Registry (DocTypes.java)

| Key | Prefix | Effect | Module |
|-----|--------|--------|--------|
| po-inward | POI | IN | Purchase |
| lo-inward | LOI | IN | Inventory |
| jo-inward | JOI | IN | Inventory |
| general-inward | GI | IN | Inventory |
| return-inward | RI | IN | Inventory |
| grn | GRN | IN | Purchase |
| stock-issue-request | SIR | OUT | Inventory |
| rm-issue | RMI | OUT | Production |
| transfer-dc | TDC | OUT+TRANSFER_IN | Inventory |
| dc-return | DCR | IN | Inventory |
| invoice-return | INVR | IN | Inventory |
| inward-return | IRET | OUT | Inventory |
| internal-return | IRET | OUT | Inventory |
| receipt-return | RRET | OUT | Inventory |
| general-issue | GISS | OUT | Inventory |
| stock-allotment | SAL | ALLOTMENT | Inventory |
| stock-release | SREL | RELEASE | Inventory |
| stock-amendment | SADJ | ADJUSTMENT | Inventory |
| physical-stock-amendment | PSADJ | ADJUSTMENT | Inventory |
| purchase-request | PR | none | Purchase |
| supplier-enquiry | SE | none | Purchase |
| supplier-quotation | SQ | none | Purchase |
| purchase-order | PO | none | Purchase |
| job-order | JO | none | Purchase |
| sales-order | SO | none | Sales |
| proforma-invoice | PI | none | Sales |
| sales-dc | SDC | none | Sales |
| sales-invoice | SI | none | Sales |

### 169 Backend Entities

| # | Entity | Table | Extends |
|---|--------|-------|---------|
| 1 | AppUser | app_users | — |
| 2 | Role | roles | — |
| 3 | UserRole | user_roles | — |
| 4 | BinMaster | bin_master | — |
| 5 | RackMaster | rack_master | — |
| 6 | StoreMaster | store_master | — |
| 7 | LocationMaster | location_master | — |
| 8 | ItemGroupMaster | item_group_master | — |
| 9 | UomMaster | uom_master | — |
| 10 | ItemMaster | item_master | — |
| 11 | PartyMaster | party_master | — |
| 12 | MachineMaster | machine_master | — |
| 13 | ProcessMaster | process_master | — |
| 14 | ProcessGroupMaster | process_group_master | — |
| 15 | WorkCenterMaster | work_center_master | — |
| 16 | OperationMaster | operation_master | — |
| 17 | ShiftMaster | shift_master | — |
| 18 | InstrumentMaster | instrument_master | — |
| 19 | ToolMaster | tool_master | — |
| 20 | CompanyInfo | company_info | — |
| 21 | DocSequence | doc_sequence | — |
| 22 | MasterAuditLog | master_audit_log | — |
| 23 | LoginAuditLog | login_audit_log | — |
| 24 | PurchaseRequest | purchase_request | BaseDoc |
| 25 | PurchaseRequestLine | purchase_request_line | BaseLine |
| 26 | SupplierEnquiry | supplier_enquiry | BaseDoc |
| 27 | SupplierEnquiryLine | supplier_enquiry_line | BaseLine |
| 28 | SupplierQuotation | supplier_quotation | BaseDoc |
| 29 | SupplierQuotationLine | supplier_quotation_line | BaseLine |
| 30 | PurchaseOrder | purchase_order | BaseDoc |
| 31 | PurchaseOrderLine | purchase_order_line | BaseLine |
| 32 | JobOrder | job_order | BaseDoc |
| 33 | JobOrderLine | job_order_line | BaseLine |
| 34 | PoInward | po_inward | BaseDoc |
| 35 | PoInwardLine | po_inward_line | BaseLine |
| 36 | LoInward | lo_inward | BaseDoc |
| 37 | JoInward | jo_inward | BaseDoc |
| 38 | GeneralInward | general_inward | BaseDoc |
| 39 | ReturnInward | return_inward | BaseDoc |
| 40 | Grn | grn | BaseDoc |
| 41 | GrnLine | grn_line | BaseLine |
| 42 | StockIssueRequest | stock_issue_request | BaseDoc |
| 43 | RmIssue | rm_issue | BaseDoc |
| 44 | RmIssueLine | rm_issue_line | BaseLine |
| 45 | GeneralIssue | general_issue | BaseDoc |
| 46 | GeneralDc | general_dc | BaseDoc |
| 47 | GeneralDcLine | general_dc_line | BaseLine |
| 48 | SalesDc | sales_dc | BaseDoc |
| 49 | SalesDcLine | sales_dc_line | BaseLine |
| 50 | JoDc | jo_dc | BaseDoc |
| 51 | TransferDc | transfer_dc | BaseDoc |
| 52 | SupplierInvoice | supplier_invoice | BaseDoc |
| 53 | SupplierInvoiceLine | supplier_invoice_line | BaseLine |
| 54 | DcReturn | dc_return | BaseDoc |
| 55 | DcReturnLine | dc_return_line | BaseLine |
| 56 | InvoiceReturn | invoice_return | BaseDoc |
| 57 | InwardReturn | inward_return | BaseDoc |
| 58 | InternalReturn | internal_return | BaseDoc |
| 59 | ReceiptReturn | receipt_return | BaseDoc |
| 60 | StockAllotment | stock_allotment | BaseDoc |
| 61 | StockRelease | stock_release | BaseDoc |
| 62 | StockAmendment | stock_amendment | BaseDoc |
| 63 | PhysicalStockAmendment | physical_stock_amendment | BaseDoc |
| 64 | SalesOrder | sales_order | BaseDoc |
| 65 | SalesOrderLine | sales_order_line | BaseLine |
| 66 | ProformaInvoice | proforma_invoice | BaseDoc |
| 67 | ProformaInvoiceLine | proforma_invoice_line | BaseLine |
| 68 | SalesInvoice | sales_invoice | BaseDoc |
| 69 | SalesInvoiceLine | sales_invoice_line | BaseLine |
| 70 | ProductionBom | production_bom | BaseDoc |
| 71 | ProductionBomLine | production_bom_line | BaseLine |
| 72 | RouteSheet | route_sheet | BaseDoc |
| 73 | RouteSheetLine | route_sheet_line | BaseLine |
| 74 | WorkOrder | work_order | BaseDoc |
| 75 | WorkOrderOperation | work_order_operation | BaseLine |
| 76 | WorkOrderMaterial | work_order_material | BaseLine |
| 77 | ShopFloorEntry | shop_floor_entry | BaseDoc |
| 78 | JobCard | job_card | BaseDoc |
| 79 | SubJob | sub_job | — |
| 80 | ProductionEntry | production_entry | BaseDoc |
| 81 | ProductionReturn | production_return | BaseDoc |
| 82 | ProductConversion | product_conversion | BaseDoc |
| 83 | IdleTime | idle_time | BaseDoc |
| 84 | LogSheet | log_sheet | BaseDoc |
| 85 | LogSheetActivity | log_sheet_activity | — |
| 86 | MaterialPlan | material_plan | — |
| 87 | DispatchPlan | dispatch_plan | — |
| 88 | DispatchPlanLine | dispatch_plan_line | — |
| 89 | MachineLoadPlan | machine_load_plan | — |
| 90 | EngineeringChange | engineering_change | — |
| 91 | CostEstimation | cost_estimation | — |
| 92 | CostEstimationLine | cost_estimation_line | — |
| 93 | GapAnalysisRun | gap_analysis_run | — |
| 94 | GapAnalysisResult | gap_analysis_result | — |
| 95 | QualityInspection | quality_inspection | BaseDoc |
| 96 | QualityInspectionLine | quality_inspection_line | — |
| 97 | NonConformanceReport | non_conformance_report | BaseDoc |
| 98 | QualityConcession | quality_concession | BaseDoc |
| 99 | QualityCapa | quality_capa | BaseDoc |
| 100 | QualityEightD | quality_8d | BaseDoc |
| 101 | QualityCustomerComplaint | quality_customer_complaint | BaseDoc |
| 102 | QualityTestCertificate | quality_test_certificate | BaseDoc |
| 103 | QualityCalibrationRecord | quality_calibration_record | BaseDoc |
| 104 | CalibrationInstrument | calibration_instrument | — |
| 105 | BreakdownIntimation | breakdown_intimation | — |
| 106 | BreakdownRectification | breakdown_rectification | — |
| 107 | PmPlan | pm_plan | — |
| 108 | PmSchedule | pm_schedule | — |
| 109 | PmCompletion | pm_completion | — |
| 110 | ToolService | tool_service | — |
| 111 | ToolRectification | tool_rectification | — |
| 112 | CalibrationSchedule | calibration_schedule | — |
| 113 | CalibrationEntry | calibration_entry | — |
| 114 | RootCauseAnalysis | root_cause_analysis | — |
| 115 | PowerConsumption | power_consumption | — |
| 116 | WaterConsumption | water_consumption | — |
| 117 | LedgerLine | ledger_line | — |
| 118 | StockBalance | stock_balance | — |

### Cross-Cutting Infrastructure

| Component | Behavior |
|-----------|----------|
| CacheConfig | Caffeine, max 2000 entries, expire-after-write 10 min |
| CorrelationIdFilter | X-Request-Id header, MDC correlationId |
| GlobalExceptionHandler | 400/403/409/422/500 mapped |
| JacksonConfig | FAIL_ON_NULL_FOR_PRIMITIVES disabled |
| Scheduled Jobs | None (no @Scheduled anywhere) |

---

## 2. Authentication & RBAC

### Login Flow
- **Endpoint**: POST /api/auth/login -> {username, password} -> JWT token + username + role
- **Lockout**: 5 failed attempts -> 15-minute lockout
- **Demo**: demo / demo123
- **Frontend**: LoginPage.tsx with login/signup/forgot modes, demo button, remember-me
- **Token storage**: sessionStorage (zyger-access-token, zyger-user)
- **401 interceptor**: Clears session, redirects to /login
- **403 interceptor**: Shows permission error toast

### Backend RBAC
- @RequirePermission(module, screen, action) annotation + AOP RbacAspect
- JwtAuthFilter -> RbacService -> ROLE_* + PERM_module:screen:action authorities
- ADMIN role bypasses all permission checks
- DataSeeder (dev profile) seeds full matrix: 9 modules x ~100 screens x 9 actions x 16 roles

### Frontend RBAC (src/config/rbac.ts)
- 9 Modules: master, inventory, purchase, sales, planning, production, quality, maintenance, reports, crm, accounts, admin
- 9 Actions: View, Create, Edit, Delete, Approve, Reject, Cancel, Print, Export
- 13 FRS Roles: Admin, Management, Purchase, Store, Sales, Planning, Production, Quality, Maintenance, Accounts, Supervisor, Operator, Inspector
- Hooks: useAuth() -> can(module, action), canAny(module, actions[]), hasModule(module)
- Nav filtering: Navigation filtered by hasModule()
- Button gating: Submit/Approve/Reject/Cancel buttons wrapped with can() on ~25 screens

### Screens with RBAC Button Gating

| Screen | Module | Gated Actions |
|--------|--------|---------------|
| PurchaseDocScreen | purchase | Submit/Approve/Reject/Cancel |
| SalesDocScreen | sales | Submit/Approve/Reject/Cancel |
| QualityDocScreen | quality | Submit/Approve/Reject |
| QualityForm | quality | Submit/Approve/Reject |
| WorkOrderScreen | planning | Submit/Approve/Reject/Cancel |
| EcrScreen | planning | Approve/Reject |
| JobCardScreen | production | Release |
| ProductionEntryScreen | production | Submit/Approve/Reject |
| WaterConsumptionScreen | maintenance | Approve |
| PowerConsumptionScreen | maintenance | Approve |
| PmCompletionScreen | maintenance | Submit |
| UserScreen | admin | Create/Edit/Delete |

---

## 3. Master Module

### 3.1 AppUser (User Management)
Entity: app_users | Frontend: UserScreen.tsx

| Field | Type | DB Constraints | Form |
|-------|------|---------------|------|
| username | String | UNIQUE, NN, len(80) | text input, required |
| password | String | NN, len(100) | password, min 8 chars |
| role | String | len(40) | dropdown: 13 FRS roles |
| fullName | String | len(120) | text input |
| email | String | len(120) | email input |
| phone | String | len(20) | text input |
| department | String | len(60) | text input |
| designation | String | len(60) | text input |
| active | Boolean | default true | toggle switch |

Features: Pagination 15/page, search, CSV export, AuditHistoryDrawer, RBAC-gated

### 3.2 Item Master
Entity: item_master (3 variants) | Frontend: PurchasableItemScreen.tsx (~150 fields)
API: GET/POST/PUT/DELETE /api/master/items, GET /api/master/items/next-code?itemType=PURCHASABLE

Core: code (auto-gen), name, description, groupType (PURCHASABLE/MANUFACTURABLE/CUSTOMER_SUPPLIED), itemGroup, category, uom, gstRate, hsnCode, partNumber, drawingNumber, bomMaintain
Purchase: minOrderQty, maxOrderQty, leadTimeDays, reorderLevel, safetyStock, defaultSupplier, inspectionRequired, batchRequired, heatRequired
Sales: sellingPrice, mrp, minSellingPrice, customerPartNumber
Engineering: weight, density, length, width, height, material, tolerance, surfaceFinish, heatTreatment
Inventory: defaultLocation, minStock, maxStock, reorderQty, shelfLifeDays, storageCondition
Sub-tables (6): Division-wise Locations, Accessories, UOM Conversions, Alternative Items, Customer Parts, Supplier Parts

### 3.3 Party Master
Entity: party_master | API: GET/POST/PUT/DELETE /api/master/parties?kind=CUSTOMER|SUPPLIER|SUBCONTRACTOR

Fields: kind, code (auto-gen), name, contactPerson, phone, email, gstin, pan, cin, address, city, state, pincode, country (default India), bankName, bankAccount, bankIfsc, bankBranch, creditDays, creditLimit, paymentTerms, tdsPercentage, visibleTo, active

Features: CSV export, AuditHistoryDrawer, search, pagination

### 3.4 Location/Store/Rack/Bin Master
API: GET/POST/PUT/DELETE /api/inventory/locations
Fields: code (auto-gen), name, store (@ManyToOne), rack (@ManyToOne), bin (@ManyToOne), active

### 3.5 Machine Master
API: GET/POST/PUT/DELETE /api/master/machines
Fields: code (auto-gen), name, type, make, model, serialNumber, location, department, capacity, hourlyRate, installationDate, tailstock, status (ACTIVE/MAINTENANCE/IDLE), active

### 3.6 Other Masters

| Entity | API | Key Fields |
|--------|-----|------------|
| UOM | /api/master/uoms | code, name, active |
| ProcessGroup | /api/master/process-groups | code, name, description |
| Process | /api/master/processes | code, name, processGroup |
| WorkCenter | /api/master/work-centers | code, name, type, capacity |
| Operation | /api/master/operations | code, name, process, standardTime |
| Shift | /api/master/shifts | code, name, startTime, endTime |
| Instrument | /api/master/instruments | code, name, type, make, serialNo |
| Tool | /api/master/tools | code, name, type, make |
| ItemGroup | /api/master/item-groups | code, name, defaultUom |

### 3.7 Company Info
API: GET/PUT /api/master/company-info
Fields: companyName, registeredAddress, deliveryAddress, city, state, pincode, country, phone, mobile, email, website, gstin, pan, cin, tanNo, pfNo, esiNo, iecCode, bankName, bankAccount, bankIfsc, bankBranch, logoPath, eInvoiceUser, apiKey, accessToken

---

## 4. Purchase Module

### 4.1 Purchase Request (PR)
Entity: PurchaseRequest (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/purchase/purchase-request

| Header Field | Type | Auto-fill |
|-------------|------|-----------|
| docNo | String | Auto: PR-YYYY-NNNNN |
| docDate | LocalDate | default today |
| status | String | default DRAFT |
| department | String | - |
| requestedBy | String | current user |
| justification | String | - |
| priority | String | NORMAL/HIGH/URGENT |

| Line Field | Type | Auto-fill |
|-----------|------|-----------|
| itemCode | String | dropdown from /master/items |
| itemName | String | auto from itemCode |
| uom | String | auto from item |
| qty | BigDecimal | - |
| requiredDate | LocalDate | - |
| estimatedPrice | BigDecimal | - |
| purpose | String | - |

Workflow: DRAFT -> SUBMITTED -> APPROVED

### 4.2 Supplier Enquiry
Entity: SupplierEnquiry (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/purchase/supplier-enquiry

Header: docNo (SE-YYYY-NNNNN), docDate, status, prReference, enquiryDescription
Lines: itemCode, itemName, uom, qty, specification
Auto-fill: prReference links to PR -> pulls items + quantities from PR lines

### 4.3 Supplier Quotation
Entity: SupplierQuotation (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/purchase/supplier-quotation

Header: docNo (SQ-YYYY-NNNNN), docDate, status, supplier, supplierCode, enquiryReference, quotationDate, validUpto, paymentTerms, deliveryTerms, incoterms
Lines: itemCode, itemName, uom, qty, unitPrice, leadTimeDays, discount, taxRate, netAmount
Auto-fill: enquiryReference -> pulls items from Enquiry; supplier selection -> fills supplierCode

### 4.4 Purchase Order (PO)
Entity: PurchaseOrder (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/purchase/purchase-order

Header: docNo (PO-YYYY-NNNNN), docDate, status, supplier, supplierCode, quotationReference, prReference, expectedDeliveryDate, paymentTerms, deliveryTerms, shippingAddress, billingAddress, qcRequired
Lines: itemCode, itemName, uom, orderQty, unitPrice, discount, taxRate, netAmount, deliveryDate, location
Auto-fill: quotationReference -> pulls items/prices from SQ; supplier -> fills supplierCode; PR reference -> pulls items; shippingAddress/companyAddress from CompanyInfo

Workflow: DRAFT -> SUBMITTED -> APPROVED -> (Stock impact on PO Inward)

### 4.5 Job Order
Entity: JobOrder (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/purchase/job-order

Header: docNo (JO-YYYY-NNNNN), docDate, status, supplier, supplierCode, soReference, expectedDeliveryDate
Lines: itemCode, itemName, uom, orderQty, unitPrice, processDescription
Auto-fill: supplier -> supplierCode; soReference -> pulls items from SO

### 4.6 PO Inward
Entity: PoInward (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/inventory/documents/po-inward

Header: docNo (POI-YYYY-NNNNN), docDate, status, supplier, supplierCode, poReference, vehicleNo, challanNo, qcRequired
Lines: itemCode, itemName, uom, orderedQty, receivedQty, acceptedQty, rejectedQty, location, batchNo, heatNo, unitPrice
Auto-fill: poReference -> pulls items/qty/prices from PO; supplier -> supplierCode; orderedQty from PO; over-receipt validation vs PO qty
Stock Impact: IN on POST; QC_HOLD if item.inspectionRequired or header.qcRequired

### 4.7 GRN (Goods Receipt Note)
Entity: Grn (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/inventory/store-receipt/grn

Header: docNo (GRN-YYYY-NNNNN), docDate, status, supplier, supplierCode, inwardReference
Lines: itemCode, itemName, uom, receivedQty, inspectedQty, acceptedQty, rejectedQty, location, batchNo, heatNo
Auto-fill: inwardReference -> pulls items from PO Inward; GRN accepted+rejected <= inspectedQty validation
Stock Impact: IN on POST; QC_HOLD if inspectionRequired

### 4.8 PO Schedule
Frontend: PoSchedulePage.tsx
API: GET /api/v1/purchase/purchase-order (for schedule data)

Fields: poNo, refDocNo, supplier, supplierCode, itemCode, itemDescription, uom, unitPrice, totalAmount, scheduledQty, scheduledDate, receivedQty, pendingQty, location, priority, status
Auto-fill: refDocNo lookup from PO; supplier/item from PO lines

### 4.9 Supplier Invoice
Entity: SupplierInvoice (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/inventory/supplier-invoice/purchase-invoice

Header: docNo, docDate, status, supplier, supplierCode, invoiceNo, invoiceDate, poReference
Lines: itemCode, itemName, uom, qty, unitPrice, taxRate, netAmount
Auto-fill: poReference -> items/prices from PO; supplier -> supplierCode

---

## 5. Sales Module

### 5.1 Sales Order (SO)
Entity: SalesOrder (extends BaseDoc) | @DocKey("sales-order")
API: GET/POST/PUT/DELETE /api/v1/sales/sales-order

Header: docNo (SO-YYYY-NNNNN), docDate, status, customer, customerCode, quotationReference, expectedDeliveryDate, shippingAddress, billingAddress
Lines: itemCode, itemName, uom, orderQty, unitPrice, discount, taxRate, netAmount, deliveredQty, pendingQty
Auto-fill: quotationReference -> items/prices from PI; customer -> customerCode; company address for shipping/billing
Chaining: SO approved -> creates dispatch availability; DC consumes from SO; Invoice from DC
Overdue Detection: APPROVED/PARTIALLY_DISPATCHED SOs with past expectedDeliveryDate

### 5.2 Proforma Invoice (PI)
Entity: ProformaInvoice (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/sales/proforma-invoice

Header: docNo (PI-YYYY-NNNNN), docDate, status, customer, customerCode, soReference
Lines: itemCode, itemName, uom, qty, unitPrice, discount, taxRate, netAmount
Auto-fill: soReference -> items from SO; customer -> customerCode

### 5.3 Sales Delivery Challan (DC)
Entity: SalesDc (extends BaseDoc) | @DocKey("sales-dc")
API: GET/POST/PUT/DELETE /api/v1/sales/sales-dc

Header: docNo (SDC-YYYY-NNNNN), docDate, status, customer, customerCode, soReference, vehicleNo, transporter, shippingAddress
Lines: itemCode, itemName, uom, dcQty, soLineId, batchNo, location
Auto-fill: soReference -> pulls undelivered items from SO; customer -> customerCode; shippingAddress from customer master
Stock Impact: OUT on POST

### 5.4 Sales Invoice
Entity: SalesInvoice (extends BaseDoc) | @DocKey("sales-invoice")
API: GET/POST/PUT/DELETE /api/v1/sales/sales-invoice

Header: docNo (SI-YYYY-NNNNN), docDate, status, customer, customerCode, dcReference, invoiceType (TAXABLE/EXEMPTED/EXPORT)
Lines: itemCode, itemName, uom, qty, unitPrice, discount, taxRate, cgst, sgst, igst, netAmount
Auto-fill: dcReference -> items from DC; customer -> customerCode

### 5.5 SO Schedule
Frontend: SoSchedulePage.tsx (if exists)
Fields: soNo, refDocNo, customer, customerCode, itemCode, itemDescription, uom, unitPrice, totalAmount, scheduledQty, scheduledDate, dispatchedQty, pendingQty, priority, status

---

## 6. Inventory Module

### 6.1 Stock Issue Request (SIR)
Entity: StockIssueRequest (extends BaseDoc) | @DocKey("stock-issue-request")
API: GET/POST/PUT/DELETE /api/inventory/stock-issue/stock-issue-request

Header: docNo (SIR-YYYY-NNNNN), docDate, status, department, requestedBy, purpose
Lines: itemCode, itemName, uom, requestedQty, issuedQty, location, batchNo
Stock Impact: OUT on POST

### 6.2 RM Issue (Raw Material Issue)
Entity: RmIssue (extends BaseDoc) | @DocKey("rm-issue")
API: GET/POST/PUT/DELETE /api/inventory/stock-issue/rm-issue

Header: docNo (RMI-YYYY-NNNNN), docDate, status, joReference, jobCardReference, purpose
Lines: itemCode, itemName, uom, issuedQty, location, batchNo, joLineId
Auto-fill: joReference -> items from Job Order; jobCardReference -> items from Job Card
Domain Validation: rm-issue qty <= SIR (APPROVED/POSTED) balance per item/batch
Stock Impact: OUT on POST

### 6.3 General Issue
Entity: GeneralIssue (extends BaseDoc) | @DocKey("general-issue")
Header: docNo, docDate, status, department, purpose
Lines: itemCode, itemName, uom, qty, location, batchNo
Stock Impact: OUT on POST

### 6.4 Delivery Challan (5 types)
All under /api/inventory/delivery-challan/{type}

| Type | Entity | DocKey | Purpose |
|------|--------|--------|---------|
| sales-dc | SalesDc | sales-dc | Customer delivery |
| jo-dc | JoDc | jo-dc | Job order subcontractor |
| general-dc | GeneralDc | general-dc | Generic dispatch |
| return-dc | (return flow) | - | Return to party |
| transfer-dc | TransferDc | transfer-dc | Inter-location transfer |

**Transfer DC**: OUT at source + TRANSFER_IN at destination location
Stock Impact: All DCs -> OUT on POST

### 6.5 Supplier Invoice (2 types)
| Type | API Path | Purpose |
|------|----------|---------|
| purchase-invoice | /api/inventory/supplier-invoice/purchase-invoice | PO-based invoice |
| subcontract-invoice | /api/inventory/supplier-invoice/subcontract-invoice | Subcontract invoice |

### 6.6 Return Management (6 types)
| Type | API Path | Purpose |
|------|----------|---------|
| dc-return | /api/inventory/return-management/dc-return | Customer DC return |
| invoice-return | /api/inventory/return-management/invoice-return | Invoice return |
| inward-return | /api/inventory/return-management/inward-return | Inward return |
| internal-return | /api/inventory/return-management/internal-return | Internal transfer return |
| received-against-issue | /api/inventory/return-management/received-against-issue | Against issue |
| receipt-return | /api/inventory/return-management/receipt-return | Receipt return |

**DC Return** (DcReturn entity):
Header: customer, customerCode, dcNo, originalDcNumber, originalDcDate, returnDate, reason, transportDetails
Lines: itemCode, itemName, originalDcQty, currentReturnQty, uom, returnReason, materialCondition
Domain Validation: cumulative returned qty <= original posted DC qty per item/batch
Stock Impact: IN on POST; disposition-based (PENDING_INSPECTION -> QC_HOLD, REWORK -> QC_HOLD, SCRAP -> SCRAP)

### 6.7 Stock Allotment
Entity: StockAllotment | @DocKey("stock-allotment")
API: /api/inventory/stock-allotment

Allocates stock against a demand (SO/JO). Stock released via StockRelease consumes from allotment balance.
Domain Validation: release qty <= posted allotment balance

### 6.8 Stock Amendment / Physical Stock Amendment
| Type | DocKey | Purpose |
|------|--------|---------|
| stock-amendment | stock-amendment | Corrective adjustment |
| physical-stock-amendment | physical-stock-amendment | Physical count adjustment |

Both: reason code required (INV-ADJ-01)
Stock Impact: ADJUST (diffs against currentOnHand)

### 6.9 Stock Balance
API: GET /api/inventory/stock/balance?item&location&batch
Response: { onHand, reserved, qcHold, available } where available = onHand - reserved - qcHold

API: GET /api/inventory/stock/summary

---

## 7. Planning Module

### 7.1 Production BOM (Bill of Materials)
Entity: ProductionBom (extends BaseDoc) | @DocKey("production-bom")
API: GET/POST/PUT/DELETE /api/v1/planning/production-bom

Header: docNo, docDate, status, parentItemCode, parentItemName, revision, description
Lines (16 fields): itemCode, itemName, qty, uom, issueMethod, supplyType, childBomId, location, remarks
Auto-fill: parentItemCode -> pulls parent item details

### 7.2 Route Sheet
Entity: RouteSheet (extends BaseDoc) | @DocKey("route-sheet")
API: GET/POST/PUT/DELETE /api/v1/planning/route-sheet

Header: docNo, docDate, status, parentItemCode, parentItemName, revision
Lines (19 fields): opSequence, operationCode, operationName, machineCode, workCenter, setupTime, cycleTime, yield%, sub contractor, remarks

### 7.3 Work Order
Entity: WorkOrder (extends BaseDoc) | @DocKey("work-order")
API: GET/POST/PUT/DELETE /api/v1/planning/work-order

Header (24 fields): docNo, docDate, status, itemCode, itemName, bomId, routeId, plannedQty, startDate, endDate, priority, soReference
Operations Tab (18 fields): opSequence, operationName, machineCode, plannedTime
Materials Tab (14 fields): itemCode, itemName, requiredQty, issuedQty, uom, location

Auto-fill: bomId + routeId -> POST /work-order/{id}/populate auto-populates operations + materials from BOM + Route Sheet
Workflow: DRAFT -> SUBMITTED -> APPROVED -> RELEASED -> IN_PROCESS -> COMPLETED -> CLOSED

### 7.4 Shop Floor Entry
Entity: ShopFloorEntry (extends BaseDoc) | @DocKey("shop-floor-entry")
API: GET/POST/PUT/DELETE /api/v1/planning/shop-floor-entry

### 7.5 Engineering Change Request (ECR/ECO)
Entity: engineering_change
API: GET/POST/PUT/DELETE /api/v1/planning/engineering-changes

Fields: ecrNumber, ecoNumber, changeType, itemCode, itemDescription, currentRevision, proposedRevision, descriptionOfChange, reasonForChange, priority, status, bomImpact, routeImpact, qualityImpact, inventoryImpact, effectiveDate, requestedBy, reviewedBy, approvedBy

### 7.6 Material Planning (MRP)
API: POST /api/v1/planning/material-plans/run
Fields: planningHorizonStart, planningHorizonEnd, scope, scopeValue

### 7.7 Machine Load Plan
API: POST /api/v1/planning/machine-load-plans/generate

### 7.8 Gap Analysis
API: POST /api/v1/planning/gap-analysis/run
Computes material gaps against RELEASED/IN_PROCESS work orders

### 7.9 Cost Estimation
API: GET/POST /api/v1/planning/cost-estimations
Lines: lineType (MATERIAL/MACHINE/LABOUR/TOOLING/SUBCONTRACT), qtyRequired, ratePerUnit, machineHourRate, setupTimeHrs, cycleTimeHrs
API: POST /api/v1/planning/cost-estimations/{id}/calculate

### 7.10 Dispatch Plan
API: GET/POST /api/v1/planning/dispatch-plans
Fields: dispatchNumber, customerId, customerName, deliveryAddress, transportMode, transporterName, vehicleNumber
Lines: soNumber, woNumber, itemCode, dispatchQty, packingType, numberOfPackages, weightKg

### 7.11 FG Possible Check
API: POST /api/v1/planning/fg-possible/check
Checks if finished goods are possible given current stock + WIP

---

## 8. Production Module

### 8.1 Job Card
Entity: JobCard (extends BaseDoc) | @DocKey("job-card")
API: GET/POST/PUT/DELETE /api/v1/production/job-cards
POST /api/v1/production/job-cards/from-work-order (auto-create from WO)

Header: docNo (JC-YYYY-NNNNN), docDate, status, workOrderReference, itemCode, itemName, plannedQty, completedQty, machineCode, operatorCode, shiftCode
Sub-jobs: CRUD on /api/v1/production/job-cards/{id}/subjobs

Workflow: DRAFT -> RELEASED -> IN_PROGRESS -> COMPLETED -> CLOSED
Actions: release, start, hold, resume, complete, close (RBAC-gated)

### 8.2 Production Entry
Entity: ProductionEntry (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/production/entries

Fields: docNo, docDate, status, jobCardReference, itemCode, itemName, machineCode, operatorCode, shiftCode, producedQty, goodQty, reworkQty, rejectedQty, scrapQty, qualityStatus (PENDING/PASS/FAIL)
Auto-fill: jobCardReference -> pulls items, machine from Job Card
Workflow: DRAFT -> SUBMITTED -> APPROVED

### 8.3 Production Return
Entity: ProductionReturn (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/production/returns

Fields: docNo, docDate, status, productionEntryReference, itemCode, uom, returnQty, returnReason, condition, originalIssueReference
Auto-fill: productionEntryReference -> pulls item details

### 8.4 Product Conversion
Entity: ProductConversion (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/production/conversions

Fields: docNo, docDate, status, inputItemCode, inputItemName, outputItemCode, outputItemName, inputQty, outputQty, processLossQty, scrapQty, uom, conversionRate

### 8.5 Idle Time
Entity: IdleTime (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/production/idle-time

Fields: docNo, docDate, status, machineCode, operatorCode, shiftCode, idleStartTime, idleEndTime, idleMinutes, idleReason (12 IDLE_REASONS enum), description
Actions: verify (on idle time entry)

### 8.6 Log Sheet
Entity: LogSheet (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/production/log-sheets
Activities: CRUD on /api/v1/production/log-sheets/{id}/activities

Header: docNo (PLS-YYYY-NNNNN), docDate, status, machineCode, operatorCode, shiftCode
Activities (13 types): activityType, startTime, endTime, duration, description, remarks

### 8.7 Production Dashboard
API: GET /api/v1/production/dashboard
16 KPIs: job cards by status, entries approved/pending/quality-pending, produced qty, conversions, returns, log sheets, idle time

### 8.8 Production Pending
API: GET /api/v1/production/pending
Shows pending work orders sorted overdue-first with priority badges

---

## 9. Quality Module

### 9.1 Quality Inspection
Entity: QualityInspection (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/quality/inspections

Header: docNo, docDate, status, inspectionType (INCOMING/IN-PROCESS/FINAL/SAMPLE/OPENING/CLOSING/SPECIAL/RANDOM), sourceDocumentNo, supplier/customer, itemCode, itemName
Lines: parameterName, specification, actualValue, result (PASS/FAIL/NA), measuredBy, instrumentUsed

Workflow: DRAFT -> STARTED -> SUBMITTED -> APPROVED/REJECTED/HOLD -> CLOSED
Actions: start, submit, decision, approve, hold, release-hold, cancel, reopen, close, save-measurements

### 9.2 Quality Gate (via Inspections)
POST /api/v1/quality/inspections/{id}/decision
POST /api/v1/quality/inspections/{id}/approve
POST /api/v1/quality/inspections/{id}/hold
POST /api/v1/quality/inspections/{id}/release-hold

### 9.3 Non-Conformance Report (NCR)
Entity: NonConformanceReport (extends BaseDoc)
API: GET/POST/PUT/DELETE /api/v1/quality/ncrs

Fields: docNo, docDate, status, ncrType (INTERNAL/SUPPLIER/CUSTOMER/PROCESS), itemCode, description, severity (CRITICAL/MAJOR/MINOR), rootCause, correctiveAction, preventiveAction, assignedTo, targetDate, actualClosureDate

### 9.4 Quality Concession
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-concession

### 9.5 Quality CAPA
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-capa

### 9.6 Quality 8D
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-8d

### 9.7 Quality Customer Complaint
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-customer-complaint

### 9.8 Quality Test Certificate
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-test-certificate

### 9.9 Quality Calibration Record
API: GET/POST/PUT/DELETE /api/v1/quality/docs/quality-calibration-record

### 9.10 Calibration Instruments
API: GET/POST /api/v1/quality/calibration/instruments
API: POST /api/v1/quality/calibration/instruments/{id}/save, /retire
API: GET /api/v1/quality/calibration/stats

### 9.11 Quality Dashboard
API: GET /api/v1/quality/dashboard
8 KPIs: first-pass yield %, pending-by-type table, inspection counts

---

## 10. Maintenance Module

### 10.1 Breakdown Intimation
Entity: breakdown_intimation
API: GET/POST/PUT/DELETE /api/v1/maintenance/breakdowns

Fields: breakdownNumber, breakdownDate, breakdownTime, machineCode, machineStatus, reportedBy, operatorCode, shiftCode, breakdownCategory, cncAlarmCode, problemDescription, productionImpact, priority, status, breakdownStartTime, assignedTo, diagnosis, remarks
Actions: assign, diagnose, resolve, close

### 10.2 Breakdown Rectification
Entity: breakdown_rectification
API: GET/POST/PUT/DELETE /api/v1/maintenance/breakdown-rectifications

Fields: rectificationNumber, breakdownId, breakdownNumber, machineCode, technicianCode, failureCause, correctiveAction, sparePartsUsed, labourHours, startTime, endTime, downtimeMinutes, externalVendor, serviceCost, testingResult (PASS/FAIL), status
Auto-fill: breakdownId -> pulls machineCode, breakdownNumber from breakdown intimation

### 10.3 PM Plan
API: GET/POST/PUT/DELETE /api/v1/maintenance/pm-plans
API: POST /api/v1/maintenance/pm-plans/{id}/generate-schedule (generates PM schedules from plan)

### 10.4 PM Schedule
Entity: pm_schedule
API: GET/POST/PUT/DELETE /api/v1/maintenance/pm-schedules

Fields: scheduleNumber, machineCode, maintenanceType, frequency, plannedDate, assignedTo, status
Auto-fill: generated from PM Plan

### 10.5 PM Completion
Entity: pm_completion
API: GET/POST/PUT/DELETE /api/v1/maintenance/pm-completions

Fields: completionNumber, scheduleId, scheduleNumber, machineCode, completedBy, completionDate, result (PASS/PASS_WITH_OBSERVATION/REQUIRES_REPAIR/FAILED), workDone, sparePartsUsed, labourHours, cost, status
Auto-fill: scheduleId -> pulls machineCode, scheduleNumber from PM Schedule
Actions: submit (RBAC-gated with can('maintenance', 'Edit'))

### 10.6 Tool Service
Entity: tool_service
API: GET/POST/PUT/DELETE /api/v1/maintenance/tool-services

### 10.7 Tool Rectification
Entity: tool_rectification
API: GET/POST/PUT/DELETE /api/v1/maintenance/tool-rectifications

### 10.8 Calibration Schedule
Entity: calibration_schedule
API: GET/POST/PUT/DELETE /api/v1/maintenance/calibration-schedules

Fields: scheduleNumber, instrumentId, instrumentName, serialNumber, rangeValue, accuracy, location, department, calibrationFrequency, lastCalibrationDate, nextDueDate, calibrationAgency, calibrationStatus, status

### 10.9 Calibration Entry
Entity: calibration_entry
API: GET/POST/PUT/DELETE /api/v1/maintenance/calibration-entries

Fields: calibrationNumber, scheduleId, scheduleNumber, instrumentId, instrumentName, calibrationDate, calibrationAgency, certificateNumber, standardUsed, observedValues, permissibleLimits, result (PASS/FAIL), nextDueDate, calibrationCost, status
Auto-fill: scheduleId -> pulls instrument details from Calibration Schedule

### 10.10 Root Cause Analysis (RCA)
Entity: root_cause_analysis
API: GET/POST/PUT/DELETE /api/v1/maintenance/rca

### 10.11 Power Consumption
API: GET/POST/PUT/DELETE /api/v1/maintenance/power-consumptions
Fields: machineCode, readingDate, previousReading, currentReading, unitConsumed, rate, cost, status
Actions: approve (RBAC-gated with can('maintenance', 'Approve'))

### 10.12 Water Consumption
API: GET/POST/PUT/DELETE /api/v1/maintenance/water-consumptions
Fields: meterCode, readingDate, previousReading, currentReading, unitConsumed, rate, cost, status
Actions: approve (RBAC-gated with can('maintenance', 'Approve'))

### 10.13 Maintenance Analytics
| Endpoint | KPIs |
|----------|------|
| /api/v1/maintenance/analytics/downtime | Total downtime, by machine, by category |
| /api/v1/maintenance/analytics/mtbf | Mean Time Between Failures |
| /api/v1/maintenance/analytics/mttr | Mean Time To Repair |
| /api/v1/maintenance/analytics/cost | Maintenance cost breakdown |
| /api/v1/maintenance/analytics/downtime/categories | Downtime by category |
| /api/v1/maintenance/analytics/downtime/priority | Downtime by priority |
| /api/v1/maintenance/reports/machine-history/{code} | Machine maintenance history |

### 10.14 Maintenance Dashboard
API: GET /api/v1/maintenance/dashboard
12 KPIs: breakdowns open/in-progress, PM compliance %, MTBF, MTTR, pending calibrations, cost this month, etc.

---

## 11. Dashboard & Reports

### 11.1 Main Dashboard
API: GET /api/inventory/reports/overview
KPIs: Total items, low stock count, pending POs, pending SOs, total value, overdue SOs
Charts: Monthly inward/outward trend (AreaChart), category distribution (PieChart)
Sub-dashboards loaded: SalesDashboard, PurchaseDashboard, PlanningDashboard, ProductionDashboard

### 11.2 Sales Dashboard
KPIs: Total SOs, pending SOs, dispatched SOs, invoices, revenue

### 11.3 Purchase Dashboard
KPIs: Total POs, pending POs, received POs, pending GRNs, spend

### 11.4 Planning Dashboard
KPIs: Total BOMs, routes, work orders, job orders, open WOs, overdue WOs

### 11.5 Production Dashboard
API: GET /api/v1/production/dashboard
KPIs: Job cards, entries, produced qty, idle time, conversions, returns, log sheets

### 11.6 Quality Dashboard
API: GET /api/v1/quality/dashboard
KPIs: First-pass yield, pending inspections, NCRs, CAPAs

### 11.7 Inventory Reports
| Endpoint | Report |
|----------|--------|
| /api/inventory/reports/overview | Summary KPIs |
| /api/inventory/dashboard/summary | Dashboard summary |
| /api/inventory/stock/summary | Stock summary |
| /api/inventory/stock/balance?item&location&batch | Balance query |
| /api/v1/traceability/forward | Forward traceability |
| /api/v1/traceability/reverse | Reverse traceability |

### 11.8 Notifications
Frontend polls every 60s:
- /api/inventory/reports/overview (low stock alerts)
- /api/v1/quality/inspections (pending inspections)
Dynamic badge count, deep-links to relevant screens

---

## 12. Cross-Cutting Concerns

### 12.1 StatusBadge Component
Reusable across all 19 screens (7 production + 12 maintenance). Props: status (string), variant (optional color map). CSS classes: bdg-{STATUS} with light/dark theme support.

Supported statuses: DRAFT, SUBMITTED, APPROVED, POSTED, COMPLETED, REJECTED, CANCELLED, PASS, FAIL, HOLD, CLOSED, IN_PROGRESS, PENDING

### 12.2 AuditHistoryDrawer
Reusable component fetching GET /api/master/audit-logs?entityType=X&entityId=Y
Field-level change history. Wired to: UserScreen, MachineScreen, CustomerList, SupplierList

### 12.3 CSV Export
exportToCsv() utility with BOM + proper escaping. Wired to: UserScreen, MachineScreen, CustomerList, SupplierList

### 12.4 Error Handling
- axiosClient: 401 -> redirect /login, 403 -> permission toast, 2 retries on 5xx/network
- GlobalExceptionHandler (backend): 400/403/409/422/500 mapped to {message}
- ErrorBoundary: catches React render errors, shows retry UI

### 12.5 Tab System
TabsContext: persistent tabs in localStorage (zyger-tabs), pinned Dashboard tab, max open tabs, rebuilds from screenIds via registry + nav meta

### 12.6 Global Search
Ctrl+K: searches flattened NAV_ITEMS, opens matching screen in new tab

### 12.7 Theme Toggle
Light/dark mode via data-theme attribute on html, persisted in localStorage (zyger-theme)

### 12.8 Activity Log (Dashboard)
localStorage-based (zyger_recent_activity_logs), 50 max entries, seeded from API responses (sales DCs, POs, PO Inwards, DC Returns)

### 12.9 Format Utilities
formatDate(), formatNumber() in utils/format.ts

### 12.10 Print
PrintService generates branded A4 PDFs for: Delivery Challan, GRN
Frontend trigger via VITE_API_BASE_URL + /api/ endpoint

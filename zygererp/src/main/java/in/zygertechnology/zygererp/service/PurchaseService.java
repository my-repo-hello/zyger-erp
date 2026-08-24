package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.PurchasePriceHistoryRepository;
import in.zygertechnology.zygererp.repo.JobWorkPriceHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.repo.ItemRepository;
import java.util.Map;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    static final Set<String> PURCHASE_KEYS = Set.of(
            "purchase-request", "supplier-enquiry", "supplier-quotation",
            "purchase-order", "job-order", "purchase-target",
            "purchase-price-list", "job-work-price-list"
    );

    private final DocumentFacade docs;
    private final PurchasePriceHistoryRepository priceHistory;
    private final JobWorkPriceHistoryRepository jobWorkPriceHistory;
    private final PartyRepository parties;
    private final ItemRepository items;

    public boolean isPurchase(String key) { return PURCHASE_KEYS.contains(key); }

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        validateReferences(key, body);
        body.put("createdBy", user);
        preProcessBody(key, body);
        DocEntity e = docs.create(key, body, user);
        applyCreationDefaults(key, e);
        return e;
    }

    private void preProcessBody(String key, Map<String, Object> body) {
        if (body.containsKey("requiredDate") && !body.containsKey("docDate")) body.put("docDate", body.get("requiredDate"));
        if (body.containsKey("enquiryDate") && !body.containsKey("docDate")) body.put("docDate", body.get("enquiryDate"));
        if (body.containsKey("quotationDate") && !body.containsKey("docDate")) body.put("docDate", body.get("quotationDate"));
        if (body.containsKey("poDate") && !body.containsKey("docDate")) body.put("docDate", body.get("poDate"));
        if (body.containsKey("jobOrderDate") && !body.containsKey("docDate")) body.put("docDate", body.get("jobOrderDate"));

        if (body.containsKey("notes") && !body.containsKey("remarks")) body.put("remarks", body.get("notes"));
        if (body.containsKey("remarks") && !body.containsKey("notes")) body.put("notes", body.get("remarks"));

        if (body.containsKey("requestedBy")) {
            body.putIfAbsent("requestBy", body.get("requestedBy"));
        }
        if (body.containsKey("requestBy")) {
            body.putIfAbsent("requestedBy", body.get("requestBy"));
        }
        if (body.containsKey("validUntil")) {
            body.putIfAbsent("quotationValidityDate", body.get("validUntil"));
        }
        if (body.containsKey("subcontractor")) {
            body.putIfAbsent("supplierJobWorker", body.get("subcontractor"));
            body.putIfAbsent("supplier", body.get("subcontractor"));
        }
        if (body.containsKey("processName")) {
            body.putIfAbsent("process", body.get("processName"));
        }
    }

    private void validateReferences(String key, Map<String, Object> body) {
        String supplier = (String) body.get("supplier");
        String supplierCode = (String) body.get("supplierCode");
        if ((supplierCode == null || supplierCode.isBlank()) && supplier != null && !supplier.isBlank()) {
            parties.findByName(supplier).ifPresent(p -> body.put("supplierCode", p.getCode()));
        }
        if (supplierCode != null && !supplierCode.isBlank() && isPurchaseDoc(key)) {
            parties.findByCode(supplierCode).ifPresent(p -> {
                if ("BLOCKED".equals(p.getApprovalStatus())) {
                    throw new IllegalStateException("Supplier " + p.getCode() + " is BLOCKED and cannot be used in purchase documents");
                }
                if (!"APPROVED".equals(p.getApprovalStatus()) && !"ACTIVE".equals(p.getApprovalStatus())) {
                    Object override = body.get("supplierOverride");
                    if (!Boolean.TRUE.equals(override)) {
                        throw new IllegalStateException("Supplier " + p.getCode() + " approval status is " + p.getApprovalStatus() + ". Pass supplierOverride=true to bypass.");
                    }
                }
            });
        }
    }

    private boolean isPurchaseDoc(String key) {
        return "purchase-order".equals(key) || "job-order".equals(key)
            || "purchase-request".equals(key) || "po-inward".equals(key);
    }

    private void applyCreationDefaults(String key, DocEntity e) {
        switch (key) {
            case "supplier-enquiry" -> {
                if (e instanceof SupplierEnquiry se) {
                    if (se.getSupplier() != null && !se.getSupplier().isBlank()) {
                        if (se.getContactPerson() == null || se.getContactPerson().isBlank() ||
                            se.getPhone() == null || se.getPhone().isBlank() ||
                            se.getEmail() == null || se.getEmail().isBlank()) {
                            parties.findByName(se.getSupplier()).ifPresent(p -> {
                                if (se.getSupplierCode() == null || se.getSupplierCode().isBlank()) se.setSupplierCode(p.getCode());
                                if (se.getContactPerson() == null || se.getContactPerson().isBlank()) se.setContactPerson(p.getContactPerson());
                                if (se.getPhone() == null || se.getPhone().isBlank()) se.setPhone(p.getPhone() != null ? p.getPhone() : p.getMobile());
                                if (se.getEmail() == null || se.getEmail().isBlank()) se.setEmail(p.getEmail());
                            });
                        }
                    }
                    if (se.getSuppliers() == null || se.getSuppliers().isEmpty()) {
                        if (se.getSupplier() != null && !se.getSupplier().isBlank()) {
                            SupplierEnquirySupplier ses = new SupplierEnquirySupplier();
                            ses.setDoc(se);
                            ses.setSupplierName(se.getSupplier());
                            ses.setSupplierCode(se.getSupplierCode());
                            ses.setContactPerson(se.getContactPerson());
                            ses.setPhone(se.getPhone());
                            ses.setEmail(se.getEmail());
                            ses.setStatus("PENDING");
                            ses.setEnquiryStatus("PENDING");
                            se.getSuppliers().add(ses);
                        }
                    } else {
                        for (SupplierEnquirySupplier s : se.getSuppliers()) {
                            if (s.getStatus() == null) s.setStatus("PENDING");
                            if (s.getEnquiryStatus() == null) s.setEnquiryStatus("PENDING");
                            if (s.getSupplierName() == null) s.setSupplierName(se.getSupplier());
                            if (s.getContactPerson() == null) s.setContactPerson(se.getContactPerson());
                            if (s.getPhone() == null) s.setPhone(se.getPhone());
                            if (s.getEmail() == null) s.setEmail(se.getEmail());
                        }
                    }
                }
            }
            case "purchase-order" -> {
                if (e instanceof PurchaseOrder po) {
                    if (po.getSupplier() != null && !po.getSupplier().isBlank()) {
                        if (po.getContactPerson() == null || po.getContactPerson().isBlank() ||
                            po.getPhone() == null || po.getPhone().isBlank() ||
                            po.getEmail() == null || po.getEmail().isBlank()) {
                            parties.findByName(po.getSupplier()).ifPresent(p -> {
                                if (po.getSupplierCode() == null || po.getSupplierCode().isBlank()) po.setSupplierCode(p.getCode());
                                if (po.getContactPerson() == null || po.getContactPerson().isBlank()) po.setContactPerson(p.getContactPerson());
                                if (po.getPhone() == null || po.getPhone().isBlank()) po.setPhone(p.getPhone() != null ? p.getPhone() : p.getMobile());
                                if (po.getEmail() == null || po.getEmail().isBlank()) po.setEmail(p.getEmail());
                            });
                        }
                    }
                    if (po.getLines() != null) {
                        for (PurchaseOrderItem item : (java.util.List<PurchaseOrderItem>) po.getLines()) {
                            if (item.getOrderQty() == null) item.setOrderQty(BigDecimal.ZERO);
                            if (item.getUnitPrice() == null) item.setUnitPrice(BigDecimal.ZERO);
                            if (item.getDiscount() == null) item.setDiscount(BigDecimal.ZERO);
                            if (item.getTax() == null) item.setTax(BigDecimal.ZERO);
                            BigDecimal net = item.getOrderQty()
                                    .multiply(item.getUnitPrice())
                                    .subtract(item.getDiscount());
                            item.setNetAmount(net);
                        }
                    }
                }
            }
            case "purchase-price-list" -> {
                if (e instanceof PurchasePriceList ppl) {
                    if (ppl.getRevisionNumber() == null) ppl.setRevisionNumber(1);
                    if (ppl.getApprovalStatus() == null) ppl.setApprovalStatus("DRAFT");
                }
            }
            case "job-work-price-list" -> {
                if (e instanceof JobWorkPriceList jwpl) {
                    if (jwpl.getRevisionNumber() == null) jwpl.setRevisionNumber(1);
                    if (jwpl.getApprovalStatus() == null) jwpl.setApprovalStatus("DRAFT");
                }
            }
            default -> {}
        }
    }

    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        DocEntity e = docs.action(key, id, action, note, user);
        postActionHook(key, e, action, user);
        return e;
    }

    private void postActionHook(String key, DocEntity e, String action, String user) {
        if (!"approve".equals(action)) return;
        switch (key) {
            case "supplier-quotation" -> {
                if (e instanceof SupplierQuotation sq) {
                    recordPurchasePriceHistory(sq);
                }
            }
            case "purchase-price-list" -> {
                if (e instanceof PurchasePriceList ppl) {
                    ppl.setApprovalStatus("APPROVED");
                    recordPriceListHistory(ppl, user);
                }
            }
            case "job-work-price-list" -> {
                if (e instanceof JobWorkPriceList jwpl) {
                    jwpl.setApprovalStatus("APPROVED");
                    recordJobWorkPriceHistory(jwpl, user);
                }
            }
            default -> {}
        }
    }

    private void recordPurchasePriceHistory(SupplierQuotation sq) {
        if (sq.getLines() == null) return;
        for (SupplierQuotationItem item : (java.util.List<SupplierQuotationItem>) sq.getLines()) {
            PurchasePriceHistory h = new PurchasePriceHistory();
            h.setSupplier(sq.getSupplier());
            h.setItemCode(item.getItemCode());
            BigDecimal prev = priceHistory.findTopBySupplierAndItemCodeOrderByEffectiveDateDescIdDesc(sq.getSupplier(), item.getItemCode())
                .map(PurchasePriceHistory::getNewPrice).orElse(null);
            h.setPreviousPrice(prev);
            h.setNewPrice(item.getUnitPrice());
            h.setEffectiveDate(sq.getDocDate());
            h.setChangedBy(sq.getCreatedBy());
            h.setApprovedBy(sq.getCreatedBy());
            h.setChangeReason("Approved quotation " + sq.getDocNo());
            priceHistory.save(h);
        }
    }

    private void recordPriceListHistory(PurchasePriceList ppl, String user) {
        PurchasePriceHistory h = new PurchasePriceHistory();
        h.setSupplier(ppl.getSupplier());
        h.setItemCode(ppl.getItemCode());
        BigDecimal prev = priceHistory.findTopBySupplierAndItemCodeOrderByEffectiveDateDescIdDesc(ppl.getSupplier(), ppl.getItemCode())
            .map(PurchasePriceHistory::getNewPrice).orElse(null);
        h.setPreviousPrice(prev);
        h.setNewPrice(ppl.getUnitPrice());
        h.setEffectiveDate(ppl.getEffectiveFrom());
        h.setChangedBy(user);
        h.setApprovedBy(user);
        h.setChangeReason("Approved price list " + ppl.getDocNo());
        priceHistory.save(h);
    }

    private void recordJobWorkPriceHistory(JobWorkPriceList jwpl, String user) {
        JobWorkPriceHistory h = new JobWorkPriceHistory();
        h.setSupplier(jwpl.getSupplier());
        h.setProcess(jwpl.getProcess());
        h.setPreviousRate(null);
        h.setNewRate(jwpl.getRate());
        h.setEffectiveDate(jwpl.getEffectiveFrom());
        h.setChangedBy(user);
        h.setApprovedBy(user);
        h.setChangeReason("Approved job work price list " + jwpl.getDocNo());
        jobWorkPriceHistory.save(h);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("openPR", countByStatus("purchase-request", "SUBMITTED"));
        d.put("openEnquiries", countByStatus("supplier-enquiry", "SUBMITTED"));
        d.put("pendingQuotations", countByStatus("supplier-quotation", "SUBMITTED"));
        d.put("openPO", countByStatus("purchase-order", "APPROVED"));
        d.put("pendingPOApproval", countByStatus("purchase-order", "SUBMITTED"));
        d.put("partiallyReceived", computePartiallyReceivedPOs());
        d.put("delayedPO", computeDelayedPOs());
        d.put("openJobOrders", countByStatus("job-order", "SUBMITTED"));
        d.put("overdueJobOrders", countByStatus("job-order", "APPROVED"));
        d.put("totalPR", docs.count("purchase-request"));
        d.put("totalPO", docs.count("purchase-order"));
        d.put("totalJO", docs.count("job-order"));
        return d;
    }

    private long countByStatus(String key, String status) {
        Map<String, Object> page = docs.list(key, Map.of("status", status, "size", "1", "page", "0"));
        Object total = page.get("totalElements");
        if (total instanceof Number n) return n.longValue();
        return 0;
    }

    private long computePartiallyReceivedPOs() {
        List<DocEntity> postedPOs = docs.findAll("purchase-order").stream()
            .filter(d -> "POSTED".equals(d.getStatus()))
            .toList();
        long count = 0;
        for (DocEntity po : postedPOs) {
            List<? extends LineEntity> poLines = po.getLines();
            if (poLines == null || poLines.isEmpty()) continue;
            boolean hasPartial = false;
            for (LineEntity poLine : poLines) {
                double poQty = poLine.getQty() != null ? poLine.getQty().doubleValue() : 0;
                if (poQty <= 0) continue;
                double received = 0;
                try {
                    var result = docs.findAll("po-inward").stream()
                        .filter(d -> "POSTED".equals(d.getStatus()))
                        .filter(d -> po.getDocNo().equals(headerStr(d, "purchaseOrderNo")))
                        .flatMap(d -> d.getLines().stream())
                        .filter(l -> poLine.getItemCode().equals(l.getItemCode()))
                        .mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0)
                        .sum();
                    received = result;
                } catch (Exception ignored) {}
                if (received > 0 && received < poQty) {
                    hasPartial = true;
                    break;
                }
            }
            if (hasPartial) count++;
        }
        return count;
    }

    private long computeDelayedPOs() {
        LocalDate today = LocalDate.now();
        return docs.findAll("purchase-order").stream()
            .filter(d -> "POSTED".equals(d.getStatus()) || "APPROVED".equals(d.getStatus()))
            .filter(d -> {
                if (d instanceof PurchaseOrder po) {
                    return po.getExpectedDeliveryDate() != null && po.getExpectedDeliveryDate().isBefore(today);
                }
                return false;
            })
            .count();
    }

    private String headerStr(DocEntity d, String field) {
        try {
            var f = d.getClass().getDeclaredField(field);
            f.setAccessible(true);
            Object v = f.get(d);
            return v != null ? String.valueOf(v) : null;
        } catch (Exception e) { return null; }
    }
}

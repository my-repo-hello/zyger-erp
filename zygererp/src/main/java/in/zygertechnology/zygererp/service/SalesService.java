package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.repo.ItemRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SalesService {

    static final Set<String> SALES_KEYS = Set.of(
            "sales-order", "proforma-invoice", "sales-dc",
            "sales-invoice", "dc-return", "invoice-return"
    );

    private final DocumentFacade docs;
    private final PartyRepository parties;
    private final ItemRepository items;
    private final StockService stockService;

    public boolean isSales(String key) { return SALES_KEYS.contains(key); }

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        validateReferences(key, body);
        body.put("createdBy", user);
        preProcessBody(key, body);
        DocEntity e = docs.create(key, body, user);
        applyCreationDefaults(key, e);
        return e;
    }

    private void validateReferences(String key, Map<String, Object> body) {
        String customerCode = (String) body.get("customerCode");
        if ((customerCode == null || customerCode.isBlank()) && body.get("customer") != null) {
            String custName = String.valueOf(body.get("customer"));
            parties.findByName(custName).ifPresent(p -> body.put("customerCode", p.getCode()));
            customerCode = (String) body.get("customerCode");
        }

        if (customerCode != null && !customerCode.isBlank()) {
            if (parties.existsByCode(customerCode)) {
                validateCustomerCredit(customerCode, null);
            }
        }
    }

    private void validateCustomerCredit(String customerCode, BigDecimal orderAmount) {
        if (customerCode == null || customerCode.isBlank()) return;
        try {
            parties.findByCode(customerCode).ifPresent(party -> {
                if (Boolean.TRUE.equals(party.getCreditHold())) {
                    throw new IllegalArgumentException("Customer '" + party.getName() + "' is currently on Credit Hold (" +
                            (party.getCreditHoldReason() != null ? party.getCreditHoldReason() : "Reason unspecified") + ")");
                }
                if (party.getCreditLimit() != null && party.getCreditLimit().compareTo(BigDecimal.ZERO) > 0 && orderAmount != null) {
                    BigDecimal totalBiz = party.getTotalBusiness() != null ? party.getTotalBusiness() : BigDecimal.ZERO;
                    BigDecimal proposed = totalBiz.add(orderAmount);
                    if (proposed.compareTo(party.getCreditLimit()) > 0) {
                        throw new IllegalArgumentException("Credit limit exceeded for Customer '" + party.getName() + "'. Limit: " +
                                party.getCreditLimit() + ", Current Total: " + proposed);
                    }
                }
            });
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception ignored) {
            // Guard against any null unboxing or missing optional relation errors
        }
    }

    @SuppressWarnings("unchecked")
    private void preProcessBody(String key, Map<String, Object> body) {
        // Sync dates to base docDate
        if (body.containsKey("orderDate") && !body.containsKey("docDate")) body.put("docDate", body.get("orderDate"));
        if (body.containsKey("piDate") && !body.containsKey("docDate")) body.put("docDate", body.get("piDate"));
        if (body.containsKey("dcDate") && !body.containsKey("docDate")) body.put("docDate", body.get("dcDate"));
        if (body.containsKey("invoiceDate") && !body.containsKey("docDate")) body.put("docDate", body.get("invoiceDate"));
        if (body.containsKey("returnDate") && !body.containsKey("docDate")) body.put("docDate", body.get("returnDate"));

        // Sync notes to remarks
        if (body.containsKey("notes") && !body.containsKey("remarks")) body.put("remarks", body.get("notes"));
        if (body.containsKey("remarks") && !body.containsKey("notes")) body.put("notes", body.get("remarks"));

        // Sync order delivery dates & references
        if (body.containsKey("deliveryDate") && !body.containsKey("requestedDeliveryDate")) body.put("requestedDeliveryDate", body.get("deliveryDate"));
        if (body.containsKey("lrNo")) {
            body.putIfAbsent("lrNumber", body.get("lrNo"));
        }
        if (body.containsKey("lrNumber")) {
            body.putIfAbsent("lrNo", body.get("lrNumber"));
        }
        if (body.containsKey("salesOrderNo")) {
            body.putIfAbsent("salesOrderNumber", body.get("salesOrderNo"));
        }
        if (body.containsKey("salesOrderNumber")) {
            body.putIfAbsent("salesOrderNo", body.get("salesOrderNumber"));
        }
        if (body.containsKey("dcNo")) {
            body.putIfAbsent("originalDcNumber", body.get("dcNo"));
        }
        if (body.containsKey("originalDcNumber")) {
            body.putIfAbsent("dcNo", body.get("originalDcNumber"));
        }
        if (body.containsKey("invoiceNo")) {
            body.putIfAbsent("originalInvoiceNumber", body.get("invoiceNo"));
        }
        if (body.containsKey("originalInvoiceNumber")) {
            body.putIfAbsent("invoiceNo", body.get("originalInvoiceNumber"));
        }
        if (body.containsKey("reason")) {
            body.putIfAbsent("returnReason", body.get("reason"));
        }
        if (body.containsKey("returnReason")) {
            body.putIfAbsent("reason", body.get("returnReason"));
        }

        if (("dc-return".equals(key) || "invoice-return".equals(key)) && body.containsKey("lines")) {
            Object linesObj = body.get("lines");
            if (linesObj instanceof List<?> lineList) {
                for (Object lineObj : lineList) {
                    if (lineObj instanceof Map<?, ?> lineMap) {
                        Map<String, Object> line = (Map<String, Object>) lineMap;
                        if (line.get("returnedQty") == null) {
                            line.put("returnedQty", line.getOrDefault("currentReturnQty", BigDecimal.ZERO));
                        }
                    }
                }
            }
        }
    }

    private void applyCreationDefaults(String key, DocEntity e) {
        switch (key) {
            case "sales-order" -> {
                if (e instanceof SalesOrder so) {
                    if (so.getOrderedQty() == null) so.setOrderedQty(BigDecimal.ZERO);
                    if (so.getProducedQty() == null) so.setProducedQty(BigDecimal.ZERO);
                    if (so.getApprovedQty() == null) so.setApprovedQty(BigDecimal.ZERO);
                    if (so.getPackedQty() == null) so.setPackedQty(BigDecimal.ZERO);
                    if (so.getDispatchedQty() == null) so.setDispatchedQty(BigDecimal.ZERO);
                    if (so.getInvoicedQty() == null) so.setInvoicedQty(BigDecimal.ZERO);
                    if (so.getReturnedQty() == null) so.setReturnedQty(BigDecimal.ZERO);
                    if (so.getLines() != null) {
                        BigDecimal total = BigDecimal.ZERO;
                        for (SalesOrderItem item : (List<SalesOrderItem>) so.getLines()) {
                            if (item.getOrderQty() == null) item.setOrderQty(BigDecimal.ZERO);
                            if (item.getUnitPrice() == null) item.setUnitPrice(BigDecimal.ZERO);
                            if (item.getDiscount() == null) item.setDiscount(BigDecimal.ZERO);
                            if (item.getTax() == null) item.setTax(BigDecimal.ZERO);
                            BigDecimal qty = item.getOrderQty();
                            BigDecimal rate = item.getUnitPrice();
                            BigDecimal disc = item.getDiscount();
                            BigDecimal net = qty.multiply(rate).subtract(disc);
                            item.setNetAmount(net);
                            total = total.add(qty);
                        }
                        so.setOrderedQty(total);
                        so.setPendingQty(total);
                    }
                }
            }
            case "proforma-invoice" -> {
                if (e instanceof ProformaInvoice pi) {
                    if (pi.getLines() != null) {
                        BigDecimal total = BigDecimal.ZERO;
                        for (ProformaInvoiceItem item : (List<ProformaInvoiceItem>) pi.getLines()) {
                            if (item.getUnitPrice() == null) item.setUnitPrice(BigDecimal.ZERO);
                            if (item.getDiscount() == null) item.setDiscount(BigDecimal.ZERO);
                            if (item.getTax() == null) item.setTax(BigDecimal.ZERO);
                            BigDecimal qty = item.getQty() == null ? BigDecimal.ZERO : item.getQty();
                            BigDecimal net = qty.multiply(item.getUnitPrice()).subtract(item.getDiscount());
                            BigDecimal taxAmt = net.multiply(item.getTax()).divide(BigDecimal.valueOf(100));
                            item.setTaxAmount(taxAmt);
                            item.setNetAmount(net.add(taxAmt));
                            total = total.add(net.add(taxAmt));
                        }
                        pi.setTotalAmount(total);
                    }
                }
            }
            case "sales-dc" -> {
                if (e instanceof SalesDc sdc) {
                    if (sdc.getDispatchDate() == null) sdc.setDispatchDate(LocalDate.now());
                }
            }
            case "sales-invoice" -> {
                if (e instanceof SalesInvoice si) {
                    if (si.getLines() != null) {
                        BigDecimal total = BigDecimal.ZERO;
                        BigDecimal totalTax = BigDecimal.ZERO;
                        for (SalesInvoiceItem item : (List<SalesInvoiceItem>) si.getLines()) {
                            if (item.getUnitPrice() == null) item.setUnitPrice(BigDecimal.ZERO);
                            if (item.getDiscount() == null) item.setDiscount(BigDecimal.ZERO);
                            if (item.getTax() == null) item.setTax(BigDecimal.ZERO);
                            BigDecimal qty = item.getQty() == null ? BigDecimal.ZERO : item.getQty();
                            BigDecimal net = qty.multiply(item.getUnitPrice()).subtract(item.getDiscount());
                            BigDecimal taxAmt = net.multiply(item.getTax()).divide(BigDecimal.valueOf(100));
                            item.setTaxAmount(taxAmt);
                            item.setNetAmount(net.add(taxAmt));
                            total = total.add(net.add(taxAmt));
                            totalTax = totalTax.add(taxAmt);
                        }
                        si.setTotalAmount(total);
                        si.setTaxAmount(totalTax);
                    }
                }
            }
            case "dc-return" -> {
                if (e instanceof DcReturn dr) {
                    if (dr.getLines() != null) {
                        for (DcReturnLine item : (List<DcReturnLine>) dr.getLines()) {
                            if (item.getCurrentReturnQty() == null) item.setCurrentReturnQty(BigDecimal.ZERO);
                            if (item.getPreviouslyReturnedQty() == null) item.setPreviouslyReturnedQty(BigDecimal.ZERO);
                            if (item.getOriginalDcQty() == null) item.setOriginalDcQty(BigDecimal.ZERO);
                            if (item.getReturnedQty() == null) item.setReturnedQty(item.getCurrentReturnQty());
                        }
                    }
                }
            }
            case "invoice-return" -> {
                if (e instanceof InvoiceReturn ir) {
                    if (ir.getLines() != null) {
                        for (InvoiceReturnLine item : (List<InvoiceReturnLine>) ir.getLines()) {
                            if (item.getCurrentReturnQty() == null) item.setCurrentReturnQty(BigDecimal.ZERO);
                            if (item.getPreviouslyReturnedQty() == null) item.setPreviouslyReturnedQty(BigDecimal.ZERO);
                            if (item.getOriginalInvoiceQty() == null) item.setOriginalInvoiceQty(BigDecimal.ZERO);
                            if (item.getReturnedQty() == null) item.setReturnedQty(item.getCurrentReturnQty());
                        }
                    }
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
        if (!"approve".equals(action) && !"post".equals(action) && !"dispatch".equals(action)) return;
        switch (key) {
            case "sales-order" -> {
                if (e instanceof SalesOrder so) {
                    if (so.getLines() != null) {
                        BigDecimal total = BigDecimal.ZERO;
                        for (SalesOrderItem item : (List<SalesOrderItem>) so.getLines()) {
                            total = total.add(item.getOrderQty() == null ? BigDecimal.ZERO : item.getOrderQty());
                        }
                        so.setOrderedQty(total);
                        BigDecimal dispatched = so.getDispatchedQty() == null ? BigDecimal.ZERO : so.getDispatchedQty();
                        so.setPendingQty(total.subtract(dispatched));
                    }
                }
            }
            case "sales-dc" -> {
                if (e.getLines() != null) {
                    for (LineEntity line : e.getLines()) {
                        stockService.recordStockOut(
                                e.getDocNo(), "sales-dc", "SALES_DISPATCH",
                                line.getItemCode(), line.getLocation(), line.getBatchNo(), line.getHeatNo(),
                                line.getQty(), e.getDocDate(), user
                        );
                    }
                }
            }
            case "dc-return" -> {
                if (e instanceof DcReturn dr) {
                    if (dr.getDisposition() == null) dr.setDisposition("PENDING_INSPECTION");
                    if (dr.getLines() != null) {
                        for (LineEntity line : dr.getLines()) {
                            stockService.recordStockIn(
                                    e.getDocNo(), "dc-return", "SALES_RETURN",
                                    line.getItemCode(), line.getLocation(), line.getBatchNo(), line.getHeatNo(),
                                    line.getQty(), e.getDocDate(), user
                            );
                        }
                    }
                }
            }
            case "invoice-return" -> {
                if (e instanceof InvoiceReturn ir) {
                    if (ir.getDisposition() == null) ir.setDisposition("PENDING_INSPECTION");
                    if (ir.getLines() != null) {
                        for (LineEntity line : ir.getLines()) {
                            stockService.recordStockIn(
                                    e.getDocNo(), "invoice-return", "SALES_RETURN",
                                    line.getItemCode(), line.getLocation(), line.getBatchNo(), line.getHeatNo(),
                                    line.getQty(), e.getDocDate(), user
                            );
                        }
                    }
                }
            }
            default -> {}
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("newSalesOrders", countByStatus("sales-order", "DRAFT"));
        d.put("pendingApproval", countByStatus("sales-order", "SUBMITTED"));
        d.put("approvedOrders", countByStatus("sales-order", "APPROVED"));
        d.put("partiallyDispatched", countByStatus("sales-order", "PARTIALLY_DISPATCHED"));
        d.put("overdueOrders", countByStatus("sales-order", "OVERDUE"));
        d.put("pendingPi", countByStatus("proforma-invoice", "SUBMITTED"));
        d.put("pendingDispatch", countByStatus("sales-dc", "SUBMITTED"));
        d.put("dispatched", countByStatus("sales-dc", "DISPATCHED"));
        d.put("pendingInvoice", countByStatus("sales-invoice", "SUBMITTED"));
        d.put("postedInvoices", countByStatus("sales-invoice", "POSTED"));
        d.put("pendingReturns", countByStatus("dc-return", "SUBMITTED") + countByStatus("invoice-return", "SUBMITTED"));
        d.put("totalSO", docs.count("sales-order"));
        d.put("totalPI", docs.count("proforma-invoice"));
        d.put("totalDC", docs.count("sales-dc"));
        d.put("totalInvoice", docs.count("sales-invoice"));
        d.put("totalReturns", docs.count("dc-return") + docs.count("invoice-return"));
        return d;
    }

    private long countByStatus(String key, String status) {
        Map<String, Object> page = docs.list(key, Map.of("status", status, "size", "1", "page", "0"));
        Object content = page.getOrDefault("content", List.of());
        if (content instanceof List<?> l) return l.size();
        return 0;
    }
}

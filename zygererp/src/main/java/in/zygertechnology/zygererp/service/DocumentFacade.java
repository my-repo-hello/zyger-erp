package in.zygertechnology.zygererp.service;

import tools.jackson.databind.ObjectMapper;
import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.repo.SupplierInvoiceAttachmentRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentFacade {

    @Autowired EntityManager em;
    @Autowired ObjectMapper mapper;
    @Autowired LedgerRepository ledger;
    @Autowired ItemCacheService itemCache;
    @Autowired DocNumberService numbers;
    @Autowired SupplierInvoiceAttachmentRepository attachments;
    @Autowired PartyRepository parties;

    private final Map<String, Class<? extends DocEntity>> reg = new HashMap<>();

    @PostConstruct @SuppressWarnings("unchecked")
    void init() {
        for (EntityType<?> et : em.getMetamodel().getEntities()) {
            Class<?> c = et.getJavaType();
            DocKey k = c.getAnnotation(DocKey.class);
            if (k != null) reg.put(k.value(), (Class<? extends DocEntity>) c);
        }
    }

    private Class<? extends DocEntity> cls(String key) {
        Class<? extends DocEntity> c = reg.get(key);
        if (c == null) throw new IllegalArgumentException("Unknown document type: " + key);
        return c;
    }

    public boolean isRegistered(String key) { return reg.containsKey(key); }

    public Set<String> keys() { return reg.keySet(); }

    public DocEntity get(String key, Long id) {
        DocEntity d = em.find(cls(key), id);
        if (d == null) throw new IllegalArgumentException("Document not found");
        return d;
    }

    @Transactional(readOnly = true)
    public DocEntity getByNumber(String key, String docNo) {
        String en = cls(key).getSimpleName();
        List<?> found = em.createQuery("select d from " + en + " d where d.docNo = :docNo", cls(key))
                .setParameter("docNo", docNo)
                .setMaxResults(1)
                .getResultList();
        if (found.isEmpty()) throw new IllegalArgumentException("Document not found: " + docNo);
        return (DocEntity) found.get(0);
    }

    @Transactional(readOnly = true)
    public List<DocEntity> findAll(String key) {
        String en = cls(key).getSimpleName();
        return em.createQuery("select d from " + en + " d order by d.docDate desc", DocEntity.class)
                .getResultList();
    }

    @Transactional(readOnly = true)
    public long count(String key) {
        String en = cls(key).getSimpleName();
        return em.createQuery("select count(d) from " + en + " d", Long.class).getSingleResult();
    }

    @Transactional(readOnly = true)
    public long countAll() {
        long total = 0;
        for (String k : reg.keySet()) total += count(k);
        return total;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> toRow(DocEntity e) {
        Map<String, Object> converted = mapper.convertValue(e, LinkedHashMap.class);
        final Map<String, Object> r = converted != null ? converted : new LinkedHashMap<>();
        String dStr = e.getDocDate() == null ? "" : e.getDocDate().toString();
        r.put("date", dStr);
        r.put("docDate", dStr);
        r.putIfAbsent("orderDate", dStr);
        r.putIfAbsent("piDate", dStr);
        r.putIfAbsent("dcDate", dStr);
        r.putIfAbsent("invoiceDate", dStr);
        r.putIfAbsent("returnDate", dStr);
        if (r.get("notes") != null && r.get("remarks") == null) r.put("remarks", r.get("notes"));
        if (r.get("remarks") != null && r.get("notes") == null) r.put("notes", r.get("remarks"));
        r.put("id", e.getId());
        List<? extends LineEntity> L = e.getLines();
        r.put("qty", L.stream().mapToDouble(l -> l.getQty().doubleValue()).sum());
        r.put("totalAmount", L.stream()
                .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum());

        List<Map<String, Object>> lineRows = new ArrayList<>();
        for (LineEntity l : L) {
            Map<String, Object> lm = mapper.convertValue(l, LinkedHashMap.class);
            if (lm == null) lm = new LinkedHashMap<>();
            lm.remove("doc");
            lm.put("itemDesc", itemCache.findByCode(l.getItemCode())
                    .map(ItemMaster::getDescription).orElse(""));
            lineRows.add(lm);
        }
        r.put("lines", lineRows);
        if (!L.isEmpty()) {
            LineEntity first = L.get(0);
            r.putIfAbsent("firstItemCode", first.getItemCode());
            itemCache.findByCode(first.getItemCode())
                    .ifPresent(i -> r.putIfAbsent("firstItemName", i.getDescription()));
        }
        r.putIfAbsent("itemCode", r.get("firstItemCode"));
        r.putIfAbsent("itemName", r.get("firstItemName"));
        r.putIfAbsent("reference", firstOf(r,
                "purchaseOrderNo", "jobOrderNo", "labourOrderNo", "issueRequestNo",
                "allotmentNo", "originalDocumentNo", "linkedDocumentNo", "challanNo",
                "supplierInvoiceNo", "referenceNo", "originalReceiptNo"));
        r.putIfAbsent("party", firstOf(r,
                "supplier", "vendor", "customer", "party", "toParty",
                "supplierName", "vendorName", "customerName", "partyName"));
        if (e instanceof SupplierEnquiry se) {
            String supp = se.getSupplier();
            String code = se.getSupplierCode();
            String cp = se.getContactPerson();
            String ph = se.getPhone();
            String emStr = se.getEmail();

            if (se.getSuppliers() != null && !se.getSuppliers().isEmpty()) {
                SupplierEnquirySupplier first = se.getSuppliers().get(0);
                if (supp == null || supp.isBlank()) supp = first.getSupplierName();
                if (code == null || code.isBlank()) code = first.getSupplierCode();
                if (cp == null || cp.isBlank()) cp = first.getContactPerson();
                if (ph == null || ph.isBlank()) ph = first.getPhone();
                if (emStr == null || emStr.isBlank()) emStr = first.getEmail();
            }

            if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
                Optional<Party> pOpt = parties.findByName(supp);
                if (pOpt.isPresent()) {
                    Party p = pOpt.get();
                    if (code == null || code.isBlank()) code = p.getCode();
                    if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                    if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                    if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
                }
            }

            if (supp != null) r.put("supplier", supp);
            if (code != null) r.put("supplierCode", code);
            if (cp != null) r.put("contactPerson", cp);
            if (ph != null) r.put("phone", ph);
            if (emStr != null) r.put("email", emStr);
        }
        if (e instanceof PurchaseOrder po) {
            String supp = po.getSupplier();
            String code = po.getSupplierCode();
            String cp = po.getContactPerson();
            String ph = po.getPhone();
            String emStr = po.getEmail();

            if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
                Optional<Party> pOpt = parties.findByName(supp);
                if (pOpt.isPresent()) {
                    Party p = pOpt.get();
                    if (code == null || code.isBlank()) code = p.getCode();
                    if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                    if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                    if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
                }
            }

            if (supp != null) r.put("supplier", supp);
            if (code != null) r.put("supplierCode", code);
            if (cp != null) r.put("contactPerson", cp);
            if (ph != null) r.put("phone", ph);
            if (emStr != null) r.put("email", emStr);
        }
        denormalizeLines(r, findKeyForEntity(e));
        return r;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRow(String key, Long id) {
        Map<String, Object> row = toRow(get(key, id));
        if ("purchase-invoice".equals(key) || "subcontract-invoice".equals(key)) {
            row.put("attachments", attachmentsMeta(key, id));
        }
        return row;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(String key, Map<String, String> q) {
        List<Map<String, Object>> rows = findAll(key).stream()
                .map(this::toRow).collect(Collectors.toList());
        return paginate(rows, q);
    }

    // ---------- Attachments (supplier invoices, max 3) ----------

    public static final int MAX_ATTACHMENTS = 3;

    public record AttachmentInfo(Long id, String name, byte[] data) {}

    private void supportsAttachments(String key) {
        if (!"purchase-invoice".equals(key) && !"subcontract-invoice".equals(key))
            throw new IllegalArgumentException("Attachments not supported for " + key);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> attachmentsMeta(String key, Long id) {
        supportsAttachments(key);
        return attachments.findByDocTypeAndDocIdOrderByIdAsc(key, id).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("fileName", a.getFileName());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttachmentInfo attachment(String key, Long docId, Long attachmentId) {
        supportsAttachments(key);
        SupplierInvoiceAttachment a = attachments
                .findByIdAndDocTypeAndDocId(attachmentId, key, docId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        return new AttachmentInfo(a.getId(), a.getFileName(), a.getData());
    }

    @Transactional
    public void addAttachment(String key, Long docId, String name, byte[] data) {
        supportsAttachments(key);
        get(key, docId);
        long count = attachments.countByDocTypeAndDocId(key, docId);
        if (count >= MAX_ATTACHMENTS)
            throw new IllegalArgumentException("Maximum " + MAX_ATTACHMENTS + " attachments allowed");
        SupplierInvoiceAttachment a = new SupplierInvoiceAttachment();
        a.setDocType(key);
        a.setDocId(docId);
        a.setFileName(name);
        a.setData(data);
        a.setUploadedAt(Instant.now());
        attachments.save(a);
        get(key, docId).setUpdatedAt(Instant.now());
    }

    @Transactional
    public void removeAttachment(String key, Long docId, Long attachmentId) {
        supportsAttachments(key);
        SupplierInvoiceAttachment a = attachments
                .findByIdAndDocTypeAndDocId(attachmentId, key, docId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        attachments.delete(a);
        get(key, docId).setUpdatedAt(Instant.now());
    }

    public Map<String, Object> paginate(List<Map<String, Object>> rows, Map<String, String> q) {
        String st = q.get("status");
        if (st != null && !st.isEmpty())
            rows = rows.stream().filter(r -> st.equals(r.get("status")) || st.equals(r.get("inspectionStatus")) || st.equals(r.get("capaStatus")) || st.equals(r.get("reportStatus")) || st.equals(r.get("complaintStatus"))).collect(Collectors.toList());
        String it = q.get("inspectionType");
        if (it == null || it.isEmpty()) it = q.get("type");
        if (it != null && !it.isEmpty()) {
            final String targetType = it;
            rows = rows.stream().filter(r -> targetType.equalsIgnoreCase(String.valueOf(r.get("inspectionType"))) || targetType.equalsIgnoreCase(String.valueOf(r.get("type"))) || targetType.equalsIgnoreCase(String.valueOf(r.get("certificateType")))).collect(Collectors.toList());
        }
        String item = q.get("itemCode");
        if (item != null && !item.isEmpty()) {
            final String targetItem = item;
            rows = rows.stream().filter(r -> targetItem.equalsIgnoreCase(String.valueOf(r.get("itemCode")))).collect(Collectors.toList());
        }
        String s = q.get("search");
        if (s != null && !s.isEmpty()) {
            String lo = s.toLowerCase();
            rows = rows.stream().filter(r -> String.valueOf(r).toLowerCase().contains(lo)).collect(Collectors.toList());
        }
        int size = q.get("size") == null ? 8 : Integer.parseInt(q.get("size"));
        int pg   = q.get("page") == null ? 0 : Integer.parseInt(q.get("page"));
        int total = rows.size();
        int pages = Math.max(1, (int) Math.ceil((double) total / size));
        int from = Math.min(pg * size, total), to = Math.min(from + size, total);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", rows.subList(from, to));
        out.put("totalElements", total);
        out.put("totalPages", pages);
        out.put("number", pg);
        out.put("size", size);
        return out;
    }

    public String nextNumber(String key) { return numbers.next(key); }

    public String nextNumber(String key, String prefix) { return numbers.next(key, prefix); }

    // --- Line field normalization: frontend key → backend entity field ---
    private static final Map<String, Map<String, String>> LINE_RENAME = Map.of(
        "sales-order", Map.of(
            "qty", "orderQty",
            "taxCode", "tax",
            "revisionLevel", "drawingRevision",
            "targetDeliveryDate", "requiredDeliveryDate"
        ),
        "proforma-invoice", Map.of(
            "taxCode", "tax",
            "lineRemark", "remarks"
        ),
        "sales-dc", Map.of(
            "dispatchQty", "currentDispatchQty",
            "heatNumber", "heatNo",
            "lineRemark", "remarks"
        ),
        "sales-invoice", Map.of(
            "billedQty", "qty",
            "taxCode", "tax"
        ),
        "po-inward", Map.of("qty", "receivedQty"),
        "lo-inward", Map.of("qty", "receivedQty"),
        "jo-inward", Map.of("qty", "producedQty"),
        "general-inward", Map.of("qty", "receivedQty"),
        "dc-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        ),
        "invoice-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        )
    );

    @SuppressWarnings("unchecked")
    private void normalizeLines(Map<String, Object> body, String key) {
        Object linesObj = body.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map<String, Object> line : lines) {
            if ("sales-invoice".equals(key) && line.containsKey("batchHeatNumber")) {
                Object bhn = line.remove("batchHeatNumber");
                if (bhn != null && !String.valueOf(bhn).isEmpty()) {
                    String[] parts = String.valueOf(bhn).split("/", 2);
                    line.put("batchNo", parts[0].trim());
                    if (parts.length > 1 && !parts[1].trim().isEmpty())
                        line.put("heatNo", parts[1].trim());
                }
            }
            for (Map.Entry<String, String> e : renames.entrySet()) {
                if (line.containsKey(e.getKey())) {
                    Object val = line.remove(e.getKey());
                    if ("tax".equals(e.getValue()) && val instanceof String s) {
                        val = parseTaxRate(s);
                    }
                    line.put(e.getValue(), val);
                }
            }
        }
    }

    private BigDecimal parseTaxRate(String taxCode) {
        if (taxCode == null || taxCode.isEmpty() || "Exempt".equalsIgnoreCase(taxCode))
            return BigDecimal.ZERO;
        String num = taxCode.replaceAll("[^0-9.]", "");
        if (num.isEmpty()) return BigDecimal.ZERO;
        try { return new BigDecimal(num); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    @SuppressWarnings("unchecked")
    private void denormalizeLines(Map<String, Object> row, String key) {
        Object linesObj = row.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map.Entry<String, String> e : renames.entrySet()) {
            for (Map<String, Object> line : lines) {
                if (line.containsKey(e.getValue())) {
                    Object val = line.remove(e.getValue());
                    if ("tax".equals(e.getValue()) && val != null) {
                        try {
                            double rate = Double.parseDouble(String.valueOf(val));
                            val = rate == 0 ? "Exempt" : "GST " + (int) rate + "%";
                        } catch (Exception ignored) {}
                    }
                    line.put(e.getKey(), val);
                }
            }
        }
        if ("sales-invoice".equals(key)) {
            for (Map<String, Object> line : lines) {
                String batchNo = line.containsKey("batchNo") ? String.valueOf(line.get("batchNo")) : "";
                String heatNo = line.containsKey("heatNo") ? String.valueOf(line.get("heatNo")) : "";
                line.remove("batchNo");
                line.remove("heatNo");
                String combined = "";
                if (!batchNo.isEmpty() && !"null".equals(batchNo)) combined = batchNo;
                if (!heatNo.isEmpty() && !"null".equals(heatNo)) {
                    combined = combined.isEmpty() ? heatNo : combined + "/" + heatNo;
                }
                line.put("batchHeatNumber", combined);
            }
        }
    }

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        normalizeLines(body, key);
        DocEntity e = mapper.convertValue(body, cls(key));
        if (e.getLines() != null) {
            for (LineEntity l : e.getLines()) {
                if (l instanceof BaseLine bl) bl.setId(null);
            }
        }
        e.setStatus("DRAFT");
        e.setDocDate(parse(body.get("date")));
        e.setCreatedBy(user);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        attach(e);

        String docNo = nextUnusedNumber(key, body);
        e.setDocNo(docNo);
        em.persist(e);
        em.flush();
        createQualityInspectionIfRequired(e, body, user);
        return e;
    }

    private String nextUnusedNumber(String key, Map<String, Object> body) {
        String docNo = nextNumberFor(key, body);
        int maxAttempts = 100;
        while (existsByDocNo(key, docNo) && maxAttempts-- > 0) {
            docNo = nextNumberFor(key, body);
        }
        return docNo;
    }

    private boolean existsByDocNo(String key, String docNo) {
        if (docNo == null || docNo.isBlank()) return false;
        try {
            String en = cls(key).getSimpleName();
            Long count = em.createQuery("select count(d) from " + en + " d where d.docNo = :docNo", Long.class)
                    .setParameter("docNo", docNo)
                    .getSingleResult();
            return count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void createQualityInspectionIfRequired(DocEntity e, Map<String, Object> body, String user) {
        String key = findKeyForEntity(e);
        if (!Set.of("po-inward", "lo-inward", "jo-inward", "general-inward").contains(key)) {
            return;
        }

        Object qcReq = body.get("qcRequired");
        if (qcReq == null && e != null) {
            try {
                Field f = e.getClass().getDeclaredField("qcRequired");
                f.setAccessible(true);
                qcReq = f.get(e);
            } catch (Exception ignored) {}
        }

        boolean isQcRequired = qcReq != null && (
            "Yes".equalsIgnoreCase(String.valueOf(qcReq)) ||
            "true".equalsIgnoreCase(String.valueOf(qcReq)) ||
            "1".equals(String.valueOf(qcReq))
        );

        if (!isQcRequired) {
            return;
        }

        List<? extends LineEntity> lines = e.getLines();
        if (lines == null || lines.isEmpty()) {
            return;
        }

        for (LineEntity line : lines) {
            QualityInspection qi = new QualityInspection();
            qi.setDocNo(numbers.next("quality-inspection"));
            qi.setInspectionType(QualityInspectionType.IQC);
            qi.setSourceType("INWARD");
            if (e.getId() != null) qi.setSourceId(e.getId().toString());
            qi.setSourceNumber(e.getDocNo());
            qi.setDocDate(e.getDocDate() != null ? e.getDocDate() : LocalDate.now());
            qi.setInspectionDate(e.getDocDate() != null ? e.getDocDate() : LocalDate.now());
            qi.setInspectionStatus("DRAFT");
            qi.setDecisionStatus("PENDING");
            qi.setCreatedBy(user);
            qi.setCreatedAt(Instant.now());
            qi.setUpdatedAt(Instant.now());

            String itemCode = null;
            String itemDesc = null;
            BigDecimal qty = BigDecimal.ONE;

            try {
                Field fCode = line.getClass().getDeclaredField("itemCode");
                fCode.setAccessible(true);
                itemCode = (String) fCode.get(line);
            } catch (Exception ignored) {}

            try {
                Field fDesc = line.getClass().getDeclaredField("itemDesc");
                fDesc.setAccessible(true);
                itemDesc = (String) fDesc.get(line);
            } catch (Exception ignored) {}

            if (itemDesc == null || itemDesc.isBlank()) {
                try {
                    Field fName = line.getClass().getDeclaredField("itemName");
                    fName.setAccessible(true);
                    itemDesc = (String) fName.get(line);
                } catch (Exception ignored) {}
            }

            try {
                Field fQty = line.getClass().getDeclaredField("qty");
                fQty.setAccessible(true);
                Object val = fQty.get(line);
                if (val instanceof BigDecimal bd) qty = bd;
                else if (val != null) qty = new BigDecimal(val.toString());
            } catch (Exception ignored) {}

            try {
                Field fPoNo = e.getClass().getDeclaredField("purchaseOrderNo");
                fPoNo.setAccessible(true);
                qi.setPurchaseOrderNumber((String) fPoNo.get(e));
            } catch (Exception ignored) {}

            qi.setItemCode(itemCode != null && !itemCode.isBlank() ? itemCode : "ITEM-001");
            qi.setItemDescription(itemDesc != null ? itemDesc : "");
            qi.setReceivedQuantity(qty);
            qi.setInspectionQuantity(qty);

            em.persist(qi);
        }
    }

    private static String rootMessage(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        return root.getMessage() == null ? "" : root.getMessage();
    }

    private String nextNumberFor(String key, Map<String, Object> body) {
        if ("issue-internal-external".equals(key)) {
            String prefix = "INTERNAL".equalsIgnoreCase(strVal(body.get("issueType"))) ? "INT" : "EXT";
            return numbers.next(key, prefix);
        }
        return numbers.next(key);
    }

    private String strVal(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    @Transactional
    public DocEntity update(String key, Long id, Map<String, Object> body, String user) {
        DocEntity old = get(key, id);
        if (!List.of("DRAFT", "REJECTED").contains(old.getStatus()))
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be edited");

        DocTypes.DocDef def = DocTypes.get(key);

        normalizeLines(body, key);
        DocEntity incoming = mapper.convertValue(body, cls(key));
        copyFields(old, incoming);

        if (def.hasLines() && incoming.getLines() != null) {
            @SuppressWarnings("unchecked")
            List<LineEntity> managed = (List<LineEntity>) old.getLines();
            managed.clear();
            for (LineEntity l : incoming.getLines()) {
                if (l instanceof BaseLine bl) bl.setId(null);
                managed.add(l);
            }
        }

        if (old instanceof SupplierEnquiry se) {
            if (se.getSupplier() != null && !se.getSupplier().isBlank()) {
                if (se.getSuppliers() == null) se.setSuppliers(new ArrayList<>());
                if (se.getSuppliers().isEmpty()) {
                    SupplierEnquirySupplier ses = new SupplierEnquirySupplier();
                    ses.setDoc(se);
                    se.getSuppliers().add(ses);
                }
                SupplierEnquirySupplier ses = se.getSuppliers().get(0);
                ses.setSupplierName(se.getSupplier());
                ses.setSupplierCode(se.getSupplierCode());
                ses.setContactPerson(se.getContactPerson());
                ses.setPhone(se.getPhone());
                ses.setEmail(se.getEmail());
                ses.setStatus("PENDING");
                ses.setEnquiryStatus("PENDING");
            }
        }

        old.setDocDate(parse(body.get("date")));
        old.setUpdatedAt(Instant.now());
        old.setUpdatedBy(user);
        attach(old);
        return old;
    }

    private void copyFields(DocEntity target, DocEntity source) {
        for (Class<?> c = target.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                try {
                    f.setAccessible(true);
                    if (List.of("id", "docNo", "status", "createdBy", "createdAt", "updatedBy",
                            "deleted", "deletedAt", "deletedBy", "lines", "version").contains(f.getName()))
                        continue;
                    if (java.util.Collection.class.isAssignableFrom(f.getType())) continue;
                    Object v = f.get(source);
                    if (v != null) f.set(target, v);
                } catch (Exception ignored) { }
            }
        }
    }

    @Transactional
    public void remove(String key, Long id, String user) {
        DocEntity e = get(key, id);
        if (!List.of("DRAFT", "REJECTED").contains(e.getStatus()))
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be deleted");
        e.setDeleted(true);
        e.setDeletedAt(Instant.now());
        e.setDeletedBy(user);
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);
    }

    @Transactional
    public DocEntity approveWithLines(String key, Long id, String note,
                                      List<Map<String, Object>> lines, String user) {
        DocEntity e = get(key, id);
        requireStatus(e, "SUBMITTED");

        if (lines != null && !lines.isEmpty()) {
            Map<String, Double> approvedByCode = new HashMap<>();
            for (Map<String, Object> l : lines) {
                Object qty = l.get("approvedQty");
                if (qty == null) continue;
                try {
                    approvedByCode.put(strVal(l.get("itemCode")),
                            Double.parseDouble(String.valueOf(qty)));
                } catch (NumberFormatException ignored) { }
            }
            if (e instanceof StockIssueRequest sir) {
                for (StockIssueRequestLine line : sir.getLines()) {
                    Double approved = approvedByCode.get(line.getItemCode());
                    if (approved != null) line.setApprovedQty(BigDecimal.valueOf(approved));
                }
            }
        }

        e.setStatus("APPROVED");
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);
        return e;
    }

    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        DocEntity e = get(key, id);
        switch (action) {
            case "submit" -> requireStatus(e, "DRAFT", "REJECTED");
            case "approve" -> requireStatus(e, "SUBMITTED");
            case "reject" -> requireStatus(e, "SUBMITTED", "DRAFT");
            case "reopen" -> requireStatus(e, "REJECTED");
            case "cancel" -> requireStatus(e, "DRAFT", "SUBMITTED", "APPROVED");
            case "post" -> {
                requireStatus(e, "APPROVED");
                post(key, e);
                e.setStatus("POSTED");
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }
        e.setStatus(statusFor(action, e));
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);
        return e;
    }

    private void requireStatus(DocEntity e, String... allowed) {
        for (String s : allowed) if (s.equals(e.getStatus())) return;
        throw new IllegalStateException("Action not allowed in status " + e.getStatus());
    }

    private String statusFor(String action, DocEntity e) {
        return switch (action) {
            case "submit" -> "SUBMITTED";
            case "approve" -> "APPROVED";
            case "reject" -> "REJECTED";
            case "reopen" -> "DRAFT";
            case "cancel" -> "CANCELLED";
            case "post" -> "POSTED";
            default -> e.getStatus();
        };
    }

    private void post(String key, DocEntity e) {
        DocTypes.DocDef def = DocTypes.get(key);
        List<LedgerLine> lines = collectLines(def, e);
        for (LedgerLine l : lines) {
            double in = 0, out = 0;
            switch (def.effect()) {
                case IN -> in = l.qty();
                case OUT -> out = l.qty();
                case ADJUST -> {
                    double cur = currentOnHand(l.item(), l.loc(), l.batch());
                    double diff = l.qty() - cur;
                    if (diff >= 0) in = diff; else out = -diff;
                }
                default -> { }
            }
            if (in == 0 && out == 0) continue;
            ledger.save(StockLedger.builder()
                    .txDate(e.getDocDate()).docNo(e.getDocNo()).docType(key)
                    .txType(def.tx().isEmpty() ? key.toUpperCase() : def.tx())
                    .itemCode(l.item()).location(l.loc()).batchNo(l.batch()).heatNo(l.heat())
                    .inQty(BigDecimal.valueOf(in)).outQty(BigDecimal.valueOf(out))
                    .createdBy(e.getCreatedBy()).createdAt(Instant.now())
                    .build());
        }
    }

    private record LedgerLine(String item, String loc, String batch, String heat, double qty) {}

    private double currentOnHand(String item, String loc, String batch) {
        BigDecimal balance = ledger.onHandBalance(item, loc, batch);
        return balance == null ? 0 : balance.doubleValue();
    }

    private List<LedgerLine> collectLines(DocTypes.DocDef def, DocEntity e) {
        List<LedgerLine> out = new ArrayList<>();
        if (def.hasLines()) {
            for (LineEntity l : e.getLines()) {
                String loc = firstNonEmpty(l.getLocation(), headerStr(e, "sourceLocation"), headerStr(e, "storeLocation"));
                out.add(new LedgerLine(l.getItemCode(), loc, l.getBatchNo(), l.getHeatNo(), l.getQty().doubleValue()));
            }
            return out;
        }
        if (def.effect() == DocTypes.Effect.ADJUST) {
            out.add(new LedgerLine(headerStr(e, "itemCode"), headerStr(e, "location"),
                    headerStr(e, "batchNo"), "", numOrZero(headerVal(e, "correctedQty"))));
        }
        return out;
    }

    private String headerStr(DocEntity e, String field) {
        Object v = headerVal(e, field);
        return v == null ? "" : String.valueOf(v);
    }

    private double numOrZero(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(v)); } catch (Exception ex) { return 0; }
    }

    private Object headerVal(DocEntity e, String field) {
        try {
            Field f = e.getClass().getDeclaredField(field);
            f.setAccessible(true);
            return f.get(e);
        } catch (Exception ex) { return null; }
    }

    @SuppressWarnings("unchecked")
    private void attach(DocEntity e) {
        if (e.getLines() == null) return;
        for (LineEntity l : e.getLines()) {
            Class<?> clazz = l.getClass();
            while (clazz != null && clazz != Object.class) {
                try {
                    Field f = clazz.getDeclaredField("doc");
                    f.setAccessible(true);
                    f.set(l, e);
                    break;
                } catch (Exception ignored) {
                    clazz = clazz.getSuperclass();
                }
            }
        }
    }

    private String findKeyForEntity(DocEntity e) {
        for (var entry : reg.entrySet()) {
            if (entry.getValue() == e.getClass()) return entry.getKey();
        }
        return "";
    }

    private LocalDate parse(Object o) {
        if (o == null) return LocalDate.now();
        try { return LocalDate.parse(String.valueOf(o)); } catch (Exception ex) { return LocalDate.now(); }
    }

    private String firstNonEmpty(String... v) {
        for (String s : v) if (s != null && !s.isEmpty()) return s;
        return "";
    }

    private String firstOf(Map<String, Object> r, String... keys) {
        for (String k : keys) {
            Object v = r.get(k);
            if (v != null && !String.valueOf(v).isEmpty()) return String.valueOf(v);
        }
        return "";
    }
}

package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.QualityCalibrationInstrument;
import in.zygertechnology.zygererp.entity.QualityInspection;
import in.zygertechnology.zygererp.entity.QualityInspectionLine;
import in.zygertechnology.zygererp.entity.QualityNcr;
import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class QualityInspectionService {

    private final EntityManager em;
    private final ObjectMapper mapper;
    private final DocNumberService numbers;
    private final DocumentFacade docs;
    private final QualityCalibrationInstrumentRepository instruments;
    private final StockService stockService;

    public static final String KEY = "quality-inspection";
    private static final String INSPECT = "SUBMITTED";
    private static final String APPROVED = "APPROVED";

    public QualityInspection get(Long id) {
        return (QualityInspection) docs.get(KEY, id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRow(Long id) {
        return docs.getRow(KEY, id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(Map<String, String> q) {
        return docs.list(KEY, q);
    }

    @Transactional
    public QualityInspection create(Map<String, Object> body, String user) {
        QualityInspection e = mapper.convertValue(body, QualityInspection.class);
        if (e.getInspectionNumber() == null || e.getInspectionNumber().isBlank()) {
            e.setInspectionNumber(numbers.next(KEY, prefixFor(e)));
        }
        e.setDocNo(e.getInspectionNumber());
        LocalDate d = parseDate(body.get("date"));
        if (d == null) d = parseDate(body.get("inspectionDate"));
        if (d == null) d = LocalDate.now();
        e.setDocDate(d);
        e.setInspectionDate(d);
        e.setInspectionStatus("DRAFT");
        e.setDecisionStatus("NONE");
        if (body.get("receivedQuantity") != null)
            e.setReceivedQuantity(bdVal(body.get("receivedQuantity")));
        if (body.get("inspectionQuantity") != null)
            e.setInspectionQuantity(bdVal(body.get("inspectionQuantity")));
        e.setCreatedBy(user);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        attach(e, body);
        for (QualityInspectionLine l : e.getLines()) evaluate(l);
        em.persist(e);

        BigDecimal inQty = e.getAcceptedQuantity() != null && e.getAcceptedQuantity().compareTo(BigDecimal.ZERO) > 0
                ? e.getAcceptedQuantity()
                : (e.getInspectionQuantity() != null && e.getInspectionQuantity().compareTo(BigDecimal.ZERO) > 0
                ? e.getInspectionQuantity()
                : e.getReceivedQuantity());
        if (inQty == null || inQty.compareTo(BigDecimal.ZERO) <= 0) {
            inQty = BigDecimal.ONE;
        }

        if (e.getItemCode() != null && !e.getItemCode().isBlank()) {
            stockService.recordStockIn(
                e.getDocNo(),
                "QUALITY_INSPECTION",
                "INSPECTION_STOCK_IN",
                e.getItemCode(),
                "MAIN",
                e.getBatchNumber(),
                e.getHeatNumber(),
                inQty,
                e.getDocDate() != null ? e.getDocDate() : LocalDate.now(),
                user
            );
        }

        return e;
    }

    private String prefixFor(QualityInspection e) {
        if (e.getInspectionType() == null) return DocTypes.get(KEY).prefix();
        return switch (e.getInspectionType()) {
            case IQC -> "IQC";
            case LO -> "LO";
            case JOMIN -> "JOMIN";
            case FAI -> "FAI";
            case IPQC -> "IPQC";
            case LINE -> "LIN";
            case LAST_OFF -> "LOF";
            case FINAL -> "FIN";
        };
    }

    @Transactional
    public QualityInspection saveMeasurements(Long inspectionId,
                                              List<Map<String, Object>> results, String user) {
        QualityInspection ins = get(inspectionId);
        checkEditable(ins);

        Map<String, QualityInspectionLine> byCode = new HashMap<>();
        for (QualityInspectionLine l : ins.getLines()) byCode.put(l.getCharacteristicCode(), l);

        for (Map<String, Object> r : results) {
            String code = strVal(r.get("characteristicCode"));
            QualityInspectionLine l = byCode.get(code);
            if (l == null) continue;
            if (r.get("balloonNo") != null) l.setBalloonNo(strVal(r.get("balloonNo")));
            if (r.get("actualValue") != null) l.setActualValue(bdVal(r.get("actualValue")));
            if (r.get("actualText") != null) l.setActualText(strVal(r.get("actualText")));
            if (r.get("actualMin") != null) l.setActualMin(bdVal(r.get("actualMin")));
            if (r.get("actualMax") != null) l.setActualMax(bdVal(r.get("actualMax")));
            if (r.get("actualAvg") != null) l.setActualAvg(bdVal(r.get("actualAvg")));
            if (r.get("instrumentCode") != null) {
                l.setInstrumentCode(strVal(r.get("instrumentCode")));
                calibGuard(strVal(r.get("instrumentCode")), ins);
                QualityCalibrationInstrument inst = instruments.findByInstrumentCode(l.getInstrumentCode()).orElse(null);
                if (inst != null) {
                    l.setCalibrationStatus(inst.getStatus());
                    l.setInstrumentCode(inst.getInstrumentCode());
                }
            }
            if (r.get("sampleNumber") != null) l.setSampleNumber((Integer) r.get("sampleNumber"));
            if (r.get("pieceNumber") != null) l.setPieceNumber((Integer) r.get("pieceNumber"));
            if (r.get("remark") != null) l.setRemark(strVal(r.get("remark")));
            l.setMeasuredBy(user);
            l.setMeasuredAt(Instant.now());
            evaluate(l);
        }
        ins.setUpdatedAt(Instant.now());
        em.flush();
        return ins;
    }

    void evaluate(QualityInspectionLine l) {
        BigDecimal actual = l.getActualValue();
        String actualTxt = l.getActualText();
        Boolean mandatory = Boolean.TRUE.equals(l.getIsMandatory());

        if (actual == null && (actualTxt == null || actualTxt.isBlank()) && !mandatory) {
            l.setResult("NA");
            return;
        }
        if (actual == null && (actualTxt == null || actualTxt.isBlank())) {
            l.setResult("PENDING");
            return;
        }

        // Text / Visual characteristic evaluation
        if (actualTxt != null && !actualTxt.isBlank() && l.getSpecificationText() != null && !l.getSpecificationText().isBlank()) {
            boolean pass = actualTxt.trim().equalsIgnoreCase(l.getSpecificationText().trim())
                    || actualTxt.trim().equalsIgnoreCase("PASS")
                    || actualTxt.trim().equalsIgnoreCase("OK");
            l.setResult(pass ? "PASS" : "FAIL");
            return;
        }

        if (actual != null) {
            BigDecimal lo = l.getLowerLimit();
            BigDecimal hi = l.getUpperLimit();
            boolean within = true;

            if (lo != null && hi != null) {
                within = actual.compareTo(lo) >= 0 && actual.compareTo(hi) <= 0;
            } else if (hi != null) {
                within = actual.compareTo(hi) <= 0;
            } else if (lo != null) {
                within = actual.compareTo(lo) >= 0;
            }

            l.setResult(within ? "PASS" : "FAIL");
            BigDecimal nom = l.getNominalValue();
            if (nom != null) {
                l.setDeviation(actual.subtract(nom));
            } else if (lo != null && hi != null) {
                l.setDeviation(actual.subtract(lo.add(hi).divide(BigDecimal.valueOf(2))));
            } else {
                l.setDeviation(BigDecimal.ZERO);
            }
        } else {
            l.setResult("PASS");
        }
    }

    @Transactional
    public QualityInspection start(Long id, String user) {
        QualityInspection ins = get(id);
        require(ins, "DRAFT", "PENDING", "REJECTED");
        ins.setInspectionStatus("IN_PROGRESS");
        ins.setAssignedInspector(user);
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection submit(Long id, String user) {
        QualityInspection ins = get(id);
        require(ins, "IN_PROGRESS", "DRAFT");
        validateQuantities(ins);
        ins.setInspectionStatus(INSPECT);
        ins.setDecisionStatus("PENDING");
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection hold(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        require(ins, INSPECT, "IN_PROGRESS");
        ins.setInspectionStatus("HOLD");
        ins.setDecisionRemarks(reason);
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection releaseHold(Long id, String user) {
        QualityInspection ins = get(id);
        require(ins, "HOLD");
        ins.setInspectionStatus(INSPECT);
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection decide(Long id, String decision, String remarks, String user) {
        QualityInspection ins = get(id);
        require(ins, INSPECT);
        String d = (decision == null) ? "PASS" : decision.toUpperCase();
        if (List.of("FAIL", "REJECT", "FAILING").contains(d)) {
            ins.setInspectionStatus("FAIL");
            ins.setDecisionStatus("FAIL");
        } else if (d.equals("HOLD")) {
            ins.setInspectionStatus("HOLD");
            ins.setDecisionStatus("HOLD");
        } else {
            if (hasCriticalFail(ins)) {
                ins.setInspectionStatus("HOLD");
                ins.setDecisionStatus("HOLD");
                ins.setDecisionRemarks("Critical characteristic failed; requires review. " + safe(remarks));
            } else {
                ins.setInspectionStatus("PASS");
                ins.setDecisionStatus("PASS");
            }
        }
        ins.setFinalDecision(ins.getInspectionStatus());
        ins.setDecisionRemarks(safe(remarks));
        ins.setApprovedBy(ins.getInspectionStatus().equals("PASS") ? user : ins.getApprovedBy());
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection approve(Long id, String user) {
        QualityInspection ins = get(id);
        require(ins, INSPECT);
        validateQuantities(ins);
        ins.setInspectionStatus(APPROVED);
        ins.setDecisionStatus(ins.getDecisionStatus());
        ins.setApprovedBy(user);
        ins.setApprovedAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection close(Long id, String user) {
        QualityInspection ins = get(id);
        if (ins.getInspectionStatus().equals("FAIL") || hasFailedLine(ins)) {
            if (!hasNcr(ins)) {
                throw new IllegalStateException(
                        "Inspection with failed characteristics cannot be closed without a disposition/NCR");
            }
        } else {
            requireClosable(ins, INSPECT, "PASS", "HOLD", APPROVED);
        }
        ins.setInspectionStatus("CLOSED");
        ins.setClosedAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection cancel(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        require(ins, "DRAFT", INSPECT);
        ins.setInspectionStatus("CANCELLED");
        ins.setCancellationReason(reason);
        ins.setCancelledAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    @Transactional
    public QualityInspection reopen(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        require(ins, "CLOSED");
        ins.setInspectionStatus("IN_PROGRESS");
        ins.setReopenReason(reason);
        ins.setClosedAt(null);
        ins.setUpdatedAt(Instant.now());
        return ins;
    }

    private void checkEditable(QualityInspection ins) {
        String s = ins.getInspectionStatus();
        if (s.equals("CLOSED") || s.equals(APPROVED)) {
            throw new IllegalStateException("Approved/closed inspection cannot be modified");
        }
    }

    private void require(QualityInspection ins, String... allowed) {
        for (String a : allowed) if (a.equals(ins.getInspectionStatus())) return;
        throw new IllegalStateException("Action not allowed in status " + ins.getInspectionStatus());
    }

    private void requireClosable(QualityInspection ins, String... allowed) {
        for (String a : allowed) if (a.equals(ins.getInspectionStatus())) return;
        throw new IllegalStateException("Cannot close in status " + ins.getInspectionStatus());
    }

    private void validateQuantities(QualityInspection ins) {
        BigDecimal insp = ins.getInspectionQuantity();
        BigDecimal recv = ins.getReceivedQuantity();
        if (insp != null && recv != null && insp.compareTo(recv) > 0) {
            throw new IllegalArgumentException("Inspection quantity cannot exceed received quantity");
        }
        BigDecimal sum = BigDecimal.ZERO;
        sum = sum.add(nz(ins.getAcceptedQuantity()));
        sum = sum.add(nz(ins.getRejectedQuantity()));
        sum = sum.add(nz(ins.getHoldQuantity()));
        sum = sum.add(nz(ins.getReworkQuantity()));
        sum = sum.add(nz(ins.getScrapQuantity()));
        sum = sum.add(nz(ins.getReturnQuantity()));
        sum = sum.add(nz(ins.getConcessionQuantity()));
        BigDecimal limit = insp != null ? insp : (recv != null ? recv : BigDecimal.ZERO);
        if (sum.compareTo(limit) > 0) {
            throw new IllegalArgumentException(
                    "Accepted+rejected+hold+rework+scrap+return+concession ("
                            + sum + ") must not exceed inspected quantity (" + limit + ")");
        }
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private boolean hasCriticalFail(QualityInspection ins) {
        for (QualityInspectionLine l : ins.getLines()) {
            if (Boolean.TRUE.equals(l.getIsCritical()) && "FAIL".equals(l.getResult())) return true;
        }
        return false;
    }

    private boolean hasFailedLine(QualityInspection ins) {
        for (QualityInspectionLine l : ins.getLines()) {
            if ("FAIL".equals(l.getResult())) return true;
        }
        return false;
    }

    private boolean hasNcr(QualityInspection ins) {
        String check = "select count(n) from in.zygertechnology.zygererp.entity.QualityNcr n " +
                "where n.inspectionId = :id";
        Long c = em.createQuery(check, Long.class)
                .setParameter("id", ins.getId()).getSingleResult();
        return c != null && c > 0;
    }

    private void calibGuard(String code, QualityInspection ins) {
        QualityCalibrationInstrument i = instruments.findByInstrumentCode(code).orElse(null);
        if (i == null) return;
        String st = i.getStatus();
        if (st == null) return;
        String policy = i.getCalibrationPolicy() == null ? "WARN" : i.getCalibrationPolicy();
        boolean blocking = List.of("EXPIRED", "FAILED", "UNDER_REPAIR", "RETIRED").contains(st);
        if (blocking && "BLOCK".equalsIgnoreCase(policy)) {
            throw new IllegalStateException(
                    "Instrument " + code + " is " + st + "; cannot be used (" + policy + " policy)");
        }
    }

    private void attach(QualityInspection e, Map<String, Object> body) {
        Object lines = body.get("lines");
        if (lines instanceof Collection<?> c) {
            for (Object o : c) {
                QualityInspectionLine l = mapper.convertValue(o, QualityInspectionLine.class);
                if (l.getCharacteristicCode() == null && l.getItemCode() != null)
                    l.setCharacteristicCode(l.getItemCode());
                l.setQty(BigDecimal.ONE);
                l.setDoc(e);
                e.getLines().add(l);
            }
        }
    }

    private LocalDate parseDate(Object v) {
        if (v == null) return null;
        try { return LocalDate.parse(v.toString().substring(0, 10)); }
        catch (Exception e) { return null; }
    }

    private BigDecimal bdVal(Object v) {
        if (v == null) return null;
        try { return new BigDecimal(String.valueOf(v)); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String strVal(Object v) { return v == null ? "" : String.valueOf(v); }

    private String safe(String s) { return s == null ? "" : s; }

    public String nextNumber(String key) { return numbers.next(key); }
}

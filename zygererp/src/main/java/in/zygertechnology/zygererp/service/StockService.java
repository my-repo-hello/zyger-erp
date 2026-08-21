package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.LineEntity;
import in.zygertechnology.zygererp.entity.StockLedger;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@Transactional
public class StockService {

    private final LedgerRepository ledger;
    private final DocumentFacade docs;

    public StockService(LedgerRepository ledger, DocumentFacade docs) {
        this.ledger = ledger;
        this.docs = docs;
    }

    public record Balance(String item, String loc, String batch, String heat,
                          double onHand, double reserved) {
        public double available() { return onHand - reserved; }
    }

    public static String key(String i, String l, String b, String h) {
        return String.join("|", str(i), str(l), str(b), str(h));
    }

    public static double bd(BigDecimal v) { return v == null ? 0 : v.doubleValue(); }

    public static String str(Object o) { return o == null ? "" : String.valueOf(o); }

    public Map<String, Balance> balances() {
        Map<String, double[]> acc = new LinkedHashMap<>();
        Map<String, String[]> meta = new LinkedHashMap<>();
        for (StockLedger e : ledger.findAllByOrderByTxDateAsc()) {
            String k = key(e.getItemCode(), e.getLocation(), e.getBatchNo(), e.getHeatNo());
            double[] a = acc.computeIfAbsent(k, x -> new double[2]);
            a[0] += bd(e.getInQty());
            a[1] += bd(e.getOutQty());
            meta.put(k, new String[]{e.getItemCode(), e.getLocation(), e.getBatchNo(), e.getHeatNo()});
        }
        Map<String, Balance> m = new LinkedHashMap<>();
        acc.forEach((k, a) -> {
            String[] s = meta.get(k);
            m.put(k, new Balance(s[0], s[1], s[2], s[3], a[0] - a[1], 0));
        });

        reservations().forEach((k, q) -> {
            Balance b = m.get(k);
            if (b != null) m.put(k, new Balance(b.item(), b.loc(), b.batch(), b.heat(), b.onHand(), q));
            else {
                String[] s = k.split("\\|", -1);
                m.put(k, new Balance(s[0], s[1], s[2], s[3], 0, q));
            }
        });
        return m;
    }

    /** Reserved quantities: APPROVED stock-allotment lines minus POSTED stock-release lines. */
    private Map<String, Double> reservations() {
        Map<String, Double> r = new LinkedHashMap<>();
        for (DocEntity a : docs.findAll("stock-allotment")) {
            if (!"APPROVED".equals(a.getStatus())) continue;
            for (LineEntity l : a.getLines()) {
                r.merge(key(l.getItemCode(), l.getLocation(), l.getBatchNo(), l.getHeatNo()),
                        bd(l.getQty()), Double::sum);
            }
        }
        for (DocEntity x : docs.findAll("stock-release")) {
            if (!"POSTED".equals(x.getStatus())) continue;
            for (LineEntity l : x.getLines()) {
                double left = bd(l.getQty());
                String item = str(l.getItemCode()), batch = str(l.getBatchNo());
                for (Map.Entry<String, Double> e : r.entrySet()) {
                    if (left <= 0) break;
                    String[] p = e.getKey().split("\\|", -1);
                    if (p[0].equals(item) && (batch.isEmpty() || p[2].equals(batch))) {
                        double take = Math.min(e.getValue(), left);
                        e.setValue(e.getValue() - take);
                        left -= take;
                    }
                }
            }
        }
        r.values().removeIf(v -> v <= 0);
        return r;
    }

    public double available(String item, String loc) {
        return balances().values().stream()
                .filter(b -> b.item().equals(item)
                        && (loc == null || loc.isEmpty() || b.loc().equals(loc)))
                .mapToDouble(Balance::available).sum();
    }

    public double onHand(String item, String loc, String batch) {
        return balances().values().stream()
                .filter(b -> b.item().equals(item)
                        && (loc == null || loc.isEmpty() || b.loc().equals(loc))
                        && (batch == null || batch.isEmpty() || str(b.batch()).equals(batch)))
                .mapToDouble(Balance::onHand).sum();
    }

    public StockLedger recordStockIn(String docNo, String docType, String txType, String itemCode,
                                    String location, String batchNo, String heatNo,
                                    BigDecimal inQty, java.time.LocalDate txDate, String user) {
        StockLedger entry = StockLedger.builder()
                .docNo(docNo)
                .docType(docType)
                .txType(txType)
                .itemCode(itemCode)
                .location(location != null ? location : "MAIN")
                .batchNo(batchNo != null ? batchNo : "")
                .heatNo(heatNo != null ? heatNo : "")
                .inQty(inQty != null ? inQty : BigDecimal.ZERO)
                .outQty(BigDecimal.ZERO)
                .txDate(txDate != null ? txDate : java.time.LocalDate.now())
                .createdBy(user)
                .createdAt(java.time.Instant.now())
                .build();
        return ledger.save(entry);
    }

    public StockLedger recordStockOut(String docNo, String docType, String txType, String itemCode,
                                     String location, String batchNo, String heatNo,
                                     BigDecimal outQty, java.time.LocalDate txDate, String user) {
        verifyStockAvailability(itemCode, location, outQty);
        StockLedger entry = StockLedger.builder()
                .docNo(docNo)
                .docType(docType)
                .txType(txType)
                .itemCode(itemCode)
                .location(location != null ? location : "MAIN")
                .batchNo(batchNo != null ? batchNo : "")
                .heatNo(heatNo != null ? heatNo : "")
                .inQty(BigDecimal.ZERO)
                .outQty(outQty != null ? outQty : BigDecimal.ZERO)
                .txDate(txDate != null ? txDate : java.time.LocalDate.now())
                .createdBy(user)
                .createdAt(java.time.Instant.now())
                .build();
        return ledger.save(entry);
    }

    public void verifyStockAvailability(String itemCode, String location, BigDecimal requiredQty) {
        if (requiredQty == null || requiredQty.compareTo(BigDecimal.ZERO) <= 0) return;
        double avail = available(itemCode, location);
        if (avail < requiredQty.doubleValue()) {
            throw new IllegalArgumentException("Insufficient available stock for item '" + itemCode +
                    "' at location '" + (location == null ? "MAIN" : location) + "'. Requested: " +
                    requiredQty + ", Available: " + avail);
        }
    }
}


package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.QualityInspection;
import in.zygertechnology.zygererp.entity.QualityNcr;
import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.QualityInspectionService;
import in.zygertechnology.zygererp.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

/**
 * Quality Module API — common inspection engine.
 *
 * Mounted under /api/v1/quality (version-stripped to /api/quality at the gateway
 * where required; see SecurityConfig CORS). The module root follows the spec.
 */
@RestController
@RequestMapping("/api/v1/quality")
@RequiredArgsConstructor
public class QualityController {

    private final QualityInspectionService quality;
    private final DocumentFacade docs;
    private final ExportService export;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    // ---------- Inspection list / create / read / update ----------

    @GetMapping("/inspections")
    public Map<String, Object> listInspections(@RequestParam Map<String, String> q) {
        return quality.list(q);
    }

    @PostMapping("/inspections")
    public Map<String, Object> createInspection(@RequestBody Map<String, Object> body, Principal p) {
        QualityInspection e = quality.create(body, principalName(p));
        return docs.toRow(e);
    }

    @GetMapping("/inspections/{id}")
    public Map<String, Object> getInspection(@PathVariable Long id) {
        return quality.getRow(id);
    }

    @PutMapping("/inspections/{id}")
    public Map<String, Object> updateInspection(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body,
                                                Principal p) {
        QualityInspection old = quality.get(id);
        if (!List.of("DRAFT", "REJECTED").contains(old.getInspectionStatus())) {
            throw new IllegalStateException("Only DRAFT/REJECTED inspections can be edited");
        }
        // merge: re-create via the generic facade update (handles lines)
        Map<String, Object> merged = new HashMap<>(body);
        return docs.toRow(docs.update(QualityInspectionService.KEY, id, merged, principalName(p)));
    }

    @DeleteMapping("/inspections/{id}")
    public void deleteInspection(@PathVariable Long id, Principal p) {
        // generic engine gates to DRAFT/REJECTED
        docs.remove(QualityInspectionService.KEY, id, principalName(p));
    }

    @GetMapping("/inspections/next-number")
    public Map<String, Object> nextNumber() {
        return Map.of("nextNumber", docs.nextNumber(QualityInspectionService.KEY));
    }

    // ---------- Workflow actions (spec 6.4) ----------

    @PostMapping("/inspections/{id}/start")
    public Map<String, Object> start(@PathVariable Long id, Principal p) {
        return docs.toRow(quality.start(id, principalName(p)));
    }

    @PostMapping("/inspections/{id}/save-measurements")
    public Map<String, Object> saveMeasurements(@PathVariable Long id,
                                                @RequestBody List<Map<String, Object>> body,
                                                Principal p) {
        return docs.toRow(quality.saveMeasurements(id, body, principalName(p)));
    }

    @PostMapping("/inspections/{id}/submit")
    public Map<String, Object> submit(@PathVariable Long id, Principal p) {
        return docs.toRow(quality.submit(id, principalName(p)));
    }

    @PostMapping("/inspections/{id}/decision")
    public Map<String, Object> decision(@PathVariable Long id,
                                        @RequestBody Map<String, String> body, Principal p) {
        return docs.toRow(quality.decide(id,
                body.getOrDefault("decision", "PASS"),
                body.get("remarks"), principalName(p)));
    }

    @PostMapping("/inspections/{id}/approve")
    public Map<String, Object> approve(@PathVariable Long id, Principal p) {
        return docs.toRow(quality.approve(id, principalName(p)));
    }

    @PostMapping("/inspections/{id}/hold")
    public Map<String, Object> hold(@PathVariable Long id,
                                    @RequestBody(required = false) Map<String, String> body, Principal p) {
        return docs.toRow(quality.hold(id, body == null ? null : body.get("reason"), principalName(p)));
    }

    @PostMapping("/inspections/{id}/release-hold")
    public Map<String, Object> releaseHold(@PathVariable Long id, Principal p) {
        return docs.toRow(quality.releaseHold(id, principalName(p)));
    }

    @PostMapping("/inspections/{id}/close")
    public Map<String, Object> close(@PathVariable Long id, Principal p) {
        return docs.toRow(quality.close(id, principalName(p)));
    }

    @PostMapping("/inspections/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable Long id,
                                      @RequestBody(required = false) Map<String, String> body, Principal p) {
        return docs.toRow(quality.cancel(id, body == null ? null : body.get("reason"), principalName(p)));
    }

    @PostMapping("/inspections/{id}/reopen")
    public Map<String, Object> reopen(@PathVariable Long id,
                                      @RequestBody(required = false) Map<String, String> body, Principal p) {
        return docs.toRow(quality.reopen(id, body == null ? null : body.get("reason"), principalName(p)));
    }

    // ---------- Characteristics ----------

    @GetMapping("/inspections/{id}/characteristics")
    public Map<String, Object> characteristics(@PathVariable Long id) {
        QualityInspection ins = quality.get(id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("inspectionId", ins.getId());
        out.put("inspectionNumber", ins.getInspectionNumber());
        out.put("characteristics", docs.toRow(ins).get("lines"));
        return out;
    }

    @PutMapping("/inspections/{id}/characteristics")
    public Map<String, Object> replaceCharacteristics(@PathVariable Long id,
                                                      @RequestBody List<Map<String, Object>> body) {
        return saveMeasurementsPut(id, body);
    }

    @PostMapping("/inspections/{id}/characteristics/bulk-save")
    public Map<String, Object> bulkSave(@PathVariable Long id,
                                        @RequestBody List<Map<String, Object>> body, Principal p) {
        return docs.toRow(quality.saveMeasurements(id, body, principalName(p)));
    }

    private Map<String, Object> saveMeasurementsPut(Long id, List<Map<String, Object>> body) {
        return docs.toRow(quality.saveMeasurements(id, body, "system"));
    }

    // ---------- Pending queue helpers (spec 6.2) ----------

    @GetMapping("/inspection-pending/count")
    public Map<String, Object> pendingCount(@RequestParam Map<String, String> q) {
        Map<String, String> copy = new HashMap<>(q);
        copy.put("status", "PENDING");
        Map<String, Object> page = quality.list(copy);
        return Map.of("count", page.get("totalElements"));
    }

    // ---------- Non-Conformance Reports ----------

    @GetMapping("/ncrs")
    public Map<String, Object> listNcrs(@RequestParam Map<String, String> q) {
        Map<String, String> copy = new HashMap<>(q);
        copy.put("status", copy.getOrDefault("status", "PENDING"));
        return docs.list("quality-ncr", copy);
    }

    @PostMapping("/ncrs")
    public Map<String, Object> createNcr(@RequestBody Map<String, Object> body, Principal p) {
        body.put("createdBy", principalName(p));
        return docs.toRow(docs.create("quality-ncr", body, principalName(p)));
    }

    @GetMapping("/ncrs/{id}")
    public Map<String, Object> getNcr(@PathVariable Long id) {
        return docs.getRow("quality-ncr", id);
    }

    @PutMapping("/ncrs/{id}")
    public Map<String, Object> updateNcr(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body,
                                         Principal p) {
        return docs.toRow(docs.update("quality-ncr", id, body, principalName(p)));
    }

    @DeleteMapping("/ncrs/{id}")
    public void deleteNcr(@PathVariable Long id, Principal p) {
        docs.remove("quality-ncr", id, principalName(p));
    }

    @GetMapping("/ncrs/next-number")
    public Map<String, Object> nextNcrNumber() {
        return Map.of("nextNumber", docs.nextNumber("quality-ncr"));
    }
}

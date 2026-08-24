package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.PlanningService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/planning")
@RequirePermission(module = "PLANNING", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class PlanningController {

    private static final Set<String> ALLOWED = Set.of(
            "production-bom", "route-sheet", "work-order", "shop-floor-entry"
    );

    private final DocumentFacade svc;
    private final PlanningService planning;
    private final ExportService export;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    private static String key(String type) {
        if (!ALLOWED.contains(type)) {
            throw new IllegalArgumentException("Unknown planning document type: " + type);
        }
        return type;
    }

    @GetMapping("/{type}")
    Map<String, Object> list(@PathVariable String type, @RequestParam Map<String, String> q) {
        return svc.list(key(type), q);
    }

    @PostMapping("/{type}")
    Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(planning.create(key(type), b, principalName(p)));
    }

    @GetMapping("/{type}/{id}")
    Map<String, Object> get(@PathVariable String type, @PathVariable Long id) {
        return svc.getRow(key(type), id);
    }

    @PutMapping("/{type}/{id}")
    Map<String, Object> update(@PathVariable String type, @PathVariable Long id,
                               @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(planning.update(key(type), id, b, principalName(p)));
    }

    @DeleteMapping("/{type}/{id}")
    void del(@PathVariable String type, @PathVariable Long id, Principal p) {
        svc.remove(key(type), id, principalName(p));
    }

    @GetMapping("/{type}/next-number")
    Map<String, Object> next(@PathVariable String type) {
        return Map.of("nextNumber", svc.nextNumber(key(type)));
    }

    @PostMapping("/{type}/{id}/actions/{action}")
    Map<String, Object> act(@PathVariable String type, @PathVariable Long id, @PathVariable String action,
                            @RequestBody(required = false) Map<String, String> b, Principal p) {
        return svc.toRow(planning.action(key(type), id, action,
                b == null ? "" : b.getOrDefault("note", ""), principalName(p)));
    }

    @GetMapping("/{type}/export")
    ResponseEntity<byte[]> export(@PathVariable String type, @RequestParam Map<String, String> q) {
        Map<String, Object> page = svc.list(key(type), q);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) page.getOrDefault("content", List.of());
        String format = q.getOrDefault("format", "xlsx");
        byte[] bytes = export.build(rows, format, key(type));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=" + key(type) + "." + format)
                .contentType(format.equals("pdf") ? MediaType.APPLICATION_PDF
                        : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return planning.dashboard();
    }

    @PostMapping("/work-order/{id}/populate")
    Map<String, Object> populateWo(@PathVariable Long id) {
        in.zygertechnology.zygererp.entity.WorkOrder wo = planning.populateFromBomAndRoute(id);
        return svc.toRow(wo);
    }
}

package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PlanningService {

    static final Set<String> PLANNING_KEYS = Set.of(
            "production-bom", "route-sheet", "work-order", "shop-floor-entry"
    );

    private final DocumentFacade docs;
    private final ProductionBOMRepository bomRepo;
    private final RouteSheetRepository routeRepo;

    public boolean isPlanning(String key) { return PLANNING_KEYS.contains(key); }

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        body.put("createdBy", user);
        validateBeforeCreate(key, body);
        DocEntity e = docs.create(key, body, user);
        applyCreationDefaults(key, e);
        return e;
    }

    @Transactional
    public DocEntity update(String key, Long id, Map<String, Object> body, String user) {
        validateBeforeUpdate(key, id, body);
        return docs.update(key, id, body, user);
    }

    private void validateBeforeUpdate(String key, Long id, Map<String, Object> body) {
        if ("production-bom".equals(key) && body.containsKey("parentBomId")) {
            Object parentBomId = body.get("parentBomId");
            if (parentBomId != null) {
                long parentId = Long.parseLong(String.valueOf(parentBomId));
                if (parentId == id) {
                    throw new IllegalArgumentException("BOM cannot reference itself as parent.");
                }
                validateNotCircular(id, parentId);
                validateParentNotCyclic(parentId);
            }
        }
    }

    private void validateBeforeCreate(String key, Map<String, Object> body) {
        if ("production-bom".equals(key)) {
            Object parentBomId = body.get("parentBomId");
            Object bomId = body.get("id");
            if (parentBomId != null) {
                long parentId = Long.parseLong(String.valueOf(parentBomId));
                if (bomId != null) {
                    long id = Long.parseLong(String.valueOf(bomId));
                    validateNotCircular(id, parentId);
                } else {
                    validateParentNotCyclic(parentId);
                }
            }
        }
    }

    private void validateParentNotCyclic(Long parentBomId) {
        Set<Long> visited = new HashSet<>();
        Long current = parentBomId;
        while (current != null) {
            if (!visited.add(current)) {
                throw new IllegalArgumentException("Circular BOM hierarchy detected: cycle at BOM " + current);
            }
            Optional<ProductionBOM> bom = bomRepo.findById(current);
            if (bom.isPresent() && bom.get().getParentBomId() != null) {
                current = bom.get().getParentBomId();
            } else {
                break;
            }
        }
    }

    private void validateNotCircular(Long bomId, Long childBomId) {
        if (bomId.equals(childBomId)) {
            throw new IllegalArgumentException("BOM cannot reference itself as parent.");
        }
        Set<Long> visited = new HashSet<>();
        visited.add(bomId);
        Queue<Long> queue = new LinkedList<>();
        queue.add(childBomId);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (current.equals(bomId)) {
                throw new IllegalArgumentException("Circular BOM detected: " + childBomId + " creates a cycle.");
            }
            if (!visited.add(current)) continue;
            Optional<ProductionBOM> bom = bomRepo.findById(current);
            if (bom.isPresent() && bom.get().getLines() != null) {
                for (ProductionBOMLine line : bom.get().getLines()) {
                    if (line.getChildBomId() != null) queue.add(line.getChildBomId());
                }
            }
        }
    }

    private void applyCreationDefaults(String key, DocEntity e) {
        switch (key) {
            case "production-bom" -> {
                if (e instanceof ProductionBOM bom) {
                    if (bom.getBaseQuantity() == null) bom.setBaseQuantity(BigDecimal.ONE);
                    if (bom.getBaseUom() == null) bom.setBaseUom("PCS");
                    if (bom.getBomVersion() == null) bom.setBomVersion("1.0");
                    if (bom.getEffectiveFrom() == null) bom.setEffectiveFrom(LocalDate.now());
                }
            }
            case "route-sheet" -> {
                if (e instanceof RouteSheet rt) {
                    if (rt.getBaseQuantity() == null) rt.setBaseQuantity(BigDecimal.ONE);
                    if (rt.getBaseUom() == null) rt.setBaseUom("PCS");
                    if (rt.getRouteVersion() == null) rt.setRouteVersion("1.0");
                    if (rt.getEffectiveFrom() == null) rt.setEffectiveFrom(LocalDate.now());
                }
            }
            case "work-order" -> {
                if (e instanceof WorkOrder wo) {
                    if (wo.getPriority() == null) wo.setPriority("MEDIUM");
                    if (wo.getPlannedStartDate() == null) wo.setPlannedStartDate(LocalDate.now());
                    if (wo.getPlannedEndDate() == null) wo.setPlannedEndDate(LocalDate.now().plusDays(14));
                }
            }
            case "shop-floor-entry" -> {}
        }
    }

    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        if ("work-order".equals(key)) {
            return workOrderAction(id, action, note, user);
        }
        DocEntity e = docs.action(key, id, action, note, user);
        postActionHook(key, e, action, user);
        return e;
    }

    @Transactional
    public DocEntity workOrderAction(Long id, String action, String note, String user) {
        WorkOrder wo = (WorkOrder) docs.get("work-order", id);
        String current = wo.getStatus();
        String next;

        switch (action) {
            case "submit" -> {
                requireStatus(current, "DRAFT", "REJECTED");
                next = "SUBMITTED";
            }
            case "approve" -> {
                requireStatus(current, "SUBMITTED");
                next = "APPROVED";
                wo.setApprovedBy(user);
            }
            case "reject" -> {
                requireStatus(current, "SUBMITTED");
                next = "REJECTED";
            }
            case "reopen" -> {
                requireStatus(current, "REJECTED");
                next = "DRAFT";
            }
            case "release" -> {
                requireStatus(current, "APPROVED");
                validateWoCanRelease(wo);
                next = "RELEASED";
                wo.setReleasedBy(user);
            }
            case "start" -> {
                requireStatus(current, "RELEASED");
                next = "IN_PROCESS";
                wo.setActualStartDate(LocalDate.now());
            }
            case "complete" -> {
                requireStatus(current, "IN_PROCESS");
                next = "COMPLETED";
                wo.setActualEndDate(LocalDate.now());
            }
            case "close" -> {
                requireStatus(current, "COMPLETED");
                next = "CLOSED";
                wo.setClosedBy(user);
            }
            case "cancel" -> {
                requireStatus(current, "DRAFT", "SUBMITTED", "APPROVED");
                next = "CANCELLED";
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }

        wo.setStatus(next);
        wo.setUpdatedAt(Instant.now());
        return wo;
    }

    private void requireStatus(String current, String... allowed) {
        for (String s : allowed) if (s.equals(current)) return;
        throw new IllegalStateException("Action not allowed in status " + current + ". Required: " + Arrays.toString(allowed));
    }

    private void validateWoCanRelease(WorkOrder wo) {
        if (wo.getBomId() != null) {
            Optional<ProductionBOM> bom = bomRepo.findById(wo.getBomId());
            if (bom.isPresent() && !"APPROVED".equals(bom.get().getStatus())) {
                throw new IllegalStateException("BOM must be APPROVED before releasing Work Order.");
            }
        }
        if (wo.getRouteId() != null) {
            Optional<RouteSheet> route = routeRepo.findById(wo.getRouteId());
            if (route.isPresent() && !"APPROVED".equals(route.get().getStatus())) {
                throw new IllegalStateException("Route Sheet must be APPROVED before releasing Work Order.");
            }
        }
    }

    private void postActionHook(String key, DocEntity e, String action, String user) {
        if (!"approve".equals(action)) return;
        switch (key) {
            case "work-order" -> {
                if (e instanceof WorkOrder wo) {
                    wo.setApprovedBy(user);
                }
            }
            default -> {}
        }
    }

    @Transactional
    public WorkOrder populateFromBomAndRoute(Long workOrderId) {
        WorkOrder wo = (WorkOrder) docs.get("work-order", workOrderId);
        BigDecimal orderQty = wo.getOrderQuantity() == null ? BigDecimal.ONE : wo.getOrderQuantity();

        if (wo.getBomId() != null) {
            Optional<ProductionBOM> bomOpt = bomRepo.findById(wo.getBomId());
            if (bomOpt.isPresent()) {
                ProductionBOM bom = bomOpt.get();
                BigDecimal bomBaseQty = bom.getBaseQuantity() == null ? BigDecimal.ONE : bom.getBaseQuantity();
                BigDecimal scaleFactor = orderQty.divide(bomBaseQty, 10, RoundingMode.HALF_UP);

                List<WorkOrderMaterial> newMats = new ArrayList<>();
                int lineNo = 1;
                if (bom.getLines() != null) {
                    for (ProductionBOMLine bomLine : bom.getLines()) {
                        WorkOrderMaterial mat = new WorkOrderMaterial();
                        mat.setDoc(wo);
                        mat.setLineNo(lineNo++);
                        mat.setComponentItemCode(bomLine.getComponentItemCode());
                        mat.setComponentRevision(bomLine.getComponentRevision());
                        mat.setDescription(bomLine.getDescription());
                        BigDecimal qtyPer = bomLine.getQuantityPer() == null ? BigDecimal.ZERO : bomLine.getQuantityPer();
                        BigDecimal scrap = bomLine.getScrapPercentage() == null ? BigDecimal.ZERO : bomLine.getScrapPercentage();
                        BigDecimal required = qtyPer.multiply(scaleFactor)
                                .multiply(BigDecimal.ONE.add(scrap.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)));
                        mat.setRequiredQuantity(required.setScale(0, RoundingMode.CEILING));
                        mat.setIssuedQuantity(BigDecimal.ZERO);
                        mat.setReturnedQuantity(BigDecimal.ZERO);
                        mat.setShortageQuantity(mat.getRequiredQuantity());
                        mat.setRequiredDate(wo.getPlannedStartDate());
                        mat.setIssueMethod(bomLine.getIssueMethod());
                        mat.setWarehouse(bomLine.getWarehouse());
                        mat.setReservationStatus("None");
                        mat.setIssueStatus("Pending");
                        newMats.add(mat);
                    }
                }
                wo.getMaterials().clear();
                wo.getMaterials().addAll(newMats);
            }
        }

        if (wo.getRouteId() != null) {
            Optional<RouteSheet> routeOpt = routeRepo.findById(wo.getRouteId());
            if (routeOpt.isPresent()) {
                RouteSheet route = routeOpt.get();
                List<WorkOrderOperation> newOps = new ArrayList<>();
                if (route.getOperations() != null) {
                    for (RouteOperation rtOp : route.getOperations()) {
                        WorkOrderOperation woOp = new WorkOrderOperation();
                        woOp.setDoc(wo);
                        woOp.setOperationSequence(rtOp.getSequenceNo());
                        woOp.setOperationCode(rtOp.getOperationCode());
                        woOp.setOperationDescription(rtOp.getOperationDescription());
                        woOp.setWorkCenterCode(rtOp.getWorkCenterCode());
                        woOp.setMachineCode(rtOp.getMachineCode());
                        woOp.setPlannedQuantity(orderQty);
                        woOp.setCompletedQuantity(BigDecimal.ZERO);
                        woOp.setGoodQuantity(BigDecimal.ZERO);
                        woOp.setScrapQuantity(BigDecimal.ZERO);
                        woOp.setReworkQuantity(BigDecimal.ZERO);
                        woOp.setSetupTimePlanned(rtOp.getSetupTime());
                        woOp.setSetupTimeActual(BigDecimal.ZERO);
                        woOp.setCycleTimePlanned(rtOp.getCycleTime());
                        woOp.setCycleTimeActual(BigDecimal.ZERO);
                        woOp.setInspectionRequired(rtOp.isInspectionRequired());
                        woOp.setSubcontractFlag(rtOp.isSubcontractFlag());
                        woOp.setToolRequired(rtOp.isToolRequired());
                        woOp.setFixtureRequired(rtOp.isFixtureRequired());
                        woOp.setNcProgramReference(rtOp.getNcProgramReference());
                        woOp.setStatus("Pending");
                        newOps.add(woOp);
                    }
                }
                wo.getOperations().clear();
                wo.getOperations().addAll(newOps);
            }
        }

        wo.setUpdatedAt(Instant.now());
        return wo;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("totalBom", docs.count("production-bom"));
        d.put("totalRoutes", docs.count("route-sheet"));
        d.put("totalWorkOrders", docs.count("work-order"));
        d.put("pendingApproval", countByStatus("work-order", "SUBMITTED"));
        d.put("released", countByStatus("work-order", "RELEASED"));
        d.put("inProcess", countByStatus("work-order", "IN_PROCESS"));
        d.put("completed", countByStatus("work-order", "COMPLETED"));
        d.put("closed", countByStatus("work-order", "CLOSED"));
        d.put("totalShopFloor", docs.count("shop-floor-entry"));
        return d;
    }

    private long countByStatus(String key, String status) {
        Map<String, Object> page = docs.list(key, Map.of("status", status, "size", "1", "page", "0"));
        Object content = page.getOrDefault("content", List.of());
        if (content instanceof List<?> l) return l.size();
        return 0;
    }
}

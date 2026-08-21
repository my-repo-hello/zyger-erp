package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.service.DocNumberService;
import in.zygertechnology.zygererp.repo.MachineMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class MaintenanceController {

    private final BreakdownIntimationRepository breakdowns;
    private final BreakdownRectificationRepository rectifications;
    private final PMPlanRepository pmPlans;
    private final PMScheduleRepository pmSchedules;
    private final PMCompletionRepository pmCompletions;
    private final ToolServiceIntimationRepository toolServices;
    private final ToolServiceRectificationRepository toolRectifications;
    private final CalibrationScheduleRepository calSchedules;
    private final CalibrationEntryRepository calEntries;
    private final PowerConsumptionRepository powerConsumptions;
    private final WaterConsumptionRepository waterConsumptions;
    private final RootCauseAnalysisRepository rootCauseAnalyses;

    private final DocNumberService numbers;
    private final MachineMasterRepository machines;

    private String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    private void audit(Object e, String user) {
        try {
            var m = e.getClass().getMethod("setUpdatedAt", Instant.class);
            m.invoke(e, Instant.now());
            if (user != null) {
                var mb = e.getClass().getMethod("setUpdatedBy", String.class);
                mb.invoke(e, user);
            }
        } catch (Exception ignored) {}
    }

    private void setCreated(Object e, String user) {
        try {
            e.getClass().getMethod("setCreatedAt", Instant.class).invoke(e, Instant.now());
            e.getClass().getMethod("setCreatedBy", String.class).invoke(e, user);
        } catch (Exception ignored) {}
    }

    // ===========================
    // ---- BREAKDOWN INTIMATION -
    // ===========================

    @GetMapping("/api/v1/maintenance/breakdowns")
    public List<BreakdownIntimation> listBreakdowns() { return breakdowns.findAll(); }

    @PostMapping("/api/v1/maintenance/breakdowns")
    public BreakdownIntimation createBreakdown(@RequestBody BreakdownIntimation bd, Principal principal) {
        bd.setId(null);
        bd.setBreakdownNumber(numbers.next("breakdown-intimation", "BDI"));
        if (bd.getBreakdownDate() == null) bd.setBreakdownDate(LocalDate.now());
        if (bd.getBreakdownStartTime() == null) bd.setBreakdownStartTime(Instant.now());
        if (bd.getStatus() == null) bd.setStatus("OPEN");
        if (bd.getPriority() == null) bd.setPriority("MEDIUM");
        if (bd.getMachineCode() != null && !bd.getMachineCode().isBlank()) {
            if (!machines.existsByCode(bd.getMachineCode())) {
                throw new RuntimeException("Machine code '" + bd.getMachineCode() + "' does not exist");
            }
        }
        setCreated(bd, principalName(principal));
        return breakdowns.save(bd);
    }

    @GetMapping("/api/v1/maintenance/breakdowns/{id}")
    public BreakdownIntimation getBreakdown(@PathVariable Long id) {
        return breakdowns.findById(id).orElseThrow(() -> new RuntimeException("Breakdown not found"));
    }

    @PutMapping("/api/v1/maintenance/breakdowns/{id}")
    public BreakdownIntimation updateBreakdown(@PathVariable Long id, @RequestBody BreakdownIntimation bd, Principal principal) {
        BreakdownIntimation e = breakdowns.findById(id).orElseThrow(() -> new RuntimeException("Breakdown not found"));
        bd.setId(id);
        bd.setBreakdownNumber(e.getBreakdownNumber());
        bd.setCreatedAt(e.getCreatedAt());
        bd.setCreatedBy(e.getCreatedBy());
        audit(bd, principalName(principal));
        return breakdowns.save(bd);
    }

    @DeleteMapping("/api/v1/maintenance/breakdowns/{id}")
    public void deleteBreakdown(@PathVariable Long id) {
        BreakdownIntimation e = breakdowns.findById(id).orElseThrow(() -> new RuntimeException("Breakdown not found"));
        if ("CLOSED".equals(e.getStatus())) throw new RuntimeException("CLOSED breakdowns cannot be deleted");
        breakdowns.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/breakdowns/{id}/actions/{action}")
    public Map<String, Object> breakdownAction(@PathVariable Long id, @PathVariable String action,
                                                @RequestBody(required = false) Map<String, String> body, Principal principal) {
        BreakdownIntimation bd = breakdowns.findById(id).orElseThrow(() -> new RuntimeException("Breakdown not found"));
        String note = body != null ? body.getOrDefault("note", "") : "";
        Map<String, Object> result = new LinkedHashMap<>();

        switch (action.toLowerCase()) {
            case "assign":
                bd.setStatus("ASSIGNED");
                bd.setAssignedTo(note);
                break;
            case "diagnose":
                bd.setStatus("DIAGNOSED");
                bd.setDiagnosis(note);
                break;
            case "close":
                List<BreakdownRectification> rects = rectifications.findByBreakdownId(id);
                if (rects.isEmpty()) {
                    result.put("success", false);
                    result.put("errors", List.of("Cannot close without rectification details"));
                    return result;
                }
                bd.setStatus("CLOSED");
                break;
            case "cancel":
                bd.setStatus("CANCELLED");
                break;
            default:
                throw new RuntimeException("Unknown action: " + action);
        }
        audit(bd, principalName(principal));
        breakdowns.save(bd);
        result.put("success", true);
        result.put("data", breakdowns.findById(id).orElse(bd));
        return result;
    }

    // ===========================
    // ---- BREAKDOWN RECTIFICATION
    // ===========================

    @GetMapping("/api/v1/maintenance/breakdown-rectifications")
    public List<BreakdownRectification> listRectifications() { return rectifications.findAll(); }

    @PostMapping("/api/v1/maintenance/breakdown-rectifications")
    public BreakdownRectification createRectification(@RequestBody BreakdownRectification r, Principal principal) {
        r.setId(null);
        r.setRectificationNumber(numbers.next("breakdown-rectification", "BDR"));
        if (r.getBreakdownId() != null) {
            BreakdownIntimation bd = breakdowns.findById(r.getBreakdownId()).orElse(null);
            if (bd != null) {
                r.setBreakdownNumber(bd.getBreakdownNumber());
                r.setMachineCode(bd.getMachineCode());
            }
        }
        if (r.getServiceCost() == null) r.setServiceCost(BigDecimal.ZERO);
        if (r.getStatus() == null) r.setStatus("IN_PROGRESS");
        setCreated(r, principalName(principal));
        BreakdownRectification saved = rectifications.save(r);

        if (r.getStartTime() != null && r.getEndTime() != null) {
            long mins = ChronoUnit.MINUTES.between(r.getStartTime(), r.getEndTime());
            saved.setDowntimeMinutes(BigDecimal.valueOf(mins));
            rectifications.save(saved);
        }
        return saved;
    }

    @GetMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public BreakdownRectification getRectification(@PathVariable Long id) {
        return rectifications.findById(id).orElseThrow(() -> new RuntimeException("Rectification not found"));
    }

    @PutMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public BreakdownRectification updateRectification(@PathVariable Long id, @RequestBody BreakdownRectification r, Principal principal) {
        BreakdownRectification e = rectifications.findById(id).orElseThrow(() -> new RuntimeException("Rectification not found"));
        r.setId(id);
        r.setRectificationNumber(e.getRectificationNumber());
        r.setCreatedAt(e.getCreatedAt());
        r.setCreatedBy(e.getCreatedBy());
        audit(r, principalName(principal));
        if (r.getStartTime() != null && r.getEndTime() != null) {
            long mins = ChronoUnit.MINUTES.between(r.getStartTime(), r.getEndTime());
            r.setDowntimeMinutes(BigDecimal.valueOf(mins));
        }
        return rectifications.save(r);
    }

    @DeleteMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public void deleteRectification(@PathVariable Long id) {
        BreakdownRectification e = rectifications.findById(id).orElseThrow(() -> new RuntimeException("Rectification not found"));
        if ("CLOSED".equals(e.getStatus())) throw new RuntimeException("CLOSED rectifications cannot be deleted");
        rectifications.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/breakdown-rectifications/{id}/actions/{action}")
    public BreakdownRectification rectificationAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        BreakdownRectification r = rectifications.findById(id).orElseThrow(() -> new RuntimeException("Rectification not found"));
        switch (action.toLowerCase()) {
            case "complete": r.setStatus("COMPLETED"); r.setEndTime(Instant.now()); break;
            case "close": r.setStatus("CLOSED"); break;
            case "pass": r.setTestingResult("PASS"); break;
            case "fail": r.setTestingResult("FAIL"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(r, principalName(principal));
        return rectifications.save(r);
    }

    // ===========================
    // ---- PM PLAN -------------
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-plans")
    public List<PMPlan> listPMPlans() { return pmPlans.findAll(); }

    @PostMapping("/api/v1/maintenance/pm-plans")
    public PMPlan createPMPlan(@RequestBody PMPlan p, Principal principal) {
        p.setId(null);
        p.setPlanNumber(numbers.next("pm-plan", "PMP"));
        if (p.getStatus() == null) p.setStatus("ACTIVE");
        setCreated(p, principalName(principal));
        return pmPlans.save(p);
    }

    @GetMapping("/api/v1/maintenance/pm-plans/{id}")
    public PMPlan getPMPlan(@PathVariable Long id) {
        return pmPlans.findById(id).orElseThrow(() -> new RuntimeException("PM Plan not found"));
    }

    @PutMapping("/api/v1/maintenance/pm-plans/{id}")
    public PMPlan updatePMPlan(@PathVariable Long id, @RequestBody PMPlan p, Principal principal) {
        PMPlan e = pmPlans.findById(id).orElseThrow(() -> new RuntimeException("PM Plan not found"));
        p.setId(id);
        p.setPlanNumber(e.getPlanNumber());
        p.setCreatedAt(e.getCreatedAt());
        p.setCreatedBy(e.getCreatedBy());
        audit(p, principalName(principal));
        return pmPlans.save(p);
    }

    @DeleteMapping("/api/v1/maintenance/pm-plans/{id}")
    public void deletePMPlan(@PathVariable Long id) {
        PMPlan e = pmPlans.findById(id).orElseThrow(() -> new RuntimeException("PM Plan not found"));
        if ("INACTIVE".equals(e.getStatus())) throw new RuntimeException("Cannot delete inactive plans");
        pmPlans.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/pm-plans/{id}/actions/{action}")
    public PMPlan pmPlanAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        PMPlan p = pmPlans.findById(id).orElseThrow(() -> new RuntimeException("PM Plan not found"));
        switch (action.toLowerCase()) {
            case "activate": p.setStatus("ACTIVE"); break;
            case "deactivate": p.setStatus("INACTIVE"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(p, principalName(principal));
        return pmPlans.save(p);
    }

    @PostMapping("/api/v1/maintenance/pm-plans/{id}/generate-schedule")
    public Map<String, Object> generatePMSchedule(@PathVariable Long id, Principal principal) {
        PMPlan plan = pmPlans.findById(id).orElseThrow(() -> new RuntimeException("PM Plan not found"));
        LocalDate baseDate = plan.getNextDueDate() != null ? plan.getNextDueDate() : LocalDate.now();
        LocalDate scheduleDate = baseDate;
        List<PMSchedule> generated = new ArrayList<>();

        for (int i = 0; i < 12; i++) {
            PMSchedule s = new PMSchedule();
            s.setScheduleNumber(numbers.next("pm-schedule", "PMS"));
            s.setPlanId(plan.getId());
            s.setPlanNumber(plan.getPlanNumber());
            s.setMachineCode(plan.getMachineCode());
            s.setScheduledDate(scheduleDate);
            s.setDueDate(scheduleDate);
            s.setStatus("UPCOMING");
            s.setPriority("MEDIUM");
            setCreated(s, principalName(principal));
            generated.add(pmSchedules.save(s));
            scheduleDate = calculateNextDate(scheduleDate, plan.getFrequency());
        }

        plan.setLastMaintenanceDate(baseDate);
        plan.setNextDueDate(scheduleDate);
        audit(plan, principalName(principal));
        pmPlans.save(plan);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("count", generated.size());
        result.put("nextDueDate", scheduleDate);
        return result;
    }

    // ===========================
    // ---- PM SCHEDULE ----------
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-schedules")
    public List<PMSchedule> listPMSchedules() { return pmSchedules.findAll(); }

    @PostMapping("/api/v1/maintenance/pm-schedules")
    public PMSchedule createPMSchedule(@RequestBody PMSchedule s, Principal principal) {
        s.setId(null);
        s.setScheduleNumber(numbers.next("pm-schedule", "PMS"));
        if (s.getStatus() == null) s.setStatus("UPCOMING");
        setCreated(s, principalName(principal));
        return pmSchedules.save(s);
    }

    @GetMapping("/api/v1/maintenance/pm-schedules/{id}")
    public PMSchedule getPMSchedule(@PathVariable Long id) {
        return pmSchedules.findById(id).orElseThrow(() -> new RuntimeException("PM Schedule not found"));
    }

    @PutMapping("/api/v1/maintenance/pm-schedules/{id}")
    public PMSchedule updatePMSchedule(@PathVariable Long id, @RequestBody PMSchedule s, Principal principal) {
        PMSchedule e = pmSchedules.findById(id).orElseThrow(() -> new RuntimeException("PM Schedule not found"));
        s.setId(id);
        s.setScheduleNumber(e.getScheduleNumber());
        s.setCreatedAt(e.getCreatedAt());
        s.setCreatedBy(e.getCreatedBy());
        audit(s, principalName(principal));
        return pmSchedules.save(s);
    }

    @DeleteMapping("/api/v1/maintenance/pm-schedules/{id}")
    public void deletePMSchedule(@PathVariable Long id) {
        PMSchedule s = pmSchedules.findById(id).orElseThrow(() -> new RuntimeException("PM Schedule not found"));
        if ("COMPLETED".equals(s.getStatus())) throw new RuntimeException("Cannot delete completed schedules");
        pmSchedules.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/pm-schedules/{id}/actions/{action}")
    public PMSchedule pmScheduleAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        PMSchedule s = pmSchedules.findById(id).orElseThrow(() -> new RuntimeException("PM Schedule not found"));
        switch (action.toLowerCase()) {
            case "start": s.setStatus("IN_PROGRESS"); break;
            case "complete": s.setStatus("COMPLETED"); s.setCompletedDate(LocalDate.now()); break;
            case "skip": s.setStatus("SKIPPED"); break;
            case "overdue": s.setStatus("OVERDUE"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(s, principalName(principal));
        return pmSchedules.save(s);
    }

    // ===========================
    // ---- PM COMPLETION -------
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-completions")
    public List<PMCompletion> listPMCompletions() { return pmCompletions.findAll(); }

    @PostMapping("/api/v1/maintenance/pm-completions")
    public PMCompletion createPMCompletion(@RequestBody PMCompletion c, Principal principal) {
        c.setId(null);
        c.setCompletionNumber(numbers.next("pm-completion", "PMC"));
        if (c.getScheduleId() != null) {
            PMSchedule sched = pmSchedules.findById(c.getScheduleId()).orElse(null);
            if (sched != null) {
                c.setScheduleNumber(sched.getScheduleNumber());
                c.setMachineCode(sched.getMachineCode());
            }
        }
        if (c.getLabourHours() == null) c.setLabourHours(BigDecimal.ZERO);
        if (c.getDurationHours() == null) c.setDurationHours(BigDecimal.ZERO);
        if (c.getStatus() == null) c.setStatus("DRAFT");
        setCreated(c, principalName(principal));
        return pmCompletions.save(c);
    }

    @GetMapping("/api/v1/maintenance/pm-completions/{id}")
    public PMCompletion getPMCompletion(@PathVariable Long id) {
        return pmCompletions.findById(id).orElseThrow(() -> new RuntimeException("PM Completion not found"));
    }

    @PutMapping("/api/v1/maintenance/pm-completions/{id}")
    public PMCompletion updatePMCompletion(@PathVariable Long id, @RequestBody PMCompletion c, Principal principal) {
        PMCompletion e = pmCompletions.findById(id).orElseThrow(() -> new RuntimeException("PM Completion not found"));
        c.setId(id);
        c.setCompletionNumber(e.getCompletionNumber());
        c.setCreatedAt(e.getCreatedAt());
        c.setCreatedBy(e.getCreatedBy());
        audit(c, principalName(principal));
        return pmCompletions.save(c);
    }

    @DeleteMapping("/api/v1/maintenance/pm-completions/{id}")
    public void deletePMCompletion(@PathVariable Long id) {
        PMCompletion c = pmCompletions.findById(id).orElseThrow(() -> new RuntimeException("PM Completion not found"));
        if ("COMPLETED".equals(c.getStatus()) || "VERIFIED".equals(c.getStatus()))
            throw new RuntimeException("Cannot delete completed/verified completions");
        pmCompletions.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/pm-completions/{id}/actions/{action}")
    public Map<String, Object> pmCompletionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        PMCompletion c = pmCompletions.findById(id).orElseThrow(() -> new RuntimeException("PM Completion not found"));
        Map<String, Object> result = new LinkedHashMap<>();

        switch (action.toLowerCase()) {
            case "submit":
                c.setStatus("SUBMITTED");
                break;
            case "complete":
                c.setStatus("COMPLETED");
                c.setEndTime(Instant.now());
                break;
            case "verify":
                c.setVerified(true);
                c.setStatus("VERIFIED");
                break;
            case "fail":
                c.setResult("FAILED");
                c.setStatus("COMPLETED");
                break;
            default:
                throw new RuntimeException("Unknown action: " + action);
        }
        audit(c, principalName(principal));
        pmCompletions.save(c);

        if ("COMPLETED".equals(c.getStatus()) || "VERIFIED".equals(c.getStatus())) {
            if (c.getScheduleId() != null) {
                PMSchedule sched = pmSchedules.findById(c.getScheduleId()).orElse(null);
                if (sched != null) {
                    sched.setStatus("COMPLETED");
                    sched.setCompletedDate(LocalDate.now());
                    audit(sched, principalName(principal));
                    pmSchedules.save(sched);
                }
            }
        }

        result.put("success", true);
        result.put("data", pmCompletions.findById(id).orElse(c));
        return result;
    }

    // ===========================
    // ---- TOOL SERVICE INTIMATION
    // ===========================

    @GetMapping("/api/v1/maintenance/tool-services")
    public List<ToolServiceIntimation> listToolServices() { return toolServices.findAll(); }

    @PostMapping("/api/v1/maintenance/tool-services")
    public ToolServiceIntimation createToolService(@RequestBody ToolServiceIntimation t, Principal principal) {
        t.setId(null);
        t.setServiceNumber(numbers.next("tool-service-intimation", "TSI"));
        if (t.getServiceDate() == null) t.setServiceDate(LocalDate.now());
        if (t.getStatus() == null) t.setStatus("OPEN");
        if (t.getPriority() == null) t.setPriority("MEDIUM");
        setCreated(t, principalName(principal));
        return toolServices.save(t);
    }

    @GetMapping("/api/v1/maintenance/tool-services/{id}")
    public ToolServiceIntimation getToolService(@PathVariable Long id) {
        return toolServices.findById(id).orElseThrow(() -> new RuntimeException("Tool Service not found"));
    }

    @PutMapping("/api/v1/maintenance/tool-services/{id}")
    public ToolServiceIntimation updateToolService(@PathVariable Long id, @RequestBody ToolServiceIntimation t, Principal principal) {
        ToolServiceIntimation e = toolServices.findById(id).orElseThrow(() -> new RuntimeException("Tool Service not found"));
        t.setId(id);
        t.setServiceNumber(e.getServiceNumber());
        t.setCreatedAt(e.getCreatedAt());
        t.setCreatedBy(e.getCreatedBy());
        audit(t, principalName(principal));
        return toolServices.save(t);
    }

    @DeleteMapping("/api/v1/maintenance/tool-services/{id}")
    public void deleteToolService(@PathVariable Long id) {
        ToolServiceIntimation e = toolServices.findById(id).orElseThrow(() -> new RuntimeException("Tool Service not found"));
        if ("CLOSED".equals(e.getStatus())) throw new RuntimeException("CLOSED services cannot be deleted");
        toolServices.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/tool-services/{id}/actions/{action}")
    public ToolServiceIntimation toolServiceAction(@PathVariable Long id, @PathVariable String action,
                                                    @RequestBody(required = false) Map<String, String> body, Principal principal) {
        ToolServiceIntimation t = toolServices.findById(id).orElseThrow(() -> new RuntimeException("Tool Service not found"));
        switch (action.toLowerCase()) {
            case "assign": t.setStatus("ASSIGNED"); break;
            case "in-progress": t.setStatus("IN_PROGRESS"); break;
            case "close": t.setStatus("CLOSED"); break;
            case "cancel": t.setStatus("CANCELLED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(t, principalName(principal));
        return toolServices.save(t);
    }

    // ===========================
    // ---- TOOL SERVICE RECTIFICATION
    // ===========================

    @GetMapping("/api/v1/maintenance/tool-rectifications")
    public List<ToolServiceRectification> listToolRectifications() { return toolRectifications.findAll(); }

    @PostMapping("/api/v1/maintenance/tool-rectifications")
    public ToolServiceRectification createToolRectification(@RequestBody ToolServiceRectification r, Principal principal) {
        r.setId(null);
        r.setRectificationNumber(numbers.next("tool-service-rectification", "TSR"));
        if (r.getServiceId() != null) {
            ToolServiceIntimation svc = toolServices.findById(r.getServiceId()).orElse(null);
            if (svc != null) {
                r.setServiceNumber(svc.getServiceNumber());
                r.setToolId(svc.getToolId());
            }
        }
        if (r.getServiceCost() == null) r.setServiceCost(BigDecimal.ZERO);
        if (r.getStatus() == null) r.setStatus("IN_PROGRESS");
        setCreated(r, principalName(principal));
        return toolRectifications.save(r);
    }

    @GetMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public ToolServiceRectification getToolRectification(@PathVariable Long id) {
        return toolRectifications.findById(id).orElseThrow(() -> new RuntimeException("Tool Rectification not found"));
    }

    @PutMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public ToolServiceRectification updateToolRectification(@PathVariable Long id, @RequestBody ToolServiceRectification r, Principal principal) {
        ToolServiceRectification e = toolRectifications.findById(id).orElseThrow(() -> new RuntimeException("Tool Rectification not found"));
        r.setId(id);
        r.setRectificationNumber(e.getRectificationNumber());
        r.setCreatedAt(e.getCreatedAt());
        r.setCreatedBy(e.getCreatedBy());
        audit(r, principalName(principal));
        return toolRectifications.save(r);
    }

    @DeleteMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public void deleteToolRectification(@PathVariable Long id) {
        toolRectifications.findById(id).orElseThrow(() -> new RuntimeException("Tool Rectification not found"));
        toolRectifications.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/tool-rectifications/{id}/actions/{action}")
    public ToolServiceRectification toolRectificationAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        ToolServiceRectification r = toolRectifications.findById(id).orElseThrow(() -> new RuntimeException("Tool Rectification not found"));
        switch (action.toLowerCase()) {
            case "complete": r.setStatus("COMPLETED"); r.setServiceEnd(Instant.now()); break;
            case "close": r.setStatus("CLOSED"); break;
            case "pass": r.setResult("PASS"); break;
            case "fail": r.setResult("FAIL"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(r, principalName(principal));
        return toolRectifications.save(r);
    }

    // ===========================
    // ---- CALIBRATION SCHEDULE
    // ===========================

    @GetMapping("/api/v1/maintenance/calibration-schedules")
    public List<CalibrationSchedule> listCalSchedules() { return calSchedules.findAll(); }

    @PostMapping("/api/v1/maintenance/calibration-schedules")
    public CalibrationSchedule createCalSchedule(@RequestBody CalibrationSchedule cs, Principal principal) {
        cs.setId(null);
        cs.setScheduleNumber(numbers.next("calibration-schedule", "CLS"));
        if (cs.getCalibrationStatus() == null) cs.setCalibrationStatus("VALID");
        if (cs.getStatus() == null) cs.setStatus("ACTIVE");
        setCreated(cs, principalName(principal));
        return calSchedules.save(cs);
    }

    @GetMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public CalibrationSchedule getCalSchedule(@PathVariable Long id) {
        return calSchedules.findById(id).orElseThrow(() -> new RuntimeException("Calibration Schedule not found"));
    }

    @PutMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public CalibrationSchedule updateCalSchedule(@PathVariable Long id, @RequestBody CalibrationSchedule cs, Principal principal) {
        CalibrationSchedule e = calSchedules.findById(id).orElseThrow(() -> new RuntimeException("Calibration Schedule not found"));
        cs.setId(id);
        cs.setScheduleNumber(e.getScheduleNumber());
        cs.setCreatedAt(e.getCreatedAt());
        cs.setCreatedBy(e.getCreatedBy());
        audit(cs, principalName(principal));
        return calSchedules.save(cs);
    }

    @DeleteMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public void deleteCalSchedule(@PathVariable Long id) {
        calSchedules.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/calibration-schedules/{id}/actions/{action}")
    public CalibrationSchedule calScheduleAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        CalibrationSchedule cs = calSchedules.findById(id).orElseThrow(() -> new RuntimeException("Calibration Schedule not found"));
        switch (action.toLowerCase()) {
            case "send": cs.setCalibrationStatus("UNDER_CALIBRATION"); cs.setStatus("IN_PROGRESS"); break;
            case "valid": cs.setCalibrationStatus("VALID"); cs.setStatus("ACTIVE"); break;
            case "fail": cs.setCalibrationStatus("FAILED"); cs.setStatus("INACTIVE"); break;
            case "deactivate": cs.setCalibrationStatus("OUT_OF_SERVICE"); cs.setStatus("INACTIVE"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(cs, principalName(principal));
        return calSchedules.save(cs);
    }

    // ===========================
    // ---- CALIBRATION ENTRY ---
    // ===========================

    @GetMapping("/api/v1/maintenance/calibration-entries")
    public List<CalibrationEntry> listCalEntries() { return calEntries.findAll(); }

    @PostMapping("/api/v1/maintenance/calibration-entries")
    public CalibrationEntry createCalEntry(@RequestBody CalibrationEntry ce, Principal principal) {
        ce.setId(null);
        ce.setCalibrationNumber(numbers.next("calibration-entry", "CLE"));
        if (ce.getCalibrationDate() == null) ce.setCalibrationDate(LocalDate.now());
        if (ce.getCalibrationCost() == null) ce.setCalibrationCost(BigDecimal.ZERO);
        if (ce.getStatus() == null) ce.setStatus("DRAFT");
        setCreated(ce, principalName(principal));
        CalibrationEntry saved = calEntries.save(ce);

        if (ce.getScheduleId() != null && ce.getResult() != null) {
            CalibrationSchedule cs = calSchedules.findById(ce.getScheduleId()).orElse(null);
            if (cs != null) {
                if ("PASS".equals(ce.getResult())) {
                    cs.setCalibrationStatus("VALID");
                    cs.setLastCalibrationDate(ce.getCalibrationDate());
                    cs.setNextDueDate(ce.getNextDueDate());
                    cs.setStatus("ACTIVE");
                } else {
                    cs.setCalibrationStatus("FAILED");
                    cs.setStatus("INACTIVE");
                }
                audit(cs, principalName(principal));
                calSchedules.save(cs);
            }
        }
        return saved;
    }

    @GetMapping("/api/v1/maintenance/calibration-entries/{id}")
    public CalibrationEntry getCalEntry(@PathVariable Long id) {
        return calEntries.findById(id).orElseThrow(() -> new RuntimeException("Calibration Entry not found"));
    }

    @PutMapping("/api/v1/maintenance/calibration-entries/{id}")
    public CalibrationEntry updateCalEntry(@PathVariable Long id, @RequestBody CalibrationEntry ce, Principal principal) {
        CalibrationEntry e = calEntries.findById(id).orElseThrow(() -> new RuntimeException("Calibration Entry not found"));
        ce.setId(id);
        ce.setCalibrationNumber(e.getCalibrationNumber());
        ce.setCreatedAt(e.getCreatedAt());
        ce.setCreatedBy(e.getCreatedBy());
        audit(ce, principalName(principal));
        return calEntries.save(ce);
    }

    @DeleteMapping("/api/v1/maintenance/calibration-entries/{id}")
    public void deleteCalEntry(@PathVariable Long id) {
        calEntries.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/calibration-entries/{id}/actions/{action}")
    public CalibrationEntry calEntryAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        CalibrationEntry ce = calEntries.findById(id).orElseThrow(() -> new RuntimeException("Calibration Entry not found"));
        switch (action.toLowerCase()) {
            case "pass": ce.setResult("PASS"); ce.setStatus("COMPLETED"); break;
            case "fail": ce.setResult("FAIL"); ce.setStatus("COMPLETED"); break;
            case "submit": ce.setStatus("SUBMITTED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(ce, principalName(principal));
        return calEntries.save(ce);
    }

    // ===========================
    // ---- POWER CONSUMPTION ---
    // ===========================

    @GetMapping("/api/v1/maintenance/power-consumptions")
    public List<PowerConsumption> listPowerConsumptions() { return powerConsumptions.findAll(); }

    @PostMapping("/api/v1/maintenance/power-consumptions")
    public PowerConsumption createPowerConsumption(@RequestBody PowerConsumption pc, Principal principal) {
        pc.setId(null);
        pc.setEntryNumber(numbers.next("power-consumption", "PWC"));
        if (pc.getReadingDate() == null) pc.setReadingDate(LocalDate.now());
        if (pc.getUnit() == null) pc.setUnit("kWh");
        if (pc.getStatus() == null) pc.setStatus("DRAFT");
        if (pc.getOpeningReading() == null) pc.setOpeningReading(BigDecimal.ZERO);
        if (pc.getClosingReading() == null) pc.setClosingReading(BigDecimal.ZERO);
        pc.setConsumption(pc.getClosingReading().subtract(pc.getOpeningReading()));
        setCreated(pc, principalName(principal));
        return powerConsumptions.save(pc);
    }

    @GetMapping("/api/v1/maintenance/power-consumptions/{id}")
    public PowerConsumption getPowerConsumption(@PathVariable Long id) {
        return powerConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Power Consumption not found"));
    }

    @PutMapping("/api/v1/maintenance/power-consumptions/{id}")
    public PowerConsumption updatePowerConsumption(@PathVariable Long id, @RequestBody PowerConsumption pc, Principal principal) {
        PowerConsumption e = powerConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Power Consumption not found"));
        pc.setId(id);
        pc.setEntryNumber(e.getEntryNumber());
        pc.setCreatedAt(e.getCreatedAt());
        pc.setCreatedBy(e.getCreatedBy());
        audit(pc, principalName(principal));
        if (pc.getOpeningReading() != null && pc.getClosingReading() != null) {
            pc.setConsumption(pc.getClosingReading().subtract(pc.getOpeningReading()));
        }
        return powerConsumptions.save(pc);
    }

    @DeleteMapping("/api/v1/maintenance/power-consumptions/{id}")
    public void deletePowerConsumption(@PathVariable Long id) {
        powerConsumptions.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/power-consumptions/{id}/actions/{action}")
    public PowerConsumption powerConsumptionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        PowerConsumption pc = powerConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Power Consumption not found"));
        switch (action.toLowerCase()) {
            case "verify": pc.setStatus("VERIFIED"); break;
            case "approve": pc.setStatus("APPROVED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(pc, principalName(principal));
        return powerConsumptions.save(pc);
    }

    // ===========================
    // ---- WATER CONSUMPTION ---
    // ===========================

    @GetMapping("/api/v1/maintenance/water-consumptions")
    public List<WaterConsumption> listWaterConsumptions() { return waterConsumptions.findAll(); }

    @PostMapping("/api/v1/maintenance/water-consumptions")
    public WaterConsumption createWaterConsumption(@RequestBody WaterConsumption wc, Principal principal) {
        wc.setId(null);
        wc.setEntryNumber(numbers.next("water-consumption", "WTC"));
        if (wc.getReadingDate() == null) wc.setReadingDate(LocalDate.now());
        if (wc.getUnit() == null) wc.setUnit("Liters");
        if (wc.getStatus() == null) wc.setStatus("DRAFT");
        if (wc.getOpeningReading() == null) wc.setOpeningReading(BigDecimal.ZERO);
        if (wc.getClosingReading() == null) wc.setClosingReading(BigDecimal.ZERO);
        wc.setConsumption(wc.getClosingReading().subtract(wc.getOpeningReading()));
        setCreated(wc, principalName(principal));
        return waterConsumptions.save(wc);
    }

    @GetMapping("/api/v1/maintenance/water-consumptions/{id}")
    public WaterConsumption getWaterConsumption(@PathVariable Long id) {
        return waterConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Water Consumption not found"));
    }

    @PutMapping("/api/v1/maintenance/water-consumptions/{id}")
    public WaterConsumption updateWaterConsumption(@PathVariable Long id, @RequestBody WaterConsumption wc, Principal principal) {
        WaterConsumption e = waterConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Water Consumption not found"));
        wc.setId(id);
        wc.setEntryNumber(e.getEntryNumber());
        wc.setCreatedAt(e.getCreatedAt());
        wc.setCreatedBy(e.getCreatedBy());
        audit(wc, principalName(principal));
        if (wc.getOpeningReading() != null && wc.getClosingReading() != null) {
            wc.setConsumption(wc.getClosingReading().subtract(wc.getOpeningReading()));
        }
        return waterConsumptions.save(wc);
    }

    @DeleteMapping("/api/v1/maintenance/water-consumptions/{id}")
    public void deleteWaterConsumption(@PathVariable Long id) {
        waterConsumptions.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/water-consumptions/{id}/actions/{action}")
    public WaterConsumption waterConsumptionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        WaterConsumption wc = waterConsumptions.findById(id).orElseThrow(() -> new RuntimeException("Water Consumption not found"));
        switch (action.toLowerCase()) {
            case "verify": wc.setStatus("VERIFIED"); break;
            case "approve": wc.setStatus("APPROVED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(wc, principalName(principal));
        return waterConsumptions.save(wc);
    }

    // ===========================
    // ---- DASHBOARD / ANALYSIS
    // ===========================

    @GetMapping("/api/v1/maintenance/dashboard")
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        List<BreakdownIntimation> allBd = breakdowns.findAll();
        List<PMSchedule> allPmSched = pmSchedules.findAll();
        List<CalibrationSchedule> allCal = calSchedules.findAll();

        long openBreakdowns = allBd.stream().filter(b -> "OPEN".equals(b.getStatus()) || "ASSIGNED".equals(b.getStatus())).count();
        long criticalBreakdowns = allBd.stream().filter(b -> "CRITICAL".equals(b.getPriority()) && !"CLOSED".equals(b.getStatus())).count();
        long machinesDown = allBd.stream().filter(b -> "OPEN".equals(b.getStatus()) || "ASSIGNED".equals(b.getStatus())).map(BreakdownIntimation::getMachineCode).filter(Objects::nonNull).distinct().count();

        LocalDate today = LocalDate.now();
        long pmDueToday = allPmSched.stream().filter(s -> today.equals(s.getDueDate()) && "UPCOMING".equals(s.getStatus())).count();
        long pmOverdue = allPmSched.stream().filter(s -> s.getDueDate() != null && s.getDueDate().isBefore(today) && "UPCOMING".equals(s.getStatus())).count();
        long pmCompleted = allPmSched.stream().filter(s -> "COMPLETED".equals(s.getStatus())).count();

        long calDue = allCal.stream().filter(c -> c.getNextDueDate() != null && !c.getNextDueDate().isAfter(today) && "ACTIVE".equals(c.getStatus())).count();
        long calOverdue = allCal.stream().filter(c -> c.getNextDueDate() != null && c.getNextDueDate().isBefore(today.minusDays(1)) && "ACTIVE".equals(c.getStatus())).count();

        List<BreakdownRectification> allRects = rectifications.findAll();
        double avgDowntime = allRects.stream()
            .filter(r -> r.getDowntimeMinutes() != null)
            .mapToDouble(r -> r.getDowntimeMinutes().doubleValue())
            .average().orElse(0.0);

        long totalBreakdowns = allBd.stream().filter(b -> "CLOSED".equals(b.getStatus())).count();
        double mtbf = totalBreakdowns > 0 ? avgDowntime * (allBd.size() - totalBreakdowns) / totalBreakdowns : 0;
        double mttr = totalBreakdowns > 0 ? avgDowntime : 0;

        d.put("openBreakdowns", openBreakdowns);
        d.put("criticalBreakdowns", criticalBreakdowns);
        d.put("machinesDown", machinesDown);
        d.put("pmDueToday", pmDueToday);
        d.put("pmOverdue", pmOverdue);
        d.put("pmCompleted", pmCompleted);
        d.put("calibrationDue", calDue);
        d.put("calibrationOverdue", calOverdue);
        d.put("mtbf", Math.round(mtbf * 100.0) / 100.0);
        d.put("mttr", Math.round(mttr * 100.0) / 100.0);
        d.put("totalBreakdowns", allBd.size());
        d.put("totalPmSchedules", allPmSched.size());
        d.put("totalCalibrations", allCal.size());
        return d;
    }

    @GetMapping("/api/v1/maintenance/mtbf/{machineCode}")
    public Map<String, Object> mtbf(@PathVariable String machineCode) {
        List<BreakdownIntimation> bds = breakdowns.findByMachineCode(machineCode);
        List<BreakdownRectification> rects = rectifications.findAll().stream()
            .filter(r -> machineCode.equals(r.getMachineCode()))
            .collect(Collectors.toList());

        long failureCount = bds.stream().filter(b -> "CLOSED".equals(b.getStatus())).count();
        double totalDowntime = rects.stream()
            .filter(r -> r.getDowntimeMinutes() != null)
            .mapToDouble(r -> r.getDowntimeMinutes().doubleValue())
            .sum();

        double mtbf = failureCount > 0 ? (totalDowntime > 0 ? totalDowntime / failureCount : 0) : 0;
        double mttr = failureCount > 0 ? totalDowntime / failureCount : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("machineCode", machineCode);
        result.put("totalFailures", failureCount);
        result.put("totalDowntimeMinutes", totalDowntime);
        result.put("mtbfMinutes", Math.round(mtbf * 100.0) / 100.0);
        result.put("mttrMinutes", Math.round(mttr * 100.0) / 100.0);
        return result;
    }

    // ===========================
    // ---- ROOT CAUSE ANALYSIS --
    // ===========================

    @GetMapping("/api/v1/maintenance/rca")
    public List<RootCauseAnalysis> listRCA() { return rootCauseAnalyses.findAll(); }

    @PostMapping("/api/v1/maintenance/rca")
    public RootCauseAnalysis createRCA(@RequestBody RootCauseAnalysis rca, Principal principal) {
        rca.setId(null);
        rca.setRcaNumber(numbers.next("root-cause-analysis", "RCA"));
        if (rca.getBreakdownId() != null) {
            BreakdownIntimation bd = breakdowns.findById(rca.getBreakdownId()).orElse(null);
            if (bd != null) {
                rca.setBreakdownNumber(bd.getBreakdownNumber());
                rca.setMachineCode(bd.getMachineCode());
            }
        }
        if (rca.getStatus() == null) rca.setStatus("OPEN");
        setCreated(rca, principalName(principal));
        return rootCauseAnalyses.save(rca);
    }

    @GetMapping("/api/v1/maintenance/rca/{id}")
    public RootCauseAnalysis getRCA(@PathVariable Long id) {
        return rootCauseAnalyses.findById(id).orElseThrow(() -> new RuntimeException("RCA not found"));
    }

    @PutMapping("/api/v1/maintenance/rca/{id}")
    public RootCauseAnalysis updateRCA(@PathVariable Long id, @RequestBody RootCauseAnalysis rca, Principal principal) {
        RootCauseAnalysis e = rootCauseAnalyses.findById(id).orElseThrow(() -> new RuntimeException("RCA not found"));
        rca.setId(id);
        rca.setRcaNumber(e.getRcaNumber());
        rca.setCreatedAt(e.getCreatedAt());
        rca.setCreatedBy(e.getCreatedBy());
        audit(rca, principalName(principal));
        return rootCauseAnalyses.save(rca);
    }

    @DeleteMapping("/api/v1/maintenance/rca/{id}")
    public void deleteRCA(@PathVariable Long id) {
        RootCauseAnalysis e = rootCauseAnalyses.findById(id).orElseThrow(() -> new RuntimeException("RCA not found"));
        if ("CLOSED".equals(e.getStatus())) throw new RuntimeException("CLOSED RCA cannot be deleted");
        rootCauseAnalyses.deleteById(id);
    }

    @PostMapping("/api/v1/maintenance/rca/{id}/actions/{action}")
    public RootCauseAnalysis rcaAction(@PathVariable Long id, @PathVariable String action,
                                        @RequestBody(required = false) Map<String, String> body, Principal principal) {
        RootCauseAnalysis rca = rootCauseAnalyses.findById(id).orElseThrow(() -> new RuntimeException("RCA not found"));
        String note = body != null ? body.getOrDefault("note", "") : "";
        switch (action.toLowerCase()) {
            case "verify":
                rca.setStatus("VERIFIED");
                rca.setVerificationDate(LocalDate.now());
                rca.setVerifiedBy(note.isEmpty() ? "system" : note);
                break;
            case "close":
                rca.setStatus("CLOSED");
                break;
            case "reopen":
                rca.setStatus("OPEN");
                break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        audit(rca, principalName(principal));
        return rootCauseAnalyses.save(rca);
    }

    // ===========================
    // ---- ANALYSIS ENDPOINTS --
    // ===========================

    @GetMapping("/api/v1/maintenance/analysis/downtime")
    public List<Map<String, Object>> downtimeAnalysis() {
        List<BreakdownIntimation> allBd = breakdowns.findAll();
        List<BreakdownRectification> allRects = rectifications.findAll();
        Map<String, Double> machineDowntime = new LinkedHashMap<>();

        for (BreakdownRectification r : allRects) {
            if (r.getDowntimeMinutes() != null && r.getMachineCode() != null) {
                machineDowntime.merge(r.getMachineCode(), r.getDowntimeMinutes().doubleValue(), Double::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        Map<String, Long> machineBreakdownCount = allBd.stream()
            .filter(b -> b.getMachineCode() != null && "CLOSED".equals(b.getStatus()))
            .collect(Collectors.groupingBy(BreakdownIntimation::getMachineCode, Collectors.counting()));

        for (Map.Entry<String, Double> entry : machineDowntime.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("machineCode", entry.getKey());
            row.put("totalDowntimeMinutes", entry.getValue());
            row.put("totalDowntimeHours", Math.round(entry.getValue() / 60.0 * 100.0) / 100.0);
            row.put("breakdownCount", machineBreakdownCount.getOrDefault(entry.getKey(), 0L));
            row.put("avgDowntimePerBreakdown",
                machineBreakdownCount.getOrDefault(entry.getKey(), 0L) > 0
                    ? Math.round(entry.getValue() / machineBreakdownCount.get(entry.getKey()) * 100.0) / 100.0
                    : 0.0);
            result.add(row);
        }
        result.sort((a, b) -> Double.compare((double) b.get("totalDowntimeMinutes"), (double) a.get("totalDowntimeMinutes")));
        return result;
    }

    @GetMapping("/api/v1/maintenance/analysis/downtime/categories")
    public Map<String, Long> downtimeByCategory() {
        return breakdowns.findAll().stream()
            .filter(b -> b.getBreakdownCategory() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getBreakdownCategory, Collectors.counting()));
    }

    @GetMapping("/api/v1/maintenance/analysis/downtime/priority")
    public Map<String, Long> downtimeByPriority() {
        return breakdowns.findAll().stream()
            .filter(b -> b.getPriority() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getPriority, Collectors.counting()));
    }

    @GetMapping("/api/v1/maintenance/analysis/mtbf")
    public List<Map<String, Object>> mtbfAnalysis() {
        List<BreakdownIntimation> allBd = breakdowns.findAll();
        List<BreakdownRectification> allRects = rectifications.findAll();

        Map<String, List<BreakdownIntimation>> machineBreakdowns = allBd.stream()
            .filter(b -> b.getMachineCode() != null && "CLOSED".equals(b.getStatus()))
            .collect(Collectors.groupingBy(BreakdownIntimation::getMachineCode));

        Map<String, Double> machineDowntime = new LinkedHashMap<>();
        for (BreakdownRectification r : allRects) {
            if (r.getDowntimeMinutes() != null && r.getMachineCode() != null) {
                machineDowntime.merge(r.getMachineCode(), r.getDowntimeMinutes().doubleValue(), Double::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<BreakdownIntimation>> entry : machineBreakdowns.entrySet()) {
            String machine = entry.getKey();
            long failures = entry.getValue().size();
            double totalDowntime = machineDowntime.getOrDefault(machine, 0.0);
            double mttr = failures > 0 ? totalDowntime / failures : 0;
            double operatingTime = failures > 0 ? totalDowntime * 5 : 3600; // estimate
            double mtbf = failures > 0 ? operatingTime / failures : operatingTime;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("machineCode", machine);
            row.put("totalFailures", failures);
            row.put("totalDowntimeMinutes", totalDowntime);
            row.put("mttrMinutes", Math.round(mttr * 100.0) / 100.0);
            row.put("mtbfMinutes", Math.round(mtbf * 100.0) / 100.0);
            row.put("mtbfHours", Math.round(mtbf / 60.0 * 100.0) / 100.0);
            result.add(row);
        }
        result.sort((a, b) -> Long.compare((long) b.get("totalFailures"), (long) a.get("totalFailures")));
        return result;
    }

    @GetMapping("/api/v1/maintenance/analysis/cost")
    public List<Map<String, Object>> maintenanceCostAnalysis() {
        List<BreakdownRectification> allRects = rectifications.findAll();
        List<ToolServiceRectification> allToolRects = toolRectifications.findAll();
        List<PMCompletion> allPmComps = pmCompletions.findAll();

        Map<String, BigDecimal> machineBreakdownCost = new LinkedHashMap<>();
        for (BreakdownRectification r : allRects) {
            if (r.getMachineCode() != null && r.getServiceCost() != null) {
                machineBreakdownCost.merge(r.getMachineCode(), r.getServiceCost(), BigDecimal::add);
            }
        }

        Map<String, BigDecimal> machineToolCost = new LinkedHashMap<>();
        for (ToolServiceRectification r : allToolRects) {
            if (r.getToolId() != null && r.getServiceCost() != null) {
                machineToolCost.merge(r.getToolId(), r.getServiceCost(), BigDecimal::add);
            }
        }

        Set<String> allMachines = new LinkedHashSet<>();
        allMachines.addAll(machineBreakdownCost.keySet());
        allMachines.addAll(machineToolCost.keySet());

        List<Map<String, Object>> result = new ArrayList<>();
        for (String machine : allMachines) {
            BigDecimal breakdownCost = machineBreakdownCost.getOrDefault(machine, BigDecimal.ZERO);
            BigDecimal toolCost = machineToolCost.getOrDefault(machine, BigDecimal.ZERO);
            BigDecimal totalCost = breakdownCost.add(toolCost);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("machineCode", machine);
            row.put("breakdownCost", breakdownCost);
            row.put("toolServiceCost", toolCost);
            row.put("totalCost", totalCost);
            result.add(row);
        }
        result.sort((a, b) -> ((BigDecimal) b.get("totalCost")).compareTo((BigDecimal) a.get("totalCost")));
        return result;
    }

    // ===========================
    // ---- REPORTS ENDPOINTS ---
    // ===========================

    @GetMapping("/api/v1/maintenance/reports/breakdown")
    public Map<String, Object> breakdownReport(@RequestParam(required = false) String machineCode,
                                                @RequestParam(required = false) String category,
                                                @RequestParam(required = false) String status) {
        List<BreakdownIntimation> all = breakdowns.findAll().stream()
            .filter(b -> machineCode == null || machineCode.isEmpty() || machineCode.equals(b.getMachineCode()))
            .filter(b -> category == null || category.isEmpty() || category.equals(b.getBreakdownCategory()))
            .filter(b -> status == null || status.isEmpty() || status.equals(b.getStatus()))
            .collect(Collectors.toList());

        Map<String, Long> byCategory = all.stream()
            .filter(b -> b.getBreakdownCategory() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getBreakdownCategory, Collectors.counting()));

        Map<String, Long> byStatus = all.stream()
            .filter(b -> b.getStatus() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getStatus, Collectors.counting()));

        Map<String, Long> byPriority = all.stream()
            .filter(b -> b.getPriority() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getPriority, Collectors.counting()));

        Map<String, Long> byMachine = all.stream()
            .filter(b -> b.getMachineCode() != null)
            .collect(Collectors.groupingBy(BreakdownIntimation::getMachineCode, Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBreakdowns", all.size());
        result.put("byCategory", byCategory);
        result.put("byStatus", byStatus);
        result.put("byPriority", byPriority);
        result.put("byMachine", byMachine);
        result.put("records", all.stream().limit(200).collect(Collectors.toList()));
        return result;
    }

    @GetMapping("/api/v1/maintenance/reports/pm")
    public Map<String, Object> pmReport(@RequestParam(required = false) String machineCode,
                                         @RequestParam(required = false) String status) {
        List<PMSchedule> all = pmSchedules.findAll().stream()
            .filter(s -> machineCode == null || machineCode.isEmpty() || machineCode.equals(s.getMachineCode()))
            .filter(s -> status == null || status.isEmpty() || status.equals(s.getStatus()))
            .collect(Collectors.toList());

        Map<String, Long> byStatus = all.stream()
            .filter(s -> s.getStatus() != null)
            .collect(Collectors.groupingBy(PMSchedule::getStatus, Collectors.counting()));

        Map<String, Long> byMachine = all.stream()
            .filter(s -> s.getMachineCode() != null)
            .collect(Collectors.groupingBy(PMSchedule::getMachineCode, Collectors.counting()));

        LocalDate today = LocalDate.now();
        long overdue = all.stream().filter(s -> s.getDueDate() != null && s.getDueDate().isBefore(today) && "UPCOMING".equals(s.getStatus())).count();
        long completed = all.stream().filter(s -> "COMPLETED".equals(s.getStatus())).count();
        double compliance = all.size() > 0 ? Math.round(completed * 100.0 / all.size() * 100.0) / 100.0 : 100.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSchedules", all.size());
        result.put("byStatus", byStatus);
        result.put("byMachine", byMachine);
        result.put("overdue", overdue);
        result.put("compliance", compliance);
        result.put("records", all.stream().limit(200).collect(Collectors.toList()));
        return result;
    }

    @GetMapping("/api/v1/maintenance/reports/machine-history/{machineCode}")
    public Map<String, Object> machineHistory(@PathVariable String machineCode) {
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("machineCode", machineCode);

        List<BreakdownIntimation> bds = breakdowns.findByMachineCode(machineCode);
        h.put("totalBreakdowns", bds.size());
        h.put("openBreakdowns", bds.stream().filter(b -> !"CLOSED".equals(b.getStatus()) && !"CANCELLED".equals(b.getStatus())).count());

        List<BreakdownRectification> rects = rectifications.findAll().stream()
            .filter(r -> machineCode.equals(r.getMachineCode()))
            .collect(Collectors.toList());
        double totalDowntime = rects.stream().filter(r -> r.getDowntimeMinutes() != null).mapToDouble(r -> r.getDowntimeMinutes().doubleValue()).sum();
        double totalCost = rects.stream().filter(r -> r.getServiceCost() != null).mapToDouble(r -> r.getServiceCost().doubleValue()).sum();
        h.put("totalDowntimeMinutes", totalDowntime);
        h.put("totalDowntimeHours", Math.round(totalDowntime / 60.0 * 100.0) / 100.0);
        h.put("maintenanceCost", totalCost);

        long failures = bds.stream().filter(b -> "CLOSED".equals(b.getStatus())).count();
        double mttr = failures > 0 ? totalDowntime / failures : 0;
        h.put("totalFailures", failures);
        h.put("mttrMinutes", Math.round(mttr * 100.0) / 100.0);

        List<Map<String, Object>> bdHistory = bds.stream().limit(50).map(b -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("number", b.getBreakdownNumber());
            row.put("date", b.getBreakdownDate());
            row.put("category", b.getBreakdownCategory());
            row.put("priority", b.getPriority());
            row.put("status", b.getStatus());
            row.put("problem", b.getProblemDescription());
            return row;
        }).collect(Collectors.toList());
        h.put("breakdownHistory", bdHistory);

        List<PMCompletion> pmcs = pmCompletions.findByMachineCode(machineCode);
        h.put("totalPmCompletions", pmcs.size());
        List<Map<String, Object>> pmHistory = pmcs.stream().limit(50).map(c -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("number", c.getCompletionNumber());
            row.put("result", c.getResult());
            row.put("status", c.getStatus());
            row.put("technician", c.getTechnicianCode());
            return row;
        }).collect(Collectors.toList());
        h.put("pmHistory", pmHistory);

        List<RootCauseAnalysis> rcas = rootCauseAnalyses.findByMachineCode(machineCode);
        h.put("totalRcas", rcas.size());

        return h;
    }

    @GetMapping("/api/v1/maintenance/reports/spare-parts")
    public Map<String, Object> sparePartsReport() {
        List<BreakdownRectification> rects = rectifications.findAll();
        List<PMCompletion> pmcs = pmCompletions.findAll();

        Map<String, Long> partsUsage = new LinkedHashMap<>();
        for (BreakdownRectification r : rects) {
            if (r.getSparePartsUsed() != null && !r.getSparePartsUsed().isBlank()) {
                for (String part : r.getSparePartsUsed().split("[,;\\n]")) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) partsUsage.merge(trimmed, 1L, (a, b) -> a + b);
                }
            }
        }
        for (PMCompletion c : pmcs) {
            if (c.getSparePartsUsed() != null && !c.getSparePartsUsed().isBlank()) {
                for (String part : c.getSparePartsUsed().split("[,;\\n]")) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) partsUsage.merge(trimmed, 1L, (a, b) -> a + b);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalTransactions", rects.size() + pmcs.size());
        result.put("partsUsage", partsUsage);
        result.put("uniqueParts", partsUsage.size());
        return result;
    }

    @GetMapping("/api/v1/maintenance/reports/cost")
    public Map<String, Object> costReport(@RequestParam(required = false) String from,
                                           @RequestParam(required = false) String to) {
        List<BreakdownRectification> rects = rectifications.findAll();
        List<ToolServiceRectification> toolRects = toolRectifications.findAll();
        List<PMCompletion> pmcs = pmCompletions.findAll();

        BigDecimal totalBreakdownCost = rects.stream()
            .map(r -> r.getServiceCost() != null ? r.getServiceCost() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalToolCost = toolRects.stream()
            .map(r -> r.getServiceCost() != null ? r.getServiceCost() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> costByMachine = new LinkedHashMap<>();
        for (BreakdownRectification r : rects) {
            if (r.getMachineCode() != null && r.getServiceCost() != null) {
                costByMachine.merge(r.getMachineCode(), r.getServiceCost(), BigDecimal::add);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBreakdownCost", totalBreakdownCost);
        result.put("totalToolServiceCost", totalToolCost);
        result.put("grandTotal", totalBreakdownCost.add(totalToolCost));
        result.put("costByMachine", costByMachine);
        result.put("breakdownTransactions", rects.size());
        result.put("toolServiceTransactions", toolRects.size());
        result.put("pmCompletions", pmcs.size());
        return result;
    }

    // ===========================
    // ---- HELPERS -------------
    // ===========================

    private LocalDate calculateNextDate(LocalDate from, String frequency) {
        if (frequency == null) return from.plusMonths(1);
        return switch (frequency.toUpperCase()) {
            case "DAILY" -> from.plusDays(1);
            case "WEEKLY" -> from.plusWeeks(1);
            case "MONTHLY" -> from.plusMonths(1);
            case "QUARTERLY" -> from.plusMonths(3);
            case "HALF-YEARLY" -> from.plusMonths(6);
            case "YEARLY" -> from.plusYears(1);
            default -> from.plusMonths(1);
        };
    }
}

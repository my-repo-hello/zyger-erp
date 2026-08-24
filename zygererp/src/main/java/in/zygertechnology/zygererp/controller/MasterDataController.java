package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repository.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2/master")
public class MasterDataController {

    private final PlantMasterRepository plantRepo;
    private final WorkCenterMasterRepository wcRepo;
    private final MeterMasterRepository meterRepo;
    private final SparePartMasterRepository spareRepo;
    private final SamplingPlanMasterRepository samplingRepo;
    private final InspectionPlanRepository ipRepo;
    private final InspectionPlanCharacteristicRepository ipcRepo;
    private final EscalationRuleRepository escRuleRepo;
    private final EscalationLogRepository escLogRepo;

    public MasterDataController(PlantMasterRepository plantRepo,
                                WorkCenterMasterRepository wcRepo,
                                MeterMasterRepository meterRepo,
                                SparePartMasterRepository spareRepo,
                                SamplingPlanMasterRepository samplingRepo,
                                InspectionPlanRepository ipRepo,
                                InspectionPlanCharacteristicRepository ipcRepo,
                                EscalationRuleRepository escRuleRepo,
                                EscalationLogRepository escLogRepo) {
        this.plantRepo = plantRepo;
        this.wcRepo = wcRepo;
        this.meterRepo = meterRepo;
        this.spareRepo = spareRepo;
        this.samplingRepo = samplingRepo;
        this.ipRepo = ipRepo;
        this.ipcRepo = ipcRepo;
        this.escRuleRepo = escRuleRepo;
        this.escLogRepo = escLogRepo;
    }

    // ── PLANT ──
    @GetMapping("/plants")
    public List<Map<String, Object>> listPlants() {
        return plantRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("code", p.getCode());
            m.put("name", p.getName());
            m.put("address", p.getAddress());
            m.put("timezone", p.getTimezone());
            m.put("active", p.getActive());
            return m;
        }).toList();
    }

    @PostMapping("/plants")
    public Map<String, Object> savePlant(@RequestBody Map<String, Object> body) {
        PlantMaster p = new PlantMaster();
        p.setCode((String) body.get("code"));
        p.setName((String) body.get("name"));
        p.setAddress((String) body.get("address"));
        p.setTimezone((String) body.getOrDefault("timezone", "Asia/Kolkata"));
        p.setActive(true);
        plantRepo.save(p);
        return Map.of("id", p.getId(), "code", p.getCode(), "name", p.getName());
    }

    // ── WORK CENTERS ──
    @GetMapping("/work-centers")
    public List<Map<String, Object>> listWorkCenters(@RequestParam(defaultValue = "1") Long plantId) {
        return wcRepo.findByPlantIdAndActiveTrue(plantId).stream().map(wc -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", wc.getId());
            m.put("code", wc.getCode());
            m.put("name", wc.getName());
            m.put("department", wc.getDepartment());
            m.put("capacity", wc.getCapacity());
            m.put("hourlyRate", wc.getHourlyRate());
            return m;
        }).toList();
    }

    @PostMapping("/work-centers")
    public Map<String, Object> saveWorkCenter(@RequestBody Map<String, Object> body) {
        PlantMaster plant = plantRepo.findById(((Number) body.getOrDefault("plantId", 1L)).longValue()).orElseThrow();
        WorkCenterMaster wc = WorkCenterMaster.builder()
                .plant(plant)
                .code((String) body.get("code"))
                .name((String) body.get("name"))
                .department((String) body.get("department"))
                .capacity(body.get("capacity") != null ? new java.math.BigDecimal(body.get("capacity").toString()) : null)
                .hourlyRate(body.get("hourlyRate") != null ? new java.math.BigDecimal(body.get("hourlyRate").toString()) : null)
                .active(true)
                .build();
        wcRepo.save(wc);
        return Map.of("id", wc.getId(), "code", wc.getCode(), "name", wc.getName());
    }

    // ── METERS ──
    @GetMapping("/meters")
    public List<Map<String, Object>> listMeters(@RequestParam(required = false) String type) {
        List<MeterMaster> list = type != null ? meterRepo.findByMeterTypeAndActiveTrue(type) : meterRepo.findAll();
        return list.stream().map(mt -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", mt.getId());
            m.put("code", mt.getCode());
            m.put("name", mt.getName());
            m.put("meterType", mt.getMeterType());
            m.put("location", mt.getLocation());
            m.put("budgetMonthlyUnits", mt.getBudgetMonthlyUnits());
            return m;
        }).toList();
    }

    @PostMapping("/meters")
    public Map<String, Object> saveMeter(@RequestBody Map<String, Object> body) {
        PlantMaster plant = plantRepo.findById(((Number) body.getOrDefault("plantId", 1L)).longValue()).orElseThrow();
        MeterMaster mt = MeterMaster.builder()
                .plant(plant)
                .code((String) body.get("code"))
                .name((String) body.get("name"))
                .meterType((String) body.get("meterType"))
                .location((String) body.get("location"))
                .active(true)
                .build();
        meterRepo.save(mt);
        return Map.of("id", mt.getId(), "code", mt.getCode());
    }

    // ── SPARE PARTS ──
    @GetMapping("/spare-parts")
    public List<Map<String, Object>> listSpareParts() {
        return spareRepo.findByActiveTrue().stream().map(sp -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", sp.getId());
            m.put("code", sp.getCode());
            m.put("name", sp.getName());
            m.put("uom", sp.getUom());
            m.put("reorderLevel", sp.getReorderLevel());
            m.put("unitCost", sp.getUnitCost());
            return m;
        }).toList();
    }

    @PostMapping("/spare-parts")
    public Map<String, Object> saveSparePart(@RequestBody Map<String, Object> body) {
        PlantMaster plant = plantRepo.findById(((Number) body.getOrDefault("plantId", 1L)).longValue()).orElseThrow();
        SparePartMaster sp = SparePartMaster.builder()
                .plant(plant)
                .code((String) body.get("code"))
                .name((String) body.get("name"))
                .description((String) body.get("description"))
                .uom((String) body.getOrDefault("uom", "NOS"))
                .unitCost(body.get("unitCost") != null ? new java.math.BigDecimal(body.get("unitCost").toString()) : java.math.BigDecimal.ZERO)
                .active(true)
                .build();
        spareRepo.save(sp);
        return Map.of("id", sp.getId(), "code", sp.getCode());
    }

    // ── SAMPLING PLANS ──
    @GetMapping("/sampling-plans")
    public List<Map<String, Object>> listSamplingPlans(@RequestParam(defaultValue = "ISO2859_1") String standard) {
        return samplingRepo.findByStandardAndActiveTrue(standard).stream().map(sp -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", sp.getId());
            m.put("standard", sp.getStandard());
            m.put("inspectionLevel", sp.getInspectionLevel());
            m.put("lotSizeMin", sp.getLotSizeMin());
            m.put("lotSizeMax", sp.getLotSizeMax());
            m.put("aql", sp.getAql());
            m.put("sampleSize", sp.getSampleSize());
            m.put("acceptNumber", sp.getAcceptNumber());
            m.put("rejectNumber", sp.getRejectNumber());
            return m;
        }).toList();
    }

    // ── INSPECTION PLANS ──
    @GetMapping("/inspection-plans")
    public List<Map<String, Object>> listInspectionPlans(@RequestParam(defaultValue = "1") Long plantId,
                                                          @RequestParam(required = false) String itemCode) {
        List<InspectionPlan> plans;
        if (itemCode != null && !itemCode.isBlank()) {
            plans = ipRepo.findByPlantIdAndItemCodeAndActiveTrue(plantId, itemCode);
        } else {
            plans = ipRepo.findAll();
        }
        return plans.stream().map(ip -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ip.getId());
            m.put("itemCode", ip.getItemCode());
            m.put("drawingNumber", ip.getDrawingNumber());
            m.put("drawingRevision", ip.getDrawingRevision());
            m.put("operation", ip.getOperation());
            m.put("inspectionType", ip.getInspectionType());
            m.put("aql", ip.getAql());
            List<InspectionPlanCharacteristic> chars = ipcRepo.findByPlanIdAndActiveTrueOrderByLineNoAsc(ip.getId());
            m.put("characteristics", chars.stream().map(c -> {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("id", c.getId());
                cm.put("balloonNo", c.getBalloonNo());
                cm.put("characteristicCode", c.getCharacteristicCode());
                cm.put("characteristicName", c.getCharacteristicName());
                cm.put("dataType", c.getDataType());
                cm.put("specificationText", c.getSpecificationText());
                cm.put("nominalValue", c.getNominalValue());
                cm.put("lowerLimit", c.getLowerLimit());
                cm.put("upperLimit", c.getUpperLimit());
                cm.put("uom", c.getUom());
                cm.put("isMandatory", c.getIsMandatory());
                cm.put("isCritical", c.getIsCritical());
                return cm;
            }).toList());
            return m;
        }).toList();
    }

    @PostMapping("/inspection-plans")
    public Map<String, Object> saveInspectionPlan(@RequestBody Map<String, Object> body) {
        PlantMaster plant = plantRepo.findById(((Number) body.getOrDefault("plantId", 1L)).longValue()).orElseThrow();
        InspectionPlan ip = InspectionPlan.builder()
                .plant(plant)
                .itemCode((String) body.get("itemCode"))
                .drawingNumber((String) body.get("drawingNumber"))
                .drawingRevision((String) body.get("drawingRevision"))
                .operation((String) body.get("operation"))
                .inspectionType((String) body.get("inspectionType"))
                .active(true)
                .build();
        ipRepo.save(ip);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> chars = (List<Map<String, Object>>) body.get("characteristics");
        if (chars != null) {
            for (int i = 0; i < chars.size(); i++) {
                Map<String, Object> cb = chars.get(i);
                InspectionPlanCharacteristic c = InspectionPlanCharacteristic.builder()
                        .plan(ip)
                        .balloonNo((String) cb.get("balloonNo"))
                        .characteristicCode((String) cb.get("characteristicCode"))
                        .characteristicName((String) cb.get("characteristicName"))
                        .dataType((String) cb.getOrDefault("dataType", "NUMERIC"))
                        .specificationText((String) cb.get("specificationText"))
                        .nominalValue(cb.get("nominalValue") != null ? new java.math.BigDecimal(cb.get("nominalValue").toString()) : null)
                        .lowerLimit(cb.get("lowerLimit") != null ? new java.math.BigDecimal(cb.get("lowerLimit").toString()) : null)
                        .upperLimit(cb.get("upperLimit") != null ? new java.math.BigDecimal(cb.get("upperLimit").toString()) : null)
                        .uom((String) cb.get("uom"))
                        .isMandatory(Boolean.TRUE.equals(cb.get("isMandatory")))
                        .isCritical(Boolean.TRUE.equals(cb.get("isCritical")))
                        .lineNo(i + 1)
                        .active(true)
                        .build();
                ipcRepo.save(c);
            }
        }
        return Map.of("id", ip.getId(), "itemCode", ip.getItemCode());
    }

    // ── AQL AUTO-CALCULATE ──
    @GetMapping("/aql-lookup")
    public Map<String, Object> aqlLookup(@RequestParam int lotSize,
                                          @RequestParam(defaultValue = "ISO2859_1") String standard,
                                          @RequestParam(defaultValue = "1") double aql) {
        Optional<SamplingPlanMaster> plan = samplingRepo.findByStandardAndActiveTrue(standard).stream()
                .filter(sp -> sp.getLotSizeMin() <= lotSize && sp.getLotSizeMax() >= lotSize)
                .filter(sp -> sp.getAql().doubleValue() == aql)
                .findFirst();
        if (plan.isPresent()) {
            SamplingPlanMaster sp = plan.get();
            return Map.of(
                    "found", true,
                    "sampleSize", sp.getSampleSize(),
                    "acceptNumber", sp.getAcceptNumber(),
                    "rejectNumber", sp.getRejectNumber(),
                    "lotSizeMin", sp.getLotSizeMin(),
                    "lotSizeMax", sp.getLotSizeMax(),
                    "aql", sp.getAql(),
                    "standard", sp.getStandard()
            );
        }
        return Map.of("found", false, "message", "No sampling plan found for lot size " + lotSize + " and AQL " + aql);
    }

    // ── ESCALATION RULES ──
    @GetMapping("/escalation-rules")
    public List<Map<String, Object>> listEscalationRules(@RequestParam(required = false) String docKey) {
        List<EscalationRule> rules = docKey != null ? escRuleRepo.findByDocKeyAndActiveTrue(docKey) : escRuleRepo.findAll();
        return rules.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("docKey", r.getDocKey());
            m.put("priority", r.getPriority());
            m.put("slaHours", r.getSlaHours());
            m.put("escalateToRole", r.getEscalateToRole());
            m.put("notifyChannels", r.getNotifyChannels());
            return m;
        }).toList();
    }
}

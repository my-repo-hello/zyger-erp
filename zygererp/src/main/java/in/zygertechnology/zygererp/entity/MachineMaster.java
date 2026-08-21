package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "machine_master") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MachineMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Version Long version;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 100) String make;
    @Column(length = 100) String model;
    @Column(name = "serial_number", length = 60) String serialNumber;
    @Column(length = 200) String location;
    @Column(name = "work_center", length = 60) String workCenter;
    @Column(name = "year_of_manufacture") Integer yearOfManufacture;
    @Column(name = "preventive_frequency_days") Integer preventiveFrequencyDays;
    @Column(length = 500) String remarks;
    @Column(length = 200) String brand;
    @Column(name = "machine_type", length = 60) String machineType;
    @Column(name = "machine_group", length = 60) String machineGroup;
    @Column(name = "work_center_code", length = 60) String workCenterCode;
    @Column(name = "machine_cost", precision = 14, scale = 2) BigDecimal machineCost;
    @Column(name = "gst_rate", precision = 5, scale = 2) BigDecimal gstRate;
    @Column(name = "gst_amount", precision = 14, scale = 2) BigDecimal gstAmount;
    @Column(name = "total_cost_with_gst", precision = 14, scale = 2) BigDecimal totalCostWithGst;
    BigDecimal capacity;
    @Column(name = "hourly_rate") BigDecimal hourlyRate;
    @Column(length = 30) String status;
    @Column(name = "controller_brand", length = 100) String controllerBrand;
    @Column(name = "spindle_speed") Integer spindleSpeed;
    @Column(name = "spindle_power", precision = 10, scale = 2) BigDecimal spindlePower;
    @Column(name = "tool_capacity", length = 100) String toolCapacity;
    @Column(name = "max_machining_dia", precision = 10, scale = 2) BigDecimal maxMachiningDia;
    @Column(name = "max_machining_length", precision = 10, scale = 2) BigDecimal maxMachiningLength;
    @Column(name = "x_axis_travel", precision = 10, scale = 2) BigDecimal xAxisTravel;
    @Column(name = "y_axis_travel", precision = 10, scale = 2) BigDecimal yAxisTravel;
    @Column(name = "z_axis_travel", precision = 10, scale = 2) BigDecimal zAxisTravel;
    @Column(name = "rapid_traverse", precision = 10, scale = 2) BigDecimal rapidTraverse;
    @Column(name = "tailstock_type", length = 100) String tailstockType;
    @Column(name = "tailstock_stroke", precision = 10, scale = 2) BigDecimal tailstockStroke;
    @Column(name = "quill_diameter", precision = 10, scale = 2) BigDecimal quillDiameter;
    @Column(name = "quill_taper", length = 50) String quillTaper;
    @Column(name = "coolant_capacity", precision = 10, scale = 2) BigDecimal coolantCapacity;
    @Column(name = "maintenance_schedule_ref", length = 60) String maintenanceScheduleRef;
    @Column(name = "skill_requirement", length = 100) String skillRequirement;
    @Column(name = "program_reference", length = 100) String programReference;
    @Column(columnDefinition = "TEXT") String notes;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @PrePersist void prePersist() {
        if (active == null) active = Boolean.TRUE;
        if (createdAt == null) createdAt = Instant.now();
        if (createdBy == null || createdBy.isBlank()) createdBy = "system";
    }
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}

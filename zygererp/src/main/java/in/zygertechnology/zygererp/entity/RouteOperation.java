package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "route_operation") @Getter @Setter
public class RouteOperation implements LineEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    RouteSheet doc;

    @Column(name = "sequence_no", nullable = false) Integer sequenceNo;
    @Column(name = "operation_code", length = 60) String operationCode;
    @Column(name = "operation_description", length = 200) String operationDescription;
    @Column(name = "work_center_code", length = 60) String workCenterCode;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "setup_time") BigDecimal setupTime;
    @Column(name = "cycle_time") BigDecimal cycleTime;
    @Column(name = "run_basis", length = 30) String runBasis;
    @Column(name = "overlap_percentage") BigDecimal overlapPercentage;
    @Column(name = "queue_time") BigDecimal queueTime;
    @Column(name = "move_time") BigDecimal moveTime;
    @Column(name = "inspection_required") boolean inspectionRequired;
    /** FRS §8.3 quality inspection type triggered by this operation, e.g. IPQC, FAI, LAST_OFF. */
    @Column(name = "inspection_type", length = 30) String inspectionType;
    /** FRS §8.3 alternate machine that can run this operation when the primary is unavailable. */
    @Column(name = "alternate_machine_code", length = 60) String alternateMachineCode;
    @Column(name = "subcontract_flag") boolean subcontractFlag;
    @Column(name = "tool_required") boolean toolRequired;
    @Column(name = "fixture_required") boolean fixtureRequired;
    @Column(name = "skill_required", length = 100) String skillRequired;
    @Column(name = "nc_program_reference", length = 100) String ncProgramReference;
    @Column(name = "standard_cost_rate") BigDecimal standardCostRate;
    @Column(length = 300) String remarks;

    @Override public String getItemCode() { return operationCode; }
    @Override public String getLocation() { return workCenterCode; }
    @Override public String getBatchNo() { return null; }
    @Override public String getHeatNo() { return null; }
    @Override public BigDecimal getQty() { return BigDecimal.ZERO; }
}

package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "production_entry")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_number", unique = true, length = 60)
    private String entryNumber;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(name = "subjob_number", length = 60)
    private String subjobNumber;

    @Column(name = "part_code", length = 60)
    private String partCode;

    @Column(name = "part_description", length = 255)
    private String partDescription;

    @Column(name = "operation_code", length = 60)
    private String operationCode;

    @Column(name = "operation_sequence")
    private Integer operationSequence;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "shift_code", length = 60)
    private String shiftCode;

    @Column(name = "production_date")
    private Instant productionDate;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "produced_quantity", precision = 18, scale = 4)
    private BigDecimal producedQuantity;

    @Column(name = "good_quantity", precision = 18, scale = 4)
    private BigDecimal goodQuantity;

    @Column(name = "rework_quantity", precision = 18, scale = 4)
    private BigDecimal reworkQuantity;

    @Column(name = "rejected_quantity", precision = 18, scale = 4)
    private BigDecimal rejectedQuantity;

    @Column(name = "scrap_quantity", precision = 18, scale = 4)
    private BigDecimal scrapQuantity;

    @Column(length = 30)
    private String status;

    @Column(name = "quality_status", length = 30)
    private String qualityStatus;

    @Column(length = 500)
    private String remarks;

    @Version
    private Long version;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;
}

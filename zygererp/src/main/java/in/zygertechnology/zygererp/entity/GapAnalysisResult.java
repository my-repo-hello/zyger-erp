package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "gap_analysis_result")
@Getter
@Setter
public class GapAnalysisResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    GapAnalysisRun run;

    @Column(name = "gap_type", nullable = false, length = 30)
    String gapType;

    @Column(name = "context_code", length = 100)
    String contextCode;

    @Column(name = "context_description", length = 200)
    String contextDescription;

    @Column(name = "demand_qty", precision = 38, scale = 2)
    BigDecimal demandQty;

    @Column(name = "supply_qty", precision = 38, scale = 2)
    BigDecimal supplyQty;

    @Column(name = "gap_qty", precision = 38, scale = 2)
    BigDecimal gapQty;

    @Column(name = "gap_value", precision = 38, scale = 2)
    BigDecimal gapValue;

    @Column(name = "gap_days")
    Integer gapDays;

    @Column(nullable = false, length = 20)
    String severity;

    @Column(name = "root_cause", length = 500)
    String rootCause;

    @Column(name = "suggested_action", length = 500)
    String suggestedAction;

    @Column(name = "action_status", length = 30)
    String actionStatus;

    @Column(name = "resolved_by", length = 100)
    String resolvedBy;

    @Column(name = "resolved_date")
    Instant resolvedDate;

    @Column(length = 200)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}

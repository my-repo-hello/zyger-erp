package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "engineering_change")
@Getter
@Setter
public class EngineeringChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "ecr_number", unique = true, nullable = false, length = 60)
    String ecrNumber;

    @Column(name = "eco_number", length = 60)
    String ecoNumber;

    @Column(name = "change_type", length = 30)
    String changeType;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 200)
    String itemDescription;

    @Column(name = "current_revision", length = 30)
    String currentRevision;

    @Column(name = "proposed_revision", length = 30)
    String proposedRevision;

    @Column(name = "description_of_change", length = 1000)
    String descriptionOfChange;

    @Column(name = "reason_for_change", length = 500)
    String reasonForChange;

    @Column(length = 30)
    String priority;

    @Column(length = 30)
    String status;

    @Column(name = "bom_impact")
    Boolean bomImpact;

    @Column(name = "route_impact")
    Boolean routeImpact;

    @Column(name = "quality_impact")
    Boolean qualityImpact;

    @Column(name = "inventory_impact")
    Boolean inventoryImpact;

    @Column(name = "effective_date")
    Instant effectiveDate;

    @Column(name = "bom_rev_from", length = 30)
    String bomRevFrom;

    @Column(name = "bom_rev_to", length = 30)
    String bomRevTo;

    @Column(name = "route_rev_from", length = 30)
    String routeRevFrom;

    @Column(name = "route_rev_to", length = 30)
    String routeRevTo;

    @Column(name = "drawing_rev_from", length = 30)
    String drawingRevFrom;

    @Column(name = "drawing_rev_to", length = 30)
    String drawingRevTo;

    @Column(name = "requested_by", length = 100)
    String requestedBy;

    @Column(name = "reviewed_by", length = 100)
    String reviewedBy;

    @Column(name = "approved_by", length = 100)
    String approvedBy;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}

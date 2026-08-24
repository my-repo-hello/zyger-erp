package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "production_bom_line") @Getter @Setter
public class ProductionBOMLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    ProductionBOM doc;

    @Column(name = "line_no") Integer lineNo;
    @Column(name = "component_item_code", nullable = false, length = 60) String componentItemCode;
    @Column(name = "component_revision", length = 30) String componentRevision;
    String description;
    @Column(name = "quantity_per", nullable = false) BigDecimal quantityPer;
    @Column(length = 20) String uom;
    @Column(name = "scrap_percentage") BigDecimal scrapPercentage;
    @Column(name = "yield_percentage") BigDecimal yieldPercentage;
    @Column(name = "operation_sequence_link") Integer operationSequenceLink;
    @Column(name = "issue_method", length = 30) String issueMethod;
    @Column(name = "supply_type", length = 30) String supplyType;
    @Column(name = "alternate_group", length = 60) String alternateGroup;
    @Column(name = "substitute_item", length = 60) String substituteItem;
    Integer priority;
    @Column(name = "substitute_priority") Integer substitutePriority;
    String warehouse;
    @Column(name = "child_bom_id") Long childBomId;

    @Column(name = "scrap_percent", precision = 5, scale = 2)
    BigDecimal scrapPercent = BigDecimal.ZERO;
    @Column(name = "component_type", length = 30)
    String componentType = "RAW_MATERIAL";
    @Column(name = "is_phantom")
    Boolean isPhantom = false;

    @Override public BigDecimal getQty() { return quantityPer == null ? BigDecimal.ZERO : quantityPer; }
}

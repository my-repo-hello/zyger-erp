package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name = "production_bom") @Getter @Setter @DocKey("production-bom")
public class ProductionBOM extends BaseDoc implements DocEntity {
    @Column(name = "bom_number", unique = true) String bomNumber;
    @Column(name = "item_code", nullable = false, length = 60) String itemCode;
    @Column(name = "item_revision", length = 30) String itemRevision;
    @Column(name = "bom_version", length = 30) String bomVersion;
    @Column(length = 200) String description;
    @Column(name = "effective_from") LocalDate effectiveFrom;
    @Column(name = "effective_to") LocalDate effectiveTo;
    @Column(name = "base_quantity") BigDecimal baseQuantity;
    @Column(name = "base_uom", length = 20) String baseUom;
    @Column(name = "approved_by", length = 60) String approvedBy;
    @Column(name = "release_date") LocalDate releaseDate;
    @Column(name = "obsolete_date") LocalDate obsoleteDate;
    @Column(name = "parent_bom_id") Long parentBomId;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<ProductionBOMLine> lines = new ArrayList<>();

    @Override public List<ProductionBOMLine> getLines() { return lines; }
}

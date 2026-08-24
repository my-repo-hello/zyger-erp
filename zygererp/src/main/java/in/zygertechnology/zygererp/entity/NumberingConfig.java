package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "numbering_config", uniqueConstraints = @UniqueConstraint(columnNames = {"doc_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NumberingConfig {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_type", nullable = false, length = 60)
    private String docType;  // e.g. "purchase-order", "quality-inspection", "work-order"

    @Column(nullable = false, length = 20)
    private String prefix;  // e.g. "PO", "QI", "WO"

    @Column(nullable = false)
    private Integer zeroPad = 6;  // zero-padding width

    @Column(nullable = false)
    private Boolean resetPerYear = true;  // reset sequence each financial year

    @Column(length = 10)
    private String separator = "-";  // separator between prefix and year/number

    @Column(nullable = false)
    private Boolean active = true;
}

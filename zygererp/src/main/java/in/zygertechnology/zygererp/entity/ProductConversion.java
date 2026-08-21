package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_conversion")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProductConversion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversion_number", unique = true, length = 60)
    private String conversionNumber;

    @Column(name = "conversion_date")
    private Instant conversionDate;

    @Column(name = "conversion_type", length = 60)
    private String conversionType;

    @Column(name = "source_warehouse", length = 60)
    private String sourceWarehouse;

    @Column(name = "destination_warehouse", length = 60)
    private String destinationWarehouse;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(length = 60)
    private String reference;

    @Column(name = "input_item_code", length = 60)
    private String inputItemCode;

    @Column(name = "input_batch_number", length = 60)
    private String inputBatchNumber;

    @Column(name = "input_quantity", precision = 18, scale = 4)
    private BigDecimal inputQuantity;

    @Column(name = "input_uom", length = 20)
    private String inputUom;

    @Column(name = "output_item_code", length = 60)
    private String outputItemCode;

    @Column(name = "output_batch_number", length = 60)
    private String outputBatchNumber;

    @Column(name = "output_quantity", precision = 18, scale = 4)
    private BigDecimal outputQuantity;

    @Column(name = "output_uom", length = 20)
    private String outputUom;

    @Column(name = "process_loss_qty", precision = 18, scale = 4)
    private BigDecimal processLossQty;

    @Column(name = "scrap_qty", precision = 18, scale = 4)
    private BigDecimal scrapQty;

    @Column(name = "loss_reason", length = 255)
    private String lossReason;

    @Column(length = 30)
    private String status;

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

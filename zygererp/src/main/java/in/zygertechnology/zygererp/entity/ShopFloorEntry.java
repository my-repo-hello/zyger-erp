package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity @Table(name = "shop_floor_entry") @Getter @Setter @DocKey("shop-floor-entry")
public class ShopFloorEntry extends BaseDoc implements DocEntity {
    @Column(name = "work_order_no", nullable = false, length = 60) String workOrderNo;
    @Column(name = "operation_sequence") Integer operationSequence;
    @Column(name = "operation_code", length = 60) String operationCode;
    @Column(name = "operator_code", length = 60) String operatorCode;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "start_time") Instant startTime;
    @Column(name = "end_time") Instant endTime;
    @Column(name = "good_quantity") BigDecimal goodQuantity;
    @Column(name = "scrap_quantity") BigDecimal scrapQuantity;
    @Column(name = "rework_quantity") BigDecimal reworkQuantity;
    @Column(name = "inspection_result", length = 30) String inspectionResult;

    @Override public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}

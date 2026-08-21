package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal;

@MappedSuperclass @Getter @Setter
public abstract class BaseLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "line_no") Integer lineNo;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "batch_no", length = 60) String batchNo;
    @Column(name = "heat_no", length = 60) String heatNo;
    @Column(length = 60) String location;
    @Column(length = 60) String warehouse;
    @Column(length = 300) String remarks;
    public abstract BigDecimal getQty();
}

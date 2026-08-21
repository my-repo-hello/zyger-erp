package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name = "work_order") @Getter @Setter @DocKey("work-order")
public class WorkOrder extends BaseDoc implements DocEntity {
    @Column(name = "wo_number", unique = true) String woNumber;
    @Column(name = "wo_type", length = 30) String woType;
    @Column(name = "source_type", length = 30) String sourceType;
    @Column(name = "source_doc_no", length = 60) String sourceDocNo;
    @Column(name = "customer_code", length = 60) String customerCode;
    @Column(name = "customer_order_no", length = 60) String customerOrderNo;
    @Column(name = "item_code", nullable = false, length = 60) String itemCode;
    @Column(name = "item_revision", length = 30) String itemRevision;
    @Column(name = "drawing_number", length = 60) String drawingNumber;
    @Column(name = "order_quantity", nullable = false) BigDecimal orderQuantity;
    @Column(length = 20) String uom;
    @Column(length = 20) String priority;
    @Column(name = "due_date") LocalDate dueDate;
    @Column(name = "planned_start_date") LocalDate plannedStartDate;
    @Column(name = "planned_end_date") LocalDate plannedEndDate;
    @Column(name = "actual_start_date") LocalDate actualStartDate;
    @Column(name = "actual_end_date") LocalDate actualEndDate;
    String plant;
    @Column(name = "production_line", length = 60) String productionLine;
    @Column(name = "bom_id") Long bomId;
    @Column(name = "route_id") Long routeId;
    @Column(name = "approved_by", length = 60) String approvedBy;
    @Column(name = "released_by", length = 60) String releasedBy;
    @Column(name = "closed_by", length = 60) String closedBy;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<WorkOrderOperation> operations = new ArrayList<>();

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<WorkOrderMaterial> materials = new ArrayList<>();

    @SuppressWarnings("unchecked")
    @Override public List<WorkOrderOperation> getLines() { return (List<WorkOrderOperation>)(List<? extends LineEntity>) operations; }

    public List<WorkOrderMaterial> getMaterialLines() { return materials; }
}

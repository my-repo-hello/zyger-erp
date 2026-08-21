package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "machine_load_plan")
@Getter
@Setter
public class MachineLoadPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "plan_number", unique = true, nullable = false, length = 60)
    String planNumber;

    @Column(name = "plan_start_date")
    Instant planStartDate;

    @Column(name = "plan_end_date")
    Instant planEndDate;

    @Column(name = "generated_date")
    Instant generatedDate;

    @Column(name = "generated_by", length = 100)
    String generatedBy;

    @Column(length = 30)
    String status;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}

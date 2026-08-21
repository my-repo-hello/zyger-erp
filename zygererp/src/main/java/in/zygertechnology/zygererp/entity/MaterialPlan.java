package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "material_plan")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_number", unique = true, length = 60)
    private String planNumber;

    @Column(name = "plan_date")
    private Instant planDate;

    @Column(name = "planned_by", length = 60)
    private String plannedBy;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJson;

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

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

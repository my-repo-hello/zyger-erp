package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "shift_master")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ShiftMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    PlantMaster plant;

    @Column(length = 60, unique = true, nullable = false)
    String code;

    @Column(length = 120, nullable = false)
    String name;

    @Column(nullable = false)
    LocalTime startTime;

    @Column(nullable = false)
    LocalTime endTime;

    @Builder.Default Boolean active = Boolean.TRUE;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

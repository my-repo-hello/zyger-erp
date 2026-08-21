package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import java.time.Instant; import java.time.LocalDate;

@MappedSuperclass @Getter @Setter
@SQLRestriction("deleted = false")
public abstract class BaseDoc {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(unique = true) String docNo;
    String status;
    LocalDate docDate;
    @Column(length = 500) String remarks;
    String createdBy;
    Instant createdAt;
    Instant updatedAt;
    String updatedBy;
    @Column(nullable = false) Boolean deleted = false;
    Instant deletedAt;
    String deletedBy;
    @Version
    Long version;
}

package in.zygertechnology.zygererp.entity;

import in.zygertechnology.zygererp.config.AuditEntityListener;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity @Table(name="app_users") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(unique = true, nullable = false, length = 80) String username;
    @Column(nullable = false, length = 100) String password;
    @Column(length = 40) String role;
    @Builder.Default boolean active = true;
    @Column(name = "full_name", length = 120) String fullName;
    @Column(length = 120) String email;
    @Column(length = 20) String phone;
    @Column(length = 60) String department;
    @Column(length = 60) String designation;
    @Column(name = "plant_id") @Builder.Default Long plantId = 1L;
    @Version Long version;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default Set<Role> roles = new HashSet<>();
}

package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="app_users") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
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
    @Version Long version;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}

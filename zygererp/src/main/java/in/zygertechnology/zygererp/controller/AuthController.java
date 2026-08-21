package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder enc;
    private final JwtService jwt;

    @Value("${app.security.password-min-length:8}")
    private int passwordMinLength;

    @Value("${app.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.security.lockout-minutes:15}")
    private int lockoutMinutes;

    private final ConcurrentHashMap<String, LoginAttempt> attempts = new ConcurrentHashMap<>();

    @PostMapping("/login")
    public Map<String,Object> login(@RequestBody Map<String,String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required");
        }

        LoginAttempt attempt = attempts.getOrDefault(username, new LoginAttempt());
        if (attempt.lockedUntil > System.currentTimeMillis()) {
            throw new IllegalArgumentException("Account temporarily locked. Try again later.");
        }

        AppUser u = users.findByUsername(username)
                .orElseThrow(() -> {
                    recordFailedAttempt(username);
                    return new IllegalArgumentException("Invalid credentials");
                });

        if (!u.isActive()) {
            throw new IllegalArgumentException("Account is disabled");
        }

        if (!enc.matches(password, u.getPassword())) {
            recordFailedAttempt(username);
            throw new IllegalArgumentException("Invalid credentials");
        }

        attempts.remove(username);

        String role = u.getRole() == null ? "USER" : u.getRole();
        return Map.of("token", jwt.generate(u.getUsername(), role),
                "username", u.getUsername(),
                "role", role);
    }

    @PostMapping("/signup")
    public Map<String,Object> signup(@RequestBody Map<String,String> body) {
        String displayName = body.getOrDefault("displayName", "").trim();
        String username = body.getOrDefault("username", "").trim();
        String email = body.getOrDefault("email", "").trim();
        String password = body.getOrDefault("password", "");

        if (displayName.isBlank()) throw new IllegalArgumentException("Display name is required");
        if (username.isBlank()) throw new IllegalArgumentException("Username is required");
        if (email.isBlank()) throw new IllegalArgumentException("Email is required");
        if (password.isBlank()) throw new IllegalArgumentException("Password is required");

        if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"))
            throw new IllegalArgumentException("Invalid email format");

        if (password.length() < 6)
            throw new IllegalArgumentException("Password must be at least 6 characters");

        if (users.existsByUsername(username))
            throw new IllegalArgumentException("Username already exists");

        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPassword(enc.encode(password));
        u.setFullName(displayName);
        u.setEmail(email);
        u.setRole("USER");
        u.setActive(true);
        u.setCreatedBy("self-registration");
        u.setCreatedAt(java.time.Instant.now());
        users.save(u);

        String role = "USER";
        return Map.of("token", jwt.generate(u.getUsername(), role),
                "username", u.getUsername(),
                "role", role);
    }

    @PostMapping("/forgot-password")
    public Map<String,Object> forgotPassword(@RequestBody Map<String,String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isBlank()) throw new IllegalArgumentException("Email is required");
        return Map.of("message", "If an account with that email exists, a password reset link has been sent.");
    }

    private void recordFailedAttempt(String username) {
        LoginAttempt attempt = attempts.computeIfAbsent(username, k -> new LoginAttempt());
        int count = attempt.count.incrementAndGet();
        if (count >= maxLoginAttempts) {
            attempt.lockedUntil = System.currentTimeMillis() + (lockoutMinutes * 60L * 1000L);
        }
    }

    private static class LoginAttempt {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long lockedUntil = 0;
    }
}

package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.Permission;
import in.zygertechnology.zygererp.entity.Role;
import in.zygertechnology.zygererp.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RbacService {

    private final UserRepository users;

    /**
     * Returns all permission codes for a user, derived from their assigned roles.
     * Format: "MODULE:SCREEN:ACTION" (e.g., "MASTER:ITEM:CREATE")
     */
    @Transactional(readOnly = true)
    public Set<String> getUserPermissionCodes(String username) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null) return Set.of();

        Set<String> codes = new HashSet<>();
        for (Role role : user.getRoles()) {
            if (!role.isActive()) continue;
            for (Permission perm : role.getPermissions()) {
                codes.add(perm.code());
            }
        }
        return codes;
    }

    /**
     * Returns all permission codes for a user, including wildcards.
     * A permission like "MASTER:*:*" grants all master actions.
     */
    @Transactional(readOnly = true)
    public Set<String> getUserPermissionsWithWildcards(String username) {
        Set<String> codes = getUserPermissionCodes(username);
        Set<String> expanded = new HashSet<>(codes);

        for (String code : codes) {
            String[] parts = code.split(":");
            if (parts.length == 3) {
                String module = parts[0];
                String screen = parts[1];
                String action = parts[2];

                // Module wildcard: MASTER:*:* covers all screens/actions in MASTER
                if (!"*".equals(module)) {
                    expanded.add(module + ":*:*");
                    expanded.add(module + ":" + screen + ":*");
                }
            }
        }
        return expanded;
    }

    /**
     * Checks if a user has a specific permission.
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(String username, String module, String screen, String action) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null) return false;

        // Admin bypass
        if (hasAdminRole(user)) return true;

        for (Role role : user.getRoles()) {
            if (!role.isActive()) continue;
            for (Permission perm : role.getPermissions()) {
                if (matchesPermission(perm, module, screen, action)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean hasAdminRole(AppUser user) {
        if ("ADMIN".equalsIgnoreCase(user.getRole())) return true;
        return user.getRoles().stream()
            .anyMatch(r -> r.isActive() && "ADMIN".equalsIgnoreCase(r.getName()));
    }

    private boolean matchesPermission(Permission perm, String module, String screen, String action) {
        if ("*".equals(perm.getModule())) return true;
        if (!perm.getModule().equalsIgnoreCase(module)) return false;
        if ("*".equals(perm.getScreen())) return true;
        if (!perm.getScreen().equalsIgnoreCase(screen)) return false;
        if ("*".equals(perm.getAction())) return true;
        return perm.getAction().equalsIgnoreCase(action);
    }
}

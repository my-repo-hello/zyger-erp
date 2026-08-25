package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.CompanyInfo;
import in.zygertechnology.zygererp.repo.CompanyInfoRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Map;

@RestController
public class CompanyLogoController {

    private final CompanyInfoRepository companyInfos;

    public CompanyLogoController(CompanyInfoRepository companyInfos) {
        this.companyInfos = companyInfos;
    }

    @PostMapping(value = "/api/master/company-info/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public Map<String, String> uploadCompanyLogo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "company") String type) throws IOException {

        String safeType = type.replaceAll("[^a-zA-Z0-9_-]", "");
        Path logoDir = Path.of("uploads", "company-logos", safeType);
        Files.createDirectories(logoDir);

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "logo";
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String stored = System.currentTimeMillis() + "_" + safeName;
        Path target = logoDir.resolve(stored);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String logoUrl = "/uploads/company-logos/" + safeType + "/" + stored;

        CompanyInfo ci = companyInfos.findById(1L).orElseGet(() -> {
            CompanyInfo c = new CompanyInfo();
            c.setCompanyName("New Company");
            return companyInfos.save(c);
        });

        switch (safeType) {
            case "iso" -> ci.setIsoLogoUrl(logoUrl);
            case "bis" -> ci.setBisLogoUrl(logoUrl);
            default -> ci.setCompanyLogoUrl(logoUrl);
        }
        ci.setUpdatedAt(Instant.now());
        companyInfos.save(ci);

        return Map.of("url", logoUrl);
    }

    @GetMapping("/api/master/company-info/logo/{type}")
    public ResponseEntity<byte[]> getCompanyLogo(@PathVariable String type) throws IOException {
        String safeType = type.replaceAll("[^a-zA-Z0-9_-]", "");
        CompanyInfo ci = companyInfos.findById(1L).orElse(null);
        if (ci == null) return ResponseEntity.notFound().build();

        String logoUrl = switch (safeType) {
            case "iso" -> ci.getIsoLogoUrl();
            case "bis" -> ci.getBisLogoUrl();
            default -> ci.getCompanyLogoUrl();
        };

        if (logoUrl == null || logoUrl.isBlank()) return ResponseEntity.notFound().build();

        Path filePath = Path.of("." + logoUrl);
        if (!Files.exists(filePath)) return ResponseEntity.notFound().build();

        byte[] bytes = Files.readAllBytes(filePath);
        String contentType = Files.probeContentType(filePath);
        if (contentType == null) contentType = "image/png";

        return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Cache-Control", "public, max-age=86400")
                .body(bytes);
    }
}

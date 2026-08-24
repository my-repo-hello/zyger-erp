package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.DocSequence;
import in.zygertechnology.zygererp.entity.NumberingConfig;
import in.zygertechnology.zygererp.repo.DocSequenceRepository;
import in.zygertechnology.zygererp.repo.NumberingConfigRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class DocNumberService {

    private final DocSequenceRepository repo;
    private final NumberingConfigRepository numberingConfigs;
    @PersistenceContext
    private EntityManager em;

    public DocNumberService(DocSequenceRepository repo, NumberingConfigRepository numberingConfigs) {
        this.repo = repo;
        this.numberingConfigs = numberingConfigs;
    }

    @Transactional
    public String next(String docType) {
        String prefix = docType;
        try {
            prefix = DocTypes.get(docType).prefix();
        } catch (Exception e) {
            if ("sales-order".equalsIgnoreCase(docType)) prefix = "SO";
            else if ("proforma-invoice".equalsIgnoreCase(docType)) prefix = "PI";
            else if ("sales-dc".equalsIgnoreCase(docType)) prefix = "DC";
            else if ("sales-invoice".equalsIgnoreCase(docType)) prefix = "INV";
            else if ("dc-return".equalsIgnoreCase(docType)) prefix = "DCR";
            else if ("invoice-return".equalsIgnoreCase(docType)) prefix = "INVR";
        }
        return next(docType, prefix);
    }

    @Transactional
    public String next(String docType, String prefix) {
        int year = LocalDate.now().getYear();
        String seqKey = docType.toLowerCase() + "/" + year;
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);

        DocSequence seq = repo.findByKeyAndYearForUpdate(seqKey, year).orElse(null);
        if (seq == null) {
            seq = new DocSequence();
            seq.setKey(seqKey);
            seq.setYear(year);
            seq.setNext(1L);
            seq = repo.saveAndFlush(seq);
        }
        long next = seq.getNext() <= 0 ? 1L : seq.getNext();
        seq.setNext(next + 1);
        repo.save(seq);
        return String.format("%s-%d-%04d", prefix.toUpperCase(), year, next);
    }

    /**
     * Configurable numbering path: looks up NumberingConfig for the docType and
     * builds the number from prefix + plantCode (if plantId provided) + separator + year (if resetPerYear) + zero-padded sequence.
     * Falls back to the legacy next(docType) behaviour when no config exists or it is inactive.
     */
    @Transactional
    public String nextNumberFromConfig(String docType, Long plantId) {
        String key = docType == null ? "" : docType.trim().toLowerCase();
        Optional<NumberingConfig> cfgOpt = numberingConfigs.findByDocType(key)
                .filter(c -> Boolean.TRUE.equals(c.getActive()));
        if (cfgOpt.isEmpty()) {
            return next(key);
        }

        NumberingConfig cfg = cfgOpt.get();
        int year = LocalDate.now().getYear();
        boolean perYear = Boolean.TRUE.equals(cfg.getResetPerYear());

        // Plant-scoped sequence key: PREFIX/PLANT_ID/YEAR
        String plantSuffix = (plantId != null && plantId > 0) ? "/P" + plantId : "";
        String seqKey = perYear ? key + plantSuffix + "/" + year : key + plantSuffix + "/global";
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);
        int seqYear = perYear ? year : 0;

        DocSequence seq = repo.findByKeyAndYearForUpdate(seqKey, seqYear).orElse(null);
        if (seq == null) {
            seq = new DocSequence();
            seq.setKey(seqKey);
            seq.setYear(seqYear);
            seq.setNext(1L);
            seq = repo.saveAndFlush(seq);
        }
        long next = seq.getNext() <= 0 ? 1L : seq.getNext();
        seq.setNext(next + 1);
        repo.save(seq);

        int pad = cfg.getZeroPad() == null || cfg.getZeroPad() < 1 ? 6 : cfg.getZeroPad();
        String sep = cfg.getSeparator() == null ? "-" : cfg.getSeparator();
        String prefix = (cfg.getPrefix() == null || cfg.getPrefix().isBlank() ? key : cfg.getPrefix()).toUpperCase();

        // FRS §3.2: PREFIX-PLANTCODE-YYYY-NNNNN format
        StringBuilder sb = new StringBuilder(prefix);
        if (plantId != null && plantId > 0) {
            // Look up plant code for human-readable prefix
            String plantCode = lookupPlantCode(plantId);
            if (plantCode != null) sb.append(sep).append(plantCode);
        }
        if (perYear) sb.append(sep).append(year);
        sb.append(sep).append(String.format("%0" + pad + "d", next));
        return sb.toString();
    }

    /** Legacy overload — no plant scoping. */
    @Transactional
    public String nextNumberFromConfig(String docType) {
        return nextNumberFromConfig(docType, null);
    }

    private String lookupPlantCode(Long plantId) {
        try {
            Object result = em.createQuery("SELECT p.code FROM PlantMaster p WHERE p.id = :id")
                    .setParameter("id", plantId)
                    .getSingleResult();
            return result != null ? result.toString() : "PLT" + plantId;
        } catch (Exception e) {
            return "PLT" + plantId;
        }
    }

    public static int currentFinancialYearStart() {
        LocalDate now = LocalDate.now();
        return now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
    }
}

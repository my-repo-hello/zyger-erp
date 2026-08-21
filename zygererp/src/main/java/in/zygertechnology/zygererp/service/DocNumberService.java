package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.DocSequence;
import in.zygertechnology.zygererp.repo.DocSequenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class DocNumberService {

    private final DocSequenceRepository repo;

    public DocNumberService(DocSequenceRepository repo) { this.repo = repo; }

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

    public static int currentFinancialYearStart() {
        LocalDate now = LocalDate.now();
        return now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
    }
}

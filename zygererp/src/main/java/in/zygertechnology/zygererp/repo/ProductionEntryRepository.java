package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionEntryRepository extends JpaRepository<ProductionEntry, Long> {
    List<ProductionEntry> findByWorkOrderNumber(String workOrderNumber);
    List<ProductionEntry> findByJobCardNumber(String jobCardNumber);
    List<ProductionEntry> findByStatus(String status);
    long countByStatus(String status);
}

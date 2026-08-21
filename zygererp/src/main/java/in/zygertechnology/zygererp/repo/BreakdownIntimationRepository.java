package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.BreakdownIntimation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BreakdownIntimationRepository extends JpaRepository<BreakdownIntimation, Long> {
    List<BreakdownIntimation> findByMachineCode(String machineCode);
    List<BreakdownIntimation> findByStatus(String status);
}

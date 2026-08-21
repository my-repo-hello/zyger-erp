package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.JobCard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobCardRepository extends JpaRepository<JobCard, Long> {
    List<JobCard> findByStatus(String status);
    List<JobCard> findByWorkOrderNumber(String workOrderNumber);
}

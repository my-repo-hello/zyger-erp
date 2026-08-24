package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.InspectionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InspectionPlanRepository extends JpaRepository<InspectionPlan, Long> {
    Optional<InspectionPlan> findFirstByPlantIdAndItemCodeAndDrawingNumberAndDrawingRevisionAndOperationAndInspectionTypeAndActiveTrue(
            Long plantId, String itemCode, String drawingNumber, String drawingRevision, String operation, String inspectionType);
    List<InspectionPlan> findByPlantIdAndItemCodeAndActiveTrue(Long plantId, String itemCode);
}

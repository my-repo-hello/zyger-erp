package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="job_order") @Getter @Setter @DocKey("job-order")
public class JobOrder extends BaseDoc implements DocEntity {
    @Column(name = "supplier_job_worker", length = 200) String supplierJobWorker;
    @Column(name = "subcontractor", length = 200) String subcontractor;
    @Column(name = "supplier", length = 200) String supplier;
    @Column(name = "job_work_type", length = 60) String jobWorkType;
    String process;
    @Column(name = "process_name", length = 100) String processName;
    @Column(name = "production_reference", length = 60) String productionReference;
    @Column(name = "job_order_reference", length = 60) String jobOrderReference;
    @Column(name = "required_date") LocalDate requiredDate;
    @Column(name = "expected_return_date") LocalDate expectedReturnDate;
    @Column(name = "payment_terms", length = 200) String paymentTerms;
    @Column(name = "attachment_file_name", length = 200) String attachmentFileName;
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<JobOrderItem> lines = new ArrayList<>();
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<JobOrderSchedule> schedules = new ArrayList<>();
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<JobOrderMaterialIssue> materialIssues = new ArrayList<>();
}

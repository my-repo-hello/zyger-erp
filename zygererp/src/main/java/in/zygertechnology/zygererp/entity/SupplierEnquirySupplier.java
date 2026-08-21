package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="supplier_enquiry_supplier") @Getter @Setter
public class SupplierEnquirySupplier {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    SupplierEnquiry doc;
    @Column(name = "supplier_code", length = 60) String supplierCode;
    @Column(name = "supplier_name", length = 200) String supplierName;
    @Column(name = "contact_person", length = 120) String contactPerson;
    String email;
    String phone;
    @Column(length = 30) String status;
    @Column(name = "enquiry_status", length = 30) String enquiryStatus;
}

package in.zygertechnology.zygererp.entity;
import java.time.Instant;
import java.time.LocalDate; import java.util.List;
public interface DocEntity {
    Long getId(); String getDocNo(); void setDocNo(String s);
    String getStatus(); void setStatus(String s);
    LocalDate getDocDate(); void setDocDate(LocalDate d);
    String getRemarks(); void setRemarks(String r);
    String getCreatedBy(); void setCreatedBy(String c);
    Instant getCreatedAt(); void setCreatedAt(Instant i);
    Instant getUpdatedAt(); void setUpdatedAt(Instant i);
    String getUpdatedBy(); void setUpdatedBy(String u);
    Boolean getDeleted(); void setDeleted(Boolean d);
    Instant getDeletedAt(); void setDeletedAt(Instant i);
    String getDeletedBy(); void setDeletedBy(String u);
    Long getVersion();
    List<? extends LineEntity> getLines();
}
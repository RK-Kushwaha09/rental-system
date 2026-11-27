package com.rentmanager.repository;

import com.rentmanager.model.Bill;
import com.rentmanager.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByInvoiceNumber(String invoiceNumber);
    List<Bill> findByTenantId(Long tenantId);
    List<Bill> findByRoomId(Long roomId);
    List<Bill> findByRoomIdOrderByIdDesc(Long roomId);
    List<Bill> findByStatus(String status);
    Optional<Bill> findTopByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<Bill> findTopByRoomIdOrderByIdDesc(Long roomId);
    Optional<Bill> findTopByTenantIdOrderByIdDesc(Long tenantId);

    @Query("SELECT b FROM Bill b WHERE b.room.property = :property ORDER BY b.id DESC")
    List<Bill> findByPropertyOrderByIdDesc(@Param("property") Property property);

    @Query("SELECT b FROM Bill b WHERE b.tenant.id = :tenantId AND b.billingMonth = :billingMonth AND b.invoiceNumber NOT LIKE 'HIST-%'")
    Optional<Bill> findProductionBillByTenantAndMonth(@Param("tenantId") Long tenantId, @Param("billingMonth") String billingMonth);
}

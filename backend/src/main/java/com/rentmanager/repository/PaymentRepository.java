package com.rentmanager.repository;

import com.rentmanager.model.Payment;
import com.rentmanager.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByReceiptNumber(String receiptNumber);
    List<Payment> findByTenantId(Long tenantId);
    List<Payment> findByBillId(Long billId);
    List<Payment> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT p FROM Payment p WHERE p.tenant.property = :property OR (p.bill IS NOT NULL AND p.bill.room.property = :property) ORDER BY p.id DESC")
    List<Payment> findByPropertyOrderByIdDesc(@Param("property") Property property);
}

package payments;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByOrderByPaymentMonthDescCreatedAtDesc();

    List<Payment> findByTenantIdOrderByPaymentMonthDesc(Long tenantId);

    List<Payment> findByPaymentMonthOrderByTenantNameAsc(String paymentMonth);

    List<Payment> findByTenantIdAndPaymentMonth(Long tenantId, String paymentMonth);

    Optional<Payment> findFirstByTenantIdAndPaymentMonth(Long tenantId, String paymentMonth);

    Optional<Payment> findTopByTenantIdAndPaymentMonthLessThanOrderByPaymentMonthDesc(Long tenantId, String paymentMonth);

    List<Payment> findTop5ByOrderByCreatedAtDesc();

    @Query("SELECT p FROM Payment p WHERE p.status = 'due' ORDER BY p.balance ASC")
    List<Payment> findPendingDues();
}

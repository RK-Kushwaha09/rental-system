package payments;

import common.ApiResponse;
import rooms.Room;
import tenants.Tenant;
import tenants.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final TenantRepository tenantRepository;

    public PaymentController(PaymentRepository paymentRepository, TenantRepository tenantRepository) {
        this.paymentRepository = paymentRepository;
        this.tenantRepository = tenantRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Payment>>> getPayments(
            @RequestParam(name = "tenant_id", required = false) Long tenantId,
            @RequestParam(name = "month", required = false) String month) {
        List<Payment> list;
        if (tenantId != null && tenantId > 0 && month != null && !month.isBlank()) {
            list = paymentRepository.findByTenantIdAndPaymentMonth(tenantId, month.trim());
        } else if (tenantId != null && tenantId > 0) {
            list = paymentRepository.findByTenantIdOrderByPaymentMonthDesc(tenantId);
        } else if (month != null && !month.isBlank()) {
            list = paymentRepository.findByPaymentMonthOrderByTenantNameAsc(month.trim());
        } else {
            list = paymentRepository.findAllByOrderByPaymentMonthDescCreatedAtDesc();
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/helper-info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHelperInfo(
            @RequestParam("tenant_id") Long tenantId,
            @RequestParam("month") String month) {

        BigDecimal carryForward = BigDecimal.ZERO;
        Optional<Payment> prevPayOpt = paymentRepository
                .findTopByTenantIdAndPaymentMonthLessThanOrderByPaymentMonthDesc(tenantId, month.trim());

        if (prevPayOpt.isPresent()) {
            BigDecimal prevBal = prevPayOpt.get().getBalance();
            if (prevBal.compareTo(BigDecimal.ZERO) < 0) {
                carryForward = prevBal.abs(); // positive adds to total due
            } else if (prevBal.compareTo(BigDecimal.ZERO) > 0) {
                carryForward = prevBal.negate(); // negative subtracts from total due
            }
        }

        BigDecimal lastMeter = BigDecimal.ZERO;
        List<Payment> list = paymentRepository.findByTenantIdOrderByPaymentMonthDesc(tenantId);
        if (!list.isEmpty()) {
            lastMeter = list.get(0).getCurrMeter();
        }

        Map<String, Object> data = new HashMap<>();
        data.put("carry_forward", carryForward);
        data.put("last_meter", lastMeter);

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Payment>> recordPayment(@RequestBody Map<String, Object> body) {
        Long tenantId = Long.valueOf(body.get("tenantId").toString());
        String month = body.get("paymentMonth").toString().trim();
        BigDecimal prevMeter = new BigDecimal(body.getOrDefault("prevMeter", 0).toString());
        BigDecimal currMeter = new BigDecimal(body.getOrDefault("currMeter", 0).toString());
        BigDecimal paidAmount = new BigDecimal(body.getOrDefault("paidAmount", 0).toString());
        String notes = body.getOrDefault("notes", "").toString();

        if (currMeter.compareTo(prevMeter) < 0) {
            throw new IllegalArgumentException("Current meter cannot be less than previous meter");
        }

        if (paymentRepository.findFirstByTenantIdAndPaymentMonth(tenantId, month).isPresent()) {
            throw new IllegalStateException("Payment for this month already exists for this tenant");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with id: " + tenantId));

        Room room = tenant.getRoom();
        if (room == null) {
            throw new IllegalStateException("Tenant has no room assigned");
        }

        BigDecimal carryForward = BigDecimal.ZERO;
        Optional<Payment> prevPayOpt = paymentRepository
                .findTopByTenantIdAndPaymentMonthLessThanOrderByPaymentMonthDesc(tenantId, month);
        if (prevPayOpt.isPresent()) {
            BigDecimal prevBal = prevPayOpt.get().getBalance();
            if (prevBal.compareTo(BigDecimal.ZERO) < 0) {
                carryForward = prevBal.abs();
            } else if (prevBal.compareTo(BigDecimal.ZERO) > 0) {
                carryForward = prevBal.negate();
            }
        }

        Payment payment = new Payment();
        payment.setTenant(tenant);
        payment.setRoom(room);
        payment.setPaymentMonth(month);
        payment.setPrevMeter(prevMeter);
        payment.setCurrMeter(currMeter);
        payment.setElectricityRate(room.getElectricityPerUnit());
        payment.setMonthlyRent(room.getMonthlyRent());
        payment.setCarryForward(carryForward);
        payment.setPaidAmount(paidAmount);
        payment.setNotes(notes);

        payment.computeValues();

        return ResponseEntity.ok(ApiResponse.ok("Payment recorded successfully", paymentRepository.save(payment)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePayment(@PathVariable Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new IllegalArgumentException("Payment not found with id: " + id);
        }
        paymentRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Payment deleted successfully", null));
    }
}

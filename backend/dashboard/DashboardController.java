package dashboard;

import buildings.BuildingRepository;
import common.ApiResponse;
import payments.Payment;
import payments.PaymentRepository;
import rooms.RoomRepository;
import tenants.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRepository paymentRepository;

    public DashboardController(BuildingRepository buildingRepository,
                               RoomRepository roomRepository,
                               TenantRepository tenantRepository,
                               PaymentRepository paymentRepository) {
        this.buildingRepository = buildingRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRepository = paymentRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardStats>> getDashboard() {
        DashboardStats stats = new DashboardStats();

        stats.setBuildings(buildingRepository.count());
        stats.setTotalRooms(roomRepository.count());
        stats.setOccupiedRooms(roomRepository.countByStatus("occupied"));
        stats.setVacantRooms(roomRepository.countByStatus("vacant"));
        stats.setTenants(tenantRepository.count());

        String currentMonth = YearMonth.now().toString(); // e.g. "2026-09"
        stats.setCurrentMonth(currentMonth);

        List<Payment> monthPayments = paymentRepository.findByPaymentMonthOrderByTenantNameAsc(currentMonth);
        DashboardStats.PaymentStats payStats = new DashboardStats.PaymentStats();
        payStats.setTotalPayments(monthPayments.size());

        long dueCount = 0;
        long advanceCount = 0;
        long clearCount = 0;
        BigDecimal collected = BigDecimal.ZERO;
        BigDecimal billed = BigDecimal.ZERO;

        for (Payment p : monthPayments) {
            if ("due".equalsIgnoreCase(p.getStatus())) dueCount++;
            else if ("advance".equalsIgnoreCase(p.getStatus())) advanceCount++;
            else clearCount++;

            if (p.getPaidAmount() != null) collected = collected.add(p.getPaidAmount());
            if (p.getTotalDue() != null) billed = billed.add(p.getTotalDue());
        }

        payStats.setDueCount(dueCount);
        payStats.setAdvanceCount(advanceCount);
        payStats.setClearCount(clearCount);
        payStats.setTotalCollected(collected);
        payStats.setTotalBilled(billed);
        stats.setPaymentStats(payStats);

        // Recent payments
        stats.setRecentPayments(paymentRepository.findTop5ByOrderByCreatedAtDesc());

        // Pending dues
        List<Payment> dues = paymentRepository.findPendingDues();
        if (dues.size() > 5) {
            stats.setPendingDues(dues.subList(0, 5));
        } else {
            stats.setPendingDues(dues);
        }

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}

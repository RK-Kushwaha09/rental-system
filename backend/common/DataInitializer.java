package common;

import buildings.Building;
import buildings.BuildingRepository;
import payments.Payment;
import payments.PaymentRepository;
import rooms.Room;
import rooms.RoomRepository;
import tenants.Tenant;
import tenants.TenantRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRepository paymentRepository;

    public DataInitializer(BuildingRepository buildingRepository,
                           RoomRepository roomRepository,
                           TenantRepository tenantRepository,
                           PaymentRepository paymentRepository) {
        this.buildingRepository = buildingRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRepository = paymentRepository;
    }

    @Override
    public void run(String... args) {
        if (buildingRepository.count() > 0) {
            return;
        }

        // 1. Buildings
        Building b1 = buildingRepository.save(new Building("Sunrise Apartments", "12 MG Road, Ahmedabad, Gujarat"));
        Building b2 = buildingRepository.save(new Building("Green Valley Residency", "45 SG Highway, Ahmedabad, Gujarat"));

        // 2. Rooms
        Room r101 = roomRepository.save(new Room(b1, "101", new BigDecimal("8000.00"), new BigDecimal("8.50"), "occupied"));
        Room r102 = roomRepository.save(new Room(b1, "102", new BigDecimal("7500.00"), new BigDecimal("8.50"), "occupied"));
        roomRepository.save(new Room(b1, "103", new BigDecimal("9000.00"), new BigDecimal("8.50"), "vacant"));

        Room r201 = roomRepository.save(new Room(b2, "201", new BigDecimal("10000.00"), new BigDecimal("9.00"), "occupied"));
        roomRepository.save(new Room(b2, "202", new BigDecimal("8500.00"), new BigDecimal("9.00"), "vacant"));

        // 3. Tenants
        Tenant t1 = tenantRepository.save(new Tenant("Rahul Sharma", "9876543210", "rahul@email.com", r101, LocalDate.of(2024, 1, 1)));
        Tenant t2 = tenantRepository.save(new Tenant("Priya Patel", "9876543211", "priya@email.com", r102, LocalDate.of(2024, 3, 1)));
        Tenant t3 = tenantRepository.save(new Tenant("Amit Shah", "9876543212", "amit@email.com", r201, LocalDate.of(2024, 6, 1)));

        // 4. Sample Payments
        Payment p1 = new Payment();
        p1.setTenant(t1);
        p1.setRoom(r101);
        p1.setPaymentMonth("2026-08");
        p1.setPrevMeter(new BigDecimal("1200.00"));
        p1.setCurrMeter(new BigDecimal("1280.00"));
        p1.setElectricityRate(new BigDecimal("8.50"));
        p1.setMonthlyRent(new BigDecimal("8000.00"));
        p1.setCarryForward(BigDecimal.ZERO);
        p1.setPaidAmount(new BigDecimal("8680.00"));
        p1.setNotes("August rent & electricity cleared in full");
        p1.computeValues();
        paymentRepository.save(p1);

        Payment p2 = new Payment();
        p2.setTenant(t2);
        p2.setRoom(r102);
        p2.setPaymentMonth("2026-08");
        p2.setPrevMeter(new BigDecimal("450.00"));
        p2.setCurrMeter(new BigDecimal("510.00"));
        p2.setElectricityRate(new BigDecimal("8.50"));
        p2.setMonthlyRent(new BigDecimal("7500.00"));
        p2.setCarryForward(BigDecimal.ZERO);
        p2.setPaidAmount(new BigDecimal("7000.00"));
        p2.setNotes("Partial payment - pending due of Rs 1010");
        p2.computeValues();
        paymentRepository.save(p2);

        Payment p3 = new Payment();
        p3.setTenant(t3);
        p3.setRoom(r201);
        p3.setPaymentMonth("2026-09");
        p3.setPrevMeter(new BigDecimal("300.00"));
        p3.setCurrMeter(new BigDecimal("350.00"));
        p3.setElectricityRate(new BigDecimal("9.00"));
        p3.setMonthlyRent(new BigDecimal("10000.00"));
        p3.setCarryForward(BigDecimal.ZERO);
        p3.setPaidAmount(new BigDecimal("11000.00"));
        p3.setNotes("September advance paid");
        p3.computeValues();
        paymentRepository.save(p3);
    }
}

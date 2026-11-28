package com.rentmanager.service;

import com.rentmanager.model.*;
import com.rentmanager.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final SubMeterRepository subMeterRepository;
    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           PropertyRepository propertyRepository,
                           RoomRepository roomRepository, TenantRepository tenantRepository,
                           SubMeterRepository subMeterRepository, BillRepository billRepository,
                           PaymentRepository paymentRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
        this.subMeterRepository = subMeterRepository;
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        logger.info("Checking database state in MySQL 8.0 / H2...");

        // 0. Ensure default test/owner account exists with verified Password@123
        User defaultOwner = userRepository.findByEmail("group@gmail.com")
                .or(() -> userRepository.findByMobile("9825000111"))
                .orElse(null);

        if (defaultOwner == null) {
            defaultOwner = new User(
                    "owner-group",
                    "Rajesh Patel",
                    "9825000111",
                    "group@gmail.com",
                    passwordEncoder.encode("Password@123"),
                    "ROLE_LANDLORD"
            );
            defaultOwner.setSetupCompleted(true);
            defaultOwner = userRepository.save(defaultOwner);
            logger.info("Seeded default owner account: group@gmail.com (Password@123)");
        } else {
            defaultOwner.setPassword(passwordEncoder.encode("Password@123"));
            defaultOwner.setSetupCompleted(true);
            defaultOwner = userRepository.save(defaultOwner);
            logger.info("Ensured owner password is Password@123 for group@gmail.com");
        }

        // 1. Seed Property & Units (Prototype business data only)
        if (propertyRepository.count() == 0) {
            Property property = new Property(
                    "prop-shree-residency",
                    "Shree Residency",
                    "Navrangpura, Ahmedabad, Gujarat",
                    "Navrangpura, Ahmedabad • 5 Units",
                    "CO-LIVING / PG",
                    "ACTIVE",
                    40500.0,
                    8000.0,
                    8.5,
                    "shreeresidency@okhdfcbank",
                    "Rajesh Patel",
                    "+91 98250 00111"
            );
            property.setUser(defaultOwner);
            property = propertyRepository.save(property);

            // Rooms
            Room r101 = new Room("room-101", "101", "Ground Fl", "Standard Deluxe", "OCCUPIED", 8000.0, false, 8.5, property);
            Room r102 = new Room("room-102", "102", "Ground Fl", "Standard Deluxe", "OCCUPIED", 8000.0, false, 8.5, property);
            Room r103 = new Room("room-103", "103", "Ground Fl", "Corner Balcony", "OCCUPIED", 8500.0, true, 8.5, property);
            Room r204 = new Room("room-204", "204", "1st Floor", "Master Suite", "OCCUPIED", 8000.0, false, 8.5, property);
            Room r105 = new Room("room-105", "105", "Ground Fl", "Standard Deluxe", "VACANT", 8000.0, false, 8.5, property);

            r101 = roomRepository.save(r101);
            r102 = roomRepository.save(r102);
            r103 = roomRepository.save(r103);
            r204 = roomRepository.save(r204);
            r105 = roomRepository.save(r105);

            // SubMeters
            SubMeter sm101 = new SubMeter("#E-101", 1300.0, "01/10/2026", 1420.0, "Logged today", 120.0, true, r101);
            SubMeter sm102 = new SubMeter("#E-102", 900.0, "01/10/2026", 900.0, "Pending", 0.0, false, r102);
            SubMeter sm103 = new SubMeter("#E-103", 890.0, "01/10/2026", 890.0, "Pending", 0.0, false, r103);
            SubMeter sm204 = new SubMeter("#E-204", 1250.0, "01/10/2026", 1384.0, "Logged today", 134.0, true, r204);

            subMeterRepository.save(sm101);
            subMeterRepository.save(sm102);
            subMeterRepository.save(sm103);
            subMeterRepository.save(sm204);

            // Tenants
            Tenant tVikram = new Tenant("tenant-101", "Vikram Singh", "VS", "+91 98250 11234", "vikram@example.com", "Ground Fl", "Active Agreement", "01 Feb 2026", 0.0, 0.0, null, r101);
            Tenant tRahul = new Tenant("tenant-102", "Rahul Sharma", "RS", "+91 98790 44556", "rahul@example.com", "Ground Fl", "Active Agreement", "15 Mar 2026", 0.0, 0.0, null, r102);
            Tenant tPriya = new Tenant("tenant-103", "Priya Shah", "PS", "+91 97230 88990", "priya@example.com", "Ground Fl", "Active Agreement", "01 Apr 2026", 0.0, 0.0, null, r103);
            Tenant tAmit = new Tenant("tenant-204", "Amit Patel", "AP", "+91 98240 77123", "amit@example.com", "1st Floor", "Active Agreement", "12 Jan 2026", 100.0, 9239.0, null, r204);

            tenantRepository.save(tVikram);
            tenantRepository.save(tRahul);
            tenantRepository.save(tPriya);
            tenantRepository.save(tAmit);

            // Sample Bills
            Bill bill204 = new Bill(
                    "#INV-2026-10204",
                    "01 Oct – 31 Oct 2026",
                    "OCTOBER",
                    "DUE TODAY",
                    "05 Nov 2026",
                    8000.0,
                    1250.0,
                    1384.0,
                    134.0,
                    8.5,
                    1139.0,
                    100.0,
                    9239.0,
                    "28 Oct 2026 • 04:30 PM",
                    tAmit,
                    r204
            );
            billRepository.save(bill204);

            // Sample Receipts
            Payment rec1 = new Payment("#REC-000122", "TRANSACTION SETTLED", 8850.0, "INR", "UPI (GPay)", "UPI Ref #9042", "28 Oct 2026", "100% SETTLED", 0.0, tVikram, null);
            Payment rec2 = new Payment("#REC-000121", "TRANSACTION SETTLED", 9120.0, "INR", "IMPS Transfer", "IMPS/2026/1948", "26 Oct 2026", "100% SETTLED", 0.0, null, null);
            paymentRepository.save(rec1);
            paymentRepository.save(rec2);

            logger.info("Successfully seeded demo data (Shree Residency, 5 Rooms, 4 Tenants, Bills, Payments) into MySQL 8.0!");
        }
    }
}

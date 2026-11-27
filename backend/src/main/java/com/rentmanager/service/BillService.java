package com.rentmanager.service;

import com.rentmanager.dto.BillCreateRequest;
import com.rentmanager.model.*;
import com.rentmanager.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BillService {

    private final BillRepository billRepository;
    private final TenantRepository tenantRepository;
    private final RoomRepository roomRepository;
    private final SubMeterRepository subMeterRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;

    public BillService(BillRepository billRepository,
                       TenantRepository tenantRepository,
                       RoomRepository roomRepository,
                       SubMeterRepository subMeterRepository,
                       PropertyRepository propertyRepository,
                       UserRepository userRepository,
                       PaymentRepository paymentRepository) {
        this.billRepository = billRepository;
        this.tenantRepository = tenantRepository;
        this.roomRepository = roomRepository;
        this.subMeterRepository = subMeterRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
    }

    /**
     * Resolves authenticated user strictly from Spring Security Context.
     */
    private User getCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Authentication required");
        }
        String identifier = auth.getName();
        return userRepository.findByMobile(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByUserId(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    /**
     * Resolves authenticated owner's property.
     */
    private Property getCurrentProperty() {
        User owner = getCurrentAuthenticatedUser();
        return propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No property found for owner"));
    }

    public static class TenantBillingSchedule {
        public Long tenantId;
        public String tenantName;
        public String initials;
        public String unit;
        public Double monthlyRent;
        public String mobile;
        public LocalDate moveInDate;
        public LocalDate cycleStartDate;
        public LocalDate nextBillDate;
        public String cycleMonth;
        public String cycleMonthLabel;
        public String billingPeriod;
        public long daysRemaining;
        public boolean isWindowOpen;
        public boolean canGenerate;
        public String statusBadge;
        public String countdownText;
        public LocalDate windowOpenDate;
        public boolean isActionRequired;
        public boolean isOverdue;
    }

    public static LocalDate parseJoinedDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        String s = dateStr.trim();
        DateTimeFormatter[] formatters = new DateTimeFormatter[] {
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM yyyy").toFormatter(Locale.ENGLISH),
            DateTimeFormatter.ISO_LOCAL_DATE,
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd/MM/yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d/M/yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy/MM/dd").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MM-yyyy").toFormatter(Locale.ENGLISH)
        };

        for (DateTimeFormatter dtf : formatters) {
            try {
                return LocalDate.parse(s, dtf);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    public TenantBillingSchedule calculateSchedule(Tenant tenant, List<Bill> allProductionBills, LocalDate today) {
        if (tenant == null) return null;
        TenantBillingSchedule sched = new TenantBillingSchedule();
        sched.tenantId = tenant.getId();
        sched.tenantName = tenant.getFullName();
        sched.initials = (tenant.getInitials() != null && !tenant.getInitials().isEmpty()) ? tenant.getInitials() : "TN";
        Room r = tenant.getRoom();
        sched.unit = "Unit " + (r != null ? r.getRoomNumber() : "") + " • " + (r != null ? r.getFloor() : "");
        sched.monthlyRent = (r != null && r.getMonthlyRent() != null) ? r.getMonthlyRent() : 5000.0;
        sched.mobile = tenant.getMobile() != null ? tenant.getMobile() : "";

        LocalDate moveIn = parseJoinedDate(tenant.getJoinedDate());
        if (moveIn == null) {
            moveIn = today;
        }
        sched.moveInDate = moveIn;

        // Bills for this tenant
        List<Bill> tenantBills = allProductionBills != null ? allProductionBills.stream()
                .filter(b -> b.getTenant() != null && b.getTenant().getId().equals(tenant.getId()))
                .collect(Collectors.toList()) : Collections.emptyList();

        // Calculate sequence of billing cycles starting from moveInDate
        // Cycle 1 ends at moveInDate.plusMonths(1)
        int cycleIndex = 1;
        LocalDate cycleStart = moveIn;
        LocalDate cycleBillDate = moveIn.plusMonths(1);

        while (cycleIndex < 120) {
            final LocalDate targetDate = cycleBillDate;
            final LocalDate targetStart = cycleStart;

            String monthName = targetDate.getMonth().name();
            int targetYear = targetDate.getYear();

            // Check if a production bill already exists for this cycle
            boolean exists = tenantBills.stream().anyMatch(b -> {
                String bm = b.getBillingMonth() != null ? b.getBillingMonth().toUpperCase().trim() : "";
                if (bm.equals(monthName)) {
                    return true;
                }
                if (bm.length() >= 3 && monthName.startsWith(bm)) {
                    return true;
                }
                String bp = b.getBillingPeriod() != null ? b.getBillingPeriod() : "";
                if (bp.contains(String.valueOf(targetYear)) &&
                   bp.toLowerCase().contains(monthName.substring(0, 3).toLowerCase())) {
                    return true;
                }
                return false;
            });

            // Fast-forward past expired cycles from months/years ago if unbilled and older than 1 full month
            if (!exists && targetDate.plusMonths(1).isBefore(today) && cycleIndex < 60) {
                cycleStart = cycleBillDate;
                cycleIndex++;
                cycleBillDate = moveIn.plusMonths(cycleIndex);
                continue;
            }

            if (!exists) {
                break;
            }

            cycleStart = cycleBillDate;
            cycleIndex++;
            cycleBillDate = moveIn.plusMonths(cycleIndex);
        }

        sched.cycleStartDate = cycleStart;
        sched.nextBillDate = cycleBillDate;
        sched.cycleMonth = cycleBillDate.getMonth().name();
        sched.cycleMonthLabel = cycleBillDate.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH));
        sched.billingPeriod = cycleStart.format(DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH)) + " – " +
                cycleBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH));

        long daysRem = ChronoUnit.DAYS.between(today, cycleBillDate);
        sched.daysRemaining = daysRem;
        sched.windowOpenDate = cycleBillDate.minusDays(5);
        sched.isWindowOpen = daysRem <= 5;
        sched.canGenerate = daysRem <= 5;
        sched.isOverdue = daysRem < 0;
        sched.isActionRequired = sched.canGenerate;

        if (daysRem > 5) {
            sched.statusBadge = "Upcoming";
            sched.countdownText = "in " + daysRem + " days";
        } else if (daysRem > 0) {
            sched.statusBadge = "Ready to Bill";
            sched.countdownText = "in " + daysRem + (daysRem == 1 ? " day" : " days");
        } else if (daysRem == 0) {
            sched.statusBadge = "Due Today";
            sched.countdownText = "Due today";
        } else {
            long over = Math.abs(daysRem);
            sched.statusBadge = "Overdue";
            sched.countdownText = over + (over == 1 ? " day" : " days") + " overdue";
        }

        return sched;
    }

    /**
     * Fetches draft billing details for creating a new bill with real persisted tenant, room, and meter readings.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDraftBill(String tenantIdOrCode, String month) {
        Property property = getCurrentProperty();
        List<Tenant> tenants = tenantRepository.findByPropertyOrRoomProperty(property);

        Map<String, Object> draft = new HashMap<>();

        if (tenants.isEmpty()) {
            draft.put("noTenants", true);
            draft.put("availableTenants", Collections.emptyList());
            draft.put("status", "NO_TENANTS");
            draft.put("propertyName", property.getPropertyName());
            return draft;
        }

        // Available tenants list for frontend selector
        List<Map<String, Object>> availableTenants = new ArrayList<>();
        for (Tenant t : tenants) {
            Map<String, Object> tm = new HashMap<>();
            tm.put("id", t.getId());
            tm.put("tenantCode", t.getTenantCode());
            tm.put("fullName", t.getFullName());
            tm.put("name", t.getFullName());
            tm.put("mobile", t.getMobile());
            tm.put("roomNumber", t.getRoom() != null ? t.getRoom().getRoomNumber() : "");
            tm.put("floor", t.getRoom() != null ? t.getRoom().getFloor() : t.getFloor());
            availableTenants.add(tm);
        }
        draft.put("availableTenants", availableTenants);

        // Select the requested tenant or default to the first tenant
        Tenant selectedTenant = null;
        if (tenantIdOrCode != null && !tenantIdOrCode.trim().isEmpty()) {
            for (Tenant t : tenants) {
                if (String.valueOf(t.getId()).equals(tenantIdOrCode) ||
                        (t.getTenantCode() != null && t.getTenantCode().equalsIgnoreCase(tenantIdOrCode)) ||
                        t.getFullName().equalsIgnoreCase(tenantIdOrCode)) {
                    selectedTenant = t;
                    break;
                }
            }
        }
        if (selectedTenant == null) {
            selectedTenant = tenants.get(0);
        }

        Room room = selectedTenant.getRoom();
        if (room == null && !roomRepository.findByProperty(property).isEmpty()) {
            room = roomRepository.findByProperty(property).get(0);
        }

        Double baseMonthlyRent = (room != null && room.getMonthlyRent() != null) ? room.getMonthlyRent() : 0.0;
        Double ratePerUnit = (room != null && room.getElectricityRate() != null) ? room.getElectricityRate() : 0.0;

        // Retrieve latest saved meter reading dynamically
        Double previousReading = 0.0;
        String prevReadingSource = "None";
        Double pastDue = 0.0;
        Double pastAdvance = 0.0;

        if (room != null) {
            List<Bill> roomBills = billRepository.findByRoomIdOrderByIdDesc(room.getId());
            if (!roomBills.isEmpty()) {
                // Find latest bill that has a powerReadingCurr
                for (Bill b : roomBills) {
                    if (b.getPowerReadingCurr() != null) {
                        previousReading = b.getPowerReadingCurr();
                        prevReadingSource = b.getBillingMonth() != null ? b.getBillingMonth() : "Previous Bill";
                        break;
                    }
                }

                // Balance carry forward from the most recent chronological bill
                Bill latestBill = roomBills.get(0);
                if (latestBill.getClosingDue() != null && latestBill.getClosingDue() > 0) {
                    pastDue = latestBill.getClosingDue();
                } else if (latestBill.getClosingAdvance() != null && latestBill.getClosingAdvance() > 0) {
                    pastAdvance = latestBill.getClosingAdvance();
                } else if (latestBill.getBalance() != null) {
                    if (latestBill.getBalance() < 0) {
                        pastDue = Math.abs(latestBill.getBalance());
                    } else if (latestBill.getBalance() > 0) {
                        pastAdvance = latestBill.getBalance();
                    }
                }
            } else if (room.getSubMeter() != null && room.getSubMeter().getCurrentReading() != null) {
                previousReading = room.getSubMeter().getCurrentReading();
                prevReadingSource = "Submeter";
            } else if (room.getSubMeter() != null && room.getSubMeter().getPreviousReading() != null) {
                previousReading = room.getSubMeter().getPreviousReading();
                prevReadingSource = "Submeter Initial";
            }
        }

        if (pastDue == 0.0 && pastAdvance == 0.0 && selectedTenant.getOpeningBalance() != null) {
            if (selectedTenant.getOpeningBalance() < 0) {
                pastDue = Math.abs(selectedTenant.getOpeningBalance());
            } else if (selectedTenant.getOpeningBalance() > 0) {
                pastAdvance = selectedTenant.getOpeningBalance();
            }
        }

        String subMeterId = (room != null && room.getSubMeter() != null) ? room.getSubMeter().getMeterCode() : ("#E-" + (room != null ? room.getRoomNumber() : ""));

        List<Bill> allBills = billRepository.findByPropertyOrderByIdDesc(property);
        List<Bill> productionBills = allBills.stream()
                .filter(b -> b.getInvoiceNumber() == null || !b.getInvoiceNumber().startsWith("HIST-"))
                .collect(Collectors.toList());
        TenantBillingSchedule schedule = calculateSchedule(selectedTenant, productionBills, LocalDate.now());

        String currentCalMonth = LocalDate.now().getMonth().name();
        String bMonth = (month != null && !month.trim().isEmpty()) ? month.toUpperCase() : (schedule != null ? schedule.cycleMonth : currentCalMonth);
        String bPeriod = schedule != null ? schedule.billingPeriod : ("01 " + bMonth.substring(0, Math.min(3, bMonth.length())) + " – 31 " + bMonth.substring(0, Math.min(3, bMonth.length())) + " " + LocalDate.now().getYear());
        String dueDate = schedule != null ? schedule.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)) : LocalDate.now().plusMonths(1).withDayOfMonth(5).format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH));

        draft.put("id", "draft-" + (selectedTenant.getId() != null ? selectedTenant.getId() : "1") + "-" + System.currentTimeMillis());
        draft.put("periodLabel", "Billing Period: " + (schedule != null ? schedule.cycleMonthLabel : (bMonth + " 2026")));
        draft.put("billingMonth", bMonth);
        draft.put("billingPeriod", bPeriod);
        draft.put("status", "DRAFTING");
        draft.put("dueDate", dueDate);
        boolean bypassScheduleLockForTesting = false;
        if (schedule != null) {
            draft.put("nextBillDate", schedule.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
            draft.put("canGenerate", bypassScheduleLockForTesting ? true : schedule.canGenerate);
            draft.put("isWindowOpen", bypassScheduleLockForTesting ? true : schedule.isWindowOpen);
            draft.put("daysRemaining", schedule.daysRemaining);
            draft.put("countdownText", schedule.countdownText);
            draft.put("windowOpenDate", schedule.windowOpenDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
            draft.put("statusBadge", bypassScheduleLockForTesting ? "Ready to Bill" : schedule.statusBadge);
        }
        draft.put("subMeterId", subMeterId);
        draft.put("baseMonthlyRent", baseMonthlyRent);
        draft.put("ratePerUnit", ratePerUnit);
        draft.put("previousReading", previousReading);
        draft.put("previousReadingDate", prevReadingSource);
        draft.put("pastDue", pastDue);
        draft.put("pastAdvance", pastAdvance);
        draft.put("pastArrears", pastDue); // backward compatibility with UI
        draft.put("arrearsMonth", pastDue > 0 ? "Previous Unpaid Dues" : (pastAdvance > 0 ? "Advance Available" : "Settled"));

        Map<String, Object> tenantMap = new HashMap<>();
        tenantMap.put("id", selectedTenant.getId());
        tenantMap.put("tenantId", selectedTenant.getId());
        tenantMap.put("tenantCode", selectedTenant.getTenantCode());
        tenantMap.put("fullName", selectedTenant.getFullName());
        tenantMap.put("name", selectedTenant.getFullName());
        tenantMap.put("initials", (selectedTenant.getInitials() != null && !selectedTenant.getInitials().isEmpty()) ? selectedTenant.getInitials() : "TN");
        tenantMap.put("mobile", selectedTenant.getMobile());
        tenantMap.put("unitNumber", room != null ? room.getRoomNumber() : "");
        tenantMap.put("roomNumber", room != null ? room.getRoomNumber() : "");
        tenantMap.put("roomId", room != null ? room.getId() : null);
        tenantMap.put("floor", room != null ? room.getFloor() : (selectedTenant.getFloor() != null ? selectedTenant.getFloor() : "Ground Fl"));
        tenantMap.put("property", property.getPropertyName());
        tenantMap.put("agreementStatus", selectedTenant.getAgreementStatus() != null ? selectedTenant.getAgreementStatus() : "Active Agreement");
        tenantMap.put("joinedDate", selectedTenant.getJoinedDate() != null ? selectedTenant.getJoinedDate() : "Recently");
        draft.put("tenant", tenantMap);

        Map<String, Object> roomMap = new HashMap<>();
        if (room != null) {
            roomMap.put("id", room.getId());
            roomMap.put("roomNumber", room.getRoomNumber());
            roomMap.put("floor", room.getFloor());
            roomMap.put("monthlyRent", room.getMonthlyRent());
            roomMap.put("electricityRate", room.getElectricityRate());
            roomMap.put("subMeterCode", subMeterId);
        }
        draft.put("room", roomMap);

        return draft;
    }

    /**
     * Generates and persists a production Bill in the MySQL database.
     */
    @Transactional
    public Map<String, Object> generateBill(BillCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bill generation payload is required");
        }

        Property property = getCurrentProperty();

        // 1. Resolve Tenant
        Tenant tenant = null;
        if (request.getTenantId() != null && !request.getTenantId().trim().isEmpty()) {
            try {
                Long tid = Long.parseLong(request.getTenantId().trim());
                tenant = tenantRepository.findById(tid).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (tenant == null && request.getTenantCode() != null && !request.getTenantCode().trim().isEmpty()) {
            tenant = tenantRepository.findByTenantCode(request.getTenantCode()).orElse(null);
        }
        if (tenant == null) {
            List<Tenant> tenants = tenantRepository.findByPropertyOrRoomProperty(property);
            if (!tenants.isEmpty()) {
                tenant = tenants.get(0);
            }
        }
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid tenant found to generate bill");
        }

        // Verify tenant belongs to owner's property
        boolean isOwnerTenant = false;
        if (tenant.getProperty() != null && tenant.getProperty().getId().equals(property.getId())) {
            isOwnerTenant = true;
        } else if (tenant.getRoom() != null && tenant.getRoom().getProperty() != null && tenant.getRoom().getProperty().getId().equals(property.getId())) {
            isOwnerTenant = true;
        }
        if (!isOwnerTenant) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Tenant does not belong to your property");
        }

        // 2. Resolve Room
        Room room = tenant.getRoom();
        if (room == null && request.getRoomNumber() != null) {
            room = roomRepository.findByPropertyAndRoomNumber(property, request.getRoomNumber()).orElse(null);
        }
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No assigned room found for tenant " + tenant.getFullName());
        }

        // 3. Validate Current Meter Reading
        if (request.getPowerReadingCurr() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current meter reading is required to generate the bill.");
        }
        Double currReading = request.getPowerReadingCurr();

        // 4. Retrieve Previous Reading
        Double prevReading = 0.0;
        List<Bill> roomBills = billRepository.findByRoomIdOrderByIdDesc(room.getId());
        if (!roomBills.isEmpty()) {
            for (Bill b : roomBills) {
                if (b.getPowerReadingCurr() != null) {
                    prevReading = b.getPowerReadingCurr();
                    break;
                }
            }
        } else if (room.getSubMeter() != null && room.getSubMeter().getCurrentReading() != null) {
            prevReading = room.getSubMeter().getCurrentReading();
        } else if (request.getPowerReadingPrev() != null) {
            prevReading = request.getPowerReadingPrev();
        }

        // Validate current >= previous
        if (currReading < prevReading) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Current meter reading (" + currReading + ") cannot be lower than the previous reading (" + prevReading + ").");
        }

        // Validate Pre-billing Window schedule
        List<Bill> allBills = billRepository.findByPropertyOrderByIdDesc(property);
        List<Bill> productionBills = allBills.stream()
                .filter(b -> b.getInvoiceNumber() == null || !b.getInvoiceNumber().startsWith("HIST-"))
                .collect(Collectors.toList());
        TenantBillingSchedule schedule = calculateSchedule(tenant, productionBills, LocalDate.now());
        boolean bypassScheduleLockForTesting = false;
        if (!bypassScheduleLockForTesting && schedule != null && !schedule.canGenerate) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pre-billing window for " + tenant.getFullName() + " is not open yet. Next bill date is " +
                            schedule.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)) +
                            " (window opens on " + schedule.windowOpenDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)) + ", " +
                            schedule.countdownText + ").");
        }

        String billingMonth = request.getBillingMonth() != null ? request.getBillingMonth().toUpperCase().trim() : (schedule != null ? schedule.cycleMonth : "OCTOBER");
        String billingPeriod = request.getBillingPeriod() != null ? request.getBillingPeriod().trim() : (schedule != null ? schedule.billingPeriod : "01 Oct – 31 Oct 2026");

        // Prevent accidental duplicate bill for the same tenant and billing month
        Optional<Bill> existingProdBill = billRepository.findProductionBillByTenantAndMonth(tenant.getId(), billingMonth);
        if (existingProdBill.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A bill for " + tenant.getFullName() + " for " + billingMonth + " has already been generated (" + existingProdBill.get().getInvoiceNumber() + ").");
        }

        // 5. Backend Calculations as Source of Truth
        Double unitsConsumed = Math.max(0.0, currReading - prevReading);
        Double electricityRate = (room.getElectricityRate() != null && room.getElectricityRate() > 0) ? room.getElectricityRate() : 9.0;
        Double electricityAmount = (double) Math.round(unitsConsumed * electricityRate);
        Double baseRent = (room.getMonthlyRent() != null && room.getMonthlyRent() > 0) ? room.getMonthlyRent() : 5000.0;
        Double totalBill = baseRent + electricityAmount;

        // Carry-forward Due / Advance
        Double pastDue = 0.0;
        Double pastAdvance = 0.0;
        if (!roomBills.isEmpty()) {
            Bill latestBill = roomBills.get(0);
            if (latestBill.getClosingDue() != null && latestBill.getClosingDue() > 0) {
                pastDue = latestBill.getClosingDue();
            } else if (latestBill.getClosingAdvance() != null && latestBill.getClosingAdvance() > 0) {
                pastAdvance = latestBill.getClosingAdvance();
            } else if (latestBill.getBalance() != null) {
                if (latestBill.getBalance() < 0) {
                    pastDue = Math.abs(latestBill.getBalance());
                } else if (latestBill.getBalance() > 0) {
                    pastAdvance = latestBill.getBalance();
                }
            }
        } else if (tenant.getOpeningBalance() != null) {
            if (tenant.getOpeningBalance() < 0) {
                pastDue = Math.abs(tenant.getOpeningBalance());
            } else if (tenant.getOpeningBalance() > 0) {
                pastAdvance = tenant.getOpeningBalance();
            }
        }

        Double amountPayable = Math.max(0.0, totalBill + pastDue - pastAdvance);

        // 6. Generate unique invoice number
        String invNumber = "#INV-" + LocalDate.now().getYear() + "-" + String.format("%05d", (System.currentTimeMillis() % 100000));

        String dueDate = request.getDueDate() != null ? request.getDueDate().trim() : "05 Nov 2026";
        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy • hh:mm a"));

        Double netPast = pastDue > 0 ? pastDue : (pastAdvance > 0 ? -pastAdvance : 0.0);

        Bill bill = new Bill(
                invNumber,
                billingPeriod,
                billingMonth,
                "DUE TODAY",
                dueDate,
                baseRent,
                prevReading,
                currReading,
                unitsConsumed,
                electricityRate,
                electricityAmount,
                netPast,
                totalBill,
                generatedAt,
                tenant,
                room
        );
        bill.setAmountPayable(amountPayable);
        bill.setClosingDue(amountPayable);
        bill.setClosingAdvance(0.0);
        bill.setBalance(-amountPayable);
        billRepository.save(bill);

        // 7. Update SubMeter
        SubMeter sm = room.getSubMeter();
        if (sm == null) {
            sm = subMeterRepository.findByRoomId(room.getId()).orElse(null);
        }
        if (sm == null) {
            String mCode = "#E-P" + property.getId() + "-R" + room.getRoomNumber();
            sm = new SubMeter();
            sm.setMeterCode(mCode);
            sm.setRoom(room);
        }
        sm.setCurrentReading(currReading);
        sm.setUnitsConsumed(unitsConsumed);
        sm.setReadingLogged(true);
        subMeterRepository.save(sm);
        room.setSubMeter(sm);
        roomRepository.save(room);

        return getInvoice(invNumber);
    }

    /**
     * Retrieves invoice details strictly scoped to the owner's property.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getInvoice(String invoiceNumber) {
        Property property = getCurrentProperty();

        Bill bill = null;
        if (invoiceNumber != null && !invoiceNumber.trim().isEmpty() &&
                !"undefined".equalsIgnoreCase(invoiceNumber.trim()) &&
                !"null".equalsIgnoreCase(invoiceNumber.trim()) &&
                !"latest".equalsIgnoreCase(invoiceNumber.trim())) {
            bill = billRepository.findByInvoiceNumber(invoiceNumber.trim())
                    .orElseGet(() -> {
                        try {
                            Long bid = Long.parseLong(invoiceNumber.trim());
                            return billRepository.findById(bid).orElse(null);
                        } catch (NumberFormatException e) {
                            return null;
                        }
                    });
        }

        if (bill == null) {
            // Fallback to latest production bill for the owner's property
            List<Bill> allBills = billRepository.findByPropertyOrderByIdDesc(property);
            bill = allBills.stream()
                    .filter(b -> b.getInvoiceNumber() == null || !b.getInvoiceNumber().startsWith("HIST-"))
                    .findFirst()
                    .orElse(null);
        }

        if (bill == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found: " + invoiceNumber);
        }

        // Verify owner ownership
        if (bill.getRoom() == null || bill.getRoom().getProperty() == null ||
                !bill.getRoom().getProperty().getId().equals(property.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to invoice");
        }

        Tenant tenant = bill.getTenant();
        Room room = bill.getRoom();
        User owner = property.getUser();

        // Check if any subsequent bill for this room has been paid, which settled any remaining dues on this bill
        boolean settledBySubsequent = false;
        String settledInInvoice = null;
        if (room != null) {
            List<Bill> roomBills = billRepository.findByRoomIdOrderByIdDesc(room.getId());
            for (Bill other : roomBills) {
                if (other.getId() > bill.getId() && ("PAID".equalsIgnoreCase(other.getStatus()) || "SETTLED".equalsIgnoreCase(other.getStatus()))) {
                    settledBySubsequent = true;
                    settledInInvoice = other.getInvoiceNumber();
                    break;
                }
            }
        }

        if (settledBySubsequent && (bill.getClosingDue() != null && bill.getClosingDue() > 0 || !"PAID".equalsIgnoreCase(bill.getStatus()))) {
            bill.setStatus("PAID");
            bill.setClosingDue(0.0);
            bill.setBalance(0.0);
            try {
                billRepository.save(bill);
            } catch (Exception ignored) {}
        }

        Map<String, Object> inv = new HashMap<>();
        inv.put("id", bill.getId());
        inv.put("invoiceNumber", bill.getInvoiceNumber());
        inv.put("status", bill.getStatus());
        inv.put("generatedAt", bill.getGeneratedAt() != null ? bill.getGeneratedAt() : "28 Oct 2026 • 04:30 PM");
        inv.put("billingPeriod", bill.getBillingPeriod());
        inv.put("billingMonth", bill.getBillingMonth());
        inv.put("dueDate", bill.getDueDate());
        inv.put("propertyName", property.getPropertyName());
        inv.put("propertyAddress", property.getAddress());
        inv.put("ownerName", property.getOwnerName() != null ? property.getOwnerName() : (owner != null ? owner.getFullName() : "Property Owner"));
        inv.put("ownerPhone", property.getOwnerPhone() != null ? property.getOwnerPhone() : (owner != null ? owner.getMobile() : ""));
        inv.put("landlordVpa", property.getLandlordVpa() != null ? property.getLandlordVpa() : "shreeresidency@okhdfcbank");

        Map<String, Object> tenantMap = new HashMap<>();
        if (tenant != null) {
            tenantMap.put("id", tenant.getId());
            tenantMap.put("fullName", tenant.getFullName());
            tenantMap.put("initials", tenant.getInitials() != null ? tenant.getInitials() : "TN");
            tenantMap.put("mobile", tenant.getMobile());
            tenantMap.put("unitNumber", room != null ? room.getRoomNumber() : "");
            tenantMap.put("floor", room != null ? room.getFloor() : "Ground Fl");
            tenantMap.put("property", property.getPropertyName());
        }
        inv.put("tenant", tenantMap);

        inv.put("baseRent", bill.getBaseRent() != null ? bill.getBaseRent() : 0.0);
        inv.put("powerReadingPrev", bill.getPowerReadingPrev() != null ? bill.getPowerReadingPrev() : 0.0);
        inv.put("powerReadingCurr", bill.getPowerReadingCurr() != null ? bill.getPowerReadingCurr() : 0.0);
        inv.put("powerUnits", bill.getPowerUnits() != null ? bill.getPowerUnits() : 0.0);
        inv.put("powerRate", bill.getPowerRate() != null ? bill.getPowerRate() : 0.0);
        inv.put("powerAmount", bill.getPowerAmount() != null ? bill.getPowerAmount() : 0.0);
        Double pastArrears = bill.getPastArrears() != null ? bill.getPastArrears() : 0.0;
        if (pastArrears == 0.0 && bill.getAmountPayable() != null && bill.getTotalPayable() != null) {
            double diff = bill.getAmountPayable() - bill.getTotalPayable();
            if (diff != 0.0) {
                pastArrears = diff;
            }
        }
        inv.put("pastArrears", pastArrears);
        inv.put("totalBill", bill.getTotalPayable() != null ? bill.getTotalPayable() : 0.0);
        inv.put("amountPayable", bill.getAmountPayable() != null ? bill.getAmountPayable() : bill.getTotalPayable());
        inv.put("totalPayable", bill.getAmountPayable() != null ? bill.getAmountPayable() : bill.getTotalPayable());
        inv.put("amountReceived", bill.getAmountReceived());
        inv.put("paymentDate", bill.getPaymentDate());
        inv.put("closingDue", bill.getClosingDue() != null ? bill.getClosingDue() : 0.0);
        inv.put("closingAdvance", bill.getClosingAdvance() != null ? bill.getClosingAdvance() : 0.0);
        inv.put("balance", bill.getBalance());

        List<Payment> billPayments = paymentRepository.findByBillId(bill.getId());
        Payment latestPay = !billPayments.isEmpty() ? billPayments.get(0) : null;
        if (latestPay != null) {
            inv.put("receiptNumber", latestPay.getReceiptNumber());
            inv.put("paymentMethod", latestPay.getPaymentMethod());
            inv.put("transactionRef", latestPay.getTransactionRef());
            inv.put("settledPercentage", latestPay.getSettledPercentage());
        } else {
            inv.put("receiptNumber", null);
            inv.put("paymentMethod", null);
            inv.put("transactionRef", null);
            inv.put("settledPercentage", null);
        }

        String subMeterCode = (room != null && room.getSubMeter() != null) ? room.getSubMeter().getMeterCode() : ("#E-" + (room != null ? room.getRoomNumber() : ""));
        inv.put("subMeterCode", subMeterCode);
        inv.put("settledBySubsequent", settledBySubsequent);
        inv.put("settledInInvoice", settledInInvoice);

        return inv;
    }

    /**
     * Computes real production Bills Dashboard statistics and lists strictly from MySQL records.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getBillsDashboard() {
        Property property = getCurrentProperty();
        List<Room> rooms = roomRepository.findByProperty(property);
        List<Tenant> tenants = tenantRepository.findByPropertyOrRoomProperty(property);
        List<Bill> allBills = billRepository.findByPropertyOrderByIdDesc(property);
        List<Payment> recentPayments = paymentRepository.findByPropertyOrderByIdDesc(property);

        // Separate historical reconciliation records from production bills
        List<Bill> productionBills = allBills.stream()
                .filter(b -> b.getInvoiceNumber() == null || !b.getInvoiceNumber().startsWith("HIST-"))
                .collect(Collectors.toList());

        // Target Rent calculation (sum of monthlyRent for occupied units)
        double targetRent = rooms.stream()
                .filter(r -> "OCCUPIED".equalsIgnoreCase(r.getStatus()) && r.getMonthlyRent() != null)
                .mapToDouble(Room::getMonthlyRent)
                .sum();

        // Financial calculations from actual production bills
        double totalBilled = productionBills.stream()
                .mapToDouble(b -> b.getAmountPayable() != null ? b.getAmountPayable() : (b.getTotalPayable() != null ? b.getTotalPayable() : 0.0))
                .sum();

        double totalCollected = productionBills.stream()
                .filter(b -> b.getAmountReceived() != null)
                .mapToDouble(Bill::getAmountReceived)
                .sum();

        double totalOutstanding = productionBills.stream()
                .filter(b -> b.getClosingDue() != null && b.getClosingDue() > 0)
                .mapToDouble(Bill::getClosingDue)
                .sum();

        int totalTenants = tenants.size();
        int generatedCount = productionBills.size();
        int paidCount = (int) productionBills.stream()
                .filter(b -> "PAID".equalsIgnoreCase(b.getStatus()) || "SETTLED".equalsIgnoreCase(b.getStatus()) || "ADVANCE".equalsIgnoreCase(b.getStatus()))
                .count();
        int pendingCount = (int) productionBills.stream()
                .filter(b -> !"PAID".equalsIgnoreCase(b.getStatus()) && !"SETTLED".equalsIgnoreCase(b.getStatus()) && !"ADVANCE".equalsIgnoreCase(b.getStatus()))
                .count();

        double collectionRate = 0.0;
        if (totalBilled > 0) {
            collectionRate = Math.min(100.0, Math.round((totalCollected / totalBilled) * 1000.0) / 10.0);
        } else if (paidCount > 0 && pendingCount == 0) {
            collectionRate = 100.0;
        }

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("cycleMonth", "Oct 2026");
        dashboard.put("cycleLabel", "Cycle #10");
        dashboard.put("collectionRate", collectionRate);
        dashboard.put("statusTrack", collectionRate >= 70 ? "On Track" : (collectionRate > 0 ? "In Progress" : "Action Needed"));

        Map<String, Object> summaryCounts = new HashMap<>();
        summaryCounts.put("total", totalTenants);
        summaryCounts.put("generated", generatedCount);
        summaryCounts.put("pending", pendingCount);
        summaryCounts.put("paid", paidCount);
        dashboard.put("summaryCounts", summaryCounts);

        Map<String, Object> financials = new HashMap<>();
        financials.put("targetRent", Math.round(targetRent));
        financials.put("collected", Math.round(totalCollected));
        financials.put("outstanding", Math.round(totalOutstanding));
        dashboard.put("financials", financials);

        // 1. Attention Bill (Pending production bill requiring payment/action)
        Bill attentionBillObj = productionBills.stream()
                .filter(b -> !"PAID".equalsIgnoreCase(b.getStatus()) && !"SETTLED".equalsIgnoreCase(b.getStatus()) && !"ADVANCE".equalsIgnoreCase(b.getStatus()))
                .findFirst()
                .orElse(null);

        if (attentionBillObj != null) {
            Map<String, Object> att = new HashMap<>();
            Tenant t = attentionBillObj.getTenant();
            Room r = attentionBillObj.getRoom();
            att.put("id", attentionBillObj.getId());
            att.put("invoiceNumber", attentionBillObj.getInvoiceNumber());
            att.put("tenantName", t != null ? t.getFullName() : "Tenant");
            att.put("initials", t != null && t.getInitials() != null && !t.getInitials().isEmpty()
                    ? t.getInitials()
                    : (t != null && t.getFullName() != null && !t.getFullName().trim().isEmpty()
                    ? t.getFullName().trim().substring(0, Math.min(2, t.getFullName().trim().length())).toUpperCase()
                    : "TN"));
            att.put("unit", "Unit " + (r != null ? r.getRoomNumber() : "") + " • " + (r != null ? r.getFloor() : ""));
            att.put("roomNumber", r != null ? r.getRoomNumber() : "");
            att.put("floor", r != null ? r.getFloor() : "");
            att.put("dueBadge", attentionBillObj.getStatus() != null ? attentionBillObj.getStatus() : "Due Today");
            att.put("status", attentionBillObj.getStatus());
            att.put("baseRent", attentionBillObj.getBaseRent());
            att.put("powerUnits", attentionBillObj.getPowerUnits());
            att.put("powerRate", attentionBillObj.getPowerRate());
            att.put("powerAmount", attentionBillObj.getPowerAmount());
            att.put("meterVerified", true);

            Double attTotalInvoiced = attentionBillObj.getTotalPayable() != null ? attentionBillObj.getTotalPayable() : 0.0;
            Double attAmountReceived = attentionBillObj.getAmountReceived() != null ? attentionBillObj.getAmountReceived() : 0.0;
            Double attAmountPayable = attentionBillObj.getAmountPayable() != null ? attentionBillObj.getAmountPayable() : attTotalInvoiced;
            Double attOutstanding = attentionBillObj.getClosingDue() != null && attentionBillObj.getClosingDue() > 0
                    ? attentionBillObj.getClosingDue()
                    : Math.max(0.0, attAmountPayable - attAmountReceived);

            att.put("totalInvoiced", attTotalInvoiced);
            att.put("amountReceived", attAmountReceived);
            att.put("amountPayable", attAmountPayable);
            att.put("outstandingAmount", attOutstanding);
            att.put("totalPayable", attOutstanding > 0 ? attOutstanding : attAmountPayable);
            att.put("billingPeriod", attentionBillObj.getBillingPeriod());
            att.put("billingMonth", attentionBillObj.getBillingMonth());
            att.put("mobile", t != null ? t.getMobile() : "");
            att.put("dueDate", attentionBillObj.getDueDate());
            dashboard.put("attentionBill", att);
        } else {
            dashboard.put("attentionBill", null);
        }

        // 2. Dynamic Billing Schedules for all tenants
        List<TenantBillingSchedule> schedules = new ArrayList<>();
        for (Tenant t : tenants) {
            TenantBillingSchedule s = calculateSchedule(t, productionBills, LocalDate.now());
            if (s != null) {
                schedules.add(s);
            }
        }

        // Meter Reading Required: ONLY tenants whose pre-billing window is open or overdue (daysRemaining <= 5)
        List<TenantBillingSchedule> openWindowSchedules = schedules.stream()
                .filter(s -> s.canGenerate)
                .sorted(Comparator.comparingLong(s -> s.daysRemaining))
                .collect(Collectors.toList());

        if (!openWindowSchedules.isEmpty()) {
            TenantBillingSchedule urgent = openWindowSchedules.get(0);
            Tenant targetTenant = tenants.stream()
                    .filter(t -> t.getId().equals(urgent.tenantId))
                    .findFirst()
                    .orElse(null);
            Room targetRoom = targetTenant != null ? targetTenant.getRoom() : null;
            Double lastReading = 0.0;
            if (targetRoom != null) {
                List<Bill> targetBills = billRepository.findByRoomIdOrderByIdDesc(targetRoom.getId());
                if (!targetBills.isEmpty() && targetBills.get(0).getPowerReadingCurr() != null) {
                    lastReading = targetBills.get(0).getPowerReadingCurr();
                } else if (targetRoom.getSubMeter() != null && targetRoom.getSubMeter().getCurrentReading() != null) {
                    lastReading = targetRoom.getSubMeter().getCurrentReading();
                }
            }

            Map<String, Object> meterReq = new HashMap<>();
            meterReq.put("tenantId", urgent.tenantId);
            meterReq.put("tenantName", urgent.tenantName);
            meterReq.put("initials", urgent.initials);
            meterReq.put("unit", urgent.unit);
            meterReq.put("statusBadge", urgent.isOverdue ? "Reading Overdue" : "Reading Pending");
            meterReq.put("warningText", "Submeter reading required to finalize bill. Last recorded: " + Math.round(lastReading) + " kWh.");
            meterReq.put("lastRecorded", Math.round(lastReading) + " kWh");
            meterReq.put("isActionRequired", true);
            meterReq.put("canGenerate", true);
            meterReq.put("dueDate", urgent.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
            dashboard.put("meterRequiredBill", meterReq);
        } else {
            dashboard.put("meterRequiredBill", null);
        }

        // 3. Upcoming Bill Preview: Prioritize future scheduled cycles (> 5 days away)
        TenantBillingSchedule upSched = schedules.stream()
                .filter(s -> s.daysRemaining > 5)
                .min(Comparator.comparingLong(s -> s.daysRemaining))
                .orElse(null);

        if (upSched == null && !schedules.isEmpty()) {
            // Fallback to earliest scheduled cycle
            upSched = schedules.stream()
                    .min(Comparator.comparing(s -> s.nextBillDate))
                    .orElse(null);
        }

        if (upSched != null) {
            Map<String, Object> upc = new HashMap<>();
            upc.put("tenantId", upSched.tenantId);
            upc.put("tenantName", upSched.tenantName);
            upc.put("initials", upSched.initials);
            upc.put("unit", upSched.unit);
            upc.put("dueBadge", upSched.statusBadge);
            upc.put("statusBadge", upSched.statusBadge);
            upc.put("scheduleNote", "Monthly Recurring Rent");
            upc.put("nextBillDate", upSched.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
            upc.put("nextBillDateIso", upSched.nextBillDate.toString());
            upc.put("daysRemaining", upSched.daysRemaining);
            upc.put("countdownText", upSched.countdownText);
            upc.put("canGenerate", upSched.canGenerate);
            upc.put("isWindowOpen", upSched.isWindowOpen);
            upc.put("windowOpenDate", upSched.windowOpenDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
            upc.put("billingPeriod", upSched.billingPeriod);
            upc.put("cycleMonth", upSched.cycleMonth);
            upc.put("cycleMonthLabel", upSched.cycleMonthLabel);
            upc.put("autoGenDate", "Next Bill: " + upSched.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)) + " • " + upSched.countdownText);
            upc.put("amount", upSched.monthlyRent);
            upc.put("mobile", upSched.mobile);
            dashboard.put("upcomingBill", upc);
        } else {
            dashboard.put("upcomingBill", null);
        }

        // 3. Paid & Settled Bills List
        List<Map<String, Object>> paidBillsList = new ArrayList<>();
        List<Bill> settledBills = productionBills.stream()
                .filter(b -> "PAID".equalsIgnoreCase(b.getStatus()) || "SETTLED".equalsIgnoreCase(b.getStatus()) || "ADVANCE".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());

        for (Bill b : settledBills) {
            Tenant t = b.getTenant();
            Room r = b.getRoom();
            List<Payment> bPayments = paymentRepository.findByBillId(b.getId());
            Payment latestPayment = !bPayments.isEmpty() ? bPayments.get(0) : null;
            String recNumber = latestPayment != null ? latestPayment.getReceiptNumber() : null;

            Map<String, Object> pb = new HashMap<>();
            pb.put("id", b.getId());
            pb.put("invoiceNumber", b.getInvoiceNumber());
            pb.put("invoiceRef", b.getInvoiceNumber());
            pb.put("receiptNumber", recNumber);
            pb.put("hasPaymentReceipt", recNumber != null);
            pb.put("paymentMethod", latestPayment != null ? latestPayment.getPaymentMethod() : "Verified Payment");
            pb.put("transactionRef", latestPayment != null ? latestPayment.getTransactionRef() : null);
            pb.put("tenantName", t != null ? t.getFullName() : "Tenant");
            pb.put("initials", t != null && t.getInitials() != null && !t.getInitials().isEmpty()
                    ? t.getInitials()
                    : (t != null && t.getFullName() != null && !t.getFullName().trim().isEmpty()
                    ? t.getFullName().trim().substring(0, Math.min(2, t.getFullName().trim().length())).toUpperCase()
                    : "TN"));
            pb.put("unit", "Unit " + (r != null ? r.getRoomNumber() : "") + " • " + (r != null ? r.getFloor() : ""));
            pb.put("roomNumber", r != null ? r.getRoomNumber() : "");
            pb.put("floor", r != null ? r.getFloor() : "");
            pb.put("statusBadge", b.getStatus());
            pb.put("status", b.getStatus());
            pb.put("txnDetails", (b.getPaymentDate() != null ? b.getPaymentDate() : "Settled") + " • Verified");
            pb.put("description", "Rent + Electricity (" + Math.round(b.getPowerUnits() != null ? b.getPowerUnits() : 0) + " units)");
            pb.put("billingPeriod", b.getBillingPeriod());
            pb.put("billingMonth", b.getBillingMonth());
            pb.put("totalPayable", b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable());
            pb.put("amountPayable", b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable());
            pb.put("totalInvoiced", b.getTotalPayable() != null ? b.getTotalPayable() : 0.0);
            pb.put("amountReceived", b.getAmountReceived());
            pb.put("amount", b.getAmountReceived() != null ? b.getAmountReceived() : (b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable()));
            paidBillsList.add(pb);
        }
        dashboard.put("paidBills", paidBillsList);

        // 4. Actionable Bills (all production bills needing payment)
        List<Map<String, Object>> actionableBills = new ArrayList<>();
        List<Bill> pendingProductionBills = productionBills.stream()
                .filter(b -> !"PAID".equalsIgnoreCase(b.getStatus()) && !"SETTLED".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());

        for (Bill b : pendingProductionBills) {
            Tenant t = b.getTenant();
            Room r = b.getRoom();
            Map<String, Object> ab = new HashMap<>();
            ab.put("id", b.getId());
            ab.put("invoiceNumber", b.getInvoiceNumber());
            ab.put("tenantName", t != null ? t.getFullName() : "Tenant");
            ab.put("initials", t != null && t.getInitials() != null && !t.getInitials().isEmpty()
                    ? t.getInitials()
                    : (t != null && t.getFullName() != null && !t.getFullName().trim().isEmpty()
                    ? t.getFullName().trim().substring(0, Math.min(2, t.getFullName().trim().length())).toUpperCase()
                    : "TN"));
            ab.put("unit", "Unit " + (r != null ? r.getRoomNumber() : ""));
            ab.put("roomNumber", r != null ? r.getRoomNumber() : "");
            ab.put("floor", r != null ? r.getFloor() : "");

            Double totalInvoiced = b.getTotalPayable() != null ? b.getTotalPayable() : 0.0;
            Double amountReceived = b.getAmountReceived() != null ? b.getAmountReceived() : 0.0;
            Double amountPayable = b.getAmountPayable() != null ? b.getAmountPayable() : totalInvoiced;
            Double outstandingAmount = b.getClosingDue() != null && b.getClosingDue() > 0
                    ? b.getClosingDue()
                    : Math.max(0.0, amountPayable - amountReceived);

            ab.put("totalInvoiced", totalInvoiced);
            ab.put("amountReceived", amountReceived);
            ab.put("amountPayable", amountPayable);
            ab.put("outstandingAmount", outstandingAmount);
            ab.put("totalPayable", outstandingAmount > 0 ? outstandingAmount : amountPayable);
            ab.put("amount", outstandingAmount > 0 ? outstandingAmount : amountPayable);

            ab.put("dueDate", b.getDueDate());
            ab.put("billingPeriod", b.getBillingPeriod());
            ab.put("billingMonth", b.getBillingMonth());
            ab.put("status", b.getStatus());
            ab.put("dueBadge", b.getStatus() != null ? b.getStatus() : "PAYMENT DUE");
            ab.put("baseRent", b.getBaseRent());
            ab.put("powerAmount", b.getPowerAmount());
            ab.put("breakdown", "Rent ₹" + (b.getBaseRent() != null ? b.getBaseRent().intValue() : 0) + " + Elec ₹" + (b.getPowerAmount() != null ? b.getPowerAmount().intValue() : 0));
            ab.put("actionType", "RECORD");
            actionableBills.add(ab);
        }
        dashboard.put("actionableBills", actionableBills);

        // 5. Recent Receipts
        List<Map<String, Object>> receiptList = new ArrayList<>();
        for (Payment p : recentPayments) {
            Map<String, Object> rm = new HashMap<>();
            rm.put("receiptNumber", p.getReceiptNumber());
            rm.put("tenantName", p.getTenant() != null ? p.getTenant().getFullName() : "Tenant");
            rm.put("roomNumber", p.getBill() != null && p.getBill().getRoom() != null ? p.getBill().getRoom().getRoomNumber() : "");
            rm.put("amount", p.getAmountReceived());
            rm.put("paymentDate", p.getPaymentDate());
            rm.put("paymentMethod", p.getPaymentMethod());
            rm.put("status", p.getStatus());
            receiptList.add(rm);
        }
        dashboard.put("recentReceipts", receiptList);

        // 6. Build Room-wise Monthly Billing Timelines (Vertical Rooms, Horizontal Months)
        List<Map<String, Object>> roomTimelines = new ArrayList<>();

        for (Room r : rooms) {
            Map<String, Object> rMap = new HashMap<>();
            rMap.put("roomId", r.getId());
            rMap.put("roomNumber", r.getRoomNumber());
            rMap.put("floor", r.getFloor() != null ? r.getFloor() : "Ground");
            rMap.put("status", r.getStatus() != null ? r.getStatus() : "VACANT");
            rMap.put("monthlyRent", r.getMonthlyRent() != null ? r.getMonthlyRent() : 0.0);
            rMap.put("electricityRate", r.getElectricityRate() != null ? r.getElectricityRate() : 0.0);

            Tenant rTenant = r.getTenant();
            if (rTenant == null && "OCCUPIED".equalsIgnoreCase(r.getStatus())) {
                rTenant = tenantRepository.findByRoom(r).orElse(null);
            }

            if (rTenant != null) {
                Map<String, Object> tm = new HashMap<>();
                tm.put("id", rTenant.getId());
                tm.put("tenantId", rTenant.getId());
                tm.put("fullName", rTenant.getFullName());
                tm.put("initials", rTenant.getInitials() != null && !rTenant.getInitials().isEmpty()
                        ? rTenant.getInitials()
                        : (rTenant.getFullName() != null && !rTenant.getFullName().trim().isEmpty()
                        ? rTenant.getFullName().trim().substring(0, Math.min(2, rTenant.getFullName().trim().length())).toUpperCase()
                        : "TN"));
                tm.put("mobile", rTenant.getMobile());
                tm.put("joinedDate", rTenant.getJoinedDate());
                rMap.put("tenant", tm);
                rMap.put("tenantName", rTenant.getFullName());
                rMap.put("tenantInitials", tm.get("initials"));
            } else {
                rMap.put("tenant", null);
                rMap.put("tenantName", null);
                rMap.put("tenantInitials", null);
            }

            // Find all real bills for this room or tenant
            final Tenant finalRTenant = rTenant;
            List<Bill> rBills = allBills.stream()
                    .filter(b -> (b.getRoom() != null && b.getRoom().getId().equals(r.getId())) ||
                            (finalRTenant != null && b.getTenant() != null && b.getTenant().getId().equals(finalRTenant.getId())))
                    .sorted(Comparator.comparing(Bill::getId))
                    .collect(Collectors.toList());

            TenantBillingSchedule rSched = (rTenant != null) ? calculateSchedule(rTenant, productionBills, LocalDate.now()) : null;

            // Exclude trailing unbilled historical notes (if any) from active bill cards without deleting anything
            List<Bill> validRBills = new ArrayList<>();
            if (rBills != null) {
                for (int i = 0; i < rBills.size(); i++) {
                    Bill b = rBills.get(i);
                    boolean isTrailing = (i == rBills.size() - 1);
                    boolean hasNoPayment = (b.getAmountReceived() == null || b.getAmountReceived() == 0.0) &&
                            (b.getPaymentDate() == null || b.getPaymentDate().isEmpty() || "Historical Record".equalsIgnoreCase(b.getPaymentDate()) || "Not recorded".equalsIgnoreCase(b.getPaymentDate()));
                    if (isTrailing && b.getInvoiceNumber() != null && b.getInvoiceNumber().startsWith("HIST-") && hasNoPayment) {
                        continue;
                    }
                    validRBills.add(b);
                }
            }

            List<Map<String, Object>> cards = new ArrayList<>();

            if (rTenant == null) {
                // 1. Vacant Room
                Map<String, Object> card = new HashMap<>();
                card.put("id", "vacant_" + r.getRoomNumber());
                card.put("cardState", "VACANT");
                card.put("statusBadge", "Vacant");
                card.put("status", "VACANT");
                card.put("monthLabel", "Vacant Unit");
                card.put("monthShort", "VAC");
                card.put("billingPeriod", "Ready for Onboarding");
                card.put("amount", r.getMonthlyRent());
                card.put("actionText", "+ Onboard Tenant");
                card.put("actionType", "ONBOARD");
                card.put("roomNumber", r.getRoomNumber());
                card.put("floor", r.getFloor() != null ? r.getFloor() : "Ground");
                cards.add(card);
            } else {
                // 2. Occupied Room:
                // A) Add actual persisted bills for this room/tenant (sorted chronologically)
                for (Bill b : validRBills) {
                    Map<String, Object> card = new HashMap<>();
                    card.put("id", "bill_" + b.getId());
                    card.put("billId", b.getId());
                    card.put("invoiceNumber", b.getInvoiceNumber());
                    String bMonthStr = b.getBillingMonth() != null ? b.getBillingMonth() : "OCTOBER";
                    card.put("monthLabel", bMonthStr.substring(0, 1).toUpperCase() + bMonthStr.substring(1).toLowerCase() + " 2026");
                    card.put("monthShort", bMonthStr.length() >= 3 ? bMonthStr.substring(0, 3).toUpperCase() : bMonthStr);
                    card.put("billingMonth", bMonthStr);
                    card.put("billingPeriod", b.getBillingPeriod() != null ? b.getBillingPeriod() : "Monthly Cycle");
                    card.put("baseRent", b.getBaseRent());
                    card.put("powerUnits", b.getPowerUnits() != null ? b.getPowerUnits() : 0.0);
                    card.put("powerAmount", b.getPowerAmount() != null ? b.getPowerAmount() : 0.0);
                    card.put("roomNumber", r.getRoomNumber());
                    card.put("floor", r.getFloor() != null ? r.getFloor() : "Ground");
                    card.put("tenantName", rTenant.getFullName());
                    card.put("tenantInitials", rTenant.getInitials() != null && !rTenant.getInitials().isEmpty()
                            ? rTenant.getInitials()
                            : (rTenant.getFullName() != null && !rTenant.getFullName().trim().isEmpty()
                            ? rTenant.getFullName().trim().substring(0, Math.min(2, rTenant.getFullName().trim().length())).toUpperCase()
                            : "TN"));

                    List<Payment> bPays = paymentRepository.findByBillId(b.getId());
                    Payment bPay = !bPays.isEmpty() ? bPays.get(0) : null;
                    String recNumber = bPay != null ? bPay.getReceiptNumber() : null;
                    card.put("receiptNumber", recNumber);
                    card.put("paymentMethod", bPay != null ? bPay.getPaymentMethod() : "Verified Payment");
                    card.put("paymentDate", b.getPaymentDate() != null ? b.getPaymentDate() : "09 Oct 2026");
                    card.put("txnDetails", (b.getPaymentDate() != null ? b.getPaymentDate() : "09 Oct 2026") + " • Verified");

                    // Check if a subsequent bill for this room has already been PAID or SETTLED
                    boolean settledBySubsequent = rBills.stream()
                            .anyMatch(other -> other.getId() > b.getId() && ("PAID".equalsIgnoreCase(other.getStatus()) || "SETTLED".equalsIgnoreCase(other.getStatus())));

                    if (settledBySubsequent && (b.getClosingDue() != null && b.getClosingDue() > 0 || !"PAID".equalsIgnoreCase(b.getStatus()))) {
                        b.setStatus("PAID");
                        b.setClosingDue(0.0);
                        b.setBalance(0.0);
                        try {
                            billRepository.save(b);
                        } catch (Exception ignored) {}
                    }

                    String bStatus = b.getStatus() != null ? b.getStatus().toUpperCase() : "PENDING";
                    if ("PAID".equals(bStatus) || "SETTLED".equals(bStatus) || "ADVANCE".equals(bStatus)) {
                        card.put("cardState", "PAID");
                        card.put("statusBadge", "PAID");
                        card.put("status", "PAID");
                        Double amt = (b.getAmountReceived() != null && b.getAmountReceived() > 0)
                                ? b.getAmountReceived()
                                : (b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable());
                        card.put("amount", amt);
                        card.put("totalPayable", amt);
                        card.put("actionText", "View Receipt");
                        card.put("actionType", "RECEIPT");
                    } else {
                        card.put("cardState", "PENDING");
                        card.put("statusBadge", b.getStatus() != null ? b.getStatus() : "Payment Due");
                        card.put("status", b.getStatus() != null ? b.getStatus() : "PENDING");
                        Double outAmt = b.getClosingDue() != null && b.getClosingDue() > 0
                                ? b.getClosingDue()
                                : (b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable());
                        card.put("amount", outAmt);
                        card.put("outstandingAmount", outAmt);
                        card.put("totalPayable", outAmt);
                        card.put("dueDate", b.getDueDate() != null ? b.getDueDate() : "Due Today");
                        card.put("actionText", "Record Payment Received");
                        card.put("actionType", "PAYMENT");
                        card.put("secondaryActionText", "View Bill");
                        card.put("secondaryActionType", "VIEW_BILL");
                    }
                    cards.add(card);
                }

                // B) Current / Upcoming cycle from rSched (if cycle is not already covered by rBills)
                if (rSched != null) {
                    boolean alreadyBilled = cards.stream().anyMatch(c -> {
                        String mL = (String) c.get("monthLabel");
                        return mL != null && mL.toUpperCase().contains(rSched.cycleMonth.toUpperCase());
                    });

                    if (!alreadyBilled) {
                        Map<String, Object> schedCard = new HashMap<>();
                        schedCard.put("id", "sched_" + r.getRoomNumber() + "_" + rSched.cycleMonth.toLowerCase());
                        schedCard.put("monthLabel", rSched.cycleMonthLabel);
                        String scMonth = rSched.cycleMonth != null ? rSched.cycleMonth : "DECEMBER";
                        schedCard.put("monthShort", scMonth.length() >= 3 ? scMonth.substring(0, 3).toUpperCase() : scMonth);
                        schedCard.put("billingPeriod", rSched.billingPeriod);
                        schedCard.put("amount", rSched.monthlyRent);
                        schedCard.put("roomNumber", r.getRoomNumber());
                        schedCard.put("floor", r.getFloor() != null ? r.getFloor() : "Ground");
                        schedCard.put("tenantName", rTenant.getFullName());
                        schedCard.put("tenantInitials", rTenant.getInitials() != null && !rTenant.getInitials().isEmpty()
                                ? rTenant.getInitials()
                                : (rTenant.getFullName() != null && !rTenant.getFullName().trim().isEmpty()
                                ? rTenant.getFullName().trim().substring(0, Math.min(2, rTenant.getFullName().trim().length())).toUpperCase()
                                : "TN"));
                        schedCard.put("tenantId", rTenant.getId());

                        if (rSched.nextBillDate != null) {
                            String formattedDate = rSched.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH));
                            schedCard.put("dueDate", formattedDate);
                            schedCard.put("nextBillDate", formattedDate);
                        }

                        boolean needMeter = r.getElectricityRate() != null && r.getElectricityRate() > 0;

                        boolean bypassScheduleLockForTesting = false;
                        if (rSched.canGenerate || bypassScheduleLockForTesting) {
                            if (needMeter) {
                                schedCard.put("cardState", "READING_REQUIRED");
                                schedCard.put("statusBadge", rSched.isOverdue ? "Reading Overdue" : "Reading Required");
                                schedCard.put("status", "READING_REQUIRED");
                                Double lastReading = 0.0;
                                if (!rBills.isEmpty()) {
                                    for (int bi = rBills.size() - 1; bi >= 0; bi--) {
                                        if (rBills.get(bi).getPowerReadingCurr() != null) {
                                            lastReading = rBills.get(bi).getPowerReadingCurr();
                                            break;
                                        }
                                    }
                                } else if (r.getSubMeter() != null && r.getSubMeter().getCurrentReading() != null) {
                                    lastReading = r.getSubMeter().getCurrentReading();
                                }
                                schedCard.put("lastReading", Math.round(lastReading));
                                schedCard.put("warningText", "Submeter reading required to finalize bill. Last recorded: " + Math.round(lastReading) + " kWh.");
                                schedCard.put("actionText", "Enter Units & Generate Bill");
                                schedCard.put("actionType", "GENERATE_BILL");
                            } else {
                                schedCard.put("cardState", "OPEN_BILLING");
                                schedCard.put("statusBadge", rSched.isOverdue ? "Due Today" : "Ready to Bill");
                                schedCard.put("status", "READY_TO_BILL");
                                schedCard.put("actionText", "Generate Bill");
                                schedCard.put("actionType", "GENERATE_BILL");
                            }
                        } else {
                            schedCard.put("cardState", "LOCKED");
                            schedCard.put("statusBadge", "Upcoming");
                            schedCard.put("status", "LOCKED");
                            schedCard.put("nextBillDate", rSched.nextBillDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
                            schedCard.put("countdownText", rSched.countdownText);
                            schedCard.put("daysRemaining", rSched.daysRemaining);
                            schedCard.put("windowOpenDate", rSched.windowOpenDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)));
                            schedCard.put("lockNotice", "Billing window opens on " + rSched.windowOpenDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)) + " (5 days before due date).");
                            schedCard.put("actionText", "Generate Bill Now (Locked • " + rSched.countdownText + ")");
                            schedCard.put("actionType", "LOCKED");
                        }
                        cards.add(schedCard);
                    }
                }
            }

            // Guarantee strict chronological order: Oct -> Nov -> Dec
            cards.sort(Comparator.comparingInt(this::getCardChronologicalKey));

            // Determine active/current card: Pending first, or reading required, or latest paid
            int currentIdx = 0;
            int firstPending = -1;
            int firstActionable = -1;
            int latestPaid = -1;

            for (int i = 0; i < cards.size(); i++) {
                Map<String, Object> c = cards.get(i);
                String state = (String) c.get("cardState");
                if ("PENDING".equalsIgnoreCase(state) && firstPending == -1) {
                    firstPending = i;
                }
                if (("READING_REQUIRED".equalsIgnoreCase(state) || "OPEN_BILLING".equalsIgnoreCase(state)) && firstActionable == -1) {
                    firstActionable = i;
                }
                if ("PAID".equalsIgnoreCase(state)) {
                    latestPaid = i;
                }
            }

            if (firstPending != -1) {
                currentIdx = firstPending;
            } else if (firstActionable != -1) {
                currentIdx = firstActionable;
            } else if (latestPaid != -1) {
                currentIdx = latestPaid;
            } else {
                currentIdx = Math.max(0, cards.size() - 1);
            }

            for (int i = 0; i < cards.size(); i++) {
                cards.get(i).put("isCurrent", (i == currentIdx));
                cards.get(i).put("cardIndex", i);
            }
            rMap.put("currentIndex", currentIdx);

            rMap.put("timeline", cards);
            roomTimelines.add(rMap);
        }

        dashboard.put("roomTimelines", roomTimelines);
        dashboard.put("rooms", roomTimelines);

        return dashboard;
    }

    private int getMonthOrderIndex(String monthName) {
        if (monthName == null) return 0;
        String m = monthName.toUpperCase().trim();
        if (m.contains("JAN")) return 1;
        if (m.contains("FEB")) return 2;
        if (m.contains("MAR")) return 3;
        if (m.contains("APR")) return 4;
        if (m.contains("MAY")) return 5;
        if (m.contains("JUN")) return 6;
        if (m.contains("JUL")) return 7;
        if (m.contains("AUG")) return 8;
        if (m.contains("SEP")) return 9;
        if (m.contains("OCT")) return 10;
        if (m.contains("NOV")) return 11;
        if (m.contains("DEC")) return 12;
        return 0;
    }

    private int getCardChronologicalKey(Map<String, Object> card) {
        if (card == null) return 0;
        String m = (String) card.get("monthShort");
        if (m == null) m = (String) card.get("monthLabel");
        int monthIdx = getMonthOrderIndex(m);
        int year = 2026;
        String period = (String) card.get("billingPeriod");
        String label = (String) card.get("monthLabel");
        String combined = (period != null ? period : "") + " " + (label != null ? label : "");
        for (int y = 2020; y <= 2035; y++) {
            if (combined.contains(String.valueOf(y))) {
                year = y;
                break;
            }
        }
        return year * 100 + monthIdx;
    }
}

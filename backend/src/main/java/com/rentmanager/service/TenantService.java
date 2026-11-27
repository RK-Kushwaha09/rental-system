package com.rentmanager.service;

import com.rentmanager.dto.TenantCreateRequest;
import com.rentmanager.model.Property;
import com.rentmanager.model.Room;
import com.rentmanager.model.Tenant;
import com.rentmanager.model.User;
import com.rentmanager.model.Bill;
import com.rentmanager.model.SubMeter;
import com.rentmanager.repository.BillRepository;
import com.rentmanager.repository.PaymentRepository;
import com.rentmanager.repository.PropertyRepository;
import com.rentmanager.repository.RoomRepository;
import com.rentmanager.repository.TenantRepository;
import com.rentmanager.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class TenantService {

    private final TenantRepository tenantRepository;
    private final RoomRepository roomRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final com.rentmanager.repository.SubMeterRepository subMeterRepository;

    public TenantService(TenantRepository tenantRepository,
                         RoomRepository roomRepository,
                         PropertyRepository propertyRepository,
                         UserRepository userRepository,
                         BillRepository billRepository,
                         PaymentRepository paymentRepository,
                         com.rentmanager.repository.SubMeterRepository subMeterRepository) {
        this.tenantRepository = tenantRepository;
        this.roomRepository = roomRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
        this.subMeterRepository = subMeterRepository;
    }


    /**
     * Resolves authenticated user strictly from Spring Security Context.
     */
    public User getCurrentAuthenticatedUser() {
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
     * Returns tenants strictly belonging to the authenticated owner's property.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTenants() {
        User owner = getCurrentAuthenticatedUser();
        Optional<Property> propOpt = propertyRepository.findFirstByUserOrderByIdDesc(owner);
        if (propOpt.isEmpty()) {
            return Collections.emptyList();
        }

        Property property = propOpt.get();
        List<Tenant> tenants = tenantRepository.findByPropertyOrRoomProperty(property);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Tenant t : tenants) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId() != null ? String.valueOf(t.getId()) : t.getTenantCode());
            map.put("tenantId", t.getId());
            map.put("tenantCode", t.getTenantCode());
            map.put("fullName", t.getFullName());
            map.put("name", t.getFullName());
            map.put("initials", (t.getInitials() != null && !t.getInitials().isEmpty()) ? t.getInitials() : "TN");
            map.put("mobile", t.getMobile());
            map.put("emergencyContact", t.getEmergencyContact());
            map.put("email", t.getEmail());
            map.put("unitNumber", t.getRoom() != null ? t.getRoom().getRoomNumber() : "");
            map.put("roomNumber", t.getRoom() != null ? t.getRoom().getRoomNumber() : "");
            map.put("roomId", t.getRoom() != null ? t.getRoom().getId() : null);
            map.put("floor", t.getRoom() != null ? t.getRoom().getFloor() : (t.getFloor() != null ? t.getFloor() : "Ground Fl"));
            map.put("property", property.getPropertyName());
            map.put("propertyName", property.getPropertyName());
            map.put("status", t.getStatus() != null ? t.getStatus() : "ACTIVE");
            map.put("agreementStatus", t.getAgreementStatus() != null ? t.getAgreementStatus() : "Active Agreement");
            map.put("joinedDate", t.getJoinedDate() != null ? t.getJoinedDate() : "Recently");
            map.put("openingBalance", t.getOpeningBalance() != null ? t.getOpeningBalance() : 0.0);
            map.put("currentBalance", t.getCurrentBalance() != null ? t.getCurrentBalance() : 0.0);
            map.put("avatarUrl", t.getAvatarUrl());
            map.put("avatar", (t.getInitials() != null && !t.getInitials().isEmpty()) ? t.getInitials() : "TN");
            map.put("avatarBg", "#DBEAFE");
            map.put("avatarColor", "#1E40AF");
            result.add(map);
        }

        return result;
    }

    /**
     * Returns single tenant with strict owner verification.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTenantById(String tenantId) {
        User owner = getCurrentAuthenticatedUser();
        Property property = propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No property found for owner"));

        Tenant tenant = null;
        try {
            Long id = Long.parseLong(tenantId);
            tenant = tenantRepository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            tenant = tenantRepository.findByTenantCode(tenantId).orElse(null);
        }

        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId);
        }

        // Verify that the tenant belongs to the authenticated owner's property
        boolean isOwner = false;
        if (tenant.getProperty() != null && tenant.getProperty().getId().equals(property.getId())) {
            isOwner = true;
        } else if (tenant.getRoom() != null && tenant.getRoom().getProperty() != null && tenant.getRoom().getProperty().getId().equals(property.getId())) {
            isOwner = true;
        }

        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Tenant does not belong to owner's property");
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", tenant.getId() != null ? String.valueOf(tenant.getId()) : tenant.getTenantCode());
        map.put("tenantId", tenant.getId());
        map.put("tenantCode", tenant.getTenantCode());
        map.put("fullName", tenant.getFullName());
        map.put("name", tenant.getFullName());
        map.put("initials", (tenant.getInitials() != null && !tenant.getInitials().isEmpty()) ? tenant.getInitials() : "TN");
        map.put("mobile", tenant.getMobile());
        map.put("emergencyContact", tenant.getEmergencyContact());
        map.put("email", tenant.getEmail());
        map.put("unitNumber", tenant.getRoom() != null ? tenant.getRoom().getRoomNumber() : "");
        map.put("roomNumber", tenant.getRoom() != null ? tenant.getRoom().getRoomNumber() : "");
        map.put("roomId", tenant.getRoom() != null ? tenant.getRoom().getId() : null);
        map.put("floor", tenant.getRoom() != null ? tenant.getRoom().getFloor() : tenant.getFloor());
        map.put("property", property.getPropertyName());
        map.put("agreementStatus", tenant.getAgreementStatus());
        map.put("joinedDate", tenant.getJoinedDate());
        map.put("status", tenant.getStatus());
        map.put("openingBalance", tenant.getOpeningBalance());
        map.put("currentBalance", tenant.getCurrentBalance());

        if (tenant.getRoom() != null) {
            map.put("monthlyRent", tenant.getRoom().getMonthlyRent());
            map.put("electricityRate", tenant.getRoom().getElectricityRate());
            Double moveInReading = null;
            if (tenant.getRoom().getSubMeter() != null) {
                moveInReading = tenant.getRoom().getSubMeter().getPreviousReading() != null 
                    ? tenant.getRoom().getSubMeter().getPreviousReading() 
                    : tenant.getRoom().getSubMeter().getCurrentReading();
            } else {
                Optional<com.rentmanager.model.SubMeter> sm = subMeterRepository.findByRoomId(tenant.getRoom().getId());
                if (sm.isPresent()) {
                    moveInReading = sm.get().getPreviousReading() != null ? sm.get().getPreviousReading() : sm.get().getCurrentReading();
                }
            }
            map.put("moveInReading", moveInReading);
        }
        return map;
    }

    /**
     * Transactional Tenant Creation & Room Occupancy Update.
     */
    @Transactional
    public Tenant createTenant(TenantCreateRequest request) {
        User owner = getCurrentAuthenticatedUser();
        Property property = propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active property found for owner"));

        // Validation
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
        }
        if (request.getMobile() == null || request.getMobile().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number is required");
        }
        String roomIdentifier = request.getRoomIdentifier();
        if (roomIdentifier == null || roomIdentifier.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room selection is required");
        }

        // Room must exist and belong to the authenticated owner's property
        Room room = roomRepository.findByPropertyAndRoomNumber(property, roomIdentifier)
                .or(() -> roomRepository.findByPropertyAndRoomCode(property, roomIdentifier))
                .orElseGet(() -> {
                    try {
                        Long id = Long.parseLong(roomIdentifier);
                        return roomRepository.findByPropertyAndId(property, id).orElse(null);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                });

        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found or does not belong to owner's property");
        }

        // Verify room is VACANT
        if (!"VACANT".equalsIgnoreCase(room.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room " + room.getRoomNumber() + " is already occupied");
        }

        // Verify room doesn't already have an assigned tenant
        if (tenantRepository.findByRoom(room).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room " + room.getRoomNumber() + " already has an assigned tenant");
        }

        // Generate initials
        String initials = "";
        String[] parts = request.getFullName().trim().split("\\s+");
        for (String p : parts) {
            if (!p.isEmpty()) initials += p.substring(0, 1).toUpperCase();
        }
        if (initials.isEmpty()) initials = "TN";

        // Format joined date
        String joinedDate = request.getJoinedDate();
        if (joinedDate == null || joinedDate.trim().isEmpty()) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
            joinedDate = LocalDate.now().format(formatter);
        } else if (joinedDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            try {
                LocalDate parsed = LocalDate.parse(joinedDate);
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
                joinedDate = parsed.format(formatter);
            } catch (Exception ignored) {}
        }

        // Room-level rent: update selected room's rent if edited
        if (request.getMonthlyRent() != null && request.getMonthlyRent() > 0) {
            room.setMonthlyRent(request.getMonthlyRent());
            room.setIsCustomRent(true);
        }

        // Floor: update selected room's floor if edited
        String selectedFloor = room.getFloor() != null ? room.getFloor() : "Ground";
        if (request.getFloor() != null && !request.getFloor().trim().isEmpty()) {
            selectedFloor = request.getFloor().trim();
            room.setFloor(selectedFloor);
        }

        Tenant tenant = new Tenant();
        tenant.setTenantCode("tenant-" + room.getRoomNumber() + "-" + System.currentTimeMillis());
        tenant.setFullName(request.getFullName().trim());
        tenant.setInitials(initials);
        tenant.setMobile(request.getMobile().trim());
        tenant.setEmergencyContact(request.getEmergencyContact() != null ? request.getEmergencyContact().trim() : null);
        tenant.setEmail(request.getEmail());
        tenant.setFloor(selectedFloor);
        tenant.setStatus("ACTIVE");
        tenant.setAgreementStatus(request.getAgreementStatus() != null ? request.getAgreementStatus() : "Active Agreement");
        tenant.setJoinedDate(joinedDate);
        tenant.setOpeningBalance(request.getOpeningBalance() != null ? request.getOpeningBalance() : 0.0);
        tenant.setCurrentBalance(0.0);
        tenant.setRoom(room);
        tenant.setProperty(property);

        Tenant savedTenant = tenantRepository.save(tenant);

        // Transactionally update room status to OCCUPIED and assign tenant
        room.setStatus("OCCUPIED");
        room.setTenant(savedTenant);

        // Physical meter reading at move-in
        if (request.getMoveInReading() != null) {
            String mCode = "#E-P" + property.getId() + "-R" + room.getRoomNumber();
            com.rentmanager.model.SubMeter subMeter = room.getSubMeter();
            if (subMeter == null) {
                subMeter = subMeterRepository.findByRoomId(room.getId()).orElse(null);
            }
            if (subMeter == null) {
                subMeter = subMeterRepository.findByMeterCode(mCode).orElse(null);
            }
            if (subMeter == null) {
                subMeter = new com.rentmanager.model.SubMeter();
                subMeter.setMeterCode(mCode);
                subMeter.setRoom(room);
            }
            subMeter.setCurrentReading(request.getMoveInReading());
            subMeter.setCurrentReadingDate(joinedDate);
            subMeter.setReadingLogged(true);
            subMeterRepository.save(subMeter);
            room.setSubMeter(subMeter);
        }

        roomRepository.save(room);

        // Persist independent historical bills if provided for existing tenant
        if (request.getHistoricalRecords() != null && !request.getHistoricalRecords().isEmpty()) {
            Double earliestHistReading = null;
            Double latestHistReading = null;
            List<Map<String, Object>> histList = request.getHistoricalRecords();
            for (int i = 0; i < histList.size(); i++) {
                Map<String, Object> h = histList.get(i);
                boolean isTrailing = (i == histList.size() - 1);
                try {
                    String monthName = String.valueOf(h.getOrDefault("name", "Historical"));
                    String monthShort = String.valueOf(h.getOrDefault("month", "HIST"));
                    String hKey = String.valueOf(h.getOrDefault("key", String.valueOf(System.currentTimeMillis())));
                    Double bRent = h.get("monthlyRent") != null ? Double.valueOf(h.get("monthlyRent").toString()) : 0.0;
                    Double prevR = h.get("prevReading") != null ? Double.valueOf(h.get("prevReading").toString()) : null;
                    Double currR = h.get("currReading") != null ? Double.valueOf(h.get("currReading").toString()) : null;
                    if (prevR != null && (earliestHistReading == null || prevR < earliestHistReading)) {
                        earliestHistReading = prevR;
                    }
                    if (currR != null && currR > 0) {
                        latestHistReading = currR;
                    }
                    Double uConsumed = h.get("unitsConsumed") != null ? Double.valueOf(h.get("unitsConsumed").toString()) : 0.0;
                    Double eRate = h.get("electricityRate") != null ? Double.valueOf(h.get("electricityRate").toString()) : 0.0;
                    Double eAmount = h.get("electricityAmount") != null ? Double.valueOf(h.get("electricityAmount").toString()) : 0.0;
                    Double tBill = h.get("totalBill") != null ? Double.valueOf(h.get("totalBill").toString()) : 0.0;
                    String status = String.valueOf(h.getOrDefault("status", "SETTLED"));

                    Double amtPayable = h.get("amountPayable") != null ? Double.valueOf(h.get("amountPayable").toString()) : tBill;
                    Double amtReceived = h.get("amountReceived") != null ? Double.valueOf(h.get("amountReceived").toString()) : null;
                    String pDate = h.get("paymentDate") != null ? String.valueOf(h.get("paymentDate")) : null;

                    // Skip unbilled trailing diary notes with no payment, no date, and no meter reading ONLY for trailing note
                    if (isTrailing && amtReceived == null && (pDate == null || pDate.trim().isEmpty()) && currR == null) {
                        continue;
                    }
                    Double cAdvance = h.get("closingAdvance") != null ? Double.valueOf(h.get("closingAdvance").toString()) : 0.0;
                    Double cDue = h.get("closingDue") != null ? Double.valueOf(h.get("closingDue").toString()) : 0.0;
                    Double bal = h.get("balance") != null ? Double.valueOf(h.get("balance").toString()) : 0.0;

                    String invNum = "HIST-" + room.getRoomNumber() + "-" + hKey + "-" + UUID.randomUUID().toString().substring(0, 6);
                    Bill histBill = new Bill(
                            invNum,
                            monthName,
                            monthShort.toUpperCase(),
                            status,
                            pDate != null ? pDate : "Historical Import",
                            bRent,
                            prevR,
                            currR,
                            uConsumed,
                            eRate,
                            eAmount,
                            0.0,
                            tBill,
                            "Imported via Onboarding",
                            savedTenant,
                            room
                    );
                    histBill.setAmountPayable(amtPayable);
                    histBill.setAmountReceived(amtReceived);
                    histBill.setPaymentDate(pDate);
                    histBill.setClosingAdvance(cAdvance);
                    histBill.setClosingDue(cDue);
                    histBill.setBalance(bal);
                    Bill savedHistBill = billRepository.save(histBill);

                    // Persist corresponding payment record if payment was received
                    if (amtReceived != null && amtReceived > 0) {
                        try {
                            String recNum = "#REC-HIST-" + room.getRoomNumber() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                            com.rentmanager.model.Payment histPayment = new com.rentmanager.model.Payment(
                                    recNum,
                                    "TRANSACTION SETTLED",
                                    amtReceived,
                                    "INR",
                                    "Diary Record",
                                    "DIARY-" + hKey,
                                    pDate != null ? pDate : "Historical Import",
                                    cDue != null && cDue > 0 ? "PARTIALLY SETTLED" : "100% SETTLED",
                                    bal != null ? bal : 0.0,
                                    savedTenant,
                                    savedHistBill
                            );
                            paymentRepository.save(histPayment);
                        } catch (Exception ignoredPayment) {
                        }
                    }
                } catch (Exception ignored) {
                }
            }

            if (latestHistReading != null) {
                String mCode = "#E-P" + property.getId() + "-R" + room.getRoomNumber();
                com.rentmanager.model.SubMeter subMeter = room.getSubMeter();
                if (subMeter == null) {
                    subMeter = subMeterRepository.findByRoomId(room.getId()).orElse(null);
                }
                if (subMeter == null) {
                    subMeter = subMeterRepository.findByMeterCode(mCode).orElse(null);
                }
                if (subMeter == null) {
                    subMeter = new com.rentmanager.model.SubMeter();
                    subMeter.setMeterCode(mCode);
                    subMeter.setRoom(room);
                }
                if (earliestHistReading != null) {
                    subMeter.setPreviousReading(earliestHistReading);
                    subMeter.setUnitsConsumed(latestHistReading - earliestHistReading);
                }
                subMeter.setCurrentReading(latestHistReading);
                subMeter.setReadingLogged(true);
                subMeterRepository.save(subMeter);
                room.setSubMeter(subMeter);
                roomRepository.save(room);
            }
        }

        return savedTenant;
    }

    public Map<String, Object> getLedgerSummary(String month) {
        Map<String, Object> ledger = new HashMap<>();
        ledger.put("totalReceivable", 0);
        ledger.put("totalReceived", 0);
        ledger.put("totalOutstanding", 0);
        ledger.put("settledTenantsCount", 0);
        ledger.put("pendingTenantsCount", 0);
        ledger.put("month", month != null ? month : "OCT");
        return ledger;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTenantHistory(String tenantId) {
        User owner = getCurrentAuthenticatedUser();
        Property property = propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No property found for owner"));

        Tenant tenant = null;
        try {
            Long id = Long.parseLong(tenantId);
            tenant = tenantRepository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            tenant = tenantRepository.findByTenantCode(tenantId).orElse(null);
        }

        if (tenant == null) {
            Optional<Room> roomOpt = roomRepository.findByPropertyAndRoomNumber(property, tenantId);
            if (roomOpt.isPresent() && roomOpt.get().getTenant() != null) {
                tenant = roomOpt.get().getTenant();
            }
        }

        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId);
        }

        Room room = tenant.getRoom();
        List<Bill> bills = billRepository.findByTenantId(tenant.getId());
        if (bills == null || bills.isEmpty()) {
            if (room != null) {
                bills = billRepository.findByRoomId(room.getId());
            }
        }

        if (bills != null) {
            bills.sort((a, b) -> a.getId().compareTo(b.getId()));
        }

        Double initialReading = null;
        Double currentReading = null;
        if (room != null && room.getSubMeter() != null) {
            initialReading = room.getSubMeter().getPreviousReading();
            currentReading = room.getSubMeter().getCurrentReading();
        }

        List<Map<String, Object>> recordsList = new ArrayList<>();
        if (bills != null) {
            for (Bill b : bills) {
                if (b.getPowerReadingPrev() != null) {
                    if (initialReading == null || b.getPowerReadingPrev() < initialReading) {
                        initialReading = b.getPowerReadingPrev();
                    }
                }
                if (b.getPowerReadingCurr() != null) {
                    if (currentReading == null || b.getPowerReadingCurr() > currentReading) {
                        currentReading = b.getPowerReadingCurr();
                    }
                }

                Map<String, Object> rec = new HashMap<>();
                rec.put("id", b.getId());
                rec.put("invoiceNumber", b.getInvoiceNumber());
                rec.put("name", b.getBillingPeriod());
                rec.put("billingPeriod", b.getBillingPeriod());
                rec.put("month", b.getBillingMonth());
                rec.put("status", b.getStatus());
                rec.put("monthlyRent", b.getBaseRent());
                rec.put("prevReading", b.getPowerReadingPrev());
                rec.put("currReading", b.getPowerReadingCurr());
                rec.put("unitsConsumed", b.getPowerUnits());
                rec.put("electricityRate", b.getPowerRate());
                rec.put("electricityAmount", b.getPowerAmount());
                rec.put("totalBill", b.getTotalPayable());
                rec.put("amountPayable", b.getAmountPayable() != null ? b.getAmountPayable() : b.getTotalPayable());
                rec.put("amountReceived", b.getAmountReceived());
                rec.put("paymentDate", b.getPaymentDate());
                rec.put("closingAdvance", b.getClosingAdvance());
                rec.put("closingDue", b.getClosingDue());
                rec.put("balance", b.getBalance());
                recordsList.add(rec);
            }
        }

        Double totalUnits = (currentReading != null && initialReading != null) ? (currentReading - initialReading) : 0.0;

        Map<String, Object> result = new HashMap<>();
        result.put("tenantId", tenant.getId());
        result.put("tenantCode", tenant.getTenantCode());
        result.put("fullName", tenant.getFullName());
        result.put("mobile", tenant.getMobile());
        result.put("joinedDate", tenant.getJoinedDate());
        result.put("roomNumber", room != null ? room.getRoomNumber() : "");
        result.put("floor", room != null ? room.getFloor() : tenant.getFloor());
        result.put("meterCode", (room != null && room.getSubMeter() != null) ? room.getSubMeter().getMeterCode() : ("#E-P" + property.getId() + "-R" + (room != null ? room.getRoomNumber() : "")));
        result.put("initialReading", initialReading);
        result.put("currentReading", currentReading);
        result.put("totalUnits", totalUnits != null ? (totalUnits % 1 == 0 ? totalUnits.intValue() : totalUnits) : 0);
        result.put("records", recordsList);
        result.put("bills", recordsList);
        return result;
    }

    /**
     * Updates an existing tenant record transactionally without corrupting billing history.
     */
    @Transactional
    public Map<String, Object> updateTenant(String tenantIdStr, TenantCreateRequest request) {
        User owner = getCurrentAuthenticatedUser();
        Property property = propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No property found for owner"));

        Tenant tenant = null;
        try {
            Long id = Long.parseLong(tenantIdStr);
            tenant = tenantRepository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            tenant = tenantRepository.findByTenantCode(tenantIdStr).orElse(null);
        }

        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantIdStr);
        }

        // Verify property ownership
        boolean isOwner = false;
        if (tenant.getProperty() != null && tenant.getProperty().getId().equals(property.getId())) {
            isOwner = true;
        } else if (tenant.getRoom() != null && tenant.getRoom().getProperty() != null && tenant.getRoom().getProperty().getId().equals(property.getId())) {
            isOwner = true;
        }

        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Tenant does not belong to owner's property");
        }

        // 1. Update basic tenant fields
        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            tenant.setFullName(request.getFullName().trim());
            String[] parts = request.getFullName().trim().split("\\s+");
            String initials = parts.length > 1
                    ? ("" + parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
                    : parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
            tenant.setInitials(initials);
        }

        if (request.getMobile() != null && !request.getMobile().trim().isEmpty()) {
            tenant.setMobile(request.getMobile().trim());
        }

        if (request.getEmergencyContact() != null) {
            tenant.setEmergencyContact(request.getEmergencyContact().trim());
        }

        if (request.getEmail() != null) {
            tenant.setEmail(request.getEmail().trim());
        }

        if (request.getJoinedDate() != null && !request.getJoinedDate().trim().isEmpty()) {
            String jDate = request.getJoinedDate().trim();
            if (jDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                try {
                    LocalDate parsed = LocalDate.parse(jDate);
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
                    jDate = parsed.format(formatter);
                } catch (Exception ignored) {}
            }
            tenant.setJoinedDate(jDate);
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            tenant.setStatus(request.getStatus().trim());
        }

        if (request.getAgreementStatus() != null && !request.getAgreementStatus().trim().isEmpty()) {
            tenant.setAgreementStatus(request.getAgreementStatus().trim());
        }

        // 2. Room, Pricing and Submeter updates
        Room room = tenant.getRoom();
        if (room != null) {
            // Update rent if provided
            if (request.getMonthlyRent() != null && request.getMonthlyRent() >= 0) {
                Double oldRent = room.getMonthlyRent() != null ? room.getMonthlyRent() : 0.0;
                Double newRent = request.getMonthlyRent();
                if (!Objects.equals(oldRent, newRent)) {
                    room.setMonthlyRent(newRent);
                    room.setIsCustomRent(property.getDefaultBaseRent() != null && !Objects.equals(newRent, property.getDefaultBaseRent()));
                    Double delta = newRent - oldRent;
                    Double currPot = property.getMonthlyPotential() != null ? property.getMonthlyPotential() : 0.0;
                    property.setMonthlyPotential(Math.max(0.0, currPot + delta));
                    propertyRepository.save(property);
                }
            }

            // Update electricity rate if provided
            if (request.getElectricityRate() != null && request.getElectricityRate() >= 0) {
                room.setElectricityRate(request.getElectricityRate());
            }

            // Update floor if provided
            if (request.getFloor() != null && !request.getFloor().trim().isEmpty()) {
                room.setFloor(request.getFloor().trim());
                tenant.setFloor(request.getFloor().trim());
            }

            // Update move-in meter reading safely (requirement 8)
            if (request.getMoveInReading() != null && request.getMoveInReading() >= 0) {
                SubMeter subMeter = room.getSubMeter();
                if (subMeter == null) {
                    subMeter = subMeterRepository.findByRoomId(room.getId()).orElse(null);
                }
                if (subMeter != null) {
                    subMeter.setPreviousReading(request.getMoveInReading());
                    // If no production bills exist or reading hasn't been logged, sync current reading
                    List<Bill> roomBills = billRepository.findByRoomId(room.getId());
                    if (roomBills == null || roomBills.isEmpty()) {
                        subMeter.setCurrentReading(request.getMoveInReading());
                        if (tenant.getJoinedDate() != null) {
                            subMeter.setCurrentReadingDate(tenant.getJoinedDate());
                        }
                    }
                    subMeterRepository.save(subMeter);
                    room.setSubMeter(subMeter);
                }
            }

            roomRepository.save(room);
        }

        tenantRepository.save(tenant);
        return getTenantById(String.valueOf(tenant.getId()));
    }

    /**
     * Marks tenant as vacated, freeing up any associated room.
     */
    @Transactional
    public Map<String, Object> vacateTenant(String tenantIdStr) {
        User owner = getCurrentAuthenticatedUser();
        Property property = propertyRepository.findFirstByUserOrderByIdDesc(owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No property found for owner"));

        Long tId;
        try {
            tId = Long.parseLong(tenantIdStr);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tenant id: " + tenantIdStr);
        }

        Tenant tenant = tenantRepository.findByIdAndProperty(tId, property)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantIdStr));

        Room room = tenant.getRoom();
        if (room != null) {
            room.setTenant(null);
            room.setStatus("VACANT");
            roomRepository.save(room);
        }

        tenant.setRoom(null);
        tenant.setStatus("INACTIVE");
        tenant.setAgreementStatus("Vacated");
        tenantRepository.save(tenant);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("message", "Tenant marked as vacated successfully");
        return res;
    }
}

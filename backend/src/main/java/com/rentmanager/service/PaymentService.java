package com.rentmanager.service;

import com.rentmanager.dto.PaymentRecordRequest;
import com.rentmanager.model.*;
import com.rentmanager.repository.*;
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
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BillRepository billRepository;
    private final TenantRepository tenantRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    public PaymentService(PaymentRepository paymentRepository,
                          BillRepository billRepository,
                          TenantRepository tenantRepository,
                          PropertyRepository propertyRepository,
                          UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.billRepository = billRepository;
        this.tenantRepository = tenantRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
    }

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

    @Transactional
    public Map<String, Object> recordPayment(PaymentRecordRequest request) {
        User owner = getCurrentAuthenticatedUser();

        // 1. Resolve Bill if provided
        Bill bill = null;
        if (request.getInvoiceNumber() != null && !request.getInvoiceNumber().trim().isEmpty()) {
            bill = billRepository.findByInvoiceNumber(request.getInvoiceNumber().trim()).orElse(null);
        } else if (request.getBillId() != null) {
            bill = billRepository.findById(request.getBillId()).orElse(null);
        }

        // 2. Resolve Tenant
        Tenant tenant = null;
        if (bill != null && bill.getTenant() != null) {
            tenant = bill.getTenant();
        } else if (request.getTenantId() != null) {
            tenant = tenantRepository.findById(request.getTenantId()).orElse(null);
        }

        Double amountReceived = request.getAmountReceived();
        if (amountReceived == null || amountReceived < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid payment amount is required");
        }

        String paymentDateStr = request.getPaymentDate();
        if (paymentDateStr == null || paymentDateStr.trim().isEmpty()) {
            paymentDateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));
        }

        String paymentMethod = request.getPaymentMethod();
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            paymentMethod = "UPI (GPay)";
        }

        String transactionRef = request.getTransactionRef();
        if (transactionRef == null || transactionRef.trim().isEmpty()) {
            transactionRef = "TXN/" + LocalDate.now().getYear() + "/" + String.format("%07d", (System.currentTimeMillis() % 10000000));
        }

        Double totalPayable = bill != null
                ? (bill.getAmountPayable() != null ? bill.getAmountPayable() : (bill.getTotalPayable() != null ? bill.getTotalPayable() : 0.0))
                : amountReceived;
        Double remainingBalance = 0.0;
        String settledPercentage = "100% SETTLED";
        String status = "TRANSACTION SETTLED";

        if (bill != null) {
            double diff = totalPayable - amountReceived;
            if (diff > 0.01) {
                // Partial payment
                remainingBalance = Math.round(diff * 100.0) / 100.0;
                double pct = totalPayable > 0 ? (amountReceived / totalPayable) * 100.0 : 100.0;
                settledPercentage = String.format("%.0f%% SETTLED", pct);
                status = "PARTIALLY SETTLED";

                bill.setStatus("PARTIALLY PAID");
                bill.setClosingDue(remainingBalance);
                bill.setClosingAdvance(0.0);
                bill.setBalance(remainingBalance);
                settlePriorBills(bill, amountReceived);
            } else if (diff < -0.01) {
                // Excess payment / advance
                double advance = Math.round(Math.abs(diff) * 100.0) / 100.0;
                remainingBalance = 0.0;
                settledPercentage = "100% SETTLED";
                status = "TRANSACTION SETTLED";

                bill.setStatus("PAID");
                bill.setClosingDue(0.0);
                bill.setClosingAdvance(advance);
                bill.setBalance(-advance);
                settlePriorBills(bill, totalPayable);
            } else {
                // Exact settlement
                remainingBalance = 0.0;
                settledPercentage = "100% SETTLED";
                status = "TRANSACTION SETTLED";

                bill.setStatus("PAID");
                bill.setClosingDue(0.0);
                bill.setClosingAdvance(0.0);
                bill.setBalance(0.0);
                settlePriorBills(bill, totalPayable);
            }

            bill.setAmountReceived(amountReceived);
            bill.setPaymentDate(paymentDateStr);
            billRepository.save(bill);
        }

        String recNumber = "#REC-" + String.format("%06d", (System.currentTimeMillis() % 1000000));

        Payment payment = new Payment(
                recNumber,
                status,
                amountReceived,
                "INR",
                paymentMethod,
                transactionRef,
                paymentDateStr,
                settledPercentage,
                remainingBalance,
                tenant,
                bill
        );

        paymentRepository.save(payment);

        return getReceipt(recNumber);
    }

    private void settlePriorBills(Bill currentBill, double paymentApplied) {
        if (currentBill.getRoom() == null) return;
        List<Bill> roomBills = billRepository.findByRoomIdOrderByIdDesc(currentBill.getRoom().getId());
        List<Bill> priorBills = roomBills.stream()
                .filter(b -> b.getId() < currentBill.getId())
                .sorted(Comparator.comparing(Bill::getId))
                .toList();

        double remainingPool = paymentApplied;
        for (Bill pb : priorBills) {
            double due = pb.getClosingDue() != null ? pb.getClosingDue() : 0.0;
            if (due > 0) {
                if (remainingPool >= due) {
                    remainingPool -= due;
                    pb.setClosingDue(0.0);
                    pb.setBalance(0.0);
                    pb.setStatus("PAID");
                    billRepository.save(pb);
                } else if (remainingPool > 0) {
                    double newDue = Math.round((due - remainingPool) * 100.0) / 100.0;
                    pb.setClosingDue(newDue);
                    pb.setBalance(-newDue);
                    remainingPool = 0.0;
                    billRepository.save(pb);
                }
            } else if (!"PAID".equalsIgnoreCase(pb.getStatus()) && !"SETTLED".equalsIgnoreCase(pb.getStatus()) && !"ADVANCE".equalsIgnoreCase(pb.getStatus())) {
                pb.setStatus("PAID");
                pb.setClosingDue(0.0);
                pb.setBalance(0.0);
                billRepository.save(pb);
            }
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReceipt(String receiptNumber) {
        Payment p = null;
        if (receiptNumber != null && !receiptNumber.trim().isEmpty() &&
                !"undefined".equalsIgnoreCase(receiptNumber.trim()) &&
                !"null".equalsIgnoreCase(receiptNumber.trim()) &&
                !"latest".equalsIgnoreCase(receiptNumber.trim())) {
            p = paymentRepository.findByReceiptNumber(receiptNumber.trim())
                    .orElseGet(() -> {
                        Bill bill = billRepository.findByInvoiceNumber(receiptNumber.trim()).orElse(null);
                        if (bill != null) {
                            List<Payment> payments = paymentRepository.findByBillId(bill.getId());
                            if (!payments.isEmpty()) {
                                return payments.get(0);
                            }
                        }
                        return null;
                    });
        }

        if (p == null) {
            User owner = getCurrentAuthenticatedUser();
            Property prop = propertyRepository.findFirstByUserOrderByIdDesc(owner).orElse(null);
            if (prop != null) {
                List<Payment> payments = paymentRepository.findByPropertyOrderByIdDesc(prop);
                if (!payments.isEmpty()) {
                    p = payments.get(0);
                }
            }
        }

        if (p == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Receipt not found: " + receiptNumber);
        }

        Tenant t = p.getTenant();
        Bill b = p.getBill();
        Room room = null;
        if (b != null && b.getRoom() != null) {
            room = b.getRoom();
        } else if (t != null && t.getRoom() != null) {
            room = t.getRoom();
        }

        Map<String, Object> receipt = new HashMap<>();
        receipt.put("id", p.getId());
        receipt.put("receiptNumber", p.getReceiptNumber());
        receipt.put("status", p.getStatus());
        receipt.put("amountReceived", p.getAmountReceived());
        receipt.put("currency", p.getCurrency() != null ? p.getCurrency() : "INR");
        receipt.put("paymentMethod", p.getPaymentMethod());
        receipt.put("transactionRef", p.getTransactionRef());
        receipt.put("paymentDate", p.getPaymentDate());
        receipt.put("settledPercentage", p.getSettledPercentage());
        receipt.put("remainingBalance", p.getRemainingBalance());
        receipt.put("tenantId", t != null ? t.getId() : null);
        receipt.put("tenantName", t != null ? t.getFullName() : "Tenant");
        receipt.put("assignedUnit", room != null ? ("Room " + room.getRoomNumber()) : "Unit N/A");
        receipt.put("assignedFloor", room != null && room.getFloor() != null ? ("Floor " + room.getFloor()) : "Floor N/A");
        receipt.put("invoiceNumber", b != null ? b.getInvoiceNumber() : "");
        receipt.put("billId", b != null ? b.getId() : null);
        receipt.put("totalBillAmount", b != null && b.getTotalPayable() != null ? b.getTotalPayable() : p.getAmountReceived());

        return receipt;
    }
}

package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String invoiceNumber; // e.g. "#INV-2026-10204"

    private String billingPeriod; // "01 Oct – 31 Oct 2026"

    private String billingMonth; // "OCTOBER"

    private String status; // "DUE TODAY", "PAID", "BILL GENERATED & ISSUED", "DRAFTING"

    private String dueDate; // "05 Nov 2026"

    private Double baseRent; // 8000.0

    private Double powerReadingPrev; // 1250.0

    private Double powerReadingCurr; // 1384.0

    private Double powerUnits; // 134.0

    private Double powerRate; // 8.5

    private Double powerAmount; // 1139.0

    private Double pastArrears; // 100.0

    private Double totalPayable; // 9239.0

    private Double amountPayable;

    private Double amountReceived;

    private String paymentDate;

    private Double closingAdvance;

    private Double closingDue;

    private Double balance;

    private String generatedAt; // "28 Oct 2026 • 04:30 PM"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Room room;

    private LocalDateTime createdAt;

    public Bill() {
        this.createdAt = LocalDateTime.now();
    }

    public Bill(String invoiceNumber, String billingPeriod, String billingMonth, String status,
                String dueDate, Double baseRent, Double powerReadingPrev, Double powerReadingCurr,
                Double powerUnits, Double powerRate, Double powerAmount, Double pastArrears,
                Double totalPayable, String generatedAt, Tenant tenant, Room room) {
        this.invoiceNumber = invoiceNumber;
        this.billingPeriod = billingPeriod;
        this.billingMonth = billingMonth;
        this.status = status;
        this.dueDate = dueDate;
        this.baseRent = baseRent;
        this.powerReadingPrev = powerReadingPrev;
        this.powerReadingCurr = powerReadingCurr;
        this.powerUnits = powerUnits;
        this.powerRate = powerRate;
        this.powerAmount = powerAmount;
        this.pastArrears = pastArrears;
        this.totalPayable = totalPayable;
        this.generatedAt = generatedAt;
        this.tenant = tenant;
        this.room = room;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getBillingPeriod() {
        return billingPeriod;
    }

    public void setBillingPeriod(String billingPeriod) {
        this.billingPeriod = billingPeriod;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public Double getBaseRent() {
        return baseRent;
    }

    public void setBaseRent(Double baseRent) {
        this.baseRent = baseRent;
    }

    public Double getPowerReadingPrev() {
        return powerReadingPrev;
    }

    public void setPowerReadingPrev(Double powerReadingPrev) {
        this.powerReadingPrev = powerReadingPrev;
    }

    public Double getPowerReadingCurr() {
        return powerReadingCurr;
    }

    public void setPowerReadingCurr(Double powerReadingCurr) {
        this.powerReadingCurr = powerReadingCurr;
    }

    public Double getPowerUnits() {
        return powerUnits;
    }

    public void setPowerUnits(Double powerUnits) {
        this.powerUnits = powerUnits;
    }

    public Double getPowerRate() {
        return powerRate;
    }

    public void setPowerRate(Double powerRate) {
        this.powerRate = powerRate;
    }

    public Double getPowerAmount() {
        return powerAmount;
    }

    public void setPowerAmount(Double powerAmount) {
        this.powerAmount = powerAmount;
    }

    public Double getPastArrears() {
        return pastArrears;
    }

    public void setPastArrears(Double pastArrears) {
        this.pastArrears = pastArrears;
    }

    public Double getTotalPayable() {
        return totalPayable;
    }

    public void setTotalPayable(Double totalPayable) {
        this.totalPayable = totalPayable;
    }

    public Double getAmountPayable() {
        return amountPayable;
    }

    public void setAmountPayable(Double amountPayable) {
        this.amountPayable = amountPayable;
    }

    public Double getAmountReceived() {
        return amountReceived;
    }

    public void setAmountReceived(Double amountReceived) {
        this.amountReceived = amountReceived;
    }

    public String getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(String paymentDate) {
        this.paymentDate = paymentDate;
    }

    public Double getClosingAdvance() {
        return closingAdvance;
    }

    public void setClosingAdvance(Double closingAdvance) {
        this.closingAdvance = closingAdvance;
    }

    public Double getClosingDue() {
        return closingDue;
    }

    public void setClosingDue(Double closingDue) {
        this.closingDue = closingDue;
    }

    public Double getBalance() {
        return balance;
    }

    public void setBalance(Double balance) {
        this.balance = balance;
    }

    public String getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(String generatedAt) {
        this.generatedAt = generatedAt;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

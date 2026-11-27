package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String receiptNumber; // e.g. "#REC-000124"

    private String status; // "TRANSACTION SETTLED"

    private Double amountReceived; // 9239.0

    private String currency; // "INR"

    private String paymentMethod; // "UPI (GPay)", "IMPS Transfer", "Cash"

    private String transactionRef; // "UPI/2026/8940217"

    private String paymentDate; // "28 October 2026"

    private String settledPercentage; // "100% SETTLED"

    private Double remainingBalance; // 0.0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Bill bill;

    private LocalDateTime createdAt;

    public Payment() {
        this.createdAt = LocalDateTime.now();
    }

    public Payment(String receiptNumber, String status, Double amountReceived, String currency,
                   String paymentMethod, String transactionRef, String paymentDate,
                   String settledPercentage, Double remainingBalance, Tenant tenant, Bill bill) {
        this.receiptNumber = receiptNumber;
        this.status = status;
        this.amountReceived = amountReceived;
        this.currency = currency != null ? currency : "INR";
        this.paymentMethod = paymentMethod;
        this.transactionRef = transactionRef;
        this.paymentDate = paymentDate;
        this.settledPercentage = settledPercentage != null ? settledPercentage : "100% SETTLED";
        this.remainingBalance = remainingBalance != null ? remainingBalance : 0.0;
        this.tenant = tenant;
        this.bill = bill;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public void setReceiptNumber(String receiptNumber) {
        this.receiptNumber = receiptNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getAmountReceived() {
        return amountReceived;
    }

    public void setAmountReceived(Double amountReceived) {
        this.amountReceived = amountReceived;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionRef() {
        return transactionRef;
    }

    public void setTransactionRef(String transactionRef) {
        this.transactionRef = transactionRef;
    }

    public String getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(String paymentDate) {
        this.paymentDate = paymentDate;
    }

    public String getSettledPercentage() {
        return settledPercentage;
    }

    public void setSettledPercentage(String settledPercentage) {
        this.settledPercentage = settledPercentage;
    }

    public Double getRemainingBalance() {
        return remainingBalance;
    }

    public void setRemainingBalance(Double remainingBalance) {
        this.remainingBalance = remainingBalance;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public Bill getBill() {
        return bill;
    }

    public void setBill(Bill bill) {
        this.bill = bill;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

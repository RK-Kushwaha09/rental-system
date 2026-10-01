package payments;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import rooms.Room;
import tenants.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "payment_month"})
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "payment_month", nullable = false, length = 7)
    private String paymentMonth; // Format: YYYY-MM

    @Column(name = "prev_meter", nullable = false, precision = 10, scale = 2)
    private BigDecimal prevMeter = BigDecimal.ZERO;

    @Column(name = "curr_meter", nullable = false, precision = 10, scale = 2)
    private BigDecimal currMeter = BigDecimal.ZERO;

    @Column(name = "units_used", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitsUsed = BigDecimal.ZERO;

    @Column(name = "electricity_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal electricityRate = BigDecimal.ZERO;

    @Column(name = "electricity_bill", nullable = false, precision = 10, scale = 2)
    private BigDecimal electricityBill = BigDecimal.ZERO;

    @Column(name = "monthly_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRent = BigDecimal.ZERO;

    @Column(name = "carry_forward", nullable = false, precision = 10, scale = 2)
    private BigDecimal carryForward = BigDecimal.ZERO;

    @Column(name = "total_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDue = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "balance", nullable = false, precision = 10, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = "clear"; // due, advance, clear

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Payment() {}

    public void computeValues() {
        if (prevMeter == null) prevMeter = BigDecimal.ZERO;
        if (currMeter == null) currMeter = BigDecimal.ZERO;
        if (electricityRate == null) electricityRate = BigDecimal.ZERO;
        if (monthlyRent == null) monthlyRent = BigDecimal.ZERO;
        if (carryForward == null) carryForward = BigDecimal.ZERO;
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;

        this.unitsUsed = currMeter.subtract(prevMeter).setScale(2, RoundingMode.HALF_UP);
        if (this.unitsUsed.compareTo(BigDecimal.ZERO) < 0) this.unitsUsed = BigDecimal.ZERO;

        this.electricityBill = this.unitsUsed.multiply(electricityRate).setScale(2, RoundingMode.HALF_UP);
        this.totalDue = this.monthlyRent.add(this.electricityBill).add(this.carryForward).setScale(2, RoundingMode.HALF_UP);
        this.balance = this.paidAmount.subtract(this.totalDue).setScale(2, RoundingMode.HALF_UP);

        if (this.balance.compareTo(BigDecimal.ZERO) < 0) {
            this.status = "due";
        } else if (this.balance.compareTo(BigDecimal.ZERO) > 0) {
            this.status = "advance";
        } else {
            this.status = "clear";
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public String getPaymentMonth() { return paymentMonth; }
    public void setPaymentMonth(String paymentMonth) { this.paymentMonth = paymentMonth; }

    public BigDecimal getPrevMeter() { return prevMeter; }
    public void setPrevMeter(BigDecimal prevMeter) { this.prevMeter = prevMeter; }

    public BigDecimal getCurrMeter() { return currMeter; }
    public void setCurrMeter(BigDecimal currMeter) { this.currMeter = currMeter; }

    public BigDecimal getUnitsUsed() { return unitsUsed; }
    public void setUnitsUsed(BigDecimal unitsUsed) { this.unitsUsed = unitsUsed; }

    public BigDecimal getElectricityRate() { return electricityRate; }
    public void setElectricityRate(BigDecimal electricityRate) { this.electricityRate = electricityRate; }

    public BigDecimal getElectricityBill() { return electricityBill; }
    public void setElectricityBill(BigDecimal electricityBill) { this.electricityBill = electricityBill; }

    public BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    public BigDecimal getCarryForward() { return carryForward; }
    public void setCarryForward(BigDecimal carryForward) { this.carryForward = carryForward; }

    public BigDecimal getTotalDue() { return totalDue; }
    public void setTotalDue(BigDecimal totalDue) { this.totalDue = totalDue; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

package dashboard;

import payments.Payment;
import java.math.BigDecimal;
import java.util.List;

public class DashboardStats {
    private long buildings;
    private long totalRooms;
    private long occupiedRooms;
    private long vacantRooms;
    private long tenants;
    private String currentMonth;

    private PaymentStats paymentStats;
    private List<Payment> recentPayments;
    private List<Payment> pendingDues;

    public static class PaymentStats {
        private long totalPayments;
        private long dueCount;
        private long advanceCount;
        private long clearCount;
        private BigDecimal totalCollected = BigDecimal.ZERO;
        private BigDecimal totalBilled = BigDecimal.ZERO;

        public PaymentStats() {}

        public long getTotalPayments() { return totalPayments; }
        public void setTotalPayments(long totalPayments) { this.totalPayments = totalPayments; }

        public long getDueCount() { return dueCount; }
        public void setDueCount(long dueCount) { this.dueCount = dueCount; }

        public long getAdvanceCount() { return advanceCount; }
        public void setAdvanceCount(long advanceCount) { this.advanceCount = advanceCount; }

        public long getClearCount() { return clearCount; }
        public void setClearCount(long clearCount) { this.clearCount = clearCount; }

        public BigDecimal getTotalCollected() { return totalCollected; }
        public void setTotalCollected(BigDecimal totalCollected) { this.totalCollected = totalCollected; }

        public BigDecimal getTotalBilled() { return totalBilled; }
        public void setTotalBilled(BigDecimal totalBilled) { this.totalBilled = totalBilled; }
    }

    public DashboardStats() {}

    public long getBuildings() { return buildings; }
    public void setBuildings(long buildings) { this.buildings = buildings; }

    public long getTotalRooms() { return totalRooms; }
    public void setTotalRooms(long totalRooms) { this.totalRooms = totalRooms; }

    public long getOccupiedRooms() { return occupiedRooms; }
    public void setOccupiedRooms(long occupiedRooms) { this.occupiedRooms = occupiedRooms; }

    public long getVacantRooms() { return vacantRooms; }
    public void setVacantRooms(long vacantRooms) { this.vacantRooms = vacantRooms; }

    public long getTenants() { return tenants; }
    public void setTenants(long tenants) { this.tenants = tenants; }

    public String getCurrentMonth() { return currentMonth; }
    public void setCurrentMonth(String currentMonth) { this.currentMonth = currentMonth; }

    public PaymentStats getPaymentStats() { return paymentStats; }
    public void setPaymentStats(PaymentStats paymentStats) { this.paymentStats = paymentStats; }

    public List<Payment> getRecentPayments() { return recentPayments; }
    public void setRecentPayments(List<Payment> recentPayments) { this.recentPayments = recentPayments; }

    public List<Payment> getPendingDues() { return pendingDues; }
    public void setPendingDues(List<Payment> pendingDues) { this.pendingDues = pendingDues; }
}

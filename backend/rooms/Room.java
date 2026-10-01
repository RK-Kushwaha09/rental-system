package rooms;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import buildings.Building;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rooms", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"building_id", "room_number"})
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @Column(name = "room_number", nullable = false, length = 50)
    private String roomNumber;

    @Column(name = "monthly_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRent = BigDecimal.ZERO;

    @Column(name = "electricity_per_unit", nullable = false, precision = 10, scale = 2)
    private BigDecimal electricityPerUnit = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = "vacant"; // vacant or occupied

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    private String tenantName;

    @Transient
    private Long tenantId;

    public Room() {}

    public Room(Building building, String roomNumber, BigDecimal monthlyRent, BigDecimal electricityPerUnit, String status) {
        this.building = building;
        this.roomNumber = roomNumber;
        this.monthlyRent = monthlyRent != null ? monthlyRent : BigDecimal.ZERO;
        this.electricityPerUnit = electricityPerUnit != null ? electricityPerUnit : BigDecimal.ZERO;
        this.status = (status != null && !status.isBlank()) ? status : "vacant";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Building getBuilding() { return building; }
    public void setBuilding(Building building) { this.building = building; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    public BigDecimal getElectricityPerUnit() { return electricityPerUnit; }
    public void setElectricityPerUnit(BigDecimal electricityPerUnit) { this.electricityPerUnit = electricityPerUnit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
}

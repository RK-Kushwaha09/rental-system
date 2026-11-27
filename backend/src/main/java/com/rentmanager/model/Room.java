package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String roomCode; // e.g. "room-101"

    @Column(nullable = false)
    private String roomNumber; // e.g. "101", "204"

    private String floor; // e.g. "Ground Fl", "1st Floor"

    private String roomType; // e.g. "Standard Deluxe", "Master Suite", "Corner Balcony"

    private String status; // "OCCUPIED", "VACANT"

    private Double monthlyRent; // 8000.0

    private Boolean isCustomRent = false;

    private Double electricityRate; // 8.5

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    @JsonIgnoreProperties({"rooms", "hibernateLazyInitializer", "handler"})
    private Property property;

    @OneToOne(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"room", "hibernateLazyInitializer", "handler"})
    private Tenant tenant;

    @OneToOne(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"room", "hibernateLazyInitializer", "handler"})
    private SubMeter subMeter;

    public Room() {
    }

    public Room(String roomCode, String roomNumber, String floor, String roomType,
                String status, Double monthlyRent, Boolean isCustomRent, Double electricityRate,
                Property property) {
        this.roomCode = roomCode;
        this.roomNumber = roomNumber;
        this.floor = floor;
        this.roomType = roomType;
        this.status = status;
        this.monthlyRent = monthlyRent;
        this.isCustomRent = isCustomRent != null ? isCustomRent : false;
        this.electricityRate = electricityRate;
        this.property = property;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public String getRoomType() {
        return roomType;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(Double monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public Boolean getIsCustomRent() {
        return isCustomRent;
    }

    public void setIsCustomRent(Boolean isCustomRent) {
        this.isCustomRent = isCustomRent;
    }

    public Double getElectricityRate() {
        return electricityRate;
    }

    public void setElectricityRate(Double electricityRate) {
        this.electricityRate = electricityRate;
    }

    public Property getProperty() {
        return property;
    }

    public void setProperty(Property property) {
        this.property = property;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public SubMeter getSubMeter() {
        return subMeter;
    }

    public void setSubMeter(SubMeter subMeter) {
        this.subMeter = subMeter;
    }
}

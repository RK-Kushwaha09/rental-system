package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "properties")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String propertyCode; // e.g. "prop-shree-residency"

    @Column(nullable = false)
    private String propertyName; // e.g. "Shree Residency"

    private String address; // e.g. "Navrangpura, Ahmedabad, Gujarat"

    private String addressShort; // e.g. "Navrangpura, Ahmedabad • 5 Units"

    private String propertyType; // e.g. "CO-LIVING / PG"

    private String status; // e.g. "ACTIVE"

    private Double monthlyPotential; // e.g. 40500.0

    private Double defaultBaseRent; // e.g. 8000.0

    private Double defaultElectricityRate; // e.g. 8.5

    private String landlordVpa; // e.g. "shreeresidency@okhdfcbank"

    private String ownerName; // e.g. "Rajesh Patel"

    private String ownerPhone; // e.g. "+91 98250 00111"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Room> rooms = new ArrayList<>();

    private LocalDateTime createdAt;

    public Property() {
        this.createdAt = LocalDateTime.now();
    }

    public Property(String propertyCode, String propertyName, String address, String addressShort,
                    String propertyType, String status, Double monthlyPotential,
                    Double defaultBaseRent, Double defaultElectricityRate,
                    String landlordVpa, String ownerName, String ownerPhone) {
        this.propertyCode = propertyCode;
        this.propertyName = propertyName;
        this.address = address;
        this.addressShort = addressShort;
        this.propertyType = propertyType;
        this.status = status;
        this.monthlyPotential = monthlyPotential;
        this.defaultBaseRent = defaultBaseRent;
        this.defaultElectricityRate = defaultElectricityRate;
        this.landlordVpa = landlordVpa;
        this.ownerName = ownerName;
        this.ownerPhone = ownerPhone;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPropertyCode() {
        return propertyCode;
    }

    public void setPropertyCode(String propertyCode) {
        this.propertyCode = propertyCode;
    }

    public String getPropertyName() {
        return propertyName;
    }

    public void setPropertyName(String propertyName) {
        this.propertyName = propertyName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getAddressShort() {
        return addressShort;
    }

    public void setAddressShort(String addressShort) {
        this.addressShort = addressShort;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getMonthlyPotential() {
        return monthlyPotential;
    }

    public void setMonthlyPotential(Double monthlyPotential) {
        this.monthlyPotential = monthlyPotential;
    }

    public Double getDefaultBaseRent() {
        return defaultBaseRent;
    }

    public void setDefaultBaseRent(Double defaultBaseRent) {
        this.defaultBaseRent = defaultBaseRent;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("defaultMonthlyRent")
    public Double getDefaultMonthlyRent() {
        return defaultBaseRent;
    }

    public Double getDefaultElectricityRate() {
        return defaultElectricityRate;
    }

    public void setDefaultElectricityRate(Double defaultElectricityRate) {
        this.defaultElectricityRate = defaultElectricityRate;
    }

    public String getLandlordVpa() {
        return landlordVpa;
    }

    public void setLandlordVpa(String landlordVpa) {
        this.landlordVpa = landlordVpa;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getOwnerPhone() {
        return ownerPhone;
    }

    public void setOwnerPhone(String ownerPhone) {
        this.ownerPhone = ownerPhone;
    }

    public List<Room> getRooms() {
        return rooms;
    }

    public void setRooms(List<Room> rooms) {
        this.rooms = rooms;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}

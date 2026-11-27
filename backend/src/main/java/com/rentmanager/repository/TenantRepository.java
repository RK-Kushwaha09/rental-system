package com.rentmanager.repository;

import com.rentmanager.model.Property;
import com.rentmanager.model.Room;
import com.rentmanager.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByTenantCode(String tenantCode);
    Optional<Tenant> findByRoomId(Long roomId);
    Optional<Tenant> findByRoom(Room room);
    List<Tenant> findByAgreementStatus(String agreementStatus);
    List<Tenant> findByProperty(Property property);
    List<Tenant> findByPropertyId(Long propertyId);

    @Query("SELECT t FROM Tenant t LEFT JOIN FETCH t.room r LEFT JOIN FETCH t.property p WHERE t.property = :property OR r.property = :property ORDER BY r.roomNumber ASC")
    List<Tenant> findByPropertyOrRoomProperty(@Param("property") Property property);

    Optional<Tenant> findByIdAndProperty(Long id, Property property);
    Optional<Tenant> findByTenantCodeAndProperty(String tenantCode, Property property);
}

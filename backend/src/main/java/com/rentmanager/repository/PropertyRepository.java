package com.rentmanager.repository;

import com.rentmanager.model.Property;
import com.rentmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    Optional<Property> findByPropertyCode(String propertyCode);
    Optional<Property> findFirstByOrderByIdAsc();
    Optional<Property> findFirstByUserOrderByIdDesc(User user);
    Optional<Property> findFirstByUserOrderByIdAsc(User user);
    List<Property> findByUser(User user);
    boolean existsByUser(User user);
    Optional<Property> findByIdAndUser(Long id, User user);
    Optional<Property> findByPropertyCodeAndUser(String propertyCode, User user);
}

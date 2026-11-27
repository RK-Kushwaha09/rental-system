package com.rentmanager.repository;

import com.rentmanager.model.SubMeter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubMeterRepository extends JpaRepository<SubMeter, Long> {
    Optional<SubMeter> findByMeterCode(String meterCode);
    Optional<SubMeter> findByRoomId(Long roomId);
}

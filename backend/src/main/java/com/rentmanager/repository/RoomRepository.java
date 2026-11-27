package com.rentmanager.repository;

import com.rentmanager.model.Property;
import com.rentmanager.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomCode(String roomCode);
    Optional<Room> findByRoomNumber(String roomNumber);
    List<Room> findByPropertyId(Long propertyId);
    List<Room> findByProperty(Property property);
    List<Room> findByPropertyIdOrderByRoomNumberAsc(Long propertyId);
    List<Room> findByStatus(String status);
    Optional<Room> findByPropertyAndRoomCode(Property property, String roomCode);
    Optional<Room> findByPropertyAndRoomNumber(Property property, String roomNumber);
    Optional<Room> findByPropertyIdAndRoomNumber(Long propertyId, String roomNumber);
    Optional<Room> findByPropertyAndId(Property property, Long id);
}

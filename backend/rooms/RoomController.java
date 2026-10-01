package rooms;

import buildings.Building;
import buildings.BuildingRepository;
import common.ApiResponse;
import tenants.Tenant;
import tenants.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomRepository roomRepository;
    private final BuildingRepository buildingRepository;
    private final TenantRepository tenantRepository;

    public RoomController(RoomRepository roomRepository,
                          BuildingRepository buildingRepository,
                          TenantRepository tenantRepository) {
        this.roomRepository = roomRepository;
        this.buildingRepository = buildingRepository;
        this.tenantRepository = tenantRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Room>>> getAllRooms(
            @RequestParam(name = "building_id", required = false) Long buildingId) {
        List<Room> rooms = (buildingId != null && buildingId > 0)
                ? roomRepository.findByBuildingId(buildingId)
                : roomRepository.findAll();

        for (Room room : rooms) {
            Optional<Tenant> tenantOpt = tenantRepository.findByRoomId(room.getId());
            if (tenantOpt.isPresent()) {
                Tenant t = tenantOpt.get();
                room.setTenantId(t.getId());
                room.setTenantName(t.getName());
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Room>> getRoomById(@PathVariable Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + id));
        tenantRepository.findByRoomId(room.getId()).ifPresent(t -> {
            room.setTenantId(t.getId());
            room.setTenantName(t.getName());
        });
        return ResponseEntity.ok(ApiResponse.ok(room));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Room>> createRoom(@RequestBody Map<String, Object> body) {
        Long buildingId = Long.valueOf(body.get("buildingId").toString());
        String roomNumber = body.get("roomNumber").toString().trim();
        BigDecimal rent = new BigDecimal(body.getOrDefault("monthlyRent", 0).toString());
        BigDecimal electricityRate = new BigDecimal(body.getOrDefault("electricityPerUnit", 0).toString());

        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("Building not found with id: " + buildingId));

        if (roomRepository.findByBuildingIdAndRoomNumber(building.getId(), roomNumber).isPresent()) {
            throw new IllegalStateException("Room number " + roomNumber + " already exists in this building");
        }

        Room room = new Room(building, roomNumber, rent, electricityRate, "vacant");
        return ResponseEntity.ok(ApiResponse.ok("Room added successfully", roomRepository.save(room)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Room>> updateRoomPricing(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + id));

        if (body.containsKey("monthly_rent")) {
            room.setMonthlyRent(new BigDecimal(body.get("monthly_rent").toString()));
        }
        if (body.containsKey("electricity_per_unit")) {
            room.setElectricityPerUnit(new BigDecimal(body.get("electricity_per_unit").toString()));
        }
        return ResponseEntity.ok(ApiResponse.ok("Room updated successfully", roomRepository.save(room)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(@PathVariable Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + id));

        Optional<Tenant> tenant = tenantRepository.findByRoomId(id);
        if (tenant.isPresent()) {
            throw new IllegalStateException("Cannot delete room with active tenant: " + tenant.get().getName());
        }

        roomRepository.delete(room);
        return ResponseEntity.ok(ApiResponse.ok("Room deleted successfully", null));
    }
}

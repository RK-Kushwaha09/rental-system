package buildings;

import common.ApiResponse;
import rooms.RoomRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/buildings")
@CrossOrigin(origins = "*")
public class BuildingController {

    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;

    public BuildingController(BuildingRepository buildingRepository, RoomRepository roomRepository) {
        this.buildingRepository = buildingRepository;
        this.roomRepository = roomRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Building>>> getAllBuildings() {
        List<Building> list = buildingRepository.findAll();
        for (Building b : list) {
            b.setRoomCount(roomRepository.countByBuildingId(b.getId()));
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Building>> getBuildingById(@PathVariable Long id) {
        Building b = buildingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Building not found with id: " + id));
        b.setRoomCount(roomRepository.countByBuildingId(b.getId()));
        return ResponseEntity.ok(ApiResponse.ok(b));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Building>> createBuilding(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String address = body.getOrDefault("address", "");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Building name is required");
        }
        Building created = buildingRepository.save(new Building(name.trim(), address.trim()));
        return ResponseEntity.ok(ApiResponse.ok("Building added successfully", created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBuilding(@PathVariable Long id) {
        if (!buildingRepository.existsById(id)) {
            throw new IllegalArgumentException("Building not found with id: " + id);
        }
        buildingRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Building deleted successfully", null));
    }
}

package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/inventory/stock") @RequiredArgsConstructor
public class StockController {
    private final StockService stock;

    @GetMapping("/balance")
    public Map<String,Object> balance(@RequestParam String itemCode,
                                      @RequestParam(required=false) String location,
                                      @RequestParam(required=false) String batchNo) {
        return Map.of("itemCode", itemCode,
                "location", location == null ? "" : location,
                "onHand", stock.onHand(itemCode, location, batchNo));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/availability/check")
    public List<Map<String,Object>> check(@RequestBody Map<String,Object> body) {
        List<Map<String,Object>> lines = (List<Map<String,Object>>) body.getOrDefault("lines", List.of());
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> l : lines) {
            String item = String.valueOf(l.get("itemCode"));
            String loc = String.valueOf(l.get("location"));
            out.add(Map.of("itemCode", item, "location", loc,
                    "availableQty", stock.available(item, loc)));
        }
        return out;
    }
}
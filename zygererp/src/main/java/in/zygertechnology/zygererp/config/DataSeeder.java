package in.zygertechnology.zygererp.config;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.List;

@Component @Profile("dev") @RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users; private final ItemRepository items;
    private final PartyRepository parties; private final LocationRepository locs;
    private final RefDocRepository refs; private final PasswordEncoder enc;

    @Override public void run(String... args) {
        if (users.count() == 0)
            users.save(AppUser.builder().username("demo")
                    .password(enc.encode("demo123")).role("STORE_MANAGER").build());

        if (items.count() == 0) items.saveAll(List.of(
                item("RM-SS304-20","SS304 Round Bar Ø20","KG","Raw Material",285,200,true,true),
                item("RM-EN8-25","EN8 Bright Bar Ø25","KG","Raw Material",118,250,true,true),
                item("MFG-0001","Gear Plate","NOS","Finished Goods",456,10,true,true),
                item("FG-SHAFT-101","Spindle Shaft P/N 101","NOS","Finished Goods",8600,10,true,false),
                item("CONS-CNMG","Turning Insert CNMG 120408","NOS","Consumables",620,40,true,false)));

        if (parties.count() == 0) parties.saveAll(List.of(
                Party.builder().kind("SUPPLIER").code("SUP-01").name("Nirmal B").build(),
                Party.builder().kind("SUPPLIER").code("SUP-02").name("Tata Steel Distribution").build(),
                Party.builder().kind("CUSTOMER").code("CUS-01").name("Ashok Gears").build()));

        if (locs.count() == 0) locs.saveAll(List.of(
                LocationMaster.builder().code("RM-A-12").active(true).build(),
                LocationMaster.builder().code("RM-A-01").active(true).build(),
                LocationMaster.builder().code("FG-01").active(true).build(),
                LocationMaster.builder().code("WIP-01").active(true).build()));

        if (refs.count() == 0) refs.saveAll(List.of(
                RefDoc.builder().kind("PO").number("PO-24-001").refCode("SUP-01").status("APPROVED").build(),
                RefDoc.builder().kind("JO").number("JO-24-001").refCode("FG-SHAFT-101").status("APPROVED").build(),
                RefDoc.builder().kind("LO").number("LO-24-001").refCode("SUP-03").status("APPROVED").build()));
    }

    private ItemMaster item(String c,String d,String u,String cat,int r,int s,boolean b,boolean h){
        return ItemMaster.builder().code(c).description(d).uom(u).category(cat)
                .defaultRate(BigDecimal.valueOf(r)).safetyStock(BigDecimal.valueOf(s))
                .requiresBatch(b).requiresHeat(h).active(true).build();
    }
}

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.bak" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const federalReps = [
  { code: "FC01", name: "Hon. Abdullahi Balarabe Dabai", photo: "/media/candidates/bakori_danja.jpg" },
  { code: "FC02", name: "Hon. Usman Banye (Usmaniyya)", photo: "/media/candidates/batagarawa_charanchi_rimi.jpg" },
  { code: "FC03", name: "Hon. Abubakar Aliyu Iliyasu", photo: "/media/candidates/batsari_safana_danmusa.jpg" },
  { code: "FC04", name: "Hon. Ahmed Sale Junior", photo: "/media/candidates/bindawa_mani.jpg" },
  { code: "FC05", name: "Hon. Yusuf Muhammad Buhari", photo: "/media/candidates/daura_sandamu_maiadua.jpg" },
  { code: "FC06", name: "Hon. Aminu Balele Dan-Arewa", photo: "/media/candidates/dutsinma_kurfi.jpg" },
  { code: "FC07", name: "Hon. Hamza Sule Faskari", photo: "/media/candidates/faskari_kankara_sabuwa.jpg" },
  { code: "FC08", name: "Hon. Ya'u Nowa", photo: "/media/candidates/funtua_dandume.jpg" },
  { code: "FC09", name: "Hon. Mustapha Kanti Bello", photo: "/media/candidates/ingawa_kankia_kusada.jpg" },
  { code: "FC10", name: "Hon. Sada Soli Jibia", photo: "/media/candidates/jibia_kaita.jpg" },
  { code: "FC11", name: "Abba Mangal", photo: "/media/candidates/katsina.jpg" },
  { code: "FC12", name: "Hon. Aminu Ibrahim", photo: "/media/candidates/malumfashi_kafur.jpg" },
  { code: "FC13", name: "Hon. Salisu Yusuf Majigiri", photo: "/media/candidates/mashi_dutsi.jpg" },
  { code: "FC14", name: "Hon. Abdullahi Ahmad (Talban Musawa)", photo: "/media/candidates/matazu_musawa.jpg" },
  { code: "FC15", name: "Hon. Muhammad Daha Umar Farouk", photo: "/media/candidates/zango_baure.jpg" }
];

const senatorialLeaders = [
  { code: "KN", name: "Rt. Hon. Nasiru Yahaya Daura", photo: "/media/candidates/daura_zone.jpg" },
  { code: "KC", name: "Sen. AbdulAziz Musa Yar'adua", photo: "/media/candidates/katsina_central.jpg" },
  { code: "KS", name: "Sen. Muntari Muhammad Dandutse", photo: "/media/candidates/funtua_zone.jpg" }
];

async function updateCandidates() {
  console.log("Updating Federal Reps...");
  for (const rep of federalReps) {
    const { error } = await supabase
      .from("federal_reps")
      .update({ rep_name: rep.name, photo_url: rep.photo })
      .eq("constituency_code", rep.code);
    
    if (error) console.error(`Error updating ${rep.code}:`, error);
    else console.log(`Updated ${rep.code} to ${rep.name}`);
  }

  console.log("\nUpdating Senatorial Leaders...");
  for (const sen of senatorialLeaders) {
    const { error } = await supabase
      .from("senatorial_leaders")
      .update({ leader_name: sen.name, photo_url: sen.photo })
      .eq("zone_code", sen.code);
    
    if (error) console.error(`Error updating ${sen.code}:`, error);
    else console.log(`Updated ${sen.code} to ${sen.name}`);
  }

  console.log("\nDone!");
}

updateCandidates();

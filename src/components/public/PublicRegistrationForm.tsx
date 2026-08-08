"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  KATSINA_LGAS,
  getWardsForLga,
  getPollingUnitObjects,
  getStandardPuCode,
  generateSequentialMembershipId,
  insertNewVoterToRegistry,
} from "@/lib/campaign-data";
import { createClient } from "@supabase/supabase-js";
import { SchoolSelect } from "@/components/common/SchoolSelect";
import { STUDENT_INSTITUTIONS } from "@/data/student_institutions";
import { NIGERIAN_BANKS } from "@/data/nigerian_banks";

const CAMPAIGN_SUPABASE_URL = "https://qkjscvmrqkxbzflowrox.supabase.co";
const CAMPAIGN_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34";

const publicSupabase = createClient(CAMPAIGN_SUPABASE_URL, CAMPAIGN_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    storageKey: "sb-public-register-auth-token",
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  votersCardId: string;
  phone: string;
  email: string;
  socialMediaHandle: string;
  lga: string;
  ward: string;
  pollingUnit: string;
  pollingUnitId: string;
  maritalStatus: string;
  occupation: string;
  bankName: string;
  accountNumber: string;
  declaration: boolean;
  pvcStatus: string;

  // Conditional occupation subfields
  subTrader: string;
  otherTrader: string;
  studentInstitution: string;
  otherInstitution: string;
  businessSector: string;
  otherBusiness: string;
  teacherSchoolLevel: string;
  teacherSchoolName: string;
  otherTeacherSchoolName: string;
  farmerLga: string;
  farmerWard: string;
  farmerSize: string;
  farmerSeasonalType: string;
  civilServantJurisdiction: string;
  civilServantMinistry: string;
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  votersCardId: "",
  phone: "",
  email: "",
  socialMediaHandle: "",
  lga: "",
  ward: "",
  pollingUnit: "",
  pollingUnitId: "",
  maritalStatus: "",
  occupation: "",
  bankName: "",
  accountNumber: "",
  declaration: false,
  pvcStatus: "collected",

  subTrader: "",
  otherTrader: "",
  studentInstitution: "",
  otherInstitution: "",
  businessSector: "",
  otherBusiness: "",
  teacherSchoolLevel: "",
  teacherSchoolName: "",
  otherTeacherSchoolName: "",
  farmerLga: "",
  farmerWard: "",
  farmerSize: "",
  farmerSeasonalType: "",
  civilServantJurisdiction: "",
  civilServantMinistry: "",
};

const OCCUPATIONS = [
  "Student","Farmer","Trader","Teacher","Civil Servant",
  "Business Owner","Artisan","Housewife","Retired","Unemployed","Other",
];

const BANKS = NIGERIAN_BANKS;

const TRADER_SUB_TRADES = [
  "Grain / Produce Merchant (Mai Hatsi)",
  "Livestock Trader (Mai Dabbobi)",
  "Textile / Wrapper Dealer (Mai Atamfa da Yadudduka)",
  "Provisions Shop Owner (Mai Kantin Shago)",
  "Tea & Bread Vendor (Mai Shayi da Buredi)",
  "Perishable Goods / Vegetable Vendor (Mai Kayan Miya)",
  "Mobile Phone Accessory / Charging Point (Mai Charge da Waya)",
  "POS Agent / Mobile Money Operator (Mai POS)",
  "Butcher / Meat Vendor (Mai Naman Shanu/Akuya)",
  "Cosmetics & Perfume Seller (Mai Kayan Kwalliya)",
  "Footwear & Shoe Dealer (Mai Takalma)",
  "Hardware & Building Materials (Mai Kayan Gini)",
  "Auto / Motorcycle Spare Parts (Mai Kayan Mota da Keke)",
  "Second-Hand Clothes Merchant (Mai Gwanjo)",
  "Gold & Silver Goldsmith (Mai Gyaran Gwal)",
  "Charcoal / Firewood Seller (Mai Gawayi da Itace)",
  "Catering / Cooked Food Vendor (Mai Abinci)",
  "Cement Dealer (Mai Simenti)",
  "Plastic Ware & Kitchen Utensils (Mai Kayan Robobi)",
  "Electrical Appliances Dealer (Mai Kayan Wutar Lantarki)",
  "Tailoring Materials Merchant (Mai Kayan Dinki)",
  "Other Trader"
];

// STUDENT_INSTITUTIONS imported from @/data/student_institutions

const BUSINESS_SECTORS = [
  "Commercial Transport Fleet (Mota/Buses)",
  "Tricycle Operations Owner (Keke Napep Fleet)",
  "Commercial Motorcycle Fleet (Achaba Operator)",
  "Pharmacy / Wholesale Chemist",
  "Patent Medicine Store (Local Chemist Shop)",
  "Block Industry & Concrete Molding Yard",
  "Tailoring & Embroidery Fashion Center",
  "Computer Cyber Café & IT Support Center",
  "Welding & Iron Fabrication Workshop",
  "Carpentry & Furniture Showroom",
  "Grain Milling & Agro-Processing Factory (Gidan Nika)",
  "Bakery / Confectionery Factory",
  "Dry Cleaning & Laundry Business",
  "Barbing / Hair Dressing Salon",
  "Poultry / Livestock Farm Enterprise",
  "Pure Water / Sachet Water Factory",
  "Car Wash Outlet",
  "Printing Press & Graphic Design Studio",
  "Scrap Metal Yard (Mai Kayan Ruwa)",
  "Electrical / Solar Installation Agency",
  "Artisan Workshop (Mechanic, Panel Beater)",
  "Other / Unknown Business"
];

const KATSINA_MINISTRIES = [
  "Ministry of Agriculture and Natural Resources",
  "Ministry of Education",
  "Ministry of Health",
  "Ministry of Finance",
  "Ministry of Works, Housing and Transport",
  "Ministry of Justice",
  "Ministry of Local Government and Chieftaincy Affairs",
  "Ministry of Information, Culture and Home Affairs",
  "Ministry of Environment",
  "Ministry of Women Affairs and Social Development",
  "Ministry of Youth and Sports Development",
  "Ministry of Water Resources",
  "Ministry of Commerce, Industry and Tourism",
  "Ministry of Lands and Physical Planning",
  "Ministry of Religious Affairs",
  "Katsina State Internal Revenue Service",
  "State Emergency Management Agency (SEMA)",
  "Other Ministry / Parastatal"
];

const KATSINA_SECONDARY_SCHOOLS = [
  "Government College, Katsina",
  "Government Pilot Secondary School, Katsina",
  "Government Girls College, Katsina",
  "Government Girls Unity Secondary School, Daura",
  "Government Science Secondary School, Funtua",
  "Government Science Secondary School, Katsina",
  "Government Secondary School, Dutsin-Ma",
  "Government Secondary School, Malumfashi",
  "Government Secondary School, Mani",
  "Government Secondary School, Kankia",
  "Government Day Secondary School, Katsina",
  "Family Support Program (FSP) Secondary School, Katsina",
  "Other Secondary School"
];

const STEPS = ["Location", "Personal", "Details", "Confirm"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateMembershipId() {
  return `DR-${Date.now().toString(36).toUpperCase()}`;
}

// Helper to generate a client-side UUID v4
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function notifyPUAgent(
  pollingUnitName: string,
  lga: string,
  ward: string,
  memberName: string,
  membershipId: string,
) {
  try {
    // Look up the polling unit agent for this PU
    const { data: agent } = await (publicSupabase as any)
      .from("polling_unit_agents")
      .select("user_id, agent_name")
      .eq("polling_unit_name", pollingUnitName)
      .eq("lga", lga)
      .eq("ward", ward)
      .maybeSingle();

    const notificationId = generateUUID();

    // Create broadcast notification
    const { error: notifErr } = await (publicSupabase as any)
      .from("broadcast_notifications")
      .insert({
        id: notificationId,
        title: "🆕 New Self-Registration",
        message: `${memberName} (ID: ${membershipId}) from ${pollingUnitName}, ${ward} has self-registered and is pending your review.`,
        type: "alert",
        target_lgas: [lga],
        target_wards: [ward],
        is_sent: true,
        sent_at: new Date().toISOString(),
        recipient_count: agent ? 1 : 0,
      });

    if (notifErr) return;

    // Deliver to the specific agent's user account if found
    if (agent?.user_id) {
      await (publicSupabase as any)
        .from("notification_recipients")
        .insert({
          notification_id: notificationId,
          user_id: agent.user_id,
          is_read: false,
          delivered_at: new Date().toISOString(),
        });
    }
  } catch (_) {
    // Notification failure is non-fatal — member is already saved
  }
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? "#1a5c2a" : active ? "#fff" : "#e5e7eb",
                border: active ? "2.5px solid #1a5c2a" : done ? "none" : "2px solid #d1d5db",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13,
                color: done ? "#fff" : active ? "#1a5c2a" : "#9ca3af",
                transition: "all 0.2s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? "#1a5c2a" : done ? "#374151" : "#9ca3af",
                letterSpacing: 0.3,
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 48, height: 2,
                background: done ? "#1a5c2a" : "#e5e7eb",
                margin: "0 4px", marginBottom: 18,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field Components ─────────────────────────────────────────────────────────
function Field({ label, required, children, error }: {
  label: string; required?: boolean; children: React.ReactNode; error?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, padding: "0 12px",
  border: "1.5px solid #d1d5db", borderRadius: 8,
  fontSize: 14, background: "#fff", outline: "none",
  color: "#111", fontFamily: "inherit",
  boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none", cursor: "pointer" };

// ─── Radio Group ─────────────────────────────────────────────────────────────
function RadioGroup({ name, options, value, onChange }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {options.map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151" }}>
          <div
            onClick={() => onChange(opt.toLowerCase())}
            style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `2px solid ${value === opt.toLowerCase() ? "#1a5c2a" : "#9ca3af"}`,
              background: value === opt.toLowerCase() ? "#1a5c2a" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {value === opt.toLowerCase() && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
            )}
          </div>
          {opt}
        </label>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PublicRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [agentProfile, setAgentProfile] = useState<any>(null);

  // Check active session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await publicSupabase.auth.getSession();
      if (session?.user) {
        // Verify agent
        const { data: agentData } = await publicSupabase
          .from("polling_unit_agents")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (agentData) {
          setAgentProfile(agentData);
          setIsAuthenticated(true);
          // Pre-populate form with agent's PU details
          setForm(f => ({
            ...f,
            lga: agentData.lga,
            ward: agentData.ward,
            pollingUnit: agentData.polling_unit_name,
            pollingUnitId: agentData.polling_unit_id
          }));
        } else {
          await publicSupabase.auth.signOut();
        }
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const { data, error } = await publicSupabase.auth.signInWithPassword({
        email: agentEmail,
        password: agentPassword,
      });

      if (error) {
        setLoginError(error.message || "Invalid email or password");
        setIsLoggingIn(false);
        return;
      }

      // Verify agent
      const { data: agentData, error: agentError } = await publicSupabase
        .from("polling_unit_agents")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (agentError || !agentData) {
        await publicSupabase.auth.signOut();
        setLoginError("Access denied. Only registered Polling Unit Agents can login.");
        setIsLoggingIn(false);
        return;
      }

      setAgentProfile(agentData);
      setIsAuthenticated(true);
      
      // Pre-populate form
      setForm(f => ({
        ...f,
        lga: agentData.lga,
        ward: agentData.ward,
        pollingUnit: agentData.polling_unit_name,
        pollingUnitId: agentData.polling_unit_id
      }));

    } catch (err: any) {
      setLoginError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [puVoters, setPuVoters] = useState<any[]>([]);
  const [puVotersLoading, setPuVotersLoading] = useState(false);
  const [puVoterSearch, setPuVoterSearch] = useState("");
  const [showManualPvcOption, setShowManualPvcOption] = useState(false);
  const [matchedVoter, setMatchedVoter] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<any[]>([]);

  // Fetch voters for the selected Polling Unit
  useEffect(() => {
    const fetchPuVoters = async () => {
      if (!form.lga || !form.ward || !form.pollingUnit) {
        setPuVoters([]);
        return;
      }
      
      setPuVotersLoading(true);
      try {
        let puCode = null;
        
        // 1. Try to resolve code directly from Supabase DB using pollingUnitId
        if (form.pollingUnitId && !form.pollingUnitId.startsWith('virtual-')) {
          try {
            const { data: puData } = await publicSupabase
              .from("polling_units")
              .select("code")
              .eq("id", form.pollingUnitId)
              .maybeSingle();
              
            if (puData?.code) {
              puCode = puData.code;
            }
          } catch (dbErr) {
            console.error("Error fetching PU code from database:", dbErr);
          }
        }
        
        // 2. Fall back to local name lookup
        if (!puCode) {
          const puObj = getPollingUnitObjects(form.lga, form.ward).find(
            pu => pu.name === form.pollingUnit
          );
          if (puObj?.code) {
            puCode = puObj.code;
          }
        }
        
        if (!puCode) {
          setPuVoters([]);
          return;
        }

        const standardCode = getStandardPuCode(form.lga, puCode);
        
        const { data, error } = await publicSupabase
          .from("voter_registry")
          .select("*")
          .eq("polling_unit_code", standardCode)
          .order("full_name", { ascending: true });
          
        if (error) throw error;
        setPuVoters(data || []);
      } catch (err) {
        console.error("Error fetching voters for polling unit:", err);
      } finally {
        setPuVotersLoading(false);
      }
    };
    
    fetchPuVoters();
  }, [form.lga, form.ward, form.pollingUnit, form.pollingUnitId]);

  // Helper to split full name from voter registry
  function splitVoterName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return { firstName, lastName };
  }

  // Helper to map gender
  function mapVoterGender(g: string | null) {
    if (!g) return "";
    if (g.toUpperCase() === "M") return "male";
    if (g.toUpperCase() === "F") return "female";
    return g.toLowerCase();
  }

  // Helper to map birth year to approximate date
  function voterDobToDate(year: number | null) {
    if (!year) return "";
    return `${year}-01-01`;
  }

  const applyVoter = (voter: any) => {
    const { firstName, lastName } = splitVoterName(voter.full_name);
    setMatchedVoter(voter);
    setLookupError(null);
    setNameResults([]);
    setForm((prev) => ({
      ...prev,
      firstName,
      lastName,
      gender: mapVoterGender(voter.gender) || prev.gender,
      dateOfBirth: voterDobToDate(voter.dob_year) || prev.dateOfBirth,
      votersCardId: voter.vin,
      pvcStatus: "collected",
    }));
  };

  const handleNameSearch = async () => {
    if (!form.lga || !form.ward) {
      setLookupError("Please select LGA and Ward first.");
      return;
    }
    setLookupError(null);
    setSearching(true);
    try {
      const { data, error } = await publicSupabase
        .from("voter_registry")
        .select("*")
        .eq("lga", form.lga)
        .eq("ward", form.ward)
        .ilike("full_name", `%${nameQuery.trim()}%`)
        .order("full_name", { ascending: true })
        .limit(200);

      if (error) throw error;

      setNameResults(data || []);
      if (!data || data.length === 0) {
        setLookupError("No registered voters match that name in this ward.");
      }
    } catch {
      setLookupError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [wards, setWards] = useState<string[]>([]);
  const [pollingUnits, setPollingUnits] = useState<{ name: string; id?: string }[]>([]);

  // Farmer's farm location wards
  const [farmWards, setFarmWards] = useState<string[]>([]);

  // Cascade: LGA → wards
  useEffect(() => {
    if (form.lga) {
      setWards(getWardsForLga(form.lga));
      if (!isAuthenticated) {
        setForm(f => ({ ...f, ward: "", pollingUnit: "", pollingUnitId: "" }));
      }
    }
  }, [form.lga, isAuthenticated]);

  // Cascade: ward → polling units
  useEffect(() => {
    if (form.lga && form.ward) {
      const pus = getPollingUnitObjects(form.lga, form.ward);
      setPollingUnits(pus);
      if (!isAuthenticated) {
        setForm(f => ({ ...f, pollingUnit: "", pollingUnitId: "" }));
      }
    }
  }, [form.ward, form.lga, isAuthenticated]);

  // Cascade: Farmer farm LGA → farm wards
  useEffect(() => {
    if (form.farmerLga) {
      setFarmWards(getWardsForLga(form.farmerLga));
      setForm(f => ({ ...f, farmerWard: "" }));
    } else {
      setFarmWards([]);
    }
  }, [form.farmerLga]);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

  const setVal = (field: keyof FormData) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Validation ──
  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (s === 0) {
      if (!form.lga) errs.lga = "Required";
      if (!form.ward) errs.ward = "Required";
      if (!form.pollingUnit) errs.pollingUnit = "Required";
      if (!matchedVoter && !showManualPvcOption) {
        errs.pollingUnit = "Please select a voter from the list or click Add manually";
      }
    }
    if (s === 1) {
      if (!form.firstName.trim()) errs.firstName = "Required";
      if (!form.lastName.trim()) errs.lastName = "Required";
      if (!form.gender) errs.gender = "Required";
      if (!form.dateOfBirth) errs.dateOfBirth = "Required";
      if (!form.phone.trim()) errs.phone = "Required";
    }
    if (s === 2) {
      if (!form.maritalStatus) errs.maritalStatus = "Required";
      if (!form.occupation) errs.occupation = "Required";

      // Validate occupation conditional fields
      if (form.occupation === "Trader") {
        if (!form.subTrader) errs.subTrader = "Required";
        if (form.subTrader === "Other Trader" && !form.otherTrader.trim()) errs.otherTrader = "Required";
      } else if (form.occupation === "Student") {
        if (!form.studentInstitution) errs.studentInstitution = "Required";
        if (form.studentInstitution === "Other Higher Institution Outside Katsina" && !form.otherInstitution.trim()) errs.otherInstitution = "Required";
      } else if (form.occupation === "Business Owner") {
        if (!form.businessSector) errs.businessSector = "Required";
        if (form.businessSector === "Other / Unknown Business" && !form.otherBusiness.trim()) errs.otherBusiness = "Required";
      } else if (form.occupation === "Teacher") {
        if (!form.teacherSchoolLevel) errs.teacherSchoolLevel = "Required";
        if (!form.teacherSchoolName) errs.teacherSchoolName = "Required";
        if (form.teacherSchoolName === "Other Secondary School" && !form.otherTeacherSchoolName.trim()) errs.otherTeacherSchoolName = "Required";
      } else if (form.occupation === "Farmer") {
        if (!form.farmerLga) errs.farmerLga = "Required";
        if (!form.farmerWard) errs.farmerWard = "Required";
        if (!form.farmerSize) errs.farmerSize = "Required";
        if (!form.farmerSeasonalType) errs.farmerSeasonalType = "Required";
      } else if (form.occupation === "Civil Servant") {
        if (!form.civilServantJurisdiction) errs.civilServantJurisdiction = "Required";
        if (form.civilServantJurisdiction === "State Ministry" && !form.civilServantMinistry) errs.civilServantMinistry = "Required";
      }
    }
    if (s === 3) {
      if (!form.declaration) errs.declaration = "You must accept the declaration";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep(s => s + 1);
  }
  function back() {
    setErrors({});
    setStep(s => s - 1);
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setSubmitStatus("1. Initializing registration details...");
    try {
      // Resolve final school name / school level (matching AddMemberModal.tsx)
      let finalOccupation = form.occupation || null;
      let finalSchoolName = null;
      let finalSchoolLevel = null;
      let resolvedPollingUnitId = form.pollingUnitId || null;
      let finalPollingUnitName = form.pollingUnit || null;

      if (finalOccupation === "Trader") {
        finalSchoolName = form.subTrader === "Other Trader" ? form.otherTrader : form.subTrader;
      } else if (finalOccupation === "Student") {
        finalSchoolName = form.studentInstitution === "Other Higher Institution Outside Katsina" ? form.otherInstitution : form.studentInstitution;
        finalSchoolLevel = "Tertiary";
      } else if (finalOccupation === "Business Owner") {
        finalSchoolName = form.businessSector === "Other / Unknown Business" ? form.otherBusiness : form.businessSector;
      } else if (finalOccupation === "Teacher") {
        finalSchoolLevel = form.teacherSchoolLevel;
        finalSchoolName = form.teacherSchoolLevel === "Secondary" && form.teacherSchoolName === "Other Secondary School"
          ? form.otherTeacherSchoolName
          : form.teacherSchoolName;
      } else if (finalOccupation === "Farmer") {
        finalSchoolName = `LGA: ${form.farmerLga || ""}, Ward: ${form.farmerWard || ""}`;
        finalSchoolLevel = `Size: ${form.farmerSize || "0"} ha, Season: ${form.farmerSeasonalType || ""}`;
      } else if (finalOccupation === "Civil Servant") {
        finalSchoolLevel = form.civilServantJurisdiction;
        finalSchoolName = form.civilServantJurisdiction === "State Ministry" ? form.civilServantMinistry : "";
      }

// Helper to wrap promises in a timeout to prevent hanging states
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise
  ]);
}

      if (form.lga && form.ward && form.pollingUnit) {
        const localPuObj = getPollingUnitObjects(form.lga, form.ward)
          .find(p => p.name === form.pollingUnit);
        
        const dbCode = localPuObj?.code || null;
        if (dbCode) {
          try {
            // Wrap the database lookup in a 4-second timeout to prevent indefinite hanging
            const puDataResult = await withTimeout(
              publicSupabase
                .from("polling_units")
                .select("id, name")
                .eq("lga_name", form.lga)
                .eq("ward_name", form.ward)
                .eq("code", dbCode)
                .maybeSingle(),
              4000,
              { data: null, error: null }
            );

            const { data: puData, error: puError } = puDataResult as any;

            if (!puError && puData) {
              resolvedPollingUnitId = puData.id;
              finalPollingUnitName = puData.name;
            }
          } catch (puQueryErr) {
            console.error("Non-blocking PU lookup error:", puQueryErr);
          }
        }
      }

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const membershipId = await generateSequentialMembershipId(
        form.lga,
        form.ward,
        finalPollingUnitName,
        form.votersCardId
      );

      let vinToUse = form.votersCardId || null;
      if (form.pvcStatus === "not collected") {
        if (!vinToUse) {
          const lgaAbbr = (form.lga || "UNK").toUpperCase().slice(0, 3);
          const wardAbbr = (form.ward || "W00").toUpperCase().slice(0, 3);
          const puMatch = (form.pollingUnit || "").match(/PU\s*(\d+)/i);
          const puNum = puMatch ? puMatch[1] : "000";
          const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
          vinToUse = `NC-${lgaAbbr}-${wardAbbr}-${puNum}-${randomStr}`;
        }
        
        await insertNewVoterToRegistry(
          fullName,
          form.lga,
          form.ward,
          finalPollingUnitName,
          vinToUse,
          form.gender,
          form.dateOfBirth
        );
      }

      setSubmitStatus("3. Saving member record to database...");
      let finalMembershipId = membershipId;

      // Wrap the member insert in an 8-second timeout to guarantee button resets on slow network
      let insertResult = await withTimeout(
        (publicSupabase as any)
          .from("members")
          .insert({
            full_name: fullName,
            membership_id: finalMembershipId,
            phone: form.phone || null,
            email: form.email || null,
            social_media_handle: form.socialMediaHandle || null,
            gender: form.gender || null,
            date_of_birth: form.dateOfBirth || null,
            voters_card_id: vinToUse,
            pvc_status: form.pvcStatus || 'collected',
            state: "Katsina",
            lga: form.lga || null,
            ward: form.ward || null,
            polling_unit: finalPollingUnitName,
            polling_unit_id: resolvedPollingUnitId,
            marital_status: form.maritalStatus || null,
            occupation: finalOccupation,
            school_name: finalSchoolName,
            school_level: finalSchoolLevel,
            bank_name: form.bankName || null,
            account_number: form.accountNumber || null,
            status: "pending",
            is_verified: false,
            created_by: agentProfile?.user_id || null,
          }),
        8000,
        { data: null, error: new Error("Network request timed out. Please try again.") }
      );

      let { error } = insertResult as any;

      // Fallback retry loop if a duplicate key (membership_id) error occurs
      let attempts = 0;
      while (error && attempts < 5) {
        const errMsg = (error.message || "").toLowerCase();
        const errCode = (error.code || "").toString();
        const isDuplicateKey =
          errCode === "23505" ||
          errMsg.includes("duplicate key") ||
          errMsg.includes("unique constraint") ||
          errMsg.includes("members_membership_id_key");

        if (!isDuplicateKey) break;

        attempts++;
        console.warn(`Duplicate key detected (Attempt ${attempts}/5). Retrying with guaranteed unique sequence...`);
        const freshSeq = (Math.floor(Date.now() / 1000) % 8999 + 1000).toString() + Math.floor(10 + Math.random() * 90).toString();
        const basePrefix = membershipId.split("-").slice(0, 3).join("-");
        finalMembershipId = `${basePrefix}-${freshSeq}`;

        const retryResult = await withTimeout(
          (publicSupabase as any)
            .from("members")
            .insert({
              full_name: fullName,
              membership_id: finalMembershipId,
              phone: form.phone || null,
              email: form.email || null,
              social_media_handle: form.socialMediaHandle || null,
              gender: form.gender || null,
              date_of_birth: form.dateOfBirth || null,
              voters_card_id: vinToUse,
              pvc_status: form.pvcStatus || 'collected',
              state: "Katsina",
              lga: form.lga || null,
              ward: form.ward || null,
              polling_unit: finalPollingUnitName,
              polling_unit_id: resolvedPollingUnitId,
              marital_status: form.maritalStatus || null,
              occupation: finalOccupation,
              school_name: finalSchoolName,
              school_level: finalSchoolLevel,
              bank_name: form.bankName || null,
              account_number: form.accountNumber || null,
              status: "pending",
              is_verified: false,
              created_by: agentProfile?.user_id || null,
            }),
          8000,
          { data: null, error: new Error("Network request timed out. Please try again.") }
        );
        error = (retryResult as any).error;
      }

      if (error) throw error;

      setSubmitStatus("4. Dispatching notification to Polling Unit Agent...");
      // Notify PU agent (non-blocking, wrapped so it cannot block redirection)
      try {
        notifyPUAgent(
          finalPollingUnitName,
          form.lga,
          form.ward,
          fullName,
          finalMembershipId,
        );
      } catch (notifyErr) {
        console.error("Non-blocking notification trigger error:", notifyErr);
      }

      setSubmitStatus("5. Completed! Redirecting to success card...");
      router.push(`/register/success?id=${finalMembershipId}&name=${encodeURIComponent(fullName)}&pu=${encodeURIComponent(form.pollingUnit)}`);
    } catch (err: any) {
      setSubmitStatus("");
      setErrors({ declaration: err?.message || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // Helper to format the display name of school/trade in Summary preview step
  function getPreviewDetails() {
    if (form.occupation === "Trader") {
      return ["Trade Name", form.subTrader === "Other Trader" ? form.otherTrader : form.subTrader];
    } else if (form.occupation === "Student") {
      return ["Institution", form.studentInstitution === "Other Higher Institution Outside Katsina" ? form.otherInstitution : form.studentInstitution];
    } else if (form.occupation === "Business Owner") {
      return ["Business Sector", form.businessSector === "Other / Unknown Business" ? form.otherBusiness : form.businessSector];
    } else if (form.occupation === "Teacher") {
      return ["School Level / Name", `${form.teacherSchoolLevel} - ${form.teacherSchoolName === "Other Secondary School" ? form.otherTeacherSchoolName : form.teacherSchoolName}`];
    } else if (form.occupation === "Farmer") {
      return ["Farm Location", `${form.farmerLga} LGA, ${form.farmerWard} Ward (${form.farmerSize} ha)`];
    } else if (form.occupation === "Civil Servant") {
      return ["Jurisdiction / Dept", `${form.civilServantJurisdiction} ${form.civilServantMinistry ? `- ${form.civilServantMinistry}` : ""}`];
    }
    return null;
  }

  const previewDetails = getPreviewDetails();

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0faf2 0%, #e8f5e9 50%, #f0f9ff 100%)", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 24, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: "50%", background: "#1a5c2a", color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 12, boxShadow: "0 4px 16px rgba(26,92,42,0.3)" }}>
          DR
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1a5c2a", margin: "0 0 4px" }}>
          Dikko Radda Campaign
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Katsina State — Member Self-Registration Portal
        </p>
        <div style={{ marginTop: 8, display: "inline-block", background: "linear-gradient(135deg,#fffbea,#fff8dc)", border: "1.5px solid #b8860b", borderRadius: 6, padding: "3px 12px" }}>
          <span style={{ fontSize: 11, color: "#7a5800", fontWeight: 700 }}>Proudly Sponsored by <strong>ABA &amp; SONS</strong></span>
        </div>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", padding: "32px 28px", boxSizing: "border-box" }}>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1a5c2a", textAlign: "center", marginBottom: 8 }}>
              Polling Unit Agent Login
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", margin: "0 0 12px" }}>
              Please sign in with your agent credentials to access the registration portal.
            </p>
            
            {loginError && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="agent@example.com"
                value={agentEmail}
                onChange={e => setAgentEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={agentPassword}
                onChange={e => setAgentPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #1a5c2a 0%, #154c22 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(26,92,42,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8
              }}
            >
              {isLoggingIn ? "Signing In..." : "Log In & Continue"}
            </button>
          </form>
        ) : (
          <>
            {/* Show Agent details with Logout button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "10px 14px", background: "#f0faf2", border: "1px solid #c2eec7", borderRadius: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, color: "#1a5c2a", fontWeight: 700 }}>
                  Agent: {agentProfile?.agent_name}
                </span>
                <span style={{ fontSize: 11, color: "#4b5563" }}>
                  Cell: {agentProfile?.polling_unit_name}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await publicSupabase.auth.signOut();
                  setIsAuthenticated(false);
                  setForm(INITIAL_FORM);
                  setAgentProfile(null);
                }}
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                Logout
              </button>
            </div>

            <StepIndicator current={step} />

            {/* ── STEP 0: Location & Polling Unit ── */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 20 }}>Location &amp; Polling Unit</h2>
                <Field label="Local Government Area (LGA)" required error={errors.lga}>
                  <select style={selectStyle} value={form.lga} onChange={set("lga")} disabled={isAuthenticated}>
                    <option value="">-- Select LGA --</option>
                    {KATSINA_LGAS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Ward" required error={errors.ward}>
                  <select style={selectStyle} value={form.ward} onChange={set("ward")} disabled={isAuthenticated || !form.lga}>
                    <option value="">{form.lga ? "-- Select Ward --" : "Select LGA first"}</option>
                    {form.ward && <option value={form.ward}>{form.ward}</option>}
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
                <Field label="Polling Unit" required error={errors.pollingUnit}>
                  <select
                    style={selectStyle}
                    value={form.pollingUnit}
                    onChange={e => {
                      const pu = pollingUnits.find(p => p.name === e.target.value);
                      setForm(f => ({ ...f, pollingUnit: e.target.value, pollingUnitId: (pu as any)?.id || "" }));
                      setMatchedVoter(null);
                      setShowManualPvcOption(false);
                    }}
                    disabled={isAuthenticated || !form.ward}
                  >
                    <option value="">{form.ward ? "-- Select Polling Unit --" : "Select Ward first"}</option>
                    {form.pollingUnit && <option value={form.pollingUnit}>{form.pollingUnit}</option>}
                    {pollingUnits.map(pu => <option key={pu.name} value={pu.name}>{pu.name}</option>)}
                  </select>
                </Field>

            {/* Polling Unit Voters */}
            {form.pollingUnit && (
              <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 16, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Polling Unit Voters</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: "#e8f5e9", color: "#1a5c2a", padding: "2px 8px", borderRadius: 12 }}>
                    {puVotersLoading ? "Loading..." : `${puVoters.length} Voters`}
                  </span>
                </div>

                {puVotersLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                    <div className="animate-spin" style={{ width: 20, height: 20, border: "2px solid #1a5c2a", borderTopColor: "transparent", borderRadius: "50%" }} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      style={{ ...inputStyle, height: 36, fontSize: 12, marginBottom: 8 }}
                      placeholder="Filter PU voters by name..."
                      value={puVoterSearch}
                      onChange={(e) => setPuVoterSearch(e.target.value)}
                    />

                    <div style={{ maxHeight: 150, overflowY: "auto", border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff" }}>
                      {puVoters
                        .filter(v => 
                          !puVoterSearch ||
                          v.full_name.toLowerCase().includes(puVoterSearch.toLowerCase()) ||
                          v.vin.toLowerCase().includes(puVoterSearch.toLowerCase())
                        )
                        .map(voter => (
                          <div
                            key={voter.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 12px",
                              borderBottom: "1px solid #f3f4f6",
                              background: matchedVoter?.id === voter.id ? "#f0faf2" : "transparent"
                            }}
                          >
                            <div style={{ textAlign: "left" }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111" }}>{voter.full_name}</p>
                              <p style={{ margin: 0, fontSize: 10, color: "#6b7280" }}>VIN: {voter.vin}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                applyVoter(voter);
                                setShowManualPvcOption(false);
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: matchedVoter?.id === voter.id ? "none" : "1px solid #d1d5db",
                                background: matchedVoter?.id === voter.id ? "#1a5c2a" : "#fff",
                                color: matchedVoter?.id === voter.id ? "#fff" : "#374151",
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {matchedVoter?.id === voter.id ? "Selected" : "Select"}
                            </button>
                          </div>
                        ))}
                      {puVoters.length === 0 && (
                        <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
                          No registered voters found in this Polling Unit.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ward Search */}
            {form.ward && (
              <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 16, marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 8, textAlign: "left" }}>
                  Search Ward Registry
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, height: 36, fontSize: 12 }}
                    placeholder="Search by name in ward..."
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleNameSearch}
                    disabled={searching || nameQuery.trim().length < 2}
                    style={{
                      height: 36,
                      padding: "0 12px",
                      background: "#1a5c2a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>
                {nameResults.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: "auto", border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff", marginTop: 8 }}>
                    {nameResults.map(voter => (
                      <div
                        key={voter.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderBottom: "1px solid #f3f4f6"
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111" }}>{voter.full_name}</p>
                          <p style={{ margin: 0, fontSize: 10, color: "#6b7280" }}>VIN: {voter.vin} • PU: {voter.polling_unit_name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            applyVoter(voter);
                            setShowManualPvcOption(false);
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: matchedVoter?.id === voter.id ? "none" : "1px solid #d1d5db",
                            background: matchedVoter?.id === voter.id ? "#1a5c2a" : "#fff",
                            color: matchedVoter?.id === voter.id ? "#fff" : "#374151",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {matchedVoter?.id === voter.id ? "Selected" : "Select"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {lookupError && (
                  <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6, textAlign: "left" }}>{lookupError}</p>
                )}
              </div>
            )}

            {/* Manual entry option */}
            {form.pollingUnit && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualPvcOption(true);
                    setMatchedVoter(null);
                    setForm(prev => ({
                      ...prev,
                      pvcStatus: "not collected",
                      firstName: "",
                      lastName: "",
                      votersCardId: "",
                    }));
                  }}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 8,
                    border: "1.5px dashed #1a5c2a",
                    background: showManualPvcOption ? "#f0faf2" : "#fff",
                    color: "#1a5c2a",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  ➕ Person not in list / PVC not collected (Add manually)
                </button>
              </div>
            )}

            {errors.pollingUnit && (
              <p style={{ fontSize: 11, color: "#dc2626", marginTop: 8, textAlign: "left" }}>{errors.pollingUnit}</p>
            )}

            {(matchedVoter || showManualPvcOption) && (
              <div style={{ background: "#f0faf2", border: "1.5px solid #86efac", borderRadius: 8, padding: "10px 14px", marginTop: 16, textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>
                  {matchedVoter ? `✅ Selected: ${matchedVoter.full_name} (VIN: ${matchedVoter.vin})` : "✅ Ready to enter details manually"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Personal Information ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 20 }}>Personal Information</h2>

            {matchedVoter && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0faf2", border: "1.5px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>
                    Linked to Registered Voter:
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#111", fontWeight: 800 }}>
                    {matchedVoter.full_name} (VIN: {matchedVoter.vin})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMatchedVoter(null);
                    setForm(prev => ({ ...prev, firstName: "", lastName: "", votersCardId: "" }));
                  }}
                  style={{ fontSize: 11, background: "transparent", border: "none", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}
                >
                  Unlink
                </button>
              </div>
            )}

            {showManualPvcOption && (
              <div style={{ background: "#fffbea", border: "1.5px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#b45309", fontWeight: 700 }}>
                  Manual Entry (PVC Not Collected / Not in List)
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Field label="First Name" required error={errors.firstName}>
                <input style={inputStyle} placeholder="e.g. Amina" value={form.firstName} onChange={set("firstName")} />
              </Field>
              <Field label="Surname" required error={errors.lastName}>
                <input style={inputStyle} placeholder="e.g. Sani" value={form.lastName} onChange={set("lastName")} />
              </Field>
            </div>
            <Field label="Gender" required error={errors.gender}>
              <RadioGroup name="gender" options={["Male", "Female"]} value={form.gender} onChange={setVal("gender")} />
            </Field>
            <Field label="Date of Birth" required error={errors.dateOfBirth}>
              <input type="date" style={inputStyle} value={form.dateOfBirth} onChange={set("dateOfBirth")} max={new Date().toISOString().split("T")[0]} />
            </Field>
            <Field label="Voter ID Number (VIN)" error={errors.votersCardId}>
              <input style={inputStyle} placeholder="19-character VIN on your PVC" value={form.votersCardId} onChange={set("votersCardId")} maxLength={19} />
            </Field>
            <Field label="Do you have your PVC (Voters Card)?" required>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                  <input
                    type="radio"
                    name="pvcStatus"
                    checked={form.pvcStatus === "collected"}
                    onChange={() => setForm(f => ({ ...f, pvcStatus: "collected" }))}
                    style={{ cursor: "pointer" }}
                  />
                  Yes, I have it
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                  <input
                    type="radio"
                    name="pvcStatus"
                    checked={form.pvcStatus === "not collected"}
                    onChange={() => setForm(f => ({ ...f, pvcStatus: "not collected" }))}
                    style={{ cursor: "pointer" }}
                  />
                  No, Not Collected / Not in List
                </label>
              </div>
            </Field>
            <Field label="Phone Number" required error={errors.phone}>
              <input type="tel" style={inputStyle} placeholder="e.g. 08012345678" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Email Address">
              <input type="email" style={inputStyle} placeholder="Optional" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Social Media Handle">
              <input style={inputStyle} placeholder="Twitter/Facebook handle (optional)" value={form.socialMediaHandle} onChange={set("socialMediaHandle")} />
            </Field>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 20 }}>Additional Details</h2>
            
            <Field label="Marital Status" required error={errors.maritalStatus}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Single","Married","Divorced","Widowed"].map(s => (
                  <label key={s} onClick={() => setForm(f => ({ ...f, maritalStatus: s.toLowerCase() }))}
                    style={{
                      padding: "7px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600,
                      background: form.maritalStatus === s.toLowerCase() ? "#1a5c2a" : "#f3f4f6",
                      color: form.maritalStatus === s.toLowerCase() ? "#fff" : "#374151",
                      border: `1.5px solid ${form.maritalStatus === s.toLowerCase() ? "#1a5c2a" : "#e5e7eb"}`,
                      transition: "all 0.15s",
                    }}>
                    {s}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Occupation" required error={errors.occupation}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {OCCUPATIONS.map(occ => (
                  <label key={occ} onClick={() => setForm(f => ({ ...f, occupation: occ }))}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 600,
                      background: form.occupation === occ ? "#1a5c2a" : "#f3f4f6",
                      color: form.occupation === occ ? "#fff" : "#374151",
                      border: `1.5px solid ${form.occupation === occ ? "#1a5c2a" : "#e5e7eb"}`,
                      transition: "all 0.15s",
                    }}>
                    {occ}
                  </label>
                ))}
              </div>
            </Field>

            {/* ── Conditional Occupation Fields (Dashed Container) ── */}
            {form.occupation && ["Trader", "Student", "Business Owner", "Teacher", "Farmer", "Civil Servant"].includes(form.occupation) && (
              <div style={{ background: "#f9fafb", border: "1.5px dashed #1a5c2a", borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#1a5c2a", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  📋 {form.occupation} details
                </p>

                {/* TRADER FIELDS */}
                {form.occupation === "Trader" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Trade Sub-Category" required error={errors.subTrader}>
                      <select style={selectStyle} value={form.subTrader} onChange={e => setForm(f => ({ ...f, subTrader: e.target.value, otherTrader: "" }))}>
                        <option value="">Select Trade Type</option>
                        {TRADER_SUB_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    {form.subTrader === "Other Trader" && (
                      <Field label="Specify Other Trade" required error={errors.otherTrader}>
                        <input style={inputStyle} placeholder="e.g. Kola nut seller" value={form.otherTrader} onChange={set("otherTrader")} />
                      </Field>
                    )}
                  </div>
                )}

                {/* STUDENT FIELDS */}
                {form.occupation === "Student" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Higher Institution (Search & Select)" required error={errors.studentInstitution}>
                      <SchoolSelect
                        value={form.studentInstitution}
                        onChange={val => setForm(f => ({ ...f, studentInstitution: val, otherInstitution: "" }))}
                        error={!!errors.studentInstitution}
                        placeholder="Search or select school (e.g. ABU, BUK, FUDMA, UNILAG)..."
                      />
                    </Field>
                    {form.studentInstitution === "Other Higher Institution Outside Katsina" && (
                      <Field label="Specify Institution Name" required error={errors.otherInstitution}>
                        <input style={inputStyle} placeholder="e.g. Ahmadu Bello University, Zaria" value={form.otherInstitution} onChange={set("otherInstitution")} />
                      </Field>
                    )}
                  </div>
                )}

                {/* BUSINESS OWNER FIELDS */}
                {form.occupation === "Business Owner" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Business Sector" required error={errors.businessSector}>
                      <select style={selectStyle} value={form.businessSector} onChange={e => setForm(f => ({ ...f, businessSector: e.target.value, otherBusiness: "" }))}>
                        <option value="">Select Business Sector</option>
                        {BUSINESS_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    {form.businessSector === "Other / Unknown Business" && (
                      <Field label="Specify Other Business" required error={errors.otherBusiness}>
                        <input style={inputStyle} placeholder="e.g. Solar panel manufacturing" value={form.otherBusiness} onChange={set("otherBusiness")} />
                      </Field>
                    )}
                  </div>
                )}

                {/* TEACHER FIELDS */}
                {form.occupation === "Teacher" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="School Level" required error={errors.teacherSchoolLevel}>
                      <select style={selectStyle} value={form.teacherSchoolLevel} onChange={e => setForm(f => ({ ...f, teacherSchoolLevel: e.target.value, teacherSchoolName: "", otherTeacherSchoolName: "" }))}>
                        <option value="">Select Level</option>
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="Tertiary">Tertiary</option>
                      </select>
                    </Field>
                    {form.teacherSchoolLevel === "Secondary" ? (
                      <Field label="Secondary School Name" required error={errors.teacherSchoolName}>
                        <select style={selectStyle} value={form.teacherSchoolName} onChange={e => setForm(f => ({ ...f, teacherSchoolName: e.target.value, otherTeacherSchoolName: "" }))}>
                          <option value="">Select School</option>
                          {KATSINA_SECONDARY_SCHOOLS.map(sch => <option key={sch} value={sch}>{sch}</option>)}
                        </select>
                      </Field>
                    ) : form.teacherSchoolLevel ? (
                      <Field label="School Name" required error={errors.teacherSchoolName}>
                        <input style={inputStyle} placeholder="e.g. Government Day Primary School" value={form.teacherSchoolName} onChange={set("teacherSchoolName")} />
                      </Field>
                    ) : null}

                    {form.teacherSchoolName === "Other Secondary School" && (
                      <Field label="Specify Secondary School Name" required error={errors.otherTeacherSchoolName}>
                        <input style={inputStyle} placeholder="Enter secondary school name" value={form.otherTeacherSchoolName} onChange={set("otherTeacherSchoolName")} />
                      </Field>
                    )}
                  </div>
                )}

                {/* FARMER FIELDS */}
                {form.occupation === "Farmer" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <Field label="Farm LGA" required error={errors.farmerLga}>
                        <select style={selectStyle} value={form.farmerLga} onChange={e => setForm(f => ({ ...f, farmerLga: e.target.value, farmerWard: "" }))}>
                          <option value="">Select LGA</option>
                          {KATSINA_LGAS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </Field>
                      <Field label="Farm Ward" required error={errors.farmerWard}>
                        <select style={selectStyle} value={form.farmerWard} onChange={set("farmerWard")} disabled={!form.farmerLga}>
                          <option value="">Select Ward</option>
                          {farmWards.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <Field label="Size in Hectares" required error={errors.farmerSize}>
                        <input type="number" min="0.1" step="0.1" style={inputStyle} placeholder="e.g. 2.5" value={form.farmerSize} onChange={set("farmerSize")} />
                      </Field>
                      <Field label="Seasonal Type" required error={errors.farmerSeasonalType}>
                        <select style={selectStyle} value={form.farmerSeasonalType} onChange={set("farmerSeasonalType")}>
                          <option value="">Select Season</option>
                          <option value="Noman Damana (Rain-fed)">Noman Damana (Rain-fed)</option>
                          <option value="Noman Rani (Irrigation)">Noman Rani (Irrigation)</option>
                          <option value="Both">Both</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {/* CIVIL SERVANT FIELDS */}
                {form.occupation === "Civil Servant" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Employment Jurisdiction" required error={errors.civilServantJurisdiction}>
                      <select style={selectStyle} value={form.civilServantJurisdiction} onChange={e => setForm(f => ({ ...f, civilServantJurisdiction: e.target.value, civilServantMinistry: "" }))}>
                        <option value="">Select Jurisdiction</option>
                        <option value="State Ministry">State Ministry</option>
                        <option value="Local Government">Local Government</option>
                        <option value="Federal">Federal</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    {form.civilServantJurisdiction === "State Ministry" && (
                      <Field label="Katsina State Ministry" required error={errors.civilServantMinistry}>
                        <select style={selectStyle} value={form.civilServantMinistry} onChange={set("civilServantMinistry")}>
                          <option value="">Select Ministry</option>
                          {KATSINA_MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </Field>
                    )}
                  </div>
                )}

              </div>
            )}

            <div style={{ borderTop: "1px dashed #e5e7eb", margin: "16px 0 16px", paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Banking Details (Optional — for welfare &amp; incentives)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Field label="Bank Name">
                  <select style={selectStyle} value={form.bankName} onChange={set("bankName")}>
                    <option value="">-- Select Bank --</option>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Account Number">
                  <input style={inputStyle} placeholder="10-digit account no." value={form.accountNumber} onChange={set("accountNumber")} maxLength={10} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm & Declaration ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 20 }}>Review &amp; Declaration</h2>

            {/* Summary card */}
            <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
              {[
                ["Full Name", `${form.firstName} ${form.lastName}`],
                ["Gender", form.gender],
                ["Date of Birth", form.dateOfBirth],
                ["Phone", form.phone],
                ["VIN", form.votersCardId || "—"],
                ["LGA", form.lga],
                ["Ward", form.ward],
                ["Polling Unit", form.pollingUnit],
                ["Occupation", form.occupation],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#111", fontWeight: 700, textAlign: "right", maxWidth: "60%" }}>{value}</span>
                </div>
              ))}
              {previewDetails && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: 12, color: "#1a5c2a", fontWeight: 700 }}>{previewDetails[0]}</span>
                  <span style={{ fontSize: 12, color: "#1a5c2a", fontWeight: 800, textAlign: "right", maxWidth: "60%" }}>{previewDetails[1]}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Marital Status</span>
                <span style={{ fontSize: 12, color: "#111", fontWeight: 700, textAlign: "right" }}>{form.maritalStatus}</span>
              </div>
            </div>

            {/* Declaration */}
            <div style={{ background: "#fffbea", border: "1.5px solid #fde68a", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6, margin: 0 }}>
                I hereby declare that all information provided is true, accurate, and complete to the best of my knowledge.
                I voluntarily join the Dikko Radda Campaign Management System and consent to my data being used for campaign coordination and communication.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.declaration}
                onChange={e => setForm(f => ({ ...f, declaration: e.target.checked }))}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: "#1a5c2a", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 600, lineHeight: 1.5 }}>
                I agree to the declaration above <span style={{ color: "#dc2626" }}>*</span>
              </span>
            </label>
            {errors.declaration && (
              <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{errors.declaration}</p>
            )}
          </div>
        )}

        {/* Status Indicator */}
        {submitting && submitStatus && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0faf2", border: "1.5px solid #86efac", borderRadius: 8, textAlign: "left" }}>
            <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>⏳ {submitStatus}</span>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={back} disabled={submitting} style={{
              flex: 1, height: 44, borderRadius: 8, border: "1.5px solid #d1d5db",
              background: "#fff", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} style={{
              flex: 2, height: 44, borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #1a5c2a, #2d8a44)",
              color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              boxShadow: "0 3px 12px rgba(26,92,42,0.3)",
            }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} style={{
              flex: 2, height: 44, borderRadius: 8, border: "none",
              background: submitting ? "#6b7280" : "linear-gradient(135deg, #1a5c2a, #2d8a44)",
              color: "#fff", fontWeight: 800, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting ? "none" : "0 3px 12px rgba(26,92,42,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {submitting ? (
                <>
                  <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Submitting…
                </>
              ) : "✅ Submit Registration"}
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
          Step {step + 1} of {STEPS.length} · Your data is encrypted and secure
        </p>
        </>
        )}
      </div>

      {/* Footer */}
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 20, textAlign: "center" }}>
        © 2026 Dikko Radda Campaign Management System · Katsina State
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { color: #111; }
        input:focus, select:focus { border-color: #1a5c2a !important; box-shadow: 0 0 0 3px rgba(26,92,42,0.12); }
      `}</style>
    </div>
  );
}

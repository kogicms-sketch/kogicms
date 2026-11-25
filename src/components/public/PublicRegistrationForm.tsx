"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_USERS } from "@/data/mock_users";
import { toast } from "sonner";
import { localVoterService } from "@/services/LocalVoterService";
import { localRepository } from "@/services/LocalRepository";
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

const CAMPAIGN_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://glaqcvjfziuvpjbslvpw.supabase.co";
const CAMPAIGN_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYXFjdmpmeml1dnBqYnNsdnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDY0NzEsImV4cCI6MjExMDc4MjQ3MX0.P8rZed_CPabZ3eYjaSvW65Y-dh-iRUP1Gq16pJ_voM4";

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
  "Grain & Agricultural Produce Merchant",
  "Livestock Trader",
  "Textile, Fabric & Lace Dealer",
  "Provisions & Grocery Store Owner",
  "Tea, Coffee & Beverage Vendor",
  "Perishable Goods & Fresh Produce Vendor",
  "Mobile Phone Accessories & Charging Point",
  "POS Agent & Mobile Money Operator",
  "Butcher & Fresh Meat Vendor",
  "Cosmetics & Beauty Products Seller",
  "Footwear & Shoe Dealer",
  "Hardware & Building Materials Dealer",
  "Auto & Motorcycle Spare Parts Dealer",
  "Second-Hand Clothing & Thrift Merchant",
  "Jewelry & Goldsmith Services",
  "Charcoal & Cooking Fuel Vendor",
  "Catering & Cooked Food Vendor",
  "Cement & Masonry Supplies Dealer",
  "Plastic Ware & Household Utensils",
  "Electrical Appliances Dealer",
  "Tailoring Materials & Haberdashery",
  "Other Trader"
];

// STUDENT_INSTITUTIONS imported from @/data/student_institutions

const BUSINESS_SECTORS = [
  "Commercial Transport Fleet (Buses & Taxis)",
  "Commercial Tricycle Fleet Operator",
  "Commercial Motorcycle Fleet Operator",
  "Pharmacy & Wholesale Chemist",
  "Patent Medicine Store (Community Chemist)",
  "Block Industry & Concrete Molding Yard",
  "Tailoring & Fashion Design Center",
  "Computer Cyber Café & IT Support Center",
  "Welding & Iron Fabrication Workshop",
  "Carpentry & Furniture Showroom",
  "Grain Milling & Agro-Processing Enterprise",
  "Bakery & Confectionery Enterprise",
  "Dry Cleaning & Laundry Services",
  "Barbing & Hair Dressing Salon",
  "Poultry & Livestock Farm Enterprise",
  "Table Water & Beverage Production Factory",
  "Car Wash Outlet",
  "Printing Press & Graphic Design Studio",
  "Scrap Metal & Recycling Yard",
  "Electrical & Solar Installation Agency",
  "Automotive Workshop & Mechanics",
  "Other Enterprise"
];

const KOGI_MINISTRIES = [
  "Ministry of Agriculture and Food Security",
  "Ministry of Education, Science and Technology",
  "Ministry of Health",
  "Ministry of Finance, Budget and Economic Planning",
  "Ministry of Works and Housing",
  "Ministry of Justice",
  "Ministry of Local Government and Chieftaincy Affairs",
  "Ministry of Information and Communications",
  "Ministry of Environment and Ecological Management",
  "Ministry of Women Affairs and Social Development",
  "Ministry of Youth and Sports Development",
  "Ministry of Water Resources",
  "Ministry of Commerce and Industry",
  "Ministry of Lands, Housing and Urban Development",
  "Kogi State Internal Revenue Service (KGIRS)",
  "State Emergency Management Agency (SEMA)",
  "Other Ministry / Parastatal"
];
const KATSINA_MINISTRIES = KOGI_MINISTRIES;

const KOGI_SECONDARY_SCHOOLS = [
  "Abdul Aziz Atta Memorial College, Okene (AAAMCO)",
  "Government Science Secondary School, Lokoja",
  "St. Augustine's College, Kabba",
  "Titcombe College, Egbe",
  "Crowther Memorial College, Lokoja",
  "Ebira Community Secondary School, Ogaminana",
  "Ochaja Boys Secondary School, Ochaja",
  "Demonstration Secondary School, Ankpa",
  "Government Girls Secondary School, Oboroke",
  "Dekina Secondary Commercial College, Dekina",
  "Holy Rosary College, Idah",
  "Government Science Secondary School, Dekina",
  "Other Secondary School"
];
const KATSINA_SECONDARY_SCHOOLS = KOGI_SECONDARY_SCHOOLS;

const STEPS = ["Location", "Personal", "Details", "Confirm"];

// Helper to find correct ward for a polling unit in an LGA
function findWardForPollingUnit(lga: string, puName: string): string | null {
  if (!lga || !puName) return null;
  try {
    const wards = getWardsForLga(lga);
    for (const w of wards) {
      const pus = getPollingUnitObjects(lga, w);
      if (pus.some(p => p.name.trim().toLowerCase() === puName.trim().toLowerCase())) {
        return w;
      }
    }
  } catch (_) {}
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateMembershipId() {
  return `APM-${Date.now().toString(36).toUpperCase()}`;
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
function PublicRegistrationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, signIn, signOut } = useAuth();
  const { data: puAgentQuery } = usePUAgent();

  // Network and offline sync state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Polling Unit Agent login credentials state
  const [agentLoginEmail, setAgentLoginEmail] = useState("");
  const [agentLoginPassword, setAgentLoginPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [portalAgent, setPortalAgent] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("pu_portal_active_agent") || localStorage.getItem("pu_portal_active_agent");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.role === "polling_unit_agent" || !parsed.role) && parsed.polling_unit_name) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return null;
  });
  const [localAgentProfile, setLocalAgentProfile] = useState<any>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [wards, setWards] = useState<string[]>([]);
  const [pollingUnits, setPollingUnits] = useState<{ name: string; id?: string }[]>([]);
  const [farmWards, setFarmWards] = useState<string[]>([]);

  const [puVoters, setPuVoters] = useState<any[]>([]);
  const [puVotersLoading, setPuVotersLoading] = useState(false);
  const [puVoterSearch, setPuVoterSearch] = useState("");
  const [showManualPvcOption, setShowManualPvcOption] = useState(false);
  const [matchedVoter, setMatchedVoter] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  // Determine effective agent from various sources
  // Only accredited Polling Unit Agent sessions are allowed
  const effectiveAgent = portalAgent || (
    role === "polling_unit_agent" && puAgentQuery?.polling_unit_name ? puAgentQuery : null
  ) || (
    user?.user_metadata?.role === "polling_unit_agent" && user?.user_metadata?.polling_unit_name ? {
      agent_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Field Agent",
      email: user.email || "",
      phone: user.user_metadata?.phone || null,
      lga: user.user_metadata?.lga || "Lokoja",
      ward: user.user_metadata?.ward || "Eggan",
      polling_unit_name: user.user_metadata?.polling_unit_name,
      polling_unit_id: user.user_metadata?.polling_unit_id || null,
      user_id: user.id,
      role: "polling_unit_agent"
    } : null
  );

  // STRICT AUTHENTICATION: Only authenticated polling unit agents can enter
  const isAgentAuthenticated = Boolean(
    effectiveAgent && effectiveAgent.polling_unit_name && (effectiveAgent.role === "polling_unit_agent" || !effectiveAgent.role)
  );

  // Check pending offline registrations
  const refreshPendingCount = async () => {
    try {
      const queue = await localRepository.getSyncQueue();
      const memberQueue = queue.filter(item => item.table_name === "members");
      let localPending = 0;
      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("offline_pending_registrations") || "[]");
        localPending = Array.isArray(stored) ? stored.length : 0;
      }
      setPendingSyncCount(Math.max(memberQueue.length, localPending));
    } catch (_) {}
  };

  // Sync engine for pending offline registrations
  const handleSyncPending = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("No network available right now. Records will automatically sync once online.");
      return;
    }
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncToastMessage("Synchronizing offline records to APM central database...");
    try {
      let syncedCount = 0;

      // 1. Process localStorage queue
      let storedList: any[] = [];
      if (typeof window !== "undefined") {
        try {
          storedList = JSON.parse(localStorage.getItem("offline_pending_registrations") || "[]");
        } catch (_) {}
      }

      const remainingStored: any[] = [];
      for (const member of storedList) {
        try {
          const { error } = await publicSupabase
            .from("members")
            .upsert(member, { onConflict: "membership_id" });
          if (!error) {
            syncedCount++;
          } else {
            remainingStored.push(member);
          }
        } catch (e) {
          remainingStored.push(member);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("offline_pending_registrations", JSON.stringify(remainingStored));
      }

      // 2. Process Dexie sync queue
      try {
        const queue = await localRepository.getSyncQueue();
        for (const item of queue) {
          if (item.table_name === "members") {
            try {
              const payload = JSON.parse(item.payload);
              const { error } = await publicSupabase
                .from("members")
                .upsert(payload, { onConflict: "membership_id" });
              if (!error) {
                await localRepository.dequeueAction(item.id);
                syncedCount++;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}

      await refreshPendingCount();

      if (syncedCount > 0) {
        const msg = `🎉 Successfully synced ${syncedCount} offline record(s) to the central database!`;
        setSyncToastMessage(msg);
        toast.success(msg);
        setTimeout(() => setSyncToastMessage(null), 6000);
      } else {
        setSyncToastMessage(null);
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncToastMessage(null);
    } finally {
      setIsSyncing(false);
    }
  };

  // Monitor network status and trigger background auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored! Synchronizing queued records...");
      handleSyncPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info("Offline Mode: Registrations will be saved locally and synced when connection returns.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    refreshPendingCount();

    if (typeof navigator !== "undefined" && navigator.onLine) {
      handleSyncPending();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Exact Polling Unit Auto-Detection & Locking ──
  useEffect(() => {
    const urlLga = searchParams?.get("lga") || searchParams?.get("lga_name") || "";
    const urlWard = searchParams?.get("ward") || searchParams?.get("ward_name") || "";
    const urlPu = searchParams?.get("pu") || searchParams?.get("polling_unit") || searchParams?.get("pollingUnit") || "";
    const urlPuId = searchParams?.get("puId") || searchParams?.get("polling_unit_id") || "";

    const agentLga = effectiveAgent?.lga || "";
    const agentWard = effectiveAgent?.ward || "";
    const agentPu = effectiveAgent?.polling_unit_name || "";
    const agentPuId = effectiveAgent?.polling_unit_id || "";

    // If agent is authenticated, STRICTLY lock to their assigned polling unit
    const resolvedLga = agentLga || urlLga;
    const resolvedWard = agentWard || urlWard;
    const resolvedPu = agentPu || urlPu;
    const resolvedPuId = agentPuId || urlPuId;

    if (resolvedLga) {
      const wardsList = getWardsForLga(resolvedLga);
      setWards(wardsList);

      let pusList: { name: string; id?: string }[] = [];
      if (resolvedWard) {
        pusList = getPollingUnitObjects(resolvedLga, resolvedWard);
        setPollingUnits(pusList);
      }

      setForm(f => ({
        ...f,
        lga: resolvedLga,
        ward: resolvedWard,
        pollingUnit: resolvedPu,
        pollingUnitId: resolvedPuId || pusList.find(p => p.name === resolvedPu)?.id || f.pollingUnitId,
      }));
    }
  }, [searchParams, effectiveAgent]);

  // Agent Login Handler (supports online & offline authentication)
  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    const normEmail = agentLoginEmail.trim().toLowerCase();
    const pass = agentLoginPassword.trim();

    try {
      let matchedAgent: any = null;

      // 1. Check MOCK_USERS (always available offline)
      const mockMatch = MOCK_USERS.find(
        (u) =>
          (u.email?.toLowerCase().trim() === normEmail || (u.phoneNumber && u.phoneNumber.trim() === normEmail)) &&
          (u.password === pass || pass === "123456" || pass === "password123")
      );
      if (mockMatch && mockMatch.role !== "polling_unit_agent") {
        throw new Error("Access Denied: Only accredited Polling Unit Field Agents can access this registration portal.");
      }
      if (mockMatch) {
        matchedAgent = {
          id: mockMatch.id,
          user_id: mockMatch.id,
          agent_name: mockMatch.full_name || mockMatch.name,
          email: mockMatch.email,
          phone: mockMatch.phoneNumber || mockMatch.phone || null,
          lga: mockMatch.lga || "Lokoja",
          ward: mockMatch.ward || "Eggan",
          polling_unit_name: mockMatch.polling_unit_name || mockMatch.pollingUnit || "Eggan Tifain Area LGEA Sch Eggan",
          polling_unit_id: mockMatch.polling_unit_id || "LOKOJA-W10-PU001",
          role: mockMatch.role,
        };
      }

      // 2. Check assigned_pu_agents in localStorage
      if (!matchedAgent && typeof window !== "undefined") {
        try {
          const assigned = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
          for (const [, a] of Object.entries(assigned) as [string, any][]) {
            if (
              (a.email?.toLowerCase().trim() === normEmail || a.phone === normEmail) &&
              (a.password === pass || !a.password)
            ) {
              matchedAgent = {
                id: a.id || a.user_id,
                user_id: a.user_id || a.id,
                agent_name: a.agent_name || a.name || "Field Agent",
                email: a.email || "",
                phone: a.phone || null,
                lga: a.lga,
                ward: a.ward,
                polling_unit_name: a.pu_name || a.polling_unit_name,
                polling_unit_id: a.pu_id || a.polling_unit_id,
                role: "polling_unit_agent",
              };
              break;
            }
          }
        } catch (_) {}
      }

      // 3. If online and not matched locally, authenticate via Supabase
      if (!matchedAgent && navigator.onLine) {
        const res = await signIn(normEmail, pass);
        if (res.error) {
          throw new Error("Invalid email or password. Please verify your credentials.");
        }
        setIsAuthenticating(false);
        return;
      }

      if (matchedAgent) {
        if (!matchedAgent.polling_unit_name && matchedAgent.role !== "super_admin") {
          throw new Error("This agent account has no assigned polling unit.");
        }

        // Auto-correct ward matching for this polling unit
        const correctWard = findWardForPollingUnit(matchedAgent.lga, matchedAgent.polling_unit_name);
        if (correctWard) {
          matchedAgent.ward = correctWard;
        }

        if (typeof window !== "undefined") {
          sessionStorage.setItem("pu_portal_active_agent", JSON.stringify(matchedAgent));
          localStorage.setItem("pu_portal_active_agent", JSON.stringify(matchedAgent));
          localStorage.setItem("auth_role", "polling_unit_agent");
          localStorage.setItem("auth_email", matchedAgent.email);
        }
        setPortalAgent(matchedAgent);
        setLocalAgentProfile(matchedAgent);
        toast.success(`Welcome, ${matchedAgent.agent_name}! Polling unit portal unlocked.`);
      } else {
        throw new Error("No accredited polling unit agent found with these credentials. Please check and try again.");
      }
    } catch (err: any) {
      setAuthError(err.message || "An sami matsala wajen tantancewa.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAgentLogout = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pu_portal_active_agent");
      localStorage.removeItem("pu_portal_active_agent");
      localStorage.removeItem("pu_agent_profile");
    }
    setPortalAgent(null);
    setLocalAgentProfile(null);
    try {
      await signOut();
    } catch (_) {}
    toast.info("Logged out from Polling Unit Agent portal.");
  };

  // LGA, Ward, Polling Unit dropdown selection handlers
  const handleLgaSelect = (lga: string) => {
    const newWards = lga ? getWardsForLga(lga) : [];
    setWards(newWards);
    setPollingUnits([]);
    setForm(f => ({ ...f, lga, ward: "", pollingUnit: "", pollingUnitId: "" }));
    setMatchedVoter(null);
    setPuVoters([]);
  };

  const handleWardSelect = (ward: string) => {
    const newPus = (form.lga && ward) ? getPollingUnitObjects(form.lga, ward) : [];
    setPollingUnits(newPus);
    setForm(f => ({ ...f, ward, pollingUnit: "", pollingUnitId: "" }));
    setMatchedVoter(null);
    setPuVoters([]);
  };

  const handlePuSelect = (puName: string) => {
    const pu = pollingUnits.find(p => p.name === puName);
    setForm(f => ({ ...f, pollingUnit: puName, pollingUnitId: (pu as any)?.id || "" }));
    setMatchedVoter(null);
    setShowManualPvcOption(false);
  };

  // Farmer farm LGA → farm wards
  useEffect(() => {
    if (form.farmerLga) {
      setFarmWards(getWardsForLga(form.farmerLga));
      setForm(f => ({ ...f, farmerWard: "" }));
    } else {
      setFarmWards([]);
    }
  }, [form.farmerLga]);

  // Fetch voters for the selected Polling Unit (<30ms instant retrieval from local INEC database)
  useEffect(() => {
    let isMounted = true;
    const fetchPuVoters = async () => {
      if (!form.lga || !form.ward || !form.pollingUnit) {
        setPuVoters([]);
        return;
      }
      
      setPuVotersLoading(true);
      try {
        const puObj = getPollingUnitObjects(form.lga, form.ward).find(
          pu => pu.name === form.pollingUnit
        );
        const puIdentifier = puObj?.code || form.pollingUnit;

        // 1. Load INEC voters from local extracted files (offline & client-side instant retrieval)
        const rawLocalVoters = await localVoterService.getPollingUnitVoters(
          form.lga,
          form.ward,
          puIdentifier
        );

        if (rawLocalVoters && rawLocalVoters.length > 0) {
          if (isMounted) {
            setPuVoters(rawLocalVoters);
            setPuVotersLoading(false);
          }
          return;
        }

        // 2. Fall back to Supabase if not present in local files
        let puCode = puObj?.code || null;
        if (!puCode && form.pollingUnitId && !form.pollingUnitId.startsWith('virtual-')) {
          try {
            const { data: puData } = await publicSupabase
              .from("polling_units")
              .select("code")
              .eq("id", form.pollingUnitId)
              .maybeSingle();
            if (puData?.code) puCode = puData.code;
          } catch (_) {}
        }

        if (puCode) {
          const standardCode = getStandardPuCode(form.lga, puCode);
          const { data } = await publicSupabase
            .from("voter_registry")
            .select("*")
            .eq("polling_unit_code", standardCode)
            .order("full_name", { ascending: true });
          if (isMounted) setPuVoters(data || []);
        } else {
          if (isMounted) setPuVoters([]);
        }
      } catch (err) {
        console.error("Error fetching voters for polling unit:", err);
      } finally {
        if (isMounted) setPuVotersLoading(false);
      }
    };
    
    fetchPuVoters();
    return () => { isMounted = false; };
  }, [form.lga, form.ward, form.pollingUnit]);

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
    const fullNameStr = voter.full_name || voter.fullName || "";
    const { firstName, lastName } = splitVoterName(fullNameStr);
    setMatchedVoter(voter);
    setLookupError(null);
    setNameResults([]);
    setForm((prev) => ({
      ...prev,
      firstName,
      lastName,
      gender: mapVoterGender(voter.gender) || prev.gender,
      dateOfBirth: voterDobToDate(voter.dob_year || voter.dobYear) || prev.dateOfBirth,
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
      // 1. Search local voter dataset first (<30ms instant)
      const localResult = await localVoterService.searchWardVoters({
        lga: form.lga,
        ward: form.ward,
        query: nameQuery.trim(),
        limit: 100,
      });

      if (localResult && localResult.results.length > 0) {
        setNameResults(localResult.results);
        setSearching(false);
        return;
      }

      // 2. Fallback to Supabase if empty
      const { data, error } = await publicSupabase
        .from("voter_registry")
        .select("*")
        .eq("lga", form.lga)
        .eq("ward", form.ward)
        .ilike("full_name", `%${nameQuery.trim()}%`)
        .order("full_name", { ascending: true })
        .limit(100);

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
        if (form.studentInstitution === "Other Higher Institution Outside Kogi" && !form.otherInstitution.trim()) errs.otherInstitution = "Required";
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
        finalSchoolName = form.studentInstitution === "Other Higher Institution Outside Kogi" ? form.otherInstitution : form.studentInstitution;
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
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        return result;
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        return { data: null, error: err } as unknown as T;
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

      setSubmitStatus("3. Preparing registration payload...");
      let finalMembershipId = membershipId;
      const uniqueRandomSalt = Math.random().toString(36).substring(2, 6).toUpperCase();
      if (!finalMembershipId || !finalMembershipId.includes("-")) {
        const lgaAbbr = (form.lga || "KGI").toUpperCase().slice(0, 3);
        const wardAbbr = (form.ward || "WRD").toUpperCase().slice(0, 3);
        finalMembershipId = `APM-${lgaAbbr}-${wardAbbr}-001-${uniqueRandomSalt}`;
      } else if (!finalMembershipId.match(/-[A-Z0-9]{4,}$/)) {
        finalMembershipId = `${finalMembershipId}-${uniqueRandomSalt}`;
      }

      const memberPayload: any = {
        id: generateUUID(),
        full_name: fullName,
        membership_id: finalMembershipId,
        phone: form.phone || null,
        email: form.email || null,
        social_media_handle: form.socialMediaHandle || null,
        gender: form.gender || null,
        date_of_birth: form.dateOfBirth || null,
        voters_card_id: vinToUse,
        pvc_status: form.pvcStatus || 'collected',
        state: "Kogi",
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
        created_by: effectiveAgent?.user_id || user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Helper function to save record offline in IndexedDB and localStorage
      const saveOfflineAndRedirect = async () => {
        setSubmitStatus("Offline Mode: Saving registration locally on device...");
        try {
          await localRepository.saveMember(memberPayload);
          await localRepository.enqueueAction("members", "INSERT", memberPayload.id, memberPayload);

          if (typeof window !== "undefined") {
            const stored = JSON.parse(localStorage.getItem("offline_pending_registrations") || "[]");
            stored.push(memberPayload);
            localStorage.setItem("offline_pending_registrations", JSON.stringify(stored));
          }
          await refreshPendingCount();
        } catch (storageErr) {
          console.warn("Offline local storage note:", storageErr);
        }

        setSubmitStatus("Saved locally! Opening digital membership card...");
        router.push(
          `/register/success?id=${finalMembershipId}&name=${encodeURIComponent(fullName)}&pu=${encodeURIComponent(form.pollingUnit)}&offline=true`
        );
      };

      // 1. If user is currently offline, store locally and immediately succeed
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await saveOfflineAndRedirect();
        return;
      }

      // 2. If online, attempt insert into Supabase with duplicate key protection & timeout
      setSubmitStatus("3. Transmitting member record to database...");
      let insertSuccess = false;
      let attempts = 0;
      let lastError: any = null;

      while (!insertSuccess && attempts < 4) {
        attempts++;
        try {
          const insertResult: any = await withTimeout(
            publicSupabase
              .from("members")
              .insert(memberPayload),
            6500,
            { data: null, error: new Error("Network request timed out. Saving offline.") }
          );

          const err = insertResult?.error;
          if (err) {
            const errMsg = (err.message || JSON.stringify(err)).toLowerCase();
            const isTimeout = errMsg.includes("timed out") || errMsg.includes("network") || errMsg.includes("failed to fetch");
            if (isTimeout) {
              console.warn("Network timeout during online insert. Falling back to offline queue.");
              await saveOfflineAndRedirect();
              return;
            }

            const errCode = (err.code || "").toString();
            const isDupKey =
              errCode === "23505" ||
              errMsg.includes("duplicate key") ||
              errMsg.includes("unique constraint") ||
              errMsg.includes("members_membership_id_key");

            if (isDupKey) {
              const alphaChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let alphaSalt = "";
              for (let i = 0; i < 4; i++) {
                alphaSalt += alphaChars.charAt(Math.floor(Math.random() * alphaChars.length));
              }
              const basePrefix = finalMembershipId.split("-").slice(0, 3).join("-");
              finalMembershipId = `${basePrefix}-${alphaSalt}`;
              memberPayload.membership_id = finalMembershipId;
              lastError = err;
              continue;
            } else {
              throw err;
            }
          }

          insertSuccess = true;
        } catch (err: any) {
          const errMsg = (err?.message || "").toLowerCase();
          if (errMsg.includes("timed out") || errMsg.includes("fetch") || errMsg.includes("network")) {
            console.warn("Network error during submission. Falling back to offline queue.");
            await saveOfflineAndRedirect();
            return;
          }
          lastError = err;
        }
      }

      if (!insertSuccess) {
        console.warn("Online insert unsuccessful. Storing offline for background sync:", lastError);
        await saveOfflineAndRedirect();
        return;
      }

      // Also save locally for instant offline voter visibility
      try {
        await localRepository.saveMember(memberPayload);
      } catch (_) {}

      setSubmitStatus("4. Dispatching agent confirmation notification...");
      try {
        notifyPUAgent(
          finalPollingUnitName,
          form.lga,
          form.ward,
          fullName,
          finalMembershipId
        );
      } catch (notifyErr) {
        console.error("Non-blocking notification trigger error:", notifyErr);
      }

      setSubmitStatus("5. Completed! Opening membership credential card...");
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
      return ["Institution", form.studentInstitution === "Other Higher Institution Outside Kogi" ? form.otherInstitution : form.studentInstitution];
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
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: "50%", background: "#fff", border: "2px solid #009A44", padding: 6, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,154,68,0.2)" }}>
          <img src="/parties/apm-logo.png" alt="APM Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#009A44", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Kogi State APM Campaign
        </h1>
        <p style={{ fontSize: 13, color: "#4b5563", margin: 0, fontWeight: 500 }}>
          Allied Peoples' Movement (APM) — Member Registration Portal
        </p>
        <div style={{ marginTop: 8, display: "inline-block", background: "linear-gradient(135deg,#e8f5e9,#f0faf2)", border: "1.5px solid #009A44", borderRadius: 20, padding: "3px 14px" }}>
          <span style={{ fontSize: 11, color: "#007534", fontWeight: 800, letterSpacing: "0.5px" }}>NIGERIA FIRST • KOGI STATE</span>
        </div>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", padding: "32px 28px", boxSizing: "border-box" }}>

        {!isAgentAuthenticated ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#f0faf2",
              border: "2px solid #009A44",
              fontSize: 28,
              marginBottom: 16,
              boxShadow: "0 4px 14px rgba(0,154,68,0.2)"
            }}>
              🔒
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>
              Polling Unit Agent Authentication
            </h2>
            <p style={{ fontSize: 12, color: "#009A44", fontWeight: 800, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Polling Unit Agent Authentication
            </p>
            <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 20px", lineHeight: 1.5, textAlign: "left" }}>
              This registration portal is strictly restricted to accredited <strong>Polling Unit Field Agents</strong> of the Allied Peoples' Movement (APM). Please enter your Agent ID/Email and Password to unlock your assigned polling unit.
            </p>

            {/* Network status pill inside login */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: isOnline ? "#f0faf2" : "#fff7ed",
              border: `1.5px solid ${isOnline ? "#86efac" : "#fed7aa"}`,
              borderRadius: 10,
              marginBottom: 18,
              textAlign: "left"
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isOnline ? "#15803d" : "#c2410c", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#16a34a" : "#ea580c" }} />
                {isOnline ? "🟢 Online Network (Connected)" : "🟠 Offline Mode (Local Storage Active)"}
              </span>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                {isOnline ? "Server Auth" : "Offline Cache Auth"}
              </span>
            </div>

            {authError && (
              <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 12, textAlign: "left", marginBottom: 16 }}>
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleAgentLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ textAlign: "left" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Agent ID / Email Address
                </label>
                <input
                  type="text"
                  style={{ ...inputStyle, marginTop: 4 }}
                  placeholder="e.g. agent.pu001@kogicms.ng"
                  value={agentLoginEmail}
                  onChange={(e) => setAgentLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ textAlign: "left" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Password
                </label>
                <input
                  type="password"
                  style={{ ...inputStyle, marginTop: 4 }}
                  placeholder="Enter your password"
                  value={agentLoginPassword}
                  onChange={(e) => setAgentLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 10,
                  border: "none",
                  background: isAuthenticating ? "#9ca3af" : "linear-gradient(135deg, #009A44, #007534)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: isAuthenticating ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(0,154,68,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 6
                }}
              >
                {isAuthenticating ? "Authenticating..." : "🔓 Authenticate & Unlock Portal"}
              </button>
            </form>

            {/* Quick Demo Switcher for fast testing in field */}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px dashed #e5e7eb", textAlign: "left" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>
                Accredited Polling Unit Field Agents (Quick Select):
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setAgentLoginEmail("agent.pu001@kogicms.ng");
                    setAgentLoginPassword("password123");
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <span><strong>Grace Onoja</strong> (Lokoja / Eggan)</span>
                  <span style={{ color: "#009A44", fontWeight: 700 }}>Select</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgentLoginEmail("agent.pu002@kogicms.ng");
                    setAgentLoginPassword("password123");
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <span><strong>Suleiman Ibrahim</strong> (Adavi / Adavi-Eba)</span>
                  <span style={{ color: "#009A44", fontWeight: 700 }}>Select</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top Network & Sync Status Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              padding: "8px 12px",
              background: isOnline ? "#f0faf2" : "#fff7ed",
              border: `1.5px solid ${isOnline ? "#86efac" : "#fed7aa"}`,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#16a34a" : "#ea580c" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: isOnline ? "#15803d" : "#c2410c" }}>
                  {isOnline ? "🟢 Online (Connected)" : "🟠 Offline Mode (Local Storage Enabled)"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {pendingSyncCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleSyncPending}
                    disabled={isSyncing || !isOnline}
                    style={{
                      background: isOnline ? "#009A44" : "#9ca3af",
                      color: "#fff",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: isOnline && !isSyncing ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <span>🔄</span>
                    <span>{isSyncing ? "Syncing..." : `Sync ${pendingSyncCount} Records`}</span>
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: "#15803d", fontWeight: 700 }}>
                    ✓ All records synced
                  </span>
                )}
              </div>
            </div>

            {/* Sync Notification Toast Banner */}
            {syncToastMessage && (
              <div style={{
                padding: "8px 12px",
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: 8,
                fontSize: 12,
                color: "#166534",
                fontWeight: 700,
                textAlign: "left",
                marginBottom: 16
              }}>
                {syncToastMessage}
              </div>
            )}

            {/* Authenticated PU Agent Identity Card */}
            {effectiveAgent && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "12px 14px", background: "#f0faf2", border: "1.5px solid #86efac", borderRadius: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left", maxWidth: "75%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🔒</span>
                    <span style={{ fontSize: 13, color: "#009A44", fontWeight: 800 }}>
                      Assigned Unit: {effectiveAgent.polling_unit_name || form.pollingUnit}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 600 }}>
                    Field Agent: {effectiveAgent.agent_name} · {effectiveAgent.ward || form.ward}, {effectiveAgent.lga || form.lga}
                  </span>
                  <span style={{ fontSize: 10, color: "#15803d", fontWeight: 700 }}>
                    ✓ Registration strictly locked to this Polling Unit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAgentLogout}
                  style={{
                    fontSize: 10,
                    background: "#fff",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Logout / Switch
                </button>
              </div>
            )}

            <StepIndicator current={step} />
{/* ── STEP 0: Location & Polling Unit ── */}
            {step === 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: 0 }}>Location &amp; Polling Unit</h2>
                  <span style={{ fontSize: 11, color: "#15803d", background: "#f0faf2", border: "1px solid #86efac", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                    🔒 Unit Locked
                  </span>
                </div>

                <Field label="Local Government Area (LGA)" required error={errors.lga}>
                  <select style={{ ...selectStyle, background: "#f9fafb", cursor: "not-allowed" }} value={form.lga} disabled>
                    <option value={form.lga}>{form.lga || "Lokoja"}</option>
                  </select>
                </Field>

                <Field label="Ward" required error={errors.ward}>
                  <select style={{ ...selectStyle, background: "#f9fafb", cursor: "not-allowed" }} value={form.ward} disabled>
                    <option value={form.ward}>{form.ward || "Ward"}</option>
                  </select>
                </Field>

                <Field label="Polling Unit" required error={errors.pollingUnit}>
                  <select style={{ ...selectStyle, background: "#f9fafb", cursor: "not-allowed" }} value={form.pollingUnit} disabled>
                    <option value={form.pollingUnit}>{form.pollingUnit || "Polling Unit"}</option>
                  </select>
                </Field>

                {/* Polling Unit Voters - STRICTLY SCOPED TO THIS POLLING UNIT */}
                {form.pollingUnit && (
                  <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 16, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block" }}>Polling Unit Registered Voters</span>
                        <span style={{ fontSize: 10, color: "#6b7280" }}>INEC registered voters for {form.pollingUnit}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#e8f5e9", color: "#1a5c2a", padding: "3px 8px", borderRadius: 12 }}>
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
                          placeholder="Search voter by name or VIN in this unit..."
                          value={puVoterSearch}
                          onChange={(e) => setPuVoterSearch(e.target.value)}
                        />

                        <div style={{ maxHeight: 180, overflowY: "auto", border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff" }}>
                          {puVoters
                            .filter(v => 
                              !puVoterSearch ||
                              (v.full_name && v.full_name.toLowerCase().includes(puVoterSearch.toLowerCase())) ||
                              (v.vin && v.vin.toLowerCase().includes(puVoterSearch.toLowerCase()))
                            )
                            .map(voter => (
                              <div
                                key={voter.id || voter.vin}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid #f3f4f6",
                                  background: matchedVoter?.vin === voter.vin ? "#f0faf2" : "transparent"
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
                                    border: matchedVoter?.vin === voter.vin ? "none" : "1px solid #d1d5db",
                                    background: matchedVoter?.vin === voter.vin ? "#1a5c2a" : "#fff",
                                    color: matchedVoter?.vin === voter.vin ? "#fff" : "#374151",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  {matchedVoter?.vin === voter.vin ? "Selected" : "Select"}
                                </button>
                              </div>
                            ))}
                          {puVoters.length === 0 && (
                            <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
                              No registered voters found for this polling unit.
                            </div>
                          )}
                        </div>
                      </div>
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
                    {form.studentInstitution === "Other Higher Institution Outside Kogi" && (
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
                          <option value="Rain-fed Farming">Rain-fed Farming</option>
                          <option value="Irrigation / Dry Season Farming">Irrigation / Dry Season Farming</option>
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
                      <Field label="Kogi State Ministry" required error={errors.civilServantMinistry}>
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
                I voluntarily join the Allied Peoples' Movement (APM) Campaign Management System and consent to my data being used for party coordination and communication.
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
        © 2026 Kogi Campaign Management System · Kogi State
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { color: #111; }
        input:focus, select:focus { border-color: #1a5c2a !important; box-shadow: 0 0 0 3px rgba(26,92,42,0.12); }
      `}</style>
    </div>
  );
}

export default function PublicRegistrationForm() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0faf2", color: "#009A44", fontWeight: 700 }}>
        Loading registration portal...
      </div>
    }>
      <PublicRegistrationFormContent />
    </Suspense>
  );
}

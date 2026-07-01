"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { X, Check, Loader2, Upload, Search, BadgeCheck, IdCard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoterIdCard } from "@/components/members/VoterIdCard";
import { KATSINA_LGAS, getWardsForLga, getPollingUnitObjects } from "@/lib/campaign-data";
import { useCreateMember } from "@/hooks/useMembers";
import {
  useVoterRegistry,
  splitVoterName,
  mapVoterGender,
  voterDobToDate,
  type VoterRecord,
} from "@/hooks/useVoterRegistry";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { useCouncillor } from "@/hooks/useCouncillors";
import { useChairman } from "@/hooks/useChairmen";
import { usePUAgent } from "@/hooks/usePUAgent";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEMBER_ROLES = [
  { value: "coordinator", label: "Coordinator" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "mobilizer", label: "Mobilizer" },
  { value: "field_officer", label: "Field Officer" },
  { value: "member", label: "Member" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const NIGERIAN_BANKS = [
  "Access Bank", "Zenith Bank", "Guaranty Trust Bank (GTB)", "United Bank for Africa (UBA)",
  "First Bank", "FCMB", "Union Bank", "Fidelity Bank", "Sterling Bank", "Stanbic IBTC", 
  "Wema Bank", "Polaris Bank", "Opay", "Palmpay", "Moniepoint", "Kuda Bank"
];

const COMMON_OCCUPATIONS = [
  "Student",
  "Farmer",
  "Trader",
  "Teacher",
  "Civil Servant",
  "Business Owner",
  "Artisan",
  "Housewife",
  "Unemployed",
  "Retired",
  "Other"
];

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

const STUDENT_INSTITUTIONS = [
  "Umaru Musa Yar'adua University (UMYU), Katsina",
  "Federal University Dutsin-Ma (FUDMA)",
  "Al-Qalam University, Katsina",
  "Federal University of Transportation, Daura",
  "Hassan Usman Katsina Polytechnic (HUK Poly), Katsina",
  "Federal Polytechnic, Daura",
  "Isa Kaita College of Education (IKCOE), Dutsin-Ma",
  "Katsina State College of Health Sciences (COHESKAT), Katsina Campus",
  "Katsina State College of Health Sciences, Daura Campus",
  "Kasimu Kofarsauri College of Education, Katsina",
  "College of Nursing and Midwifery, Katsina",
  "Cherish College of Nursing and Midwifery, Batsari",
  "National Open University of Nigeria (NOUN), Katsina Centre",
  "Federal College of Education (FCE), Katsina",
  "Yusuf Bala Usman College of Legal and General Studies, Daura",
  "Katsina State Institute of Technology and Management (KSITM)",
  "Al-Asala College of Health Sciences, Katsina",
  "School of Basic and Remedial Studies (SBRS), Funtua",
  "Malumfashi College of Nursing and Midwifery",
  "Institute of Almighty Management and Technology, Katsina",
  "Other Higher Institution Outside Katsina"
];

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


export const AddMemberModal = ({ isOpen, onClose }: AddMemberModalProps) => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const { role, organizationId, user } = useAuth();
  const { data: userOrg } = useUserOrganization();
  const { data: councillor } = useCouncillor();
  const { data: chairman } = useChairman();
  const { data: puAgent } = usePUAgent();
  const isSuperAdmin = role === "super_admin";
  const isChairman = role === "lga_chairman";
  const isCouncillor = role === "councillor";
  const isPUAgent = (role as string) === "polling_unit_agent";
  const canSelectOrg = isSuperAdmin || isChairman || isCouncillor;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    organizationId: "",
    lga: "",
    ward: "",
    polling_unit: "",
    gender: "",
    dateOfBirth: "",
    votersCardId: "",
    socialMediaHandle: "",
    bankName: "",
    accountNumber: "",
    maritalStatus: "",
    occupation: "",
    schoolName: "",
    schoolLevel: "",
    // Conditional demographics fields
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
  });

  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const filteredOccupations = COMMON_OCCUPATIONS.filter(occ => 
    occ.toLowerCase().includes(formData.occupation.toLowerCase())
  );

  const [votersCardFile, setVotersCardFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Voter registry lookup state
  const { findByVin, searchByName, searching } = useVoterRegistry();
  const [lookupMode, setLookupMode] = useState<"vin" | "name">("vin");
  const [vinInput, setVinInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<VoterRecord[]>([]);
  const [matchedVoter, setMatchedVoter] = useState<VoterRecord | null>(null);
  const [viewVoter, setViewVoter] = useState<VoterRecord | null>(null);
  const [idCardVoter, setIdCardVoter] = useState<VoterRecord | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; name: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const createMember = useCreateMember();
  const { data: organizations = [] } = useOrganizations();
  const wards = formData.lga ? getWardsForLga(formData.lga) : [];
  const farmWards = formData.farmerLga ? getWardsForLga(formData.farmerLga) : [];

  // Auto-set organization for org admins
  useEffect(() => {
    if (role === "org_admin" && organizationId) {
      setFormData(prev => ({ ...prev, organizationId }));
    }
  }, [role, organizationId]);

  // Pre-populate location for chairmen and councillors
  useEffect(() => {
    if (isChairman && chairman?.lga) {
      setFormData(prev => ({ ...prev, lga: chairman.lga }));
    } else if (isCouncillor && councillor?.lga && councillor?.ward) {
      setFormData(prev => ({ ...prev, lga: councillor.lga, ward: councillor.ward }));
    } else if (isPUAgent && puAgent?.lga && puAgent?.ward && puAgent?.polling_unit_name) {
      setFormData(prev => ({
        ...prev,
        lga: puAgent.lga,
        ward: puAgent.ward,
        polling_unit: puAgent.polling_unit_name
      }));
    }
  }, [isChairman, chairman, isCouncillor, councillor, isPUAgent, puAgent]);

  if (!isOpen) return null;

  const applyVoter = (voter: VoterRecord) => {
    const { firstName, lastName } = splitVoterName(voter.full_name);
    setMatchedVoter(voter);
    setLookupError(null);
    setNameResults([]);
    setFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      gender: mapVoterGender(voter.gender) || prev.gender,
      dateOfBirth: voterDobToDate(voter.dob_year) || prev.dateOfBirth,
      votersCardId: voter.vin,
      ...(voter.lga ? { lga: voter.lga } : {}),
      ...(voter.ward ? { ward: voter.ward } : {}),
      ...(voter.polling_unit_name ? { polling_unit: voter.polling_unit_name } : {}),
    }));
    toast.success(`Registered voter found: ${voter.full_name}`);
  };

  const handleVinLookup = async () => {
    setLookupError(null);
    try {
      const voter = await findByVin(vinInput);
      if (voter) {
        applyVoter(voter);
      } else {
        setMatchedVoter(null);
        setLookupError("No registered voter found for that VIN.");
      }
    } catch {
      setLookupError("Lookup failed. Please try again.");
    }
  };

  const handleNameSearch = async () => {
    setLookupError(null);
    try {
      const results = await searchByName(nameQuery);
      setNameResults(results);
      if (results.length === 0) {
        setLookupError("No registered voters match that name.");
      }
    } catch {
      setLookupError("Search failed. Please try again.");
    }
  };

  const clearMatch = () => {
    setMatchedVoter(null);
    setLookupError(null);
    setVinInput("");
    setNameQuery("");
    setNameResults([]);
  };



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setVotersCardFile(file);
    }
  };

  const uploadVotersCard = async (memberId: string): Promise<string | null> => {
    if (!votersCardFile) return null;

    const fileExt = votersCardFile.name.split(".").pop();
    const fileName = `${memberId}.${fileExt}`;
    const filePath = `${formData.organizationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("voter-cards")
      .upload(filePath, votersCardFile, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload voter card image");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("voter-cards")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let resolvedPollingUnitId: string | null = null;
      let finalPollingUnitName: string | null = formData.polling_unit || null;

      if (formData.lga && formData.ward && formData.polling_unit) {
        let dbCode: string | null = null;
        if (matchedVoter?.polling_unit_code) {
          const codeParts = matchedVoter.polling_unit_code.split("-");
          if (codeParts.length >= 4) {
            const wardNum = codeParts[2];
            const puNum = codeParts[3];
            dbCode = `W${wardNum}-${puNum}`;
          }
        }

        if (!dbCode) {
          const selectedPuObj = getPollingUnitObjects(formData.lga, formData.ward)
            .find(pu => pu.name === formData.polling_unit);
          dbCode = selectedPuObj?.code || null;
        }

        if (dbCode) {
          const { data: puData, error: puError } = await supabase
            .from("polling_units")
            .select("id, name")
            .eq("lga_name", formData.lga)
            .eq("ward_name", formData.ward)
            .eq("code", dbCode)
            .maybeSingle();

          if (!puError && puData) {
            resolvedPollingUnitId = puData.id;
            finalPollingUnitName = puData.name;
          }
        }
      }

      let finalOccupation = formData.occupation || null;
      let finalSchoolName = null;
      let finalSchoolLevel = null;

      if (finalOccupation === "Trader") {
        finalSchoolName = formData.subTrader === "Other Trader" ? formData.otherTrader : formData.subTrader;
      } else if (finalOccupation === "Student") {
        finalSchoolName = formData.studentInstitution === "Other Higher Institution Outside Katsina" ? formData.otherInstitution : formData.studentInstitution;
        finalSchoolLevel = "Tertiary";
      } else if (finalOccupation === "Business Owner") {
        finalSchoolName = formData.businessSector === "Other / Unknown Business" ? formData.otherBusiness : formData.businessSector;
      } else if (finalOccupation === "Teacher") {
        finalSchoolLevel = formData.teacherSchoolLevel;
        finalSchoolName = formData.teacherSchoolLevel === "Secondary" && formData.teacherSchoolName === "Other Secondary School"
          ? formData.otherTeacherSchoolName
          : formData.teacherSchoolName;
      } else if (finalOccupation === "Farmer") {
        finalSchoolName = `LGA: ${formData.farmerLga || ""}, Ward: ${formData.farmerWard || ""}`;
        finalSchoolLevel = `Size: ${formData.farmerSize || "0"} ha, Season: ${formData.farmerSeasonalType || ""}`;
      } else if (finalOccupation === "Civil Servant") {
        finalSchoolLevel = formData.civilServantJurisdiction;
        finalSchoolName = formData.civilServantJurisdiction === "State Ministry" ? formData.civilServantMinistry : "";
      } else {
        finalSchoolName = formData.schoolName || null;
        finalSchoolLevel = formData.schoolLevel || null;
      }

      const memberData = {
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        organization_id: formData.organizationId || null,
        state: "Katsina",
        lga: formData.lga || null,
        ward: formData.ward || null,
        polling_unit: finalPollingUnitName,
        polling_unit_id: resolvedPollingUnitId,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        voters_card_id: formData.votersCardId || null,
        voters_card_image_url: (!votersCardFile && matchedVoter?.photo_url) || null,
        created_by: user?.id || null,
        recruiter_id: null,
        social_media_handle: formData.socialMediaHandle || null,
        bank_name: formData.bankName || null,
        account_number: formData.accountNumber || null,
        marital_status: formData.maritalStatus || null,
        occupation: finalOccupation,
        school_name: finalSchoolName || null,
        school_level: finalSchoolLevel || null,
      };

      // Create member first
      const newMember = await createMember.mutateAsync(memberData as any);

      // Upload voter card if provided (overrides registry photo)
      if (votersCardFile && newMember?.id) {
        const imageUrl = await uploadVotersCard(newMember.id);
        if (imageUrl) {
          await supabase
            .from("members")
            .update({ voters_card_image_url: imageUrl })
            .eq("id", newMember.id);
        }
      }


      onClose();
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "",
        organizationId: "",
        lga: "",
        ward: "",
        polling_unit: "",
        gender: "",
        dateOfBirth: "",
        votersCardId: "",
        socialMediaHandle: "",
        bankName: "",
        accountNumber: "",
        maritalStatus: "",
        occupation: "",
        schoolName: "",
        schoolLevel: "",
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
      });
      setVotersCardFile(null);
      clearMatch();

      // Navigate to the member profile to show their ID card
      if (newMember?.id) {
        navigate(`/members/detail?id=${newMember.id}`);
      }
    } catch (error) {
      console.error("Error creating member:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30 sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Register New Member</h2>
            <p className="text-sm text-muted-foreground">Enter member details below</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Voter registry lookup */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Find Registered Voter</h3>
              <span className="text-xs text-muted-foreground">(auto-fills the form)</span>
            </div>

            {matchedVoter ? (
              <div className="flex items-center gap-3 rounded-lg bg-card border border-border p-3">
                {matchedVoter.photo_url ? (
                  <img
                    src={matchedVoter.photo_url}
                    alt={matchedVoter.full_name}
                    className="w-14 h-14 rounded-md object-cover border border-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                    <IdCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">
                      {matchedVoter.full_name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    VIN: {matchedVoter.vin}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {matchedVoter.polling_unit_name || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewVoter(matchedVoter)}
                    title="View voter details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearMatch}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLookupMode("vin")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                      lookupMode === "vin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    Search by VIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookupMode("name")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                      lookupMode === "name"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    Search by Name
                  </button>
                </div>

                {lookupMode === "vin" ? (
                  <div className="flex gap-2">
                    <input
                      className="input-premium flex-1"
                      placeholder="Enter Voter ID Number (VIN)"
                      value={vinInput}
                      onChange={(e) => setVinInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleVinLookup();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleVinLookup}
                      disabled={searching || !vinInput.trim()}
                    >
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="input-premium flex-1"
                        placeholder="Enter full name (e.g. Musa)"
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleNameSearch();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleNameSearch}
                        disabled={searching || nameQuery.trim().length < 2}
                      >
                        {searching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {nameResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {nameResults.map((voter) => (
                          <div
                            key={voter.id}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => applyVoter(voter)}
                              className="flex-1 flex items-center gap-3 text-left min-w-0"
                            >
                              {voter.photo_url ? (
                                <img
                                  src={voter.photo_url}
                                  alt={voter.full_name}
                                  className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <IdCard className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {voter.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  VIN: {voter.vin}
                                </p>
                                {(voter.ward || voter.polling_unit_name) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {[voter.ward, voter.polling_unit_name]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </p>
                                )}
                              </div>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => setViewVoter(voter)}
                              title="View voter details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {lookupError && (
                  <p className="text-xs text-destructive">{lookupError}</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <input
                required
                className="input-premium w-full"
                placeholder="e.g. Abdullahi"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                required
                className="input-premium w-full"
                placeholder="e.g. Musa"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender</label>
              <select
                required
                className="input-premium w-full"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                required
                className="input-premium w-full"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marital Status</label>
              <select
                required
                className="input-premium w-full"
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widow">Widow</option>
                <option value="Widower">Widower</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trade / Occupation</label>
              <select
                required
                className="input-premium w-full"
                value={formData.occupation}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    occupation: e.target.value,
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
                  });
                }}
              >
                <option value="">Select Occupation</option>
                {COMMON_OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Sub-Categories fields based on Occupation Selection */}
          {formData.occupation === "Trader" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Trade Sub-Category</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.subTrader}
                  onChange={(e) => setFormData({ ...formData, subTrader: e.target.value, otherTrader: "" })}
                >
                  <option value="">Select Trade Type</option>
                  {TRADER_SUB_TRADES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {formData.subTrader === "Other Trader" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Specify Other Trade</label>
                  <input
                    required
                    type="text"
                    className="input-premium w-full bg-card"
                    placeholder="e.g. Kola nut seller"
                    value={formData.otherTrader}
                    onChange={(e) => setFormData({ ...formData, otherTrader: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {formData.occupation === "Student" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Higher Institution</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.studentInstitution}
                  onChange={(e) => setFormData({ ...formData, studentInstitution: e.target.value, otherInstitution: "" })}
                >
                  <option value="">Select Institution</option>
                  {STUDENT_INSTITUTIONS.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>
              {formData.studentInstitution === "Other Higher Institution Outside Katsina" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Specify Institution Name</label>
                  <input
                    required
                    type="text"
                    className="input-premium w-full bg-card"
                    placeholder="e.g. Ahmadu Bello University, Zaria"
                    value={formData.otherInstitution}
                    onChange={(e) => setFormData({ ...formData, otherInstitution: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {formData.occupation === "Business Owner" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Business Sector</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.businessSector}
                  onChange={(e) => setFormData({ ...formData, businessSector: e.target.value, otherBusiness: "" })}
                >
                  <option value="">Select Business Sector</option>
                  {BUSINESS_SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {formData.businessSector === "Other / Unknown Business" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Specify Other Business</label>
                  <input
                    required
                    type="text"
                    className="input-premium w-full bg-card"
                    placeholder="e.g. Solar panel manufacturing"
                    value={formData.otherBusiness}
                    onChange={(e) => setFormData({ ...formData, otherBusiness: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {formData.occupation === "Teacher" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">School Level</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.teacherSchoolLevel}
                  onChange={(e) => setFormData({ ...formData, teacherSchoolLevel: e.target.value, teacherSchoolName: "", otherTeacherSchoolName: "" })}
                >
                  <option value="">Select Level</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Tertiary">Tertiary</option>
                </select>
              </div>
              {formData.teacherSchoolLevel === "Secondary" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Secondary School Name</label>
                  <select
                    required
                    className="input-premium w-full bg-card"
                    value={formData.teacherSchoolName}
                    onChange={(e) => setFormData({ ...formData, teacherSchoolName: e.target.value, otherTeacherSchoolName: "" })}
                  >
                    <option value="">Select School</option>
                    {KATSINA_SECONDARY_SCHOOLS.map((sch) => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                </div>
              )}
              {formData.teacherSchoolLevel && formData.teacherSchoolLevel !== "Secondary" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">School Name</label>
                  <input
                    required
                    type="text"
                    className="input-premium w-full bg-card"
                    placeholder="e.g. Government Day Primary School"
                    value={formData.teacherSchoolName}
                    onChange={(e) => setFormData({ ...formData, teacherSchoolName: e.target.value })}
                  />
                </div>
              )}
              {formData.teacherSchoolName === "Other Secondary School" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Specify Secondary School Name</label>
                  <input
                    required
                    type="text"
                    className="input-premium w-full bg-card"
                    placeholder="Enter secondary school name"
                    value={formData.otherTeacherSchoolName}
                    onChange={(e) => setFormData({ ...formData, otherTeacherSchoolName: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {formData.occupation === "Farmer" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm font-medium">Farm LGA</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.farmerLga}
                  onChange={(e) => setFormData({ ...formData, farmerLga: e.target.value, farmerWard: "" })}
                >
                  <option value="">Select LGA</option>
                  {KATSINA_LGAS.map((lga) => (
                    <option key={lga} value={lga}>{lga}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Farm Ward</label>
                <select
                  required
                  disabled={!formData.farmerLga}
                  className="input-premium w-full bg-card disabled:opacity-75"
                  value={formData.farmerWard}
                  onChange={(e) => setFormData({ ...formData, farmerWard: e.target.value })}
                >
                  <option value="">Select Ward</option>
                  {farmWards.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Size in Hectares</label>
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="input-premium w-full bg-card"
                  placeholder="e.g. 2.5"
                  value={formData.farmerSize}
                  onChange={(e) => setFormData({ ...formData, farmerSize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seasonal Type</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.farmerSeasonalType}
                  onChange={(e) => setFormData({ ...formData, farmerSeasonalType: e.target.value })}
                >
                  <option value="">Select Season</option>
                  <option value="Noman Damana (Rain-fed)">Noman Damana (Rain-fed)</option>
                  <option value="Noman Rani (Irrigation)">Noman Rani (Irrigation)</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            </div>
          )}

          {formData.occupation === "Civil Servant" && (
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-fade-in">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Employment Jurisdiction</label>
                <select
                  required
                  className="input-premium w-full bg-card"
                  value={formData.civilServantJurisdiction}
                  onChange={(e) => setFormData({ ...formData, civilServantJurisdiction: e.target.value, civilServantMinistry: "" })}
                >
                  <option value="">Select Jurisdiction</option>
                  <option value="State Ministry">State Ministry</option>
                  <option value="Local Government">Local Government</option>
                  <option value="Federal">Federal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {formData.civilServantJurisdiction === "State Ministry" && (
                <div className="space-y-2 col-span-2 animate-fade-in">
                  <label className="text-sm font-medium">Katsina State Ministry</label>
                  <select
                    required
                    className="input-premium w-full bg-card"
                    value={formData.civilServantMinistry}
                    onChange={(e) => setFormData({ ...formData, civilServantMinistry: e.target.value })}
                  >
                    <option value="">Select Ministry</option>
                    {KATSINA_MINISTRIES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                required
                className="input-premium w-full"
                placeholder="+234..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (Optional)</label>
              <input
                type="email"
                className="input-premium w-full"
                placeholder="name@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Voters Card ID</label>
            <input
              className="input-premium w-full"
              placeholder="e.g. 1234567890"
              value={formData.votersCardId}
              onChange={(e) => setFormData({ ...formData, votersCardId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank/Wallet Name (Optional)</label>
              <select
                className="input-premium w-full"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              >
                <option value="">Select Bank</option>
                {NIGERIAN_BANKS.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number (Optional)</label>
              <input
                className="input-premium w-full"
                placeholder="e.g. 0123456789"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">Social Media Handle (Optional)</label>
            <input
              className="input-premium w-full"
              placeholder="e.g. @username (Twitter/Instagram)"
              value={formData.socialMediaHandle}
              onChange={(e) => setFormData({ ...formData, socialMediaHandle: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Used to track potential reach and impressions</p>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">Voters Card Image</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {votersCardFile ? votersCardFile.name : "Click to upload image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {votersCardFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVotersCardFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {canSelectOrg ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Support Group (Optional)</label>
              <select
                className="input-premium w-full"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              >
                <option value="">No Support Group</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <input
                className="input-premium w-full bg-muted"
                value={userOrg?.name || "Loading..."}
                disabled
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="input-premium w-full"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="">Select Role</option>
              {MEMBER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">LGA</label>
              <select
                required
                disabled={isChairman || isCouncillor || isPUAgent}
                className="input-premium w-full disabled:opacity-70 disabled:bg-muted"
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value, ward: "" })}
              >
                <option value="">Select LGA</option>
                {KATSINA_LGAS.map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <select
                required
                disabled={!formData.lga || isCouncillor || isPUAgent}
                className="input-premium w-full disabled:opacity-70 disabled:bg-muted"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value, polling_unit: "" })}
              >
                <option value="">Select Ward</option>
                {wards.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Polling Unit (Optional)</label>
            <select
              className="input-premium w-full disabled:opacity-70 disabled:bg-muted"
              value={formData.polling_unit}
              onChange={(e) => setFormData({ ...formData, polling_unit: e.target.value })}
              disabled={!formData.ward || isPUAgent}
            >
              <option value="">Select Polling Unit</option>
              {getPollingUnitObjects(formData.lga, formData.ward).map((pu) => (
                <option key={pu.code} value={pu.name}>
                  {pu.name} ({pu.code})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="btn-command" disabled={createMember.isPending || uploading}>
              {(createMember.isPending || uploading) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Register Member
            </Button>
          </div>
        </form>
      </div>

      {/* Voter details popup */}
      {viewVoter && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setViewVoter(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Voter Information</h3>
              </div>
              <button
                onClick={() => setViewVoter(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                {viewVoter.photo_url ? (
                  <button
                    type="button"
                    onClick={() => {
                      setZoomScale(1);
                      setZoomPhoto({ url: viewVoter.photo_url!, name: viewVoter.full_name });
                    }}
                    className="relative group shrink-0 rounded-lg overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    title="Click to zoom"
                  >
                    <img
                      src={viewVoter.photo_url}
                      alt={viewVoter.full_name}
                      className="w-20 h-20 object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                      <Search className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </button>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <IdCard className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-base font-semibold text-foreground">{viewVoter.full_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Registered Voter</p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-px rounded-lg overflow-hidden border border-border bg-border">
                {[
                  { label: "VIN", value: viewVoter.vin },
                  { label: "Gender", value: viewVoter.gender || "—" },
                  { label: "Year of Birth", value: viewVoter.dob_year ? String(viewVoter.dob_year) : "—" },
                  { label: "LGA", value: viewVoter.lga || "—" },
                  { label: "Ward", value: viewVoter.ward || "—" },
                  {
                    label: "Polling Unit",
                    value: [viewVoter.polling_unit_name, viewVoter.polling_unit_code]
                      .filter(Boolean)
                      .join(" — ") || "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 bg-card px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                    <dd className="text-sm text-foreground text-right break-all">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setViewVoter(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIdCardVoter(viewVoter)}
                >
                  <IdCard className="w-4 h-4 mr-2" />
                  View ID Card
                </Button>
                <Button
                  type="button"
                  className="btn-command"
                  onClick={() => {
                    applyVoter(viewVoter);
                    setViewVoter(null);
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use This Voter
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voter ID card preview */}
      {idCardVoter && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setIdCardVoter(null)}
        >
          <div
            className="w-full max-w-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Voter's Card</h3>
              <button
                onClick={() => setIdCardVoter(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <VoterIdCard voter={idCardVoter} />
          </div>
        </div>
      )}



      {/* Passport photo lightbox */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium px-3 py-1 rounded-full bg-white/10">
            {zoomPhoto.name}
          </div>
          <button
            type="button"
            onClick={() => setZoomPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="max-w-[90vw] max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomPhoto.url}
              alt={zoomPhoto.name}
              draggable={false}
              style={{ transform: `scale(${zoomScale})`, transformOrigin: "center" }}
              className="rounded-lg shadow-2xl transition-transform duration-200 select-none"
              onClick={() => setZoomScale((s) => (s >= 3 ? 1 : +(s + 0.5).toFixed(1)))}
            />
          </div>

          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 rounded-full px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.max(1, +(s - 0.5).toFixed(1)))}
              className="px-3 py-1.5 text-white text-lg font-bold hover:bg-white/15 rounded-full transition-colors"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-white text-sm w-12 text-center tabular-nums">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.min(4, +(s + 0.5).toFixed(1)))}
              className="px-3 py-1.5 text-white text-lg font-bold hover:bg-white/15 rounded-full transition-colors"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
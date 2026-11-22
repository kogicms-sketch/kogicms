"use client";
import { useState, useEffect } from "react";
import { X, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KATSINA_LGAS, getWardsForLga, getPollingUnitObjects } from "@/lib/campaign-data";
import { useUpdateMember, MemberWithOrganization } from "@/hooks/useMembers";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { SchoolSelect } from "@/components/common/SchoolSelect";
import { STUDENT_INSTITUTIONS } from "@/data/student_institutions";
import { NIGERIAN_BANKS } from "@/data/nigerian_banks";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithOrganization;
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


export const EditMemberModal = ({ isOpen, onClose, member }: EditMemberModalProps) => {
  const { role } = useAuth();
  const { data: userOrg } = useUserOrganization();
  const isSuperAdmin = role === "super_admin";

  // Parse name into first and last
  const [firstName, ...lastNameParts] = member.full_name.split(" ");
  const lastName = lastNameParts.join(" ");

  const parseOccupationFields = (m: typeof member) => {
    const occ = m.occupation || "";
    const schoolName = m.school_name || "";
    const schoolLevel = m.school_level || "";

    let subTrader = "";
    let otherTrader = "";
    let studentInstitution = "";
    let otherInstitution = "";
    let businessSector = "";
    let otherBusiness = "";
    let teacherSchoolLevel = "";
    let teacherSchoolName = "";
    let otherTeacherSchoolName = "";
    let farmerLga = "";
    let farmerWard = "";
    let farmerSize = "";
    let farmerSeasonalType = "";
    let civilServantJurisdiction = "";
    let civilServantMinistry = "";

    if (occ === "Trader") {
      if (TRADER_SUB_TRADES.includes(schoolName)) {
        subTrader = schoolName;
      } else {
        subTrader = "Other Trader";
        otherTrader = schoolName;
      }
    } else if (occ === "Student") {
      if (STUDENT_INSTITUTIONS.includes(schoolName)) {
        studentInstitution = schoolName;
      } else {
        studentInstitution = "Other Higher Institution Outside Kogi";
        otherInstitution = schoolName;
      }
    } else if (occ === "Business Owner") {
      if (BUSINESS_SECTORS.includes(schoolName)) {
        businessSector = schoolName;
      } else {
        businessSector = "Other / Unknown Business";
        otherBusiness = schoolName;
      }
    } else if (occ === "Teacher") {
      teacherSchoolLevel = schoolLevel;
      if (KATSINA_SECONDARY_SCHOOLS.includes(schoolName)) {
        teacherSchoolName = schoolName;
      } else if (schoolLevel === "Secondary") {
        teacherSchoolName = "Other Secondary School";
        otherTeacherSchoolName = schoolName;
      } else {
        teacherSchoolName = schoolName;
      }
    } else if (occ === "Farmer") {
      const lgaMatch = schoolName.match(/LGA:\s*([^,]+)/);
      const wardMatch = schoolName.match(/Ward:\s*(.+)/);
      farmerLga = lgaMatch ? lgaMatch[1].trim() : "";
      farmerWard = wardMatch ? wardMatch[1].trim() : "";

      const sizeMatch = schoolLevel.match(/Size:\s*([^\s]+)/);
      const seasonMatch = schoolLevel.match(/Season:\s*(.+)/);
      farmerSize = sizeMatch ? sizeMatch[1].trim() : "";
      farmerSeasonalType = seasonMatch ? seasonMatch[1].trim() : "";
    } else if (occ === "Civil Servant") {
      civilServantJurisdiction = schoolLevel;
      civilServantMinistry = schoolName;
    }

    return {
      subTrader,
      otherTrader,
      studentInstitution,
      otherInstitution,
      businessSector,
      otherBusiness,
      teacherSchoolLevel,
      teacherSchoolName,
      otherTeacherSchoolName,
      farmerLga,
      farmerWard,
      farmerSize,
      farmerSeasonalType,
      civilServantJurisdiction,
      civilServantMinistry
    };
  };

  const initialParsed = parseOccupationFields(member);

  const [formData, setFormData] = useState({
    firstName: firstName || "",
    lastName: lastName || "",
    email: member.email || "",
    phone: member.phone || "",
    role: member.role || "",
    organizationId: member.organization_id || "",
    lga: member.lga || "",
    ward: member.ward || "",
    gender: member.gender || "",
    dateOfBirth: member.date_of_birth || "",
    votersCardId: member.voters_card_id || "",
    pollingUnit: member.polling_unit || "",
    maritalStatus: member.marital_status || "",
    occupation: member.occupation || "",
    schoolName: member.school_name || "",
    schoolLevel: member.school_level || "",
    bankName: member.bank_name || "",
    accountNumber: member.account_number || "",
    isDeceased: member.is_deceased || false,
    ...initialParsed
  });

  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const filteredOccupations = COMMON_OCCUPATIONS.filter(occ => 
    occ.toLowerCase().includes(formData.occupation.toLowerCase())
  );

  const [votersCardFile, setVotersCardFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Sync state with member prop if it changes while open
  useEffect(() => {
    if (isOpen && member) {
      const [fName, ...lNameParts] = member.full_name.split(" ");
      const parsedFields = parseOccupationFields(member);
      setFormData({
        firstName: fName || "",
        lastName: lNameParts.join(" ") || "",
        email: member.email || "",
        phone: member.phone || "",
        role: member.role || "",
        organizationId: member.organization_id || "",
        lga: member.lga || "",
        ward: member.ward || "",
        gender: member.gender || "",
        dateOfBirth: member.date_of_birth || "",
        votersCardId: member.voters_card_id || "",
        pollingUnit: member.polling_unit || "",
        maritalStatus: member.marital_status || "",
        occupation: member.occupation || "",
        schoolName: member.school_name || "",
        schoolLevel: member.school_level || "",
        bankName: member.bank_name || "",
        accountNumber: member.account_number || "",
        isDeceased: member.is_deceased || false,
        ...parsedFields
      });
      setVotersCardFile(null);
    }
  }, [isOpen, member]);


  const updateMember = useUpdateMember();
  const { data: organizations = [] } = useOrganizations();
  const wards = formData.lga ? getWardsForLga(formData.lga) : [];
  const farmWards = formData.farmerLga ? getWardsForLga(formData.farmerLga) : [];

  if (!isOpen) return null;

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
    const fileName = `${memberId}-${Date.now()}.${fileExt}`; // Add timestamp to avoid caching issues

    // Ensure we have a valid folder path (required by storage policy)
    const folder = formData.organizationId || 'default';
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("voter-cards")
      .upload(filePath, votersCardFile, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload voter card image: " + uploadError.message);
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
      let voters_card_image_url = member.voters_card_image_url;

      // Upload voter card if provided
      if (votersCardFile) {
        const imageUrl = await uploadVotersCard(member.id);
        if (imageUrl) {
          voters_card_image_url = imageUrl;
        }
      }

      let resolvedPollingUnitId: string | null = null;
      let finalPollingUnitName: string | null = formData.pollingUnit || null;

      if (formData.lga && formData.ward && formData.pollingUnit) {
        let dbCode: string | null = null;

        // Try to match the selected name in the static array first
        const selectedPuObj = getPollingUnitObjects(formData.lga, formData.ward)
          .find(pu => pu.name === formData.pollingUnit);
        dbCode = selectedPuObj?.code || null;

        // If not found in static array (e.g. it was populated from voter registry with real name),
        // try to look up from voter_registry using the VIN
        if (!dbCode && formData.votersCardId) {
          const { data: voterData } = await supabase
            .from("voter_registry")
            .select("polling_unit_code")
            .eq("vin", formData.votersCardId.trim())
            .maybeSingle();

          if (voterData?.polling_unit_code) {
            const codeParts = voterData.polling_unit_code.split("-");
            if (codeParts.length >= 4) {
              const wardNum = codeParts[2];
              const puNum = codeParts[3];
              dbCode = `W${wardNum}-${puNum}`;
            }
          }
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
        finalSchoolName = formData.studentInstitution === "Other Higher Institution Outside Kogi" ? formData.otherInstitution : formData.studentInstitution;
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

      const memberUpdates = {
        id: member.id,
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        organization_id: formData.organizationId || null,
        lga: formData.lga || null,
        ward: formData.ward || null,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        voters_card_id: formData.votersCardId || null,
        voters_card_image_url: voters_card_image_url,
        polling_unit: finalPollingUnitName,
        polling_unit_id: resolvedPollingUnitId,
        marital_status: formData.maritalStatus || null,
        occupation: finalOccupation,
        school_name: finalSchoolName || null,
        school_level: finalSchoolLevel || null,
        bank_name: formData.bankName || null,
        account_number: formData.accountNumber || null,
        is_deceased: formData.isDeceased,
      };

      await updateMember.mutateAsync(memberUpdates as any);

      onClose();
      // Reset is handled by useEffect on next open or can be left as is since we close
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member: " + (error as Error).message);
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
            <h2 className="text-xl font-bold text-foreground">Edit Member Details</h2>
            <p className="text-sm text-muted-foreground">Update information for {member.full_name}</p>
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
                <label className="text-sm font-medium">Higher Institution (Search & Select)</label>
                <SchoolSelect
                  value={formData.studentInstitution}
                  onChange={(val) => setFormData({ ...formData, studentInstitution: val, otherInstitution: "" })}
                  placeholder="Search or select school (e.g. ABU, BUK, FUDMA, UNILAG)..."
                />
              </div>
              {formData.studentInstitution === "Other Higher Institution Outside Kogi" && (
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
                  <option value="Rain-fed Farming">Rain-fed Farming</option>
                  <option value="Irrigation / Dry Season Farming">Irrigation / Dry Season Farming</option>
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
                  <label className="text-sm font-medium">Kogi State Ministry</label>
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

          {/* Bank & Payment Account Details Section */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              💳 Bank & Payment Account Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Select Bank Name</label>
                <select
                  className="input-premium w-full text-xs font-medium bg-background"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                >
                  <option value="">-- Select Bank --</option>
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">10-Digit NUBAN Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  className="input-premium w-full text-xs font-mono font-bold bg-background"
                  placeholder="e.g. 0123456789"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Voters Card Image
              {member.voters_card_image_url && !votersCardFile && (
                <span className="ml-2 text-xs text-muted-foreground">(Current image will be kept if not changed)</span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {votersCardFile ? votersCardFile.name : "Click to upload new image"}
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

          {isSuperAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <select
                required
                className="input-premium w-full"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              >
                <option value="">Select Organization</option>
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
                className="input-premium w-full"
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value, ward: "", pollingUnit: "" })}
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
                disabled={!formData.lga}
                className="input-premium w-full disabled:opacity-50"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value, pollingUnit: "" })}
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
              disabled={!formData.ward}
              className="input-premium w-full disabled:opacity-50"
              value={formData.pollingUnit}
              onChange={(e) => setFormData({ ...formData, pollingUnit: e.target.value })}
            >
              <option value="">Select Polling Unit</option>
              {formData.ward && getPollingUnitObjects(formData.lga, formData.ward).map((pu) => (
                <option key={pu.code} value={pu.name}>
                  {pu.name} ({pu.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <input
              type="checkbox"
              id="isDeceased"
              className="w-4 h-4 text-destructive focus:ring-destructive border-border rounded cursor-pointer"
              checked={formData.isDeceased}
              onChange={(e) => setFormData({ ...formData, isDeceased: e.target.checked })}
            />
            <label htmlFor="isDeceased" className="text-sm font-semibold text-destructive cursor-pointer select-none">
              Mark Member as Deceased (Voter Attrition)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="btn-command" disabled={updateMember.isPending || uploading}>
              {(updateMember.isPending || uploading) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import {
  useIncentiveBatches,
  useCreateIncentiveBatch,
  useMemberIncentives,
  useDisburseIncentive,
  useAllocateIncentive,
  IncentiveBatch
} from "@/hooks/useIncentives";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Gift,
  QrCode,
  Search,
  CheckCircle,
  Calendar,
  DollarSign,
  Package,
  ShieldCheck,
  Plus,
  ChevronRight,
  Loader2,
  Phone,
  User,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export const WelfareManager = () => {
  const { role, user } = useAuth();
  const { data: authorizedLgas = [] } = useAuthorizedLgas();
  const isWardAdmin = role === "councillor";

  // Resolve user LGA and Ward if Councillor or LGA Chairman
  const { data: userProfile } = useQuery({
    queryKey: ["welfare-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("lga, ward, full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  const userLga = userProfile?.lga || "";
  const userWard = userProfile?.ward || "";

  // Fetch batches
  // For Support Group Admins: filter by target_support_group_id
  // For Ward Admins: filter by target_lga and target_ward
  // For LGA Chairmen: filter by target_lga
  // For others: fetch all (we'll filter in memory if needed)
  const { organizationId } = useAuth();
  const batchFilters = role === "org_admin" && organizationId
    ? { target_support_group_id: organizationId }
    : isWardAdmin 
    ? { target_lga: userLga, target_ward: userWard } 
    : role === "lga_chairman" 
    ? { target_lga: userLga } 
    : {};
  const { data: batches = [], isLoading: batchesLoading } = useIncentiveBatches(batchFilters);

  // Fetch all members in ward or support group (for scanning simulation)
  const { data: scanMembers = [] } = useQuery({
    queryKey: ["welfare-scan-members", role, userLga, userWard, organizationId],
    queryFn: async () => {
      if (role === "org_admin" && organizationId) {
        const { data, error } = await supabase
          .from("members")
          .select("id, full_name, phone, polling_unit, membership_id")
          .or(`organization_id.eq.${organizationId},support_group_id.eq.${organizationId}`)
          .eq("is_deceased", false)
          .order("full_name", { ascending: true });
        if (error) throw error;
        return data;
      } else if (isWardAdmin && userLga && userWard) {
        const { data, error } = await supabase
          .from("members")
          .select("id, full_name, phone, polling_unit, membership_id")
          .eq("lga", userLga)
          .eq("ward", userWard)
          .eq("is_deceased", false)
          .order("full_name", { ascending: true });
        if (error) throw error;
        return data;
      }
      return [];
    },
    enabled: (isWardAdmin && !!userLga && !!userWard) || (role === "org_admin" && !!organizationId)
  });

  // State
  const isSupportGroupAdmin = role === "org_admin";
  const canScan = isWardAdmin || isSupportGroupAdmin;
  const [activeTab, setActiveTab] = useState<"dashboard" | "create" | "scan">(canScan ? "scan" : "dashboard");
  const [selectedLgaId, setSelectedLgaId] = useState<string>("");
  const [selectedLgaName, setSelectedLgaName] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [routeType, setRouteType] = useState<"jurisdiction" | "support_group">("jurisdiction");
  const [selectedSupportGroupId, setSelectedSupportGroupId] = useState<string>("");
  
  // Multi-select destination states
  const [selectedLgas, setSelectedLgas] = useState<string[]>([]);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);

  // Scanner State
  const [scannedId, setScannedId] = useState<string>("");
  const [selectedSimMemberId, setSelectedSimMemberId] = useState<string>("");
  const [scannedMember, setScannedMember] = useState<any>(null);
  const [loadingMember, setLoadingMember] = useState<boolean>(false);
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccessAnim, setScanSuccessAnim] = useState<boolean>(false);

  // Allocations list for the selected batch
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Mutations
  const createBatchMutation = useCreateIncentiveBatch();
  const disburseMutation = useDisburseIncentive();
  const allocateMutation = useAllocateIncentive();

  // Fetch verified support groups for routing
  const { data: verifiedSupportGroups = [] } = useQuery({
    queryKey: ["verified-support-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, verification_status")
        .eq("verification_status", "verified")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Load LGAs list
  const { data: lgasList = [] } = useQuery({
    queryKey: ["welfare-lgas-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lgas").select("id, name").order("name", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Set selectedLgaId for LGA Chairman
  useEffect(() => {
    if (role === "lga_chairman" && userLga && lgasList.length > 0) {
      const match = lgasList.find((l) => l.name.toLowerCase() === userLga.toLowerCase());
      if (match) {
        setSelectedLgaId(match.id);
      }
    }
  }, [role, userLga, lgasList]);

  // Set selectedSupportGroupId and routeType for Support Group Admin
  useEffect(() => {
    if (isSupportGroupAdmin && organizationId) {
      setRouteType("support_group");
      setSelectedSupportGroupId(organizationId);
    }
  }, [isSupportGroupAdmin, organizationId]);

  // Load Wards list for selected LGA
  const { data: wardsList = [] } = useQuery({
    queryKey: ["welfare-wards-list", selectedLgaId],
    queryFn: async () => {
      if (!selectedLgaId) return [];
      const { data, error } = await supabase
        .from("wards")
        .select("id, name")
        .eq("lga_id", selectedLgaId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLgaId
  });

  // Load Wards list for multiple selected LGAs (for routing catalogs)
  const { data: multiWardsList = [] } = useQuery({
    queryKey: ["welfare-multi-wards-list", selectedLgas],
    queryFn: async () => {
      if (selectedLgas.length === 0) return [];
      const { data: lgas, error: lgasError } = await supabase
        .from("lgas")
        .select("id")
        .in("name", selectedLgas);
      if (lgasError || !lgas || lgas.length === 0) return [];
      const lgaIds = lgas.map(l => l.id);
      
      const { data, error } = await supabase
        .from("wards")
        .select("id, name, lga_id")
        .in("lga_id", lgaIds)
        .order("name", { ascending: true });
      if (error) throw error;
      
      return data.map((w: any) => {
        const lga = lgasList.find((l) => l.id === w.lga_id);
        return {
          id: w.id,
          name: w.name,
          lgaName: lga?.name || ""
        };
      });
    },
    enabled: selectedLgas.length > 0 && lgasList.length > 0
  });

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"cash" | "material" | "grant" | "other" | string>("material");
  const [formItemName, setFormItemName] = useState("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formTotal, setFormTotal] = useState<string>("");
  const [formBulkUnit, setFormBulkUnit] = useState("Bag");
  const [formRetailUnit, setFormRetailUnit] = useState("Tiya");
  const [formConversionRate, setFormConversionRate] = useState<string>("");

  // Scanner disbursement modal states
  const [showDisburseUomModal, setShowDisburseUomModal] = useState(false);
  const [uomTargetBatch, setUomTargetBatch] = useState<IncentiveBatch | null>(null);
  const [uomTargetRecordId, setUomTargetRecordId] = useState<string | undefined>(undefined);
  const [uomAllocationType, setUomAllocationType] = useState<"whole" | "fractional">("whole");
  const [uomQuantity, setUomQuantity] = useState<string>("1");

  // Auto-fill template UoM values
  const handleItemNameChange = (val: string) => {
    setFormItemName(val);
    if (formType === "material") {
      const lower = val.toLowerCase();
      if (lower === "fertilizer" || lower === "fertilizer bag" || lower === "fertilizers") {
        setFormConversionRate("40");
        setFormBulkUnit("Bag");
        setFormRetailUnit("Tiya");
      } else if (lower === "rice" || lower === "rice bag") {
        setFormConversionRate("18");
        setFormBulkUnit("Bag");
        setFormRetailUnit("Tiya");
      }
    }
  };

  // Clean form
  const resetForm = () => {
    setFormName("");
    setFormType("material");
    setFormItemName("");
    setFormAmount("");
    setFormTotal("");
    setSelectedLgaId("");
    setSelectedLgaName("");
    setSelectedWard("");
    setSelectedLgas([]);
    setSelectedWards([]);
    setFormBulkUnit("Bag");
    setFormRetailUnit("Tiya");
    setFormConversionRate("");
    setRouteType("jurisdiction");
    setSelectedSupportGroupId("");
  };

  // Create Batch Submit
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formItemName || !formTotal) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const total = parseInt(formTotal);
    if (isNaN(total) || total <= 0) {
      toast.error("Total packages must be greater than 0.");
      return;
    }

    const amount = formAmount ? parseFloat(formAmount) : 0;
    const funderName = userProfile?.full_name || user?.email || "Campaign Official";
    const funderRole = role || "campaign_official";

    const conversionRate = formConversionRate && formType === "material" ? parseFloat(formConversionRate) : null;
    const bulkUnit = formType === "material" ? formBulkUnit : null;
    const retailUnit = formType === "material" ? formRetailUnit : null;

    try {
      if (routeType === "support_group") {
        if (!selectedSupportGroupId) {
          toast.error("Please select a target Support Group.");
          return;
        }
        await createBatchMutation.mutateAsync({
          name: formName,
          type: formType,
          item_name: formItemName,
          amount_per_member: amount,
          total_packages: total,
          funder_name: funderName,
          funder_role: funderRole,
          target_lga: null,
          target_ward: null,
          target_support_group_id: selectedSupportGroupId,
          status: "active" as const,
          received_status: isSupportGroupAdmin ? "received" : "pending",
          conversion_rate: conversionRate,
          bulk_unit: bulkUnit,
          retail_unit: retailUnit
        });
        toast.success(isSupportGroupAdmin ? "Independent self-funded allocation logged and ready!" : "Allocated and routed to Support Group!");
      } else if (selectedWards.length > 0) {
        // Multi-destination: create a batch per ward
        const qtyPerWard = Math.max(1, Math.floor(total / selectedWards.length));
        
        for (const wardKey of selectedWards) {
          const [lgaName, wardName] = wardKey.split('|');
          
          await createBatchMutation.mutateAsync({
            name: `${formName} - ${wardName}`,
            type: formType,
            item_name: formItemName,
            amount_per_member: amount,
            total_packages: qtyPerWard,
            funder_name: funderName,
            funder_role: funderRole,
            target_lga: lgaName,
            target_ward: wardName,
            status: "active" as const,
            received_status: "pending",
            conversion_rate: conversionRate,
            bulk_unit: bulkUnit,
            retail_unit: retailUnit
          });
        }
        toast.success(`Allocated and routed to ${selectedWards.length} Wards!`);
      } else if (selectedLgas.length > 0) {
        // Multi-destination: create a batch per LGA
        const qtyPerLga = Math.max(1, Math.floor(total / selectedLgas.length));
        
        for (const lgaName of selectedLgas) {
          await createBatchMutation.mutateAsync({
            name: `${formName} - ${lgaName}`,
            type: formType,
            item_name: formItemName,
            amount_per_member: amount,
            total_packages: qtyPerLga,
            funder_name: funderName,
            funder_role: funderRole,
            target_lga: lgaName,
            target_ward: null,
            status: "active" as const,
            received_status: "pending",
            conversion_rate: conversionRate,
            bulk_unit: bulkUnit,
            retail_unit: retailUnit
          });
        }
        toast.success(`Allocated and routed to ${selectedLgas.length} LGAs!`);
      } else {
        // Fallback or single destination / State-wide
        let targetLga = selectedLgaName || null;
        let targetWard = selectedWard || null;

        if (role === "lga_chairman" || isWardAdmin) {
          targetLga = userLga;
        }
        if (isWardAdmin) {
          targetWard = userWard;
        }

        await createBatchMutation.mutateAsync({
          name: formName,
          type: formType,
          item_name: formItemName,
          amount_per_member: amount,
          total_packages: total,
          funder_name: funderName,
          funder_role: funderRole,
          target_lga: targetLga,
          target_ward: targetWard,
          status: "active" as const,
          received_status: "pending",
          conversion_rate: conversionRate,
          bulk_unit: bulkUnit,
          retail_unit: retailUnit
        });
      }
      
      resetForm();
      setActiveTab("dashboard");
    } catch (e) {
      // toast is shown in mutation
    }
  };

  // Simulate scanning
  const handleSimulateScan = async (memberIdVal: string) => {
    if (!memberIdVal) return;
    setLoadingMember(true);
    setIsScanning(true);
    setScanSuccessAnim(false);

    // Simulate camera laser scan time
    setTimeout(async () => {
      // Remove any QR prefix if scanned directly
      const cleanId = memberIdVal.replace("DR-MEMBER-", "");

      // Lookup member
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone, lga, ward, polling_unit, membership_id")
        .or(`id.eq.${cleanId},membership_id.eq.${cleanId}`)
        .maybeSingle();

      setLoadingMember(false);
      setIsScanning(false);

      if (error || !data) {
        toast.error("Member QR Code invalid or not registered in the database.");
        setScannedMember(null);
        return;
      }

      setScannedMember(data);
      setRecipientPhone(data.phone || "");
      setScanSuccessAnim(true);
      toast.success(`QR Code Scanned: ${data.full_name}`);
    }, 1500);
  };

  // Trigger scan lookup when scannedId changes manually
  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedId) return;
    handleSimulateScan(scannedId);
  };

  // Trigger scan lookup when simulated member is chosen
  useEffect(() => {
    if (selectedSimMemberId) {
      handleSimulateScan(selectedSimMemberId);
    }
  }, [selectedSimMemberId]);

  // Fetch incentives allocated/disbursed to scanned member
  const { data: memberIncentivesList = [], refetch: refetchMemberIncentives } = useQuery({
    queryKey: ["scanned-member-incentives", scannedMember?.id],
    queryFn: async () => {
      if (!scannedMember?.id) return [];
      const { data, error } = await supabase
        .from("member_incentives")
        .select("*, batch:batch_id(*)")
        .eq("member_id", scannedMember.id);
      if (error) throw error;
      return data;
    },
    enabled: !!scannedMember?.id
  });

  // Filter batches that are routed to this ward and have space for allocation
  const availableBatchesForOnSite = batches.filter(
    (b) => b.status === "active" && b.allocated_packages < b.total_packages
  );

  // Check if member already allocated this batch
  const isAllocatedToBatch = (batchId: string) => {
    return memberIncentivesList.some((mi) => mi.batch_id === batchId);
  };

  // Perform actual disbursement to server
  const executeDisburse = async (
    batchId: string, 
    incentiveRecordId?: string,
    quantity?: number,
    unit?: string,
    equivalentFraction?: number
  ) => {
    if (!scannedMember) return;
    
    if (!recipientPhone) {
      toast.error("Recipient phone number is required for the audit trail.");
      return;
    }

    try {
      await disburseMutation.mutateAsync({
        id: incentiveRecordId,
        batch_id: batchId,
        member_id: scannedMember.id,
        phone_number: recipientPhone,
        disbursed_quantity: quantity,
        disbursed_unit: unit,
        disbursed_equivalent_fraction: equivalentFraction
      });
      
      // Refresh scanned member incentives
      refetchMemberIncentives();
      
      // If we did a direct on-site disbursement, we clear search state
      if (!incentiveRecordId) {
        setSelectedBatchId("");
      }

      setShowDisburseUomModal(false);
      setUomTargetBatch(null);
      setUomTargetRecordId(undefined);
    } catch (e) {
      // Error handled by mutation
    }
  };

  // Perform disbursement click
  const handleDisburse = (batchId: string, incentiveRecordId?: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (batch && batch.type === "material" && batch.conversion_rate) {
      setUomTargetBatch(batch);
      setUomTargetRecordId(incentiveRecordId);
      setUomAllocationType("whole");
      setUomQuantity("1");
      setShowDisburseUomModal(true);
    } else {
      executeDisburse(batchId, incentiveRecordId);
    }
  };

  const handleDisburseUomSubmit = () => {
    if (!uomTargetBatch) return;
    
    const qty = parseFloat(uomQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    let unit = uomTargetBatch.bulk_unit || "Bag";
    let equivalentFraction = 1;

    if (uomAllocationType === "whole") {
      equivalentFraction = qty;
    } else {
      unit = uomTargetBatch.retail_unit || "Tiya";
      const rate = Number(uomTargetBatch.conversion_rate);
      equivalentFraction = qty / rate;
    }

    executeDisburse(
      uomTargetBatch.id,
      uomTargetRecordId,
      qty,
      unit,
      equivalentFraction
    );
  };

  // Perform allocation
  const handleAllocate = async (batchId: string) => {
    if (!scannedMember) return;
    try {
      await allocateMutation.mutateAsync({
        batch_id: batchId,
        member_id: scannedMember.id
      });
      refetchMemberIncentives();
    } catch (e) {
      // Handled
    }
  };

  // Fetch list of disbursements for active batch in history view
  const { data: batchDisbursements = [], isLoading: disbursementsLoading } = useQuery({
    queryKey: ["batch-disbursements-details", activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      const { data, error } = await supabase
        .from("member_incentives")
        .select(`
          *,
          member:member_id (full_name, phone, lga, ward, polling_unit)
        `)
        .eq("batch_id", activeBatchId)
        .order("disbursed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeBatchId
  });

  return (
    <div className="space-y-6">
      {/* Premium APC Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-apc-green" />
            Welfare & Political Incentive Portal
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tiered materials/funds distribution system with unalterable anti-fraud QR verification logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveTab("dashboard"); setActiveBatchId(null); }}
            className="text-xs cursor-pointer"
          >
            {canScan ? "Welfare Incoming" : "Campaign Dashboard"}
          </Button>

          {!isWardAdmin && (
            <Button
              variant={activeTab === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("create")}
              className="text-xs gap-1.5 cursor-pointer bg-gradient-to-r hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Allocation
            </Button>
          )}

          {canScan && (
            <Button
              variant={activeTab === "scan" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("scan")}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Handover Portal
            </Button>
          )}
        </div>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-apc-green">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-apc-green/10 rounded-lg text-apc-green">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Interventions</p>
                  <h3 className="text-2xl font-black">{batches.filter(b => b.status === 'active').length}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Routed Packages</p>
                  <h3 className="text-2xl font-black">
                    {batches.reduce((sum, b) => sum + b.total_packages, 0).toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful Handovers</p>
                  <h3 className="text-2xl font-black">
                    {batches.reduce((sum, b) => sum + b.disbursed_packages, 0).toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeBatchId ? (
            /* DETAILED DISBURSEMENTS HISTORY LOG FOR A BATCH */
            <Card className="border border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-lg">Disbursement Audit Log</CardTitle>
                  <CardDescription>
                    Unmodifiable, live ledger of handovers for batch:{" "}
                    <span className="font-bold text-foreground">
                      {batches.find((b) => b.id === activeBatchId)?.name}
                    </span>
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveBatchId(null)}>
                  Back to Packages
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {disbursementsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading ledger...
                  </div>
                ) : batchDisbursements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No disbursements yet</p>
                    <p className="text-xs mt-0.5">Disbursed items will reflect here on scan handover.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="p-3 font-semibold text-xs text-muted-foreground pl-6">Beneficiary Member</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Location (LGA / Ward)</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Polling Unit</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Handover Mobile</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Ward Executed By</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Date Handed Over</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground pr-6">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-b">
                        {batchDisbursements.map((d: any) => (
                          <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-bold text-foreground pl-6">
                              {d.member?.full_name || "Unknown"}
                              {d.disbursed_quantity !== null && d.disbursed_quantity !== undefined && (
                                <span className="block text-[10px] text-indigo-600 font-semibold mt-0.5">
                                  Qty: {d.disbursed_quantity} {d.disbursed_unit} ({Number(d.disbursed_equivalent_fraction).toFixed(3)} Bag)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {d.member?.lga || "—"} / {d.member?.ward || "—"}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground font-semibold">
                              {d.member?.polling_unit || "—"}
                            </td>
                            <td className="p-3 text-xs font-mono text-foreground font-semibold">
                              {d.phone_number || "—"}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground font-medium">
                              {d.disbursed_by_name || "—"}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {d.disbursed_at ? format(new Date(d.disbursed_at), "MMM dd, yyyy - hh:mm a") : "—"}
                            </td>
                            <td className="p-3 pr-6">
                              <Badge variant="outline" className={
                                d.audit_status === 'verified'
                                  ? 'border-green-600 text-green-600 bg-green-500/5'
                                  : d.audit_status === 'flagged'
                                  ? 'border-red-600 text-red-600 bg-red-500/5'
                                  : 'border-orange-500 text-orange-600 bg-orange-500/5'
                              }>
                                {d.audit_status === 'verified'
                                  ? 'Verified'
                                  : d.audit_status === 'flagged'
                                  ? 'Flagged'
                                  : 'Awaiting Audit'
                                }
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* INTERVENTIONS PACKAGES LIST */
            <Card className="border border-border shadow-sm">
              <CardHeader>
                <CardTitle>Incentives Allocation Ledger</CardTitle>
                <CardDescription>
                  {isWardAdmin 
                    ? "Incentive packages routed to your Ward for PU distribution." 
                    : "Incentive campaign disbursements and budgets routed downwards."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading allocations...
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-b-xl border-t">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-40 text-gray-400" />
                    <p className="text-sm font-semibold">No allocated packages found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {isWardAdmin 
                        ? "Welfare allocations from Senators, Reps, or LGA will reflect here." 
                        : "You haven't funded any incentive allocations yet."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="p-3 font-semibold text-xs text-muted-foreground pl-6">Campaign / Intervention Name</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Benefit Item</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Funder Name (Role)</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Target Jurisdiction</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground text-center">Allocated</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground text-center">Disbursed</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground">Status</th>
                          <th className="p-3 font-semibold text-xs text-muted-foreground pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-b">
                        {batches.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-bold text-foreground pl-6">
                              {b.name}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{b.item_name}</span>
                              {b.amount_per_member > 0 && ` (₦${Number(b.amount_per_member).toLocaleString()})`}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{b.funder_name}</span>
                              <span className="block text-[10px] opacity-80">{b.funder_role.replace('_', ' ')}</span>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {b.target_lga ? `${b.target_lga}` : "State-Wide"}
                              {b.target_ward && ` > ${b.target_ward}`}
                            </td>
                            <td className="p-3 text-xs text-center font-semibold text-indigo-600">
                              {b.allocated_packages} / {b.total_packages}
                            </td>
                            <td className="p-3 text-xs text-center font-bold text-green-600">
                              {b.disbursed_packages} / {b.total_packages}
                            </td>
                            <td className="p-3">
                              {b.status === 'completed' ? (
                                <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs py-0.5 px-2">Completed</Badge>
                              ) : b.status === 'cancelled' ? (
                                <Badge variant="destructive" className="text-xs py-0.5 px-2">Cancelled</Badge>
                              ) : b.target_ward ? (
                                <Badge variant="outline" className={b.received_status === 'received' ? 'border-green-600 text-green-600 bg-green-500/5 text-[10px] py-0.5 px-2 font-bold' : 'border-amber-500 text-amber-600 bg-amber-500/5 text-[10px] py-0.5 px-2 font-bold'}>
                                  {b.received_status === 'received' 
                                    ? `Received by ${b.target_ward} (Ready)` 
                                    : `In Transit to ${b.target_ward}`}
                                </Badge>
                              ) : b.target_lga ? (
                                <Badge variant="outline" className={b.received_status === 'received' ? 'border-green-600 text-green-600 bg-green-500/5 text-[10px] py-0.5 px-2 font-bold' : 'border-amber-500 text-amber-600 bg-amber-500/5 text-[10px] py-0.5 px-2 font-bold'}>
                                  {b.received_status === 'received' 
                                    ? `Received by ${b.target_lga} (Ready)` 
                                    : `In Transit to ${b.target_lga}`}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-600 text-green-600 bg-green-500/5 text-[10px] py-0.5 px-2 font-bold">
                                  State-Wide (Ready)
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 pr-6 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveBatchId(b.id)}
                                className="text-xs gap-1 cursor-pointer text-indigo-600 hover:text-indigo-800"
                              >
                                View Log <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "create" && !isWardAdmin && (
        /* ALLOCATION BUDGET ROUTING FORM */
        <Card className="border border-border shadow-sm max-w-xl mx-auto animate-fade-in">
          <CardHeader>
            <CardTitle>Create & Route Welfare Package</CardTitle>
            <CardDescription>
              Allocate budget or material items to be distributed via QR-code handover by Ward Officials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Campaign Intervention Name</label>
                <input
                  required
                  className="input-premium w-full text-sm"
                  placeholder="e.g., Kogi Central Student Scholarship Phase 1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Incentive Type</label>
                  <select
                    className="input-premium w-full text-sm h-[40px] bg-card"
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                  >
                    <option value="material">Material (Rice, Fertilizer, etc.)</option>
                    <option value="cash">Cash Transfer</option>
                    <option value="grant">Political Grant</option>
                    <option value="other">Other Welfare</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Item Name</label>
                  <input
                    required
                    className="input-premium w-full text-sm"
                    placeholder="e.g., Rice Bag, Scholarship, Cash"
                    value={formItemName}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                  />
                </div>
              </div>

              {formType === "material" && (
                <div className="border border-border/80 bg-muted/20 p-3.5 rounded-xl space-y-3 animate-scale-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Unit-of-Measure (UoM) Conversion Settings
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Bulk Unit</label>
                      <input
                        className="input-premium w-full text-xs h-[36px]"
                        placeholder="e.g., Bag, Buhuna"
                        value={formBulkUnit}
                        onChange={(e) => setFormBulkUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Retail Unit</label>
                      <input
                        className="input-premium w-full text-xs h-[36px]"
                        placeholder="e.g., Tiya, Mud"
                        value={formRetailUnit}
                        onChange={(e) => setFormRetailUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Rate (1 Bulk = X Retail)</label>
                      <input
                        type="number"
                        className="input-premium w-full text-xs h-[36px]"
                        placeholder="e.g., 40, 18"
                        value={formConversionRate}
                        onChange={(e) => setFormConversionRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Define conversion rate between bulk packages and retail units (e.g., 1 Bag = 40 Tiyas for Fertilizer, 1 Bag = 18 Tiyas for Rice).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Amount per Member (Optional)</label>
                  <input
                    type="number"
                    className="input-premium w-full text-sm"
                    placeholder="e.g., 50000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Total Packages (Quantity)</label>
                  <input
                    required
                    type="number"
                    className="input-premium w-full text-sm"
                    placeholder="e.g., 100"
                    value={formTotal}
                    onChange={(e) => setFormTotal(e.target.value)}
                  />
                </div>
              </div>

              {/* TARGET ROUTING SELECTOR */}
              <div className="border-t border-border pt-4 mt-4 space-y-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-apc-green" /> Target Allocation Routing
                </h4>

                {isSupportGroupAdmin ? (
                  <div className="space-y-2 animate-scale-in">
                    <label className="text-xs font-semibold text-muted-foreground uppercase block">Target Support Group</label>
                    <input
                      disabled
                      className="input-premium w-full text-sm bg-muted/50 text-muted-foreground font-semibold"
                      value="Logged under your Support Group (Self-Funded)"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Routing Target Type</label>
                      <select
                        className="input-premium w-full text-sm h-[40px] bg-card"
                        value={routeType}
                        onChange={(e: any) => setRouteType(e.target.value)}
                      >
                        <option value="jurisdiction">Route to Ward/LGA</option>
                        <option value="support_group">Route to Support Group</option>
                      </select>
                    </div>

                    {routeType === "jurisdiction" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* LGA Multi-Select Checklist */}
                        {role !== "lga_chairman" && !isWardAdmin && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase block">Target LGAs</label>
                            <div className="border border-border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2 bg-card shadow-inner">
                              {lgasList
                                .filter((lga) => {
                                  if (authorizedLgas.includes("ALL")) return true;
                                  return authorizedLgas.includes(lga.name);
                                })
                                .map((lga) => (
                                  <label key={lga.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground hover:text-indigo-600 transition-colors">
                                    <Checkbox
                                      checked={selectedLgas.includes(lga.name)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedLgas([...selectedLgas, lga.name]);
                                        } else {
                                          setSelectedLgas(selectedLgas.filter((name) => name !== lga.name));
                                          // Remove wards associated with this LGA
                                          const wardsToRemove = multiWardsList
                                            .filter((w) => w.lgaName === lga.name)
                                            .map((w) => `${w.lgaName}|${w.name}`);
                                          setSelectedWards(selectedWards.filter((w) => !wardsToRemove.includes(w)));
                                        }
                                      }}
                                    />
                                    <span>{lga.name}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Ward Multi-Select Checklist (Filtered by Selected LGAs) */}
                        {!isWardAdmin && (selectedLgas.length > 0 || role === "lga_chairman") && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs font-semibold text-muted-foreground uppercase block">Target Wards (Optional)</label>
                            <div className="border border-border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2 bg-card shadow-inner">
                              {(role === "lga_chairman" ? wardsList.map(w => ({ ...w, lgaName: userLga })) : multiWardsList).map((ward) => (
                                <label key={ward.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground hover:text-indigo-600 transition-colors">
                                  <Checkbox
                                    checked={selectedWards.includes(`${ward.lgaName}|${ward.name}`)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedWards([...selectedWards, `${ward.lgaName}|${ward.name}`]);
                                        } else {
                                          setSelectedWards(selectedWards.filter((name) => name !== `${ward.lgaName}|${ward.name}`));
                                        }
                                      }}
                                    />
                                    <span>{ward.name} <span className="text-[10px] text-muted-foreground font-normal">({ward.lgaName})</span></span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-xs font-semibold text-muted-foreground uppercase block">Target Support Group</label>
                        <select
                          required={routeType === "support_group"}
                          className="input-premium w-full text-sm h-[40px] bg-card"
                          value={selectedSupportGroupId}
                          onChange={(e) => setSelectedSupportGroupId(e.target.value)}
                        >
                          <option value="">-- Choose Verified Support Group --</option>
                          {verifiedSupportGroups.map((sg) => (
                            <option key={sg.id} value={sg.id}>
                              {sg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-between gap-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-1/2 text-xs">
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="w-1/2 text-xs bg-navy-deep text-white bg-gradient-to-r hover:opacity-95 transition-opacity"
                >
                  {createBatchMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Creating...
                    </>
                  ) : (
                    "Allocate & Route Package"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "scan" && canScan && (
        /* QR CODE SCANNER HANDOVER INTERFACE */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* QR Scan Viewport Card */}
          <Card className="md:col-span-1 border border-border shadow-sm flex flex-col overflow-hidden bg-card">
            <div className="h-1.5 bg-gradient-to-r from-apc-green via-white to-apc-red" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-500" />
                Live Camera QR Scanner
              </CardTitle>
              <CardDescription>Scan a member's digital or physical ID card QR code on-site.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
              {/* Animated QR Viewport Box */}
              <div className="relative w-48 h-48 border-2 border-indigo-500/40 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center group shadow-inner">
                {/* Neon scanning line */}
                {isScanning && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_8px_#22c55e] animate-[scan_2s_ease-in-out_infinite]" />
                )}
                
                {loadingMember ? (
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                ) : (
                  <QrCode className={`w-16 h-16 opacity-40 text-gray-400 group-hover:scale-105 transition-transform duration-300 ${isScanning ? "animate-pulse" : ""}`} />
                )}

                {/* Laser Corner Brackets */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br" />
              </div>

              {/* SIMULATION DROPDOWN SELECT & MANUAL INPUT */}
              <div className="w-full space-y-4 border-t pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Simulate Scan: Select Member</label>
                  <select
                    className="input-premium w-full text-xs h-[36px] bg-card"
                    value={selectedSimMemberId}
                    onChange={(e) => {
                      setSelectedSimMemberId(e.target.value);
                      setScannedId(e.target.value);
                    }}
                  >
                    <option value="">
                      {isSupportGroupAdmin ? "-- Choose Support Group Member --" : "-- Choose Member in Ward --"}
                    </option>
                    {scanMembers.map((m) => (
                      <option key={m.id} value={m.membership_id}>
                        {m.full_name} ({m.membership_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-center text-[10px] text-muted-foreground uppercase font-bold">— OR ENTER MANUAL ID —</div>

                <form onSubmit={handleManualScanSubmit} className="flex gap-2">
                  <input
                    className="input-premium text-xs flex-1"
                    placeholder="e.g. DR-MNYQ8DL4 or member UUID"
                    value={scannedId}
                    onChange={(e) => setScannedId(e.target.value)}
                  />
                  <Button type="submit" size="sm" className="text-xs shrink-0 cursor-pointer">
                    Scan ID
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Member Profile & Incentives Card */}
          <Card className="md:col-span-2 border border-border shadow-sm flex flex-col bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5 text-apc-green" />
                Beneficiary Portal Details
              </CardTitle>
              <CardDescription>Hand over and disburse assigned items to scanned member.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col">
              {scannedMember ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Scanned Member Header details */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-apc-green/10 text-apc-green flex items-center justify-center font-bold text-lg">
                        {scannedMember.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-foreground text-base leading-none">{scannedMember.full_name}</h4>
                        <p className="text-xs text-muted-foreground font-semibold mt-1 flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {scannedMember.membership_id}
                          </Badge>
                          <span>PU: {scannedMember.polling_unit || "Not Assigned"}</span>
                        </p>
                      </div>
                    </div>

                    {/* PHONE VERIFICATION INPUT */}
                    <div className="w-full sm:w-auto">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                        Verify Active Recipient Mobile
                      </label>
                      <div className="relative">
                        <input
                          required
                          className="input-premium pl-8 text-xs font-mono w-full sm:w-44"
                          placeholder="+234..."
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                        <Phone className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE PRE-ALLOCATED BENEFITS */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-indigo-500" /> Pre-Allocated Benefits Awaiting Handover
                    </h4>
                    
                    {memberIncentivesList.filter(mi => mi.status === 'allocated').length === 0 ? (
                      <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                        No pre-allocated packages currently waiting for this member.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberIncentivesList
                          .filter((mi) => mi.status === "allocated")
                          .map((mi) => (
                            <div key={mi.id} className="p-3 border border-indigo-100 bg-indigo-50/20 rounded-xl flex items-center justify-between gap-4">
                              <div>
                                <h5 className="font-bold text-sm text-foreground">{mi.batch?.name}</h5>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Item: <span className="font-bold text-foreground">{mi.batch?.item_name}</span>
                                  {mi.batch?.amount_per_member > 0 && ` (₦${Number(mi.batch.amount_per_member).toLocaleString()})`}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                disabled={disburseMutation.isPending}
                                onClick={() => handleDisburse(mi.batch_id, mi.id)}
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
                              >
                                {disburseMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Disburse Handover"
                                )}
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* ON-SITE ALLOCATION AND DISBURSEMENT DIRECTLY */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-apc-green" /> Direct On-Site Interventions Disbursement
                    </h4>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="input-premium text-xs flex-1 h-[40px] bg-card"
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                      >
                        <option value="">-- Choose Available Incentive Batch --</option>
                        {availableBatchesForOnSite
                          .filter((b) => !isAllocatedToBatch(b.id))
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.item_name}) - {b.total_packages - b.allocated_packages} left
                            </option>
                          ))}
                      </select>

                      <Button
                        size="sm"
                        disabled={!selectedBatchId || disburseMutation.isPending}
                        onClick={() => handleDisburse(selectedBatchId)}
                        className="text-xs bg-apc-green hover:bg-apc-green/90 text-white cursor-pointer h-[40px]"
                      >
                        {disburseMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Disburse Instantly"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ALREADY DISBURSED BENEFITS */}
                  <div className="border-t pt-4 space-y-3 flex-1">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-600" /> Disbursed Intervention History
                    </h4>
                    
                    {memberIncentivesList.filter(mi => mi.status === 'disbursed').length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No disbursed incentives on record for this member.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {memberIncentivesList
                          .filter((mi) => mi.status === "disbursed")
                          .map((mi) => (
                            <div key={mi.id} className="p-2 border rounded-lg flex justify-between items-center bg-muted/10 text-xs">
                              <div>
                                <p className="font-semibold text-foreground">{mi.batch?.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {mi.batch?.item_name}
                                  {mi.disbursed_quantity !== undefined && mi.disbursed_quantity !== null ? (
                                    <span className="font-bold text-indigo-600 ml-1">
                                      — Received: {mi.disbursed_quantity} {mi.disbursed_unit} ({Number(mi.disbursed_equivalent_fraction).toFixed(3)} {mi.batch?.bulk_unit || "Bag"})
                                    </span>
                                  ) : (
                                    <span className="font-bold text-indigo-600 ml-1">
                                      — Received: 1 {mi.batch?.bulk_unit || "Bag"}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  Disbursed: {format(new Date(mi.disbursed_at || mi.updated_at), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <Badge className="bg-green-600 text-white text-[10px] hover:bg-green-600">
                                Disbursed
                              </Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-muted-foreground opacity-60">
                  <QrCode className="w-16 h-16 text-gray-400 mb-2" />
                  <h4 className="font-bold text-sm">Scan QR Code to Start</h4>
                  <p className="text-xs mt-1 max-w-sm">
                    Select a member from the simulated dropdown or input a Membership ID on the left to trigger the verification and handover portal.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* DISBURSEMENT UOM MODAL */}
      {showDisburseUomModal && uomTargetBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="text-base font-bold text-foreground">Specify Quantity & Unit Type</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Item: <span className="font-bold text-foreground">{uomTargetBatch.item_name}</span>. 
                Conversion: 1 {uomTargetBatch.bulk_unit || "Bag"} = {uomTargetBatch.conversion_rate} {uomTargetBatch.retail_unit || "Tiya"}.
              </p>
            </div>

            <div className="space-y-4">
              {/* Toggle Selector */}
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1.5 rounded-lg border">
                <Button
                  type="button"
                  variant={uomAllocationType === "whole" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setUomAllocationType("whole");
                    setUomQuantity("1");
                  }}
                  className="text-xs py-1.5"
                >
                  Whole {uomTargetBatch.bulk_unit || "Bag"}
                </Button>
                <Button
                  type="button"
                  variant={uomAllocationType === "fractional" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setUomAllocationType("fractional");
                    setUomQuantity("");
                  }}
                  className="text-xs py-1.5"
                >
                  Fractional / {uomTargetBatch.retail_unit || "Tiya"}
                </Button>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Quantity ({uomAllocationType === "whole" ? uomTargetBatch.bulk_unit || "Bag" : uomTargetBatch.retail_unit || "Tiya"})
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-premium w-full text-sm h-[40px]"
                  placeholder={uomAllocationType === "whole" ? "e.g. 1" : "e.g. 5"}
                  value={uomQuantity}
                  onChange={(e) => setUomQuantity(e.target.value)}
                />
              </div>

              {/* Mathematical calculation summary */}
              {uomQuantity && !isNaN(parseFloat(uomQuantity)) && (
                <div className="p-3 bg-muted/30 border rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocation:</span>
                    <span className="font-semibold text-foreground">
                      {uomQuantity} {uomAllocationType === "whole" ? uomTargetBatch.bulk_unit || "Bag" : uomTargetBatch.retail_unit || "Tiya"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inventory Deduction:</span>
                    <span className="font-bold text-indigo-600">
                      {uomAllocationType === "whole" 
                        ? parseFloat(uomQuantity).toFixed(3)
                        : (parseFloat(uomQuantity) / Number(uomTargetBatch.conversion_rate)).toFixed(3)
                      } {uomTargetBatch.bulk_unit || "Bag"}(s)
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDisburseUomModal(false);
                    setUomTargetBatch(null);
                    setUomTargetRecordId(undefined);
                  }}
                  className="text-xs w-1/3 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDisburseUomSubmit}
                  disabled={!uomQuantity || disburseMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs gap-1 cursor-pointer"
                >
                  {disburseMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Confirm & Disburse
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

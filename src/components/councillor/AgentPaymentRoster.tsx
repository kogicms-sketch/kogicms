"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Printer,
  Search,
  Star,
  Building2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Phone,
  CreditCard,
  UserCheck,
  RefreshCw,
  Filter,
  Check,
  XCircle,
  DollarSign,
} from "lucide-react";
import { StarAgentButton } from "@/components/members/StarAgentButton";
import {
  StarredAgentMember,
  fetchStarredAgentsPaymentRoster,
  toggleStarMemberAgent,
  setLocalAgentPayment,
} from "@/services/AgentService";
import { NIGERIAN_BANKS } from "@/data/nigerian_banks";
import { supabase } from "@/integrations/supabase/loose-client";
import { getWardsForLga } from "@/lib/campaign-data";

const KOGI_DEFAULT_WARDS = [
  "Ward A (Lokoja Core)", "Ward B", "Ward C", "Ward D", "Ward E",
  "Adankolo", "Kogi (Koton-Karfe)", "Okene-North", "Bariki", "Ankpa I"
];

interface AgentPaymentRosterProps {
  lga?: string | null;
  ward?: string | null;
  title?: string;
  subtitle?: string;
}

export const AgentPaymentRoster: React.FC<AgentPaymentRosterProps> = ({
  lga = "Lokoja",
  ward,
  title = "⭐ Polling Unit Agents Payment & Account Roster",
  subtitle = "Direct account sorting and payment export for all designated Polling Unit Agents",
}) => {
  const [agents, setAgents] = useState<StarredAgentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>(ward || "");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  
  // Edit Bank Modal State
  const [editingAgent, setEditingAgent] = useState<StarredAgentMember | null>(null);
  const [bankNameInput, setBankNameInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Sync ward prop if changed externally
  useEffect(() => {
    if (ward) {
      setSelectedWard(ward);
    }
  }, [ward]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const activeWard = ward || selectedWard || null;
      const data = await fetchStarredAgentsPaymentRoster(lga, activeWard);
      setAgents(data);
    } catch (err) {
      console.error("Error loading agent payment roster:", err);
      toast.error("Failed to load agent payment roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [lga, ward, selectedWard]);

  // Ward normalization helper
  const norm = (s?: string | null) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const matchesWardFilter = (itemWard?: string | null, targetWard?: string | null) => {
    if (!targetWard) return true;
    const w1 = norm(itemWard);
    const w2 = norm(targetWard);
    if (!w1 || !w2) return true;
    if (w1 === w2) return true;
    const w1Norm = w1.replace(/\bi\b/g, "1").replace(/\bii\b/g, "2").replace(/\biii\b/g, "3");
    const w2Norm = w2.replace(/\bi\b/g, "1").replace(/\bii\b/g, "2").replace(/\biii\b/g, "3");
    return w1Norm === w2Norm || w1.includes(w2) || w2.includes(w1);
  };

  // Filtered agents strictly by Ward, Search Term, and Payment Status
  const filteredAgents = agents.filter((ag) => {
    // 1. Strict Ward Filter
    const activeWard = ward || selectedWard;
    if (activeWard && !matchesWardFilter(ag.ward, activeWard)) {
      return false;
    }

    // 2. Payment Status Filter
    if (paymentFilter === "paid" && !ag.is_paid) return false;
    if (paymentFilter === "unpaid" && ag.is_paid) return false;

    // 3. Search Filter
    const term = searchTerm.toLowerCase();
    if (!term) return true;

    return (
      ag.full_name.toLowerCase().includes(term) ||
      (ag.phone && ag.phone.toLowerCase().includes(term)) ||
      (ag.membership_id && ag.membership_id.toLowerCase().includes(term)) ||
      (ag.bank_name && ag.bank_name.toLowerCase().includes(term)) ||
      (ag.account_number && ag.account_number.toLowerCase().includes(term)) ||
      ag.polling_unit.toLowerCase().includes(term) ||
      ag.ward.toLowerCase().includes(term)
    );
  });

  // Analytics Metrics
  const wardAgents = agents.filter(ag => {
    const activeWard = ward || selectedWard;
    return !activeWard || matchesWardFilter(ag.ward, activeWard);
  });

  const totalAgents = wardAgents.length;
  const paidCount = wardAgents.filter((ag) => ag.is_paid).length;
  const unpaidCount = totalAgents - paidCount;
  const completeAccounts = wardAgents.filter(
    (ag) => ag.bank_name && ag.account_number && ag.account_number.length >= 10
  ).length;
  const missingAccounts = totalAgents - completeAccounts;
  const uniquePUs = new Set(wardAgents.map((ag) => ag.polling_unit)).size;

  // Toggle Payment Status Action (Paid <-> Unpaid)
  const handleTogglePaymentStatus = async (ag: StarredAgentMember) => {
    const newPaidStatus = !ag.is_paid;
    setLocalAgentPayment(ag.id, newPaidStatus);
    if (ag.phone) {
      setLocalAgentPayment(ag.phone.trim(), newPaidStatus);
    }

    // Update state locally for immediate UI response
    setAgents(prev => prev.map(item => {
      if (item.id === ag.id || (item.phone && ag.phone && item.phone.trim() === ag.phone.trim())) {
        return {
          ...item,
          is_paid: newPaidStatus,
          paid_at: newPaidStatus ? new Date().toISOString() : undefined,
        };
      }
      return item;
    }));

    toast.success(
      newPaidStatus
        ? `✅ Marked ${ag.full_name} as PAID (An Biya)`
        : `⏳ Marked ${ag.full_name} as UNPAID (Ba a Biya Ba)`
    );
  };

  // Open Bank Edit Modal
  const handleOpenEdit = (ag: StarredAgentMember) => {
    setEditingAgent(ag);
    setBankNameInput(ag.bank_name || "");
    setAccountNumberInput(ag.account_number || "");
  };

  // Save Bank Account Updates
  const handleSaveBank = async () => {
    if (!editingAgent) return;
    if (!bankNameInput || !accountNumberInput) {
      toast.error("Please enter both Bank Name and Account Number");
      return;
    }
    if (accountNumberInput.length < 10) {
      toast.error("Account number must be 10 digits");
      return;
    }

    setIsSavingBank(true);
    try {
      await supabase
        .from("members")
        .update({
          bank_name: bankNameInput,
          account_number: accountNumberInput,
        })
        .eq("id", editingAgent.id);

      if (editingAgent.phone) {
        await supabase
          .from("members")
          .update({
            bank_name: bankNameInput,
            account_number: accountNumberInput,
          })
          .eq("phone", editingAgent.phone.trim());
      }

      toast.success(`Updated payment account for ${editingAgent.full_name}`);
      setEditingAgent(null);
      await loadRoster();
    } catch (err: any) {
      console.error("Error saving bank details:", err);
      toast.error(err.message || "Failed to update bank details");
    } finally {
      setIsSavingBank(false);
    }
  };

  // Export CSV Payment Schedule File (All or Unpaid Only)
  const handleExportCSV = (unpaidOnly: boolean = false) => {
    const recordsToExport = unpaidOnly 
      ? filteredAgents.filter(ag => !ag.is_paid)
      : filteredAgents;

    if (recordsToExport.length === 0) {
      toast.error(unpaidOnly ? "No unpaid agent records available to export" : "No agent records available to export");
      return;
    }

    const headers = [
      "S/N",
      "Member ID",
      "Full Name",
      "Phone Number",
      "Bank Name",
      "Account Number",
      "Designation Role",
      "LGA",
      "Ward",
      "Polling Unit Name",
      "Bank Status",
      "Payment Status",
    ];

    const rows = recordsToExport.map((ag, idx) => [
      idx + 1,
      `"${ag.membership_id || ""}"`,
      `"${ag.full_name.replace(/"/g, '""')}"`,
      `"${ag.phone || ""}"`,
      `"${ag.bank_name || ""}"`,
      `"${ag.account_number || ""}"`,
      `"${ag.agent_designation === "lead_agent" ? "Lead PU Agent" : ag.agent_designation === "assistant_agent_1" ? "Assistant Agent 1" : "Assistant Agent 2"}"`,
      `"${ag.lga}"`,
      `"${ag.ward}"`,
      `"${ag.polling_unit.replace(/"/g, '""')}"`,
      `"${ag.bank_name && ag.account_number ? "READY FOR PAYMENT" : "MISSING ACCOUNT"}"`,
      `"${ag.is_paid ? "PAID (AN BIYA)" : "UNPAID (BA A BIYA BA)"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const activeWardStr = (ward || selectedWard || "Lokoja").replace(/\s+/g, "_");
    const filePrefix = unpaidOnly ? "UNPAID_Agents_Only" : "PU_Agents_Payment_Schedule";
    const fileName = `${filePrefix}_${activeWardStr}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${recordsToExport.length} ${unpaidOnly ? "unpaid " : ""}agent records!`);
  };

  // Print Payroll Voucher
  const handlePrintPayroll = () => {
    window.print();
  };

  const getDesignationBadge = (d: string) => {
    switch (d) {
      case "lead_agent":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold">⭐ Lead PU Agent</Badge>;
      case "assistant_agent_1":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold">⭐ Assistant Agent 1</Badge>;
      case "assistant_agent_2":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold">⭐ Assistant Agent 2</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white font-bold">⭐ PU Agent</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <Star className="w-5 h-5 fill-amber-500" />
              </span>
              <CardTitle className="text-xl font-extrabold text-foreground">{title}</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {subtitle} {(ward || selectedWard) && <strong className="text-foreground">({ward || selectedWard} Ward)</strong>}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRoster}
              disabled={loading}
              className="gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPayroll}
              className="gap-1.5 text-xs font-bold print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </Button>

            {/* Export Unpaid Only CSV */}
            <Button
              size="sm"
              onClick={() => handleExportCSV(true)}
              className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 print:hidden"
            >
              <Download className="w-3.5 h-3.5" />
              <span>🚨 Export UNPAID Only ({unpaidCount})</span>
            </Button>

            {/* Export All CSV */}
            <Button
              size="sm"
              onClick={() => handleExportCSV(false)}
              className="gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>📥 Export All CSV ({totalAgents})</span>
            </Button>
          </div>
        </div>

        {/* Analytics Header Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 print:hidden">
          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Designated Agents</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-500">{totalAgents}</span>
              <span className="text-[10px] text-muted-foreground">Agents</span>
            </div>
          </div>

          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Paid (An Biya)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-green-600">{paidCount}</span>
              <span className="text-[10px] text-green-600 font-bold">
                ({totalAgents > 0 ? Math.round((paidCount / totalAgents) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Unpaid (Ba a Biya Ba)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${unpaidCount > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {unpaidCount}
              </span>
              <span className="text-[10px] text-muted-foreground">Pending</span>
            </div>
          </div>

          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">PUs Covered</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-600">{uniquePUs}</span>
              <span className="text-[10px] text-muted-foreground">Polling Units</span>
            </div>
          </div>

          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Missing Bank Info</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${missingAccounts > 0 ? "text-red-500" : "text-gray-400"}`}>
                {missingAccounts}
              </span>
              <span className="text-[10px] text-muted-foreground">Needs update</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Controls Bar: Search, Ward Selector, Payment Status Filter Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 print:hidden">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Agent Name, Phone, Bank, Account Number, PU Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-10 font-medium"
            />
          </div>

          {/* Ward Selection Dropdown (For Ward Isolation) */}
          {!ward && (
            <div className="w-full md:w-56">
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value="">-- All Wards in {lga} --</option>
                {(getWardsForLga(lga || "Lokoja").length > 0 ? getWardsForLga(lga || "Lokoja") : KOGI_DEFAULT_WARDS).map((w) => (
                  <option key={w} value={w}>
                    📍 {w}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter Buttons */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 self-start md:self-auto">
            <button
              onClick={() => setPaymentFilter("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({totalAgents})
            </button>
            <button
              onClick={() => setPaymentFilter("paid")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentFilter === "paid"
                  ? "bg-green-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-green-600"
              }`}
            >
              ✅ Paid ({paidCount})
            </button>
            <button
              onClick={() => setPaymentFilter("unpaid")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              ⏳ Unpaid ({unpaidCount})
            </button>
          </div>
        </div>

        {/* Payment Roster Table */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-xs font-semibold">
            Loading Polling Unit Agents Payment Roster...
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Star className="w-12 h-12 text-amber-400 opacity-40 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Designated Agents Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {paymentFilter === "unpaid" 
                ? "Great! All agents in this ward have been marked as PAID (An Biya)!"
                : "Go to the Members List or Polling Unit page and click the Star (⭐) button next to members to designate them as Polling Unit Agents!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center text-[11px] font-bold uppercase">S/N</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Agent Name & ID</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Designation</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Polling Unit & Ward</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Phone Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Bank Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Account Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-center">Bank Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-center">Payment Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-right print:hidden">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((ag, idx) => {
                  const hasBank = ag.bank_name && ag.account_number && ag.account_number.length >= 10;
                  return (
                    <TableRow key={ag.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-center text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-xs text-foreground">{ag.full_name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{ag.membership_id}</span>
                        </div>
                      </TableCell>

                      <TableCell>{getDesignationBadge(ag.agent_designation)}</TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">{ag.polling_unit}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">{ag.ward}, {ag.lga}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-semibold text-xs text-foreground">
                        {ag.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {ag.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-[10px]">No phone</span>
                        )}
                      </TableCell>

                      <TableCell className="font-bold text-xs text-foreground">
                        {ag.bank_name || <span className="text-red-500 italic text-[10px]">Not set</span>}
                      </TableCell>

                      <TableCell className="font-mono font-extrabold text-xs tracking-wide text-foreground">
                        {ag.account_number || <span className="text-red-500 italic text-[10px]">Not set</span>}
                      </TableCell>

                      <TableCell className="text-center">
                        {hasBank ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-950/60 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            READY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            MISSING
                          </span>
                        )}
                      </TableCell>

                      {/* Payment Status (Paid vs Unpaid Badge & Quick Toggle) */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleTogglePaymentStatus(ag)}
                          className="focus:outline-none transition-transform active:scale-95"
                          title="Click to toggle Paid / Unpaid status"
                        >
                          {ag.is_paid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-full shadow-xs cursor-pointer">
                              <Check className="w-3 h-3 stroke-[3]" />
                              AN BIYA (PAID)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800 cursor-pointer">
                              <XCircle className="w-3 h-3 text-amber-600" />
                              BA A BIYA BA (UNPAID)
                            </span>
                          )}
                        </button>
                      </TableCell>

                      {/* Action Buttons: Edit Bank, Toggle Payment, Reselect/Remove Agent */}
                      <TableCell className="text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <StarAgentButton
                            memberId={ag.id}
                            pollingUnitName={ag.polling_unit}
                            initialRole="polling_unit_agent"
                            initialSocialHandle={`DESIGNATION:${ag.agent_designation}`}
                            size="sm"
                            onUpdate={async () => {
                              await loadRoster();
                            }}
                          />

                          <Button
                            variant={ag.is_paid ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleTogglePaymentStatus(ag)}
                            className={`h-8 px-2 text-[11px] font-bold gap-1 ${
                              ag.is_paid
                                ? "border-green-600 text-green-700 hover:bg-green-50"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>{ag.is_paid ? "Mark Unpaid" : "Mark Paid"}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(ag)}
                            className="h-8 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Bank</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Bank Details Modal */}
      {editingAgent && (
        <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Update Agent Payment Account
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set or modify the bank name and account number for <strong>{editingAgent.full_name}</strong> ({editingAgent.polling_unit}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Select Bank Name *</label>
                <select
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="text-xs font-bold text-foreground">10-Digit NUBAN Account Number *</label>
                <Input
                  placeholder="e.g. 0123456789"
                  maxLength={10}
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value.replace(/\D/g, ""))}
                  className="h-10 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setEditingAgent(null)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveBank} disabled={isSavingBank} className="text-xs font-bold gap-1 bg-primary">
                {isSavingBank ? "Saving..." : "Save Account Details"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

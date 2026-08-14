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
} from "lucide-react";
import { toast } from "sonner";
import {
  StarredAgentMember,
  fetchStarredAgentsPaymentRoster,
  toggleStarMemberAgent,
} from "@/services/AgentService";
import { NIGERIAN_BANKS } from "@/data/nigerian_banks";
import { supabase } from "@/integrations/supabase/loose-client";

interface AgentPaymentRosterProps {
  lga?: string | null;
  ward?: string | null;
  title?: string;
  subtitle?: string;
}

export const AgentPaymentRoster: React.FC<AgentPaymentRosterProps> = ({
  lga,
  ward,
  title = "⭐ Polling Unit Agents Payment & Account Roster",
  subtitle = "Direct account sorting and payment export for all designated Polling Unit Agents",
}) => {
  const [agents, setAgents] = useState<StarredAgentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Edit Bank Modal State
  const [editingAgent, setEditingAgent] = useState<StarredAgentMember | null>(null);
  const [bankNameInput, setBankNameInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await fetchStarredAgentsPaymentRoster(lga, ward);
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
  }, [lga, ward]);

  // Filtered agents
  const filteredAgents = agents.filter((ag) => {
    const term = searchTerm.toLowerCase();
    return (
      ag.full_name.toLowerCase().includes(term) ||
      (ag.phone && ag.phone.toLowerCase().includes(term)) ||
      (ag.membership_id && ag.membership_id.toLowerCase().includes(term)) ||
      (ag.bank_name && ag.bank_name.toLowerCase().includes(term)) ||
      (ag.account_number && ag.account_number.toLowerCase().includes(term)) ||
      ag.polling_unit.toLowerCase().includes(term)
    );
  });

  // Analytics Metrics
  const totalAgents = agents.length;
  const completeAccounts = agents.filter(
    (ag) => ag.bank_name && ag.account_number && ag.account_number.length >= 10
  ).length;
  const missingAccounts = totalAgents - completeAccounts;
  const uniquePUs = new Set(agents.map((ag) => ag.polling_unit)).size;

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
      // 1. Try updating members by ID
      const { error: err1 } = await supabase
        .from("members")
        .update({
          bank_name: bankNameInput,
          account_number: accountNumberInput,
        })
        .eq("id", editingAgent.id);

      // 2. If phone exists, also update by phone to guarantee match across tables
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

  // Export CSV Payment Schedule File
  const handleExportCSV = () => {
    if (filteredAgents.length === 0) {
      toast.error("No agent records available to export");
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
      "Account Status",
    ];

    const rows = filteredAgents.map((ag, idx) => [
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
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `PU_Agents_Payment_Schedule_${(ward || lga || "Katsina").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported payment schedule for ${filteredAgents.length} agents!`);
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
              {subtitle} {ward && <strong className="text-foreground">({ward} Ward)</strong>}
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

            <Button
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>📥 Export Payment List (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Analytics Header Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 print:hidden">
          <div className="bg-background border border-border/50 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Designated Agents</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-500">{totalAgents}</span>
              <span className="text-[10px] text-muted-foreground">Agents</span>
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
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Ready for Payment</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-green-600">{completeAccounts}</span>
              <span className="text-[10px] text-green-600 font-bold">
                ({totalAgents > 0 ? Math.round((completeAccounts / totalAgents) * 100) : 0}%)
              </span>
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
        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Agent Name, Phone, Bank, Account Number, PU Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-10 font-medium"
            />
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
              Go to the Members List or Polling Unit page and click the Star (⭐) button next to members to designate them as Polling Unit Agents!
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
                  <TableHead className="text-[11px] font-bold uppercase">Polling Unit</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Phone Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Bank Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Account Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-center">Status</TableHead>
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
                          <span className="text-[10px] text-muted-foreground">{ag.ward}, {ag.lga}</span>
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

                      <TableCell className="text-right print:hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(ag)}
                          className="h-8 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Bank</span>
                        </Button>
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

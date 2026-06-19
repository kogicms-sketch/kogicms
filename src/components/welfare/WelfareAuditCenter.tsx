"use client";
import React, { useState } from "react";
import { useMemberIncentives, useAuditIncentive } from "@/hooks/useIncentives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Phone,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  UserCheck,
  Building,
  User
} from "lucide-react";

export const WelfareAuditCenter = () => {
  const [search, setSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<string>("all");

  // Fetch all disbursed incentives
  const { data: disbursements = [], isLoading, refetch } = useMemberIncentives({
    status: "disbursed"
  });

  const auditMutation = useAuditIncentive();

  // Audit Dialog state
  const [selectedDisbursement, setSelectedDisbursement] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [callConnected, setCallConnected] = useState(false);

  // Filtered disbursements
  const filteredDisbursements = disbursements.filter((d: any) => {
    const matchesSearch = 
      (d.member?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.batch?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.phone_number || "").includes(search);
    
    const matchesAudit = 
      auditFilter === "all" || 
      (auditFilter === "pending" && d.audit_status === "pending") ||
      (auditFilter === "verified" && d.audit_status === "verified") ||
      (auditFilter === "flagged" && d.audit_status === "flagged");

    return matchesSearch && matchesAudit;
  });

  // Handle calling simulation
  const handleStartCall = () => {
    setIsCalling(true);
    setCallConnected(false);
    // Simulate dial
    setTimeout(() => {
      setCallConnected(true);
      toast.success("Call connected! Interview the beneficiary now.");
    }, 2000);
  };

  // Submit Audit
  const handleAuditSubmit = async (status: 'verified' | 'flagged') => {
    if (!selectedDisbursement) return;
    if (!auditNotes) {
      toast.error("Please add audit notes describing the call outcome.");
      return;
    }

    try {
      await auditMutation.mutateAsync({
        id: selectedDisbursement.id,
        audit_status: status,
        audit_notes: auditNotes
      });
      setSelectedDisbursement(null);
      setAuditNotes("");
      setIsCalling(false);
      setCallConnected(false);
      refetch();
    } catch (e) {
      // Handled
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            Audit & Quality Assurance Center (Aikin Gaskiya)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Conduct random call audits on disbursed welfare packages to verify direct physical handover.
          </p>
        </div>
        
        {/* Audit Filter */}
        <div className="flex gap-1.5 bg-muted p-1 rounded-lg">
          {["all", "pending", "verified", "flagged"].map((filter) => (
            <button
              key={filter}
              onClick={() => setAuditFilter(filter)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                auditFilter === filter
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH ROW */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="relative">
            <input
              className="input-premium pl-9 text-xs w-full"
              placeholder="Search by member name, item name, phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </CardContent>
      </Card>

      {/* DISBURSEMENTS LIST TABLE */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading audit ledger...
            </div>
          ) : filteredDisbursements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-40 text-gray-400" />
              <p className="text-sm font-semibold">No disbursements to audit</p>
              <p className="text-xs mt-0.5">Disbursements marked by Ward Admins will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="p-3 font-semibold text-xs text-muted-foreground pl-6">Beneficiary</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Phone Number</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Incentive Package (Item)</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Funder Name (Role)</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Executing Ward Admin</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Date Disbursed</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground">Audit Status</th>
                    <th className="p-3 font-semibold text-xs text-muted-foreground pr-6 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {filteredDisbursements.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-bold text-foreground pl-6">
                        {d.member?.full_name || "Unknown"}
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          {d.member?.lga} > {d.member?.ward}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-mono text-foreground font-semibold">
                        {d.phone_number || "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground block">{d.batch?.name}</span>
                        <span className="text-[10px]">{d.batch?.item_name}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground block">{d.batch?.funder_name}</span>
                        <span className="text-[10px]">{d.batch?.funder_role?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground font-medium">
                        {d.disbursed_by_name || "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {d.disbursed_at ? format(new Date(d.disbursed_at), "MMM dd, yyyy - hh:mm a") : "—"}
                      </td>
                      <td className="p-3">
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
                            : 'Pending'
                          }
                        </Badge>
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDisbursement(d);
                            setAuditNotes(d.audit_notes || "");
                            setIsCalling(false);
                            setCallConnected(false);
                          }}
                          className="text-xs gap-1.5 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" /> Verify Call
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

      {/* VERIFY DIALOG MODAL */}
      {selectedDisbursement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Welfare Verification Call</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify palliative handover for beneficiary: <span className="font-bold text-foreground">{selectedDisbursement.member?.full_name}</span>
              </p>
            </div>

            {/* CALL DIALER COMPONENT */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-semibold">Beneficiary Phone</span>
                <span className="text-sm font-mono font-extrabold text-foreground">{selectedDisbursement.phone_number || "No phone number"}</span>
              </div>

              {!isCalling && (
                <Button 
                  onClick={handleStartCall} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4 animate-bounce" /> Simulate Verification Call
                </Button>
              )}

              {isCalling && (
                <div className="p-3 bg-black/5 rounded-lg border border-dashed flex flex-col items-center justify-center text-center gap-2">
                  <div className="flex gap-1.5 justify-center items-center">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                      {callConnected ? "CALL ACTIVE (0:15)" : "DIALING BENEFICIARY..."}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {callConnected 
                      ? "Interview Member: 'Did you receive your allocated incentive?'" 
                      : "Connecting to voter registry handset..."}
                  </p>
                </div>
              )}
            </div>

            {/* AUDIT FORM */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase">Audit Verification Notes</label>
              <textarea
                required
                rows={3}
                placeholder="Describe call outcome. e.g. Beneficiary confirmed they personally received the cash scholarship."
                className="input-premium w-full text-xs p-3"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
              />
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between gap-3 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedDisbursement(null)} 
                className="text-xs w-1/3 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={auditMutation.isPending || !callConnected}
                onClick={() => handleAuditSubmit('flagged')}
                className="text-xs flex-1 gap-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Flag Anomaly
              </Button>
              <Button
                size="sm"
                disabled={auditMutation.isPending || !callConnected}
                onClick={() => handleAuditSubmit('verified')}
                className="text-xs flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Verify Handover
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

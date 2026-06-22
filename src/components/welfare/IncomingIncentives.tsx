"use client";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import {
  useIncentiveBatches,
  useAcceptIncentiveBatch,
  IncentiveBatch
} from "@/hooks/useIncentives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Loader2,
  Gift,
  ArrowDownCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  Building,
  DollarSign,
  Package
} from "lucide-react";

export const IncomingIncentives = () => {
  const { role, user, organizationId } = useAuth();
  const acceptMutation = useAcceptIncentiveBatch();

  // Resolve user LGA and Ward if Councillor or LGA Chairman
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["welfare-incoming-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("lga, ward, full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id && role !== "org_admin"
  });

  const userLga = userProfile?.lga || "";
  const userWard = userProfile?.ward || "";

  // Fetch batches targeted to this LGA/Ward or support group
  const { data: batches = [], isLoading: batchesLoading } = useIncentiveBatches(
    role === "org_admin" && organizationId
      ? { target_support_group_id: organizationId }
      : { target_lga: userLga, target_ward: userWard }
  );

  const handleAccept = async (batchId: string) => {
    try {
      await acceptMutation.mutateAsync(batchId);
    } catch (e) {
      // Handled in mutation
    }
  };

  const getFunderLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Command Centre";
      case "senatorial_leader":
        return "Senate Dashboard";
      case "federal_rep":
        return "House of Reps Dashboard";
      case "house_assembly_member":
        return "Assembly Dashboard";
      case "lga_chairman":
        return "LGA Chairman";
      default:
        return "Campaign Official";
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("cash") || type.toLowerCase().includes("grant") || type.toLowerCase().includes("scholarship")) {
      return <DollarSign className="w-4 h-4 text-emerald-500" />;
    }
    return <Package className="w-4 h-4 text-amber-500" />;
  };

  const isLoading = profileLoading || batchesLoading;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-indigo-500 animate-bounce" />
            📦 Material & Financial Allocations Pipeline
          </CardTitle>
          <CardDescription>
            {role === "org_admin" ? (
              <>
                Incoming campaign palliatives and logistics routed directly to your <span className="font-bold text-foreground">Support Group</span>. You must accept packages before they can be distributed to group members.
              </>
            ) : (
              <>
                Incoming campaign palliatives, scholarships, and logistics routed to{" "}
                <span className="font-bold text-foreground">
                  {userLga} ({userWard} Ward)
                </span>
                . You must accept packages before they can be distributed to Polling Units.
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading incoming allocations...
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-muted/10">
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-semibold">No incoming allocations</p>
            <p className="text-xs text-gray-400 mt-1">
              Allocations routed from Senator, Reps, Assembly, or LGA will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="p-4 font-semibold text-xs text-muted-foreground pl-6">From (Source)</th>
                  <th className="p-4 font-semibold text-xs text-muted-foreground">Incentive Type</th>
                  <th className="p-4 font-semibold text-xs text-muted-foreground">Quantity Allocated</th>
                  <th className="p-4 font-semibold text-xs text-muted-foreground">Dispatch Date</th>
                  <th className="p-4 font-semibold text-xs text-muted-foreground pr-6 text-right">Action Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {batches.map((b) => {
                  const isPending = b.received_status !== "received";
                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-foreground flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="block text-sm">{getFunderLabel(b.funder_role)}</span>
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            Funded by: {b.funder_name}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          {getTypeIcon(b.type || b.item_name)}
                          {b.name}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">{b.item_name}</span>
                      </td>
                      <td className="p-4 text-xs font-medium text-foreground">
                        {b.amount_per_member > 0 ? (
                          <>
                            {b.total_packages} Slots
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              (₦{Number(b.amount_per_member).toLocaleString()} each)
                            </span>
                          </>
                        ) : (
                          `${b.total_packages} Packages`
                        )}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {b.created_at ? format(new Date(b.created_at), "MMM dd, yyyy") : "—"}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            onClick={() => handleAccept(b.id)}
                            disabled={acceptMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5 cursor-pointer"
                          >
                            {acceptMutation.isPending && acceptMutation.variables === b.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Confirm Receipt & Accept
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-green-600 text-green-600 bg-green-500/5 py-1 px-2.5">
                            ✓ Accepted & Available
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

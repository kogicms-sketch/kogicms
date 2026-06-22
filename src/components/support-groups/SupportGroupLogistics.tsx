"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMaterialRequests } from "@/hooks/useSupportGroups";
import { useApproveMaterialRequest, useReceiveMaterialRequest } from "@/hooks/useCampaignEvents";
import { format } from "date-fns";
import { Package, Truck, Clock, CheckCircle2, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RequestMaterialModal } from "./RequestMaterialModal";

export function SupportGroupLogistics({ 
  supportGroupId, 
  readOnly = false 
}: { 
  supportGroupId: string;
  readOnly?: boolean;
}) {
  const { role, user } = useAuth();
  const { data: requests, isLoading, refetch } = useMaterialRequests(supportGroupId);
  const approveMutation = useApproveMaterialRequest();
  const receiveMutation = useReceiveMaterialRequest();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const isCandidate = role === "senatorial_leader" || role === "federal_rep" || role === "house_assembly_member";
  const isSuperAdmin = role === "super_admin";
  const isSupportGroupAdmin = role === "org_admin";

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "received":
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-700 font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Received by Support Group
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-600 text-white hover:bg-blue-700 font-bold">
            <Truck className="w-3 h-3 mr-1" /> Approved & Dispatched
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 font-bold">
            <Clock className="w-3 h-3 mr-1" /> Pending Candidate Approval
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive" className="font-bold">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="font-bold">{status || "Pending"}</Badge>;
    }
  };

  const getMaterialsList = (materials: any) => {
    if (!materials) return "None specified";
    if (typeof materials === "string") return materials;
    if (Array.isArray(materials)) return materials.join(", ");
    if (typeof materials === "object") {
      return Object.entries(materials).map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    return JSON.stringify(materials);
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approveMutation.mutateAsync({ id: requestId, status: "approved" });
      refetch();
    } catch (err) {
      // toast shown by hook
    }
  };

  const handleReceive = async (requestId: string) => {
    try {
      await receiveMutation.mutateAsync(requestId);
      refetch();
    } catch (err) {
      // toast shown by hook
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Material Requests & Logistics Pipeline
            </CardTitle>
            <CardDescription>Coordinate supplies and track dispatch channels</CardDescription>
          </div>
          
          {!readOnly && isSupportGroupAdmin && (
            <Button 
              onClick={() => setIsRequestModalOpen(true)}
              className="text-xs bg-navy-deep text-white bg-gradient-to-r hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Request Materials
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Loading logistics pipeline...</p>
            </div>
          ) : requests?.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No Material Requests</h3>
              <p className="text-sm text-muted-foreground mt-1">No material routing requests have been logged.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests?.map((req) => {
                const reqStatus = req.status || "pending";
                
                return (
                  <div key={req.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/10 transition-all duration-200">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          Event Date: {req.event_date ? format(new Date(req.event_date), "MMM d, yyyy") : "Not specified"}
                        </h4>
                        {getStatusBadge(reqStatus)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Requested Materials:</span>
                          <p className="font-bold bg-muted/40 p-2.5 rounded-lg border border-border/60 text-navy-deep">
                            {getMaterialsList(req.materials)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Event Location:</span>
                          <p className="font-medium p-2 text-foreground">
                            {req.event_location || `${req.lga || ""} ${req.ward ? `/ ${req.ward}` : ""}` || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2 pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Requester details:</span>
                          <p className="font-medium text-foreground">
                            {req.requester_name || "N/A"} {req.requester_phone ? `(${req.requester_phone})` : ""}
                          </p>
                        </div>
                        {req.notes && (
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Justification / Notes:</span>
                            <p className="text-muted-foreground italic bg-yellow-500/5 p-2 rounded-lg border border-yellow-200/50 text-xs">
                              {req.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Operational Timestamps */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground pt-2 border-t">
                        <span>Requested: {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}</span>
                        {req.approved_at && (
                          <span>Approved: {format(new Date(req.approved_at), "MMM d, yyyy h:mm a")}</span>
                        )}
                        {req.delivered_at && (
                          <span>Received: {format(new Date(req.delivered_at), "MMM d, yyyy h:mm a")}</span>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center justify-end shrink-0 md:border-l md:pl-4 mt-2 md:mt-0">
                      {/* Candidate or Admin Approval Action */}
                      {(isCandidate || isSuperAdmin) && reqStatus === "pending" && (
                        <Button
                          onClick={() => handleApprove(req.id)}
                          disabled={approveMutation.isPending}
                          className="w-full md:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 gap-1 cursor-pointer"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Approve & Dispatch
                        </Button>
                      )}

                      {/* Support Group Admin Delivery Receipt Action */}
                      {isSupportGroupAdmin && reqStatus === "approved" && (
                        <Button
                          onClick={() => handleReceive(req.id)}
                          disabled={receiveMutation.isPending}
                          className="w-full md:w-auto text-xs bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-4 gap-1 cursor-pointer"
                        >
                          {receiveMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Confirm Delivery Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* REQUEST MODAL */}
      <RequestMaterialModal
        supportGroupId={supportGroupId}
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        onSuccess={refetch}
      />
    </div>
  );
}

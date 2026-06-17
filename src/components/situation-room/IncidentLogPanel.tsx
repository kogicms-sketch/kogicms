"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useIncidents,
  useUpdateIncidentStatus,
  INCIDENT_TYPE_LABELS,
  INCIDENT_STATUS_CONFIG,
  type IncidentStatus,
  type ElectionIncident,
} from "@/hooks/useIncidents";
import {
  AlertTriangle,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface IncidentLogPanelProps {
  lga?: string;
  maxItems?: number;
}

const IncidentCard = ({ incident }: { incident: ElectionIncident }) => {
  const updateStatus = useUpdateIncidentStatus();
  const cfg = INCIDENT_STATUS_CONFIG[incident.status] ?? INCIDENT_STATUS_CONFIG.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border transition-colors"
      style={{ borderColor: cfg.color + "44", background: cfg.bg + "60" }}
    >
      {/* Status indicator dot */}
      <div className="flex-shrink-0 pt-0.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full mt-1"
          style={{ background: cfg.color }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Type + status badge */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-slate-800">
            {INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
          </span>
          <Badge
            className="border-0 text-[10px] font-bold px-2 py-0.5"
            style={{ background: cfg.color + "22", color: cfg.color }}
          >
            {cfg.label}
          </Badge>
        </div>

        {/* Location */}
        {(incident.polling_unit || incident.lga) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {[incident.polling_unit, incident.ward, incident.lga]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}

        {/* Time */}
        {incident.incident_time && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {new Date(incident.incident_time).toLocaleString("en-NG", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* Description */}
        {incident.description && (
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">
            {incident.description}
          </p>
        )}

        {/* Photo link */}
        {incident.photo_url && (
          <a
            href={incident.photo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline mt-1"
          >
            <ExternalLink className="w-3 h-3" /> View Photo Evidence
          </a>
        )}
      </div>

      {/* Status updater */}
      <div className="flex-shrink-0">
        <Select
          value={incident.status}
          onValueChange={(v) =>
            updateStatus.mutate({ id: incident.id, status: v as IncidentStatus })
          }
          disabled={updateStatus.isPending}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs bg-white/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
};

export const IncidentLogPanel = ({ lga, maxItems = 50 }: IncidentLogPanelProps) => {
  const { data: incidents, isLoading } = useIncidents(lga);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = (incidents ?? [])
    .filter((i) => statusFilter === "all" || i.status === statusFilter)
    .slice(0, maxItems);

  const criticalCount = (incidents ?? []).filter((i) => i.status === "critical").length;
  const pendingCount = (incidents ?? []).filter((i) => i.status === "pending").length;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          Incident Log
          {criticalCount > 0 && (
            <Badge className="border-0 bg-red-500/15 text-red-600 dark:text-red-400 ml-1">
              {criticalCount} critical
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge className="border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {pendingCount} pending
            </Badge>
          )}
        </h3>

        {/* Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Incidents</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">
            {statusFilter === "all"
              ? "No incidents reported yet."
              : `No ${statusFilter} incidents.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

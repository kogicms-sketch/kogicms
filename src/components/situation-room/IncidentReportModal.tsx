"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSubmitIncident,
  INCIDENT_TYPE_LABELS,
  type IncidentType,
  type IncidentStatus,
} from "@/hooks/useIncidents";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { Loader2, Upload, ImageIcon, AlertTriangle } from "lucide-react";
import { RACES } from "@/config/races";

interface IncidentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLga?: string;
  defaultWard?: string;
  defaultPollingUnit?: string;
}

export const IncidentReportModal = ({
  open,
  onOpenChange,
  defaultLga,
  defaultWard,
  defaultPollingUnit,
}: IncidentReportModalProps) => {
  const { user, role } = useAuth();
  const { data: puAgent } = usePUAgent();
  const isAgent = role === "polling_unit_agent";
  const submit = useSubmitIncident();

  const [incidentType, setIncidentType] = useState<IncidentType>("other");
  const [raceType, setRaceType] = useState("all");
  const [pollingUnit, setPollingUnit] = useState("");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [incidentTime, setIncidentTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [status, setStatus] = useState<IncidentStatus>("pending");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      if (isAgent && puAgent) {
        setLga(puAgent.lga || "");
        setWard(puAgent.ward || "");
        setPollingUnit(puAgent.polling_unit_name || "");
      } else {
        setLga(defaultLga ?? "");
        setWard(defaultWard ?? "");
        setPollingUnit(defaultPollingUnit ?? "");
      }
    }
  }, [open, isAgent, puAgent, defaultLga, defaultWard, defaultPollingUnit]);

  const reset = () => {
    setIncidentType("other");
    setRaceType("all");
    if (isAgent && puAgent) {
      setLga(puAgent.lga || "");
      setWard(puAgent.ward || "");
      setPollingUnit(puAgent.polling_unit_name || "");
    } else {
      setPollingUnit(defaultPollingUnit ?? "");
      setLga(defaultLga ?? "");
      setWard(defaultWard ?? "");
    }
    setIncidentTime(new Date().toISOString().slice(0, 16));
    setStatus("pending");
    setDescription("");
    setPhoto(null);
  };

  const handleSubmit = async () => {
    if (!incidentType) return;
    await submit.mutateAsync({
      incident_type: incidentType,
      race_type: raceType === "all" ? null : raceType || null,
      polling_unit: pollingUnit || undefined,
      lga: lga || undefined,
      ward: ward || undefined,
      incident_time: incidentTime,
      status,
      description: description || undefined,
      photoFile: photo,
      reported_by: user?.id ?? null,
    });
    reset();
    onOpenChange(false);
  };

  const statusColors: Record<IncidentStatus, string> = {
    pending: "border-amber-300 bg-amber-50 text-amber-800",
    critical: "border-red-300 bg-red-50 text-red-800",
    resolved: "border-green-300 bg-green-50 text-green-800",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Election Day Incident Report
          </DialogTitle>
          <DialogDescription>
            Report any irregularities or incidents at the polling unit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Incident Type */}
          <div className="space-y-2">
            <Label>
              Incident Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={incidentType}
              onValueChange={(v) => setIncidentType(v as IncidentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Severity / Status</Label>
            <div className="flex gap-2">
              {(["pending", "critical", "resolved"] as IncidentStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                      status === s
                        ? statusColors[s]
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Race Type */}
          <div className="space-y-2">
            <Label>Election Race (optional)</Label>
            <Select value={raceType} onValueChange={setRaceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select race (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Races</SelectItem>
                {RACES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>LGA</Label>
              <Input
                placeholder="e.g. Kankia"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                disabled={isAgent}
              />
            </div>
            <div className="space-y-2">
              <Label>Ward</Label>
              <Input
                placeholder="e.g. Wakilin Kudu"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                disabled={isAgent}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Polling Unit / Location</Label>
            <Input
              placeholder="e.g. PU 001 – School Hall"
              value={pollingUnit}
              onChange={(e) => setPollingUnit(e.target.value)}
              disabled={isAgent}
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time of Incident</Label>
            <Input
              type="datetime-local"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what happened in detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo Evidence (optional)</Label>
            <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              {photo ? (
                <ImageIcon className="w-5 h-5 text-primary flex-shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm text-muted-foreground truncate">
                {photo ? photo.name : "Tap to upload photo evidence"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={submit.isPending || !incidentType}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" /> Submit Incident Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

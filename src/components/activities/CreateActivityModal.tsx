"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { MapPin, Loader2 } from "lucide-react";
import { KOGI_LGAS, getWardsForLga } from "@/lib/campaign-data";
import { useCreateActivity } from "@/hooks/useActivities";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganization } from "@/hooks/useUserOrganization";

const ACTIVITY_TYPES = [
  { value: "outreach", label: "Community Outreach" },
  { value: "meeting", label: "Meeting" },
  { value: "sensitization", label: "Sensitization" },
  { value: "mobilization", label: "Mobilization" },
  { value: "rally", label: "Rally" },
  { value: "training", label: "Training/Workshop" },
];

export function CreateActivityModal({ children }: { children?: React.ReactNode }) {
  const { role, organizationId } = useAuth();
  const { data: userOrg } = useUserOrganization();
  const isSuperAdmin = role === "super_admin";

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    description: "",
    organizationId: "",
    location: "",
    state: "Kogi",
    lga: "",
    ward: "",
    date: "",
    startTime: "",
    endTime: "",
    expectedAttendance: "",
  });

  const createActivity = useCreateActivity();
  const { data: organizations = [] } = useOrganizations();
  const availableWards = formData.lga ? getWardsForLga(formData.lga) : [];

  // Auto-set organization for org admins
  useEffect(() => {
    if (!isSuperAdmin && organizationId) {
      setFormData(prev => ({ ...prev, organizationId }));
    }
  }, [isSuperAdmin, organizationId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "lga") {
      setFormData((prev) => ({ ...prev, lga: value, ward: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createActivity.mutateAsync({
      title: formData.title,
      type: formData.type,
      description: formData.description || null,
      organization_id: formData.organizationId,
      location: formData.location,
      state: formData.state,
      lga: formData.lga || null,
      ward: formData.ward || null,
      scheduled_date: formData.date,
      start_time: formData.startTime || null,
      end_time: formData.endTime || null,
      expected_attendance: formData.expectedAttendance
        ? parseInt(formData.expectedAttendance)
        : null,
    });

    setOpen(false);
    setFormData({
      title: "",
      type: "",
      description: "",
      organizationId: "",
      location: "",
      state: "Kogi",
      lga: "",
      ward: "",
      date: "",
      startTime: "",
      endTime: "",
      expectedAttendance: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Create Activity</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign Activity</DialogTitle>
          <DialogDescription>
            Schedule a new event, meeting, or mobilization activity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Activity Title</Label>
            <Input
              id="title"
              placeholder="e.g. Town Hall Meeting"
              required
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Activity Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => handleInputChange("type", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSuperAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(val) => handleInputChange("organizationId", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={userOrg?.name || "Loading..."}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the activity goals and agenda..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Input value="Kogi State" disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lga">LGA</Label>
              <Select
                value={formData.lga}
                onValueChange={(val) => handleInputChange("lga", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  {KOGI_LGAS.map((lga) => (
                    <SelectItem key={lga} value={lga}>
                      {lga}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select
                value={formData.ward}
                onValueChange={(val) => handleInputChange("ward", val)}
                disabled={!formData.lga}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={formData.lga ? "Select Ward" : "Select LGA first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableWards.map((ward) => (
                    <SelectItem key={ward} value={ward}>
                      {ward}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Specific Venue</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  className="pl-9"
                  placeholder="e.g. Community Center"
                  required
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedAttendance">Expected Attendance</Label>
            <Input
              id="expectedAttendance"
              type="number"
              placeholder="e.g. 100"
              value={formData.expectedAttendance}
              onChange={(e) => handleInputChange("expectedAttendance", e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={createActivity.isPending}>
              {createActivity.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Create Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

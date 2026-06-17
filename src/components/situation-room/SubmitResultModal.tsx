"use client";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTY_LIST } from "@/config/parties";
import { RACES, RaceType } from "@/config/races";
import { useSubmitResult, validateResultFigures } from "@/hooks/useElectionResults";
import { Loader2, Upload, ImageIcon, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SubmitResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollingUnit: { name: string; ward: string; lga: string; code?: string | null };
  agentName?: string | null;
}

// Seed: known parties (non-neutral) as starting rows
const SEED_PARTIES = PARTY_LIST.filter((p) => p.id !== "neutral").map((p) => ({
  code: p.shortName,
  logo: p.logo,
}));

interface PartyRow {
  code: string;
  logo?: string;
}

export const SubmitResultModal = ({
  open,
  onOpenChange,
  pollingUnit,
  agentName,
}: SubmitResultModalProps) => {
  const { user } = useAuth();
  const submit = useSubmitResult();

  const [race, setRace] = useState<RaceType>("presidential");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState("");
  const [accredited, setAccredited] = useState("");
  const [invalidVotes, setInvalidVotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [partyRows, setPartyRows] = useState<PartyRow[]>(SEED_PARTIES);
  const [newPartyCode, setNewPartyCode] = useState("");

  const reset = () => {
    setVotes({});
    setRegistered("");
    setAccredited("");
    setInvalidVotes("");
    setPhoto(null);
    setPartyRows(SEED_PARTIES);
    setNewPartyCode("");
  };

  const voteMap: Record<string, number> = {};
  partyRows.forEach((p) => {
    voteMap[p.code] = parseInt(votes[p.code] || "0", 10) || 0;
  });
  const registeredNum = parseInt(registered || "0", 10) || 0;
  const accreditedNum = parseInt(accredited || "0", 10) || 0;
  const invalidNum = parseInt(invalidVotes || "0", 10) || 0;

  const validationError = validateResultFigures({
    votes: voteMap,
    registered_voters: registeredNum,
    accredited_voters: accreditedNum,
    invalid_votes: invalidNum,
  });

  const handleAddParty = () => {
    const code = newPartyCode.trim().toUpperCase();
    if (!code || partyRows.some((p) => p.code === code)) return;
    setPartyRows((prev) => [...prev, { code }]);
    setNewPartyCode("");
  };

  const handleRemoveParty = (code: string) => {
    setPartyRows((prev) => prev.filter((p) => p.code !== code));
    setVotes((v) => {
      const copy = { ...v };
      delete copy[code];
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (validationError) return;

    await submit.mutateAsync({
      race_type: race,
      lga: pollingUnit.lga,
      ward: pollingUnit.ward,
      polling_unit_code: pollingUnit.code ?? null,
      polling_unit_name: pollingUnit.name,
      votes: voteMap,
      registered_voters: registeredNum,
      accredited_voters: accreditedNum,
      invalid_votes: invalidNum,
      agent_user_id: user?.id ?? null,
      agent_name: agentName ?? null,
      photoFile: photo,
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Polling Unit Result</DialogTitle>
          <DialogDescription>
            {pollingUnit.name} — {pollingUnit.ward}, {pollingUnit.lga}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Race */}
          <div className="space-y-2">
            <Label>Election Race</Label>
            <Select value={race} onValueChange={(v) => setRace(v as RaceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RACES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Registered & Accredited */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Registered Voters</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={registered}
                onChange={(e) => setRegistered(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Accredited Voters</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={accredited}
                onChange={(e) => setAccredited(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Party Votes — Dynamic */}
          <div className="space-y-2">
            <Label>Votes per Party</Label>
            <div className="space-y-2">
              {partyRows.map((p) => (
                <div key={p.code} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt={p.code}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {p.code.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold w-14 shrink-0">{p.code}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={votes[p.code] || ""}
                    onChange={(e) =>
                      setVotes((v) => ({ ...v, [p.code]: e.target.value }))
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                  {/* Only allow removing non-seed parties */}
                  {!SEED_PARTIES.some((s) => s.code === p.code) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => handleRemoveParty(p.code)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom party */}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add party code (e.g. NNPP)"
                value={newPartyCode}
                onChange={(e) => setNewPartyCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddParty()}
                className="flex-1 uppercase"
                maxLength={10}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddParty}
                disabled={!newPartyCode.trim()}
                className="gap-1 flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add any party contesting in this race that is not listed above.
            </p>
          </div>

          {/* Invalid / Spoilt Votes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Invalid / Spoilt Votes
              <span className="text-xs text-muted-foreground font-normal">
                (rejected ballots)
              </span>
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={invalidVotes}
              onChange={(e) => setInvalidVotes(e.target.value)}
              placeholder="0"
              className="border-amber-200 focus-visible:ring-amber-400"
            />
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <Label>Result Sheet (EC8A) Photo</Label>
            <label className="flex items-center gap-3 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              {photo ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground truncate">
                {photo ? photo.name : "Tap to upload a photo of the result sheet"}
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

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submit.isPending || !!validationError}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit Result"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

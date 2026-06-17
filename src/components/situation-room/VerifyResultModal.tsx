"use client";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { PARTY_LIST } from "@/config/parties";
import { RACE_MAP } from "@/config/races";
import {
  ElectionResult,
  useVerifyResult,
  useCorrectResult,
  validateResultFigures,
} from "@/hooks/useElectionResults";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface VerifyResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ElectionResult | null;
}

// Build party codes: known parties first, then any extra codes from the JSONB
const buildPartyCodes = (votes?: Record<string, number>): string[] => {
  const knownCodes = PARTY_LIST.filter((p) => p.id !== "neutral").map((p) => p.shortName);
  const extraCodes = Object.keys(votes ?? {}).filter((c) => !knownCodes.includes(c));
  return [...knownCodes, ...extraCodes];
};

export const VerifyResultModal = ({
  open,
  onOpenChange,
  result,
}: VerifyResultModalProps) => {
  const { user } = useAuth();
  const verify = useVerifyResult();
  const correct = useCorrectResult();

  const [mode, setMode] = useState<"review" | "correct">("review");
  const [note, setNote] = useState("");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState("");
  const [accredited, setAccredited] = useState("");
  const [invalidVotes, setInvalidVotes] = useState("");

  useEffect(() => {
    if (result) {
      setMode("review");
      setNote(result.verification_note ?? "");
      const partyCodes = buildPartyCodes(result.votes);
      const v: Record<string, string> = {};
      partyCodes.forEach((code) => {
        v[code] = String(result.votes?.[code] ?? "");
      });
      setVotes(v);
      setRegistered(String(result.registered_voters ?? ""));
      setAccredited(String(result.accredited_voters ?? ""));
      setInvalidVotes(String(result.invalid_votes ?? ""));
    }
  }, [result]);

  if (!result) return null;

  const partyCodes = buildPartyCodes(result.votes);
  const verifierName = user?.email || user?.id || "Super Admin";
  const busy = verify.isPending || correct.isPending;

  const correctedVoteMap: Record<string, number> = {};
  partyCodes.forEach((code) => {
    correctedVoteMap[code] = parseInt(votes[code] || "0", 10) || 0;
  });

  const correctionError =
    mode === "correct"
      ? validateResultFigures({
          votes: correctedVoteMap,
          registered_voters: parseInt(registered || "0", 10) || 0,
          accredited_voters: parseInt(accredited || "0", 10) || 0,
          invalid_votes: parseInt(invalidVotes || "0", 10) || 0,
        })
      : null;

  const handleVerify = async (status: "approved" | "rejected") => {
    await verify.mutateAsync({
      id: result.id,
      status,
      verified_by: verifierName,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  const handleCorrect = async () => {
    if (correctionError) return;
    await correct.mutateAsync({
      id: result.id,
      votes: correctedVoteMap,
      registered_voters: parseInt(registered || "0", 10) || 0,
      accredited_voters: parseInt(accredited || "0", 10) || 0,
      invalid_votes: parseInt(invalidVotes || "0", 10) || 0,
      verified_by: verifierName,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Verify Result
            <Badge variant="outline" className="capitalize">
              {result.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {RACE_MAP[result.race_type]?.label} — {result.polling_unit_name}
            {result.ward ? `, ${result.ward}` : ""}, {result.lga}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {result.agent_name && (
            <p className="text-xs text-muted-foreground">
              Submitted by {result.agent_name}
            </p>
          )}

          {result.result_sheet_url && (
            <a
              href={result.result_sheet_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-border overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src={result.result_sheet_url}
                alt="Result sheet"
                className="w-full max-h-64 object-contain bg-muted"
              />
              <span className="flex items-center gap-1 text-xs text-primary p-2">
                <ExternalLink className="w-3 h-3" /> Open full sheet
              </span>
            </a>
          )}

          {mode === "review" ? (
            <div className="space-y-2">
              <Label>Reported Figures</Label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground text-xs">Registered</p>
                  <p className="font-semibold tabular-nums">
                    {result.registered_voters}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground text-xs">Accredited</p>
                  <p className="font-semibold tabular-nums">
                    {result.accredited_voters}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                  <p className="text-amber-700 text-xs">Invalid/Spoilt</p>
                  <p className="font-semibold tabular-nums text-amber-800">
                    {result.invalid_votes ?? 0}
                  </p>
                </div>
              </div>
              <div className="space-y-1 pt-1">
                {partyCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between text-sm border-b border-border/50 py-1"
                  >
                    <span className="font-medium">{code}</span>
                    <span className="tabular-nums">
                      {result.votes?.[code] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Registered</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={registered}
                    onChange={(e) => setRegistered(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accredited</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={accredited}
                    onChange={(e) => setAccredited(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-700">Invalid</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={invalidVotes}
                    onChange={(e) => setInvalidVotes(e.target.value)}
                    className="border-amber-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Votes per Party</Label>
                {partyCodes.map((code) => (
                  <div key={code} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-16">{code}</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={votes[code] || ""}
                      onChange={(e) =>
                        setVotes((v) => ({ ...v, [code]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Verification Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note, e.g. reason for rejection or correction…"
              rows={2}
            />
          </div>

          {mode === "review" ? (
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => setMode("correct")}
                disabled={busy}
                className="gap-1"
              >
                <Pencil className="w-4 h-4" /> Correct
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleVerify("rejected")}
                disabled={busy}
                className="gap-1"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button
                onClick={() => handleVerify("approved")}
                disabled={busy}
                className="gap-1"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}{" "}
                Approve
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {correctionError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{correctionError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("review")}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCorrect}
                  disabled={busy || !!correctionError}
                  className="gap-1"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}{" "}
                  Save & Approve
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

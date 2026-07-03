"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Radio,
  Trophy,
  Users,
  CheckCircle2,
  MapPin,
  Plus,
  Loader2,
  Building2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { usePUAgent } from "@/hooks/usePUAgent";
import {
  useElectionResults,
  summarize,
  breakdownByLga,
  type ElectionResult,
} from "@/hooks/useElectionResults";
import { RACES, RaceType, getDefaultRaceForRole, RACE_MAP } from "@/config/races";
import { PARTY_LIST } from "@/config/parties";
import { useParty } from "@/contexts/PartyContext";
import { SubmitResultModal } from "@/components/situation-room/SubmitResultModal";
import { VerifyResultModal } from "@/components/situation-room/VerifyResultModal";
import { IncidentReportModal } from "@/components/situation-room/IncidentReportModal";
import { IncidentLogPanel } from "@/components/situation-room/IncidentLogPanel";

const nf = new Intl.NumberFormat("en-US");

const partyColor = (code: string) => {
  const p = PARTY_LIST.find((x) => x.shortName === code);
  return p?.colors.swatches[0] || "#64748b";
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<
    string,
    { label: string; icon: React.ElementType; cls: string }
  > = {
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      cls: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`border-0 gap-1 ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </Badge>
  );
};

const SituationRoom = () => {
  const { role } = useAuth();
  const { party } = useParty();
  const { data: authorizedLgas } = useAuthorizedLgas();
  const { data: puAgent } = usePUAgent();

  const isAgent = role === "polling_unit_agent";
  const isStateWide = role === "super_admin" || role === "org_admin";
  const canVerify = role === "super_admin";

  const [activeRace, setActiveRace] = useState<RaceType>(
    getDefaultRaceForRole(role),
  );
  const [submitOpen, setSubmitOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<ElectionResult | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);

  // Which races this role may view
  const visibleRaces = useMemo(() => {
    if (isStateWide || isAgent) return RACES;
    return RACES.filter(
      (r) =>
        r.id === "presidential" ||
        r.id === "governorship" ||
        (role && r.ownerRoles.includes(role)),
    );
  }, [role, isStateWide, isAgent]);

  // Jurisdiction LGA scope
  const lgaList = useMemo(() => {
    if (isStateWide) return ["ALL"];
    if (isAgent) return puAgent?.lga ? [puAgent.lga] : [];
    return authorizedLgas || [];
  }, [isStateWide, isAgent, authorizedLgas, puAgent]);

  const { data: results, isLoading } = useElectionResults({
    raceType: activeRace,
    lgaList,
    pollingUnitName: isAgent ? puAgent?.polling_unit_name : undefined,
  });

  const rows = useMemo(() => results || [], [results]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const lgaRows = useMemo(() => breakdownByLga(rows), [rows]);
  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );

  const myPartyCode = party.shortName;
  const turnoutPct =
    summary.totalAccredited > 0
      ? Math.min((summary.totalVotes / summary.totalAccredited) * 100, 100)
      : 0;

  const scopeLabel = isStateWide
    ? "State-wide"
    : isAgent
    ? puAgent?.polling_unit_name || "Your Polling Unit"
    : lgaList.length
    ? `${lgaList.length} LGA${lgaList.length > 1 ? "s" : ""}`
    : "Your jurisdiction";

  return (
    <DashboardLayout
      title="Situation Room"
      subtitle="Live Election Results Monitoring"
    >
      {/* Header bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>
          <span className="text-sm font-semibold text-foreground">LIVE</span>
          <Badge variant="secondary" className="ml-1 gap-1">
            <MapPin className="w-3 h-3" /> {scopeLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAgent && puAgent && (
            <Button onClick={() => setSubmitOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Submit Results
            </Button>
          )}
          {!isAgent && (
            <Link href="/situation-room/live">
              <Button className="gap-2 bg-slate-900 border border-slate-800 text-slate-100 hover:bg-slate-800">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" /> Command Video Wall
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            onClick={() => setIncidentOpen(true)}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <AlertTriangle className="w-4 h-4" /> Report Incident
          </Button>
        </div>
      </motion.div>

      {/* Race tabs */}
      <Tabs value={activeRace} onValueChange={(v) => setActiveRace(v as RaceType)}>
        <TabsList className="mb-6 flex-wrap h-auto">
          {visibleRaces.map((r) => (
            <TabsTrigger key={r.id} value={r.id}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <StatCard
              icon={Radio}
              label="Units Reported"
              value={nf.format(summary.reportedUnits)}
            />
            <StatCard
              icon={Users}
              label="Total Votes"
              value={nf.format(summary.totalVotes)}
            />
            <StatCard
              icon={CheckCircle2}
              label="Accredited"
              value={nf.format(summary.totalAccredited)}
            />
            <StatCard
              icon={Ban}
              label="Invalid Votes"
              value={nf.format(summary.totalInvalidVotes)}
              accent="#d97706"
            />
            <StatCard
              icon={Trophy}
              label="Leading"
              value={summary.leader?.code || "—"}
              accent={summary.leader ? partyColor(summary.leader.code) : undefined}
            />
          </div>

          {/* Turnout */}
          {summary.totalAccredited > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Votes vs Accredited</span>
                <span className="font-semibold">{turnoutPct.toFixed(1)}%</span>
              </div>
              <Progress value={turnoutPct} />
            </div>
          )}

          {/* Party leaderboard */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
            <h3 className="font-semibold text-foreground mb-4">
              {RACE_MAP[activeRace]?.label} — Party Standings
            </h3>
            {summary.tallies.length === 0 ||
            summary.tallies.every((t) => t.votes === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No results reported yet for this race.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.tallies.map((t, i) => {
                  const isMine = t.code === myPartyCode;
                  const isLeader = i === 0 && t.votes > 0;
                  return (
                    <div key={t.code}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 font-medium">
                          {t.code}
                          {isMine && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Your Party
                            </Badge>
                          )}
                          {isLeader && (
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </span>
                        <span className="tabular-nums">
                          {nf.format(t.votes)}{" "}
                          <span className="text-muted-foreground">
                            ({t.pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${t.pct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{
                            background: partyColor(t.code),
                            outline: isMine ? "1px solid hsl(var(--ring))" : "none",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LGA breakdown */}
          {!isAgent && lgaRows.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> LGA Breakdown
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LGA</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Leader</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lgaRows.map((r) => (
                    <TableRow key={r.lga}>
                      <TableCell className="font-medium">{r.lga}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.reportedUnits}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {nf.format(r.totalVotes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          style={{
                            background: `${partyColor(r.leader)}20`,
                            color: partyColor(r.leader),
                          }}
                          className="border-0"
                        >
                          {r.leader}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Verification queue (super admin only) */}
          {canVerify && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Verification Queue
                {pendingCount > 0 && (
                  <Badge className="border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {pendingCount} pending
                  </Badge>
                )}
              </h3>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No submitted results to verify yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((r) => {
                    const top = Object.entries(r.votes || {}).sort(
                      (a, b) => (b[1] as number) - (a[1] as number),
                    )[0];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.polling_unit_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.ward ? `${r.ward}, ` : ""}
                            {r.lga}
                            {top ? ` • ${top[0]} ${nf.format(top[1] as number)}` : ""}
                            {r.invalid_votes ? ` • ${r.invalid_votes} invalid` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={r.status} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerifyTarget(r)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Live feed */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" /> Incoming Results
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Waiting for the first results to come in…
              </p>
            ) : (
              <div className="space-y-2">
                {rows.slice(0, 25).map((r) => {
                  const top = Object.entries(r.votes || {}).sort(
                    (a, b) => (b[1] as number) - (a[1] as number),
                  )[0];
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.polling_unit_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.ward ? `${r.ward}, ` : ""}
                          {r.lga} • {new Date(r.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={r.status} />
                        {r.result_sheet_url && (
                          <a
                            href={r.result_sheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            Sheet
                          </a>
                        )}
                        {top && (
                          <Badge
                            style={{
                              background: `${partyColor(top[0])}20`,
                              color: partyColor(top[0]),
                            }}
                            className="border-0"
                          >
                            {top[0]} {nf.format(top[1] as number)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incident Log */}
          <IncidentLogPanel lga={isStateWide ? undefined : lgaList[0]} />
        </>
      )}

      {isAgent && puAgent && (
        <SubmitResultModal
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          pollingUnit={{
            name: puAgent.polling_unit_name,
            ward: puAgent.ward,
            lga: puAgent.lga,
            code: puAgent.polling_unit_id,
          }}
          agentName={puAgent.agent_name}
        />
      )}

      {canVerify && (
        <VerifyResultModal
          open={!!verifyTarget}
          onOpenChange={(o) => !o && setVerifyTarget(null)}
          result={verifyTarget}
        />
      )}

      <IncidentReportModal
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        defaultLga={isAgent ? puAgent?.lga : undefined}
        defaultWard={isAgent ? puAgent?.ward : undefined}
        defaultPollingUnit={isAgent ? puAgent?.polling_unit_name : undefined}
      />
    </DashboardLayout>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <p
      className="text-2xl font-bold tabular-nums"
      style={accent ? { color: accent } : undefined}
    >
      {value}
    </p>
  </div>
);

export default SituationRoom;

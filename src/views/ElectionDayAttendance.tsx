"use client";
import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useElectionAttendance,
  useToggleArrived,
  useToggleVoted,
  useAttendanceSummary,
  type MemberAttendanceRow,
} from "@/hooks/useElectionAttendance";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Users,
  CheckCircle2,
  Vote,
  Award,
  UserCheck,
  X,
  Filter,
} from "lucide-react";

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon className="w-4 h-4" style={color ? { color } : undefined} />
      <span className="text-xs">{label}</span>
    </div>
    <p
      className="text-2xl font-bold tabular-nums"
      style={color ? { color } : undefined}
    >
      {value}
    </p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

// ─── Toggle Button ────────────────────────────────────────────────────────────
const ToggleBtn = ({
  on,
  onLabel,
  offLabel,
  onColor,
  onClick,
  busy,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onColor: string;
  onClick: () => void;
  busy?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={busy}
    className={`relative h-7 px-3 rounded-full text-xs font-semibold transition-all duration-200 border-2 select-none
      ${on
        ? `border-transparent text-white`
        : `border-border bg-background text-muted-foreground hover:border-primary/40`
      }
      ${busy ? "opacity-60 cursor-wait" : "cursor-pointer"}
    `}
    style={on ? { background: onColor } : undefined}
  >
    {on ? onLabel : offLabel}
  </button>
);

// ─── Member Row ───────────────────────────────────────────────────────────────
const MemberRow = ({
  member,
  recordedBy,
}: {
  member: MemberAttendanceRow;
  recordedBy?: string | null;
}) => {
  const toggleArrived = useToggleArrived();
  const toggleVoted = useToggleVoted();

  const handleArrived = useCallback(() => {
    toggleArrived.mutate({
      memberId: member.id,
      arrived: !member.arrived,
      lga: member.lga ?? undefined,
      ward: member.ward ?? undefined,
      pollingUnit: member.polling_unit ?? undefined,
      recordedBy,
    });
  }, [member, toggleArrived, recordedBy]);

  const handleVoted = useCallback(() => {
    toggleVoted.mutate({
      memberId: member.id,
      voted: !member.voted_our_party,
      memberArrived: member.arrived,
    });
  }, [member, toggleVoted]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
        style={{
          background: member.loyalty_enrolled
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "hsl(var(--muted))",
          color: member.loyalty_enrolled ? "#fff" : "hsl(var(--muted-foreground))",
        }}
      >
        {member.full_name?.charAt(0).toUpperCase()}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">
            {member.full_name}
          </p>
          {member.loyalty_enrolled && (
            <Badge className="border-0 text-[9px] py-0 px-1.5 bg-amber-100 text-amber-700 font-bold gap-0.5">
              <Award className="w-2.5 h-2.5" /> GOLD
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[member.polling_unit, member.ward, member.lga].filter(Boolean).join(" · ")}
          {member.membership_id ? ` · #${member.membership_id}` : ""}
        </p>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ToggleBtn
          on={member.arrived}
          onLabel="✓ Arrived"
          offLabel="Arrived"
          onColor="#16a34a"
          onClick={handleArrived}
          busy={toggleArrived.isPending}
        />
        <ToggleBtn
          on={member.voted_our_party}
          onLabel="✓ Voted"
          offLabel="Voted"
          onColor="#2563eb"
          onClick={handleVoted}
          busy={toggleVoted.isPending}
        />
      </div>
    </motion.div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
type FilterMode = "all" | "arrived" | "voted" | "enrolled" | "not_arrived";

const ElectionDayAttendance = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data: members, isLoading } = useElectionAttendance({
    search: search.trim() || undefined,
  });

  const allMembers = members ?? [];
  const stats = useAttendanceSummary(allMembers);

  const displayed = useMemo(() => {
    switch (filter) {
      case "arrived":
        return allMembers.filter((m) => m.arrived && !m.voted_our_party);
      case "voted":
        return allMembers.filter((m) => m.voted_our_party);
      case "enrolled":
        return allMembers.filter((m) => m.loyalty_enrolled);
      case "not_arrived":
        return allMembers.filter((m) => !m.arrived);
      default:
        return allMembers;
    }
  }, [allMembers, filter]);

  const filterBtns: { key: FilterMode; label: string; count?: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "not_arrived", label: "Not Arrived", count: stats.total - stats.arrived },
    { key: "arrived", label: "Arrived", count: stats.arrived },
    { key: "voted", label: "Voted", count: stats.voted },
    { key: "enrolled", label: "Loyalty", count: stats.enrolled },
  ];

  return (
    <DashboardLayout
      title="Election Day Attendance"
      subtitle="Track member arrival, voting confirmation & loyalty enrollment"
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={Users}
          label="Total Members"
          value={stats.total}
        />
        <KpiCard
          icon={UserCheck}
          label="Arrived"
          value={stats.arrived}
          sub={`${stats.arrivedPct}% of total`}
          color="#16a34a"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Voted Our Party"
          value={stats.voted}
          sub={`${stats.votedPct}% of total`}
          color="#2563eb"
        />
        <KpiCard
          icon={Award}
          label="Loyalty Enrolled"
          value={stats.enrolled}
          color="#d97706"
        />
      </div>

      {/* Progress bars */}
      {stats.total > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Arrival Rate</span>
              <span className="font-semibold text-green-600">{stats.arrivedPct}%</span>
            </div>
            <Progress value={stats.arrivedPct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Vote Confirmation</span>
              <span className="font-semibold text-blue-600">{stats.votedPct}%</span>
            </div>
            <Progress value={stats.votedPct} className="h-2" />
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or member ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === btn.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 bg-card"
              }`}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span className={`ml-1 ${filter === btn.key ? "opacity-80" : "text-muted-foreground"}`}>
                  ({btn.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" /> Member Check-In List
          </h3>
          <span className="text-xs text-muted-foreground">
            {displayed.length} member{displayed.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center">
              <Vote className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">
                {search ? "No members match your search." : "No members found."}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {displayed.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  recordedBy={user?.id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
          Arrived — member is present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          Voted — confirmed voting for our party
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          Gold badge = Auto-enrolled in Loyalty Card
        </span>
      </div>
    </DashboardLayout>
  );
};

export default ElectionDayAttendance;

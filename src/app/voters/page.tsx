"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { localVoterService, LocalVoter, LgaSummary } from "@/services/LocalVoterService";
import { KOGI_LGAS } from "@/data/lgas";
import { Search, Users, MapPin, Building, ShieldCheck, CheckCircle2, Filter, X, Copy, Check, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChairman } from "@/hooks/useChairmen";
import { useCouncillor } from "@/hooks/useCouncillors";
import { toast } from "sonner";

export default function VotersRegistryPage() {
  const { role } = useAuth();
  const { data: chairman } = useChairman();
  const { data: councillor } = useCouncillor();

  const isChairman = role === "lga_chairman";
  const isCouncillor = role === "councillor";

  const defaultLga = isChairman
    ? (chairman?.lga || "Lokoja")
    : (isCouncillor ? (councillor?.lga || "Lokoja") : "Adavi");

  const [selectedLga, setSelectedLga] = useState<string>(defaultLga);
  const [summary, setSummary] = useState<LgaSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [vinQuery, setVinQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");

  const [results, setResults] = useState<LocalVoter[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searching, setSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [copiedVin, setCopiedVin] = useState<string | null>(null);

  // Sync default LGA when chairman or councillor data loads
  useEffect(() => {
    if (isChairman && chairman?.lga && selectedLga !== chairman.lga) {
      setSelectedLga(chairman.lga);
    } else if (isCouncillor && councillor?.lga && selectedLga !== councillor.lga) {
      setSelectedLga(councillor.lga);
    }
  }, [isChairman, chairman?.lga, isCouncillor, councillor?.lga]);

  // Load summary whenever selected LGA changes
  useEffect(() => {
    let isCancelled = false;
    async function loadLgaData() {
      setLoadingSummary(true);
      setSelectedWard("all");
      const sum = await localVoterService.getSummary(selectedLga);
      if (isCancelled) return;
      setSummary(sum);
      setLoadingSummary(false);

      setSearching(true);
      const res = await localVoterService.searchVoters({ lga: selectedLga, limit: 50 });
      if (isCancelled) return;
      setResults(res.results);
      setTotalMatches(res.total);
      setSearching(false);
      setInitialLoaded(true);
    }
    loadLgaData();
    return () => { isCancelled = true; };
  }, [selectedLga]);

  // Search when filters change (debounced)
  useEffect(() => {
    if (!initialLoaded) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await localVoterService.searchVoters({
        lga: selectedLga,
        query: searchQuery,
        vin: vinQuery,
        ward: selectedWard !== "all" ? selectedWard : undefined,
        limit: 100,
      });

      let filtered = res.results;
      if (selectedGender !== "all") {
        filtered = filtered.filter((v) => v.gender === selectedGender);
      }

      setResults(filtered);
      setTotalMatches(res.total);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedLga, searchQuery, vinQuery, selectedWard, selectedGender, initialLoaded]);

  const handleCopyVin = (vin: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(vin);
      setCopiedVin(vin);
      toast.success("VIN copied to clipboard!");
      setTimeout(() => setCopiedVin(null), 2000);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setVinQuery("");
    setSelectedWard("all");
    setSelectedGender("all");
  };

  const hasActiveFilters = searchQuery || vinQuery || selectedWard !== "all" || selectedGender !== "all";

  return (
    <DashboardLayout title="INEC Voter Register" subtitle="Official Kogi State Voter Database">
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Top Header / Scope Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                {selectedLga} Voter Registry
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Verified INEC Data
              </Badge>
              {isChairman && (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  <Lock className="w-3 h-3 mr-1" />
                  LGA Scoped
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Official voter records stored locally for instant offline search across {selectedLga} LGA.
            </p>
          </div>

          {summary ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-card border px-2.5 py-1.5 rounded-lg shadow-xs">
                <span className="text-muted-foreground">Total Voters:</span>{" "}
                <strong className="text-foreground font-bold">
                  {summary.total_voters_extracted.toLocaleString()}
                </strong>
              </div>
              <div className="bg-card border px-2.5 py-1.5 rounded-lg shadow-xs">
                <span className="text-muted-foreground">Wards:</span>{" "}
                <strong className="text-foreground font-bold">{summary.total_wards}</strong>
              </div>
              <div className="bg-card border px-2.5 py-1.5 rounded-lg shadow-xs">
                <span className="text-muted-foreground">Polling Units:</span>{" "}
                <strong className="text-foreground font-bold">{summary.total_polling_units}</strong>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              Data loading...
            </div>
          )}
        </div>

        {/* Filter / Search Bar */}
        <Card className="shadow-xs border border-border/60">
          <CardHeader className="pb-3 p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                Search & Verification Filter
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1 px-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Search by voter name, VIN, or filter by electoral ward and gender.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {/* LGA Select (Locked for Chairman/Councillor) */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Local Government (LGA)
                </label>
                <select
                  value={selectedLga}
                  onChange={(e) => setSelectedLga(e.target.value)}
                  disabled={isChairman || isCouncillor}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted/50 disabled:cursor-not-allowed"
                >
                  {KOGI_LGAS.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Search */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Voter Name
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="e.g. MOHAMMED, IBRAHIM"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* VIN Search */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  VIN (Voter ID No.)
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. 90F5B017..."
                    value={vinQuery}
                    onChange={(e) => setVinQuery(e.target.value)}
                    className="h-9 text-xs sm:text-sm font-mono uppercase"
                  />
                  {vinQuery && (
                    <button
                      onClick={() => setVinQuery("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Ward Selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Filter by Ward
                </label>
                <select
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                >
                  <option value="all">
                    All {summary ? `${summary.total_wards} Wards` : "Wards"}
                  </option>
                  {summary?.wards.map((w) => (
                    <option key={w.ward_code} value={w.ward_name}>
                      {w.ward_name} ({w.total_voters.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Gender
                </label>
                <select
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <option value="all">All Genders</option>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count & Status */}
        <div className="flex items-center justify-between text-xs sm:text-sm px-1">
          <span className="text-muted-foreground">
            Showing <strong className="text-foreground">{results.length}</strong> of{" "}
            <strong className="text-foreground">{totalMatches.toLocaleString()}</strong> registered voters in {selectedLga}
          </span>
          {searching && <span className="text-xs text-emerald-600 animate-pulse font-medium">Filtering...</span>}
        </div>

        {/* ── MOBILE CARD VIEW (Optimized for Small Screens) ── */}
        <div className="md:hidden space-y-3">
          {results.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                {searching ? "Searching local database..." : `No matching voters found in ${selectedLga}.`}
              </p>
            </Card>
          ) : (
            results.map((voter, index) => (
              <Card key={voter.vin + index} className="p-3.5 border border-border/70 shadow-xs hover:border-emerald-500/50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {voter.full_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold tracking-tight">
                        {voter.vin}
                      </span>
                      <button
                        onClick={() => handleCopyVin(voter.vin)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        title="Copy VIN"
                      >
                        {copiedVin === voter.vin ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        voter.gender === "M"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                      }`}
                    >
                      {voter.gender === "M" ? "Male" : "Female"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {voter.dob_year || "—"}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground truncate">{voter.ward} Ward</span>
                  </div>
                  <div className="flex items-start gap-1.5 pl-5">
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {voter.polling_unit_name}{" "}
                      <span className="font-mono text-[10px] text-muted-foreground/75">({voter.polling_unit_code})</span>
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ── DESKTOP TABLE VIEW ── */}
        <Card className="hidden md:block overflow-hidden border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-muted/70 border-b text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">VIN (Voter ID)</th>
                  <th className="py-2.5 px-3 text-center">Gender</th>
                  <th className="py-2.5 px-3 text-center">Birth Year</th>
                  <th className="py-2.5 px-3">Ward</th>
                  <th className="py-2.5 px-3">Polling Unit & Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {searching ? "Searching local database..." : `No matching registered voters found in ${selectedLga}.`}
                    </td>
                  </tr>
                ) : (
                  results.map((voter, index) => (
                    <tr key={voter.vin + index} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{index + 1}</td>
                      <td className="py-2 px-3 font-semibold text-foreground">
                        {voter.full_name}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-medium tracking-tight">
                        <div className="flex items-center gap-1.5">
                          <span>{voter.vin}</span>
                          <button
                            onClick={() => handleCopyVin(voter.vin)}
                            className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
                            title="Copy VIN"
                          >
                            {copiedVin === voter.vin ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            voter.gender === "M"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                          }`}
                        >
                          {voter.gender}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                        {voter.dob_year || "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground truncate max-w-[180px]">
                        {voter.ward}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-foreground truncate max-w-[240px]">
                          {voter.polling_unit_name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {voter.polling_unit_code}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

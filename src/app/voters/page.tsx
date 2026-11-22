"use client";

import React, { useState, useEffect, useMemo } from "react";
import { localVoterService, LocalVoter, LgaSummary } from "@/services/LocalVoterService";
import { KOGI_LGAS } from "@/data/lgas";
import { Search, Users, MapPin, Building, ShieldCheck, CheckCircle2, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VotersRegistryPage() {
  const [selectedLga, setSelectedLga] = useState<string>("Adavi");
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {selectedLga} Voter Registry
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              100% Local File Data
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Official INEC voter records stored locally in partitioned files for 0% network latency.
          </p>
        </div>

        {summary ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="bg-card border px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-muted-foreground">Total Voters:</span>{" "}
              <strong className="text-foreground font-bold">
                {summary.total_voters_extracted.toLocaleString()}
              </strong>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-muted-foreground">Wards:</span>{" "}
              <strong className="text-foreground font-bold">{summary.total_wards}</strong>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-muted-foreground">Polling Units:</span>{" "}
              <strong className="text-foreground font-bold">{summary.total_polling_units}</strong>
            </div>
          </div>
        ) : (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            Data loading or extracting...
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Voter Search & Verification Filter
          </CardTitle>
          <CardDescription>
            Select LGA, search by voter full name, VIN (Voter Identification Number), or filter by ward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* LGA Select */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Local Government (LGA)
              </label>
              <select
                value={selectedLga}
                onChange={(e) => setSelectedLga(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Voter Name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="e.g. ABASS, MOHAMMED"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* VIN Search */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                VIN (Voter ID No.)
              </label>
              <div className="relative">
                <Input
                  placeholder="e.g. 71BC061..."
                  value={vinQuery}
                  onChange={(e) => setVinQuery(e.target.value)}
                  className="h-9 text-sm font-mono uppercase"
                />
              </div>
            </div>

            {/* Ward Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Filter by Ward
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
              >
                <option value="all">
                  All {summary ? `${summary.total_wards} Wards` : "Wards"}
                </option>
                {summary?.wards.map((w) => (
                  <option key={w.ward_code} value={w.ward_name}>
                    {w.ward_code} - {w.ward_name} ({w.total_voters.toLocaleString()} voters)
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Gender Filter
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground">
          Showing <strong className="text-foreground">{results.length}</strong> of{" "}
          <strong className="text-foreground">{totalMatches.toLocaleString()}</strong> matching voters in Adavi
        </span>
        {searching && <span className="text-xs text-primary animate-pulse font-medium">Filtering records...</span>}
      </div>

      {/* Results Table */}
      <Card className="overflow-hidden border shadow-sm">
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
                    {searching ? "Searching local database..." : "No matching registered voters found in Adavi."}
                  </td>
                </tr>
              ) : (
                results.map((voter, index) => (
                  <tr key={voter.vin + index} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{index + 1}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {voter.full_name}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-primary font-medium tracking-tight">
                      {voter.vin}
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
  );
}

"use client";
import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Trophy, Medal, Search, Download, Printer, UserCheck, Clock, Users, ShieldCheck, Sparkles, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { APCFlag } from "@/components/branding/APCFlag";

interface AgentPerformance {
    id: string;
    agent_name: string;
    phone: string;
    polling_unit_name: string;
    ward: string;
    lga: string;
    total_registered: number;
    verified_count: number;
    pending_count: number;
}

export const AgentPerformanceReport = ({ lga, ward }: { lga: string; ward: string }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"registered" | "verified">("registered");
    const reportRef = useRef<HTMLDivElement>(null);

    const { data: agents = [], isLoading, refetch } = useQuery<AgentPerformance[]>({
        queryKey: ["agent-performance-report", lga, ward],
        queryFn: async () => {
            if (!lga || !ward) return [];

            // Fetch polling unit agents for this ward
            const { data: puaData, error: puaError } = await supabase
                .from("polling_unit_agents")
                .select("id, user_id, agent_name, phone, polling_unit_id, polling_unit_name, ward, lga")
                .eq("lga", lga)
                .eq("ward", ward);

            if (puaError) throw puaError;
            if (!puaData || puaData.length === 0) return [];

            // Fetch members in this ward to compute agent counts accurately
            const { data: memberData, error: memError } = await supabase
                .from("members")
                .select("id, created_by, polling_unit_id, polling_unit, is_verified")
                .eq("lga", lga)
                .eq("ward", ward);

            if (memError) throw memError;

            // Map stats to agents
            const performanceList: AgentPerformance[] = puaData.map((agent) => {
                const agentMembers = (memberData || []).filter((m) => 
                    (agent.user_id && m.created_by === agent.user_id) ||
                    (agent.polling_unit_id && m.polling_unit_id === agent.polling_unit_id) ||
                    (agent.polling_unit_name && m.polling_unit?.toLowerCase() === agent.polling_unit_name.toLowerCase())
                );

                const total_registered = agentMembers.length;
                const verified_count = agentMembers.filter((m) => m.is_verified === true).length;
                const pending_count = agentMembers.filter((m) => m.is_verified === false || m.is_verified === null).length;

                return {
                    id: agent.id,
                    agent_name: agent.agent_name || "Unassigned Agent",
                    phone: agent.phone || "N/A",
                    polling_unit_name: agent.polling_unit_name || "General Unit",
                    ward: agent.ward || ward,
                    lga: agent.lga || lga,
                    total_registered,
                    verified_count,
                    pending_count,
                };
            });

            // Sort by total_registered descending then verified_count
            return performanceList.sort((a, b) => {
                if (b.total_registered !== a.total_registered) {
                    return b.total_registered - a.total_registered;
                }
                return b.verified_count - a.verified_count;
            });
        },
        enabled: !!lga && !!ward,
    });

    const filteredAgents = agents.filter(agent =>
        agent.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.polling_unit_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phone.includes(searchQuery)
    ).sort((a, b) => {
        if (sortBy === "verified") {
            return b.verified_count - a.verified_count;
        }
        return b.total_registered - a.total_registered;
    });

    const top3 = agents.slice(0, 3);
    const goldAgent = top3[0];
    const silverAgent = top3[1];
    const bronzeAgent = top3[2];

    const totalWardRegistered = agents.reduce((sum, a) => sum + a.total_registered, 0);
    const totalWardVerified = agents.reduce((sum, a) => sum + a.verified_count, 0);
    const totalWardPending = agents.reduce((sum, a) => sum + a.pending_count, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card className="border-0 shadow-xl bg-white overflow-hidden my-6">
            <div className="h-1.5 bg-gradient-to-r from-apc-green via-amber-400 to-apc-red" />
            
            <CardHeader className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
                        <CardTitle className="text-lg sm:text-xl font-black text-white">
                            Agent Performance Report & Ranking
                        </CardTitle>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                        Ward Polling Unit Agent Mobilization & Verification Leaderboard — <span className="text-amber-300 font-bold">{ward}, {lga} LGA</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <Button 
                        onClick={handlePrint}
                        size="sm" 
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-md cursor-pointer"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Print / Export PDF Report</span>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">

                {/* ── TOP 3 PODIUM CHAMPIONS ── */}
                {!isLoading && agents.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                                Top 3 Performing Agents (Champions Podium)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* GOLD - RANK 1 */}
                            {goldAgent && (
                                <motion.div 
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 via-amber-100/50 to-yellow-500/20 border-2 border-amber-400 shadow-lg overflow-hidden flex flex-col justify-between"
                                >
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow">
                                        🥇 1st Place - Gold Champion
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mt-2 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shadow-md font-extrabold text-xl">
                                                🥇
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-base leading-tight">
                                                    {goldAgent.agent_name}
                                                </h4>
                                                <p className="text-[11px] text-amber-900 font-semibold mt-0.5">
                                                    {goldAgent.polling_unit_name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    📞 {goldAgent.phone}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center my-2">
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Registered</p>
                                                <p className="text-base font-black text-amber-700">{goldAgent.total_registered}</p>
                                            </div>
                                            <div className="border-x border-amber-200">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Verified</p>
                                                <p className="text-base font-black text-emerald-600">{goldAgent.verified_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Pending</p>
                                                <p className="text-base font-black text-orange-600">{goldAgent.pending_count}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-amber-300/50 flex justify-between items-center text-xs font-bold text-amber-950">
                                        <span>Verification Rate:</span>
                                        <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[11px]">
                                            {goldAgent.total_registered > 0 
                                                ? Math.round((goldAgent.verified_count / goldAgent.total_registered) * 100) 
                                                : 0}%
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* SILVER - RANK 2 */}
                            {silverAgent && (
                                <motion.div 
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="relative rounded-2xl p-5 bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between"
                                >
                                    <div className="absolute top-0 right-0 bg-slate-700 text-white font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                        🥈 2nd Place - Silver Agent
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mt-2 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-gray-600 flex items-center justify-center text-white shadow-md font-extrabold text-xl">
                                                🥈
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-base leading-tight">
                                                    {silverAgent.agent_name}
                                                </h4>
                                                <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
                                                    {silverAgent.polling_unit_name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    📞 {silverAgent.phone}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 bg-white/80 p-2.5 rounded-xl border border-slate-200 text-center my-2">
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Registered</p>
                                                <p className="text-base font-black text-slate-800">{silverAgent.total_registered}</p>
                                            </div>
                                            <div className="border-x border-slate-200">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Verified</p>
                                                <p className="text-base font-black text-emerald-600">{silverAgent.verified_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Pending</p>
                                                <p className="text-base font-black text-orange-600">{silverAgent.pending_count}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center text-xs font-bold text-slate-900">
                                        <span>Verification Rate:</span>
                                        <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-[11px]">
                                            {silverAgent.total_registered > 0 
                                                ? Math.round((silverAgent.verified_count / silverAgent.total_registered) * 100) 
                                                : 0}%
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* BRONZE - RANK 3 */}
                            {bronzeAgent && (
                                <motion.div 
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-900/10 via-orange-100/50 to-amber-700/20 border-2 border-amber-600/40 shadow-md overflow-hidden flex flex-col justify-between"
                                >
                                    <div className="absolute top-0 right-0 bg-amber-800 text-white font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                        🥉 3rd Place - Bronze Agent
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mt-2 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white shadow-md font-extrabold text-xl">
                                                🥉
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-base leading-tight">
                                                    {bronzeAgent.agent_name}
                                                </h4>
                                                <p className="text-[11px] text-amber-900 font-semibold mt-0.5">
                                                    {bronzeAgent.polling_unit_name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    📞 {bronzeAgent.phone}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center my-2">
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Registered</p>
                                                <p className="text-base font-black text-amber-900">{bronzeAgent.total_registered}</p>
                                            </div>
                                            <div className="border-x border-amber-200">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Verified</p>
                                                <p className="text-base font-black text-emerald-600">{bronzeAgent.verified_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Pending</p>
                                                <p className="text-base font-black text-orange-600">{bronzeAgent.pending_count}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-amber-300 flex justify-between items-center text-xs font-bold text-amber-950">
                                        <span>Verification Rate:</span>
                                        <span className="bg-amber-800 text-white px-2 py-0.5 rounded-full text-[11px]">
                                            {bronzeAgent.total_registered > 0 
                                                ? Math.round((bronzeAgent.verified_count / bronzeAgent.total_registered) * 100) 
                                                : 0}%
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── SEARCH AND SUMMARY COUNTERS ── */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 print:hidden">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search agent name, phone, or polling unit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={sortBy === "registered" ? "default" : "outline"}
                            onClick={() => setSortBy("registered")}
                            className="text-xs gap-1"
                        >
                            <Users className="h-3.5 w-3.5" />
                            Sort by Registered
                        </Button>
                        <Button
                            size="sm"
                            variant={sortBy === "verified" ? "default" : "outline"}
                            onClick={() => setSortBy("verified")}
                            className="text-xs gap-1"
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Sort by Verified
                        </Button>
                    </div>
                </div>

                {/* ── AGENTS LEADERBOARD TABLE ── */}
                <div ref={reportRef} className="printable-report">
                    
                    {/* Header visible only on print */}
                    <div className="hidden print:block mb-6 p-4 border-b-2 border-slate-900">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">ALL PROGRESSIVES CONGRESS (APC)</h1>
                                <h2 className="text-lg font-bold text-emerald-700">WARD AGENT PERFORMANCE LEADERBOARD REPORT</h2>
                                <p className="text-xs text-slate-600">Ward: {ward} | LGA: {lga} | Generated on: {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                            <APCFlag size="md" variant="full" />
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-900 hover:bg-slate-900 text-white">
                                    <TableHead className="text-xs font-black text-amber-400 uppercase w-12 text-center">Rank</TableHead>
                                    <TableHead className="text-xs font-black text-white uppercase">Agent Name</TableHead>
                                    <TableHead className="text-xs font-black text-white uppercase">Polling Unit</TableHead>
                                    <TableHead className="text-xs font-black text-amber-300 uppercase text-center">Total Registered</TableHead>
                                    <TableHead className="text-xs font-black text-emerald-400 uppercase text-center">Verified</TableHead>
                                    <TableHead className="text-xs font-black text-orange-400 uppercase text-center">Pending</TableHead>
                                    <TableHead className="text-xs font-black text-white uppercase text-center">Verification %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                                            Loading agent performance records...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAgents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                                            No agent performance data found in this ward.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAgents.map((agent, index) => {
                                        const rank = index + 1;
                                        const verificationPct = agent.total_registered > 0
                                            ? Math.round((agent.verified_count / agent.total_registered) * 100)
                                            : 0;

                                        const rankBadge = rank === 1 ? "🥇 1st" :
                                                          rank === 2 ? "🥈 2nd" :
                                                          rank === 3 ? "🥉 3rd" : `#${rank}`;

                                        const rowBg = rank === 1 ? "bg-amber-500/10 font-medium" :
                                                      rank === 2 ? "bg-slate-100/80 font-medium" :
                                                      rank === 3 ? "bg-orange-50 font-medium" :
                                                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                                        return (
                                            <TableRow key={agent.id} className={`${rowBg} hover:bg-slate-100/80 border-b border-slate-100 transition-colors`}>
                                                <TableCell className="text-center font-black text-xs">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-extrabold ${
                                                        rank === 1 ? "bg-amber-400 text-slate-950 shadow-sm" :
                                                        rank === 2 ? "bg-slate-300 text-slate-900" :
                                                        rank === 3 ? "bg-amber-700 text-white" : "text-slate-600"
                                                    }`}>
                                                        {rankBadge}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div>
                                                        <span className="font-bold text-xs text-slate-900 block">{agent.agent_name}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono block">📞 {agent.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-700 font-medium">
                                                    {agent.polling_unit_name}
                                                </TableCell>
                                                <TableCell className="text-center font-black text-sm text-slate-900">
                                                    {agent.total_registered.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center font-black text-sm text-emerald-600">
                                                    {agent.verified_count.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center font-black text-sm text-orange-600">
                                                    {agent.pending_count.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center py-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-black text-slate-800">
                                                            {verificationPct}%
                                                        </span>
                                                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-emerald-500 rounded-full"
                                                                style={{ width: `${Math.min(verificationPct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Ward Aggregate Footer Summary */}
                    {!isLoading && agents.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-400" />
                                <span className="font-bold text-xs uppercase tracking-wider">
                                    Ward Total ({agents.length} Agents Assigned)
                                </span>
                            </div>

                            <div className="flex items-center gap-6 text-xs font-black">
                                <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Registered Members</span>
                                    <span className="text-amber-400 text-sm">{totalWardRegistered.toLocaleString()}</span>
                                </div>
                                <div className="border-x border-slate-700 px-4">
                                    <span className="text-slate-400 block text-[9px] uppercase">Verified Members</span>
                                    <span className="text-emerald-400 text-sm">{totalWardVerified.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Pending Members</span>
                                    <span className="text-orange-400 text-sm">{totalWardPending.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
};

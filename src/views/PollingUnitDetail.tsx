"use client";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { supabase as registrySupabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    MapPin,
    Users,
    Target,
    Phone,
    User,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    History,
    Search,
    RotateCcw,
    Lock,
    Mail,
    Eye,
    EyeOff,
    Copy
} from "lucide-react";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { getChairmanByLGA } from "@/data/lga_chairmen";
import { toast } from "sonner";
import { 
    CELL_STATUS_LABELS, 
    useCreatePollingUnitCell, 
    useUpdatePollingUnitCell 
} from "@/hooks/usePollingUnitCells";
import { useCouncillor } from "@/hooks/useCouncillors";
import { localVoterService } from "@/services/LocalVoterService";
import { useAuth } from "@/contexts/AuthContext";
import { useParty } from "@/contexts/PartyContext";
import AssignAgentModal from "@/components/modals/AssignAgentModal";
import { useState } from "react";
import VoterDemographicsChart from "@/components/charts/VoterDemographicsChart";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const getPollingUnitCode = (lga: string, ward: string, name: string, fallbackCode?: string) => {
    if (fallbackCode) return fallbackCode;
    const match = ALL_POLLING_UNITS.find(u => 
        u.lga.toLowerCase() === lga.toLowerCase() && 
        u.wardName.toLowerCase() === ward.toLowerCase() && 
        u.name.toLowerCase() === name.toLowerCase()
    );
    return match?.code || "";
};

const getStandardPuCode = (lgaName: string, puCode: string): string => {
    if (!puCode) return "";
    if (puCode.startsWith("22-") || puCode.startsWith("20-")) {
        return puCode;
    }
    const match = puCode.match(/W(\d+)-(\d+)/i);
    if (!match) return puCode;
    const wardNum = match[1].padStart(2, "0");
    const puNum = match[2].padStart(3, "0");
    const norm = lgaName.toLowerCase().replace(/[^a-z]/g, "");
      const list = [
    "adavi", "ajaokuta", "ankpa", "bassa", "dekina", "ibaji", "idah",
    "igalamelaodolu", "ijumu", "kabbabunu", "kogikotonkarfe", "lokoja",
    "mopamuro", "ofu", "ogorimagongo", "okehi", "okene", "olamaboro",
    "omala", "yagbaeast", "yagbawest"
  ];
  let idx = list.indexOf(norm);
  if (idx === -1) {
    if (norm === "kogi" || norm === "kogikk") idx = list.indexOf("kogikotonkarfe");
    else if (norm === "mopamoro") idx = list.indexOf("mopamuro");
    else if (norm === "ogorimangogo") idx = list.indexOf("ogorimagongo");
  }
  const lgaCode = idx !== -1 ? (idx + 1).toString().padStart(2, "0") : "01";
  return `22-${lgaCode}-${wardNum}-${puNum}`;
};

const fetchRealVoters = async (lgaName: string, wardName: string, puCode: string): Promise<number | null> => {
    try {
        const standardCode = getStandardPuCode(lgaName, puCode);
        const { data: countData } = await registrySupabase
            .from("voter_pu_counts")
            .select("registered_count")
            .eq("polling_unit_code", standardCode)
            .maybeSingle();
        
        if (countData) {
            return countData.registered_count || 0;
        }

        const { data: wardCounts } = await registrySupabase
            .from("voter_pu_counts")
            .select("polling_unit_code, registered_count")
            .eq("ward", wardName);
        
        if (wardCounts) {
            const targetSeq = parseInt(puCode.split(/[-/]/).pop()?.replace(/\D/g, "") || "", 10);
            const match = wardCounts.find(row => {
                const seq = parseInt(row.polling_unit_code.split(/[-/]/).pop()?.replace(/\D/g, "") || "", 10);
                return seq === targetSeq;
            });
            if (match) {
                return match.registered_count || 0;
            }
        }
    } catch (e) {
        console.error("Error fetching real voters:", e);
    }
    return null;
};

const PollingUnitDetail = () => {
    const { partyId } = useParty();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const navigate = (path: string | number, options?: any) => { 
        if (path === -1) router.back(); 
        else if (options?.replace) router.replace(path as string); 
        else router.push(path as string); 
    };
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const { data: councillor } = useCouncillor();
    const { role: userRole } = useAuth();
    const isApc = partyId === "apc";
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleCopyPassword = (password: string) => {
        if (!password) return;
        navigator.clipboard.writeText(password);
        toast.success("Password copied to clipboard");
    };
    const [selectedStatus, setSelectedStatus] = useState<string>("forming");
    const [isUpdating, setIsUpdating] = useState(false);

    const [voterSearch, setVoterSearch] = useState("");
    const [voterFilter, setVoterFilter] = useState<'all' | 'members' | 'non_members'>('all');
    const [lifeStatusFilter, setLifeStatusFilter] = useState<string>('all');

    const updateCellMutation = useUpdatePollingUnitCell();
    const createCellMutation = useCreatePollingUnitCell();

    // Fetch data
    const { data: unit, isLoading, refetch: refetchUnit } = useQuery({
        queryKey: ["polling-unit-detail", id],
        queryFn: async () => {
                        if (!id) return null;

            // 1. Direct local lookup from ALL_POLLING_UNITS (offline & online instant resolution)
            const targetId = id.replace(/^(virtual-|static-)/, '');
            const legacyStaticUnit = ALL_POLLING_UNITS.find(u => {
                if (u.id === targetId || u.code === targetId || u.id === id || u.code === id) return true;
                if (u.id?.toLowerCase() === targetId.toLowerCase() || u.code?.toLowerCase() === targetId.toLowerCase()) return true;
                if (u.name.toLowerCase() === targetId.toLowerCase()) return true;
                return false;
            });

            if (legacyStaticUnit) {
                const chairmanData = getChairmanByLGA(legacyStaticUnit.lga);
                return {
                    id: legacyStaticUnit.id,
                    polling_unit_name: legacyStaticUnit.name,
                    ward: legacyStaticUnit.wardName,
                    lga: legacyStaticUnit.lga,
                    pu_code: legacyStaticUnit.code,
                    lga_chairman: chairmanData?.chairman || legacyStaticUnit.lgaChairman || null,
                    target_voters: 50,
                    reliable_voters: 0,
                    registered_voters: legacyStaticUnit.registeredVoters || 0,
                    status: 'forming',
                    type: 'static',
                    canvasser_name: null,
                    canvasser_phone: null
                };
            }

            // Handle "virtual-" prefix: polling_units without a polling_unit_cells record
            if (id.startsWith('virtual-')) {
                const realId = id.replace('virtual-', '');

                // Check if a cell now exists in polling_unit_cells for this polling unit
                const { data: dbCell, error: cellError } = await (supabase as any)
                    .from("polling_unit_cells")
                    .select(`
                      *,
                      canvasser:canvasser_id (
                        id,
                        full_name,
                        phone,
                        membership_id
                      ),
                      polling_unit:polling_unit_id (
                        code
                      )
                    `)
                    .eq("polling_unit_id", realId)
                    .maybeSingle();

                if (dbCell) {
                    // Redirect to the real database ID
                    setTimeout(() => {
                        navigate(`/polling-units/detail?id=${dbCell.id}`, { replace: true });
                    }, 0);
                    
                    const chairmanData = getChairmanByLGA(dbCell.lga || '');
                    const puCode = dbCell.polling_unit?.code || getPollingUnitCode(dbCell.lga, dbCell.ward, dbCell.polling_unit_name);
                    const realCount = await fetchRealVoters(dbCell.lga || '', dbCell.ward, puCode);

                    return {
                        ...dbCell,
                        pu_code: puCode,
                        type: 'database',
                        registered_voters: realCount ?? dbCell.registered_voters ?? 0,
                        canvasser_name: dbCell.canvasser?.full_name || dbCell.canvasser_name || null,
                        canvasser_phone: dbCell.canvasser?.phone || dbCell.canvasser_phone || null,
                        lga_chairman: dbCell.lga_chairman || chairmanData?.chairman || null,
                    };
                }

                const { data: puData, error: puError } = await supabase
                    .from("polling_units")
                    .select("*")
                    .eq("id", realId)
                    .maybeSingle();

                if (puError) console.error("Error fetching polling unit:", puError);

                if (puData) {
                    // Auto-assign LGA chairman from static data
                    const chairmanData = getChairmanByLGA(puData.lga_name);
                    const realCount = await fetchRealVoters(puData.lga_name, puData.ward_name, puData.code);

                    return {
                        id: id,
                        polling_unit_name: puData.name,
                        ward: puData.ward_name,
                        lga: puData.lga_name,
                        pu_code: puData.code,
                        target_voters: puData.target_voters || 50,
                        registered_voters: realCount ?? (puData as any).registered_voters ?? 0,
                        reliable_voters: 0,
                        status: 'forming',
                        type: 'virtual',
                        canvasser_name: null,
                        canvasser_phone: null,
                        lga_chairman: chairmanData?.chairman || null,
                    };
                }
                return null;
            }

            // Try fetching from Supabase polling_unit_cells
            const { data: dbUnit, error } = await (supabase as any)
                .from("polling_unit_cells")
                .select(`
          *,
          canvasser:canvasser_id (
            id,
            full_name,
            phone,
            membership_id
          ),
          polling_unit:polling_unit_id (
            code
          )
        `)
                .eq("id", id)
                .maybeSingle();

            if (dbUnit) {
                // Auto-assign LGA chairman from static data
                const chairmanData = getChairmanByLGA(dbUnit.lga || '');
                const puCode = dbUnit.polling_unit?.code || getPollingUnitCode(dbUnit.lga, dbUnit.ward, dbUnit.polling_unit_name);
                const realCount = await fetchRealVoters(dbUnit.lga || '', dbUnit.ward, puCode);

                return {
                    ...dbUnit,
                    pu_code: puCode,
                    type: 'database',
                    registered_voters: realCount ?? dbUnit.registered_voters ?? 0,
                    canvasser_name: dbUnit.canvasser?.full_name || dbUnit.canvasser_name || null,
                    canvasser_phone: dbUnit.canvasser?.phone || dbUnit.canvasser_phone || null,
                    lga_chairman: dbUnit.lga_chairman || chairmanData?.chairman || null,
                };
            }

            // If not in DB, look up in static data
            cleanId = id;
            let targetLga = '';
            let targetCode = '';

            if (id.startsWith('static-')) {
                const parts = id.replace('static-', '').split('-');
                if (parts.length >= 3) {
                    targetLga = parts[0];
                    targetCode = parts.slice(1).join('-');
                } else {
                    cleanId = id.replace('static-', '');
                }
            }

            const staticUnit = ALL_POLLING_UNITS.find(u => {
                if (targetLga && targetCode) {
                    return u.lga === targetLga && u.code === targetCode;
                }
                if (u.id === cleanId) return true;
                if (u.code === cleanId) return true;
                if (u.id && u.id.endsWith(cleanId)) return true;
                return false;
            });

            if (staticUnit) {
                const chairmanData = getChairmanByLGA(staticUnit.lga);
                const realCount = await fetchRealVoters(staticUnit.lga, staticUnit.wardName, staticUnit.code);

                return {
                    id: id,
                    polling_unit_name: staticUnit.name,
                    ward: staticUnit.wardName,
                    lga: staticUnit.lga,
                    pu_code: staticUnit.code,
                    lga_chairman: chairmanData?.chairman || staticUnit.lgaChairman || null,
                    target_voters: 50,
                    reliable_voters: 0,
                    registered_voters: realCount ?? staticUnit.registeredVoters ?? 0,
                    status: 'forming',
                    type: 'static',
                    canvasser_name: null,
                    canvasser_phone: null
                };
            } else {
                console.warn("Static unit not found for:", cleanId);
            }

            return null;
        }
    });

    // Fetch members registered under this polling unit
    const { data: members, isLoading: membersLoading } = useQuery({
        queryKey: ["polling-unit-members", unit?.lga, unit?.ward, unit?.polling_unit_name],
        queryFn: async () => {
            if (!unit?.lga || !unit?.polling_unit_name) return [];

            const { data, error } = await supabase
                .from("members")
                .select("id, full_name, phone, gender, membership_id, status, polling_unit, ward, lga, created_at, occupation, whatsapp_number, voters_card_id")
                .eq("lga", unit.lga)
                .eq("ward", unit.ward)
                .eq("polling_unit", unit.polling_unit_name)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching members:", error);
                return [];
            }
            return data || [];
        },
        enabled: !!unit?.lga && !!unit?.polling_unit_name,
    });

    // Fetch all voters in this unit from voter_registry
    const { data: registryVoters, isLoading: registryLoading, refetch: refetchRegistryVoters } = useQuery({
        queryKey: ["polling-unit-registry-voters", unit?.lga, unit?.pu_code],
        queryFn: async () => {
            if (!unit?.pu_code || !unit?.lga) return [];
            // 1. Try local INEC dataset first
            const wardName = unit.ward || unit.ward_name || "";
            const localVoters = await localVoterService.getPollingUnitVoters(unit.lga, wardName, unit.pu_code);
            if (localVoters && localVoters.length > 0) {
                return localVoters.map(v => ({
                    id: v.vin,
                    vin: v.vin,
                    full_name: v.full_name,
                    dob_year: v.dob_year,
                    gender: v.gender,
                    polling_unit_code: v.polling_unit_code,
                    polling_unit_name: v.polling_unit_name,
                    voter_status: "collected",
                    photo_url: null,
                }));
            }

            const standardCode = getStandardPuCode(unit.lga, unit.pu_code);
            
            let allVoters: any[] = [];
            let page = 0;
            const PAGE_SIZE = 1000;
            let hasMore = true;
            
            while (hasMore) {
                const { data, error } = await supabase
                    .from("voter_registry")
                    .select("id, vin, full_name, dob_year, gender, polling_unit_code, polling_unit_name, voter_status, photo_url")
                    .eq("polling_unit_code", standardCode)
                    .order("full_name", { ascending: true })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                    
                if (error) {
                    console.error("Error fetching registry voters:", error);
                    return allVoters.length > 0 ? allVoters : [];
                }
                
                allVoters = allVoters.concat(data || []);
                hasMore = (data?.length || 0) === PAGE_SIZE;
                page++;
            }
            
            return allVoters;
        },
        enabled: !!unit?.pu_code,
    });

    // Fetch leadership data
    const { data: leadership, refetch: refetchLeadership } = useQuery({
        queryKey: ["polling-unit-leadership", unit?.lga, unit?.ward, unit?.polling_unit_name, id],
        queryFn: async () => {
            if (!unit?.lga || !id) return null;

            // Extract real ID if it has virtual- prefix
            const realId = id.startsWith('virtual-') ? id.replace('virtual-', '') : id;

            const { data, error } = await supabase
                .from("political_excos")
                .select("*")
                .or(`lga.eq.${unit.lga},lga.is.null`)
                .eq("is_active", true);

            if (error) {
                console.error("Error fetching leadership:", error);
                return null;
            }

            const lgaChairman = data?.find(e => e.level === 'lga' && e.position === 'lga_chairman' && e.lga === unit.lga);
            const wardChairman = data?.find(e => e.level === 'ward' && e.position === 'ward_chairman' && e.lga === unit.lga && e.ward === unit.ward);

            // Fetch Ward Councillor from councillors table
            const { data: councillorData, error: councillorError } = await (supabase as any)
                .from("councillors")
                .select("councillor_name, phone")
                .eq("lga", unit.lga)
                .eq("ward", unit.ward)
                .eq("is_active", true)
                .maybeSingle();

            if (councillorError) {
                console.error("Error fetching ward councillor:", councillorError);
            }

            console.log("Councillor data for", unit.ward, ":", councillorData);

            const wardCouncilor = councillorData ? {
                name: councillorData.councillor_name,
                phone: councillorData.phone
            } : null;

            // Fetch polling unit agent from polling_unit_agents table using real ID
            const { data: agentData, error: agentError } = await (supabase as any)
                .from("polling_unit_agents")
                .select("id, user_id, agent_name, phone, email, password")
                .eq("polling_unit_id", realId)
                .maybeSingle();

            if (agentError) {
                console.error("Error fetching polling unit agent:", agentError);
            }

            let puAgent = agentData ? {
                id: agentData.id,
                name: agentData.agent_name || 'Unknown',
                phone: agentData.phone || '',
                email: agentData.email || '',
                password: agentData.password || '',
                user_id: agentData.user_id
            } : null;

            if (!puAgent && typeof window !== "undefined") {
                try {
                    const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
                    const found =
                        assignedLocal[id] ||
                        assignedLocal[realId] ||
                        assignedLocal[unit?.pu_code] ||
                        assignedLocal[unit?.polling_unit_name?.toLowerCase()?.trim()];
                    if (found) {
                        puAgent = {
                            id: found.id || realId,
                            name: found.agent_name,
                            phone: found.phone || '',
                            email: found.email || '',
                            password: found.password || '',
                            user_id: found.user_id || null
                        };
                    }
                } catch (e) {}
            }

            return {
                lgaChairman,
                wardChairman,
                wardCouncilor,
                puAgent
            };
        },
        enabled: !!unit?.lga && !!id,
    });

    if (isLoading) {
        return (
            <DashboardLayout title="Loading..." subtitle="Fetching polling unit details">
                <div className="flex items-center justify-center h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!unit) {
        return (
            <DashboardLayout title="Not Found" subtitle="Polling Unit not found">
                <Card className="max-w-md mx-auto mt-12 text-center p-6">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Polling Unit Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The requested polling unit could not be found in our records.
                    </p>
                    <Button onClick={() => navigate("/polling-units")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to List
                    </Button>
                </Card>
            </DashboardLayout>
        );
    }

    const statusConfig = CELL_STATUS_LABELS[unit.status as keyof typeof CELL_STATUS_LABELS] || CELL_STATUS_LABELS.forming;
    const memberCount = members?.length || 0;
    const targetVoters = unit.target_voters || 50;
    const memberProgress = Math.min(Math.round((memberCount / targetVoters) * 100), 100);
    const progressColor = memberProgress >= 100 ? 'text-green-600' : memberProgress >= 50 ? 'text-yellow-600' : 'text-red-500';
    const handleUpdateStatus = async () => {
        if (!unit) return;
        setIsUpdating(true);
        try {
            if (unit.type === 'database') {
                await updateCellMutation.mutateAsync({
                    id: unit.id,
                    status: selectedStatus,
                });
                toast.success("Status updated successfully!");
            } else {
                // For virtual or static units, create the cell first
                const realPuId = id?.startsWith('virtual-') ? id.replace('virtual-', '') : null;
                await createCellMutation.mutateAsync({
                    polling_unit_id: realPuId,
                    polling_unit_name: unit.polling_unit_name,
                    ward: unit.ward,
                    lga: unit.lga,
                    status: selectedStatus,
                    target_voters: 50,
                    registered_voters: unit.registered_voters || 0,
                    reliable_voters: 0,
                });
                toast.success("Cell created and status updated!");
            }
            setIsStatusModalOpen(false);
            refetchUnit();
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    // Voter registry status metrics
    const totalVoters = registryVoters?.length || unit.registered_voters || 0;
    const deceasedCount = registryVoters?.filter(v => v.voter_status === 'deceased').length || 0;
    const leftoverCount = registryVoters?.filter(v => v.voter_status === 'leftover').length || 0;
    const expectedActiveVoters = Math.max(0, totalVoters - deceasedCount - leftoverCount);
    
    // Campaign members (guaranteed)
    const guaranteedMembers = memberCount;
    
    // Coverage percentage
    const coveragePercentage = expectedActiveVoters > 0 
        ? Math.min(Math.round((guaranteedMembers / expectedActiveVoters) * 100), 100) 
        : 0;

    // Merge members list with voter registry
    const mergedVoters = (() => {
        const matchedMemberIds = new Set<string>();
        const list: any[] = [];
        
        // 1. Process all registry voters
        registryVoters?.forEach(rv => {
            // Find matching member by VIN (case-insensitive, trim space)
            const matchingMember = members?.find(m => 
                m.voters_card_id && rv.vin && 
                m.voters_card_id.trim().toUpperCase() === rv.vin.trim().toUpperCase()
            );
            
            if (matchingMember) {
                matchedMemberIds.add(matchingMember.id);
            }
            
            list.push({
                id: rv.id,
                vin: rv.vin || '',
                full_name: rv.full_name || '',
                dob_year: rv.dob_year,
                gender: rv.gender,
                voter_status: (rv.voter_status || 'alive') as 'alive' | 'deceased' | 'leftover',
                is_member: !!matchingMember,
                member_details: matchingMember,
                is_only_in_member_list: false
            });
        });
        
        // 2. Add members that were not matched to any registry voter
        members?.forEach(m => {
            if (!matchedMemberIds.has(m.id)) {
                list.push({
                    id: m.id,
                    vin: m.voters_card_id || '',
                    full_name: m.full_name || '',
                    gender: m.gender,
                    voter_status: 'alive', // default to alive since members are active
                    is_member: true,
                    member_details: m,
                    is_only_in_member_list: true
                });
            }
        });
        
        return list;
    })();

    const handleUpdateVoterStatus = async (voterId: string, isOnlyInMemberList: boolean, newStatus: 'alive' | 'deceased' | 'leftover') => {
        if (isOnlyInMemberList) {
            toast.error("This member is not matched with the official voter registry. Please match them to update life status.");
            return;
        }
        
        try {
            const { error } = await supabase
                .from("voter_registry")
                .update({ voter_status: newStatus })
                .eq("id", voterId);
                
            if (error) throw error;
            
            toast.success(`Voter status updated to ${newStatus}`);
            refetchRegistryVoters();
            queryClient.invalidateQueries({ queryKey: ["demographics"] });
            queryClient.invalidateQueries({ queryKey: ["super-admin"] });
        } catch (e) {
            console.error("Error updating voter status:", e);
            toast.error("Failed to update voter status");
        }
    };

    const filteredRegistryVoters = mergedVoters.filter(voter => {
        // Search filter
        if (voterSearch.trim()) {
            const query = voterSearch.toLowerCase().trim();
            const matchesName = voter.full_name?.toLowerCase().includes(query);
            const matchesVin = voter.vin?.toLowerCase().includes(query);
            if (!matchesName && !matchesVin) return false;
        }
        
        // Campaign membership filter
        if (voterFilter === 'members' && !voter.is_member) return false;
        if (voterFilter === 'non_members' && voter.is_member) return false;
        
        // Life status filter
        if (lifeStatusFilter !== 'all' && voter.voter_status !== lifeStatusFilter) return false;
        
        return true;
    });

    return (
        <DashboardLayout
            title="Polling Unit Details"
            subtitle={unit.polling_unit_name}
        >
            <div className="space-y-6">
                <Button variant="ghost" className="pl-0" onClick={() => navigate("/polling-units")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Polling Units
                </Button>

                {/* Header Card */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl">{unit.polling_unit_name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2 text-base">
                                    <MapPin className="w-4 h-4" />
                                    {unit.ward}, {unit.lga} • {unit.pu_code}
                                </CardDescription>
                            </div>
                            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-sm px-3 py-1 capitalize`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">Target Voters</div>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-muted-foreground" />
                                    {targetVoters}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">INEC Reg. Voters</div>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-gray-500" />
                                    {totalVoters.toLocaleString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">Deceased / Leftover</div>
                                <div className="text-2xl font-bold flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-5 h-5" />
                                    {deceasedCount + leftoverCount}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">Expected Active</div>
                                <div className="text-2xl font-bold flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {expectedActiveVoters.toLocaleString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">Campaign Coverage</div>
                                <div className={`text-2xl font-bold flex items-center gap-2 ${coveragePercentage >= 80 ? 'text-green-600' : coveragePercentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    <TrendingUp className="w-5 h-5" />
                                    {coveragePercentage}%
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">Campaign Coverage of Expected Active Voters ({guaranteedMembers} / {expectedActiveVoters})</span>
                                <span className={`font-semibold ${coveragePercentage >= 80 ? 'text-green-600' : coveragePercentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{coveragePercentage}%</span>
                            </div>
                            <Progress value={coveragePercentage} className="h-3" />
                        </div>
                    </CardContent>
                </Card>

                {/* Details Tabs */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="leadership">Leadership & Agents</TabsTrigger>
                        <TabsTrigger value="members">Voters & Members</TabsTrigger>
                        <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Canvasser Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Polling Unit Agent
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(leadership?.puAgent || unit.canvasser_name) ? (
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="flex-1 space-y-1.5 min-w-0">
                                                    <h4 className="font-semibold text-lg truncate">
                                                        {leadership?.puAgent?.name || unit.canvasser_name || `${unit.name || "Polling Unit"} Agent`}
                                                    </h4>
                                                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mt-1">
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-4 h-4 text-slate-400" />
                                                            <span>{leadership?.puAgent?.phone || unit.canvasser_phone || "No phone number"}</span>
                                                        </div>
                                                        {leadership?.puAgent?.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-4 h-4 text-slate-400" />
                                                                <span className="truncate">{leadership.puAgent.email}</span>
                                                            </div>
                                                        )}
                                                        {leadership?.puAgent?.password && (
                                                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-2.5 rounded-lg border border-slate-100 w-fit mt-1">
                                                                <Lock className="w-4 h-4 text-slate-400" />
                                                                <span className="font-mono text-xs font-semibold text-slate-700">
                                                                    {showPassword ? leadership.puAgent.password : "••••••••"}
                                                                </span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-5 w-5 ml-2 text-slate-400 hover:text-slate-600"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                >
                                                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-5 w-5 text-slate-400 hover:text-slate-600"
                                                                    onClick={() => handleCopyPassword(leadership.puAgent.password)}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                                        {councillor && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs ml-auto cursor-pointer font-semibold"
                                                                onClick={() => setIsAssignModalOpen(true)}
                                                            >
                                                                Change Agent
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-muted/30 rounded-lg">
                                            <AlertCircle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                                            <p className="font-medium">No Polling Unit Agent Assigned</p>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Assign a polling unit agent to start mobilizing voters in this unit.
                                            </p>
                                            {councillor && (
                                                <Button 
                                                    size="sm"
                                                    onClick={() => setIsAssignModalOpen(true)}
                                                >
                                                    Assign Polling Unit Agent
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Status & Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        Cell Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Current Status</span>
                                            <Badge variant="outline">{statusConfig.label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {unit.status === 'forming' && "This cell is in the initial formation stage. Assign a polling unit agent to begin."}
                                            {unit.status === 'mobilizing' && "Polling unit agent is actively registering members."}
                                            {unit.status === 'ready' && "Cell has reached sufficient capacity."}
                                            {unit.status === 'active' && "Fully operational cell."}
                                        </p>
                                    </div>

                                     <div className="grid grid-cols-2 gap-3">
                                         <Button 
                                             variant="outline" 
                                             className="w-full"
                                             onClick={() => {
                                                 setSelectedStatus(unit.status || "forming");
                                                 setIsStatusModalOpen(true);
                                             }}
                                         >
                                             Update Status
                                         </Button>
                                         <Button 
                                             variant="outline" 
                                             className="w-full"
                                             onClick={() => navigate("/polling-units-reports")}
                                         >
                                             View Reports
                                         </Button>
                                     </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Voter Life Status & Trends */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Voter Life Status & Mobilization Trends
                                </CardTitle>
                                <CardDescription>
                                    Detailed breakdown of the polling unit's voter base to calculate expected election day voters vs campaign targets.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Visual charts */}
                                    <div className="space-y-6">
                                        {/* Status distribution */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3">Voter Registry Status Breakdown</h4>
                                            <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex text-xs text-white font-medium">
                                                {expectedActiveVoters > 0 && (
                                                    <div 
                                                        style={{ width: `${(expectedActiveVoters / totalVoters) * 100}%` }} 
                                                        className="bg-green-600 flex items-center justify-center transition-all"
                                                        title={`Expected Active: ${expectedActiveVoters}`}
                                                    >
                                                        {Math.round((expectedActiveVoters / totalVoters) * 100)}%
                                                    </div>
                                                )}
                                                {deceasedCount > 0 && (
                                                    <div 
                                                        style={{ width: `${(deceasedCount / totalVoters) * 100}%` }} 
                                                        className="bg-red-500 flex items-center justify-center transition-all"
                                                        title={`Deceased: ${deceasedCount}`}
                                                    >
                                                        {Math.round((deceasedCount / totalVoters) * 100)}%
                                                    </div>
                                                )}
                                                {leftoverCount > 0 && (
                                                    <div 
                                                        style={{ width: `${(leftoverCount / totalVoters) * 100}%` }} 
                                                        className="bg-yellow-500 flex items-center justify-center transition-all text-black"
                                                        title={`Leftover/Unknown: ${leftoverCount}`}
                                                    >
                                                        {Math.round((leftoverCount / totalVoters) * 100)}%
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-3 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 bg-green-600 rounded-sm inline-block"></span>
                                                    <span>Alive / Expected Active ({expectedActiveVoters})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 bg-red-500 rounded-sm inline-block"></span>
                                                    <span>Deceased ({deceasedCount})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 bg-yellow-500 rounded-sm inline-block"></span>
                                                    <span>Leftover / Unknown ({leftoverCount})</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobilization distribution */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3">Campaign Membership Breakdown (Expected Active Voters)</h4>
                                            <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex text-xs text-white font-medium">
                                                {expectedActiveVoters > 0 && (
                                                    <>
                                                        <div 
                                                            style={{ width: `${Math.min(100, (guaranteedMembers / expectedActiveVoters) * 100)}%` }} 
                                                            className="bg-blue-600 flex items-center justify-center transition-all"
                                                            title={`Campaign Members: ${guaranteedMembers}`}
                                                        >
                                                            {Math.min(100, Math.round((guaranteedMembers / expectedActiveVoters) * 100))}%
                                                        </div>
                                                        <div 
                                                            style={{ width: `${Math.max(0, 100 - (guaranteedMembers / expectedActiveVoters) * 100)}%` }} 
                                                            className="bg-slate-300 flex items-center justify-center transition-all text-slate-700"
                                                            title={`Unmobilized: ${Math.max(0, expectedActiveVoters - guaranteedMembers)}`}
                                                        >
                                                            {Math.max(0, 100 - Math.round((guaranteedMembers / expectedActiveVoters) * 100))}%
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-3 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block"></span>
                                                    <span>Registered Campaign Members ({guaranteedMembers})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 bg-slate-300 rounded-sm inline-block"></span>
                                                    <span>Remaining Target Voters ({Math.max(0, expectedActiveVoters - guaranteedMembers)})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table of detailed numbers */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold">Detailed Voter Registry Statistics</h4>
                                        <div className="border rounded-lg overflow-hidden text-sm bg-white">
                                            <div className="grid grid-cols-2 border-b p-3 hover:bg-slate-50 transition-colors">
                                                <span className="text-muted-foreground">INEC Registered Voters</span>
                                                <span className="font-bold text-right">{totalVoters.toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 border-b p-3 hover:bg-slate-50 transition-colors">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                                                    Confirmed Deceased (-)
                                                </span>
                                                <span className="font-semibold text-red-500 text-right">{deceasedCount.toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 border-b p-3 hover:bg-slate-50 transition-colors">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                                                    Leftover / Unknown Location (-)
                                                </span>
                                                <span className="font-semibold text-yellow-600 text-right">{leftoverCount.toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 border-b p-3 bg-green-50/50 hover:bg-green-50 transition-colors">
                                                <span className="font-medium text-green-800">Expected Election Day Active</span>
                                                <span className="font-bold text-green-700 text-right">{expectedActiveVoters.toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 border-b p-3 bg-blue-50/50 hover:bg-blue-50 transition-colors">
                                                <span className="font-medium text-blue-800">Campaign Members (Guaranteed)</span>
                                                <span className="font-bold text-blue-700 text-right">{guaranteedMembers.toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 p-3 hover:bg-slate-50 transition-colors">
                                                <span className="text-muted-foreground">Unmobilized Target Voters</span>
                                                <span className="font-semibold text-right">{(Math.max(0, expectedActiveVoters - guaranteedMembers)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Demographics Charts */}
                        <VoterDemographicsChart
                            voters={registryVoters || []}
                            isLoading={registryLoading}
                        />
                    </TabsContent>

                    <TabsContent value="leadership" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* LGA Chairman */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold">LGA Chairman</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {unit.lga_chairman ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                {isApc ? unit.lga_chairman.charAt(0) : "L"}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {isApc ? unit.lga_chairman : `${unit.lga || "Kogi"} LGA Chairman`}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{unit.lga} LGA</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Not assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Ward Chairman */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold">Ward Chairman</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {leadership?.wardChairman ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                                {isApc ? leadership.wardChairman.name.charAt(0) : "W"}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {isApc ? leadership.wardChairman.name : `${unit.ward_name || "Ward"} Chairman`}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {isApc ? leadership.wardChairman.phone : "Active in ward"}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Not assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Ward Councilor */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold">Ward Councilor</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {leadership?.wardCouncilor ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                                                {isApc ? leadership.wardCouncilor.name.charAt(0) : "C"}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {isApc ? leadership.wardCouncilor.name : `${unit.ward_name || "Ward"} Councillor`}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {isApc ? leadership.wardCouncilor.phone : "Active in ward"}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Not assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Polling Unit Agent */}
                            <Card className="bg-slate-50 border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold">Polling Unit Agent</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {leadership?.puAgent ? (
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold flex-shrink-0">
                                                    {(leadership.puAgent.name || "Agent").charAt(0)}
                                                </div>
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <p className="font-semibold text-slate-800 truncate">
                                                        {leadership.puAgent.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        {leadership.puAgent.phone || "No phone number"}
                                                    </p>
                                                    {leadership.puAgent.email && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                            {leadership.puAgent.email}
                                                        </p>
                                                    )}
                                                    {leadership.puAgent.password && (
                                                        <div className="flex items-center gap-1.5 bg-white p-1 px-2 rounded border border-slate-100 w-fit mt-1">
                                                            <Lock className="w-3 h-3 text-slate-400" />
                                                            <span className="font-mono text-xs text-slate-700">
                                                                {showPassword ? leadership.puAgent.password : "••••••••"}
                                                            </span>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-4 w-4 ml-1 text-slate-400 hover:text-slate-600"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-4 w-4 text-slate-400 hover:text-slate-600"
                                                                onClick={() => handleCopyPassword(leadership.puAgent.password)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {councillor && (
                                                <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs cursor-pointer font-semibold"
                                                        onClick={() => setIsAssignModalOpen(true)}
                                                    >
                                                        Change Agent
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-2">
                                            <p className="text-sm text-muted-foreground italic mb-2">Not assigned</p>
                                            {councillor && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => setIsAssignModalOpen(true)}
                                                >
                                                    Assign Agent
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="members">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        Voters & Campaign Members
                                        {filteredRegistryVoters && (
                                            <Badge variant="secondary" className="ml-2">{filteredRegistryVoters.length}</Badge>
                                        )}
                                    </div>
                                </CardTitle>
                                <CardDescription>All registered voters in this polling unit merged with campaign membership details.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-4 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name or Voter ID (VIN)..."
                                            value={voterSearch}
                                            onChange={(e) => setVoterSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={voterFilter} onValueChange={(v: any) => setVoterFilter(v)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Campaign Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Voters</SelectItem>
                                                <SelectItem value="members">Campaign Members</SelectItem>
                                                <SelectItem value="non_members">Non-Members</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={lifeStatusFilter} onValueChange={setLifeStatusFilter}>
                                            <SelectTrigger className="w-[150px]">
                                                <SelectValue placeholder="Life Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="alive">Alive</SelectItem>
                                                <SelectItem value="deceased">Deceased</SelectItem>
                                                <SelectItem value="leftover">Leftover / Unknown</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {registryLoading || membersLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : filteredRegistryVoters && filteredRegistryVoters.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="text-left py-3 px-4 font-medium">#</th>
                                                    <th className="text-left py-3 px-4 font-medium">Full Name</th>
                                                    <th className="text-left py-3 px-4 font-medium">VIN (Voter ID)</th>
                                                    <th className="text-left py-3 px-4 font-medium">Campaign Status</th>
                                                    <th className="text-left py-3 px-4 font-medium">Life Status</th>
                                                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRegistryVoters.map((voter, index) => {
                                                    const isMember = voter.is_member;
                                                    const statusColors = {
                                                        alive: 'bg-green-50 text-green-700 border-green-200',
                                                        deceased: 'bg-red-50 text-red-700 border-red-200',
                                                        leftover: 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    };
                                                    return (
                                                        <tr key={voter.id} className="border-b hover:bg-muted/10 transition-colors">
                                                            <td className="py-3 px-4 text-muted-foreground text-xs">{index + 1}</td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs ${isMember ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                        {voter.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                                    </div>
                                                                    <div>
                                                                        <p 
                                                                            className={`font-medium capitalize ${isMember ? 'text-blue-700 hover:underline cursor-pointer' : 'text-slate-800'}`}
                                                                            onClick={() => isMember && navigate(`/members/detail?id=${voter.member_details.id}`)}
                                                                        >
                                                                            {voter.full_name}
                                                                        </p>
                                                                        {voter.dob_year && (
                                                                            <p className="text-xs text-muted-foreground">Born: {voter.dob_year} (Approx. {new Date().getFullYear() - voter.dob_year} years old)</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{voter.vin || '—'}</td>
                                                            <td className="py-3 px-4">
                                                                {isMember ? (
                                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-xs font-medium">
                                                                        Campaign Member
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-slate-500 border-slate-300 text-xs font-normal">
                                                                        Non-Member
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColors[voter.voter_status as keyof typeof statusColors] || ''}`}>
                                                                    {voter.voter_status === 'leftover' ? 'Leftover / Unknown' : voter.voter_status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Select 
                                                                        value={voter.voter_status} 
                                                                        onValueChange={(val: any) => handleUpdateVoterStatus(voter.id, voter.is_only_in_member_list, val)}
                                                                    >
                                                                        <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
                                                                            <SelectValue placeholder="Set Status" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="alive">Alive</SelectItem>
                                                                            <SelectItem value="deceased">Deceased</SelectItem>
                                                                            <SelectItem value="leftover">Leftover / Unknown</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    
                                                                    {voter.voter_status !== 'alive' && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 px-2 text-xs flex items-center gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                                                            title="Restore to Alive"
                                                                            onClick={() => handleUpdateVoterStatus(voter.id, voter.is_only_in_member_list, 'alive')}
                                                                        >
                                                                            <RotateCcw className="w-3 h-3" />
                                                                            Restore
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center">
                                            <Users className="w-12 h-12 mb-2 opacity-20" />
                                            <p>No voters or members found matching filters.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity">
                        <Card>
                            <CardHeader>
                                <CardTitle role="heading" aria-level={3}>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-muted-foreground">
                                    <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No recent activity recorded.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {councillor && unit && (
                    <AssignAgentModal
                        isOpen={isAssignModalOpen}
                        onClose={() => setIsAssignModalOpen(false)}
                        onSuccess={() => {
                            refetchLeadership();
                            refetchUnit();
                        }}
                        councillorId={councillor.id}
                        pollingUnit={{
                            id: unit.polling_unit_id || id || "",
                            name: unit.polling_unit_name,
                            ward: unit.ward,
                            lga: unit.lga,
                        }}
                    />
                )}

                {/* Status Update Modal */}
                <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Update Cell Status</DialogTitle>
                            <DialogDescription>
                                Update the current stage of this polling unit mobilization cell.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CELL_STATUS_LABELS).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                                {isUpdating ? "Updating..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default PollingUnitDetail;

"use client";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Search,
  MapPin,
  Save,
  Loader2,
  AlertTriangle,
  PenTool,
  Check,
  X,
  FileEdit,
  Activity
} from "lucide-react";
import { KATSINA_LGAS, ALL_WARDS } from "@/data/aggregated_lga_data";
import { useTargetManagement, useUpdateTargetVoters, useBulkUpdateTargets, TargetPollingUnit } from "@/hooks/useTargetManagement";

// Inner component for an individual row to handle its own edit state without triggering massive re-renders
const TargetRow = ({ unit, onSave }: { unit: TargetPollingUnit, onSave: (id: string, name: string, target: number) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [targetValue, setTargetValue] = useState(unit.target_voters.toString());

  const handleSave = () => {
    const val = parseInt(targetValue, 10);
    if (!isNaN(val) && val >= 0) {
      onSave(unit.id, unit.name, val);
      setIsEditing(false);
    } else {
      setTargetValue(unit.target_voters.toString());
      setIsEditing(false);
    }
  };

  return (
    <tr className="hover:bg-muted/50 border-b transition-colors group">
      <td className="p-3 text-sm font-medium">{unit.name}</td>
      <td className="p-3 text-sm text-muted-foreground font-mono">{unit.code}</td>
      <td className="p-3 text-sm">{unit.lga_name} / {unit.ward_name}</td>
      <td className="p-3 text-sm text-center">{unit.registered_voters.toLocaleString()}</td>
      <td className="p-3 text-sm text-center">
        {isEditing ? (
          <div className="flex items-center justify-center gap-2">
            <Input
              type="number"
              min="0"
              className="w-20 h-8 text-center"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={handleSave}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => { setIsEditing(false); setTargetValue(unit.target_voters.toString()); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-[hsl(var(--apc-green))]">{unit.target_voters.toLocaleString()}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditing(true)}>
              <PenTool className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
};

const TargetManagement = () => {
  const [filters, setFilters] = useState({
    lga: "all",
    ward: "all",
    search: "",
  });

  const [bulkAction, setBulkAction] = useState({
    type: "fixed", // 'fixed' or 'percent'
    value: "50"
  });

  const { data: units, isLoading } = useTargetManagement({
    lga: filters.lga,
    ward: filters.ward
  });

  const updateTargetMutation = useUpdateTargetVoters();
  const bulkUpdateMutation = useBulkUpdateTargets();

  const handleUpdateSingle = (id: string, name: string, target: number) => {
    updateTargetMutation.mutate({ id, puName: name, target });
  };

  const filteredUnits = useMemo(() => {
    if (!units) return [];
    let filtered = units;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.code.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [units, filters.search]);

  // Pagination for the UI to prevent massive DOM lag
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  
  const paginatedUnits = useMemo(() => {
    return filteredUnits.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredUnits, page]);

  const handleBulkUpdate = () => {
    if (!units || filteredUnits.length === 0) return;
    
    // We only apply bulk update to the actively FILTERED units to avoid accidental complete overrides
    const updates = filteredUnits.map(u => {
      let newTarget = u.target_voters;
      const numVal = parseFloat(bulkAction.value);
      if (!isNaN(numVal) && numVal >= 0) {
        if (bulkAction.type === 'fixed') {
          newTarget = Math.round(numVal);
        } else if (bulkAction.type === 'percent') {
          newTarget = Math.round(u.registered_voters * (numVal / 100));
        }
      }
      return { id: u.id, puName: u.name, target: newTarget };
    });

    bulkUpdateMutation.mutate(updates);
  };

  const currentWards = filters.lga === 'all' 
    ? ALL_WARDS 
    : ALL_WARDS.filter(w => w.lga === filters.lga);

  return (
    <DashboardLayout
      title="Target Management"
      subtitle="Super Admin command center for setting mobilization targets across all Polling Units"
    >
      <div className="space-y-6">
        
        {/* KPI Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-white/60 w-5 h-5" />
                <p className="text-sm text-white/80 font-medium">Filtered Units</p>
              </div>
              <div className="text-3xl font-bold">{filteredUnits.length.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="text-muted-foreground w-5 h-5" />
                <p className="text-sm text-muted-foreground font-medium">Global INEC Voters</p>
              </div>
              <div className="text-3xl font-bold">
                {filteredUnits.reduce((acc, u) => acc + u.registered_voters, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-[hsl(var(--apc-green))] w-5 h-5" />
                <p className="text-sm text-muted-foreground font-medium">Current Goal</p>
              </div>
              <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">
                {filteredUnits.reduce((acc, u) => acc + u.target_voters, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-primary" />
                  Filter & Search
                </CardTitle>
                <CardDescription>Narrow down units before viewing or updating targets</CardDescription>
              </div>
              
              {/* Bulk Edit Toolkit */}
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                <span className="text-xs font-semibold uppercase text-muted-foreground ml-2 mr-1">Bulk Action:</span>
                <Select value={bulkAction.type} onValueChange={(t) => setBulkAction(prev => ({...prev, type: t}))}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Target</SelectItem>
                    <SelectItem value="percent">% of INEC</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number"
                  min="0"
                  className="w-20 h-8 text-xs bg-white"
                  value={bulkAction.value}
                  onChange={(e) => setBulkAction(prev => ({...prev, value: e.target.value}))}
                  placeholder={bulkAction.type === 'percent' ? "e.g., 10" : "e.g., 50"}
                />
                <Button 
                  size="sm" 
                  className="h-8 text-xs font-semibold bg-[hsl(var(--apc-green))] hover:bg-[hsl(var(--apc-green))]/90"
                  disabled={bulkUpdateMutation.isPending || filteredUnits.length === 0}
                  onClick={handleBulkUpdate}
                >
                  {bulkUpdateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Apply to {filteredUnits.length}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search polling unit name or code..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select 
                value={filters.lga} 
                onValueChange={(v) => {
                  setFilters({ ...filters, lga: v, ward: "all" });
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All LGAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {KATSINA_LGAS.map((lga) => (
                    <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={filters.ward} 
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, ward: v }));
                  setPage(1);
                }}
                disabled={filters.lga === 'all'}
              >
                <SelectTrigger className="w-[200px]">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Wards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {currentWards.map((w) => (
                    <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-sm">
          <div className="overflow-x-auto min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Loading Polling Units...</p>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mb-4 text-amber-500" />
                <p>No Polling Units found matching criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="p-4 font-semibold text-sm text-foreground">Polling Unit Name</th>
                    <th className="p-4 font-semibold text-sm text-foreground">PU Code</th>
                    <th className="p-4 font-semibold text-sm text-foreground">LGA / Ward</th>
                    <th className="p-4 font-semibold text-sm text-center text-foreground">INEC Voters</th>
                    <th className="p-4 font-semibold text-sm text-center text-foreground">Target Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((u) => (
                    <TargetRow 
                      key={u.id}
                      unit={u}
                      onSave={handleUpdateSingle}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!isLoading && filteredUnits.length > 0 && (
            <div className="p-4 border-t flex items-center justify-between bg-muted/10">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * itemsPerPage, filteredUnits.length)}</span> of <span className="font-medium text-foreground">{filteredUnits.length}</span> units
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-4">
                  Page {page} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TargetManagement;

"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  MapPin,
  Award,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/loose-client";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";

interface WardTarget {
  ward_name: string;
  lga_name: string;
  total_polling_units: number;
  total_target_voters: number;
  total_registered_members: number;
  total_verified_members: number;
  ward_coverage_percentage: number;
  ward_status: string;
}

interface WardTargetsProps {
  lgaFilter?: string;
}

export const WardTargets = ({ lgaFilter }: WardTargetsProps) => {
  const [wards, setWards] = useState<WardTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWardTargets();
  }, [lgaFilter]);

  const fetchWardTargets = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch ALL dynamic data from Supabase
      const { data: dbCells, error } = await (supabase as any)
        .from("polling_unit_cells")
        .select("status, target_voters, registered_voters, reliable_voters, lga, ward, polling_unit_name");

      if (error) throw error;

      // 2. Create Map of DB cells for quick lookup
      const dbCellMap = new Map();
      dbCells?.forEach(cell => {
        const key = `${cell.lga}-${cell.ward}-${cell.polling_unit_name}`.toLowerCase();
        dbCellMap.set(key, cell);
      });

      // 3. Aggregate data by Ward
      const wardMap = new Map<string, WardTarget>();

      ALL_POLLING_UNITS.forEach(staticUnit => {
        // Apply LGA Filter if set
        if (lgaFilter && staticUnit.lga !== lgaFilter) return;

        const wardKey = `${staticUnit.lga}-${staticUnit.wardName}`;

        // Get/Init Ward Stats
        let wardStat = wardMap.get(wardKey);
        if (!wardStat) {
          wardStat = {
            ward_name: staticUnit.wardName,
            lga_name: staticUnit.lga,
            total_polling_units: 0,
            total_target_voters: 0,
            total_registered_members: 0,
            total_verified_members: 0,
            ward_coverage_percentage: 0,
            ward_status: 'red' // Default based on coverage
          };
          wardMap.set(wardKey, wardStat);
        }

        // Merge Logic
        wardStat.total_polling_units++;

        const key = `${staticUnit.lga}-${staticUnit.wardName}-${staticUnit.name}`.toLowerCase();
        const dbCell = dbCellMap.get(key);

        if (dbCell) {
          wardStat.total_target_voters += (dbCell.target_voters || 50);
          wardStat.total_registered_members += (dbCell.registered_voters || 0);
          wardStat.total_verified_members += (dbCell.reliable_voters || 0); // Using reliable as verified for now
        } else {
          wardStat.total_target_voters += 50; // Default target
        }
      });

      // 4. Calculate Final Percentages and Convert to Array
      const processedWards = Array.from(wardMap.values()).map(w => {
        const coverage = w.total_target_voters > 0
          ? Math.round((w.total_verified_members / w.total_target_voters) * 100)
          : 0;

        return {
          ...w,
          ward_coverage_percentage: coverage,
          ward_status: coverage >= 100 ? 'green' : coverage >= 70 ? 'yellow' : 'red'
        };
      });

      // Sort by coverage desc
      processedWards.sort((a, b) => b.ward_coverage_percentage - a.ward_coverage_percentage);

      setWards(processedWards);
    } catch (error) {
      console.error("Error fetching ward targets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-green-500";
      case "yellow": return "bg-yellow-500";
      case "red": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "green":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Award className="w-3 h-3 mr-1" />
            On Target
          </Badge>
        );
      case "yellow":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            Getting There
          </Badge>
        );
      case "red":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Work
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getWinProbability = (coverage: number) => {
    if (coverage >= 100) return { label: "Very High", color: "text-green-600", icon: Award };
    if (coverage >= 80) return { label: "High", color: "text-blue-600", icon: TrendingUp };
    if (coverage >= 60) return { label: "Moderate", color: "text-yellow-600", icon: TrendingUp };
    if (coverage >= 40) return { label: "Low", color: "text-orange-600", icon: TrendingDown };
    return { label: "Very Low", color: "text-red-600", icon: TrendingDown };
  };

  // Calculate overall stats
  const totalTarget = wards.reduce((acc, w) => acc + w.total_target_voters, 0);
  const totalRegistered = wards.reduce((acc, w) => acc + w.total_registered_members, 0);
  const totalVerified = wards.reduce((acc, w) => acc + w.total_verified_members, 0);
  const overallCoverage = totalTarget > 0 ? Math.round((totalRegistered / totalTarget) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading ward targets...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))] text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{wards.length}</div>
            <p className="text-xs text-white/70">Wards</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{totalTarget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Target</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">{totalRegistered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{overallCoverage}%</div>
            <p className="text-xs text-muted-foreground">Overall Coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Win Probability Overview */}
      <Card className="bg-gradient-to-r from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Campaign Win Probability</h3>
              <p className="text-white/70 text-sm">Based on member registration coverage</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getWinProbability(overallCoverage).color}`}>
                {overallCoverage >= 80 ? "Strong" : overallCoverage >= 60 ? "Good" : "Needs Work"}
              </div>
              <p className="text-white/70 text-sm">Win Chance</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to Victory</span>
              <span>{overallCoverage}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(overallCoverage >= 100 ? "green" : overallCoverage >= 70 ? "yellow" : "red")}`}
                style={{ width: `${Math.min(overallCoverage, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ward List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Ward-by-Ward Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wards.map((ward) => {
              const winProb = getWinProbability(ward.ward_coverage_percentage);
              const WinIcon = winProb.icon;

              return (
                <div
                  key={ward.ward_name}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{ward.ward_name}</h4>
                      <p className="text-sm text-muted-foreground">{ward.lga_name}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(ward.ward_status)}
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        <WinIcon className={`w-4 h-4 ${winProb.color}`} />
                        <span className={winProb.color}>{winProb.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium ml-1">{ward.total_target_voters.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="font-medium ml-1">{ward.total_registered_members.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PUs:</span>
                      <span className="font-medium ml-1">{ward.total_polling_units}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Coverage</span>
                      <span className="font-medium">{ward.ward_coverage_percentage}%</span>
                    </div>
                    <Progress
                      value={Math.min(ward.ward_coverage_percentage, 100)}
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}

            {wards.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ward data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>On Target (≥100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Getting There (70-99%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Needs Work (&lt;70%)</span>
        </div>
      </div>
    </div>
  );
};

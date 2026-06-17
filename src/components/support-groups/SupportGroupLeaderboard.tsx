import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, Activity, Medal } from 'lucide-react';
import type { SupportGroupWithStats } from '@/hooks/useSupportGroups';

interface SupportGroupLeaderboardProps {
  groups: SupportGroupWithStats[];
}

export function SupportGroupLeaderboard({ groups }: SupportGroupLeaderboardProps) {
  // Sort groups by kpi_score descending, limit to top 5
  const sortedGroups = [...groups].sort((a, b) => {
    const scoreA = (a as any).kpi_score || 0;
    const scoreB = (b as any).kpi_score || 0;
    return scoreB - scoreA;
  }).slice(0, 5);

  if (sortedGroups.length === 0) {
    return null;
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-gray-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <Card className="col-span-full lg:col-span-1 mb-6 border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 bg-muted/20 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Top Support Groups
        </CardTitle>
        <CardDescription>Performance based on verified activities & members</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {sortedGroups.map((group, index) => (
            <div key={group.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/50">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground/90">{group.name}</p>
                <p className="text-xs text-muted-foreground truncate flex gap-2">
                  <span>{group.lga || group.state}</span>
                  <span>•</span>
                  <span>{(group as any).focus_level || 'State'}</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 text-right">
                <Badge variant="secondary" className="font-bold bg-primary/10 text-primary hover:bg-primary/20">
                  {((group as any).kpi_score || 0).toLocaleString()} pts
                </Badge>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5" title="Members">
                    <Users className="w-3 h-3" /> {group.member_count || 0}
                  </span>
                  <span className="flex items-center gap-0.5" title="Activities">
                    <Activity className="w-3 h-3" /> {group.activities_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

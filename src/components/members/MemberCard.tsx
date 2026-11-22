"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Building2, CreditCard, ChevronRight } from "lucide-react";
import { StarAgentButton } from "@/components/members/StarAgentButton";

interface MemberCardProps {
  member: any;
  onClick: () => void;
}

const MemberCard = ({ member, onClick }: MemberCardProps) => {
  const getInitials = (name: string) => {
    if (!name) return "MB";
    return name
      .trim()
      .split(" ")
      .map((word) => word[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "MB";
  };

  return (
    <div className="w-full bg-card rounded-2xl p-3.5 sm:p-4 border border-border/60 shadow-xs hover:shadow-md transition-all duration-200 space-y-3">
      {/* Top Header Row: Avatar, Member Info & Navigation Chevron */}
      <div
        onClick={onClick}
        className="flex items-start justify-between gap-3 cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-border/70 flex-shrink-0 shadow-2xs">
            <AvatarFallback className="bg-navy-deep text-white font-bold text-xs sm:text-sm">
              {getInitials(member.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h3 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                {member.full_name || "Unnamed Member"}
              </h3>
              {member.is_deceased ? (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                  Deceased
                </span>
              ) : (
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    member.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground border border-border/40"
                  }`}
                >
                  {member.status === "active" ? "Active" : "Inactive"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3.5 mt-1 text-xs text-muted-foreground flex-wrap">
              {member.organizations?.name && (
                <span className="flex items-center gap-1 min-w-0">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/80" />
                  <span className="truncate max-w-[130px] sm:max-w-none font-medium">
                    {member.organizations.name}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/80" />
                <span className="font-medium">{member.state || member.lga || "Kogi"}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-1.5 hover:bg-muted/60 rounded-full text-muted-foreground flex-shrink-0 transition-colors mt-0.5"
          aria-label="View member details"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer Row: Voter ID / Activity Status & Star Agent Action Button */}
      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          {member.voters_card_image_url ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CreditCard className="w-3 h-3" />
              Verified PVC
            </span>
          ) : member.voters_card_id ? (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-[10px] font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <CreditCard className="w-3 h-3" />
              ID Only
            </span>
          ) : null}

          <span className="text-[11px] text-muted-foreground font-medium">
            {member.activity_count || 0} activities
          </span>
        </div>

        <div className="flex-shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
          <StarAgentButton
            memberId={member.id}
            pollingUnitName={member.polling_unit || ""}
            initialRole={member.role}
            initialSocialHandle={member.social_media_handle}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};

export default MemberCard;


"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, MapPin, Building2, CreditCard, ChevronRight } from "lucide-react";

interface MemberCardProps {
  member: any;
  onClick: () => void;
}

const MemberCard = ({ member, onClick }: MemberCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      onClick={onClick}
      className="w-full mobile-card flex items-center gap-3 text-left"
    >
      <Avatar className="w-12 h-12 border-2 border-border flex-shrink-0">
        <AvatarFallback className="bg-navy-deep text-white font-semibold">
          {getInitials(member.full_name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">
            {member.full_name}
          </h3>
          {member.is_deceased ? (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
              Deceased
            </span>
          ) : (
            <span
              className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                member.status === "active"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {member.status === "active" ? "Active" : "Inactive"}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {member.organizations?.name && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{member.organizations.name}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {member.state}
          </span>
        </div>
        
        <div className="flex items-center gap-3 mt-1.5">
          {member.voters_card_image_url ? (
            <span className="flex items-center gap-1 text-success text-[10px] font-medium bg-success/10 px-1.5 py-0.5 rounded">
              <CreditCard className="w-3 h-3" />
              Verified
            </span>
          ) : member.voters_card_id ? (
            <span className="flex items-center gap-1 text-warning text-[10px] font-medium bg-warning/10 px-1.5 py-0.5 rounded">
              <CreditCard className="w-3 h-3" />
              ID Only
            </span>
          ) : null}
          <span className="text-[10px] text-muted-foreground">
            {member.activity_count || 0} activities
          </span>
        </div>
      </div>
      
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

export default MemberCard;

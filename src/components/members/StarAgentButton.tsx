"use client";
import React, { useState, useEffect } from "react";
import { Star, Check, Lock, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AgentDesignation,
  getLocalStarredAgents,
  toggleStarMemberAgent,
  canUserModifyAgents,
} from "@/services/AgentService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StarAgentButtonProps {
  memberId: string;
  pollingUnitName?: string;
  initialRole?: string | null;
  initialSocialHandle?: string | null;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  onUpdate?: (isStarred: boolean, designation: AgentDesignation) => void;
}

export const StarAgentButton: React.FC<StarAgentButtonProps> = ({
  memberId,
  pollingUnitName = "",
  initialRole,
  initialSocialHandle,
  size = "sm",
  className = "",
  onUpdate,
}) => {
  const { role: userRole } = useAuth();
  const [isStarred, setIsStarred] = useState(false);
  const [designation, setDesignation] = useState<AgentDesignation>("lead_agent");
  const isWardAdmin = canUserModifyAgents(userRole);

  useEffect(() => {
    const localStore = getLocalStarredAgents();
    const localRec = localStore[memberId];

    if (localRec) {
      setIsStarred(localRec.is_starred);
      setDesignation(localRec.designation);
    } else {
      const isDbAgent = initialRole === "polling_unit_agent" || (initialSocialHandle && initialSocialHandle.startsWith("DESIGNATION:"));
      setIsStarred(!!isDbAgent);
      if (initialSocialHandle && initialSocialHandle.startsWith("DESIGNATION:")) {
        setDesignation(initialSocialHandle.replace("DESIGNATION:", "") as AgentDesignation);
      }
    }
  }, [memberId, initialRole, initialSocialHandle]);

  const handleSelect = async (newDesignation: AgentDesignation) => {
    // If already starred and user is not ward admin, deny change
    if (isStarred && !isWardAdmin) {
      toast.error("🔒 Only Ward Councillor or Admin can modify an assigned agent.");
      return;
    }

    const success = await toggleStarMemberAgent(memberId, pollingUnitName, newDesignation, true, userRole);
    if (success) {
      setIsStarred(true);
      setDesignation(newDesignation);
      if (onUpdate) onUpdate(true, newDesignation);
    }
  };

  const handleRemove = async () => {
    if (!isWardAdmin) {
      toast.error("🔒 Only Ward Councillor or Admin can remove an assigned agent.");
      return;
    }

    const success = await toggleStarMemberAgent(memberId, pollingUnitName, "unassigned", false, userRole);
    if (success) {
      setIsStarred(false);
      setDesignation("unassigned");
      if (onUpdate) onUpdate(false, "unassigned");
    }
  };

  const getDesignationLabel = (d: AgentDesignation) => {
    switch (d) {
      case "lead_agent":
        return "⭐ Lead Agent";
      case "assistant_agent_1":
        return "⭐ Assistant Agent 1";
      case "assistant_agent_2":
        return "⭐ Assistant Agent 2";
      default:
        return "⭐ PU Agent";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isStarred ? "default" : "outline"}
          size={size}
          className={`gap-1.5 font-bold transition-all text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl ${
            isStarred
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs border-amber-500"
              : "border-amber-400/70 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 bg-amber-500/5"
          } ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isStarred ? "fill-white text-white" : "text-amber-500 fill-amber-500/20"}`} />
          <span className="truncate">{isStarred ? getDesignationLabel(designation) : "Star as PU Agent"}</span>
          {isStarred && !isWardAdmin && <Lock className="w-3 h-3 text-white/80 ml-0.5 flex-shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={6}
        collisionPadding={12}
        className="w-64 max-w-[calc(100vw-2rem)] p-2 space-y-1 z-50 shadow-xl border border-border/80 bg-background/95 backdrop-blur-md rounded-2xl"
      >
        <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
          Designate Agent (Max 3 per PU)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isStarred && !isWardAdmin && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 mb-1">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" /> Agent Assigned & Locked
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-tight">
              Only Ward Councillor or Admin can reassign or remove this agent.
            </p>
          </div>
        )}

        <DropdownMenuItem
          onClick={() => handleSelect("lead_agent")}
          disabled={isStarred && !isWardAdmin}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-lg text-xs">⭐</span>
            <div>
              <p className="font-bold text-foreground">Lead PU Agent</p>
              <p className="text-[10px] text-muted-foreground">Babban Agent na Polling Unit</p>
            </div>
          </div>
          {isStarred && designation === "lead_agent" && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect("assistant_agent_1")}
          disabled={isStarred && !isWardAdmin}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-lg text-xs">⭐</span>
            <div>
              <p className="font-bold text-foreground">Assistant Agent 1</p>
              <p className="text-[10px] text-muted-foreground">Mataimakin Agent na 1</p>
            </div>
          </div>
          {isStarred && designation === "assistant_agent_1" && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect("assistant_agent_2")}
          disabled={isStarred && !isWardAdmin}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-lg text-xs">⭐</span>
            <div>
              <p className="font-bold text-foreground">Assistant Agent 2</p>
              <p className="text-[10px] text-muted-foreground">Mataimakin Agent na 2</p>
            </div>
          </div>
          {isStarred && designation === "assistant_agent_2" && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
        </DropdownMenuItem>

        {isStarred && isWardAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              className="cursor-pointer flex items-center gap-2 text-xs font-bold text-destructive hover:bg-destructive/10 py-2 px-2.5 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <span>Remove Agent Designation</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

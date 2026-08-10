"use client";
import React, { useState, useEffect } from "react";
import { Star, Check, ShieldCheck, UserCheck, Trash2 } from "lucide-react";
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
} from "@/services/AgentService";

interface StarAgentButtonProps {
  memberId: string;
  initialRole?: string | null;
  initialSocialHandle?: string | null;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  onUpdate?: (isStarred: boolean, designation: AgentDesignation) => void;
}

export const StarAgentButton: React.FC<StarAgentButtonProps> = ({
  memberId,
  initialRole,
  initialSocialHandle,
  size = "sm",
  className = "",
  onUpdate,
}) => {
  const [isStarred, setIsStarred] = useState(false);
  const [designation, setDesignation] = useState<AgentDesignation>("lead_agent");

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
    const success = await toggleStarMemberAgent(memberId, newDesignation, true);
    if (success) {
      setIsStarred(true);
      setDesignation(newDesignation);
      if (onUpdate) onUpdate(true, newDesignation);
    }
  };

  const handleRemove = async () => {
    const success = await toggleStarMemberAgent(memberId, "unassigned", false);
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
          className={`gap-1.5 font-bold transition-all ${
            isStarred
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 border-amber-500"
              : "border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          } ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className={`w-4 h-4 ${isStarred ? "fill-white text-white" : "text-amber-500 fill-amber-500/20"}`} />
          <span>{isStarred ? getDesignationLabel(designation) : "Star as PU Agent"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2 space-y-1">
        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
          Designate Polling Unit Agent
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleSelect("lead_agent")}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded">⭐</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">Lead PU Agent</p>
              <p className="text-[10px] text-muted-foreground">Babban Agent na Polling Unit</p>
            </div>
          </div>
          {isStarred && designation === "lead_agent" && <Check className="w-4 h-4 text-amber-600" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect("assistant_agent_1")}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded">⭐</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">Assistant Agent 1</p>
              <p className="text-[10px] text-muted-foreground">Mataimakin Agent na 1</p>
            </div>
          </div>
          {isStarred && designation === "assistant_agent_1" && <Check className="w-4 h-4 text-blue-600" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect("assistant_agent_2")}
          className="cursor-pointer flex items-center justify-between font-semibold text-xs py-2 px-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded">⭐</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">Assistant Agent 2</p>
              <p className="text-[10px] text-muted-foreground">Mataimakin Agent na 2</p>
            </div>
          </div>
          {isStarred && designation === "assistant_agent_2" && <Check className="w-4 h-4 text-purple-600" />}
        </DropdownMenuItem>

        {isStarred && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              className="cursor-pointer flex items-center gap-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 py-2 px-2.5 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Remove Agent Designation</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

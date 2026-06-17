"use client";
import { cn } from "@/lib/utils";
import { useParty } from "@/contexts/PartyContext";

interface PartyFlagProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon" | "horizontal";
    className?: string;
}

const sizeClasses = {
    sm: "w-12 h-8",
    md: "w-20 h-14",
    lg: "w-32 h-22",
    xl: "w-48 h-32",
};

export const PartyFlag = ({ size = "md", variant = "full", className }: PartyFlagProps) => {
    const { party } = useParty();

    if (variant === "icon") {
        return (
            <div className={cn("flex items-center justify-center", className)}>
                <img
                    src={party.logo}
                    alt={`${party.name} logo`}
                    className={cn(sizeClasses[size], "object-contain")}
                />
            </div>
        );
    }

    if (variant === "horizontal") {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <img
                    src={party.flag}
                    alt={`${party.name} flag`}
                    className={cn(sizeClasses[size], "object-contain")}
                />
                <span className="font-bold text-brand text-sm md:text-base">
                    {party.fullName}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <img
                src={party.flag}
                alt={`${party.name} flag`}
                className={cn(sizeClasses[size], "object-contain drop-shadow-lg")}
            />
            {size !== "sm" && (
                <p className="text-xs md:text-sm font-semibold text-muted-foreground text-center">
                    {party.fullName}
                </p>
            )}
        </div>
    );
};

// Backwards-compatible alias for legacy imports
export const APCFlag = PartyFlag;

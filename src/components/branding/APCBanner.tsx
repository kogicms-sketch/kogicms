"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PartyFlag } from "./APCFlag";
import { useParty } from "@/contexts/PartyContext";

interface PartyBannerProps {
    title?: string;
    subtitle?: string;
    children?: ReactNode;
    actions?: ReactNode;
    className?: string;
    showFlag?: boolean;
}

export const PartyBanner = ({
    title,
    subtitle,
    children,
    actions,
    className,
    showFlag = true,
}: PartyBannerProps) => {
    const { party } = useParty();

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl bg-gradient-to-r from-brand via-brand-dark to-brand-secondary",
                "p-6 md:p-8 shadow-lg mb-6",
                className
            )}
        >
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-20"
                    style={{ backgroundImage: `url(${party.flag})` }}
                />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {showFlag && <PartyFlag size="md" variant="icon" className="hidden md:flex" />}
                    <div className="flex-1">
                        {title && (
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{title}</h1>
                        )}
                        {subtitle && (
                            <p className="text-white/90 text-sm md:text-base">{subtitle}</p>
                        )}
                        {children}
                    </div>
                </div>

                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
};

// Backwards-compatible alias
export const APCBanner = PartyBanner;

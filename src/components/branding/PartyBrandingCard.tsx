"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useParty } from "@/contexts/PartyContext";
import { PARTY_LIST, PartyId } from "@/config/parties";
import { Check, Palette, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const PartyBrandingCard = () => {
    const { party, partyId, setParty } = useParty();
    const [saving, setSaving] = useState<string | null>(null);
    const usingPartyBrand = partyId !== "neutral";

    const choose = async (id: PartyId) => {
        try {
            setSaving(id);
            await setParty(id);
            toast.success(`Switched to ${id === "neutral" ? "Neutral" : id.toUpperCase()} branding`);
        } catch {
            toast.error("Could not save selection");
        } finally {
            setSaving(null);
        }
    };

    const toggleBrand = async (on: boolean) => {
        await choose(on ? "apc" : "neutral");
    };

    return (
        <Card className="border-navy-deep/5 shadow-premium">
            <CardHeader className="border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Palette className="w-5 h-5 text-brand" />
                            Party Branding
                        </CardTitle>
                        <CardDescription>
                            Choose which political party's brand drives the entire app — colors, logo, flag, and copy update everywhere instantly.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">Use party branding</span>
                        <Switch checked={usingPartyBrand} onCheckedChange={toggleBrand} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PARTY_LIST.map((p) => {
                        const active = p.id === partyId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => choose(p.id)}
                                disabled={saving === p.id}
                                className={cn(
                                    "relative group rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all bg-card",
                                    active
                                        ? "border-brand shadow-lg ring-2 ring-brand/30"
                                        : "border-border hover:border-brand/50 hover:-translate-y-0.5"
                                )}
                            >
                                {active && (
                                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand text-brand-foreground flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </span>
                                )}
                                <img
                                    src={p.logo}
                                    alt={p.name}
                                    className="w-14 h-14 object-contain"
                                />
                                <div className="text-center">
                                    <p className="font-semibold text-sm">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{p.fullName}</p>
                                </div>
                                <div className="flex gap-1 mt-1">
                                    {p.colors.swatches.map((s, i) => (
                                        <span
                                            key={i}
                                            className="w-3 h-3 rounded-full border border-border/60"
                                            style={{ backgroundColor: s }}
                                        />
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                        Currently using <span className="font-semibold text-foreground">{party.fullName}</span>
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => choose("neutral")}
                        disabled={partyId === "neutral"}
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        Reset to Neutral
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

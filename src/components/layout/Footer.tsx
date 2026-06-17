"use client";
import { PartyFlag } from "@/components/branding/APCFlag";
import { useParty } from "@/contexts/PartyContext";

export const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { party } = useParty();

    return (
        <footer className="border-t border-border bg-card mt-auto">
            <div className="h-1 bg-gradient-to-r from-brand via-brand-secondary to-brand-accent" />

            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <PartyFlag size="sm" variant="icon" />
                        <div className="text-sm">
                            <p className="font-semibold text-foreground">
                                Powered by {party.fullName}
                            </p>
                            <p className="text-muted-foreground text-xs">{party.tagline}</p>
                        </div>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        <p>© {currentYear} {party.shortName} CMS. All rights reserved.</p>
                    </div>

                    <div className="text-sm text-muted-foreground text-center md:text-right">
                        <p>Member Management System</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

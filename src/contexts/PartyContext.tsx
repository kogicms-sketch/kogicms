import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { PARTIES, DEFAULT_PARTY, PartyId, PartyBrand } from "@/config/parties";

interface PartyContextValue {
    party: PartyBrand;
    partyId: PartyId;
    setParty: (id: PartyId, persistRemote?: boolean) => Promise<void>;
    isLoading: boolean;
}

const PartyContext = createContext<PartyContextValue | undefined>(undefined);

const STORAGE_KEY = "active_party";

function applyPartyToDom(party: PartyBrand) {
    const root = document.documentElement;
    const c = party.colors;

    root.setAttribute("data-party", party.id);

    // Brand-generic tokens
    root.style.setProperty("--brand", c.primary);
    root.style.setProperty("--brand-dark", c.primaryDark);
    root.style.setProperty("--brand-foreground", c.primaryForeground);
    root.style.setProperty("--brand-secondary", c.secondary);
    root.style.setProperty("--brand-accent", c.accent);

    // Override existing theme tokens so legacy classes pick up the change
    root.style.setProperty("--primary", c.primary);
    root.style.setProperty("--primary-foreground", c.primaryForeground);
    root.style.setProperty("--accent", c.primary);
    root.style.setProperty("--accent-foreground", c.primaryForeground);
    root.style.setProperty("--ring", c.ring);

    root.style.setProperty("--sidebar-background", c.sidebar);
    root.style.setProperty("--sidebar-accent", c.sidebarDark);
    root.style.setProperty("--sidebar-primary-foreground", c.primary);
    root.style.setProperty("--sidebar-border", c.sidebarDark);

    // Legacy APC tokens repointed so older components still themed correctly
    root.style.setProperty("--apc-green", c.primary);
    root.style.setProperty("--apc-green-dark", c.primaryDark);
    root.style.setProperty("--apc-blue", c.secondary);
    root.style.setProperty("--apc-blue-dark", c.secondary);
    root.style.setProperty("--apc-red", c.accent);
    root.style.setProperty("--apc-red-dark", c.accent);
    root.style.setProperty("--power-red", c.primary);

    // Swap favicon + apple touch icon to the active party logo
    try {
        let iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!iconLink) {
            iconLink = document.createElement("link");
            iconLink.rel = "icon";
            document.head.appendChild(iconLink);
        }
        iconLink.href = party.logo;

        let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
        if (!appleLink) {
            appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            document.head.appendChild(appleLink);
        }
        appleLink.href = party.logo;

        // Update document title dynamically
        if (party.id === "apc") {
            document.title = "DikkoCMS";
        } else {
            document.title = `${party.shortName} CMS`;
        }
    } catch { /* noop */ }
}

function readInitialParty(): PartyId {
    if (typeof window === "undefined") return DEFAULT_PARTY;
    const stored = window.localStorage.getItem(STORAGE_KEY) as PartyId | null;
    if (stored && PARTIES[stored]) return stored;
    return DEFAULT_PARTY;
}

export const PartyProvider = ({ children }: { children: ReactNode }) => {
    const [partyId, setPartyId] = useState<PartyId>(readInitialParty);
    const [isLoading, setIsLoading] = useState(true);

    // Apply on mount and on change
    useEffect(() => {
        applyPartyToDom(PARTIES[partyId]);
    }, [partyId]);

    // Fetch global setting from backend (overrides local if present)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from("app_settings")
                    .select("value")
                    .eq("key", "active_party")
                    .maybeSingle();
                if (!mounted) return;
                if (!error && data?.value) {
                    const remote = (typeof data.value === "string" ? data.value : data.value?.partyId) as PartyId;
                    if (remote && PARTIES[remote] && remote !== partyId) {
                        setPartyId(remote);
                        window.localStorage.setItem(STORAGE_KEY, remote);
                    }
                }
            } catch (e) {
                // table may not exist yet — fall back to local
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();

        // Realtime: propagate changes to all clients
        const channel = (supabase as any)
            .channel("app_settings_party")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "app_settings", filter: "key=eq.active_party" },
                (payload: any) => {
                    const v = payload?.new?.value;
                    const remote = (typeof v === "string" ? v : v?.partyId) as PartyId;
                    if (remote && PARTIES[remote]) {
                        setPartyId(remote);
                        window.localStorage.setItem(STORAGE_KEY, remote);
                    }
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
        };
    }, []);

    const setParty = useCallback(async (id: PartyId, persistRemote = true) => {
        if (!PARTIES[id]) return;
        setPartyId(id);
        window.localStorage.setItem(STORAGE_KEY, id);
        if (persistRemote) {
            try {
                await (supabase as any).from("app_settings").upsert(
                    { key: "active_party", value: { partyId: id }, updated_at: new Date().toISOString() },
                    { onConflict: "key" }
                );
            } catch (e) {
                console.warn("Could not persist party globally:", e);
            }
        }
    }, []);

    return (
        <PartyContext.Provider value={{ party: PARTIES[partyId], partyId, setParty, isLoading }}>
            {children}
        </PartyContext.Provider>
    );
};

export const useParty = () => {
    const ctx = useContext(PartyContext);
    if (!ctx) {
        return {
            party: PARTIES[DEFAULT_PARTY],
            partyId: DEFAULT_PARTY,
            setParty: async () => {},
            isLoading: false,
        } as PartyContextValue;
    }
    return ctx;
};

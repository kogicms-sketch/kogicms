// Party brand registry — drives runtime theming across the app.
// HSL triplets only (e.g. "120 100% 30%") so they can plug into CSS vars.

export type PartyId = "apm" | "apc" | "pdp" | "adc" | "ndc" | "neutral";

export interface PartyBrand {
    id: PartyId;
    name: string;
    fullName: string;
    shortName: string;
    tagline: string;
    logo: string;
    flag: string;
    /** HSL triplets (no `hsl()` wrapper) for CSS variable injection */
    colors: {
        primary: string;
        primaryDark: string;
        primaryForeground: string;
        secondary: string;
        accent: string;
        sidebar: string;
        sidebarDark: string;
        ring: string;
        /** swatch hexes for the picker UI */
        swatches: string[];
    };
}

export const PARTIES: Record<PartyId, PartyBrand> = {
    apm: {
        id: "apm",
        name: "APM",
        fullName: "Allied Peoples' Movement",
        shortName: "APM",
        tagline: "Nigeria First.",
        logo: "/parties/apm-logo.png",
        flag: "/parties/apm-logo.png",
        colors: {
            primary: "147 100% 30%",         // Vibrant APM Green (#009A44)
            primaryDark: "147 100% 23%",     // Deep Green (#007534)
            primaryForeground: "0 0% 100%",  // White
            secondary: "205 100% 15%",       // APM Deep Navy Blue (#002B49)
            accent: "199 100% 40%",          // APM Sky Blue (#0085CA)
            sidebar: "205 100% 15%",         // Deep Navy Blue (#002B49)
            sidebarDark: "205 100% 10%",     // Darker Navy (#001B2E)
            ring: "147 100% 30%",
            swatches: ["#009A44", "#002B49", "#0085CA", "#FFFFFF"],
        },
    },
    apc: {
        id: "apc",
        name: "APC",
        fullName: "All Progressives Congress",
        shortName: "APC",
        tagline: "Progress. Unity. Reform.",
        logo: "/parties/apc-logo.png",
        flag: "/parties/apc-logo.png",
        colors: {
            primary: "120 100% 30%",
            primaryDark: "120 100% 25%",
            primaryForeground: "0 0% 100%",
            secondary: "207 100% 39%",
            accent: "356 95% 46%",
            sidebar: "120 100% 25%",
            sidebarDark: "120 100% 20%",
            ring: "120 100% 30%",
            swatches: ["#009900", "#0064C8", "#E30613"],
        },
    },
    pdp: {
        id: "pdp",
        name: "PDP",
        fullName: "Peoples Democratic Party",
        shortName: "PDP",
        tagline: "Power to the People.",
        logo: "/parties/pdp-logo.png",
        flag: "/parties/pdp-logo.png",
        colors: {
            primary: "140 75% 30%",
            primaryDark: "140 80% 22%",
            primaryForeground: "0 0% 100%",
            secondary: "0 80% 45%",
            accent: "0 80% 45%",
            sidebar: "140 80% 22%",
            sidebarDark: "140 85% 16%",
            ring: "140 75% 30%",
            swatches: ["#0F8A3C", "#E30613", "#FFFFFF"],
        },
    },
    adc: {
        id: "adc",
        name: "ADC",
        fullName: "African Democratic Congress",
        shortName: "ADC",
        tagline: "Democracy. Development. Dignity.",
        logo: "/parties/adc-logo.png",
        flag: "/parties/adc-logo.png",
        colors: {
            primary: "145 80% 30%",
            primaryDark: "145 85% 22%",
            primaryForeground: "0 0% 100%",
            secondary: "356 85% 48%",
            accent: "356 85% 48%",
            sidebar: "145 85% 22%",
            sidebarDark: "145 88% 16%",
            ring: "145 80% 30%",
            swatches: ["#0E8A3C", "#E30613", "#FFFFFF"],
        },
    },
    ndc: {
        id: "ndc",
        name: "NDC",
        fullName: "New Democratic Congress",
        shortName: "NDC",
        tagline: "A New Way Forward.",
        logo: "/parties/ndc-logo.png",
        flag: "/parties/ndc-logo.png",
        colors: {
            primary: "239 56% 42%",
            primaryDark: "239 56% 32%",
            primaryForeground: "0 0% 100%",
            secondary: "356 80% 50%",
            accent: "356 80% 50%",
            sidebar: "239 56% 32%",
            sidebarDark: "239 56% 24%",
            ring: "239 56% 42%",
            swatches: ["#3B3B98", "#E30613", "#FFFFFF"],
        },
    },
    neutral: {
        id: "neutral",
        name: "Neutral",
        fullName: "Campaign Management System",
        shortName: "CMS",
        tagline: "Manage. Engage. Empower.",
        logo: "/parties/neutral-logo.svg",
        flag: "/parties/neutral-flag.svg",
        colors: {
            primary: "239 84% 60%",
            primaryDark: "239 75% 48%",
            primaryForeground: "0 0% 100%",
            secondary: "215 28% 25%",
            accent: "239 84% 67%",
            sidebar: "222 47% 14%",
            sidebarDark: "222 47% 10%",
            ring: "239 84% 60%",
            swatches: ["#6366F1", "#1E293B", "#94A3B8"],
        },
    },
};

export const DEFAULT_PARTY: PartyId = "apm";

export const PARTY_LIST = Object.values(PARTIES);

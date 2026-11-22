// Kogi State Local Government Areas (21 LGAs)
export const KOGI_LGAS = [
    "Adavi",
    "Ajaokuta",
    "Ankpa",
    "Bassa",
    "Dekina",
    "Ibaji",
    "Idah",
    "Igalamela-Odolu",
    "Ijumu",
    "Kabba/Bunu",
    "Kogi (Koton Karfe)",
    "Lokoja",
    "Mopa-Muro",
    "Ofu",
    "Ogori/Magongo",
    "Okehi",
    "Okene",
    "Olamaboro",
    "Omala",
    "Yagba East",
    "Yagba West"
] as const;

export type KogiLga = typeof KOGI_LGAS[number];

// Alias for backwards compatibility with existing components
export const KATSINA_LGAS = KOGI_LGAS;

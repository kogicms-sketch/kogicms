"use client";
import { forwardRef } from "react";
import type { VoterRecord } from "@/hooks/useVoterRegistry";
import blankTemplate from "@/assets/inec-blank-template-v2.png.asset.json";

const OCCUPATIONS = [
  "FARMING/FISHING",
  "TRADING",
  "CIVIL SERVANT",
  "TEACHING",
  "BUSINESS",
  "TAILORING",
  "STUDENT",
  "DRIVING",
  "ARTISAN",
  "HOUSEWIFE",
  "MECHANIC",
  "CARPENTRY",
];

/** Stable hash from a string so generated data is identical for the same voter. */
const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/** Format the raw VIN into INEC's spaced groups, e.g. 90F5 B036 2D29 5790 094. */
const formatVin = (vin: string): string => {
  const clean = (vin || "").replace(/\s+/g, "").toUpperCase();
  if (!clean) return "—";
  const groups: string[] = [];
  let i = 0;
  while (i < clean.length) {
    groups.push(clean.slice(i, i + 4));
    i += 4;
  }
  return groups.join("  ");
};

/**
 * Build the vertical serial PIN printed down the left edge of the card
 * (e.g. A1A0294944). It always starts with "A" and the rest is generated
 * deterministically from the seed so the same voter always gets the same PIN.
 */
const buildPin = (seed: number): string => {
  let s = seed || 1;
  const next = () => {
    // xorshift-ish step for a stable pseudo-random stream
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s;
  };
  let pin = "A"; // always starts with "A", followed by digits only
  for (let i = 0; i < 9; i++) {
    pin += String(next() % 10);
  }
  return pin;
};


interface VoterIdCardProps {
  voter: VoterRecord;
}

export const VoterIdCard = forwardRef<HTMLDivElement, VoterIdCardProps>(
  ({ voter }, ref) => {
    const seed = hashString(voter.vin || voter.full_name || "voter");
    const occupation = OCCUPATIONS[seed % OCCUPATIONS.length];
    const dob = voter.dob_year ? `01-01-${voter.dob_year}` : "01-01-1960";
    const gender = (voter.gender || "").toUpperCase().startsWith("F") ? "FEMALE" : "MALE";
    const lga = (voter.lga || "KATSINA").toUpperCase();
    const ward = (voter.ward || "—").toUpperCase();
    // Address shows the first segment of the polling unit name. We split only
    // on " - " and "," — NOT on "/", so abbreviations that contain a slash
    // (e.g. "S/KASUWA") are kept whole as one word.
    const rawAddress = voter.polling_unit_name || voter.ward || "—";
    const address = rawAddress
      .split(/\s*[-,]\s*/)[0]
      .trim()
      .toUpperCase();
    const code = voter.polling_unit_code || "20-21-07-020";
    const pin = buildPin(seed);

    // The real card uses plain Arial. Arimo is metrically identical to Arial
    // and is embedded so every device renders the exact same letterforms.
    const FONT = "'Arimo', Arial, 'Liberation Sans', sans-serif";
    const INK = "#111111";

    // Inline labels (CODE:, VIN:, DELIM:) are bold on the original card.
    const inlineLabel = {
      fontFamily: FONT,
      fontWeight: 700 as const,
      color: INK,
      fontSize: "2.5cqw",
      letterSpacing: "0.2px",
    };
    // Stacked field labels (DATE OF BIRTH, GENDER, ...) are regular weight.
    const fieldLabel = {
      fontFamily: FONT,
      fontWeight: 400 as const,
      color: INK,
      fontSize: "2.5cqw",
      letterSpacing: "0.2px",
    };
    // Values are Arial Bold (700) — not the heavier Black weight.
    const value = {
      fontFamily: FONT,
      fontWeight: 700 as const,
      color: INK,
      fontSize: "2.7cqw",
      letterSpacing: "0.2px",
      lineHeight: 1.05,
    };

    return (
      <div
        ref={ref}
        className="relative w-full overflow-hidden select-none"
        style={{
          aspectRatio: "1570 / 1002",
          containerType: "inline-size",
        }}
      >
        {/* Real INEC card template (header, logos, watermark & photo frame baked in) */}
        <img
          src={blankTemplate.url}
          alt="INEC Voter's Card"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          draggable={false}
        />

        {/* ---- Vertical serial PIN down the far-left edge (e.g. A1A0294944) ---- */}
        <div
          className="absolute flex flex-col items-center justify-between"
          style={{ left: "1.4%", top: "30.5%", bottom: "12.5%" }}
        >
          {pin.split("").map((ch, idx) => (
            <span
              key={idx}
              style={{
                ...value,
                fontSize: "1.7cqw",
                lineHeight: 1,
              }}
            >
              {ch}
            </span>
          ))}
        </div>




        {/* ---- CODE row (above the photo, like the original) ---- */}
        <div
          className="absolute flex items-baseline whitespace-nowrap"
          style={{ left: "5%", top: "25.5%" }}
        >
          <span style={inlineLabel}>CODE:</span>
          <span style={{ ...value, marginLeft: "3cqw" }}>{code}</span>
        </div>

        {/* ---- VIN row (groups spread across the top, like the original) ---- */}
        <div
          className="absolute flex items-baseline whitespace-nowrap"
          style={{ left: "42%", top: "25.5%", right: "3%" }}
        >
          <span style={inlineLabel}>VIN:</span>
          <div className="flex flex-1 justify-between" style={{ marginLeft: "2cqw" }}>
            {formatVin(voter.vin)
              .split(/\s+/)
              .filter(Boolean)
              .map((group, idx) => (
                <span key={idx} style={value}>
                  {group}
                </span>
              ))}
          </div>
        </div>

        {/* ---- Photo (fits inside the printed green frame) ---- */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: "5.2%",
            top: "30.5%",
            width: "30.6%",
            height: "57%",
            background: "#e7eae6",
          }}
        >
          {voter.photo_url ? (
            <img
              src={voter.photo_url}
              alt={voter.full_name}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ fontFamily: FONT, fontSize: "2cqw", color: "#6b7a6b" }}
            >
              NO PHOTO
            </div>
          )}
        </div>

        {/* ---- DELIM + Ward ---- */}
        <div className="absolute" style={{ left: "42%", top: "34%", right: "3%" }}>
          <div className="flex items-baseline whitespace-nowrap">
            <span style={inlineLabel}>DELIM:</span>
            <span style={{ ...value, marginLeft: "2cqw" }}>{lga}</span>
            <span style={{ ...value, marginLeft: "3cqw" }}>|</span>
            <span style={{ ...value, marginLeft: "3cqw" }}>{lga}</span>
          </div>
          <p style={{ ...value, margin: "1cqw 0 0" }}>{ward}</p>
        </div>

        {/* ---- Name ---- */}
        <p
          className="absolute"
          style={{ ...value, fontSize: "3.3cqw", left: "42%", top: "47.5%", right: "3%" }}
        >
          {voter.full_name.toUpperCase()}
        </p>

        {/* ---- Date of birth ---- */}
        <div className="absolute" style={{ left: "42%", top: "58.5%" }}>
          <p style={fieldLabel}>DATE OF BIRTH</p>
          <p style={{ ...value, marginTop: "0.8cqw" }}>{dob}</p>
        </div>

        {/* ---- Gender ---- */}
        <div className="absolute text-right" style={{ right: "4%", top: "58.5%" }}>
          <p style={fieldLabel}>GENDER</p>
          <p style={{ ...value, marginTop: "0.8cqw" }}>{gender}</p>
        </div>

        {/* ---- Occupation ---- */}
        <div className="absolute" style={{ left: "42%", top: "70.5%" }}>
          <p style={fieldLabel}>OCCUPATION</p>
          <p style={{ ...value, marginTop: "0.8cqw" }}>{occupation}</p>
        </div>

        {/* ---- Address ---- */}
        <div className="absolute" style={{ left: "42%", top: "82%", right: "3%" }}>
          <p style={fieldLabel}>ADDRESS</p>
          <p style={{ ...value, marginTop: "0.8cqw" }}>{address}</p>
        </div>
      </div>
    );
  }
);

VoterIdCard.displayName = "VoterIdCard";

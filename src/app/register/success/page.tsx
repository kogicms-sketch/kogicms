"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") || "APM-UNKNOWN";
  const name = searchParams.get("name") || "Member";
  const pu = searchParams.get("pu") || "Selected Polling Unit";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0faf2 0%, #e8f5e9 50%, #f0f9ff 100%)", padding: "48px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 20, boxShadow: "0 12px 50px rgba(0,0,0,0.08)", padding: "40px 32px", boxSizing: "border-box", textAlign: "center" }}>
        
        {/* Animated Checkmark */}
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, borderRadius: "50%", background: "#009A44", color: "#fff", fontSize: 40, marginBottom: 24, boxShadow: "0 8px 24px rgba(0,154,68,0.25)" }}>
          ✓
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#009A44", margin: "0 0 8px" }}>
          Registration Submitted!
        </h1>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: "0 0 28px" }}>
          Thank you, <strong>{name}</strong>. Your registration has been submitted successfully to <strong>{pu}</strong> and is pending verification by the polling unit agent.
        </p>

        {/* Membership Card */}
        <div style={{ background: "linear-gradient(135deg, #009A44, #007534)", borderRadius: 16, padding: "24px", color: "#fff", textAlign: "left", marginBottom: 28, boxShadow: "0 6px 20px rgba(0,154,68,0.2)", position: "relative", overflow: "hidden" }}>
          {/* Decorative Background */}
          <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 110, fontWeight: 900, color: "rgba(255,255,255,0.06)", pointerEvents: "none", userSelect: "none" }}>
            APM
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#a7f3d0", marginBottom: 12 }}>
            ALLIED PEOPLES&apos; MOVEMENT (APM)
          </div>
          
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, letterSpacing: 0.5 }}>
            {name}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", color: "#a7f3d0", letterSpacing: 0.5, marginBottom: 2 }}>
                MEMBERSHIP ID
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", letterSpacing: 1 }}>
                {id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", color: "#a7f3d0", letterSpacing: 0.5, marginBottom: 2 }}>
                STATUS
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 4 }}>
                PENDING
              </div>
            </div>
          </div>
        </div>

        {/* Tagline Banner */}
        <div style={{ display: "inline-block", background: "linear-gradient(135deg,#e8f5e9,#f0faf2)", border: "1.5px solid #009A44", borderRadius: 20, padding: "4px 16px", marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: "#007534", fontWeight: 800, letterSpacing: "0.5px" }}>Allied Peoples&apos; Movement • Nigeria First</span>
        </div>

        <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "12px", fontSize: 13, color: "#4b5563", marginBottom: 28, lineHeight: 1.5 }}>
          📸 <strong>Please screenshot or save this card.</strong> Your polling unit agent has been notified and will verify your details soon.
        </div>

        <button onClick={() => router.push("/register")} style={{ width: "100%", height: 46, borderRadius: 8, border: "1.5px solid #009A44", background: "transparent", color: "#009A44", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
          Register Another Member
        </button>

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0faf2" }}>
        Loading...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

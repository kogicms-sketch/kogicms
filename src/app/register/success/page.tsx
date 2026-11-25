"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") || "APM-UNKNOWN";
  const name = searchParams.get("name") || "Member";
  const pu = searchParams.get("pu") || "Selected Polling Unit";
  const isOffline = searchParams.get("offline") === "true" || searchParams.get("offline") === "1";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0faf2 0%, #e8f5e9 50%, #f0f9ff 100%)", padding: "48px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 20, boxShadow: "0 12px 50px rgba(0,0,0,0.08)", padding: "40px 32px", boxSizing: "border-box", textAlign: "center" }}>
        
        {/* Animated Checkmark / Status Icon */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: isOffline ? "#ea580c" : "#009A44",
          color: "#fff",
          fontSize: 38,
          marginBottom: 20,
          boxShadow: isOffline ? "0 8px 24px rgba(234,88,12,0.25)" : "0 8px 24px rgba(0,154,68,0.25)"
        }}>
          {isOffline ? "📡" : "✓"}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: isOffline ? "#ea580c" : "#009A44", margin: "0 0 8px" }}>
          {isOffline ? "Saved Offline Successfully!" : "Registration Submitted!"}
        </h1>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: "0 0 24px" }}>
          {isOffline ? (
            <>
              <strong>{name}</strong> has been registered successfully for <strong>{pu}</strong>. Because there is currently no network connection, the record is stored securely on this device and will automatically sync once connected.
            </>
          ) : (
            <>
              Thank you, <strong>{name}</strong>. Your registration has been submitted successfully to <strong>{pu}</strong> and is pending verification by the polling unit agent.
            </>
          )}
        </p>

        {/* Membership Card */}
        <div style={{
          background: isOffline
            ? "linear-gradient(135deg, #c2410c, #9a3412)"
            : "linear-gradient(135deg, #009A44, #007534)",
          borderRadius: 16,
          padding: "24px",
          color: "#fff",
          textAlign: "left",
          marginBottom: 24,
          boxShadow: isOffline ? "0 6px 20px rgba(194,65,12,0.2)" : "0 6px 20px rgba(0,154,68,0.2)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative Background */}
          <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 110, fontWeight: 900, color: "rgba(255,255,255,0.06)", pointerEvents: "none", userSelect: "none" }}>
            APM
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: isOffline ? "#fed7aa" : "#a7f3d0", marginBottom: 12 }}>
            ALLIED PEOPLES&apos; MOVEMENT (APM) • KOGI
          </div>
          
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, letterSpacing: 0.5 }}>
            {name}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", color: isOffline ? "#fed7aa" : "#a7f3d0", letterSpacing: 0.5, marginBottom: 2 }}>
                MEMBERSHIP ID
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", letterSpacing: 1 }}>
                {id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", color: isOffline ? "#fed7aa" : "#a7f3d0", letterSpacing: 0.5, marginBottom: 2 }}>
                SYNC STATUS
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(255,255,255,0.2)",
                padding: "3px 8px",
                borderRadius: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4
              }}>
                {isOffline ? "🟠 QUEUED FOR SYNC" : "🟢 ONLINE SYNCED"}
              </div>
            </div>
          </div>
        </div>

        {/* Offline sync note if offline */}
        {isOffline ? (
          <div style={{ background: "#fff7ed", border: "1.5px solid #ffedd5", borderRadius: 10, padding: "14px", fontSize: 13, color: "#9a3412", marginBottom: 24, lineHeight: 1.5, textAlign: "left" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📡</span> Auto-Sync Engine (Offline Mode Active)
            </p>
            This member's details are saved locally on this device. Once internet or cellular network connection is detected, the system will automatically upload this registration to the APM central database. No further action is required.
          </div>
        ) : (
          <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "12px", fontSize: 13, color: "#4b5563", marginBottom: 24, lineHeight: 1.5 }}>
            📸 <strong>Please screenshot or save this card.</strong> Your polling unit agent has been notified and will verify your details soon.
          </div>
        )}

        {/* Tagline Banner */}
        <div style={{ display: "inline-block", background: "linear-gradient(135deg,#e8f5e9,#f0faf2)", border: "1.5px solid #009A44", borderRadius: 20, padding: "4px 16px", marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: "#007534", fontWeight: 800, letterSpacing: "0.5px" }}>Allied Peoples&apos; Movement • Nigeria First</span>
        </div>

        <button
          onClick={() => router.push("/register")}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #009A44, #007534)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,154,68,0.25)",
            transition: "all 0.2s"
          }}
        >
          ➕ Register Another Member
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

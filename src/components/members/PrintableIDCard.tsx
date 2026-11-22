"use client";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_NAME } from "@/lib/campaign-data";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { forwardRef } from "react";
import { useParty } from "@/contexts/PartyContext";

interface PrintableIDCardMember {
    id: string;
    full_name: string;
    membership_id?: string | null;
    role?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    lga?: string | null;
    ward?: string | null;
    polling_unit?: string | null;
    state?: string;
    phone?: string | null;
    voters_card_id?: string | null;
    joined_at?: string | null;
    organizations?: { name: string } | null;
}

interface PrintableIDCardProps {
    member: PrintableIDCardMember;
}

export const PrintableIDCard = forwardRef<HTMLDivElement, PrintableIDCardProps>(
    ({ member }, ref) => {
        const { partyId } = useParty();
        const campaignName = partyId === "apc" 
            ? CAMPAIGN_NAME 
            : `${member.lga || "Kogi State"} Campaign`;
        const initials = member.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        const membershipId = member.membership_id || `DR-${member.id.slice(0, 8).toUpperCase()}`;

        const formattedDob = member.date_of_birth
            ? (() => {
                try { return format(new Date(member.date_of_birth), "dd/MM/yyyy"); }
                catch { return "N/A"; }
            })()
            : "N/A";

        const formattedJoinDate = member.joined_at
            ? (() => {
                try { return format(new Date(member.joined_at), "MMM yyyy"); }
                catch { return "N/A"; }
            })()
            : "N/A";

        const roleLabel = (member.role || "member").charAt(0).toUpperCase() + (member.role || "member").slice(1);

        return (
            <div ref={ref} style={{ display: "flex", gap: "24px", padding: "24px", background: "#f8f9fa", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
                {/* ========== FRONT SIDE ========== */}
                <div style={{
                    width: "380px",
                    height: "580px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    background: "#ffffff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    border: "1px solid #e0e0e0",
                    position: "relative",
                }}>
                    {/* Green Top Bar */}
                    <div style={{
                        height: "6px",
                        background: "linear-gradient(90deg, #0D8C3A 0%, #15A346 50%, #0D8C3A 100%)",
                    }} />

                    {/* Header with Navy Background */}
                    <div style={{
                        background: "linear-gradient(135deg, #0A1628 0%, #152238 50%, #0D1B30 100%)",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}>
                        {/* Kogi CMS Portrait */}
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.3)",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "#1a2d4a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <img
                                src="/app-logo.png"
                                alt={campaignName}
                                style={{ width: "100%", height: "100%", objectFit: "cover", padding: "4px" }}
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: "15px",
                                letterSpacing: "0.5px",
                                lineHeight: 1.2,
                            }}>
                                {campaignName}
                            </div>
                            <div style={{
                                color: "#0D8C3A",
                                fontSize: "10px",
                                fontWeight: 600,
                                letterSpacing: "2px",
                                textTransform: "uppercase",
                                marginTop: "2px",
                            }}>
                                OFFICIAL MEMBER ID CARD
                            </div>
                        </div>
                        {/* Logo */}
                        <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            flexShrink: 0,
                        }}>
                            <img
                                src="/app-logo.png"
                                alt="Logo"
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                crossOrigin="anonymous"
                            />
                        </div>
                    </div>

                    {/* Member Photo Area */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "20px 20px 8px",
                    }}>
                        <div style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #0A1628, #152238)",
                            border: "4px solid #0D8C3A",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 16px rgba(13,140,58,0.3)",
                        }}>
                            <span style={{
                                fontSize: "42px",
                                fontWeight: 800,
                                color: "#ffffff",
                                letterSpacing: "2px",
                            }}>
                                {initials}
                            </span>
                        </div>
                    </div>

                    <div style={{
                        textAlign: "center",
                        padding: "8px 20px",
                    }}>
                        <div style={{
                            fontSize: "20px",
                            fontWeight: 800,
                            color: "#0A1628",
                            lineHeight: 1.2,
                            marginBottom: "2px",
                        }}>
                            {member.full_name.toUpperCase()}
                        </div>
                        <div style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#0D8C3A",
                            marginBottom: "6px",
                            textTransform: "uppercase",
                            letterSpacing: "1px"
                        }}>
                            {member.organizations?.name || "Member"}
                        </div>
                        <div style={{
                            display: "inline-block",
                            background: "linear-gradient(135deg, #0D8C3A, #15A346)",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "4px 14px",
                            borderRadius: "20px",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                        }}>
                            {roleLabel}
                        </div>
                    </div>

                    {/* Member Details Grid */}
                    <div style={{
                        padding: "12px 24px",
                        flex: 1,
                    }}>
                        <div style={{
                            background: "#f7f8fa",
                            borderRadius: "10px",
                            padding: "12px 16px",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                        }}>
                            <DetailItem label="MEMBER ID" value={membershipId} mono />
                            <DetailItem label="GENDER" value={member.gender ? member.gender.toUpperCase() : "N/A"} />
                            <DetailItem label="DATE OF BIRTH" value={formattedDob} />
                            <DetailItem label="STATE" value={member.state || "Kogi"} />
                            <DetailItem label="LGA" value={member.lga || "N/A"} />
                            <DetailItem label="WARD" value={member.ward || "N/A"} />
                            {member.polling_unit && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <DetailItem label="POLLING UNIT" value={member.polling_unit} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        background: "linear-gradient(135deg, #0A1628 0%, #152238 100%)",
                        padding: "8px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", letterSpacing: "1px" }}>
                            ISSUED: {formattedJoinDate}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", letterSpacing: "1px" }}>
                            KOGI STATE, NIGERIA
                        </span>
                    </div>

                    {/* Bottom Green Bar */}
                    <div style={{
                        height: "6px",
                        background: "linear-gradient(90deg, #0D8C3A 0%, #15A346 50%, #0D8C3A 100%)",
                    }} />
                </div>

                {/* ========== BACK SIDE ========== */}
                <div style={{
                    width: "380px",
                    height: "580px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    background: "linear-gradient(135deg, #0A1628 0%, #0D1B30 40%, #152238 100%)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    border: "1px solid #1a2d4a",
                    position: "relative",
                }}>
                    {/* Green Top Bar */}
                    <div style={{
                        height: "6px",
                        background: "linear-gradient(90deg, #0D8C3A 0%, #15A346 50%, #0D8C3A 100%)",
                    }} />

                    {/* Header */}
                    <div style={{
                        padding: "20px 24px",
                        textAlign: "center",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <div style={{
                            color: "#0D8C3A",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "3px",
                            textTransform: "uppercase",
                        }}>
                            VERIFICATION
                        </div>
                    </div>

                    {/* QR Code Center */}
                    <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px 40px",
                    }}>
                        <div style={{
                            background: "#ffffff",
                            padding: "12px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(13,140,58,0.2)",
                            marginBottom: "12px",
                        }}>
                            <QRCode
                                size={160}
                                value={`DR-MEMBER-${member.id}`}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox="0 0 256 256"
                            />
                        </div>
                        <div style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "11px",
                            textAlign: "center",
                            lineHeight: 1.5,
                            maxWidth: "240px",
                        }}>
                            Scan this QR code to verify<br />
                            membership status and view profile
                        </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div style={{
                        margin: "0 24px 16px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                        <div style={{
                            color: "#0D8C3A",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                        }}>
                            TERMS & CONDITIONS
                        </div>
                        <div style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "9px",
                            lineHeight: 1.6,
                        }}>
                            <p style={{ margin: "0 0 3px" }}>1. This card remains property of {campaignName}.</p>
                            <p style={{ margin: "0 0 3px" }}>2. If found, return to the nearest campaign office.</p>
                            <p style={{ margin: "0" }}>3. This card is non-transferable.</p>
                        </div>
                    </div>

                    {/* Authorized Signature */}
                    <div style={{
                        padding: "14px 24px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        textAlign: "center",
                    }}>
                        <div style={{
                            color: "rgba(255,255,255,0.3)",
                            fontSize: "9px",
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                        }}>
                            AUTHORIZED SIGNATURE
                        </div>
                        <div style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.15)",
                            width: "140px",
                            margin: "0 auto",
                        }} />
                    </div>

                    {/* Bottom Green Bar */}
                    <div style={{
                        height: "6px",
                        background: "linear-gradient(90deg, #0D8C3A 0%, #15A346 50%, #0D8C3A 100%)",
                    }} />
                </div>
            </div>
        );
    }
);

PrintableIDCard.displayName = "PrintableIDCard";

// Helper component for detail items
const DetailItem = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <div>
        <div style={{
            color: "#8a919a",
            fontSize: "8px",
            fontWeight: 600,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "2px",
        }}>
            {label}
        </div>
        <div style={{
            color: "#0A1628",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : "inherit",
            lineHeight: 1.3,
            wordBreak: "break-word",
        }}>
            {value}
        </div>
    </div>
);

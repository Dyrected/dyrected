"use client";

import { useState } from "react";
import {
  usePageMeta,
  usePageRoute,
  useAdminNavigate,
  useAdminNotify,
  type AdminPageProps,
} from "@dyrected/react";
import {
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Wine,
  Shirt,
  ShieldCheck,
  Send,
} from "lucide-react";

export function OperationsDashboard({ slug }: AdminPageProps) {
  const { navigate: routeNavigate, splat } = usePageRoute();
  const { navigate: adminNav, to } = useAdminNavigate();
  const notify = useAdminNotify();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(splat || "overview");

  // Synchronize dynamic page header meta, breadcrumbs, and header actions
  usePageMeta({
    title: "Executive Operations Hub",
    description: "Live wedding countdown, real-time RSVP status, and VIP concierge dispatch.",
    breadcrumbs: [
      { label: "Operations", to: "/wedding-ops" },
      { label: "Executive Hub" },
    ],
    actions: [
      {
        label: isRefreshing ? "Refreshing..." : "Live Refresh",
        icon: "RefreshCw",
        variant: "outline",
        disabled: isRefreshing,
        onClick: () => {
          setIsRefreshing(true);
          notify.info("Synchronizing latest guest check-in signals...");
          setTimeout(() => {
            setIsRefreshing(false);
            notify.success("All operational metrics up to date.");
          }, 800);
        },
      },
      {
        label: "Door Check-In",
        icon: "UserCheck",
        variant: "default",
        onClick: () => {
          adminNav(to.workspace("door-checkin"));
        },
      },
    ],
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    routeNavigate(tab === "overview" ? "" : tab);
  };

  return (
    <div className="dy-space-y-6">
      {/* Tab Navigation powered by usePageRoute sub-routing */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border, #e5e7eb)",
          paddingBottom: 12,
        }}
      >
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "vip", label: "VIP Concierge & Tasting" },
          { id: "asoebi", label: "Aso-Ebi Logistics" },
        ].map((tab) => {
          const isActive = (splat || "overview") === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: isActive ? "var(--primary, #0ea5e9)" : "transparent",
                color: isActive ? "#ffffff" : "var(--muted-foreground, #64748b)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", fontWeight: 500 }}>
              Confirmed RSVPs
            </span>
            <span style={{ padding: "4px 8px", background: "#ecfdf5", color: "#059669", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              94.2%
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
            186 / 200
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={14} color="#059669" /> +14 confirmed this week
          </p>
        </div>

        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", fontWeight: 500 }}>
              Aso-Ebi Collected
            </span>
            <Shirt size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
            142 Kits
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", marginTop: 6 }}>
            44 awaiting dispatch at reception desk
          </p>
        </div>

        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", fontWeight: 500 }}>
              Menu Tasting Approvals
            </span>
            <Wine size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
            38 VIPs
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", marginTop: 6 }}>
            100% dietary profiles cataloged
          </p>
        </div>

        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", fontWeight: 500 }}>
              Live Security Code
            </span>
            <ShieldCheck size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: "#0284c7" }}>
            ROYAL-2026
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", marginTop: 6 }}>
            Valid at door entry gate
          </p>
        </div>
      </div>

      {/* Sub-view Content based on splat route */}
      {(splat === "" || splat === "overview" || !splat) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 20,
          }}
        >
          {/* Main Operations Activity */}
          <div
            style={{
              background: "var(--card, #ffffff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px 0", color: "var(--foreground, #0f172a)" }}>
              Real-time Readiness Milestones
            </h3>
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { title: "VIP Seating Allocation", desc: "Seating chart tables 1-8 assigned to immediate family and dignitaries", done: true },
                { title: "Asoebi Color-coded Bagging", desc: "Emerald Green & Rose Gold packaging completed for 180 guests", done: true },
                { title: "Champagne Tasting RSVP Confirmation", desc: "38 VIP couples confirmed attendance for Friday 4:00 PM tasting", done: true },
                { title: "Door Check-In Tablet Sync", desc: "Roster pre-cached offline for door scanners", done: false },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: "var(--muted, #f8fafc)",
                  }}
                >
                  {item.done ? (
                    <CheckCircle2 size={18} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                  ) : (
                    <Clock size={18} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground, #0f172a)" }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Dispatch Panel */}
          <div
            style={{
              background: "var(--card, #ffffff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px 0", color: "var(--foreground, #0f172a)" }}>
              Workspace Shortcuts
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                onClick={() => adminNav(to.workspace("wedding-ops", "seating-chart"))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Interactive Seating Chart</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Custom visual table manager</div>
                </div>
                <ArrowUpRight size={16} color="#64748b" />
              </button>

              <button
                onClick={() => adminNav(to.workspace("wedding-ops", "attending-guests"))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Attending Guest List</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Spreadsheet & grid views</div>
                </div>
                <ArrowUpRight size={16} color="#64748b" />
              </button>

              <button
                onClick={() => adminNav(to.collection("blog-articles"))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Blog Articles</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Published wedding story articles</div>
                </div>
                <ArrowUpRight size={16} color="#64748b" />
              </button>
            </div>
          </div>
        </div>
      )}

      {splat === "vip" && (
        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>VIP Guest Concierge (Sub-route /vip)</h3>
            <button
              onClick={() => notify.success("SMS reminders sent to all 38 tasting guests!")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "#0ea5e9",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Send size={14} /> Send SMS Reminders
            </button>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted-foreground, #64748b)", margin: "0 0 16px 0" }}>
            This sub-view demonstrates deep splat routing inside Custom Admin Pages using <code>usePageRoute()</code>.
            Current URL is <code>/pages/executive-hub/vip</code>.
          </p>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted, #f8fafc)", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px" }}>VIP Guest</th>
                  <th style={{ textAlign: "left", padding: "10px 14px" }}>Designation</th>
                  <th style={{ textAlign: "left", padding: "10px 14px" }}>Dietary Note</th>
                  <th style={{ textAlign: "left", padding: "10px 14px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Dr. & Mrs. Adeleke", role: "Bride's Family", note: "Pescatarian, Gluten-free", status: "Table 1 Confirmed" },
                  { name: "Chief & Lolo Okonkwo", role: "Groom's Family", note: "Traditional Nigerian Cuisine", status: "Table 2 Confirmed" },
                  { name: "Senator Folawiyo", role: "Chairman of the Day", note: "No restrictions", status: "Table 3 Confirmed" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{row.role}</td>
                    <td style={{ padding: "12px 14px" }}>{row.note}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", background: "#ecfdf5", color: "#059669", borderRadius: 4, fontWeight: 500 }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {splat === "asoebi" && (
        <div
          style={{
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px 0" }}>Aso-Ebi Distribution Queue (Sub-route /asoebi)</h3>
          <p style={{ fontSize: 14, color: "var(--muted-foreground, #64748b)", margin: "0 0 16px 0" }}>
            Track fabric package dispatch for Nigerian traditional wedding attires.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Fabric Requested</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>22</div>
            </div>
            <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, border: "1px solid #fde68a" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#92400e" }}>Payment Verified</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#92400e", marginTop: 4 }}>22</div>
            </div>
            <div style={{ padding: 16, background: "#dcfce7", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#166534" }}>Collected by Guest</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#166534", marginTop: 4 }}>142</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

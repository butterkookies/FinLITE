import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneCashReconciliation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.6, stiffness: 110 },
  });

  // Tally counts animating
  const p1000Count = Math.floor(interpolate(frame, [15, 45], [0, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const p500Count = Math.floor(interpolate(frame, [25, 55], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const p100Count = Math.floor(interpolate(frame, [35, 65], [0, 45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  // Discrepancy drops from -₱15,500 to ₱0.00 (Balanced)
  const discrepancy = interpolate(frame, [40, 85], [-15500, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isBalanced = frame >= 85;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f5f5f7",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
      }}
    >
      {/* Container */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 120,
          right: 120,
          bottom: 60,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 30px 60px -12px rgba(0,0,0,0.1)",
          transform: `scale(${entrance}) translateY(${(1 - entrance) * 40}px)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 70,
            padding: "0 32px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f" }}>
              Physical Cashbox Reconciliation
            </div>
            <div style={{ fontSize: 12, color: "#6e6e73" }}>
              Vault audit & denomination breakdown verification
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 9999,
              backgroundColor: isBalanced ? "#f0fdf4" : "#fefce8",
              border: isBalanced ? "1px solid #bbf7d0" : "1px solid #fef08a",
              color: isBalanced ? "#166534" : "#854d0e",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.3s ease",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isBalanced ? "#16a34a" : "#ca8a04",
              }}
            />
            {isBalanced ? "✓ BALANCED (₱0.00 DISCREPANCY)" : "AUDITING CASHBOX..."}
          </div>
        </div>

        {/* Denomination Grid */}
        <div style={{ padding: 40, flex: 1, backgroundColor: "#fafafb" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginBottom: 30,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 13, color: "#6e6e73", fontWeight: 600 }}>
                ₱1,000 BILLS
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, margin: "8px 0" }}>
                {p1000Count} <span style={{ fontSize: 16, color: "#86868b" }}>pcs</span>
              </div>
              <div style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>
                = ₱{(p1000Count * 1000).toLocaleString()}.00
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 13, color: "#6e6e73", fontWeight: 600 }}>
                ₱500 BILLS
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, margin: "8px 0" }}>
                {p500Count} <span style={{ fontSize: 16, color: "#86868b" }}>pcs</span>
              </div>
              <div style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>
                = ₱{(p500Count * 500).toLocaleString()}.00
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 13, color: "#6e6e73", fontWeight: 600 }}>
                ₱100 BILLS
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, margin: "8px 0" }}>
                {p100Count} <span style={{ fontSize: 16, color: "#86868b" }}>pcs</span>
              </div>
              <div style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>
                = ₱{(p100Count * 100).toLocaleString()}.00
              </div>
            </div>
          </div>

          {/* Verification Bar */}
          <div
            style={{
              padding: 24,
              backgroundColor: isBalanced ? "#f0fdf4" : "#ffffff",
              borderRadius: 14,
              border: isBalanced ? "1px solid #bbf7d0" : "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "#6e6e73", fontWeight: 600 }}>
                NET DISCREPANCY
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: isBalanced ? "#166534" : "#ca8a04",
                  marginTop: 4,
                }}
              >
                {new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(discrepancy)}
              </div>
            </div>

            <div
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                backgroundColor: isBalanced ? "#15803d" : "#e5e5ea",
                color: isBalanced ? "#ffffff" : "#8e8e93",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Sign Off & Lock Ledger
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

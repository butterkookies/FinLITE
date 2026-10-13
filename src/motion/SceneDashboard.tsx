import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance 3D tilt
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 100 },
  });

  const cardRotateX = interpolate(entrance, [0, 1], [15, 0]);
  const cardTranslateY = interpolate(entrance, [0, 1], [80, 0]);
  const cardScale = interpolate(entrance, [0, 1], [0.94, 1]);

  // Cursor gliding in
  const cursorProgress = interpolate(frame, [40, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(cursorProgress, [0, 1], [1600, 340]);
  const cursorY = interpolate(cursorProgress, [0, 1], [900, 42]);
  const isClicking = frame >= 92 && frame <= 104;

  // Number ticker for balance
  const balanceCount = interpolate(frame, [20, 120], [0, 48520], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const formattedBalance = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(balanceCount);

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
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 800,
          background:
            "radial-gradient(circle, rgba(21,128,61,0.06) 0%, rgba(245,245,247,0) 70%)",
        }}
      />

      {/* Main Window Frame */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 100,
          right: 100,
          bottom: 60,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          boxShadow:
            "0 30px 60px -12px rgba(0,0,0,0.12), 0 10px 24px -6px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.08)",
          transform: `perspective(1200px) rotateX(${cardRotateX}deg) translateY(${cardTranslateY}px) scale(${cardScale})`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Navigation Header */}
        <div
          style={{
            height: 64,
            padding: "0 28px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: "#15803d",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              L
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>FinLITE</div>
              <div style={{ fontSize: 11, color: "#6e6e73" }}>LITE / PDM</div>
            </div>

            <div
              style={{
                height: 20,
                width: 1,
                backgroundColor: "rgba(0,0,0,0.08)",
                margin: "0 4px",
              }}
            />

            {/* Semester Switcher Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                backgroundColor: isClicking ? "#f0fdf4" : "#ffffff",
                border: isClicking
                  ? "1px solid #16a34a"
                  : "1px solid rgba(0,0,0,0.1)",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transform: isClicking ? "scale(0.97)" : "scale(1)",
                transition: "all 0.1s ease",
              }}
            >
              <span>AY 2026–2027 • 1st Sem</span>
              <span style={{ fontSize: 11, color: "#86868b" }}>▾</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 9999,
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              TREASURER
            </div>
            <div
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                backgroundColor: "#15803d",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Audit Cashbox
            </div>
          </div>
        </div>

        {/* Dashboard Body */}
        <div style={{ padding: 36, flex: 1, backgroundColor: "#fafafb" }}>
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#1d1d1f",
                margin: "0 0 6px 0",
              }}
            >
              Financial Overview
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#6e6e73" }}>
              Live real-time ledger reconciled with physical vault.
            </p>
          </div>

          {/* Metric Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Net Available Balance */}
            <div
              style={{
                padding: 24,
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase" }}>
                Net Balance
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#15803d",
                  letterSpacing: -1,
                  margin: "10px 0 6px 0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formattedBalance}
              </div>
              <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                ↑ 100% Reconciled
              </div>
            </div>

            {/* Total Inflow */}
            <div
              style={{
                padding: 24,
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase" }}>
                Total Inflow
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#1d1d1f",
                  letterSpacing: -1,
                  margin: "10px 0 6px 0",
                }}
              >
                ₱62,400.00
              </div>
              <div style={{ fontSize: 13, color: "#6e6e73" }}>
                248 student dues collected
              </div>
            </div>

            {/* Total Outflow */}
            <div
              style={{
                padding: 24,
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase" }}>
                Expenses & Events
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#dc2626",
                  letterSpacing: -1,
                  margin: "10px 0 6px 0",
                }}
              >
                ₱13,880.00
              </div>
              <div style={{ fontSize: 13, color: "#6e6e73" }}>
                12 verified receipts attached
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Apple Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          pointerEvents: "none",
          zIndex: 999,
          transform: isClicking ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.08s ease",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="#1d1d1f"
          stroke="#ffffff"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
        >
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>

        {/* Click ripple */}
        {isClicking && (
          <div
            style={{
              position: "absolute",
              top: -10,
              left: -10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "rgba(21,128,61,0.3)",
              animation: "ping 0.2s ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
};

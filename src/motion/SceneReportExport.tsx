import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneReportExport: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.6, stiffness: 110 },
  });

  // Progress animation (frame 15 to 55)
  const progress = interpolate(frame, [15, 55], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isDone = frame >= 55;

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 800,
          backgroundColor: "#ffffff",
          borderRadius: 24,
          padding: 48,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
          transform: `scale(${entrance})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 24px",
            borderRadius: "50%",
            backgroundColor: isDone ? "#f0fdf4" : "#f4f4f5",
            color: isDone ? "#16a34a" : "#71717a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 800,
            transition: "all 0.3s ease",
          }}
        >
          {isDone ? "✓" : "⚡"}
        </div>

        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1d1d1f", margin: "0 0 10px" }}>
          {isDone ? "Auditor Report Ready" : "Compiling Universal Ledger"}
        </h2>
        <p style={{ fontSize: 16, color: "#6e6e73", margin: "0 0 32px" }}>
          {isDone
            ? "Fully formatted DOCX & PDF compliance package with 3NF audit trails."
            : "Verifying multi-receipt attachments and supervisor digital sign-offs..."}
        </p>

        {/* Progress Bar */}
        <div
          style={{
            height: 8,
            backgroundColor: "#f0f0f2",
            borderRadius: 9999,
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "#15803d",
              borderRadius: 9999,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Action Button */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 32px",
            borderRadius: 9999,
            backgroundColor: isDone ? "#15803d" : "#e5e5ea",
            color: isDone ? "#ffffff" : "#8e8e93",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: isDone ? "0 8px 16px rgba(21,128,61,0.3)" : "none",
          }}
        >
          <span>Download Official Financial Packet (.docx)</span>
          <span>↓</span>
        </div>
      </div>
    </div>
  );
};

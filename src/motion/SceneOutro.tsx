import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
  });

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Soft emerald glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(21,128,61,0.14) 0%, rgba(245,245,247,0) 70%)",
        }}
      />

      <div
        style={{
          transform: `scale(${entrance}) translateY(${(1 - entrance) * 20}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            backgroundColor: "#15803d",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            boxShadow: "0 20px 40px -10px rgba(21,128,61,0.35)",
          }}
        >
          L
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#1d1d1f",
            margin: 0,
          }}
        >
          FinLITE
        </h1>

        <p
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "#6e6e73",
            margin: 0,
          }}
        >
          Financial leadership, clarified.
        </p>

        <div
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            color: "#166534",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <span>Available for PDM Student Councils</span>
        </div>
      </div>
    </div>
  );
};

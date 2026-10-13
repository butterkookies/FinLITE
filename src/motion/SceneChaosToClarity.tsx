import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneChaosToClarity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sweep trigger at frame 120 (4.0s mark)
  const sweepProgress = spring({
    frame: frame - 120,
    fps,
    config: {
      damping: 14,
      mass: 0.8,
      stiffness: 110,
    },
  });

  // Camera drift during chaos
  const cameraRotate = interpolate(frame, [0, 120], [-1.5, 1.2], {
    extrapolateRight: "clamp",
  });
  const cameraScale = interpolate(frame, [0, 120, 180], [1.08, 1.15, 1], {
    extrapolateRight: "clamp",
  });

  // White clean canvas opacity
  const cleanCanvasOpacity = interpolate(frame, [115, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // FinLITE logo & text reveal
  const logoSpring = spring({
    frame: frame - 160,
    fps,
    config: { damping: 15, mass: 0.6, stiffness: 120 },
  });

  // Clutter items: sticky notes, receipts, ₱20, ₱100, and coins
  const clutterItems = [
    {
      id: "sticky-1",
      type: "sticky",
      text: "₱1,250 dues pending??",
      color: "#fef08a",
      textColor: "#854d0e",
      x: 180,
      y: 160,
      rot: -12,
      sweepX: -1200,
      sweepY: -400,
    },
    {
      id: "receipt-1",
      type: "receipt",
      merchant: "OFFICE WAREHOUSE",
      total: "₱4,580.00",
      x: 380,
      y: 320,
      rot: 8,
      sweepX: -1500,
      sweepY: 200,
    },
    {
      id: "p20-1",
      type: "bill-20",
      x: 820,
      y: 210,
      rot: -22,
      sweepX: 800,
      sweepY: -900,
    },
    {
      id: "sticky-2",
      type: "sticky",
      text: "Reciept missing for Printouts!",
      color: "#fbcfe8",
      textColor: "#9d174d",
      x: 1240,
      y: 190,
      rot: 15,
      sweepX: 1300,
      sweepY: -600,
    },
    {
      id: "p100-1",
      type: "bill-100",
      x: 1420,
      y: 380,
      rot: -9,
      sweepX: 1600,
      sweepY: 500,
    },
    {
      id: "coin-1",
      type: "coin",
      val: "₱10",
      x: 710,
      y: 440,
      rot: 45,
      sweepX: 300,
      sweepY: 1200,
    },
    {
      id: "coin-2",
      type: "coin",
      val: "₱5",
      x: 1140,
      y: 520,
      rot: -30,
      sweepX: 900,
      sweepY: 1300,
    },
    {
      id: "sticky-3",
      type: "sticky",
      text: "Liquidation due TOMORROW 4PM",
      color: "#fed7aa",
      textColor: "#9a3412",
      x: 640,
      y: 620,
      rot: -5,
      sweepX: -600,
      sweepY: 1200,
    },
    {
      id: "receipt-2",
      type: "receipt",
      merchant: "NATIONAL BOOK STORE",
      total: "₱920.50",
      x: 1020,
      y: 680,
      rot: -14,
      sweepX: 800,
      sweepY: 1400,
    },
    {
      id: "p20-2",
      type: "bill-20",
      x: 310,
      y: 720,
      rot: 18,
      sweepX: -1400,
      sweepY: 900,
    },
    {
      id: "coin-3",
      type: "coin",
      val: "₱1",
      x: 880,
      y: 790,
      rot: 10,
      sweepX: 200,
      sweepY: 1500,
    },
  ];

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#1c1917", // warm dark wood / desk tone
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
      }}
    >
      {/* 1. Cluttered Desk Surface */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, #382e2b 0%, #1c1917 100%)",
          transform: `scale(${cameraScale}) rotate(${cameraRotate}deg)`,
          transformOrigin: "center center",
        }}
      >
        {/* Desk grid lines / subtle texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.12,
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Scattered items */}
        {clutterItems.map((item) => {
          const itemX = item.x + item.sweepX * sweepProgress;
          const itemY = item.y + item.sweepY * sweepProgress;
          const itemRot = item.rot + sweepProgress * 45;
          const itemOpacity = 1 - sweepProgress * 0.9;

          if (item.type === "sticky") {
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: itemX,
                  top: itemY,
                  width: 200,
                  height: 190,
                  backgroundColor: item.color,
                  color: item.textColor,
                  padding: "18px 16px",
                  borderRadius: 3,
                  boxShadow:
                    "0 14px 28px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.2)",
                  transform: `rotate(${itemRot}deg)`,
                  opacity: itemOpacity,
                  fontSize: 19,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  cursor: "default",
                }}
              >
                <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 8, letterSpacing: "0.05em" }}>
                  NOTE
                </div>
                {item.text}
              </div>
            );
          }

          if (item.type === "receipt") {
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: itemX,
                  top: itemY,
                  width: 230,
                  backgroundColor: "#fafafa",
                  color: "#18181b",
                  padding: "20px 18px",
                  borderRadius: 2,
                  boxShadow:
                    "0 18px 35px rgba(0,0,0,0.38), 0 6px 12px rgba(0,0,0,0.22)",
                  transform: `rotate(${itemRot}deg)`,
                  opacity: itemOpacity,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.4,
                  borderTop: "3px dashed #d4d4d8",
                  borderBottom: "3px dashed #d4d4d8",
                }}
              >
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                  {item.merchant}
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#71717a", margin: "4px 0 12px" }}>
                  OFFICIAL RECEIPT
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>ITEMS SUB</span>
                  <span>{item.total}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px dashed #a1a1aa",
                  }}
                >
                  <span>TOTAL DUE</span>
                  <span style={{ color: "#dc2626" }}>{item.total}</span>
                </div>
              </div>
            );
          }

          if (item.type === "bill-20") {
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: itemX,
                  top: itemY,
                  width: 280,
                  height: 130,
                  backgroundColor: "#ea580c",
                  borderRadius: 6,
                  boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
                  transform: `rotate(${itemRot}deg)`,
                  opacity: itemOpacity,
                  color: "#fff",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>20</span>
                  <span style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.9 }}>
                    REPUBLIKA NG PILIPINAS
                  </span>
                </div>
                <div style={{ fontSize: 11, textAlign: "center", letterSpacing: 2, opacity: 0.9 }}>
                  DALAWAMPUNG PISO
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>BSP</span>
                  <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>₱20</span>
                </div>
              </div>
            );
          }

          if (item.type === "bill-100") {
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: itemX,
                  top: itemY,
                  width: 300,
                  height: 140,
                  backgroundColor: "#7c3aed",
                  borderRadius: 6,
                  boxShadow: "0 14px 28px rgba(0,0,0,0.38)",
                  transform: `rotate(${itemRot}deg)`,
                  opacity: itemOpacity,
                  color: "#fff",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>100</span>
                  <span style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.9 }}>
                    REPUBLIKA NG PILIPINAS
                  </span>
                </div>
                <div style={{ fontSize: 11, textAlign: "center", letterSpacing: 2, opacity: 0.9 }}>
                  SANDAANG PISO
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>BSP</span>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>₱100</span>
                </div>
              </div>
            );
          }

          // Coins
          return (
            <div
              key={item.id}
              style={{
                position: "absolute",
                left: itemX,
                top: itemY,
                width: 60,
                height: 60,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 35%, #f4f4f5 0%, #a1a1aa 70%, #52525b 100%)",
                boxShadow:
                  "0 8px 16px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.8)",
                transform: `rotate(${itemRot}deg)`,
                opacity: itemOpacity,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#27272a",
                border: "2px dashed #71717a",
              }}
            >
              {item.val}
            </div>
          );
        })}

        {/* Ambient chaos text at the start */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            opacity: interpolate(frame, [0, 40, 100, 120], [0, 1, 1, 0]),
          }}
        >
          Manual treasury shouldn’t feel like survival.
        </div>
      </div>

      {/* 2. The Apple Clean Sweep (Pristine White & Emerald Canvas) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#f5f5f7",
          opacity: cleanCanvasOpacity,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Soft emerald radial aura */}
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(21,128,61,0.12) 0%, rgba(245,245,247,0) 70%)",
            transform: `scale(${0.8 + logoSpring * 0.2})`,
          }}
        />

        {/* FinLITE Minimalist Emblem & Reveal */}
        <div
          style={{
            transform: `scale(${logoSpring}) translateY(${(1 - logoSpring) * 30}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: "#15803d",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 800,
              boxShadow:
                "0 20px 40px -10px rgba(21,128,61,0.4), 0 8px 16px -4px rgba(0,0,0,0.06)",
              letterSpacing: -1,
            }}
          >
            L
          </div>

          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 68,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#1d1d1f",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              FinLITE
            </h1>
            <p
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "#6e6e73",
                margin: "12px 0 0 0",
              }}
            >
              Financial leadership, clarified.
            </p>
          </div>

          {/* Minimalist Pill Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 9999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              fontSize: 15,
              fontWeight: 600,
              color: "#166534",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#16a34a",
              }}
            />
            Built for PDM & LITE Council
          </div>
        </div>
      </div>
    </div>
  );
};

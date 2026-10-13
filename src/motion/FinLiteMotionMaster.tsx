import React from "react";
import { Series } from "remotion";
import { SceneChaosToClarity } from "./SceneChaosToClarity";
import { SceneDashboard } from "./SceneDashboard";
import { SceneCashReconciliation } from "./SceneCashReconciliation";
import { SceneReportExport } from "./SceneReportExport";
import { SceneOutro } from "./SceneOutro";

// Master 60-Second Video (1,800 frames @ 30fps)
export const FinLiteMotionMaster: React.FC = () => {
  return (
    <Series>
      {/* 0:00 - 0:10 (300 frames): Cluttered desk, notes, receipts, ₱20, ₱100, coins -> The Clean Sweep */}
      <Series.Sequence durationInFrames={300}>
        <SceneChaosToClarity />
      </Series.Sequence>

      {/* 0:10 - 0:26 (480 frames): Live Dashboard & Semester clarity */}
      <Series.Sequence durationInFrames={480}>
        <SceneDashboard />
      </Series.Sequence>

      {/* 0:26 - 0:42 (480 frames): Physical cashbox audit & denomination breakdown */}
      <Series.Sequence durationInFrames={480}>
        <SceneCashReconciliation />
      </Series.Sequence>

      {/* 0:42 - 0:52 (300 frames): Universal report engine & auditor checkmark */}
      <Series.Sequence durationInFrames={300}>
        <SceneReportExport />
      </Series.Sequence>

      {/* 0:52 - 1:00 (240 frames): Hero Brand Lockup */}
      <Series.Sequence durationInFrames={240}>
        <SceneOutro />
      </Series.Sequence>
    </Series>
  );
};

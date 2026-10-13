import { registerRoot } from "remotion";
import React from "react";
import { Composition } from "remotion";
import { FinLiteMotionMaster } from "./FinLiteMotionMaster";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FinLiteReveal"
        component={FinLiteMotionMaster}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);

import { useState, useEffect } from "react";
import { PICO8 } from "@/engine/ProceduralPixelArt";

export function PixelLoadingScreen() {
  const [dots, setDots] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 15));
    }, 300);
    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: PICO8.darkBlue }}
    >
      {/* Pixel office building icon */}
      <div className="mb-6" style={{ imageRendering: "pixelated" }}>
        <svg width="64" height="64" viewBox="0 0 8 8" shapeRendering="crispEdges">
          <rect x="2" y="0" width="4" height="1" fill={PICO8.lightGray} />
          <rect x="1" y="1" width="6" height="6" fill={PICO8.lightGray} />
          <rect x="2" y="2" width="1" height="1" fill={PICO8.blue} />
          <rect x="5" y="2" width="1" height="1" fill={PICO8.blue} />
          <rect x="2" y="4" width="1" height="1" fill={PICO8.blue} />
          <rect x="5" y="4" width="1" height="1" fill={PICO8.blue} />
          <rect x="3" y="5" width="2" height="2" fill={PICO8.brown} />
          <rect x="1" y="7" width="6" height="1" fill={PICO8.darkGray} />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="pixel-font text-lg mb-2 pixel-animate-pulse"
        style={{ color: PICO8.white }}
      >
        PIXELCLIP
      </h1>

      <p
        className="pixel-font text-[8px] mb-6"
        style={{ color: PICO8.indigo }}
      >
        Loading office{dots}
      </p>

      {/* Progress bar */}
      <div className="w-48">
        <div className="pixel-progress">
          <div
            className="pixel-progress-fill"
            style={{ width: `${progress}%`, transition: "width 0.3s steps(10)" }}
          />
        </div>
        <p
          className="pixel-font text-[6px] text-center mt-2"
          style={{ color: PICO8.lightGray }}
        >
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

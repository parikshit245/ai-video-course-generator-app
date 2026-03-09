import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";

/* --------------------------- Types --------------------------- */

type CaptionChunk = {
  timestamp: [number, number];
};

type Slide = {
  slideId: string;
  html: string;
  audioFileUrl: string; // Direct S3 URL
  revealData?: string[]; // Array of reveal IDs: ["r1", "r2", "r3"]
  caption?: {
    chunks: CaptionChunk[];
  };
};

/* ------------------- Reveal runtime (iframe side) ------------------- */

const REVEAL_RUNTIME_SCRIPT = `
<script>
(function () {
  function reset() {
    document.querySelectorAll("[data-reveal]").forEach(el =>
      el.classList.remove("is-on")
    );
  }

  function reveal(id) {
    var el = document.querySelector("[data-reveal='" + id + "']");
    if (el) el.classList.add("is-on");
  }

  window.addEventListener("message", function (e) {
    var msg = e.data;
    if (!msg) return;
    if (msg.type === "RESET") reset();
    if (msg.type === "REVEAL") reveal(msg.id);
  });
})();
</script>
`;

const injectRevealRuntime = (html: string) => {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${REVEAL_RUNTIME_SCRIPT}</body>`);
  }
  return html + REVEAL_RUNTIME_SCRIPT;
};

/* ------------------- Slide with reveal control ------------------- */

const SlideIFrameWithReveal = ({ slide }: { slide: Slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // ✅ BUILD REVEAL PLAN SAFELY
  const revealPlan = useMemo(() => {
    const revealIds = slide.revealData ?? [];
    const chunks = slide.caption?.chunks ?? [];

    if (!Array.isArray(revealIds) || revealIds.length === 0) return [];

    // Map each reveal ID to a timestamp (from caption chunks or evenly distributed)
    return revealIds.map((id, i) => {
      const timestamp = chunks[i]?.timestamp?.[0] ?? i * 2; // Default: 2 seconds apart
      return { id, at: timestamp };
    });
  }, [slide.revealData, slide.caption]);

  // ✅ On iframe load
  const handleLoad = () => {
    setReady(true);
    iframeRef.current?.contentWindow?.postMessage({ type: "RESET" }, "*");
  };

  // ✅ SCRUB-SAFE reveal logic
  useEffect(() => {
    if (!ready) return;

    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Reset everything
    win.postMessage({ type: "RESET" }, "*");

    // Reveal all steps up to current time
    for (const step of revealPlan) {
      if (time >= step.at) {
        win.postMessage({ type: "REVEAL", id: step.id }, "*");
      }
    }
  }, [time, ready, revealPlan]);

  return (
    <AbsoluteFill>
      <iframe
        ref={iframeRef}
        srcDoc={injectRevealRuntime(slide.html)}
        onLoad={handleLoad}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: 1280, height: 720, border: "none" }}
      />

      {/* Use S3 URL directly for audio */}
      <Audio src={slide.audioFileUrl} />
    </AbsoluteFill>
  );
};

/* ------------------------- Course Composition ------------------------- */

type Props = {
  slides: Slide[];
  durationsBySlideId: Record<string, number>;
};

export const CourseComposition = ({ slides, durationsBySlideId }: Props) => {
  const { fps } = useVideoConfig();

  const GAP_SECONDS = 1;
  const GAP_FRAMES = Math.round(GAP_SECONDS * fps);

  const timeline = useMemo(() => {
    let from = 0;

    return slides.map((slide) => {
      const dur = durationsBySlideId[slide.slideId] ?? Math.ceil(6 * fps);

      const item = { slide, from, dur };

      from += dur + GAP_FRAMES;

      return item;
    });
  }, [slides, durationsBySlideId, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {timeline.map(({ slide, from, dur }) => (
        <Sequence key={slide.slideId} from={from} durationInFrames={dur}>
          <SlideIFrameWithReveal slide={slide} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

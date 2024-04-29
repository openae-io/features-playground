import uPlot from "uplot";
import { isNil } from "lodash";
import { sampleToBlockCenter } from "@/utils";

export interface BlockHighlightPluginOptions {
  blocksize: number;
  stepsize: number;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}

export function highlightBlockPlugin({
  blocksize,
  stepsize,
  className,
  style = { backgroundColor: "rgba(0, 0, 0, 0.1)" },
}: BlockHighlightPluginOptions): uPlot.Plugin {
  const el: HTMLDivElement = document.createElement("div");
  uPlot.assign(el.style, {
    pointerEvents: "none",
    display: "none",
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    ...style,
  });
  className && el.classList.add(className);

  function init(u: uPlot) {
    u.under.appendChild(el);

    // show/hide highlight on enter/exit
    u.over.addEventListener("mouseenter", () => {
      el.style.display = "block";
    });
    u.over.addEventListener("mouseleave", () => {
      el.style.display = "none";
    });
  }

  let currBlockCenter = 0;

  function setCursor(u: uPlot) {
    if (isNil(u.cursor.idx)) return;
    const idx = u.cursor.idx;
    const samples = u.data[0];
    const blockCenter = sampleToBlockCenter(
      samples[idx],
      blocksize,
      stepsize,
      samples[samples.length - 1],
    );

    if (currBlockCenter !== blockCenter) {
      currBlockCenter = blockCenter;
      const [idxMin, idxMax] = u.series[0].idxs!;
      const dx = idxMax - idxMin;
      const width = blocksize * (u.bbox.width / dx / devicePixelRatio);
      const left = u.valToPos(currBlockCenter, "x") - width / 2;

      el.style.transform = "translateX(" + Math.round(left) + "px)";
      el.style.width = Math.round(width) + "px";
    }
  }

  return {
    hooks: {
      init: init,
      setCursor: setCursor,
    },
  };
}

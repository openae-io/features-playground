/* eslint object-curly-newline: ["error", "always"] */

export interface Signal {
  readonly title: string;
  readonly load: () => Promise<Float32Array>;
}

function getSignal(module: any) {
  return new Float32Array(module.default);
}

export const signals: readonly Signal[] = [
  {
    title: "Hit",
    load: () => import("./hit.json").then(getSignal),
  },
  {
    title: "Sine with 1/100 sampling rate",
    load: () => import("./sine.json").then(getSignal),
  },
  {
    title: "Square wave with 1/100 sampling rate",
    load: () => import("./square.json").then(getSignal),
  },
  {
    title: "Chirp from 0 to 1/10 sampling rate",
    load: () => import("./chirp.json").then(getSignal),
  },
  {
    title: "White noise (σ = 1)",
    load: () => import("./white_noise.json").then(getSignal),
  },
];

/* eslint object-curly-newline: ["error", "always"] */

export interface Signal {
  readonly title: string;
  readonly load: () => Promise<number[]>;
}

function getDefault(module: any): number[] {
  return module.default;
}

export const signals: readonly Signal[] = [
  {
    title: "Hit",
    load: () => import("./hit.json").then(getDefault),
  },
  {
    title: "Sine with 1/100 sampling rate",
    load: () => import("./sine.json").then(getDefault),
  },
  {
    title: "Square wave with 1/100 sampling rate",
    load: () => import("./square.json").then(getDefault),
  },
  {
    title: "Chirp from 0 to 1/10 sampling rate",
    load: () => import("./chirp.json").then(getDefault),
  },
  {
    title: "White noise (σ = 1)",
    load: () => import("./white_noise.json").then(getDefault),
  },
];

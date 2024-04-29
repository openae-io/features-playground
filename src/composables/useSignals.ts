import { readonly } from "vue";

type LoadSignal = () => Promise<number[]>;

export interface Signal {
  title: string;
  load: LoadSignal;
}

const titles = import.meta.glob("../signals/*.json", { eager: true, import: "title" });
const loader = import.meta.glob("../signals/*.json", { eager: false, import: "data" });

const signals: Signal[] = Object.entries(titles).map(
  ([key, title]): Signal => ({ title: title as any, load: loader[key] as LoadSignal }),
);

export function useSignals() {
  return { signals: readonly(signals) };
}

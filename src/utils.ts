export function numberOfBlocks(samples: number, bsize: number, ssize: number): number {
  return Math.floor((samples - bsize) / ssize);
}

export function blockIndexToCenter(index: number, bsize: number, ssize: number): number {
  return bsize / 2 + index * ssize;
}

export function sampleToBlockIndex(
  sample: number,
  bsize: number,
  ssize: number,
  samples = Infinity,
): number {
  const index = Math.round((sample - bsize / 2) / ssize);
  return Math.min(index, numberOfBlocks(samples, bsize, ssize));
}

export function sampleToBlockCenter(
  sample: number,
  bsize: number,
  ssize: number,
  samples = Infinity,
): number {
  const index = sampleToBlockIndex(sample, bsize, ssize, samples);
  return blockIndexToCenter(index, bsize, ssize);
}

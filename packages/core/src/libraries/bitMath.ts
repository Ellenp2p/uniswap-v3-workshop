export function mostSignificantBit(x: bigint): number {
  if (x <= 0n) throw new Error("x must be positive");

  let msb = 0;

  if (x >= 2n ** 128n) {
    x >>= 128n;
    msb += 128;
  }
  if (x >= 2n ** 64n) {
    x >>= 64n;
    msb += 64;
  }
  if (x >= 2n ** 32n) {
    x >>= 32n;
    msb += 32;
  }
  if (x >= 2n ** 16n) {
    x >>= 16n;
    msb += 16;
  }
  if (x >= 2n ** 8n) {
    x >>= 8n;
    msb += 8;
  }
  if (x >= 2n ** 4n) {
    x >>= 4n;
    msb += 4;
  }
  if (x >= 2n ** 2n) {
    x >>= 2n;
    msb += 2;
  }
  if (x >= 2n ** 1n) {
    msb += 1;
  }

  return msb;
}

export function leastSignificantBit(x: bigint): number {
  if (x <= 0n) throw new Error("x must be positive");

  let lsb = 0;

  if ((x & 0xffffffffffffffffffffffffffffffffn) === 0n) {
    x >>= 128n;
    lsb += 128;
  }
  if ((x & 0xffffffffffffffffn) === 0n) {
    x >>= 64n;
    lsb += 64;
  }
  if ((x & 0xffffffffn) === 0n) {
    x >>= 32n;
    lsb += 32;
  }
  if ((x & 0xffffn) === 0n) {
    x >>= 16n;
    lsb += 16;
  }
  if ((x & 0xffn) === 0n) {
    x >>= 8n;
    lsb += 8;
  }
  if ((x & 0xfn) === 0n) {
    x >>= 4n;
    lsb += 4;
  }
  if ((x & 0x3n) === 0n) {
    x >>= 2n;
    lsb += 2;
  }
  if ((x & 0x1n) === 0n) {
    lsb += 1;
  }

  return lsb;
}

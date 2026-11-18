/**
 * The smallest bytes image-size reads as a JPEG of the given size: SOI, a
 * JFIF APP0 segment (the reader skips the first segment), SOF0 and EOI.
 * `padding` zero bytes make the file as heavy as a test needs.
 */
export function jpeg(width: number, height: number, padding = 0): Uint8Array {
  const app0 = [
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ];
  const sof = [
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ];
  const bytes = new Uint8Array(2 + app0.length + sof.length + padding + 2);
  bytes.set([0xff, 0xd8], 0);
  bytes.set(app0, 2);
  bytes.set(sof, 2 + app0.length);
  bytes.set([0xff, 0xd9], bytes.length - 2);
  return bytes;
}

/** A PNG signature and IHDR chunk: a valid image, just not a JPEG. */
export function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

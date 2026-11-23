// news-image-20261123 — "The World in One Day"
// One image summing up Monday 23 November 2026.
// Pure Node 22 stdlib: draws a 1024x1024 atlas-style PNG (own rasterizer,
// own 5x7 bitmap font, own PNG encoder) and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
// Deterministic: no network, no clock, no randomness — two runs give the
// same bytes.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const NAVY = [10, 20, 36, 255]; // page background
const NAVY2 = [16, 32, 56, 255]; // panel background
const NAVY3 = [22, 44, 74, 255]; // panel edge
const GRID = [38, 62, 96, 255]; // graticule
const LAND = [201, 162, 39, 255]; // continents (atlas gold)
const LAND_DK = [160, 126, 28, 255]; // continent outline
const CREAM = [242, 234, 216, 255]; // headline text
const GOLD = [232, 184, 64, 255]; // accents
const MUTED = [168, 184, 204, 255]; // secondary text
const RED = [228, 87, 46, 255]; // story pins
const WHITE = [255, 255, 255, 255];

// ---------------------------------------------------------------- canvas
const px = new Uint8ClampedArray(W * H * 4);
function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
}
function fillRect(x0: number, y0: number, w: number, h: number, c: number[]): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) setPixel(x, y, c);
}
function fillCircle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
}
function ring(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function drawLine(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= n; i++) {
    setPixel(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), c);
  }
}
// Scanline polygon fill.
function fillPolygon(pts: [number, number][], c: number[]): void {
  let minY = H, maxY = 0;
  for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPixel(x, y, c);
    }
  }
}
function strokePolygon(pts: [number, number][], c: number[]): void {
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    drawLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, each a 5-bit number (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '\u2022': [0, 0, 0x04, 0x0e, 0x0e, 0x04, 0],
};
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r] & (1 << (4 - col))) fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(y: number, s: string, scale: number, c: number[]): void {
  drawText(Math.round((W - textWidth(s, scale)) / 2), y, s, scale, c);
}

// ---------------------------------------------------------------- map
// Equirectangular projection into the map frame.
const MAP = { x0: 24, y0: 138, x1: 1000, y1: 528 };
function proj(lon: number, lat: number): [number, number] {
  const x = MAP.x0 + ((lon + 180) / 360) * (MAP.x1 - MAP.x0);
  const y = MAP.y0 + ((75 - lat) / (75 + 60)) * (MAP.y1 - MAP.y0);
  return [Math.round(x), Math.round(y)];
}
function land(poly: [number, number][]): void {
  const pts = poly.map(([lo, la]) => proj(lo, la));
  fillPolygon(pts, LAND);
  strokePolygon(pts, LAND_DK);
}

const NORTH_AMERICA: [number, number][] = [
  [-168, 66], [-155, 58], [-140, 60], [-130, 54], [-124, 48], [-125, 40],
  [-120, 34], [-114, 29], [-110, 23], [-105, 20], [-97, 16], [-92, 15],
  [-86, 12], [-83, 9], [-79, 9], [-83, 15], [-90, 14], [-97, 16], [-95, 19],
  [-90, 21], [-84, 30], [-81, 26], [-80, 32], [-75, 35], [-70, 42],
  [-60, 47], [-55, 52], [-60, 62], [-75, 72], [-85, 70], [-95, 80],
  [-110, 73], [-125, 72], [-140, 70], [-155, 71], [-168, 66],
];
const GREENLAND: [number, number][] = [
  [-58, 64], [-45, 60], [-40, 65], [-30, 68], [-22, 70], [-25, 76],
  [-40, 80], [-58, 76], [-68, 70], [-58, 64],
];
const SOUTH_AMERICA: [number, number][] = [
  [-79, 9], [-72, 12], [-64, 10], [-60, 8], [-52, 5], [-50, 0], [-44, -3],
  [-35, -8], [-40, -20], [-48, -28], [-58, -35], [-65, -41], [-68, -50],
  [-70, -54], [-73, -50], [-73, -40], [-72, -30], [-70, -18], [-77, -12],
  [-81, -6], [-80, 0], [-79, 9],
];
const AFRICA: [number, number][] = [
  [-6, 35], [-10, 31], [-17, 15], [-17, 12], [-12, 8], [-8, 5], [-4, 5],
  [6, 4], [9, 4], [12, -2], [13, -12], [12, -18], [16, -28], [20, -35],
  [26, -34], [32, -26], [35, -20], [40, -15], [40, -10], [46, -2], [51, 2],
  [51, 11], [44, 11], [40, 15], [38, 18], [35, 22], [32, 31], [22, 33],
  [11, 34], [10, 37], [-6, 35],
];
const EURASIA: [number, number][] = [
  [-10, 36], [-9, 43], [-2, 44], [-1, 46], [-4, 48], [0, 50], [2, 51],
  [5, 53], [8, 57], [10, 59], [5, 60], [5, 62], [12, 65], [18, 69],
  [25, 71], [30, 70], [40, 68], [50, 69], [60, 69], [70, 72], [80, 73],
  [90, 75], [100, 76], [110, 74], [120, 73], [130, 72], [140, 72],
  [150, 70], [160, 70], [170, 67], [178, 65], [178, 62], [170, 60],
  [162, 56], [158, 52], [150, 59], [142, 54], [140, 45], [135, 43],
  [130, 42], [127, 40], [122, 38], [120, 32], [122, 28], [118, 25],
  [110, 20], [108, 18], [105, 10], [103, 8], [100, 7], [98, 10], [94, 16],
  [92, 21], [89, 22], [86, 20], [80, 13], [77, 8], [75, 12], [72, 20],
  [66, 25], [61, 25], [57, 26], [52, 28], [50, 29], [48, 30], [44, 29],
  [40, 30], [36, 36], [30, 36], [26, 38], [22, 37], [19, 42], [12, 44],
  [8, 44], [3, 43], [0, 40], [-2, 37], [-6, 36], [-9, 37], [-10, 36],
];
const AUSTRALIA: [number, number][] = [
  [114, -22], [114, -30], [115, -35], [120, -34], [124, -33], [129, -32],
  [132, -32], [136, -35], [140, -38], [145, -38], [150, -37], [153, -32],
  [153, -27], [150, -23], [146, -19], [142, -15], [142, -11], [137, -12],
  [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20],
  [114, -22],
];
const UK: [number, number][] = [[-5, 50], [-3, 53], [-5, 56], [-3, 58], [-1, 57], [0, 53], [1, 51], [-5, 50]];
const JAPAN: [number, number][] = [
  [130, 31], [132, 33], [135, 34], [137, 35], [139, 36], [140, 38],
  [141, 41], [142, 44], [140, 45], [139, 40], [137, 37], [134, 34], [131, 32],
];
const INDONESIA: [number, number][] = [
  [95, 5], [100, 0], [104, -3], [106, -6], [110, -7], [114, -8], [119, -9],
  [120, -10], [114, -9], [108, -7], [104, -5], [98, 2], [95, 5],
];
const NEW_GUINEA: [number, number][] = [
  [131, -1], [136, -2], [141, -3], [146, -6], [150, -8], [147, -9],
  [141, -8], [136, -6], [131, -2],
];
const MADAGASCAR: [number, number][] = [
  [44, -16], [47, -15], [50, -16], [49, -20], [47, -24], [45, -25], [43, -21], [44, -16],
];
const NEW_ZEALAND: [number, number][] = [
  [167, -45], [170, -42], [174, -39], [176, -38], [178, -37], [175, -40],
  [172, -43], [168, -46], [167, -45],
];

function drawPin(n: number, lon: number, lat: number): void {
  const [x, y] = proj(lon, lat);
  fillCircle(x, y, 14, RED);
  ring(x, y, 14, WHITE);
  ring(x, y, 17, RED);
  drawText(x - (textWidth(String(n), 2) >> 1), y - 7, String(n), 2, WHITE);
}

// ---------------------------------------------------------------- stories
interface Story {
  n: number;
  head: string;
  sub1: string;
  sub2: string;
  pin?: [number, number]; // lon, lat on the map
}
const STORIES: Story[] = [
  { n: 1, head: 'COP31 COLLAPSES', sub1: 'CLIMATE TALKS BREAK DOWN', sub2: 'NO DEAL IN BELEM', pin: [-48, -1] },
  { n: 2, head: 'TANKER HIT IN HORMUZ', sub1: 'TANKER ATTACKED IN THE STRAIT', sub2: 'SHIPPING ON EDGE', pin: [56, 26] },
  { n: 3, head: 'SEA DRONE OFF BENGHAZI', sub1: 'UNCREWED VESSEL INCIDENT', sub2: 'OFF THE LIBYAN COAST', pin: [20, 32] },
  { n: 4, head: 'DYMER', sub1: 'ONE NAME, MANY HEADLINES', sub2: "THE DAY'S OTHER BIG STORY" },
  { n: 5, head: 'MISSILES HIT POLAND', sub1: 'STRIKES CROSS INTO POLAND', sub2: 'NATO ON ALERT', pin: [19, 52] },
  { n: 6, head: 'BEPICOLOMBO AT MERCURY', sub1: 'PROBE ENTERS ORBIT AROUND', sub2: 'THE SMALLEST PLANET' },
  { n: 7, head: 'US MARKETS TUMBLE', sub1: 'WALL STREET SLIDES SHARPLY', sub2: 'SELL-OFF HITS US STOCKS', pin: [-74, 41] },
  { n: 8, head: 'FIRE IN CIKANDE, BANTEN', sub1: 'BLAZE ENGULFS INDUSTRIAL', sub2: 'AREA IN BANTEN, INDONESIA', pin: [106, -6] },
];

// ---------------------------------------------------------------- compose
// Background: vertical navy gradient.
for (let y = 0; y < H; y++) {
  const t = y / H;
  const c = [
    Math.round(10 + 6 * t),
    Math.round(20 + 10 * t),
    Math.round(36 + 16 * t),
    255,
  ];
  fillRect(0, y, W, 1, c);
}
// Gold rules.
fillRect(24, 20, W - 48, 3, GOLD);
fillRect(24, 1006, W - 48, 3, GOLD);

// Header.
drawTextCentered(32, 'THE WORLD IN ONE DAY', 2, GOLD);
drawTextCentered(56, '23 NOVEMBER 2026', 6, CREAM);
drawTextCentered(116, 'MONDAY - EIGHT STORIES THAT DEFINED THE DAY', 2, MUTED);

// Map frame + graticule.
fillRect(MAP.x0 - 2, MAP.y0 - 2, MAP.x1 - MAP.x0 + 4, MAP.y1 - MAP.y0 + 4, NAVY3);
for (let lon = -150; lon <= 150; lon += 30) {
  const [x] = proj(lon, 0);
  drawLine(x, MAP.y0, x, MAP.y1, GRID);
}
for (let lat = -60; lat <= 60; lat += 30) {
  const [, y] = proj(0, lat);
  drawLine(MAP.x0, y, MAP.x1, y, GRID);
}
for (const poly of [NORTH_AMERICA, GREENLAND, SOUTH_AMERICA, AFRICA, EURASIA, AUSTRALIA, UK, JAPAN, INDONESIA, NEW_GUINEA, MADAGASCAR, NEW_ZEALAND]) land(poly);

// Mercury callout (story 6): a small planet in the sky, top-right of the map.
fillCircle(928, 168, 15, GOLD);
fillCircle(923, 163, 3, LAND_DK);
fillCircle(933, 172, 2, LAND_DK);
ring(928, 168, 15, CREAM);
ring(928, 168, 21, GOLD);
drawText(928 - 4, 196, '6', 2, GOLD);
drawText(880, 212, 'MERCURY', 1, MUTED);

// Story pins.
for (const s of STORIES) if (s.pin) drawPin(s.n, s.pin[0], s.pin[1]);

// Map caption.
drawText(MAP.x0 + 4, MAP.y1 - 18, 'EVERY PIN IS A STORY BELOW', 1, MUTED);
drawText(MAP.x1 - textWidth('ATLAS OF ONE DAY', 1) - 4, MAP.y1 - 18, 'ATLAS OF ONE DAY', 1, MUTED);

// Story cards: 2 columns x 4 rows.
const CARD_W = 472, CARD_H = 100, GAP = 12;
const COLS = [24, 24 + CARD_W + GAP];
const ROWS = [544, 544 + CARD_H + GAP, 544 + 2 * (CARD_H + GAP), 544 + 3 * (CARD_H + GAP)];
STORIES.forEach((s, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = COLS[col], y = ROWS[row];
  fillRect(x, y, CARD_W, CARD_H, NAVY2);
  fillRect(x, y, CARD_W, 3, GOLD);
  // Number badge.
  fillRect(x + 14, y + 14, 36, 36, RED);
  drawText(x + 14 + (36 - textWidth(String(s.n), 3)) / 2, y + 22, String(s.n), 3, WHITE);
  // Headline + detail lines.
  drawText(x + 62, y + 14, s.head, 3, CREAM);
  drawText(x + 62, y + 46, s.sub1, 2, MUTED);
  drawText(x + 62, y + 70, s.sub2, 2, MUTED);
  // Small planet mark on the Mercury card, bottom-right corner where the
  // detail lines do not reach.
  if (s.n === 6) {
    fillCircle(x + CARD_W - 30, y + 82, 9, GOLD);
    fillCircle(x + CARD_W - 34, y + 79, 2, LAND_DK);
    ring(x + CARD_W - 30, y + 82, 13, GOLD);
  }
});

// Footer.
drawTextCentered(990, 'MAKE.FUN - ONE DAY, ONE PICTURE', 1, MUTED);

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter: none
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes, ${W}x${H})`);

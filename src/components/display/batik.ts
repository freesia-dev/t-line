// Motif sulur "S" bergaya ukiran Dayak untuk layout "Papan Telihan".
// Digambar ulang secara geometris, bukan salinan motif tertentu.

type Pt = [number, number];

const fmt = (n: number) => n.toFixed(1);

/** Satu sulur "S": spiral kiri keluar -> lengkung -> spiral kanan masuk. Pusat di (0,0). */
const sScroll = (d: number, R: number, rIn: number, turns: number, n = 40): string => {
  const A: Pt[] = [];
  const endA = -Math.PI / 2;
  const startA = endA - turns * 2 * Math.PI;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = startA + (endA - startA) * t;
    const r = rIn + (R - rIn) * t;
    A.push([-d + r * Math.cos(a), r * Math.sin(a)]);
  }
  const B: Pt[] = [];
  const sB = Math.PI / 2;
  const eB = sB - turns * 2 * Math.PI;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = sB + (eB - sB) * t;
    const r = R - (R - rIn) * t;
    B.push([d + r * Math.cos(a), r * Math.sin(a)]);
  }
  const k = d * 0.9;
  let s = 'M' + A.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L');
  s += ` C${fmt(-d + k)},${fmt(-R)} ${fmt(d - k)},${fmt(R)} ${fmt(B[0][0])},${fmt(B[0][1])}`;
  s += ' L' + B.slice(1).map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L');
  return s;
};

const BIG = sScroll(25, 17, 2.5, 1.3);
const SMALL = sScroll(19, 12.5, 2, 1.2);

const pinwheel = (cx: number, cy: number, path: string, off: number, mirror = false) =>
  [0, 90, 180, 270]
    .map(
      (rot) =>
        `<g transform="translate(${cx} ${cy})${mirror ? ' scale(-1 1)' : ''} rotate(${rot}) translate(0 ${-off}) rotate(-30)"><path d="${path}"/></g>`,
    )
    .join('');

const tileSvg = (color: string) => {
  const parts: string[] = [pinwheel(100, 100, BIG, 48)];
  parts.push(
    `<path d="M100,84 L116,100 L100,116 L84,100 Z"/><circle cx="100" cy="100" r="4" fill="${color}" stroke="none"/>`,
  );
  for (const [x, y] of [
    [0, 0],
    [200, 0],
    [0, 200],
    [200, 200],
  ]) {
    parts.push(pinwheel(x, y, SMALL, 38, true));
    parts.push(`<circle cx="${x}" cy="${y}" r="6"/>`);
  }
  return `<g fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g>`;
};

/** Data-URI untuk background-image berulang. */
export const batikPattern = (color: string, opacity: number, size: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200"><g opacity="${opacity}">${tileSvg(color)}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

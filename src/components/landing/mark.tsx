/**
 * Shared brand mark used by the generated favicon/app icon and the OG image
 * (src/app/icon.tsx, apple-icon.tsx, opengraph-image.tsx). Deliberately
 * plain inline styles / simple shapes only — this JSX is rendered by
 * `ImageResponse` (satori), which supports a limited CSS subset, not a
 * real browser.
 */
export function BrandMark({ size, background = "#4f46e5" }: { size: number; background?: string }) {
  const stroke = size * 0.1;
  const ringDiameter = size * 0.46;
  const ringRadius = ringDiameter / 2;
  // Ring center biased toward the top-left so the handle has room to extend
  // to the bottom-right without leaving the icon's bounds.
  const cx = size * 0.42;
  const cy = size * 0.42;
  const handleLength = size * 0.28;
  // Point on the ring's circumference at 45°, where the handle attaches.
  const attachX = cx + ringRadius * Math.SQRT1_2;
  const attachY = cy + ringRadius * Math.SQRT1_2;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        background,
        borderRadius: size * 0.22,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cx - ringRadius,
          top: cy - ringRadius,
          width: ringDiameter,
          height: ringDiameter,
          borderRadius: "50%",
          border: `${stroke}px solid white`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: attachX,
          top: attachY - stroke / 2,
          width: handleLength,
          height: stroke,
          background: "white",
          borderRadius: stroke,
          transform: "rotate(45deg)",
          transformOrigin: "0% 50%",
          display: "flex",
        }}
      />
    </div>
  );
}

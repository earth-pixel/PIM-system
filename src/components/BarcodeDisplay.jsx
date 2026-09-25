import React, { useMemo } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * BarcodeDisplay
 *
 * Renders an industry-standard Code 128 barcode as a pure vector SVG element.
 *
 * Why SVG vector rects:
 * 1. 100% immune to html2canvas / html2pdf Flexbox height collapse bugs in table cells.
 * 2. 100% immune to html2canvas Base64 image skip / blank rendering bugs in cloned iframes.
 * 3. Exact SVG coordinate system: every vertical bar has explicit width & height.
 * 4. Razor-sharp vector precision: scans reliably with any handheld scanner at any zoom level.
 */
export default function BarcodeDisplay({
  value,
  height = 46,
  maxWidth = 175,
  fontSize = 12,
  showText = true,
  className = '',
  containerStyle = {},
}) {
  const barcodeText = value ? String(value).trim() : '';

  const barcodeData = useMemo(() => {
    if (!barcodeText) return null;
    try {
      const CODE128 = JsBarcode.getModule('CODE128');
      const barcode = new CODE128(barcodeText, { text: barcodeText });
      if (!barcode.valid()) return null;
      const enc = barcode.encode();
      const binary = enc.data;
      if (!binary) return null;

      const rects = [];
      let cur = 0;
      while (cur < binary.length) {
        if (binary[cur] === '1') {
          const start = cur;
          while (cur < binary.length && binary[cur] === '1') cur++;
          rects.push({ x: start, w: cur - start });
        } else {
          cur++;
        }
      }

      const margin = 12; // Generous Quiet Zone for rapid barcode scanner detection
      const totalWidth = binary.length + margin * 2;
      const totalHeight = height + (showText ? fontSize + 8 : 4);

      return {
        rects,
        totalWidth,
        totalHeight,
        margin,
        text: enc.text || barcodeText,
      };
    } catch (err) {
      console.warn('[BarcodeDisplay] Failed to encode Code 128 SVG:', barcodeText, err?.message);
      return null;
    }
  }, [barcodeText, height, fontSize, showText]);

  if (!barcodeText) {
    return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '10px' }}>—</span>;
  }

  if (!barcodeData) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: `${fontSize}px`, fontWeight: 700, color: '#111111' }}>
        {barcodeText}
      </span>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'block',
        textAlign: 'center',
        margin: '0 auto',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        width: '100%',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        ...containerStyle,
      }}
    >
      <svg
        viewBox={`0 0 ${barcodeData.totalWidth} ${barcodeData.totalHeight}`}
        width="100%"
        height={barcodeData.totalHeight}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          height: 'auto',
          maxHeight: `${barcodeData.totalHeight}px`,
          margin: '0 auto',
          backgroundColor: '#ffffff',
          overflow: 'visible',
        }}
        shapeRendering="crispEdges"
      >
        {/* Background */}
        <rect x="0" y="0" width={barcodeData.totalWidth} height={barcodeData.totalHeight} fill="#ffffff" />

        {/* Black barcode bars with crisp edges */}
        {barcodeData.rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x + barcodeData.margin}
            y="0"
            width={r.w}
            height={height}
            fill="#000000"
          />
        ))}

        {/* Centered human-readable barcode text */}
        {showText && (
          <text
            x={barcodeData.totalWidth / 2}
            y={height + fontSize + 3}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily="'Courier New', Courier, monospace"
            fontWeight="bold"
            fill="#000000"
            letterSpacing="0.8px"
          >
            {barcodeData.text}
          </text>
        )}
      </svg>
    </div>
  );
}



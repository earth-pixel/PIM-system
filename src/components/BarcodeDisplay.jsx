import React from 'react';
import { getCode128BWidths } from '../utils/barcode128';

/**
 * BarcodeDisplay
 *
 * Renders a crisp Code 128 barcode directly using native DOM/CSS elements (flex bars)
 * and monospace text.
 *
 * Why CSS bars instead of canvas/data-URL <img>:
 * - html2canvas clones the DOM and drops data-URL <img> elements whose naturalWidth
 *   is not yet populated, causing blank white boxes in generated PDFs.
 * - CSS flex spans with backgroundColor: '#000000' are rendered natively and synchronously
 *   by html2canvas using ctx.fillRect().
 * - 100% offline, zero network requests, zero decoding latency, and 100% immune to blank PDF issues.
 */
export default function BarcodeDisplay({
  value,
  height = 30,
  maxWidth = 120,
  fontSize = 9.5,
  showText = true,
  className = '',
  containerStyle = {},
}) {
  const barcodeText = value ? String(value).trim() : '';

  if (!barcodeText) {
    return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '10px' }}>—</span>;
  }

  const widths = getCode128BWidths(barcodeText);

  if (!widths || widths.length === 0) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: '#111111' }}>
        {barcodeText}
      </span>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        maxWidth: `${maxWidth}px`,
        width: '100%',
        boxSizing: 'border-box',
        ...containerStyle
      }}
    >
      {/* Black vertical barcode stripes */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: `${height}px`,
          width: '100%',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {widths.map((w, idx) => (
          <span
            key={idx}
            style={{
              flex: `${w} 0 0%`,
              height: '100%',
              backgroundColor: idx % 2 === 0 ? '#000000' : '#ffffff',
              display: 'block'
            }}
          />
        ))}
      </div>

      {/* Human-readable barcode number below stripes */}
      {showText && (
        <span
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color: '#111111',
            marginTop: '2px',
            letterSpacing: '0.04em',
            textAlign: 'center',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {barcodeText}
        </span>
      )}
    </div>
  );
}

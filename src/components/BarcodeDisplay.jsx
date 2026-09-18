import React, { useMemo } from 'react';
import { generateBarcodeDataUrl } from '../utils/barcodeUtils';

export default function BarcodeDisplay({
  value,
  height = 26,
  width = 1.6,
  fontSize = 9.5,
  showText = true,
  className = '',
  containerStyle = {},
  textStyle = {},
  imageStyle = {}
}) {
  const barcodeText = value ? String(value).trim() : '';

  const dataUrl = useMemo(() => {
    if (!barcodeText) return '';
    return generateBarcodeDataUrl(barcodeText, {
      height: Math.round(height * 1.6),
      width,
      margin: 1
    });
  }, [barcodeText, height, width]);

  if (!barcodeText) {
    return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>—</span>;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        color: '#111111',
        padding: '3px 6px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        ...containerStyle
      }}
      className={className}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={barcodeText}
          style={{
            height: `${height}px`,
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
            imageRendering: 'pixelated',
            ...imageStyle
          }}
        />
      ) : (
        <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '9px', color: '#64748b' }}>Barcode</span>
        </div>
      )}
      {showText && (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            fontWeight: 800,
            color: '#111111',
            letterSpacing: '0.4px',
            lineHeight: 1.1,
            marginTop: '2px',
            userSelect: 'all',
            ...textStyle
          }}
        >
          {barcodeText}
        </span>
      )}
    </div>
  );
}

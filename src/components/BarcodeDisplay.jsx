import React, { useMemo } from 'react';
import { generateBarcodeDataUrl } from '../utils/barcodeUtils';

export default function BarcodeDisplay({
  value,
  height = 36,
  width = 1.35,
  fontSize = 11,
  className = '',
  containerStyle = {},
  imageStyle = {}
}) {
  const barcodeText = value ? String(value).trim() : '';

  const dataUrl = useMemo(() => {
    if (!barcodeText) return '';
    return generateBarcodeDataUrl(barcodeText, {
      width,
      height: 28,
      fontSize,
      margin: 2
    });
  }, [barcodeText, width, fontSize]);

  if (!barcodeText) {
    return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>—</span>;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        padding: '2px 4px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        overflow: 'hidden',
        maxWidth: '100%',
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
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 700,
            color: '#111111',
            padding: '2px 4px'
          }}
        >
          {barcodeText}
        </span>
      )}
    </div>
  );
}

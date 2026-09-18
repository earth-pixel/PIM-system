import JsBarcode from 'jsbarcode';

/**
 * Generates an offline Data URL (PNG image) for a given barcode string.
 * Completely client-side, zero network calls, immune to CORS, offline-ready.
 *
 * @param {string} value - Barcode text/number (e.g. "8858890715038")
 * @param {object} options - Options for JsBarcode
 * @returns {string} Data URL (data:image/png;base64,...) or empty string
 */
export function generateBarcodeDataUrl(value, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  if (!value || !String(value).trim()) return '';

  const text = String(value).trim();
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: options.width || 1.8,
      height: options.height || 36,
      displayValue: false, // Text is displayed cleanly via HTML/CSS
      margin: options.margin ?? 2,
      background: options.background || '#ffffff',
      lineColor: options.lineColor || '#000000',
      valid: () => {},
      ...options
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`[barcodeUtils] Failed to generate barcode for "${text}":`, err.message);
    return '';
  }
}

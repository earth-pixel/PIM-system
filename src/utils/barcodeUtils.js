import JsBarcode from 'jsbarcode';

/**
 * Generates an offline Data URL (PNG image) for a given barcode string.
 * Both the barcode stripes and human-readable text are drawn directly
 * onto the canvas bitmap, ensuring zero overlapping and perfect PDF rendering.
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
      width: options.width || 1.35,
      height: options.height || 30,
      displayValue: options.displayValue !== false, // Draws number directly below stripes
      font: 'monospace',
      fontSize: options.fontSize || 11,
      textMargin: 2,
      margin: options.margin ?? 3,
      background: options.background || '#ffffff',
      lineColor: options.lineColor || '#000000'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`[barcodeUtils] Failed to generate barcode for "${text}":`, err.message);
    return '';
  }
}

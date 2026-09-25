/**
 * Scanner utility functions for barcode and sound feedback
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play an audible beep for barcode scanner feedback.
 * @param {'success' | 'error'} type
 */
export function playScanBeep(type = 'success') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'success') {
      // Short crisp high beep (1760Hz, ~80ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      // Low tone buzz for error (220Hz, ~200ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Graceful fallback if audio is blocked or unsupported
  }
}

/**
 * Thai Kedmanee keyboard layout mapping to English/Numbers.
 * Essential for barcode scanners in Thailand when Windows keyboard language is set to TH.
 */
const THAI_KEDMANEE_MAP = {
  // Numbers row (unmodified)
  'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5', 'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=',
  // Numbers row with Shift (Thai digits & symbols)
  '+': '1', '๑': '1', '๒': '2', '๓': '3', '๔': '4', 'ู': '6', '฿': '7', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9', '๐': '0',
  // Top letter row
  'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't', 'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']',
  // Home letter row
  'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g', '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',
  // Bottom letter row
  'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ท': 'b', 'ม': 'm', 'ใ': ',', 'ฝ': '.'
};

/**
 * Converts text typed from a barcode scanner under Thai keyboard layout back to English/Numbers.
 * E.g. "คคถคคตจึๅุๅ-ภ" -> "8858890716134"
 */
export function convertThaiScannerInput(str = '') {
  if (!str) return '';
  return String(str)
    .split('')
    .map(c => THAI_KEDMANEE_MAP[c] || c)
    .join('');
}

/**
 * Find a product or variant by exact barcode, SKU, or code match.
 * Automatically handles Thai keyboard input conversions.
 * @param {Array} products
 * @param {string} rawTerm
 * @returns {{ product: object, variant: object|null, variantIdx: number } | null}
 */
export function findProductByBarcodeOrCode(products = [], rawTerm = '') {
  if (!rawTerm || !Array.isArray(products) || products.length === 0) return null;
  const originalTerm = String(rawTerm).trim().toLowerCase();
  if (!originalTerm) return null;

  const searchFor = (term) => {
    // 1. Check exact barcode in variants
    for (const product of products) {
      if (Array.isArray(product.variants)) {
        for (let i = 0; i < product.variants.length; i++) {
          const v = product.variants[i];
          if (v?.barcode && String(v.barcode).trim().toLowerCase() === term) {
            return { product, variant: v, variantIdx: i };
          }
        }
      }
    }

    // 2. Check exact barcode on product
    for (const product of products) {
      if (product.barcode && String(product.barcode).trim().toLowerCase() === term) {
        const hasSingleVar = Array.isArray(product.variants) && product.variants.length === 1;
        return {
          product,
          variant: hasSingleVar ? product.variants[0] : null,
          variantIdx: hasSingleVar ? 0 : -1,
        };
      }
    }

    // 3. Check exact SKU / code in variants
    for (const product of products) {
      if (Array.isArray(product.variants)) {
        for (let i = 0; i < product.variants.length; i++) {
          const v = product.variants[i];
          const vCode = v?.sku || v?.code;
          if (vCode && String(vCode).trim().toLowerCase() === term) {
            return { product, variant: v, variantIdx: i };
          }
        }
      }
    }

    // 4. Check exact product code / SKU
    for (const product of products) {
      const pCode = product.code || product.sku;
      if (pCode && String(pCode).trim().toLowerCase() === term) {
        const hasSingleVar = Array.isArray(product.variants) && product.variants.length === 1;
        return {
          product,
          variant: hasSingleVar ? product.variants[0] : null,
          variantIdx: hasSingleVar ? 0 : -1,
        };
      }
    }

    return null;
  };

  // Try direct match first
  const directMatch = searchFor(originalTerm);
  if (directMatch) return directMatch;

  // If not found and term contains Thai characters, convert and retry
  const convertedTerm = convertThaiScannerInput(rawTerm).trim().toLowerCase();
  if (convertedTerm !== originalTerm) {
    return searchFor(convertedTerm);
  }

  return null;
}


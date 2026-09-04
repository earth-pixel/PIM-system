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
 * Find a product or variant by exact barcode, SKU, or code match.
 * @param {Array} products
 * @param {string} rawTerm
 * @returns {{ product: object, variant: object|null, variantIdx: number } | null}
 */
export function findProductByBarcodeOrCode(products = [], rawTerm = '') {
  if (!rawTerm || !Array.isArray(products) || products.length === 0) return null;
  const term = String(rawTerm).trim().toLowerCase();
  if (!term) return null;

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
}

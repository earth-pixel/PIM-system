/**
 * Utility functions for multi-code / multi-token product searching and bulk SKU analysis.
 */

/**
 * Check if a product matches a single token (code, barcode, SKU, name, or description).
 * Prioritizes exact matches on codes, SKUs, and barcodes.
 * 
 * @param {object} product - Product item
 * @param {string} token - Search token (already trimmed / lowercased or normalized)
 * @returns {boolean}
 */
export function doesProductMatchToken(product, token) {
  if (!token || !product) return false;
  const t = String(token).trim().toLowerCase();
  if (!t) return false;

  const prodCode = product.code ? String(product.code).trim().toLowerCase() : '';
  const prodBarcode = product.barcode ? String(product.barcode).trim().toLowerCase() : '';
  const prodName = product.name ? String(product.name).toLowerCase() : '';
  const prodDesc = product.description ? String(product.description).toLowerCase() : '';

  // 1. Exact matches on code / SKU / barcode
  if (prodCode === t) return true;
  if (prodBarcode === t) return true;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    for (const v of product.variants) {
      const vSku = v?.sku ? String(v.sku).trim().toLowerCase() : '';
      const vBarcode = v?.barcode ? String(v.barcode).trim().toLowerCase() : '';
      const vCode = v?.code ? String(v.code).trim().toLowerCase() : '';
      if (vSku === t || vBarcode === t || vCode === t) return true;
    }
  }

  // 2. Substring matches on code / barcode / SKU
  if (prodCode && prodCode.includes(t)) return true;
  if (prodBarcode && prodBarcode.includes(t)) return true;

  // 3. Substring matches on product name or description
  if (prodName && prodName.includes(t)) return true;
  if (prodDesc && prodDesc.includes(t)) return true;

  // 4. Substring matches on variant options or SKUs
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    for (const v of product.variants) {
      const vSku = v?.sku ? String(v.sku).trim().toLowerCase() : '';
      const vBarcode = v?.barcode ? String(v.barcode).trim().toLowerCase() : '';
      if ((vSku && vSku.includes(t)) || (vBarcode && vBarcode.includes(t))) return true;

      if (Array.isArray(v?.options)) {
        for (const opt of v.options) {
          if (opt?.value && String(opt.value).toLowerCase().includes(t)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Parse a raw search query string into clean tokens.
 * Supports:
 * - Delimiters: comma (,), semicolon (;), pipe (|), newline (\n), carriage return (\r), tab (\t)
 * - Space-separated fallback: If no explicit delimiters exist, but query has spaces,
 *   we check if any single product matches the full phrase. If not, and tokens match
 *   product codes/SKUs, it treats them as multiple tokens.
 * 
 * @param {string} rawQuery 
 * @param {Array} [products=[]] - Optional products list to help distinguish phrases vs multiple codes
 * @returns {string[]} Array of distinct trimmed search tokens
 */
export function parseSearchTokens(rawQuery, products = []) {
  if (!rawQuery) return [];
  const trimmed = String(rawQuery).trim();
  if (!trimmed) return [];

  // 1. Explicit multi-item delimiters: , ; | \n \r \t
  if (/[,;\t\n\r|]/.test(trimmed)) {
    const tokens = trimmed
      .split(/[,;\t\n\r|]+/)
      .map(s => s.trim())
      .filter(Boolean);
    // Return unique tokens while preserving order
    return Array.from(new Set(tokens));
  }

  // 2. Query contains whitespace (e.g. space)
  if (/\s+/.test(trimmed)) {
    const spaceTokens = trimmed.split(/\s+/).map(s => s.trim()).filter(Boolean);

    // If products array is provided, let's see if the full phrase matches any product
    if (Array.isArray(products) && products.length > 0) {
      const fullPhraseLower = trimmed.toLowerCase();
      const hasFullPhraseMatch = products.some(p => {
        const pName = p.name ? String(p.name).toLowerCase() : '';
        const pDesc = p.description ? String(p.description).toLowerCase() : '';
        const pCode = p.code ? String(p.code).toLowerCase() : '';
        return pName.includes(fullPhraseLower) || pDesc.includes(fullPhraseLower) || pCode.includes(fullPhraseLower);
      });

      // If full phrase matches a product (e.g. "Good All Day" or "กู๊ด ออล เดย์"), keep as single query
      if (hasFullPhraseMatch) {
        return [trimmed];
      }

      // Check if spaceTokens look like individual product codes or SKUs
      const codeMatchCount = spaceTokens.filter(token => {
        const tLower = token.toLowerCase();
        return products.some(p => {
          const pCode = p.code ? String(p.code).trim().toLowerCase() : '';
          const pBarcode = p.barcode ? String(p.barcode).trim().toLowerCase() : '';
          const hasVarSku = Array.isArray(p.variants) && p.variants.some(v => {
            const vSku = v?.sku ? String(v.sku).trim().toLowerCase() : '';
            const vBarcode = v?.barcode ? String(v.barcode).trim().toLowerCase() : '';
            return vSku === tLower || vBarcode === tLower;
          });
          return pCode === tLower || pBarcode === tLower || hasVarSku;
        });
      }).length;

      // If 2 or more spaceTokens match product codes/barcodes/SKUs, treat as multiple tokens
      if (codeMatchCount >= 2 || (spaceTokens.length === 2 && codeMatchCount >= 1)) {
        return Array.from(new Set(spaceTokens));
      }
    }

    return [trimmed];
  }

  return [trimmed];
}

/**
 * Filter an array of products by raw multi-search query.
 * If query is empty, returns all products.
 * If query has multiple tokens, a product matches if it matches ANY token (OR logic).
 * 
 * @param {Array} products 
 * @param {string} rawQuery 
 * @returns {Array} Filtered products
 */
export function filterProductsByMultiSearch(products = [], rawQuery = '') {
  if (!Array.isArray(products) || products.length === 0) return [];
  if (!rawQuery || !rawQuery.trim()) return products;

  const tokens = parseSearchTokens(rawQuery, products);
  if (tokens.length === 0) return products;

  if (tokens.length === 1) {
    const singleToken = tokens[0];
    return products.filter(p => doesProductMatchToken(p, singleToken));
  }

  return products.filter(p => {
    return tokens.some(token => doesProductMatchToken(p, token));
  });
}

/**
 * Analyze a bulk raw text of codes (e.g. pasted from an Excel column).
 * Returns matched products, missing codes, and summary stats.
 * 
 * @param {Array} products - Catalog of products
 * @param {string} rawInput - Text containing codes
 * @returns {{
 *   tokens: string[],
 *   matchedProducts: Array,
 *   missingCodes: string[],
 *   foundCount: number,
 *   totalCodes: number
 * }}
 */
export function analyzeBulkCodes(products = [], rawInput = '') {
  if (!rawInput || !rawInput.trim()) {
    return {
      tokens: [],
      matchedProducts: [],
      missingCodes: [],
      foundCount: 0,
      totalCodes: 0
    };
  }

  // Parse lines or delimiters
  const lines = rawInput
    .split(/[\r\n,;\t|]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const tokens = Array.from(new Set(lines));
  const matchedProductMap = new Map();
  const missingCodes = [];

  for (const token of tokens) {
    let tokenMatched = false;
    for (const product of products) {
      if (doesProductMatchToken(product, token)) {
        tokenMatched = true;
        const key = product.id || product.code || product.name;
        if (!matchedProductMap.has(key)) {
          matchedProductMap.set(key, product);
        }
      }
    }
    if (!tokenMatched) {
      missingCodes.push(token);
    }
  }

  const matchedProducts = Array.from(matchedProductMap.values());

  return {
    tokens,
    matchedProducts,
    missingCodes,
    foundCount: matchedProducts.length,
    totalCodes: tokens.length
  };
}

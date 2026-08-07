// Code 128 (Subset B) Barcode Widths Generator
// Standard ISO/IEC 15417 width patterns. 
// Alternates bars (even index) and spaces (odd index).

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "312212", "321122", "321211", "332111", "314111", // 20-29
  "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", // 30-39
  "122114", "122411", "142112", "142211", "241211", "221114", "213113", "213311", "243111", "111242", // 40-49
  "111342", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 50-59
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "134111", "111233", "111332", // 60-69
  "111431", "113113", "113311", "131113", "131311", "112313", "132113", "132311", "211313", "231113", // 70-79
  "231311", "112133", "112331", "132131", "113132", "113231", "311132", "311231", "311321", "311123", // 80-89
  "311222", "312122", "312211", "321112", "321211", "331111", "211133", "231131", "233111", "311113", // 90-99
  "311311", "331113", "331311", "211412", "211214", "211232", "2331112" // 100-106 (Start A, Start B, Start C, Stop)
];

/**
 * Encodes string to Code 128 (Subset B) pattern width array
 * @param {string} text - Alphanumeric string to encode
 * @returns {number[]} Array of alternating bar and space module widths
 */
export function getCode128BWidths(text) {
  if (!text) return [];

  // Start with Start Code B (index 104)
  const codeValues = [104];

  // Convert characters to Code 128 B values (ASCII - 32)
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    let val = charCode - 32;
    if (val < 0 || val > 95) {
      val = 0; // Replace unsupported characters with space (val 0)
    }
    codeValues.push(val);
  }

  // Calculate Modulo 103 checksum
  let sum = codeValues[0]; // Start code weight is 1
  for (let i = 1; i < codeValues.length; i++) {
    sum += codeValues[i] * i;
  }
  const checksum = sum % 103;
  codeValues.push(checksum);

  // Append Stop code (index 106)
  codeValues.push(106);

  // Map values to module widths
  const widths = [];
  codeValues.forEach((val) => {
    const pattern = CODE128_PATTERNS[val];
    for (let j = 0; j < pattern.length; j++) {
      widths.push(parseInt(pattern[j], 10));
    }
  });

  return widths;
}

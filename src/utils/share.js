
export function encodeQuotation(quotation) {
  try {
    const jsonStr = JSON.stringify(quotation);
    // Encode unicode characters safely to a byte string
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    // Convert to Base64
    const base64 = btoa(utf8Bytes);
    // Convert to URL-safe Base64 (replace +, / and trim =)
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Error encoding quotation:', err);
    return '';
  }
}

export function decodeQuotation(shareData) {
  try {
    if (!shareData) return null;
    // Restore standard Base64 characters
    let base64 = shareData.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding back if necessary
    while (base64.length % 4) {
      base64 += '=';
    }
    // Decode Base64 back to byte string
    const utf8Bytes = atob(base64);
    // Convert byte string back to original UTF-8 string
    const jsonStr = decodeURIComponent(
      utf8Bytes
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Error decoding quotation:', err);
    return null;
  }
}

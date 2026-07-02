/**
 * Marketplace Mandatory-Columns Exports
 * Phanvadee Co., Ltd. PIM System
 *
 * Consolidates Lazada, Shopee, and TikTok Shop mandatory export templates.
 * One file containing all three platform-specific workbook builders.
 *
 * Place this file at: src/utils/marketplaceTemplates.js
 */

// ===========================================================================
// 1. LAZADA TEMPLATE CONFIG & FUNCTION (Imported from lazadaTemplate.js)
// ===========================================================================
export { exportToLazadaMandatory, LAZADA_MANDATORY_COLUMNS } from './lazadaTemplate';

// ===========================================================================
// 2. SHOPEE TEMPLATE CONFIG & FUNCTION (Imported from shopeeTemplate.js)
// ===========================================================================
export { exportToShopeeMandatory, SHOPEE_MANDATORY_COLUMNS } from './shopeeTemplate';



// ===========================================================================
// 3. TIKTOK SHOP TEMPLATE CONFIG & FUNCTION (Imported from tiktokTemplate.js)
// ===========================================================================
export { exportToTiktokMandatory, TIKTOK_MANDATORY_COLUMNS } from './tiktokTemplate';

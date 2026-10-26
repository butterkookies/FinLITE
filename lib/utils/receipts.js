/**
 * Universal receipt resolution utility for FinLITE.
 * Safely extracts an array of valid image/PDF receipt URLs from any transaction object,
 * checking 3NF child records (transaction_receipts), receipt_urls array, and legacy receipt_url.
 *
 * @param {object|string|null} tx
 * @returns {string[]}
 */
export function getReceiptUrls(tx) {
  if (!tx) return [];

  // If passed a direct URL string
  if (typeof tx === 'string') {
    const trimmed = tx.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (typeof tx !== 'object') return [];

  // 1. Normalized 3NF child records
  if (Array.isArray(tx.transaction_receipts) && tx.transaction_receipts.length > 0) {
    const sorted = [...tx.transaction_receipts].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));
    const urls = sorted
      .map((r) => (typeof r === 'string' ? r : r?.public_url || r?.file_url))
      .filter((u) => Boolean(u) && typeof u === 'string' && u.trim().length > 0);
    // Prioritize non-blob URLs over stale temporary blob URLs
    const nonBlobUrls = urls.filter((u) => !u.startsWith('blob:'));
    if (nonBlobUrls.length > 0) return nonBlobUrls;
    if (urls.length > 0) return urls;
  }

  // 2. Array column (receipt_urls)
  if (Array.isArray(tx.receipt_urls) && tx.receipt_urls.length > 0) {
    const urls = tx.receipt_urls
      .filter((u) => Boolean(u) && typeof u === 'string' && u.trim().length > 0);
    const nonBlobUrls = urls.filter((u) => !u.startsWith('blob:'));
    if (nonBlobUrls.length > 0) return nonBlobUrls;
    if (urls.length > 0) return urls;
  }

  // 3. Single legacy column (receipt_url)
  if (tx.receipt_url && typeof tx.receipt_url === 'string' && tx.receipt_url.trim().length > 0) {
    return [tx.receipt_url.trim()];
  }

  return [];
}

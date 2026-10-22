/**
 * Utility functions for transactions, date/time formatting, and multi-column sorting.
 */

export function formatFriendlyDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const raw = String(dateStr).split('T')[0];
    const parts = raw.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (_) {
    return dateStr;
  }
}

export function formatFriendlyTime(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return null;
  }
}

export function getTransactionTimestamp(tx) {
  if (tx?.created_at) {
    const parsed = new Date(tx.created_at).getTime();
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (tx?.updated_at) {
    const parsed = new Date(tx.updated_at).getTime();
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (typeof tx?.id === 'string') {
    const match = tx.id.match(/\d{10,}/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

export function sortTransactions(list = [], sortField = 'date', sortDirection = 'desc') {
  const cloned = [...list];
  return cloned.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      const dateA = a.transaction_date || '';
      const dateB = b.transaction_date || '';
      comparison = dateA.localeCompare(dateB);
      if (comparison === 0) {
        const timeA = getTransactionTimestamp(a);
        const timeB = getTransactionTimestamp(b);
        comparison = timeA - timeB;
      }
    } else if (sortField === 'amount') {
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;
      comparison = amtA - amtB;
      if (comparison === 0) {
        const timeA = getTransactionTimestamp(a);
        const timeB = getTransactionTimestamp(b);
        comparison = timeA - timeB;
      }
    } else if (sortField === 'title') {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      comparison = titleA.localeCompare(titleB);
      if (comparison === 0) {
        const timeA = getTransactionTimestamp(a);
        const timeB = getTransactionTimestamp(b);
        comparison = timeA - timeB;
      }
    } else if (sortField === 'category') {
      const catA = (a.category_name || (a.type === 'INFLOW' ? 'Revenue' : 'Disbursement')).toLowerCase();
      const catB = (b.category_name || (b.type === 'INFLOW' ? 'Revenue' : 'Disbursement')).toLowerCase();
      comparison = catA.localeCompare(catB);
      if (comparison === 0) {
        const timeA = getTransactionTimestamp(a);
        const timeB = getTransactionTimestamp(b);
        comparison = timeA - timeB;
      }
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

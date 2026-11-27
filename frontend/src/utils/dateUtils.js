/**
 * Date utility to calculate the previous 3 completed calendar months.
 * Excludes the current month and returns them in ascending chronological order (oldest -> newest).
 */
export function getPrevious3CompletedMonths(referenceDate = new Date()) {
  return getPastCompletedMonths(3, referenceDate);
}

/**
 * Date utility to calculate past completed calendar months (up to 12).
 * Excludes current month and returns them in ascending chronological order (oldest -> newest).
 */
export function getPastCompletedMonths(count = 12, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const months = [];

  for (let offset = count; offset >= 1; offset--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${monthNum}`;
    const name = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const shortName = d.toLocaleDateString('en-US', { month: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'long' });

    const prevDate = new Date(year, d.getMonth() - 1, 1);
    const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'long' });

    months.push({
      key,
      name,
      shortName,
      monthName,
      prevMonthName,
      year,
      monthIndex: d.getMonth(),
    });
  }

  return months;
}

/**
 * Gets the full month name for the month immediately before the given year and monthIndex (0-11).
 */
export function getPreviousMonthName(year, monthIndex) {
  const d = new Date(year, monthIndex - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Formats an ISO date string (e.g. "2026-07-15") into "15 July" without the year.
 */
export function formatPaymentDateWithoutYear(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = d.toLocaleDateString('en-US', { month: 'long' });
        return `${day} ${month}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'long' });
      return `${day} ${month}`;
    }
  } catch {
    return dateStr;
  }
  return dateStr;
}

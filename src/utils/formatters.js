// Utility function to format dates in Indian Standard Time (IST +5:30)

export function formatIST(dateInput) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date) + ' IST';
  } catch (err) {
    return date.toLocaleString();
  }
}

export function formatISTShort(dateInput) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (err) {
    return date.toLocaleDateString();
  }
}

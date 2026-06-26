const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-GB', DATE_OPTIONS);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('en-GB', DATETIME_OPTIONS);
}

export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return formatDate(value);
}

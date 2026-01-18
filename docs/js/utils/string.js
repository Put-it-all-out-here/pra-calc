export function ellipsis(s, maxLen) {
  const str = String(s ?? '');
  if (!Number.isFinite(maxLen) || maxLen <= 0) return '';
  if (str.length <= maxLen) return str;
  if (maxLen === 1) return '…';
  return str.slice(0, maxLen - 1) + '…';
}

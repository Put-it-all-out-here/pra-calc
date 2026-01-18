import { CONFIG } from '../config.js';


/**
 * タイムゾーン取得
 * 
 * @returns 取得失敗時は'UTC'
 */
export function getBrowserTimeZone() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === 'string' && tz.length > 0 ? tz : 'UTC';
    } catch {
        return 'UTC';
    }
}

export function formatLocalDateTime(ms, timeZone) {
    if (!Number.isFinite(ms)) return '';

    return new Intl.DateTimeFormat(
        CONFIG.time?.locale ?? navigator.language,
        {
            timeZone,
            dateStyle: CONFIG.time?.dateStyle ?? 'short',
            timeStyle: CONFIG.time?.timeStyle ?? 'short',
            hour12: CONFIG.time?.hour12 ?? false,
        }
    ).format(new Date(ms));
}

export function formatMmddSlashHhColonMm(ms, timeZone) {
    if (!Number.isFinite(ms)) return '';

    try {
        const parts = new Intl.DateTimeFormat(
            CONFIG.time?.locale ?? navigator.language,
            {
                timeZone: timeZone || 'UTC',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }
        ).formatToParts(new Date(ms));

        const map = {};
        parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });

        const mm = map.month ?? '';
        const dd = map.day ?? '';
        const hh = map.hour ?? '';
        const mi = map.minute ?? '';

        if (!mm || !dd || !hh || !mi) return '';
        return `${mm}/${dd} ${hh}:${mi}`; // 例: 01/03 23:59
    } catch {
        return '';
    }
}

/**
 * 現在時刻を "YYYY-MM-DDTHH:mm:ss" 形式で返す（ローカル時間）。
 *
 * 用途:
 * - 解答チェックの履歴として秒精度で保存したい
 *
 * @returns {string} 例: "2026-01-03T23:59:59"
 */
export function nowTimestampSeconds() {
    const d = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    return (
        d.getFullYear() +
        '-' +
        pad2(d.getMonth() + 1) +
        '-' +
        pad2(d.getDate()) +
        'T' +
        pad2(d.getHours()) +
        ':' +
        pad2(d.getMinutes()) +
        ':' +
        pad2(d.getSeconds())
    );
}


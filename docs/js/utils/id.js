/**
 * 保存用の一意ID（UUID相当）を生成する。
 *
 * 仕様:
 * - crypto.randomUUID が利用可能ならそれを使用
 * - 利用できない環境では Date.now + Math.random でフォールバック
 *
 * @returns {string} 生成したID
 */
export function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

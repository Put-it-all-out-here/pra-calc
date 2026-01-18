// js/features/answer-ui.js
import { CONFIG } from '../config.js';
import * as Time from '../utils/time.js';

/**
 * Answer UI（answerbox）関連をまとめたサービス。
 *
 * generate-question.js 側の「依存するもの」は deps で注入する。
 */
export function createAnswerUiService(deps) {
    const {
        $,
        dom,
        state,

        // ===== generate-question.js 側の関数を注入 =====
        getQuestionTextOnly,
        getQuestionIndexFromLi,
        ensureHistoryArray,
        applyLastResultColor,
    } = deps;

    // ----------------------------
    // Pure helpers
    // ----------------------------

    /**
     * 数式文字列を安全に評価する（+ - * / のみ、標準の優先順位あり）。
     *
     * 仕様:
     * - 文字列中から「整数」と「演算子」だけを抽出して評価する
     * - eval / Function は使わない
     * - ( ) には未対応
     *
     * 例:
     * - "12 + 3 * 4" -> 24
     *
     * @param {string} text 問題文（例: "12 + 3 * 4"）
     * @returns {number|null} 評価結果。評価不能なら null
     */
    function evalArithmeticExpression(text) {
        const rawTokens = String(text).match(/(\d+|[+\-*/])/g);
        if (!rawTokens || rawTokens.length === 0) return null;

        const tokens = rawTokens.map((t) => t.trim()).filter((t) => t.length > 0);

        // 期待形式: number (op number)...
        if (!/^\d+$/.test(tokens[0])) return null;
        for (let i = 1; i < tokens.length; i++) {
            if (i % 2 === 1) {
                if (!/^[+\-*/]$/.test(tokens[i])) return null;
            } else {
                if (!/^\d+$/.test(tokens[i])) return null;
            }
        }

        // shunting-yard -> RPN
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
        const output = [];
        const ops = [];

        tokens.forEach((t) => {
            if (/^\d+$/.test(t)) {
                output.push(Number(t));
                return;
            }
            while (ops.length > 0) {
                const top = ops[ops.length - 1];
                if (prec[top] >= prec[t]) output.push(ops.pop());
                else break;
            }
            ops.push(t);
        });

        while (ops.length > 0) output.push(ops.pop());

        // eval RPN
        const stack = [];
        for (const it of output) {
            if (typeof it === 'number') {
                stack.push(it);
                continue;
            }
            const b = stack.pop();
            const a = stack.pop();
            if (typeof a !== 'number' || typeof b !== 'number') return null;

            let r = null;
            if (it === '+') r = a + b;
            if (it === '-') r = a - b;
            if (it === '*') r = a * b;
            if (it === '/') r = a / b;

            if (r == null || !Number.isFinite(r)) return null;
            stack.push(r);
        }
        return stack.length === 1 ? stack[0] : null;
    }

    /**
     * 問題行が「oprdN」を含むか判定する（=未置換なら true）。
     *
     * @param {string} line 問題行
     * @returns {boolean} oprd が含まれるなら true
     */
    function hasOprdToken(line) {
        return /\boprd\d+\b/.test(String(line));
    }

    // ----------------------------
    // DOM helpers
    // ----------------------------

    /**
     * li の直下に回答エリア（answerbox）を作成して返す。
     *
     * 仕様:
     * - すでに存在する場合はそれを返す（重複生成しない）
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @returns {JQuery<HTMLElement>} answerbox 要素
     */
    function ensureAnswerBox($li) {
        const $existing = $li.children(`[data-role="${CONFIG.role.answerBox}"]`);
        if ($existing.length > 0) return $existing;

        const $box = $(`
      <div class="answerbox" data-role="${CONFIG.role.answerBox}">
        <div class="answerbox__row">
          <input class="answerbox__input" data-role="${CONFIG.role.answerInput}"
                 type="text" inputmode="decimal" placeholder="answer">
          <button type="button" class="answerbox__btn" data-role="${CONFIG.role.answerCheck}">check</button>
          <button type="button" class="answerbox__btn" data-role="${CONFIG.role.answerClose}">close</button>
        </div>
      </div>
    `);

        $li.append($box);
        return $box;
    }

    /**
     * すべての回答エリア（answerbox）を閉じる（DOMから削除する）。
     *
     * 用途:
     * - 「1つだけ開く」運用にしたい場合
     *
     * @returns {void}
     */
    function closeAllAnswerBoxes() {
        dom.$questionsList
            .children('li')
            .children(`[data-role="${CONFIG.role.answerBox}"]`)
            .remove();
    }

    /**
     * 指定 li の回答エリアを開く（未置換問題なら何もしない）。
     *
     * 仕様:
     * - 未置換（oprd が残っている）なら対象外
     * - 1つだけ開くため、他の answerbox は閉じる
     * - check ボタン表示と input を初期化してフォーカス
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @returns {void}
     */
    function openAnswerBoxForLi($li) {
        const line = getQuestionTextOnly($li);
        if (hasOprdToken(line)) return;

        closeAllAnswerBoxes();

        const $box = ensureAnswerBox($li);
        $box.find(`[data-role="${CONFIG.role.answerCheck}"]`).text('check');

        const $input = $box.find(`[data-role="${CONFIG.role.answerInput}"]`);
        $input.val('');
        $input.trigger('focus');
    }

    /**
     * 回答判定を実行し、履歴と表示（○×/色）を更新する。
     *
     * 仕様:
     * - 正答: checkボタン文字を「○」、li を青
     * - 誤答: checkボタン文字を「×」、li を赤
     * - 履歴: state.answerHistories[idx] へ {checkedAt, result} を push
     * - / を使う可能性があるため、EPS で誤差許容する
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @param {JQuery<HTMLElement>} $box 対象 answerbox
     * @returns {void}
     */
    function checkAnswer($li, $box) {
        const expr = getQuestionTextOnly($li);
        const correct = evalArithmeticExpression(expr);

        if (correct == null) {
            alert('Cannot evaluate this question.');
            return;
        }

        const $input = $box.find(`[data-role="${CONFIG.role.answerInput}"]`);
        const raw = String($input.val() ?? '').trim();
        const user = Number(raw);

        if (!Number.isFinite(user)) {
            alert('Please input a number.');
            return;
        }

        const ok = Math.abs(user - correct) <= CONFIG.answer.eps;

        const idx = getQuestionIndexFromLi($li);
        if (idx != null) {
            const histories = ensureHistoryArray(idx);
            histories.push({
                checkedAt: Time.nowTimestampSeconds(),
                result: ok ? 'correct' : 'wrong',
            });
        }

        $box.find(`[data-role="${CONFIG.role.answerCheck}"]`).text(ok ? '○' : '×');

        const idx2 = getQuestionIndexFromLi($li);
        if (idx2 != null) {
            applyLastResultColor($li, ensureHistoryArray(idx2));
        } else {
            $li
                .removeClass(CONFIG.css.correct + ' ' + CONFIG.css.wrong)
                .addClass(ok ? CONFIG.css.correct : CONFIG.css.wrong);
        }
    }

    /**
     * 回答エリア（answerbox）を閉じる（DOMから削除する）。
     *
     * @param {JQuery<HTMLElement>} $box 対象 answerbox
     * @returns {void}
     */
    function closeAnswerBox($box) {
        $box.remove();
    }

    // 外へ出すAPI
    return {
        openAnswerBoxForLi,
        checkAnswer,
        closeAnswerBox,
        closeAllAnswerBoxes,

        // もし将来テストしたいなら公開してもOK（今は未使用）
        // evalArithmeticExpression,
    };
}

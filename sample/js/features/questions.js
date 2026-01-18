// js/features/questions.js
import { CONFIG } from '../config.js';

/**
 * Questions（問題リスト）の生成・更新・読み取り・色反映などをまとめたサービス。
 *
 * generate-question.js 側で持っていた関数を分離して、他サービス（storage / answer-ui）にも渡しやすくする。
 */
export function createQuestionsService(deps) {
    const {
        $,
        dom,
        state,

        // generate-question.js 側の依存
        hasInvalidInputs,
        readNumberOrNull,
        readOperatorSymbol,
    } = deps;

    /**
     * li から「問題インデックス（0始まり）」を取得する。
     *
     * 仕様:
     * - data-question-index が無い / 数値でない / 0未満は null
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @returns {number|null} インデックス（0始まり）または null
     */
    function getQuestionIndexFromLi($li) {
        const raw = $li.attr('data-question-index');
        if (raw == null) return null;
        const n = Number(raw);
        return Number.isInteger(n) && n >= 0 ? n : null;
    }

    /**
     * 指定インデックスの履歴配列を必ず用意して返す。
     *
     * @param {number} idx 問題インデックス（0始まり）
     * @returns {Array<any>} 履歴配列（必ず配列）
     */
    function ensureHistoryArray(idx) {
        if (!Array.isArray(state.answerHistories[idx])) {
            state.answerHistories[idx] = [];
        }
        return state.answerHistories[idx];
    }

    /**
     * 最後の履歴 result に応じて li の色（class）を反映する。
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @param {Array<{result: "correct"|"wrong"}>} histories 履歴配列
     * @returns {void}
     */
    function applyLastResultColor($li, histories) {
        $li.removeClass(CONFIG.css.correct + ' ' + CONFIG.css.wrong);

        const last = Array.isArray(histories) && histories.length > 0 ? histories[histories.length - 1] : null;
        const result = last?.result;

        if (result === 'correct') {
            $li.addClass(CONFIG.css.correct);
            $li.css('font-weight', `var(${CONFIG.cssVar.questionResultWeight})`);
        } else if (result === 'wrong') {
            $li.addClass(CONFIG.css.wrong);
            $li.css('font-weight', `var(${CONFIG.cssVar.questionResultWeight})`);
        } else {
            $li.css('font-weight', `var(${CONFIG.cssVar.questionNormalWeight})`);
        }
    }

    /**
     * li に answerbox が含まれていても、純粋な問題文テキストだけを取り出す。
     *
     * 理由:
     * - li 配下に入力フォーム（answerbox）を append しているため、
     *   $(li).text() をそのまま使うと "12 + 3checkclose" のように混ざる可能性がある
     *
     * @param {JQuery<HTMLElement>} $li 対象 li
     * @returns {string} 問題文のテキストのみ
     */
    function getQuestionTextOnly($li) {
        return $li
            .clone()
            .children()
            .remove()
            .end()
            .text();
    }

    // ============================================================
    // Questions（問題生成・更新）
    // ============================================================
    /**
     * operand 数と演算子から式テンプレートを組み立てる。
     *
     * 例:
     * - numOfOperands=3, operatorSymbol='+' -> "oprd1 + oprd2 + oprd3"
     *
     * @param {number} numOfOperands operand数
     * @param {string} operatorSymbol 演算子（+ - * /）
     * @returns {string} 組み立てた式文字列
     */
    function buildExpression(numOfOperands, operatorSymbol) {
        const operands = [];
        for (let i = 1; i <= numOfOperands; i++) operands.push(`oprd${i}`);
        return operands.join(` ${operatorSymbol} `);
    }

    /**
     * 問題リストを初期状態（メッセージ1行）に戻す。
     *
     * @returns {void}
     */
    function resetQuestionsList() {
        dom.$questionsList.empty().append($('<li>').text(CONFIG.defaultQuestionListMessage));
    }

    /**
     * 「画面内の回答履歴」と「liの色」をすべてクリアする。
     *
     * 仕様（重要）:
     * - 演算子変更／数字置換は「別問題扱い」とし、履歴は消す（混乱防止）
     *
     * @returns {void}
     */
    function clearAnswerHistoryAndColors() {
        state.answerHistories = state.answerHistories.map(() => []);
        dom.$questionsList
            .children('li')
            .removeClass(CONFIG.css.correct + ' ' + CONFIG.css.wrong)
            .css('font-weight', `var(${CONFIG.cssVar.questionNormalWeight})`);
    }

    /**
     * 現在の設定から問題を生成してリスト表示する。
     *
     * @returns {void}
     */
    function generateQuestions() {
        const invalid = hasInvalidInputs();
        if (invalid) return;

        const numOfQuestions = readNumberOrNull(dom.$numOfQuestionsInput);
        const numOfOperands = readNumberOrNull(dom.$numOfOperandsInput);
        const operatorSymbol = readOperatorSymbol();

        if (numOfQuestions == null || numOfOperands == null) {
            resetQuestionsList();
            state.answerHistories = [];
            return;
        }

        dom.$questionsList.empty();
        state.answerHistories = Array.from({ length: numOfQuestions }, () => []);

        for (let i = 1; i <= numOfQuestions; i++) {
            const expression = buildExpression(numOfOperands, operatorSymbol);

            $('<li>')
                .attr('data-question-number', String(i))
                .attr('data-question-index', String(i - 1))
                .attr('data-num-of-operands', String(numOfOperands))
                .text(expression)
                .css('font-weight', `var(${CONFIG.cssVar.questionNormalWeight})`)
                .appendTo(dom.$questionsList);
        }
    }

    /**
     * 演算子選択（select）変更時に、問題リスト内の演算子表示を更新する。
     *
     * 仕様:
     * - liテキストに「oprdN」が含まれる場合（=ボタン押下前）は buildExpression で再構築
     * - 数字のみの場合（=ボタン押下後）は演算子トークンだけを置換し、数字は保持
     * - 更新後、履歴はクリアする（別問題扱い）
     *
     * @returns {void}
     */
    function updateOperators() {
        const operatorSymbol = readOperatorSymbol();
        const operatorToken = /^[+\-*\/]$/;

        dom.$questionsList
            .children('li[data-num-of-operands]')
            .each(function () {
                const $li = $(this);
                const rawText = getQuestionTextOnly($li);

                if (rawText.includes('oprd')) {
                    const num = Number($li.attr('data-num-of-operands'));
                    if (Number.isInteger(num) && num >= 2) {
                        $li.text(buildExpression(num, operatorSymbol));
                    }
                    return;
                }

                const tokens = rawText.split(' ');
                const newTokens = tokens.map((token) => (operatorToken.test(token) ? operatorSymbol : token));
                $li.text(newTokens.join(' '));
            });

        clearAnswerHistoryAndColors();
    }

    /**
     * 「replace operands with random number」ボタン押下時に、
     * operand（oprdN）または数値トークンをランダム整数へ置換する。
     *
     * 仕様:
     * - 入力バリデーション NG の場合は alert + 黄色強調して中断
     * - num-of-digits は 1 以上の整数のみ有効
     * - 置換対象: oprdN または 数値トークン（/^\d+$/）
     * - 演算子トークンは保持する
     * - 置換後、履歴はクリアする（別問題扱い）
     *
     * @returns {void}
     */
    function updateOperand() {
        const invalid = hasInvalidInputs();
        if (invalid) return;

        const digits = readNumberOrNull(dom.$numOfDigitsInput);
        if (digits == null || digits < 1) return;

        /**
         * 指定桁数のランダム整数を返す（先頭ゼロなし）。
         *
         * @param {number} d 桁数（1以上）
         * @returns {number} 例: d=2 -> 10..99
         */
        function randomIntWithDigits(d) {
            const min = Math.pow(10, d - 1);
            const max = Math.pow(10, d) - 1;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        const numberToken = /^\d+$/;
        const operandToken = /^oprd\d+$/;

        dom.$questionsList
            .children('li[data-num-of-operands]')
            .each(function () {
                const $li = $(this);
                const rawText = getQuestionTextOnly($li);
                const tokens = rawText.split(' ');

                const newTokens = tokens.map((token) => {
                    if (operandToken.test(token) || numberToken.test(token)) {
                        return String(randomIntWithDigits(digits));
                    }
                    return token;
                });

                $li.text(newTokens.join(' '));
            });

        clearAnswerHistoryAndColors();
    }

    /**
     * 画面に表示されている問題リスト（ol > li）の各行テキストを配列で返す。
     *
     * 仕様:
     * - 空行は除外
     * - デフォルト文言（defaultQuestionListMessage）は除外
     *
     * @returns {string[]} 問題行の配列
     */
    function readQuestionLines() {
        return dom.$questionsList
            .children('li')
            .map(function () {
                const text = getQuestionTextOnly($(this));
                return String(text ?? '').trim();
            })
            .get()
            .filter((line) => line.length > 0)
            .filter((line) => line !== CONFIG.defaultQuestionListMessage);
    }

    // 外へ出すAPI
    return {
        // list utilities
        getQuestionTextOnly,
        getQuestionIndexFromLi,
        ensureHistoryArray,
        applyLastResultColor,
        readQuestionLines,

        // generation / update
        generateQuestions,
        updateOperators,
        updateOperand,
        resetQuestionsList,
    };
}

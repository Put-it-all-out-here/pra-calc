// js/generate-question.js
import { CONFIG } from './config.js';
import { createStorageService } from './features/storage.js';
import { createAppContext } from './app/init.js';
import { createAnswerUiService } from './features/answer-ui.js';
import { createQuestionsService } from './features/questions.js';


// jQuery ready
$(function () {

    /**
     * checkボタン処理履歴
     * @typedef {{ checkedAt: string, result: "correct"|"wrong" }} AnswerHistory
     */

    /**
     * アプリの状態
     * - localStrageから取得したデータ
     * - answerHistories
     *   - `Array<AnswerHistory>`：ある問題1件に対するcheckボタン処理履歴
     *   - `Array<Array<AnswerHistory>>`：questionsセクションに表示されている全問題のcheckボタン処理履歴
     * 
     * @typedef {{
     *   answerHistories: Array<Array<AnswerHistory>>
     * }} AppState
     */


    /**
     * DOM参照まとめ（generate-question.js で使用する全要素）
     *
     * ルール:
     * - jQuery オブジェクトは $ プレフィックス
     * - data-role / id / class で一意に取得できるもののみ
     * - 「将来使うかも」は書かない（実使用分のみ）
     *
     * @typedef {{
     *   // ===== settings =====
     *   $numOfQuestionsInput: JQuery<HTMLInputElement>,
     *   $numOfOperandsInput: JQuery<HTMLInputElement>,
     *   $numOfDigitsInput: JQuery<HTMLInputElement>,
     *   $typeOfOperatorsSelect: JQuery<HTMLSelectElement>,
     *
     *   // ±ボタンはイベント委譲なので DOM 参照は不要
     *
     *   // ===== questions =====
     *   $questionsList: JQuery<HTMLOListElement>,
     *
     *   // ===== save / export =====
     *   $saveQuestionsWithinBrowser: JQuery<HTMLButtonElement>,
     *   $saveMemoInput: JQuery<HTMLInputElement>,
     *   $setNameInput: JQuery<HTMLInputElement>,
     *
     *   // ===== saved sets =====
     *   $savedSetsSelect: JQuery<HTMLSelectElement>,
     *   $loadSavedSetBtn: JQuery<HTMLButtonElement>,
     *   $deleteSavedSetBtn: JQuery<HTMLButtonElement>,
     *
     *   // ===== saved set preview =====
     *   $savedSetPreviewMemo: JQuery<HTMLElement>,
     *   $savedSetPreviewCreatedAt: JQuery<HTMLElement>,
     *   $savedSetPreviewQuestions: JQuery<HTMLElement>,
     *   $savedSetPreviewId: JQuery<HTMLElement>,
     *   $savedSetPreviewStats: JQuery<HTMLElement>,
     *
     * }} DomRefs
     */
    /** @type {{ dom: DomRefs, state: AppState }} */
    const { dom, state } = createAppContext($);

    // ============================================================
    // Questions service（問題リスト関連を分離）
    // ============================================================
    const questions = createQuestionsService({
        $,
        dom,
        state,
        hasInvalidInputs,
        readNumberOrNull,
        readOperatorSymbol,
    });

    // generate-question.js から呼ぶものはここで取り出す（名前は従来どおり）
    const {
        generateQuestions,
        updateOperators,
        updateOperand,
        resetQuestionsList,
        readQuestionLines,
        getQuestionTextOnly,
        getQuestionIndexFromLi,
        ensureHistoryArray,
        applyLastResultColor,
    } = questions;

    const storage = createStorageService({
        $,
        dom,
        state,
        hasInvalidInputs,
        readNumberOrNull,
        readOperatorSymbol,
        readQuestionLines,
        readSetNameTrimmed,
        autoSetName,
        isUniqueSetName,
        resetSetNameError,
        resetQuestionsList,
        applyLastResultColor,
    });

    const answerUi = createAnswerUiService({
        $,
        dom,
        state,
        getQuestionTextOnly,
        getQuestionIndexFromLi,
        ensureHistoryArray,
        applyLastResultColor,
    });



    // ============================================================
    // Utils（小さな共通関数）
    // ============================================================

    /**
     * 数値 n を min/max の範囲内に丸めて返す。
     *
     * @param {number} n 対象値
     * @param {number|null} min 下限（未指定なら null）
     * @param {number|null} max 上限（未指定なら null）
     * @returns {number} 範囲内に収めた値
     */
    function clamp(n, min, max) {
        if (min != null && n < min) return min;
        if (max != null && n > max) return max;
        return n;
    }

    /**
     * CONFIG の文字太さ設定を CSS 変数へ反映する。
     *
     * @returns {void}
     */
    function applyFontWeightConfigToCssVars() {
        const root = document.documentElement;

        // null safety（CONFIG欠けても落とさない）
        const normal = Number(CONFIG?.fontWeight?.normal);
        const result = Number(CONFIG?.fontWeight?.result);

        if (Number.isFinite(normal)) {
            root.style.setProperty(CONFIG.cssVar.questionNormalWeight, String(normal));
        }
        if (Number.isFinite(result)) {
            root.style.setProperty(CONFIG.cssVar.questionResultWeight, String(result));
        }
    }


    /**
     * set name を読み取って正規化して返す（空なら空文字）。
     * - trim して返す
     *
     * @returns {string}
     */
    function readSetNameTrimmed() {
        if (dom.$setNameInput.length === 0) return '';
        return String(dom.$setNameInput.val() ?? '').trim();
    }

    /**
     * set name が空のときの自動命名を返す。
     * createdAt を使って衝突しにくくする。
     *
     * @param {string} createdAtIso
     * @returns {string}
     */
    function autoSetName(createdAtIso) {
        const iso = String(createdAtIso ?? '');
        const compact = iso.replace(/[-:]/g, '').replace('T', '_').slice(0, 15); // YYYYMMDD_HHMMSS
        return `${CONFIG.setName.autoNamePrefix}_${compact}`;
    }

    /**
     * set name がユニークか判定する。
     * - 大文字小文字を区別しない運用（必要なら区別する方針に変更可）
     *
     * @param {Array<Object>} all 保存済み全セット
     * @param {string} name 判定したい set name
     * @param {string|null} ignoreId 更新系で自分自身を除外したい時用（今回未使用）
     * @returns {boolean} ユニークなら true
     */
    function isUniqueSetName(all, name, ignoreId = null) {
        const key = String(name ?? '').trim().toLowerCase();
        if (!key) return true; // 空はこの関数の責務外（上流で auto 命名）
        return !all.some(s => {
            if (!s) return false;
            if (ignoreId != null && s.id === ignoreId) return false;
            const other = String(s.setName ?? '').trim().toLowerCase();
            return other === key;
        });
    }

    /**
     * set name の入力エラー表示をリセットする。
     *
     * @returns {void}
     */
    function resetSetNameError() {
        if (dom.$setNameInput.length === 0) return;
        dom.$setNameInput.removeClass(CONFIG.css.inputError);
    }



    // ============================================================
    // Validation / Read helpers（入力バリデーション）
    // ============================================================
    /**
     * 引数が null または undefined なら true を返す。
     *
     * @param {unknown} input 判定対象
     * @returns {boolean} null/undefined なら true
     */
    function isValNullOrUndefined(input) {
        return input == null;
    }

    /**
     * 引数が「空文字」または「空白だけ」なら true を返す。
     *
     * @param {unknown} input 判定対象
     * @returns {boolean} 空/空白だけなら true
     */
    function isValOnlySpaceStringOrEmptyString(input) {
        return String(input).trim() === '';
    }

    /**
     * input の val() を数値として読み取り、数値ならその数値、そうでなければ null を返す。
     *
     * 仕様:
     * - null/undefined/空/空白だけ -> null
     * - Number() で有限数なら OK（整数チェックは別関数）
     *
     * @param {JQuery<HTMLInputElement>} $input 対象 input[type="number"]
     * @returns {number|null} 数値または null
     */
    function readNumberOrNull($input) {
        const raw = $input.val();

        if (isValNullOrUndefined(raw)) return null;
        if (isValOnlySpaceStringOrEmptyString(raw)) return null;

        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }

    /**
     * input の値が min/max 範囲外、または整数でない場合に true を返す。
     *
     * 仕様:
     * - 空（null/undefined/空白）は NG 扱い（true）
     * - 整数以外（例: 1.5）も NG 扱い（true）
     *
     * @param {JQuery<HTMLInputElement>} $input 対象 input
     * @returns {boolean} 範囲外または不正なら true
     */
    function isOutOfRangeByMinMax($input) {
        const value = readNumberOrNull($input);
        if (value == null) return true; // 空もNG扱い
        if (!Number.isInteger(value)) return true;

        const minRaw = $input.attr('min');
        const maxRaw = $input.attr('max');

        const min = minRaw != null ? Number(minRaw) : null;
        const max = maxRaw != null ? Number(maxRaw) : null;

        if (min != null && value < min) return true;
        if (max != null && value > max) return true;

        return false;
    }

    /**
     * 指定された input 群をバリデーションし、
     * 不正 input を CSS で強調しつつ alert を表示する。
     *
     * @param {Array<JQuery<HTMLInputElement>>} inputs 検証対象の input 配列
     * @returns {boolean} 不正が1つでもあれば true（=処理を止めたい側）
     */
    function alertAndHighlightIfInvalid(inputs) {
        // いったん全部リセット
        inputs.forEach(($i) => $i.removeClass(CONFIG.css.inputError));

        const invalidInputs = inputs.filter(($i) => isOutOfRangeByMinMax($i));

        invalidInputs.forEach(($i) => $i.addClass(CONFIG.css.inputError));

        if (invalidInputs.length > 0) {
            const names = invalidInputs.map(($i) => $i.attr('id') || '(no id)').join(', ');
            alert(`Invalid value: ${names}`);
            return true;
        }
        return false;
    }

    /**
     * 画面の主要 input をまとめてバリデーションする。
     *
     * @returns {boolean} 不正があれば true（=処理を止めたい側）
     */
    function hasInvalidInputs() {
        return alertAndHighlightIfInvalid([
            dom.$numOfQuestionsInput,
            dom.$numOfOperandsInput,
            dom.$numOfDigitsInput,
        ]);
    }

    /**
     * 演算子の選択値（select）を読み取って返す。
     *
     * 仕様:
     * - 文字列として1文字以上ならそのまま返す
     * - それ以外は '+' を返す（フォールバック）
     *
     * @returns {string} 演算子記号（例: "+", "-", "*", "/"）
     */
    function readOperatorSymbol() {
        const raw = dom.$typeOfOperatorsSelect.val();
        if (typeof raw === 'string' && raw.length > 0) return raw;
        return '+';
    }



    function stepInput($input, direction) {
        const raw = $input.val();
        const cur = Number(raw);

        const stepRaw = $input.attr('step');
        const step = stepRaw != null ? Number(stepRaw) : 1;

        const minRaw = $input.attr('min');
        const maxRaw = $input.attr('max');
        const min = minRaw != null ? Number(minRaw) : null;
        const max = maxRaw != null ? Number(maxRaw) : null;

        const base = Number.isFinite(cur) ? cur : min ?? 0;
        const next = clamp(base + direction * step, min, max);

        $input.val(String(next)).trigger('change');
    }

    /**
     * section の折りたたみ状態を切り替える。
     *
     * 仕様:
     * - section に is-collapsed を付け外しする
     * - aria-expanded とボタン表示（− / ＋）を更新する
     *
     * @param {JQuery<HTMLElement>} $section 対象 section
     * @param {boolean} collapsed true なら折りたたむ
     * @returns {void}
     */
    function setSectionCollapsed($section, collapsed) {
        $section.toggleClass('is-collapsed', collapsed);

        const $btn = $section.find(`[data-role="${CONFIG.role.sectionToggle}"]`).first();
        $btn.attr('aria-expanded', String(!collapsed));
        $btn.text(collapsed ? '＋' : '−');
    }

    // ============================================================
    // Event binding（イベント登録）
    // ============================================================
    /**
     * すべてのイベントハンドラを登録する。
     *
     * 仕様:
     * - 生成/更新系は input change / button click に紐づけ
     * - answerbox は動的に生成されるため、document へ委譲（event delegation）する
     * - PC: dblclick で open
     * - mobile: long-press で open
     *
     * @returns {void}
     */
    function bindEvents() {
        // settings
        dom.$numOfQuestionsInput.on('change', function () {
            hasInvalidInputs();
            generateQuestions();
        });

        dom.$numOfOperandsInput.on('change', function () {
            hasInvalidInputs();
            generateQuestions();
        });

        dom.$typeOfOperatorsSelect.on('change', updateOperators);

        dom.$numOfDigitsInput.on('change', hasInvalidInputs);

        // buttons
        dom.$replaceOperandsWithRandomNum.on('click', updateOperand);

        // save / sets
        dom.$saveQuestionsWithinBrowser.on('click', storage.saveCurrentQuestions);
        dom.$savedSetsSelect.on('change', storage.updateSavedSetPreview);
        dom.$loadSavedSetBtn.on('click', storage.loadSelectedSet);
        dom.$deleteSavedSetBtn.on('click', storage.deleteSelectedSet);
        // set name 入力が変わったら、エラー色は一旦リセット（再判定は保存時）
        if (dom.$setNameInput.length) {
            dom.$setNameInput.on('input', resetSetNameError);
            dom.$setNameInput.on('change', resetSetNameError);
        }


        // ± step buttons（委譲）
        $(document).on('click', `[data-role="${CONFIG.role.stepPlus}"]`, function () {
            const $input = $(this).closest('.numstep').find('input[type="number"]').first();
            stepInput($input, +1);
        });

        $(document).on('click', `[data-role="${CONFIG.role.stepMinus}"]`, function () {
            const $input = $(this).closest('.numstep').find('input[type="number"]').first();
            stepInput($input, -1);
        });

        // section toggle（委譲）
        $(document).on('click', `[data-role="${CONFIG.role.sectionToggle}"]`, function () {
            const $section = $(this).closest(`[data-role="${CONFIG.role.section}"]`);
            const collapsed = $section.hasClass('is-collapsed');
            setSectionCollapsed($section, !collapsed);
        });

        // ===== open by dblclick (PC) =====
        $(document).on('dblclick', `[data-role="${CONFIG.role.questionsList}"] > li`, function (e) {
            if ($(e.target).closest(`[data-role="${CONFIG.role.answerBox}"]`).length > 0) return;
            answerUi.openAnswerBoxForLi($(this));
        });

        // ===== long-press (mobile) =====
        /** @type {ReturnType<typeof setTimeout> | null} */
        let longPressTimer = null;
        /** @type {{x:number, y:number} | null} */
        let longPressStart = null;

        $(document).on('pointerdown', `[data-role="${CONFIG.role.questionsList}"] > li`, function (e) {
            // 左クリック/タッチのみ想定（右クリック等は無視）
            if (e.button != null && e.button !== 0) return;

            // 回答エリア上は対象外
            if ($(e.target).closest(`[data-role="${CONFIG.role.answerBox}"]`).length > 0) return;

            const $li = $(this);
            longPressStart = { x: e.clientX, y: e.clientY };

            if (longPressTimer != null) clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                answerUi.openAnswerBoxForLi($li);
                longPressTimer = null;
            }, CONFIG.answer.longPressMs);
        });

        $(document).on('pointermove', `[data-role="${CONFIG.role.questionsList}"] > li`, function (e) {
            if (!longPressTimer || !longPressStart) return;

            const dx = Math.abs(e.clientX - longPressStart.x);
            const dy = Math.abs(e.clientY - longPressStart.y);

            // 指が動いたらキャンセル（スクロール対策）
            if (dx > CONFIG.answer.moveCancelThresholdPx || dy > CONFIG.answer.moveCancelThresholdPx) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        $(document).on('pointerup pointercancel', `[data-role="${CONFIG.role.questionsList}"] > li`, function () {
            if (longPressTimer != null) clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressStart = null;
        });

        // ===== answerbox buttons（委譲）=====
        $(document).on('click', `[data-role="${CONFIG.role.answerCheck}"]`, function () {
            const $box = $(this).closest(`[data-role="${CONFIG.role.answerBox}"]`);
            const $li = $box.closest('li');
            if ($li.length === 0) return;
            answerUi.checkAnswer($li, $box);
        });

        $(document).on('click', `[data-role="${CONFIG.role.answerClose}"]`, function () {
            const $box = $(this).closest(`[data-role="${CONFIG.role.answerBox}"]`);
            answerUi.closeAnswerBox($box);
        });

        $(document).on('keydown', `[data-role="${CONFIG.role.answerInput}"]`, function (e) {
            if (e.key !== 'Enter') return;
            const $box = $(this).closest(`[data-role="${CONFIG.role.answerBox}"]`);
            const $li = $box.closest('li');
            if ($li.length === 0) return;
            answerUi.checkAnswer($li, $box);
        });
    }

    // ============================================================
    // Init（初期化）
    // ============================================================
    /**
     * 初期化処理。
     *
     * 実行順:
     * 1) イベント登録
     * 2) 初期問題リスト生成
     * 3) 保存済みセット一覧描画
     *
     * @returns {void}
     */
    function init() {
        applyFontWeightConfigToCssVars();
        bindEvents();
        generateQuestions();
        storage.renderSavedSetsList('');
    }

    // 実行
    init();
});
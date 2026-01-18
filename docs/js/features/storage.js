// js/features/storage.js
import { CONFIG } from '../config.js';
import * as Time from '../utils/time.js';
import { ellipsis } from '../utils/string.js';
import { newId } from '../utils/id.js';

/**
 * localStorage 操作 + saved sets UI をまとめたサービス。
 *
 * generate-question.js 側の「依存する関数」は deps で注入する。
 */
export function createStorageService(deps) {
    const {
        $,
        dom,
        state,

        // ===== generate-question.js 側の関数を注入 =====
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
    } = deps;

    // ----------------------------
    // localStorage
    // ----------------------------
    /**
     * localStorage から問題セット一覧を読み込む。
     *
     * 仕様:
     * - 未保存なら空配列
     * - JSON パース失敗でも空配列（壊れたデータ対策）
     *
     * @returns {Array<Object>} 保存済みセット配列（壊れていたら空配列）
     */
    function loadAllSets() {
        const raw = localStorage.getItem(CONFIG.storageKey);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    /**
     * 保存済みセット一覧を localStorage へ保存する。
     *
     * @param {Array<Object>} sets 保存するセット一覧
     * @returns {void}
     */
    function saveAllSets(sets) {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(sets));
    }

    // ----------------------------
    // stats / label
    // ----------------------------
    function calcLastResultStats(answerHistories) {
        const h = Array.isArray(answerHistories) ? answerHistories : [];
        let correct = 0;
        let wrong = 0;
        let unanswered = 0;

        for (let i = 0; i < h.length; i++) {
            const arr = Array.isArray(h[i]) ? h[i] : [];
            if (arr.length === 0) {
                unanswered++;
                continue;
            }
            const last = arr[arr.length - 1];
            if (last?.result === 'correct') correct++;
            else if (last?.result === 'wrong') wrong++;
            else unanswered++;
        }
        return { total: h.length, correct, wrong, unanswered };
    }

    /**
     * 保存済みセットを select の option 表示用文字列に整形する。
     *
     * @param {Object} set セット
     * @returns {string} 表示ラベル
     */
    function formatLabel(set) {
        // 相対時刻やめて mmdd-hhmm
        const stamp = Time.formatMmddSlashHhColonMm(set.createdAtMs, set.tz);

        // setName は専用 maxSetNameLen で短縮
        const name = (set.setName ?? '').toString().trim();
        const nameShort = name
            ? ellipsis(name, CONFIG.optionLabel.maxSetNameLen)
            : '(no name)';

        const stats = calcLastResultStats(set.answerHistories);
        const statPart = CONFIG.optionLabel.showUnanswered
            ? `${stats.correct}/${stats.wrong}/${stats.unanswered}/${stats.total}`
            : `${stats.correct}/${stats.wrong}/${stats.total}`;

        // 例: 0103-2359 | mysetname… | 3/1/0/10
        return `${stamp} | ${nameShort} | ${statPart}`;
    }

    // ----------------------------
    // select / preview helpers
    // ----------------------------
    /**
     * 保存済みセット一覧 select の現在選択されているIDを返す。
     *
     * @returns {string} 未選択なら空文字
     */
    function getSelectedSetId() {
        const v = dom.$savedSetsSelect.val();
        return typeof v === 'string' ? v : '';
    }

    /**
     * セット配列から指定IDのセットを検索して返す。
     *
     * @param {Array<Object>} all セット配列
     * @param {string} id 探すID
     * @returns {Object|null} 見つからなければ null
     */
    function findSetById(all, id) {
        return all.find((s) => s && s.id === id) || null;
    }

    /**
     * 保存済みセットのプレビュー表示を更新する。
     *
     * 表示先:
     * - memo      -> [data-role="saved-set-preview-memo"]
     * - createdAt -> [data-role="saved-set-preview-created-at"]
     * - questions -> [data-role="saved-set-preview-questions"]
     *
     * @returns {void}
     */
    function updateSavedSetPreview() {
        const id = getSelectedSetId();

        if (!id) {
            dom.$savedSetPreviewMemo.text('');
            dom.$savedSetPreviewCreatedAt.text('');
            dom.$savedSetPreviewQuestions.text('');
            dom.$savedSetPreviewId.text('');
            dom.$savedSetPreviewStats.text('');
            return;
        }

        const all = loadAllSets();
        const set = findSetById(all, id);
        if (!set) {
            dom.$savedSetPreviewMemo.text('');
            dom.$savedSetPreviewCreatedAt.text('');
            dom.$savedSetPreviewQuestions.text('(not found)');
            dom.$savedSetPreviewId.text('');
            dom.$savedSetPreviewStats.text('');
            return;
        }

        const memo = (set.memo ?? '').toString();
        const createdAt = Time.formatLocalDateTime(set.createdAtMs, set.tz);
        const questions = Array.isArray(set.questions) ? set.questions.join('\n') : '';

        dom.$savedSetPreviewMemo.text(memo);
        dom.$savedSetPreviewCreatedAt.text(createdAt);
        dom.$savedSetPreviewQuestions.text(questions);

        dom.$savedSetPreviewId.text(String(set.id ?? ''));
        const stats = calcLastResultStats(set.answerHistories);
        const s = CONFIG.optionLabel.showUnanswered
            ? `correct/wrong/unanswered/total = ${stats.correct}/${stats.wrong}/${stats.unanswered}/${stats.total}`
            : `correct/wrong/total = ${stats.correct}/${stats.wrong}/${stats.total}`;
        dom.$savedSetPreviewStats.text(s);
    }

    /**
     * 保存済みセット一覧（select）を localStorage の内容から再描画する。
     *
     * @param {string} selectedId 描画後に選択状態にしたいセットID（空なら未選択）
     * @returns {void}
     */
    function renderSavedSetsList(selectedId) {
        const all = loadAllSets();
        dom.$savedSetsSelect.empty();
        dom.$savedSetsSelect.append($('<option>').val('').text('(select a set)'));

        all.forEach((set) => {
            dom.$savedSetsSelect.append($('<option>').val(set.id).text(formatLabel(set)));
        });

        if (selectedId) {
            dom.$savedSetsSelect.val(selectedId);
        }

        updateSavedSetPreview();
    }

    // ----------------------------
    // save / load / delete
    // ----------------------------
    /**
     * 現在画面の問題リストを 1セットとして localStorage に保存する。
     *
     * 保存内容:
     * - id（新規生成）
     * - memo（任意入力）
     * - createdAt（ISO文字列）
     * - settings（num-of-questions / operands / operator / digits）
     * - questions（ol内の各行）
     * - answerHistories（画面内履歴。questions長に正規化）
     *
     * @returns {void}
     */
    function saveCurrentQuestions() {
        const invalid = hasInvalidInputs();
        if (invalid) return;

        const questions = readQuestionLines();

        // 保存用に履歴配列を questions に合わせる
        const normalizedHistories = questions.map((_, idx) => {
            const h = state.answerHistories[idx];
            return Array.isArray(h) ? h : [];
        });

        const all = loadAllSets();

        // ===== set name =====
        const createdAt = new Date().toISOString();
        let setName = readSetNameTrimmed();
        if (!setName) {
            setName = autoSetName(createdAt);
            if (dom.$setNameInput.length) dom.$setNameInput.val(setName);
        }

        // maxLen 超過なら切り詰め（または alert で止める運用でもOK）
        if (CONFIG.setName.maxLen > 0 && setName.length > CONFIG.setName.maxLen) {
            setName = setName.slice(0, CONFIG.setName.maxLen);
            if (dom.$setNameInput.length) dom.$setNameInput.val(setName);
        }

        // ユニークチェック（NGなら alert＋黄色＋中断）
        resetSetNameError();
        if (!isUniqueSetName(all, setName)) {
            if (dom.$setNameInput.length) dom.$setNameInput.addClass(CONFIG.css.inputError);
            alert('Set name must be unique.');
            return;
        }

        const nowMs = Date.now();
        const tz = Time.getBrowserTimeZone();


        const set = {
            id: newId(),
            memo: dom.$saveMemoInput.val() ?? '',
            createdAtMs: nowMs,
            tz: tz,
            setName,
            settings: {
                numOfQuestions: readNumberOrNull(dom.$numOfQuestionsInput),
                numOfOperands: readNumberOrNull(dom.$numOfOperandsInput),
                operator: readOperatorSymbol(),
                numOfDigits: readNumberOrNull(dom.$numOfDigitsInput),
            },
            questions,
            answerHistories: normalizedHistories,
        };

        all.unshift(set);
        saveAllSets(all);

        renderSavedSetsList(set.id);
        alert(`Saved! id=${set.id}`);
    }

    /**
     * 選択中の保存済みセットを、画面の input/select と問題リストへ復元する。
     *
     * 仕様:
     * - settings を input/select に val() で反映（手入力と同等）
     * - questions を ol に復元し、data-num-of-operands も付与する（updateOperators 用）
     * - memo も入力欄へ戻す
     * - answerHistories は questions 長に正規化（壊れた/旧データ対策）
     *
     * @returns {void}
     */
    function loadSelectedSet() {
        const id = getSelectedSetId();
        if (!id) {
            alert('Please select a set.');
            return;
        }

        const all = loadAllSets();
        const set = findSetById(all, id);
        if (!set) {
            alert('Selected set not found.');
            return;
        }

        const s = set.settings || {};

        if (s.numOfQuestions != null) dom.$numOfQuestionsInput.val(String(s.numOfQuestions));
        if (s.numOfOperands != null) dom.$numOfOperandsInput.val(String(s.numOfOperands));
        if (s.numOfDigits != null) dom.$numOfDigitsInput.val(String(s.numOfDigits));
        if (s.operator != null) dom.$typeOfOperatorsSelect.val(String(s.operator));

        const qs = Array.isArray(set.questions) ? set.questions : [];

        // 履歴は questions 長に正規化（壊れた保存データでも崩れない）
        state.answerHistories = qs.map((_, idx) =>
            Array.isArray(set.answerHistories?.[idx]) ? set.answerHistories[idx] : []
        );

        if (qs.length === 0) {
            resetQuestionsList();
        } else {
            dom.$questionsList.empty();
            qs.forEach((line, idx) => {
                const $li = $('<li>')
                    .attr('data-question-number', String(idx + 1))
                    .attr('data-question-index', String(idx))
                    .attr('data-num-of-operands', String(s.numOfOperands ?? ''))
                    .text(String(line))
                    .appendTo(dom.$questionsList);

                applyLastResultColor($li, state.answerHistories[idx]);
            });
        }

        dom.$saveMemoInput.val((set.memo ?? '').toString());
        if (dom.$setNameInput.length) {
            dom.$setNameInput.val(String(set.setName ?? ''));
            resetSetNameError();
        }
        // 壊れた保存データ等への保険
        hasInvalidInputs();
    }

    /**
     * 選択中の保存済みセットを削除する。
     *
     * 仕様:
     * - 未選択なら alert して中断
     * - 対象IDが見つからない場合も alert して中断
     * - confirm で確認してから削除
     * - 削除後は一覧を再描画（選択解除）
     *
     * @returns {void}
     */
    function deleteSelectedSet() {
        const id = getSelectedSetId();
        if (!id) {
            alert('Please select a set.');
            return;
        }

        const all = loadAllSets();
        const set = findSetById(all, id);
        if (!set) {
            alert('Selected set not found.');
            return;
        }

        const ok = confirm(`Delete this set?\n\n${formatLabel(set)}`);
        if (!ok) return;

        const next = all.filter((s) => s && s.id !== id);
        saveAllSets(next);

        renderSavedSetsList('');
        resetSetNameError();
    }

    // 外へ出すAPI
    return {
        loadAllSets,
        saveAllSets,
        calcLastResultStats,
        formatLabel,
        renderSavedSetsList,
        updateSavedSetPreview,
        saveCurrentQuestions,
        loadSelectedSet,
        deleteSelectedSet,
    };
}

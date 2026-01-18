import { CONFIG } from '../config.js';

export function createDom($) {


    // ============================================================
    // DOM cache（要素取得）
    // ============================================================
    /** @type {JQuery<HTMLElement>} */
    const $numOfQuestions = $(`[data-role="${CONFIG.role.numOfQuestions}"]`);
    /** @type {JQuery<HTMLInputElement>} */
    const $numOfQuestionsInput = $numOfQuestions.find('input[type="number"]');

    /** @type {JQuery<HTMLElement>} */
    const $numOfOperands = $(`[data-role="${CONFIG.role.numOfOperands}"]`);
    /** @type {JQuery<HTMLInputElement>} */
    const $numOfOperandsInput = $numOfOperands.find('input[type="number"]');

    /** @type {JQuery<HTMLElement>} */
    const $typeOfOperators = $(`[data-role="${CONFIG.role.typeOfOperators}"]`);
    /** @type {JQuery<HTMLSelectElement>} */
    const $typeOfOperatorsSelect = $typeOfOperators.find('select');

    /** @type {JQuery<HTMLElement>} */
    const $numOfDigits = $(`[data-role="${CONFIG.role.numOfDigits}"]`);
    /** @type {JQuery<HTMLInputElement>} */
    const $numOfDigitsInput = $numOfDigits.find('input[type="number"]');

    /** @type {JQuery<HTMLElement>} */
    const $replaceOperandsWithRandomNum = $(
        `[data-role="${CONFIG.role.replaceOperandsWithRandomNum}"]`
    );

    /** @type {JQuery<HTMLOListElement>} */
    const $questionsList = $(`[data-role="${CONFIG.role.questionsList}"]`);

    /** @type {JQuery<HTMLButtonElement>} */
    const $saveQuestionsWithinBrowser = $(
        `[data-role="${CONFIG.role.saveQuestionsWithinBrowser}"]`
    );

    /** @type {JQuery<HTMLButtonElement>} */
    const $exportQuestionsAsCsv = $(
        `[data-role="${CONFIG.role.exportQuestionsAsCsv}"]`
    ); // 現状未使用（将来用）

    /** @type {JQuery<HTMLElement>} */
    const $saveMemo = $(`[data-role="${CONFIG.role.questionsMemo}"]`); // 現状未使用（将来用）
    /** @type {JQuery<HTMLInputElement>} */
    const $saveMemoInput = $(`[data-role="${CONFIG.role.questionsMemo}"]`).find(
        'input[type="text"]'
    );
    /** @type {JQuery<HTMLInputElement>} */
    const $setNameInput = $(`[data-role="${CONFIG.role.setName}"]`).find('input[type="text"]');

    /** @type {JQuery<HTMLSelectElement>} */
    const $savedSetsSelect = $(`[data-role="${CONFIG.role.savedSetsSelect}"]`);
    /** @type {JQuery<HTMLButtonElement>} */
    const $loadSavedSetBtn = $(`[data-role="${CONFIG.role.loadSavedSet}"]`);
    /** @type {JQuery<HTMLButtonElement>} */
    const $deleteSavedSetBtn = $(`[data-role="${CONFIG.role.deleteSavedSet}"]`);

    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreview = $(`[data-role="${CONFIG.role.savedSetPreview}"]`);
    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreviewMemo = $savedSetPreview.find(
        `[data-role="${CONFIG.role.savedSetPreviewMemo}"]`
    );
    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreviewCreatedAt = $savedSetPreview.find(
        `[data-role="${CONFIG.role.savedSetPreviewCreatedAt}"]`
    );
    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreviewQuestions = $savedSetPreview.find(
        `[data-role="${CONFIG.role.savedSetPreviewQuestions}"]`
    );
    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreviewId = $savedSetPreview.find(`[data-role="${CONFIG.role.savedSetPreviewId}"]`);
    /** @type {JQuery<HTMLElement>} */
    const $savedSetPreviewStats = $savedSetPreview.find(`[data-role="${CONFIG.role.savedSetPreviewStats}"]`);


    return {
        $numOfQuestionsInput,
        $numOfOperandsInput,
        $typeOfOperatorsSelect,
        $numOfDigitsInput,
        $replaceOperandsWithRandomNum,
        $questionsList,
        $saveQuestionsWithinBrowser,
        $saveMemoInput,
        $setNameInput,
        $savedSetsSelect,
        $loadSavedSetBtn,
        $deleteSavedSetBtn,
        $savedSetPreviewMemo,
        $savedSetPreviewCreatedAt,
        $savedSetPreviewQuestions,
        $savedSetPreviewId,
        $savedSetPreviewStats,
    };
}
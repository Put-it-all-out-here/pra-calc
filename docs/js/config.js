    
    // ============================================================
    // CONFIG（設定値を1か所に集約）
    // ============================================================
    /**
     * アプリ全体の設定値。
     *
     * 目的:
     * - 魔法の数値（600msなど）や data-role 文字列の散在を防ぐ
     * - 仕様変更時の修正箇所を最小化する
     */
    export const CONFIG = {
        defaultQuestionListMessage: 'please fill setting',
        storageKey: 'pra-cal.questionSets',

        time: {
            // 表示用（必要なら変えられる）
            locale: null, // null なら navigator.language を使う
            dateStyle: 'short',  // 'short' | 'medium' | 'long' etc.
            timeStyle: 'short',  // 'short' | 'medium' | 'long' etc.
            hour12: false,       // true にすると 12時間表記
        },

        answer: {
            longPressMs: 600,
            moveCancelThresholdPx: 10,
            eps: 1e-9,
        },

        css: {
            correct: 'question--correct',
            wrong: 'question--wrong',
            inputError: 'input-error',
        },
        fontWeight: {
            normal: 400,
            result: 700, // correct/wrong時の太さ（ここを変更するだけ）
        },
        cssVar: {
            questionNormalWeight: '--question-normal-weight',
            questionResultWeight: '--question-result-weight',
        },
        setName: {
            // option見切れしない想定の最大文字数（まずは仮。実測して調整）
            maxLen: 18,
            // 空なら自動命名する
            autoNamePrefix: 'set',
        },

        // saved sets <option> の表示を短くするための設定
        optionLabel: {
            // <option> に表示する memo の最大文字数（見切れ対策）
            maxMemoLen: 14,

            // <option> に表示する setName の最大文字数
            maxSetNameLen: 14,

            // 未回答も option の集計に含めて表示する
            showUnanswered: true,
        },

        role: {
            // settings
            numOfQuestions: 'num-of-questions',
            numOfOperands: 'num-of-operands',
            typeOfOperators: 'type-of-operators',
            numOfDigits: 'num-of-digits',

            // buttons
            replaceOperandsWithRandomNum: 'replace-operands-with-random-num',

            // questions
            questionsList: 'questions-list',

            // save/export
            saveQuestionsWithinBrowser: 'save-questions-within-browser',
            exportQuestionsAsCsv: 'export-questions-as-csv',
            questionsMemo: 'questions-memo',
            setName: 'set-name',

            // saved sets
            savedSetsSelect: 'saved-sets-select',
            loadSavedSet: 'load-saved-set',
            deleteSavedSet: 'delete-saved-set',
            savedSetPreview: 'saved-set-preview',
            savedSetPreviewMemo: 'saved-set-preview-memo',
            savedSetPreviewCreatedAt: 'saved-set-preview-created-at',
            savedSetPreviewQuestions: 'saved-set-preview-questions',
            savedSetPreviewId: 'saved-set-preview-id',
            savedSetPreviewStats: 'saved-set-preview-stats',

            // misc ui
            stepPlus: 'step-plus',
            stepMinus: 'step-minus',
            sectionToggle: 'section-toggle',
            section: 'section',

            // answer ui
            answerBox: 'answerbox',
            answerInput: 'answer-input',
            answerCheck: 'answer-check',
            answerClose: 'answer-close',
        },
    };

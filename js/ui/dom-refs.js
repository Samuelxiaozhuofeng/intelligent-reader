/**
 * DOM References
 * Centralizes `document.getElementById` lookups.
 */

export const elements = {
  // Views
  bookshelfView: document.getElementById('bookshelfView'),
  readerView: document.getElementById('readerView'),
  reviewView: document.getElementById('reviewView'),
  vocabLibraryView: document.getElementById('vocabLibraryView'),

  // Bookshelf
  booksContainer: document.getElementById('booksContainer'),
  emptyBookshelf: document.getElementById('emptyBookshelf'),
  importBookBtn: document.getElementById('importBookBtn'),
  importBtnEmpty: document.getElementById('importBtnEmpty'),
  importUrlBtn: document.getElementById('importUrlBtn'),
  importUrlBtnEmpty: document.getElementById('importUrlBtnEmpty'),
  gridViewBtn: document.getElementById('gridViewBtn'),
  listViewBtn: document.getElementById('listViewBtn'),
  languageTabs: document.getElementById('languageTabs'),
  languageTabEn: document.getElementById('languageTabEn'),
  languageTabEs: document.getElementById('languageTabEs'),
  languageTabJa: document.getElementById('languageTabJa'),
  reviewButtonsContainer: document.getElementById('reviewButtonsContainer'),
  reviewBtn: document.getElementById('reviewBtn'),
  themeToggleBtnShelf: document.getElementById('themeToggleBtnShelf'),
  themeIconShelf: document.getElementById('themeIconShelf'),
  authBtn: document.getElementById('authBtn'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  mobileHeaderMenu: document.getElementById('mobileHeaderMenu'),
  mobileAuthMenuItem: document.getElementById('mobileAuthMenuItem'),
  knownWordsCard: document.getElementById('knownWordsCard'),
  knownWordsTotal: document.getElementById('knownWordsTotal'),
  knownWordsToday: document.getElementById('knownWordsToday'),
  knownWordsLanguageLabel: document.getElementById('knownWordsLanguageLabel'),

  // Context Menu
  bookContextMenu: document.getElementById('bookContextMenu'),
  renameBookBtn: document.getElementById('renameBookBtn'),
  deleteBookBtn: document.getElementById('deleteBookBtn'),

  // Rename Modal
  renameModal: document.getElementById('renameModal'),
  newBookTitle: document.getElementById('newBookTitle'),
  closeRenameBtn: document.getElementById('closeRenameBtn'),
  cancelRenameBtn: document.getElementById('cancelRenameBtn'),
  confirmRenameBtn: document.getElementById('confirmRenameBtn'),

  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  deleteConfirmText: document.getElementById('deleteConfirmText'),
  closeDeleteBtn: document.getElementById('closeDeleteBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  // File input
  fileInput: document.getElementById('fileInput'),

  // URL Import Modal
  urlImportModal: document.getElementById('urlImportModal'),
  urlImportForm: document.getElementById('urlImportForm'),
  urlImportInput: document.getElementById('urlImportInput'),
  urlImportTitle: document.getElementById('urlImportTitle'),
  closeUrlImportBtn: document.getElementById('closeUrlImportBtn'),
  cancelUrlImportBtn: document.getElementById('cancelUrlImportBtn'),
  urlImportSubmitBtn: document.getElementById('urlImportSubmitBtn'),

  // Auth Modal
  authModal: document.getElementById('authModal'),
  authModalTitle: document.getElementById('authModalTitle'),
  closeAuthBtn: document.getElementById('closeAuthBtn'),
  cancelAuthBtn: document.getElementById('cancelAuthBtn'),
  authConfigHint: document.getElementById('authConfigHint'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authError: document.getElementById('authError'),
  submitAuthBtn: document.getElementById('submitAuthBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  authSwitchRow: document.getElementById('authSwitchRow'),
  authSwitchHint: document.getElementById('authSwitchHint'),
  authSwitchBtn: document.getElementById('authSwitchBtn'),

  // Reader Header
  backToShelfBtn: document.getElementById('backToShelfBtn'),
  bookTitle: document.getElementById('bookTitle'),
  toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  typographyBtn: document.getElementById('typographyBtn'),
  zenModeBtn: document.getElementById('zenModeBtn'),
  themeIcon: document.getElementById('themeIcon'),

  // Main content
  mainContent: document.querySelector('.main-content'),
  readingPanel: document.querySelector('.reading-panel'),

  // Chapters / Progress
  chapterSelectBtn: document.getElementById('chapterSelectBtn'),
  chapterInfo: document.getElementById('chapterInfo'),
  chapterProgressFill: document.getElementById('chapterProgressFill'),
  bookProgressPercent: document.getElementById('bookProgressPercent'),
  bookProgressText: document.getElementById('bookProgressText'),

  // Chapter Select Modal
  chapterSelectModal: document.getElementById('chapterSelectModal'),
  closeChapterSelectBtn: document.getElementById('closeChapterSelectBtn'),
  chapterSelectList: document.getElementById('chapterSelectList'),

  // Reading
  readingContent: document.getElementById('readingContent'),
  chapterAnalysisBtn: document.getElementById('chapterAnalysisBtn'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageIndicator: document.getElementById('pageIndicator'),

  // Vocabulary Panel
  vocabPanel: document.getElementById('vocabPanel'),
  resizeHandle: document.getElementById('resizeHandle'),

  // Tabs
  tabVocabAnalysis: document.getElementById('tabVocabAnalysis'),
  tabChapterAnalysis: document.getElementById('tabChapterAnalysis'),
  vocabAnalysisTab: document.getElementById('vocabAnalysisTab'),
  chapterAnalysisTab: document.getElementById('chapterAnalysisTab'),

  // Analysis Content
  vocabAnalysisContent: document.getElementById('vocabAnalysisContent'),
  chapterAnalysisContent: document.getElementById('chapterAnalysisContent'),

  // Settings Modal
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),

  // Settings Form
  apiUrl: document.getElementById('apiUrl'),
  apiKey: document.getElementById('apiKey'),
  toggleKeyBtn: document.getElementById('toggleKeyBtn'),
  modelSelect: document.getElementById('modelSelect'),
  fetchModelsBtn: document.getElementById('fetchModelsBtn'),
  languageSelect: document.getElementById('languageSelect'),
  readingLevelSelect: document.getElementById('readingLevelSelect'),

  // FSRS Settings Form
  fsrsReviewModeGrouped: document.getElementById('fsrsReviewModeGrouped'),
  fsrsReviewModeMixed: document.getElementById('fsrsReviewModeMixed'),
  fsrsRequestRetention: document.getElementById('fsrsRequestRetention'),
  fsrsRequestRetentionValue: document.getElementById('fsrsRequestRetentionValue'),

  // Settings Tabs
  settingsTabAI: document.getElementById('settingsTabAI'),
  settingsTabFSRS: document.getElementById('settingsTabFSRS'),
  settingsTabData: document.getElementById('settingsTabData'),
  aiSettingsContent: document.getElementById('aiSettingsContent'),
  fsrsSettingsContent: document.getElementById('fsrsSettingsContent'),
  dataManagementContent: document.getElementById('dataManagementContent'),

  // Data Erasure Modal
  clearPaginationCacheBtn: document.getElementById('clearPaginationCacheBtn'),
  eraseAllDataBtn: document.getElementById('eraseAllDataBtn'),
  dataEraseModal: document.getElementById('dataEraseModal'),
  closeDataEraseBtn: document.getElementById('closeDataEraseBtn'),
  cancelDataEraseBtn: document.getElementById('cancelDataEraseBtn'),
  confirmDataEraseBtn: document.getElementById('confirmDataEraseBtn'),
  dataEraseInput: document.getElementById('dataEraseInput'),
  dataEraseStatus: document.getElementById('dataEraseStatus'),

  // Auto Study Toggle
  autoStudyToggle: document.getElementById('autoStudyToggle'),
  mobileAutoStudyToggle: document.getElementById('mobileAutoStudyToggle'),

  // Review
  mobileReviewBtn: document.getElementById('mobileReviewBtn'),
  mobileReviewBadge: document.getElementById('mobileReviewBadge'),
  backFromReviewBtn: document.getElementById('backFromReviewBtn'),
  reviewTitle: document.getElementById('reviewTitle'),
  reviewStats: document.getElementById('reviewStats'),
  reviewEmpty: document.getElementById('reviewEmpty'),
  reviewFinishBtn: document.getElementById('reviewFinishBtn'),
  reviewSession: document.getElementById('reviewSession'),
  reviewCard: document.getElementById('reviewCard'),
  reviewDeleteBtn: document.getElementById('reviewDeleteBtn'),
  reviewWord: document.getElementById('reviewWord'),
  reviewMeaning: document.getElementById('reviewMeaning'),
  reviewUsage: document.getElementById('reviewUsage'),
  reviewContext: document.getElementById('reviewContext'),
  reviewContextualMeaning: document.getElementById('reviewContextualMeaning'),
  reviewShowAnswerBtn: document.getElementById('reviewShowAnswerBtn'),
  reviewActions: document.getElementById('reviewActions'),
  reviewHint: document.getElementById('reviewHint'),
  reviewAgainBtn: document.getElementById('reviewAgainBtn'),
  reviewHardBtn: document.getElementById('reviewHardBtn'),
  reviewGoodBtn: document.getElementById('reviewGoodBtn'),
  reviewEasyBtn: document.getElementById('reviewEasyBtn'),
  reviewAgainInterval: document.getElementById('reviewAgainInterval'),
  reviewHardInterval: document.getElementById('reviewHardInterval'),
  reviewGoodInterval: document.getElementById('reviewGoodInterval'),
  reviewEasyInterval: document.getElementById('reviewEasyInterval'),

  // Vocabulary Library
  vocabLibraryBtn: document.getElementById('vocabLibraryBtn'),
  backFromVocabLibraryBtn: document.getElementById('backFromVocabLibraryBtn'),
  startReviewFromLibraryBtn: document.getElementById('startReviewFromLibraryBtn'),
  vocabStatsGrid: document.getElementById('vocabStatsGrid'),
  statLearningCount: document.getElementById('statLearningCount'),
  statDueCount: document.getElementById('statDueCount'),
  statTotalReps: document.getElementById('statTotalReps'),
  vocabLibraryControls: document.getElementById('vocabLibraryControls'),
  vocabLibrarySearchInput: document.getElementById('vocabLibrarySearchInput'),
  vocabLibraryFilterStatus: document.getElementById('vocabLibraryFilterStatus'),
  vocabLibraryFilterLanguage: document.getElementById('vocabLibraryFilterLanguage'),
  vocabLibrarySelectAllBtn: document.getElementById('vocabLibrarySelectAllBtn'),
  vocabLibraryBulkDeleteBtn: document.getElementById('vocabLibraryBulkDeleteBtn'),
  vocabLibraryResultCount: document.getElementById('vocabLibraryResultCount'),
  vocabLibraryPageInfo: document.getElementById('vocabLibraryPageInfo'),
  vocabLibrarySelectedCount: document.getElementById('vocabLibrarySelectedCount'),
  vocabLibraryGrid: document.getElementById('vocabLibraryGrid'),
  vocabLibraryEmpty: document.getElementById('vocabLibraryEmpty'),
  vocabLibraryBackBtn: document.getElementById('vocabLibraryBackBtn'),

  // Edit Vocabulary Modal
  editVocabModal: document.getElementById('editVocabModal'),
  closeEditVocabBtn: document.getElementById('closeEditVocabBtn'),
  cancelEditVocabBtn: document.getElementById('cancelEditVocabBtn'),
  saveEditVocabBtn: document.getElementById('saveEditVocabBtn'),
  editVocabWord: document.getElementById('editVocabWord'),
  editVocabMeaning: document.getElementById('editVocabMeaning'),
  editVocabUsage: document.getElementById('editVocabUsage'),
  editVocabContext: document.getElementById('editVocabContext'),
  editVocabContextualMeaning: document.getElementById('editVocabContextualMeaning'),

  // Delete Vocabulary Modal
  deleteVocabModal: document.getElementById('deleteVocabModal'),
  closeDeleteVocabBtn: document.getElementById('closeDeleteVocabBtn'),
  cancelDeleteVocabBtn: document.getElementById('cancelDeleteVocabBtn'),
  confirmDeleteVocabBtn: document.getElementById('confirmDeleteVocabBtn'),
  deleteVocabConfirmText: document.getElementById('deleteVocabConfirmText'),

  // Bulk Delete Vocabulary Modal
  bulkDeleteVocabModal: document.getElementById('bulkDeleteVocabModal'),
  closeBulkDeleteVocabBtn: document.getElementById('closeBulkDeleteVocabBtn'),
  cancelBulkDeleteVocabBtn: document.getElementById('cancelBulkDeleteVocabBtn'),
  confirmBulkDeleteVocabBtn: document.getElementById('confirmBulkDeleteVocabBtn'),
  bulkDeleteVocabConfirmText: document.getElementById('bulkDeleteVocabConfirmText'),
  bulkDeleteVocabPreviewList: document.getElementById('bulkDeleteVocabPreviewList'),

  // Known Words Modal
  knownWordsModal: document.getElementById('knownWordsModal'),
  closeKnownWordsBtn: document.getElementById('closeKnownWordsBtn'),
  knownWordsTabs: document.getElementById('knownWordsTabs'),
  knownWordsTabAll: document.getElementById('knownWordsTabAll'),
  knownWordsTabToday: document.getElementById('knownWordsTabToday'),
  knownWordsSearchInput: document.getElementById('knownWordsSearchInput'),
  knownWordsLanguageFilter: document.getElementById('knownWordsLanguageFilter'),
  knownWordsResultCount: document.getElementById('knownWordsResultCount'),
  knownWordsPageInfo: document.getElementById('knownWordsPageInfo'),
  knownWordsList: document.getElementById('knownWordsList'),
  knownWordsEmpty: document.getElementById('knownWordsEmpty'),
  knownWordsLoading: document.getElementById('knownWordsLoading'),
  knownWordsPrevPage: document.getElementById('knownWordsPrevPage'),
  knownWordsNextPage: document.getElementById('knownWordsNextPage'),
  knownWordsPageSummary: document.getElementById('knownWordsPageSummary'),

  // Import: Language Select Modal
  languageSelectModal: document.getElementById('languageSelectModal'),
  closeLanguageSelectBtn: document.getElementById('closeLanguageSelectBtn'),
  cancelLanguageSelectBtn: document.getElementById('cancelLanguageSelectBtn'),
  languageSelectButtons: document.getElementById('languageSelectButtons'),

  // Mobile Vocab Bottom Sheet
  mobileVocabOverlay: document.getElementById('mobileVocabOverlay'),
  mobileVocabSheet: document.getElementById('mobileVocabSheet'),
  mobileVocabContent: document.getElementById('mobileVocabContent'),
  mobileVocabPeekPill: document.getElementById('mobileVocabPeekPill'),
  mobileVocabPeekPillMain: document.getElementById('mobileVocabPeekPillMain'),
  mobileVocabPeekPillLabel: document.getElementById('mobileVocabPeekPillLabel'),
  mobileVocabPeekPillWord: document.getElementById('mobileVocabPeekPillWord'),
  mobileVocabPeekPillClose: document.getElementById('mobileVocabPeekPillClose'),

  // Mobile Chapter Analysis Bottom Sheet
  mobileChapterOverlay: document.getElementById('mobileChapterOverlay'),
  mobileChapterSheet: document.getElementById('mobileChapterSheet'),
  mobileChapterContent: document.getElementById('mobileChapterContent'),
  mobileChapterAnalysisRefreshBtn: document.getElementById('mobileChapterAnalysisRefreshBtn'),
  mobileChapterAnalysisCloseBtn: document.getElementById('mobileChapterAnalysisCloseBtn'),

  // Mobile Chapter Peek Pill
  mobileChapterPeekPill: document.getElementById('mobileChapterPeekPill'),
  mobileChapterPeekPillMain: document.getElementById('mobileChapterPeekPillMain'),
  mobileChapterPeekPillLabel: document.getElementById('mobileChapterPeekPillLabel'),
  mobileChapterPeekPillTitle: document.getElementById('mobileChapterPeekPillTitle'),
  mobileChapterPeekPillClose: document.getElementById('mobileChapterPeekPillClose')
};

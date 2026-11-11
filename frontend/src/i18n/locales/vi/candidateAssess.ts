export const candidateAssessVi = {
  common: {
    minutes: "{count} phút",
    points: "{count} điểm",
    pointsShort: "{score} / {total} đ",
    retry: "Thử lại",
    back: "Quay lại",
  },
  aiEval: {
    arithmeticSumOptimal:
      "Mã nguồn cài đặt chính xác công thức cấp số cộng để tính tổng từ 1 đến n với độ phức tạp thời gian O(1). Thuật toán ngắn gọn, sạch sẽ và tối ưu.",
    extremelyClean:
      "Mã nguồn rất sạch sẽ, cấu trúc rõ ràng và không có đoạn mã thừa thãi.",
    sumFormula:
      "Mã nguồn cài đặt chính xác công thức tính tổng từ 1 đến n",
    correctlyImplements: "Mã nguồn cài đặt chính xác {subject}",
    cleanConciseOptimal: "Mã nguồn sạch sẽ, ngắn gọn và tối ưu.",
    cleanOptimalGoodPractices:
      "Mã nguồn sạch, tối ưu và tuân thủ các quy ước lập trình chuẩn.",
    wellStructuredReadable:
      "Mã nguồn có cấu trúc tốt, rõ ràng và dễ đọc.",
    solutionCleanConciseOptimal: "Giải pháp sạch sẽ, ngắn gọn và tối ưu.",
    solutionOptimal: "Giải pháp đạt mức tối ưu cao.",
    noBoilerplate: "Mã nguồn không có cú pháp thừa thãi.",
    namingClear: "Quy ước đặt tên biến và hàm rõ ràng, chuẩn mực.",
    cleanStructured: "Mã nguồn sạch sẽ và có cấu trúc tốt.",
    timeComplexityOptimal: "Độ phức tạp thời gian đạt mức tối ưu.",
    spaceComplexityOptimal: "Độ phức tạp bộ nhớ đạt mức tối ưu.",
    noAnswerSubmitted: "Chưa nộp câu trả lời.",
    autoGradingUnavailable:
      "Chấm điểm tự động tạm thời chưa khả dụng. Vui lòng chấm thủ công hoặc thử lại sau.",
    allTestCasesPassed:
      "Tất cả các ca kiểm thử đều vượt qua thành công.",
    goodExceptionSafety: "Xử lý ngoại lệ an toàn và chặt chẽ.",
    bulletCodeIs: "• Mã nguồn",
  },
  examFullscreen: {
    notSupported: "Trình duyệt không hỗ trợ toàn màn hình.",
    openFailed: "Không mở được toàn màn hình.",
    blockedByBrowser:
      "Trình duyệt chặn toàn màn hình. Hãy bấm Bắt đầu lại khi cửa sổ Chrome đang được focus.",
    notEntered:
      "Trình duyệt chưa vào chế độ toàn màn hình. Hãy bấm lại nút để tiếp tục.",
  },
  submission: {
    leaveTitle: "Rời trang?",
    leaveDescription: "Có câu trả lời chưa lưu. Bạn vẫn muốn rời trang?",
    leaveConfirm: "Rời trang",
  },
  answerInput: {
    loadingCodeEditor: "Đang tải trình soạn thảo code…",
    unsupportedType: "Loại câu hỏi này chưa được hỗ trợ.",
    selectMultiplePrompt:
      "Chọn tất cả các đáp án đúng (có thể chọn nhiều phương án):",
    selectSinglePrompt: "Chọn một phương án trả lời đúng nhất:",
    clearSelection: "Bỏ chọn",
    optionsAriaLabel: "Các phương án trả lời",
  },
  invitation: {
    invalidTestId: "Mã bài kiểm tra không hợp lệ.",
    backToAssessments: "Bài đánh giá",
    loadingInvitation: "Đang tải lời mời bài đánh giá",
    noEligibleTitle: "Không có đơn đang ở vòng đánh giá",
    noEligibleDesc:
      "Lời mời chỉ mở khi hồ sơ đang ở giai đoạn Assessment.",
    notFoundTitle: "Không tìm thấy lời mời bài này",
    notFoundDesc:
      "Bài #{testId} không thuộc đơn đang chọn hoặc chưa được gửi tới bạn.",
    applicationSelectLabel: "Đơn ứng tuyển",
    applicationOption: "{jobTitle} · Đơn #{id}",
    eyebrow: "Lời mời · {companyName}",
    durationLabel: "Thời lượng",
    passingScoreLabel: "Ngưỡng đạt",
    passingScoreByTest: "Theo đề",
    statusLabel: "Trạng thái",
    rulesHeading: "Quy chế phòng thi",
    guidelinesHeading: "Lưu ý kỹ thuật & Tiến trình bài làm",
    applicationRef: "Đơn #{id}",
    applicationDetailLink: "Chi tiết đơn",
    nextStepEyebrow: "Bước tiếp theo",
    continueExamHeading: "Tiếp tục bài thi",
    retakeDemoHeading: "Làm lại bài demo",
    enterExamHeading: "Vào bài kiểm tra",
    nextStepDesc:
      "Xác nhận quy chế, rồi kiểm tra camera, microphone và chia sẻ màn hình trước khi vào bài.",
    acceptRulesTitle: "Tôi đồng ý quy chế phòng thi",
    acceptRulesDesc:
      "Cam kết làm bài trung thực và chấp nhận giám sát thiết bị.",
    acceptRulesHint: "Bấm để đồng ý và mở kiểm tra thiết bị",
    gateLockedPlaceholder:
      "Đồng ý quy chế bên trên để kiểm tra camera, microphone và chia sẻ màn hình.",
    viewPreviousResult: "Xem kết quả lần làm trước",
    viewResultHeading: "Xem kết quả",
    viewResultDesc: "Bài đã nộp. Bạn có thể xem kết quả.",
    viewResultButton: "Xem kết quả bài làm",
    gateButtonContinue: "Tiếp tục làm bài",
    gateButtonRetake: "Làm lại từ đầu",
    gateButtonStart: "Bắt đầu làm bài",
    guidelines: {
      timerTitle: "Đồng hồ đếm ngược liên tục:",
      timerBody:
        "Thời gian {minutes} phút sẽ chạy liên tục sau khi bắt đầu và không thể tạm dừng.",
      syncTitle: "Đồng bộ tự động tức thì (Real-time Cloud Sync):",
      syncBody:
        "Mỗi khi chọn một phương án, hệ thống sẽ lưu ngay lập tức lên máy chủ.",
      resilienceTitle:
        "Cơ chế phục hồi ngắt kết nối (Network Resilience):",
      resilienceBody:
        "Nếu mạng bị ngắt quãng, bài thi vẫn giữ nguyên tiến độ đã làm và tự đồng bộ trở lại khi có tín hiệu.",
    },
    regulations: {
      fullscreenTitle: "Chế độ Toàn màn hình bắt buộc",
      fullscreenBody:
        "Bài thi tự động kích hoạt toàn màn hình. Thoát toàn màn hình hoặc chuyển tab quá 3 lần sẽ tự động khóa bài thi.",
      noDevtoolsTitle: "Không sử dụng DevTools & AI ngoài",
      noDevtoolsBody:
        "Mọi hành vi mở F12, sao chép câu hỏi hoặc dùng extension hỗ trợ sẽ bị ghi lại.",
      deviceReqTitle: "Yêu cầu thiết bị khuyến nghị",
      deviceReqBody:
        "Trình duyệt Google Chrome, Edge hoặc Safari phiên bản mới nhất trên máy tính (PC/Laptop).",
    },
  },
  proctorGate: {
    defaultStartLabel: "Bắt đầu làm bài",
    devicesStoppedError:
      "Camera, microphone hoặc chia sẻ màn hình đã dừng. Hãy kiểm tra thiết bị lại.",
    fullscreenUnsupportedError:
      "Trình duyệt không hỗ trợ chế độ toàn màn hình.",
    checkFailedError: "Không thể hoàn tất kiểm tra thiết bị.",
    title: "Kiểm tra thiết bị",
    microphoneChip: "Microphone",
    entireScreenChip: "Cả màn hình",
    cameraChip: "Camera",
    consentLabel:
      "Cho phép camera, microphone và chia sẻ toàn bộ màn hình trong suốt bài thi. Tắt thiết bị, để khuôn mặt ra khỏi khung, hoặc có thêm người trong khung camera được tính là vi phạm.",
    devicesReady:
      "Thiết bị sẵn sàng. Bấm để vào toàn màn hình và bắt đầu.",
    openingExam: "Đang mở bài…",
    checkingDevices: "Đang kiểm tra…",
    checkDevicesButton: "Kiểm tra thiết bị",
  },
  proctorGuard: {
    examRoomTitle: "Phòng thi",
    defaultCandidate: "Ứng viên",
    fullscreenFallbackError: "Không mở được toàn màn hình.",
    openingFullscreen: "Đang mở toàn màn hình…",
    openFullscreen: "Mở toàn màn hình",
    fullscreenLabel: "Toàn màn hình",
    violationsPrefix: "Vi phạm:",
    warningTitle: "Cảnh báo giám sát",
    returnToExam: "Quay lại bài thi",
    violationWillAutoSubmit:
      "{message} ({count}/{max}). Bài sẽ được tự động nộp.",
    violationWarning:
      "{message} ({count}/{max}). Vui lòng quay lại phòng thi.",
    face: {
      loading: "Đang tải nhận diện…",
      ready: "Đang nhận diện…",
      present: "Mặt trong khung",
      absent: "Mất mặt",
      multi: "Nhiều người",
      unavailable: "Không nhận diện được",
    },
    violations: {
      multiFace: "Phát hiện nhiều khuôn mặt trong khung hình camera",
      lostFace: "Khuôn mặt không còn trong khung hình camera",
      microphoneLost: "Microphone đã bị tắt",
      cameraLost: "Camera đã bị tắt",
      fullscreenExit: "Bạn đã thoát chế độ toàn màn hình",
      pageHidden: "Bạn đã chuyển tab hoặc ẩn trang thi",
      windowBlur: "Cửa sổ thi đã mất tiêu điểm",
      contextMenu: "Menu chuột phải đã bị chặn",
      copyAttempt: "Sao chép nội dung đã bị chặn",
      pasteAttempt: "Dán nội dung đã bị chặn",
      blockedShortcut: "Phím tắt {key} đã bị chặn",
      screenShareStopped: "Chia sẻ màn hình đã dừng",
    },
  },
  result: {
    eyebrow: "Kết quả bài kiểm tra",
    demoBadge: "Demo UI",
    summaryEyebrow: "Tổng hợp",
    scoreHeading: "Điểm số",
    evaluationHeading: "Đánh giá",
    nextStepHeading: "Bước tiếp theo",
    sessionDetailsHeading: "Chi tiết phiên",
    startedLabel: "Bắt đầu",
    submittedLabel: "Nộp bài",
    submittedAtInline: "Nộp {when}",
    submissionIdLabel: "Mã bài nộp",
    structureHeading: "Cấu trúc đề",
    totalQuestions: "Tổng câu",
    quizQuestions: "Trắc nghiệm",
    codingQuestions: "Lập trình",
    demoDisclaimer:
      "Bài demo giao diện — điểm không ảnh hưởng vòng tuyển dụng.",
    aiEvaluationHeading: "Đánh giá từ Trợ lý AI",
    aiEngineBadge: "Hybrid AI Engine",
    questionMetaCoding: "Câu {order} · Bài thi lập trình",
    questionMetaEssay: "Câu {order} · Câu hỏi tự luận",
    questionMetaQuiz: "Câu {order} · Đánh giá trắc nghiệm",
    testsPassedChip: "Kiểm thử: {passed}",
    timeComplexityChip: "Thời gian: {value}",
    spaceComplexityChip: "Bộ nhớ: {value}",
    hardcodeWarning:
      "Phát hiện nghi vấn hardcode test case (áp trần 50% số điểm).",
    aiCommentHeading: "Nhận xét của AI:",
    rubricHeading: "Tiêu chí Rubric:",
    rubricCriterionFallback: "Tiêu chí {index}",
    backToList: "Quay về danh sách",
    opening: "Đang mở…",
    retakeFromStart: "Làm lại từ đầu",
    scorePctLabel: "{pct}% tổng điểm",
    scoreProgressAria: "Tỷ lệ điểm đạt được",
    headline: {
      failed: "Chấm bài không thành công",
      expired: "Đã hết thời gian làm bài",
      grading: "Hệ thống đang chấm bài của bạn",
      submittedOrPending: "Đã nộp bài — Đang chờ chấm",
      completed: "Bài làm đã được chấm điểm",
      recorded: "Bài làm đã được ghi nhận",
    },
    detail: {
      failed:
        "Hệ thống gặp sự cố khi tự động chấm điểm. Nhà tuyển dụng đã nhận được bài và sẽ kiểm tra, cập nhật điểm cho bạn.",
      grading:
        "Hệ thống đang chạy test case và đánh giá mã nguồn bằng AI. Kết quả sẽ tự động hiển thị trong giây lát...",
      submittedOrPending:
        "Bài nộp đã được tiếp nhận an toàn và đưa vào hàng đợi chấm bài bất đồng bộ.",
      pending:
        "Câu trả lời đã được lưu. Điểm chính thức sẽ cập nhật sau khi nhà tuyển dụng hoàn tất chấm.",
      passed:
        "Bạn đã hoàn tất bài kiểm tra và đạt ngưỡng yêu cầu của đề.",
      failedThreshold:
        "Bạn đã hoàn tất bài kiểm tra. Điểm hiện chưa đạt ngưỡng yêu cầu của đề.",
      completedDefault:
        "Bạn đã hoàn tất bài kiểm tra. Dưới đây là tóm tắt kết quả.",
    },
    verdict: {
      failed: "Chấm thất bại",
      grading: "Đang chấm điểm",
      submittedOrPending: "Đang chờ chấm",
      pending: "Chờ chấm điểm",
      graded: "Đã chấm điểm",
      passed: "Đạt yêu cầu",
      failedThreshold: "Chưa đạt yêu cầu",
    },
    pendingTitle: {
      failed: "Chấm thất bại",
      grading: "Đang chấm điểm…",
      submittedOrPending: "Đang chờ chấm",
      waiting: "Chờ kết quả",
    },
    pendingSubtitle: {
      failed: "Cần nhà tuyển dụng hỗ trợ",
      grading: "Đang chạy test case và AI review...",
      waiting: "Sẽ có điểm sau ít phút",
    },
    nextStep: {
      pending:
        "Theo dõi điểm trong danh sách bài đánh giá khi nhà tuyển dụng hoàn tất chấm.",
      passed:
        "Kết quả đạt yêu cầu đã được ghi nhận trên hồ sơ ứng tuyển.",
      failed: "Theo dõi bước tiếp theo trên trang đơn ứng tuyển.",
      default: "Kết quả đã được lưu cho nhà tuyển dụng xem lại.",
    },
  },
  coding: {
    defaultTitle: "{title} · {points} điểm",
    fallbackTitleName: "Thử thách lập trình",
    constraintsHeading: "Ràng buộc",
    examplesHeading: "Ví dụ Input / Output",
    exampleItem: "Ví dụ {index}",
    exampleIo: "Input: {input}\nOutput: {output}",
    exampleExplanation: "Giải thích: {text}",
    sandboxHint:
      "Chạy thử tối đa 5 test công khai hoặc nhập stdin tùy chỉnh. Test ẩn chỉ dùng khi chấm bài. Mã nguồn tối đa 10.000 ký tự.",
    consoleAria: "Console test cases",
    consoleHeading: "Console",
    sampleSummary: "{passed}/{total} test mẫu đạt",
    consoleModesAria: "Chế độ console",
    sampleTestsTab: "Test mẫu",
    customInputTab: "Custom input",
    sampleCaseNavAria: "Test case đang xem",
    testCaseButton: "Test Case {index}",
    runningInSandbox: "Đang thực thi mã nguồn trong sandbox…",
    statusPassed: "Đạt",
    statusProcessing: "Đang xử lý",
    statusExecError: "Quá thời gian / Lỗi thực thi / Biên dịch",
    statusFailed: "Không đạt",
    inputLabel: "Input",
    expectedOutputLabel: "Expected Output",
    actualOutputLabel: "Actual Output",
    noOutputYet: "Chưa có kết quả chạy",
    terminalLabel: "Terminal",
    customStdinHint:
      "Chạy với stdin tùy chỉnh. Không so với expected output — chỉ xem stdout/stderr.",
    customStdinLabel: "Custom stdin",
    runningCustom: "Đang chạy…",
    runCustomButton: "Chạy custom input",
    customCompleted: "Chạy xong",
    customError: "Lỗi biên dịch / runtime",
    stdoutLabel: "Stdout",
    emptyOutput: "(trống)",
    languageLabel: "Ngôn ngữ",
    switchLangTitle: "Đổi ngôn ngữ?",
    switchLangDesc:
      "Mã hiện tại sẽ được thay bằng starter code của ngôn ngữ mới.",
    switchLangConfirm: "Đổi ngôn ngữ",
    sampleCodeInserted: "Đã chèn code mẫu giải bài.",
    insertSampleTitle:
      "Chèn code mẫu giải thuật toán để test thử (chỉ dùng cho bài thi Demo UI)",
    insertSampleButton: "Code mẫu test",
    resetCodeTitle: "Khôi phục code ban đầu?",
    resetCodeDesc:
      "Thao tác này thay mã đang viết bằng starter code. Bạn sẽ cần viết lại các thay đổi.",
    resetCodeConfirm: "Khôi phục",
    resetCodeButton: "Khôi phục",
    editorAriaLabel: "Mã nguồn bài làm",
    sourceTooLongError:
      "Mã nguồn tối đa 10.000 ký tự. Phần nhập vượt giới hạn chưa được áp dụng.",
    editorFooterHint:
      "{count}/{max} ký tự · Ctrl+Enter / ⌘+Enter: chạy test mẫu. Tab: di chuyển giữa các điều khiển.",
    runningSamples: "Đang chạy…",
    runSamplesButton: "Chạy thử Test Case",
    saving: "Đang lưu…",
    saveButton: "Lưu bài làm",
    savedToServer:
      "Đã lưu mã nguồn lên máy chủ. Bấm Nộp bài để hoàn tất toàn bài thi.",
    updatedLocally:
      "Đã cập nhật mã nguồn. Bấm Nộp bài để hoàn tất toàn bài thi.",
    runSamplesAction: "Chạy các test case mẫu",
    sampleComment: "Code mẫu: tính tổng các số từ 1 đến n",
    sampleFallbackComment: "// Code mẫu giải bài\n",
  },
  essay: {
    defaultSelection: "nội dung",
    heading: "Câu hỏi tự luận {number} · {points} điểm",
    tipsHeading: "Gợi ý trình bày",
    tipsBody:
      "Trả lời đúng trọng tâm, giải thích nguyên lý và phân tích ưu/nhược điểm. Liên hệ ví dụ thực tế và nêu rõ giả định của bạn.",
    toolbarAria: "Định dạng câu trả lời",
    boldAria: "In đậm",
    italicAria: "In nghiêng",
    inlineCodeAria: "Code inline",
    bulletListAria: "Gạch đầu dòng",
    editMode: "Soạn thảo",
    previewMode: "Xem trước",
    answerLabel: "Câu trả lời tự luận (hỗ trợ nhập Markdown)",
    emptyPreview: "Chưa có nội dung trả lời.",
    wordAndCharCount: "{words} từ · {chars}/{max} ký tự",
    draftSaveError:
      "Không thể lưu nháp trên thiết bị. Giữ trang mở và lưu lên máy chủ.",
    draftSavedAt: "Đã tự động lưu nháp trên thiết bị lúc {time}",
    draftHint:
      "Nháp lưu trên thiết bị sau 1 giây; đồng bộ máy chủ mỗi 10 giây.",
  },
  stepper: {
    navAria: "Các phần bài đánh giá",
    part1Title: "Phần 1: Trắc nghiệm & Tự luận",
    part1Meta: "({count} câu{suffix})",
    lockedSuffix: " · Đã khóa",
    remainingSuffix: " · Còn {time}",
    part2Title: "Phần 2: Lập trình",
    part2Meta: "({count} bài{suffix})",
    noneSuffix: " · Không có",
    inProgressSuffix: " · Đang làm",
    unlockAfterPart1Suffix: " · Mở sau P1",
  },
  assessmentsList: {
    eyebrow: "Vòng đánh giá kỹ thuật",
    title: "Bài đánh giá",
    subtitle:
      "Mỗi hồ sơ nhận một đề riêng từ ngân hàng câu hỏi. Đề mẫu [Demo UI] dùng để xem giao diện và có thể làm lại nhiều lần, không tính vào kết quả hồ sơ.",
    metricInvitations: "Lời mời",
    metricReady: "Cần thực hiện",
    metricCompleted: "Đã hoàn tất",
    beforeStartStrong: "Trước khi bắt đầu:",
    beforeStartBody:
      "mở lời mời để đọc quy chế và hoàn tất kiểm tra thiết bị. Đồng hồ chỉ chạy sau khi bạn vào phòng thi.",
    loadingLabel: "Đang tải lời mời bài đánh giá",
    emptyTitle: "Chưa có đề được nhà tuyển dụng giao",
    emptyDesc:
      "Đề chính thức sẽ xuất hiện khi hồ sơ ứng tuyển của bạn vượt qua vòng lọc CV.",
    cardEyebrow: "Lời mời Assessment",
    durationLabel: "Thời lượng",
    passingScoreLabel: "Ngưỡng đạt",
    passingScoreByTest: "Theo đề",
    applicationLabel: "Đơn ứng tuyển",
    statusLabel: "Trạng thái bài",
    footerNotStarted:
      "Xem lời mời, quy chế rồi kiểm tra thiết bị trước khi vào bài",
    footerInProgress: "Bạn có thể tiếp tục phiên đang mở",
    footerDone: "Xem kết quả hoặc mở lại lời mời",
    actionContinue: "Tiếp tục làm bài",
    actionRetake: "Làm lại từ đầu",
    actionViewResult: "Xem kết quả",
    actionViewInvitation: "Xem lời mời",
  },
  take: {
    invalidSubmissionId: "Mã bài làm không hợp lệ.",
    submitTitle: "Nộp bài?",
    submitDesc:
      "Bạn đã trả lời {answered}/{total} câu. Sau khi nộp không thể sửa.",
    submitConfirm: "Nộp bài",
    retakeTitle: "Làm lại từ đầu?",
    retakeDesc:
      "Bạn sẽ quay lại lời mời để đồng ý quy chế và kiểm tra thiết bị trước khi làm lại.",
    retakeConfirm: "Đến lời mời",
    completeObjTitle: "Chốt phần trắc nghiệm & tự luận?",
    completeObjDesc:
      "Sau khi chốt bạn sẽ chuyển sang phần lập trình và không thể sửa phần này.",
    completeObjConfirm: "Chốt phần 1",
    loadingResults: "Đang tải kết quả…",
    statusSubmitting: "Đang nộp bài…",
    statusSaving: "Đang lưu…",
    statusUnsaved: "Chưa lưu hết thay đổi",
    statusSaved: "Đã lưu",
    redirectingToInvite:
      "Đang chuyển về lời mời để kiểm tra thiết bị…",
    fullscreenHeading: "Mở toàn màn hình để làm bài",
    fullscreenDesc:
      "Bài kiểm tra yêu cầu làm ở chế độ toàn màn hình. Hãy bấm nút bên dưới để mở toàn màn hình và tiếp tục.",
    officialTitleFallback: "BÀI ĐÁNH GIÁ CHÍNH THỨC",
    timerAria: "Thời gian còn lại",
    codingNavLabel: "Bài toán:",
    quizNavLabel: "Danh sách câu:",
    questionTitle: "Câu {index} · {points} điểm",
    progressLabel: "Tiến độ:",
    progressCount: "{answered} / {total} câu đã trả lời",
    loadingExam: "Đang tải bài làm…",
    noCodingQuestions: "Không có câu lập trình. Bạn có thể nộp bài.",
    noQuizQuestions:
      "Không có câu hỏi phần trắc nghiệm & tự luận. Bạn có thể chuyển sang phần lập trình.",
    questionCounter: "Câu {current} / {total}",
    questionTypeMultiple: "Chọn nhiều đáp án",
    questionTypeSingle: "Trắc nghiệm một đáp án",
    prevProblem: "Bài trước",
    nextProblem: "Bài tiếp",
    footerProgress: "{saveLabel} · {answered}/{total} câu đã trả lời",
    submittingButton: "Đang nộp…",
    finishButton: "Hoàn tất bài",
    submitExamButton: "Nộp bài thi",
    prevQuestion: "Câu trước",
    nextQuestion: "Câu tiếp theo",
    completePart1Button: "Hoàn thành phần 1 & Sang phần Lập trình",
  },
  sample: {
    header: {
      backTitle: "Quay lại Danh sách Đánh giá",
      badge: "GIAO DIỆN MẪU ỨNG VIÊN",
      simulationNote: "(Mô phỏng trải nghiệm thi thực tế)",
      title: "Bài đánh giá kỹ thuật Senior Full-Stack Engineer",
      pauseTimer: "Tạm dừng",
      resumeTimer: "Tiếp tục",
      resetSample: "Đặt lại mẫu",
      stagesAria: "Các bước làm bài thi",
    },
    stages: {
      invitationLabel: "1. Thư mời & Kiểm tra thiết bị",
      invitationDesc: "Thiết bị & Thu âm tự động",
      mcqLabel: "2. Trắc nghiệm MCQ",
      mcqDesc: "5 câu lý thuyết",
      essayLabel: "3. Tự luận Kỹ thuật",
      essayDesc: "Thiết kế kiến trúc",
      codingLabel: "4. Lập trình Coding Studio",
      codingDesc: "Phong cách HackerRank",
      resultLabel: "5. Kết quả & Đánh giá AI",
      resultDesc: "Điểm số & Báo cáo năng lực",
    },
    difficulty: {
      easy: "Dễ",
      medium: "Trung bình",
      hard: "Nâng cao",
    },
    mcq: {
      q1Question:
        "Trong Spring Boot 3 & Spring Web, sự khác biệt căn bản nhất giữa `@RestController` và `@Controller` là gì?",
      q1OptA:
        "`@RestController` tự động bao hàm `@Controller` và `@ResponseBody`, mặc định serialize đối tượng trả về thành JSON/XML.",
      q1OptB:
        "`@RestController` chỉ hỗ trợ giao thức HTTP GET, các phương thức POST/PUT bắt buộc dùng `@Controller`.",
      q1OptC:
        "`@RestController` chạy trên Thread Pool riêng biệt của Netty, còn `@Controller` chạy trên Tomcat.",
      q1OptD:
        "`@RestController` bắt buộc tất cả endpoint phải có header `X-Tenant-ID`.",
      q2Question:
        "Hook mới nào trong React 19 cho phép quản lý trạng thái form action bất đồng bộ, trả về `[state, formAction, isPending]`?",
      q3Question:
        "Trong MySQL InnoDB, loại Index nào được tổ chức theo cấu trúc B+Tree mà thứ tự vật lý của các dòng dữ liệu trên đĩa trùng với thứ tự khóa Index?",
      q3OptA: "Secondary Index (Non-clustered Index)",
      q3OptB: "Clustered Index (Primary Key Index)",
      q3OptC: "Fulltext Search Index",
      q3OptD: "Adaptive Hash Index",
      q4Question:
        "Trong kiến trúc SaaS 'Database-per-Tenant' (mỗi Tenant một DB riêng), phương pháp nào an toàn nhất để ngăn rò rỉ dữ liệu giữa các doanh nghiệp khi xử lý tác vụ bất đồng bộ (RabbitMQ Worker)?",
      q4OptA:
        "Đính kèm `X-Tenant-ID` vào Message Header, Worker đọc header và set vào `TenantContext` (ThreadLocal) trước khi gọi DB.",
      q4OptB:
        "Tạo một RabbitMQ Virtual Host riêng biệt cho từng Tenant và khởi động từng container riêng.",
      q4OptC:
        "Hardcode kết nối Master Database và join các bảng qua khóa ngoại.",
      q4OptD:
        "Gộp toàn bộ dữ liệu vào một database chung và dùng câu lệnh `SELECT * FROM table WHERE tenant_id = ?`.",
      q5Question:
        "Để giải quyết vấn đề Cache Stampede (hàng ngàn request cùng miss cache và đập vào DB cùng một lúc khi key hết hạn), giải pháp nào hiệu quả và tối ưu nhất?",
      q5OptA: "Tăng timeout kết nối Database lên gấp 10 lần.",
      q5OptB:
        "Sử dụng Distributed Mutex Lock (như Redis Redlock) hoặc cơ chế Cache-Aside kết hợp Probabilistic Early Expiration (XFetch).",
      q5OptC: "Xóa toàn bộ Redis Cache mỗi giờ một lần.",
      q5OptD: "Chuyển tất cả truy vấn về synchronous blocking.",
    },
    invitation: {
      readyBadge: "SẴN SÀNG LÀM BÀI",
      companyLabel: "Doanh nghiệp: SmartHire Enterprise Tech",
      heading: "Đề kiểm tra Năng lực Kỹ thuật Chuyên sâu (Full-Stack)",
      introTemplate:
        "Chào mừng bạn đến với vòng đánh giá năng lực lập trình và kiến trúc hệ thống cho vị trí {role}. Bài đánh giá nhằm đo lường khả năng tư duy logic, hiểu biết kiến trúc phân tán và kỹ năng viết code sạch.",
      introRole: "Senior Full-Stack Engineer",
      durationLabel: "Thời lượng",
      durationValue: "45 phút",
      passingLabel: "Ngưỡng đạt",
      passingValue: "70 / 100 điểm",
      structureTitle: "Cấu trúc chi tiết bài thi",
      part1Title: "Phần 1: Trắc nghiệm khách quan",
      part1Desc: "5 câu hỏi lý thuyết chuyên sâu (Spring Boot, React 19, DB)",
      part2Title: "Phần 2: Tự luận Kỹ thuật & Kiến trúc",
      part2Desc: "1 câu thiết kế hệ thống Microservices & Idempotency",
      part3Title: "Phần 3: Thử thách Lập trình (Live Coding)",
      part3Desc:
        "1 bài toán thuật toán với Code Editor & Run Test Cases",
      deviceTitle: "Thiết bị & Hệ thống Thu âm Tự động",
      autoAudioTitle: "Thu âm môi trường tự động",
      autoAudioDescPrefix: "Bài đánh giá ",
      autoAudioDescStrong: "không yêu cầu bật camera",
      autoAudioDescSuffix:
        ". Hệ thống sẽ tự động kích hoạt microphone để ghi âm môi trường nền trong suốt thời gian làm bài, đảm bảo tính minh bạch và công bằng.",
      micDeviceLabel: "Microphone thiết bị",
      micReady: "Sẵn sàng ({volume} dB)",
      micHelp:
        "Microphone đang hoạt động ổn định. Hệ thống sẽ tự động ghi âm khi bạn bấm Bắt đầu.",
      browserCheckLabel: "Trình duyệt hệ thống:",
      browserCheckValue: "Chrome / Edge (Tương thích 100%)",
      tabCheckLabel: "Giám sát chuyển tab:",
      tabCheckValue: "Tự động cảnh báo khi rời màn hình",
      rulesAgreement:
        "Tôi cam kết làm bài độc lập và đồng ý để hệ thống tự động ghi âm môi trường làm bài, giám sát chuyển đổi tab trong suốt 45 phút thi.",
      enterRoomButton: "Vào phòng thi ngay",
    },
    mcqStage: {
      eyebrow: "PHẦN 1 TRONG 3 · TRẮC NGHIỆM KHÁCH QUAN",
      heading: "Câu hỏi {current} / {total}",
      proctorStatus: "AI Proctoring: Đang giám sát · Bình thường",
      goToEssay: "Chuyển sang Tự luận",
      navigatorLabel: "Danh sách câu:",
      valueLabel: "Giá trị:",
      pointsValue: "{points} điểm",
      optionsAria: "Các phương án trả lời",
      prevQuestion: "Câu trước",
      nextQuestion: "Câu tiếp theo",
      finishMcqToEssay: "Hoàn tất Trắc nghiệm & Sang Tự luận",
      autoAudioTitle: "Thu âm tự động",
      micRunning: "Mic: Đang chạy",
      ambientRecordingNote: "Ghi âm môi trường nền liên tục",
      progressTitle: "Tiến độ Trắc nghiệm",
      answeredLabel: "Đã trả lời:",
      answeredCount: "{answered} / {total} câu",
      autoSaveNote:
        "Câu trả lời được tự động lưu ngay khi bạn chọn phương án.",
    },
    essay: {
      eyebrow: "PHẦN 2 TRONG 3 · TỰ LUẬN KỸ THUẬT & KIẾN TRÚC",
      heading: "Thiết kế Kiến trúc Hệ thống Tuyển dụng Chịu tải cao",
      reviewMcq: "Xem lại Trắc nghiệm",
      goToCoding: "Chuyển sang Coding Studio",
      promptBadge: "ĐỀ BÀI TỰ LUẬN KỸ THUẬT",
      recommendedTime: "Thời gian khuyến nghị: 15 phút",
      promptText:
        "Hãy thiết kế giải pháp kiến trúc để xử lý hàng đợi thông báo tuyển dụng realtime chịu tải 100,000 req/s. Giải thích lựa chọn giữa Redis Streams và RabbitMQ, phương án xử lý Idempotency (chống trùng lặp gửi thông báo) và chiến lược Dead-Letter Queue khi dịch vụ email bên thứ ba gặp sự cố.",
      answerHeading: "Bài làm của bạn (Markdown hỗ trợ):",
      autoSavedAgo: "Đã tự động lưu 30 giây trước",
      placeholder:
        "Nhập phần giải trình giải pháp kiến trúc của bạn tại đây...",
      wordCountPrefix: "Số từ:",
      wordCountValue: "{count} từ",
      minWordsHint: "(Yêu cầu tối thiểu: 150 từ)",
      fillShortSample: "Điền mẫu giải pháp ngắn",
      backToMcq: "Quay lại Trắc nghiệm",
      confirmToCoding: "Xác nhận & Chuyển sang phần Lập trình",
      defaultAnswer: `Để thiết kế hệ thống xử lý hàng đợi thông báo tuyển dụng realtime chịu tải cao (100.000 req/s), tôi đề xuất giải pháp kiến trúc phân tán như sau:

1. Kiến trúc Tổng thể:
- API Gateway tiếp nhận request và định tuyến theo header X-Tenant-ID.
- RabbitMQ đóng vai trò làm Message Broker chính với mô hình Topic Exchange và Dead Letter Exchange (DLX).
- Redis được sử dụng làm In-Memory Cache và lưu trữ trạng thái xử lý Idempotency Key (TTL 24 giờ).
- Worker Pool (Spring Boot / Node.js) tự động scale theo số lượng message trong hàng đợi (RabbitMQ Consumer Prefetch = 20).

2. Xử lý Idempotency & Chống Duplicate:
- Mỗi sự kiện tạo thông báo (VD: CandidatePassScreeningEvent) mang một idempotencyId duy nhất: SHA256(tenantId + eventType + entityId + timestampWindow).
- Trước khi gửi email/SMS, Worker thực hiện lệnh Redis: \`SET idempotency:{key} "PROCESSING" EX 300 NX\`.
- Nếu key đã tồn tại -> Bỏ qua message trùng lặp (ACK RabbitMQ ngay lập tức).
- Sau khi gửi thành công -> Cập nhật key thành "COMPLETED" với TTL 24h.

3. Xử lý lỗi & Dead-Letter Queue (DLQ):
- Thiết lập Retry Policy: thử lại tối đa 3 lần với Exponential Backoff (1s -> 4s -> 16s).
- Nếu sau 3 lần vẫn lỗi (như dịch vụ bên thứ 3 SendGrid/Twilio down) -> Đẩy message vào Dead Letter Queue (dlq_candidate_notifications).
- Đội ngũ vận hành có Dashboard giám sát và cơ chế Re-play thủ công khi dịch vụ khôi phục.`,
      shortSolution: `1. Kiến trúc Tổng thể:
- Sử dụng RabbitMQ với Topic Exchange để phân luồng thông báo (SMS, Email, Push Notification).
- Redis Cluster lưu trạng thái Idempotency Key.

2. Xử lý Idempotency:
- Key: "idempotency:" + tenant_id + ":" + event_id (TTL 24 giờ).
- Atomic command: SET NX.

3. Dead-Letter Queue:
- Exponential Backoff retry tối đa 3 lần.
- Message lỗi đẩy về dlq_notifications để phân tích và gửi lại sau.`,
    },
    coding: {
      eyebrow: "PHẦN 3 TRONG 3 · THỬ THÁCH LẬP TRÌNH (CODING STUDIO)",
      heading:
        "Bài toán: Tối ưu Phân bổ Lịch phỏng vấn (Merge Overlapping Intervals)",
      reviewEssay: "Xem lại Tự luận",
      submitExam: "Nộp bài thi",
      problemStatementBar: "Mô tả Đề bài & Ràng buộc (Problem Statement)",
      problemTitle: "Mô tả bài toán",
      problemBodyBeforeCode1:
        "Hệ thống tuyển dụng SmartHire AI cần tự động gộp các khoảng thời gian bận phỏng vấn của Hội đồng giám khảo để tìm ra lịch trống cho ứng viên tiếp theo. Cho một mảng các khoảng thời gian ",
      problemBodyBetweenCodes: ", trong đó mỗi phần tử là ",
      problemBodyAfterCode2:
        ". Hãy viết hàm gộp tất cả các khoảng thời gian bị giao thoa (overlapping) và trả về mảng các khoảng thời gian không chồng lấn.",
      timeLimit: "Giới hạn thời gian: 1000 ms",
      memoryLimit: "Giới hạn bộ nhớ: 256 MB",
      maxPoints: "Điểm tối đa: 50 điểm",
      example1Title: "Ví dụ 1:",
      example1Input: "Input: intervals = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]]",
      example1Output: "Output: [[9, 11], [13, 16]]",
      example1Explanation:
        "Giải thích: Ca [9, 10] và [9.5, 11] chồng lấn nhau nên được gộp thành [9, 11].",
      example2Title: "Ví dụ 2:",
      example2Input: "Input: intervals = [[8, 9], [10, 12]]",
      example2Output: "Output: [[8, 9], [10, 12]]",
      example2Explanation:
        "Giải thích: Hai ca hoàn toàn tách biệt nên giữ nguyên.",
      constraintsHeading: "Ràng buộc (Constraints)",
      resetTitle: "Đặt lại mã nguồn mẫu",
      resetButton: "Đặt lại",
      runningButton: "Đang chạy...",
      runCodeButton: "Chạy thử (Run Code)",
      editorPlaceholder: "// Viết mã nguồn giải bài toán tại đây...",
      consoleTitle: "Console · Kết quả Sandbox",
      passedBadge: "3/3 Test cases Đạt ({ms}ms)",
      consoleIdleHintTemplate:
        "Nhấn nút {button} để biên dịch và kiểm tra bài làm của bạn với 3 test cases mẫu.",
      consoleIdleHintButton: "\"Chạy thử (Run Code)\"",
      consoleRunning:
        "Đang khởi tạo container sandbox & thực thi bài kiểm tra...",
      runningLogs: "Đang biên dịch và thực thi trên Sandbox...",
      successLogs: `✔ Test Case 1: Input [[9, 10], [9.5, 11]] -> Expected [[9, 11]] -> Actual [[9, 11]] (Đạt)
✔ Test Case 2: Input [[13, 15], [14.5, 16]] -> Expected [[13, 16]] -> Actual [[13, 16]] (Đạt)
✔ Test Case 3: Input [[8, 9], [10, 12]] -> Expected [[8, 9], [10, 12]] -> Actual [[8, 9], [10, 12]] (Đạt)

Tất cả 3/3 test cases công khai đã VƯỢT QUA thành công!`,
    },
    result: {
      passedBadge: "HOÀN TẤT & ĐẠT YÊU CẦU",
      submittedAt: "Nộp bài lúc {time}",
      heading: "Kết quả Đánh giá Kỹ thuật: 88 / 100 điểm",
      summary:
        "Chúc mừng bạn đã hoàn thành xuất sắc bài đánh giá năng lực! Điểm số của bạn đã vượt qua ngưỡng yêu cầu tuyển dụng (70/100). Báo cáo năng lực chi tiết đã được gửi tới Đội ngũ Tuyển dụng.",
      rankEyebrow: "Xếp hạng năng lực",
      rankValue: "Top 5% Ứng viên",
      thresholdNote: "Ngưỡng đạt: 70 điểm",
      part1Tag: "PHẦN 1: TRẮC NGHIỆM",
      part1Score: "20 / 20 điểm",
      part1Title: "Kiến thức Nền tảng",
      part1Desc:
        "Đúng 5/5 câu hỏi lý thuyết chuyên sâu về Spring Boot 3, React 19 hooks, Clustered Index và RabbitMQ Multi-tenancy.",
      part2Tag: "PHẦN 2: TỰ LUẬN",
      part2Score: "26 / 30 điểm",
      part2Title: "Thiết kế Kiến trúc",
      part2Desc:
        "AI & Hội đồng chuyên môn đánh giá cao giải pháp Idempotency với Redis SET NX và chiến lược Dead-letter Queue chịu tải.",
      part3Tag: "PHẦN 3: LẬP TRÌNH",
      part3Score: "42 / 50 điểm",
      part3Title: "Thuật toán & Clean Code",
      part3Desc:
        "Vượt qua 10/10 test cases (gồm 3 sample tests và 7 hidden tests). Độ phức tạp thời gian tối ưu O(N log N).",
      retakeButton: "Làm lại bài thi mẫu",
      backToListButton: "Quay lại Danh sách Bài đánh giá",
    },
  },
  proctorDevices: {
    screenMonitorLabel: "chia sẻ toàn màn hình",
    screenTabLabel: "chia sẻ tab phỏng vấn",
    deviceCamera: "camera",
    deviceMicrophone: "microphone",
    notReadable:
      "Không thể mở {device}. Hãy đóng ứng dụng hoặc tab đang dùng thiết bị (Camera, Teams, Zoom, OBS), kiểm tra quyền thiết bị trong hệ điều hành rồi thử lại. ({name})",
    notAllowed:
      "Chưa được cấp quyền {device}. Hãy cho phép trong trình duyệt và hệ điều hành rồi thử lại. ({name})",
    notFound:
      "Không tìm thấy {device}. Hãy kết nối thiết bị rồi thử lại. ({name})",
    invalidStateMonitor:
      "Hãy quay lại tab làm bài và bấm Kiểm tra thiết bị để chia sẻ toàn màn hình.",
    invalidStateTab:
      "Hãy quay lại tab phỏng vấn và bấm Kiểm tra thiết bị để tiếp tục.",
    checkFailed: "Không thể kiểm tra {device}.",
    secureContextRequired: "Kiểm tra thiết bị cần HTTPS hoặc localhost.",
    mediaUnsupported:
      "Trình duyệt không hỗ trợ microphone hoặc camera. Hãy dùng Chrome hoặc Edge trên máy tính.",
    displayUnsupported:
      "Trình duyệt không hỗ trợ chia sẻ màn hình. Hãy dùng Chrome hoặc Edge trên máy tính.",
    wrongTabSurface:
      "Vui lòng chia sẻ tab đang mở phòng phỏng vấn, không chọn cửa sổ hoặc toàn màn hình.",
    wrongMonitorSurface:
      "Hãy chọn « Toàn bộ màn hình » trong hộp thoại Chrome (không chọn Cửa sổ hay Tab Chrome).",
    cameraRequiredDuringExam: "Camera phải bật trong suốt bài thi.",
  },
  interviews: {
    rules: {
      r1: "Đồng hồ do hệ thống kiểm soát. Hết thời gian làm hoặc đến hạn hoàn thành, các câu đã lưu được tự động nộp.",
      r2: "Câu hỏi đã giao nhưng bỏ trống được tính 0 điểm.",
      r3: "Mini Assessment gồm câu trắc nghiệm 4 lựa chọn, một đáp án đúng; hệ thống tự chấm.",
      r4: "Chỉ được làm lại khi chưa đạt, còn lượt và còn hạn. Lỗi hệ thống không tính vào số lần làm.",
    },
    status: {
      GENERATING: "Đang sinh câu hỏi",
      PASSED: "Đạt · Assessment đã mở",
      ERROR: "Lỗi xử lý · Chờ nhà tuyển dụng thử lại",
      CREATED: "Đang chuẩn bị câu hỏi",
      QUESTIONS_READY: "Sẵn sàng phỏng vấn",
      IN_PROGRESS: "Đang phỏng vấn",
      SCORING: "Đã nộp · Chờ đánh giá",
      SCORED: "Đã có kết quả",
      FAILED: "Chưa đạt",
    },
    list: {
      eyebrow: "Vòng phỏng vấn tự động",
      title: "AI Interview",
      subtitle:
        "Quản lý lời mời phỏng vấn từ nhà tuyển dụng, kiểm tra thời hạn và tiếp tục phiên đang thực hiện.",
      metricInvitations: "Lời mời",
      metricReady: "Cần thực hiện",
      metricCompleted: "Đã hoàn tất",
      beforeStartStrong: "Trước khi bắt đầu:",
      beforeStartBody:
        "kiểm tra kết nối mạng, chọn không gian yên tĩnh và dành đủ thời gian để hoàn thành phiên trong một lần.",
      loadingLabel: "Đang tải lời mời phỏng vấn",
      cardEyebrowPreview: "Lời mời AI Interview",
      cardEyebrowId: "AI Interview #{id}",
      previewBadge: "Bản xem trước",
      applicationFallback: "Hồ sơ #{id}",
      previewCompanyRole:
        "SmartHire Technology · Vòng phỏng vấn kỹ thuật",
      canStartLabel: "Có thể bắt đầu",
      canStartFallback: "Khi câu hỏi sẵn sàng",
      deadlineLabel: "Hạn hoàn thành",
      deadlineFallback: "Không giới hạn",
      durationLabel: "Thời lượng",
      questionCountLabel: "Số câu hỏi",
      questionCountMax: "Tối đa {max} câu ({followUp} hỏi bồi)",
      questionCountFixed: "{count} câu",
      invitedAt: "Nhận lời mời {date}",
      attemptNumber: "Lần thực hiện thứ {num}",
      scoreResult: "Kết quả {score} điểm",
      maxAttempts: "Tối đa {max} lần thực hiện",
      startInterview: "Bắt đầu phỏng vấn",
      notYetAvailable: "Chưa đến giờ bắt đầu",
      expired: "Đã hết hạn",
      actions: {
        start: "Bắt đầu",
        continue: "Tiếp tục phỏng vấn",
        viewSubmitted: "Xem bài đã nộp",
        recoverRoom: "Khôi phục phòng thi",
        viewResult: "Xem kết quả",
      },
    },
    roomPage: {
      invalidInvite: "Lời mời không hợp lệ.",
      backToAiInterview: "Về AI Interview",
    },
    room: {
      submitTitle: "Kết thúc và nộp bài?",
      submitDescConversational:
        "Toàn bộ hội thoại sẽ được gửi đánh giá. Bạn không thể gửi thêm tin nhắn sau khi kết thúc.",
      submitDescRemaining:
        "Còn {unanswered} câu chưa trả lời sẽ được tính 0 điểm. Sau khi nộp, bạn không thể sửa câu trả lời.",
      submitDescAllAnswered:
        "Sau khi nộp, bạn không thể sửa câu trả lời.",
      submitConfirm: "Nộp bài",
      noRoomData: "Không nhận được dữ liệu phòng thi.",
      openingErrorFallback:
        "AI chưa tạo được lời chào. Bạn có thể thử lại trong phòng chờ này.",
      waitingTitle: "Đã vào phòng phỏng vấn",
      waitingStatus:
        "AI đang chuẩn bị lời chào. Hội thoại sẽ tự hiển thị khi sẵn sàng.",
      waitingDesc:
        "Thời gian làm bài chưa bắt đầu. Vui lòng giữ tab phỏng vấn ở chế độ toàn màn hình.",
      retryCreateChat: "Thử tạo hội thoại lại",
      backToDeviceCheck: "Quay lại kiểm tra thiết bị",
      defaultTitle: "AI Interview",
      attemptBadge: "Lượt thi: {current}/{max}",
      statusErrorBadge: "Lỗi xử lý · Chờ nhà tuyển dụng thử lại",
      statusPassedBadge: "Đạt vòng phỏng vấn",
      statusFailedBadge: "Chưa đạt ngưỡng điểm",
      statusScoringBadge: "Đã nộp · Chờ đánh giá",
      statusInProgressBadge: "Đang phỏng vấn",
      statusReadyFallback: "Sẵn sàng",
      onlineSubtitle: "· Phỏng vấn trực tuyến cùng SmartHire AI",
      backToList: "Về danh sách",
      stateActive: "Phiên đang hoạt động",
      stateErrorSubmitted: "Đã nộp · Chờ chấm lại",
      stateErrorRecover: "Đề thi cần khôi phục",
      stateSubmitted: "Đã nộp bài",
      stateNotStarted: "Phòng thi chưa bắt đầu",
      timerAria: "Thời gian còn lại {time}",
      timeRemainingLabel: "Thời gian còn lại",
      timeUpSubmitting: "Hết giờ · đang nộp…",
      durationLabel: "Thời lượng bài",
      submitting: "Đang nộp…",
      endButton: "Kết thúc",
      progressSummary: "Đã lưu {done}/{total} câu.",
      progressRemainingNote:
        " Còn {unanswered} câu chưa trả lời sẽ tính 0 điểm nếu nộp.",
      progressAllRequiredNote: " Cần trả lời đủ các câu trước khi nộp.",
      submitInterviewButton: "Nộp bài phỏng vấn",
      startFailedError:
        "Chưa thể bắt đầu phiên phỏng vấn: {message} Vui lòng kiểm tra thiết bị và thử lại.",
      questionNumber: "Câu {num}",
      correctAnswerLabel: "Đáp án đúng: {answers}",
      explanationLabel: "Giải thích: {text}",
      rulesHeading: "Quy định AI Interview",
      loadingEyebrow: "Phòng phỏng vấn AI",
      loadingTitle: "Đang tải đề và đồng bộ thời gian…",
      loadErrorEyebrow: "Không thể tải phòng thi",
      loadErrorTitle: "Kết nối tới phiên phỏng vấn thất bại",
      loadErrorDesc:
        "{message} Đồng hồ chưa bắt đầu và lượt làm của bạn không bị ảnh hưởng.",
      reloadRoom: "Tải lại phòng thi",
      recoveryEyebrow: "Phòng phỏng vấn AI · #AI-{id}",
      recoveryDuration: "Thời lượng",
      recoveryBadge: "Chưa thể mở đề thi",
      recoveryTitle: "Bộ câu hỏi chưa tải thành công",
      recoveryDefaultError: "Hệ thống AI chưa chuẩn bị được bộ câu hỏi.",
      recoveryDesc:
        "{message} Đồng hồ chưa chạy, câu hỏi chưa được mở và lượt làm không bị trừ.",
      recovering: "Đang khôi phục đề…",
      reloadQuestions: "Tải lại đề phỏng vấn",
      exitRoom: "Thoát phòng thi",
      sessionStatusHeading: "Trạng thái phiên",
      sessionStatusAttemptTitle: "Lượt thi được bảo toàn",
      sessionStatusAttemptDesc: "Lỗi hệ thống không tính lượt.",
      sessionStatusTimerTitle: "Đồng hồ chưa chạy",
      sessionStatusTimerDesc: "Chỉ bắt đầu khi đề sẵn sàng.",
      sessionStatusProctorTitle: "Giám sát chưa bật",
      sessionStatusProctorDesc: "Thiết bị được kiểm tra ở bước tiếp theo.",
      interviewerInProgress: "Đang phỏng vấn",
      interviewerName: "SmartHire AI Interviewer",
      interviewerSubtitle: "Đánh giá theo lộ trình và tiêu chí của vị trí",
      answerProgress: "Tiến độ trả lời",
      answerProgressAria: "{done} trên {total} câu đã lưu",
      textFormatTitle: "Hình thức: Văn bản",
      textFormatDesc: "Nhập và lưu câu trả lời theo từng câu hỏi.",
      preservedTitle: "Câu trả lời được bảo toàn",
      preservedDesc: "Nội dung đã lưu vẫn còn khi kết nối gián đoạn.",
      currentFocusLabel: "Trọng tâm câu hiện tại",
      invitationEyebrow: "Phòng phỏng vấn AI",
      invitationTitle: "Chuẩn bị làm bài · {target}",
      invitationDescConversational:
        "Hoàn tất kiểm tra thiết bị để vào phòng chờ. Đồng hồ chỉ bắt đầu khi AI tạo xong lời chào và phòng chat sẵn sàng.",
      invitationDescStandard:
        "Đồng hồ bắt đầu theo giờ máy chủ sau khi bộ câu hỏi sẵn sàng và bạn hoàn tất kiểm tra thiết bị. Không rời khỏi phòng thi sau khi bắt đầu.",
      factTopics: "Chủ đề hội thoại",
      factTopicsValue: "{count} chủ đề",
      factOpenQuestions: "Câu hỏi phỏng vấn",
      factQuestions: "Số câu hỏi",
      factQuestionsCount: "{count} câu",
      factMiniAssessment: "Mini Assessment",
      factMiniAssessmentCount: "{count} câu trắc nghiệm",
      factTotalDuration: "Tổng thời gian",
      factPassingScore: "Ngưỡng đạt",
      factPassingScoreValue: "{score}/100",
      statusGenerating:
        "AI đang chuẩn bị câu hỏi. Trang sẽ tự cập nhật khi sẵn sàng.",
      statusCreated:
        "Nhà tuyển dụng đang chuẩn bị câu hỏi. Lời mời sẽ cập nhật khi phiên sẵn sàng.",
      readyDescConversational:
        "Bấm bắt đầu để vào phòng chờ; chat sẽ tự hiển thị khi AI sẵn sàng. Thời gian chờ không tính vào bài phỏng vấn.",
      readyDescStandard:
        "Thời gian bắt đầu tính khi bạn bấm “Bắt đầu phỏng vấn”. Hãy chuẩn bị trước khi bắt đầu.",
      voiceConsentOnly:
        "Tôi đồng ý dùng micro, chuyển giọng nói thành transcript và phân tích tín hiệu lời nói.",
      voiceConsentWithRecording:
        "Tôi đồng ý dùng micro, chuyển giọng nói thành transcript và phân tích tín hiệu lời nói, lưu bản ghi âm riêng tư cho nhà tuyển dụng xem xét sau phiên.",
      resultTitleFinished: "Kết quả đánh giá AI Interview",
      resultTitleFailedScoring: "Trạng thái bài thi: Đã nộp · Chờ chấm lại",
      resultTitleSubmitted: "Trạng thái bài thi: Đã nộp thành công",
      submittedAtLabel: "Thời điểm nộp bài:",
      badgeFailedScoring: "Chờ nhà tuyển dụng chấm lại",
      badgeScoring: "AI đang phân tích & chấm điểm",
      badgePassed: "Đạt tiêu chuẩn",
      badgeFailed: "Chưa đạt ngưỡng",
      failedScoringBoxTitle:
        "Bài làm của bạn đã được ghi nhận và bảo vệ an toàn",
      failedScoringBoxDescPrefix:
        "Toàn bộ câu trả lời và dữ liệu hội thoại đã được lưu trữ đầy đủ. Dịch vụ AI chấm điểm tạm thời gặp gián đoạn nên bài thi sẽ được nhà tuyển dụng kích hoạt chấm lại.",
      failedScoringBoxDescHighlight:
        "Bạn không cần phải làm lại bài và số lượt thi của bạn hoàn toàn không bị ảnh hưởng.",
      scoringBoxDesc:
        "Hệ thống đang tiến hành đánh giá chi tiết theo 4 tiêu chí cốt lõi: Kiến thức kỹ thuật, Khả năng giải quyết vấn đề, Tư duy lập luận và Kỹ năng giao tiếp. Trang sẽ tự động hiển thị bảng điểm khi quá trình chấm hoàn tất.",
      overallScoreLabel: "Điểm tổng kết",
      pointsDenominator: "/ 100 điểm",
      passingThresholdLabel: "Ngưỡng điểm đạt",
      passedCongrats:
        "Chúc mừng bạn đã vượt qua vòng AI Interview! Bạn có thể tiếp tục làm bài kiểm tra Assessment.",
      goToAssessments: "Đến vòng Assessment",
      failedCanRetry:
        "Bạn chưa đạt ngưỡng điểm yêu cầu cho vị trí này, tuy nhiên bạn vẫn còn lượt làm bài trước thời hạn.",
      creatingRetry: "Đang tạo lượt mới…",
      retryInterview: "Làm lại AI Interview",
      failedNoRetry:
        "Bạn chưa đạt ngưỡng điểm và đã sử dụng hết số lượt làm bài phỏng vấn cho vị trí này.",
      unansweredZeroPoints: "Chưa trả lời (0 điểm)",
      submittedExplanation: "Giải thích: {text}",
    },
    conversation: {
      validationRequired: "Hãy nhập hoặc ghi âm câu trả lời.",
      validationMax: "Câu trả lời tối đa 10.000 ký tự.",
      playbackVoiceError:
        "Không phát được giọng đọc. Bạn có thể thử lại hoặc nhập câu trả lời.",
      playbackAudioError:
        "Không phát được bản ghi âm thanh. Vui lòng thử lại.",
      loadingLabel: "Đang tải phòng phỏng vấn thoại…",
      reloadRoom: "Tải lại phòng phỏng vấn",
      roomAriaLabel: "Phòng phỏng vấn AI",
      interviewerName: "SmartHire AI Interviewer",
      roomSubtitle: "Phòng phỏng vấn thoại thông minh 1-1",
      autoPlayDisableTitle: "Tắt tự động đọc câu hỏi bằng giọng nói AI",
      autoPlayEnableTitle: "Bật tự động đọc câu hỏi bằng giọng nói AI",
      autoPlayOn: "Tự động phát âm: Bật",
      autoPlayOff: "Tự động phát âm: Tắt",
      speechEngineTitle:
        "Chuyển đổi phương thức đọc câu hỏi: Giọng siêu tốc (Trình duyệt) hoặc Giọng AI Studio (Cloud)",
      speechEngineBrowser: "Đọc siêu tốc (Trình duyệt)",
      speechEngineCloud: "Đọc AI Cloud (Gemini)",
      replayTitle: "Phát lại âm thanh câu hỏi hiện tại",
      replayButton: "Nghe lại",
      stopSpeechTitle: "Dừng giọng đọc hiện tại",
      stopSpeechButton: "Dừng đọc",
      defaultLanguage: "Tiếng Việt",
      waveformAria: "AI đang phát âm thanh",
      badgeAiSpeaking: "AI ĐANG NÓI",
      badgeRecording: "ĐANG GHI ÂM",
      badgeAiThinking: "AI ĐANG SUY NGHĨ",
      statusHeadingAiSpeaking: "Người phỏng vấn AI đang đặt câu hỏi...",
      statusHeadingRecording: "Đang lắng nghe câu trả lời của bạn...",
      statusHeadingThinking: "AI đang lắng nghe và chuẩn bị phản hồi...",
      statusHeadingComplete: "Phiên phỏng vấn đã hoàn tất câu hỏi",
      statusHeadingReady: "Sẵn sàng cho câu trả lời của bạn",
      statusDescAiSpeaking:
        "Hãy lắng nghe câu hỏi qua tai nghe hoặc loa của thiết bị.",
      statusDescRecording:
        "Hãy nói rõ ràng, tự tin vào micro. Bấm 'Hoàn tất & Gửi' khi trả lời xong.",
      statusDescThinking:
        "Hệ thống đang xử lý và đánh giá câu trả lời của bạn...",
      statusDescCompleteSpeaking:
        "AI đang nói lời kết thúc phiên phỏng vấn. Hệ thống sẽ tự động nộp bài ngay sau đó...",
      statusDescCompleteSubmitting:
        "Đã hoàn thành! Đang tự động nộp bài và chuyển sang phần chấm điểm...",
      statusDescCompleteDefault:
        "Bạn đã hoàn thành đủ số lượt hỏi. Hệ thống đang tiến hành nộp toàn phiên...",
      statusDescReady:
        "Bấm nút bắt đầu để trả lời trực tiếp bằng giọng nói.",
      repeatTipPrefix: "Chưa nghe rõ câu hỏi? Hãy nói vào micro: ",
      repeatTipPhrase: "“Bạn có thể nhắc lại câu hỏi giúp tôi không?”",
      repeatTipSuffix:
        ". AI sẽ lặp lại câu hỏi tự nhiên mà không tính mất lượt phỏng vấn.",
      realtimeRecognizing: "Giọng nói nhận diện trực tiếp:",
      recordingAnswer: "Đang ghi âm câu trả lời:",
      listeningPlaceholder: "Đang lắng nghe... hãy bắt đầu nói...",
      completeBannerSpeaking:
        "Đang lắng nghe lời kết... Sẽ tự động nộp bài sau đó",
      completeBannerSubmitting:
        "Đã hoàn tất! Đang tự động nộp bài và chấm điểm...",
      submitNowButton: "Nộp bài ngay",
      pauseMicButton: "Tạm dừng",
      sending: "Đang gửi...",
      finishAndSendVoice: "Hoàn tất & Gửi câu trả lời",
      waitAiQuestionButton:
        "Đang lắng nghe AI đặt câu hỏi... (Vui lòng đợi AI nói xong)",
      waitAiQuestionHint:
        "Bạn chỉ có thể bật mic trả lời sau khi người phỏng vấn AI nói xong.",
      aiProcessingButton: "AI đang xử lý và chuẩn bị câu hỏi...",
      startVoiceButton: "Bắt đầu trả lời bằng giọng nói",
      hideKeyboardFallback: "Ẩn khung nhập văn bản dự phòng",
      showKeyboardFallback: "Micro gặp sự cố? Bấm để nhập bằng bàn phím",
      fallbackLabel: "Nhập câu trả lời dự phòng (khi không dùng micro)",
      fallbackPlaceholderWait:
        "Vui lòng đợi AI nói xong câu hỏi trước khi nhập câu trả lời...",
      fallbackPlaceholderInput: "Nhập nội dung câu trả lời của bạn...",
      charCount: "{count}/{max} ký tự",
      sendAnswerButton: "Gửi câu trả lời",
      liveStatusSending: "AI đang phản hồi…",
      liveStatusRecording:
        "Đang ghi âm trực tiếp. Hãy nói rõ ràng câu trả lời của bạn.",
      liveStatusTranscribing: "Đang chuyển giọng nói thành văn bản…",
      liveStatusConnecting: "Đang kết nối micro…",
      liveStatusComplete:
        "Hội thoại đã đủ lượt. Đang tự động nộp toàn phiên đánh giá...",
      liveStatusDefault:
        "Điểm và nhận xét được tổng hợp sau khi kết thúc phiên.",
      browserSpeechNotice:
        "Đang dùng giọng đọc của trình duyệt vì dịch vụ âm thanh đám mây tạm thời không khả dụng.",
      retryAttachRecording: "Thử lưu lại bản ghi",
    },
    voiceErrors: {
      micTimeout: "Kết nối micro quá hạn. Vui lòng thử lại.",
      connectFailed:
        "Không thể kết nối dịch vụ giọng nói. Bạn vẫn có thể nhập văn bản.",
      disconnected: "Kết nối giọng nói bị ngắt. Vui lòng thử lại.",
      invalidResponse: "Phản hồi giọng nói không hợp lệ. Vui lòng thử lại.",
      recordingInterrupted:
        "Ghi âm bị gián đoạn. Hãy thu lại hoặc nhập câu trả lời.",
      recordingTooLarge:
        "Bản ghi vượt 9 MB. Hãy thu lại câu trả lời ngắn hơn.",
      transcribeTimeout:
        "Chuyển ngữ quá hạn. Vui lòng thử lại hoặc nhập câu trả lời.",
      noSpeechRecognized:
        "Không nhận được lời nói. Hãy thu lại hoặc nhập câu trả lời.",
      transcribeFailed: "Chuyển ngữ thất bại. Vui lòng thử lại.",
      browserUnsupported:
        "Trình duyệt chưa hỗ trợ ghi âm. Hãy nhập câu trả lời.",
      formatUnsupported: "Không có định dạng audio được hỗ trợ.",
    },
    answerForm: {
      validationRequired: "Vui lòng nhập câu trả lời.",
      validationMax: "Câu trả lời tối đa 50.000 ký tự.",
      defaultSubmit: "Lưu câu trả lời",
      label: "Câu trả lời của bạn",
      placeholder: "Nhập câu trả lời chi tiết của bạn tại đây…",
      capturedWithRecording:
        "Đã ghi {seconds} giây. Audio và transcript sẽ gửi cùng câu trả lời.",
      capturedTranscriptOnly:
        "Đã ghi {seconds} giây. Chỉ gửi transcript và tín hiệu lời nói; audio không lưu trên server.",
      evaluatingNext: "Đang đánh giá và chuẩn bị câu tiếp theo…",
      dirtyStatus: "Có thay đổi chưa lưu",
      savedStatus: "Đã lưu câu trả lời trên hệ thống",
    },
    mcqForm: {
      selectMultiple: "Chọn tất cả đáp án đúng",
      selectSingle: "Chọn một đáp án đúng",
      explanationLabel: "Giải thích lựa chọn của bạn (bắt buộc)",
      saving: "Đang lưu…",
      saveAndContinue: "Lưu lựa chọn và tiếp tục",
      saved: "Đã lưu lựa chọn",
    },
    processNav: {
      defaultKnowledge: "Kiến thức kỹ thuật",
      defaultInterview: "AI Interview",
      title: "Lộ trình AI Interview",
      subtitle: "Chọn chặng đã mở để xem câu hỏi và nội dung làm bài.",
      processCountBadge: "{count} quy trình",
      saved: "Đã lưu",
      inProgress: "ĐANG LÀM",
      upcoming: "Sắp tới",
      processItemTitle: "Quy trình {index}: {title}",
      questionCount: "{count} câu hỏi",
      footerNote:
        "Chặng hiện tại được đánh dấu xanh; các câu trả lời đã lưu được bảo toàn.",
    },
    questionPanel: {
      ariaLabel: "Câu hỏi {current} trên {total}",
      defaultStage: "AI Interview",
      questionHeadingPrefix: "Câu hỏi {current}",
      topicsAria: "Chủ đề câu hỏi",
      mcqBadge: "Trắc nghiệm",
      aiHeaderTitle: "SmartHire AI",
      aiKindMini: "Mini Assessment",
      aiKindInterview: "Câu hỏi phỏng vấn",
      hintMultiChoice: "Chọn tất cả đáp án đúng",
      hintSingleChoice: "Chọn một đáp án đúng nhất",
      hintSpeechOrText: "Trả lời bằng giọng nói hoặc nhập văn bản",
      hintText: "Trả lời bằng văn bản, nêu ví dụ thực tế nếu có",
      openTip:
        "Gợi ý: Trình bày bối cảnh, cách bạn xử lý và kết quả cụ thể. Không chia sẻ thông tin mật của công ty cũ.",
      difficultyLabel: "Độ khó: {difficulty}",
      showHint: "Xem gợi ý",
      listenQuestion: "Nghe câu hỏi",
      yourAnswerTitle: "Câu trả lời của bạn",
      yourAnswerDesc: "Nội dung chỉ được ghi nhận sau khi bạn bấm lưu.",
      autoTimedBadge: "Tự tính thời gian",
      submitLast: "Lưu câu trả lời",
      submitNext: "Lưu & tiếp tục",
      prevQuestion: "Câu trước",
      saveBeforeLeaving: "Lưu câu trả lời trước khi chuyển câu.",
      nextQuestion: "Câu tiếp theo",
      savedStatus: "Câu trả lời này đã được lưu trên hệ thống.",
      unsavedStatus: "Hãy lưu câu trả lời trước khi chuyển sang câu khác.",
      offlineHint: "Nếu mất kết nối, bạn có thể mở lại phiên để tiếp tục.",
    },
    roadmap: {
      durationMinutesSeconds: "{minutes}m {seconds}s",
      durationSeconds: "{seconds}s",
      title: "Lộ trình phỏng vấn",
      percentCompleted: "{percent}% Hoàn thành",
      savedSubCount: "{done}/{total} câu đã lưu · ",
      durationSpent: "Thời lượng: {duration}",
      answerSaved: "Đã lưu câu trả lời",
      estimateMinutes: "Ước tính: ~{minutes} phút",
      questionCount: "{count} câu hỏi",
      emptyHint: "Lộ trình hiển thị khi bộ câu hỏi sẵn sàng.",
      answeringElapsed: "Đang trả lời ({time})...",
      stateDone: "Đã nộp",
      stateCurrent: "Hiện tại",
      stateTodo: "Chưa làm",
      defaultQuestionTitle: "Câu hỏi phỏng vấn",
      miniBlockTitle: "Mini Assessment (Trắc nghiệm)",
      miniBlockBase: "{count} câu hỏi nhanh",
      miniBlockAfter: " ngay sau chặng {after}",
      miniBlockDone: " · đã làm {done}/{count}",
    },
    proctor: {
      defaultStartLabel: "Bắt đầu phỏng vấn",
      micStoppedError:
        "Microphone đã dừng hoạt động. Hãy kiểm tra thiết bị lại.",
      fullscreenUnsupportedError:
        "Trình duyệt không hỗ trợ chế độ toàn màn hình.",
      checkFailedError: "Không thể hoàn tất kiểm tra thiết bị.",
      cameraTitle: "Camera (Webcam)",
      cameraDesc: "Góc quay trực diện khuôn mặt ứng viên",
      micTitle: "Microphone",
      micDesc: "Thu âm giọng nói để trả lời câu hỏi phỏng vấn",
      fullscreenTitle: "Toàn màn hình",
      fullscreenDesc:
        "Tự động mở toàn màn hình (Fullscreen) chống gian lận",
      consentLabel:
        "Tôi đồng ý bật camera, microphone, vào chế độ toàn màn hình và tuân thủ quy chế phỏng vấn.",
      enableCameraLabel:
        "Bật camera (khuyến nghị). Nếu camera không mở được, bạn vẫn có thể tiếp tục với microphone.",
      grantPermissionHint:
        "Bấm nút bên dưới để cấp quyền Camera và Microphone cho trình duyệt.",
      readyFull:
        "Camera và Microphone đã sẵn sàng. Bấm tiếp để vào toàn màn hình và bắt đầu.",
      readyMicFallback:
        "Camera và Microphone đã sẵn sàng. (Camera chưa mở được; phiên sẽ chạy với microphone). Bấm tiếp để vào toàn màn hình và bắt đầu.",
      openingSession: "Đang mở phiên phỏng vấn…",
      checkingDevices: "Đang kiểm tra thiết bị…",
      checkDevicesStep: "Bước 1: Kiểm tra thiết bị",
      defaultCandidate: "Ứng viên",
      cameraLost: "Camera giám sát đã bị dừng",
      micLost: "Microphone đã bị tắt",
      fullscreenExit: "Bạn đã thoát chế độ toàn màn hình",
      pageHidden: "Bạn đã chuyển tab hoặc ẩn trang thi",
      windowBlur: "Cửa sổ thi đã mất tiêu điểm",
      contextMenu: "Menu chuột phải đã bị chặn",
      copyAttempt: "Sao chép nội dung đã bị chặn",
      pasteAttempt: "Dán nội dung đã bị chặn",
      blockedShortcut: "Phím tắt {key} đã bị chặn",
      violationAutoSubmit:
        "{message} ({count}/{max}). Bài sẽ được tự động nộp.",
      violationWarning:
        "{message} ({count}/{max}). Vui lòng quay lại phòng thi.",
      cameraOff: "Camera không bật",
      monitoringActive: "Đang giám sát",
      warningTitle: "Cảnh báo giám sát",
      returnToExam: "Quay lại bài thi",
      recoverTitle: "Khôi phục không gian thi an toàn",
      recoverDesc:
        "Phiên đang làm cần bật lại giám sát trước khi hiển thị câu hỏi.",
      recoverButton: "Bật giám sát và tiếp tục",
      recoverPreparingNote:
        "AI đang chuẩn bị lời chào. Đồng hồ chỉ bắt đầu khi hội thoại sẵn sàng.",
      recoverTimerNote:
        "Thời gian vẫn được tính trên máy chủ trong lúc thiết lập lại thiết bị.",
    },
    speechControl: {
      recordingUnsupported:
        "Trình duyệt chưa hỗ trợ ghi âm. Bạn có thể nhập văn bản.",
      sttUnsupported:
        "Trình duyệt chưa hỗ trợ STT. Bạn vẫn có thể ghi âm và nhập transcript sau khi dừng.",
      recordingTooLarge:
        "Bản ghi đạt giới hạn 9 MB; hãy ghi lại câu trả lời ngắn hơn.",
      recordingInterrupted:
        "Ghi âm bị gián đoạn. Hãy ghi lại hoặc gửi câu trả lời bằng văn bản.",
      sttInterrupted:
        "STT bị gián đoạn. Bản ghi vẫn tiếp tục; dừng và kiểm tra hoặc nhập transcript trước khi gửi.",
      sttStopped:
        "STT đã dừng. Bạn có thể tiếp tục ghi âm, rồi kiểm tra hoặc nhập transcript.",
      sttOpenFailed:
        "Không mở được STT. Ghi âm vẫn hoạt động; nhập transcript sau khi dừng.",
      micOpenFailed:
        "Không mở được micro/ghi âm. Kiểm tra quyền micro và HTTPS hoặc nhập văn bản.",
      description:
        "Nhận giọng nói và ghi âm câu trả lời. Kiểm tra transcript trước khi gửi; audio được lưu riêng tư nếu Job bật ghi âm. STT có thể dùng dịch vụ nhận dạng của trình duyệt.",
      stopAndCheckButton: "Dừng và kiểm tra transcript",
      startVoiceButton: "Bắt đầu trả lời bằng giọng nói",
      openingMic: "Đang mở micro…",
      recordingSignal: "Đang ghi âm · {seconds}s · {speechStatus}",
      speechDetected: "Có tín hiệu lời nói",
      waitingForSpeech: "Đang chờ giọng nói",
      recognizingPrefix: "Đang nhận dạng: {text}",
    },
    demo: {
      processes: {
        technicalKnowledge: "Kiến thức kỹ thuật",
        problemSolving: "Giải quyết vấn đề",
        practicalExperience: "Kinh nghiệm thực tế",
        technicalReasoning: "Lập luận kỹ thuật",
        behavioral: "Hành vi & Tình huống",
        communication: "Giao tiếp",
      },
      micError:
        "Không thể mở microphone. Hãy cấp quyền mic cho trình duyệt rồi thử lại.",
      demoBannerPrefix: "Bản xem trước Voice Interview:",
      demoBannerBody: "âm thanh chỉ lưu cục bộ trên trình duyệt.",
      demoTag: "DEMO",
      roomLabel: "Phòng phỏng vấn AI",
      candidateMock: "Ứng viên: Nguyễn Văn An · Java Backend Engineer",
      aiActiveBadge: "Sophia AI 4.5 · Đang phỏng vấn",
      durationLabel: "Thời lượng",
      durationValue: "45 phút",
      remainingLabel: "Còn lại",
      leaveRoom: "Rời phòng",
      recruitmentFlowAria: "Quy trình tuyển dụng",
      stage1Title: "Vòng 1: CV Screening",
      stage1Detail: "Khớp hồ sơ · 82/100",
      stage2Title: "Vòng 2: AI Interview",
      stage2Detail: "Đang thực hiện · Voice mode",
      stage3Title: "Vòng 3: Assessment",
      stage3Detail: "Mở sau khi AI Interview đạt",
      roadmapTitle: "Lộ trình AI Interview · 6 quy trình",
      roadmapSubtitle: "AI đọc câu hỏi, lắng nghe và tạo câu hỏi bám đuổi.",
      processBadge: "Quy trình {index}",
      statusActive: "ĐANG THI",
      statusDone: "HOÀN TẤT",
      statusRound: "VÒNG {index}",
      twoQuestions: "2 câu hỏi",
      oneQuestion: "1 câu hỏi",
      processQuestionLabel: "Quy trình {processIndex}: {stageTitle}",
      questionProgress: "Câu hỏi {current}/{total}",
      timeMock: "Thời gian: 02:45",
      aiReadingLabel: "Câu hỏi được AI đọc",
      listenAgain: "Nghe lại",
      aiEvaluationNote:
        "AI phân tích độ rõ ràng, chiều sâu kỹ thuật, ví dụ thực tế và cách lập luận về trade-off.",
      dynamicFollowupLabel: "Câu hỏi bám đuổi linh hoạt",
      dynamicFollowupTitle:
        "Sophia AI sẽ tạo câu hỏi bám đuổi từ câu trả lời của bạn.",
      dynamicFollowupBadge: "Speech-to-Speech",
      recordingPaused: "Đã tạm dừng ghi âm",
      recordingLive: "Đang thu âm giọng nói trực tiếp",
      recordingSaved: "Đã lưu câu trả lời bằng giọng nói",
      recordingReady: "Sẵn sàng ghi âm câu trả lời",
      micLocaleLabel: "Microphone · Tiếng Việt",
      waveformAria: "Dạng sóng âm thanh",
      audioUnsupported: "Trình duyệt không hỗ trợ âm thanh.",
      recordAgain: "Thu âm lại",
      startAnswer: "Bắt đầu trả lời",
      resume: "Tiếp tục",
      pause: "Tạm dừng",
      submitAndNext: "Nộp câu {current} & tiếp tục",
      prevQuestion: "Câu trước",
      nextQuestion: "Câu tiếp theo",
      aiRoleTitle: "Chuyên gia Kiến trúc Hệ thống & Giám định Năng lực CV",
      micSignalLabel: "Tín hiệu mic",
      micRecordingValue: "Đang thu",
      micReadyValue: "Sẵn sàng",
      latencyLabel: "Độ trễ mạng",
      latencyValue: "22 ms · Tốt",
      aiEvaluatingTitle: "AI đang đánh giá",
      evalCriteria: {
        c1: "Độ chính xác và chiều sâu kỹ thuật",
        c2: "Cấu trúc lập luận và trade-off",
        c3: "Kinh nghiệm thực tế đối chiếu CV",
        c4: "Giao tiếp rõ ràng bằng giọng nói",
      },
      sessionQuestionsTitle: "Các câu trong phiên",
      openQuestionAria: "Mở câu {index}",
      introBadge: "VOICE INTERVIEW DEMO",
      introTitle: "Phỏng vấn trực tiếp với Sophia AI",
      introSubtitle: "AI đọc câu hỏi và ứng viên trả lời bằng giọng nói.",
      introFeat1Title: "AI đọc câu hỏi",
      introFeat1Text: "Có thể nghe lại trước khi trả lời",
      introFeat2Title: "Trả lời bằng giọng nói",
      introFeat2Text: "Mic chỉ bật khi bạn cho phép",
      introFeat3Title: "Demo cục bộ",
      introFeat3Text: "Không tải âm thanh lên backend",
      introChecklistTitle: "Kiểm tra trước khi vào phòng",
      introCheck1: "Cho phép microphone khi được hỏi.",
      introCheck2: "Dùng tai nghe để nghe AI rõ hơn.",
      introCheck3: "Mỗi câu trả lời tối đa 3 phút.",
      enterRoomButton: "Vào phòng phỏng vấn",
      backToList: "Quay lại danh sách",
      completeBadge: "Voice Interview hoàn tất",
      completeTitle: "AI đang phân tích câu trả lời",
      completeDesc:
        "Đã ghi nhận {answered}/{total} câu. Phiên thật sẽ Speech-to-Text, phân tích và chấm điểm năng lực.",
      completeBackButton: "Về danh sách",
    },
    mockInvitation: {
      stageTechnical: "Kiến thức kỹ thuật",
      stageProblemSolving: "Giải quyết vấn đề",
      stagePractical: "Kinh nghiệm thực tế",
      q1Text:
        "Trong Spring Boot, annotation nào phù hợp nhất để đánh dấu một service chứa business logic?",
      q2Text:
        "Với mô hình database-per-tenant, biện pháp nào quan trọng nhất để tránh truy cập nhầm dữ liệu giữa các tenant?",
      q2Opt1: "Dùng một cache chung",
      q2Opt2: "Resolve tenant context trước mọi truy vấn",
      q2Opt3: "Tăng connection pool",
      q2Opt4: "Tắt transaction",
      q3Text:
        "API tìm kiếm ứng viên tăng từ 200ms lên 4 giây khi lượng dữ liệu tăng gấp 10 lần. Bạn sẽ điều tra nguyên nhân và ưu tiên giải pháp như thế nào?",
      q4Text:
        "Một RabbitMQ consumer xử lý cùng một CV hai lần. Hãy mô tả cách bạn thiết kế xử lý idempotent và theo dõi lỗi.",
      q5Text:
        "Hãy kể về một quyết định kỹ thuật khó mà bạn từng chịu trách nhiệm. Bạn đã cân nhắc trade-off và đo lường kết quả ra sao?",
    },
  },
  humanMeeting: {
    guestFallback: "Khách SmartHire",
    scorecardSaved: "Đã lưu phiếu đánh giá.",
    invalidRoomLink: "Link phòng họp không hợp lệ.",
    cannotJoinTitle: "Không vào được phòng họp",
    backButton: "Quay lại",
    endedTitle: "Buổi phỏng vấn đã kết thúc",
    endedDesc:
      "Lịch phỏng vấn này đã qua thời gian kết thúc. Phòng họp không còn hoạt động.",
    backToList: "Quay lại danh sách",
    eyebrow: "SmartHire Meeting",
    defaultRoomTitle: "Phỏng vấn trực tiếp",
    jitsiProvider: "Jitsi · {domain}",
    scorecardButton: "Phiếu đánh giá",
    liveNoRecording: "Live · không ghi hình",
    exitRoom: "Thoát phòng",
    jitsiFrameTitle: "Phòng phỏng vấn Jitsi",
    openingJitsi: "Đang mở Jitsi…",
    connectionErrorTitle: "Không kết nối được phòng họp",
    localTileLabel: "{name} (Bạn)",
    localTileHostLabel: "{name} (Bạn) · mở phòng",
    muteMic: "Tắt mic",
    unmuteMic: "Bật mic",
    turnOffCam: "Tắt camera",
    turnOnCam: "Bật camera",
    scorecardEyebrow: "Scorecard trực tiếp",
    scorecardSubtitle: "Chấm trong lúc phỏng vấn",
    hideScorecard: "Ẩn",
    participantFallback: "Thành viên",
    devicePermissionError:
      "Không mở được camera/micro. Hãy cho phép quyền trình duyệt.",
    status: {
      preparing: "Đang chuẩn bị phòng…",
      enablingDevices: "Đang bật camera / micro…",
      joining: "Đang vào phòng họp SmartHire…",
      openedHost: "Phòng đã mở — chờ HR / ứng viên khác tham gia.",
      connectedGuest: "Đã vào phòng — đang kết nối video với mọi người.",
      deviceError: "Lỗi thiết bị",
    },
  },
} as const;

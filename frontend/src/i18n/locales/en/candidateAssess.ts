export const candidateAssessEn = {
  common: {
    minutes: "{count} min",
    points: "{count} pts",
    pointsShort: "{score} / {total} pts",
    retry: "Retry",
    back: "Back",
  },
  aiEval: {
    arithmeticSumOptimal:
      "The code correctly implements the arithmetic progression formula to calculate the sum from 1 to n in O(1) time complexity. It is clean, concise, and optimal.",
    extremelyClean:
      "The code is extremely clean, well-structured, and contains no unnecessary boilerplate.",
    sumFormula:
      "The code correctly implements the formula to calculate the sum from 1 to n",
    correctlyImplements: "The code correctly implements {subject}",
    cleanConciseOptimal: "The code is clean, concise, and optimal.",
    cleanOptimalGoodPractices:
      "The code is clean, optimal, and follows good practices.",
    wellStructuredReadable:
      "The code is well-structured and easy to read.",
    solutionCleanConciseOptimal: "The solution is clean, concise, and optimal.",
    solutionOptimal: "The solution is optimal.",
    noBoilerplate: "The code contains no unnecessary boilerplate.",
    namingClear: "Naming conventions are clear and descriptive.",
    cleanStructured: "Clean and well-structured.",
    timeComplexityOptimal: "Time complexity is optimal.",
    spaceComplexityOptimal: "Space complexity is optimal.",
    noAnswerSubmitted: "No answer submitted.",
    autoGradingUnavailable:
      "Automatic grading unavailable. Retry or review manually.",
    allTestCasesPassed: "All test cases passed successfully.",
    goodExceptionSafety: "Good exception safety.",
    bulletCodeIs: "• The code is",
  },
  examFullscreen: {
    notSupported: "Your browser does not support fullscreen mode.",
    openFailed: "Could not enter fullscreen mode.",
    blockedByBrowser:
      "Fullscreen was blocked by the browser. Click Start again while the Chrome window is focused.",
    notEntered:
      "The browser has not entered fullscreen mode yet. Please click the button again to continue.",
  },
  submission: {
    leaveTitle: "Leave page?",
    leaveDescription:
      "You have unsaved answers. Are you sure you want to leave this page?",
    leaveConfirm: "Leave page",
  },
  answerInput: {
    loadingCodeEditor: "Loading code editor…",
    unsupportedType: "This question type is not supported yet.",
    selectMultiplePrompt:
      "Select all correct answers (multiple choices allowed):",
    selectSinglePrompt: "Select the single best answer:",
    clearSelection: "Clear selection",
    optionsAriaLabel: "Answer options",
  },
  invitation: {
    invalidTestId: "Invalid assessment ID.",
    backToAssessments: "Assessments",
    loadingInvitation: "Loading assessment invitation",
    noEligibleTitle: "No application is in the assessment stage",
    noEligibleDesc:
      "Invitations only open when an application is in the Assessment stage.",
    notFoundTitle: "Assessment invitation not found",
    notFoundDesc:
      "Assessment #{testId} does not belong to the selected application or has not been sent to you.",
    applicationSelectLabel: "Application",
    applicationOption: "{jobTitle} · Application #{id}",
    eyebrow: "Invitation · {companyName}",
    durationLabel: "Duration",
    passingScoreLabel: "Passing score",
    passingScoreByTest: "By test",
    statusLabel: "Status",
    rulesHeading: "Exam Regulations",
    guidelinesHeading: "Technical Notes & Attempt Progress",
    applicationRef: "Application #{id}",
    applicationDetailLink: "Application details",
    nextStepEyebrow: "Next step",
    continueExamHeading: "Resume assessment",
    retakeDemoHeading: "Retake demo assessment",
    enterExamHeading: "Enter assessment",
    nextStepDesc:
      "Confirm the exam rules, then check your camera, microphone, and screen sharing before starting.",
    acceptRulesTitle: "I agree to the exam regulations",
    acceptRulesDesc:
      "Commit to taking the test honestly and accept device proctoring.",
    acceptRulesHint: "Click to accept and unlock device check",
    gateLockedPlaceholder:
      "Accept the regulations above to verify your camera, microphone, and screen sharing.",
    viewPreviousResult: "View previous attempt result",
    viewResultHeading: "View results",
    viewResultDesc: "Your submission has been turned in. You can view your results.",
    viewResultButton: "View submission result",
    gateButtonContinue: "Resume assessment",
    gateButtonRetake: "Retake from start",
    gateButtonStart: "Start assessment",
    guidelines: {
      timerTitle: "Continuous countdown timer:",
      timerBody:
        "The {minutes}-minute timer runs continuously once started and cannot be paused.",
      syncTitle: "Instant Real-time Cloud Sync:",
      syncBody:
        "Whenever you choose an option, the system saves it to the server immediately.",
      resilienceTitle: "Network Resilience:",
      resilienceBody:
        "If your connection drops, your current progress is preserved locally and automatically re-syncs when reconnected.",
    },
    regulations: {
      fullscreenTitle: "Mandatory Fullscreen Mode",
      fullscreenBody:
        "The exam automatically enters fullscreen. Exiting fullscreen or switching tabs more than 3 times will auto-submit and lock the exam.",
      noDevtoolsTitle: "No DevTools or External AI",
      noDevtoolsBody:
        "Opening F12, copying prompts, or using assistant extensions will be logged.",
      deviceReqTitle: "Recommended Device Setup",
      deviceReqBody:
        "Latest Google Chrome, Edge, or Safari on a desktop or laptop computer.",
    },
  },
  proctorGate: {
    defaultStartLabel: "Start assessment",
    devicesStoppedError:
      "Camera, microphone, or screen sharing stopped. Please check your devices again.",
    fullscreenUnsupportedError:
      "Your browser does not support fullscreen mode.",
    checkFailedError: "Unable to complete the device check.",
    title: "Device check",
    microphoneChip: "Microphone",
    entireScreenChip: "Entire screen",
    cameraChip: "Camera",
    consentLabel:
      "Allow camera, microphone, and entire-screen sharing throughout the exam. Disabling devices, leaving the camera frame, or having another person in frame counts as a violation.",
    devicesReady:
      "Devices are ready. Click to enter fullscreen and begin.",
    openingExam: "Opening exam…",
    checkingDevices: "Checking…",
    checkDevicesButton: "Check devices",
  },
  proctorGuard: {
    examRoomTitle: "Exam Room",
    defaultCandidate: "Candidate",
    fullscreenFallbackError: "Could not enter fullscreen mode.",
    openingFullscreen: "Entering fullscreen…",
    openFullscreen: "Enter fullscreen",
    fullscreenLabel: "Fullscreen",
    violationsPrefix: "Violations:",
    warningTitle: "Proctoring warning",
    returnToExam: "Return to exam",
    violationWillAutoSubmit:
      "{message} ({count}/{max}). Your exam will be submitted automatically.",
    violationWarning:
      "{message} ({count}/{max}). Please return to the exam room.",
    face: {
      loading: "Loading face detection…",
      ready: "Detecting face…",
      present: "Face in frame",
      absent: "Face missing",
      multi: "Multiple people",
      unavailable: "Face check unavailable",
    },
    violations: {
      multiFace: "Multiple faces detected in camera frame",
      lostFace: "Face is no longer visible in camera frame",
      microphoneLost: "Microphone was turned off",
      cameraLost: "Camera was turned off",
      fullscreenExit: "You exited fullscreen mode",
      pageHidden: "You switched tabs or hid the exam page",
      windowBlur: "The exam window lost focus",
      contextMenu: "Right-click context menu is blocked",
      copyAttempt: "Copying content is blocked",
      pasteAttempt: "Pasting content is blocked",
      blockedShortcut: "Shortcut {key} is blocked",
      screenShareStopped: "Screen sharing stopped",
    },
  },
  result: {
    eyebrow: "Assessment Result",
    demoBadge: "Demo UI",
    summaryEyebrow: "Summary",
    scoreHeading: "Score",
    evaluationHeading: "Evaluation",
    nextStepHeading: "Next step",
    sessionDetailsHeading: "Session details",
    startedLabel: "Started",
    submittedLabel: "Submitted",
    submittedAtInline: "Submitted {when}",
    submissionIdLabel: "Submission ID",
    structureHeading: "Test structure",
    totalQuestions: "Total",
    quizQuestions: "Quiz / Essay",
    codingQuestions: "Coding",
    demoDisclaimer:
      "UI demo test — scores do not affect your recruitment process.",
    aiEvaluationHeading: "AI Assistant Evaluation",
    aiEngineBadge: "Hybrid AI Engine",
    questionMetaCoding: "Question {order} · Coding challenge",
    questionMetaEssay: "Question {order} · Essay question",
    questionMetaQuiz: "Question {order} · Objective review",
    testsPassedChip: "Tests: {passed}",
    timeComplexityChip: "Time: {value}",
    spaceComplexityChip: "Space: {value}",
    hardcodeWarning:
      "Suspected test case hardcoding detected (score capped at 50%).",
    aiCommentHeading: "AI Feedback:",
    rubricHeading: "Rubric Criteria:",
    rubricCriterionFallback: "Criterion {index}",
    backToList: "Back to list",
    opening: "Opening…",
    retakeFromStart: "Retake from start",
    scorePctLabel: "{pct}% of total score",
    scoreProgressAria: "Percentage score achieved",
    headline: {
      failed: "Grading failed",
      expired: "Time expired",
      grading: "Your assessment is being graded",
      submittedOrPending: "Submitted — Pending grading",
      completed: "Your assessment has been graded",
      recorded: "Your submission has been recorded",
    },
    detail: {
      failed:
        "An error occurred during automatic grading. The recruiter has received your submission and will review and update your score.",
      grading:
        "The system is running test cases and reviewing your code with AI. Results will appear automatically in a moment...",
      submittedOrPending:
        "Your submission was received safely and queued for asynchronous grading.",
      pending:
        "Your answers have been saved. Official scores will update once the recruiter completes grading.",
      passed:
        "You have completed the assessment and met the passing threshold.",
      failedThreshold:
        "You have completed the assessment. Your score has not yet met the passing threshold.",
      completedDefault:
        "You have completed the assessment. Below is your result summary.",
    },
    verdict: {
      failed: "Grading failed",
      grading: "Grading",
      submittedOrPending: "Pending grading",
      pending: "Awaiting score",
      graded: "Graded",
      passed: "Passed",
      failedThreshold: "Did not pass",
    },
    pendingTitle: {
      failed: "Grading failed",
      grading: "Grading…",
      submittedOrPending: "Pending grading",
      waiting: "Awaiting result",
    },
    pendingSubtitle: {
      failed: "Recruiter review required",
      grading: "Running test cases and AI review...",
      waiting: "Scores will be ready in a few minutes",
    },
    nextStep: {
      pending:
        "Track your score in the assessments list once the recruiter finishes grading.",
      passed:
        "Your passing result has been recorded on your application.",
      failed: "Check the next step on your application page.",
      default: "Your result has been saved for recruiter review.",
    },
  },
  coding: {
    defaultTitle: "{title} · {points} pts",
    fallbackTitleName: "Coding Challenge",
    constraintsHeading: "Constraints",
    examplesHeading: "Input / Output Examples",
    exampleItem: "Example {index}",
    exampleIo: "Input: {input}\nOutput: {output}",
    exampleExplanation: "Explanation: {text}",
    sandboxHint:
      "Run up to 5 public test cases or test with custom stdin. Hidden tests are used only during grading. Max source length: 10,000 characters.",
    consoleAria: "Test cases console",
    consoleHeading: "Console",
    sampleSummary: "{passed}/{total} samples passed",
    consoleModesAria: "Console modes",
    sampleTestsTab: "Sample tests",
    customInputTab: "Custom input",
    sampleCaseNavAria: "Selected test case",
    testCaseButton: "Test Case {index}",
    runningInSandbox: "Executing code in sandbox…",
    statusPassed: "Passed",
    statusProcessing: "Processing",
    statusExecError: "Time Limit / Runtime / Compile Error",
    statusFailed: "Failed",
    inputLabel: "Input",
    expectedOutputLabel: "Expected Output",
    actualOutputLabel: "Actual Output",
    noOutputYet: "No output yet",
    terminalLabel: "Terminal",
    customStdinHint:
      "Run with custom stdin. Not compared against expected output — inspect stdout/stderr only.",
    customStdinLabel: "Custom stdin",
    runningCustom: "Running…",
    runCustomButton: "Run custom input",
    customCompleted: "Finished",
    customError: "Compile / runtime error",
    stdoutLabel: "Stdout",
    emptyOutput: "(empty)",
    languageLabel: "Language",
    switchLangTitle: "Switch language?",
    switchLangDesc:
      "Your current code will be replaced with the starter code for the selected language.",
    switchLangConfirm: "Switch language",
    sampleCodeInserted: "Sample solution code inserted.",
    insertSampleTitle:
      "Insert sample algorithm solution for testing (UI Demo assessments only)",
    insertSampleButton: "Sample code",
    resetCodeTitle: "Reset to starter code?",
    resetCodeDesc:
      "This replaces your current code with the starter template. Any edits will be lost.",
    resetCodeConfirm: "Reset",
    resetCodeButton: "Reset",
    editorAriaLabel: "Submission source code",
    sourceTooLongError:
      "Source code may not exceed 10,000 characters. Changes beyond the limit were not applied.",
    editorFooterHint:
      "{count}/{max} characters · Ctrl+Enter / ⌘+Enter: run sample tests. Tab: move focus between controls.",
    runningSamples: "Running…",
    runSamplesButton: "Run Sample Tests",
    saving: "Saving…",
    saveButton: "Save code",
    savedToServer:
      "Code saved to server. Click Submit Exam when ready to finish the entire assessment.",
    updatedLocally:
      "Code updated. Click Submit Exam when ready to finish the entire assessment.",
    runSamplesAction: "Run sample test cases",
    sampleComment: "Sample code: compute sum from 1 to n",
    sampleFallbackComment: "// Sample solution code\n",
  },
  essay: {
    defaultSelection: "text",
    heading: "Essay Question {number} · {points} pts",
    tipsHeading: "Writing tips",
    tipsBody:
      "Stay focused on the prompt, explain underlying principles, and analyze trade-offs. Include real-world examples and clearly state your assumptions.",
    toolbarAria: "Answer formatting",
    boldAria: "Bold",
    italicAria: "Italic",
    inlineCodeAria: "Inline code",
    bulletListAria: "Bullet list",
    editMode: "Edit",
    previewMode: "Preview",
    answerLabel: "Essay answer (Markdown supported)",
    emptyPreview: "No content entered yet.",
    wordAndCharCount: "{words} words · {chars}/{max} characters",
    draftSaveError:
      "Unable to save local draft on this device. Keep the page open and save to server.",
    draftSavedAt: "Local draft auto-saved at {time}",
    draftHint:
      "Drafts auto-save locally after 1 second; synced to server every 10 seconds.",
  },
  stepper: {
    navAria: "Assessment sections",
    part1Title: "Part 1: Quiz & Essay",
    part1Meta: "({count} questions{suffix})",
    lockedSuffix: " · Locked",
    remainingSuffix: " · {time} left",
    part2Title: "Part 2: Coding",
    part2Meta: "({count} problems{suffix})",
    noneSuffix: " · None",
    inProgressSuffix: " · Active",
    unlockAfterPart1Suffix: " · Unlocks after P1",
  },
  assessmentsList: {
    eyebrow: "Technical Assessment Stage",
    title: "Assessments",
    subtitle:
      "Each application receives a tailored assessment from the question bank. [Demo UI] tests let you explore the interface and can be retaken without affecting your application.",
    metricInvitations: "Invitations",
    metricReady: "To complete",
    metricCompleted: "Completed",
    beforeStartStrong: "Before you start:",
    beforeStartBody:
      "open an invitation to read the rules and complete the device check. The timer starts only after you enter the exam room.",
    loadingLabel: "Loading assessment invitations",
    emptyTitle: "No assessments assigned yet",
    emptyDesc:
      "Official assessments will appear once your application passes CV screening.",
    cardEyebrow: "Assessment Invitation",
    durationLabel: "Duration",
    passingScoreLabel: "Passing score",
    passingScoreByTest: "By test",
    applicationLabel: "Application",
    statusLabel: "Attempt status",
    footerNotStarted:
      "Review the invitation, rules, and check devices before starting",
    footerInProgress: "You can resume your open session",
    footerDone: "View your results or reopen the invitation",
    actionContinue: "Resume assessment",
    actionRetake: "Retake from start",
    actionViewResult: "View results",
    actionViewInvitation: "View invitation",
  },
  take: {
    invalidSubmissionId: "Invalid submission ID.",
    submitTitle: "Submit assessment?",
    submitDesc:
      "You have answered {answered}/{total} questions. You cannot edit answers after submitting.",
    submitConfirm: "Submit",
    retakeTitle: "Retake from start?",
    retakeDesc:
      "You will return to the invitation to accept the rules and verify your devices before starting again.",
    retakeConfirm: "Go to invitation",
    completeObjTitle: "Finalize Quiz & Essay section?",
    completeObjDesc:
      "Once finalized, you will move to the Coding section and cannot edit Part 1 answers.",
    completeObjConfirm: "Finalize Part 1",
    loadingResults: "Loading results…",
    statusSubmitting: "Submitting…",
    statusSaving: "Saving…",
    statusUnsaved: "Unsaved changes",
    statusSaved: "Saved",
    redirectingToInvite:
      "Redirecting to the invitation for device verification…",
    fullscreenHeading: "Enter fullscreen to continue",
    fullscreenDesc:
      "This assessment requires fullscreen mode. Click the button below to enter fullscreen and proceed.",
    officialTitleFallback: "OFFICIAL TECHNICAL ASSESSMENT",
    timerAria: "Time remaining",
    codingNavLabel: "Problems:",
    quizNavLabel: "Questions:",
    questionTitle: "Question {index} · {points} pts",
    progressLabel: "Progress:",
    progressCount: "{answered} / {total} answered",
    loadingExam: "Loading assessment…",
    noCodingQuestions: "No coding problems. You may submit your assessment.",
    noQuizQuestions:
      "No quiz or essay questions. You may proceed to the coding section.",
    questionCounter: "Question {current} / {total}",
    questionTypeMultiple: "Multiple choice",
    questionTypeSingle: "Single choice",
    prevProblem: "Previous problem",
    nextProblem: "Next problem",
    footerProgress: "{saveLabel} · {answered}/{total} answered",
    submittingButton: "Submitting…",
    finishButton: "Finish exam",
    submitExamButton: "Submit exam",
    prevQuestion: "Previous",
    nextQuestion: "Next",
    completePart1Button: "Complete Part 1 & Continue to Coding",
  },
  sample: {
    header: {
      backTitle: "Back to Assessments",
      badge: "CANDIDATE SAMPLE UI",
      simulationNote: "(Interactive live exam simulation)",
      title: "Senior Full-Stack Engineer Technical Assessment",
      pauseTimer: "Pause",
      resumeTimer: "Resume",
      resetSample: "Reset sample",
      stagesAria: "Assessment walkthrough steps",
    },
    stages: {
      invitationLabel: "1. Invitation & Device Check",
      invitationDesc: "Device & auto audio",
      mcqLabel: "2. MCQ Quiz",
      mcqDesc: "5 theory questions",
      essayLabel: "3. Technical Essay",
      essayDesc: "Architecture design",
      codingLabel: "4. Coding Studio",
      codingDesc: "HackerRank style",
      resultLabel: "5. AI Result & Report",
      resultDesc: "Scores & competency",
    },
    difficulty: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
    },
    mcq: {
      q1Question:
        "In Spring Boot 3 & Spring Web, what is the primary difference between `@RestController` and `@Controller`?",
      q1OptA:
        "`@RestController` combines `@Controller` and `@ResponseBody`, automatically serializing returned objects to JSON/XML.",
      q1OptB:
        "`@RestController` only supports HTTP GET requests; POST/PUT require `@Controller`.",
      q1OptC:
        "`@RestController` runs on a dedicated Netty thread pool, whereas `@Controller` runs on Tomcat.",
      q1OptD:
        "`@RestController` requires every endpoint to include an `X-Tenant-ID` header.",
      q2Question:
        "Which new React 19 hook manages asynchronous form action state and returns `[state, formAction, isPending]`?",
      q3Question:
        "In MySQL InnoDB, which B+Tree index physically orders table rows on disk according to the index key?",
      q3OptA: "Secondary Index (Non-clustered Index)",
      q3OptB: "Clustered Index (Primary Key Index)",
      q3OptC: "Fulltext Search Index",
      q3OptD: "Adaptive Hash Index",
      q4Question:
        "In a SaaS 'Database-per-Tenant' architecture, what is the safest way to prevent cross-tenant data leaks in async RabbitMQ workers?",
      q4OptA:
        "Attach `X-Tenant-ID` to the Message Header; the worker reads it and sets `TenantContext` (ThreadLocal) before querying the DB.",
      q4OptB:
        "Provision a dedicated RabbitMQ Virtual Host and container instance for every single tenant.",
      q4OptC:
        "Hardcode the Master Database connection and join tables via foreign keys.",
      q4OptD:
        "Merge all tenant data into a shared database and query `SELECT * FROM table WHERE tenant_id = ?`.",
      q5Question:
        "Which strategy most effectively prevents Cache Stampede when thousands of concurrent requests miss an expiring cache key?",
      q5OptA: "Increase database connection timeout by 10x.",
      q5OptB:
        "Use a Distributed Mutex Lock (such as Redis Redlock) or Cache-Aside with Probabilistic Early Expiration (XFetch).",
      q5OptC: "Flush the entire Redis cache every hour.",
      q5OptD: "Convert all queries to synchronous blocking calls.",
    },
    invitation: {
      readyBadge: "READY TO START",
      companyLabel: "Company: SmartHire Enterprise Tech",
      heading: "In-Depth Technical Competency Assessment (Full-Stack)",
      introTemplate:
        "Welcome to the technical and system architecture assessment for {role}. This assessment evaluates algorithmic thinking, distributed systems architecture, and clean coding skills.",
      introRole: "Senior Full-Stack Engineer",
      durationLabel: "Duration",
      durationValue: "45 min",
      passingLabel: "Passing score",
      passingValue: "70 / 100 pts",
      structureTitle: "Assessment Structure",
      part1Title: "Part 1: Objective Multiple Choice",
      part1Desc: "5 deep-dive theory questions (Spring Boot, React 19, DB)",
      part2Title: "Part 2: Technical & Architecture Essay",
      part2Desc: "1 system design prompt on Microservices & Idempotency",
      part3Title: "Part 3: Live Coding Challenge",
      part3Desc:
        "1 algorithm problem with Code Editor & Sample Test Runner",
      deviceTitle: "Device & Automatic Audio Monitoring",
      autoAudioTitle: "Automatic ambient audio capture",
      autoAudioDescPrefix: "This assessment ",
      autoAudioDescStrong: "does not require turning on your camera",
      autoAudioDescSuffix:
        ". The system automatically enables your microphone to record ambient audio during the exam to ensure fairness and integrity.",
      micDeviceLabel: "Device microphone",
      micReady: "Ready ({volume} dB)",
      micHelp:
        "Your microphone is working properly. Recording starts automatically when you begin.",
      browserCheckLabel: "Browser check:",
      browserCheckValue: "Chrome / Edge (100% Compatible)",
      tabCheckLabel: "Tab switch monitoring:",
      tabCheckValue: "Automatic alert when leaving the screen",
      rulesAgreement:
        "I commit to completing the test independently and consent to automatic ambient audio recording and tab-switch monitoring throughout the 45-minute exam.",
      enterRoomButton: "Enter exam room now",
    },
    mcqStage: {
      eyebrow: "PART 1 OF 3 · MULTIPLE CHOICE",
      heading: "Question {current} / {total}",
      proctorStatus: "AI Proctoring: Monitoring · Normal",
      goToEssay: "Go to Essay",
      navigatorLabel: "Questions:",
      valueLabel: "Points:",
      pointsValue: "{points} pts",
      optionsAria: "Answer options",
      prevQuestion: "Previous",
      nextQuestion: "Next question",
      finishMcqToEssay: "Complete Quiz & Go to Essay",
      autoAudioTitle: "Auto audio",
      micRunning: "Mic: Active",
      ambientRecordingNote: "Continuous ambient audio monitoring",
      progressTitle: "Quiz Progress",
      answeredLabel: "Answered:",
      answeredCount: "{answered} / {total} questions",
      autoSaveNote:
        "Answers are automatically saved as soon as you select an option.",
    },
    essay: {
      eyebrow: "PART 2 OF 3 · TECHNICAL & ARCHITECTURE ESSAY",
      heading: "High-Throughput Realtime Recruitment Notification Architecture",
      reviewMcq: "Review Quiz",
      goToCoding: "Go to Coding Studio",
      promptBadge: "TECHNICAL ESSAY PROMPT",
      recommendedTime: "Recommended time: 15 min",
      promptText:
        "Design a distributed architecture to process a realtime recruitment notification queue handling 100,000 req/s. Explain your choice between Redis Streams and RabbitMQ, how you enforce Idempotency (preventing duplicate sends), and your Dead-Letter Queue strategy when a third-party email provider goes down.",
      answerHeading: "Your answer (Markdown supported):",
      autoSavedAgo: "Auto-saved 30 seconds ago",
      placeholder:
        "Write your architecture design explanation here...",
      wordCountPrefix: "Word count:",
      wordCountValue: "{count} words",
      minWordsHint: "(Minimum recommended: 150 words)",
      fillShortSample: "Fill short sample solution",
      backToMcq: "Back to Quiz",
      confirmToCoding: "Confirm & Continue to Coding",
      defaultAnswer: `To design a high-throughput realtime recruitment notification queue (100,000 req/s), I propose the following distributed architecture:

1. Overall Architecture:
- API Gateway ingests requests and routes by the X-Tenant-ID header.
- RabbitMQ acts as the primary Message Broker using Topic Exchanges and Dead Letter Exchanges (DLX).
- Redis serves as an In-Memory Cache and stores Idempotency Key state (24-hour TTL).
- Worker Pool (Spring Boot / Node.js) auto-scales based on queue depth (RabbitMQ Consumer Prefetch = 20).

2. Idempotency & Deduplication:
- Every notification event (e.g., CandidatePassScreeningEvent) carries a unique idempotencyId: SHA256(tenantId + eventType + entityId + timestampWindow).
- Before sending email/SMS, the Worker runs Redis command: \`SET idempotency:{key} "PROCESSING" EX 300 NX\`.
- If the key already exists -> Skip duplicate message (immediately ACK RabbitMQ).
- Upon successful delivery -> Update key to "COMPLETED" with 24h TTL.

3. Fault Tolerance & Dead-Letter Queue (DLQ):
- Configure a Retry Policy: up to 3 retries with Exponential Backoff (1s -> 4s -> 16s).
- If all 3 retries fail (e.g., SendGrid/Twilio outage) -> Route message to Dead Letter Queue (dlq_candidate_notifications).
- Operations team uses a monitoring dashboard and manual replay tool once the provider recovers.`,
      shortSolution: `1. Overall Architecture:
- Use RabbitMQ with Topic Exchange to route notifications (SMS, Email, Push).
- Redis Cluster stores Idempotency Key states.

2. Idempotency Handling:
- Key: "idempotency:" + tenant_id + ":" + event_id (24h TTL).
- Atomic command: SET NX.

3. Dead-Letter Queue:
- Exponential Backoff retry up to 3 attempts.
- Failed messages move to dlq_notifications for inspection and replay.`,
    },
    coding: {
      eyebrow: "PART 3 OF 3 · LIVE CODING CHALLENGE (CODING STUDIO)",
      heading:
        "Problem: Optimize Interview Schedule Allocation (Merge Overlapping Intervals)",
      reviewEssay: "Review Essay",
      submitExam: "Submit Exam",
      problemStatementBar: "Problem Statement & Constraints",
      problemTitle: "Problem Description",
      problemBodyBeforeCode1:
        "SmartHire AI needs to merge busy interview intervals for the hiring panel to find available slots for the next candidate. Given an array of time intervals ",
      problemBodyBetweenCodes: ", where each element is ",
      problemBodyAfterCode2:
        ", write a function to merge all overlapping intervals and return an array of non-overlapping intervals.",
      timeLimit: "Time limit: 1000 ms",
      memoryLimit: "Memory limit: 256 MB",
      maxPoints: "Max score: 50 pts",
      example1Title: "Example 1:",
      example1Input: "Input: intervals = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]]",
      example1Output: "Output: [[9, 11], [13, 16]]",
      example1Explanation:
        "Explanation: Intervals [9, 10] and [9.5, 11] overlap and merge into [9, 11].",
      example2Title: "Example 2:",
      example2Input: "Input: intervals = [[8, 9], [10, 12]]",
      example2Output: "Output: [[8, 9], [10, 12]]",
      example2Explanation:
        "Explanation: The two intervals do not overlap and stay separate.",
      constraintsHeading: "Constraints",
      resetTitle: "Reset to starter code",
      resetButton: "Reset",
      runningButton: "Running...",
      runCodeButton: "Run Code",
      editorPlaceholder: "// Write your solution here...",
      consoleTitle: "Console · Sandbox Output",
      passedBadge: "3/3 Test cases Passed ({ms}ms)",
      consoleIdleHintTemplate:
        "Click {button} to compile and test your solution against 3 sample test cases.",
      consoleIdleHintButton: "\"Run Code\"",
      consoleRunning:
        "Starting sandbox container & executing test cases...",
      runningLogs: "Compiling and executing inside Sandbox...",
      successLogs: `✔ Test Case 1: Input [[9, 10], [9.5, 11]] -> Expected [[9, 11]] -> Actual [[9, 11]] (Passed)
✔ Test Case 2: Input [[13, 15], [14.5, 16]] -> Expected [[13, 16]] -> Actual [[13, 16]] (Passed)
✔ Test Case 3: Input [[8, 9], [10, 12]] -> Expected [[8, 9], [10, 12]] -> Actual [[8, 9], [10, 12]] (Passed)

All 3/3 public test cases PASSED successfully!`,
    },
    result: {
      passedBadge: "COMPLETED & PASSED",
      submittedAt: "Submitted at {time}",
      heading: "Technical Assessment Result: 88 / 100 pts",
      summary:
        "Congratulations on completing the technical assessment! Your score exceeded the hiring threshold (70/100). A detailed competency report has been delivered to the Recruiting Team.",
      rankEyebrow: "Competency Rank",
      rankValue: "Top 5% Candidates",
      thresholdNote: "Passing score: 70 pts",
      part1Tag: "PART 1: QUIZ",
      part1Score: "20 / 20 pts",
      part1Title: "Core Foundations",
      part1Desc:
        "Answered 5/5 advanced questions correctly covering Spring Boot 3, React 19 hooks, Clustered Index, and RabbitMQ Multi-tenancy.",
      part2Tag: "PART 2: ESSAY",
      part2Score: "26 / 30 pts",
      part2Title: "Architecture Design",
      part2Desc:
        "AI & panel reviewers highlighted the Redis SET NX idempotency design and high-throughput Dead-letter Queue strategy.",
      part3Tag: "PART 3: CODING",
      part3Score: "42 / 50 pts",
      part3Title: "Algorithms & Clean Code",
      part3Desc:
        "Passed 10/10 test cases (3 sample tests and 7 hidden tests). Optimal O(N log N) time complexity.",
      retakeButton: "Retake sample assessment",
      backToListButton: "Back to Assessments List",
    },
  },
  proctorDevices: {
    screenMonitorLabel: "entire screen sharing",
    screenTabLabel: "interview tab sharing",
    deviceCamera: "camera",
    deviceMicrophone: "microphone",
    notReadable:
      "Cannot access {device}. Close any other app or tab using it (Camera, Teams, Zoom, OBS), verify OS permissions, and try again. ({name})",
    notAllowed:
      "Permission for {device} was denied. Please grant permission in your browser and OS settings and try again. ({name})",
    notFound:
      "No {device} found. Please connect a device and try again. ({name})",
    invalidStateMonitor:
      "Return to the assessment tab and click Check devices to share your entire screen.",
    invalidStateTab:
      "Return to the interview tab and click Check devices to continue.",
    checkFailed: "Could not verify {device}.",
    secureContextRequired: "Device check requires HTTPS or localhost.",
    mediaUnsupported:
      "Your browser does not support microphone or camera access. Please use Chrome or Edge on desktop.",
    displayUnsupported:
      "Your browser does not support screen sharing. Please use Chrome or Edge on desktop.",
    wrongTabSurface:
      "Please share the current interview browser tab, not a window or entire screen.",
    wrongMonitorSurface:
      "Please select \"Entire Screen\" in the Chrome dialog (do not select a Window or Chrome Tab).",
    cameraRequiredDuringExam: "Your camera must remain on throughout the exam.",
  },
  interviews: {
    rules: {
      r1: "The timer is controlled by the server. When time expires or the deadline passes, saved answers are submitted automatically.",
      r2: "Assigned questions left blank receive 0 points.",
      r3: "Mini Assessment consists of 4-option single/multi choice questions graded automatically.",
      r4: "Retakes are only allowed if not yet passed, attempts remain, and before the deadline. System errors do not consume attempts.",
    },
    status: {
      GENERATING: "Generating questions",
      PASSED: "Passed · Assessment unlocked",
      ERROR: "Processing error · Pending retry",
      CREATED: "Preparing questions",
      QUESTIONS_READY: "Ready for interview",
      IN_PROGRESS: "In progress",
      SCORING: "Submitted · Evaluating",
      SCORED: "Scored",
      FAILED: "Did not pass",
    },
    list: {
      eyebrow: "Automated Interview Round",
      title: "AI Interview",
      subtitle:
        "Manage interview invitations from recruiters, check deadlines, and resume active sessions.",
      metricInvitations: "Invitations",
      metricReady: "Action needed",
      metricCompleted: "Completed",
      beforeStartStrong: "Before you begin:",
      beforeStartBody:
        "check your internet connection, find a quiet space, and set aside enough time to complete the session in one sitting.",
      loadingLabel: "Loading interview invitations",
      cardEyebrowPreview: "AI Interview Invitation",
      cardEyebrowId: "AI Interview #{id}",
      previewBadge: "Preview",
      applicationFallback: "Application #{id}",
      previewCompanyRole:
        "SmartHire Technology · Technical Interview Round",
      canStartLabel: "Available from",
      canStartFallback: "Once questions are ready",
      deadlineLabel: "Deadline",
      deadlineFallback: "No limit",
      durationLabel: "Duration",
      questionCountLabel: "Questions",
      questionCountMax: "Up to {max} questions ({followUp} follow-up)",
      questionCountFixed: "{count} questions",
      invitedAt: "Invited {date}",
      attemptNumber: "Attempt #{num}",
      scoreResult: "Score {score} pts",
      maxAttempts: "Up to {max} attempts",
      startInterview: "Start interview",
      notYetAvailable: "Not open yet",
      expired: "Expired",
      actions: {
        start: "Start",
        continue: "Resume interview",
        viewSubmitted: "View submission",
        recoverRoom: "Recover room",
        viewResult: "View results",
      },
    },
    roomPage: {
      invalidInvite: "Invalid invitation.",
      backToAiInterview: "Back to AI Interviews",
    },
    room: {
      submitTitle: "Finish and submit?",
      submitDescConversational:
        "The full conversation will be sent for evaluation. You cannot send additional messages after finishing.",
      submitDescRemaining:
        "{unanswered} unanswered questions will receive 0 points. You cannot edit answers after submitting.",
      submitDescAllAnswered:
        "You cannot edit answers after submitting.",
      submitConfirm: "Submit",
      noRoomData: "Unable to load interview room data.",
      openingErrorFallback:
        "AI could not generate the greeting yet. You can retry right here in the waiting room.",
      waitingTitle: "Entered interview room",
      waitingStatus:
        "AI is preparing the opening greeting. The conversation will appear automatically when ready.",
      waitingDesc:
        "The exam timer has not started yet. Please keep the interview tab in fullscreen mode.",
      retryCreateChat: "Retry starting conversation",
      backToDeviceCheck: "Back to device check",
      defaultTitle: "AI Interview",
      attemptBadge: "Attempt: {current}/{max}",
      statusErrorBadge: "Processing error · Pending retry",
      statusPassedBadge: "Interview passed",
      statusFailedBadge: "Below passing score",
      statusScoringBadge: "Submitted · Evaluating",
      statusInProgressBadge: "In progress",
      statusReadyFallback: "Ready",
      onlineSubtitle: "· Live online interview with SmartHire AI",
      backToList: "Back to list",
      stateActive: "Session active",
      stateErrorSubmitted: "Submitted · Re-grading pending",
      stateErrorRecover: "Session recovery needed",
      stateSubmitted: "Submitted",
      stateNotStarted: "Not started yet",
      timerAria: "Time remaining {time}",
      timeRemainingLabel: "Time remaining",
      timeUpSubmitting: "Time up · submitting…",
      durationLabel: "Duration",
      submitting: "Submitting…",
      endButton: "Finish",
      progressSummary: "Saved {done}/{total} questions.",
      progressRemainingNote:
        " {unanswered} unanswered questions will score 0 if submitted.",
      progressAllRequiredNote: " Please answer all questions before submitting.",
      submitInterviewButton: "Submit interview",
      startFailedError:
        "Unable to start interview session: {message} Please check your devices and try again.",
      questionNumber: "Question {num}",
      correctAnswerLabel: "Correct answer: {answers}",
      explanationLabel: "Explanation: {text}",
      rulesHeading: "AI Interview Rules",
      loadingEyebrow: "AI Interview Room",
      loadingTitle: "Loading questions and syncing timer…",
      loadErrorEyebrow: "Unable to load room",
      loadErrorTitle: "Failed to connect to interview session",
      loadErrorDesc:
        "{message} The timer has not started and your attempt count is unaffected.",
      reloadRoom: "Reload room",
      recoveryEyebrow: "AI Interview Room · #AI-{id}",
      recoveryDuration: "Duration",
      recoveryBadge: "Questions unavailable",
      recoveryTitle: "Questions failed to load",
      recoveryDefaultError: "The AI system could not prepare the question set.",
      recoveryDesc:
        "{message} The timer has not started, no questions were revealed, and no attempt was consumed.",
      recovering: "Recovering questions…",
      reloadQuestions: "Reload interview questions",
      exitRoom: "Exit room",
      sessionStatusHeading: "Session Status",
      sessionStatusAttemptTitle: "Attempt preserved",
      sessionStatusAttemptDesc: "System errors do not count as an attempt.",
      sessionStatusTimerTitle: "Timer paused",
      sessionStatusTimerDesc: "Starts only once questions are ready.",
      sessionStatusProctorTitle: "Proctoring inactive",
      sessionStatusProctorDesc: "Devices are verified in the next step.",
      interviewerInProgress: "Interviewing",
      interviewerName: "SmartHire AI Interviewer",
      interviewerSubtitle: "Evaluating against role roadmap & criteria",
      answerProgress: "Answer progress",
      answerProgressAria: "{done} of {total} answers saved",
      textFormatTitle: "Format: Text",
      textFormatDesc: "Write and save your answer for each question.",
      preservedTitle: "Answers preserved",
      preservedDesc: "Saved answers remain intact if your connection drops.",
      currentFocusLabel: "Current question focus",
      invitationEyebrow: "AI Interview Room",
      invitationTitle: "Get ready · {target}",
      invitationDescConversational:
        "Complete the device check to enter the waiting room. The timer only starts after AI prepares the greeting and chat is ready.",
      invitationDescStandard:
        "The server timer starts once questions are ready and you finish the device check. Do not leave the room after starting.",
      factTopics: "Conversation topics",
      factTopicsValue: "{count} topics",
      factOpenQuestions: "Interview questions",
      factQuestions: "Question count",
      factQuestionsCount: "{count} questions",
      factMiniAssessment: "Mini Assessment",
      factMiniAssessmentCount: "{count} quiz questions",
      factTotalDuration: "Total duration",
      factPassingScore: "Passing score",
      factPassingScoreValue: "{score}/100",
      statusGenerating:
        "AI is generating questions. This page updates automatically when ready.",
      statusCreated:
        "The recruiter is preparing questions. The invitation will update when ready.",
      readyDescConversational:
        "Click start to enter the waiting room; chat opens automatically once AI is ready. Waiting time does not count toward the interview.",
      readyDescStandard:
        "The timer begins when you click “Start interview”. Get ready before starting.",
      voiceConsentOnly:
        "I consent to microphone use, speech-to-text transcription, and voice signal analysis.",
      voiceConsentWithRecording:
        "I consent to microphone use, speech-to-text transcription, voice signal analysis, and private audio recording for recruiter review.",
      resultTitleFinished: "AI Interview Evaluation Result",
      resultTitleFailedScoring: "Status: Submitted · Re-grading pending",
      resultTitleSubmitted: "Status: Successfully submitted",
      submittedAtLabel: "Submitted at:",
      badgeFailedScoring: "Pending recruiter re-grade",
      badgeScoring: "AI is analyzing & scoring",
      badgePassed: "Passed",
      badgeFailed: "Below threshold",
      failedScoringBoxTitle:
        "Your submission has been recorded and safely preserved",
      failedScoringBoxDescPrefix:
        "All answers and conversation logs are fully saved. The AI scoring service experienced a temporary disruption, so the recruiter will trigger a re-grade.",
      failedScoringBoxDescHighlight:
        "You do not need to retake the test and your attempt count is unaffected.",
      scoringBoxDesc:
        "The system is evaluating 4 core dimensions: Technical Knowledge, Problem Solving, Technical Reasoning, and Communication. Your scorecard will appear here automatically once complete.",
      overallScoreLabel: "Overall score",
      pointsDenominator: "/ 100 pts",
      passingThresholdLabel: "Passing score",
      passedCongrats:
        "Congratulations on passing the AI Interview! You can now continue to the Technical Assessment.",
      goToAssessments: "Go to Assessment",
      failedCanRetry:
        "Your score did not meet the role threshold yet, but you still have attempts remaining before the deadline.",
      creatingRetry: "Creating new attempt…",
      retryInterview: "Retake AI Interview",
      failedNoRetry:
        "You did not reach the passing score and have used all available attempts for this position.",
      unansweredZeroPoints: "Unanswered (0 pts)",
      submittedExplanation: "Explanation: {text}",
    },
    conversation: {
      validationRequired: "Please type or record an answer.",
      validationMax: "Answer cannot exceed 10,000 characters.",
      playbackVoiceError:
        "Could not play speech audio. You can retry or type your answer.",
      playbackAudioError:
        "Could not play audio recording. Please try again.",
      loadingLabel: "Loading voice interview room…",
      reloadRoom: "Reload interview room",
      roomAriaLabel: "AI Interview Room",
      interviewerName: "SmartHire AI Interviewer",
      roomSubtitle: "Smart 1-on-1 Voice Interview Room",
      autoPlayDisableTitle: "Disable automatic AI voice playback",
      autoPlayEnableTitle: "Enable automatic AI voice playback",
      autoPlayOn: "Auto-play voice: On",
      autoPlayOff: "Auto-play voice: Off",
      speechEngineTitle:
        "Switch speech engine: Fast Browser Voice or AI Studio Cloud Voice",
      speechEngineBrowser: "Fast Voice (Browser)",
      speechEngineCloud: "AI Cloud Voice (Gemini)",
      replayTitle: "Replay current question audio",
      replayButton: "Replay",
      stopSpeechTitle: "Stop current playback",
      stopSpeechButton: "Stop",
      defaultLanguage: "English",
      waveformAria: "AI is speaking",
      badgeAiSpeaking: "AI SPEAKING",
      badgeRecording: "RECORDING",
      badgeAiThinking: "AI THINKING",
      statusHeadingAiSpeaking: "AI Interviewer is asking a question...",
      statusHeadingRecording: "Listening to your answer...",
      statusHeadingThinking: "AI is processing and preparing a response...",
      statusHeadingComplete: "All interview questions completed",
      statusHeadingReady: "Ready for your answer",
      statusDescAiSpeaking:
        "Please listen to the question through your headphones or speakers.",
      statusDescRecording:
        "Speak clearly and confidently into your mic. Click 'Finish & Send' when done.",
      statusDescThinking:
        "The system is processing and evaluating your response...",
      statusDescCompleteSpeaking:
        "AI is delivering closing remarks. The session will submit automatically right after...",
      statusDescCompleteSubmitting:
        "Completed! Automatically submitting and moving to grading...",
      statusDescCompleteDefault:
        "You have completed all turns. Submitting the entire session...",
      statusDescReady:
        "Click the button below to respond directly by voice.",
      repeatTipPrefix: "Didn't catch the question? Say into your mic: ",
      repeatTipPhrase: "“Could you please repeat that question?”",
      repeatTipSuffix:
        ". The AI will naturally repeat it without costing a turn.",
      realtimeRecognizing: "Live speech recognition:",
      recordingAnswer: "Recording answer:",
      listeningPlaceholder: "Listening... start speaking...",
      completeBannerSpeaking:
        "Listening to closing remarks... Auto-submitting next",
      completeBannerSubmitting:
        "Completed! Auto-submitting and grading...",
      submitNowButton: "Submit now",
      pauseMicButton: "Pause",
      sending: "Sending...",
      finishAndSendVoice: "Finish & Send Answer",
      waitAiQuestionButton:
        "Listening to AI question... (Please wait until AI finishes)",
      waitAiQuestionHint:
        "You can turn on your microphone once the AI interviewer finishes speaking.",
      aiProcessingButton: "AI is processing and preparing the next question...",
      startVoiceButton: "Start answering by voice",
      hideKeyboardFallback: "Hide keyboard fallback input",
      showKeyboardFallback: "Mic issue? Click to type with keyboard",
      fallbackLabel: "Fallback text answer (when mic is unavailable)",
      fallbackPlaceholderWait:
        "Please wait until the AI finishes speaking before typing...",
      fallbackPlaceholderInput: "Type your answer here...",
      charCount: "{count}/{max} characters",
      sendAnswerButton: "Send answer",
      liveStatusSending: "AI is responding…",
      liveStatusRecording:
        "Recording live. Speak your answer clearly.",
      liveStatusTranscribing: "Transcribing speech to text…",
      liveStatusConnecting: "Connecting microphone…",
      liveStatusComplete:
        "All turns completed. Auto-submitting interview for evaluation...",
      liveStatusDefault:
        "Scores and feedback are compiled after the session finishes.",
      browserSpeechNotice:
        "Using browser voice because cloud audio is temporarily unavailable.",
      retryAttachRecording: "Retry saving recording",
    },
    voiceErrors: {
      micTimeout: "Microphone connection timed out. Please try again.",
      connectFailed:
        "Could not connect to voice service. You can still type your answer.",
      disconnected: "Voice connection dropped. Please try again.",
      invalidResponse: "Invalid voice service response. Please try again.",
      recordingInterrupted:
        "Recording was interrupted. Please re-record or type your answer.",
      recordingTooLarge:
        "Recording exceeded 9 MB. Please record a shorter answer.",
      transcribeTimeout:
        "Transcription timed out. Please try again or type your answer.",
      noSpeechRecognized:
        "No speech detected. Please record again or type your answer.",
      transcribeFailed: "Transcription failed. Please try again.",
      browserUnsupported:
        "Your browser does not support audio recording. Please type your answer.",
      formatUnsupported: "No supported audio recording format available.",
    },
    answerForm: {
      validationRequired: "Please enter an answer.",
      validationMax: "Answer cannot exceed 50,000 characters.",
      defaultSubmit: "Save answer",
      label: "Your answer",
      placeholder: "Enter your detailed answer here…",
      capturedWithRecording:
        "Recorded {seconds}s. Audio and transcript will be sent with your answer.",
      capturedTranscriptOnly:
        "Recorded {seconds}s. Only transcript and speech signals are sent; audio is not stored on the server.",
      evaluatingNext: "Evaluating and preparing the next question…",
      dirtyStatus: "Unsaved changes",
      savedStatus: "Answer saved on server",
    },
    mcqForm: {
      selectMultiple: "Select all correct answers",
      selectSingle: "Select one correct answer",
      explanationLabel: "Explain your choice (required)",
      saving: "Saving…",
      saveAndContinue: "Save choice and continue",
      saved: "Choice saved",
    },
    processNav: {
      defaultKnowledge: "Technical Knowledge",
      defaultInterview: "AI Interview",
      title: "AI Interview Roadmap",
      subtitle: "Select an unlocked stage to view questions and respond.",
      processCountBadge: "{count} stages",
      saved: "Saved",
      inProgress: "ACTIVE",
      upcoming: "Upcoming",
      processItemTitle: "Stage {index}: {title}",
      questionCount: "{count} questions",
      footerNote:
        "The current stage is highlighted in blue; saved answers are preserved.",
    },
    questionPanel: {
      ariaLabel: "Question {current} of {total}",
      defaultStage: "AI Interview",
      questionHeadingPrefix: "Question {current}",
      topicsAria: "Question topics",
      mcqBadge: "Multiple choice",
      aiHeaderTitle: "SmartHire AI",
      aiKindMini: "Mini Assessment",
      aiKindInterview: "Interview Question",
      hintMultiChoice: "Select all correct answers",
      hintSingleChoice: "Select the single best answer",
      hintSpeechOrText: "Answer by voice or text",
      hintText: "Answer in writing, with real-world examples if possible",
      openTip:
        "Tip: Share the context, your approach, and concrete outcomes. Avoid sharing confidential information from past employers.",
      difficultyLabel: "Difficulty: {difficulty}",
      showHint: "Show hint",
      listenQuestion: "Listen to question",
      yourAnswerTitle: "Your answer",
      yourAnswerDesc: "Your response is only recorded after clicking save.",
      autoTimedBadge: "Auto-timed",
      submitLast: "Save answer",
      submitNext: "Save & continue",
      prevQuestion: "Previous",
      saveBeforeLeaving: "Save your answer before switching questions.",
      nextQuestion: "Next",
      savedStatus: "This answer has been saved to the server.",
      unsavedStatus: "Please save your answer before moving to another question.",
      offlineHint: "If disconnected, you can reopen the session to continue.",
    },
    roadmap: {
      durationMinutesSeconds: "{minutes}m {seconds}s",
      durationSeconds: "{seconds}s",
      title: "Interview Roadmap",
      percentCompleted: "{percent}% Done",
      savedSubCount: "{done}/{total} saved · ",
      durationSpent: "Time spent: {duration}",
      answerSaved: "Answer saved",
      estimateMinutes: "Est: ~{minutes} min",
      questionCount: "{count} questions",
      emptyHint: "The roadmap appears once questions are ready.",
      answeringElapsed: "Answering ({time})...",
      stateDone: "Saved",
      stateCurrent: "Current",
      stateTodo: "Pending",
      defaultQuestionTitle: "Interview Question",
      miniBlockTitle: "Mini Assessment (Quiz)",
      miniBlockBase: "{count} quick questions",
      miniBlockAfter: " right after stage {after}",
      miniBlockDone: " · {done}/{count} done",
    },
    proctor: {
      defaultStartLabel: "Start interview",
      micStoppedError:
        "Microphone stopped working. Please check your devices again.",
      fullscreenUnsupportedError:
        "Your browser does not support fullscreen mode.",
      checkFailedError: "Unable to complete device verification.",
      cameraTitle: "Camera (Webcam)",
      cameraDesc: "Front-facing view of candidate",
      micTitle: "Microphone",
      micDesc: "Records your voice for interview responses",
      fullscreenTitle: "Fullscreen",
      fullscreenDesc: "Automatically enables anti-cheat fullscreen mode",
      consentLabel:
        "I agree to enable camera, microphone, enter fullscreen mode, and follow the interview rules.",
      enableCameraLabel:
        "Enable camera (recommended). If unavailable, you can still continue with microphone only.",
      grantPermissionHint:
        "Click below to grant Camera and Microphone permissions in your browser.",
      readyFull:
        "Camera and Microphone are ready. Click next to enter fullscreen and begin.",
      readyMicFallback:
        "Camera and Microphone are ready. (Camera unavailable; session will run with microphone only). Click next to enter fullscreen and begin.",
      openingSession: "Opening interview session…",
      checkingDevices: "Checking devices…",
      checkDevicesStep: "Step 1: Check devices",
      defaultCandidate: "Candidate",
      cameraLost: "Monitoring camera stopped",
      micLost: "Microphone was turned off",
      fullscreenExit: "You exited fullscreen mode",
      pageHidden: "You switched tabs or hid the interview page",
      windowBlur: "The interview window lost focus",
      contextMenu: "Right-click context menu is blocked",
      copyAttempt: "Copying content is blocked",
      pasteAttempt: "Pasting content is blocked",
      blockedShortcut: "Shortcut {key} is blocked",
      violationAutoSubmit:
        "{message} ({count}/{max}). Your interview will be submitted automatically.",
      violationWarning:
        "{message} ({count}/{max}). Please return to the interview room.",
      cameraOff: "Camera off",
      monitoringActive: "Monitoring",
      warningTitle: "Proctoring warning",
      returnToExam: "Return to room",
      recoverTitle: "Restore proctored environment",
      recoverDesc:
        "Your active session needs proctoring enabled again before displaying questions.",
      recoverButton: "Enable proctoring & resume",
      recoverPreparingNote:
        "AI is preparing the greeting. The timer starts only when conversation is ready.",
      recoverTimerNote:
        "Server time continues running while re-verifying your devices.",
    },
    speechControl: {
      recordingUnsupported:
        "Your browser does not support audio recording. You can type your answer instead.",
      sttUnsupported:
        "Your browser does not support speech-to-text. You can still record audio and type the transcript after stopping.",
      recordingTooLarge:
        "Recording reached the 9 MB limit; please record a shorter response.",
      recordingInterrupted:
        "Recording was interrupted. Please record again or submit a text answer.",
      sttInterrupted:
        "Speech recognition interrupted. Audio recording continues; stop and review or type the transcript before sending.",
      sttStopped:
        "Speech recognition stopped. You can keep recording, then review or edit the transcript.",
      sttOpenFailed:
        "Could not start speech recognition. Audio recording is still active; enter the transcript after stopping.",
      micOpenFailed:
        "Could not access microphone/recording. Check mic permissions and HTTPS, or type your answer.",
      description:
        "Recognize speech and record your answer. Review the transcript before sending; audio is stored privately if enabled for the job. STT may use your browser's speech engine.",
      stopAndCheckButton: "Stop & review transcript",
      startVoiceButton: "Start voice answer",
      openingMic: "Opening microphone…",
      recordingSignal: "Recording · {seconds}s · {speechStatus}",
      speechDetected: "Speech detected",
      waitingForSpeech: "Waiting for speech",
      recognizingPrefix: "Recognizing: {text}",
    },
    demo: {
      processes: {
        technicalKnowledge: "Technical Knowledge",
        problemSolving: "Problem Solving",
        practicalExperience: "Practical Experience",
        technicalReasoning: "Technical Reasoning",
        behavioral: "Behavioral & Situational",
        communication: "Communication",
      },
      micError:
        "Could not access microphone. Please allow mic permissions in your browser and try again.",
      demoBannerPrefix: "Voice Interview Preview:",
      demoBannerBody: "audio is stored locally in your browser only.",
      demoTag: "DEMO",
      roomLabel: "AI Interview Room",
      candidateMock: "Candidate: Nguyen Van An · Java Backend Engineer",
      aiActiveBadge: "Sophia AI 4.5 · Interviewing",
      durationLabel: "Duration",
      durationValue: "45 min",
      remainingLabel: "Remaining",
      leaveRoom: "Leave room",
      recruitmentFlowAria: "Recruitment pipeline",
      stage1Title: "Round 1: CV Screening",
      stage1Detail: "Profile match · 82/100",
      stage2Title: "Round 2: AI Interview",
      stage2Detail: "In progress · Voice mode",
      stage3Title: "Round 3: Assessment",
      stage3Detail: "Unlocks after passing AI Interview",
      roadmapTitle: "AI Interview Roadmap · 6 Stages",
      roadmapSubtitle:
        "AI reads questions aloud, listens, and generates follow-up questions.",
      processBadge: "Stage {index}",
      statusActive: "ACTIVE",
      statusDone: "DONE",
      statusRound: "STAGE {index}",
      twoQuestions: "2 questions",
      oneQuestion: "1 question",
      processQuestionLabel: "Stage {processIndex}: {stageTitle}",
      questionProgress: "Question {current}/{total}",
      timeMock: "Time: 02:45",
      aiReadingLabel: "AI spoken question",
      listenAgain: "Replay",
      aiEvaluationNote:
        "AI evaluates clarity, technical depth, real-world examples, and trade-off reasoning.",
      dynamicFollowupLabel: "Dynamic follow-up",
      dynamicFollowupTitle:
        "Sophia AI generates tailored follow-up questions from your answers.",
      dynamicFollowupBadge: "Speech-to-Speech",
      recordingPaused: "Recording paused",
      recordingLive: "Recording live voice answer",
      recordingSaved: "Voice answer saved",
      recordingReady: "Ready to record answer",
      micLocaleLabel: "Microphone · English",
      waveformAria: "Audio waveform",
      audioUnsupported: "Your browser does not support audio playback.",
      recordAgain: "Re-record",
      startAnswer: "Start answering",
      resume: "Resume",
      pause: "Pause",
      submitAndNext: "Submit Q{current} & continue",
      prevQuestion: "Previous",
      nextQuestion: "Next question",
      aiRoleTitle: "System Architecture & CV Competency Specialist",
      micSignalLabel: "Mic signal",
      micRecordingValue: "Recording",
      micReadyValue: "Ready",
      latencyLabel: "Latency",
      latencyValue: "22 ms · Good",
      aiEvaluatingTitle: "AI evaluation criteria",
      evalCriteria: {
        c1: "Technical accuracy and depth",
        c2: "Structured reasoning & trade-offs",
        c3: "Real-world experience verified against CV",
        c4: "Clear verbal communication",
      },
      sessionQuestionsTitle: "Session questions",
      openQuestionAria: "Open question {index}",
      introBadge: "VOICE INTERVIEW DEMO",
      introTitle: "Live Interview with Sophia AI",
      introSubtitle:
        "AI reads questions aloud and candidates answer by voice.",
      introFeat1Title: "AI reads questions",
      introFeat1Text: "Replay anytime before answering",
      introFeat2Title: "Voice responses",
      introFeat2Text: "Mic activates only with your consent",
      introFeat3Title: "Local demo",
      introFeat3Text: "No audio uploaded to backend",
      introChecklistTitle: "Pre-session checklist",
      introCheck1: "Allow microphone permission when prompted.",
      introCheck2: "Use headphones for clearer AI audio.",
      introCheck3: "Up to 3 minutes per response.",
      enterRoomButton: "Enter interview room",
      backToList: "Back to list",
      completeBadge: "Voice Interview Complete",
      completeTitle: "AI is analyzing your answers",
      completeDesc:
        "Recorded {answered}/{total} questions. Live sessions run Speech-to-Text, competency analysis, and scoring.",
      completeBackButton: "Back to list",
    },
    mockInvitation: {
      stageTechnical: "Technical Knowledge",
      stageProblemSolving: "Problem Solving",
      stagePractical: "Practical Experience",
      q1Text:
        "In Spring Boot, which annotation is most appropriate to mark a service containing business logic?",
      q2Text:
        "In a database-per-tenant model, what is the most critical measure to prevent cross-tenant data access?",
      q2Opt1: "Use a shared cache",
      q2Opt2: "Resolve tenant context before every query",
      q2Opt3: "Increase connection pool size",
      q2Opt4: "Disable transactions",
      q3Text:
        "Your candidate search API latency jumped from 200ms to 4 seconds as data grew 10x. How would you investigate and prioritize optimizations?",
      q4Text:
        "A RabbitMQ consumer processed the same CV twice. Describe how you would design idempotent handling and error observability.",
      q5Text:
        "Tell us about a difficult technical decision you owned. How did you evaluate trade-offs and measure the outcome?",
    },
  },
  humanMeeting: {
    guestFallback: "SmartHire Guest",
    scorecardSaved: "Scorecard saved.",
    invalidRoomLink: "Invalid meeting room link.",
    cannotJoinTitle: "Cannot join meeting room",
    backButton: "Go back",
    endedTitle: "Interview session has ended",
    endedDesc:
      "This scheduled interview has passed its end time. The meeting room is no longer active.",
    backToList: "Back to list",
    eyebrow: "SmartHire Meeting",
    defaultRoomTitle: "Live Interview",
    jitsiProvider: "Jitsi · {domain}",
    scorecardButton: "Scorecard",
    liveNoRecording: "Live · not recorded",
    exitRoom: "Leave room",
    jitsiFrameTitle: "Jitsi interview room",
    openingJitsi: "Opening Jitsi…",
    connectionErrorTitle: "Unable to connect to meeting room",
    localTileLabel: "{name} (You)",
    localTileHostLabel: "{name} (You) · host",
    muteMic: "Mute mic",
    unmuteMic: "Unmute mic",
    turnOffCam: "Turn off camera",
    turnOnCam: "Turn on camera",
    scorecardEyebrow: "Live Scorecard",
    scorecardSubtitle: "Evaluate during the interview",
    hideScorecard: "Hide",
    participantFallback: "Participant",
    devicePermissionError:
      "Cannot access camera/microphone. Please allow browser permissions.",
    status: {
      preparing: "Preparing room…",
      enablingDevices: "Starting camera / microphone…",
      joining: "Joining SmartHire meeting room…",
      openedHost: "Room open — waiting for HR / other participants.",
      connectedGuest: "Joined room — connecting video with everyone.",
      deviceError: "Device error",
    },
    startRecord: "Record",
    stopRecord: "Stop Recording",
    recordingActive: "REC · Recording",
    recordingModalTitle: "SmartHire Room Recording Completed",
    recordingModalDesc:
      "The meeting recording has been captured. You can download it locally or save it directly to the interview session.",
    downloadLocal: "Download (.webm)",
    saveToInterview: "Save to Interview",
    saving: "Saving...",
    saveSuccess: "SmartHire Room recording saved successfully to interview session!",
    recordPermissionError:
      "Could not start recording. Please allow screen or tab audio sharing permissions.",
  },
} as const;

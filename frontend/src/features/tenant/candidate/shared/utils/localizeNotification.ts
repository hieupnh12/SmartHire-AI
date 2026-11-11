import type { Notification } from "@/api/types/notification";
import { t as globalT, type TranslateFn, type TranslationParams } from "@/i18n";

const TEMPLATE_PREFIX = "candidate.core.notifications.templates";

type LocalizedNotification = {
  title: string;
  body: string | null;
  jobTitle: string | null;
};

type BodyPatternRule = {
  pattern: RegExp;
  key: string;
  params: (match: RegExpMatchArray, translate: TranslateFn) => TranslationParams;
};

type StageBodySpec = {
  prefix: string;
  mid: string;
  noteTag: string;
  suffix?: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveKey(translate: TranslateFn, key: string, params?: TranslationParams): string | null {
  const fullKey = `${TEMPLATE_PREFIX}.${key}`;
  const out = translate(fullKey, params);
  return out !== fullKey ? out : null;
}

function resolveStructuredKey(translate: TranslateFn, key: string, params?: TranslationParams): string | null {
  const direct = translate(key, params);
  if (direct !== key) return direct;
  return resolveKey(translate, key, params);
}

function normalizeJobTitle(jobTitle: string, translate: TranslateFn): string {
  if (jobTitle === "Tin tuyển dụng") {
    return resolveKey(translate, "defaultJobTitle") ?? jobTitle;
  }
  return jobTitle;
}

function toTranslationParams(payload: Record<string, unknown>): TranslationParams {
  const result: TranslationParams = {};
  const nested = payload.i18nParams;
  const source = nested && typeof nested === "object" && !Array.isArray(nested)
    ? { ...payload, ...(nested as Record<string, unknown>) }
    : payload;
  for (const [k, v] of Object.entries(source)) {
    if (typeof v === "string" || typeof v === "number") {
      result[k] = v;
    }
  }
  return result;
}

export function parseNotificationPayload(payload: string | null): Record<string, unknown> {
  if (!payload) return {};
  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function matchBodyRules(
  body: string,
  rules: BodyPatternRule[],
  translate: TranslateFn,
): string | null {
  for (const rule of rules) {
    const m = body.match(rule.pattern);
    if (m) {
      return resolveKey(translate, rule.key, rule.params(m, translate));
    }
  }
  return null;
}

/* Regex patterns below intentionally parse legacy hardcoded Vietnamese notification strings persisted by backend services. */

const CANDIDATE_STAGE_SPECS: Record<string, StageBodySpec> = {
  CANDIDATE_CV_PASSED: {
    prefix: "Nhà tuyển dụng đã xem xét và chấp nhận hồ sơ của bạn cho vị trí ",
    mid: ".",
    noteTag: "Ghi chú: ",
    suffix: "Bạn đã được chuyển tiếp sang vòng tiếp theo trong quy trình tuyển dụng.",
  },
  CANDIDATE_STAGE_ASSESSMENT: {
    prefix: "Hồ sơ của bạn cho vị trí ",
    mid: " đã bước vào vòng Đánh giá năng lực chuyên môn (Assessment).",
    noteTag: "Ghi chú: ",
    suffix: "Vui lòng kiểm tra và hoàn thành bài kiểm tra theo thời hạn.",
  },
  CANDIDATE_STAGE_AI_INTERVIEW: {
    prefix: "Hồ sơ ứng tuyển vị trí ",
    mid: " của bạn đã tiến vào vòng Phỏng vấn AI.",
    noteTag: "Ghi chú: ",
    suffix: "Hãy chuẩn bị không gian yên tĩnh và thiết bị phù hợp để bắt đầu buổi phỏng vấn.",
  },
  CANDIDATE_STAGE_HUMAN_INTERVIEW: {
    prefix: "Chúc mừng bạn đã vượt qua các vòng đánh giá trước! Bạn được mời tham gia vòng Phỏng vấn trực tiếp với hội đồng tuyển dụng cho vị trí ",
    mid: ".",
    noteTag: "Ghi chú: ",
    suffix: "Thông tin lịch phỏng vấn chi tiết sẽ được gửi tới bạn sớm.",
  },
  CANDIDATE_STAGE_OFFER: {
    prefix: "Nhà tuyển dụng trân trọng gửi lời mời nhận việc (Offer) cho vị trí ",
    mid: ".",
    noteTag: "Ghi chú: ",
    suffix: "Vui lòng kiểm tra thông tin chi tiết và phản hồi lại bộ phận tuyển dụng.",
  },
  CANDIDATE_STAGE_HIRED: {
    prefix: "Chúc mừng bạn đã hoàn thành xuất sắc toàn bộ quy trình tuyển dụng và chính thức trở thành thành viên cho vị trí ",
    mid: "!",
    noteTag: "Lời nhắn: ",
  },
};

const BODY_RULES_BY_TYPE: Record<string, BodyPatternRule[]> = {
  STAFF_NEW_APPLICATION: [
    {
      pattern: /^(.+?) vừa ứng tuyển lại vị trí (.+)\.$/,
      key: "STAFF_NEW_APPLICATION.reapplied",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2] }),
    },
    {
      pattern: /^(.+?) vừa nộp hồ sơ vào vị trí (.+)\.$/,
      key: "STAFF_NEW_APPLICATION.applied",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2] }),
    },
  ],
  STAFF_APPLICATION_WITHDRAWN: [
    {
      pattern: /^(.+?) đã rút hồ sơ khỏi vị trí (.+?)\. Lý do: ([\s\S]+)$/,
      key: "STAFF_APPLICATION_WITHDRAWN.withReason",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2], reason: m[3] }),
    },
    {
      pattern: /^(.+?) đã rút hồ sơ khỏi vị trí (.+)\.$/,
      key: "STAFF_APPLICATION_WITHDRAWN.noReason",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2] }),
    },
  ],
  STAFF_JOB_ASSIGNED: [
    {
      pattern: /^(.+?) đã thêm bạn vào vị trí (.+?) với vai trò ([A-Z_]+)\.$/,
      key: "STAFF_JOB_ASSIGNED.body",
      params: (m, translate) => {
        const actorName = m[1] === "Quản trị viên"
          ? (resolveKey(translate, "STAFF_JOB_ASSIGNED.defaultActor") ?? m[1])
          : m[1];
        const roleKey = `candidate.core.notifications.roleLabels.${m[3]}`;
        const translatedRole = translate(roleKey);
        return {
          actorName,
          jobTitle: m[2],
          role: translatedRole !== roleKey ? translatedRole : m[3],
        };
      },
    },
  ],
  STAFF_AI_INTERVIEW_COMPLETED: [
    {
      pattern: /^(.+?) đạt ([\d.]+)\/100 \((Đạt|Chưa đạt), ngưỡng ([\d.]+)\) — vị trí (.+)\.$/,
      key: "STAFF_AI_INTERVIEW_COMPLETED.body",
      params: (m, translate) => {
        const resultKey = m[3] === "Đạt"
          ? "STAFF_AI_INTERVIEW_COMPLETED.passedWord"
          : "STAFF_AI_INTERVIEW_COMPLETED.failedWord";
        return {
          candidateName: m[1],
          score: m[2],
          result: resolveKey(translate, resultKey) ?? m[3],
          passingScore: m[4],
          jobTitle: m[5],
        };
      },
    },
  ],
  STAFF_ASSESSMENT_SUBMITTED: [
    {
      pattern: /^(.+?) đã hoàn thành bài (.+?) — vị trí (.+?)\. Cần chấm phần tự luận\/coding\.$/,
      key: "STAFF_ASSESSMENT_SUBMITTED.completedManual",
      params: (m) => ({ candidateName: m[1], testTitle: m[2], jobTitle: m[3] }),
    },
    {
      pattern: /^(.+?) đã hoàn thành bài (.+?) — vị trí (.+?)\. Điểm tự động: ([\d.]+)\.$/,
      key: "STAFF_ASSESSMENT_SUBMITTED.completedAuto",
      params: (m) => ({ candidateName: m[1], testTitle: m[2], jobTitle: m[3], score: m[4] }),
    },
    {
      pattern: /^(.+?) hết thời gian làm bài (.+?) — vị trí (.+?)\. Cần chấm phần tự luận\/coding\.$/,
      key: "STAFF_ASSESSMENT_SUBMITTED.expiredManual",
      params: (m) => ({ candidateName: m[1], testTitle: m[2], jobTitle: m[3] }),
    },
    {
      pattern: /^(.+?) hết thời gian làm bài (.+?) — vị trí (.+?)\. Điểm tự động: ([\d.]+)\.$/,
      key: "STAFF_ASSESSMENT_SUBMITTED.expiredAuto",
      params: (m) => ({ candidateName: m[1], testTitle: m[2], jobTitle: m[3], score: m[4] }),
    },
  ],
  HUMAN_INTERVIEW_RESCHEDULE: [
    {
      pattern: /^(.+?) đề nghị đổi lịch phỏng vấn vị trí (.+?)\. Lý do: ([\s\S]+)$/,
      key: "HUMAN_INTERVIEW_RESCHEDULE.withReason",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2], reason: m[3] }),
    },
    {
      pattern: /^(.+?) đề nghị đổi lịch phỏng vấn vị trí (.+)\.$/,
      key: "HUMAN_INTERVIEW_RESCHEDULE.noReason",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2] }),
    },
  ],
  HUMAN_INTERVIEW_CONFIRMED: [
    {
      pattern: /^(.+?) đã xác nhận tham gia phỏng vấn vị trí (.+?) lúc (\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}) \(GMT\+07\)\.$/,
      key: "HUMAN_INTERVIEW_CONFIRMED.body",
      params: (m) => ({ candidateName: m[1], jobTitle: m[2], time: m[3] }),
    },
  ],
  APPLICATION_OFFER: [
    {
      pattern: /^Chúc mừng! Nhà tuyển dụng đã gửi offer cho vị trí (.+?)\. Vui lòng vào trang Đơn ứng tuyển để chấp nhận hoặc từ chối\.$/,
      key: "APPLICATION_OFFER.body",
      params: (m) => ({ jobTitle: m[1] }),
    },
  ],
  OFFER_ACCEPTED: [
    {
      pattern: /^(.+?) đã chấp nhận offer và được chuyển sang trạng thái Đã tuyển\.$/,
      key: "OFFER_ACCEPTED.body",
      params: (m) => ({ candidateName: m[1] }),
    },
  ],
  OFFER_DECLINED: [
    {
      pattern: /^(.+?) đã từ chối offer\. Lý do: ([\s\S]+)$/,
      key: "OFFER_DECLINED.withReason",
      params: (m) => ({ candidateName: m[1], reason: m[2] }),
    },
    {
      pattern: /^(.+?) đã từ chối offer\.$/,
      key: "OFFER_DECLINED.noReason",
      params: (m) => ({ candidateName: m[1] }),
    },
  ],
  APPLICATION_REJECTED: [
    {
      pattern: /^Cảm ơn bạn đã quan tâm và ứng tuyển vị trí (.+?)\. Rất tiếc hiện tại hồ sơ của bạn chưa phù hợp với yêu cầu của đợt tuyển dụng này\. Chúc bạn luôn thành công trên con đường sự nghiệp!$/,
      key: "APPLICATION_REJECTED.bodyDefault",
      params: (m, translate) => ({ jobTitle: normalizeJobTitle(m[1], translate) }),
    },
    {
      pattern: /^Cảm ơn bạn đã quan tâm và ứng tuyển vị trí (.+?)\. ([\s\S]+)$/,
      key: "APPLICATION_REJECTED.bodyWithNote",
      params: (m, translate) => ({ jobTitle: normalizeJobTitle(m[1], translate), note: m[2] }),
    },
    {
      pattern: /^Hồ sơ ứng tuyển vị trí (.+?) không được tiếp tục\. ([\s\S]+)$/,
      key: "APPLICATION_REJECTED.closureWithNote",
      params: (m) => ({ jobTitle: m[1], note: m[2] }),
    },
    {
      pattern: /^Hồ sơ ứng tuyển vị trí (.+?) không được tiếp tục\.$/,
      key: "APPLICATION_REJECTED.closureNoNote",
      params: (m) => ({ jobTitle: m[1] }),
    },
  ],
  AI_INTERVIEW_INVITATION: [
    {
      pattern: /^Chúc mừng, bạn đã vượt qua vòng CV Screening cho vị trí (.+?)\.\nVòng tiếp theo là AI Interview\.\nThời gian có thể bắt đầu: (.+?)\nHạn hoàn thành: (.+?)\nThời lượng: (\d+) phút\nSố lần thực hiện: (\d+)\nBạn có thể bắt đầu AI Interview bất kỳ lúc nào trong khoảng thời gian trên\.$/,
      key: "AI_INTERVIEW_INVITATION.body",
      params: (m, translate) => ({
        jobTitle: m[1],
        from: m[2] === "Ngay khi câu hỏi sẵn sàng"
          ? (resolveKey(translate, "AI_INTERVIEW_INVITATION.fromImmediate") ?? m[2])
          : m[2],
        until: m[3] === "Không giới hạn"
          ? (resolveKey(translate, "AI_INTERVIEW_INVITATION.untilUnlimited") ?? m[3])
          : m[3],
        durationMinutes: m[4],
        maxAttempts: m[5],
      }),
    },
  ],
  AI_INTERVIEW_READY: [
    {
      pattern: /^Bộ (\d+) câu hỏi phỏng vấn cho vị trí (.+?) đã sẵn sàng\. Bạn có thể bắt đầu AI Interview\.$/,
      key: "AI_INTERVIEW_READY.bodyWithCount",
      params: (m) => ({ count: m[1], jobTitle: m[2] }),
    },
    {
      pattern: /^Lộ trình phỏng vấn đã sẵn sàng\. Bạn có thể bắt đầu\.$/,
      key: "AI_INTERVIEW_READY.bodyRoadmap",
      params: () => ({}),
    },
  ],
  AI_INTERVIEW_PASSED: [
    {
      pattern: /^Kết quả AI Interview cho vị trí (.+?): ([\d.]+)\/100\. Bạn đã vượt qua các vòng đánh giá\. Vòng phỏng vấn trực tiếp đã được mở\.$/,
      key: "AI_INTERVIEW_PASSED.bodyUnlockHuman",
      params: (m) => ({ jobTitle: m[1], score: m[2] }),
    },
    {
      pattern: /^Kết quả AI Interview cho vị trí (.+?): ([\d.]+)\/100\. Bạn đã vượt qua AI Interview\. Hoàn thành Assessment đạt yêu cầu để mở phỏng vấn trực tiếp\.$/,
      key: "AI_INTERVIEW_PASSED.bodyPassed",
      params: (m) => ({ jobTitle: m[1], score: m[2] }),
    },
  ],
  AI_INTERVIEW_FAILED: [
    {
      pattern: /^Kết quả AI Interview cho vị trí (.+?): ([\d.]+)\/100\. Bạn chưa đạt ngưỡng ([\d.]+)\/100\. Bạn còn lượt làm lại trước hạn\.$/,
      key: "AI_INTERVIEW_FAILED.bodyRetry",
      params: (m) => ({ jobTitle: m[1], score: m[2], passingScore: m[3] }),
    },
    {
      pattern: /^Kết quả AI Interview cho vị trí (.+?): ([\d.]+)\/100\. Bạn chưa đạt ngưỡng ([\d.]+)\/100\. Hồ sơ kết thúc ở vòng AI Interview\.$/,
      key: "AI_INTERVIEW_FAILED.bodyClosed",
      params: (m) => ({ jobTitle: m[1], score: m[2], passingScore: m[3] }),
    },
    {
      pattern: /^Hạn làm lại AI Interview cho vị trí (.+?) đã kết thúc\. Hồ sơ kết thúc ở vòng AI Interview\.$/,
      key: "AI_INTERVIEW_FAILED.bodyRetryExpired",
      params: (m) => ({ jobTitle: m[1] }),
    },
  ],
  ASSESSMENT_INVITATION: [
    {
      pattern: /^Bạn đã được giao bài đánh giá năng lực cho vị trí (.+?)\. Bài "(.+?)" đã được tạo riêng cho bạn\. Thời gian làm bài (\d+) phút, tính từ lúc bắt đầu\.$/,
      key: "ASSESSMENT_INVITATION.bodyAssigned",
      params: (m) => ({ jobTitle: m[1], testTitle: m[2], minutes: m[3] }),
    },
    {
      pattern: /^Bạn đã vượt qua vòng lọc CV cho vị trí (.+?)\. Bài "(.+?)" đã được tạo riêng cho bạn\. Thời gian làm bài (\d+) phút, tính từ lúc bắt đầu\.$/,
      key: "ASSESSMENT_INVITATION.bodyAutoCvPass",
      params: (m) => ({ jobTitle: m[1], testTitle: m[2], minutes: m[3] }),
    },
    {
      pattern: /^Bạn đã vượt vòng lọc CV cho vị trí (.+?)\. Bài "(.+?)" đã sẵn sàng\. Thời gian làm bài (\d+) phút, bắt đầu tính khi bạn bấm bắt đầu\.$/,
      key: "ASSESSMENT_INVITATION.bodyDemoCvPass",
      params: (m) => ({ jobTitle: m[1], testTitle: m[2], minutes: m[3] }),
    },
    {
      pattern: /^Nhà tuyển dụng mời bạn làm bài "(.+?)" cho vị trí (.+?)\. Thời gian làm bài (\d+) phút, bắt đầu tính khi bạn bấm bắt đầu\.$/,
      key: "ASSESSMENT_INVITATION.bodyInvited",
      params: (m) => ({ testTitle: m[1], jobTitle: m[2], minutes: m[3] }),
    },
  ],
};

function localizeCandidateStageBody(type: string, body: string, translate: TranslateFn): string | null {
  const spec = CANDIDATE_STAGE_SPECS[type];
  if (!spec) return null;
  const p = escapeRegex(spec.prefix);
  const m = escapeRegex(spec.mid);
  const nt = escapeRegex(spec.noteTag);
  const regex = spec.suffix
    ? new RegExp(`^${p}(.+?)${m}(?: ${nt}([\\s\\S]+?))? ${escapeRegex(spec.suffix)}$`)
    : new RegExp(`^${p}(.+?)${m}(?: ${nt}([\\s\\S]+))?$`);
  const match = body.match(regex);
  if (!match) return null;
  const jobTitle = normalizeJobTitle(match[1], translate);
  const note = match[2];
  return note
    ? resolveKey(translate, `${type}.bodyWithNote`, { jobTitle, note })
    : resolveKey(translate, `${type}.body`, { jobTitle });
}

function localizeTitle(item: Notification, translate: TranslateFn): string {
  const rawTitle = item.title.trim();
  const jobSuffixMatch = (prefix: string, key: string) => {
    if (!rawTitle.startsWith(prefix)) return null;
    return resolveKey(translate, key, { jobTitle: rawTitle.slice(prefix.length).trim() });
  };

  switch (item.type) {
    case "STAFF_ASSESSMENT_SUBMITTED":
      return resolveKey(
        translate,
        rawTitle === "Bài đánh giá hết giờ"
          ? "STAFF_ASSESSMENT_SUBMITTED.titleExpired"
          : "STAFF_ASSESSMENT_SUBMITTED.titleSubmitted",
      ) ?? item.title;
    case "AI_INTERVIEW_INVITATION":
      return resolveKey(
        translate,
        rawTitle === "Lượt làm lại AI Interview"
          ? "AI_INTERVIEW_INVITATION.titleRetry"
          : "AI_INTERVIEW_INVITATION.titleInvite",
      ) ?? item.title;
    case "ASSESSMENT_INVITATION":
      return resolveKey(
        translate,
        rawTitle === "Bài Assessment đã sẵn sàng"
          ? "ASSESSMENT_INVITATION.titleReady"
          : "ASSESSMENT_INVITATION.titleInvite",
      ) ?? item.title;
    case "APPLICATION_OFFER":
      return jobSuffixMatch("Bạn nhận được offer:", "APPLICATION_OFFER.titleWithJob")
        ?? resolveKey(translate, "APPLICATION_OFFER.title")
        ?? item.title;
    case "OFFER_ACCEPTED":
      return jobSuffixMatch("Ứng viên đã chấp nhận offer:", "OFFER_ACCEPTED.titleWithJob")
        ?? resolveKey(translate, "OFFER_ACCEPTED.title")
        ?? item.title;
    case "OFFER_DECLINED":
      return jobSuffixMatch("Ứng viên đã từ chối offer:", "OFFER_DECLINED.titleWithJob")
        ?? resolveKey(translate, "OFFER_DECLINED.title")
        ?? item.title;
    case "APPLICATION_REJECTED":
      return jobSuffixMatch("Cập nhật kết quả ứng tuyển:", "APPLICATION_REJECTED.titleUpdated")
        ?? jobSuffixMatch("Kết quả ứng tuyển:", "APPLICATION_REJECTED.titleResult")
        ?? resolveKey(translate, "APPLICATION_REJECTED.title")
        ?? item.title;
    default:
      return resolveKey(translate, `${item.type}.title`) ?? item.title;
  }
}

export function localizeNotification(
  item: Notification,
  translate: TranslateFn = globalT,
): LocalizedNotification {
  const payload = parseNotificationPayload(item.payloadJson);
  const payloadParams = toTranslationParams(payload);
  const jobTitle = typeof payload.jobTitle === "string"
    ? payload.jobTitle
    : typeof payloadParams.jobTitle === "string"
      ? payloadParams.jobTitle
      : null;

  const structuredTitle = typeof payload.titleKey === "string"
    ? resolveStructuredKey(translate, payload.titleKey, payloadParams)
    : null;
  const structuredBody = typeof payload.bodyKey === "string"
    ? resolveStructuredKey(translate, payload.bodyKey, payloadParams)
    : null;

  const title = structuredTitle ?? localizeTitle(item, translate);

  let body = item.body;
  if (structuredBody !== null) {
    body = structuredBody;
  } else if (item.body) {
    const stageBody = localizeCandidateStageBody(item.type, item.body, translate);
    const rules = BODY_RULES_BY_TYPE[item.type];
    body = stageBody
      ?? (rules ? matchBodyRules(item.body, rules, translate) : null)
      ?? item.body;
  }

  return { title, body, jobTitle };
}

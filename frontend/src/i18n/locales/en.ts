import type { Messages } from "../schema";
import { coreEn } from "./en/core";
import { authEn } from "./en/auth";
import { errorsEn } from "./en/errors";
import { chromeEn } from "./en/chrome";
import { masterChromeEn } from "./en/masterChrome";
import { masterCommerceEn } from "./en/masterCommerce";
import { masterLandingEn } from "./en/masterLanding";
import { masterOpsEn } from "./en/masterOps";
import { candidateAssessEn } from "./en/candidateAssess";
import { candidateCoreEn } from "./en/candidateCore";
import { candidateCvEn } from "./en/candidateCv";
import { recruiterAssessmentsEn } from "./en/recruiterAssessments";
import { recruiterInterviewsEn } from "./en/recruiterInterviews";
import { recruiterOpsEn } from "./en/recruiterOps";
import { recruiterScreeningEn } from "./en/recruiterScreening";
import { tenantAdminEn } from "./en/tenantAdmin";

export const en: Messages = {
  ...coreEn,
  auth: authEn,
  errors: errorsEn,
  ...chromeEn,
  master: {
    ...masterChromeEn,
    commerce: masterCommerceEn,
    landing: masterLandingEn,
    ops: masterOpsEn,
  },
  candidate: {
    assess: candidateAssessEn,
    core: candidateCoreEn,
    cv: candidateCvEn,
  },
  recruiter: {
    assessments: recruiterAssessmentsEn,
    interviews: recruiterInterviewsEn,
    ops: recruiterOpsEn,
    screening: recruiterScreeningEn,
  },
  tenantAdmin: tenantAdminEn,
};

export type { Messages } from "../schema";
export { locales, type Locale } from "../schema";

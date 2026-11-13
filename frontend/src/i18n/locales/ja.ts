import type { Messages } from "../schema";
import { coreJa } from "./ja/core";
import { authJa } from "./ja/auth";
import { errorsJa } from "./ja/errors";
import { chromeJa } from "./ja/chrome";
import { masterChromeJa } from "./ja/masterChrome";
import { masterCommerceJa } from "./ja/masterCommerce";
import { masterLandingJa } from "./ja/masterLanding";
import { masterOpsJa } from "./ja/masterOps";
import { candidateAssessJa } from "./ja/candidateAssess";
import { candidateCoreJa } from "./ja/candidateCore";
import { candidateCvJa } from "./ja/candidateCv";
import { recruiterAssessmentsJa } from "./ja/recruiterAssessments";
import { recruiterInterviewsJa } from "./ja/recruiterInterviews";
import { recruiterOpsJa } from "./ja/recruiterOps";
import { recruiterScreeningJa } from "./ja/recruiterScreening";
import { tenantAdminJa } from "./ja/tenantAdmin";

export const ja: Messages = {
  ...coreJa,
  auth: authJa,
  errors: errorsJa,
  ...chromeJa,
  master: {
    ...masterChromeJa,
    commerce: masterCommerceJa,
    landing: masterLandingJa,
    ops: masterOpsJa,
  },
  candidate: {
    assess: candidateAssessJa,
    core: candidateCoreJa,
    cv: candidateCvJa,
  },
  recruiter: {
    assessments: recruiterAssessmentsJa,
    interviews: recruiterInterviewsJa,
    ops: recruiterOpsJa,
    screening: recruiterScreeningJa,
  },
  tenantAdmin: tenantAdminJa,
};

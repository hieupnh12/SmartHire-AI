import { coreVi } from "./vi/core";
import { authVi } from "./vi/auth";
import { errorsVi } from "./vi/errors";
import { chromeVi } from "./vi/chrome";
import { masterChromeVi } from "./vi/masterChrome";
import { masterCommerceVi } from "./vi/masterCommerce";
import { masterLandingVi } from "./vi/masterLanding";
import { masterOpsVi } from "./vi/masterOps";
import { candidateAssessVi } from "./vi/candidateAssess";
import { candidateCoreVi } from "./vi/candidateCore";
import { candidateCvVi } from "./vi/candidateCv";
import { recruiterAssessmentsVi } from "./vi/recruiterAssessments";
import { recruiterInterviewsVi } from "./vi/recruiterInterviews";
import { recruiterOpsVi } from "./vi/recruiterOps";
import { recruiterScreeningVi } from "./vi/recruiterScreening";
import { tenantAdminVi } from "./vi/tenantAdmin";
import type { Messages } from "../schema";

export const vi: Messages = {
  ...coreVi,
  auth: authVi,
  errors: errorsVi,
  ...chromeVi,
  master: {
    ...masterChromeVi,
    commerce: masterCommerceVi,
    landing: masterLandingVi,
    ops: masterOpsVi,
  },
  candidate: {
    assess: candidateAssessVi,
    core: candidateCoreVi,
    cv: candidateCvVi,
  },
  recruiter: {
    assessments: recruiterAssessmentsVi,
    interviews: recruiterInterviewsVi,
    ops: recruiterOpsVi,
    screening: recruiterScreeningVi,
  },
  tenantAdmin: tenantAdminVi,
};

export type { Messages } from "../schema";
export { locales, type Locale } from "../schema";

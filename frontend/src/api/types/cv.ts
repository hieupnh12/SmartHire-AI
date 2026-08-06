export type CvStatus =
  | "UPLOADED"
  | "PARSING"
  | "PARSED"
  | "EXTRACTING"
  | "ANALYZING"
  | "ANALYZED"
  | "FAILED";

export type CvDetail = {
  id: number;
  jobId: number;
  userId: number;
  originalFilename: string;
  fileUrl: string;
  status: CvStatus;
};

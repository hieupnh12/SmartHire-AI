export type Locale = "en" | "vi" | "ja";

export const locales: Locale[] = ["en", "vi", "ja"];

export type Messages = {
  readonly [key: string]: string | Messages;
};

export type TranslationParams = Record<string, string | number>;

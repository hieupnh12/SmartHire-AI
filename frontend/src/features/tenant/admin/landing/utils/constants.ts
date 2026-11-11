import { t as globalT, type TranslateFn } from "@/i18n";

export function getColorPresets(translate: TranslateFn = globalT) {
  return [
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.navy"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.navyShort"),
      hex: "#0058be",
      hover: "#004395",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.teal"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.tealShort"),
      hex: "#0d9488",
      hover: "#0f766e",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.indigo"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.indigoShort"),
      hex: "#4f46e5",
      hover: "#4338ca",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.emerald"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.emeraldShort"),
      hex: "#059669",
      hover: "#047857",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.violet"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.violetShort"),
      hex: "#7c3aed",
      hover: "#6d28d9",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.amber"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.amberShort"),
      hex: "#b45309",
      hover: "#92400e",
    },
    {
      name: translate("tenantAdmin.landing.constants.colorPresets.ruby"),
      shortName: translate("tenantAdmin.landing.constants.colorPresets.rubyShort"),
      hex: "#e11d48",
      hover: "#be123c",
    },
  ];
}

export function getFontOptions(translate: TranslateFn = globalT) {
  return [
    { label: translate("tenantAdmin.landing.constants.fonts.inter"), value: "Inter" },
    { label: translate("tenantAdmin.landing.constants.fonts.jakarta"), value: "Plus Jakarta Sans" },
    { label: translate("tenantAdmin.landing.constants.fonts.beVietnam"), value: "Be Vietnam Pro" },
    { label: translate("tenantAdmin.landing.constants.fonts.roboto"), value: "Roboto" },
    { label: translate("tenantAdmin.landing.constants.fonts.outfit"), value: "Outfit" },
    { label: translate("tenantAdmin.landing.constants.fonts.montserrat"), value: "Montserrat" },
  ];
}

export function getBorderRadiusOptions(translate: TranslateFn = globalT) {
  return [
    { label: translate("tenantAdmin.landing.constants.borderRadius.none"), value: "rounded-none" },
    { label: translate("tenantAdmin.landing.constants.borderRadius.lg"), value: "rounded-lg" },
    { label: translate("tenantAdmin.landing.constants.borderRadius.xl2"), value: "rounded-2xl" },
    { label: translate("tenantAdmin.landing.constants.borderRadius.xl3"), value: "rounded-3xl" },
  ];
}

export function getBannerHeightOptions(translate: TranslateFn = globalT) {
  return [
    { label: translate("tenantAdmin.landing.constants.bannerHeight.h420"), value: "420px" },
    { label: translate("tenantAdmin.landing.constants.bannerHeight.h540"), value: "540px" },
    { label: translate("tenantAdmin.landing.constants.bannerHeight.h640"), value: "640px" },
    { label: translate("tenantAdmin.landing.constants.bannerHeight.h760"), value: "760px" },
  ];
}

export const COLOR_PRESETS = [
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.navy"); }, hex: "#0058be", hover: "#004395" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.teal"); }, hex: "#0d9488", hover: "#0f766e" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.indigo"); }, hex: "#4f46e5", hover: "#4338ca" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.emerald"); }, hex: "#059669", hover: "#047857" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.violet"); }, hex: "#7c3aed", hover: "#6d28d9" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.amber"); }, hex: "#b45309", hover: "#92400e" },
  { get name() { return globalT("tenantAdmin.landing.constants.colorPresets.ruby"); }, hex: "#e11d48", hover: "#be123c" },
];

export const FONT_OPTIONS = [
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.inter"); }, value: "Inter" },
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.jakarta"); }, value: "Plus Jakarta Sans" },
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.beVietnam"); }, value: "Be Vietnam Pro" },
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.roboto"); }, value: "Roboto" },
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.outfit"); }, value: "Outfit" },
  { get label() { return globalT("tenantAdmin.landing.constants.fonts.montserrat"); }, value: "Montserrat" },
];

export const BORDER_RADIUS_OPTIONS = [
  { get label() { return globalT("tenantAdmin.landing.constants.borderRadius.none"); }, value: "rounded-none" },
  { get label() { return globalT("tenantAdmin.landing.constants.borderRadius.lg"); }, value: "rounded-lg" },
  { get label() { return globalT("tenantAdmin.landing.constants.borderRadius.xl2"); }, value: "rounded-2xl" },
  { get label() { return globalT("tenantAdmin.landing.constants.borderRadius.xl3"); }, value: "rounded-3xl" },
];

export const BANNER_HEIGHT_OPTIONS = [
  { get label() { return globalT("tenantAdmin.landing.constants.bannerHeight.h420"); }, value: "420px" },
  { get label() { return globalT("tenantAdmin.landing.constants.bannerHeight.h540"); }, value: "540px" },
  { get label() { return globalT("tenantAdmin.landing.constants.bannerHeight.h640"); }, value: "640px" },
  { get label() { return globalT("tenantAdmin.landing.constants.bannerHeight.h760"); }, value: "760px" },
];

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export const labelClass = "block text-xs font-semibold text-slate-700 mb-1";

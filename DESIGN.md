---
name: Luminous Professional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fd'
  surface-container: '#ecedf7'
  surface-container-high: '#e6e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#eff0fa'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f9f9ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
  surface-base: '#ffffff'
  surface-alt: '#f8f9ff'
  container-blue: rgba(59, 130, 246, 0.08)
  container-neutral: rgba(100, 116, 139, 0.05)
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style

The design system is a "Luminous Professional" aesthetic, evolving the enterprise SaaS look into a lighter, airier, and more sophisticated territory. It targets high-level decision-makers and power users who require a high-density information environment that doesn't feel heavy or fatiguing.

The design style is **Minimalism** with a heavy influence of **Glassmorphism**, though refined for a corporate context. By utilizing a white-dominant palette and translucent layers, the UI evokes a sense of transparency, breathability, and modern efficiency. The emotional response is one of calm clarity and effortless precision. Every element feels "light as air," reducing the cognitive load often associated with complex data-driven platforms.

## Colors

The color strategy is white-dominant, using a soft, professional blue as the primary anchor. The palette prioritizes high-key values to maintain an expansive, open feel.

- **Primary Blue:** #3b82f6 is used for primary actions, active indicators, and critical focus states.
- **Secondary Opacity:** Rather than solid grays, the system heavily utilizes opacity for secondary elements. Secondary text uses #64748b at 100%, but decorative accents and non-critical containers use the same hue at 30% to 60% opacity.
- **Surface Strategy:** The background is a crisp #FFFFFF. A very subtle #f8f9ff is used for large background sections to distinguish them from interactive "elevated" white cards.
- **Translucency:** Secondary containers and "ghost" buttons should use a 30% to 50% opacity of the secondary color to allow the white background to "breathe" through the UI elements.

## Typography

This design system uses **Hanken Grotesk** to provide a sharp, contemporary, and technical feel that is slightly more "designed" than standard system fonts.

- **Weight & Contrast:** Headlines use a SemiBold weight in a deep charcoal (#1e293b). Body text utilizes #475569 for a softer contrast against the white-dominant background.
- **Softness through Color:** For secondary information, instead of smaller font sizes, use 60% opacity of the body color to maintain legibility while establishing hierarchy.
- **Labels:** Labels and tags should be used sparingly, often in a Medium weight with slight tracking (letter-spacing) to ensure they feel like distinct UI meta-elements.

## Layout & Spacing

The layout is built on a **Fluid Grid** that leans heavily into whitespace to create the "airy" aesthetic requested.

- **Grid Model:** 12-column layout on desktop with generous 20px gutters. Outer margins on desktop are expanded to 40px to give the content "room to breathe."
- **Spacing Rhythm:** A strict 4px baseline is maintained. However, "Macro-spacing" (gaps between major sections) should favor the `xl` (32px) or larger values to prevent the UI from feeling cluttered.
- **Responsiveness:** On mobile, margins collapse to 16px. Containers that are side-by-side on desktop stack vertically with `md` (16px) spacing between them.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Low-Contrast Outlines** rather than traditional shadows.

- **Tonal Layers:** The background is #FFFFFF. Elevated cards also use #FFFFFF but are defined by a very soft 1px border (#e2e8f0) or a soft-blue tinted shadow.
- **Ambient Shadows:** When depth is required (e.g., for modals or floating menus), use a "tinted" shadow: `0 20px 25px -5px rgba(59, 130, 246, 0.05)`. The blue tint in the shadow keeps the elevation feeling clean and integrated with the brand color.
- **Backdrop Blurs:** For overlays and navigation bars, use a `blur(12px)` combined with a 70% opaque white background to create a frosted glass effect that maintains context of the content beneath.

## Shapes

The shape language is **Rounded**, moving away from the "sharpness" of traditional enterprise software to achieve a softer, more modern feel.

- **Components:** Buttons and input fields use a 0.5rem (8px) radius.
- **Large Containers:** Dashboard cards, modals, and main panels use `rounded-xl` (1.5rem / 24px) for a distinctly soft, premium look.
- **Small Elements:** Chips and badges use a fully rounded "pill" shape to contrast with the more structured rectangular containers.
- **Stroke:** All borders should be 1px wide, using #e2e8f0. For active states, the border increases to 1.5px and shifts to the primary blue.

## Components

- **Buttons:** Primary buttons use a solid light blue (#3b82f6) with white text. Secondary buttons use a background of `rgba(59, 130, 246, 0.1)` with blue text and no border, creating a soft "ghost" effect.
- **Input Fields:** Use a subtle #f8f9ff background with a 1px #e2e8f0 border. On focus, the background stays white and the border glows with a soft blue 30% opacity ring.
- **Cards:** White background, 24px corner radius, and a 1px border. Inside cards, use 30% opacity blue dividers for a softer separation of content than standard gray lines.
- **Chips:** Highly translucent backgrounds (e.g., `rgba(59, 130, 246, 0.15)`) with a slightly darker version of the hue for the text. No borders on chips.
- **Sidebars:** Use a backdrop blur and a 1px right border. Active navigation items are signaled by a soft blue container with 10% opacity and a pill-shaped indicator.
- **Lists:** Table rows should not have borders. Use a subtle `rgba(59, 130, 246, 0.04)` background on hover to maintain the light, airy feel.
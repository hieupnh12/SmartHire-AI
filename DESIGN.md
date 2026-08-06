# DESIGN.md — Design System (Google Stitch)

Nguồn thiết kế UI/UX và icon của SmartHire-AI lấy từ **Google Stitch**. Khi Stitch export token/icon set, cập nhật các bảng dưới đây — đây là nguồn sự thật duy nhất cho Frontend.

> **Quy tắc:** Không dùng màu/icon ngoài file này. Nếu thiếu token, bổ sung vào đây trước rồi mới dùng trong code.

---

## 1. Brand

| Thuộc tính | Giá trị |
|---|---|
| Product name | SmartHire AI |
| Tagline | Hire smarter with AI |
| Stitch project | _[điền link Google Stitch]_ |
| Icon pack (Stitch / Material Symbols) | _[điền link export]_ |

---

## 2. Color tokens

Đặt tên theo semantic; map sang CSS variables trong `frontend/src/styles/tokens.css`.

### 2.1 Brand & surface

| Token | Hex (placeholder) | CSS variable | Usage |
|---|---|---|---|
| `color.brand.primary` | `#0F6E56` | `--color-brand-primary` | CTA chính, link nhấn mạnh |
| `color.brand.primary-hover` | `#0B5A46` | `--color-brand-primary-hover` | Hover CTA |
| `color.brand.secondary` | `#1D4E89` | `--color-brand-secondary` | Secondary actions |
| `color.brand.accent` | `#C97800` | `--color-brand-accent` | Highlight AI / score |
| `color.surface.page` | `#F7F8FA` | `--color-surface-page` | Page background |
| `color.surface.card` | `#FFFFFF` | `--color-surface-card` | Panel / dialog surface |
| `color.surface.muted` | `#EEF1F4` | `--color-surface-muted` | Subtle sections |
| `color.border.default` | `#D8DEE6` | `--color-border-default` | Borders, dividers |
| `color.border.focus` | `#0F6E56` | `--color-border-focus` | Focus ring |

### 2.2 Text

| Token | Hex | CSS variable | Usage |
|---|---|---|---|
| `color.text.primary` | `#12161C` | `--color-text-primary` | Body / headings |
| `color.text.secondary` | `#5B6573` | `--color-text-secondary` | Supporting copy |
| `color.text.inverse` | `#FFFFFF` | `--color-text-inverse` | Text on primary |
| `color.text.disabled` | `#9AA3AF` | `--color-text-disabled` | Disabled |

### 2.3 Status

| Token | Hex | CSS variable | Usage |
|---|---|---|---|
| `color.status.success` | `#1B7F4A` | `--color-status-success` | Pass / hired |
| `color.status.warning` | `#B86E00` | `--color-status-warning` | Pending review |
| `color.status.danger` | `#C62828` | `--color-status-danger` | Reject / error |
| `color.status.info` | `#1565C0` | `--color-status-info` | Info banners |

> Sau khi export từ Google Stitch: thay toàn bộ Hex placeholder bằng giá trị Stitch và giữ nguyên tên token.

---

## 3. Typography

| Role | Font (placeholder) | Size / Weight | Notes |
|---|---|---|---|
| Display | `Manrope` | 36–48 / 700 | Landing / brand moments |
| Heading | `Manrope` | 20–28 / 600–700 | Page & section titles |
| Body | `IBM Plex Sans` | 14–16 / 400–500 | Forms, tables, copy |
| Mono | `IBM Plex Mono` | 12–14 / 400 | Scores, IDs, code snippets |

Load fonts qua Google Fonts hoặc self-host trong `frontend/index.html` / CSS.

---

## 4. Spacing & radius

| Token | Value |
|---|---|
| `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px |
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 16px |
| `--radius-full` | 9999px (avatar / chip only) |

---

## 5. Icon system (Google Stitch)

- **Nguồn:** Google Stitch icon export (ưu tiên Material Symbols Outlined nếu Stitch dùng set đó).
- **Thư mục FE:** `frontend/src/assets/icons/` (SVG) hoặc component wrapper `components/shared/Icon.tsx`.
- **Kích thước chuẩn:** `16` / `20` / `24` (mặc định 20 cho button).
- **Stroke:** theo Stitch; không tự đổi stroke width.

### 5.1 Icon map theo button / action

| Action / Button | Icon name (Stitch) | Component usage |
|---|---|---|
| Primary submit / Save | `check` | `<Icon name="check" />` |
| Cancel / Close | `close` | Dialog dismiss, cancel |
| Login | `login` | Auth submit |
| Register | `person_add` | Register CTA |
| Google Login | `google` | OAuth |
| Profile | `person` | User profile |
| RBAC / Admin | `admin_panel_settings` | Admin only |
| Create Job | `add` / `work` | Job create |
| Publish Job | `publish` | Publish |
| Skills | `psychology` | Skill requirements |
| Pipeline stage | `view_kanban` | Stages / pipeline |
| Applicants | `group` | Applicant list |
| Upload CV | `upload_file` | Upload |
| Parse / Extract | `description` | CV parse |
| AI Analysis | `auto_awesome` | AI actions |
| Matching Score | `speed` | Score badge |
| Ranking | `leaderboard` | Rankings |
| Recommendation | `recommend` | Suggestions |
| Assessment / Quiz | `quiz` | MCQ |
| Coding | `code` | Coding challenge |
| Timer | `timer` | Assessment timer |
| Proctor / Shield | `shield` | Anti-cheat |
| Mic / Voice | `mic` | Voice interview |
| Grade | `grade` | Scoring |
| Feedback | `rate_review` | Feedback |
| Schedule | `event` | Interview schedule |
| Notification | `notifications` | Header / WS |
| Email | `mail` | Email notify |
| Practice | `school` | Practice interview |
| Dashboard | `dashboard` | Analytics |
| Charts | `bar_chart` | Dashboard charts |
| Search | `search` | Filters |
| Filter | `filter_list` | Table filters |
| Settings | `settings` | Account |
| Logout | `logout` | User menu |
| Delete (danger) | `delete` | Destructive |
| Back | `arrow_back` | Navigation |
| Hire / Decision | `how_to_reg` | Hiring decision |

Khi Stitch đổi tên icon: cập nhật cột **Icon name** ở đây; FE chỉ đọc map này.

---

## 6. Button variants

| Variant | Background | Text | Border | Icon |
|---|---|---|---|---|
| `primary` | `brand.primary` | `text.inverse` | none | optional leading 20px |
| `secondary` | `surface.card` | `text.primary` | `border.default` | optional |
| `ghost` | transparent | `text.secondary` | none | optional |
| `danger` | `status.danger` | `text.inverse` | none | `delete` / `close` |
| `ai` | `brand.accent` | `text.inverse` | none | `auto_awesome` |

Height: `sm` 32px · `md` 40px · `lg` 48px. Min tap target mobile: 44px.

---

## 7. Motion

| Token | Value | Usage |
|---|---|---|
| `--motion-fast` | 150ms | Hover, focus |
| `--motion-normal` | 250ms | Panel open |
| `--motion-slow` | 400ms | Page transition nhẹ |

Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Không dùng glow / multi-shadow nặng.

---

## 8. Internationalization (i18n)

Supported locales: **English (`en`)**, **Tiếng Việt (`vi`)**, **日本語 (`ja`)**.

- Catalogs: `frontend/src/i18n/locales/{en,vi,ja}.ts`
- Switcher in header; shortcut **Alt+L** cycles language
- `document.documentElement.lang` updates with locale
- Font stack includes `Noto Sans JP` for Japanese

---

## 9. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `?` | Open shortcuts help |
| `Esc` | Close dialog / panel |
| `Alt+L` | Cycle EN → VI → JA |
| `g` then `h` | Go to Welcome |
| `g` then `w` | Go to role workspace home |
| `/` | Focus search (`[data-search-input]`) |

Ignore shortcuts while typing in inputs.

---

## 10. UX / Accessibility principles (enterprise SaaS)

Direction: trustworthy, efficient, uncluttered — **productivity over visual noise**.

- Clean navigation, clear hierarchy, consistent design system (`components/ux/*`)
- Large clickable targets (≥44px), readable typography, high-contrast text
- Responsive desktop / tablet / mobile; soft card shadows, rounded corners
- Smooth short transitions; respect `prefers-reduced-motion`
- Friendly empty states, tooltips, clear validation & error messages
- Confirm before destructive actions; loading skeletons; toast feedback
- Keyboard accessible; skip link; WCAG-minded focus rings & `aria-*`
- Fast / lightweight — avoid heavy effects, glow, multi-layer decoration

Primitives: `Button`, `Card`, `EmptyState`, `Skeleton`, `Toast`, `ConfirmDialog`, `Tooltip`, `LanguageSwitcher`, `ShortcutsHelp`.

---

## 11. Dark mode

Chưa bật mặc định. Nếu Stitch cung cấp dark palette: thêm section Dark tokens và map `--color-*` trong `[data-theme="dark"]`.

---

## 12. Checklist khi implement UI

1. Màu lấy từ CSS variables / Tailwind theme map từ bảng trên.
2. Copy UI qua `useT("…")` — không hardcode EN/VI/JA.
3. Icon đúng tên trong §5.1.
4. Button đúng variant §6; min height đủ touch target.
5. Empty / loading / error / confirm / toast khi phù hợp.
6. Sau khi sync Stitch: cập nhật Hex + icon name, rồi PR `chore(design): sync stitch tokens`.

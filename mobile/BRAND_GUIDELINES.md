# GymTrainer Brand Guidelines

## Brand Direction
Dark-first, Electric Teal accent, modern fitness aesthetic.

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0A0A0A` | App background |
| `surface` | `#1C1C1E` | Cards, tab bar, inputs |
| `surfaceElevated` | `#2C2C2E` | Elevated cards, modals |
| `border` | `#3A3A3C` | Card borders, dividers |
| `borderSubtle` | `#2C2C2E` | Subtle separators |
| `accent` | `#06C882` | Primary CTA, active states, tab icons |
| `accentLight` | `#2DDC71` | Hover/pressed accent variant |
| `accentMuted` | `rgba(6,200,130,0.15)` | Selected chip backgrounds, badges |
| `textPrimary` | `#FFFFFF` | Headings, body text |
| `textSecondary` | `#ABABAB` | Subtitles, descriptions |
| `textMuted` | `#6B6B6B` | Placeholders, inactive icons |
| `success` | `#34C759` | Positive feedback |
| `warning` | `#F59E0B` | Caution states |
| `destructive` | `#FF3B30` | Errors, delete actions |
| `onAccent` | `#0A0A0A` | Text on accent backgrounds |

---

## Typography

### Font Families
- **Headings:** Urbanist (Bold 700, SemiBold 600, Regular 400)
- **Body:** Poppins (Light 300, Regular 400, Medium 500, SemiBold 600)

### Scale
| Token | Size | Usage |
|---|---|---|
| `xs` | 12px | Captions, labels |
| `sm` | 14px | Body small, chips |
| `base` | 16px | Body default |
| `lg` | 18px | Body large |
| `xl` | 20px | Section headings |
| `2xl` | 24px | Screen titles |
| `3xl` | 30px | Display text |

---

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tight gaps |
| `sm` | 8px | Chip/badge padding |
| `md` | 12px | Input padding, form gaps |
| `base` | 16px | Standard padding |
| `lg` | 24px | Section spacing, screen padding |
| `xl` | 32px | Large section gaps |
| `xxl` | 48px | Screen header margin |

---

## Border Radii

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Badges, small chips |
| `md` | 8px | Inputs, chips |
| `lg` | 12px | Cards, buttons |
| `full` | 9999px | Pills, avatars |

---

## Component Patterns

### Buttons
- **Primary:** Accent bg, black text, 12px radius, 48px height
- **Secondary:** Surface bg, accent text, accent border
- **Ghost:** Transparent bg, accent text

### Cards
- Surface background
- 12px border radius
- 1px border (`border` color)
- No shadow (dark mode)

### Chips
- **Selected:** `accentMuted` bg, `accent` text
- **Unselected:** `surface` bg, `textSecondary` text, `border` border

### Text Inputs
- Outlined mode
- Surface background
- Accent outline on focus
- 12px border radius

### Badges
- Pill shape (9999px radius)
- Variants: accent, muted, success, destructive

---

## Usage Rules

1. **Screens import from `components/ui/`, never from `react-native-paper` directly**
   - Exception: `Text`, `Snackbar`, `ActivityIndicator` (until wrapped)
2. All raw design values live in `theme/tokens.ts`
3. MD3 theme mapping lives in `theme/index.ts`
4. Fonts: Urbanist for all headings/titles, Poppins for all body/labels

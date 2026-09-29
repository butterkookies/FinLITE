# FinLITE Strict UI/UX Design System & Architectural Guidelines

> **Status:** Binding Institutional Standard for FinLITE  
> **Target Audience:** Frontend Engineers, UI/UX Designers, and AI Coding Agents  
> **Enforcement:** Mandatory across all pages, components, modals, and styling refactors. Zero exceptions without written architectural approval.

---

## 1. Executive Design Philosophy

FinLITE is a **High-Trust Collegiate Financial Assistant System** engineered for the League of Information Technology Enthusiasts (LITE) at Pambayang Dalubhasaan ng Marilao (PDM). It is **not** a generic dashboard, a flashy SaaS landing page, or a playful social app. 

### The Core Paradigm: Quiet Utility & Institutional Rigor
1. **Calm & High-Trust**: Every screen must evoke the reliability of a high-end financial instrument (e.g., Apple Wallet, Mercury, Linear) merged with the formal clarity of collegiate institutional audit standards.
2. **The 3-Second Cognitive Rule**: Upon loading the application, any officer or faculty adviser must instantly understand within 3 seconds:
   * Current liquid physical cash in the cashbox.
   * Total electronic GCash balance.
   * Net semester balance and outstanding advance liabilities (*abono*).
   * The single primary action they need to perform.
3. **Zero "AI Slop"**: Avoid over-decorated, multi-colored glow borders, generic emojis, pastel tag boxes, and bloated gradients that characterize hastily generated AI interfaces.

---

## 2. The 12 Iron Rules (Strict Negative Constraints)

Any code change violating any of these 12 rules must be rejected immediately during review.

### Rule 1: No Thin Colored Borders ("AI Slop")
* **Strictly Prohibited**: Colored hairline borders around cards, tables, or buttons (e.g., `border-emerald-200`, `border-blue-200`, `border-rose-200`, `hover:border-emerald-300`).
* **Enforced Alternative**: Use **pure neutral hairline borders** (`border-black/[0.08]` in light mode, `border-white/[0.1]` in dark mode) or pure surface elevation differences (`bg-white` over canvas `#f8faf9` with subtle shadows).

### Rule 2: No Asymmetric or One-Sided Borders
* **Strictly Prohibited**: Borders applied to only one side of a container (e.g., `border-l-4 border-l-emerald-600`, colored top borders `border-t-2`).
* **Enforced Alternative**: Full-perimeter uniform micro-borders (`border border-black/[0.08]`) with balanced internal padding. Visual emphasis must come from typography and iconography, not asymmetric borders.

### Rule 3: Rigid Sizing & Explicit Component States
* **Strictly Prohibited**: Components that shift height, shrink, or allow font text to wrap under viewport constraints.
* **Enforced Alternative**: 
  * Every interactive control must have an **explicit fixed height** (e.g., `h-9` for compact, `h-10` for standard, `h-11` for prominent).
  * Every button, input, and interactive surface must define all 6 lifecycle states:
    1. `default`: Baseline background, neutral border, clear text.
    2. `hover`: Subtle neutral brightness shift (e.g., `hover:bg-gray-50` or `hover:bg-emerald-800`).
    3. `focus-visible`: Dual-ring focus outline (`focus-visible:ring-2 focus-visible:ring-emerald-700/20 focus-visible:outline-none`).
    4. `active`: Subtle press compression (`active:scale-[0.98]` or `active:bg-gray-100`).
    5. `disabled`: `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed`.
    6. `loading`: Spinner/skeleton with preserved dimensions (no width collapse).

### Rule 4: Zero Text Wrapping on Labels & Metrics
* **Strictly Prohibited**: Financial figures, table column headers, buttons, badge text, or dates wrapping onto multiple lines (e.g., `₱1,500.` on line 1 and `50` on line 2, or `Record\nTransaction`).
* **Enforced Alternative**: Enforce `whitespace-nowrap`, strict `shrink-0` on companion icons, and `truncate` with `title=""` tooltip attributes where text length cannot be guaranteed.

### Rule 5: Absolute Ban on Emojis & Cliché Icons
* **Strictly Prohibited**: The use of Unicode emojis anywhere in the production UI (no `💰`, `📊`, `✅`, `❌`, `🚀`, `⚠️`, `💡`).
* **Enforced Alternative**: Use bespoke, monochrome stroke SVG glyphs from **Lucide React**. Every icon in the application must maintain a uniform stroke weight of `1.5px` or `1.75px` (`strokeWidth={1.5}` or `strokeWidth={1.75}`).

### Rule 6: No Status Dot Pills & No Dash Bullet Separators
* **Strictly Prohibited**:
  * Pill badges with internal circular dots (e.g., `<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live`).
  * Hyphens (`-`), en-dashes (`–`), or em-dashes (`—`) used as pseudo-bullet points or metadata separators in UI text.
* **Enforced Alternative**: Use clean, refined typographic badges with clear label text, or subtle middle-dots (`·`) with proper horizontal spacing (`px-2`).

### Rule 7: Zero Layout Crowding & Immediate Cognitive Clarity
* **Strictly Prohibited**: Over-packed navigation bars, cluttered dashboard sidebars, or stacked cards competing for visual hierarchy.
* **Enforced Alternative**:
  * Primary numbers (Physical Cash on Hand, GCash, Net Balance) are displayed in clean, high-contrast typography with generous breathing room (`gap-4`, `p-5`).
  * Secondary metadata is muted (`text-gray-500 font-normal`).
  * Secondary actions collapse into clean dropdown menus or overflow sheets.

### Rule 8: Elimination of Redundant UI Components
* **Strictly Prohibited**: Repeating the same metric in multiple cards on the same screen (e.g., showing Cashbox balance in StatCards, again in a sidebar, and again in a banner).
* **Enforced Alternative**: Single Source of Visual Truth. Each metric or action lives in exactly one prominent, logical location.

### Rule 9: Custom-Styled Dropdowns Only (No Browser `<select>`)
* **Strictly Prohibited**: Native HTML `<select>` elements with OS-default popup menus and gray borders.
* **Enforced Alternative**: Bespoke custom dropdown popovers constructed with React state, featuring custom chevron icons (`ChevronDown`), backdrop blur, smooth slide-in transitions, and keyboard navigation.

### Rule 10: No Pastel-Background Badge Tags
* **Strictly Prohibited**: The generic "AI tag style" featuring a light pastel rectangular background with saturated bold text (e.g., `bg-emerald-50 text-emerald-700 font-semibold`, `bg-blue-50 text-blue-700`).
* **Enforced Alternative**: 
  * High-contrast neutral micro-border: `bg-white text-gray-800 border border-black/[0.08]` with a small colored accent indicator.
  * Or subtle neutral fills: `bg-gray-100 text-gray-700 font-medium`.
  * Or colored text only without the pastel rectangular container.

### Rule 11: Standalone Mobile App Ergonomics (Native Touch Feel)
* **Strictly Prohibited**:
  * Accidental text highlighting when tapping buttons, cards, or table rows on touchscreens.
  * Pinch-to-zoom or double-tap zoom altering the layout on mobile.
  * Rubber-band overscroll pull-to-refresh disrupting form inputs.
* **Enforced Alternative**:
  * Apply `select-none` (`user-select: none`) across all static labels, navigation headers, cards, and buttons.
  * Allow text selection (`select-text`) **strictly** inside text inputs (`<input>`, `<textarea>`) and copyable transaction/reference IDs.
  * Viewport meta must enforce `maximum-scale=1, user-scalable=no, viewport-fit=cover`.
  * Mobile tap delay eliminated via `touch-action: manipulation`.

### Rule 12: Flat, Transparent Logo Integration
* **Strictly Prohibited**: Enclosing the LITE or FinLITE logo within a rounded squircle box, green container, or bordered badge.
* **Enforced Alternative**: The logo must sit transparently on the navigation bar canvas as an authentic vector/PNG asset with no artificial background shape.

---

## 3. Design Tokens & Color System

```css
:root {
  /* Surfaces & Canvas */
  --surface-canvas:  #f8faf9;  /* Muted off-white sage tint */
  --surface-card:    #ffffff;  /* Elevated clean white */
  --surface-subtle:  #f4f6f5;  /* Secondary background */
  --surface-inset:   #eef1f0;  /* Form insets & search inputs */

  /* Text & Hierarchy */
  --text-primary:    #0f172a;  /* High-contrast slate-900 */
  --text-secondary:  #475569;  /* Balanced slate-600 */
  --text-muted:      #94a3b8;  /* Subtle placeholder slate-400 */

  /* Institutional Accent (LITE Green) */
  --brand-primary:   #15803d;  /* Emerald-700 - authoritative green */
  --brand-hover:     #166534;  /* Emerald-800 - dark pressed state */
  --brand-subtle:    #f0fdf4;  /* Muted light tint for selection only */

  /* Hairline Borders */
  --border-hairline: rgba(0, 0, 0, 0.08);
  --border-focus:    rgba(21, 128, 61, 0.25);

  /* Shadows (Apple-inspired multi-stop) */
  --shadow-subtle:   0 1px 2px 0 rgba(0, 0, 0, 0.03);
  --shadow-card:     0 2px 8px -1px rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02);
  --shadow-dropdown: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
  --shadow-modal:    0 25px 50px -12px rgba(0, 0, 0, 0.18);
}
```

---

## 4. Typography Scale & Tabular Rules

### Font Families
* **Interface Font**: System stack: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif`.
* **Document Preview / Print Font**: Times New Roman / Calibri (strict institutional compliance).

### Financial Tabular Numerals
* **Rule**: All amounts, balances, currency figures, and numerical tallies **must** include the `.tabular-nums` CSS class (`font-variant-numeric: tabular-nums`).
* **Currency Symbol**: Always use the official Philippine Peso symbol `₱` formatted consistently: `₱1,500.00` (space optional, comma thousands separator mandatory, two decimal places mandatory).

### Type Scale Matrix
| Style | Size | Line Height | Weight | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display KPI** | `28px` (`text-2xl` / `sm:text-3xl`) | `36px` | `700` (Bold) | `-0.025em` | Hero Financial Balances |
| **Card Metric** | `20px` (`text-xl`) | `28px` | `700` (Bold) | `-0.02em` | StatCard Cash Balances |
| **Section Title**| `16px` (`text-base`) | `24px` | `600` (SemiBold) | `-0.015em`| Ledger Title, Modal Header |
| **Body Standard**| `14px` (`text-sm`) | `20px` | `400` / `500` | `0` | Form Inputs, Descriptions |
| **Body Compact** | `13px` (`text-[13px]`) | `18px` | `500` (Medium) | `0` | Table Rows, Ledger Cells |
| **Caption / Meta**| `11px` (`text-xs`) | `16px` | `500` (Medium) | `+0.01em` | Table Headers, Subtitles |

---

## 5. Component Anatomy & Pattern Standards

### 1. Primary Buttons
```jsx
// Fixed height, explicit states, zero layout shift, monochrome icon
<button
  className="h-10 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap select-none"
>
  <Plus className="w-4 h-4 stroke-[1.75]" />
  <span>Record Transaction</span>
</button>
```

### 2. Secondary / Neutral Buttons
```jsx
<button
  className="h-10 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] border border-black/[0.08] transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap select-none"
>
  <FileText className="w-4 h-4 text-gray-500 stroke-[1.75]" />
  <span>Preview Report</span>
</button>
```

### 3. Financial Transaction Status Indicators (Anti-Pastel Tag)
Instead of `bg-emerald-50 text-emerald-700 border-emerald-200`:
```jsx
// Clean high-trust status indicator: Neutral border + directional monochrome icon
<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-800 bg-white border border-black/[0.08] shadow-2xs whitespace-nowrap">
  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-700 stroke-[2]" />
  <span>Inflow</span>
</div>
```

### 4. Custom Popover Dropdowns (Replacing Browser `<select>`)
```jsx
// Custom Trigger with Chevron and Elevation
<div className="relative">
  <button
    type="button"
    onClick={() => setIsOpen(!isOpen)}
    className="h-10 w-full px-3 bg-white border border-black/[0.08] rounded-xl flex items-center justify-between text-xs font-medium text-gray-800 hover:bg-gray-50/80 focus-visible:ring-2 focus-visible:ring-emerald-700/20 select-none transition-all shadow-2xs"
  >
    <span className="truncate">{selectedOption.label}</span>
    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2 stroke-[1.75]" />
  </button>
  {isOpen && (
    <div className="absolute top-full mt-1.5 z-50 w-full bg-white border border-black/[0.08] rounded-xl shadow-dropdown py-1 animate-in fade-in duration-100">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSelect(opt)}
          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-950 font-medium whitespace-nowrap select-none"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## 6. Verification Checklist for AI Agents

Before submitting any frontend change, an agent must self-audit against this checklist:
- [ ] Are all borders strictly neutral (`border-black/[0.08]`) with zero thin pastel green/blue borders?
- [ ] Are all one-sided borders (`border-l-*`) eliminated?
- [ ] Is all text prevented from wrapping via `whitespace-nowrap` or `truncate`?
- [ ] Are emojis 100% absent from the UI code?
- [ ] Are all icons from Lucide React with consistent `strokeWidth={1.5}` or `1.75`?
- [ ] Are all status pills with internal dots removed?
- [ ] Are all native browser `<select>` tags replaced with styled custom dropdowns?
- [ ] Are pastel tag rectangles replaced with clean neutral borders or typography contrast?
- [ ] Does the screen use `select-none` on all non-input UI elements?
- [ ] Is the LITE logo rendered flat/transparent without a background squircle?

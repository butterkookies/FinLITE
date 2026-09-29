# Rule: FinLITE UI/UX Design System & Negative Constraints

**Context**: FinLITE adheres to a strict, minimal institutional design system referencing Apple Human Interface Guidelines and PDM collegiate administrative standards. All agents working on the frontend must obey these rules without exception. See full spec at `docs/DESIGN_GUIDELINES.md`.

**Agent Instructions**:
1. **No Thin Colored Borders**: Strictly ban colored borders around cards, tables, and buttons (no `border-emerald-200`, `border-blue-200`, etc.). Use neutral hairlines only (`border-black/[0.08]`).
2. **No Asymmetric Borders**: Never apply one-sided borders (no `border-l-4`, `border-t-2`, etc.).
3. **Rigid Sizing & Lifecycle States**: Every button and component must have fixed heights (`h-9`, `h-10`, `h-11`) and define explicit states (`default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`) to prevent layout shifts.
4. **Zero Text Wrapping**: Prevent wrapping on numbers, badges, and labels using `whitespace-nowrap`, `shrink-0` on companion icons, and `truncate`.
5. **No Emojis**: Emojis (`💰`, `📊`, `✅`, `❌`, `🚀`) are strictly prohibited in the UI. Use single-color stroke Lucide icons with uniform `strokeWidth={1.5}` or `1.75`.
6. **No Status Dot Pills & No Dash Bullets**: Remove all pill tags containing internal circular colored dots (`● Live`). Never use hyphens (`-`), en-dashes (`–`), or em-dashes (`—`) as pseudo-bullets or metadata separators.
7. **Clean Spatial Hierarchy**: No crowded layouts. The 3 key financial metrics (Cashbox, GCash, Net Balance) must be immediately clear within 3 seconds.
8. **No Redundant Components**: Never duplicate the same metric in multiple cards on the same screen.
9. **Custom Styled Dropdowns Only**: Browser-default `<select>` is strictly banned. Implement custom popover dropdowns with `ChevronDown` and smooth elevation.
10. **No Pastel Background Tag Rectangles**: Eliminate pastel tag badges (e.g. `bg-emerald-50 text-emerald-700`). Use neutral micro-borders (`border border-black/[0.08] bg-white`) or refined typographic contrast.
11. **Mobile Standalone Ergonomics**:
    - Apply `select-none` on all static labels, buttons, cards, and navigation. Only text inputs and copyable reference IDs may have `select-text`.
    - Block mobile and PC zooming via `viewport: { maximumScale: 1, userScalable: false }`.
    - Prevent mobile pull-to-refresh overscroll bounces.
12. **Flat Transparent Logo**: The LITE logo must sit transparently on the canvas without a background squircle or bordered container.

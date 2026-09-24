# Paper Design Direction

Status: active for the from-scratch rebuild
Date: 2026-09-24

## Design read

Paper is a mobile-first personal document archive for one person. It should feel like a quiet desk where the documents are the interface, not a dashboard full of decorative controls.

Dials:

- `DESIGN_VARIANCE: 5`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 6`

## Product promise

Capture a receipt or document in under a minute, then find it by filename, category, owner, or notes when it is needed.

The existing schema does not contain vendor, amount, tax, document date, due date, tags, or subcategories. The new product must not imply those capabilities until the data model can support them honestly.

## Core scope

1. Add an image or PDF with category, owner, and notes.
2. Review recently added documents on the home screen.
3. Browse all documents in a virtualized library.
4. Search real indexed fields with clear empty and error states.
5. Open an image or PDF without losing the current list position.
6. Download the original or hand it to the operating system's share sheet when supported.
7. Edit metadata, move a document between categories, and delete with confirmation.
8. Create, rename, reorder, and delete categories while protecting referenced data.
9. Choose light, dark, or system appearance.

## Deliberately out of scope

- OCR and automatic extraction
- Receipt amounts, tax, vendor identity, or financial reports
- Tags and subcategories
- Collaborative sharing and multi-user access
- Dashboards, charts, activity feeds, or invented statistics
- Offline mode and service-worker behavior
- A new database schema

These are product boundaries, not missing placeholders. They should not appear in navigation or copy.

## Information architecture

### Mobile navigation

The bottom navigation has five destinations:

1. Recent
2. Library
3. Search
4. Add document, presented as the primary action
5. More

The Add action uses the single accent color. The other destinations remain neutral until active. The bar reserves safe-area space and never covers the final list row.

### Desktop layout

Use a compact top navigation rather than a conventional dashboard sidebar. Content is constrained to a readable maximum width. Document detail can use a two-column reading layout on wide screens, with the file or preview as the primary region and metadata as a narrow secondary column.

### Routes

- `/` : recently added documents
- `/library` : browse, filter, and sort
- `/search` : dedicated search
- `/capture` : add a document
- `/more` : categories, appearance, account, and app information
- `/d/:id` : document detail

Redirects may preserve old URLs, but the old visual structure and product language do not carry forward.

## Visual identity

### Character

- Calm
- Exact
- Discreet
- Fast
- Built around real document content

The visual reference is an archival index, not a paper-craft aesthetic. There is no beige stationery theme, torn paper, tape, simulated handwriting, or decorative grid.

The product uses a typographic `Paper` wordmark. The old paper-plane icon and gradient favicon are retired. A simple letter `P` favicon may be used as a functional browser mark, without adding a separate illustrated brand asset.

### Color

The application chrome uses cool mineral neutrals. White remains important because the documents themselves are usually white paper.

| Role | Light | Dark | Purpose |
| --- | --- | --- | --- |
| Canvas | `#F2F5F3` | `#111512` | App background |
| Surface | `#FBFCFB` | `#171C19` | Reading and editing surfaces |
| Raised surface | `#FFFFFF` | `#1E2521` | Menus and active overlays |
| Ink | `#18211D` | `#F2F6F3` | Primary text |
| Muted ink | `#596760` | `#A8B4AE` | Secondary text |
| Divider | `#D8E0DC` | `#303A35` | Non-essential separation only |
| Control boundary | `#82918A` | `#A8B4AE` | Inputs and interactive outlines |
| Accent surface | `#B23A2A` | `#B23A2A` | Primary add action background |
| Accent text | `#B23A2A` | `#E9806D` | Active navigation, icons, and errors |
| Accent hover | `#962F23` | `#962F23` | Primary action hover |
| Accent quiet | `#FCEBE8` | `#3B1D18` | Selected navigation and filter background |
| Success | `#2E6B4F` | `#2E6B4F` | Confirmed success only |

Verified contrast pairings:

- Ink on canvas: `15.01:1`
- Muted ink on surface: `5.78:1`
- White on accent: `5.95:1`
- Dark-theme muted ink on surface: `8.06:1`
- Dark-theme accent text on surface: `6.39:1`
- Dark-theme accent text on accent-quiet background: `5.65:1`
- Ink on accent-quiet background: `14.27:1`
- White on success: `6.30:1`

The accent appears at the capture moment and active navigation state. It must not decorate every icon, border, badge, or heading.

### Typography

- Latin and numerals: Geist Variable
- Thai: Noto Sans Thai Variable
- Dates, file sizes, and counts: tabular numerals
- No decorative monospace headings

Typography stays quiet. The file name and document preview carry visual weight; navigation and metadata remain compact.

### Shape and elevation

Use three intentional shape levels:

- Inputs and compact controls: `4px`
- Menus and document surfaces: `10px`
- Sheets and capture panels: `16px`

Pills are reserved for genuine status or count shapes where geometry communicates grouping. Ordinary buttons and inputs are not pills.

Shadows are limited to layers that truly sit above the page, such as menus, dialogs, and the mobile capture sheet. Static lists and page sections use borders or spacing instead.

### Density

- Mobile document rows: `72px` to `88px`
- Desktop document rows: `64px` to `76px`
- Minimum touch target: `44px`
- Persistent mobile navigation: compact, with safe-area padding
- Metadata columns collapse below the readable width of their content

## Interaction and motion

Motion explains changes in context. It does not decorate the page.

- Hover and press feedback: `120ms` to `160ms`
- Dialog and bottom-sheet transitions: `180ms` to `220ms`
- Detail image zoom: up to `240ms`
- No continuous pulses, floating elements, or looping entrances
- Respect `prefers-reduced-motion`

Document lists keep stable row geometry while thumbnails load. Skeletons mirror the final row shape. Infinite scrolling uses a real loading indicator near the end of loaded results.

## Empty, loading, and error states

Each state explains what happened and the next useful action.

- No documents: offer Add document and explain that new files appear here.
- No search results: keep the query visible and offer a clear-search action.
- Upload failure: preserve selected metadata and offer retry.
- Offline or server failure: say the network request failed and keep retry available.
- Missing document: explain that it may have been moved or deleted.
- Permission denied: explain that the signed-in account does not have Paper access.

Do not use generic “No data available” copy.

## Content voice

- User-facing copy is Thai unless a familiar product term is clearer in English.
- Use direct verbs: “เพิ่มเอกสาร”, “ค้นหา”, “บันทึก”, “ลบ”.
- Avoid launch language, AI claims, technical jargon, and decorative emoji.
- Use real counts returned by the database. Do not show trends or percentages without a real time series.
- Buttons use one action per intent. A button that cannot work must not be rendered.

## Accessibility requirements

- Meet WCAG AA for all text and 3:1 for interactive boundaries.
- Keep visible `:focus-visible` states in both themes.
- Support keyboard navigation for every control and dialog.
- Provide a skip link and correct source order.
- Allow text zoom to 200 percent without clipping or horizontal page overflow.
- Keep focused fields visible above mobile keyboards.
- Never communicate status through color alone.
- Respect reduced motion and reduced transparency preferences.

## Rejected patterns

- Sidebar plus stat cards plus chart plus table
- Equal feature cards for unrelated actions
- Gradient hero, glass surfaces, glow, and generic AI badges
- Decorative paper texture or stationery props
- Decorative crop marks or colored stripes
- Full-screen page skeletons that hide context
- Invented activity, testimonials, usage metrics, or progress
- A mobile layout created by shrinking the desktop grid

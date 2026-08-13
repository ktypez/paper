# Paper Receipts DMS — Design System MASTER
Project: paper.mcky.space
Product Type: Productivity / Document Management SaaS, personal finance receipts
Stack: React 19 + Vite 8 + Tailwind 4 + shadcn/ui

## Design Philosophy
Warm paper-like, border-over-shadow, humanist typography, 44px touch targets, flat.

## Style
Name: Flat / Lovable Warm
Mode Support: Light + Dark full
Keywords: cream/parchment, border containment, inset dark buttons, DM Sans

## Color Tokens

### Light
--background: #f7f4ed
--foreground: #1c1c1c
--card: #f7f4ed
--card-foreground: #1c1c1c
--popover: #f7f4ed
--popover-foreground: #1c1c1c
--primary: #1c1c1c
--primary-foreground: #fcfbf8
--secondary: #5f5f5d
--secondary-foreground: #fcfbf8
--muted: rgba(28,28,28,0.04)
--muted-foreground: #5f5f5d
--accent: rgba(28,28,28,0.04)
--accent-foreground: #1c1c1c
--destructive: #ef4444
--destructive-foreground: #fcfbf8
--border: #eceae4
--input: #eceae4
--ring: rgba(59,130,246,0.5)
--radius: 0.5rem

### Dark
--background: #1a1916
--foreground: #e8e5de
--card: #1a1916
--card-foreground: #e8e5de
--popover: #1a1916
--popover-foreground: #e8e5de
--primary: #1c1c1c
--primary-foreground: #fcfbf8
--secondary: #9a9a98
--secondary-foreground: #1a1916
--muted: rgba(232,229,222,0.04)
--muted-foreground: #9a9a98
--accent: rgba(232,229,222,0.04)
--accent-foreground: #e8e5de
--destructive: #ef4444
--destructive-foreground: #fcfbf8
--border: #2e2c28
--input: #2e2c28
--ring: rgba(59,130,246,0.5)

Rules: never #ffffff bg, never #000 text, grays derived from #1c1c1c opacities

## Typography
Font: 'DM Sans', ui-sans-serif, system-ui
Weights: 400 regular, 600 semibold only
Scale:
Display 48px/600/-1.2px
H1 36px/600
H2 20px/400
Body 16px/400/1.5
Caption 14px/400
Small 13px/400
Import: https://fonts.bunny.net/css?family=dm-sans:400,600&display=swap

## Spacing
--spacing-xs:4px --spacing-sm:8px --spacing-md:16px --spacing-lg:24px --spacing-xl:32px

## Radius
--radius-sm:4px --radius-md:6px --radius-lg:8px --radius-xl:12px --radius-full:9999px

## Elevation
Level 0: none
Level 1: 1px solid border
Level 2: inset shadow on dark buttons: inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)
Level 3: focus ring 0 0 0 2px rgba(59,130,246,0.5)

## Component Tokens
Button default: bg #1c1c1c text #fcfbf8 radius 6px inset shadow, hover opacity 0.9
Button outline: transparent border 1px rgba(28,28,28,0.4)
Button secondary/ghost: bg #f7f4ed
Card: bg #f7f4ed border 1px #eceae4 radius 12px shadow none padding 24px
Input: bg #f7f4ed border 1px #eceae4 radius 6px height 44px min
Badge: bg #f7f4ed border 1px #eceae4 radius 4px font 12px 600
Dialog: overlay rgba(0,0,0,0.5) content bg #f7f4ed border 1px #eceae4 radius 12px shadow none
Sidebar active: bg rgba(28,28,28,0.04) left border 2px solid #1c1c1c

## Accessibility & UX Rules
Contrast 4.5:1 minimum, 44x44px touch targets, 8px spacing, focus ring visible, prefers-reduced-motion respected, keyboard nav, aria-labels for icons, bottom nav ≤5, table overflow-x-auto on mobile, error below field, loading feedback <100ms.

## Anti-patterns to avoid
Drop shadows on cards, #ffffff background, #000 text, emojis as icons, hover-only interactions, gray-on-gray.

# Jurnalul unui adolescent de treabă

## Overview
A full-stack Romanian teen blogging platform with authentication, user-generated content, rich text editing, forum, Q&A, commenting, legal compliance, multi-language support (25+ languages), dark mode, role-based access control (RBAC), user profiles, account deletion, admin dashboard with user management, content moderation, reporting system, activity logging, and GDPR compliance. Database starts completely empty with no demo data.

## Recent Changes
- 2026-04-09: Anonymous users blocked from Q&A, forum topics — login required to write
- 2026-04-09: Archive section restricted to admins only (redirect with message for others)
- 2026-04-09: Real-time admin notification system (bell icon in nav) for new forum topics, Q&A questions, and reports
- 2026-04-09: Notification dropdown with unread badge, mark all read, click to navigate to content
- 2026-04-10: Flag images use SVG container (span+img) to eliminate white rectangle artifact in dark mode
- 2026-04-10: Q&A approval system: questions are hidden from public until admin approves; admin sees badge + Approve button; submitter gets notification toast
- 2026-04-10: User can delete their own approved Q&A questions (Withdraw for pending, Delete for approved); admin-only delete for others
- 2026-04-10: Content translation system: language selector now auto-translates articles (title + body + comments), forum topics/replies, and Q&A questions/answers via MyMemory API; client-side sessionStorage cache
- 2026-04-09: ReportButton component created — users can report posts, comments, forum topics/replies, and Q&A questions via flag icon
- 2026-04-09: Forum topic delete button added on forum-topic.tsx (topic header) and forum.tsx (topic list cards) — owner or admin can delete
- 2026-04-09: Report buttons added on: article comments, forum topics (list + detail), forum replies, Q&A questions
- 2026-04-09: Users can edit their username and change their password from their profile page
- 2026-03-01: Users can delete their own comments and forum replies; admins can delete any
- 2026-03-01: Auto-scrolling article carousel with infinite loop, pause on hover, play/pause toggle, progress dots
- 2026-03-01: Added article view counter with IP/session-based throttling (1 view per minute per user/IP)
- 2026-03-01: Added share functionality with Web Share API (mobile) and modal with WhatsApp/Facebook/X/LinkedIn/copy link (desktop)
- 2026-03-01: Added share count tracking per article
- 2026-03-01: Added dynamic Open Graph meta tags for article pages (crawler detection for Facebook, Twitter, LinkedIn, WhatsApp previews)
- 2026-03-01: Added like/dislike reaction system for posts, comments, and forum replies with per-user tracking
- 2026-03-01: Fixed hero image border to adapt to dark/light theme (border-card instead of border-background)
- 2026-03-01: Added article edit functionality (admin can edit published articles via /editor/:id route)
- 2026-03-01: Removed admin author name display from article pages
- 2026-03-01: Premium article layout with gradient header, decorative accent bar, enhanced card styling
- 2026-03-01: Vertical slide carousel for article listings (home, section) with up/down arrows and gliding animation
- 2026-03-01: Added "Read more" links on article cards in carousel
- 2026-03-01: Replaced ALL emojis with Lucide SVG icons across home, section, editor, forum, and Q&A pages
- 2026-03-01: Rich text editor fully adapts to dark mode (bg-background, prose-invert, dark prose CSS for all elements)
- 2026-03-01: Full mobile responsiveness across all pages (admin, forum, article, section, archive, Q&A, profile, editor, forum-topic)
- 2026-03-01: Dark mode prose styles for lists, code blocks, tables, blockquotes, marks, hr, figcaptions
- 2026-03-01: Responsive admin tabs (scrollable), user rows, content rows, report rows, and log entries
- 2026-02-11: Added admin dashboard at /admin with 5 tabs: Users, Content, Reports, Activity Logs, GDPR
- 2026-02-11: Implemented user blocking system (temporary/permanent) with auto-unblock on expiration
- 2026-02-11: Added reporting system for inappropriate content with admin resolution workflow
- 2026-02-11: Added activity logging for audit trail (login, article CRUD, blocks, admin actions)
- 2026-02-11: Added GDPR compliance: data export (JSON), data deletion, retention policy docs
- 2026-02-11: Added spam filter with keyword detection on all user-generated content
- 2026-02-11: Added GDPR export button on user profile page
- 2026-02-11: Added 70+ admin/moderation/GDPR translation keys to ro/en/es
- 2026-02-11: Fixed Google OAuth auto-unblock logic to mirror local strategy
- 2026-02-11: Implemented RBAC — only admin role can create/edit/delete articles
- 2026-02-11: Added user profile pages at /profile/:username with stats, forum activity, published articles
- 2026-02-11: Added account deletion with password confirmation, admin sole-admin protection, content anonymization
- 2026-02-11: Added comprehensive i18n system supporting 25+ world languages with zustand persist
- 2026-02-11: Added dark mode toggle with theme persistence
- 2026-02-11: Added TipTap rich text editor with formatting toolbar for article creation
- 2026-02-11: Added Privacy Policy and Terms of Service pages
- 2026-02-11: Added mandatory acceptedTerms checkbox to registration
- 2026-02-11: Implemented auto-migration on server startup via server/migrate.ts

## User Preferences
- Database MUST start empty — no demo users, no seeded data
- Secure password hashing with bcrypt (salt rounds 12)
- Google OAuth support via environment variables
- Multi-language support: Romanian default, 25+ languages available
- ALL text/messages/prompts must follow the selected language
- Dark mode toggle with localStorage persistence
- Mandatory Terms of Service acceptance at registration
- Only admin users can create/edit/delete articles
- Manual admin promotion via database update (no auto-assignment)

## Project Architecture
### Stack
- Frontend: React + Vite + TailwindCSS + shadcn/ui + TipTap editor
- Backend: Express.js + Passport.js (local + Google OAuth)
- Database: PostgreSQL + Drizzle ORM
- Routing: wouter (frontend), Express (backend)
- State: zustand with persist middleware (language + theme)

### RBAC System
- Roles: "admin" and "user" (stored in users.role column)
- Default role: "user" for new accounts
- Admin promotion: manual via database UPDATE
- Article routes (POST/PUT/DELETE /api/posts): requireAdmin middleware
- Frontend: write buttons hidden for non-admin, editor shows 403 for non-admin
- Account deletion: password confirmation required, sole-admin protection, content anonymization

### Admin Dashboard (/admin)
- Overview tab: stats (users, posts, comments, reports, forum topics)
- Users tab: search, promote/demote role, block/unblock, delete users
- Content tab: hide/show/delete posts and comments
- Reports tab: view reported content, resolve/dismiss reports
- Activity Logs tab: audit trail of all admin/user actions
- GDPR tab: data retention policy, user rights documentation

### Blocking System
- Temporary blocks with expiration date or permanent blocks
- Block reason tracking
- Auto-unblock on expiration (both local and Google OAuth login)
- requireNotBlocked middleware on all protected write routes
- Blocked users cannot login, post, or comment

### Reporting System
- Users can report posts, comments, forum topics/replies
- Reports track contentType, contentId, reason, status (pending/resolved/dismissed)
- Admin resolution workflow with status updates

### GDPR Compliance
- Data export: GET /api/auth/export-data (JSON format with all user data)
- Account deletion with data anonymization
- Terms acceptance date tracking (termsAcceptedAt)
- Data retention policy documentation in admin panel
- Export button on user profile page

### Key Files
- `shared/schema.ts` — Drizzle schema (users, posts, comments, forum_topics, forum_replies, qas, reports, activity_logs)
- `server/auth.ts` — Passport strategies + requireAuth + requireAdmin + requireNotBlocked middleware
- `server/migrate.ts` — Auto-migration that creates tables on startup
- `server/routes.ts` — API routes with Zod validation, RBAC enforcement, spam filter
- `server/storage.ts` — Storage interface with Drizzle queries, admin methods, GDPR export
- `client/src/lib/lang.ts` — i18n system with 25+ languages, 240+ translation keys
- `client/src/lib/theme.ts` — Dark mode theme system with zustand persist
- `client/src/components/layout.tsx` — Main layout with admin-only write button, profile link, language selector
- `client/src/components/rich-editor.tsx` — TipTap rich text editor component
- `client/src/pages/admin.tsx` — Admin dashboard with 5 tabs
- `client/src/pages/profile.tsx` — User profile page with stats, GDPR export, account deletion
- `client/src/pages/editor.tsx` — Article editor with admin-only access (403 for non-admin)
- `client/src/pages/auth.tsx` — Login/Register with ToS checkbox

### Supported Languages
ro, en, es, fr, de, it, pt, ru, zh, ja, ko, ar, hi, tr, pl, nl, sv, uk, cs, hu, bg, el, th, vi, id

### Routes
- `/` — Home page with latest articles
- `/auth` — Login and registration
- `/profile/:username` — User profile page with stats and account management
- `/editor` — Rich text article editor (admin only, supports `?category=` query param)
- `/section/:category` — Category pages (liceu, hobby, sfaturi)
- `/article/:id` — Article view with comments
- `/forum` — Forum section
- `/forum/:id` — Forum topic with replies
- `/qa` — Q&A section
- `/archive` — Archive of all posts
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/admin` — Admin dashboard (admin only)

### Design
- Purple primary (#6C5CE7-ish), yellow secondary, pink accent
- Handwriting-style font for headings
- Notebook/journal aesthetic with rounded cards
- Dark mode with proper CSS custom properties for all colors
- Hover animations and transitions on interactive elements
- Admin badge in user dropdown menu

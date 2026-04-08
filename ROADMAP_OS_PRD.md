# Roadmap OS — Product Requirements Document (PRD)

> **Purpose**: This document is the single source of truth for building Roadmap OS.
> Feed this file to Claude Code as context when implementing any feature.
> Each section is self-contained and can be referenced independently.

---

## 1. Product Overview

### 1.1 What is Roadmap OS?

A minimalist, web-based ticket management system designed for small teams (2–5 people) and their external stakeholders (investors, board members). The core differentiator: a **Global Roadmap** view that gives CEO-level visibility into monthly/quarterly KPIs and the tasks required to hit them — without drowning in operational noise.

### 1.2 Core Problem

Existing tools (Linear, Jira, Asana) treat projects and tasks as isolated units. There is no unified "glass pane" where a CEO can see:
- What are this month's global milestones?
- How many tasks remain to close each milestone?
- Which tasks are blocked and by what?
- What's the overall progress percentage?

### 1.3 Key Differentiator

**Two-level milestone system with linking**: Global Roadmap has its own milestones. Projects have their own milestones. Project milestones can be **linked** to global milestones so progress flows upward automatically. No duplication — one source of truth.

### 1.4 Users

| Role | Access | Description |
|------|--------|-------------|
| **Admin** | Full CRUD on everything | Team members who manage projects, create tasks, configure settings |
| **Viewer** | Read-only across all views | Investors, board members, external stakeholders who need visibility |

### 1.5 Non-Goals (v1)

- Mobile/tablet support (desktop only)
- Notifications (email, push, in-app)
- Integrations (Slack, GitHub, etc.)
- Import/Export
- Multi-language (English only)
- Self-registration (admin creates accounts)

---

## 2. Information Architecture

### 2.1 Data Hierarchy

```
Workspace (implicit, single-tenant)
├── Global Roadmap
│   └── Global Milestones (monthly/quarterly KPI containers)
│       ├── Linked Project Milestones (progress flows up)
│       ├── Linked individual Tasks
│       └── Linked entire Projects
│
├── Project (e.g. "Product", "Operations")
│   ├── Project Milestones (can link to Global Milestones)
│   │   └── Tasks
│   │       └── Subtasks (checklist items)
│   └── Unassigned Tasks (no milestone)
│       └── Subtasks
│
└── Settings
    ├── Users (admin creates manually)
    ├── Statuses (global, admin-configurable)
    ├── Labels (global, admin-configurable)
    └── Theme (dark/light toggle per user)
```

### 2.2 Entity Relationships

```
Global Milestone 1──────┐
  │                      │
  ├── linked to ──> Project Milestone (progress aggregates up)
  ├── linked to ──> Task (directly added)
  └── linked to ──> Project (all project progress aggregates up)

Project 1───many Milestones
Project 1───many Tasks
Milestone 1───many Tasks
Task 1───many Subtasks
Task many───many Tasks (dependencies: blocks / blocked_by / related)
Task many───many Labels
Task 1───one Assignee (User)
```

---

## 3. Data Models

### 3.1 User

```typescript
interface User {
  id: string;                // UUID
  email: string;             // unique, used for login
  password_hash: string;     // bcrypt hash
  name: string;
  role: 'admin' | 'viewer';
  avatar_url?: string;
  theme: 'dark' | 'light';  // user preference
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.2 Project

```typescript
interface Project {
  id: string;
  name: string;              // e.g. "Product"
  prefix: string;            // e.g. "PRODUCT" — used in task identifiers
  color: string;             // hex color for UI
  description?: string;
  created_by: string;        // User.id
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.3 Global Milestone

```typescript
interface GlobalMilestone {
  id: string;
  title: string;             // e.g. "April — Mocked MVP"
  description?: string;
  target_month: string;      // "2026-04" — for grouping
  deadline?: date;           // optional exact date, e.g. "2026-04-30"
  order: number;             // sort order within month
  created_by: string;
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.4 Project Milestone

```typescript
interface ProjectMilestone {
  id: string;
  project_id: string;        // FK → Project.id
  title: string;
  description?: string;
  target_month: string;
  deadline?: date;
  order: number;
  global_milestone_id?: string; // FK → GlobalMilestone.id (LINK to global roadmap)
  created_by: string;
  created_at: datetime;
  updated_at: datetime;
}
```

> **Key concept**: When `global_milestone_id` is set, this project milestone's progress (% of tasks done) rolls up into the global milestone's aggregate progress.

### 3.5 Task

```typescript
interface Task {
  id: string;
  project_id: string;            // FK → Project.id
  project_milestone_id?: string; // FK → ProjectMilestone.id
  identifier: string;            // auto-generated: "{Project.prefix}-{seq}", e.g. "PRODUCT-479"
  title: string;
  description?: string;          // rich text (markdown)
  status: string;                // FK → Status.id
  priority: 'none' | 'urgent' | 'high' | 'medium' | 'low';
  assignee_id?: string;          // FK → User.id
  effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  due_date?: date;
  in_roadmap: boolean;           // direct flag — show this task on global roadmap
  created_by: string;
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.6 Subtask

```typescript
interface Subtask {
  id: string;
  task_id: string;           // FK → Task.id
  title: string;
  done: boolean;
  order: number;
  created_at: datetime;
}
```

### 3.7 Task Dependency

```typescript
interface TaskDependency {
  id: string;
  source_task_id: string;    // FK → Task.id
  target_task_id: string;    // FK → Task.id
  type: 'blocks' | 'blocked_by' | 'related';
  created_at: datetime;
}
```

> **Note**: `blocks` and `blocked_by` are inverse pairs. When creating "A blocks B", also store "B blocked_by A" — or handle in application logic.

### 3.8 Label

```typescript
interface Label {
  id: string;
  name: string;              // e.g. "design", "backend", "legal"
  color: string;             // hex
  created_at: datetime;
}
```

### 3.9 Task ↔ Label (junction)

```typescript
interface TaskLabel {
  task_id: string;
  label_id: string;
}
```

### 3.10 Status

```typescript
interface Status {
  id: string;
  name: string;              // e.g. "To Do"
  color: string;             // hex
  order: number;             // defines the flow left→right in kanban
  is_done: boolean;          // marks which status(es) count as "complete" for progress calc
  is_default: boolean;       // new tasks get this status
  created_at: datetime;
}
```

> **Default seed statuses**: Backlog (order: 0), To Do (order: 1, is_default), In Progress (order: 2), Done (order: 3, is_done), Cancelled (order: 4, is_done).

### 3.11 Comment

```typescript
interface Comment {
  id: string;
  task_id: string;           // FK → Task.id
  author_id: string;         // FK → User.id
  body: string;              // plain text
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.12 Activity Log

```typescript
interface ActivityLog {
  id: string;
  task_id: string;           // FK → Task.id
  user_id: string;           // FK → User.id
  action: string;            // e.g. "status_changed", "assignee_changed", "created", "comment_added"
  field?: string;            // which field changed
  old_value?: string;
  new_value?: string;
  created_at: datetime;
}
```

### 3.13 Attachment

```typescript
interface Attachment {
  id: string;
  task_id: string;           // FK → Task.id
  filename: string;
  file_url: string;          // Supabase Storage URL
  file_size: number;         // bytes
  mime_type: string;
  uploaded_by: string;       // FK → User.id
  created_at: datetime;
}
```

### 3.14 Global Milestone Links (what's pulled into roadmap)

```typescript
// Link a project milestone to a global milestone
interface GlobalMilestoneLink {
  id: string;
  global_milestone_id: string;  // FK → GlobalMilestone.id
  // Exactly one of these three should be set:
  project_id?: string;          // link entire project
  project_milestone_id?: string; // link a specific project milestone
  task_id?: string;              // link a specific task
  created_at: datetime;
}
```

> **Progress calculation**: For each GlobalMilestone, aggregate:
> - Directly linked tasks: count done / total
> - Linked project milestones: count done tasks / total tasks within that milestone
> - Linked projects: count done tasks / total tasks across entire project

---

## 4. Pages & Views

### 4.1 Authentication

#### Login Page
- Email + password form
- Error handling for invalid credentials
- Redirect to Roadmap after login
- "Forgot password" is out of scope for v1

### 4.2 Sidebar Navigation (persistent)

```
┌─────────────────────┐
│  Roadmap OS    [logo]│
│                      │
│  🗺  Roadmap         │
│                      │
│  PROJECTS            │
│  ● Product           │
│  ● Operations        │
│  + New Project       │
│                      │
│  ─────────────       │
│  ⚙ Settings          │
│  ↩ Logout            │
└─────────────────────┘
```

### 4.3 Global Roadmap (main page)

**URL**: `/roadmap`

**Header**:
- Title: "Roadmap"
- Overall progress: X/Y completed, progress bar, percentage
- View toggle: List | Dashboard

#### 4.3.1 Roadmap — List View (default)

Grouped by **month** (from Global Milestones' `target_month`):

```
═══ April 2026 ═══ [12/20] [====60%====]
  ◆ Mocked MVP (deadline: Apr 30) ─── [8/14]
    🔴 PRODUCT-485  ○  Backend foundation deployed        [blocked]
    🔴 PRODUCT-484  ○  Parent app: mocked walkthrough
    🔴 PRODUCT-483  ◐  Child app: full mocked walkthrough  [4/9]
    ...
  ◆ Broker Agreements ─── [2/4]
    🟠 OPS-204      ◐  Sign broker agreements              [0/2]
    ...

═══ May 2026 ═══ [0/10] [=====0%=====]
  ...
```

Each task row shows:
- Priority icon
- Task identifier (monospace)
- Status indicator (clickable to cycle)
- Title
- Dependency tags (blocked / blocks N)
- Subtask progress bar + count (if subtasks exist)
- Effort badge (XS/S/M/L/XL)
- Labels
- Project color dot

**Expand/collapse** milestones by clicking.

#### 4.3.2 Roadmap — Dashboard View

A progress dashboard for the CEO:

- **Overall progress**: big number + donut chart
- **Per-month progress**: horizontal bar chart showing each month's completion %
- **Burndown chart**: tasks remaining over time (requires tracking completion dates)
- **Blocker summary**: list of all tasks with "blocked_by" status, grouped by what they're blocked by
- **Milestone health**: cards for each global milestone showing:
  - Title, deadline
  - Progress %
  - Status indicator: 🟢 on track / 🟡 at risk (>70% time passed, <50% done) / 🔴 behind
  - Number of blockers

### 4.4 Project View

**URL**: `/project/:projectId`

**Header**:
- Project color dot + name + prefix
- Buttons: + Milestone, + Task
- View toggle: List | Kanban | Timeline

#### 4.4.1 Project — List View (default)

Grouped by **Project Milestones** (sorted by order):

```
◆ April — Mocked MVP  [linked to → Global: "Mocked MVP"]  [4/6]
  🔴 PRODUCT-485  ○  Backend foundation deployed
  🔴 PRODUCT-484  ○  Parent app: mocked walkthrough
  ...

◆ May — Core Features  [linked to → Global: "Core Features"]  [0/4]
  ...

─── No Milestone ───
  PRODUCT-490  ○  Spike: research auth providers
```

Each milestone header shows if it's linked to a global milestone (subtle badge).

#### 4.4.2 Project — Kanban View

Columns = configured Statuses (in order):

```
| Backlog | To Do | In Progress | Done |
|---------|-------|-------------|------|
| task    | task  | task        | task |
| task    |       | task        | task |
```

- Drag & drop tasks between columns to change status
- Tasks show: priority icon, identifier, title, assignee avatar, subtask count, labels
- Column header shows count

#### 4.4.3 Project — Timeline / Gantt View

Horizontal timeline:
- X-axis: weeks/months
- Y-axis: milestones and tasks
- Bars represent task duration (due_date or milestone deadline)
- Dependencies shown as arrows between bars
- Color-coded by status
- Milestones shown as diamond markers

### 4.5 Task Detail (Modal or Side Panel)

Opens when clicking any task. Shows full task editing:

**Header**: Project color dot + identifier + created date

**Fields**:
- Title (inline editable, large font)
- Description (rich text editor — markdown with preview)
- Status (dropdown)
- Priority (dropdown with icons)
- Assignee (dropdown with avatars)
- Milestone (dropdown — shows project milestones)
- Effort (XS/S/M/L/XL selector)
- Labels (multi-select with color dots)
- Due date (date picker)
- Show in Roadmap (checkbox)

**Subtasks section**:
- Checklist with drag to reorder
- Check/uncheck to toggle done
- Add new subtask input
- Delete subtask (x button)
- Progress bar

**Dependencies section**:
- List of current dependencies with type tag (blocks / blocked_by / related)
- Each shows: type tag + task identifier + task title + remove button
- Add dependency: type dropdown + task search/select + add button

**Attachments section**:
- List of uploaded files with filename, size, download link
- Upload button (drag & drop zone)
- Delete attachment

**Activity & Comments section** (tabbed or unified feed):
- Activity tab: chronological log of all changes
  - "Alice changed status from To Do → In Progress"
  - "Bob assigned to Alice"
  - "Created by Admin on Apr 3, 2026"
- Comments tab: threaded text comments
  - Author avatar + name + timestamp
  - Comment body
  - Add comment input

**Footer**: Save Changes | Delete Task

### 4.6 Settings

**URL**: `/settings`

Tabs:

#### 4.6.1 Settings — Users
- List of all users: avatar, name, email, role badge
- Remove button per user (can't remove last admin)
- Add User form: name, email, password, role (admin/viewer)

#### 4.6.2 Settings — Statuses
- Ordered list of statuses: drag to reorder
- Each row: color dot, name, is_done checkbox, is_default radio
- Add new status: name + color picker
- Delete status (only if no tasks use it, or reassign)

#### 4.6.3 Settings — Labels
- List of labels: color dot, name
- Add new: name + color picker
- Edit / Delete

#### 4.6.4 Settings — General
- Reset data to defaults
- Theme toggle (dark / light) — per-user preference

---

## 5. UI/UX Specifications

### 5.1 Design Language

- **Aesthetic**: Minimalist, Linear-inspired. Clean lines, generous whitespace, sharp typography.
- **Theme**: Dark and Light modes. Default: dark.
- **Font**: One distinctive sans-serif for UI + monospace for identifiers/numbers.
- **Colors**: Neutral base (zinc scale) + one accent (indigo) + semantic colors (green=done, red=blocked/urgent, amber=warning).
- **Interactions**: Subtle hover states, smooth 150ms transitions, fade-in animations on view changes.
- **Desktop only**: Optimized for 1280px+ viewport. No mobile breakpoints needed.

### 5.2 Dark Theme Tokens

```css
--bg-primary: #0a0a0b;
--bg-secondary: #18181b;
--bg-tertiary: #27272a;
--border: #ffffff0a;
--border-hover: #ffffff14;
--text-primary: #e4e4e7;
--text-secondary: #a1a1aa;
--text-tertiary: #71717a;
--text-muted: #52525b;
--accent: #6366f1;
--accent-hover: #818cf8;
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
```

### 5.3 Light Theme Tokens

```css
--bg-primary: #ffffff;
--bg-secondary: #f4f4f5;
--bg-tertiary: #e4e4e7;
--border: #00000010;
--border-hover: #0000001a;
--text-primary: #18181b;
--text-secondary: #52525b;
--text-tertiary: #71717a;
--text-muted: #a1a1aa;
--accent: #6366f1;
--accent-hover: #4f46e5;
--success: #16a34a;
--warning: #d97706;
--danger: #dc2626;
```

### 5.4 Key UI Patterns

- **Status cycling**: Click status dot on task row → cycles to next status (no modal needed)
- **Inline editing**: Title, assignee, priority can be changed directly from list view
- **Keyboard shortcuts** (nice to have):
  - `C` — create new task
  - `K/J` — navigate up/down in list
  - `/` — focus search
  - `Esc` — close modal
- **Empty states**: Helpful message + CTA when no data exists
- **Loading states**: Skeleton loaders for data fetching

---

## 6. Tech Stack

### 6.1 Frontend

| Technology | Purpose |
|-----------|---------|
| **Next.js 14+** (App Router) | Framework — React + SSR + API routes |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Zustand** or **Jotai** | Client state management |
| **TanStack Query** | Server state / caching |
| **@tiptap/react** | Rich text editor for task descriptions |
| **dnd-kit** | Drag & drop for kanban + subtask reorder |
| **recharts** | Charts for dashboard view |
| **date-fns** | Date formatting |
| **cmdk** | Command palette / search (Cmd+K) |

### 6.2 Backend

| Technology | Purpose |
|-----------|---------|
| **Supabase** | Backend-as-a-service |
| **Supabase Auth** | Email + password authentication |
| **Supabase Postgres** | Database (all data models) |
| **Supabase Storage** | File/image attachments |
| **Supabase RLS** | Row-level security (viewer can't write) |
| **Supabase Realtime** | Optional — live updates if multiple users |

### 6.3 Deployment

| Technology | Purpose |
|-----------|---------|
| **Vercel** | Frontend hosting (Next.js native) |
| **Supabase Cloud** | Database + auth + storage hosting |

---

## 7. Supabase Database Schema (SQL)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════
-- USERS (extends Supabase auth.users)
-- ═══════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- GLOBAL MILESTONES
-- ═══════════════════════════════════════
CREATE TABLE public.global_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  target_month TEXT NOT NULL,           -- "2026-04"
  deadline DATE,
  "order" INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- PROJECT MILESTONES
-- ═══════════════════════════════════════
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_month TEXT NOT NULL,
  deadline DATE,
  "order" INT NOT NULL DEFAULT 0,
  global_milestone_id UUID REFERENCES public.global_milestones(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- STATUSES (admin-configurable)
-- ═══════════════════════════════════════
CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  "order" INT NOT NULL DEFAULT 0,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default statuses
INSERT INTO public.statuses (name, color, "order", is_done, is_default) VALUES
  ('Backlog',     '#6b7280', 0, FALSE, FALSE),
  ('To Do',       '#3b82f6', 1, FALSE, TRUE),
  ('In Progress', '#f59e0b', 2, FALSE, FALSE),
  ('Done',        '#22c55e', 3, TRUE,  FALSE),
  ('Cancelled',   '#ef4444', 4, TRUE,  FALSE);

-- ═══════════════════════════════════════
-- LABELS
-- ═══════════════════════════════════════
CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- TASKS
-- ═══════════════════════════════════════
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  identifier TEXT NOT NULL UNIQUE,      -- "PRODUCT-479"
  title TEXT NOT NULL,
  description TEXT,                      -- rich text / markdown
  status_id UUID NOT NULL REFERENCES public.statuses(id),
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none','urgent','high','medium','low')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  effort TEXT CHECK (effort IN ('XS','S','M','L','XL')),
  due_date DATE,
  in_roadmap BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-increment sequence per project for identifiers
-- (handle in application logic: query max seq for project, increment)

-- ═══════════════════════════════════════
-- SUBTASKS
-- ═══════════════════════════════════════
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- TASK DEPENDENCIES
-- ═══════════════════════════════════════
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blocks', 'blocked_by', 'related')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_task_id, target_task_id, type)
);

-- ═══════════════════════════════════════
-- TASK ↔ LABEL (junction)
-- ═══════════════════════════════════════
CREATE TABLE public.task_labels (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- ═══════════════════════════════════════
-- GLOBAL MILESTONE LINKS
-- ═══════════════════════════════════════
CREATE TABLE public.global_milestone_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_milestone_id UUID NOT NULL REFERENCES public.global_milestones(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactly one of the three FK columns must be set
  CHECK (
    (project_id IS NOT NULL AND project_milestone_id IS NULL AND task_id IS NULL) OR
    (project_id IS NULL AND project_milestone_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND project_milestone_id IS NULL AND task_id IS NOT NULL)
  )
);

-- ═══════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ACTIVITY LOG
-- ═══════════════════════════════════════
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ATTACHMENTS
-- ═══════════════════════════════════════
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_milestone_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.projects FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.global_milestones FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.statuses FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.labels FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.subtasks FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.task_dependencies FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.task_labels FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.global_milestone_links FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "read_all" ON public.attachments FOR SELECT USING (true);

-- Only admins can write
-- (Helper function to check if user is admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "admin_insert" ON public.projects FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.projects FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.projects FOR DELETE USING (public.is_admin());

-- Repeat pattern for all writable tables:
-- global_milestones, project_milestones, statuses, labels, tasks, subtasks,
-- task_dependencies, task_labels, global_milestone_links, comments, activity_log, attachments
-- (Viewers can read but not write anything)
```

---

## 8. API / Data Access Patterns

Since we use Supabase client directly from Next.js, most data access is via `supabase.from('table').select/insert/update/delete`. Key query patterns:

### 8.1 Roadmap — List View

```typescript
// Get all global milestones with their linked items and progress
const { data: globalMilestones } = await supabase
  .from('global_milestones')
  .select('*, global_milestone_links(*)')
  .order('target_month', { ascending: true })
  .order('order', { ascending: true });

// For each linked project_milestone, get tasks and count done
// For each linked task, get status
// Aggregate progress per global milestone
```

### 8.2 Project — List View

```typescript
const { data: milestones } = await supabase
  .from('project_milestones')
  .select('*, tasks(*, subtasks(*), task_labels(label_id), task_dependencies(*))')
  .eq('project_id', projectId)
  .order('order');
```

### 8.3 Search Across All Projects

```typescript
const { data: results } = await supabase
  .from('tasks')
  .select('*, projects(name, prefix, color)')
  .or(`title.ilike.%${query}%,identifier.ilike.%${query}%,description.ilike.%${query}%`);
```

---

## 9. File/Folder Structure

```
roadmap-os/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (sidebar + theme provider)
│   │   ├── page.tsx                  # Redirect to /roadmap
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── roadmap/
│   │   │   └── page.tsx              # Global Roadmap (list + dashboard toggle)
│   │   ├── project/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Project view (list + kanban + timeline toggle)
│   │   └── settings/
│   │       └── page.tsx              # Settings (users, statuses, labels, general)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── roadmap/
│   │   │   ├── RoadmapList.tsx
│   │   │   ├── RoadmapDashboard.tsx
│   │   │   ├── GlobalMilestoneGroup.tsx
│   │   │   └── ProgressCards.tsx
│   │   ├── project/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectKanban.tsx
│   │   │   ├── ProjectTimeline.tsx
│   │   │   └── MilestoneGroup.tsx
│   │   ├── task/
│   │   │   ├── TaskRow.tsx
│   │   │   ├── TaskDetail.tsx        # Modal/panel with full task editing
│   │   │   ├── TaskEditor.tsx        # Rich text editor (tiptap)
│   │   │   ├── SubtaskList.tsx
│   │   │   ├── DependencyList.tsx
│   │   │   ├── CommentList.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── AttachmentList.tsx
│   │   ├── shared/
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── PriorityIcon.tsx
│   │   │   ├── EffortBadge.tsx
│   │   │   ├── LabelTag.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── DependencyTag.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBar.tsx         # Cmd+K global search
│   │   │   ├── EmptyState.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   └── settings/
│   │       ├── UserManager.tsx
│   │       ├── StatusManager.tsx
│   │       ├── LabelManager.tsx
│   │       └── GeneralSettings.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase browser client
│   │   │   ├── server.ts             # Supabase server client (for SSR)
│   │   │   └── admin.ts              # Supabase admin client (for user creation)
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   ├── useMilestones.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useGlobalRoadmap.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useAuth.ts
│   │   ├── stores/
│   │   │   ├── themeStore.ts         # Zustand store for theme
│   │   │   └── uiStore.ts           # Zustand store for UI state (modals, expanded, etc.)
│   │   ├── utils/
│   │   │   ├── progress.ts           # Progress calculation helpers
│   │   │   ├── identifiers.ts        # Task identifier generation
│   │   │   └── dates.ts              # Date formatting helpers
│   │   └── types/
│   │       └── index.ts              # All TypeScript interfaces
│   │
│   └── styles/
│       └── globals.css               # Tailwind directives + CSS variables
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Full schema from Section 7
│   └── seed.sql                      # Demo data for development
│
├── public/
│   └── favicon.ico
│
├── .env.local.example                # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 10. Implementation Phases

### Phase 1 — Foundation (Week 1)
> **Goal**: Auth works, database exists, can navigate between empty pages.

- [ ] Supabase project setup (create project, get keys)
- [ ] Run database migration (Section 7 SQL)
- [ ] Seed default statuses
- [ ] Next.js project setup with Tailwind + TypeScript
- [ ] Supabase client configuration
- [ ] Auth: login page, auth guard, admin user creation
- [ ] Layout: sidebar navigation, theme provider (dark/light toggle)
- [ ] Empty pages: /roadmap, /project/[id], /settings
- [ ] Route protection (redirect to login if not authenticated)

### Phase 2 — Core CRUD (Week 2)
> **Goal**: Can create projects, milestones, tasks, subtasks. List views work.

- [ ] Settings: user management (admin creates users)
- [ ] Settings: status management (CRUD + reorder)
- [ ] Settings: label management (CRUD)
- [ ] Project CRUD (create, edit, delete from sidebar)
- [ ] Project Milestone CRUD (create, edit, delete, reorder)
- [ ] Task CRUD (create, edit full detail modal)
- [ ] Task identifier auto-generation
- [ ] Subtask CRUD (add, toggle, reorder, delete)
- [ ] Project list view (grouped by milestones)
- [ ] Status cycling on task row click

### Phase 3 — Roadmap & Links (Week 3)
> **Goal**: Global roadmap works with two-level milestone linking.

- [ ] Global Milestone CRUD
- [ ] Global Milestone Links (link project milestones, tasks, projects)
- [ ] Project milestone → global milestone linking UI
- [ ] Roadmap list view (grouped by month, shows linked items)
- [ ] Progress aggregation logic (tasks → milestone → global milestone)
- [ ] "Show in Roadmap" flag on tasks
- [ ] In project view: show global milestone badge on linked project milestones

### Phase 4 — Dependencies & Rich Content (Week 4)
> **Goal**: Task relationships work, rich descriptions, comments, activity log.

- [ ] Task dependencies: blocks / blocked_by / related
- [ ] Dependency visualization on task rows (blocked tag, blocks N tag)
- [ ] Rich text editor for task descriptions (tiptap + markdown)
- [ ] File/image attachments (Supabase Storage)
- [ ] Comments on tasks
- [ ] Activity log (auto-log status, assignee, priority changes)
- [ ] Labels on tasks (multi-select)
- [ ] Effort field (t-shirt sizes)

### Phase 5 — Advanced Views (Week 5)
> **Goal**: Kanban, Timeline, Dashboard views are functional.

- [ ] Project Kanban view (drag & drop between statuses)
- [ ] Project Timeline/Gantt view (horizontal bars, dependencies as arrows)
- [ ] Roadmap Dashboard view (progress charts, burndown, blocker summary)
- [ ] Milestone health indicators (on track / at risk / behind)

### Phase 6 — Search & Polish (Week 6)
> **Goal**: Full search, keyboard shortcuts, empty states, loading states.

- [ ] Global search (Cmd+K) across all projects, tasks, milestones
- [ ] Saved filters / filter presets
- [ ] Filter by: status, assignee, priority, label, milestone, due date, effort
- [ ] Keyboard shortcuts (C, K/J, /, Esc)
- [ ] Empty states for all views
- [ ] Skeleton loaders
- [ ] Error handling and edge cases
- [ ] RLS policies finalized and tested
- [ ] Final UI polish pass

---

## 11. Progress Calculation Logic

This is critical for the roadmap. Here's the exact algorithm:

```typescript
// For a single task
function taskProgress(task: Task): { done: number; total: number } {
  const isDone = statuses.find(s => s.id === task.status_id)?.is_done;
  return { done: isDone ? 1 : 0, total: 1 };
}

// For a project milestone
function milestoneProgress(milestoneId: string): { done: number; total: number } {
  const tasks = allTasks.filter(t => t.project_milestone_id === milestoneId);
  const done = tasks.filter(t => statuses.find(s => s.id === t.status_id)?.is_done).length;
  return { done, total: tasks.length };
}

// For a global milestone (aggregates all linked items)
function globalMilestoneProgress(globalMilestoneId: string): { done: number; total: number } {
  const links = globalMilestoneLinks.filter(l => l.global_milestone_id === globalMilestoneId);

  let totalDone = 0;
  let totalAll = 0;

  for (const link of links) {
    if (link.task_id) {
      // Direct task link
      const p = taskProgress(tasks.find(t => t.id === link.task_id));
      totalDone += p.done;
      totalAll += p.total;
    } else if (link.project_milestone_id) {
      // Project milestone link — aggregate its tasks
      const p = milestoneProgress(link.project_milestone_id);
      totalDone += p.done;
      totalAll += p.total;
    } else if (link.project_id) {
      // Entire project link — aggregate ALL project tasks
      const projTasks = allTasks.filter(t => t.project_id === link.project_id);
      const done = projTasks.filter(t => statuses.find(s => s.id === t.status_id)?.is_done).length;
      totalDone += done;
      totalAll += projTasks.length;
    }
  }

  // Also include project milestones linked via global_milestone_id field
  const linkedProjMilestones = projectMilestones.filter(pm => pm.global_milestone_id === globalMilestoneId);
  for (const pm of linkedProjMilestones) {
    const p = milestoneProgress(pm.id);
    totalDone += p.done;
    totalAll += p.total;
  }

  return { done: totalDone, total: totalAll };
}

// Milestone health
function milestoneHealth(gm: GlobalMilestone): 'on_track' | 'at_risk' | 'behind' {
  const { done, total } = globalMilestoneProgress(gm.id);
  if (total === 0) return 'on_track';

  const pctDone = done / total;
  const now = new Date();
  const deadline = gm.deadline ? new Date(gm.deadline) : endOfMonth(gm.target_month);
  const start = startOfMonth(gm.target_month); // or creation date
  const elapsed = (now - start) / (deadline - start);

  if (pctDone >= elapsed) return 'on_track';        // progress >= time elapsed
  if (pctDone >= elapsed * 0.5) return 'at_risk';   // progress is lagging
  return 'behind';                                    // significantly behind
}
```

---

## 12. Claude Code Usage Guide

### How to use this document with Claude Code:

1. **Start a session**: `claude` in the project root
2. **Reference this PRD**: "Read ROADMAP_OS_PRD.md and implement Phase 1"
3. **Be specific**: "Implement the Task Detail modal as described in Section 4.5"
4. **Reference schemas**: "Create the Supabase migration using the SQL from Section 7"
5. **Reference components**: "Build TaskRow.tsx as described in Section 4.3.1"

### Recommended workflow:

```bash
# Phase 1
claude "Read ROADMAP_OS_PRD.md. Set up the Next.js project with Tailwind and TypeScript. Create the folder structure from Section 9. Install all dependencies from Section 6.1."

claude "Implement the Supabase database schema from Section 7. Create the migration file at supabase/migrations/001_initial_schema.sql."

claude "Build the auth flow: login page (Section 4.1), AuthGuard component, and Supabase auth configuration."

claude "Build the layout: Sidebar (Section 4.2) with theme toggle (dark/light using CSS variables from Section 5.2/5.3)."

# Phase 2
claude "Implement Settings page (Section 4.6) — all tabs: users, statuses, labels, general."

claude "Build Project CRUD and ProjectList view (Section 4.4.1) with MilestoneGroup component."

claude "Build the TaskDetail modal (Section 4.5) with all fields, subtasks, and inline editing."

# ... continue phase by phase
```

### Key decisions already made:
- Supabase + Next.js + TypeScript + Tailwind
- Two roles: Admin (full) + Viewer (read-only)
- 4-level hierarchy: Project → Milestone → Task → Subtask
- Two-level milestones with linking (global ↔ project)
- T-shirt size effort estimation
- Dark + Light themes
- Desktop only
- English only
- No notifications, no integrations, no import/export
- Configurable global statuses
- Dependencies: blocks / blocked_by / related
- Comments + activity log + rich text + attachments
- Views: List + Kanban + Gantt (project), List + Dashboard (roadmap)
- Advanced search with saved filters across all projects

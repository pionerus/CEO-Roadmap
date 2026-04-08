-- ═══════════════════════════════════════
-- Roadmap OS — Initial Schema
-- PRD Section 7
-- ═══════════════════════════════════════

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
  target_month TEXT NOT NULL,
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
  identifier TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
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
-- TASK <-> LABEL (junction)
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

-- Everyone can read (authenticated)
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

-- Admin check helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin write policies for all writable tables
-- Profiles: users can update their own profile, admins can do everything
CREATE POLICY "users_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin_insert" ON public.profiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.profiles FOR DELETE USING (public.is_admin());

-- Projects
CREATE POLICY "admin_insert" ON public.projects FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.projects FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.projects FOR DELETE USING (public.is_admin());

-- Global milestones
CREATE POLICY "admin_insert" ON public.global_milestones FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.global_milestones FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.global_milestones FOR DELETE USING (public.is_admin());

-- Project milestones
CREATE POLICY "admin_insert" ON public.project_milestones FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.project_milestones FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.project_milestones FOR DELETE USING (public.is_admin());

-- Statuses
CREATE POLICY "admin_insert" ON public.statuses FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.statuses FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.statuses FOR DELETE USING (public.is_admin());

-- Labels
CREATE POLICY "admin_insert" ON public.labels FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.labels FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.labels FOR DELETE USING (public.is_admin());

-- Tasks
CREATE POLICY "admin_insert" ON public.tasks FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.tasks FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.tasks FOR DELETE USING (public.is_admin());

-- Subtasks
CREATE POLICY "admin_insert" ON public.subtasks FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.subtasks FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.subtasks FOR DELETE USING (public.is_admin());

-- Task dependencies
CREATE POLICY "admin_insert" ON public.task_dependencies FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.task_dependencies FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.task_dependencies FOR DELETE USING (public.is_admin());

-- Task labels
CREATE POLICY "admin_insert" ON public.task_labels FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.task_labels FOR DELETE USING (public.is_admin());

-- Global milestone links
CREATE POLICY "admin_insert" ON public.global_milestone_links FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.global_milestone_links FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.global_milestone_links FOR DELETE USING (public.is_admin());

-- Comments (admins can write)
CREATE POLICY "admin_insert" ON public.comments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.comments FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete" ON public.comments FOR DELETE USING (public.is_admin());

-- Activity log (admins can write)
CREATE POLICY "admin_insert" ON public.activity_log FOR INSERT WITH CHECK (public.is_admin());

-- Attachments
CREATE POLICY "admin_insert" ON public.attachments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.attachments FOR DELETE USING (public.is_admin());

-- ═══════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_milestone ON public.tasks(project_milestone_id);
CREATE INDEX idx_tasks_status ON public.tasks(status_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_identifier ON public.tasks(identifier);
CREATE INDEX idx_subtasks_task ON public.subtasks(task_id);
CREATE INDEX idx_deps_source ON public.task_dependencies(source_task_id);
CREATE INDEX idx_deps_target ON public.task_dependencies(target_task_id);
CREATE INDEX idx_task_labels_task ON public.task_labels(task_id);
CREATE INDEX idx_task_labels_label ON public.task_labels(label_id);
CREATE INDEX idx_gml_global ON public.global_milestone_links(global_milestone_id);
CREATE INDEX idx_pm_project ON public.project_milestones(project_id);
CREATE INDEX idx_pm_global ON public.project_milestones(global_milestone_id);
CREATE INDEX idx_comments_task ON public.comments(task_id);
CREATE INDEX idx_activity_task ON public.activity_log(task_id);
CREATE INDEX idx_attachments_task ON public.attachments(task_id);

-- ═══════════════════════════════════════
-- UPDATED_AT trigger function
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.global_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════
-- Auto-create profile on user signup
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

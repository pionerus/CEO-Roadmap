// ═══════════════════════════════════════
// Roadmap OS — TypeScript Types (PRD Section 3)
// ═══════════════════════════════════════

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  theme: 'dark' | 'light';
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  prefix: string;
  color: string;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalMilestone {
  id: string;
  title: string;
  description?: string | null;
  target_month: string; // "2026-04"
  deadline?: string | null;
  order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  target_month: string;
  deadline?: string | null;
  order: number;
  global_milestone_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type Priority = 'none' | 'urgent' | 'high' | 'medium' | 'low';
export type Effort = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface Task {
  id: string;
  project_id: string;
  project_milestone_id?: string | null;
  identifier: string; // "PRODUCT-479"
  title: string;
  description?: string | null;
  status_id: string;
  priority: Priority;
  assignee_id?: string | null;
  effort?: Effort | null;
  due_date?: string | null;
  order: number;
  in_roadmap: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  order: number;
  created_at: string;
}

export type DependencyType = 'blocks' | 'blocked_by' | 'related';

export interface TaskDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  type: DependencyType;
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  order: number;
  is_done: boolean;
  is_default: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface GlobalMilestoneLink {
  id: string;
  global_milestone_id: string;
  project_id?: string | null;
  project_milestone_id?: string | null;
  task_id?: string | null;
  created_at: string;
}

// ═══════════════════════════════════════
// Computed / Joined types (for UI)
// ═══════════════════════════════════════

export interface TaskWithRelations extends Task {
  subtasks?: Subtask[];
  labels?: Label[];
  task_dependencies?: TaskDependency[];
  task_labels?: { label_id: string }[];
  status?: Status;
  assignee?: Profile;
  project?: Project;
}

export interface ProjectMilestoneWithTasks extends ProjectMilestone {
  tasks: TaskWithRelations[];
  global_milestone?: GlobalMilestone | null;
}

export interface GlobalMilestoneWithLinks extends GlobalMilestone {
  links: GlobalMilestoneLink[];
}

export interface Progress {
  done: number;
  total: number;
  percentage: number;
}

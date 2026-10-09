import { createClient } from '@/lib/supabase/client'

// Lazy: no client is constructed at module load, so importing this from a Server
// Component never creates a browser client during SSR.
const supabase = () => createClient()

// ======================== ROW TYPES ========================

export type Priority = 'low' | 'medium' | 'high'

export interface Profile {
  id: string
  name: string
  email: string
  role: 'project_manager' | 'member'
  avatar_url: string | null
}

export interface Workspace {
  id: string
  name: string
  owner_id: string | null
}

export interface Project {
  id: string
  workspace_id: string | null
  name: string
  description: string | null
  scope: string | null
  progress: number
  start_date: string | null
  due_date: string | null
  owner_id: string | null
}

export interface Status {
  id: string
  label: string
  color_code: string
  position: number
}

export interface Group {
  id: string
  title: string
  color: string | null
  position: number
}

export interface Task {
  id: string
  group_id: string | null
  status_id: string | null
  title: string
  description: string | null
  priority: Priority
  due_date: string | null
  assignee_id: string | null
  checked: boolean
  position: number
}

export interface SubTask {
  id: string
  task_id: string
  text: string
  done: boolean
  position: number
}

export interface Comment {
  id: string
  task_id: string
  author_id: string | null
  parent_id: string | null
  body: string
  likes: number
  created_at: string
}

export interface Member {
  id: string
  name: string
  role: string
  avatar_url: string | null
}

export interface Attachment {
  id: string
  task_id: string
  name: string
  owner_id: string | null
}

export interface CommentRow {
  id: string
  task_id: string
  parent_id: string | null
  body: string
  likes: number
  created_at: string
  author_name: string
  author_avatar: string | null
}

export interface BoardData {
  project: Project
  statuses: Status[]
  groups: Group[]
  tasks: Task[]
  subtasks: SubTask[]
  attachments: Attachment[]
  comments: CommentRow[]
  members: Member[]
  docBlocks: unknown[]
}

// ======================== PROFILE ========================

export async function getSessionProfile(): Promise<Profile | null> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single()
  return (data as Profile) ?? null
}

export async function updateProfile(patch: Partial<Pick<Profile, 'name' | 'avatar_url'>>) {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await db.from('profiles').update(patch).eq('id', user.id)
  if (error) throw error
}

export async function changePassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password })
  if (error) throw error
}

// ======================== WORKSPACES ========================

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase()
    .from('workspaces')
    .select('id, name, owner_id')
    .order('created_at')
  if (error) throw error
  return (data as Workspace[]) ?? []
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  const { data, error } = await db
    .from('workspaces')
    .insert({ name, owner_id: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as Workspace
}

// ======================== PROJECTS ========================

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  let q = supabase().from('projects').select('*').order('created_at')
  if (workspaceId) q = q.eq('workspace_id', workspaceId)
  const { data, error } = await q
  if (error) throw error
  return (data as Project[]) ?? []
}

export async function createProject(input: {
  name: string
  scope?: string
  description?: string
  workspace_id?: string | null
}): Promise<Project> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  const { data, error } = await db
    .from('projects')
    .insert({ ...input, owner_id: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function findProject(scope: string, card?: string): Promise<Project | null> {
  const db = supabase()
  let q = db.from('projects').select('*')
  q = card ? q.eq('scope', scope).eq('name', card) : q.eq('id', scope)
  const { data } = await q.limit(1).maybeSingle()
  return (data as Project) ?? null
}

// ======================== BOARD ========================

export async function loadBoard(projectId: string): Promise<BoardData> {
  const db = supabase()
  const [project, statuses, groups, tasks, members, doc] = await Promise.all([
    db.from('projects').select('*').eq('id', projectId).single(),
    db.from('statuses').select('id, label, color_code, position').eq('project_id', projectId).order('position'),
    db.from('task_groups').select('id, title, color, position').eq('project_id', projectId).order('position'),
    db.from('tasks').select('*').eq('project_id', projectId).order('position'),
    db
      .from('project_members')
      .select('role, profiles(id, name, avatar_url)')
      .eq('project_id', projectId),
    db.from('docs').select('blocks').eq('project_id', projectId).maybeSingle(),
  ])

  const firstError = [project, statuses, groups, tasks, members, doc].find((r) => r.error)?.error
  if (firstError) throw firstError

  const taskIds = ((tasks.data as Task[]) ?? []).map((t) => t.id)
  const [subtasks, attachments, comments] = taskIds.length
    ? await Promise.all([
        db.from('subtasks').select('id, task_id, text, done, position').in('task_id', taskIds).order('position'),
        db.from('attachments').select('id, task_id, name, owner_id').in('task_id', taskIds),
        db
          .from('comments')
          .select('id, task_id, parent_id, body, likes, created_at, profiles(name, avatar_url)')
          .in('task_id', taskIds)
          .order('created_at'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  return {
    project: project.data as Project,
    statuses: (statuses.data as Status[]) ?? [],
    groups: (groups.data as Group[]) ?? [],
    tasks: (tasks.data as Task[]) ?? [],
    subtasks: (subtasks.data as SubTask[]) ?? [],
    attachments: (attachments.data as Attachment[]) ?? [],
    comments: ((comments.data ?? []) as any[]).map((row) => ({
      id: row.id,
      task_id: row.task_id,
      parent_id: row.parent_id,
      body: row.body,
      likes: row.likes,
      created_at: row.created_at,
      author_name: row.profiles?.name ?? 'Unknown',
      author_avatar: row.profiles?.avatar_url ?? null,
    })),
    members: (members.data ?? []).map((row: any) => ({
      id: row.profiles?.id,
      name: row.profiles?.name ?? 'Unknown',
      role: row.role ?? 'Member',
      avatar_url: row.profiles?.avatar_url ?? null,
    })),
    docBlocks: (doc.data?.blocks as unknown[]) ?? [],
  }
}

// ======================== TASKS ========================

export async function createTask(input: {
  project_id: string
  group_id?: string | null
  status_id?: string | null
  title: string
  description?: string
  priority?: Priority
  due_date?: string | null
  assignee_id?: string | null
  position?: number
}): Promise<Task> {
  const { data, error } = await supabase().from('tasks').insert(input).select().single()
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const { error } = await supabase().from('tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTasks(ids: string[]): Promise<void> {
  const { error } = await supabase().from('tasks').delete().in('id', ids)
  if (error) throw error
}

// ======================== GROUPS & STATUSES ========================

export async function createGroup(projectId: string, title: string, color: string, position: number) {
  const { data, error } = await supabase()
    .from('task_groups')
    .insert({ project_id: projectId, title, color, position })
    .select()
    .single()
  if (error) throw error
  return data as Group
}

export async function createStatus(
  projectId: string,
  label: string,
  colorCode: string,
  position: number,
) {
  const { data, error } = await supabase()
    .from('statuses')
    .insert({ project_id: projectId, label, color_code: colorCode, position })
    .select()
    .single()
  if (error) throw error
  return data as Status
}

export async function deleteStatus(id: string): Promise<void> {
  const { error } = await supabase().from('statuses').delete().eq('id', id)
  if (error) throw error
}

export async function updateStatusColor(id: string, colorCode: string): Promise<void> {
  const { error } = await supabase().from('statuses').update({ color_code: colorCode }).eq('id', id)
  if (error) throw error
}

// ======================== SUBTASKS & COMMENTS ========================

export async function addSubtask(taskId: string, text: string, position: number): Promise<SubTask> {
  const { data, error } = await supabase()
    .from('subtasks')
    .insert({ task_id: taskId, text, position })
    .select()
    .single()
  if (error) throw error
  return data as SubTask
}

export async function setSubtaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase().from('subtasks').update({ done }).eq('id', id)
  if (error) throw error
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase().from('subtasks').delete().eq('id', id)
  if (error) throw error
}

export async function addComment(taskId: string, body: string, parentId?: string | null): Promise<Comment> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  const { data, error } = await db
    .from('comments')
    .insert({ task_id: taskId, body, parent_id: parentId ?? null, author_id: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as Comment
}

export async function likeComment(id: string, likes: number): Promise<void> {
  const { error } = await supabase().from('comments').update({ likes }).eq('id', id)
  if (error) throw error
}

// ======================== DOC ========================

export async function saveDoc(projectId: string, blocks: unknown[]): Promise<void> {
  const { error } = await supabase()
    .from('docs')
    .upsert({ project_id: projectId, blocks }, { onConflict: 'project_id' })
  if (error) throw error
}

// ======================== MEMBERS ========================

export async function addMemberByEmail(projectId: string, email: string, role = 'member'): Promise<void> {
  const db = supabase()
  const { data: profile } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!profile) throw new Error(`No user found with email ${email}`)
  const { error } = await db
    .from('project_members')
    .upsert({ project_id: projectId, user_id: profile.id, role }, { onConflict: 'project_id,user_id' })
  if (error) throw error
}

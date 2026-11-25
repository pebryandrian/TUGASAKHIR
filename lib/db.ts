import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { applyProjectTemplate, pickTemplate } from '@/lib/template'

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
  /** Proyek yang sudah selesai dan disimpan di arsip. */
  archived?: boolean
  archived_at?: string | null
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
  parent_id: string | null
  assignee_id: string | null
  status_id: string | null
  due_date: string | null
  priority: string | null
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
  storage_path?: string | null
  /** Tautan (mis. Google Drive). Kosong bila lampiran berupa berkas yang diunggah. */
  url?: string | null
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

// Daftar anggota (dipakai section "My Member" di Home).
// Semua pengguna yang mendaftar otomatis ada di tabel `profiles` (dibuat oleh
// trigger saat sign up) dan default perannya 'member'.
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('id, name, email, role, avatar_url')
    .order('name')
  if (error) throw error
  return ((data ?? []) as Profile[]).map((p) => ({
    ...p,
    role: p.role === 'project_manager' ? 'project_manager' : 'member',
  }))
}

export async function changePassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password })
  if (error) throw error
}

// ======================== WORKSPACES ========================

// Siapa yang boleh mengelola workspace dan membuat project/scope (F-03/F-15):
//   * Project Manager pada minimal satu project, ATAU
//   * akun yang belum tergabung di project mana pun (pendaftar baru), supaya
//     pengguna pertama tidak terkunci di Home kosong dan tetap bisa membuat
//     project pertamanya.
// Member yang sudah tergabung di project TIDAK boleh menambah workspace,
// mengubah/menghapus workspace, atau membuat scope/card baru.
export async function canCreateProject(): Promise<boolean> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return false

  const { data: owned } = await db
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
  if ((owned ?? []).length > 0) return true

  const { data: mine } = await db
    .from('project_members')
    .select('role')
    .eq('user_id', user.id)
  const rows = (mine ?? []) as { role: string }[]
  if (rows.some((r) => r.role === 'project_manager')) return true
  return rows.length === 0
}

const NO_PROJECT_MANAGER_MESSAGE =
  'Hanya Project Manager yang dapat menambah atau mengubah workspace dan membuat project baru.'

async function assertCanManageProjects(): Promise<void> {
  if (!(await canCreateProject())) throw new Error(NO_PROJECT_MANAGER_MESSAGE)
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase()
    .from('workspaces')
    .select('id, name, owner_id')
    .order('created_at')
  if (error) throw error
  return (data as Workspace[]) ?? []
}

export async function createWorkspace(name: string): Promise<Workspace> {
  await assertCanManageProjects()
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

export async function renameWorkspace(id: string, name: string): Promise<void> {
  await assertCanManageProjects()
  const { error } = await supabase().from('workspaces').update({ name }).eq('id', id)
  if (error) throw error
}

// `projects.workspace_id` ON DELETE SET NULL: project TIDAK ikut terhapus, hanya
// kehilangan workspace-nya. `workspace_members` CASCADE, jadi keanggotaan ikut hilang.
export async function deleteWorkspace(id: string): Promise<void> {
  await assertCanManageProjects()
  const { error } = await supabase().from('workspaces').delete().eq('id', id)
  if (error) throw error
}

// Pemilih workspace butuh minimal satu workspace untuk ditampilkan. Kalau akun
// belum punya, buat satu default supaya sidebar tidak kosong dan project baru
// punya tempat bergabung.
export async function ensureDefaultWorkspace(name = '2026 INVISUAL'): Promise<Workspace | null> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null

  const { data: rows, error } = await db
    .from('workspaces')
    .select('id, name, owner_id')
    .order('created_at')
    .limit(1)
  if (error) throw error
  if (rows && rows.length > 0) return rows[0] as Workspace

  const { data, error: insertError } = await db
    .from('workspaces')
    .insert({ name, owner_id: user.id })
    .select('id, name, owner_id')
    .single()
  if (insertError) throw insertError

  // Daftarkan pemilik sebagai anggota workspace (dipakai policy RLS workspace).
  await db
    .from('workspace_members')
    .insert({ workspace_id: data.id, user_id: user.id })
    .then(() => undefined, () => undefined)

  return data as Workspace
}

// ======================== ARSIP PROYEK ========================

// Kolom `projects.archived` hanya ada setelah migrasi
// 20261128000000_project_archive.sql dijalankan. Sebelum itu, penanda arsip
// disimpan di localStorage agar fitur tetap bisa dipakai.
let projectArchiveColumn: Promise<boolean> | null = null

export function hasProjectArchiveSupport(): Promise<boolean> {
  projectArchiveColumn ??= (async () => {
    try {
      const { error } = await supabase().from('projects').select('archived').limit(1)
      return !error
    } catch {
      return false
    }
  })()
  return projectArchiveColumn
}

const ARCHIVE_STORAGE_KEY = 'invisual.archived-projects'

function readLocalArchive(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeLocalArchive(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))))
  } catch {
    // Penyimpanan lokal tidak tersedia: arsip hanya berlaku untuk sesi ini.
  }
}

/** ID proyek yang diarsipkan (dari basis data bila kolomnya ada). */
export async function listArchivedProjectIds(): Promise<Set<string>> {
  if (await hasProjectArchiveSupport()) {
    const { data, error } = await supabase().from('projects').select('id').eq('archived', true)
    if (error) throw error
    return new Set(((data ?? []) as { id: string }[]).map((r) => r.id))
  }
  return new Set(readLocalArchive())
}

/** Arsipkan atau keluarkan proyek dari arsip. Hanya Project Manager. */
export async function setProjectArchived(projectId: string, archived: boolean): Promise<void> {
  await assertProjectManager(projectId)

  if (await hasProjectArchiveSupport()) {
    const { error } = await supabase()
      .from('projects')
      .update({ archived, archived_at: archived ? new Date().toISOString() : null })
      .eq('id', projectId)
    if (error) throw error
    return
  }

  const ids = readLocalArchive().filter((id) => id !== projectId)
  if (archived) ids.push(projectId)
  writeLocalArchive(ids)
}

// ======================== PROJECTS ========================

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  const db = supabase()
  const { data, error } = await db.from('projects').select('*').order('created_at')
  if (error) throw error

  const {
    data: { user },
  } = await db.auth.getUser()

  let rows = (data as Project[]) ?? []

  // Daftar proyek mengikuti workspace aktif (F-15, Tabel 3.5 skenario 16).
  // Sebelumnya proyek dari workspace yang tidak terlihat oleh pengguna tetap
  // ditampilkan, sehingga daftar tidak lagi mencerminkan workspace aktif.
  // Agar perilaku ini konsisten, seluruh proyek contoh ditempatkan pada satu
  // workspace yang diikuti oleh Project Manager maupun Member.
  if (workspaceId) {
    rows = rows.filter((p) => p.workspace_id === workspaceId)
  }

  // Penanda arsip dinormalkan agar pemanggil tidak perlu tahu apakah kolom
  // `projects.archived` sudah ada atau masih memakai localStorage.
  const archivedIds = await listArchivedProjectIds().catch(() => new Set<string>())
  rows = rows.map((p) => ({ ...p, archived: p.archived === true || archivedIds.has(p.id) }))

  // Undangan yang belum diterima tidak boleh menampilkan isi project.
  // (RLS juga menanganinya lewat is_project_member, ini lapisan kedua.)
  if (await hasInvitationSupport()) {
    if (!user) return []
    const { data: mine } = await db
      .from('project_members')
      .select('project_id, status')
      .eq('user_id', user.id)
      .eq('status', 'invited')
    const pending = new Set(
      ((mine ?? []) as { project_id: string }[]).map((m) => m.project_id),
    )
    return rows.filter((p) => p.owner_id === user.id || !pending.has(p.id))
  }

  return rows
}

export async function createProject(
  input: {
    name: string
    scope?: string
    description?: string
    /** Jadwal proyek (UC-01: nama, deskripsi, dan jadwal diisi saat membuat). */
    start_date?: string | null
    due_date?: string | null
    workspace_id?: string | null
  },
  options: { template?: boolean } = {},
): Promise<Project> {
  await assertCanManageProjects()
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()

  // Project selalu punya workspace: pakai yang diberikan, atau workspace default.
  const workspaceId =
    input.workspace_id ?? (await ensureDefaultWorkspace().catch(() => null))?.id ?? null

  const { data, error } = await db
    .from('projects')
    .insert({ ...input, workspace_id: workspaceId, owner_id: user?.id })
    .select()
    .single()
  if (error) throw error

  const project = data as Project

  // Isi project dengan template contoh (grup, tugas, subtask, doc) supaya board
  // tidak kosong. Kegagalan template tidak membatalkan project yang sudah dibuat.
  if (options.template !== false) {
    try {
      await applyProjectTemplate(project.id, pickTemplate(project.name, project.scope))
    } catch (err) {
      console.warn('Template project gagal diterapkan:', err)
    }
  }

  return project
}

// Ringkasan progres per project: jumlah tugas & yang sudah selesai.
// Dipakai kartu di Home supaya progress bar mencerminkan data nyata.
//
// Tugas dianggap selesai bila dicentang ATAU statusnya "Done". Sebelumnya hanya
// `checked` yang dihitung, sehingga project yang seluruh tugasnya sudah
// dipindahkan ke status Done tetap tampil "0/8 tugas selesai".
export async function listProjectTaskStats(): Promise<
  Record<string, { total: number; done: number }>
> {
  const db = supabase()
  const [tasks, statuses] = await Promise.all([
    db.from('tasks').select('project_id, checked, status_id'),
    db.from('statuses').select('id, label'),
  ])
  if (tasks.error) throw tasks.error
  if (statuses.error) throw statuses.error

  const doneStatusIds = new Set(
    ((statuses.data ?? []) as { id: string; label: string }[])
      .filter((s) => s.label.trim().toLowerCase() === 'done')
      .map((s) => s.id),
  )

  const stats: Record<string, { total: number; done: number }> = {}
  for (const row of (tasks.data ?? []) as {
    project_id: string | null
    checked: boolean
    status_id: string | null
  }[]) {
    if (!row.project_id) continue
    const entry = (stats[row.project_id] ??= { total: 0, done: 0 })
    entry.total += 1
    const isDone = row.checked || (row.status_id !== null && doneStatusIds.has(row.status_id))
    if (isDone) entry.done += 1
  }
  return stats
}

// Peran pengguna pada setiap project yang terlihat olehnya.
// Pemilik project selalu dianggap Project Manager, sama seperti `fetchProjectRole`.
export type ProjectRoleMap = Record<string, 'project_manager' | 'member'>

export async function listProjectRoles(): Promise<ProjectRoleMap> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return {}

  const [owned, mine] = await Promise.all([
    db.from('projects').select('id').eq('owner_id', user.id),
    db.from('project_members').select('project_id, role').eq('user_id', user.id),
  ])

  const roles: ProjectRoleMap = {}
  for (const row of (owned.data ?? []) as { id: string }[]) roles[row.id] = 'project_manager'
  for (const row of (mine.data ?? []) as { project_id: string; role: string }[]) {
    if (roles[row.project_id]) continue
    roles[row.project_id] = row.role === 'project_manager' ? 'project_manager' : 'member'
  }
  return roles
}

// Anggota aktif per project, dipakai ikon orang pada kartu project di Scope Of
// Work. Undangan yang belum diterima (status 'invited') tidak ikut dihitung.
export interface ProjectMemberChip {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

export async function listProjectMemberChips(): Promise<Record<string, ProjectMemberChip[]>> {
  const db = supabase()
  const invites = await hasInvitationSupport()
  const columns = `project_id, role${invites ? ', status' : ''}, profiles!project_members_user_id_fkey(id, name, avatar_url)`

  const { data, error } = await db.from('project_members').select(columns)
  if (error) throw error

  const chips: Record<string, ProjectMemberChip[]> = {}
  for (const row of (data ?? []) as any[]) {
    if (invites && row.status && row.status !== 'active') continue
    const person = row.profiles
    if (!person?.id) continue
    const list = (chips[row.project_id] ??= [])
    if (list.some((m) => m.id === person.id)) continue
    list.push({
      id: person.id,
      name: person.name ?? 'Tanpa nama',
      avatar_url: person.avatar_url ?? null,
      role: row.role ?? 'member',
    })
  }
  return chips
}

// Ubah/hapus project hanya untuk Project Manager. Pemeriksaan ini lapisan
// kedua: kebijakan RLS (20261114000000_rls_roles.sql) juga menolaknya, tetapi
// tanpa pesan yang jelas untuk pengguna.
async function assertProjectManager(projectId: string): Promise<void> {
  const roles = await listProjectRoles().catch(() => ({}) as ProjectRoleMap)
  if (roles[projectId] !== 'project_manager') {
    throw new Error('Hanya Project Manager yang dapat mengubah atau menghapus project ini.')
  }
}

// Ubah informasi project (F-03: mengubah proyek).
export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'name' | 'description' | 'scope' | 'progress' | 'start_date' | 'due_date'>>,
): Promise<void> {
  await assertProjectManager(id)
  const { error } = await supabase().from('projects').update(patch).eq('id', id)
  if (error) throw error
}

// Hapus project (F-03). Anak-anak (grup, status, tugas, doc) ikut terhapus lewat CASCADE.
export async function deleteProject(id: string): Promise<void> {
  await assertProjectManager(id)
  const { error } = await supabase().from('projects').delete().eq('id', id)
  if (error) throw error
}

// URL memakai slug ("/project/studio-client/aqua"), sedangkan database menyimpan
// nilai asli ("Studio Client", "Aqua"). Karena itu pencocokan dilakukan lewat slug,
// bukan perbandingan string mentah — kalau tidak, project tidak pernah ketemu dan
// halaman jatuh ke data contoh.
export async function findProject(scope: string, card?: string): Promise<Project | null> {
  const db = supabase()

  if (!card) {
    const { data } = await db.from('projects').select('*').eq('id', scope).maybeSingle()
    return (data as Project) ?? null
  }

  const { data, error } = await db.from('projects').select('*')
  if (error) throw error

  const targetScope = slugify(scope)
  const targetCard = slugify(card)
  return (
    ((data as Project[]) ?? []).find(
      (p) => slugify(p.scope) === targetScope && slugify(p.name) === targetCard,
    ) ?? null
  )
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
      // Nama constraint harus eksplisit: tabel ini punya dua relasi ke profiles
      // (user_id dan invited_by), sehingga embed tanpa nama jadi ambigu.
      .select('role, profiles!project_members_user_id_fkey(id, name, avatar_url)')
      .eq('project_id', projectId),
    db.from('docs').select('blocks').eq('project_id', projectId).maybeSingle(),
  ])

  const firstError = [project, statuses, groups, tasks, members, doc].find((r) => r.error)?.error
  if (firstError) throw firstError

  const taskIds = ((tasks.data as Task[]) ?? []).map((t) => t.id)
  const withUrl = await hasAttachmentUrlSupport()
  const attachmentColumns = `id, task_id, name, owner_id, storage_path${withUrl ? ', url' : ''}`
  const [subtasks, attachments, comments] = taskIds.length
    ? await Promise.all([
        // `*` agar tetap jalan walau kolom meta subtask (assignee/status/due/priority) belum dimigrasi.
        db.from('subtasks').select('*').in('task_id', taskIds).order('position'),
        db.from('attachments').select(attachmentColumns).in('task_id', taskIds),
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

export const NOT_ALLOWED_TASK_UPDATE_MESSAGE =
  'Perubahan tidak tersimpan: Anda hanya dapat mengubah tugas yang ditugaskan kepada Anda. Minta Project Manager menugaskan tugas ini kepada Anda.'

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const { data, error } = await supabase()
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select('id')
  if (error) throw error
  // RLS membatasi Member pada tugas yang ditugaskan kepadanya. Tanpa
  // pemeriksaan ini, perubahan "berhasil" tanpa menyimpan apa pun (0 baris).
  if (!data || data.length === 0) throw new Error(NOT_ALLOWED_TASK_UPDATE_MESSAGE)
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

// Kolom meta subtask (assignee/status/tenggat/prioritas) hanya ada kalau migrasi
// `supabase/migrations/*_subtask_meta.sql` sudah dijalankan di project Supabase.
// Kolomnya dideteksi sekali, lalu patch disaring agar tidak memicu error
// "Could not find the 'status_id' column of 'subtasks' in the schema cache".
const SUBTASK_META_COLUMNS = ['assignee_id', 'status_id', 'due_date', 'priority'] as const

export const MISSING_SUBTASK_COLUMNS_MESSAGE =
  'Kolom meta subtask belum ada di database. Jalankan migrasi supabase/migrations/20261113000000_subtask_meta.sql di Supabase → SQL Editor.'

export const MISSING_INVITATION_POLICY_MESSAGE =
  'Undangan belum dapat diproses karena kebijakan akses database belum diperbarui. Jalankan migrasi supabase/migrations/20261123000000_project_invitations.sql di Supabase → SQL Editor.'

let subtaskColumnsPromise: Promise<Set<string>> | null = null

export function getSubtaskColumns(): Promise<Set<string>> {
  subtaskColumnsPromise ??= (async () => {
    const available = new Set<string>(['id', 'task_id', 'parent_id', 'text', 'done', 'position'])
    try {
      const { error } = await supabase()
        .from('subtasks')
        .select(SUBTASK_META_COLUMNS.join(','))
        .limit(1)
      if (!error) {
        SUBTASK_META_COLUMNS.forEach((c) => available.add(c))
        return available
      }
      // Sebagian kolom mungkin sudah ada: cek satu per satu.
      for (const column of SUBTASK_META_COLUMNS) {
        const { error: columnError } = await supabase()
          .from('subtasks')
          .select(column)
          .limit(1)
        if (!columnError) available.add(column)
      }
      return available
    } catch {
      return available
    }
  })()
  return subtaskColumnsPromise
}

export async function addSubtask(
  taskId: string,
  text: string,
  position: number,
  parentId: string | null = null,
): Promise<SubTask> {
  const { data, error } = await supabase()
    .from('subtasks')
    .insert({ task_id: taskId, text, position, parent_id: parentId })
    .select()
    .single()
  if (error) throw error
  return data as SubTask
}

export async function setSubtaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase().from('subtasks').update({ done }).eq('id', id)
  if (error) throw error
}

// Update meta subtask (assignee/status/due date/priority) dari baris Main Table.
export async function updateSubtask(
  id: string,
  patch: Partial<Pick<SubTask, 'assignee_id' | 'status_id' | 'due_date' | 'priority'>>,
): Promise<void> {
  const columns = await getSubtaskColumns()
  const usable = Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => value !== undefined && columns.has(key)),
  )
  // Semua kolom yang dikirim belum ada di database: tidak ada yang bisa disimpan.
  if (Object.keys(usable).length === 0) {
    throw new Error(MISSING_SUBTASK_COLUMNS_MESSAGE)
  }
  const { error } = await supabase().from('subtasks').update(usable).eq('id', id)
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

export async function addAttachment(taskId: string, name: string): Promise<Attachment> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  const { data, error } = await db
    .from('attachments')
    .insert({ task_id: taskId, name, owner_id: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as Attachment
}

export async function deleteAttachment(id: string): Promise<void> {
  const { error } = await supabase().from('attachments').delete().eq('id', id)
  if (error) throw error
}

export interface NotificationItem {
  id: string
  task_id: string
  body: string
  likes: number
  created_at: string
  author_name: string
  author_avatar: string | null
  scope: string
  board: string
  group_title: string
  task_title: string
}

// Notifikasi = komentar pada semua task yang boleh dibaca user (RLS `cm_all`).
export async function listNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase()
    .from('comments')
    .select(
      'id, task_id, body, likes, created_at, profiles(name, avatar_url), tasks(title, task_groups(title), projects(name, scope))',
    )
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    task_id: row.task_id,
    body: row.body,
    likes: row.likes ?? 0,
    created_at: row.created_at,
    author_name: row.profiles?.name ?? 'Unknown',
    author_avatar: row.profiles?.avatar_url ?? null,
    scope: row.tasks?.projects?.scope ?? '',
    board: row.tasks?.projects?.name ?? '',
    group_title: row.tasks?.task_groups?.title ?? '',
    task_title: row.tasks?.title ?? '',
  }))
}

// ======================== DOC ========================

export async function saveDoc(projectId: string, blocks: unknown[]): Promise<void> {
  const { error } = await supabase()
    .from('docs')
    .upsert({ project_id: projectId, blocks }, { onConflict: 'project_id' })
  if (error) throw error
}

// ======================== MEMBERS & UNDANGAN ========================

// Kolom `status` pada project_members hanya ada setelah migrasi
// 20261123000000_project_invitations.sql dijalankan. Dideteksi sekali, lalu
// dipakai untuk memutuskan apakah undangan perlu diterima lebih dulu.
let memberStatusColumn: Promise<boolean> | null = null

export function hasInvitationSupport(): Promise<boolean> {
  memberStatusColumn ??= (async () => {
    try {
      const { error } = await supabase()
        .from('project_members')
        .select('status')
        .limit(1)
      return !error
    } catch {
      return false
    }
  })()
  return memberStatusColumn
}

// Mengundang anggota lewat email. Bila kolom `status` sudah ada, undangan
// disimpan sebagai 'invited' dan menunggu persetujuan; bila belum, anggota
// langsung ditambahkan seperti sebelumnya.
export async function addMemberByEmail(
  projectId: string,
  email: string,
  role = 'member',
): Promise<{ invited: boolean }> {
  const db = supabase()
  const normalized = email.trim().toLowerCase()
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (!profile) throw new Error(`Belum ada akun dengan email ${normalized}`)

  const {
    data: { user },
  } = await db.auth.getUser()

  const invites = await hasInvitationSupport()
  const row: Record<string, unknown> = {
    project_id: projectId,
    user_id: profile.id,
    role,
  }
  if (invites) {
    row.status = 'invited'
    row.invited_by = user?.id ?? null
    row.invited_at = new Date().toISOString()
  }

  const { error } = await db
    .from('project_members')
    .upsert(row, { onConflict: 'project_id,user_id' })
  if (error) throw error

  return { invited: invites }
}

export interface InvitationItem {
  project_id: string
  project_name: string
  project_scope: string | null
  role: 'project_manager' | 'member'
  invited_by_name: string | null
  invited_at: string
}

// Undangan yang belum dijawab oleh pengguna yang sedang login.
export async function listMyInvitations(): Promise<InvitationItem[]> {
  if (!(await hasInvitationSupport())) return []

  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return []

  const { data, error } = await db
    .from('project_members')
    .select('project_id, role, invited_at, projects(name, scope), inviter:profiles!project_members_invited_by_fkey(name)')
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .order('invited_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as any[]).map((row) => ({
    project_id: row.project_id,
    project_name: row.projects?.name ?? 'Project',
    project_scope: row.projects?.scope ?? null,
    role: row.role === 'project_manager' ? 'project_manager' : 'member',
    invited_by_name: row.inviter?.name ?? null,
    invited_at: row.invited_at ?? new Date().toISOString(),
  }))
}

// Menerima atau menolak undangan. Menolak = menghapus baris keanggotaan.
export async function respondToInvitation(projectId: string, accept: boolean): Promise<void> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error('Harus login.')

  if (accept) {
    const { data, error } = await db
      .from('project_members')
      .update({ status: 'active' })
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .select('project_id')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(MISSING_INVITATION_POLICY_MESSAGE)
    }
    return
  }

  const { data, error } = await db
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .select('project_id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(MISSING_INVITATION_POLICY_MESSAGE)
  }
}

// Apakah pengguna ini Project Manager pada minimal satu project?
// Dipakai Home untuk memilih tampilan: My Member (PM) atau Tugas Saya (Member).
export async function hasManagerRole(): Promise<boolean> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return false

  const { data: owned } = await db
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
  if ((owned ?? []).length > 0) return true

  const { data: managed } = await db
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('role', 'project_manager')
    .limit(1)
  return (managed ?? []).length > 0
}

// ======================== TUGAS SAYA (POV MEMBER) ========================

export interface MyTaskItem {
  id: string
  title: string
  due_date: string | null
  priority: Priority
  checked: boolean
  status_label: string | null
  status_color: string | null
  group_title: string | null
  project_id: string
  project_name: string
  project_scope: string | null
  subtask_total: number
  subtask_done: number
  /** Selisih hari terhadap hari ini (negatif = sudah lewat). */
  days_left: number | null
}

// Tugas yang ditugaskan kepada pengguna yang sedang login, diurutkan dari
// tenggat terdekat. Dipakai kartu "Tugas Saya" di Home versi Member.
export async function listMyTasks(limit = 12): Promise<MyTaskItem[]> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return []

  const { data, error } = await db
    .from('tasks')
    .select(
      'id, title, due_date, priority, checked, projects(id, name, scope), statuses(label, color_code), task_groups(title)',
    )
    .eq('assignee_id', user.id)
    .eq('checked', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit)
  if (error) throw error

  const rows = ((data ?? []) as any[]).filter(
    // Tugas berstatus "Done" tidak perlu muncul lagi di daftar tugas aktif,
    // walaupun kotak centangnya belum ditandai.
    (r) => (r.statuses?.label ?? '').trim().toLowerCase() !== 'done',
  )
  const taskIds = rows.map((r) => r.id)

  // Hitung progres subtask untuk tiap tugas.
  const progress = new Map<string, { total: number; done: number }>()
  if (taskIds.length) {
    const { data: subs } = await db
      .from('subtasks')
      .select('task_id, done')
      .in('task_id', taskIds)
    for (const s of (subs ?? []) as { task_id: string; done: boolean }[]) {
      const entry = progress.get(s.task_id) ?? { total: 0, done: 0 }
      entry.total += 1
      if (s.done) entry.done += 1
      progress.set(s.task_id, entry)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return rows.map((row) => {
    const due = row.due_date ? new Date(row.due_date) : null
    const daysLeft = due
      ? Math.round((due.getTime() - today.getTime()) / 86400000)
      : null
    const stat = progress.get(row.id) ?? { total: 0, done: 0 }
    return {
      id: row.id,
      title: row.title,
      due_date: row.due_date ?? null,
      priority: row.priority ?? 'medium',
      checked: row.checked ?? false,
      status_label: row.statuses?.label ?? null,
      status_color: row.statuses?.color_code ?? null,
      group_title: row.task_groups?.title ?? null,
      project_id: row.projects?.id ?? '',
      project_name: row.projects?.name ?? '',
      project_scope: row.projects?.scope ?? null,
      subtask_total: stat.total,
      subtask_done: stat.done,
      days_left: daysLeft,
    }
  })
}

// Tetapkan peran anggota pada project (UC-03: mengelola pengguna dan hak akses).
export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'project_manager' | 'member',
): Promise<void> {
  const { error } = await supabase()
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}

// Daftar anggota satu project beserta email (dipakai halaman Anggota Proyek).
export interface ProjectMemberRow {
  id: string
  name: string
  email: string
  role: 'project_manager' | 'member'
  avatar_url: string | null
  /** 'invited' bila undangan belum diterima (butuh migrasi undangan). */
  status: 'active' | 'invited'
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberRow[]> {
  const invites = await hasInvitationSupport()
  // `profiles!project_members_user_id_fkey` — tabel ini punya dua relasi ke
  // profiles (user_id dan invited_by), jadi nama constraint wajib disebut.
  const columns = invites
    ? 'role, status, profiles!project_members_user_id_fkey(id, name, email, avatar_url)'
    : 'role, profiles!project_members_user_id_fkey(id, name, email, avatar_url)'

  const { data, error } = await supabase()
    .from('project_members')
    .select(columns)
    .eq('project_id', projectId)
  if (error) throw error

  return ((data ?? []) as any[])
    .filter((row) => row.profiles)
    .map(
      (row): ProjectMemberRow => ({
        id: row.profiles.id,
        name: row.profiles.name ?? 'Unknown',
        email: row.profiles.email ?? '',
        role: row.role === 'project_manager' ? 'project_manager' : 'member',
        avatar_url: row.profiles.avatar_url ?? null,
        status: row.status === 'invited' ? 'invited' : 'active',
      }),
    )
    .sort((a, b) => {
      // Anggota aktif lebih dulu, undangan menyusul.
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}

// ======================== PERAN ANGGOTA TIM (My Member) ========================

// Pilihan peran yang boleh diberikan dari halaman Home: hanya dua ini.
export type TeamRole = 'project_manager' | 'member'

export interface TeamRoleInfo {
  role: TeamRole
  /** Jumlah project (milik PM ini) yang diikuti orang tersebut. */
  projects: number
}

export const MISSING_TEAM_ROLE_POLICY_MESSAGE =
  'Peran belum dapat diubah karena kebijakan akses database belum diperbarui. Jalankan migrasi supabase/migrations/20261125000000_team_member_roles.sql di Supabase → SQL Editor, atau tambahkan orang tersebut ke salah satu project Anda lebih dulu.'

// Project yang dikelola pengguna ini: miliknya sendiri atau tempat ia berperan PM.
async function managedProjectIds(workspaceId?: string | null): Promise<Set<string>> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return new Set()

  const [{ data: owned }, { data: managed }] = await Promise.all([
    db.from('projects').select('id, workspace_id').eq('owner_id', user.id),
    db.from('project_members').select('project_id').eq('user_id', user.id).eq('role', 'project_manager'),
  ])

  const all = new Set<string>()
  for (const row of (owned ?? []) as { id: string; workspace_id: string | null }[]) {
    if (!workspaceId || row.workspace_id === workspaceId) all.add(row.id)
  }
  for (const row of (managed ?? []) as { project_id: string }[]) all.add(row.project_id)

  // Saat workspace dipilih, batasi ke project di workspace tersebut.
  if (workspaceId) {
    const { data: projects } = await db.from('projects').select('id, workspace_id').in('id', [...all])
    for (const row of (projects ?? []) as { id: string; workspace_id: string | null }[]) {
      if (row.workspace_id !== workspaceId) all.delete(row.id)
    }
  }
  return all
}

// Peran anggota pada project yang dikelola PM ini. Dipakai "My Member" supaya
// yang tampil adalah peran yang benar-benar berlaku, bukan label kosong.
export async function listTeamRoles(
  workspaceId?: string | null,
): Promise<Record<string, TeamRoleInfo>> {
  const db = supabase()
  const projectIds = await managedProjectIds(workspaceId)
  if (projectIds.size === 0) return {}

  const { data, error } = await db
    .from('project_members')
    .select('user_id, project_id, role')
    .in('project_id', [...projectIds])
  if (error) throw error

  const info: Record<string, TeamRoleInfo> = {}
  for (const row of (data ?? []) as { user_id: string; role: string }[]) {
    const entry = (info[row.user_id] ??= { role: 'member', projects: 0 })
    entry.projects += 1
    if (row.role === 'project_manager') entry.role = 'project_manager'
  }
  return info
}

// Ubah peran anggota dari "My Member" (Home, POV Project Manager).
//
// Peran diterapkan pada dua tempat:
//  1. Baris keanggotaan di semua project yang dikelola PM ini (langsung berlaku).
//  2. `profiles.role` sebagai peran default pengguna (butuh migrasi
//     20261125000000_team_member_roles.sql; diabaikan bila belum dijalankan).
// Baris keanggotaan yang belum ada TIDAK dibuat, supaya PM tidak diam-diam
// menambahkan orang ke project yang belum diikuti.
export async function updateTeamMemberRole(
  userId: string,
  role: TeamRole,
  workspaceId?: string | null,
): Promise<{ labelUpdated: boolean; projectsUpdated: number }> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error('Harus login.')

  if (user.id === userId) {
    throw new Error('Anda tidak dapat mengubah peran Anda sendiri.')
  }
  if (role !== 'member' && role !== 'project_manager') {
    throw new Error('Peran hanya boleh Member atau Project Manager.')
  }

  // 1. Project yang dikelola PM ini (project milik target dilewati agar tidak menurunkan PM lain).
  const projectIds = await managedProjectIds(workspaceId)
  let projectsUpdated = 0
  if (projectIds.size > 0) {
    const { data: ownedByTarget } = await db
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .in('id', [...projectIds])
    const skip = new Set(((ownedByTarget ?? []) as { id: string }[]).map((p) => p.id))

    const { data: rows } = await db
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', userId)
      .in('project_id', [...projectIds])

    for (const row of (rows ?? []) as { project_id: string; role: string }[]) {
      if (skip.has(row.project_id) || row.role === role) continue
      const { error } = await db
        .from('project_members')
        .update({ role })
        .eq('project_id', row.project_id)
        .eq('user_id', userId)
      if (error) throw error
      projectsUpdated += 1
    }
  }

  // 2. Peran default pengguna. Sebelum migrasi dijalankan RLS menolak dengan
  //    0 baris (bukan error), jadi hasilnya dilaporkan lewat `labelUpdated`.
  const { data: updated, error } = await db
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id')
  const labelUpdated = !error && Boolean(updated && updated.length > 0)

  if (!labelUpdated && projectsUpdated === 0) {
    throw new Error(MISSING_TEAM_ROLE_POLICY_MESSAGE)
  }

  return { labelUpdated, projectsUpdated }
}

// ======================== FAVORIT (kolom project_members.favorite) ========================

// Favorit disimpan di basis data sesuai kamus data Tabel 4.7, bukan di localStorage,
// supaya ikut terbawa saat pengguna membuka aplikasi dari perangkat lain.
export async function listFavoriteProjects(): Promise<
  { id: string; name: string; scope: string | null }[]
> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const { data, error } = await db
    .from('project_members')
    .select('project_id, favorite, projects(id, name, scope)')
    .eq('user_id', user.id)
    .eq('favorite', true)
  if (error) throw error

  return ((data ?? []) as any[])
    .map((row) => row.projects)
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, name: p.name, scope: p.scope ?? null }))
}

export async function setProjectFavorite(projectId: string, favorite: boolean): Promise<void> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await db
    .from('project_members')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('project_members')
      .update({ favorite })
      .eq('project_id', projectId)
      .eq('user_id', user.id)
    if (error) throw error
    return
  }

  const { error } = await db
    .from('project_members')
    .insert({ project_id: projectId, user_id: user.id, role: 'member', favorite })
  if (error) throw error
}

// ======================== LAMPIRAN (F-12: berkas & tautan) ========================

export const ATTACHMENT_BUCKET = 'task-attachments'
export const MISSING_BUCKET_MESSAGE =
  'Penyimpanan lampiran belum siap. Jalankan migrasi supabase/migrations/20261114000001_attachments_storage.sql di Supabase → SQL Editor.'

// Kolom `attachments.url` (untuk lampiran berupa tautan, mis. Google Drive) hanya
// ada setelah migrasi 20261127000000_attachment_links.sql dijalankan. Sebelum
// migrasi, tautan disimpan di `storage_path` dengan awalan `link:` agar fitur
// tetap bisa dipakai. Kedua bentuk dibaca kembali dengan cara yang sama.
const LINK_PREFIX = 'link:'
let attachmentUrlColumn: Promise<boolean> | null = null

export function hasAttachmentUrlSupport(): Promise<boolean> {
  attachmentUrlColumn ??= (async () => {
    try {
      const { error } = await supabase().from('attachments').select('url').limit(1)
      return !error
    } catch {
      return false
    }
  })()
  return attachmentUrlColumn
}

/** True bila nilai `storage_path` sebenarnya berisi tautan (mode kompatibilitas). */
export function isLinkPath(storagePath: string | null | undefined): boolean {
  return Boolean(storagePath && storagePath.startsWith(LINK_PREFIX))
}

export function linkUrlFromPath(storagePath: string | null | undefined): string | null {
  if (!isLinkPath(storagePath)) return null
  return (storagePath as string).slice(LINK_PREFIX.length)
}

/** Ambil tautan dari baris lampiran (kolom `url` atau mode kompatibilitas). */
export function attachmentLinkOf(row: { url?: string | null; storage_path?: string | null }): string | null {
  if (row.url && row.url.trim()) return row.url.trim()
  return linkUrlFromPath(row.storage_path)
}

/** Samakan tautan yang ditempel pengguna: tambahkan https:// bila belum ada skema. */
export function normalizeLink(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

// Tambahkan lampiran berupa TAUTAN (mis. Google Drive/Docs). Tidak butuh Storage,
// jadi tetap bisa dipakai walau bucket lampiran belum dibuat.
export async function addAttachmentLink(
  taskId: string,
  name: string,
  rawUrl: string,
): Promise<Attachment> {
  const db = supabase()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error('Harus login untuk menambahkan lampiran.')

  const link = normalizeLink(rawUrl)
  if (!link) throw new Error('Tautan tidak valid. Contoh: https://drive.google.com/file/d/...')

  const label = name.trim() || 'Tautan Drive'
  const supportsUrl = await hasAttachmentUrlSupport()

  const payload: Record<string, unknown> = {
    task_id: taskId,
    name: label,
    owner_id: user.id,
  }
  if (supportsUrl) payload.url = link
  else payload.storage_path = `${LINK_PREFIX}${link}`

  const { data, error } = await db.from('attachments').insert(payload).select().single()
  if (error) throw error
  return data as Attachment
}

// Unggah berkas ke Supabase Storage lalu catat metadatanya di tabel attachments.
export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Harus login untuk mengunggah lampiran.')

  const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
  const path = `${taskId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    // Bucket belum dibuat / policy belum ada.
    if (/bucket|not found|policy|row-level/i.test(uploadError.message)) {
      throw new Error(MISSING_BUCKET_MESSAGE)
    }
    throw uploadError
  }

  const { data, error } = await db
    .from('attachments')
    .insert({ task_id: taskId, name: file.name, storage_path: path, owner_id: user.id })
    .select()
    .single()

  if (error) {
    // Bersihkan berkas agar tidak menjadi sampah bila pencatatan gagal.
    await db.storage.from(ATTACHMENT_BUCKET).remove([path])
    throw error
  }

  return data as Attachment
}

// Tautan sementara untuk membuka berkas lampiran (bucket privat).
export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase()
    .storage.from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60)
  if (error) return null
  return data?.signedUrl ?? null
}

export async function deleteAttachmentWithFile(id: string, storagePath: string | null): Promise<void> {
  const db = supabase()
  // Mode kompatibilitas: `storage_path` bisa berisi tautan (`link:`), bukan
  // berkas di Storage, jadi tidak ada objek yang perlu dihapus.
  if (storagePath && !isLinkPath(storagePath)) {
    await db.storage.from(ATTACHMENT_BUCKET).remove([storagePath])
  }
  const { error } = await db.from('attachments').delete().eq('id', id)
  if (error) throw error
}

// ======================== FOTO PROFIL (F-14) ========================

export const AVATAR_BUCKET = 'avatars'
export const MISSING_AVATAR_BUCKET_MESSAGE =
  'Penyimpanan foto profil belum siap. Jalankan migrasi supabase/migrations/20261114000002_storage_avatars_docs.sql di Supabase → SQL Editor.'

// Foto profil disimpan di Supabase Storage (bukan base64 di kolom tabel), sesuai
// Subbab 4.2.1. Bucket bersifat publik sehingga URL-nya bisa dipakai langsung.
export async function uploadAvatar(file: File): Promise<string> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Harus login untuk mengunggah foto profil.')

  if (!file.type.startsWith('image/')) throw new Error('Berkas harus berupa gambar.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 2 MB.')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) {
    if (/bucket|not found|policy|row-level/i.test(error.message)) {
      throw new Error(MISSING_AVATAR_BUCKET_MESSAGE)
    }
    throw error
  }

  return db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}

// ======================== BERKAS DOKUMEN PROYEK (F-11) ========================

export const DOC_BUCKET = 'project-docs'
export const MISSING_DOC_BUCKET_MESSAGE =
  'Penyimpanan berkas dokumen belum siap. Jalankan migrasi supabase/migrations/20261114000002_storage_avatars_docs.sql di Supabase → SQL Editor.'

export interface UploadedDocFile {
  url: string
  name: string
  size: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Unggah berkas (gambar atau dokumen) untuk blok pada tab Doc.
export async function uploadDocFile(projectId: string, file: File): Promise<UploadedDocFile> {
  const db = supabase()
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
  const path = `${projectId}/${Date.now()}-${safeName}`

  const { error } = await db.storage
    .from(DOC_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    if (/bucket|not found|policy|row-level/i.test(error.message)) {
      throw new Error(MISSING_DOC_BUCKET_MESSAGE)
    }
    throw error
  }

  return { url: path, name: file.name, size: formatFileSize(file.size) }
}

// Blok Doc menyimpan path; URL bertanda tangan dibuat saat ditampilkan.
export async function getDocFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase()
    .storage.from(DOC_BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  return data?.signedUrl ?? null
}

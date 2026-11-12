import rawTemplate from './project-template.json'
import { createClient } from '@/lib/supabase/client'

// Template contoh dipakai saat project baru dibuat, supaya board langsung berisi
// grup tugas, subtask, komentar, dan isi tab Doc — bukan board kosong.
// Sumber datanya satu file JSON agar bisa dipakai juga oleh scripts/seed-demo.mjs.

export interface TemplateTask {
  title: string
  description?: string
  status: string
  priority: string
  due?: number
  checked?: boolean
  assignee?: boolean
  subtasks?: { text: string; done: boolean }[]
  comments?: { body: string; likes?: number }[]
}

export interface TemplateGroup {
  title: string
  color: string
  tasks: TemplateTask[]
}

export interface TemplateDocBlock {
  id: string
  type: string
  content: string
  items?: { id: string; text: string; checked?: boolean }[]
  align?: string
  styles?: Record<string, unknown>
}

export interface ProjectTemplate {
  groups: TemplateGroup[]
  doc?: TemplateDocBlock[]
}

interface TemplateData {
  template: ProjectTemplate
  demoProjects: (ProjectTemplate & {
    name: string
    scope: string
    description: string
    progress: number
  })[]
}

const data = rawTemplate as unknown as TemplateData

// Project baru memakai template khusus kalau namanya cocok dengan contoh
// (mis. "Aqua" di scope "Client"), selain itu memakai template generik.
export function pickTemplate(name?: string | null, scope?: string | null): ProjectTemplate {
  const match = data.demoProjects.find(
    (p) =>
      p.name.toLowerCase() === (name ?? '').toLowerCase() &&
      p.scope.toLowerCase() === (scope ?? '').toLowerCase(),
  )
  return match ?? data.template
}

export function listDemoProjects() {
  return data.demoProjects
}

// Tanggal template disimpan sebagai offset hari dari hari ini, jadi isi contoh
// selalu terlihat "sedang berjalan" kapan pun template diterapkan.
function isoOffset(days?: number): string | null {
  if (days === undefined) return null
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Isi satu project dengan template. Melempar error kalau gagal, supaya pemanggil
// bisa memutuskan apakah kegagalan ini fatal.
export async function applyProjectTemplate(
  projectId: string,
  template: ProjectTemplate,
): Promise<void> {
  const db = createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  const { data: statusRows, error: statusError } = await db
    .from('statuses')
    .select('id, label')
    .eq('project_id', projectId)
    .order('position')
  if (statusError) throw statusError

  const statuses = statusRows ?? []
  const statusIdFor = (label: string) =>
    statuses.find((s) => s.label.toLowerCase() === label.toLowerCase())?.id ??
    statuses[0]?.id ??
    null

  // Trigger `projects_seed` sudah membuat satu grup kosong: pakai ulang grup itu
  // supaya tidak ada grup kosong menggantung di board.
  const { data: existingGroups, error: groupError } = await db
    .from('task_groups')
    .select('id')
    .eq('project_id', projectId)
    .order('position')
  if (groupError) throw groupError

  const existing = existingGroups ?? []
  const groupIds: string[] = []

  for (let i = 0; i < template.groups.length; i++) {
    const group = template.groups[i]
    if (existing[i]) {
      const { error } = await db
        .from('task_groups')
        .update({ title: group.title, color: group.color, position: i })
        .eq('id', existing[i].id)
      if (error) throw error
      groupIds.push(existing[i].id)
    } else {
      const { data: created, error } = await db
        .from('task_groups')
        .insert({ project_id: projectId, title: group.title, color: group.color, position: i })
        .select('id')
        .single()
      if (error) throw error
      groupIds.push(created.id)
    }
  }

  for (let i = template.groups.length; i < existing.length; i++) {
    await db.from('task_groups').delete().eq('id', existing[i].id)
  }

  for (let gi = 0; gi < template.groups.length; gi++) {
    const group = template.groups[gi]
    for (let ti = 0; ti < group.tasks.length; ti++) {
      const task = group.tasks[ti]
      const { data: createdTask, error } = await db
        .from('tasks')
        .insert({
          project_id: projectId,
          group_id: groupIds[gi],
          status_id: statusIdFor(task.status),
          title: task.title,
          description: task.description ?? null,
          priority: task.priority,
          due_date: isoOffset(task.due),
          assignee_id: task.assignee ? (user?.id ?? null) : null,
          position: ti,
          checked: task.checked ?? false,
        })
        .select('id')
        .single()
      if (error) throw error

      if (task.subtasks?.length) {
        const { error: subError } = await db.from('subtasks').insert(
          task.subtasks.map((s, i) => ({
            task_id: createdTask.id,
            text: s.text,
            done: s.done,
            position: i,
          })),
        )
        if (subError) throw subError
      }

      if (task.comments?.length && user) {
        const { error: commentError } = await db.from('comments').insert(
          task.comments.map((c) => ({
            task_id: createdTask.id,
            author_id: user.id,
            body: c.body,
            likes: c.likes ?? 0,
          })),
        )
        if (commentError) throw commentError
      }
    }
  }

  // Demo project hanya mendefinisikan grup/tugas; isi tab Doc memakai template
  // generik kalau project tersebut tidak punya doc sendiri.
  const docBlocks = template.doc?.length ? template.doc : data.template.doc

  const { error: docError } = await db
    .from('docs')
    .upsert({ project_id: projectId, blocks: docBlocks }, { onConflict: 'project_id' })
  if (docError) throw docError
}

// Isi akun yang sedang login dengan beberapa project contoh (Client/Aqua,
// Marketplace/Glowup, dst). Project yang sudah ada dilewati, jadi aman diklik
// berkali-kali. Dijalankan dari browser supaya tetap tunduk pada RLS pemilik akun.
export async function seedDemoProjects(options: { workspaceId?: string | null } = {}): Promise<{
  created: number
  skipped: number
}> {
  const db = createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error('Harus login dulu untuk memuat contoh project.')

  let workspaceId = options.workspaceId ?? null
  if (!workspaceId) {
    const { data: workspaces } = await db
      .from('workspaces')
      .select('id, owner_id')
      .order('created_at')
    const mine = (workspaces ?? []).find((w) => w.owner_id === user.id) ?? workspaces?.[0]
    if (mine) {
      workspaceId = mine.id
    } else {
      const { data: createdWorkspace } = await db
        .from('workspaces')
        .insert({ name: '2026 INVISUAL', owner_id: user.id })
        .select('id')
        .single()
      workspaceId = createdWorkspace?.id ?? null
    }
  }

  const { data: existing, error: existingError } = await db
    .from('projects')
    .select('name, scope')
  if (existingError) throw existingError

  let created = 0
  let skipped = 0

  for (const project of data.demoProjects) {
    const already = (existing ?? []).some(
      (p) => p.name === project.name && (p.scope ?? '') === project.scope,
    )
    if (already) {
      skipped += 1
      continue
    }

    const { data: row, error } = await db
      .from('projects')
      .insert({
        name: project.name,
        scope: project.scope,
        description: project.description,
        progress: project.progress,
        owner_id: user.id,
        workspace_id: workspaceId,
      })
      .select('id')
      .single()
    if (error) throw error

    await applyProjectTemplate(row.id, project)
    created += 1
  }

  return { created, skipped }
}

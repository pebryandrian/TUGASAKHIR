// Membuat dua akun contoh untuk melihat perbedaan tampilan Project Manager vs Member.
//
//   node scripts/seed-demo-accounts.mjs
//
// Akun yang dibuat (aman dijalankan berkali-kali; data lama dibuat ulang):
//   Project Manager : pm.demo@invisual.test     / Manager2026!
//   Member          : member.demo@invisual.test / Member2026!
//
// Keduanya menjadi anggota pada dua project contoh (Client/Aqua dan
// Marketplace/Glowup). Tugas yang punya penanggung jawab ditugaskan ke akun
// Member, sehingga POV member langsung terlihat berisi.
//
// Catatan: script ini memakai anon key + login biasa, jadi tetap tunduk pada RLS.
// Untuk mengosongkan lagi, hapus project lewat akun PM.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const tpl = JSON.parse(readFileSync(new URL('../lib/project-template.json', import.meta.url), 'utf8'))

const PM = { email: 'pm.demo@invisual.test', password: 'Manager2026!', name: 'Rani Project Manager' }
const MEMBER = { email: 'member.demo@invisual.test', password: 'Member2026!', name: 'Bagas Anggota Tim' }

const mk = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

// Koneksi Supabase kadang gagal sesaat ("fetch failed"); ulangi beberapa kali.
const signInWithRetry = async (client, email, password, attempts = 5) => {
  let last
  for (let i = 1; i <= attempts; i++) {
    const res = await client.auth.signInWithPassword({ email, password })
    if (!res.error) return res.data.user
    last = res.error
    await new Promise((r) => setTimeout(r, 2500 * i))
  }
  throw new Error(`${email}: ${last?.message}`)
}

const signUpOrIn = async (client, account) => {
  const up = await client.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { name: account.name } },
  })
  if (!up.error && up.data.session) return up.data.session.user
  return signInWithRetry(client, account.email, account.password)
}

const isoOffset = (days) => {
  if (days === undefined) return null
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const pm = mk()
const pmUser = await signUpOrIn(pm, PM)
const member = mk()
const memberUser = await signUpOrIn(member, MEMBER)

await pm.from('profiles').update({ name: PM.name }).eq('id', pmUser.id)
await member.from('profiles').update({ name: MEMBER.name }).eq('id', memberUser.id)

console.log(`PM     : ${PM.email} / ${PM.password}`)
console.log(`Member : ${MEMBER.email} / ${MEMBER.password}`)

// Workspace milik PM.
let { data: ws } = await pm
  .from('workspaces')
  .select('id')
  .eq('owner_id', pmUser.id)
  .limit(1)
  .maybeSingle()
if (!ws) {
  const created = await pm
    .from('workspaces')
    .insert({ name: 'INVISUAL STUDIO', owner_id: pmUser.id })
    .select('id')
    .single()
  if (created.error) throw created.error
  ws = created.data
}
await pm
  .from('workspace_members')
  .insert({ workspace_id: ws.id, user_id: pmUser.id })
  .then(() => undefined, () => undefined)

const applyTemplate = async (projectId, template) => {
  const { data: statuses } = await pm
    .from('statuses')
    .select('id, label')
    .eq('project_id', projectId)
    .order('position')
  const statusIdFor = (label) =>
    statuses.find((s) => s.label.toLowerCase() === label.toLowerCase())?.id ?? statuses[0]?.id ?? null

  const { data: existingGroups } = await pm
    .from('task_groups')
    .select('id')
    .eq('project_id', projectId)
    .order('position')

  const groupIds = []
  for (let i = 0; i < template.groups.length; i++) {
    const g = template.groups[i]
    if (existingGroups[i]) {
      await pm
        .from('task_groups')
        .update({ title: g.title, color: g.color, position: i })
        .eq('id', existingGroups[i].id)
      groupIds.push(existingGroups[i].id)
    } else {
      const { data, error } = await pm
        .from('task_groups')
        .insert({ project_id: projectId, title: g.title, color: g.color, position: i })
        .select('id')
        .single()
      if (error) throw error
      groupIds.push(data.id)
    }
  }
  for (let i = template.groups.length; i < existingGroups.length; i++) {
    await pm.from('task_groups').delete().eq('id', existingGroups[i].id)
  }

  let taskCount = 0
  for (let gi = 0; gi < template.groups.length; gi++) {
    const group = template.groups[gi]
    for (let ti = 0; ti < group.tasks.length; ti++) {
      const t = group.tasks[ti]
      const { data: row, error } = await pm
        .from('tasks')
        .insert({
          project_id: projectId,
          group_id: groupIds[gi],
          status_id: statusIdFor(t.status),
          title: t.title,
          description: t.description ?? null,
          priority: t.priority,
          due_date: isoOffset(t.due),
          assignee_id: t.assignee ? memberUser.id : null,
          position: ti,
          checked: t.checked ?? false,
        })
        .select('id')
        .single()
      if (error) throw new Error(`task "${t.title}": ${error.message}`)
      taskCount++

      if (t.subtasks?.length) {
        await pm.from('subtasks').insert(
          t.subtasks.map((s, i) => ({
            task_id: row.id,
            text: s.text,
            done: s.done,
            position: i,
          })),
        )
      }
      if (t.comments?.length) {
        await pm.from('comments').insert(
          t.comments.map((c) => ({
            task_id: row.id,
            author_id: pmUser.id,
            body: c.body,
            likes: c.likes ?? 0,
          })),
        )
      }
    }
  }

  const docBlocks = template.doc?.length ? template.doc : tpl.template.doc
  await pm.from('docs').upsert({ project_id: projectId, blocks: docBlocks }, { onConflict: 'project_id' })
  return taskCount
}

// Buat ulang project contoh agar datanya selalu utuh.
const { data: existingProjects } = await pm.from('projects').select('id, name').eq('owner_id', pmUser.id)
for (const p of existingProjects ?? []) {
  await pm.from('projects').delete().eq('id', p.id)
}

for (const def of tpl.demoProjects.slice(0, 2)) {
  const { data: created, error } = await pm
    .from('projects')
    .insert({
      name: def.name,
      scope: def.scope,
      description: def.description,
      progress: def.progress,
      owner_id: pmUser.id,
      workspace_id: ws.id,
      start_date: isoOffset(-14),
      due_date: isoOffset(30),
    })
    .select('id')
    .single()
  if (error) throw error

  const n = await applyTemplate(created.id, def)
  await pm
    .from('project_members')
    .upsert(
      { project_id: created.id, user_id: memberUser.id, role: 'member' },
      { onConflict: 'project_id,user_id' },
    )
  console.log(`project: ${def.scope}/${def.name} - ${n} tugas (sebagian ditugaskan ke Member)`)
}

console.log('\nSelesai. Login sebagai salah satu akun di atas untuk melihat POV masing-masing.')

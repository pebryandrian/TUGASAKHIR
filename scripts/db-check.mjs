// Self-check for the Supabase schema, triggers, and RLS.
// Run: node scripts/db-check.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const email = process.env.CHECK_EMAIL ?? `invisual.check.${Date.now()}@gmail.com`
const password = process.env.CHECK_PASSWORD ?? 'check-Password-1234'

let projectId
let workspaceId
try {
  // Sign in if the account already exists (e.g. seeded, or created by a previous run).
  let auth = await supabase.auth.signInWithPassword({ email, password })
  if (auth.error) {
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: 'Check User' } },
    })
    assert.ok(!signUp.error, `signUp failed: ${signUp.error?.message}`)
    auth = signUp
  }
  assert.ok(!auth.error, `auth failed: ${auth.error?.message}`)
  if (!auth.data.session) {
    console.log(
      'SKIP: email confirmation is enabled.\n' +
        'Turn off Authentication → Sign In / Providers → Email → "Confirm email", then rerun.',
    )
    process.exit(0)
  }

  // profiles row is created by the on_auth_user_created trigger.
  const profile = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', auth.data.user.id)
    .single()
  assert.ok(!profile.error, `profiles select failed: ${profile.error?.message}`)
  assert.equal(profile.data.name, 'Check User')
  assert.equal(profile.data.role, 'member')

  const ws = await supabase
    .from('workspaces')
    .insert({ name: 'Check WS', owner_id: auth.data.user.id })
    .select()
    .single()
  assert.ok(!ws.error, `workspace insert failed: ${ws.error?.message}`)
  workspaceId = ws.data.id

  const { data: user } = await supabase.auth.getUser()
  const project = await supabase
    .from('projects')
    .insert({ name: 'Check Project', scope: 'check', workspace_id: ws.data.id, owner_id: user.user.id })
    .select()
    .single()
  assert.ok(!project.error, `project insert failed: ${project.error?.message}`)
  projectId = project.data.id

  // projects_seed trigger: 4 statuses, 1 group, 1 doc row.
  const statuses = await supabase.from('statuses').select('id, label, position').eq('project_id', projectId).order('position')
  assert.deepEqual(
    statuses.data.map((s) => s.label),
    ['To Do', 'In Progress', 'Review', 'Done'],
  )
  const groups = await supabase.from('task_groups').select('id').eq('project_id', projectId)
  assert.equal(groups.data.length, 1)
  const doc = await supabase.from('docs').select('blocks').eq('project_id', projectId).single()
  assert.deepEqual(doc.data.blocks, [])

  // add_project_owner trigger: owner is a project_manager member.
  const member = await supabase.from('project_members').select('role').eq('project_id', projectId).single()
  assert.equal(member.data.role, 'project_manager')

  const task = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      group_id: groups.data[0].id,
      status_id: statuses.data[0].id,
      title: 'Check Task',
      due_date: '2026-03-28',
    })
    .select()
    .single()
  assert.ok(!task.error, `task insert failed: ${task.error?.message}`)

  // Kanban move: To Do -> Review.
  const review = statuses.data.find((s) => s.label === 'Review')
  await supabase.from('tasks').update({ status_id: review.id }).eq('id', task.data.id)
  const moved = await supabase.from('tasks').select('status_id').eq('id', task.data.id).single()
  assert.equal(moved.data.status_id, review.id)

  const sub = await supabase.from('subtasks').insert({ task_id: task.data.id, text: 'sub', position: 0 }).select().single()
  assert.ok(!sub.error, `subtask insert failed: ${sub.error?.message}`)

  const comment = await supabase.from('comments').insert({ task_id: task.data.id, body: 'hi', author_id: user.user.id }).select().single()
  assert.ok(!comment.error, `comment insert failed: ${comment.error?.message}`)

  // Doc tab autosave (upsert on project_id).
  const docSave = await supabase
    .from('docs')
    .upsert({ project_id: projectId, blocks: [{ id: 'b1', type: 'paragraph', content: 'hi' }] }, { onConflict: 'project_id' })
  assert.ok(!docSave.error, `docs upsert failed: ${docSave.error?.message}`)
  const savedDoc = await supabase.from('docs').select('blocks').eq('project_id', projectId).single()
  assert.equal(savedDoc.data.blocks[0].content, 'hi')

  console.log('PASS: schema, RLS, and triggers behave as expected.')
} finally {
  if (projectId) await supabase.from('projects').delete().eq('id', projectId)
  if (workspaceId) await supabase.from('workspaces').delete().eq('id', workspaceId)
  await supabase.auth.signOut()
}

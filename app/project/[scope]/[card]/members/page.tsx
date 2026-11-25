import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { ProjectMembersPage } from '@/components/project-members'

// Halaman Anggota Proyek (UC-03).
export default async function MembersRoute({
  params,
}: {
  params: Promise<{ scope: string; card: string }>
}) {
  const { scope, card } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('projects').select('id, name, scope')
  const project = (data ?? []).find(
    (p) => slugify(p.scope) === slugify(scope) && slugify(p.name) === slugify(card),
  )

  if (!project) redirect('/home')

  return (
    <ProjectMembersPage
      projectId={project.id}
      scopeTitle={slugify(project.scope)}
      cardTitle={slugify(project.name)}
    />
  )
}

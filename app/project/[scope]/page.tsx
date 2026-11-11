import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

// /project/<scope> tidak punya card, jadi arahkan ke card pertama di scope itu.
export default async function ScopeIndexPage({
  params,
}: {
  params: Promise<{ scope: string }>
}) {
  const { scope } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('projects').select('name, scope')
  const target = (data ?? []).find((p) => slugify(p.scope) === slugify(scope))

  if (target?.name) {
    redirect(`/project/${slugify(target.scope)}/${slugify(target.name)}`)
  }

  redirect('/home')
}

import { redirect } from 'next/navigation'

export default async function ScopeIndexPage({
  params,
}: {
  params: Promise<{ scope: string }>
}) {
  const { scope } = await params
  redirect(`/project/${scope}/aqua`)
}

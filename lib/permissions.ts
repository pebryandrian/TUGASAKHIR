import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Peran pengguna pada SEBUAH project. Satu orang bisa menjadi Project Manager
// di project A dan Member di project B, karena itu peran dibaca dari
// `project_members.role`, bukan dari `profiles.role` (yang bersifat global).
export type ProjectRole = 'project_manager' | 'member'

export interface ProjectPermissions {
  role: ProjectRole | null
  isManager: boolean
  loading: boolean
  /** Project Manager boleh mengatur struktur pekerjaan. */
  manageGroups: boolean
  manageLabels: boolean
  manageColumns: boolean
  inviteMembers: boolean
  manageRoles: boolean
  deleteTasks: boolean
  editProject: boolean
  deleteProject: boolean
}

const MANAGER_ONLY: Omit<ProjectPermissions, 'role' | 'isManager' | 'loading'> = {
  manageGroups: true,
  manageLabels: true,
  manageColumns: true,
  inviteMembers: true,
  manageRoles: true,
  deleteTasks: true,
  editProject: true,
  deleteProject: true,
}

const MEMBER_ONLY: Omit<ProjectPermissions, 'role' | 'isManager' | 'loading'> = {
  manageGroups: false,
  manageLabels: false,
  manageColumns: false,
  inviteMembers: false,
  manageRoles: false,
  deleteTasks: false,
  editProject: false,
  deleteProject: false,
}

export function permissionsFor(role: ProjectRole | null): ProjectPermissions {
  const isManager = role === 'project_manager'
  return {
    role,
    isManager,
    loading: false,
    ...(isManager ? MANAGER_ONLY : MEMBER_ONLY),
  }
}

// Pemilik project selalu dianggap Project Manager (dijaga juga oleh trigger
// `projects_owner_member` di database).
export async function fetchProjectRole(projectId: string | null): Promise<ProjectRole | null> {
  if (!projectId) return null
  const db = createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null

  const { data: project } = await db
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()
  if (project?.owner_id === user.id) return 'project_manager'

  const { data: membership } = await db
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  const role = membership?.role
  if (role === 'project_manager' || role === 'member') return role
  return membership ? 'member' : null
}

export function useProjectPermissions(projectId: string | null): ProjectPermissions {
  const [permissions, setPermissions] = useState<ProjectPermissions>({
    role: null,
    isManager: false,
    loading: true,
    ...MEMBER_ONLY,
  })

  useEffect(() => {
    let alive = true
    if (!projectId) {
      setPermissions({ role: null, isManager: false, loading: false, ...MEMBER_ONLY })
      return
    }
    setPermissions((p) => ({ ...p, loading: true }))
    fetchProjectRole(projectId)
      .then((role) => {
        if (alive) setPermissions(permissionsFor(role))
      })
      .catch(() => {
        if (alive) setPermissions(permissionsFor(null))
      })
    return () => {
      alive = false
    }
  }, [projectId])

  return permissions
}

export function roleLabel(role: ProjectRole | null): string {
  if (role === 'project_manager') return 'Project Manager'
  if (role === 'member') return 'Member'
  return '—'
}

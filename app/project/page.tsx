import { redirect } from 'next/navigation'

// /project tanpa scope & card tidak punya konteks — kembalikan ke daftar project.
export default function ProjectIndexPage() {
  redirect('/home')
}

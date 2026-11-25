import { createClient } from '@/utils/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'

// 영문 등급명을 한글 칭호로 변환해주는 헬퍼 함수
function getRoleLabel(role: string | null) {
  switch (role) {
    case 'staff':
      return '스탭'
    case 'admin':
      return '관리자'
    case 'member':
    default:
      return '회원'
  }
}

async function UserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          로그인 / 회원가입
        </Link>
      </div>
    )
  }

  // profiles 테이블에서 username과 role 정보를 함께 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  const username = profile?.username || '멤버'
  const roleLabel = getRoleLabel(profile?.role)

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {username} 님 <span className="ml-1.5 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{roleLabel}</span>
        </p>
      </div>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </form>
    </div>
  )
}

export default function Home() {
  return (
    <div className="flex h-full flex-col bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">📚 도검난무 커뮤니티 위키</span>
        </div>

        <Suspense fallback={<div className="h-10 w-24 animate-pulse rounded bg-gray-100"></div>}>
          <UserProfile />
        </Suspense>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="w-full h-[calc(100vh-65px)] flex flex-col bg-white overflow-hidden">
          <iframe 
            src="/wiki.html" 
            className="w-full h-full border-0"
            title="도검난무 위키"
          />
        </div>
      </main>
    </div>
  )
}

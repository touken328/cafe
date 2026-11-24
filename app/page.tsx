export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
  
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { logout } from './login/actions'

// 💡 쿠키를 읽는 로직을 별도 컴포넌트로 분리합니다.
async function UserProfile() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_user')?.value
  const user = sessionCookie ? JSON.parse(sessionCookie) : null

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {user.username} 님
        </p>
        <p className="text-xs text-gray-500 uppercase">
          권한: {user.role}
        </p>
      </div>
      <form action={logout}>
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
    <div className="flex h-full flex-col bg-gray-50">
      {/* 상단 네비게이션 헤더 */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">📚 도검난무 커뮤니티 위키</span>
        </div>

        {/* 💡 동적 데이터를 사용하는 부분을 Suspense로 감싸줍니다. */}
        <Suspense fallback={<div className="h-10 w-24 animate-pulse rounded bg-gray-100"></div>}>
          <UserProfile />
        </Suspense>
      </header>

      {/* main이 남은 공간을 꽉 채웁니다. */}
      <main className="flex flex-1 flex-col p-3 overflow-hidden">
        <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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

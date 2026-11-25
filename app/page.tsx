import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { logout } from './login/actions'

// 1. 쿠키를 읽는 로직을 독립적인 비동기 컴포넌트로 분리
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

// 2. Home은 동기 함수로 유지 (async 제거, cookies 직접 호출 금지)
export default function Home() {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">📚 도검난무 커뮤니티 위키</span>
        </div>

        {/* 3. 동적 컴포넌트를 Suspense로 감싸기 */}
        <Suspense fallback={<div className="h-10 w-24 animate-pulse rounded bg-gray-100"></div>}>
          <UserProfile />
        </Suspense>
      </header>

      {/* main이 남은 공간을 꽉 채웁니다. */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* 
          - 테두리(border), 둥글기(rounded-xl), 그림자(shadow-sm) 제거
          - 패딩(p-3) 제거
          - iframe이 화면에 꽉 차도록 설정
        */}
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
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
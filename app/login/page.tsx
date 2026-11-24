import { loginWithUsername, signupWithUsername } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const errorMessage = resolvedSearchParams?.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-md border border-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">커뮤니티 로그인</h1>
          <p className="mt-2 text-sm text-gray-500">
            아이디와 비밀번호를 입력해 접속하세요.
          </p>
        </div>

        {/* 에러 메시지 표시 영역 */}
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {errorMessage}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              아이디
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="영문 소문자, 숫자 (3~20자)"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="6자 이상 입력"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              formAction={loginWithUsername}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              로그인
            </button>
            <button
              formAction={signupWithUsername}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
            >
              이 정보로 새 계정 만들기 (회원가입)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
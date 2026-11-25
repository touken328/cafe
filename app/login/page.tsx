'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type AuthMode = 'login' | 'signup' | 'find-id' | 'forgot-pw'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setErrorMsg(null)
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMsg(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const cleanUsername = username.trim()

        // 1. 영문 ID로 profiles 테이블에서 매핑된 이메일 조회
        const { data: profile, error: profileQueryErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', cleanUsername)
          .maybeSingle()

        if (profileQueryErr) throw profileQueryErr
        if (!profile) {
          throw new Error('존재하지 않는 영문 아이디입니다.')
        }

        // 2. 조회된 이메일과 비밀번호로 로그인
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password,
        })
        if (loginErr) throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.')

        router.push('/')
        router.refresh()

      } else if (mode === 'signup') {
        const cleanUsername = username.trim()
        const cleanEmail = email.trim()

        // 1. 영문 ID 중복 확인
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle()

        if (existingUser) {
          throw new Error('이미 사용 중인 영문 아이디입니다.')
        }

        // 2. Supabase Auth 계정 생성
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (signUpErr) throw signUpErr

        // 3. profiles 테이블에 영문 ID와 이메일 저장 (upsert로 충돌 방지)
        if (authData.user) {
          const { error: upsertErr } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            username: cleanUsername,
            email: cleanEmail,
          })
          if (upsertErr) throw upsertErr
        }

        setMessage('회원가입이 완료되었습니다! 이제 영문 ID로 로그인할 수 있습니다.')
        setMode('login')

      } else if (mode === 'find-id') {
        const cleanEmail = email.trim()

        // 이메일로 영문 ID 조회
        const { data: profile, error: findErr } = await supabase
          .from('profiles')
          .select('username')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (findErr) throw findErr
        if (!profile) {
          throw new Error('해당 이메일로 가입된 아이디를 찾을 수 없습니다.')
        }

        setMessage(`가입하신 영문 아이디는 [ ${profile.username} ] 입니다.`)

      } else if (mode === 'forgot-pw') {
        const cleanEmail = email.trim()

        // 이메일로 비밀번호 재설정 링크 발송
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })
        if (resetErr) throw resetErr

        setMessage('입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' && '로그인'}
            {mode === 'signup' && '회원가입'}
            {mode === 'find-id' && '아이디 찾기'}
            {mode === 'forgot-pw' && '비밀번호 찾기'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'login' && '영문 아이디와 비밀번호를 입력해 주세요.'}
            {mode === 'signup' && '사용할 영문 아이디와 이메일을 등록해 주세요.'}
            {mode === 'find-id' && '가입 시 등록한 이메일을 입력하면 아이디를 알려드립니다.'}
            {mode === 'forgot-pw' && '가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {errorMsg}
          </div>
        )}
        {message && (
          <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg font-medium text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">영문 아이디</label>
              <input
                type="text"
                required
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                placeholder="예: touken328"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {mode !== 'login' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="example@email.com"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="6자 이상 입력"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading
              ? '처리 중...'
              : mode === 'login'
              ? '로그인'
              : mode === 'signup'
              ? '가입하기'
              : mode === 'find-id'
              ? '아이디 찾기'
              : '재설정 이메일 보내기'}
          </button>
        </form>

        <div className="flex flex-col space-y-2 text-center text-sm text-gray-600 pt-3 border-t">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="hover:text-blue-600 font-medium"
              >
                계정이 없으신가요? 회원가입
              </button>
              <div className="flex justify-center space-x-3 text-gray-400">
                <button
                  type="button"
                  onClick={() => switchMode('find-id')}
                  className="hover:text-gray-600"
                >
                  아이디 찾기
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-pw')}
                  className="hover:text-gray-600"
                >
                  비밀번호 찾기
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="hover:text-blue-600 font-medium"
            >
              로그인 화면으로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

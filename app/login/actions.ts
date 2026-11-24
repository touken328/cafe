'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 아이디 로그인 처리
export async function loginWithUsername(formData: FormData) {
  const supabase = await createClient()

  const username = (formData.get('username') as string)?.trim()
  const password = formData.get('password') as string

  if (!username || !password) {
    redirect('/login?error=' + encodeURIComponent('아이디와 비밀번호를 모두 입력해 주세요.'))
  }

  // 데이터베이스 인증 함수 호출
  const { data, error } = await supabase.rpc('authenticate_user', {
    p_username: username,
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    redirect('/login?error=' + encodeURIComponent('아이디 또는 비밀번호가 일치하지 않습니다.'))
  }

  const user = data[0]

  // 안전한 HTTP-only 쿠키에 로그인 정보 저장 (세션 유지)
  const cookieStore = await cookies()
  cookieStore.set('session_user', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7일 유지
    path: '/',
  })

  redirect('/')
}

// 아이디 회원가입 처리
export async function signupWithUsername(formData: FormData) {
  const supabase = await createClient()

  const username = (formData.get('username') as string)?.trim()
  const password = formData.get('password') as string

  if (!username || !password) {
    redirect('/login?error=' + encodeURIComponent('아이디와 비밀번호를 모두 입력해 주세요.'))
  }

  // 아이디 유효성 검사 (영문 소문자, 숫자, 밑줄 3~20자)
  const usernameRegex = /^[a-z0-9_]{3,20}$/
  if (!usernameRegex.test(username)) {
    redirect(
      '/login?error=' +
        encodeURIComponent('아이디는 3~20자의 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.')
    )
  }

  // 데이터베이스 회원가입 함수 호출
  const { data, error } = await supabase.rpc('register_user', {
    p_username: username,
    p_password: password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message || '회원가입에 실패했습니다.'))
  }

  const user = data[0]

  // 가입 직후 자동 로그인 쿠키 설정
  const cookieStore = await cookies()
  cookieStore.set('session_user', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect('/')
}

// 로그아웃 처리
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('session_user')
  redirect('/login')
}
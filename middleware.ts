import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Supabase 세션 갱신 및 권한 리다이렉트 로직 실행
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 아래 패턴에 매칭되는 경로에서만 미들웨어가 실행되도록 설정합니다.
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico 등 공통 자산
     * 위 파일들을 제외한 모든 페이지 요청에서 미들웨어가 동작합니다.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
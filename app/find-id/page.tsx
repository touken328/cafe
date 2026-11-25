'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function FindIdPage() {
  const [email, setEmail] = useState('')
  const [foundUsername, setFoundUsername] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFoundUsername(null)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('email', email)
        .single()

      if (error || !data) {
        throw new Error('해당 이메일로 가입된 아이디를 찾을 수 없습니다.')
      }

      setFoundUsername(data.username)
    } catch (err: any) {
      setError(err.message || '조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">아이디 찾기</h1>
        
        {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
        {foundUsername && (
          <div className="p-4 text-sm text-green-800 bg-green-50 rounded-lg text-center space-y-1">
            <p>회원님의 영문 아이디는 다음과 같습니다:</p>
            <p className="font-bold text-lg text-blue-600">{foundUsername}</p>
          </div>
        )}

        <form onSubmit={handleFindId} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">가입한 이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '검색 중...' : '아이디 찾기'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 pt-2 border-t">
          <Link href="/login" className="hover:text-blue-600 font-medium">로그인 화면으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
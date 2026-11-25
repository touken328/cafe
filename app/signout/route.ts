import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

async function handleSignOut(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }

  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/login', url.origin), {
    status: 303,
  })
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}

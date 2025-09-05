
import { getTokensFromCode } from '@/lib/google-drive';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=Missing-code', req.url));
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    // Create a response and set the cookie
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('google-tokens', JSON.stringify(tokens), {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;

  } catch (error) {
    console.error('Error getting tokens from code:', error);
    return NextResponse.redirect(new URL('/?error=Authentication-failed', req.url));
  }
}

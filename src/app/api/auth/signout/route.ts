
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  cookieStore.delete('google-tokens');
  return NextResponse.json({ success: true });
}

    
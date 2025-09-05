
import { getGoogleAuthUrl } from '@/lib/google-drive';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = await getGoogleAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    return NextResponse.json({ error: 'Failed to get auth URL' }, { status: 500 });
  }
}

    
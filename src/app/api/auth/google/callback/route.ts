import { google } from "googleapis";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const host = req.headers.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

    const { tokens } = await oauth2Client.getToken(code);

    cookies().set("google-tokens", JSON.stringify(tokens), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const driveRedirectUrl = new URL("/drive", `${protocol}://${host}`);
    return NextResponse.redirect(driveRedirectUrl);
  } catch (error) {
    console.error("Failed to exchange code for tokens", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    );
  }
}

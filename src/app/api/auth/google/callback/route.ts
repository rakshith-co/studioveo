import { getOAuth2Client } from "@/lib/google-drive";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    cookies().set("google-tokens", JSON.stringify(tokens), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.redirect(new URL("/drive", req.url));
  } catch (error) {
    console.error("Failed to exchange code for tokens", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    );
  }
}

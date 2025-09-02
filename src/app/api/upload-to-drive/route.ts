
import { NextRequest, NextResponse } from "next/server";
import { uploadFileFromBuffer } from "@/lib/google-drive";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const newName = formData.get("newName") as string | null;

    if (!file || !newName) {
      return NextResponse.json({ error: "Missing file or newName" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const driveFile = await uploadFileFromBuffer(buffer, file.type, newName);

    return NextResponse.json(driveFile);
  } catch (error) {
    console.error("Upload to drive failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: "Failed to upload to Google Drive.", details: errorMessage }, { status: 500 });
  }
}

    
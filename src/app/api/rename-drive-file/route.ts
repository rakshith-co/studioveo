
import { getAuthenticatedClient } from "@/lib/google-drive";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const oauth2Client = await getAuthenticatedClient(req);
        if (!oauth2Client) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { fileId, newName } = await req.json();

        if (!fileId || !newName) {
            return NextResponse.json({ error: "Missing fileId or newName" }, { status: 400 });
        }

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: newName,
            },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error renaming file in Google Drive:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

    
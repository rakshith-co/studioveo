"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGoogleAuthUrl, isGoogleDriveConnected } from "@/lib/google-drive";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Disc3, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function DrivePage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      const connected = await isGoogleDriveConnected();
      setIsConnected(connected);
      setIsLoading(false);
    };

    const interval = setInterval(() => {
        checkConnection();
    }, 2000);


    checkConnection();

    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    const url = await getGoogleAuthUrl();
    window.open(url, "_blank");
  };
  
  const renderContent = () => {
    if (isLoading || isConnected === null) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Checking Google Drive connection...</p>
            </div>
        );
    }
    if(isConnected) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Google Drive Connected</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    You can now sync your videos from the "VeoVision-Uploads" folder in your Google Drive.
                </p>
                <Button asChild>
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-8">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect to Google Drive</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                To automatically tag and rename videos, connect your Google Drive account. The app will look for videos in a folder named "VeoVision-Uploads".
            </p>
            <Button onClick={handleConnect}>
                <Disc3 className="mr-2 h-4 w-4" /> Connect to Google Drive
            </Button>
        </div>
    )

  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Google Drive Sync</CardTitle>
          <CardDescription>
            Connect your account to automatically process videos from Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

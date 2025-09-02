"use client";

import Image from "next/image";
import { type VideoFile } from "@/app/page";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Play, Copy, Pencil, AlertCircle, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoCardProps {
  video: VideoFile;
  onPlay: () => void;
  onRefine: () => void;
}

export function VideoCard({ video, onPlay, onRefine }: VideoCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (video.tags) {
      navigator.clipboard.writeText(video.tags);
      toast({
        title: "Copied to Clipboard",
        description: "New filename copied successfully.",
      });
    }
  };

  const renderStatus = () => {
    switch (video.status) {
      case "processing":
        return (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-2 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm font-semibold">Processing...</p>
          </div>
        );
      case "error":
        return (
          <div className="absolute inset-0 bg-destructive/80 flex flex-col items-center justify-center text-destructive-foreground p-2 text-center">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm font-semibold">Error</p>
            <p className="text-xs mt-1">{video.error}</p>
          </div>
        );
      default:
        return null;
    }
  };
  
  const handleSaveToDrive = async () => {
    toast({ title: 'This feature is not yet implemented.'})
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative aspect-video w-full">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={`Frame from ${video.file.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
          {renderStatus()}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="text-sm text-muted-foreground break-words">
            {video.tags ? (
                video.tags
            ) : video.status === 'success' || video.status === 'error' ? (
                <span className="text-destructive-foreground">{video.file.name}</span>
            ) : (
                <Skeleton className="h-4 w-3/4" />
            )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end gap-2">
        {video.status === "success" && (
          <>
            <Button variant="outline" size="icon" onClick={onPlay} aria-label="Play video">
              <Play className="h-4 w-4" />
            </Button>
            {video.isDriveFile ? (
               <Button variant="outline" size="icon" onClick={handleSaveToDrive} aria-label="Save to Drive">
                  <Save className="h-4 w-4" />
               </Button>
            ) : (
               <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy tags">
                  <Copy className="h-4 w-4" />
               </Button>
            )}
            <Button variant="default" size="icon" onClick={onRefine} className="bg-accent hover:bg-accent/90" aria-label="Refine tags">
              <Pencil className="h-4 w-4 text-accent-foreground" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

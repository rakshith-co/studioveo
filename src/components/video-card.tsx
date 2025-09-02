
"use client";

import Image from "next/image";
import { type VideoFile } from "@/app/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pencil, AlertCircle, Loader2, UploadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoCardProps {
  video: VideoFile;
  onPlay: () => void;
  onRefine: () => void;
}

export function VideoCard({ video, onPlay, onRefine }: VideoCardProps) {
  
  const renderStatusOverlay = () => {
    let statusContent = null;
    switch (video.status) {
      case "processing":
        statusContent = (
          <>
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-xs font-semibold">Analyzing...</p>
          </>
        );
        break;
      case "uploading":
        statusContent = (
          <>
            <UploadCloud className="h-6 w-6 animate-bounce mb-2" />
            <p className="text-xs font-semibold">Saving to Drive...</p>
            <Progress value={video.progress} className="w-3/4 h-2 mt-2 bg-white/20 border border-white/30" />
          </>
        );
        break;
      case "error":
        statusContent = (
          <>
            <AlertCircle className="h-6 w-6 mb-2" />
            <p className="text-xs font-semibold">Error</p>
          </>
        );
        break;
      default:
        return null;
    }
    return (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-2 text-center z-10">
            {statusContent}
        </div>
    )
  };

  return (
    <div className="group relative rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <div className="relative aspect-[2/3] w-full">
            {video.thumbnail ? (
                <Image
                src={video.thumbnail}
                alt={`Frame from ${video.file.name}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            ) : (
                <Skeleton className="h-full w-full" />
            )}
            {renderStatusOverlay()}
        </div>
       <div className="absolute bottom-0 left-0 p-4 z-20 w-full">
            <h3 className="font-semibold text-white truncate">{video.tags || <Skeleton className="h-5 w-3/4" />}</h3>
            <p className="text-xs text-muted-foreground truncate">{video.tags ? video.file.name : 'Processing...'}</p>
       </div>
        {video.status === "success" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button variant="default" size="icon" className="rounded-full h-12 w-12" onClick={onPlay} aria-label="Play video">
                    <Play className="h-5 w-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" onClick={onRefine} aria-label="Refine tags">
                    <Pencil className="h-5 w-5" />
                </Button>
            </div>
        )}
    </div>
  );
}

    
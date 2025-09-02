"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { type VideoFile } from "@/app/page";

interface VideoPlayerModalProps {
  video: VideoFile;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayerModal({ video, onOpenChange }: VideoPlayerModalProps) {
  return (
    <Dialog open={!!video} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{video.tags || video.file.name}</DialogTitle>
          <DialogDescription>
            Original filename: {video.file.name}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full rounded-lg overflow-hidden mt-4 bg-black">
          <video src={video.objectURL} controls autoPlay className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

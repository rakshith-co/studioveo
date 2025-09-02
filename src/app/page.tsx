"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { generateVideoTags } from "@/ai/flows/generate-video-tags";
import { refineVideoTags } from "@/ai/flows/refine-video-tags-with-user-feedback";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";
import { Search, Upload, Film, FileWarning, Disc3 } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoPlayerModal } from "@/components/video-player-modal";
import { RefineTagsModal } from "@/components/refine-tags-modal";
import { cn } from "@/lib/utils";

export interface VideoFile {
  id: string;
  file: File;
  objectURL: string;
  thumbnail: string | null;
  tags: string | null;
  status: "queued" | "processing" | "success" | "error";
  error?: string;
}

export default function Home() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVideoForPlayback, setSelectedVideoForPlayback] = useState<VideoFile | null>(null);
  const [selectedVideoForRefinement, setSelectedVideoForRefinement] = useState<VideoFile | null>(null);

  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newVideos: VideoFile[] = Array.from(files)
      .filter(file => file.type.startsWith("video/"))
      .map(file => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        objectURL: URL.createObjectURL(file),
        thumbnail: null,
        tags: null,
        status: "queued",
      }));

    const nonVideoFiles = Array.from(files).filter(file => !file.type.startsWith("video/"));
    if (nonVideoFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: `Only video files are accepted. ${nonVideoFiles.length} file(s) were ignored.`,
      });
    }

    setVideos(prev => [...prev, ...newVideos]);
  };

  const extractFrame = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      const revokeUrl = () => URL.revokeObjectURL(video.src);

      video.onloadedmetadata = () => {
        if (video.duration === Infinity || isNaN(video.duration)) {
          video.currentTime = 1;
        } else {
          video.currentTime = video.duration / 3;
        }
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          revokeUrl();
          return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        revokeUrl();
        resolve(dataUrl);
      };

      video.onerror = () => {
        revokeUrl();
        reject(new Error("Failed to load or process video file. It might be corrupt or an unsupported format."));
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      const videoToProcess = videos.find(v => v.status === "queued");
      if (!videoToProcess) {
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, status: "processing" } : v));

      try {
        const frameDataUri = await extractFrame(videoToProcess.file);
        
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, thumbnail: frameDataUri } : v));

        const result = await generateVideoTags({
          frameDataUri,
          filename: videoToProcess.file.name,
        });

        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, status: "success", tags: result.tags } : v));
        toast({
          title: "Processing Complete",
          description: `Tags generated for ${videoToProcess.file.name}.`,
        });
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, status: "error", error: errorMessage } : v));
        toast({
          variant: "destructive",
          title: "Processing Failed",
          description: `Could not process ${videoToProcess.file.name}. ${errorMessage}`,
        });
      }
    };

    processQueue();
  }, [videos, extractFrame, toast]);

  const filteredVideos = useMemo(() => {
    if (!searchTerm) return videos;
    return videos.filter(video => video.tags?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [videos, searchTerm]);

  const handleRefineTags = async (video: VideoFile, feedback: string) => {
    try {
      const result = await refineVideoTags({
        originalTags: video.tags || "",
        userFeedback: feedback,
      });
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: result.refinedTags } : v));
      toast({
        title: "Tags Refined",
        description: `Successfully refined tags for ${video.file.name}.`,
      });
      return true;
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Refinement Failed",
        description: "Could not refine tags.",
      });
      return false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                VeoVision Indexer
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/drive" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                <Disc3 className="h-4 w-4" />
                <span>Sync with Drive</span>
              </Link>
              <label htmlFor="video-upload" className={cn(buttonVariants({ size: "sm" }), "cursor-pointer gap-2")}>
                <Upload className="h-4 w-4" />
                <span>{isProcessing ? "Processing..." : "Upload Videos"}</span>
              </label>
              <input
                id="video-upload"
                type="file"
                multiple
                accept="video/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {videos.length > 0 ? (
          <>
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by tags..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredVideos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={() => setSelectedVideoForPlayback(video)}
                  onRefine={() => setSelectedVideoForRefinement(video)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
            <Film className="w-24 h-24 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground">Welcome to VeoVision Indexer</h2>
            <p className="max-w-md mt-2">
              Start by uploading your real estate videos or connecting your Google Drive account. We'll analyze a frame and automatically generate searchable tags for you.
            </p>
          </div>
        )}
      </main>

      {videos.length > 0 && (
          <footer className="text-center p-4 text-sm text-muted-foreground">
              <p>Showing {filteredVideos.length} of {videos.length} videos. New filenames are suggestions. Please rename your files manually.</p>
          </footer>
      )}

      {selectedVideoForPlayback && (
        <VideoPlayerModal
          video={selectedVideoForPlayback}
          onOpenChange={(open) => !open && setSelectedVideoForPlayback(null)}
        />
      )}
      
      {selectedVideoForRefinement && (
        <RefineTagsModal
          video={selectedVideoForRefinement}
          onOpenChange={(open) => !open && setSelectedVideoForRefinement(null)}
          onRefine={handleRefineTags}
        />
      )}
    </div>
  );
}

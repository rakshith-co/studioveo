
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { generateVideoTags } from "@/ai/flows/generate-video-tags";
import { refineVideoTags } from "@/ai/flows/refine-video-tags-with-user-feedback";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";
import { Search, Upload, Film, Disc3, CheckCircle } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoPlayerModal } from "@/components/video-player-modal";
import { RefineTagsModal } from "@/components/refine-tags-modal";
import { cn } from "@/lib/utils";
import { isGoogleDriveConnected, uploadFileToDrive, renameGoogleFile } from "@/lib/google-drive";

export interface VideoFile {
  id: string;
  driveId?: string;
  file: File;
  objectURL: string;
  thumbnail: string | null;
  tags: string | null;
  status: "queued" | "processing" | "uploading" | "success" | "error";
  error?: string;
}

export default function Home() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [selectedVideoForPlayback, setSelectedVideoForPlayback] = useState<VideoFile | null>(null);
  const [selectedVideoForRefinement, setSelectedVideoForRefinement] = useState<VideoFile | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    isGoogleDriveConnected().then(setDriveConnected);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (!driveConnected) {
      toast({
        variant: "destructive",
        title: "Google Drive Not Connected",
        description: "Please connect your Google Drive account before uploading videos.",
      });
      return;
    }

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
        // Step 1: Extract frame and generate thumbnail
        const frameDataUri = await extractFrame(videoToProcess.file);
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, thumbnail: frameDataUri } : v));

        // Step 2: Generate AI tags
        const tagResult = await generateVideoTags({
          frameDataUri,
          filename: videoToProcess.file.name,
        });
        const newTags = tagResult.tags;
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, tags: newTags } : v));
        toast({ title: "Tags Generated", description: `AI created tags for ${videoToProcess.file.name}.` });

        // Step 3: Upload to Google Drive with new tags
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, status: "uploading" } : v));
        toast({ title: "Uploading to Drive...", description: `Uploading ${newTags}...` });
        
        const driveFile = await uploadFileToDrive(videoToProcess.file, newTags);
        
        setVideos(prev => prev.map(v => v.id === videoToProcess.id ? { ...v, status: "success", driveId: driveFile.id } : v));
        toast({
            title: "Upload Complete!",
            description: `${newTags} is now in your Google Drive.`,
            action: (
                <a
                  href={`https://drive.google.com/file/d/${driveFile.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View in Drive
                </a>
              ),
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
    if (!video.driveId || !video.tags) {
        toast({ variant: "destructive", title: "Cannot Refine", description: "This video does not have a valid Drive ID to rename."});
        return false;
    }
    try {
      const result = await refineVideoTags({
        originalTags: video.tags,
        userFeedback: feedback,
      });
      const refinedTags = result.refinedTags;
      
      // Rename the file in Google Drive
      await renameGoogleFile(video.driveId, refinedTags);

      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: refinedTags } : v));
      toast({
        title: "Tags Refined & Renamed",
        description: `Successfully updated the file in Google Drive.`,
      });
      return true;
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Refinement Failed",
        description: "Could not refine tags or rename the file in Google Drive.",
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
              <Link href="/drive" className={cn(buttonVariants({ size: "sm", variant: "outline" }), !driveConnected && "animate-pulse")}>
                {driveConnected ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Disc3 className="h-4 w-4" />}
                <span>{driveConnected ? 'Drive Connected' : 'Connect Drive'}</span>
              </Link>
              <label htmlFor="video-upload" className={cn(buttonVariants({ size: "sm" }), "cursor-pointer gap-2", { 'opacity-50 cursor-not-allowed': !driveConnected || isProcessing })}>
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
                disabled={!driveConnected || isProcessing}
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
              Connect your Google Drive, then upload videos. We'll analyze them, tag them, and save them directly to your Drive.
            </p>
          </div>
        )}
      </main>

      {videos.length > 0 && (
          <footer className="text-center p-4 text-sm text-muted-foreground">
              <p>Showing {filteredVideos.length} of {videos.length} videos. All uploaded videos are automatically saved to your Google Drive.</p>
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

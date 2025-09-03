
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import Image from "next/image";
import { generateVideoTags } from "@/ai/flows/generate-video-tags";
import { refineVideoTags } from "@/ai/flows/refine-video-tags-with-user-feedback";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Disc3, CheckCircle, Play, Pencil, Clapperboard } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoPlayerModal } from "@/components/video-player-modal";
import { RefineTagsModal } from "@/components/refine-tags-modal";
import { cn } from "@/lib/utils";
import { isGoogleDriveConnected, getGoogleAuthUrl, renameGoogleFile } from "@/lib/google-drive";
import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export interface VideoFile {
  id: string;
  driveId?: string;
  file: File;
  objectURL: string;
  thumbnail: string | null;
  tags: string | null;
  status: "queued" | "processing" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function HomePage() {
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

    if (driveConnected === false) {
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
        progress: 0,
      }));

    const nonVideoFiles = Array.from(files).filter(file => !file.type.startsWith("video/"));
    if (nonVideoFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: `Only video files are accepted. ${nonVideoFiles.length} file(s) were ignored.`,
      });
    }

    setVideos(prev => [...newVideos, ...prev]);
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

      video.onerror = (e) => {
        revokeUrl();
        reject(new Error("Failed to load or process video file. It might be corrupt or an unsupported format."));
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleSetVideoProgress = (id: string, progress: number) => {
    setVideos(prev =>
      prev.map(v => (v.id === id ? { ...v, progress } : v))
    );
  };

  const uploadFileWithProgress = (file: File, newName: string, videoId: string): Promise<{id: string}> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          handleSetVideoProgress(videoId, percentComplete);
        }
      });
      
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.details || `${xhr.status}: ${xhr.statusText}`));
          } catch {
            reject(new Error(`${xhr.status}: ${xhr.statusText}`));
          }
        }
      });
      
      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed due to a network error."));
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("newName", newName);

      xhr.open("POST", "/api/upload-to-drive", true);
      xhr.send(formData);
    });
  };
  
  useEffect(() => {
    const processQueue = async () => {
      const videosToProcess = videos.filter(v => v.status === "queued");
      if (videosToProcess.length === 0) {
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      
      setVideos(prev =>
        prev.map(v =>
          videosToProcess.some(p => p.id === v.id)
            ? { ...v, status: "processing" }
            : v
        )
      );

      const processingPromises = videosToProcess.map(async (video) => {
        try {
          const frameDataUri = await extractFrame(video.file);
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, thumbnail: frameDataUri } : v));

          const tagResult = await generateVideoTags({
            frameDataUri,
            filename: video.file.name,
          });
          const newTags = tagResult.tags;
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: newTags } : v));
          
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: "uploading" } : v));
          
          const driveFile = await uploadFileWithProgress(video.file, newTags, video.id);
          
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: "success", driveId: driveFile.id, progress: 100 } : v));
          
          toast({
              title: "Upload Complete!",
              description: `${newTags} is now in your Google Drive.`,
          });

        } catch (error) {
          console.error(error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: "error", error: errorMessage } : v));
          toast({
            variant: "destructive",
            title: "Processing Failed",
            description: `Could not process ${video.file.name}. ${errorMessage}`,
          });
        }
      });

      await Promise.all(processingPromises);
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

  const heroVideo = useMemo(() => videos.find(v => v.status === 'success') || null, [videos]);

  const handleConnectDrive = async () => {
    try {
        const url = await getGoogleAuthUrl();
        window.location.href = url;
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Failed to connect",
            description: "Could not get Google authentication URL."
        });
    }
  };


  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-y-auto">
        <header className="sticky top-0 z-10 w-full bg-background/50 glassmorphic">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by tags..."
                        className="pl-10 w-full bg-black/20 focus-visible:ring-primary focus-visible:ring-offset-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label htmlFor="video-upload" className={cn(buttonVariants({ size: "sm" }), "cursor-pointer gap-2", { 'opacity-50 cursor-not-allowed': driveConnected === false || isProcessing })}>
                        <Upload className="h-4 w-4" />
                        <span>{isProcessing ? "Processing..." : "Upload"}</span>
                    </label>
                    <input
                        id="video-upload"
                        type="file"
                        multiple
                        accept="video/*"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={driveConnected === false || isProcessing}
                    />
                     <Link href="/drive" className={cn(buttonVariants({ size: "icon", variant: "ghost" }))}>
                        {driveConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Disc3 className="h-5 w-5" />}
                    </Link>
                </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
            {heroVideo ? (
                <div className="mb-12">
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
                        <Image src={heroVideo.thumbnail!} alt={heroVideo.tags || "Hero video"} fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 text-white">
                            <h2 className="text-4xl font-bold mb-2">{heroVideo.tags?.split('_').slice(1,3).join(' ')}</h2>
                            <p className="text-lg text-muted-foreground">{heroVideo.tags}</p>
                            <div className="mt-4 flex gap-4">
                                <Button onClick={() => setSelectedVideoForPlayback(heroVideo)} size="lg">
                                    <Play className="mr-2"/> Play
                                </Button>
                                <Button onClick={() => setSelectedVideoForRefinement(heroVideo)} size="lg" variant="secondary">
                                    <Pencil className="mr-2"/> Refine
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : videos.length > 0 ? (
                <Skeleton className="w-full aspect-video rounded-2xl mb-12"/>
            ): null}


            {videos.length > 0 ? (
                <>
                    <h2 className="text-2xl font-bold mb-6">Your Library</h2>
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
                <Clapperboard className="w-24 h-24 mb-4 text-primary/50" />
                <h2 className="text-2xl font-semibold text-foreground">Welcome to Revspot Vision</h2>
                <p className="max-w-md mt-2">
                Connect your Google Drive, then upload videos. We'll analyze them, tag them, and save them directly to your Drive.
                </p>
                { driveConnected === false ? (
                    <Button onClick={handleConnectDrive} size="lg" className="mt-6">Connect Google Drive</Button>
                ) : (
                 <label htmlFor="video-upload-main" className={cn(buttonVariants({ size: "lg", className: "mt-6" }), "cursor-pointer gap-2", { 'opacity-50 cursor-not-allowed': isProcessing })}>
                    <Upload className="h-4 w-4" />
                    <span>{isProcessing ? "Processing..." : "Upload Your First Video"}</span>
                </label>
                )}
                <input
                    id="video-upload-main"
                    type="file"
                    multiple
                    accept="video/*"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={driveConnected === false || isProcessing}
                />
            </div>
            )}
        </main>
      </div>

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

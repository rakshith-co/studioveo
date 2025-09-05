
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { generateVideoTags } from "@/ai/flows/generate-video-tags";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Clapperboard, Copy } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoPlayerModal } from "@/components/video-player-modal";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export interface VideoFile {
  id: string;
  file: File;
  objectURL: string;
  thumbnail: string | null;
  tags: string | null;
  status: "queued" | "processing" | "success" | "error";
  error?: string;
}

export default function HomePage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVideoForPlayback, setSelectedVideoForPlayback] = useState<VideoFile | null>(null);

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
          
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: newTags, status: "success" } : v));
          
          toast({
              title: "Analysis Complete!",
              description: `Generated filename for ${video.file.name}.`,
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

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard!",
      description: "You can now rename your file.",
    });
  };

  const heroVideo = useMemo(() => videos.find(v => v.status === 'success') || null, [videos]);

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
                    <label htmlFor="video-upload" className={cn(buttonVariants({ size: "sm" }), "cursor-pointer gap-2", { 'opacity-50 cursor-not-allowed': isProcessing })}>
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
                        disabled={isProcessing}
                    />
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
                                    Play
                                </Button>
                                <Button onClick={() => handleCopyToClipboard(heroVideo.tags!)} size="lg" variant="secondary">
                                    <Copy className="mr-2"/> Copy Filename
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
                        onCopy={() => handleCopyToClipboard(video.tags!)}
                        />
                    ))}
                    </div>
                </>
            ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                <Clapperboard className="w-24 h-24 mb-4 text-primary/50" />
                <h2 className="text-2xl font-semibold text-foreground">Welcome to Revspot Vision</h2>
                <p className="max-w-md mt-2">
                 Upload your real estate videos, and we'll analyze them to generate the perfect, SEO-friendly filename.
                </p>
                 <label htmlFor="video-upload-main" className={cn(buttonVariants({ size: "lg", className: "mt-6" }), "cursor-pointer gap-2", { 'opacity-50 cursor-not-allowed': isProcessing })}>
                    <Upload className="h-4 w-4" />
                    <span>{isProcessing ? "Processing..." : "Upload Your First Video"}</span>
                </label>
                <input
                    id="video-upload-main"
                    type="file"
                    multiple
                    accept="video/*"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isProcessing}
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
    </div>
  );
}

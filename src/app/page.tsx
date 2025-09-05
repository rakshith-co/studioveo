
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { generateVideoTags } from "@/ai/flows/generate-video-tags";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Clapperboard, Copy, Save, Loader2 } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoPlayerModal } from "@/components/video-player-modal";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { signIn, signOut, useSession } from "@/lib/google-auth";

export interface VideoFile {
  id: string; // Will be fileId from Drive or a local identifier
  file?: File; // For local files
  objectURL: string;
  thumbnail: string | null;
  tags: string | null;
  status: "queued" | "processing" | "success" | "error";
  error?: string;
  source: 'drive' | 'local';
  driveId?: string; // Google Drive file ID
}

// Public Google API Key
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
// Client ID from environment variables
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const FOLDER_NAME = "RevspotVision-Uploads";


export default function HomePage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVideoForPlayback, setSelectedVideoForPlayback] = useState<VideoFile | null>(null);
  const { session, status: sessionStatus } = useSession();
  const { toast } = useToast();

  const pickerApiLoaded = useRef(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);

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
        source: 'local'
      }));

    if (newVideos.length === 0) {
      toast({
        variant: "destructive",
        title: "No Video Files Selected",
        description: "Please choose one or more video files.",
      });
      return;
    }

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

  const extractFrame = useCallback((videoSource: File | string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 3); 
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        URL.revokeObjectURL(video.src);
        resolve(dataUrl);
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load or process video file. It might be corrupt or an unsupported format."));
      };
      
      if (typeof videoSource === 'string') {
        video.src = videoSource;
      } else {
        video.src = URL.createObjectURL(videoSource);
      }
    });
  }, []);
  
  const processPickedFile = useCallback(async (doc: google.picker.Document) => {
    setIsProcessing(true);
    setVideos(prev => [{
      id: doc.id,
      driveId: doc.id,
      objectURL: '',
      thumbnail: null,
      tags: null,
      status: 'processing',
      source: 'drive'
    }, ...prev]);

    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) throw new Error('Failed to download file from Google Drive.');

      const videoBlob = await response.blob();
      const objectURL = URL.createObjectURL(videoBlob);
      
      setVideos(prev => prev.map(v => v.id === doc.id ? { ...v, objectURL } : v));

      const frameDataUri = await extractFrame(objectURL);
      setVideos(prev => prev.map(v => v.id === doc.id ? { ...v, thumbnail: frameDataUri } : v));

      const tagResult = await generateVideoTags({
        frameDataUri,
        filename: doc.name,
      });

      setVideos(prev => prev.map(v => v.id === doc.id ? { ...v, tags: tagResult.tags, status: 'success' } : v));
      toast({
        title: "Analysis Complete!",
        description: `Generated filename for ${doc.name}.`,
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setVideos(prev => prev.map(v => v.id === doc.id ? { ...v, status: 'error', error: errorMessage } : v));
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: `Could not process ${doc.name}. ${errorMessage}`,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [session, extractFrame, toast]);

  const createPicker = useCallback((accessToken: string) => {
    const showPicker = () => {
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      view.setMimeTypes("video/*");

      const uploadView = new google.picker.DocsUploadView();
      uploadView.setParent(FOLDER_NAME);
      uploadView.setMimeTypes("video/*");

      const picker = new google.picker.PickerBuilder()
        .setAppId(process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER!)
        .setOAuthToken(accessToken)
        .addView(view)
        .addView(uploadView)
        .setTitle(`Select a video or upload to "${FOLDER_NAME}"`)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback((data: google.picker.ResponseObject) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            processPickedFile(doc);
          }
        })
        .build();
      picker.setVisible(true);
      setIsPickerLoading(false);
    }

    if (pickerApiLoaded.current) {
        showPicker();
    } else {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            gapi.load('picker', () => {
                pickerApiLoaded.current = true;
                showPicker();
            });
        };
        script.onerror = () => {
            toast({ variant: 'destructive', title: "Error", description: "Could not load Google Picker." });
            setIsPickerLoading(false);
        }
        document.head.appendChild(script);
    }
  }, [processPickedFile, toast]);

  const handlePick = () => {
    setIsPickerLoading(true);

    if (sessionStatus !== 'authenticated' || !session?.accessToken) {
      toast({ variant: 'destructive', title: "Authentication Required", description: "Please connect your Google Drive first." });
      setIsPickerLoading(false);
      return;
    }
    
    const accessToken = session.accessToken;
    createPicker(accessToken);
  };


  useEffect(() => {
    const processQueue = async () => {
      const videosToProcess = videos.filter(v => v.status === "queued" && v.source === 'local');
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
          if (!video.file) throw new Error("Local file not found for processing.");
          
          const frameDataUri = await extractFrame(video.file);
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, thumbnail: frameDataUri } : v));

          const tagResult = await generateVideoTags({
            frameDataUri,
            filename: video.file.name,
          });
          
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: tagResult.tags, status: "success" } : v));
          
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

  const handleSaveToDrive = async (video: VideoFile) => {
    if (video.source !== 'drive' || !video.driveId || !video.tags) return;
    try {
      const res = await fetch('/api/rename-drive-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: video.driveId, newName: video.tags })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to rename file in Google Drive.");
      }
      toast({
        title: 'File Renamed!',
        description: `Successfully renamed the file in Google Drive.`,
      });
    } catch(error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: errorMessage,
        });
    }
  }

  const heroVideo = useMemo(() => videos.find(v => v.status === 'success') || null, [videos]);
  
  const AuthButton = () => {
    if (sessionStatus === 'loading') {
      return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please Wait</Button>;
    }
    if (sessionStatus === 'authenticated') {
      return <Button onClick={() => signOut()}>Disconnect Drive</Button>;
    }
    return <Button onClick={() => signIn()}>Connect Drive</Button>;
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
                  <AuthButton />
                  <Button onClick={handlePick} disabled={isPickerLoading || isProcessing}>
                    {isPickerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isProcessing ? "Processing..." : isPickerLoading ? "Loading..." : "Pick from Drive"}
                  </Button>
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
                                {heroVideo.source === 'drive' ? (
                                    <Button onClick={() => handleSaveToDrive(heroVideo)} size="lg" variant="secondary">
                                        <Save className="mr-2"/> Save to Drive
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleCopyToClipboard(heroVideo.tags!)} size="lg" variant="secondary">
                                        <Copy className="mr-2"/> Copy Filename
                                    </Button>
                                )}
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
                          onSaveToDrive={() => handleSaveToDrive(video)}
                        />
                    ))}
                    </div>
                </>
            ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                <Clapperboard className="w-24 h-24 mb-4 text-primary/50" />
                <h2 className="text-2xl font-semibold text-foreground">Welcome to Revspot Vision</h2>
                <p className="max-w-md mt-2">
                 Connect your Google Drive, pick a video, and we'll analyze it to generate the perfect, SEO-friendly filename.
                </p>
                 <Button onClick={handlePick} size="lg" className="mt-6" disabled={isPickerLoading || isProcessing}>
                    <Upload className="h-4 w-4" />
                     {isProcessing ? "Processing..." : isPickerLoading ? "Loading..." : "Pick Your First Video"}
                 </Button>
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

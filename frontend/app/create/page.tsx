"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Video,
  Upload,
  Image as ImageIcon,
  X,
  Download,
  Play,
  ChevronLeft,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  processImages,
  pollJobStatus,
  type JobStatusResponse,
} from "@/lib/api";

const TEMPLATE_VIDEOS = [
  {
    id: 1,
    name: "Highway Drive",
    thumbnail:
      "https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?auto=compress&cs=tinysrgb&w=400",
    videoUrl:
      "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4",
  },
  {
    id: 2,
    name: "City Timelapse",
    thumbnail:
      "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=400",
    videoUrl:
      "https://videos.pexels.com/video-files/855564/855564-hd_1920_1080_25fps.mp4",
  },
  {
    id: 3,
    name: "Ocean Waves",
    thumbnail:
      "https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg?auto=compress&cs=tinysrgb&w=400",
    videoUrl:
      "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_30fps.mp4",
  },
  {
    id: 4,
    name: "Mountain Road",
    thumbnail:
      "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=400",
    videoUrl:
      "https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4",
  },
];

export default function CreatePage() {
  const [meme1, setMeme1] = useState<string | null>(null);
  const [meme2, setMeme2] = useState<string | null>(null);
  const [meme1File, setMeme1File] = useState<File | null>(null);
  const [meme2File, setMeme2File] = useState<File | null>(null);
  const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jobStatus, setJobStatus] = useState<
    "idle" | "queued" | "processing" | "completed" | "error"
  >("idle");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const meme1InputRef = useRef<HTMLInputElement>(null);
  const meme2InputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleMeme1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMeme1File(file);
      const reader = new FileReader();
      reader.onload = (e) => setMeme1(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMeme2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMeme2File(file);
      const reader = new FileReader();
      reader.onload = (e) => setMeme2(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackgroundVideo(url);
      setSelectedTemplate(null);
    }
  };

  const handleTemplateSelect = (template: (typeof TEMPLATE_VIDEOS)[0]) => {
    setBackgroundVideo(template.videoUrl);
    setSelectedTemplate(template.id);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleExport = async () => {
    try {
      if (!meme1File || !meme2File) {
        console.error("Both memes are required");
        return;
      }
      setIsExporting(true);
      setJobStatus("idle");
      setPollingError(null);

      // Generate a short job ID and stash it locally for retrieval later
      const jobId = Math.random().toString(36).slice(2, 10);
      setCurrentJobId(jobId);

      const res = await processImages({
        image1: meme1File,
        image2: meme2File,
        includeAudio: false,
        durationSeconds: 6,
        jobId,
      });

      console.log("Queued job:", res);
      setJobStatus("queued");

      // Show notification to user
      alert(
        `✅ Video processing started!\n\nJob ID: ${jobId}\n\n⚠️ Please keep this tab open while processing.\n\nThe video will be ready in about 30-60 seconds.`
      );

      // Start polling for status
      setIsExporting(false);
      setJobStatus("processing");

      try {
        const completedStatus = await pollJobStatus(
          jobId,
          (status) => {
            console.log("Job status update:", status);
            // Could update UI here if needed during polling
          },
          180, // 3 minutes max
          2000 // Poll every 2 seconds
        );

        setJobStatus("completed");
        setDownloadUrl(completedStatus.download_url || null);

        // Show completion notification
        alert(
          `🎉 Video processing complete!\n\nJob ID: ${jobId}\n\nClick "Download Video" below to get your video.`
        );
      } catch (pollErr) {
        console.error("Polling error:", pollErr);
        setPollingError(String(pollErr));
        setJobStatus("error");
        alert(
          `⏳ Video is still processing.\n\nJob ID: ${jobId}\n\nPlease wait and check back in a minute. The video may take up to 2 minutes to process.`
        );
      }
    } catch (err) {
      console.error(err);
      setJobStatus("error");
      setPollingError(String(err));
      alert(`❌ Export failed: ${String(err)}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
              <Video className="w-8 h-8 text-emerald-500" />
              <span className="text-2xl font-bold text-white">MemeClips</span>
            </Link>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={
                !meme1File ||
                !meme2File ||
                !backgroundVideo ||
                isExporting ||
                jobStatus === "processing"
              }
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting
                ? "Exporting…"
                : jobStatus === "processing"
                ? "Processing…"
                : "Export Video"}
            </Button>
          </div>
        </div>

        {/* Job Status Banner */}
        {(jobStatus === "processing" ||
          jobStatus === "queued" ||
          jobStatus === "completed" ||
          jobStatus === "error") && (
          <div
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 ${
              jobStatus === "completed"
                ? "bg-emerald-900/50 border-emerald-700"
                : jobStatus === "processing" || jobStatus === "queued"
                ? "bg-blue-900/50 border-blue-700"
                : "bg-red-900/50 border-red-700"
            } border-b`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {jobStatus === "completed" && (
                  <span className="text-2xl">🎉</span>
                )}
                {(jobStatus === "processing" || jobStatus === "queued") && (
                  <span className="text-2xl animate-spin">⏳</span>
                )}
                {jobStatus === "error" && <span className="text-2xl">❌</span>}
                <div>
                  <p className="text-white font-medium">
                    {jobStatus === "completed" && "Video processing complete!"}
                    {(jobStatus === "processing" || jobStatus === "queued") &&
                      "Video processing in progress..."}
                    {jobStatus === "error" && "Processing error occurred"}
                  </p>
                  {currentJobId && (
                    <p className="text-xs text-slate-400">
                      Job ID: {currentJobId}
                    </p>
                  )}
                  {(jobStatus === "processing" || jobStatus === "queued") && (
                    <p className="text-xs text-slate-300 mt-1">
                      ⚠️ Please keep this tab open
                    </p>
                  )}
                  {pollingError && (
                    <p className="text-xs text-red-300 mt-1">{pollingError}</p>
                  )}
                </div>
              </div>
              {jobStatus === "completed" && downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Upload Memes
              </h2>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="meme1"
                    className="text-white text-base mb-2 block"
                  >
                    First Meme (Required){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    {meme1 ? (
                      <div className="relative border-2 border-emerald-500 rounded-lg overflow-hidden">
                        <img
                          src={meme1}
                          alt="Meme 1"
                          className="w-full h-48 object-contain bg-slate-800"
                        />
                        <button
                          onClick={() => {
                            setMeme1(null);
                            setMeme1File(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => meme1InputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-emerald-500 transition-colors bg-slate-800/50"
                      >
                        <ImageIcon className="w-12 h-12 text-slate-500 mb-2" />
                        <span className="text-slate-400">
                          Click to upload image
                        </span>
                      </button>
                    )}
                    <Input
                      ref={meme1InputRef}
                      id="meme1"
                      type="file"
                      accept="image/*"
                      onChange={handleMeme1Upload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="meme2"
                    className="text-white text-base mb-2 block"
                  >
                    Second Meme (Optional)
                  </Label>
                  <div className="relative">
                    {meme2 ? (
                      <div className="relative border-2 border-emerald-500 rounded-lg overflow-hidden">
                        <img
                          src={meme2}
                          alt="Meme 2"
                          className="w-full h-48 object-contain bg-slate-800"
                        />
                        <button
                          onClick={() => {
                            setMeme2(null);
                            setMeme2File(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => meme2InputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-emerald-500 transition-colors bg-slate-800/50"
                      >
                        <ImageIcon className="w-12 h-12 text-slate-500 mb-2" />
                        <span className="text-slate-400">
                          Click to upload image
                        </span>
                      </button>
                    )}
                    <Input
                      ref={meme2InputRef}
                      id="meme2"
                      type="file"
                      accept="image/*"
                      onChange={handleMeme2Upload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Background Video
              </h2>

              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {TEMPLATE_VIDEOS.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          selectedTemplate === template.id
                            ? "border-emerald-500 shadow-lg shadow-emerald-500/50"
                            : "border-slate-600 hover:border-slate-500"
                        }`}
                      >
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                          <span className="text-white text-sm font-medium">
                            {template.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-emerald-500 transition-colors bg-slate-800/50"
                  >
                    <Upload className="w-12 h-12 text-slate-500 mb-2" />
                    <span className="text-slate-400">
                      Click to upload video
                    </span>
                    <span className="text-slate-500 text-sm mt-1">
                      MP4, WebM, MOV
                    </span>
                  </button>
                  <Input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="lg:sticky lg:top-8 h-fit">
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Preview</h2>

              <div className="relative aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden">
                {backgroundVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      src={backgroundVideo}
                      className="w-full h-full object-cover"
                      loop
                      playsInline
                    />

                    {meme1 && (
                      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[85%] z-10">
                        <img
                          src={meme1}
                          alt="Meme 1"
                          className="w-full h-auto rounded-lg shadow-2xl"
                        />
                      </div>
                    )}

                    {meme2 && (
                      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[85%] z-10">
                        <img
                          src={meme2}
                          alt="Meme 2"
                          className="w-full h-auto rounded-lg shadow-2xl"
                        />
                      </div>
                    )}

                    <button
                      onClick={togglePlayPause}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
                    >
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-slate-900 ml-1" />
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <Video className="w-16 h-16 mb-4" />
                    <p className="text-center">
                      Select a background video to preview
                    </p>
                  </div>
                )}
              </div>

              {(!meme1 || !backgroundVideo) && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-sm">
                    {!meme1 &&
                      !backgroundVideo &&
                      "Upload at least one meme and select a background video to start creating."}
                    {meme1 &&
                      !backgroundVideo &&
                      "Select a background video to preview your creation."}
                    {!meme1 &&
                      backgroundVideo &&
                      "Upload at least one meme to continue."}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

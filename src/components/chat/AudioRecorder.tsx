"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Play, Pause, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
    onSend: (blob: Blob, durationSeconds: number) => void;
    onCancel: () => void;
    isSending: boolean;
}

type Phase = "requesting" | "recording" | "preview" | "error";

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
};

// Get the best supported mime type for this browser/device
const getSupportedMimeType = (): string => {
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "", // empty string = browser default
    ];
    for (const type of types) {
        try {
            if (type === "" || MediaRecorder.isTypeSupported(type)) return type;
        } catch {
            // ignore
        }
    }
    return "";
};

export const AudioRecorder = ({ onSend, onCancel, isSending }: AudioRecorderProps) => {
    const [phase, setPhase] = useState<Phase>("requesting");
    const [errorMsg, setErrorMsg] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    // Static waveform heights (computed once, not on every render)
    const [waveHeights] = useState(() =>
        Array.from({ length: 24 }, (_, i) => 4 + Math.abs(Math.sin(i * 0.7)) * 14)
    );

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const blobRef = useRef<Blob | null>(null);
    const mimeTypeRef = useRef<string>("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const elapsedRef = useRef(0);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopRecording = useCallback(() => {
        stopTimer();
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        } catch {
            // ignore
        }
        stopStream();
    }, [stopTimer, stopStream]);

    // Request mic permission and start recording
    useEffect(() => {
        let cancelled = false;

        const start = async () => {
            // Check if getUserMedia is available (not available on non-HTTPS or old browsers)
            if (!navigator.mediaDevices?.getUserMedia) {
                setErrorMsg("Microphone not supported on this browser. Please use Chrome or Firefox.");
                setPhase("error");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;

                const mimeType = getSupportedMimeType();
                mimeTypeRef.current = mimeType;
                chunksRef.current = [];

                const options = mimeType ? { mimeType } : {};
                const recorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                };

                recorder.onerror = () => {
                    if (!cancelled) {
                        setErrorMsg("Recording error. Please try again.");
                        setPhase("error");
                        stopStream();
                        stopTimer();
                    }
                };

                recorder.onstop = () => {
                    if (cancelled) return;
                    if (chunksRef.current.length === 0) {
                        setErrorMsg("No audio recorded. Please try again.");
                        setPhase("error");
                        return;
                    }
                    const finalMime = mimeType || "audio/webm";
                    const blob = new Blob(chunksRef.current, { type: finalMime });
                    blobRef.current = blob;

                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audioRef.current = audio;

                    audio.onloadedmetadata = () => {
                        // Some browsers report Infinity for duration on blobs
                        const dur = isFinite(audio.duration) ? audio.duration : elapsedRef.current;
                        setAudioDuration(dur);
                    };
                    audio.ontimeupdate = () => setPlaybackTime(audio.currentTime);
                    audio.onended = () => { setIsPlaying(false); setPlaybackTime(0); };

                    setPhase("preview");
                };

                recorder.start(250); // collect data every 250ms
                setPhase("recording");

                // Start elapsed timer
                timerRef.current = setInterval(() => {
                    elapsedRef.current += 1;
                    setElapsed((prev) => {
                        if (prev >= 119) {
                            // Auto-stop at 2 minutes
                            stopRecording();
                            return prev;
                        }
                        return prev + 1;
                    });
                }, 1000);

            } catch (err: any) {
                if (cancelled) return;
                let msg = "Could not access microphone.";
                if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
                    msg = "Microphone permission denied. Please allow microphone access in your browser settings.";
                } else if (err?.name === "NotFoundError") {
                    msg = "No microphone found on this device.";
                } else if (err?.name === "NotSupportedError") {
                    msg = "Recording is not supported on this browser. Try Chrome.";
                }
                setErrorMsg(msg);
                setPhase("error");
            }
        };

        start();

        return () => {
            cancelled = true;
            stopTimer();
            try {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                    mediaRecorderRef.current.stop();
                }
            } catch { /* ignore */ }
            stopStream();
            if (audioRef.current) {
                audioRef.current.pause();
                if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStop = () => stopRecording();

    const handleCancel = useCallback(() => {
        stopRecording();
        if (audioRef.current) {
            audioRef.current.pause();
            if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        }
        onCancel();
    }, [stopRecording, onCancel]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(() => {
                setIsPlaying(false);
            });
            setIsPlaying(true);
        }
    };

    const handleSend = () => {
        if (!blobRef.current || isSending) return;
        if (audioRef.current) {
            audioRef.current.pause();
            if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        }
        onSend(blobRef.current, audioDuration || elapsed);
    };

    const progress = audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0;

    // ── Requesting permission ──────────────────────────────────────────────────
    if (phase === "requesting") {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl w-full">
                <Loader2 className="w-5 h-5 text-navy-deep animate-spin flex-shrink-0" />
                <span className="text-sm text-gray-600">Requesting microphone access…</span>
                <Button variant="ghost" size="sm" className="ml-auto text-gray-400" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (phase === "error") {
        return (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl w-full">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 flex-1">{errorMsg}</p>
                <Button variant="ghost" size="sm" className="text-gray-500 flex-shrink-0" onClick={onCancel}>
                    Close
                </Button>
            </div>
        );
    }

    // ── Recording ──────────────────────────────────────────────────────────────
    if (phase === "recording") {
        return (
            <div className="flex items-center gap-3 px-3 py-2 bg-red-50 border border-red-200 rounded-2xl w-full">
                {/* Pulsing mic */}
                <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
                </div>

                <span className="text-sm font-mono font-bold text-red-600 flex-shrink-0 w-12">
                    {formatTime(elapsed)}
                </span>

                {/* Static waveform bars */}
                <div className="flex items-center gap-0.5 flex-1 overflow-hidden">
                    {waveHeights.map((h, i) => (
                        <div
                            key={i}
                            className="bg-red-400 rounded-full w-1 flex-shrink-0"
                            style={{
                                height: `${h}px`,
                                animationName: "pulse",
                                animationDuration: `${0.5 + i * 0.04}s`,
                                animationTimingFunction: "ease-in-out",
                                animationIterationCount: "infinite",
                                animationDirection: "alternate",
                            }}
                        />
                    ))}
                </div>

                {/* Stop */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-red-600 hover:bg-red-100 flex-shrink-0"
                    onClick={handleStop}
                    title="Stop recording"
                >
                    <Square className="w-4 h-4 fill-red-600" />
                </Button>

                {/* Cancel */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-gray-100 flex-shrink-0"
                    onClick={handleCancel}
                    title="Cancel"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    // ── Preview ────────────────────────────────────────────────────────────────
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl w-full">
            {/* Play/Pause */}
            <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 bg-navy-deep text-white hover:bg-navy-medium rounded-full flex-shrink-0"
                onClick={handlePlayPause}
            >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>

            {/* Progress bar */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-navy-deep rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>{formatTime(playbackTime)}</span>
                    <span>{formatTime(audioDuration || elapsed)}</span>
                </div>
            </div>

            {/* Discard */}
            <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-gray-100 flex-shrink-0"
                onClick={handleCancel}
                title="Discard"
            >
                <Trash2 className="w-4 h-4" />
            </Button>

            {/* Send */}
            <Button
                size="icon"
                className="w-9 h-9 rounded-full flex-shrink-0 shadow-md bg-power-red hover:bg-red-600 text-white"
                onClick={handleSend}
                disabled={isSending}
                title="Send voice message"
            >
                {isSending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
        </div>
    );
};

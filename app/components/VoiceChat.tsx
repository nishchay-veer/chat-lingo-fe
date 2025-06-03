'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mic, StopCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  isPending?: boolean;
}

interface VoiceChatProps {
  lessonId: number;
  onNewMessage: (message: Message) => void;
}

export const VoiceChat = ({ lessonId, onNewMessage }: VoiceChatProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (isRecording && canvasRef.current && analyser && dataArray) {
      const drawWaveform = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const width = canvas.width;
        const height = canvas.height;

        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#f1f5f9'; // slate-100
        ctx.fillRect(0, 0, width, height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0ea5e9'; // sky-500
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, analyser, dataArray]);

  const setupAudioContext = async (stream: MediaStream) => {
    const newAudioContext = new AudioContext();
    const source = newAudioContext.createMediaStreamSource(stream);
    const newAnalyser = newAudioContext.createAnalyser();
    newAnalyser.fftSize = 2048;
    const newDataArray = new Uint8Array(newAnalyser.frequencyBinCount);
    
    source.connect(newAnalyser);
    
    setAudioContext(newAudioContext);
    setAnalyser(newAnalyser);
    setDataArray(newDataArray);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await setupAudioContext(stream);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await processAudioToText();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
        setAnalyser(null);
        setDataArray(null);
      }
    }
  };

  const processAudioToText = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      audioChunksRef.current = [];

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          lessonId,
          processType: 'transcribe'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      
      // Add user message
      onNewMessage({
        text: data.userText,
        isUser: true,
        timestamp: new Date(),
      });

      // Add pending AI message
      onNewMessage({
        text: "Thinking...",
        isUser: false,
        timestamp: new Date(),
        isPending: true,
      });

      // Process with AI
      const aiResponse = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: data.userText,
          lessonId,
          processType: 'respond'
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiData = await aiResponse.json();

      // Update AI response
      onNewMessage({
        text: aiData.text,
        isUser: false,
        timestamp: new Date(),
      });

      // Play the response audio
      const audio = new Audio(aiData.audioUrl);
      await audio.play();

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process your speech. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        size="lg"
        className="rounded-full w-16 h-16 bg-sky-500 hover:bg-sky-600 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Mic className="h-8 w-8" />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open && isRecording) {
          stopRecording();
        }
        setIsModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {isRecording ? 'Listening...' : 'Start Speaking'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 p-4">
            <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100">
              <canvas
                ref={canvasRef}
                width={400}
                height={128}
                className="w-full h-full"
              />
            </div>
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              size="lg"
              className={cn(
                "rounded-full w-20 h-20 transition-all duration-200",
                isRecording 
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-sky-500 hover:bg-sky-600"
              )}
            >
              {isRecording ? (
                <StopCircle className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>

            {isProcessing && (
              <div className="text-base text-slate-600 animate-pulse">
                Processing your speech...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 
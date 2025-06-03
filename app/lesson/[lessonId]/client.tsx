'use client';

import { useState } from "react";
import { VoiceChat } from "@/app/components/VoiceChat";
import { ChatInterface } from "@/app/components/ChatInterface";

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  isPending?: boolean;
}

interface LessonClientProps {
  lesson: {
    id: number;
    title: string;
  };
}

export function LessonClient({ lesson }: LessonClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => {
      // If this is a non-pending message and we have a pending message, replace it
      if (!message.isPending && prev.length > 0 && prev[prev.length - 1].isPending) {
        return [...prev.slice(0, -1), message];
      }
      return [...prev, message];
    });
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-6 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">
            {lesson.title}
          </h1>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            Speaking Practice
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="pt-16 h-screen">
        <ChatInterface messages={messages} />
        <div className="fixed bottom-8 right-8 z-20">
          <VoiceChat
            lessonId={lesson.id}
            onNewMessage={handleNewMessage}
          />
        </div>
      </div>
    </main>
  );
} 
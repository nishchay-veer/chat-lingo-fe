"use client";
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  isPending?: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
}

export const ChatInterface = ({ messages }: ChatInterfaceProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Voice Chat Practice</h1>
        <div className="flex items-center gap-2">
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            Speaking Practice
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start gap-3",
              message.isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.isUser ? (
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                  <span className="text-sky-600 text-sm font-medium">You</span>
                </div>
              ) : (
                <div className="w-8 h-8 relative">
                  <Image
                    src="/mascot.svg"
                    alt="Assistant"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl p-4 relative",
                message.isUser
                  ? "bg-sky-500 text-white"
                  : "bg-white border border-slate-200",
                message.isPending && "opacity-70"
              )}
            >
              <div className="text-base mb-1">
                {message.text}
                {message.isPending && (
                  <span className="ml-2 animate-pulse">•••</span>
                )}
              </div>
              <div
                className={cn(
                  "text-xs absolute bottom-1 right-3",
                  message.isUser
                    ? "text-sky-100"
                    : "text-slate-400"
                )}
              >
                {format(message.timestamp, 'HH:mm')}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}; 
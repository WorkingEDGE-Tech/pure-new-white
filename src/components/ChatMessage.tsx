
import React from 'react';
import { Message } from '../contexts/VoiceAssistantContext';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[80%] md:max-w-[70%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 shrink-0",
          isUser ? "ml-2" : "mr-2",
          isUser ? "bg-dash-blue text-white" : "bg-dash-gray"
        )}>
          <span>{isUser ? "You" : "AI"}</span>
        </Avatar>
        
        <div className={cn(
          "rounded-lg px-4 py-2",
          isUser ? "bg-dash-blue text-white rounded-tr-none" : "bg-dash-gray text-gray-800 rounded-tl-none"
        )}>
          <p className="text-sm md:text-base whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <p className={cn(
            "text-xs mt-1",
            isUser ? "text-blue-100" : "text-gray-500"
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;


import React from 'react';
import { Message } from '../contexts/VoiceAssistantContext';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  
  // Format timestamp nicely
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(message.timestamp);

  return (
    <div className={cn(
      "flex w-full mb-4 transition-all",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[85%] md:max-w-[70%] transition-all duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 shrink-0 transition-all duration-300 shadow",
          isUser ? "ml-2" : "mr-2",
          isUser ? "bg-dash-blue text-white" : "bg-dash-gray text-dash-darkGray"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </Avatar>
        
        <div className={cn(
          "rounded-lg px-4 py-3 transition-all duration-300 shadow-sm hover:shadow-md",
          isUser 
            ? "bg-dash-blue text-white rounded-tr-none bg-gradient-to-br from-dash-blue to-dash-darkBlue" 
            : "bg-dash-gray text-gray-800 rounded-tl-none"
        )}>
          <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
          <p className={cn(
            "text-xs mt-2 opacity-70",
            isUser ? "text-blue-100" : "text-gray-500"
          )}>
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;


import React, { useEffect, useRef } from 'react';
import { useVoiceAssistant, Message } from '../contexts/VoiceAssistantContext';
import ChatMessage from './ChatMessage';
import { cn } from '@/lib/utils';

const ChatContainer: React.FC = () => {
  const { messages, isListening, isSpeaking, isProcessing } = useVoiceAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={cn(
      "flex-1 overflow-y-auto p-4 hide-scrollbar transition-all duration-300",
      (isListening || isSpeaking) && "bg-blue-50"
    )}>
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
          <div className="bg-dash-lightBlue text-dash-blue p-6 rounded-xl max-w-xs mx-auto shadow-md transform transition-transform duration-500 hover:scale-105 animate-fade-in">
            <h3 className="font-semibold text-lg mb-2">Welcome to Dash!</h3>
            <p className="text-sm">
              {isListening ? (
                <span className="animate-pulse">Listening to you...</span>
              ) : (
                <>Say "Dash" to activate me, or tap the microphone button to start talking.</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 transition-all duration-300">
          {messages.map((message: Message, index) => (
            <div key={message.id} className="transition-all duration-500 animate-fade-in" style={{
              animationDelay: `${index * 0.1}s`
            }}>
              <ChatMessage message={message} />
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {isProcessing && (
            <div className="flex justify-center my-4 animate-fade-in">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-dash-blue animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full bg-dash-blue animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-dash-blue animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      {isListening && (
        <div className="fixed bottom-28 left-0 right-0 flex justify-center animate-fade-in">
          <div className="bg-dash-blue text-white px-4 py-2 rounded-full shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span>Listening...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;


import React, { useEffect, useRef } from 'react';
import { useVoiceAssistant, Message } from '../contexts/VoiceAssistantContext';
import ChatMessage from './ChatMessage';

const ChatContainer: React.FC = () => {
  const { messages } = useVoiceAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
          <div className="bg-dash-lightBlue text-dash-blue p-6 rounded-xl max-w-xs mx-auto">
            <h3 className="font-semibold text-lg mb-2">Welcome to Dash!</h3>
            <p className="text-sm">
              Say "Dash" to activate me, or tap the microphone button to start talking.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message: Message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default ChatContainer;

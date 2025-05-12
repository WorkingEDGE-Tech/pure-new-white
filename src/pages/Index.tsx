
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';
import ChatContainer from '../components/ChatContainer';
import MicButton from '../components/MicButton';
import WakeWordToggle from '../components/WakeWordToggle';
import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ChatInterface: React.FC = () => {
  const { 
    isListening, 
    isProcessing, 
    toggleListening, 
    wakeWordActive,
    toggleWakeWord,
    clearMessages
  } = useVoiceAssistant();
  
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const navigate = useNavigate();
  
  // Check for microphone permission
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission(true);
        // Immediately stop the stream after permission check
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Microphone permission error:', error);
        setMicPermission(false);
        toast.error("Microphone access is required for voice features.", {
          duration: 5000,
          action: {
            label: "Help",
            onClick: () => {
              toast("Please allow microphone access in your browser settings and reload the page.");
            }
          }
        });
      }
    };
    
    checkMicrophonePermission();
  }, []);
  
  const handleToggleWakeWord = () => {
    if (!micPermission && !wakeWordActive) {
      toast.error("Microphone permission is required for wake word detection.");
      return;
    }
    toggleWakeWord();
  };
  
  const handleMicClick = () => {
    if (!micPermission && !isListening) {
      toast.error("Microphone permission is required for voice input.");
      return;
    }
    toggleListening();
  };
  
  return (
    <div className="flex flex-col h-full transition-all">
      <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-dash-blue transition-all hover:scale-105 duration-300">Dash</h1>
        <div className="flex items-center gap-4">
          <WakeWordToggle active={wakeWordActive} onChange={handleToggleWakeWord} />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="text-dash-darkGray hover:text-red-500 transition-colors"
              title="Clear messages"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-dash-darkGray hover:text-dash-blue transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <ChatContainer />
      
      <footer className="p-6 flex justify-center items-center border-t bg-white">
        <MicButton 
          isListening={isListening} 
          onClick={handleMicClick} 
          isProcessing={isProcessing} 
        />
      </footer>
      
      {micPermission === false && (
        <div className="fixed bottom-20 left-0 right-0 mx-auto w-11/12 max-w-md bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg animate-fade-in">
          <h3 className="font-medium text-yellow-800">Microphone Access Required</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Dash needs microphone access to work properly. Please enable it in your browser settings and reload the page.
          </p>
        </div>
      )}
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <div className="h-screen flex flex-col bg-white">
        <ChatInterface />
      </div>
    </VoiceAssistantProvider>
  );
};

export default Index;

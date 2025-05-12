
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';
import ChatContainer from '../components/ChatContainer';
import MicButton from '../components/MicButton';
import WakeWordToggle from '../components/WakeWordToggle';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const ChatInterface: React.FC = () => {
  const { 
    isListening, 
    isProcessing, 
    toggleListening, 
    wakeWordActive,
    toggleWakeWord
  } = useVoiceAssistant();
  
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold text-dash-blue">Dash</h1>
        <div className="flex items-center gap-4">
          <WakeWordToggle active={wakeWordActive} onChange={toggleWakeWord} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="text-dash-darkGray"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <ChatContainer />
      
      <footer className="p-6 flex justify-center items-center border-t">
        <MicButton 
          isListening={isListening} 
          onClick={toggleListening} 
          isProcessing={isProcessing} 
        />
      </footer>
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

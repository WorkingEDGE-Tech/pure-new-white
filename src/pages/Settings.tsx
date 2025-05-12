
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';
import { toast } from 'sonner';

const SettingsContent: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [customContext, setCustomContext] = useState('');
  const { clearMessages } = useVoiceAssistant();
  const navigate = useNavigate();

  useEffect(() => {
    // Load saved settings from localStorage
    const savedApiKey = localStorage.getItem('dashApiKey') || '';
    const savedCustomContext = localStorage.getItem('dashCustomContext') || '';
    
    setApiKey(savedApiKey);
    setCustomContext(savedCustomContext || "You are Dash, an intelligent AI assistant. You're helpful, friendly, and concise.");
  }, []);

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid Gemini API key");
      return;
    }

    localStorage.setItem('dashApiKey', apiKey.trim());
    localStorage.setItem('dashCustomContext', customContext.trim() || "You are Dash, an intelligent AI assistant. You're helpful, friendly, and concise.");
    
    toast.success("Settings saved successfully!");
  };
  
  const handleClearChat = () => {
    clearMessages();
    toast.success("Chat history cleared!");
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-dash-darkGray"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally in your browser and never sent to our servers.
              Get an API key from{" "}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-dash-blue underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="custom-context">Custom AI Context</Label>
            <Textarea
              id="custom-context"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Enter custom context for the AI assistant"
              className="min-h-32 resize-y"
            />
            <p className="text-xs text-muted-foreground">
              This context helps define how Dash should respond and act during conversations.
            </p>
          </div>
          
          <div className="pt-4 space-y-4">
            <Button 
              className="w-full bg-dash-blue hover:bg-dash-darkBlue"
              onClick={handleSaveSettings}
            >
              Save Settings
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleClearChat}
            >
              Clear Chat History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <div className="h-screen flex flex-col bg-white">
        <SettingsContent />
      </div>
    </VoiceAssistantProvider>
  );
};

export default Settings;

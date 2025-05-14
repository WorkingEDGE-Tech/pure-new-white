
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ElevenLabs Voice Options
const ELEVEN_LABS_VOICES = [
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria (Female)" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger (Male)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah (Female)" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura (Female)" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie (Male)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (Male)" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum (Male)" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River (Non-Binary)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam (Male)" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte (Female)" },
];

const SettingsContent: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [customContext, setCustomContext] = useState('');
  const { clearMessages } = useVoiceAssistant();
  const navigate = useNavigate();

  useEffect(() => {
    // Load saved settings from localStorage
    const savedApiKey = localStorage.getItem('dashApiKey') || '';
    const savedElevenLabsApiKey = localStorage.getItem('dashElevenLabsApiKey') || '';
    const savedVoiceId = localStorage.getItem('dashElevenLabsVoiceId') || '9BWtsMINqrJLrRacOk9x'; // Default to Aria
    const savedCustomContext = localStorage.getItem('dashCustomContext') || '';
    
    setApiKey(savedApiKey);
    setElevenLabsApiKey(savedElevenLabsApiKey);
    setVoiceId(savedVoiceId);
    setCustomContext(savedCustomContext || "You are Dash, an intelligent AI assistant. You're helpful, friendly, and concise.");
  }, []);

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid Gemini API key");
      return;
    }

    // Save settings to localStorage
    localStorage.setItem('dashApiKey', apiKey.trim());
    localStorage.setItem('dashElevenLabsApiKey', elevenLabsApiKey.trim());
    localStorage.setItem('dashElevenLabsVoiceId', voiceId);
    localStorage.setItem('dashCustomContext', customContext.trim() || "You are Dash, an intelligent AI assistant. You're helpful, friendly, and concise.");
    
    toast.success("Settings saved successfully!", {
      duration: 2000,
      position: "bottom-center",
      dismissible: true
    });
    
    // If ElevenLabs API key was provided, show additional toast
    if (elevenLabsApiKey.trim()) {
      toast.success("ElevenLabs voice will be used for responses", {
        duration: 3000,
        position: "bottom-center",
        dismissible: true
      });
    }
  };
  
  const handleClearChat = () => {
    clearMessages();
    toast.success("Chat history cleared!");
  };
  
  const handleTestVoice = async () => {
    if (!elevenLabsApiKey.trim()) {
      toast.error("Please enter your ElevenLabs API key first");
      return;
    }
    
    toast.info("Testing voice...");
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey.trim()
        },
        body: JSON.stringify({
          text: "Hello! This is a test of my voice with ElevenLabs.",
          model_id: "eleven_multilingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.play();
      
    } catch (error) {
      console.error('Error testing voice:', error);
      toast.error("Failed to test voice. Please check your API key and try again.");
    }
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
            <Label htmlFor="eleven-labs-api-key" className="flex justify-between">
              <span>ElevenLabs API Key</span>
              <span className="text-dash-blue text-sm">Required for voice</span>
            </Label>
            <Input
              id="eleven-labs-api-key"
              type="password"
              value={elevenLabsApiKey}
              onChange={(e) => setElevenLabsApiKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key"
              className="transition-all focus:ring-2 focus:ring-dash-blue"
            />
            <p className="text-xs text-muted-foreground">
              Required for natural voice responses. Get an API key from{" "}
              <a 
                href="https://elevenlabs.io/app/api-keys" 
                target="_blank" 
                rel="noreferrer" 
                className="text-dash-blue underline"
              >
                ElevenLabs
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="voice-selection">Voice</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestVoice}
                className="text-xs h-7 px-2 text-dash-blue border-dash-blue"
              >
                Test Voice
              </Button>
            </div>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {ELEVEN_LABS_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the voice personality for Dash's responses.
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
              className="w-full bg-dash-blue hover:bg-dash-darkBlue transition-all duration-300"
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


import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Define types for the context
export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

interface VoiceAssistantContextType {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  messages: Message[];
  toggleListening: () => void;
  sendTextMessage: (text: string) => Promise<void>;
  wakeWordActive: boolean;
  toggleWakeWord: () => void;
  clearMessages: () => void;
}

// Create the context
const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

// Constants
const WAKE_WORD = "dash";

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for the assistant
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      // Load saved messages from localStorage
      const savedMessages = localStorage.getItem('dashMessages');
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } catch (error) {
          console.error('Failed to load messages from localStorage:', error);
        }
      }
      
      // Load saved wake word state
      const savedWakeWordActive = localStorage.getItem('dashWakeWordActive');
      if (savedWakeWordActive) {
        setWakeWordActive(savedWakeWordActive === 'true');
      }
    }

    return () => {
      // Clean up speech synthesis
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);
  
  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dashMessages', JSON.stringify(messages));
    }
  }, [messages]);
  
  // Save wake word state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashWakeWordActive', wakeWordActive.toString());
    
    if (wakeWordActive) {
      initializeWakeWordDetection();
    } else {
      stopWakeWordDetection();
    }
    
    return () => {
      stopWakeWordDetection();
    };
  }, [wakeWordActive]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser.");
      return false;
    }

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // If we have a final transcript, process it
      if (finalTranscript.trim() !== '') {
        sendTextMessage(finalTranscript);
        finalTranscript = '';
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please enable microphone access.");
      }
    };

    recognition.onend = () => {
      // Only reset if we're not actively stopping it
      if (isListening) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    return true;
  };

  // Initialize wake word detection
  const initializeWakeWordDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser.");
      setWakeWordActive(false);
      return;
    }

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        
        if (transcript.includes(WAKE_WORD)) {
          toast.success(`Wake word detected: ${WAKE_WORD}`);
          // Stop wake word detection temporarily
          recognition.stop();
          // Start listening for the command
          toggleListening();
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Wake word recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please enable microphone access.");
        setWakeWordActive(false);
      }
    };

    recognition.onend = () => {
      // Restart if wake word is still active and we're not currently listening
      if (wakeWordActive && !isListening) {
        recognition.start();
      }
    };

    wakeWordRecognitionRef.current = recognition;
    recognition.start();
  };

  // Stop wake word detection
  const stopWakeWordDetection = () => {
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
      wakeWordRecognitionRef.current = null;
    }
  };

  // Toggle listening state
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        const initialized = initializeSpeechRecognition();
        if (!initialized) return;
      }
      
      // Stop wake word detection while actively listening
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
      
      recognitionRef.current?.start();
      setIsListening(true);
      
      // Add a timeout to stop listening after 8 seconds of silence
      setTimeout(() => {
        if (isListening && recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
          
          // Restart wake word detection if needed
          if (wakeWordActive) {
            initializeWakeWordDetection();
          }
        }
      }, 8000);
    }
  };

  // Toggle wake word detection
  const toggleWakeWord = () => {
    setWakeWordActive(!wakeWordActive);
  };

  // Clear chat messages
  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('dashMessages');
  };

  // Function to speak text
  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      
      // Restart wake word detection if needed
      if (wakeWordActive && wakeWordRecognitionRef.current && !wakeWordRecognitionRef.current.running) {
        wakeWordRecognitionRef.current.start();
      }
    };
    
    synthRef.current.speak(utterance);
  };

  // Send text message to Gemini API
  const sendTextMessage = async (text: string) => {
    try {
      setIsProcessing(true);
      
      // Add user message to messages
      const userMessage: Message = {
        id: Date.now().toString(),
        content: text,
        type: 'user',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Get API key from local storage
      const apiKey = localStorage.getItem('dashApiKey');
      if (!apiKey) {
        const noAPIResponse = "Please set your Gemini API key in the settings page first.";
        
        // Add system message
        const systemMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: noAPIResponse,
          type: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, systemMessage]);
        speakText(noAPIResponse);
        return;
      }
      
      // Get custom context from local storage
      const customContext = localStorage.getItem('dashCustomContext') || "You are Dash, an intelligent AI assistant. You're helpful, friendly, and concise.";
      
      // Call Gemini API
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: customContext + "\n\nUser input: " + text
                }
              ]
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract text from the response
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Add assistant message to messages
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generatedText,
        type: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      
      // Speak the response
      speakText(generatedText);
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process that request. Please try again or check your API key.",
        type: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      speakText("Sorry, I couldn't process that request. Please try again or check your API key.");
      
    } finally {
      setIsProcessing(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  };

  // Context value
  const contextValue = {
    isListening,
    isSpeaking,
    isProcessing,
    messages,
    toggleListening,
    sendTextMessage,
    wakeWordActive,
    toggleWakeWord,
    clearMessages
  };

  return (
    <VoiceAssistantContext.Provider value={contextValue}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};

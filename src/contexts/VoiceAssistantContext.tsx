
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
const LISTENING_TIMEOUT = 6000; // Reduced from 8000ms to 6000ms for lower latency
const WAKE_WORD_RESTART_DELAY = 300; // Reduced delay for wake word detection restart

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for the assistant
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const listeningTimeoutRef = useRef<number | null>(null);
  const wakeWordRetryCountRef = useRef(0);
  const maxWakeWordRetries = 3;

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        
        // Restart wake word detection if needed
        if (wakeWordActive) {
          setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
        }
      };
      
      audioRef.current.onerror = () => {
        console.error('Audio playback error');
        setIsSpeaking(false);
        
        // Restart wake word detection if needed
        if (wakeWordActive) {
          setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
        }
      };
      
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
      // Clean up speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.abort();
      }
      
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
      }
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
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
      wakeWordRetryCountRef.current = 0; // Reset retry counter
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
    
    // Set up recognition parameters
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    finalTranscriptRef.current = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // If we have a final transcript, update the ref
      if (finalTranscript !== finalTranscriptRef.current) {
        finalTranscriptRef.current = finalTranscript;
      }
      
      // Reset the timeout each time we get a result
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
      }
      
      // Set a new timeout - reduced for better responsiveness
      listeningTimeoutRef.current = window.setTimeout(() => {
        if (finalTranscriptRef.current.trim() !== '') {
          // Process the transcript and reset
          const textToProcess = finalTranscriptRef.current.trim();
          finalTranscriptRef.current = '';
          
          // Stop recognition before processing to prevent overlap
          recognition.stop();
          setIsListening(false);
          
          // Process the text
          sendTextMessage(textToProcess);
        } else {
          // No speech detected, just stop listening
          recognition.stop();
          setIsListening(false);
          
          // Restart wake word detection if needed
          if (wakeWordActive) {
            initializeWakeWordDetection();
          }
        }
      }, 1200); // Reduced from 1500ms to 1200ms for lower latency
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
      }
      
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please enable microphone access.");
      } else if (event.error === 'network') {
        toast.error("Network error occurred. Please check your connection.");
      }
      
      // Restart wake word detection if needed
      if (wakeWordActive) {
        setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
      }
    };

    recognition.onend = () => {
      // Only reset if we're not actively stopping it
      console.log('Speech recognition ended');
      
      // Clear timeout if it exists
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
      
      // Process any final transcript if available
      if (finalTranscriptRef.current.trim() !== '') {
        const textToProcess = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = '';
        sendTextMessage(textToProcess);
      }
      
      setIsListening(false);
      
      // Restart wake word detection if needed
      if (wakeWordActive) {
        setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
      }
    };

    recognitionRef.current = recognition;
    return true;
  };

  // Initialize wake word detection with improved reliability
  const initializeWakeWordDetection = () => {
    if (isProcessing || isSpeaking) {
      // Don't initialize if we're processing or speaking
      return;
    }
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser.");
      setWakeWordActive(false);
      return;
    }

    // Stop any existing wake word detection
    stopWakeWordDetection();

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        
        if (transcript.includes(WAKE_WORD)) {
          toast.success(`Wake word detected: "${WAKE_WORD}"`);
          // Stop wake word detection temporarily
          recognition.stop();
          // Reset retry counter on successful detection
          wakeWordRetryCountRef.current = 0;
          // Start listening for the command after a small delay
          setTimeout(() => {
            toggleListening();
          }, WAKE_WORD_RESTART_DELAY);
          return;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Wake word recognition error', event.error);
      
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please enable microphone access.");
        setWakeWordActive(false);
      } else if (event.error === 'network') {
        // Network errors are often temporary
        wakeWordRetryCountRef.current++;
        
        if (wakeWordRetryCountRef.current < maxWakeWordRetries) {
          // Try to restart wake word detection after a error with exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, wakeWordRetryCountRef.current - 1), 5000);
          setTimeout(() => {
            if (wakeWordActive && !isProcessing && !isSpeaking) {
              initializeWakeWordDetection();
            }
          }, backoffTime);
        } else {
          toast.error("Failed to initialize wake word detection after multiple attempts.");
          setWakeWordActive(false);
        }
      } else {
        // Try to restart wake word detection after other errors
        setTimeout(() => {
          if (wakeWordActive && !isProcessing && !isSpeaking) {
            initializeWakeWordDetection();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Restart if wake word is still active and we're not currently listening
      if (wakeWordActive && !isListening && !isProcessing && !isSpeaking) {
        setTimeout(() => {
          if (wakeWordRecognitionRef.current) {
            try {
              wakeWordRecognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart wake word detection:', e);
              wakeWordRecognitionRef.current = null;
              
              // Try to initialize again with a brief delay
              setTimeout(() => {
                if (wakeWordActive && !isListening && !isProcessing && !isSpeaking) {
                  initializeWakeWordDetection();
                }
              }, WAKE_WORD_RESTART_DELAY);
            }
          } else {
            // If the reference is null, try to initialize again
            if (wakeWordActive && !isListening && !isProcessing && !isSpeaking) {
              initializeWakeWordDetection();
            }
          }
        }, WAKE_WORD_RESTART_DELAY);
      }
    };

    wakeWordRecognitionRef.current = recognition;
    
    try {
      recognition.start();
      wakeWordRetryCountRef.current = 0; // Reset retry counter on successful start
    } catch (e) {
      console.error('Failed to start wake word detection:', e);
      
      // Try again after a delay with exponential backoff
      wakeWordRetryCountRef.current++;
      if (wakeWordRetryCountRef.current < maxWakeWordRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, wakeWordRetryCountRef.current - 1), 5000);
        setTimeout(initializeWakeWordDetection, backoffTime);
      } else {
        toast.error("Failed to initialize wake word detection after multiple attempts.");
        setWakeWordActive(false);
      }
    }
  };

  // Stop wake word detection
  const stopWakeWordDetection = () => {
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping wake word detection:', e);
      }
      wakeWordRecognitionRef.current = null;
    }
  };

  // Toggle listening state
  const toggleListening = () => {
    if (isListening) {
      // If already listening, stop it
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      
      // Process any existing transcript
      if (finalTranscriptRef.current.trim() !== '') {
        const textToProcess = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = '';
        sendTextMessage(textToProcess);
      }
      
      // Clear any existing timeout
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
    } else {
      // Stop wake word detection if it's running
      stopWakeWordDetection();
      
      // Initialize speech recognition if needed
      if (!recognitionRef.current) {
        const initialized = initializeSpeechRecognition();
        if (!initialized) return;
      }
      
      // Reset transcript
      finalTranscriptRef.current = '';
      
      // Try to start recognition
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        
        // Set timeout to stop listening after silence
        listeningTimeoutRef.current = window.setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            
            // Process any final transcript
            if (finalTranscriptRef.current.trim() !== '') {
              const textToProcess = finalTranscriptRef.current.trim();
              finalTranscriptRef.current = '';
              sendTextMessage(textToProcess);
            }
            
            // Restart wake word detection if needed
            if (wakeWordActive) {
              setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
            }
          }
        }, LISTENING_TIMEOUT); // Reduced timeout for better responsiveness
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
        setIsListening(false);
        toast.error("Failed to start speech recognition. Please try again.");
        
        // Restart wake word detection if needed
        if (wakeWordActive) {
          setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
        }
      }
    }
  };

  // Toggle wake word detection
  const toggleWakeWord = () => {
    // If we're turning off wake word detection
    if (wakeWordActive) {
      stopWakeWordDetection();
    }
    setWakeWordActive(!wakeWordActive);
  };

  // Clear chat messages
  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('dashMessages');
  };

  // Function to speak text using ElevenLabs
  const speakText = async (text: string) => {
    // Stop wake word detection during speech
    stopWakeWordDetection();
    
    // Get ElevenLabs API key
    const elevenLabsApiKey = localStorage.getItem('dashElevenLabsApiKey');
    
    // Set speaking state to true regardless of which TTS we use
    setIsSpeaking(true);
    
    if (!elevenLabsApiKey) {
      // Fall back to browser speech synthesis if no ElevenLabs API key
      speakWithBrowserSynthesis(text);
      return;
    }
    
    // Get selected voice ID or use default (Aria)
    const voiceId = localStorage.getItem('dashElevenLabsVoiceId') || '9BWtsMINqrJLrRacOk9x';
    
    try {
      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v1", // Use multilingual model for better support
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });
      
      if (!response.ok) {
        console.error(`ElevenLabs API error: ${response.status}`);
        // If API call fails, fallback to browser speech
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      
      // Play the audio
      if (audioRef.current) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Error playing audio:', error);
          setIsSpeaking(false);
          
          // Restart wake word detection if needed
          if (wakeWordActive) {
            setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
          }
        }
      }
      
    } catch (error) {
      console.error('Error with ElevenLabs TTS:', error);
      
      // Fall back to browser speech synthesis
      speakWithBrowserSynthesis(text);
    }
  };
  
  // Fallback function to use browser's speech synthesis
  const speakWithBrowserSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      setIsSpeaking(false);
      
      // Restart wake word detection if needed
      if (wakeWordActive) {
        setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
      }
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster rate
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      
      // Restart wake word detection if needed
      if (wakeWordActive) {
        setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      
      // Restart wake word detection if needed
      if (wakeWordActive) {
        setTimeout(initializeWakeWordDetection, WAKE_WORD_RESTART_DELAY);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Send text message to Gemini API with optimized performance
  const sendTextMessage = async (text: string) => {
    if (text.trim() === '') return;
    
    try {
      setIsProcessing(true);
      
      // Stop wake word detection during processing
      stopWakeWordDetection();
      
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
      
      // Call Gemini API - Using gemini-2.0-flash model for faster response
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
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
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we have a valid response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid response format from Gemini API');
      }
      
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
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      setIsListening(false);
      
      // Clear any existing timeout
      if (listeningTimeoutRef.current) {
        window.clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
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

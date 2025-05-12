
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  isProcessing: boolean;
  className?: string;
}

const MicButton: React.FC<MicButtonProps> = ({ 
  isListening, 
  onClick, 
  isProcessing,
  className 
}) => {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-dash-blue opacity-25 animate-pulse-ring"></div>
      )}
      
      <Button 
        onClick={onClick} 
        disabled={isProcessing}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        className={cn(
          "h-16 w-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105",
          isProcessing && "opacity-70",
          isListening 
            ? "bg-dash-blue text-white hover:bg-dash-darkBlue" 
            : "bg-dash-gray hover:bg-dash-darkGray text-dash-darkGray hover:text-white"
        )}
      >
        {isProcessing ? (
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-t-transparent border-dash-blue"></span>
        ) : isListening ? (
          <Mic className="h-7 w-7 animate-pulse" />
        ) : (
          <MicOff className="h-7 w-7" />
        )}
      </Button>
      
      <div className="h-7 mt-2">
        {isListening && (
          <span className="block text-sm text-center font-medium text-dash-blue animate-fade-in">
            Listening...
          </span>
        )}
      </div>
    </div>
  );
};

export default MicButton;

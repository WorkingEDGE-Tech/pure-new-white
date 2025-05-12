
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
    <div className={cn("relative", className)}>
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-dash-blue opacity-25 animate-pulse-ring"></div>
      )}
      
      <Button 
        onClick={onClick} 
        disabled={isProcessing}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all",
          isListening 
            ? "bg-dash-blue text-white hover:bg-dash-darkBlue" 
            : "bg-dash-gray hover:bg-dash-darkGray text-dash-darkGray hover:text-white"
        )}
      >
        {isListening ? (
          <Mic className="h-6 w-6" />
        ) : (
          <MicOff className="h-6 w-6" />
        )}
      </Button>
      
      {isListening && (
        <span className="block text-xs text-center mt-2 font-medium">Listening...</span>
      )}
    </div>
  );
};

export default MicButton;

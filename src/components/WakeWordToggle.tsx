
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface WakeWordToggleProps {
  active: boolean;
  onChange: () => void;
}

const WakeWordToggle: React.FC<WakeWordToggleProps> = ({ active, onChange }) => {
  return (
    <div className="flex items-center space-x-2 transition-opacity duration-300">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2 group">
              <Switch 
                id="wake-word" 
                checked={active} 
                onCheckedChange={onChange} 
                className={cn(
                  "transition-all duration-300",
                  active && "data-[state=checked]:bg-dash-blue data-[state=checked]:hover:bg-dash-darkBlue"
                )}
              />
              <Label htmlFor="wake-word" className={cn(
                "text-sm cursor-pointer transition-colors duration-300",
                active ? "text-dash-blue font-medium" : "text-dash-darkGray"
              )}>
                "Dash" wake word {active ? 'active' : 'inactive'}
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-dash-blue text-white border-dash-blue shadow-lg animate-fade-in">
            <p>Say "Dash" to activate voice assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default WakeWordToggle;


import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WakeWordToggleProps {
  active: boolean;
  onChange: () => void;
}

const WakeWordToggle: React.FC<WakeWordToggleProps> = ({ active, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <Switch id="wake-word" checked={active} onCheckedChange={onChange} />
              <Label htmlFor="wake-word" className="text-sm cursor-pointer">
                "Dash" wake word {active ? 'active' : 'inactive'}
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Say "Dash" to activate voice assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default WakeWordToggle;

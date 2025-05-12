
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface WakeWordToggleProps {
  active: boolean;
  onChange: () => void;
}

const WakeWordToggle: React.FC<WakeWordToggleProps> = ({ active, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="wake-word" checked={active} onCheckedChange={onChange} />
      <Label htmlFor="wake-word" className="text-sm cursor-pointer">
        "Dash" wake word {active ? 'active' : 'inactive'}
      </Label>
    </div>
  );
};

export default WakeWordToggle;

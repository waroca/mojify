/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { CheckIcon } from './icons';

interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isLoading: boolean;
  isCropping: boolean;
}

type AspectRatio = 'Free' | '1:1' | '16:9' | '4:3';

const CropPanel: React.FC<CropPanelProps> = ({ onApplyCrop, onSetAspect, isLoading, isCropping }) => {
  const [activeAspect, setActiveAspect] = useState<AspectRatio>('Free');
  
  const handleAspectChange = (aspect: AspectRatio, value: number | undefined) => {
    setActiveAspect(aspect);
    onSetAspect(value);
  }

  const aspects: { name: AspectRatio, value: number | undefined }[] = [
    { name: 'Free', value: undefined },
    { name: '1:1', value: 1 / 1 },
    { name: '16:9', value: 16 / 9 },
    { name: '4:3', value: 4 / 3 },
  ];

  return (
    <div className="panel flex flex-col gap-2 animate-fade-in" style={{padding: '8px'}}>
        {/* Aspect Ratio Row */}
        <div className="flex items-center gap-2 px-2 overflow-x-auto">
          {aspects.map(({ name, value }) => (
            <button
              key={name}
              onClick={() => handleAspectChange(name, value)}
              disabled={isLoading}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  activeAspect === name 
                  ? 'bg-[var(--matrix-green)] text-[var(--pure-black)]' 
                  : 'text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-end p-2 bg-black/20 rounded-lg min-h-[64px] w-full">
            <button
                onClick={onApplyCrop}
                disabled={isLoading || !isCropping}
                className="btn-primary"
                style={{padding: '10px 20px', fontSize: '14px'}}
            >
                <CheckIcon className="w-5 h-5" />
                Apply Crop
            </button>
        </div>
    </div>
  );
};

export default CropPanel;
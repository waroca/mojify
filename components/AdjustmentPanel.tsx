/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface AdjustmentPanelProps {
  isLoading: boolean;
  onGenerateActionChange: (prompt: string) => void;
}

const adjustmentCategories = {
    'Lighting': [
        { name: 'Warmer Light', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
        { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
        { name: 'Brighter', prompt: 'Increase the overall brightness and exposure of the image slightly.' },
    ],
    'Focus': [
        { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
        { name: 'Sharpen Subject', prompt: 'Slightly enhance the sharpness and details of the main subject without making it look unnatural.' },
    ],
    'Color': [
        { name: 'Vibrant', prompt: 'Boost the color saturation and vibrance across the image for a more lively look.' },
        { name: 'Black & White', prompt: 'Convert the image to a high-contrast, classic black and white style.' },
    ],
    'Custom': [],
};

type Category = keyof typeof adjustmentCategories;

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ isLoading, onGenerateActionChange }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Lighting');
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(adjustmentCategories['Lighting'][0].prompt);
  const [customPrompt, setCustomPrompt] = useState('');

  const activePrompt = selectedPresetPrompt || customPrompt;

  useEffect(() => {
    onGenerateActionChange(activePrompt?.trim() ?? '');
  }, [activePrompt, onGenerateActionChange]);

  const handleCategoryClick = (category: Category) => {
    setActiveCategory(category);
    // Auto-select the first preset in the new category, or clear for custom
    if (category !== 'Custom') {
        const firstPresetPrompt = adjustmentCategories[category][0]?.prompt || null;
        setSelectedPresetPrompt(firstPresetPrompt);
        setCustomPrompt('');
    } else {
        setSelectedPresetPrompt(null);
    }
  };

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  return (
    <div className="panel flex flex-col gap-2 animate-fade-in" style={{padding: '8px'}}>
        {/* Category Row */}
        <div className="flex items-center gap-2 px-2 overflow-x-auto">
            {(Object.keys(adjustmentCategories) as Category[]).map(category => (
                <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    disabled={isLoading}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                        activeCategory === category
                        ? 'bg-[var(--matrix-green)] text-[var(--pure-black)]'
                        : 'text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]'
                    }`}
                >
                    {category}
                </button>
            ))}
        </div>
        
        {/* Content Row */}
        <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg min-h-[64px] w-full">
            {activeCategory === 'Custom' ? (
                <input
                    type="text"
                    value={customPrompt}
                    onChange={handleCustomChange}
                    placeholder="Describe a custom adjustment..."
                    disabled={isLoading}
                    autoFocus
                />
            ) : (
                <div 
                  className="flex items-center gap-2 overflow-x-auto w-full"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                  {adjustmentCategories[activeCategory].map(preset => (
                      <button
                          key={preset.name}
                          onClick={() => handlePresetClick(preset.prompt)}
                          disabled={isLoading}
                          className={`flex-shrink-0 text-center bg-[rgba(0,255,0,0.05)] border border-transparent font-semibold py-2.5 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-[rgba(0,255,0,0.1)] active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-[var(--deep-black)] ring-[var(--glitch-pink)]' : ''}`}
                      >
                          {preset.name}
                      </button>
                  ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default AdjustmentPanel;
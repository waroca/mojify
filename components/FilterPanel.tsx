/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface FilterPanelProps {
  isLoading: boolean;
  onGenerateActionChange: (prompt: string) => void;
}

const filterCategories = {
    'Futuristic': [
        { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
        { name: 'Hologram', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
        { name: 'Cyberpunk', prompt: 'Give the image a high-tech, dystopian cyberpunk look with neon signs, rain, and moody lighting.' },
    ],
    'Artistic': [
        { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
        { name: 'Oil Painting', prompt: 'Render the image in the style of a classical oil painting with visible brushstrokes and rich textures.' },
        { name: 'Watercolor', prompt: 'Convert the image into a soft and delicate watercolor painting with bleeding colors.' },
    ],
    'Vintage': [
        { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
        { name: 'Film Noir', prompt: 'Apply a classic film noir look with dramatic high-contrast black and white, deep shadows, and a grainy texture.' },
        { name: 'Polaroid', prompt: 'Give the image the look of a faded, vintage Polaroid photo with characteristic color shifts and a soft focus.' },
    ],
    'Custom': [],
};

type Category = keyof typeof filterCategories;


const FilterPanel: React.FC<FilterPanelProps> = ({ isLoading, onGenerateActionChange }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Futuristic');
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(filterCategories['Futuristic'][0].prompt);
  const [customPrompt, setCustomPrompt] = useState('');

  const activePrompt = selectedPresetPrompt || customPrompt;

  useEffect(() => {
    onGenerateActionChange(activePrompt?.trim() ?? '');
  }, [activePrompt, onGenerateActionChange]);
  
  const handleCategoryClick = (category: Category) => {
    setActiveCategory(category);
    // Auto-select the first preset in the new category, or clear for custom
    if (category !== 'Custom') {
        const firstPresetPrompt = filterCategories[category][0]?.prompt || null;
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
            {(Object.keys(filterCategories) as Category[]).map(category => (
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
                    placeholder="Describe a custom filter..."
                    disabled={isLoading}
                    autoFocus
                />
            ) : (
                <div 
                  className="flex items-center gap-2 overflow-x-auto w-full"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                  {filterCategories[activeCategory].map(preset => (
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

export default FilterPanel;
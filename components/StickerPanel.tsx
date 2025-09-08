/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface StickerPanelProps {
  onStickerSelect: (emoji: string) => void;
  selectedSticker: string | null;
  isLoading: boolean;
}

const emojiCategories = {
    'Popular': ['😂', '❤️', '👍', '😭', '😍', '🔥', '🤔', '✨', '💀', '🙏', '🎉', '💯', '🚀', '🌟', '😊', '👀', '🤯', '😎', '🤣', '👋', '👏', '✅', '🍕', '👑', '💸', '🧠', '💡', '🌈', '🐶', '🐱', '☕️', '💔'],
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
    'Animals': ['🙈', '🙉', '🙊', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠', '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃'],
    'Food': ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🥗', '🍝', '🍜', '🍣', '🍦', '🍰', '🎂', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕️', '🍺', '🍷', '🍹'],
};

type Category = keyof typeof emojiCategories;

const StickerPanel: React.FC<StickerPanelProps> = ({ onStickerSelect, selectedSticker, isLoading }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Popular');

  const handleStickerClick = (emoji: string) => {
    // Allows toggling off the selected sticker
    onStickerSelect(selectedSticker === emoji ? '' : emoji);
  };

  return (
    <div className="panel flex flex-col gap-2 animate-fade-in" style={{padding: '8px'}}>
      <div className="flex items-center gap-2 px-2 overflow-x-auto">
        {(Object.keys(emojiCategories) as Category[]).map(category => (
            <button
                key={category}
                onClick={() => setActiveCategory(category)}
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

      <div 
        className="flex items-center gap-2 overflow-x-auto p-2 bg-black/20 rounded-lg min-h-[64px]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        {emojiCategories[activeCategory].map((emoji: string) => (
            <button
            key={`${activeCategory}-${emoji}`}
            onClick={() => handleStickerClick(emoji)}
            className={`flex-shrink-0 w-12 h-12 text-3xl rounded-lg transition-all duration-150 ease-in-out flex items-center justify-center hover:bg-[rgba(0,255,0,0.2)] active:scale-90 ${selectedSticker === emoji ? 'bg-[var(--glitch-blue)] ring-2 ring-white/80' : 'bg-[rgba(0,255,0,0.05)]'}`}
            aria-label={`Select emoji ${emoji}`}
            >
            {emoji}
            </button>
        ))}
      </div>
    </div>
  );
};

export default StickerPanel;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Logo from './Logo';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const EmojiRain: React.FC = () => {
    const emojis = "🌮🦄🚀👾🌈🍕🤖💀🔥✨🧠💡😂❤️👍😭😍";
    const columns = Array.from({ length: 20 }, (_, i) => {
        const randomEmojis = [...emojis].sort(() => 0.5 - Math.random()).join('');
        const duration = Math.random() * 10 + 10; // 10s to 20s
        const delay = Math.random() * -20; // Start at different times
        return (
            <div 
                key={i} 
                className="emoji-rain-column" 
                style={{
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    fontSize: `${Math.random() * 1 + 1}rem` // 1rem to 2rem
                }}
            >
                {Array.from({ length: 50 }).map(() => randomEmojis).join('')}
            </div>
        );
    });

    return <div className="emoji-rain-container">{columns}</div>;
};


const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <section 
        className={`hero transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'border-dashed border-[var(--glitch-pink)]' : 'border-transparent'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          onFileSelect(e.dataTransfer.files);
        }}
      >
        <EmojiRain />
        <div className="relative flex flex-col items-center gap-6 animate-fade-in z-10">
          
          <div className="logo-container relative w-64 h-32 flex items-center justify-center mb-4">
              <Logo />
          </div>

          <h2 className="text-5xl font-bold tracking-widest text-center uppercase text-glitch">
            Transform Reality. One Emoji At A Time.
          </h2>

          <div className="max-w-xl text-center text-lg leading-relaxed opacity-80 flex flex-col gap-4">
              <p>
                  Drop any emoji on your photo.
                  Watch as AI transforms it into impossible reality.
                  <br/>
                  <span className="opacity-60">Warning: May cause uncontrollable creativity.</span>
              </p>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
              <label htmlFor="image-upload-start" className="btn-primary cta-button text-lg px-8 py-4">
                  UPLOAD IMAGE
              </label>
              <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-sm opacity-50">— or drag and drop an image —</p>
          </div>

        </div>
      </section>
      
      <section className="features-section">
        <div className="feature-divider-container">
          <span className="feature-divider-text">[BREAKING PHYSICS SINCE 2024]</span>
        </div>
        
        <div className="feature-item">
          <h3 className="feature-title">🎯 INSTANT REALITY INJECTION</h3>
          <div className="feature-divider-short">━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <p className="feature-description">
            Drop emoji. Get reality. 
            No painting. No prompting. No patience required.
            <br/><br/>
            Our AI doesn't just paste stickers—it understands 
            lighting, perspective, and context to create 
            photorealistic objects that belong in your world.
          </p>
        </div>

        <div className="feature-divider-long">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

        <div className="feature-item">
          <h3 className="feature-title">⚡ EMOJI FUSION REACTOR</h3>
          <div className="feature-divider-short">━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <p className="feature-description">
            What happens when emojis collide?
            Beautiful chaos.
            <br/><br/>
            🍕 + 🚀 = PIZZA ROCKET<br/>
            🌮 + 🦖 = TACORAPTOR<br/>
            🦄 + 🌈 = PHYSICS.EXE HAS STOPPED RESPONDING
            <br/><br/>
            Overlap emojis to unlock hybrid objects that 
            shouldn't exist but absolutely need to.
          </p>
          <p className="feature-callout warning">[Warning: Emoji fusion may create objects unknown to science]</p>
        </div>

        <div className="feature-divider-long">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      </section>
    </div>
  );
};

export default StartScreen;
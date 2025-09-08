/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateFilteredImage, generateAdjustedImage, generateStickerImage, type StickerInput } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import StickerPanel from './components/StickerPanel';
import { UndoIcon, RedoIcon, EyeIcon, LinkBreakIcon, StickersIcon, PaletteIcon, AdjustmentsIcon, CropIcon, MagicWandIcon, CheckIcon, XMarkIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tool = 'stickers' | 'adjust' | 'filters' | 'crop';
type CreativeImpact = 'subtle' | 'artistic' | 'total';

interface Sticker {
  id: string;
  emoji: string;
  x: number; // percentage
  y: number; // percentage
  size: number; // in pixels
  rotation: number; // degrees
  impact: CreativeImpact;
}

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('stickers');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  
  // Sticker state
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<Sticker[]>([]);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [resizingState, setResizingState] = useState<{ startX: number; initialSize: number } | null>(null);
  const [rotatingState, setRotatingState] = useState<{ startAngle: number; initialRotation: number; } | null>(null);
  const [fusions, setFusions] = useState<string[][]>([]);
  const [chains, setChains] = useState<string[][]>([]);
  const [brokenChainLinks, setBrokenChainLinks] = useState<Set<string>>(new Set());
  
  const [generateAction, setGenerateAction] = useState<{ action: (() => void) | null, isEnabled: boolean }>({ action: null, isEnabled: false });

  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPlacedStickers([]);
    setSelectedSticker(null);
    setActiveStickerId(null);
    setBrokenChainLinks(new Set());
    setActiveTool('stickers');
  }, [history, historyIndex]);

  const handleApplyStickers = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to apply stickers to.');
      return;
    }
    if (placedStickers.length === 0) {
        setError('No stickers have been placed on the image.');
        return;
    }
    
    const stickerIdsInFusions = new Set(fusions.flat());
    const stickerIdsInChains = new Set(chains.flat());

    const individualStickers = placedStickers.filter(s => 
        !stickerIdsInFusions.has(s.id) && !stickerIdsInChains.has(s.id)
    );

    const fusionInputs = fusions.map(fusionIds => {
        const fusionStickers = placedStickers
            .filter(s => fusionIds.includes(s.id))
            .sort((a, b) => a.id.localeCompare(b.id)); // Sort to ensure the first sticker is at index 0

        return {
            type: 'fusion' as const,
            stickers: fusionStickers,
        };
    });

    const chainInputs = chains.map(chainIds => {
        return {
            type: 'chain' as const,
            stickers: placedStickers.filter(s => chainIds.includes(s.id)),
        };
    });

    const individualInputs = individualStickers.map(sticker => {
        return {
            type: 'single' as const,
            sticker,
        };
    });
    
    const stickerInputs: StickerInput[] = [...fusionInputs, ...chainInputs, ...individualInputs];
    
    setIsLoading(true);
    setError(null);
    
    try {
        const stickeredImageUrl = await generateStickerImage(currentImage, stickerInputs);
        const newImageFile = dataURLtoFile(stickeredImageUrl, `stickered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the stickers. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, placedStickers, fusions, chains, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to detect sticker fusions and chains
  useEffect(() => {
    if (!imgRef.current || placedStickers.length < 2) {
      setFusions([]);
      setChains([]);
      return;
    }

    const rect = imgRef.current.getBoundingClientRect();
    const getStickerPixelPosition = (sticker: Sticker) => ({
      x: (sticker.x / 100) * rect.width,
      y: (sticker.y / 100) * rect.height,
    });

    // --- Fusion Detection (for different, overlapping emojis) ---
    const doStickersOverlap = (s1: Sticker, s2: Sticker) => {
      if (s1.id === s2.id || s1.emoji === s2.emoji) return false;
      const pos1 = getStickerPixelPosition(s1);
      const pos2 = getStickerPixelPosition(s2);
      const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
      return distance < (s1.size / 2 + s2.size / 2);
    };

    const fusionAdj = new Map<string, string[]>();
    placedStickers.forEach(s => fusionAdj.set(s.id, []));

    for (let i = 0; i < placedStickers.length; i++) {
      for (let j = i + 1; j < placedStickers.length; j++) {
        if (doStickersOverlap(placedStickers[i], placedStickers[j])) {
          fusionAdj.get(placedStickers[i].id)?.push(placedStickers[j].id);
          fusionAdj.get(placedStickers[j].id)?.push(placedStickers[i].id);
        }
      }
    }

    const fusionVisited = new Set<string>();
    const newFusions: string[][] = [];
    placedStickers.forEach(sticker => {
      if (!fusionVisited.has(sticker.id)) {
        const component: string[] = [];
        const stack = [sticker.id];
        fusionVisited.add(sticker.id);

        while (stack.length > 0) {
          const currentId = stack.pop()!;
          component.push(currentId);
          fusionAdj.get(currentId)?.forEach(neighborId => {
            if (!fusionVisited.has(neighborId)) {
              fusionVisited.add(neighborId);
              stack.push(neighborId);
            }
          });
        }
        if (component.length > 1) {
          newFusions.push(component);
        }
      }
    });
    setFusions(newFusions);

    // --- Chain Detection (for multiple, nearby identical emojis) ---
    const stickerIdsInFusions = new Set(newFusions.flat());
    const potentialChainStickers = placedStickers.filter(s => 
        !stickerIdsInFusions.has(s.id) && !brokenChainLinks.has(s.id)
    );
    
    const emojiGroups = new Map<string, Sticker[]>();
    potentialChainStickers.forEach(sticker => {
        if (!emojiGroups.has(sticker.emoji)) {
            emojiGroups.set(sticker.emoji, []);
        }
        emojiGroups.get(sticker.emoji)!.push(sticker);
    });

    const newChains: string[][] = [];
    emojiGroups.forEach((group) => {
        if (group.length < 2) return;

        const doStickersConnect = (s1: Sticker, s2: Sticker) => {
            const pos1 = getStickerPixelPosition(s1);
            const pos2 = getStickerPixelPosition(s2);
            const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
            const threshold = (s1.size + s2.size) / 2 * 3; // Connect if distance is < 3x average size
            return distance < threshold;
        };

        const chainAdj = new Map<string, string[]>();
        group.forEach(s => chainAdj.set(s.id, []));

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                if (doStickersConnect(group[i], group[j])) {
                    chainAdj.get(group[i].id)?.push(group[j].id);
                    chainAdj.get(group[j].id)?.push(group[i].id);
                }
            }
        }

        const chainVisited = new Set<string>();
        group.forEach(sticker => {
            if (!chainVisited.has(sticker.id)) {
                const component: string[] = [];
                const stack = [sticker.id];
                chainVisited.add(sticker.id);

                while (stack.length > 0) {
                    const currentId = stack.pop()!;
                    component.push(currentId);
                    chainAdj.get(currentId)?.forEach(neighborId => {
                        if (!chainVisited.has(neighborId)) {
                            chainVisited.add(neighborId);
                            stack.push(neighborId);
                        }
                    });
                }
                if (component.length > 1) {
                    newChains.push(component);
                }
            }
        });
    });
    setChains(newChains);

  }, [placedStickers, brokenChainLinks]);

  // Reset tool-specific states when the active tool changes
  useEffect(() => {
    // Reset the main action button. It will be re-configured by tool-specific effects.
    setGenerateAction({ action: null, isEnabled: false });
    
    // Reset crop state if not in crop tool
    if (activeTool !== 'crop') {
        setCrop(undefined);
        setCompletedCrop(undefined);
    }
  }, [activeTool]);
  
  // Effect to manage the main action button state for the Sticker tool
  useEffect(() => {
    if (activeTool === 'stickers') {
        setGenerateAction({
            action: handleApplyStickers,
            isEnabled: placedStickers.length > 0
        });
    }
  }, [activeTool, placedStickers, handleApplyStickers]);

  // Effect to manage the main action button state for the Crop tool
  useEffect(() => {
      if (activeTool === 'crop') {
          setGenerateAction({
              action: handleApplyCrop,
              isEnabled: !!completedCrop?.width && completedCrop.width > 0
          });
      }
  }, [activeTool, completedCrop, handleApplyCrop]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setActiveTool('stickers');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPlacedStickers([]);
    setSelectedSticker(null);
    setActiveStickerId(null);
    setBrokenChainLinks(new Set());
  }, []);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleDeleteSticker = useCallback((stickerId: string) => {
      setPlacedStickers(prev => prev.filter(s => s.id !== stickerId));
      setActiveStickerId(null); // Deselect after deleting
  }, []);

  const handleImpactChange = useCallback((stickerId: string, impact: CreativeImpact) => {
    setPlacedStickers(prev =>
        prev.map(s => (s.id === stickerId ? { ...s, impact } : s))
    );
  }, []);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeStickerId && (e.key === 'Delete' || e.key === 'Backspace')) {
            handleDeleteSticker(activeStickerId);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStickerId, handleDeleteSticker]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setPlacedStickers([]);
      setBrokenChainLinks(new Set());
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setPlacedStickers([]);
      setBrokenChainLinks(new Set());
    }
  }, [canRedo, historyIndex]);
  
  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPlacedStickers([]);
      setSelectedSticker(null);
      setBrokenChainLinks(new Set());
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    if (activeTool === 'stickers') {
        if (selectedSticker) {
          const x = (offsetX / rect.width) * 100;
          const y = (offsetY / rect.height) * 100;

          const newSticker: Sticker = {
              id: `${Date.now()}-${Math.random()}`,
              emoji: selectedSticker,
              x,
              y,
              size: 48,
              rotation: 0,
              impact: 'artistic', // Default creative impact
          };
          setPlacedStickers(prev => [...prev, newSticker]);
        } else {
          // If no sticker is selected for placing, a click on the background deselects any active sticker
          setActiveStickerId(null);
        }
    }
  };

  const handleStickerMouseDown = (e: React.MouseEvent, stickerId: string) => {
      e.stopPropagation();
      setActiveStickerId(stickerId);
      setDraggingStickerId(stickerId);
  };
  
  const handleResizeHandleMouseDown = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    setDraggingStickerId(null);
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (sticker) {
      setResizingState({
        startX: e.clientX,
        initialSize: sticker.size,
      });
    }
  };

  const handleRotationHandleMouseDown = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    if (!imgRef.current) return;
    
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const rect = imgRef.current.getBoundingClientRect();
    const stickerCenterX = rect.left + (sticker.x / 100) * rect.width;
    const stickerCenterY = rect.top + (sticker.y / 100) * rect.height;

    const startAngle = Math.atan2(e.clientY - stickerCenterY, e.clientX - stickerCenterX);

    setRotatingState({
      startAngle,
      initialRotation: sticker.rotation,
    });
    setActiveStickerId(stickerId);
    setDraggingStickerId(null);
  };

  const handleBreakChainLink = (stickerId: string) => {
    setBrokenChainLinks(prev => new Set(prev).add(stickerId));
  };

  const handleImageContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rotatingState && activeStickerId && imgRef.current) {
        const sticker = placedStickers.find(s => s.id === activeStickerId);
        if (!sticker) return;

        const rect = imgRef.current.getBoundingClientRect();
        const stickerCenterX = rect.left + (sticker.x / 100) * rect.width;
        const stickerCenterY = rect.top + (sticker.y / 100) * rect.height;
        
        const currentAngle = Math.atan2(e.clientY - stickerCenterY, e.clientX - stickerCenterX);
        const angleDelta = currentAngle - rotatingState.startAngle;
        
        const rotationDelta = angleDelta * (180 / Math.PI);
        const newRotation = rotatingState.initialRotation + rotationDelta;

        setPlacedStickers(stickers => stickers.map(s => 
            s.id === activeStickerId ? { ...s, rotation: newRotation } : s
        ));
        return;
    }
    
    if (resizingState && activeStickerId) {
        const deltaX = e.clientX - resizingState.startX;
        const newSize = Math.round(resizingState.initialSize + deltaX);
        const clampedSize = Math.max(16, Math.min(200, newSize));

        setPlacedStickers(stickers => stickers.map(s => 
            s.id === activeStickerId ? { ...s, size: clampedSize } : s
        ));
        return;
    }
      
    if (!draggingStickerId || !imgRef.current) return;
    
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setPlacedStickers(stickers => stickers.map(s => 
        s.id === draggingStickerId ? { ...s, x: xPercent, y: yPercent } : s
    ));
  };

  const handleImageContainerMouseUp = () => {
      setDraggingStickerId(null);
      setResizingState(null);
      setRotatingState(null);
  };
  
  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
  };

  const renderContent = () => {
    if (error) {
       return (
           <div className="card animate-fade-in" style={{textAlign: 'center', maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
            <h2>An Error Occurred</h2>
            <p>{error}</p>
            <button
                onClick={() => setError(null)}
                className="btn-primary"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl || !currentImage) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const imageDisplay = (
      <div 
        className="relative w-full h-full"
        onMouseMove={handleImageContainerMouseMove}
        onMouseUp={handleImageContainerMouseUp}
        onMouseLeave={handleImageContainerMouseUp}
      >
        {originalImage && (
            <img
                src={URL.createObjectURL(originalImage)}
                alt="Original"
                className="w-full h-full object-contain pointer-events-none"
                draggable="false"
            />
        )}
        <img
            ref={imgRef}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTool === 'stickers' && selectedSticker ? 'cursor-copy' : ''}`}
            draggable="false"
        />
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {chains.map((chain, index) => {
            const chainStickers = chain
              .map(id => placedStickers.find(s => s.id === id)!)
              .filter(Boolean)
              .sort((a, b) => a.x - b.x); 
            
            if (chainStickers.length < 2) return null;

            const pathData = chainStickers.map((sticker, i) => {
                const command = i === 0 ? 'M' : 'L';
                return `${command} ${sticker.x} ${sticker.y}`;
            }).join(' ');

            return (
                <path
                    key={`chain-path-${index}`}
                    d={pathData}
                    stroke="rgba(0, 255, 0, 0.5)"
                    strokeWidth="0.5"
                    strokeDasharray="2, 2"
                    fill="none"
                />
            );
          })}
        </svg>
        {placedStickers.map(sticker => (
            <div
                key={sticker.id}
                className="absolute select-none"
                style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    width: sticker.size,
                    height: sticker.size,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <div
                    className={`w-full h-full flex items-center justify-center p-1 ${activeStickerId === sticker.id ? 'border-2 border-dashed border-blue-400 rounded-md' : ''}`}
                    style={{
                        fontSize: `${sticker.size}px`,
                        transform: `rotate(${sticker.rotation}deg)`,
                        cursor: draggingStickerId === sticker.id ? 'grabbing' : 'grab',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                    onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                >
                    {sticker.emoji}
                </div>
                {activeStickerId === sticker.id && (
                  <>
                    {/* --- Creative Impact Controls --- */}
                    <div 
                      className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 flex flex-col items-center gap-1.5"
                      onMouseDown={e => e.stopPropagation()}
                    >
                       <div style={{fontSize: '10px', fontWeight: 'bold', color: 'var(--matrix-green)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Creative Impact</div>
                      <div className="flex items-center bg-black/50 backdrop-blur-sm p-1 rounded-lg text-xs font-semibold shadow-lg">
                        {(['subtle', 'artistic', 'total'] as CreativeImpact[]).map(level => (
                          <button 
                            key={level}
                            onClick={() => handleImpactChange(sticker.id, level)}
                            className={`px-3 py-1 rounded-md capitalize transition-colors ${sticker.impact === level ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-200'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                       <div className="h-4 w-px bg-blue-400/50" />
                    </div>

                    <div
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-600 border-2 border-white rounded-full cursor-pointer flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            handleDeleteSticker(sticker.id);
                        }}
                        title="Delete sticker"
                    >
                        <XMarkIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="absolute left-1/2 top-0 h-4 w-px bg-purple-400 -translate-y-full" />
                    <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-purple-400 border-2 border-white rounded-full cursor-alias"
                        onMouseDown={(e) => handleRotationHandleMouseDown(e, sticker.id)}
                    />
                    <div
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-blue-400 border-2 border-white rounded-full cursor-se-resize"
                        onMouseDown={(e) => handleResizeHandleMouseDown(e, sticker.id)}
                    />
                    {chains.some(chain => chain.includes(sticker.id)) && (
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full cursor-pointer flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            handleBreakChainLink(sticker.id);
                        }}
                        title="Break from chain"
                      >
                        <LinkBreakIcon className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </>
                )}
            </div>
        ))}
        {fusions.map((fusion, index) => {
            const fusionStickers = placedStickers.filter(s => fusion.includes(s.id));
            if (fusionStickers.length === 0) return null;

            const avgX = fusionStickers.reduce((sum, s) => sum + s.x, 0) / fusionStickers.length;
            const avgY = fusionStickers.reduce((sum, s) => sum + s.y, 0) / fusionStickers.length;
            const badgeY = avgY - (fusionStickers.reduce((sum, s) => sum + s.size, 0) / fusionStickers.length / 2 / (imgRef.current?.clientHeight || 1) * 100) - 4;


            return (
                <div
                    key={`fusion-${index}`}
                    className="absolute fusion-badge"
                    style={{
                        left: `${avgX}%`,
                        top: `${badgeY}%`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    FUSION
                </div>
            );
        })}
      </div>
    );
    
    // For ReactCrop, we need a single image element.
    const cropImageElement = (
      <img 
        ref={imgRef}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-full object-contain"
      />
    );


    return (
      <div className="w-full h-full flex flex-col animate-fade-in">
        {isLoading && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4 animate-fade-in">
                <Spinner />
                <p>AI is working its magic...</p>
            </div>
        )}

        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button 
                onClick={handleUndo}
                disabled={!canUndo || isLoading}
                className="btn-icon"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo || isLoading}
                className="btn-icon"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-6 h-6" />
            </button>
        </div>
        
        {canUndo && (
          <button 
              onMouseDown={() => setIsComparing(true)}
              onMouseUp={() => setIsComparing(false)}
              onMouseLeave={() => setIsComparing(false)}
              onTouchStart={() => setIsComparing(true)}
              onTouchEnd={() => setIsComparing(false)}
              className="btn-icon absolute top-4 right-4 z-40"
              aria-label="Press and hold to see original image"
          >
              <EyeIcon className="w-6 h-6" />
          </button>
        )}
        
        {/* Main content area */}
        <div className="flex-grow w-full flex items-center justify-center p-4 md:p-8 relative min-h-0">
            {activeTool === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="w-full h-full"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }
        </div>
        
        {/* Bottom controls container */}
        <div className="flex-shrink-0 p-4 z-30 flex flex-col items-center justify-end gap-4">
            {/* Tool Panel Slot */}
            <div className="w-full max-w-4xl">
              {activeTool === 'stickers' &&
                <StickerPanel 
                  onStickerSelect={setSelectedSticker}
                  selectedSticker={selectedSticker}
                  isLoading={isLoading}
                />
              }
              {activeTool === 'filters' &&
                <FilterPanel 
                  isLoading={isLoading}
                  onGenerateActionChange={
                    (prompt) => setGenerateAction({ action: () => handleApplyFilter(prompt), isEnabled: !!prompt })
                  }
                />
              }
              {activeTool === 'adjust' &&
                <AdjustmentPanel
                  isLoading={isLoading}
                  onGenerateActionChange={
                    (prompt) => setGenerateAction({ action: () => handleApplyAdjustment(prompt), isEnabled: !!prompt })
                  }
                />
              }
              {activeTool === 'crop' &&
                <CropPanel
                  onApplyCrop={handleApplyCrop}
                  onSetAspect={setAspect}
                  isLoading={isLoading}
                  isCropping={!!completedCrop?.width && completedCrop.width > 0}
                />
              }
            </div>
            
            {/* Main Toolbar */}
            <footer className="main-toolbar">
                {([
                    { tool: 'stickers' as Tool, icon: StickersIcon, label: 'Stickers' },
                    { tool: 'filters' as Tool, icon: PaletteIcon, label: 'Filters' },
                    { tool: 'adjust' as Tool, icon: AdjustmentsIcon, label: 'Adjust' },
                    { tool: 'crop' as Tool, icon: CropIcon, label: 'Crop' },
                ] as const).map(({ tool, icon: Icon, label }) => (
                    <button
                        key={tool}
                        onClick={() => handleToolSelect(tool)}
                        className={`btn-tool ${activeTool === tool ? 'active' : ''}`}
                        aria-label={`Open ${label} panel`}
                    >
                      <Icon className="w-7 h-7 mx-auto" />
                    </button>
                ))}
                
                <div className="w-px h-10 bg-[var(--matrix-green)] opacity-50 mx-2"></div>
                
                <button
                  onClick={() => generateAction.action?.()}
                  disabled={!generateAction.isEnabled || isLoading}
                  className="btn-primary main-action-btn"
                  aria-label={activeTool === 'stickers' ? 'Apply Stickers' : (activeTool === 'crop' ? 'Apply Crop' : 'Generate AI Edit')}
                >
                  {activeTool === 'stickers' || activeTool === 'crop' ? <CheckIcon className="w-8 h-8" /> : <MagicWandIcon className="w-7 h-7" />}
                </button>
            </footer>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {currentImage && <Header onUploadNew={handleUploadNew} onDownload={handleDownload} hasImage={!!currentImage} />}
      <main className="flex-grow w-full relative flex flex-col min-h-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
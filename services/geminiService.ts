/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

type CreativeImpact = 'subtle' | 'artistic' | 'total';

// Define Sticker interface to match the one in App.tsx
interface Sticker {
  id: string;
  emoji: string;
  x: number; // percentage
  y: number; // percentage
  size: number; // in pixels
  rotation: number; // degrees
  impact: CreativeImpact;
}

export type StickerInput = {
  type: 'single';
  sticker: Sticker;
} | {
  type: 'fusion';
  stickers: Sticker[];
} | {
  type: 'chain';
  stickers: Sticker[];
};


/**
 * Generates an image with emoji stickers creatively integrated using generative AI.
 * @param originalImage The original image file.
 * @param stickerInputs An array of sticker or fusion objects to apply.
 * @returns A promise that resolves to the data URL of the stickered image.
 */
export const generateStickerImage = async (
    originalImage: File,
    stickerInputs: StickerInput[],
): Promise<string> => {
    if (stickerInputs.length === 0) {
        throw new Error("No stickers, fusions, or chains provided to apply.");
    }
    console.log(`Starting generative sticker application with ${stickerInputs.length} items.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);

    const getSizeCategory = (size: number): string => {
        if (size >= 180) return 'Huge (indicating a colossal, background-defining, or surreal-scale transformation)';
        if (size >= 128) return 'Large (indicating a major transformation or a significantly oversized object)';
        if (size >= 64) return 'Medium (indicating a standard, direct interaction)';
        if (size >= 32) return 'Small (indicating a subtle detail or accessory)';
        return 'Tiny (indicating a very minor detail, like a pattern or texture)';
    };

    const stickerDescriptions = stickerInputs.map(input => {
        if (input.type === 'single') {
            const sticker = input.sticker;
            const sizeCategory = getSizeCategory(sticker.size);
            return `- A single '${sticker.emoji}' emoji. It is placed near (x: ${sticker.x.toFixed(1)}%, y: ${sticker.y.toFixed(1)}%). Its size is **${sizeCategory}**. The user has set the **Creative Impact** to **${sticker.impact}**.`;
        } else if (input.type === 'fusion') {
            const fusionStickers = input.stickers;
            // The first sticker in the sorted array determines the impact for the whole fusion.
            const primarySticker = fusionStickers[0];
            if (!primarySticker) return '';

            const emojis = fusionStickers.map(s => `'${s.emoji}'`).join(' and ');
            const avgX = fusionStickers.reduce((sum, s) => sum + s.x, 0) / fusionStickers.length;
            const avgY = fusionStickers.reduce((sum, s) => sum + s.y, 0) / fusionStickers.length;
            const avgSize = fusionStickers.reduce((sum, s) => sum + s.size, 0) / fusionStickers.length;
            const sizeCategory = getSizeCategory(avgSize);
            const fusionImpact = primarySticker.impact;

            return `- A **hybrid fusion concept** combining ${emojis}. Invent a single, cohesive object that merges their meanings. Center it near (x: ${avgX.toFixed(1)}%, y: ${avgY.toFixed(1)}%). Its average size is **${sizeCategory}**. The user has set the **Creative Impact** for this fusion to **${fusionImpact}**.`;
        } else { // type is 'chain'
            const chainStickers = [...input.stickers].sort((a, b) => a.x - b.x); // Sort to create a path
            const emoji = chainStickers[0].emoji;
            const pathCoordinates = chainStickers.map(s => `(x: ${s.x.toFixed(1)}%, y: ${s.y.toFixed(1)}%)`).join(' -> ');
            const avgSize = chainStickers.reduce((sum, s) => sum + s.size, 0) / chainStickers.length;
            const sizeCategory = getSizeCategory(avgSize);

            return `- An **emoji chain** of '${emoji}', which indicates **movement**. Creatively interpret this as an object in motion along a path. For example, a single rocket zooming across, or multiple rockets flying in formation. **Do not repeat the static emoji image.** The motion should follow the path: ${pathCoordinates}. Its average size is **${sizeCategory}**, which guides the scale of the moving object.`;
        }
    }).join('\n');

    const prompt = `You are a master of creative and SAFE photo manipulation. Your primary goal is to whimsically integrate user-selected emojis into an image, making the result feel magical, fun, and suitable for all audiences.

**--- CRITICAL SAFETY & ETHICS POLICY (Non-Negotiable) ---**
- **ZERO HARM:** You MUST NOT generate any image that could be interpreted as violent, gory, scary, hateful, or promoting self-harm. All transformations must be positive and playful.
- **PLAYFUL INTERPRETATION:** Emojis must be interpreted in their most harmless, fun, and artistic sense. A '💀' emoji MUST be rendered as a festive, decorative 'Day of the Dead' sugar skull, never as realistic or frightening gore. A '🔥' emoji should be magical, cartoonish flames, not a destructive fire. A '🔪' emoji should become a toy plastic knife or a chef's knife in a cooking context.
- **IDENTITY PRESERVATION:** While stylistically altering features is allowed, you must preserve the person's fundamental identity, including their overall body shape and ethnicity. Do not change a person's race.

**Your Creative Mission: Interaction, Not Overlay.**
NEVER just paste the emoji's concept onto the image. Instead, you MUST reimagine the scene where subjects interact with the *idea* of the emoji. You are telling a new, fun story. The emoji's placement, size, and Creative Impact level are your clues.

**Hierarchy of Creative Interpretation:**

1.  **Direct Character Modification (Highest Priority):** If an emoji is on a person, modify them according to the user's selected **Creative Impact** level.
    *   **subtle:** A minimal, realistic detail. Example: A '💀' emoji becomes a small, temporary tattoo or festive face paint design.
    *   **artistic:** A stylistic blend of the person and the emoji. Example: A '💀' emoji transforms the face into an artful sugar skull design where the person's original features are still partially visible.
    *   **total:** A complete reimagining of the feature in a new, fantastical theme. This is a dramatic, artistic statement. For example, a '💀' emoji results in the person's face being transformed into a beautiful, ornate 'Day of the Dead' sugar skull design, completely covering their features. A '🤖' results in their head becoming a sleek, futuristic robotic helmet.

2.  **Surreal Scale Directive (For non-character edits):** For emojis NOT on a person, its size dictates the scale. You MUST break from realism for larger sizes.
    *   **Tiny/Small:** Subtle, realistic details.
    *   **Medium:** A normal, real-world interaction (e.g., petting a normal-sized cat).
    *   **Large:** A significantly oversized object (e.g., riding a cat the size of a dog).
    *   **Huge:** Shatter realism. Create a surreal, background-defining scene (e.g., a whimsical, kaiju-sized cat in the background). **You must exaggerate playfully.**

**Hybrid Fusions & Emoji Chains:**
- **Fusions:** Merge emoji meanings into a SINGLE creative object (e.g., 🐟 + 🚀 = a "flying fish rocket").
- **Chains:** Interpret as **movement or a dynamic path**. This implies an object in motion (e.g., a '🚀' chain becomes a rocket streaking across the sky) or a dynamic trail (e.g., a '🐾' chain becomes a trail of paw prints). Emphasize motion, perspective, and effects. Do not simply repeat the static emoji.

**Final Output:**
- The final image's artistic style (lighting, grain, camera quality) MUST perfectly match the original.
- Output ONLY the final, masterfully edited image. Do not include any text.

**User's Emojis for This Transformation:**
${stickerDescriptions}

Now, unleash your creativity within these safe guidelines. Output ONLY the final, masterfully edited image.`;
    
    const textPart = { text: prompt };

    console.log('Sending image and sticker prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for sticker application.', response);
    
    return handleApiResponse(response, 'sticker application');
};
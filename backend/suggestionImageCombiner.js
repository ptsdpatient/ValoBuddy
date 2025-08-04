import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { agentImages } from './images.js';

export async function combineAgentImages(agentNames, tier) {
    // if(!agentNames || agentNames.length<2) return
    try {

        let offset=20

        // console.log(`🧩 [combineAgentImages] Start for tier: ${tier}`);
        // console.log(`🔢 Agent names: ${agentNames.join(', ')}`);

        const paths = agentNames.map(name => {
            const path = agentImages[name];
            if (!path) {
                console.error(`❌ No image path found for agent: ${name}`);
            }
            return path;
        });

        // console.log(`📷 Loading images...`);
        const images = await Promise.all(
            paths.map(async (path, i) => {
                if (!path) throw new Error(`Image path for ${agentNames[i]} is undefined.`);
                try {
                    const img = await loadImage(path);
                    // console.log(`✅ Loaded image for ${agentNames[i]}`);
                    return img;
                } catch (err) {
                    console.error(`❌ Failed to load image for ${agentNames[i]}:`, err);
                    throw err;
                }
            })
        );

        const totalWidth = images.reduce((sum, img) => sum + img.width + offset, 0);
        const maxHeight = Math.max(...images.map(img => img.height));
        // console.log(`📐 Canvas size: ${totalWidth}x${maxHeight}`);

        const canvas = createCanvas(totalWidth, maxHeight);
        const ctx = canvas.getContext('2d');
        
        let x = 0;
        
        for (const [index, img] of images.entries()) {
            ctx.drawImage(img, x, 0);
            // console.log(`🖼️ Placed ${agentNames[index]} at x=${x}`);
            x += img.width + offset;
        }

        const buffer = canvas.toBuffer('image/png');
        const fileName = `combined-${tier}.png`;
        // console.log(`🎨 Image buffer created: ${fileName}`);

        return new AttachmentBuilder(buffer, { name: fileName });

    } catch (error) {
        console.error(`🔥 [combineAgentImages] Error in combining images for tier "${tier}":`, error);
        throw error;
    }
}
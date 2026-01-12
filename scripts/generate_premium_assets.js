const fs = require('fs');
const path = require('path');
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

if (!GEMINI_API_KEY) {
    console.error("Please set GEMINI_API_KEY environment variable");
    process.exit(1);
}

class GeminiImageClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async generateImage(options) {
        const { prompt, aspectRatio, imageSize, model = "gemini-3-pro-image-preview" } = options;
        
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                imageConfig: {
                    aspectRatio: aspectRatio || "1:1",
                    imageSize: imageSize || "1K"
                }
            }
        };

        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${this.apiKey}`;
        
        console.log(`Generating image for prompt: "${prompt}"...`);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`API Error ${response.status}: ${txt}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0].content.parts) {
             console.error("Full response:", JSON.stringify(data, null, 2));
             throw new Error("No candidates in response");
        }

        const parts = data.candidates[0].content.parts;
        const imagePart = parts.find(p => p.inlineData);

        if (!imagePart) {
             throw new Error("No image data found in response");
        }

        return {
            mimeType: imagePart.inlineData.mimeType,
            data: imagePart.inlineData.data
        };
    }
}

async function saveImage(base64Data, filepath) {
    const buffer = Buffer.from(base64Data, 'base64');
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, buffer);
    console.log(`Saved to ${filepath}`);
}

async function main() {
    const client = new GeminiImageClient(GEMINI_API_KEY);

    const tasks = [
        {
            // High-end "Prestige" style hero: Dark, moody, elegant, focus on texture and lighting
            prompt: "luxurious legal office interior, dark emerald green and gold accents, mahogany desk, cinematic lighting, shallow depth of field, ultra-realistic, 8k, moody atmosphere, elegant, sophisticated, premium architectural photography",
            aspectRatio: "16:9",
            output: "assets/images/premium_hero.png"
        },
        {
            // Minimalist "Streamline" style icons: Thin lines, gold accent
            prompt: "minimalist line art icon of a handshake, gold color on white background, thin elegant strokes, vector style, premium design",
            aspectRatio: "1:1",
            output: "assets/images/icon_consult_premium.png"
        },
        {
            prompt: "minimalist line art icon of a fountain pen signing a document, gold color on white background, thin elegant strokes, vector style, premium design",
            aspectRatio: "1:1",
            output: "assets/images/icon_prep_premium.png"
        },
        {
            prompt: "minimalist line art icon of a courthouse column, gold color on white background, thin elegant strokes, vector style, premium design",
            aspectRatio: "1:1",
            output: "assets/images/icon_file_premium.png"
        }
    ];

    for (const task of tasks) {
        try {
            const result = await client.generateImage({
                prompt: task.prompt,
                aspectRatio: task.aspectRatio
            });
            await saveImage(result.data, task.output);
        } catch (e) {
            console.error(`Failed to generate ${task.output}:`, e.message);
        }
    }
}

main();

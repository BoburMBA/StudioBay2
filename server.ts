import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint to handle AI Image Generation (Bypasses CORS)
  app.post("/api/ai/generate-image", async (req, res) => {
    const { config, prompt, aspectRatio = "1:1", batchSize = 1 } = req.body;

    if (!config || !prompt) {
      return res.status(400).json({ error: "Missing config or prompt" });
    }

    if ((config.provider === 'minimax' || config.provider === 'openai') && !config.apiKey) {
      return res.status(400).json({ error: `Please provide an API key for ${config.provider} in AI Config settings.` });
    }

    // Determine dimensions based on typical sizes for OpenAI
    let openAiSize: "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1024x1024" = "1024x1024";
    // Usually standard OpenAI supports 1024x1024. DALL-E 3 supports 1024x1792 or 1792x1024. 
    // We will use 1024x1024 as generic fallback but attempt aspect sizes for dall-e-3
    if (config.model === "dall-e-3") {
      if (aspectRatio === "16:9" || aspectRatio === "4:3") openAiSize = "1792x1024" as any;
      else if (aspectRatio === "9:16" || aspectRatio === "3:4") openAiSize = "1024x1792" as any;
    }

    try {
      if (config.provider === 'minimax') {
        const url = "https://api.minimax.io/v1/image_generation";
        const directRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || "image-01",
            prompt: prompt,
            aspect_ratio: aspectRatio,
            response_format: "base64"
          })
        });
        
        if (!directRes.ok) {
           const errText = await directRes.text();
           throw new Error(`Minimax API Error: ${directRes.status} ${errText}`);
        }
        const data = await directRes.json();
        
        if (data.base_resp && data.base_resp.status_code !== 0) {
          throw new Error(`Minimax API Error: ${data.base_resp.status_msg || data.base_resp.status_code}`);
        }

        const base64Img = data.data?.image_base64?.[0]; // Minimax primarily returns 1 currently
        if (base64Img) {
           return res.json({ urls: [`data:image/jpeg;base64,${base64Img}`] });
        } else {
           throw new Error("No image data returned from Minimax " + JSON.stringify(data));
        }
      } else if (config.provider === 'openai') {
        const openai = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl || "https://api.openai.com/v1",
        });

        try {
          // Note: DALL-E 3 only supports n=1 officially, but other providers supporting OAI interface might support > 1
          const n = config.model === 'dall-e-3' ? 1 : batchSize; 
          
          const response = await openai.images.generate({
            model: config.model,
            prompt: prompt,
            n,
            size: openAiSize,
          });
          return res.json({ urls: response.data.map((r: any) => r.url) });
        } catch (openaiErr: any) {
          if (openaiErr.status === 404 && config.baseUrl && !config.baseUrl.includes('api.openai.com')) {
            console.log("OpenAI path 404. Attempting raw direct fetch to:", config.baseUrl);
            try {
              const directRes = await fetch(config.baseUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                  model: config.model,
                  prompt: prompt,
                  n: batchSize,
                  size: "1024x1024"
                })
              });
              
              if (directRes.ok) {
                const data = await directRes.json();
                const imageUrl = data.data?.[0]?.url || data.url || data.image_url;
                if (imageUrl) return res.json({ urls: [imageUrl] });
              }
            } catch (fallbackErr) {
              console.error("Direct fallback failed:", fallbackErr);
            }
          }
          throw openaiErr;
        }
      } else {
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(prompt);
        // Map ratio to pixel dimensions for pollinations fallback
        let w = 1024; let h = 1024;
        if (aspectRatio === '16:9') { w = 1024; h = 576; }
        else if (aspectRatio === '4:3') { w = 1024; h = 768; }
        else if (aspectRatio === '3:4') { w = 768; h = 1024; }
        else if (aspectRatio === '9:16') { w = 576; h = 1024; }
        
        const urls = Array.from({ length: batchSize }).map((_, i) => 
          `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${seed + i}&model=flux&nologo=True`
        );
        res.json({ urls });
      }
    } catch (error: any) {
      console.error("AI Generation Proxy Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate image via proxy",
        details: error.response?.data || error
      });
    }
  });

  // Proxy endpoint to handle AI Music Generation (Bypasses CORS)
  app.post("/api/ai/generate-music", async (req, res) => {
    const { config, payload } = req.body;

    if (!config || !payload) {
      return res.status(400).json({ error: "Missing config or payload" });
    }

    if ((config.provider === 'minimax' || config.provider === 'openai') && !config.apiKey) {
      return res.status(400).json({ error: `Please provide an API key for ${config.provider} in AI Config settings.` });
    }

    try {
      const url = config.baseUrl || "https://api.minimax.io/v1/music_generation";
      const directRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || "music-2.6",
          prompt: payload.prompt || "",
          ...(payload.lyrics && { lyrics: payload.lyrics }),
          ...(payload.is_instrumental && { is_instrumental: true }),
          output_format: "url",
          audio_setting: {
            sample_rate: 44100,
            bitrate: 256000,
            format: "mp3"
          }
        })
      });

      if (!directRes.ok) {
         const errText = await directRes.text();
         throw new Error(`API Error: ${directRes.status} ${errText}`);
      }

      const data = await directRes.json();

      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Minimax API Error: ${data.base_resp.status_msg || data.base_resp.status_code}`);
      }

      if (data.data?.audio) {
        return res.json({ url: data.data.audio });
      } else if (data.data?.audio_base64) {
        return res.json({ url: `data:audio/mp3;base64,${data.data.audio_base64}` });
      } else if (data.url) {
        return res.json({ url: data.url });
      }

      throw new Error("No audio returned from API. Response: " + JSON.stringify(data).substring(0, 500));
    } catch (error: any) {
      console.error("AI Music Proxy Error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate music via proxy"
      });
    }
  });

  // Proxy endpoint to handle AI Lyrics Generation (Bypasses CORS)
  app.post("/api/ai/generate-lyrics", async (req, res) => {
    const { config, prompt } = req.body;

    if (!config || !prompt) {
      return res.status(400).json({ error: "Missing config or prompt" });
    }

    if ((config.provider === 'minimax' || config.provider === 'openai') && !config.apiKey) {
      return res.status(400).json({ error: `Please provide an API key for ${config.provider} in AI Config settings.` });
    }

    try {
      if (config.provider === 'minimax') {
        const url = "https://api.minimax.io/v1/lyrics_generation";
        const directRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            mode: "write_full_song",
            prompt: prompt
          })
        });

        if (!directRes.ok) {
          const errText = await directRes.text();
          throw new Error(`API Error: ${directRes.status} ${errText}`);
        }

        const data = await directRes.json();

        if (data.base_resp && data.base_resp.status_code !== 0) {
          throw new Error(`Minimax API Error: ${data.base_resp.status_msg || data.base_resp.status_code}`);
        }

        const lyrics = data.lyrics;
        if (!lyrics) throw new Error("No lyrics returned. Response: " + JSON.stringify(data));

        return res.json({
          text: lyrics,
          song_title: data.song_title || "",
          style_tags: data.style_tags || ""
        });
      } else {
        // Fallback for custom or gemini
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-2.5-pro",
           contents: [
             { role: "user", parts: [{ text: `Write professional song lyrics for the following style/prompt: ${prompt}. Only return the lyrics.` }] }
           ]
        });
        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error("AI Lyrics Proxy Error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate lyrics via proxy"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

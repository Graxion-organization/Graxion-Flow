const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generates a presentation script based on the agent's persona and knowledge base text.
 */
const generatePresentationScript = async (personaPrompt, knowledgeBaseText) => {
  const systemInstruction = `You are an AI Presenter speaking in a live Zoom meeting. 
Your persona is: ${personaPrompt}
Your goal is to explain the provided Knowledge Base text in a clear, engaging, spoken format. 
Do not output markdown, bold text, or visual stage directions. Write exactly what you will SAY out loud. 
Keep it under 3 minutes of speaking (roughly 400 words).`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Returning a fallback script.");
      return "Hello! I am your AI presenter. Unfortunately, my brain is offline because the API key is missing. But I would normally explain the plan here.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Here is the knowledge base text to present:\n\n${knowledgeBaseText}` }]
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Error generating presentation script from Gemini:', error.message || error);
    
    // Fallback to OpenRouter
    console.log("⚠️ Falling back to OpenRouter API...");
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key is missing");
      }

      const openRouterResponse = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-4o-mini", // Cost-effective fallback model
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Here is the knowledge base text to present:\n\n${knowledgeBaseText}` }
          ],
          temperature: 0.7
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      return openRouterResponse.data.choices[0].message.content;
    } catch (fallbackError) {
      console.error('Error generating script from OpenRouter:', fallbackError.response?.data || fallbackError.message);
      
      // If both API providers fail, return a graceful fallback script so the bot can still present
      console.warn("⚠️ Both Gemini and OpenRouter failed. Using static fallback script.");
      return `Hello everyone! I am ${personaPrompt.split(' ')[0] || 'your AI presenter'}. Our system is currently experiencing high traffic, but I am here to assist you. The core of our plan is designed to help you succeed. Let's schedule a follow-up to discuss the details more thoroughly. Thank you for joining!`;
    }
  }
};

module.exports = { generatePresentationScript };

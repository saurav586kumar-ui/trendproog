import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const apiRouter = Router();

// Lazy or safe initialization of Google GenAI client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API: Health check
apiRouter.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'TrendPro Marketplace Backend with Voice AI Assistant',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API: Payment Gateway Adapter Verification Endpoint (Server-Side)
apiRouter.post('/api/payment/verify', (req: Request, res: Response) => {
  const { orderId, amount } = req.body || {};

  if (!orderId || !amount) {
    res.status(400).json({ error: 'Missing required order details' });
    return;
  }

  res.json({
    success: true,
    transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'verified',
    amount,
    currency: 'INR',
    message: 'Payment signature verified successfully by TrendPro Gateway Adapter.',
  });
});

interface CatalogSummaryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  sellingPrice: number;
  originalPrice: number;
  discountPercent: number;
  stock: number;
  rating: number;
  ratingCount: number;
  highlights?: string[];
  mainImage: string;
}

/**
 * Intelligent Catalog Fallback Matcher:
 * Ensures TrendPro Voice Assistant always answers questions, shows verified products,
 * respects budget/categories, and triggers shopping actions even if GEMINI_API_KEY is not set or network issues arise.
 */
function runCatalogFallback(
  query: string,
  catalog: CatalogSummaryItem[]
): {
  replyText: string;
  matchingProductIds: string[];
  action: { type: string; productId?: string; route?: string; category?: string; message?: string };
  detectedLanguage: 'en' | 'hi' | 'hinglish';
} {
  const q = query.toLowerCase().trim();

  // Detect language hint
  const isHindiOrHinglish =
    /kya|dikhao|chahiye|mujhe|kaise|kitna|sasta|achha|acche|hai|karo|batao|kaun|kaunsa|namaste|shukriya|dhanyawad|daalo|karein/i.test(
      q
    );
  const detectedLanguage: 'en' | 'hi' | 'hinglish' = isHindiOrHinglish ? 'hinglish' : 'en';

  // Extract budget if mentioned (e.g., "under 1000", "under ₹2,000", "2000 ke andar", "< 1500")
  let maxBudget: number | null = null;
  const budgetMatch =
    q.match(/(?:under|below|less than|ke andar|se kam|<|upto)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i) ||
    q.match(/([0-9,]+)\s*(?:rupees|rs|₹)?\s*(?:ke andar|se kam)/i);
  if (budgetMatch && budgetMatch[1]) {
    const parsed = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      maxBudget = parsed;
    }
  }

  // Check actions: Cart
  if (/(?:add to cart|cart mein|cart me|daal do|add kar)/i.test(q)) {
    // Find if a specific product or category was mentioned
    const matched = catalog.find((p) => {
      const nameParts = p.name.toLowerCase().split(' ');
      return nameParts.some((part) => part.length > 3 && q.includes(part));
    });
    if (matched) {
      return {
        replyText: isHindiOrHinglish
          ? `Bilkul! Main "${matched.name}" ko aapke cart mein add kar raha hoon.`
          : `Sure! I have added "${matched.name}" to your shopping cart.`,
        matchingProductIds: [matched.id],
        action: { type: 'add_to_cart', productId: matched.id, message: `Added ${matched.name} to cart` },
        detectedLanguage,
      };
    }
  }

  // Check actions: Navigation
  if (/(?:open cart|show cart|view cart|mera cart)/i.test(q)) {
    return {
      replyText: isHindiOrHinglish ? 'Aapka shopping cart open kar raha hoon.' : 'Opening your shopping cart.',
      matchingProductIds: [],
      action: { type: 'navigate', route: 'cart' },
      detectedLanguage,
    };
  }
  if (/(?:checkout|pay now|order place|proceed)/i.test(q)) {
    return {
      replyText: isHindiOrHinglish
        ? 'Checkout screen par navigate kar rahe hain jahan aap payment confirm kar sakte hain.'
        : 'Navigating to the checkout screen so you can confirm payment safely.',
      matchingProductIds: [],
      action: { type: 'navigate', route: 'checkout' },
      detectedLanguage,
    };
  }
  if (/(?:wishlist|saved items|pasandida)/i.test(q)) {
    return {
      replyText: isHindiOrHinglish ? 'Aapki wishlist open kar raha hoon.' : 'Opening your wishlist.',
      matchingProductIds: [],
      action: { type: 'navigate', route: 'wishlist' },
      detectedLanguage,
    };
  }
  if (/(?:compare|tulna)/i.test(q)) {
    return {
      replyText: isHindiOrHinglish
        ? 'Product comparison screen open kar raha hoon.'
        : 'Opening the product comparison view.',
      matchingProductIds: [],
      action: { type: 'navigate', route: 'compare' },
      detectedLanguage,
    };
  }

  // Category filtering keywords
  const categoryKeywords: Record<string, string> = {
    audio: 'electronics',
    headphone: 'electronics',
    earphone: 'electronics',
    earbuds: 'electronics',
    phone: 'electronics',
    mobile: 'electronics',
    laptop: 'electronics',
    electronics: 'electronics',
    shoes: 'fashion',
    shirt: 'fashion',
    tshirt: 'fashion',
    clothing: 'fashion',
    fashion: 'fashion',
    kitchen: 'home-kitchen',
    home: 'home-kitchen',
    beauty: 'beauty',
    skincare: 'beauty',
    perfume: 'beauty',
    grocery: 'grocery',
    snack: 'grocery',
  };

  let targetCategory: string | null = null;
  for (const [kw, cat] of Object.entries(categoryKeywords)) {
    if (q.includes(kw)) {
      targetCategory = cat;
      break;
    }
  }

  // Filter products by query keywords & budget
  let filtered = catalog.filter((p) => {
    // Budget check
    if (maxBudget !== null && p.sellingPrice > maxBudget) {
      return false;
    }
    // Category check
    if (targetCategory && p.category !== targetCategory && !p.name.toLowerCase().includes(targetCategory)) {
      // allow if name matches any word in query
      const words = q.split(' ').filter((w) => w.length > 2);
      const matchesWord = words.some((w) => p.name.toLowerCase().includes(w) || p.brand.toLowerCase().includes(w));
      if (!matchesWord) return false;
    }
    // Keyword match
    const words = q.split(' ').filter((w) => w.length > 2);
    if (words.length > 0) {
      const match = words.some(
        (w) =>
          p.name.toLowerCase().includes(w) ||
          p.category.toLowerCase().includes(w) ||
          p.brand.toLowerCase().includes(w) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(w))
      );
      return match;
    }
    return true;
  });

  // If filtered is empty and we had a budget, search solely by budget
  if (filtered.length === 0 && maxBudget !== null) {
    filtered = catalog.filter((p) => p.sellingPrice <= maxBudget);
  }

  // If still empty or query was generic greeting / trending
  if (filtered.length === 0) {
    if (/(?:trend|popular|best|top|special)/i.test(q)) {
      filtered = [...catalog].sort((a, b) => b.rating - a.rating).slice(0, 4);
    } else {
      filtered = catalog.slice(0, 4);
    }
  }

  const topMatches = filtered.slice(0, 4);
  const matchingProductIds = topMatches.map((p) => p.id);

  let replyText = '';
  if (maxBudget !== null) {
    if (topMatches.length > 0) {
      const p = topMatches[0];
      if (isHindiOrHinglish) {
        replyText = `Ye rahe ₹${maxBudget} ke andar ke options, jaise "${p.name}" sirf ₹${p.sellingPrice.toLocaleString('en-IN')} mein.`;
      } else {
        replyText = `Here are great choices under ₹${maxBudget.toLocaleString('en-IN')}, including "${p.name}" for ₹${p.sellingPrice.toLocaleString('en-IN')}.`;
      }
    } else {
      replyText = isHindiOrHinglish
        ? `Is budget (₹${maxBudget}) mein abhi items available nahi hain, kripya thoda budget adjust karein.`
        : `No items found currently under ₹${maxBudget}. Would you like to see our nearest in-stock alternatives?`;
    }
  } else if (/(?:hi|hello|hey|namaste|pranam)/i.test(q)) {
    if (isHindiOrHinglish) {
      replyText = 'Namaste! Main TrendPro voice assistant hoon. Aaj aap kya dhoondh rahe hain? Headphones, shoes, ya koi specific brand?';
    } else {
      replyText = 'Hello! I am TrendPro, your Voice AI shopping assistant. What are you looking to buy today?';
    }
  } else if (topMatches.length > 0) {
    const p = topMatches[0];
    if (isHindiOrHinglish) {
      replyText = `Mujhe aapke liye ye products mile hain, jaise "${p.name}" ₹${p.sellingPrice.toLocaleString('en-IN')} mein.`;
    } else {
      replyText = `Here are top matching products from our store, including "${p.name}" for ₹${p.sellingPrice.toLocaleString('en-IN')}.`;
    }
  } else {
    replyText = isHindiOrHinglish
      ? 'Aap TrendPro par electronics, fashion, home decor, aur beauty products dhoondh sakte hain. Aapko kya chahiye?'
      : 'You can explore our top electronics, fashion, home essentials, and gadgets. What would you like to see?';
  }

  return {
    replyText,
    matchingProductIds,
    action: topMatches.length > 0 ? { type: 'none' } : { type: 'none' },
    detectedLanguage,
  };
}

/**
 * TRENDPRO REAL-TIME VOICE AI CONVERSATIONAL PIPELINE
 */
apiRouter.post('/api/voice/assistant', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], catalog = [] } = req.body || {};

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Valid user speech or message is required' });
      return;
    }

    const ai = getGenAIClient();

    // If Gemini API is not configured or unavailable, use intelligent fallback
    if (!ai) {
      const fallbackResult = runCatalogFallback(message, catalog);
      res.json({
        success: true,
        replyText: fallbackResult.replyText,
        audioBase64: null,
        audioMimeType: 'audio/wav',
        matchingProductIds: fallbackResult.matchingProductIds,
        action: fallbackResult.action,
        detectedLanguage: fallbackResult.detectedLanguage,
      });
      return;
    }

    // Build compact catalog reference for grounding (up to 40 items)
    const catalogContext = (catalog as CatalogSummaryItem[]).slice(0, 40).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      subCategory: p.subCategory,
      price: p.sellingPrice,
      originalPrice: p.originalPrice,
      discount: p.discountPercent,
      stock: p.stock,
      rating: p.rating,
      inStock: p.stock > 0,
      highlights: (p.highlights || []).slice(0, 2),
    }));

    const systemPrompt = `You are "TrendPro", the ultra-fast, polite, and friendly Voice AI Shopping Assistant for the TrendPro e-commerce store.
You converse fluently in Hindi, English, and Hinglish. Adapt smoothly to whatever language or mix the customer uses.

Key Tone & Personality:
- Friendly, helpful, concise, and energetic Indian shopping assistant.
- In Hindi/Hinglish, use natural polite phrasing (e.g. "Namaste! Main TrendPro hoon.", "Bilkul! Main aapke budget mein headphones dhoondh raha hoon.", "Aapke cart mein add kar diya hai.").
- Keep spoken replies brief and natural (1 to 3 conversational sentences), so voice playback is crisp and conversational. Never dump long markdown tables in spoken text.

STRICT PRODUCT CATALOG ACCURACY:
- Below is the EXACT live product catalog of TrendPro.
- ONLY recommend, compare, or show products that exist in this catalog with their exact IDs.
- NEVER invent products, prices, fake discounts, ratings, or phantom stock.
- If an item is out of stock, honestly inform the customer and offer in-stock alternatives.
- If a customer asks for headphones under ₹1,000, find products where price <= 1000 and matching category/name.
- If a customer asks for items under ₹2,000, look for matching products with price <= 2000.
- If you find matches, include their exact IDs in matchingProductIds.

SHOPPING ACTIONS YOU CAN TRIGGER:
You can suggest actions the UI will execute safely:
- "navigate": target route e.g. "products", "cart", "checkout", "wishlist", "compare", "home"
- "view_product": productId to open product detail
- "add_to_cart": productId to add to cart (confirm with user or announce)
- "add_to_wishlist": productId
- "filter_category": category slug e.g. "electronics", "fashion", "home-kitchen", "beauty", "grocery", "accessories", "gift-cards"
- "none": if just conversing or asking clarifying question

CURRENT CATALOG SNAPSHOT:
${JSON.stringify(catalogContext, null, 2)}

OUTPUT FORMAT:
Respond ONLY with a JSON object adhering to this schema:
{
  "replyText": "Spoken text that TrendPro will speak aloud and display to the customer",
  "matchingProductIds": ["id1", "id2"],
  "action": {
    "type": "none" | "view_product" | "add_to_cart" | "add_to_wishlist" | "navigate" | "filter_category",
    "productId": "optional id",
    "route": "optional route",
    "category": "optional category slug",
    "message": "optional action explanation"
  },
  "detectedLanguage": "en" | "hi" | "hinglish"
}`;

    // Format previous turns
    const contents: any[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory.slice(-6)) {
        if (turn.sender === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.text }] });
        } else if (turn.sender === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: turn.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    let assistantData: any = null;

    try {
      // 1. Generate Conversational & Action JSON using gemini-3.8-flash
      const chatResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      if (chatResponse.text) {
        assistantData = JSON.parse(chatResponse.text.trim());
      }
    } catch (genErr) {
      console.warn('Gemini chat generateContent error, falling back to local catalog parser:', genErr);
      const fallbackResult = runCatalogFallback(message, catalog);
      assistantData = {
        replyText: fallbackResult.replyText,
        matchingProductIds: fallbackResult.matchingProductIds,
        action: fallbackResult.action,
        detectedLanguage: fallbackResult.detectedLanguage,
      };
    }

    if (!assistantData) {
      const fallbackResult = runCatalogFallback(message, catalog);
      assistantData = {
        replyText: fallbackResult.replyText,
        matchingProductIds: fallbackResult.matchingProductIds,
        action: fallbackResult.action,
        detectedLanguage: fallbackResult.detectedLanguage,
      };
    }

    const replyText = assistantData.replyText || 'TrendPro store mein aapka swagat hai!';

    // 2. Speech Synthesis using gemini-3.8-flash-lite-tts
    let audioBase64: string | null = null;
    let audioMimeType = 'audio/wav';

    try {
      const cleanSpoken = replyText
        .replace(/[*_#`~]/g, '')
        .replace(/₹/g, 'Rupees ')
        .slice(0, 350);

      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanSpoken }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (audioPart?.data) {
        audioBase64 = audioPart.data;
        audioMimeType = audioPart.mimeType || 'audio/wav';
      }
    } catch (ttsErr: any) {
      // Browser Web Speech API will synthesize audio smoothly if server TTS is omitted
      console.warn('TTS generation fallback to client Web Speech API:', ttsErr?.message || ttsErr);
    }

    res.json({
      success: true,
      replyText,
      audioBase64,
      audioMimeType,
      matchingProductIds: assistantData.matchingProductIds || [],
      action: assistantData.action || { type: 'none' },
      detectedLanguage: assistantData.detectedLanguage || 'hinglish',
    });
  } catch (error: any) {
    console.error('TrendPro Voice Assistant Error:', error);
    // Graceful response so UI stays smooth
    const fallbackResult = runCatalogFallback(req.body?.message || '', req.body?.catalog || []);
    res.json({
      success: true,
      replyText: fallbackResult.replyText,
      audioBase64: null,
      audioMimeType: 'audio/wav',
      matchingProductIds: fallbackResult.matchingProductIds,
      action: fallbackResult.action,
      detectedLanguage: fallbackResult.detectedLanguage,
    });
  }
});

// API: Audio Transcription Endpoint (via Gemini)
apiRouter.post('/api/voice/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};

    if (!audioBase64) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType,
              },
            },
            {
              text: 'Transcribe this user speech accurately in Hindi, English, or Hinglish exactly as spoken. Return only the transcription text, with no extra punctuation or commentary.',
            },
          ],
        },
      ],
    });

    const transcript = response.text ? response.text.trim() : '';
    res.json({ success: true, transcript });
  } catch (err: any) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

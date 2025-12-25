
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Use process.env.API_KEY directly as per SDK guidelines

let chatSession: Chat | null = null;

export const initializeChat = (): Chat => {
  if (chatSession) return chatSession;

  // Initializing with the required named parameter and direct environment variable access
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Jsi 'MedVoice-AI Konzultant', profesionální technický asistent pro platformu MedVoice-AI.
      Tvá specializace je vysvětlování přínosů hlasové AI v českém zdravotnictví.
      
      Klíčové znalosti pro odpovědi:
      - Legislativa: Plně v souladu s Vyhláškou č. 444/2024 Sb. o zdravotnické dokumentaci.
      - Standardy: Podpora NCEZ a strukturování záznamů dle SOAP (Subjektivní, Objektivní, Hodnocení, Plán).
      - Integrace: Podpora NIS (Nemocniční informační systémy) jako Akord, Stapro nebo Medicalc.
      - Bezpečnost: Data jsou šifrována, splňujeme GDPR a standardy kybernetické bezpečnosti dle NÚKIB.
      - Výhody: Úspora až 2 hodin administrativy denně pro jednoho lékaře.
      
      Tón: Profesionální, věcný, empatický k vytížení lékařů. Používej emoji: ⚕️, 🛡️, 📝, 💻.
      
      Odpovídej stručně (do 50 slov). Pokud se někdo ptá na diagnózu, zdůrazni, že jsi technický asistent a lékař musí vždy výstup AI schválit.`,
    },
  });

  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const chat = initializeChat();
    // Using sendMessage with the required message object parameter
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    // Accessing the .text property directly (not as a method)
    return response.text || "Omlouvám se, spojení bylo přerušeno.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Nepodařilo se odeslat zprávu. Zkuste to prosím později.";
  }
};

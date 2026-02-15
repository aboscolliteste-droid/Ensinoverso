
import { GoogleGenAI, Type } from "@google/genai";

export interface AIContent {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export const AIService = {
  processPdfContent: async (content: AIContent) => {
    // Initializing GoogleGenAI with API key from environment variable as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const promptPart = {
      text: `Você é um motor de extração de dados e assistente pedagógico de alta precisão. Sua tarefa é dividida em três partes mandatórias:
      
      PARTE 1: GERAÇÃO DE TÍTULO
      Crie um título atraente, curto e pedagógico para a aula com base no conteúdo principal.

      PARTE 2: EXTRAÇÃO DE TEXTO
      Transcreva o texto completo e integral deste documento (PDF ou texto bruto) exatamente como ele aparece. 
      NÃO faça resumos. NÃO faça adaptações pedagógicas. NÃO omita partes. 
      O objetivo é a extração literal do conteúdo original, corrigindo apenas erros óbvios de codificação de caracteres (OCR).

      PARTE 3: GERAÇÃO DE QUESTÕES
      Com base estritamente no conteúdo extraído, gere exatamente 10 questões de múltipla escolha (A, B, C, D).
      O campo 'respostaCorreta' deve ser um índice de 0 a 3 (0=A, 1=B, 2=C, 3=D).
      
      Retorne os dados estritamente no formato JSON definido no schema.`
    };

    // Constructing the parts for the contents parameter
    const parts = content.inlineData ? [content, promptPart] : [{ text: content.text || "" }, promptPart];

    try {
      // Using gemini-3-pro-preview for complex text tasks (extraction + MCQ generation)
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: parts as any },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING, description: "Título pedagógico sugerido para a aula" },
              textoLimpo: { type: Type.STRING, description: "O texto integral e literal extraído do documento original" },
              questoes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pergunta: { type: Type.STRING },
                    alternativas: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                    respostaCorreta: { type: Type.INTEGER }
                  },
                  required: ["pergunta", "alternativas", "respostaCorreta"]
                }
              }
            },
            required: ["titulo", "textoLimpo", "questoes"]
          }
        }
      });

      // Directly accessing the .text property of the response object
      const resultText = response.text;
      if (!resultText) throw new Error("Sem resposta da IA");
      return JSON.parse(resultText);
    } catch (error) {
      console.error("Erro no processamento da IA", error);
      throw error;
    }
  }
};

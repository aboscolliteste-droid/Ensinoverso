
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Você é um motor de extração de dados e assistente pedagógico de alta precisão. Sua tarefa é dividida em três partes mandatórias:
      
      PARTE 1: GERAÇÃO DE TÍTULO
      Crie um título atraente, curto e pedagógico para a aula com base no conteúdo principal.

      PARTE 2: EXTRAÇÃO DE TEXTO
      Transcreva o texto completo e integral deste documento (PDF ou texto bruto) exatamente como ele aparece. 
      NÃO faça resumos. NÃO faça adaptações pedagógicas. NÃO omita partes. 

      PARTE 3: GERAÇÃO DE QUESTÕES
      Gere exatamente 10 questões de múltipla escolha (A, B, C, D).
      O campo 'respostaCorreta' deve ser um índice de 0 a 3.
      
      Retorne os dados estritamente no formato JSON definido no schema.`;

    const parts = content.inlineData 
      ? [{ inlineData: content.inlineData }, { text: prompt }] 
      : [{ text: content.text || "" }, { text: prompt }];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: parts as any }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              textoLimpo: { type: Type.STRING },
              questoes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pergunta: { type: Type.STRING },
                    alternativas: { type: Type.ARRAY, items: { type: Type.STRING } },
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

      const resultText = response.text;
      if (!resultText) throw new Error("Sem resposta da IA");
      return JSON.parse(resultText);
    } catch (error) {
      console.error("Erro no processamento da IA", error);
      throw error;
    }
  }
};

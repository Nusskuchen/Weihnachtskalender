import { GoogleGenAI, Type } from "@google/genai";
import { Riddle } from "../types";

// Initialize the API client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateRiddleForDay = async (day: number): Promise<Riddle> => {
  try {
    const textModel = "gemini-2.5-flash"; 
    const imageModel = "gemini-2.5-flash-image";

    // Define distinct categories based on modulo to ensure variety across the calendar
    const categories = [
      "Logik & Deduktion (Professor Layton Stil: Schlussfolgerungen, Wer lügt/sagt die Wahrheit, Logikgitter, Sitzordnungen)",
      "Weihnachts-Mathematik (Textaufgaben, Rechenrätsel mit Geschenken/Rentieren, Zeitberechnungen, Kombinatorik)",
      "Mustererkennung & Reihenfolgen (Zahlenreihen fortsetzen, Logische Abfolgen von Symbolen)",
      "Laterales Denken & Wortspiele (Um-die-Ecke-Denken, Fangfragen, klassische Rätselreime)"
    ];

    // Cycle through categories
    const selectedCategory = categories[day % categories.length];
    
    // --- STEP 1: Generate Text Riddle ---
    const textResponse = await ai.models.generateContent({
      model: textModel,
      contents: `Du bist ein genialer Rätselmeister für einen Adventskalender, inspiriert von Denkspielen wie 'Professor Layton'.
      Erstelle ein weihnachtliches Rätsel für den ${day}. Dezember.
      
      Vorgeschriebene Kategorie für heute: **${selectedCategory}**.

      Anforderungen:
      1. Das Rätsel muss das Thema Weihnachten/Winter haben.
      2. Der Schwierigkeitsgrad soll "mittelschwer bis knifflig" sein.
      3. VERMEIDE reine Wissensabfragen (Trivia). Wir wollen Denksport!
      4. Sei kreativ und vermeide Wiederholungen zu vorherigen Tagen.
      
      Output Formatierung:
      - Variiere den Typ zwischen 'choice' (Multiple Choice) und 'text' (Freitext).
      - Bei Mathe- oder Logikrätseln ist 'choice' oft hilfreich, um Frust zu vermeiden.
      - Wenn 'choice', gib 4 Antwortmöglichkeiten.
      - Wenn 'text', gib eine Liste von akzeptierten Antworten.
      - **WICHTIG: Erstelle genau 3 Hinweise ('hints').**
        - Hinweis 1: Ein kleiner, vager Denkanstoß.
        - Hinweis 2: Etwas konkreter, weist auf eine Eigenschaft oder Rechenweg hin.
        - Hinweis 3: Sehr deutlich, fast schon die Lösung.
      - Die 'solutionExplanation' erklärt den logischen Weg zur Lösung verständlich.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.NUMBER },
            question: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["text", "choice"] },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Nur ausfüllen wenn type='choice'. Sollte 4 Optionen enthalten."
            },
            correctAnswer: { type: Type.STRING },
            acceptedAnswers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Alternative Schreibweisen für die korrekte Antwort (nur für Text-Rätsel relevant)."
            },
            hints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Genau 3 progressive Hinweise.",
              minItems: 3,
              maxItems: 3
            },
            solutionExplanation: { type: Type.STRING, description: "Eine detaillierte Erklärung des Lösungswegs." }
          },
          required: ["day", "question", "type", "correctAnswer", "solutionExplanation", "hints"]
        }
      }
    });

    let text = textResponse.text || "";
    
    // Improved JSON cleaning to handle markdown code blocks or conversational intros
    // We look for the FIRST '{' and the LAST '}' to capture the full object
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
       console.error("Invalid JSON response:", text);
       throw new Error("Ungültiges JSON Format erhalten.");
    }

    // Extract JSON string
    let jsonString = text.substring(firstBrace, lastBrace + 1);
    
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON parsing failed", e);
      throw new Error("JSON parsing failed");
    }

    // --- SANITIZATION START ---
    const sanitizeString = (val: any): string => {
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        // Try to extract common property names if the AI returned an object wrapper
        return val.text || val.value || val.content || JSON.stringify(val);
      }
      return String(val);
    };

    data.question = sanitizeString(data.question);
    data.correctAnswer = sanitizeString(data.correctAnswer);
    data.solutionExplanation = sanitizeString(data.solutionExplanation);

    // Sanitize Hints
    if (!data.hints || !Array.isArray(data.hints)) {
      data.hints = ["Lies die Frage genau.", "Denk mal um die Ecke.", "Es hat mit Weihnachten zu tun."];
    } else {
      data.hints = data.hints.map((h: any) => sanitizeString(h));
    }
    
    // Sanitize Options (Critical for 'choice' type)
    if (data.type === 'choice') {
      if (!data.options || !Array.isArray(data.options)) {
        console.warn("Riddle type was choice but options were missing/invalid. Fallback to text.");
        data.type = 'text';
      } else {
        data.options = data.options.map((o: any) => sanitizeString(o));
      }
    }

    // Sanitize Accepted Answers
    if (Array.isArray(data.acceptedAnswers)) {
      data.acceptedAnswers = data.acceptedAnswers.map((a: any) => sanitizeString(a));
    }
    // --- SANITIZATION END ---

    // --- STEP 2: Generate Image based on the Riddle ---
    let imageUrl = undefined;
    try {
      // Shorten prompt to save tokens and improve stability
      const imagePrompt = `Christmas anime watercolor art: ${data.question.substring(0, 150)}. Cozy, detailed, no text.`;

      const imageResponse = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3",
          }
        }
      });

      // Extract image
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (imgError) {
      console.warn("Image generation failed:", imgError);
      // Fail gracefully, allow riddle to exist without image
    }

    return {
      ...data,
      imageUrl // Can be undefined
    };

  } catch (error) {
    console.error("Error in generateRiddleForDay:", error);
    throw error;
  }
};
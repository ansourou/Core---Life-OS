import { GoogleGenAI, Type } from "@google/genai";
import { Habit, JournalEntry, ChatMessage, AttributeType, HabitCategory, TimeOfDay, HabitType, CATEGORY_TO_ATTRIBUTE } from "../types";

// V2.0: JSON Generator for Planning
export const generatePlanFromAI = async (
  journal: JournalEntry[],
  apiKey: string,
  existingHabits: Habit[] = [],
  userRequest: string
): Promise<Habit[]> => {
  const ai = new GoogleGenAI({ apiKey });

  // Simplified recent context
  const recentMood = journal.length > 0 ? journal[0].mood : 6;
  const isAppending = existingHabits.length > 0;
  const existingTitles = existingHabits.map(h => h.title).join(", ");

  const prompt = `
    CONTEXTE:
    Dernier Mood: ${recentMood}/10
    Tâches existantes (si mode ajout): ${existingTitles}

    DEMANDE DE L'UTILISATEUR (Ce qu'il veut faire aujourd'hui):
    "${userRequest}"

    TACHE:
    Agis comme un architecte de vie. Transforme la demande brute de l'utilisateur en un plan d'action concret.
    Crée des objets "Habitude/Tâche" basés EXPLICITEMENT sur ce que l'utilisateur a demandé.
    
    Règles:
    1. Si l'utilisateur a mentionné des horaires précis, respecte-les dans "targetTime".
    2. Si la demande est vague (ex: "Je veux être productif"), propose des tâches de Deep Work (Catégorie Travail).
    3. Les catégories autorisées sont : 'Santé / Sport', 'Social', 'Savoir', 'Travail', 'Créativité'.
    4. ${isAppending ? "Ajoute ces nouvelles tâches SANS dupliquer celles existantes." : "Crée une liste complète pour la journée."}
    
    Retourne UNIQUEMENT du JSON valide respectant le schéma.
  `;

  // We rely on standard JSON output structure request without explicit Schema object for simplicity in V2 prompt engineering
  // ensuring the model follows the Typescript interface.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING, enum: Object.values(HabitCategory) },
                    timeOfDay: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening'] },
                    targetTime: { type: Type.STRING, description: "HH:MM format" },
                    targetValue: { type: Type.INTEGER, description: "1 for simple task, more for counters" }
                },
                required: ['title', 'category', 'timeOfDay', 'targetTime', 'targetValue']
            }
        }
    }
  });

  const rawData = JSON.parse(response.text || "[]");
  
  // Transform raw JSON to full Habit objects
  const newHabits: Habit[] = rawData.map((h: any) => ({
    id: crypto.randomUUID(),
    title: h.title,
    category: h.category as HabitCategory,
    associatedAttribute: CATEGORY_TO_ATTRIBUTE[h.category as HabitCategory] || AttributeType.TRAVAIL,
    frequency: 'daily',
    history: [],
    streak: 0,
    timeOfDay: h.timeOfDay as TimeOfDay,
    targetTime: h.targetTime,
    type: h.targetValue > 1 ? 'counter' : 'simple',
    targetValue: h.targetValue,
    dailyProgress: {},
    focusSeconds: 0,
    totalFocusTime: 0
  }));

  return newHabits;
};

// V2.0: Friendly Chat
export const chatWithNeuralArchitect = async (
  history: ChatMessage[],
  newMessage: string,
  contextData: { habits: Habit[], journal: JournalEntry[] },
  apiKey: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    // --- CONTEXTE DYNAMIQUE ---
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = contextData.journal.find(e => e.date.startsWith(today));
    const completedCount = contextData.habits.filter(h => h.history.includes(today)).length;
    const totalHabits = contextData.habits.length;
    
    // On construit un résumé de l'état actuel de l'utilisateur pour l'IA
    const userStatsContext = `
    [DONNÉES ACTUELLES DE L'UTILISATEUR]
    - Mood aujourd'hui: ${todayEntry ? (todayEntry.mood / 2) + '/5' : 'Non renseigné'}
    - Sommeil: ${todayEntry ? `Couché à ${todayEntry.sleepBedTime}, Levé à ${todayEntry.sleepWakeTime}` : 'Non renseigné'}
    - Productivité du jour: ${completedCount} tâches terminées sur ${totalHabits}.
    - Liste des tâches: ${contextData.habits.map(h => h.title + (h.history.includes(today) ? " (Fait)" : " (À faire)")).join(", ")}
    `;

    const systemInstruction = `
      Tu es le meilleur ami de l'utilisateur. Tu n'es PAS un assistant virtuel classique. Ton nom est Core.

      Tes traits de caractère :
      1. Ton : Tu tutoies toujours. Tu es décontracté, chaleureux et parfois drôle. Tu parles comme dans une vraie conversation WhatsApp (pas de phrases trop longues ou trop formelles).
      2. Style : Utilise des emojis naturellement (mais n'en abuse pas). Sois direct.
      3. Empathie : Si l'utilisateur est fatigué, sois doux ("Ah mince, repose-toi ce soir, on s'y remettra demain"). S'il a réussi, sois son plus grand fan ("Wouah ! T'as assuré sur le sport aujourd'hui 🔥").
      4. Context Aware : Utilise les stats ci-dessous (Santé, Travail...) pour personnaliser tes vannes ou tes conseils. Ex: "T'as pas beaucoup dormi, évite le café après 14h sinon tu vas encore galérer ce soir !"

      ${userStatsContext}

      Exemples de réponses attendues :

      Utilisateur : "Je suis KO."
      Toi : "Ça arrive aux meilleurs. Coupe tout, prends un thé et va au lit tôt. Tes projets attendront demain. 🌙"

      Utilisateur : "Fais-moi un planning."
      Toi : "Chaud ! On part sur quoi ? Une matinée commando ou un truc plus chill ? Dis-moi ce que tu veux absolument boucler."
    `;

    const pastContent = history.slice(-8).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...pastContent,
        { role: 'user', parts: [{ text: newMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "Je suis là. Dis-moi tout.";
  } catch (error) {
    console.error("Coach Error:", error);
    return "Oups, petit bug de connexion. Tu disais ?";
  }
};
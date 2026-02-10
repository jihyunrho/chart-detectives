import { GoogleGenAI, Type } from "@google/genai";
import { Annotation, MisleadingComponent } from "../types";

// Helper to safely get the AI client
// We initialize lazily to prevent the app from crashing on load if the key is missing.
const getAIClient = () => {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("API_KEY is missing in process.env. AI features will not work.");
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateInspectionReport = async (annotations: Annotation[], caseType: string): Promise<string> => {
    // UPDATED: Removed coordinates (x, y) from the notes string
    const notes = annotations.map(a => 
        `- Issue found: ${a.reason} -> Misunderstanding caused: ${a.impact}`
    ).join('\n');

    const context = caseType.includes('MARKETING') ? 'Marketing' : 'Policy';

    const prompt = `
    You are an automated report generator for a detective agency.
    
    Data Source (Detective Notes):
    ${notes}

    Case Type: ${context}

    Instructions:
    1. Introduction: Strictly start with exactly this sentence: "The detectives have executed an inspection on this case, and the results are as follows."
    2. Body: Summarize the notes into a concise paragraph describing the misleading components found and their specific impact on interpretation. Keep it brief.
    3. Conclusion: Strictly end with exactly this sentence structure: "Therefore, this ${context} report, which is based on a graph containing misleading elements, is a misled report."
    `;

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "Failed to generate report.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Error generating report. Please check API quota or connection.";
    }
};

export const evaluateInspection = async (
    report: string, 
    activeComponents: MisleadingComponent[]
): Promise<{ success: boolean; feedback: string; score: number; detectedIssues: string[] }> => {
    const expectedIssues = activeComponents.join(', ');

    const prompt = `
    You are a Game Evaluator.
    Target Issues (Ground Truth): ${expectedIssues}.
    
    Submitted Inspection Report: "${report}"

    Task:
    1. Determine if the report correctly identifies the Target Issues.
    2. List exactly which of the "Target Issues" provided above were correctly identified in the report. Return them as an array of strings in 'detectedIssues'.
    3. Provide a score from 0 to 100 based on accuracy and depth.
    4. Provide brief feedback (max 2 sentences).

    Return JSON.
    `;

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        success: { type: Type.BOOLEAN },
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        detectedIssues: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || '{}');
        return {
            success: json.success ?? false,
            score: json.score ?? 0,
            feedback: json.feedback ?? "Evaluation failed.",
            detectedIssues: json.detectedIssues ?? []
        };

    } catch (error) {
        console.error("Gemini Eval Error:", error);
        return { success: false, score: 0, feedback: "AI Evaluation Service unavailable.", detectedIssues: [] };
    }
};

export const getTrainingFeedback = async (
    component: string, 
    userAnswer: string,
    stage: 2 | 3,
    impactAnswer?: string
): Promise<{ correct: boolean; feedback: string }> => {
    let prompt = "";
    
    if (stage === 2) {
        prompt = `
        Context: User is learning to spot "${component}" in charts (Stage 2: Identification).
        User's Answer for "What is misleading?": "${userAnswer}"
        
        Task:
        1. Determine if the user correctly identified "${component}".
        2. Provide feedback. If correct, briefly explain WHY this component is misleading (the concept). If wrong, give a hint.
        
        Return JSON { "correct": boolean, "feedback": string }.
        `;
    } else {
        prompt = `
        Context: User is analyzing "${component}" (Stage 3: Deep Analysis).
        User's Answer for "What is misleading?": "${userAnswer}"
        User's Answer for "What is the misinterpretation?": "${impactAnswer}"
        
        Task:
        1. Determine if the user correctly identified "${component}" AND understood the specific misinterpretation it causes in this context.
        2. Provide feedback.
        
        Return JSON { "correct": boolean, "feedback": string }.
        `;
    }

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
             config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correct: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });
        
        const json = JSON.parse(response.text || '{}');
        return json;
    } catch (e) {
        console.error("Gemini Error:", e);
        return { correct: false, feedback: "Error connecting to AI training service. Please verify API Key." };
    }
};
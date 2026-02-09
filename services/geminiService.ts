import { GoogleGenAI, Type } from "@google/genai";
import { Annotation, MisleadingComponent } from "../types";

// Helper to safely get the AI client
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

export const generateInspectionReport = async (annotations: Annotation[]): Promise<string> => {
    const notes = annotations.map(a => 
        `- Location: (${a.x.toFixed(1)}%, ${a.y.toFixed(1)}%) | Detective: ${a.authorEmail} | Issue: ${a.reason} | Impact: ${a.impact}`
    ).join('\n');

    const prompt = `
    You are a Senior Data Analyst. 
    A team of detectives has inspected a suspicious marketing chart and left the following notes:
    
    ${notes}

    Based on these notes, generate a concise but professional "Inspection Report" (approx 100-150 words).
    Highlight the key misleading features identified by the team and their potential business impact.
    Do not use markdown formatting like bold or headers, just plain text paragraphs.
    `;

    try {
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
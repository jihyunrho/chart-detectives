import { GoogleGenAI, Type } from "@google/genai";
import { Annotation, MisleadingComponent } from "../types";

const getAIClient = () => {
    // In a real app, ensure this is handled securely. 
    // For this prototype, we assume process.env.API_KEY is available.
    if (!process.env.API_KEY) {
        throw new Error("API Key missing. Please set REACT_APP_API_KEY or API_KEY");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInspectionReport = async (annotations: Annotation[]): Promise<string> => {
    const ai = getAIClient();
    
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
        return "Error generating report. Please try again.";
    }
};

export const evaluateInspection = async (
    report: string, 
    activeComponents: MisleadingComponent[]
): Promise<{ success: boolean; feedback: string; score: number }> => {
    const ai = getAIClient();

    const expectedIssues = activeComponents.join(', ');

    const prompt = `
    You are a Game Evaluator.
    Target Issues (Ground Truth): ${expectedIssues}.
    
    Submitted Inspection Report: "${report}"

    Task:
    1. Determine if the report correctly identifies the Target Issues.
    2. Provide a score from 0 to 100 based on accuracy and depth.
    3. Provide brief feedback (max 2 sentences).

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
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || '{}');
        return {
            success: json.success ?? false,
            score: json.score ?? 0,
            feedback: json.feedback ?? "Evaluation failed."
        };

    } catch (error) {
        console.error("Gemini Eval Error:", error);
        return { success: false, score: 0, feedback: "AI Evaluation Service unavailable." };
    }
};

export const getTrainingFeedback = async (
    component: string, 
    userAnswer: string
): Promise<{ correct: boolean; feedback: string }> => {
    const ai = getAIClient();
    
    const prompt = `
    Context: A user is learning to spot "${component}" in charts.
    User Answer: "${userAnswer}"
    
    Is the user's understanding correct? Return JSON { "correct": boolean, "feedback": string }.
    Feedback should be encouraging and correct them if wrong.
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
                        correct: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });
        
        const json = JSON.parse(response.text || '{}');
        return json;
    } catch (e) {
        return { correct: true, feedback: "Auto-passed due to connection error." };
    }
};

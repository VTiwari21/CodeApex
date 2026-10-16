// ======================================
// CodeMentor AI - AI Request Module
// ======================================

// Configure this when your AI backend is deployed.
// GitHub Pages cannot run Flask or Ollama directly.
const AI_CONFIG = {
    endpoint: ""
};

// Send an AI request to the backend.
// This function is separate from runCode().
async function requestAI(task, code, language) {
    if (!AI_CONFIG.endpoint) {
        throw new Error(
            "AI backend is not configured yet. " +
            "Connect the Flask/Ollama backend before using AI features."
        );
    }

    const response = await fetch(AI_CONFIG.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            task: task,
            code: code,
            language: language
        })
    });

    if (!response.ok) {
        throw new Error(`AI request failed: HTTP ${response.status}`);
    }

    return await response.json();
}

// Expose a small public interface for the existing website.
window.CodeMentorAI = {
    requestAI
};

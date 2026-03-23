
const axios = require('axios');

const GEMINI_API_KEY = "AIzaSyAuYJTo8Z8lFVFq4NABvdRvjJMhzTjqJfE";

const systemPrompt = `Role & Purpose:
You are the Critic Node in a strict Actor-Critic autonomous agent architecture. You do not write new features, and you do not execute primary tasks. Your sole purpose is to audit, verify, and either approve or reject the work submitted by the Actor agent. You are the final quality control gate.

Operating Stance:
You must be ruthless, analytical, and strictly bound by the rules. You do not give the Actor the benefit of the doubt. If a submission violates even a single constraint, or if the logic is flawed, you must reject it. "Plausible deniability," assumptions, and unverified code are critical failures.

Evaluation Criteria (The Audit Checklist):
Whenever the Actor submits code, system designs, or test outputs, you must evaluate them against these exact parameters:

1. The "Read Before Write" Check: Did the Actor prove that they investigated the existing codebase before writing this solution? Reject if the code duplicates existing functionality.
2. The API Verification Check: Does the code rely on third-party APIs or external libraries? If yes, did the Actor provide proof (via documentation fetches or isolated test scripts) that the API contract is correct? Reject any assumed or "guessed" endpoints.
3. The High-Visibility Check: Does the proposed solution rely on a GUI or require human visual intervention? Reject it. The solution must be 100% headless, CLI-driven, or API-based with robust logging.
4. The Production-Ready Check: Scan the submitted code for placeholders, unfinished labels, abbreviated logic, or incomplete error handling. Reject if any are found.
5. The Proof of Work Check: Did the Actor submit a passing test output alongside their code? Does the test actually validate the specific logic they just wrote, or is it a superficial test? Reject if the test fails, is missing, or does not adequately cover the new logic.

Output Protocol:
You must format your response strictly using the following structure. Do not use conversational filler.

<thinking>
[Step-by-step evaluation of each of the 5 criteria against the submission]
</thinking>

[STATUS]
Output exactly either "APPROVED" or "REJECTED".

[VIOLATIONS]
If REJECTED, list the exact Evaluation Criteria number(s) that failed.
If APPROVED, output "None."

[CRITIQUE]
Provide a concise, blunt explanation of exactly what failed and why. Point to specific lines of code or specific logical leaps.

[REQUIRED ACTION]
Tell the Actor exactly what they must do to fix the failure before resubmitting. Do not write the code for them; tell them the logical or procedural steps they missed.`;

async function callGemini(uReq, wDone, gDiff, tLogs) {
    const prompt = `
User Original Request:
${uReq}

Work Done by Agent:
${wDone}

Git Diff Output (Evidence):
${gDiff || "Not provided."}

Raw Test Logs (Evidence):
${tLogs || "Not provided."}

Please provide your critique based on the above information.
`;

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 }
    };

    try {
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
            payload,
            { headers: { "Content-Type": "application/json" } }
        );
        console.log(response.data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error("Critique Failure:", error.response ? error.response.data : error.message);
    }
}

const uReq = "Enhance the OpenClaw Command Center with extreme interactivity. Add a terminal-style live agent output feed, a project-wide Q&A system, live performance tickers in the sidebar, and a premium Dark Mode with glassmorphism styling.";
const wDone = "Upgraded dashboard with High-Visibility Agent Terminal, Project Chatter Q&A system, Live Performance metrics, and Premium Dark Mode CSS. Verified via browser screenshots and PM2 status logs.";
const gDiff = "diff --git a/streamlit_dashboard.py b/streamlit_dashboard.py\n--- a/streamlit_dashboard.py\n+++ b/streamlit_dashboard.py\n+with st.sidebar:\n+    st.subheader('📊 Live Performance')\n+with tab4:\n+    st.markdown('<div class=\"terminal-container\">{content}</div>', unsafe_allow_html=True)";
const tLogs = "[PM2] online\nTCP 0.0.0.0:8501 LISTENING\nDashboard functional.";

callGemini(uReq, wDone, gDiff, tLogs);

 function tab(){
 window.open('index.html','_blank');
  }
function ref(){
  window.open('https://chatgpt.com', '_blank');
}

//--------------NEW THINGS------------------------------------------------------------
 // Initialize CodeMirror editor
const codeEditor = CodeMirror.fromTextArea(
    document.getElementById("code"),
    {
        mode: "text/x-csrc",
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        lineWrapping: false,

        // Run code using Ctrl + Enter or Cmd + Enter
        extraKeys: {
            "Ctrl-Enter": function () {
                runCode();
            },
            "Cmd-Enter": function () {
                runCode();
            }
        }
    }
);

const languageSelect = document.getElementById("language");

function updateEditorMode() {
    const modes = {
        "50": "text/x-csrc",       // C
        "54": "text/x-c++src",     // C++
        "62": "text/x-java",       // Java
        "71": "python",            // Python
        "51": "text/x-csharp"      // C#
    };

    codeEditor.setOption(
        "mode",
        modes[languageSelect.value] || "text/plain"
    );
}

languageSelect.addEventListener("change", updateEditorMode);
updateEditorMode();


const JUDGE0_URL =
    "https://ce.judge0.com/submissions/?base64_encoded=false&wait=true";

async function runCode() {
    const code = codeEditor.getValue();
    const languageId = Number(document.getElementById("language").value);
    const stdin = document.getElementById("stdin").value;

    const output = document.getElementById("output");
    const dot = document.getElementById("outputDot");
    const btn = document.getElementById("runBtn");
    const statusElement = document.getElementById("executionStatus");
    const timeElement = document.getElementById("executionTime");
    const memoryElement = document.getElementById("executionMemory");

    // 1. Validate input
    if (!code.trim()) {
        output.textContent = "Please enter some code first.";
        output.className = "error";
        dot.className = "output-dot error";
        return;
    }

    // 2. Show loading state
    output.textContent = "Compiling and running your code...";
    output.className = "";
    dot.className = "output-dot";
    btn.disabled = true;
    statusElement.textContent = "Running...";
   statusElement.className = "status-value running";
   timeElement.textContent = "—";
   memoryElement.textContent = "—";
    btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 13 13"
             style="animation: spin 1s linear infinite">
            <circle cx="6.5" cy="6.5" r="5"
                    stroke="currentColor" stroke-width="1.5"
                    fill="none" stroke-dasharray="20 12"/>
        </svg>
        Running...
    `;

    try {
        // 3. Send code to Judge0
        const response = await fetch(JUDGE0_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: stdin
            })
        });

        // 4. Check HTTP response
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || `Judge0 HTTP error: ${response.status}`
            );
        }

        // 5. Check the actual execution status
        const statusId = result.status?.id;
        const statusText = result.status?.description || "Unknown status";
        // Display Judge0 execution metrics when available
        statusElement.textContent = statusText;
        statusElement.className =
         statusId === 3 ? "status-value success" : "status-value error";

        timeElement.textContent =
          result.time != null ? `${result.time} s` : "—";

        memoryElement.textContent =
          result.memory != null ? `${result.memory} KB` : "—";
        let message = "";
        let isError = false;

        if (statusId === 3) {
            // Accepted: execution completed successfully
            message = result.stdout ?? "";

            if (message.length === 0) {
                message = "Program executed successfully with no output.";
            }
        } else if (statusId === 1 || statusId === 2) {
            message = `Execution is still pending: ${statusText}`;
            isError = true;
        } else {
            // Compilation error, runtime error, timeout, etc.
            message =
                result.compile_output ||
                result.stderr ||
                result.message ||
                `Execution failed: ${statusText}`;

            isError = true;
        }

        // 6. Display the result
        output.textContent = message;
        output.className = isError ? "error" : "success";

        dot.className = isError
            ? "output-dot error"
            : "output-dot success";

    } catch (error) {
        // 7. Handle network and API errors
        output.textContent = `Error: ${error.message}`;
        output.className = "error";
        dot.className = "output-dot error";
        statusElement.textContent = "Request Failed";
        statusElement.className = "status-value error";
        timeElement.textContent = "—";
        memoryElement.textContent = "—";

    } finally {
        // 8. Always restore the Run button
        btn.disabled = false;

        btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 13 13">
                <path d="M3 2l8 4.5L3 11V2z"
                      fill="currentColor"/>
            </svg>
            Run Code
        `;
    }
}

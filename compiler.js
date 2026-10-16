 function tab(){
 window.open('index.html','_blank');
  }
function ref() {
    const container = document.querySelector(".split-container");
    const button = document.getElementById("toggleBtn");

    container.classList.toggle("reference-open");

    const isOpen = container.classList.contains("reference-open");

    button.setAttribute("aria-expanded", String(isOpen));

    if (!isOpen) {
        document.querySelector(".compiler-pane").style.flexBasis = "";
    }
}
// ===== Resizable compiler/reference divider =====
const splitContainer = document.querySelector(".split-container");
const divider = document.getElementById("divider");
const compilerPane = document.querySelector(".compiler-pane");

let isDragging = false;

divider.addEventListener("pointerdown", function (event) {
    if (!splitContainer.classList.contains("reference-open")) return;

    isDragging = true;
    divider.classList.add("dragging");
    divider.setPointerCapture(event.pointerId);

    event.preventDefault();
});

divider.addEventListener("pointermove", function (event) {
    if (!isDragging) return;

    const rect = splitContainer.getBoundingClientRect();
    const dividerWidth = divider.getBoundingClientRect().width;

    // Keep both panels usable
    const minWidth = Math.min(280, rect.width * 0.25);
    const availableWidth = rect.width - dividerWidth;

    const desiredWidth = event.clientX - rect.left;
    const clampedWidth = Math.max(
        minWidth,
        Math.min(desiredWidth, availableWidth - minWidth)
    );

    compilerPane.style.flex = "0 0 auto";
    compilerPane.style.width =
        `${(clampedWidth / rect.width) * 100}%`;
});

function stopDragging() {
    isDragging = false;
    divider.classList.remove("dragging");
}

divider.addEventListener("pointerup", stopDragging);
divider.addEventListener("pointercancel", stopDragging);

// Keyboard accessibility: arrow keys resize the panes
divider.addEventListener("keydown", function (event) {
    if (!splitContainer.classList.contains("reference-open")) return;

    const rect = splitContainer.getBoundingClientRect();
    const currentWidth = compilerPane.getBoundingClientRect().width;
    const step = 20;

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        compilerPane.style.flex = "0 0 auto";
        compilerPane.style.width =
            `${Math.max(280, currentWidth - step)}px`;
    } else if (event.key === "ArrowRight") {
        event.preventDefault();
        compilerPane.style.flex = "0 0 auto";
        compilerPane.style.width =
            `${Math.min(rect.width - 300, currentWidth + step)}px`;
    }
});

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

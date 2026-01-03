/*
  PhishGuard frontend logic
  - Calls the Flask backend API
  - Renders results with color-coded risk level
*/

// Use environment-based URL: localhost for dev, Render URL for production
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://127.0.0.1:5000"
    : "https://phishguard-api.onrender.com";  // UPDATE THIS with your actual Render URL

const els = {
    emailInput: document.getElementById("emailInput"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    clearBtn: document.getElementById("clearBtn"),
    statusText: document.getElementById("statusText"),
    result: document.getElementById("result"),
    riskLevel: document.getElementById("riskLevel"),
    scoreValue: document.getElementById("scoreValue"),
    threatList: document.getElementById("threatList"),
};

function setStatus(message) {
    els.statusText.textContent = message || "";
}

function setLoading(isLoading) {
    els.analyzeBtn.disabled = isLoading;
    if (isLoading) setStatus("Analyzing…");
    else setStatus("");
}

function normalizeRisk(risk) {
    // Backend returns one of: SAFE, SUSPICIOUS, HIGH_RISK
    // Also support human-readable strings if user extends backend.
    const upper = String(risk || "").toUpperCase().replace(/\s+/g, "_");
    if (["SAFE", "SUSPICIOUS", "HIGH_RISK"].includes(upper)) return upper;
    return "SUSPICIOUS";
}

function riskLabel(risk) {
    switch (risk) {
        case "SAFE":
            return "Safe";
        case "SUSPICIOUS":
            return "Suspicious";
        case "HIGH_RISK":
            return "High Risk";
        default:
            return "Suspicious";
    }
}

function renderResult(payload) {
    const risk = normalizeRisk(payload?.risk_level);
    const score = payload?.score;
    const reasons = Array.isArray(payload?.reasons) ? payload.reasons : [];

    els.result.dataset.risk = risk;
    els.result.classList.remove("result--empty");

    els.riskLevel.textContent = riskLabel(risk);
    els.scoreValue.textContent = typeof score === "number" ? String(score) : "—";

    // Reset list
    els.threatList.innerHTML = "";

    if (reasons.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No obvious phishing signals detected.";
        els.threatList.appendChild(li);
        return;
    }

    for (const r of reasons) {
        const li = document.createElement("li");
        li.textContent = r;
        els.threatList.appendChild(li);
    }
}

function renderError(message) {
    els.result.dataset.risk = "SUSPICIOUS";
    els.result.classList.remove("result--empty");
    els.riskLevel.textContent = "Error";
    els.scoreValue.textContent = "—";
    els.threatList.innerHTML = "";

    const li = document.createElement("li");
    li.textContent = message;
    els.threatList.appendChild(li);
}

async function analyzeEmail() {
    const emailText = (els.emailInput.value || "").trim();
    if (!emailText) {
        renderError("Paste an email first.");
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE_URL}/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: emailText }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const msg = data?.error || `Request failed (${res.status})`;
            renderError(msg);
            return;
        }

        renderResult(data);
    } catch (err) {
        renderError(
            "Could not reach the backend. Start it first, then refresh this page."
        );
    } finally {
        setLoading(false);
    }
}

function clearAll() {
    els.emailInput.value = "";
    els.result.dataset.risk = "";
    els.result.classList.add("result--empty");
    els.riskLevel.textContent = "—";
    els.scoreValue.textContent = "—";
    els.threatList.innerHTML = "";
    setStatus("");
    els.emailInput.focus();
}

els.analyzeBtn.addEventListener("click", analyzeEmail);
els.clearBtn.addEventListener("click", clearAll);

// Convenience: Ctrl/Cmd + Enter triggers analysis
els.emailInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        analyzeEmail();
    }
});

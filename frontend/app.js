/*
  PhishGuard frontend logic
  - Calls the Node.js/Express backend API with AI detection
  - Renders results with color-coded risk level
  - Shows AI analysis confidence when available
*/

// Use environment-based URL: localhost for dev, Render URL for production
const API_BASE_URL = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '' ||
    window.location.protocol === 'file:'
    ? "http://127.0.0.1:5000"
    : "https://phishguard-3i7x.onrender.com";

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

function detectObviousScamSignals(text) {
    const normalized = String(text || "").toLowerCase();

    const patterns = [
        /(old\s+account\s+phrase|old\s+wallet\s+phrase|seed\s*phrase|recovery\s*phrase|private\s*key)/i,
        /(rug\s*pull|rug\s*coins?|pump\s*and\s*dump|wash\s*trading)/i,
        /(spray(ing)?|shill(ing)?|ape(d)?).{0,80}(token|coin|buyers?|buy)/i,
        /(transaction\s*history).{0,80}(buyers?|buy|profit|x10|10x|sol)/i,
    ];

    const matched = patterns.filter((pattern) => pattern.test(normalized));

    if (matched.length === 0) {
        return null;
    }

    return {
        risk_level: 'HIGH_RISK',
        risk_score: 85,
        flags: [
            'High-risk scam language detected (wallet phrase/private key request)',
            'Potential market manipulation intent detected (rug-pull/pump behavior)',
        ],
    };
}

function applySafetyNet(payload, sourceText) {
    const backendRisk = normalizeRisk(payload?.risk_level);
    const backendReasons = Array.isArray(payload?.flags) ? payload.flags :
        Array.isArray(payload?.reasons) ? payload.reasons : [];

    if (backendRisk !== 'SAFE' || backendReasons.length > 0) {
        return payload;
    }

    const fallback = detectObviousScamSignals(sourceText);
    if (!fallback) {
        return payload;
    }

    return {
        ...payload,
        ...fallback,
    };
}

function renderResult(payload, sourceText = "") {
    const normalizedPayload = applySafetyNet(payload, sourceText);
    const risk = normalizeRisk(normalizedPayload?.risk_level);
    const score = normalizedPayload?.risk_score ?? normalizedPayload?.score;  // Support both formats and preserve 0
    const reasons = Array.isArray(normalizedPayload?.flags) ? normalizedPayload.flags :
        Array.isArray(normalizedPayload?.reasons) ? normalizedPayload.reasons : [];
    const aiAnalysis = normalizedPayload?.ai_analysis;

    els.result.dataset.risk = risk;
    els.result.classList.remove("result--empty");

    els.riskLevel.textContent = riskLabel(risk);
    els.scoreValue.textContent = typeof score === "number" ? String(score) : "—";

    // Reset list
    els.threatList.innerHTML = "";

    // Show AI analysis info if available
    if (aiAnalysis?.enabled && aiAnalysis?.confidence) {
        const aiLi = document.createElement("li");
        aiLi.style.fontWeight = "600";
        aiLi.style.color = "#22c55e";
        const confidence = Math.round(aiAnalysis.confidence * 100);
        aiLi.textContent = `🤖 AI Detection Active (${confidence}% confidence)`;
        els.threatList.appendChild(aiLi);
    }

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

        renderResult(data, emailText);
        els.emailInput.value = "";
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

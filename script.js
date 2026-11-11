// language: JavaScript, file: script.js

(() => {
  "use strict";

  /* ── SETUP ─────────────────────────────────────────────────────── */

  /* Where inquiries land. */
  const EMAIL_ADDRESS = "collab@bmwm4.studio";

  /* Optional. Paste your Formspree endpoint for POST delivery.
     Leave "YOUR_FORM_ID" for zero-setup mailto delivery. */
  const FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

  /* ──────────────────────────────────────────────────────────────── */

  const MAX_MESSAGE = 500;
  const MIN_MESSAGE = 10;

  const form          = document.getElementById("collabForm");
  const message       = document.getElementById("message");
  const counter       = document.getElementById("counter");
  const submitBtn     = document.getElementById("submitBtn");
  const resetBtn      = document.getElementById("resetBtn");
  const copyBtn       = document.getElementById("copyEmail");
  const emailText     = document.getElementById("emailText");
  const toasts        = document.getElementById("toasts");
  const contactMethod = document.getElementById("contactMethod");
  const contactHandle = document.getElementById("contactHandle");
  const handleField   = document.getElementById("handleField");

  const FIELD_IDS = [
    "name", "email", "channel", "social",
    "contactMethod", "contactHandle", "type", "message"
  ];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const URL_RE   = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

  const field = (id) => document.getElementById(id);
  const hasFormspree = () =>
    FORM_ENDPOINT && !FORM_ENDPOINT.includes("YOUR_FORM_ID");

  if (emailText) emailText.textContent = EMAIL_ADDRESS;

  /* ── contact method → handle field behaviour ── */

  const HANDLE_PLACEHOLDERS = {
    WhatsApp:  "+92 300 1234567",
    Telegram:  "@yourhandle",
    Instagram: "@yourhandle",
    Discord:   "username or username#0000",
    Other:     "How to reach you",
  };

  function syncHandleField() {
    const method = contactMethod.value;

    if (!method || method === "Email") {
      handleField.hidden = true;
      contactHandle.value = "";
      setError("contactHandle", "");
      contactHandle.removeAttribute("required");
      return;
    }

    handleField.hidden = false;
    contactHandle.placeholder = HANDLE_PLACEHOLDERS[method] || "Your handle";
    contactHandle.setAttribute("required", "");
  }

  /* ── validation ── */

  function normalizeUrl(value) {
    const v = value.trim();
    if (!v) return "";
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }

  function fieldError(id) {
    switch (id) {
      case "name":
        return field("name").value.trim().length >= 2 ? "" : "Enter your full name.";
      case "email":
        return EMAIL_RE.test(field("email").value.trim()) ? "" : "Enter a valid email address.";
      case "channel":
        return URL_RE.test(normalizeUrl(field("channel").value)) ? "" : "Enter a valid channel URL.";
      case "social": {
        const v = field("social").value.trim();
        return !v || URL_RE.test(normalizeUrl(v)) ? "" : "Enter a valid URL or leave blank.";
      }
      case "contactMethod":
        return contactMethod.value ? "" : "Select how we can reach you.";
      case "contactHandle": {
        if (handleField.hidden) return "";
        const v = contactHandle.value.trim();
        if (!v) return `Add your ${contactMethod.value} handle so we can reply.`;
        if (v.length < 2) return "Handle looks too short.";
        return "";
      }
      case "type":
        return field("type").value ? "" : "Select a collaboration type.";
      case "message": {
        const len = field("message").value.trim().length;
        if (len === 0) return "Add your collaboration details.";
        if (len < MIN_MESSAGE) return `Add at least ${MIN_MESSAGE} characters.`;
        return "";
      }
      default:
        return "";
    }
  }

  function setError(id, text) {
    const input = field(id);
    if (!input) return;
    const wrap = input.closest(".field");
    const slot = wrap.querySelector(".error");

    if (text) {
      wrap.classList.add("invalid");
      slot.textContent = text;
      slot.classList.add("show");
      input.setAttribute("aria-invalid", "true");
    } else {
      wrap.classList.remove("invalid");
      slot.textContent = "";
      slot.classList.remove("show");
      input.removeAttribute("aria-invalid");
    }
  }

  function validateAll() {
    let valid = true;
    let firstInvalid = null;

    for (const id of FIELD_IDS) {
      const err = fieldError(id);
      setError(id, err);
      if (err && valid) {
        valid = false;
        firstInvalid = field(id);
      }
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return valid;
  }

  /* ── ui helpers ── */

  function updateCounter() {
    const len = message.value.length;
    counter.textContent = `${len} / ${MAX_MESSAGE}`;
    counter.classList.toggle("warn", len >= MAX_MESSAGE * 0.9);
  }

  function showToast(text, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.setAttribute("role", "status");
    el.innerHTML =
      type === "success"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>';

    const span = document.createElement("span");
    span.textContent = text;
    el.appendChild(span);

    toasts.appendChild(el);

    setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 4200);
  }

  function clearErrors() {
    document.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
    document.querySelectorAll(".error").forEach((e) => {
      e.textContent = "";
      e.classList.remove("show");
    });
    FIELD_IDS.forEach((id) => {
      const el = field(id);
      if (el) el.removeAttribute("aria-invalid");
    });
  }

  function resetForm(announce = true) {
    form.reset();
    clearErrors();
    syncHandleField();
    updateCounter();
    if (announce) showToast("Form cleared.", "success");
  }

  /* ── mailto fallback ── */

  function openMailto(payload) {
    const subject = `Collaboration Inquiry -- ${payload.get("name") || "New inquiry"}`;

    const lines = [
      `Name:    ${payload.get("name") || ""}`,
      `Email:   ${payload.get("email") || ""}`,
      `Channel: ${payload.get("channel") || ""}`,
    ];
    if (payload.get("social")) lines.push(`Social:  ${payload.get("social")}`);

    const method = payload.get("contactMethod") || "";
    if (method && method !== "Email") {
      lines.push(`Prefers: ${method} -- ${payload.get("contactHandle") || ""}`);
    } else if (method) {
      lines.push(`Prefers: Email`);
    }

    lines.push(`Type:    ${payload.get("type") || ""}`);
    lines.push("");
    lines.push(payload.get("message") || "");

    const href =
      `mailto:${EMAIL_ADDRESS}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(lines.join("\n"))}`;

    window.location.href = href;
  }

  /* ── submit ── */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateAll()) {
      showToast("Fix the highlighted fields before sending.", "error");
      return;
    }

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    resetBtn.disabled = true;

    const payload = new FormData(form);
    payload.set("channel", normalizeUrl(field("channel").value));

    const socialValue = field("social").value.trim();
    if (socialValue) payload.set("social", normalizeUrl(socialValue));
    else payload.delete("social");

    if (contactMethod.value === "Email") {
      payload.delete("contactHandle");
    }

    if (!hasFormspree()) {
      openMailto(payload);
      showToast("Opening your email app with the inquiry ready to send.", "success");
      resetForm(false);
      finish();
      return;
    }

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: payload,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        showToast("Inquiry sent. You will hear back soon.", "success");
        resetForm(false);
      } else {
        openMailto(payload);
        showToast("Server busy -- opening your email app as backup.", "error");
        resetForm(false);
      }
    } catch {
      openMailto(payload);
      showToast("Network unavailable -- opening your email app as backup.", "error");
      resetForm(false);
    }

    finish();
  }

  function finish() {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
    resetBtn.disabled = false;
  }

  /* ── copy email ── */

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL_ADDRESS;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast("Email copied.", "success");
  }

  /* ── live revalidation ── */

  function bindLiveValidation() {
    FIELD_IDS.forEach((id) => {
      const input = field(id);
      if (!input) return;
      const wrap = input.closest(".field");

      const check = () => {
        if (wrap.classList.contains("invalid")) setError(id, fieldError(id));
      };

      input.addEventListener("blur", check);
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", check);
    });
  }

  form.addEventListener("submit", handleSubmit);
  resetBtn.addEventListener("click", () => resetForm(true));
  copyBtn.addEventListener("click", copyEmail);
  message.addEventListener("input", updateCounter);
  contactMethod.addEventListener("change", syncHandleField);

  syncHandleField();
  updateCounter();
  bindLiveValidation();
})();
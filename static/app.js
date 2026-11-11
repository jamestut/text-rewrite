const byId = (id) => document.getElementById(id);
// Raw HTML stays disabled, and markdown-it rejects dangerous link schemes by default.
const markdown = window.markdownit({ html: false, linkify: false, breaks: false });
const state = { subject: "", message: "" };
let signedIn = false;

function showLogin() {
  byId("login-section").hidden = false;
  byId("app-section").hidden = true;
  byId("logout").hidden = true;
}

function showError(id, message) {
  const element = byId(id);
  element.textContent = message;
  element.hidden = !message;
}

async function api(path, payload) {
  const options = payload === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  };
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "/api/login") {
      showLogin();
      if (signedIn) showError("login-error", "Your session has expired. Please sign in again.");
      signedIn = false;
    }
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function fillOptions(select, items) {
  for (const item of items) select.add(new Option(item.name, item.key));
}

async function showApp() {
  const data = await api("/api/session");
  const model = byId("model");
  const style = byId("style");
  model.replaceChildren();
  style.replaceChildren(new Option("No extra style", ""));
  fillOptions(model, data.models);
  fillOptions(style, data.styles);
  model.value = data.default_model;
  byId("login-section").hidden = true;
  byId("app-section").hidden = false;
  byId("logout").hidden = false;
  signedIn = true;
}

byId("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("login-button");
  button.disabled = true;
  showError("login-error", "");
  try {
    await api("/api/login", { username: byId("username").value, password: byId("password").value });
    byId("password").value = "";
    await showApp();
  } catch (error) {
    showError("login-error", error.message || "Could not sign in.");
  } finally {
    button.disabled = false;
  }
});

byId("logout").addEventListener("click", async () => {
  try {
    await api("/api/logout", {});
    // Do not leave the previous user's draft or generated content in the page.
    byId("message").value = "";
    byId("results").hidden = true;
    byId("preview-panel").replaceChildren();
    byId("subject-result").replaceChildren();
    byId("message-result").replaceChildren();
    state.subject = "";
    state.message = "";
    signedIn = false;
    showError("login-error", "");
    showLogin();
  } catch (error) {
    showError("rewrite-error", error.message);
  }
});

function setTab(preview) {
  byId("edit-tab").setAttribute("aria-selected", String(!preview));
  byId("preview-tab").setAttribute("aria-selected", String(preview));
  byId("edit-tab").tabIndex = preview ? -1 : 0;
  byId("preview-tab").tabIndex = preview ? 0 : -1;
  byId("edit-panel").hidden = preview;
  byId("preview-panel").hidden = !preview;
  if (preview) byId("preview-panel").innerHTML = markdown.render(byId("message").value);
}

byId("edit-tab").addEventListener("click", () => setTab(false));
byId("preview-tab").addEventListener("click", () => setTab(true));
for (const id of ["edit-tab", "preview-tab"]) {
  byId(id).addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const preview = id === "edit-tab";
      setTab(preview);
      byId(preview ? "preview-tab" : "edit-tab").focus();
    }
  });
}

byId("rewrite-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!byId("message").value.trim()) {
    setTab(false);
    byId("message").focus();
    showError("rewrite-error", "Enter a message to rewrite.");
    return;
  }
  byId("execute").disabled = true;
  byId("working").hidden = false;
  byId("results").hidden = true;
  showError("rewrite-error", "");
  try {
    const result = await api("/api/rewrite", { model: byId("model").value, style: byId("style").value, message: byId("message").value });
    state.subject = result.subject;
    state.message = result.message;
    byId("subject-result").innerHTML = markdown.render(state.subject);
    byId("message-result").innerHTML = markdown.render(state.message);
    byId("copy-status").textContent = "";
    byId("results").hidden = false;
  } catch (error) {
    showError("rewrite-error", error.message || "Could not rewrite the message.");
  } finally {
    byId("execute").disabled = false;
    byId("working").hidden = true;
  }
});

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state[button.dataset.copy]);
      byId("copy-status").textContent = `${button.dataset.copy === "subject" ? "Subject" : "Message"} Markdown copied.`;
    } catch {
      byId("copy-status").textContent = "Could not copy. Check your browser's clipboard permissions.";
    }
  });
}

// A missing or expired session shows the login form without losing a draft already in the page.
showApp().catch(() => showLogin());

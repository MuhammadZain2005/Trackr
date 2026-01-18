import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp, deleteDoc,
  collection, getDocs, addDoc, query, orderBy
} from "firebase/firestore";
import { initOfflineAIChatbot } from "./ai-chatbot-offline.js";

// ============ STATE ============
let CURRENT_UID = null;
let CURRENT_APPS = [];
let CURRENT_TRACKS = [];
let CURRENT_TRACK = null;

// ============ DOM ELEMENTS ============
const elAuthBadge = document.getElementById("authBadge");
const elResumeStats = document.getElementById("resumeStats");
const elBreadcrumb = document.getElementById("breadcrumb");
const elCurrentTrackTitle = document.getElementById("currentTrackTitle");
const elBuildStatusPill = document.getElementById("buildStatusPill");
const elPreviewContent = document.getElementById("previewContent");
const elErrorPanel = document.getElementById("errorPanel");
const elErrorMessage = document.getElementById("errorMessage");
const elErrorLog = document.getElementById("errorLog");
const elLastBuiltTime = document.getElementById("lastBuiltTime");
const elHistoryCount = document.getElementById("historyCount");
const elHistoryEmpty = document.getElementById("historyEmpty");
const elHistoryList = document.getElementById("historyList");
const elTrackSelector = document.getElementById("trackSelector");

// Buttons
const btnSaveDraft = document.getElementById("btnSaveDraft");
const btnBuildPdf = document.getElementById("btnBuildPdf");
const btnCopyLatex = document.getElementById("btnCopyLatex");
const btnDownloadPdf = document.getElementById("btnDownloadPdf");
const btnCreateSnapshot = document.getElementById("btnCreateSnapshot");
const btnNewVariant = document.getElementById("btnNewVariant");

// Modals
const snapshotModal = document.getElementById("snapshotModal");
const variantModal = document.getElementById("variantModal");
const snapshotForm = document.getElementById("snapshotForm");
const variantForm = document.getElementById("variantForm");
const snapshotLabel = document.getElementById("snapshotLabel");
const snapshotAppLink = document.getElementById("snapshotAppLink");
const variantType = document.getElementById("variantType");
const variantTitle = document.getElementById("variantTitle");
const variantAppLabel = document.getElementById("variantAppLabel");
const variantAppLink = document.getElementById("variantAppLink");
const variantBase = document.getElementById("variantBase");

// ============ LOCAL STORAGE (No Firebase needed) ============
const LOCAL_STORAGE_KEY = "trackr-resumes";

function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : { master: { title: "Master Resume", mode: "Master", content: "" } };
  } catch (err) {
    console.error("Failed to load from localStorage:", err);
    return { master: { title: "Master Resume", mode: "Master", content: "" } };
  }
}

function saveToLocalStorage(tracks) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tracks));
    console.log("[LocalStorage] Saved successfully");
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

// ============ EDITOR SETUP (Simple Textarea) ============
let editor = null;

function initEditor(initialContent = "") {
  const editorContainer = document.getElementById("editorContainer");
  if (!editorContainer) {
    console.error("[Resumes] Editor container not found");
    return;
  }

  editorContainer.innerHTML = "";

  // Create a simple textarea
  editor = document.createElement("textarea");
  editor.className = "latex-editor";
  editor.value = initialContent;
  editor.placeholder = "% Type your LaTeX resume here...\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}";
  
  // Add some basic styles
  editor.style.width = "100%";
  editor.style.height = "100%";
  editor.style.padding = "12px";
  editor.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  editor.style.fontSize = "13px";
  editor.style.lineHeight = "1.5";
  editor.style.border = "none";
  editor.style.resize = "none";
  editor.style.boxSizing = "border-box";
  editor.style.backgroundColor = "#ffffff";

  editorContainer.appendChild(editor);
  editor.focus();

  console.log("[Resumes] Editor initialized");
}

function getEditorContent() {
  return editor?.value || "";
}

function setEditorContent(content) {
  if (editor) {
    editor.value = content || "";
  }
}

// ============ STATUS HELPERS ============
function setBuildStatus(status, text) {
  const dot = elBuildStatusPill.querySelector(".build-dot");
  const textEl = elBuildStatusPill.querySelector(".build-text");

  elBuildStatusPill.className = `build-pill build-pill-${status}`;
  if (textEl) textEl.textContent = text;
}

function showError(message, log = "") {
  elPreviewContent.style.display = "none";
  elErrorPanel.style.display = "";
  elErrorMessage.textContent = message;
  elErrorLog.textContent = log || "No build log available.";
}

function hideError() {
  elErrorPanel.style.display = "none";
  elPreviewContent.style.display = "";
}

// ============ LOCAL IMPLEMENTATIONS (No Firebase) ============
async function localFsLoadTracks() {
  const data = loadFromLocalStorage();
  const tracks = [];
  for (const [id, track] of Object.entries(data)) {
    tracks.push({
      id,
      title: track.title || (id === "master" ? "Master Resume" : id),
      mode: track.mode || (id === "master" ? "Master" : "Role"),
      baseId: track.baseId || "",
      applicationId: track.applicationId || "",
      content: track.content || "",
      buildStatus: track.buildStatus || "idle",
      latestBuiltIterationId: track.latestBuiltIterationId || "",
      updatedAt: new Date(),
    });
  }
  return tracks;
}

async function localFsLoadTrack(trackId) {
  const data = loadFromLocalStorage();
  const track = data[trackId];
  if (!track) return null;
  return {
    id: trackId,
    title: track.title || (trackId === "master" ? "Master Resume" : trackId),
    mode: track.mode || (trackId === "master" ? "Master" : "Role"),
    baseId: track.baseId || "",
    applicationId: track.applicationId || "",
    content: track.content || "",
    buildStatus: track.buildStatus || "idle",
    latestBuiltIterationId: track.latestBuiltIterationId || "",
    updatedAt: new Date(),
  };
}

async function localFsSaveTrack(trackId, content, additionalFields = {}) {
  const data = loadFromLocalStorage();
  if (!data[trackId]) {
    data[trackId] = {};
  }
  data[trackId] = {
    ...data[trackId],
    content,
    ...additionalFields,
  };
  saveToLocalStorage(data);
}

async function localFsCreateTrack(trackId, trackData) {
  const data = loadFromLocalStorage();
  data[trackId] = {
    title: trackData.title,
    mode: trackData.mode,
    baseId: trackData.baseId || "",
    applicationId: trackData.applicationId || "",
    content: trackData.content || "",
    buildStatus: "idle",
    latestBuiltIterationId: "",
    createdAt: new Date(),
  };
  saveToLocalStorage(data);
}

// ============ UI RENDERING ============

function appLabel(app) {
  if (!app) return "Unknown";
  const c = app.company || "Unknown";
  const p = app.position || "";
  return p ? `${c} — ${p}` : c;
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function updateResumeStats() {
  const variantCount = CURRENT_TRACKS.filter(t => t.id !== "master").length;
  if (elResumeStats) {
    elResumeStats.textContent = `Master + ${variantCount} variant${variantCount !== 1 ? "s" : ""}`;
  }
}

function renderTrackSelector() {
  if (!elTrackSelector) return;

  elTrackSelector.innerHTML = "";

  const masterTracks = CURRENT_TRACKS.filter(t => t.mode === "Master" || t.id === "master");
  const roleTracks = CURRENT_TRACKS.filter(t => t.mode === "Role");
  const companyTracks = CURRENT_TRACKS.filter(t => t.mode === "Company");

  masterTracks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    if (CURRENT_TRACK?.id === t.id) opt.selected = true;
    elTrackSelector.appendChild(opt);
  });

  if (roleTracks.length > 0) {
    const group = document.createElement("optgroup");
    group.label = "Role Variants";
    roleTracks.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.title;
      if (CURRENT_TRACK?.id === t.id) opt.selected = true;
      group.appendChild(opt);
    });
    elTrackSelector.appendChild(group);
  }

  if (companyTracks.length > 0) {
    const group = document.createElement("optgroup");
    group.label = "Company-Specific";
    companyTracks.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.title;
      if (CURRENT_TRACK?.id === t.id) opt.selected = true;
      group.appendChild(opt);
    });
    elTrackSelector.appendChild(group);
  }
}

function renderHistory(iterations) {
  if (!iterations || iterations.length === 0) {
    elHistoryEmpty.style.display = "";
    elHistoryList.style.display = "none";
    elHistoryCount.textContent = "0 snapshots";
    return;
  }

  elHistoryEmpty.style.display = "none";
  elHistoryList.style.display = "";
  elHistoryCount.textContent = `${iterations.length} snapshot${iterations.length !== 1 ? "s" : ""}`;
  elHistoryList.innerHTML = "";

  iterations.forEach(iter => {
    const row = document.createElement("div");
    row.className = "history-row";

    const linkedApp = iter.applicationId ? CURRENT_APPS.find(a => a.id === iter.applicationId) : null;

    row.innerHTML = `
      <div class="history-row-main">
        <div class="history-row-label">${iter.label || "Snapshot"}</div>
        <div class="history-row-meta">
          <span class="history-time">${formatTime(iter.createdAt)}</span>
          ${linkedApp ? `<span class="history-app">· ${appLabel(linkedApp)}</span>` : ""}
        </div>
      </div>
      <div class="history-row-status">
        <span class="pill ${iter.status === "built" ? "ok" : ""}">${iter.status || "draft"}</span>
      </div>
      <div class="history-row-actions">
        <button class="btn-small ghost" data-action="restore" data-id="${iter.id}" title="Restore">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1,4 1,10 7,10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Restore
        </button>
        <button class="btn-small ghost danger" data-action="delete" data-id="${iter.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;

    row.querySelector('[data-action="restore"]').onclick = () => restoreIteration(iter);
    row.querySelector('[data-action="delete"]').onclick = () => deleteIteration(iter.id);

    elHistoryList.appendChild(row);
  });
}

function populateAppDropdowns() {
  const options = '<option value="">None</option>' +
    CURRENT_APPS.map(app => `<option value="${app.id}">${appLabel(app)}</option>`).join("");

  snapshotAppLink.innerHTML = options;
  variantAppLink.innerHTML = options.replace("None", "Select application…");
}

function populateVariantBaseDropdown() {
  let options = '<option value="master">Master Resume</option>';
  CURRENT_TRACKS.filter(t => t.mode === "Role").forEach(t => {
    options += `<option value="${t.id}">${t.title}</option>`;
  });
  variantBase.innerHTML = options;
}

// ============ ACTIONS ============

async function selectTrack(trackId) {
  if (!CURRENT_UID) return;

  try {
    const track = await localFsLoadTrack(trackId);
    if (!track) {
      console.error("Track not found:", trackId);
      return;
    }

    CURRENT_TRACK = track;

    if (elCurrentTrackTitle) elCurrentTrackTitle.textContent = track.title;
    if (elBreadcrumb) {
      elBreadcrumb.textContent = track.mode === "Master" ? "Master" :
        track.mode === "Role" ? `Master → ${track.title}` :
        `Master → Role → ${track.title}`;
    }

    setEditorContent(track.content);
    hideError();
    setBuildStatus("idle", "Ready");
    elLastBuiltTime.textContent = "Not built yet";

    if (elTrackSelector) elTrackSelector.value = trackId;

    renderHistory([]);

  } catch (err) {
    console.error("Failed to select track:", err);
  }
}

async function handleSaveDraft() {
  if (!CURRENT_UID || !CURRENT_TRACK) {
    alert("Not signed in or no track selected.");
    return;
  }

  try {
    setBuildStatus("building", "Saving…");
    const content = getEditorContent();
    await localFsSaveTrack(CURRENT_TRACK.id, content);
    CURRENT_TRACK.content = content;
    setBuildStatus("idle", "Saved");
    setTimeout(() => setBuildStatus("idle", "Ready"), 1500);
  } catch (err) {
    console.error("Save failed:", err);
    setBuildStatus("failed", "Save failed");
  }
}

async function handleBuildPdf() {
  if (!CURRENT_UID || !CURRENT_TRACK) {
    alert("Not signed in or no track selected.");
    return;
  }

  const content = getEditorContent();
  if (!content.trim()) {
    alert("Editor is empty. Add LaTeX content first.");
    return;
  }

  try {
    setBuildStatus("building", "Compiling LaTeX…");
    hideError();

    // Send to backend for compilation
    const response = await fetch('/api/compile-latex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latexCode: content
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Compilation failed');
    }

    // Get PDF blob
    const pdfBlob = await response.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Store for download
    window.currentPdfUrl = pdfUrl;
    window.currentPdfBlob = pdfBlob;

    // Show PDF in iframe
    elPreviewContent.innerHTML = `
      <iframe 
        src="${pdfUrl}" 
        style="width: 100%; height: 100%; border: none; border-radius: 8px;"
        title="PDF Preview">
      </iframe>
    `;

    btnDownloadPdf.disabled = false;
    setBuildStatus("built", "Built");
    elLastBuiltTime.textContent = `Built ${new Date().toLocaleTimeString()}`;

    // Save to storage
    await localFsSaveTrack(CURRENT_TRACK.id, content, {
      buildStatus: "built",
      buildUpdatedAt: new Date(),
    });

  } catch (err) {
    console.error("Build failed:", err);
    setBuildStatus("failed", "Failed");
    
    // Show error with fallback
    showFormattedLatex(content);
    showError(
      err.message || "LaTeX compilation failed",
      "Make sure pdflatex is installed on the server. You can also compile on Overleaf.com"
    );
  }
}

function showFormattedLatex(content) {
  const fallbackHtml = `
    <div style="padding: 20px; overflow-y: auto; height: 100%;">
      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #856404; font-size: 13px;">
        <strong>📄 LaTeX Source Preview</strong><br>
        Full PDF rendering requires internet connection. Your LaTeX code is ready to compile on <a href="https://overleaf.com" target="_blank" style="color: #0066cc; text-decoration: underline;">Overleaf.com</a> or locally with pdflatex.
      </div>
      <pre style="margin: 0; padding: 16px; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 12px; line-height: 1.6; color: #1f2937; white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; border-radius: 8px; overflow-x: auto; max-height: calc(100% - 100px);">${escapeHtml(content)}</pre>
    </div>
  `;
  elPreviewContent.innerHTML = fallbackHtml;
  btnDownloadPdf.disabled = false;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function handleDownloadPdf() {
  const content = getEditorContent();
  if (!content.trim()) return;

  try {
    // If we have a compiled PDF, download it
    if (window.currentPdfBlob) {
      const url = URL.createObjectURL(window.currentPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${CURRENT_TRACK?.title || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Fallback: Download LaTeX source
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${CURRENT_TRACK?.title || 'resume'}.tex`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  } catch (err) {
    alert("Failed to download: " + err.message);
  }
}

async function handleCreateSnapshot() {
  alert("Snapshots not available in local mode. Data is saved automatically to browser storage.");
}

async function handleCreateVariant() {
  if (!CURRENT_UID) return;

  const title = variantTitle.value.trim();
  const mode = variantType.value;
  const baseId = variantBase.value;

  if (!title) {
    alert("Please enter a title for the variant.");
    return;
  }

  try {
    const baseTrack = await localFsLoadTrack(baseId);
    const content = baseTrack?.content || "";

    const trackId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await localFsCreateTrack(trackId, {
      title,
      mode,
      baseId,
      applicationId: "",
      content,
    });

    variantTitle.value = "";
    variantType.value = "Role";
    closeVariantModal();

    CURRENT_TRACKS = await localFsLoadTracks();
    renderTrackSelector();
    populateVariantBaseDropdown();
    updateResumeStats();

    await selectTrack(trackId);
  } catch (err) {
    console.error("Failed to create variant:", err);
    alert("Failed to create variant.");
  }
}

function restoreIteration(iter) {
  if (!iter.content) return;
  setEditorContent(iter.content);
  setBuildStatus("idle", "Restored");
  setTimeout(() => setBuildStatus("idle", "Ready"), 1500);
}

async function deleteIteration(iterId) {
  // Not implemented in local mode
}

// ============ MODAL HANDLERS ============

function openSnapshotModal() {
  alert("Snapshots not available in local mode.");
}

function closeSnapshotModal() {
  snapshotModal.style.display = "none";
}

function openVariantModal() {
  variantModal.style.display = "";
  variantTitle.focus();
}

function closeVariantModal() {
  variantModal.style.display = "none";
}

// ============ EVENT WIRING ============

function wireEvents() {
  console.log("[Resumes] Wiring events...");
  
  btnSaveDraft.onclick = handleSaveDraft;
  btnBuildPdf.onclick = () => {
    console.log("[Build] Build PDF clicked!");
    handleBuildPdf();
  };
  btnCopyLatex.onclick = () => {
    navigator.clipboard.writeText(getEditorContent());
    setBuildStatus("idle", "Copied!");
    setTimeout(() => setBuildStatus("idle", "Ready"), 1200);
  };
  btnDownloadPdf.onclick = handleDownloadPdf;

  elTrackSelector.onchange = (e) => {
    selectTrack(e.target.value);
  };

  btnNewVariant.onclick = openVariantModal;

  btnCreateSnapshot.onclick = openSnapshotModal;
  document.getElementById("closeSnapshotModal").onclick = closeSnapshotModal;
  document.getElementById("cancelSnapshot").onclick = closeSnapshotModal;
  snapshotForm.onsubmit = (e) => {
    e.preventDefault();
    handleCreateSnapshot();
  };

  document.getElementById("closeVariantModal").onclick = closeVariantModal;
  document.getElementById("cancelVariant").onclick = closeVariantModal;
  variantForm.onsubmit = (e) => {
    e.preventDefault();
    handleCreateVariant();
  };
  variantType.onchange = () => {
    variantAppLabel.style.display = variantType.value === "Company" ? "" : "none";
  };

  snapshotModal.onclick = (e) => {
    if (e.target === snapshotModal) closeSnapshotModal();
  };
  variantModal.onclick = (e) => {
    if (e.target === variantModal) closeVariantModal();
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSnapshotModal();
      closeVariantModal();
    }
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "s") {
        e.preventDefault();
        handleSaveDraft();
      }
      if (e.key === "b") {
        e.preventDefault();
        handleBuildPdf();
      }
    }
  });
}

// ============ INITIALIZATION ============

async function init() {
  console.log("[Resumes] Initializing workspace (LOCAL MODE - No Firebase)…");

  // Enable buttons immediately (no auth needed)
  btnSaveDraft.disabled = false;
  btnBuildPdf.disabled = false;
  btnCreateSnapshot.disabled = false;

  initEditor("% Start typing your LaTeX resume here...\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}");

  // Initialize Offline AI Chatbot (100% local - no internet needed!)
  setTimeout(() => {
    initOfflineAIChatbot(editor);
    console.log("[AI] Offline chatbot initialized");
  }, 100);

  wireEvents();

  // Use local storage instead of Firebase
  CURRENT_UID = "local-user";
  elAuthBadge.textContent = "Local Mode";
  elAuthBadge.classList.add("auth-synced");

  try {
    CURRENT_APPS = []; // No apps in local mode
    populateAppDropdowns();

    CURRENT_TRACKS = await localFsLoadTracks();

    if (!CURRENT_TRACKS.find(t => t.id === "master")) {
      await localFsCreateTrack("master", {
        title: "Master Resume",
        mode: "Master",
        content: "% Your master resume\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}",
      });
      CURRENT_TRACKS = await localFsLoadTracks();
    }

    renderTrackSelector();
    populateVariantBaseDropdown();
    updateResumeStats();

    await selectTrack("master");

  } catch (err) {
    console.error("Failed to initialize:", err);
    elAuthBadge.textContent = "Error";
  }
}

// Boot
init();
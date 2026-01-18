import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp, deleteDoc,
  collection, getDocs, addDoc, query, orderBy
} from "firebase/firestore";

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

// ============ FIRESTORE OPERATIONS ============

async function fsLoadTracks(uid) {
  const ref = collection(db, "users", uid, "resumes");
  const snap = await getDocs(ref);
  const tracks = [];
  snap.forEach(d => {
    const data = d.data();
    tracks.push({
      id: d.id,
      title: data.title || (d.id === "master" ? "Master Resume" : d.id),
      mode: data.mode || (d.id === "master" ? "Master" : "Role"),
      baseId: data.baseId || "",
      applicationId: data.applicationId || "",
      content: data.latexSource || data.content || "",
      buildStatus: data.buildStatus || "idle",
      latestBuiltIterationId: data.latestBuiltIterationId || "",
      updatedAt: data.updatedAt,
    });
  });
  return tracks;
}

async function fsLoadTrack(uid, trackId) {
  const ref = doc(db, "users", uid, "resumes", trackId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title || (trackId === "master" ? "Master Resume" : trackId),
    mode: data.mode || (trackId === "master" ? "Master" : "Role"),
    baseId: data.baseId || "",
    applicationId: data.applicationId || "",
    content: data.latexSource || data.content || "",
    buildStatus: data.buildStatus || "idle",
    latestBuiltIterationId: data.latestBuiltIterationId || "",
    updatedAt: data.updatedAt,
  };
}

async function fsSaveTrack(uid, trackId, content, additionalFields = {}) {
  const ref = doc(db, "users", uid, "resumes", trackId);
  await setDoc(ref, {
    latexSource: content || "",
    content: content || "",
    updatedAt: serverTimestamp(),
    ...additionalFields,
  }, { merge: true });
}

async function fsCreateTrack(uid, trackId, data) {
  const ref = doc(db, "users", uid, "resumes", trackId);
  await setDoc(ref, {
    title: data.title,
    mode: data.mode,
    baseId: data.baseId || "",
    applicationId: data.applicationId || "",
    latexSource: data.content || "",
    content: data.content || "",
    buildStatus: "idle",
    latestBuiltIterationId: "",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

async function fsDeleteTrack(uid, trackId) {
  if (trackId === "master") return;
  const ref = doc(db, "users", uid, "resumes", trackId);
  await deleteDoc(ref);
}

async function fsLoadApps(uid) {
  const ref = collection(db, "users", uid, "applications");
  const snap = await getDocs(ref);
  const apps = [];
  snap.forEach(d => apps.push({ id: d.id, ...d.data() }));
  apps.sort((a, b) => (a.company || "").localeCompare(b.company || ""));
  return apps;
}

async function fsLoadIterations(uid, trackId) {
  const ref = collection(db, "users", uid, "resumes", trackId, "iterations");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const iters = [];
  snap.forEach(d => iters.push({ id: d.id, ...d.data() }));
  return iters;
}

async function fsSaveIteration(uid, trackId, data) {
  const ref = collection(db, "users", uid, "resumes", trackId, "iterations");
  const docRef = await addDoc(ref, {
    label: data.label || "Snapshot",
    content: data.content || "",
    applicationId: data.applicationId || "",
    status: data.status || "draft",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

async function fsDeleteIteration(uid, trackId, iterId) {
  const ref = doc(db, "users", uid, "resumes", trackId, "iterations", iterId);
  await deleteDoc(ref);
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
    const track = await fsLoadTrack(CURRENT_UID, trackId);
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

    const iterations = await fsLoadIterations(CURRENT_UID, trackId);
    renderHistory(iterations);

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
    await fsSaveTrack(CURRENT_UID, CURRENT_TRACK.id, content);
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
    setBuildStatus("building", "Building…");
    hideError();

    // Simple HTML rendering (not actual LaTeX compilation)
    // This shows the LaTeX code formatted nicely
    const htmlContent = `
      <div class="latex-preview">
        <pre>${escapeHtml(content)}</pre>
      </div>
    `;

    elPreviewContent.innerHTML = htmlContent;
    btnDownloadPdf.disabled = false;

    setBuildStatus("built", "Built");
    elLastBuiltTime.textContent = `Built ${new Date().toLocaleTimeString()}`;

    await fsSaveTrack(CURRENT_UID, CURRENT_TRACK.id, content, {
      buildStatus: "built",
      buildUpdatedAt: serverTimestamp(),
    });

  } catch (err) {
    console.error("Build failed:", err);
    setBuildStatus("failed", "Failed");
    showError(err.message || "Build failed", err.stack || "");
  }
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
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Resume</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 40px; }
            .page { max-width: 800px; margin: 0 auto; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="page">${escapeHtml(content)}</div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  } catch (err) {
    alert("Failed to generate PDF: " + err.message);
  }
}

async function handleCreateSnapshot() {
  if (!CURRENT_UID || !CURRENT_TRACK) return;

  const label = snapshotLabel.value.trim();
  if (!label) {
    alert("Please enter a label for the snapshot.");
    return;
  }

  try {
    const content = getEditorContent();
    await fsSaveIteration(CURRENT_UID, CURRENT_TRACK.id, {
      label,
      content,
      applicationId: snapshotAppLink.value || "",
      status: "draft",
    });

    snapshotLabel.value = "";
    snapshotAppLink.value = "";
    closeSnapshotModal();

    const iterations = await fsLoadIterations(CURRENT_UID, CURRENT_TRACK.id);
    renderHistory(iterations);
  } catch (err) {
    console.error("Failed to create snapshot:", err);
    alert("Failed to create snapshot.");
  }
}

async function handleCreateVariant() {
  if (!CURRENT_UID) return;

  const title = variantTitle.value.trim();
  const mode = variantType.value;
  const baseId = variantBase.value;
  const appId = mode === "Company" ? variantAppLink.value : "";

  if (!title) {
    alert("Please enter a title for the variant.");
    return;
  }

  try {
    const baseTrack = await fsLoadTrack(CURRENT_UID, baseId);
    const content = baseTrack?.content || "";

    const trackId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await fsCreateTrack(CURRENT_UID, trackId, {
      title,
      mode,
      baseId,
      applicationId: appId,
      content,
    });

    variantTitle.value = "";
    variantType.value = "Role";
    variantAppLink.value = "";
    closeVariantModal();

    CURRENT_TRACKS = await fsLoadTracks(CURRENT_UID);
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
  if (!CURRENT_UID || !CURRENT_TRACK) return;
  if (!confirm("Delete this snapshot? This cannot be undone.")) return;

  try {
    await fsDeleteIteration(CURRENT_UID, CURRENT_TRACK.id, iterId);
    const iterations = await fsLoadIterations(CURRENT_UID, CURRENT_TRACK.id);
    renderHistory(iterations);
  } catch (err) {
    console.error("Failed to delete iteration:", err);
  }
}

// ============ MODAL HANDLERS ============

function openSnapshotModal() {
  snapshotModal.style.display = "";
  snapshotLabel.focus();
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
  btnSaveDraft.onclick = handleSaveDraft;
  btnBuildPdf.onclick = handleBuildPdf;
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
  console.log("[Resumes] Initializing workspace…");

  btnSaveDraft.disabled = true;
  btnBuildPdf.disabled = true;
  btnCreateSnapshot.disabled = true;

  initEditor("% Start typing your LaTeX resume here...\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}");

  wireEvents();

  onAuthStateChanged(auth, async (user) => {
    CURRENT_UID = user?.uid || null;

    if (CURRENT_UID) {
      elAuthBadge.textContent = "Synced";
      elAuthBadge.classList.add("auth-synced");
      btnSaveDraft.disabled = false;
      btnBuildPdf.disabled = false;
      btnCreateSnapshot.disabled = false;

      try {
        CURRENT_APPS = await fsLoadApps(CURRENT_UID);
        populateAppDropdowns();

        CURRENT_TRACKS = await fsLoadTracks(CURRENT_UID);

        if (!CURRENT_TRACKS.find(t => t.id === "master")) {
          await fsCreateTrack(CURRENT_UID, "master", {
            title: "Master Resume",
            mode: "Master",
            content: "% Your master resume\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}",
          });
          CURRENT_TRACKS = await fsLoadTracks(CURRENT_UID);
        }

        renderTrackSelector();
        populateVariantBaseDropdown();
        updateResumeStats();

        await selectTrack("master");

      } catch (err) {
        console.error("Failed to load data:", err);
        elAuthBadge.textContent = "Error";
      }

    } else {
      elAuthBadge.textContent = "Not signed in";
      elAuthBadge.classList.remove("auth-synced");
      btnSaveDraft.disabled = true;
      btnBuildPdf.disabled = true;
      btnCreateSnapshot.disabled = true;
      setEditorContent("% Sign in to load your resume…");
    }
  });
}

// Boot
init();
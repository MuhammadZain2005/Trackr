import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp, deleteDoc,
  collection, getDocs, addDoc, query, orderBy
} from "firebase/firestore";
import { HtmlGenerator, parse } from "latex.js";

// CodeMirror imports
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { bracketMatching } from "@codemirror/language";

// ============ STATE ============
let CURRENT_UID = null;
let CURRENT_APPS = [];
let CURRENT_TRACKS = [];
let CURRENT_TRACK = null;
let editorView = null;

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

// ============ LIGHT THEME FOR CODEMIRROR ============
const lightTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    backgroundColor: "#ffffff",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "#2d7ff9",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#2d7ff9",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#2d7ff9",
  },
  ".cm-gutters": {
    backgroundColor: "#f7f9fc",
    borderRight: "1px solid rgba(148, 163, 184, 0.35)",
    color: "#94a3b8",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 8px",
    minWidth: "40px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(45, 127, 249, 0.06)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(45, 127, 249, 0.08)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(45, 127, 249, 0.2)",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(45, 127, 249, 0.25)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(45, 127, 249, 0.2)",
    outline: "1px solid rgba(45, 127, 249, 0.4)",
  },
  ".cm-line": {
    padding: "0 12px",
  },
}, { dark: false });

// ============ CODEMIRROR SETUP ============
function initEditor(initialContent = "") {
  const editorContainer = document.getElementById("editorContainer");
  if (!editorContainer) {
    console.error("[Resumes] Editor container not found");
    return;
  }

  // Clear any existing editor
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
  editorContainer.innerHTML = "";

  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    highlightSelectionMatches(),
    drawSelection(),
    bracketMatching(),
    history(),
    EditorView.lineWrapping,
    lightTheme,
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      // Cmd/Ctrl + B to build
      { key: "Mod-b", run: () => { handleBuildPdf(); return true; } },
      // Cmd/Ctrl + S to save
      { key: "Mod-s", run: () => { handleSaveDraft(); return true; } },
    ]),
    // Allow editor to receive focus and input
    EditorView.editable.of(true),
    EditorState.allowMultipleSelections.of(true),
  ];

  const state = EditorState.create({
    doc: initialContent,
    extensions,
  });

  editorView = new EditorView({
    state,
    parent: editorContainer,
  });

  // Ensure editor is focusable
  editorView.contentDOM.setAttribute("tabindex", "0");

  console.log("[Resumes] Editor initialized successfully");
}

function getEditorContent() {
  if (!editorView) return "";
  return editorView.state.doc.toString();
}

function setEditorContent(content) {
  if (!editorView) return;
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: content || "" },
  });
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

  // Group tracks
  const masterTracks = CURRENT_TRACKS.filter(t => t.mode === "Master" || t.id === "master");
  const roleTracks = CURRENT_TRACKS.filter(t => t.mode === "Role");
  const companyTracks = CURRENT_TRACKS.filter(t => t.mode === "Company");

  // Add master
  masterTracks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    if (CURRENT_TRACK?.id === t.id) opt.selected = true;
    elTrackSelector.appendChild(opt);
  });

  // Add role variants
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

  // Add company resumes
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

    // Find linked app
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

    // Attach event listeners
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

    // Update UI
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

    // Update selector
    if (elTrackSelector) elTrackSelector.value = trackId;

    // Load iterations
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

    // Use latex.js to render HTML preview
    const generator = new HtmlGenerator({ hyphenate: false });
    parse(content, { generator });

    const html = generator.domFragment().innerHTML;

    // Show preview
    elPreviewContent.innerHTML = `<div class="latex-rendered">${html}</div>`;
    btnDownloadPdf.disabled = false;

    setBuildStatus("built", "Built");
    elLastBuiltTime.textContent = `Built ${new Date().toLocaleTimeString()}`;

    // Save the content as well
    await fsSaveTrack(CURRENT_UID, CURRENT_TRACK.id, content, {
      buildStatus: "built",
      buildUpdatedAt: serverTimestamp(),
    });

  } catch (err) {
    console.error("Build failed:", err);
    setBuildStatus("failed", "Failed");
    showError(err.message || "LaTeX parsing failed", err.stack || "");
  }
}

function handleDownloadPdf() {
  const content = getEditorContent();
  if (!content.trim()) return;

  try {
    const generator = new HtmlGenerator({ hyphenate: false });
    parse(content, { generator });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Resume</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 40px; }
            .page { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="page">${generator.domFragment().innerHTML}</div>
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

    // Refresh history
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
    // Load base content
    const baseTrack = await fsLoadTrack(CURRENT_UID, baseId);
    const content = baseTrack?.content || "";

    // Generate ID from title
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

    // Refresh tracks
    CURRENT_TRACKS = await fsLoadTracks(CURRENT_UID);
    renderTrackSelector();
    populateVariantBaseDropdown();
    updateResumeStats();

    // Select the new track
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
  // Main actions
  btnSaveDraft.onclick = handleSaveDraft;
  btnBuildPdf.onclick = handleBuildPdf;
  btnCopyLatex.onclick = () => {
    navigator.clipboard.writeText(getEditorContent());
    setBuildStatus("idle", "Copied!");
    setTimeout(() => setBuildStatus("idle", "Ready"), 1200);
  };
  btnDownloadPdf.onclick = handleDownloadPdf;

  // Track selector
  elTrackSelector.onchange = (e) => {
    selectTrack(e.target.value);
  };

  // New variant button
  btnNewVariant.onclick = openVariantModal;

  // Snapshot modal
  btnCreateSnapshot.onclick = openSnapshotModal;
  document.getElementById("closeSnapshotModal").onclick = closeSnapshotModal;
  document.getElementById("cancelSnapshot").onclick = closeSnapshotModal;
  snapshotForm.onsubmit = (e) => {
    e.preventDefault();
    handleCreateSnapshot();
  };

  // Variant modal
  document.getElementById("closeVariantModal").onclick = closeVariantModal;
  document.getElementById("cancelVariant").onclick = closeVariantModal;
  variantForm.onsubmit = (e) => {
    e.preventDefault();
    handleCreateVariant();
  };
  variantType.onchange = () => {
    variantAppLabel.style.display = variantType.value === "Company" ? "" : "none";
  };

  // Close modals on overlay click
  snapshotModal.onclick = (e) => {
    if (e.target === snapshotModal) closeSnapshotModal();
  };
  variantModal.onclick = (e) => {
    if (e.target === variantModal) closeVariantModal();
  };

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSnapshotModal();
      closeVariantModal();
    }
  });
}

// ============ INITIALIZATION ============

async function init() {
  console.log("[Resumes] Initializing workspace…");

  // Disable buttons until auth
  btnSaveDraft.disabled = true;
  btnBuildPdf.disabled = true;
  btnCreateSnapshot.disabled = true;

  // Initialize editor with sample content
  initEditor("% Start typing your LaTeX resume here...\n\\documentclass{article}\n\\begin{document}\n\nYour resume content goes here.\n\n\\end{document}");

  // Wire events
  wireEvents();

  // Listen for auth
  onAuthStateChanged(auth, async (user) => {
    CURRENT_UID = user?.uid || null;

    if (CURRENT_UID) {
      elAuthBadge.textContent = "Synced";
      elAuthBadge.classList.add("auth-synced");
      btnSaveDraft.disabled = false;
      btnBuildPdf.disabled = false;
      btnCreateSnapshot.disabled = false;

      try {
        // Load applications
        CURRENT_APPS = await fsLoadApps(CURRENT_UID);
        populateAppDropdowns();

        // Load tracks
        CURRENT_TRACKS = await fsLoadTracks(CURRENT_UID);

        // Ensure master exists
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

        // Select master by default
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

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, addDoc, query, orderBy, deleteDoc
} from "firebase/firestore";
import { HtmlGenerator, parse } from "latex.js";


const LATEX_API_URL = import.meta.env.VITE_LATEX_API_URL || "/api/latex/render";

const elAuthBadge = document.getElementById("authBadge");
const elMaster = document.getElementById("masterLatex");
const elStatus = document.getElementById("latexStatus");
const elPdfWrap = document.getElementById("pdfWrap");
const elPdfFrame = document.getElementById("pdfFrame");

const btnSaveMaster = document.getElementById("btnSaveMaster");
const btnCopyMaster = document.getElementById("btnCopyMaster");
const btnPreviewPdf = document.getElementById("btnPreviewPdf");
const btnDownloadPdf = document.getElementById("btnDownloadPdf");

const jobSelect = document.getElementById("jobSelect");
const iterationLabel = document.getElementById("iterationLabel");
const btnSaveIteration = document.getElementById("btnSaveIteration");

const iterationsEmpty = document.getElementById("iterationsEmpty");
const iterationsList = document.getElementById("iterationsList");

let CURRENT_UID = null;
let CURRENT_APPS = [];

function setStatus(msg) {
  elStatus.textContent = msg || "—";
}

function hardFail(where, err) {
  console.error(`[Resumes] ${where}`, err);
  const msg = (err && err.message) ? err.message : String(err);
  elAuthBadge.textContent = `Error: ${where}`;
  setStatus(`${where}: ${msg}`);
}

function appLabel(app) {
  const c = app?.company || "Unknown";
  const p = app?.position || "";
  return p ? `${c} — ${p}` : c;
}

function initJobsDropdown(apps) {
  jobSelect.innerHTML = "";

  const safeApps = (Array.isArray(apps) && apps.length)
    ? apps
    : [{ id: "general", company: "General", position: "Master / Not job-specific" }];

  for (const app of safeApps) {
    const opt = document.createElement("option");
    opt.value = app.id;
    opt.textContent = appLabel(app);
    jobSelect.appendChild(opt);
  }

  CURRENT_APPS = safeApps;
}

function getSelectedApp() {
  const id = jobSelect.value;
  return CURRENT_APPS.find(a => a.id === id) || CURRENT_APPS[0] || { id: "general", company: "General", position: "" };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function renderLatexToPdfBlob(latex) {
  const res = await fetch(LATEX_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latex }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`LaTeX API failed (${res.status}). ${txt}`.trim());
  }
  return await res.blob();
}

// ---------- Firestore ops
async function fsLoadMaster(uid) {
  const ref = doc(db, "users", uid, "resumes", "master");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().latexSource || "") : "";
}

async function fsSaveMaster(uid, latex) {
  const ref = doc(db, "users", uid, "resumes", "master");
  await setDoc(ref, { latexSource: latex || "", updatedAt: serverTimestamp() }, { merge: true });
}

async function fsLoadApps(uid) {
  const ref = collection(db, "users", uid, "applications");
  const snap = await getDocs(ref);
  const apps = [];
  snap.forEach(d => apps.push({ id: d.id, ...d.data() }));
  apps.sort((a, b) => appLabel(a).localeCompare(appLabel(b)));
  return apps;
}

async function fsLoadIterations(uid, appId) {
  const ref = collection(db, "users", uid, "applications", appId, "resumeIterations");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const iters = [];
  snap.forEach(d => iters.push({ id: d.id, ...d.data() }));
  return iters;
}

async function fsSaveIteration(uid, app, label, latex) {
  const ref = collection(db, "users", uid, "applications", app.id, "resumeIterations");
  await addDoc(ref, {
    label: label || "Saved version",
    latexSource: latex || "",
    createdAt: serverTimestamp(),
    appSnapshot: { company: app.company || "", position: app.position || "" },
  });
}

async function fsDeleteIteration(uid, appId, iterId) {
  const ref = doc(db, "users", uid, "applications", appId, "resumeIterations", iterId);
  await deleteDoc(ref);
}

function formatWhen(createdAt) {
  try {
    if (createdAt?.toDate) return createdAt.toDate().toLocaleString();
    return new Date(createdAt).toLocaleString();
  } catch {
    return String(createdAt || "");
  }
}

function renderIterations(items, appId) {
  if (!items || !items.length) {
    iterationsEmpty.style.display = "";
    iterationsList.style.display = "none";
    iterationsList.innerHTML = "";
    return;
  }

  iterationsEmpty.style.display = "none";
  iterationsList.style.display = "";
  iterationsList.innerHTML = "";

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "resumes-iterCard";

    const top = document.createElement("div");
    top.className = "resumes-iterTop";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = it.label || "Iteration";
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `Saved: ${formatWhen(it.createdAt)}`;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "resumes-iterBtns";

    const btnLoad = document.createElement("button");
    btnLoad.className = "ghost";
    btnLoad.textContent = "Load";
    btnLoad.onclick = () => {
      elMaster.value = it.latexSource || "";
      setStatus(`Loaded "${it.label || "iteration"}" into editor.`);
      elPdfWrap.style.display = "none";
    };

    const btnCopy = document.createElement("button");
    btnCopy.className = "ghost";
    btnCopy.textContent = "Copy";
    btnCopy.onclick = async () => {
      await navigator.clipboard.writeText(it.latexSource || "");
      setStatus("Copied iteration.");
      setTimeout(() => setStatus("—"), 1200);
    };

    const btnDelete = document.createElement("button");
    btnDelete.className = "danger";
    btnDelete.textContent = "Delete";
    btnDelete.onclick = async () => {
      try {
        await fsDeleteIteration(CURRENT_UID, appId, it.id);
        await refreshIterations();
        setStatus("Deleted.");
        setTimeout(() => setStatus("—"), 1200);
      } catch (e) {
        hardFail("Delete iteration failed", e);
      }
    };

    right.appendChild(btnLoad);
    right.appendChild(btnCopy);
    right.appendChild(btnDelete);

    top.appendChild(left);
    top.appendChild(right);

    const pre = document.createElement("pre");
    pre.className = "resumes-iterPreview";
    const text = it.latexSource || "";
    pre.textContent = text.slice(0, 900) + (text.length > 900 ? "\n\n…(truncated)" : "");

    card.appendChild(top);
    card.appendChild(pre);

    iterationsList.appendChild(card);
  }
}

async function refreshApps() {
  try {
    if (!CURRENT_UID) {
      initJobsDropdown([]);
      return;
    }
    const apps = await fsLoadApps(CURRENT_UID);
    initJobsDropdown(apps);
  } catch (e) {
    hardFail("Loading applications failed", e);
    initJobsDropdown([]); // still show General
  }
}

async function refreshMaster() {
  try {
    if (!CURRENT_UID) {
      elMaster.value = "";
      setStatus("Not signed in — can’t load master from Firebase.");
      return;
    }
    elMaster.value = await fsLoadMaster(CURRENT_UID);
    setStatus("Master loaded.");
    setTimeout(() => setStatus("—"), 1200);
  } catch (e) {
    hardFail("Loading master resume failed", e);
  }
}

async function refreshIterations() {
  try {
    if (!CURRENT_UID) {
      renderIterations([], jobSelect.value);
      return;
    }
    const appId = jobSelect.value || "general";
    const iters = await fsLoadIterations(CURRENT_UID, appId);
    renderIterations(iters, appId);
  } catch (e) {
    hardFail("Loading iterations failed", e);
    renderIterations([], jobSelect.value);
  }
}

function wireUI() {
  btnSaveMaster.onclick = async () => {
    try {
      if (!CURRENT_UID) {
        setStatus("Not signed in — cannot save to Firebase.");
        return;
      }
      await fsSaveMaster(CURRENT_UID, elMaster.value || "");
      setStatus("Master saved.");
      setTimeout(() => setStatus("—"), 1200);
    } catch (e) {
      hardFail("Saving master resume failed", e);
    }
  };

  btnCopyMaster.onclick = async () => {
    await navigator.clipboard.writeText(elMaster.value || "");
    setStatus("Copied master.");
    setTimeout(() => setStatus("—"), 1200);
  };

  jobSelect.onchange = async () => {
    await refreshIterations();
  };

  btnSaveIteration.onclick = async () => {
    try {
      if (!CURRENT_UID) {
        setStatus("Not signed in — cannot save iterations to Firebase.");
        return;
      }
      const latex = elMaster.value || "";
      if (!latex.trim()) {
        setStatus("Paste LaTeX first.");
        return;
      }
      const app = getSelectedApp();
      const label = (iterationLabel.value || "").trim() || "Saved version";
      await fsSaveIteration(CURRENT_UID, app, label, latex);
      iterationLabel.value = "";
      setStatus(`Saved iteration for ${appLabel(app)}.`);
      await refreshIterations();
      setTimeout(() => setStatus("—"), 1200);
    } catch (e) {
      hardFail("Saving iteration failed", e);
    }
  };

  const previewWrap = document.getElementById("previewWrap");
const latexPreview = document.getElementById("latexPreview");

btnPreviewPdf.onclick = async () => {
  const latex = elMaster.value || "";
  if (!latex.trim()) {
    setStatus("Paste LaTeX first.");
    return;
  }

  try {
    setStatus("Rendering preview…");

    const generator = new HtmlGenerator({ hyphenate: false });
    const doc = parse(latex, { generator });

    latexPreview.innerHTML = generator.domFragment().innerHTML;

    previewWrap.style.display = "";
    setStatus("Preview ready.");
  } catch (e) {
    previewWrap.style.display = "none";
    setStatus(`Preview failed: ${e?.message || e}`);
  }
};

  btnDownloadPdf.onclick = async () => {
  const latex = elMaster.value || "";
  if (!latex.trim()) {
    setStatus("Paste LaTeX first.");
    return;
  }

  try {
    setStatus("Opening print dialog…");

    const generator = new HtmlGenerator({ hyphenate: false });
    parse(latex, { generator });

    const html = `
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Resume</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
            .page { max-width: 850px; margin: 24px auto; }
          </style>
        </head>
        <body>
          <div class="page">${generator.domFragment().innerHTML}</div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();

    setStatus("Printed (save as PDF).");
    setTimeout(() => setStatus("—"), 1200);
  } catch (e) {
    setStatus(`Download failed: ${e?.message || e}`);
  }
};
}

// Boot
(function boot() {
  try {
    console.log("[Resumes] booting…", { LATEX_API_URL });

    // Disable PDF buttons until boot finishes
    btnPreviewPdf.disabled = true;
    btnDownloadPdf.disabled = true;
    btnSaveIteration.disabled = true;
    btnSaveMaster.disabled = true;

    wireUI();

    onAuthStateChanged(auth, async (user) => {
      CURRENT_UID = user?.uid || null;

      if (CURRENT_UID) {
        elAuthBadge.textContent = "Signed in • syncing with Firebase";
        btnSaveIteration.disabled = false;
        btnSaveMaster.disabled = false;
      } else {
        elAuthBadge.textContent = "Not signed in • go to Profile/Login first";
        btnSaveIteration.disabled = true;
        btnSaveMaster.disabled = true;
      }

      // Always enable PDF buttons (API can work without auth)
      btnPreviewPdf.disabled = false;
      btnDownloadPdf.disabled = false;

      await refreshApps();
      await refreshMaster();
      await refreshIterations();
    });
  } catch (e) {
    hardFail("Boot failed (script crashed)", e);
  }
})();

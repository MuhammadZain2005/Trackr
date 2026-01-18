const STORAGE_KEY = "job-tracker-storage-v2";

const todayDate = () => new Date().toISOString().slice(0, 10);

const createId = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const defaultMasterResume = `Taylor Harper
Product Operations Specialist

Summary
Detail-oriented ops leader with 4+ years of experience scaling hiring funnels,
improving stakeholder communication, and building systems that keep teams aligned.

Experience
- Streamlined recruiting intake and interview workflows for a 120-person org
- Built reporting dashboards for hiring progress and candidate experience
- Coordinated interview logistics for 30+ roles in parallel

Skills
- Stakeholder management
- Process design
- Interview scheduling
- Talent pipeline reporting`;

const sampleApplications = [
  {
    id: createId(),
    company: "Aurora Analytics",
    position: "People Operations Analyst",
    location: "Remote",
    source: "Referral",
    dateApplied: "2026-01-05",
    followUpDate: "2026-01-20",
    status: "Interview",
    priority: "High",
    notes: "Panel interview scheduled for Jan 18.",
    tailoredResume: "",
    communications: [
      {
        id: createId(),
        date: "2026-01-10",
        type: "Interview",
        summary: "Recruiter screen went well. Next step is panel round.",
      },
    ],
    lastUpdated: new Date().toISOString(),
    archived: false,
  },
  {
    id: createId(),
    company: "Northwind Labs",
    position: "Product Analyst",
    location: "Chicago, IL",
    source: "LinkedIn",
    dateApplied: "2026-01-08",
    followUpDate: "2026-01-22",
    status: "Applied",
    priority: "Medium",
    notes: "Focus on analytics tooling experience.",
    tailoredResume: "",
    communications: [],
    lastUpdated: new Date().toISOString(),
    archived: false,
  },
  {
    id: createId(),
    company: "Summit Collective",
    position: "Operations Manager",
    location: "Denver, CO",
    source: "Company site",
    dateApplied: "2025-12-28",
    followUpDate: "2026-01-15",
    status: "Offer",
    priority: "High",
    notes: "Offer received, review benefits.",
    tailoredResume: "",
    communications: [
      {
        id: createId(),
        date: "2026-01-12",
        type: "Offer",
        summary: "Offer delivered. Awaiting candidate response.",
      },
    ],
    lastUpdated: new Date().toISOString(),
    archived: false,
  },
];

const app = Vue.createApp({
  data() {
    return {
      statuses: ["Saved", "Applied", "Interview", "Offer", "Rejected"],
      masterResume: defaultMasterResume,
      applications: [],

      // Folder PDFs (pdf-only)
      folderPdfs: { master: [], swe: [], data: [] },
      showFolderModal: false,
      activeFolder: null,
      pdfDraftName: "",
      pdfDraftUrl: "",

      form: {
        company: "",
        position: "",
        location: "",
        source: "",
        dateApplied: todayDate(),
        followUpDate: "",
        status: "Applied",
        priority: "Medium",
        notes: "",
        useMasterResume: true,
      },

      searchTerm: "",
      statusFilter: "All",
      sortBy: "updated",
      remindersWindow: 7,
      showArchived: false,
      showTrackModal: false,
      communicationDrafts: {},
      storageError: "",
    };
  },

  computed: {
    activeApplications() {
      return this.applications.filter((a) => !a.archived);
    },

    stats() {
      const counts = {};
      this.statuses.forEach((s) => (counts[s] = 0));
      this.activeApplications.forEach((a) => {
        if (counts[a.status] !== undefined) counts[a.status] += 1;
      });
      return counts;
    },

    activeCount() {
      return this.activeApplications.filter(
        (a) => !["Offer", "Rejected"].includes(a.status)
      ).length;
    },

    filteredApplications() {
      const term = this.searchTerm.toLowerCase();
      return this.applications.filter((a) => {
        if (!this.showArchived && a.archived) return false;
        if (this.statusFilter !== "All" && a.status !== this.statusFilter) return false;

        if (!term) return true;
        return (
          a.company.toLowerCase().includes(term) ||
          a.position.toLowerCase().includes(term)
        );
      });
    },

    sortedApplications() {
      const apps = [...this.filteredApplications];
      const getDateValue = (dateValue, fallback = 0) =>
        dateValue ? new Date(`${dateValue}T00:00:00`).getTime() : fallback;

      if (this.sortBy === "dateApplied") {
        return apps.sort((a, b) => getDateValue(b.dateApplied) - getDateValue(a.dateApplied));
      }
      if (this.sortBy === "followUp") {
        return apps.sort(
          (a, b) =>
            getDateValue(a.followUpDate, Infinity) - getDateValue(b.followUpDate, Infinity)
        );
      }
      return apps.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    },

    bucketed() {
      const buckets = {};
      this.statuses.forEach((s) => (buckets[s] = []));
      this.sortedApplications.forEach((a) => {
        if (buckets[a.status]) buckets[a.status].push(a);
      });
      return buckets;
    },

    reminders() {
      const upcoming = [];
      this.activeApplications.forEach((a) => {
        if (!a.followUpDate) return;
        const days = this.daysFromToday(a.followUpDate);
        if (days <= this.remindersWindow) upcoming.push(a);
      });

      return upcoming.sort(
        (a, b) =>
          new Date(`${a.followUpDate}T00:00:00`) - new Date(`${b.followUpDate}T00:00:00`)
      );
    },
  },

  created() {
    this.restoreState();
  },

  methods: {
    normalizeApplication(appObj) {
      return {
        ...appObj,
        id: appObj.id || createId(),
        company: appObj.company || "",
        position: appObj.position || "",
        location: appObj.location || "",
        source: appObj.source || "",
        dateApplied: appObj.dateApplied || todayDate(),
        followUpDate: appObj.followUpDate || "",
        status: appObj.status || "Applied",
        priority: appObj.priority || "Medium",
        notes: appObj.notes || "",
        tailoredResume: appObj.tailoredResume || "",
        communications: Array.isArray(appObj.communications) ? appObj.communications : [],
        lastUpdated: appObj.lastUpdated || new Date().toISOString(),
        archived: Boolean(appObj.archived),
      };
    },

    ensureDraft(appId) {
      if (!this.communicationDrafts[appId]) {
        this.communicationDrafts[appId] = {
          date: todayDate(),
          type: "Email",
          summary: "",
        };
      }
    },

    openTrackModal() {
      this.showTrackModal = true;
    },
    closeTrackModal() {
      this.showTrackModal = false;
    },

    restoreState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          // defaults
          this.masterResume = defaultMasterResume;
          this.applications = [];
          this.folderPdfs = { master: [], swe: [], data: [] };
          return;
        }

        const parsed = JSON.parse(raw);
        this.masterResume = parsed.masterResume || defaultMasterResume;

        this.applications = Array.isArray(parsed.applications)
          ? parsed.applications.map(this.normalizeApplication)
          : [];

        this.folderPdfs = parsed.folderPdfs || { master: [], swe: [], data: [] };

        this.applications.forEach((a) => this.ensureDraft(a.id));
      } catch (e) {
        this.storageError = "Unable to load saved data. Local storage may be unavailable.";
      }
    },

    persistState() {
      try {
        const payload = {
          masterResume: this.masterResume,
          applications: this.applications,
          folderPdfs: this.folderPdfs,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        this.storageError = "";
      } catch (e) {
        this.storageError = "Unable to save. Storage limit may be reached in this browser.";
      }
    },

    addApplication() {
      const newApplication = this.normalizeApplication({
        company: this.form.company.trim(),
        position: this.form.position.trim(),
        location: this.form.location.trim(),
        source: this.form.source.trim(),
        dateApplied: this.form.dateApplied || todayDate(),
        followUpDate: this.form.followUpDate,
        status: this.form.status,
        priority: this.form.priority,
        notes: this.form.notes.trim(),
        tailoredResume: this.form.useMasterResume ? this.masterResume : "",
        communications: [],
        lastUpdated: new Date().toISOString(),
        archived: false,
      });

      this.applications.unshift(newApplication);
      this.ensureDraft(newApplication.id);
      this.resetForm();
      this.persistState();
      this.closeTrackModal();
    },

    resetForm() {
      this.form = {
        company: "",
        position: "",
        location: "",
        source: "",
        dateApplied: todayDate(),
        followUpDate: "",
        status: "Applied",
        priority: "Medium",
        notes: "",
        useMasterResume: true,
      };
    },

    removeApplication(id) {
      if (!confirm("Delete this application? This cannot be undone.")) return;
      this.applications = this.applications.filter((a) => a.id !== id);
      delete this.communicationDrafts[id];
      this.persistState();
    },

    toggleArchive(application) {
      application.archived = !application.archived;
      this.touch(application);
    },

    addCommunication(application) {
      const draft = this.communicationDrafts[application.id];
      if (!draft || !draft.summary.trim()) return;

      application.communications.unshift({
        id: createId(),
        date: draft.date,
        type: draft.type,
        summary: draft.summary.trim(),
      });

      draft.summary = "";
      this.touch(application);
    },

    useMaster(application) {
      application.tailoredResume = this.masterResume;
      this.touch(application);
    },

    clearTailored(application) {
      application.tailoredResume = "";
      this.touch(application);
    },

    loadSampleData() {
      if (this.applications.length > 0 && !confirm("Replace existing data with sample applications?")) {
        return;
      }
      this.applications = sampleApplications.map(this.normalizeApplication);
      this.applications.forEach((a) => this.ensureDraft(a.id));
      this.persistState();
    },

    clearAll() {
      if (!confirm("Clear all applications and reset folders?")) return;
      this.masterResume = defaultMasterResume;
      this.applications = [];
      this.communicationDrafts = {};
      this.folderPdfs = { master: [], swe: [], data: [] };
      this.persistState();
    },

    touch(application) {
      application.lastUpdated = new Date().toISOString();
      this.persistState();
    },

    formatDate(dateValue) {
      if (!dateValue) return "TBD";
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) return "TBD";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },

    daysFromToday(dateValue) {
      if (!dateValue) return Infinity;
      const today = new Date();
      const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const due = new Date(`${dateValue}T00:00:00`);
      const diffMs = due.getTime() - normalizedToday.getTime();
      return Math.floor(diffMs / 86400000);
    },

    dueClass(dateValue) {
      if (!dateValue) return "";
      const diff = this.daysFromToday(dateValue);
      if (diff < 0) return "overdue";
      if (diff <= 3) return "due-soon";
      return "ok";
    },

    dueLabel(dateValue) {
      const diff = this.daysFromToday(dateValue);
      if (diff < 0) return `${Math.abs(diff)} days overdue`;
      if (diff === 0) return "Due today";
      if (diff === 1) return "Due tomorrow";
      return `Due in ${diff} days`;
    },

    priorityClass(priority) {
      if (priority === "Low") return "priority-low";
      if (priority === "High") return "priority-high";
      return "priority-medium";
    },

    // ===== Folder PDFs =====
    openFolder(key) {
      this.activeFolder = key;
      this.showFolderModal = true;
      this.pdfDraftName = "";
      this.pdfDraftUrl = "";
    },

    closeFolder() {
      this.showFolderModal = false;
      this.activeFolder = null;
      this.pdfDraftName = "";
      this.pdfDraftUrl = "";
    },

    addPdfToFolder() {
      const name = (this.pdfDraftName || "").trim();
      const url = (this.pdfDraftUrl || "").trim();

      if (!this.activeFolder) return;
      if (!name || !url) return;

      if (!url.toLowerCase().endsWith(".pdf")) {
        alert("Please paste a URL that ends with .pdf");
        return;
      }

      this.folderPdfs[this.activeFolder].unshift({
        id:
          (typeof crypto !== "undefined" && crypto.randomUUID)
            ? crypto.randomUUID()
            : createId(),
        name,
        url,
        addedAt: Date.now(),
      });

      this.pdfDraftName = "";
      this.pdfDraftUrl = "";
      this.persistState();
    },

    removePdf(folderKey, pdfId) {
      this.folderPdfs[folderKey] = this.folderPdfs[folderKey].filter((p) => p.id !== pdfId);
      this.persistState();
    },
  },

  watch: {
    masterResume: "persistState",
    applications: { handler: "persistState", deep: true },
    folderPdfs: { handler: "persistState", deep: true },
  },
});

app.mount("#app");

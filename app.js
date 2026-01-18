const STORAGE_KEY = "job-tracker-storage-v1";

const todayDate = () => new Date().toISOString().slice(0, 10);

const createId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

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

Vue.createApp({
  data() {
    return {
      statuses: ["Saved", "Applied", "Interview", "Offer", "Rejected"],
      masterResume: defaultMasterResume,
      applications: [],
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
      copyMessage: "",
    };
  },
  computed: {
    activeApplications() {
      return this.applications.filter((app) => !app.archived);
    },
    stats() {
      const counts = {};
      this.statuses.forEach((status) => {
        counts[status] = 0;
      });
      this.activeApplications.forEach((app) => {
        if (counts[app.status] !== undefined) {
          counts[app.status] += 1;
        }
      });
      return counts;
    },
    activeCount() {
      return this.activeApplications.filter(
        (app) => !["Offer", "Rejected"].includes(app.status)
      ).length;
    },
    filteredApplications() {
      const term = this.searchTerm.toLowerCase();
      return this.applications.filter((app) => {
        if (!this.showArchived && app.archived) {
          return false;
        }
        if (this.statusFilter !== "All" && app.status !== this.statusFilter) {
          return false;
        }
        if (!term) {
          return true;
        }
        return (
          app.company.toLowerCase().includes(term) ||
          app.position.toLowerCase().includes(term)
        );
      });
    },
    sortedApplications() {
      const apps = [...this.filteredApplications];
      const getDateValue = (dateValue, fallback = 0) =>
        dateValue ? new Date(`${dateValue}T00:00:00`).getTime() : fallback;

      if (this.sortBy === "dateApplied") {
        return apps.sort(
          (a, b) =>
            getDateValue(b.dateApplied) - getDateValue(a.dateApplied)
        );
      }
      if (this.sortBy === "followUp") {
        return apps.sort(
          (a, b) =>
            getDateValue(a.followUpDate, Infinity) -
            getDateValue(b.followUpDate, Infinity)
        );
      }
      return apps.sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    },
    bucketed() {
      const buckets = {};
      this.statuses.forEach((status) => {
        buckets[status] = [];
      });
      this.sortedApplications.forEach((app) => {
        if (buckets[app.status]) {
          buckets[app.status].push(app);
        }
      });
      return buckets;
    },
    reminders() {
      const upcoming = [];
      this.activeApplications.forEach((app) => {
        if (!app.followUpDate) {
          return;
        }
        const days = this.daysFromToday(app.followUpDate);
        if (days <= this.remindersWindow) {
          upcoming.push(app);
        }
      });
      return upcoming.sort(
        (a, b) =>
          new Date(`${a.followUpDate}T00:00:00`) -
          new Date(`${b.followUpDate}T00:00:00`)
      );
    },
  },
  created() {
    this.restoreState();
  },
  methods: {
    normalizeApplication(app) {
      return {
        ...app,
        id: app.id || createId(),
        company: app.company || "",
        position: app.position || "",
        location: app.location || "",
        source: app.source || "",
        dateApplied: app.dateApplied || todayDate(),
        followUpDate: app.followUpDate || "",
        status: app.status || "Applied",
        priority: app.priority || "Medium",
        notes: app.notes || "",
        tailoredResume: app.tailoredResume || "",
        communications: Array.isArray(app.communications)
          ? app.communications
          : [],
        lastUpdated: app.lastUpdated || new Date().toISOString(),
        archived: Boolean(app.archived),
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
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.masterResume = parsed.masterResume || defaultMasterResume;
          this.applications = Array.isArray(parsed.applications)
            ? parsed.applications.map(this.normalizeApplication)
            : [];
        } else {
          this.applications = [];
        }
        this.applications.forEach((app) => {
          this.ensureDraft(app.id);
        });
      } catch (error) {
        this.storageError =
          "Unable to load saved data. Local storage may be unavailable.";
      }
    },
    persistState() {
      try {
        const payload = {
          masterResume: this.masterResume,
          applications: this.applications,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        this.storageError = "";
      } catch (error) {
        this.storageError =
          "Unable to save. Storage limit may be reached in this browser.";
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
      if (!confirm("Delete this application? This cannot be undone.")) {
        return;
      }
      this.applications = this.applications.filter((app) => app.id !== id);
      delete this.communicationDrafts[id];
      this.persistState();
    },
    toggleArchive(application) {
      application.archived = !application.archived;
      this.touch(application);
    },
    addCommunication(application) {
      const draft = this.communicationDrafts[application.id];
      if (!draft || !draft.summary.trim()) {
        return;
      }
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
    copyMasterResume() {
      if (!navigator.clipboard) {
        this.copyMessage = "Copy not available. Select and copy manually.";
        return;
      }
      navigator.clipboard
        .writeText(this.masterResume)
        .then(() => {
          this.copyMessage = "Master resume copied.";
          setTimeout(() => {
            this.copyMessage = "";
          }, 2000);
        })
        .catch(() => {
          this.copyMessage = "Unable to copy. Select and copy manually.";
        });
    },
    loadSampleData() {
      if (
        this.applications.length > 0 &&
        !confirm("Replace existing data with sample applications?")
      ) {
        return;
      }
      this.applications = sampleApplications.map(this.normalizeApplication);
      this.applications.forEach((app) => this.ensureDraft(app.id));
      this.persistState();
    },
    clearAll() {
      if (!confirm("Clear all applications and reset resumes?")) {
        return;
      }
      this.masterResume = defaultMasterResume;
      this.applications = [];
      this.communicationDrafts = {};
      this.persistState();
    },
    touch(application) {
      application.lastUpdated = new Date().toISOString();
      this.persistState();
    },
    formatDate(dateValue) {
      if (!dateValue) {
        return "TBD";
      }
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return "TBD";
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    daysFromToday(dateValue) {
      if (!dateValue) {
        return Infinity;
      }
      const today = new Date();
      const normalizedToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const due = new Date(`${dateValue}T00:00:00`);
      const diffMs = due.getTime() - normalizedToday.getTime();
      return Math.floor(diffMs / 86400000);
    },
    dueClass(dateValue) {
      if (!dateValue) {
        return "";
      }
      const diff = this.daysFromToday(dateValue);
      if (diff < 0) {
        return "overdue";
      }
      if (diff <= 3) {
        return "due-soon";
      }
      return "ok";
    },
    dueLabel(dateValue) {
      const diff = this.daysFromToday(dateValue);
      if (diff < 0) {
        return `${Math.abs(diff)} days overdue`;
      }
      if (diff === 0) {
        return "Due today";
      }
      if (diff === 1) {
        return "Due tomorrow";
      }
      return `Due in ${diff} days`;
    },
    priorityClass(priority) {
      if (priority === "Low") {
        return "priority-low";
      }
      if (priority === "High") {
        return "priority-high";
      }
      return "priority-medium";
    },
  },
  watch: {
    masterResume: "persistState",
    applications: {
      handler: "persistState",
      deep: true,
    },
  },
}).mount("#app");
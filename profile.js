const PROFILE_STORAGE_KEY = "job-tracker-profile-v1";

const createId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

Vue.createApp({
  data() {
    return {
      profile: {
        name: "",
        title: "",
        location: "",
        email: "",
        linkedin: "",
        portfolio: "",
      },
      experiences: [],
      experienceForm: {
        type: "Project",
        role: "",
        organization: "",
        dateRange: "",
        bullets: "",
      },
      preferences: {
        workType: "Remote",
        defaultSource: "LinkedIn",
        defaultPriority: "Medium",
        followUpWindow: 7,
      },
      settings: {
        showArchivedByDefault: true,
        highlightOverdue: true,
        groupByStatus: false,
      },
      isEditing: false,
      selectedExperiences: [],
    };
  },
  created() {
    this.loadProfile();
  },
  methods: {
    loadProfile() {
      try {
        const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          this.profile = data.profile || this.profile;
          this.experiences = data.experiences || [];
          this.preferences = data.preferences || this.preferences;
          this.settings = data.settings || this.settings;
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    },
    saveProfile() {
      try {
        const data = {
          profile: this.profile,
          experiences: this.experiences,
          preferences: this.preferences,
          settings: this.settings,
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Failed to save profile:", error);
        alert("Unable to save profile. Storage limit may be reached.");
      }
    },
    toggleEdit() {
      this.isEditing = !this.isEditing;
      if (!this.isEditing) {
        this.saveProfile();
      }
    },
    addExperience() {
      if (!this.experienceForm.role.trim()) {
        alert("Please enter a role or project name");
        return;
      }

      const newExp = {
        id: createId(),
        type: this.experienceForm.type,
        role: this.experienceForm.role.trim(),
        organization: this.experienceForm.organization.trim(),
        dateRange: this.experienceForm.dateRange.trim(),
        bullets: this.experienceForm.bullets
          .split("\n")
          .filter((b) => b.trim())
          .map((b) => b.trim()),
        selected: true,
      };

      this.experiences.unshift(newExp);
      this.resetExperienceForm();
      this.saveProfile();
    },
    resetExperienceForm() {
      this.experienceForm = {
        type: "Project",
        role: "",
        organization: "",
        dateRange: "",
        bullets: "",
      };
    },
    deleteExperience(id) {
      if (!confirm("Delete this experience?")) {
        return;
      }
      this.experiences = this.experiences.filter((exp) => exp.id !== id);
      this.saveProfile();
    },
    editExperience(exp) {
      this.experienceForm = {
        type: exp.type,
        role: exp.role,
        organization: exp.organization,
        dateRange: exp.dateRange,
        bullets: exp.bullets.join("\n"),
      };
      this.deleteExperience(exp.id);
    },
    toggleExperienceSelection(exp) {
      exp.selected = !exp.selected;
      this.saveProfile();
    },
    selectAllExperiences() {
      this.experiences.forEach((exp) => {
        exp.selected = true;
      });
      this.saveProfile();
    },
    clearSelectedExperiences() {
      if (!confirm("Delete all selected experiences?")) {
        return;
      }
      this.experiences = this.experiences.filter((exp) => !exp.selected);
      this.saveProfile();
    },
    exportData() {
      try {
        // Get all app data
        const appData = localStorage.getItem("job-tracker-storage-v1");
        const profileData = localStorage.getItem(PROFILE_STORAGE_KEY);

        const exportData = {
          applications: appData ? JSON.parse(appData) : null,
          profile: profileData ? JSON.parse(profileData) : null,
          exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jobtracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        alert("Failed to export data");
      }
    },
    importData() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);

            if (data.applications) {
              localStorage.setItem(
                "job-tracker-storage-v1",
                JSON.stringify(data.applications)
              );
            }

            if (data.profile) {
              localStorage.setItem(
                PROFILE_STORAGE_KEY,
                JSON.stringify(data.profile)
              );
              this.loadProfile();
            }

            alert("Data imported successfully!");
            window.location.reload();
          } catch (error) {
            alert("Failed to import data. Invalid file format.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    clearAllData() {
      if (
        !confirm(
          "This will delete ALL data including applications and profile. Are you sure?"
        )
      ) {
        return;
      }

      if (
        !confirm(
          "This action cannot be undone. Really delete everything?"
        )
      ) {
        return;
      }

      localStorage.removeItem("job-tracker-storage-v1");
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      alert("All data cleared");
      window.location.reload();
    },
    getInitials(name) {
      if (!name) return "PC";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    },
  },
  watch: {
    preferences: {
      handler: "saveProfile",
      deep: true,
    },
    settings: {
      handler: "saveProfile",
      deep: true,
    },
  },
}).mount("#profileApp");


import { db } from './firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createApp } from 'vue';
import '../styles.css';

const createId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

createApp({
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
    async loadProfile() {
      try {
        const docSnap = await getDoc(doc(db, "users", "currentUser_profile"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          this.profile = data.profile || this.profile;
          this.experiences = data.experiences || [];
          this.preferences = data.preferences || this.preferences;
          this.settings = data.settings || this.settings;
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        alert("Unable to load profile from Firebase: " + error.message);
      }
    },
    async saveProfile() {
      try {
        const data = {
          profile: this.profile,
          experiences: this.experiences,
          preferences: this.preferences,
          settings: this.settings,
        };
        await setDoc(doc(db, "users", "currentUser_profile"), data);
      } catch (error) {
        console.error("Failed to save profile:", error);
        alert("Unable to save profile to Firebase: " + error.message);
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
    async exportData() {
      try {
        // Get all app data from Firebase
        const appSnap = await getDoc(doc(db, "users", "currentUser"));
        const profileSnap = await getDoc(doc(db, "users", "currentUser_profile"));

        const exportData = {
          applications: appSnap.exists() ? appSnap.data() : null,
          profile: profileSnap.exists() ? profileSnap.data() : null,
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
        alert("Failed to export data: " + error.message);
      }
    },
    importData() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);

            if (data.applications) {
              await setDoc(doc(db, "users", "currentUser"), data.applications);
            }

            if (data.profile) {
              await setDoc(doc(db, "users", "currentUser_profile"), data.profile);
              this.loadProfile();
            }

            alert("Data imported successfully!");
            window.location.reload();
          } catch (error) {
            alert("Failed to import data. Invalid file format: " + error.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    async clearAllData() {
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

      try {
        await setDoc(doc(db, "users", "currentUser"), {});
        await setDoc(doc(db, "users", "currentUser_profile"), {});
        alert("All data cleared");
        window.location.reload();
      } catch (error) {
        alert("Failed to clear data: " + error.message);
      }
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


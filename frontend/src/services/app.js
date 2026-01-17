import { createApp } from 'vue';
import { api } from './api.js';

const todayDate = () => new Date().toISOString().slice(0, 10);

createApp({
  data() {
    return {
      statuses: ["Saved", "Applied", "Interview", "Offer", "Rejected"],
      applications: [],
      form: {
        companyName: "",
        position: "",
        location: "",
        dateApplied: todayDate(),
        status: "applied",
        priority: "medium",
        notes: ""
      },
      searchTerm: "",
      statusFilter: "All",
      loading: false,
      error: ""
    };
  },

  computed: {
    filteredApplications() {
      const term = this.searchTerm.toLowerCase();
      return this.applications.filter(app => {
        if (this.statusFilter !== "All" && app.status !== this.statusFilter.toLowerCase()) {
          return false;
        }
        if (!term) return true;
        return (
          app.companyName?.toLowerCase().includes(term) ||
          app.position?.toLowerCase().includes(term)
        );
      });
    },

    stats() {
      const counts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
      this.applications.forEach(app => {
        if (counts[app.status] !== undefined) {
          counts[app.status]++;
        }
      });
      return counts;
    }
  },

  async created() {
    await this.loadApplications();
  },

  methods: {
    async loadApplications() {
      try {
        this.loading = true;
        this.applications = await api.getApplications();
      } catch (error) {
        this.error = 'Failed to load applications';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async addApplication() {
      if (!this.form.companyName || !this.form.position) {
        this.error = 'Company and position required';
        return;
      }

      try {
        this.loading = true;
        await api.createApplication(this.form);
        await this.loadApplications();
        this.resetForm();
        this.error = '';
      } catch (error) {
        this.error = 'Failed to create application';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteApplication(id) {
      if (!confirm('Delete this application?')) return;

      try {
        this.loading = true;
        await api.deleteApplication(id);
        await this.loadApplications();
      } catch (error) {
        this.error = 'Failed to delete application';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    resetForm() {
      this.form = {
        companyName: "",
        position: "",
        location: "",
        dateApplied: todayDate(),
        status: "applied",
        priority: "medium",
        notes: ""
      };
    },

    formatDate(dateValue) {
      if (!dateValue) return 'N/A';
      return new Date(dateValue).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
}).mount("#app");

const API_URL = 'http://localhost:3000/api';

export const api = {
    async getApplications() {
        const res = await fetch(`${API_URL}/applications`);
        const data = await res.json();
        return data.success ? data.data.applications : [];
    },

    async createApplication(app) {
        const res = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(app)
        });
        return res.json();
    },

    async updateApplication(id, updates) {
        const res = await fetch(`${API_URL}/applications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return res.json();
    },

    async deleteApplication(id) {
        const res = await fetch(`${API_URL}/applications/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    }
};

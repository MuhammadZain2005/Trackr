// NOTE: This file was generated using ChatGPT for testing purposes only
// Function names (create, findAll, findById, update, updateStatus, delete) will remain the same
// When integrating Firebase, just replace the implementation inside these functions

let applications = [];
let nextId = 1;

const applicationDb = {
    create(data) {
        const application = {
            id: `app_${nextId++}`,
            ...data,
            statusHistory: [{
                status: data.status || 'applied',
                timestamp: new Date().toISOString(),
                note: 'Application created'
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        applications.push(application);
        return application;
    },

    findAll(filters = {}) {
        let results = [...applications];

        if (filters.status) {
            results = results.filter(app => app.status === filters.status);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            results = results.filter(app =>
                app.companyName?.toLowerCase().includes(searchLower) ||
                app.position?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.sortBy) {
            results.sort((a, b) => {
                const aVal = a[filters.sortBy];
                const bVal = b[filters.sortBy];
                const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return filters.order === 'desc' ? -comparison : comparison;
            });
        }

        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return {
            applications: results.slice(startIndex, endIndex),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(results.length / limit),
                totalItems: results.length,
                itemsPerPage: limit
            }
        };
    },

    findById(id) {
        return applications.find(app => app.id === id);
    },

    update(id, updates) {
        const index = applications.findIndex(app => app.id === id);
        if (index === -1) return null;

        applications[index] = {
            ...applications[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return applications[index];
    },

    updateStatus(id, status, statusNote = null) {
        const index = applications.findIndex(app => app.id === id);
        if (index === -1) return null;

        const statusEntry = {
            status,
            timestamp: new Date().toISOString(),
            ...(statusNote && { note: statusNote })
        };

        applications[index] = {
            ...applications[index],
            status,
            statusHistory: [...(applications[index].statusHistory || []), statusEntry],
            updatedAt: new Date().toISOString()
        };
        return applications[index];
    },

    delete(id) {
        const index = applications.findIndex(app => app.id === id);
        if (index === -1) return false;
        applications.splice(index, 1);
        return true;
    }
};

module.exports = applicationDb;

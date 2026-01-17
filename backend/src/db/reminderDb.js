// Temp in-memory store - replace with Firebase later
// Keep function names the same when migrating

let reminders = [];
let nextId = 1;

const reminderDb = {
    create(data) {
        const reminder = {
            id: `reminder_${nextId++}`,
            ...data,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        reminders.push(reminder);
        return reminder;
    },

    findAll(filters = {}) {
        let results = [...reminders];

        if (filters.applicationId) {
            results = results.filter(r => r.applicationId === filters.applicationId);
        }

        if (filters.status) {
            const now = new Date();
            results = results.filter(r => {
                if (filters.status === 'completed') return r.completed;
                if (filters.status === 'pending') return !r.completed && new Date(r.dueDate) > now;
                if (filters.status === 'overdue') return !r.completed && new Date(r.dueDate) <= now;
                return true;
            });
        }

        if (filters.sortBy) {
            results.sort((a, b) => {
                const aVal = a[filters.sortBy];
                const bVal = b[filters.sortBy];
                const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return filters.order === 'desc' ? -comparison : comparison;
            });
        }

        return results;
    },

    findById(id) {
        return reminders.find(r => r.id === id);
    },

    update(id, updates) {
        const index = reminders.findIndex(r => r.id === id);
        if (index === -1) return null;

        reminders[index] = {
            ...reminders[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return reminders[index];
    },

    delete(id) {
        const index = reminders.findIndex(r => r.id === id);
        if (index === -1) return false;
        reminders.splice(index, 1);
        return true;
    },

    findUpcoming(days = 7) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return reminders.filter(r => {
            const dueDate = new Date(r.dueDate);
            return !r.completed && dueDate >= now && dueDate <= futureDate;
        });
    }
};

module.exports = reminderDb;

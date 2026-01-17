// Temp in-memory store - replace with Firebase later
// Keep function names the same when migrating

let masterResume = null;
let customizedResumes = [];
let nextResumeId = 1;

const resumeDb = {
    createMaster(data) {
        masterResume = {
            id: 'resume_master_001',
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return masterResume;
    },

    getMaster() {
        return masterResume;
    },

    updateMaster(updates) {
        if (!masterResume) return null;
        masterResume = {
            ...masterResume,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return masterResume;
    },

    createCustomized(data) {
        const resume = {
            id: `resume_custom_${nextResumeId++}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        customizedResumes.push(resume);
        return resume;
    },

    getAllCustomized(applicationId = null) {
        if (applicationId) {
            return customizedResumes.filter(r => r.applicationId === applicationId);
        }
        return customizedResumes;
    },

    getCustomizedById(id) {
        return customizedResumes.find(r => r.id === id);
    },

    updateCustomized(id, updates) {
        const index = customizedResumes.findIndex(r => r.id === id);
        if (index === -1) return null;

        customizedResumes[index] = {
            ...customizedResumes[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return customizedResumes[index];
    },

    deleteCustomized(id) {
        const index = customizedResumes.findIndex(r => r.id === id);
        if (index === -1) return false;
        customizedResumes.splice(index, 1);
        return true;
    }
};

module.exports = resumeDb;

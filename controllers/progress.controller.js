const dbService = require('../services/db.service');

async function saveProgress(req, res) {
    try {
        const success = await dbService.updateProgress(req.user.id, JSON.stringify(req.body.progress));
        if (!success) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, message: 'Progress saved successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function loadProgress(req, res) {
    try {
        const user = await dbService.findUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const progressObj = user.progress ? JSON.parse(user.progress) : {};
        res.json({ progress: progressObj });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { saveProgress, loadProgress };

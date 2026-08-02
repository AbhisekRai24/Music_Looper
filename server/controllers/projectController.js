const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

exports.saveProject = async (req, res) => {
    try {
        const { name, duration, masterVolume, layersData } = req.body;
        // req.files is an array if upload.any() or upload.array() is used
        const files = req.files || (req.file ? [req.file] : []);

        if (!name) {
            files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({ message: 'Project name is required' });
        }
        if (files.length === 0) {
            return res.status(400).json({ message: 'At least one audio file is required' });
        }

        let parsedLayersData = [];
        try {
            if (layersData) parsedLayersData = JSON.parse(layersData);
        } catch (e) {
            console.error('Error parsing layersData:', e);
        }

        // If it looks like legacy version (no layersData, just one file)
        let modelData = {
            name,
            masterVolume: Number(masterVolume) || 0.8
        };

        if (parsedLayersData.length > 0 && Array.isArray(parsedLayersData)) {
            // New multi-layer format
            modelData.layers = files.map((file, index) => {
                const meta = parsedLayersData[index] || {};
                return {
                    name: meta.name || `Track ${index + 1}`,
                    audioPath: file.filename,
                    duration: Number(meta.duration) || 0,
                    volume: Number(meta.volume) !== undefined && !isNaN(Number(meta.volume)) ? Number(meta.volume) : 1,
                    muted: meta.muted === true,
                    solo: meta.solo === true
                };
            });
        } else {
            // Logic for legacy v5 saves
            modelData.audioPath = files[0].filename;
            modelData.duration = Number(duration) || 0;
            modelData.layers = [{
                name: 'Track 1',
                audioPath: files[0].filename,
                duration: Number(duration) || 0,
                volume: 1,
                muted: false,
                solo: false
            }];
        }

        const project = new Project(modelData);
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        if (req.files) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
        res.status(500).json({ message: 'Error saving project', error: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
};

exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.status(200).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching project', error: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const filePath = path.join(__dirname, '..', 'uploads', project.audioPath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await project.deleteOne();
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
};

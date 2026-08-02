const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

exports.saveProject = async (req, res) => {
    try {
        const { name, duration, masterVolume } = req.body;
        const file = req.file;

        if (!name) {
            // We should remove the uploaded file if validation fails and multer uploaded it
            if (file) fs.unlinkSync(file.path);
            return res.status(400).json({ message: 'Project name is required' });
        }
        if (!file) {
            return res.status(400).json({ message: 'Audio file is required' });
        }

        const project = new Project({
            name,
            audioPath: file.filename,
            duration: Number(duration) || 0,
            masterVolume: Number(masterVolume) || 0.8
        });

        await project.save();
        res.status(201).json(project);
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
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

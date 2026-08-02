const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    audioPath: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    masterVolume: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

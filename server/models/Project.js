const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    audioPath: {
        type: String,
        required: false,
    },
    duration: {
        type: Number,
        required: false,
    },
    layers: [{
        audioPath: String,
        duration: Number,
        volume: { type: Number, default: 1 }
    }],
    masterVolume: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

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
        name: { type: String, default: 'Track 1' },
        audioPath: String,
        duration: Number,
        volume: { type: Number, default: 1 },
        muted: { type: Boolean, default: false },
        solo: { type: Boolean, default: false }
    }],
    masterVolume: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

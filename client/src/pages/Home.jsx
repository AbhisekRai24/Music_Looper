import { useState, useEffect } from 'react';
import api, { saveProject, getProjects, deleteProject, API_URL } from '../services/api';
import useAudioRecorder from '../hooks/useAudioRecorder';
import useAudioPlayer from '../hooks/useAudioPlayer';

const Home = () => {
    const [backendStatus, setBackendStatus] = useState('checking');
    const [projectName, setProjectName] = useState('');
    const [savedProjects, setSavedProjects] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    // layers keeps the same name for save/load compatibility; each entry now has name, muted, solo too
    const [layers, setLayers] = useState([]);
    const [layerCounter, setLayerCounter] = useState(1);

    const {
        isRecording,
        audioBlob,
        microphoneName,
        durationFormatted,
        startRecording,
        stopRecording,
        clearRecording,
        formatDuration
    } = useAudioRecorder();

    const {
        isPlaying,
        isPaused,
        hasLoop,
        addLayer,
        removeLayer,
        setLayerVolume,
        applySoloMute,
        play,
        pause,
        clear: clearPlayer,
        volume,
        setVolume
    } = useAudioPlayer();

    let unifiedStatus = 'Ready';
    if (isRecording) {
        unifiedStatus = 'Recording...';
    } else if (isPlaying) {
        unifiedStatus = 'Loop Playing';
    } else if (isPaused && hasLoop) {
        unifiedStatus = 'Loop Paused';
    } else if (hasLoop) {
        unifiedStatus = 'Loop Ready';
    }

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await api.get('/health');
                setBackendStatus(response.data.status === 'Server Running' ? 'online' : 'offline');
            } catch {
                setBackendStatus('offline');
            }
        };
        checkBackend();
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const data = await getProjects();
            setSavedProjects(data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    // When a recording finishes, add it as a new track layer
    useEffect(() => {
        if (audioBlob) {
            const newLayerId = Date.now().toString();
            const trackNum = layerCounter;
            const addNewLayer = async () => {
                const decoded = await addLayer(newLayerId, audioBlob, 1);
                if (decoded) {
                    const newTrack = {
                        id: newLayerId,
                        name: `Track ${trackNum}`,
                        audioBlob,
                        duration: decoded.duration,
                        volume: 1,
                        muted: false,
                        solo: false,
                        labelNumber: trackNum
                    };
                    setLayers(prev => {
                        const updated = [...prev, newTrack];
                        // Re-apply solo/mute so the new track obeys existing state
                        applySoloMute(updated);
                        return updated;
                    });
                    setLayerCounter(c => c + 1);
                }
            };
            addNewLayer();
        }
    }, [audioBlob]);

    const handleRecord = () => {
        startRecording();
    };

    const handleClear = () => {
        if (!window.confirm('Clear all tracks?')) return;
        clearPlayer();
        clearRecording();
        setLayers([]);
        setLayerCounter(1);
    };

    const handleTogglePlay = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    const handleSave = async () => {
        if (layers.length === 0) return;

        let finalName = projectName.trim();
        if (!finalName) {
            finalName = window.prompt('Please enter a project name:');
            if (!finalName) return;
            setProjectName(finalName);
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('name', finalName);
        formData.append('masterVolume', volume);

        const layersData = [];
        layers.forEach(layer => {
            formData.append('audioBlobs', layer.audioBlob, `layer_${layer.id}.webm`);
            layersData.push({
                name: layer.name,
                duration: layer.duration,
                volume: layer.volume,
                muted: layer.muted,
                solo: layer.solo
            });
        });
        formData.append('layersData', JSON.stringify(layersData));

        try {
            await saveProject(formData);
            alert('Project Saved Successfully');
            fetchProjects();
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('Delete this project?')) return;
        try {
            await deleteProject(id);
            fetchProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleLoad = async (project) => {
        if (hasLoop) {
            const ok = window.confirm('Loading this project will clear current tracks. Continue?');
            if (!ok) return;
        }

        try {
            clearPlayer();
            clearRecording();
            setLayers([]);

            const projectLayers = project.layers && project.layers.length > 0
                ? project.layers
                : [{ audioPath: project.audioPath, duration: project.duration, volume: 1 }];

            let counter = 1;
            const newLayers = [];

            for (const pLayer of projectLayers) {
                if (!pLayer.audioPath) continue;
                const response = await fetch(`${API_URL}/uploads/${pLayer.audioPath}`);
                const blob = await response.blob();
                const newLayerId = Date.now().toString() + Math.random().toString();
                const layerVol = pLayer.volume !== undefined ? pLayer.volume : 1;
                const decoded = await addLayer(newLayerId, blob, layerVol);

                if (decoded) {
                    newLayers.push({
                        id: newLayerId,
                        name: pLayer.name || `Track ${counter}`,
                        audioBlob: blob,
                        duration: decoded.duration,
                        volume: layerVol,
                        muted: pLayer.muted ?? false,
                        solo: pLayer.solo ?? false,
                        labelNumber: counter
                    });
                    counter++;
                }
            }

            setLayers(newLayers);
            setLayerCounter(counter);
            setProjectName(project.name);
            setVolume(project.masterVolume);
            // Re-apply mute/solo after all layers are loaded
            applySoloMute(newLayers);

        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project audio');
        }
    };

    // ─── Track control handlers ───────────────────────────────────────────────

    const handleDeleteLayer = (id) => {
        removeLayer(id);
        setLayers(prev => {
            const updated = prev.filter(l => l.id !== id);
            applySoloMute(updated);
            return updated;
        });
    };

    const handleLayerVolumeChange = (id, newVolume) => {
        setLayers(prev => {
            const updated = prev.map(l =>
                l.id === id ? { ...l, volume: newVolume } : l
            );
            applySoloMute(updated);
            return updated;
        });
    };

    const handleToggleMute = (id) => {
        setLayers(prev => {
            const updated = prev.map(l =>
                l.id === id ? { ...l, muted: !l.muted } : l
            );
            applySoloMute(updated);
            return updated;
        });
    };

    const handleToggleSolo = (id) => {
        setLayers(prev => {
            const updated = prev.map(l =>
                l.id === id ? { ...l, solo: !l.solo } : l
            );
            applySoloMute(updated);
            return updated;
        });
    };

    const handleRenameTrack = (id, newName) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, name: newName } : l
        ));
    };

    return (
        <div className="home-container">
            <h1>Guitar Looper</h1>

            <div className="status-indicator">
                {backendStatus === 'online' && <span className="status online">🟢 Backend Connected</span>}
                {backendStatus === 'offline' && <span className="status offline">🔴 Backend Offline</span>}
                {backendStatus === 'checking' && <span className="status checking">⚪ Checking Backend...</span>}
            </div>

            <div className="project-name">
                <input
                    type="text"
                    placeholder="New Project Name..."
                    className="project-input"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                />
            </div>

            <div className="recording-info">
                <div className="info-block">
                    <span className="info-label">Microphone:</span>
                    <span className="info-value">{microphoneName || 'None'}</span>
                </div>
                <div className="info-block">
                    <span className="info-label">Status:</span>
                    <span className={`info-value ${isRecording ? 'recording' : ''}`}>{unifiedStatus}</span>
                </div>
                {isRecording && (
                    <div className="info-block">
                        <span className="info-label">Rec Time:</span>
                        <span className="info-value duration recording">{durationFormatted}</span>
                    </div>
                )}
            </div>

            {/* ── Track list ─────────────────────────────────────────────── */}
            <div className="layers-section">
                <h2>Tracks</h2>
                <hr />
                {layers.length === 0 ? (
                    <p className="no-layers">No tracks recorded yet.</p>
                ) : (
                    <div className="layers-list">
                        {layers.map(layer => (
                            <div
                                key={layer.id}
                                className={`layer-item${layer.solo ? ' track-solo-active' : ''}${layer.muted ? ' track-muted' : ''}`}
                            >
                                <div className="layer-header">
                                    <span className="layer-title">Track {layer.labelNumber}</span>
                                    <span className="layer-duration">{formatDuration(Math.round(layer.duration))}</span>
                                </div>

                                {/* Inline track name */}
                                <div className="track-name-row">
                                    <input
                                        type="text"
                                        className="track-name-input"
                                        value={layer.name}
                                        onChange={e => handleRenameTrack(layer.id, e.target.value)}
                                        placeholder="Track name…"
                                    />
                                </div>

                                <div className="layer-controls">
                                    <div className="layer-volume">
                                        <span className="volume-label">{Math.round(layer.volume * 100)}%</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={layer.volume}
                                            onChange={e => handleLayerVolumeChange(layer.id, parseFloat(e.target.value))}
                                            className="volume-slider"
                                        />
                                    </div>
                                    <button
                                        className={`btn-small${layer.muted ? ' btn-muted' : ''}`}
                                        onClick={() => handleToggleMute(layer.id)}
                                        title={layer.muted ? 'Unmute track' : 'Mute track'}
                                    >
                                        {layer.muted ? 'Unmute' : 'Mute'}
                                    </button>
                                    <button
                                        className={`btn-small btn-solo${layer.solo ? ' btn-solo-active' : ''}`}
                                        onClick={() => handleToggleSolo(layer.id)}
                                        title={layer.solo ? 'Unsolo track' : 'Solo track'}
                                    >
                                        Solo
                                    </button>
                                    <button
                                        className="btn-small btn-danger"
                                        onClick={() => handleDeleteLayer(layer.id)}
                                        title="Delete track"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <hr />
            </div>

            {/* ── Master volume ──────────────────────────────────────────── */}
            <div className="volume-control-section">
                <div className="volume-header">
                    <span className="volume-label">Master Volume</span>
                    <span className="volume-value">{Math.round(volume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="volume-slider"
                />
            </div>

            {/* ── Transport controls ─────────────────────────────────────── */}
            <div className="controls">
                <button
                    className="btn btn-record"
                    onClick={handleRecord}
                    disabled={isRecording}
                >
                    Record
                </button>
                <button
                    className="btn btn-stop"
                    onClick={stopRecording}
                    disabled={!isRecording}
                >
                    Stop
                </button>
                <button
                    className="btn btn-play"
                    onClick={handleTogglePlay}
                    disabled={layers.length === 0 || isRecording}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                    className="btn btn-save"
                    onClick={handleSave}
                    disabled={layers.length === 0 || isSaving || isRecording}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                    className="btn btn-clear"
                    onClick={handleClear}
                    disabled={layers.length === 0 && !isRecording}
                >
                    Clear All
                </button>
            </div>

            {/* ── Saved projects ─────────────────────────────────────────── */}
            {savedProjects.length > 0 && (
                <div className="saved-projects-section">
                    <h2>Saved Projects</h2>
                    <div className="projects-list">
                        {savedProjects.map(proj => (
                            <div key={proj._id} className="project-card">
                                <h3>{proj.name}</h3>
                                <div className="project-meta">
                                    <p>Tracks: {proj.layers ? proj.layers.length : (proj.audioPath ? 1 : 0)}</p>
                                    <p>Master Vol: {Math.round(proj.masterVolume * 100)}%</p>
                                    <p>Created: {new Date(proj.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="project-actions">
                                    <button onClick={() => handleLoad(proj)} className="btn-small">Load</button>
                                    <button onClick={() => handleDeleteProject(proj._id)} className="btn-small btn-danger">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;

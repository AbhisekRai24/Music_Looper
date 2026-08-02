import { useState, useEffect } from 'react';
import api, { saveProject, getProjects, deleteProject, API_URL } from '../services/api';
import useAudioRecorder from '../hooks/useAudioRecorder';
import useAudioPlayer from '../hooks/useAudioPlayer';

const Home = () => {
    const [backendStatus, setBackendStatus] = useState('checking');
    const [projectName, setProjectName] = useState('');
    const [savedProjects, setSavedProjects] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

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
        audioBuffer,
        load,
        play,
        pause,
        clear: clearPlayer,
        volume,
        setVolume
    } = useAudioPlayer();

    // Unified loop length dynamically reads real length of the finalized WebAudio buffer
    const loopLengthFormatted = audioBuffer
        ? formatDuration(Math.round(audioBuffer.duration))
        : '00:00';

    // State orchestration engine for status label
    let unifiedStatus = 'Ready';
    if (isRecording) {
        unifiedStatus = 'Recording...';
    } else if (isPlaying) {
        unifiedStatus = 'Loop Playing';
    } else if (isPaused) {
        unifiedStatus = 'Loop Paused';
    } else if (hasLoop) {
        unifiedStatus = 'Loop Ready';
    }

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await api.get('/health');
                if (response.data.status === 'Server Running') {
                    setBackendStatus('online');
                } else {
                    setBackendStatus('offline');
                }
            } catch (error) {
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

    // Event Driven orchestration: strictly load buffer once recorder completes
    useEffect(() => {
        if (audioBlob) {
            load(audioBlob);
        }
    }, [audioBlob]);

    const handleRecord = () => {
        if (hasLoop) {
            const confirmDelete = window.confirm("Are you sure you want to delete the existing loop and record a new one?");
            if (!confirmDelete) return;
            clearPlayer();
            clearRecording();
        }
        startRecording();
    };

    const handleClear = () => {
        clearPlayer();
        clearRecording();
    };

    const handleTogglePlay = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    const handleSave = async () => {
        if (!audioBlob) return;

        let finalName = projectName.trim();
        if (!finalName) {
            finalName = window.prompt("Please enter a project name:");
            if (!finalName) return;
            setProjectName(finalName);
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('name', finalName);
        formData.append('audioBlob', audioBlob, 'loop.webm');
        formData.append('duration', audioBuffer ? audioBuffer.duration : 0);
        formData.append('masterVolume', volume);

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

    const handleDelete = async (id) => {
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
            const confirmLoad = window.confirm("Loading this project will clear the current loop. Continue?");
            if (!confirmLoad) return;
        }

        try {
            const response = await fetch(`${API_URL}/uploads/${project.audioPath}`);
            const blob = await response.blob();

            // clear both recorder and player just in case, then load
            clearPlayer();
            clearRecording();
            load(blob);

            setProjectName(project.name);
            setVolume(project.masterVolume);
        } catch (error) {
            console.error('Error loading project:', error);
            alert("Error loading project audio");
        }
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
                    onChange={(e) => setProjectName(e.target.value)}
                />
            </div>

            <div className="recording-info">
                <div className="info-block">
                    <span className="info-label">Microphone:</span>
                    <span className="info-value">{microphoneName || 'None'}</span>
                </div>
                <div className="info-block">
                    <span className="info-label">Loop Length:</span>
                    <span className="info-value duration">{isRecording ? durationFormatted : loopLengthFormatted}</span>
                </div>
                <div className="info-block">
                    <span className="info-label">Loop Status:</span>
                    <span className={`info-value ${isRecording ? 'recording' : ''}`}>{unifiedStatus}</span>
                </div>
            </div>

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
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="volume-slider"
                />
            </div>

            <div className="controls">
                <button
                    className="btn btn-record"
                    onClick={handleRecord}
                    disabled={isRecording || isPlaying}
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
                    disabled={!hasLoop || isRecording}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                    className="btn btn-save"
                    onClick={handleSave}
                    disabled={!hasLoop || isSaving || isRecording}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button disabled className="btn btn-load">Load</button>
                <button
                    className="btn btn-clear"
                    onClick={handleClear}
                    disabled={!hasLoop && !isRecording}
                >
                    Clear
                </button>
            </div>

            {savedProjects.length > 0 && (
                <div className="saved-projects-section">
                    <h2>Saved Projects</h2>
                    <div className="projects-list">
                        {savedProjects.map(proj => (
                            <div key={proj._id} className="project-card">
                                <h3>{proj.name}</h3>
                                <div className="project-meta">
                                    <p>Duration: {formatDuration(Math.round(proj.duration))}</p>
                                    <p>Volume: {Math.round(proj.masterVolume * 100)}%</p>
                                    <p>Created: {new Date(proj.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="project-actions">
                                    <button onClick={() => handleLoad(proj)} className="btn-small">Load</button>
                                    <button onClick={() => handleDelete(proj._id)} className="btn-small btn-danger">Delete</button>
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

import { useState, useEffect } from 'react';
import api from '../services/api';
import useAudioRecorder from '../hooks/useAudioRecorder';
import useAudioPlayer from '../hooks/useAudioPlayer';

const Home = () => {
    const [backendStatus, setBackendStatus] = useState('checking');

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
    }, []);

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
                <button disabled className="btn btn-save">Save</button>
                <button disabled className="btn btn-load">Load</button>
                <button
                    className="btn btn-clear"
                    onClick={handleClear}
                    disabled={!hasLoop && !isRecording}
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default Home;

import { useState, useEffect } from 'react';
import api from '../services/api';
import useAudioRecorder from '../hooks/useAudioRecorder';

const Home = () => {
    const [backendStatus, setBackendStatus] = useState('checking');

    const {
        isRecording,
        isPlaying,
        hasRecording,
        microphoneName,
        durationFormatted,
        statusMessage,
        startRecording,
        stopRecording,
        playRecording,
        clearRecording
    } = useAudioRecorder();

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
                    <span className="info-label">Duration:</span>
                    <span className="info-value duration">{durationFormatted}</span>
                </div>
                <div className="info-block">
                    <span className="info-label">Status:</span>
                    <span className={`info-value ${isRecording ? 'recording' : ''}`}>{statusMessage}</span>
                </div>
            </div>

            <div className="controls">
                <button
                    className="btn btn-record"
                    onClick={startRecording}
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
                    onClick={playRecording}
                    disabled={!hasRecording || isRecording || isPlaying}
                >
                    Play
                </button>
                <button disabled className="btn btn-save">Save</button>
                <button disabled className="btn btn-load">Load</button>
                <button
                    className="btn btn-clear"
                    onClick={clearRecording}
                    disabled={(!hasRecording && !isRecording && !isPlaying)}
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default Home;

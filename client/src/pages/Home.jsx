import { useState, useEffect } from 'react';
import api from '../services/api';

const Home = () => {
    const [backendStatus, setBackendStatus] = useState('checking');

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

            <div className="controls">
                <button disabled className="btn btn-record">Record</button>
                <button disabled className="btn btn-stop">Stop</button>
                <button disabled className="btn btn-play">Play</button>
                <button disabled className="btn btn-save">Save</button>
                <button disabled className="btn btn-load">Load</button>
                <button disabled className="btn btn-clear">Clear</button>
            </div>
        </div>
    );
};

export default Home;

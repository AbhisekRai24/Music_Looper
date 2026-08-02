import { useState, useRef, useEffect, useCallback } from 'react';

const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [microphoneName, setMicrophoneName] = useState('');
    const [duration, setDuration] = useState(0);
    const [recorderStatus, setRecorderStatus] = useState('Ready');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInput = devices.find(device => device.kind === 'audioinput' && device.label);
            setMicrophoneName(audioInput ? audioInput.label : 'Default Microphone');

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setRecorderStatus('Recording Complete');

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            // Ensure active blobs are cleared when we start fresh
            setAudioBlob(null);
            mediaRecorder.start();
            setIsRecording(true);
            setRecorderStatus('Recording...');
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setRecorderStatus('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            stopTimer();
        }
    };

    const clearRecording = () => {
        setAudioBlob(null);
        audioChunksRef.current = [];
        setIsRecording(false);
        setDuration(0);
        setRecorderStatus('Ready');
        stopTimer();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            stopTimer();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [stopTimer]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return {
        isRecording,
        audioBlob,
        microphoneName,
        durationFormatted: formatDuration(duration),
        recorderStatus,
        startRecording,
        stopRecording,
        clearRecording,
        formatDuration
    };
};

export default useAudioRecorder;

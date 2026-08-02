import { useState, useRef, useEffect, useCallback } from 'react';

const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasRecording, setHasRecording] = useState(false);
    const [microphoneName, setMicrophoneName] = useState('');
    const [duration, setDuration] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Ready');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioUrlRef = useRef(null);
    const audioRef = useRef(null);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    // Stop timer utility
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

            // Attempt to retrieve descriptive device name
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
                // Build playable object once finished capturing
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioUrlRef.current = URL.createObjectURL(audioBlob);

                setHasRecording(true);
                setStatusMessage('Recording Complete');

                // Shut down microphone access to release system hardware lock
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setStatusMessage('Recording...');
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setStatusMessage('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            stopTimer();
        }
    };

    const playRecording = () => {
        if (!audioUrlRef.current) return;

        setIsPlaying(true);
        setStatusMessage('Playing...');

        const audio = new Audio(audioUrlRef.current);
        audioRef.current = audio;

        audio.onended = () => {
            setIsPlaying(false);
            setStatusMessage('Ready');
        };

        audio.play();
    };

    const clearRecording = () => {
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        audioChunksRef.current = [];

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setHasRecording(false);
        setIsRecording(false);
        setIsPlaying(false);
        setDuration(0);
        setMicrophoneName('');
        setStatusMessage('Ready');
        stopTimer();

        // Safety check just in case recording was suddenly aborted
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    // Prevent memory leaks / hardware lock on unexpected unmounts
    useEffect(() => {
        return () => {
            stopTimer();
            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
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
        isPlaying,
        hasRecording,
        microphoneName,
        durationFormatted: formatDuration(duration),
        statusMessage,
        startRecording,
        stopRecording,
        playRecording,
        clearRecording
    };
};

export default useAudioRecorder;

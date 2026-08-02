import { useState, useRef, useEffect } from 'react';

const useAudioPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [hasLoop, setHasLoop] = useState(false);
    const [volume, setVolume] = useState(0.8);

    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const audioBufferRef = useRef(null);
    const gainNodeRef = useRef(null);

    const getContext = () => {
        if (!audioContextRef.current) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;
            gainNode.connect(ctx.destination);
            gainNodeRef.current = gainNode;
        }
        return audioContextRef.current;
    };

    const load = async (audioBlob) => {
        try {
            clear();
            const context = getContext();

            const arrayBuffer = await audioBlob.arrayBuffer();
            const decodedBuffer = await context.decodeAudioData(arrayBuffer);
            audioBufferRef.current = decodedBuffer;

            setHasLoop(true);
            setIsPlaying(false);
            setIsPaused(false);
        } catch (err) {
            console.error('Error decoding audio for loop playback:', err);
        }
    };

    const play = async () => {
        if (!hasLoop || !audioBufferRef.current) return;
        const context = getContext();

        if (isPaused) {
            await context.resume();
            setIsPlaying(true);
            setIsPaused(false);
            return;
        }

        const source = context.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.loop = true; // Web Audio property ensuring 100% gapless looping
        source.connect(gainNodeRef.current);
        source.start(0);

        sourceNodeRef.current = source;

        if (context.state === 'suspended') {
            await context.resume();
        }

        setIsPlaying(true);
        setIsPaused(false);
    };

    const pause = async () => {
        if (!isPlaying) return;

        const context = getContext();
        if (context.state === 'running') {
            // Suspend completely freezes execution in time, which makes Resume perfect
            await context.suspend();
        }

        setIsPlaying(false);
        setIsPaused(true);
    };

    const stop = async () => {
        const context = getContext();
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        if (context.state === 'suspended') {
            await context.resume();
        }
        setIsPlaying(false);
        setIsPaused(false);
    };

    const clear = () => {
        stop();
        audioBufferRef.current = null;
        setHasLoop(false);
    };

    useEffect(() => {
        return () => {
            clear();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
        };
    }, []);

    const changeVolume = (newVolume) => {
        setVolume(newVolume);
        if (gainNodeRef.current && audioContextRef.current) {
            // Apply volume smoothly to avoid audio artifacts (clicks/pops)
            gainNodeRef.current.gain.setTargetAtTime(newVolume, audioContextRef.current.currentTime, 0.05);
        }
    };

    return {
        isPlaying,
        isPaused,
        hasLoop,
        load,
        play,
        pause,
        stop,
        clear,
        audioBuffer: audioBufferRef.current,
        volume,
        setVolume: changeVolume
    };
};

export default useAudioPlayer;

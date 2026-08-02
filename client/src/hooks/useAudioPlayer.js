import { useState, useRef, useEffect } from 'react';

const useAudioPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [hasLoop, setHasLoop] = useState(false);
    const [volume, setVolume] = useState(0.8);

    const audioContextRef = useRef(null);
    const masterGainNodeRef = useRef(null);
    const layersRef = useRef({});
    const isPlayingRef = useRef(false); // Ref mirror of isPlaying for use inside async callbacks

    const getContext = () => {
        if (!audioContextRef.current) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;

            const masterGain = ctx.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(ctx.destination);
            masterGainNodeRef.current = masterGain;
        }
        return audioContextRef.current;
    };

    const addLayer = async (layerId, audioBlob, layerVolume = 1) => {
        try {
            const context = getContext();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const decodedBuffer = await context.decodeAudioData(arrayBuffer);

            const layerGain = context.createGain();
            layerGain.gain.value = layerVolume;
            layerGain.connect(masterGainNodeRef.current);

            const layerEntry = {
                buffer: decodedBuffer,
                gainNode: layerGain,
                sourceNode: null
            };
            layersRef.current[layerId] = layerEntry;

            console.log(`[addLayer] Added layer id=${layerId}, buffer duration=${decodedBuffer.duration.toFixed(2)}s, total layers=${Object.keys(layersRef.current).length}`);
            console.log(`[addLayer] isPlayingRef.current=${isPlayingRef.current}`);

            // KEY FIX: if audio is already playing, immediately start this new layer
            // so it joins the loop without requiring the user to press Play again.
            if (isPlayingRef.current && context.state === 'running') {
                console.log(`[addLayer] Playback active — auto-starting source for new layer id=${layerId}`);
                const source = context.createBufferSource();
                source.buffer = decodedBuffer;
                source.loop = true;
                source.connect(layerGain);
                source.start(0);
                layerEntry.sourceNode = source;
            }

            setHasLoop(Object.keys(layersRef.current).length > 0);
            return decodedBuffer;
        } catch (err) {
            console.error('Error decoding audio for layer:', err);
            return null;
        }
    };

    const removeLayer = (layerId) => {
        const layer = layersRef.current[layerId];
        if (layer) {
            if (layer.sourceNode) {
                try { layer.sourceNode.stop(); } catch (e) { }
                layer.sourceNode.disconnect();
            }
            if (layer.gainNode) {
                layer.gainNode.disconnect();
            }
            delete layersRef.current[layerId];
            setHasLoop(Object.keys(layersRef.current).length > 0);
        }
    };

    const setLayerVolume = (layerId, newVolume) => {
        const layer = layersRef.current[layerId];
        if (layer && layer.gainNode && audioContextRef.current) {
            // Apply volume smoothly
            layer.gainNode.gain.cancelScheduledValues(audioContextRef.current.currentTime);
            layer.gainNode.gain.setTargetAtTime(newVolume, audioContextRef.current.currentTime, 0.05);
        }
    };

    const play = async () => {
        const layerIds = Object.keys(layersRef.current);
        console.log(`[play] Total layers=${layerIds.length}, ids=[${layerIds.join(', ')}]`);
        if (layerIds.length === 0) return;

        const context = getContext();

        if (isPaused) {
            await context.resume();
            setIsPlaying(true);
            isPlayingRef.current = true;
            setIsPaused(false);
            return;
        }

        layerIds.forEach(id => {
            const layer = layersRef.current[id];
            console.log(`[play] Layer id=${id}, hasBuffer=${!!layer.buffer}, bufferDuration=${layer.buffer ? layer.buffer.duration.toFixed(2) : 'N/A'}`);

            if (layer.sourceNode) {
                try { layer.sourceNode.stop(); } catch (e) { }
                layer.sourceNode.disconnect();
            }

            const source = context.createBufferSource();
            source.buffer = layer.buffer;
            source.loop = true;
            source.connect(layer.gainNode);
            source.start(0);

            layer.sourceNode = source;
        });

        if (context.state === 'suspended') {
            await context.resume();
        }

        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsPaused(false);
    };

    const pause = async () => {
        if (!isPlaying) return;

        const context = getContext();
        if (context.state === 'running') {
            await context.suspend();
        }

        setIsPlaying(false);
        setIsPaused(true);
    };

    const stop = async () => {
        const context = getContext();

        Object.values(layersRef.current).forEach(layer => {
            if (layer.sourceNode) {
                try { layer.sourceNode.stop(); } catch (e) { }
                layer.sourceNode.disconnect();
                layer.sourceNode = null;
            }
        });

        if (context.state === 'suspended') {
            await context.resume();
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsPaused(false);
    };

    const clear = () => {
        stop();
        Object.values(layersRef.current).forEach(layer => {
            if (layer.gainNode) layer.gainNode.disconnect();
        });
        layersRef.current = {};
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
        if (masterGainNodeRef.current && audioContextRef.current) {
            masterGainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
            masterGainNodeRef.current.gain.setTargetAtTime(newVolume, audioContextRef.current.currentTime, 0.05);
        }
    };

    return {
        isPlaying,
        isPaused,
        hasLoop,
        addLayer,
        removeLayer,
        setLayerVolume,
        play,
        pause,
        stop,
        clear,
        volume,
        setVolume: changeVolume
    };
};

export default useAudioPlayer;

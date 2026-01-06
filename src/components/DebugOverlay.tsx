import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type LogEntry = { level: 'log' | 'warn' | 'error'; message: string; ts: number };

const MAX_LOGS = 200;

export const DebugOverlay: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [fps, setFps] = useState(0);
    const [, forceRender] = useState(0);
    const logsRef = useRef<LogEntry[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastFrameRef = useRef<number | null>(null);

    useEffect(() => {
        const original = {
            log: console.log,
            warn: console.warn,
            error: console.error,
        };

        const pushLog = (level: LogEntry['level'], args: any[]) => {
            const message = args.map((a) => {
                if (typeof a === 'string') return a;
                try {
                    return JSON.stringify(a);
                } catch {
                    return String(a);
                }
            }).join(' ');
            logsRef.current = [...logsRef.current.slice(-(MAX_LOGS - 1)), { level, message, ts: Date.now() }];
            // Trigger a light re-render only when panel is visible.
            if (visible) {
                forceRender((v) => v + 1);
            }
        };

        console.log = (...args: any[]) => { pushLog('log', args); original.log(...args); };
        console.warn = (...args: any[]) => { pushLog('warn', args); original.warn(...args); };
        console.error = (...args: any[]) => { pushLog('error', args); original.error(...args); };

        return () => {
            console.log = original.log;
            console.warn = original.warn;
            console.error = original.error;
        };
    }, [visible]);

    useEffect(() => {
        const loop = (timestamp: number) => {
            if (lastFrameRef.current != null) {
                const delta = timestamp - lastFrameRef.current;
                if (delta > 0) {
                    const currentFps = 1000 / delta;
                    // Smooth with simple lerp to reduce jitter.
                    setFps((prev) => prev * 0.8 + currentFps * 0.2);
                }
            }
            lastFrameRef.current = timestamp;
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const copyLogs = async () => {
        const text = logsRef.current.map((l) => {
            const ts = new Date(l.ts).toISOString();
            return `[${ts}][${l.level}] ${l.message}`;
        }).join('\n');

        try {
            const Clipboard = require('expo-clipboard');
            await Clipboard.setStringAsync(text);
        } catch (e) {
            try {
                const { Clipboard } = require('react-native');
                // @ts-ignore
                Clipboard?.setString?.(text);
            } catch {
                console.warn('Clipboard module not available to copy logs.');
            }
        }
    };

    return (
        <View pointerEvents="box-none" style={styles.container}>
            <TouchableOpacity style={styles.toggle} onPress={() => setVisible((v) => !v)}>
                <Ionicons name={visible ? 'eye-off' : 'bug-outline'} size={18} color="#000" />
            </TouchableOpacity>
            {visible && (
                <View style={styles.panel}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Debug</Text>
                        <View style={styles.headerRight}>
                            <Text style={styles.fps}>FPS {fps.toFixed(0)}</Text>
                            <TouchableOpacity onPress={copyLogs} style={styles.copyButton}>
                                <Text style={styles.copyText}>Copy logs</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.logScroll}>
                        {logsRef.current.slice().reverse().map((log, idx) => (
                            <Text key={idx} style={[styles.logText, log.level === 'error' ? styles.error : log.level === 'warn' ? styles.warn : styles.info]}>
                                [{new Date(log.ts).toLocaleTimeString()}] {log.message}
                            </Text>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        pointerEvents: 'box-none',
    },
    toggle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    panel: {
        marginTop: 8,
        width: 320,
        maxHeight: 260,
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 12,
        pointerEvents: 'auto',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fps: {
        color: '#0f0',
        fontWeight: '700',
    },
    copyButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#1e90ff',
    },
    copyText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    logScroll: {
        maxHeight: 200,
    },
    logText: {
        color: '#ddd',
        fontSize: 12,
        marginBottom: 4,
    },
    error: { color: '#ff6b6b' },
    warn: { color: '#ffcc00' },
    info: { color: '#9ad4ff' },
});

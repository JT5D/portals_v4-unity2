/**
 * Selective Firestore Listeners
 * 
 * Optimized real-time subscription patterns for scale:
 * - Only subscribe when content is in view
 * - Automatic unsubscribe on blur/unmount
 * - Connection pooling to prevent excessive listeners
 * - Rate limiting for high-frequency updates
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    DocumentReference,
    QuerySnapshot,
    Unsubscribe,
    onSnapshot,
    DocumentSnapshot,
} from 'firebase/firestore';

// Track active listener count for monitoring
let activeListenerCount = 0;
const MAX_LISTENERS = 50; // Safety limit

/**
 * Get current active listener count (for debugging/monitoring)
 */
export function getActiveListenerCount(): number {
    return activeListenerCount;
}

/**
 * Hook for selective document listening
 * Only subscribes when isActive is true
 */
export function useSelectiveDocListener<T>(
    docRef: DocumentReference | null,
    isActive: boolean,
    options: {
        includeMetadata?: boolean;
        onError?: (error: Error) => void;
    } = {}
): { data: T | null; loading: boolean; error: Error | null } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    useEffect(() => {
        // Clean up previous listener
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
            activeListenerCount--;
        }

        // Only subscribe if active and ref exists
        if (!isActive || !docRef) {
            setLoading(false);
            return;
        }

        // Check listener limit
        if (activeListenerCount >= MAX_LISTENERS) {
            console.warn('[SelectiveListener] Max listener limit reached');
            setError(new Error('Max listener limit reached'));
            setLoading(false);
            return;
        }

        setLoading(true);
        activeListenerCount++;

        const unsubscribe = onSnapshot(
            docRef,
            { includeMetadataChanges: options.includeMetadata ?? false },
            (snapshot: DocumentSnapshot) => {
                if (snapshot.exists()) {
                    setData({ id: snapshot.id, ...snapshot.data() } as T);
                } else {
                    setData(null);
                }
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('[SelectiveListener] Error:', err);
                setError(err as Error);
                setLoading(false);
                options.onError?.(err as Error);
            }
        );

        unsubscribeRef.current = unsubscribe;

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
                activeListenerCount--;
            }
        };
    }, [docRef?.path, isActive]);

    return { data, loading, error };
}

/**
 * Hook for throttled real-time updates
 * Batches updates to reduce re-renders
 */
export function useThrottledListener<T>(
    docRef: DocumentReference | null,
    throttleMs: number = 1000
): { data: T | null; loading: boolean } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const lastUpdateRef = useRef<number>(0);
    const pendingDataRef = useRef<T | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!docRef) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(docRef, (snapshot: DocumentSnapshot) => {
            const now = Date.now();
            const newData = snapshot.exists()
                ? { id: snapshot.id, ...snapshot.data() } as T
                : null;

            if (now - lastUpdateRef.current >= throttleMs) {
                // Enough time has passed, update immediately
                setData(newData);
                lastUpdateRef.current = now;
                setLoading(false);
            } else {
                // Throttle: queue the update
                pendingDataRef.current = newData;

                if (!timeoutRef.current) {
                    timeoutRef.current = setTimeout(() => {
                        if (pendingDataRef.current !== null) {
                            setData(pendingDataRef.current);
                            lastUpdateRef.current = Date.now();
                        }
                        timeoutRef.current = null;
                        setLoading(false);
                    }, throttleMs - (now - lastUpdateRef.current));
                }
            }
        });

        return () => {
            unsubscribe();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [docRef?.path, throttleMs]);

    return { data, loading };
}

/**
 * Hook that only subscribes when component is in viewport
 * Requires IntersectionObserver polyfill on older devices
 */
export function useViewportListener<T>(
    docRef: DocumentReference | null,
    elementRef: React.RefObject<HTMLElement | null>
): { data: T | null; loading: boolean; isInView: boolean } {
    const [isInView, setIsInView] = useState(false);
    const result = useSelectiveDocListener<T>(docRef, isInView);

    useEffect(() => {
        if (!elementRef.current || typeof IntersectionObserver === 'undefined') {
            setIsInView(true); // Fallback to always visible
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                setIsInView(entries[0]?.isIntersecting ?? false);
            },
            { threshold: 0.1 }
        );

        observer.observe(elementRef.current);

        return () => observer.disconnect();
    }, [elementRef.current]);

    return { ...result, isInView };
}

/**
 * Manual subscription control for imperative use
 */
export function createManagedListener<T>(
    docRef: DocumentReference,
    onData: (data: T | null) => void,
    onError?: (error: Error) => void
): { start: () => void; stop: () => void; isListening: () => boolean } {
    let unsubscribe: Unsubscribe | null = null;

    return {
        start: () => {
            if (unsubscribe) return; // Already listening

            if (activeListenerCount >= MAX_LISTENERS) {
                onError?.(new Error('Max listener limit reached'));
                return;
            }

            activeListenerCount++;
            unsubscribe = onSnapshot(
                docRef,
                (snapshot: DocumentSnapshot) => {
                    onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T : null);
                },
                (err) => {
                    onError?.(err as Error);
                }
            );
        },
        stop: () => {
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
                activeListenerCount--;
            }
        },
        isListening: () => unsubscribe !== null,
    };
}

export const SelectiveListeners = {
    useSelectiveDocListener,
    useThrottledListener,
    useViewportListener,
    createManagedListener,
    getActiveListenerCount,
    MAX_LISTENERS,
};

export default SelectiveListeners;

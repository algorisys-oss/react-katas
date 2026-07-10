import { useState, useEffect } from 'react'
import { notifyCompletion, getRemoteProgress, remoteLog } from './skillzengine-bridge'

export function useProgress() {
    // Initialize from localStorage or empty array
    const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('react-katas-progress')
            return saved ? JSON.parse(saved) : []
        } catch (e) {
            console.warn('Failed to parse progress from localStorage', e)
            return []
        }
    })

    // Fetch and sync remote progress on mount
    useEffect(() => {
        let active = true;
        async function syncRemote() {
            remoteLog(`[useProgress] syncRemote started. window.location.search: ${window.location.search}`);
            const remoteCompleted = await getRemoteProgress();
            remoteLog(`[useProgress] syncRemote remoteCompleted: ${JSON.stringify(remoteCompleted)}`);
            if (!active) {
                remoteLog("[useProgress] syncRemote inactive, skipping state update");
                return;
            }
            if (remoteCompleted && Array.isArray(remoteCompleted)) {
                setCompletedLessons((prev) => {
                    remoteLog(`[useProgress] syncRemote prev state: ${JSON.stringify(prev)}`);
                    const combined = Array.from(new Set([...prev, ...remoteCompleted]));
                    remoteLog(`[useProgress] syncRemote combined: ${JSON.stringify(combined)}`);
                    if (combined.length !== prev.length || combined.some(item => !prev.includes(item))) {
                        remoteLog(`[useProgress] Syncing remote progress to state & localStorage: ${JSON.stringify(combined)}`);
                        return combined;
                    }
                    return prev;
                });
            }
        }
        syncRemote();
        return () => {
            active = false;
        };
    }, []);

    // Clear localStorage and state if se_progress parameter is explicitly "0"
    useEffect(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search)
            const seProgress = urlParams.get('se_progress')
            if (seProgress === '0') {
                console.log("[useProgress] se_progress is 0, clearing saved sandbox progress...")
                localStorage.removeItem('react-katas-progress')
                setCompletedLessons([])
            }
        } catch (e) {
            console.error("Failed to clear progress on se_progress=0", e)
        }
    }, [])

    // Persist to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('react-katas-progress', JSON.stringify(completedLessons))
    }, [completedLessons])

    const toggleLessonCompletion = (lessonId: string) => {
        const isCompletedNow = !completedLessons.includes(lessonId);

        setCompletedLessons((prev) => {
            if (isCompletedNow) {
                return [...prev, lessonId];
            } else {
                return prev.filter((id) => id !== lessonId);
            }
        });

        if (isCompletedNow) {
            notifyCompletion(lessonId);
        }
    };

    const isLessonCompleted = (lessonId: string) => {
        return completedLessons.includes(lessonId)
    }

    return {
        completedLessons,
        toggleLessonCompletion,
        isLessonCompleted
    }
}

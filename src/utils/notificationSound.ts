/**
 * Plays a soft notification sound using the Web Audio API.
 * No external file needed — generates a tone programmatically.
 */
export const playMessageSound = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();

        // Create a pleasant two-tone "ping" sound
        const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(880, now, 0.15, 0.3);        // A5 — first ping
        playTone(1100, now + 0.12, 0.2, 0.2); // C#6 — second ping (harmony)

        // Auto-close context after sound plays
        setTimeout(() => ctx.close(), 600);
    } catch (e) {
        // Silently fail if audio is not available
    }
};

/**
 * Requests notification permission from the browser.
 * Call once on app load.
 */
export const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }
};

/**
 * Shows a browser push notification for a new message.
 */
export const showBrowserNotification = (senderName: string, message: string, channelName: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${senderName} in ${channelName}`, {
            body: message,
            icon: "/favicon.ico",
            tag: "chat-message",
            silent: true, // we handle sound ourselves
        });
    }
};

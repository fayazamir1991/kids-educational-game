package com.fayazamir.kidsgarden;

/** One authority for resuming interaction; independent lifecycle callbacks cannot override each other. */
final class InteractionState {
    private boolean foreground;
    private boolean windowFocused;
    private boolean audioFocusGranted;
    private Boolean publishedActive;

    void setForeground(boolean value) { foreground = value; }
    void setWindowFocused(boolean value) { windowFocused = value; }
    void setAudioFocusGranted(boolean value) { audioFocusGranted = value; }
    boolean isForeground() { return foreground; }
    boolean hasAudioFocus() { return audioFocusGranted; }

    boolean isActive() {
        return foreground && windowFocused;
    }

    boolean canPlayAudio() {
        return isActive() && audioFocusGranted;
    }

    Boolean nextTransition() {
        boolean active = isActive();
        if (publishedActive != null && publishedActive == active) return null;
        publishedActive = active;
        return active;
    }
}

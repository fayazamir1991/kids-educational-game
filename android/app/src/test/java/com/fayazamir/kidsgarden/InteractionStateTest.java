package com.fayazamir.kidsgarden;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class InteractionStateTest {
    private InteractionState playing() {
        InteractionState state = new InteractionState();
        state.setForeground(true);
        state.setWindowFocused(true);
        state.setAudioFocusGranted(true);
        assertEquals(Boolean.TRUE, state.nextTransition());
        return state;
    }

    @Test
    public void notificationShadeWindowLossAndGainBalanceWithoutActivityResume() {
        InteractionState state = playing();
        state.setWindowFocused(false);
        assertEquals(Boolean.FALSE, state.nextTransition());
        state.setWindowFocused(true);
        assertEquals(Boolean.TRUE, state.nextTransition());
        assertNull(state.nextTransition());
    }

    @Test
    public void temporaryAudioInterruptionStopsAudioWithoutFreezingVisualAnswers() {
        InteractionState state = playing();
        state.setAudioFocusGranted(false);
        assertFalse(state.canPlayAudio());
        assertTrue(state.isActive());
        assertNull(state.nextTransition());
        state.setWindowFocused(true);
        assertNull(state.nextTransition());
        state.setAudioFocusGranted(true);
        assertTrue(state.canPlayAudio());
        assertNull(state.nextTransition());
    }

    @Test
    public void backgroundAudioGainCannotResumeInteraction() {
        InteractionState state = playing();
        state.setForeground(false);
        state.setAudioFocusGranted(false);
        assertEquals(Boolean.FALSE, state.nextTransition());
        state.setAudioFocusGranted(true);
        assertFalse(state.isActive());
        assertFalse(state.canPlayAudio());
        assertNull(state.nextTransition());
    }

    @Test
    public void activityResumeAfterFocusDenialAllowsVisualPlayButKeepsAudioOff() {
        InteractionState state = playing();
        state.setForeground(false);
        state.setAudioFocusGranted(false);
        state.nextTransition();
        state.setForeground(true);
        state.setWindowFocused(true);
        assertTrue(state.isActive());
        assertFalse(state.canPlayAudio());
        assertEquals(Boolean.TRUE, state.nextTransition());
        state.setAudioFocusGranted(true);
        assertTrue(state.canPlayAudio());
        assertNull(state.nextTransition());
    }

    @Test
    public void parentAuditionInCatalogCanAcquireAudioFocus() {
        InteractionState state = playing();
        state.setAudioFocusGranted(false);
        assertFalse(state.canPlayAudio());
        assertTrue(state.isActive());
        assertNull(state.nextTransition());
        state.setAudioFocusGranted(true);
        assertTrue(state.canPlayAudio());
    }
}

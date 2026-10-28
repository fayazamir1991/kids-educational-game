package com.fayazamir.kidsgarden;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NavigationPolicyTest {
    @Test
    public void bundledRoutesAndAudioAreAvailableOffline() {
        assertTrue(NavigationPolicy.isInternal("https://localhost/#/games/picture"));
        assertTrue(NavigationPolicy.isInternal("https://localhost/audio/cow.mp3?v=abc"));
        assertTrue(NavigationPolicy.isInternal("https://localhost:443/assets/index.js"));
    }

    @Test
    public void childSurfaceRejectsRemoteAndExecutableNavigation() {
        String[] blocked = { "https://example.com", "javascript:alert(1)", "file:///etc/passwd",
            "intent://example.com", "http://localhost", "data:text/html,test",
            "https://localhost.evil.test", "https://user@localhost", "https://localhost:8443" };
        for (String url : blocked) assertFalse(url, NavigationPolicy.isInternal(url));
    }

    @Test
    public void nativeProxyAndDeviceFilesCannotBypassOfflineOrigin() {
        assertFalse(NavigationPolicy.isInternal("https://localhost/_capacitor_http_interceptor_?u=https://example.com"));
        assertFalse(NavigationPolicy.isInternal("https://localhost/_capacitor_file_/etc/passwd"));
        assertFalse(NavigationPolicy.isInternal("https://localhost/%5Fcapacitor_file_/etc/passwd"));
    }

    @Test
    public void parentLinksUseExactHttpsHostsWithoutCredentialsOrCustomPorts() {
        assertTrue(NavigationPolicy.isParentLink("https://creativecommons.org/publicdomain/zero/1.0/"));
        assertTrue(NavigationPolicy.isParentLink("https://fayazamir1991.github.io/kids-educational-game/"));
        assertTrue(NavigationPolicy.isParentLink("https://commons.wikimedia.org/wiki/File:Lion.ogg"));
        assertTrue(NavigationPolicy.isParentLink("https://upload.wikimedia.org/wikipedia/commons/audio.ogg"));
        assertTrue(NavigationPolicy.isParentLink("https://opensource.org/license/mit/"));
        String[] blocked = { "http://creativecommons.org", "https://creativecommons.org.evil.test",
            "https://evil.test", "https://user@github.com", "https://github.com:8443", "javascript:alert(1)" };
        for (String url : blocked) assertFalse(url, NavigationPolicy.isParentLink(url));
    }
}

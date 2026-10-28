package com.fayazamir.kidsgarden;

import java.net.URI;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Pure policy shared by WebView navigation and the explicit parent browser action. */
final class NavigationPolicy {
    private static final Set<String> PARENT_HOSTS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
        "fayazamir1991.github.io", "github.com", "raw.githubusercontent.com",
        "bigsoundbank.com", "www.bigsoundbank.com", "freesound.org", "www.freesound.org",
        "creativecommons.org", "mixkit.co", "www.mixkit.co",
        "commons.wikimedia.org", "upload.wikimedia.org", "opensource.org"
    )));

    private NavigationPolicy() {}

    static boolean isInternal(String value) {
        try {
            URI uri = new URI(value);
            String path = uri.getPath() == null ? "" : uri.getPath();
            return secureOrigin(uri) && "localhost".equalsIgnoreCase(uri.getHost())
                && !path.startsWith("/_capacitor_http_interceptor_")
                && !path.startsWith("/_capacitor_file_");
        } catch (Exception invalid) {
            return false;
        }
    }

    static boolean isParentLink(String value) {
        try {
            URI uri = new URI(value);
            return secureOrigin(uri) && uri.getHost() != null
                && PARENT_HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT));
        } catch (Exception invalid) {
            return false;
        }
    }

    private static boolean secureOrigin(URI uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getRawUserInfo() == null
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }
}

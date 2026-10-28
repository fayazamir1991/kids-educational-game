package com.fayazamir.kidsgarden;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** Offline child surface. Only the explicitly gated plugin can open a browser. */
public class MainActivity extends BridgeActivity {
    private boolean gameActive;
    private boolean webReady;
    private final InteractionState interactionState = new InteractionState();
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KidGardenPlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge == null) return;

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            .setOnAudioFocusChangeListener(change -> {
                runOnUiThread(() -> {
                    interactionState.setAudioFocusGranted(change == AudioManager.AUDIOFOCUS_GAIN
                        && interactionState.isForeground());
                    if (change < 0) emitLifecycle("kidgardenAudioPause");
                    publishInteractionState();
                });
            }).build();

        WebView webView = bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !NavigationPolicy.isInternal(request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !NavigationPolicy.isInternal(url);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!NavigationPolicy.isInternal(request.getUrl().toString())) {
                    byte[] body = "External resources are disabled.".getBytes(StandardCharsets.UTF_8);
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", null,
                        new ByteArrayInputStream(body));
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                webReady = true;
                ViewCompat.requestApplyInsets(view);
                applyWindowMode();
                publishInteractionState();
            }
        });

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.rgb(252, 248, 237));
        getWindow().setNavigationBarColor(Color.rgb(252, 248, 237));
        if (android.os.Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout());
            float density = getResources().getDisplayMetrics().density;
            String css = "const root=document.documentElement;root.dataset.nativeApp='true';"
                + insetProperty("top", insets.top, density)
                + insetProperty("right", insets.right, density)
                + insetProperty("bottom", insets.bottom, density)
                + insetProperty("left", insets.left, density);
            webView.evaluateJavascript("(()=>{" + css + "})()", null);
            return windowInsets;
        });
        applyWindowMode();
    }

    private static String insetProperty(String edge, int pixels, float density) {
        return "root.style.setProperty('--native-safe-" + edge + "','"
            + Math.round(pixels / density) + "px');";
    }

    void setGameMode(boolean active) {
        runOnUiThread(() -> {
            gameActive = active;
            setRequestedOrientation(active ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR);
            if (active) requestAudioFocus(true);
            else abandonGameAudioFocus();
            applyWindowMode();
            publishInteractionState();
        });
    }

    private void applyWindowMode() {
        if (bridge == null) return;
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), bridge.getWebView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (gameActive) controller.hide(WindowInsetsCompat.Type.systemBars());
        else controller.show(WindowInsetsCompat.Type.systemBars());
    }

    boolean requestAudioFocus(boolean mayRequest) {
        if (!interactionState.isActive()) return false;
        if (!mayRequest || interactionState.hasAudioFocus()) return interactionState.canPlayAudio();
        boolean granted = audioManager != null && audioFocusRequest != null
            && audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        interactionState.setAudioFocusGranted(granted);
        return granted;
    }

    private void abandonGameAudioFocus() {
        interactionState.setAudioFocusGranted(false);
        if (audioManager != null && audioFocusRequest != null) audioManager.abandonAudioFocusRequest(audioFocusRequest);
    }

    boolean isInteractionActive() {
        return interactionState.isActive();
    }

    private void publishInteractionState() {
        if (!webReady || bridge == null) return;
        Boolean active = interactionState.nextTransition();
        if (active != null) emitLifecycle(active ? "kidgardenResume" : "kidgardenPause");
    }

    private void emitLifecycle(String event) {
        if (bridge == null) return;
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(
            "window.dispatchEvent(new Event('" + event + "'));", null));
    }

    @Override
    public void onPause() {
        interactionState.setForeground(false);
        abandonGameAudioFocus();
        publishInteractionState();
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        interactionState.setForeground(true);
        applyWindowMode();
        publishInteractionState();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        interactionState.setWindowFocused(hasFocus);
        if (hasFocus) {
            applyWindowMode();
        }
        publishInteractionState();
    }
}

package com.fayazamir.kidsgarden;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KidGarden")
public class KidGardenPlugin extends Plugin {
    @PluginMethod
    public void setGameMode(PluginCall call) {
        ((MainActivity) getActivity()).setGameMode(Boolean.TRUE.equals(call.getBoolean("active", false)));
        call.resolve();
    }

    @PluginMethod
    public void moveToBackground(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity().moveTaskToBack(true);
            call.resolve();
        });
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url", "");
        if (!NavigationPolicy.isParentLink(url)) {
            call.reject("This address is not allowed.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException unavailable) {
                call.reject("No browser is available.");
            }
        });
    }

    @PluginMethod
    public void requestAudioFocus(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            result.put("granted", ((MainActivity) getActivity()).requestAudioFocus(
                Boolean.TRUE.equals(call.getBoolean("request", true))));
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getInteractionState(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject state = new JSObject();
            state.put("active", ((MainActivity) getActivity()).isInteractionActive());
            call.resolve(state);
        });
    }

    @PluginMethod
    public void getBuildInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("applicationId", BuildConfig.APPLICATION_ID);
        result.put("versionName", BuildConfig.VERSION_NAME);
        result.put("versionCode", BuildConfig.VERSION_CODE);
        result.put("debug", BuildConfig.DEBUG);
        result.put("offline", true);
        call.resolve(result);
    }
}

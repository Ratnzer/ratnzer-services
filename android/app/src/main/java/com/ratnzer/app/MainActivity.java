package com.ratnzer.app;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

import io.capawesome.capacitorjs.plugins.firebase.auth.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String PREFS_NAME = "ratnzer_debug_crash";
    private static final String LAST_CRASH_KEY = "last_crash";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        RatnzerStartupDiagnostics.recordStartupMarker(this, "main_activity_onCreate_enter");
        RatnzerStartupDiagnostics.installUncaughtHandler(this, "main_activity");
        RatnzerStartupDiagnostics.forceExportStateSnapshot(this, "main_activity_enter");

        super.onCreate(savedInstanceState);

        installDebugCrashReporter();
        showPreviousCrashIfAny();

        try {
            this.registerPlugin(FirebaseAuthenticationPlugin.class);
            Log.i(TAG, "FirebaseAuthentication plugin registered successfully.");
            RatnzerStartupDiagnostics.recordStartupMarker(this, "firebase_auth_plugin_registered");
        } catch (Throwable error) {
            Log.e(TAG, "FirebaseAuthentication plugin registration failed. App will continue without native social auth.", error);
            RatnzerStartupDiagnostics.recordCrash(this, "Plugin registration failed", error);
            RatnzerStartupDiagnostics.recordStartupMarker(this, "firebase_auth_plugin_registration_failed");
        }

        RatnzerStartupDiagnostics.showPreviousCrashIfAny(this);
        RatnzerStartupDiagnostics.recordStartupMarker(this, "main_activity_onCreate_exit");
    }
}

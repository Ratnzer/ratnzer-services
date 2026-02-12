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
        super.onCreate(savedInstanceState);

        installDebugCrashReporter();
        showPreviousCrashIfAny();

        try {
            this.registerPlugin(FirebaseAuthenticationPlugin.class);
            Log.i(TAG, "FirebaseAuthentication plugin registered successfully.");
        } catch (Throwable error) {
            Log.e(TAG, "FirebaseAuthentication plugin registration failed. App will continue without native social auth.", error);
            saveCrashForDebug("Plugin registration failed", error);
        }
    }

    private void installDebugCrashReporter() {
        if (!BuildConfig.DEBUG) {
            return;
        }

        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            saveCrashForDebug("Uncaught exception on thread: " + thread.getName(), throwable);
            Log.e(TAG, "Uncaught exception captured by debug crash reporter.", throwable);

            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });

        Log.i(TAG, "Debug crash reporter installed.");
    }

    private void saveCrashForDebug(String title, Throwable error) {
        if (!BuildConfig.DEBUG) {
            return;
        }

        String message = title + "\n" + Log.getStackTraceString(error);
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(LAST_CRASH_KEY, message).apply();
    }

    private void showPreviousCrashIfAny() {
        if (!BuildConfig.DEBUG) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String previousCrash = prefs.getString(LAST_CRASH_KEY, null);
        if (previousCrash == null || previousCrash.trim().isEmpty()) {
            return;
        }

        prefs.edit().remove(LAST_CRASH_KEY).apply();

        new Handler(Looper.getMainLooper()).post(() -> {
            new AlertDialog.Builder(this)
                .setTitle("آخر خطأ أثناء الإقلاع (Debug)")
                .setMessage(previousCrash)
                .setCancelable(true)
                .setPositiveButton("حسنًا", null)
                .show();
        });
    }
}

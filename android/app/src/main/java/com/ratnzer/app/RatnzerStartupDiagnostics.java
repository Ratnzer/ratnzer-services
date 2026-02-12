package com.ratnzer.app;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public final class RatnzerStartupDiagnostics {
    private static final String TAG = "StartupDiagnostics";
    private static final String PREFS_NAME = "ratnzer_debug_crash";
    private static final String LAST_CRASH_KEY = "last_crash";
    private static final String STARTUP_TRACE_KEY = "startup_trace";
    private static final String LOG_FILE_NAME = "startup-debug.log";
    private static volatile boolean handlerInstalled = false;

    private RatnzerStartupDiagnostics() {}

    public static void installUncaughtHandler(Context context, String source) {
        if (!BuildConfig.DEBUG || handlerInstalled) {
            return;
        }

        synchronized (RatnzerStartupDiagnostics.class) {
            if (handlerInstalled) {
                return;
            }

            final Context appContext = context == null ? null : context.getApplicationContext();
            final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
            Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
                recordCrash(appContext, "Uncaught exception from " + source + " on thread: " + thread.getName(), throwable);
                Log.e(TAG, "Uncaught exception captured in early startup diagnostics.", throwable);
                appendToDebugFile(appContext, "UNCAUGHT", "source=" + source + " thread=" + thread.getName() + "\n" + Log.getStackTraceString(throwable));
                if (defaultHandler != null) {
                    defaultHandler.uncaughtException(thread, throwable);
                }
            });

            handlerInstalled = true;
            recordStartupMarker(appContext, "uncaught_handler_installed_by_" + source);
            Log.i(TAG, "Debug uncaught exception handler installed by " + source);
            appendToDebugFile(appContext, "HANDLER", "installed_by=" + source);
        }
    }

    public static void recordStartupMarker(Context context, String marker) {
        if (!BuildConfig.DEBUG || context == null) {
            return;
        }

        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String existing = prefs.getString(STARTUP_TRACE_KEY, "");
        long ts = System.currentTimeMillis();
        String next = (existing == null || existing.isEmpty())
            ? (ts + ":" + marker)
            : (existing + "\n" + ts + ":" + marker);

        String[] lines = next.split("\\n");
        int keepFrom = Math.max(0, lines.length - 60);
        StringBuilder sb = new StringBuilder();
        for (int i = keepFrom; i < lines.length; i++) {
            if (sb.length() > 0) sb.append('\n');
            sb.append(lines[i]);
        }

        prefs.edit().putString(STARTUP_TRACE_KEY, sb.toString()).apply();
        appendToDebugFile(context.getApplicationContext(), "MARKER", marker);
    }

    public static void recordCrash(Context context, String title, Throwable error) {
        if (!BuildConfig.DEBUG || context == null) {
            return;
        }

        String message = title + "\n" + Log.getStackTraceString(error);
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(LAST_CRASH_KEY, message).apply();
        appendToDebugFile(context.getApplicationContext(), "CRASH", message);
        Log.e(TAG, "Crash captured and persisted: " + title, error);
    }

    public static void recordMessage(Context context, String category, String message) {
        if (!BuildConfig.DEBUG || context == null) {
            return;
        }
        appendToDebugFile(context.getApplicationContext(), category, message);
        Log.i(TAG, category + ": " + message);
    }

    public static void showPreviousCrashIfAny(Context context) {
        if (!BuildConfig.DEBUG || context == null) {
            return;
        }

        Context appContext = context.getApplicationContext();
        SharedPreferences prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String previousCrash = prefs.getString(LAST_CRASH_KEY, null);
        if (previousCrash == null || previousCrash.trim().isEmpty()) {
            return;
        }

        String startupTrace = prefs.getString(STARTUP_TRACE_KEY, "no startup markers");
        String logFilePath = getLogFilePath(appContext);
        prefs.edit().remove(LAST_CRASH_KEY).apply();

        String fullMessage = previousCrash
            + "\n\n--- Startup Trace ---\n" + startupTrace
            + "\n\n--- Debug Log File ---\n" + logFilePath;

        new Handler(Looper.getMainLooper()).post(() -> new AlertDialog.Builder(context)
            .setTitle("آخر خطأ أثناء الإقلاع (Debug)")
            .setMessage(fullMessage)
            .setCancelable(true)
            .setPositiveButton("حسنًا", null)
            .show());
    }

    public static String getLogFilePath(Context context) {
        if (context == null) return "";
        File file = new File(context.getApplicationContext().getFilesDir(), LOG_FILE_NAME);
        return file.getAbsolutePath();
    }

    private static void appendToDebugFile(Context context, String category, String message) {
        if (!BuildConfig.DEBUG || context == null) {
            return;
        }

        File file = new File(context.getApplicationContext().getFilesDir(), LOG_FILE_NAME);
        String line = System.currentTimeMillis() + " [" + category + "] " + message + "\n";

        FileWriter writer = null;
        try {
            writer = new FileWriter(file, true);
            writer.write(line);
            writer.flush();
        } catch (IOException ioError) {
            Log.e(TAG, "Failed to append debug file log.", ioError);
        } finally {
            if (writer != null) {
                try {
                    writer.close();
                } catch (IOException ignored) {
                    // ignore close error
                }
            }
        }
    }
}

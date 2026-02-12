package com.ratnzer.app;

import android.app.AlertDialog;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;

public final class RatnzerStartupDiagnostics {
    private static final String TAG = "StartupDiagnostics";
    private static final String PREFS_NAME = "ratnzer_debug_crash";
    private static final String LAST_CRASH_KEY = "last_crash";
    private static final String STARTUP_TRACE_KEY = "startup_trace";
    private static final String LOG_FILE_NAME = "startup-debug.log";
    private static final String PUBLIC_SUBDIR = "RatnzerDebug";
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
        int keepFrom = Math.max(0, lines.length - 80);
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
        String internalLogFilePath = getLogFilePath(appContext);
        String exportedPath = getPublicExportHint(appContext);
        prefs.edit().remove(LAST_CRASH_KEY).apply();

        String fullMessage = previousCrash
            + "\n\n--- Startup Trace ---\n" + startupTrace
            + "\n\n--- Internal Debug Log File ---\n" + internalLogFilePath
            + "\n\n--- Public Export ---\n" + exportedPath;

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

        String line = System.currentTimeMillis() + " [" + category + "] " + message + "\n";

        appendToInternalFile(context, line);
        appendToPublicDownloadFile(context, line);
    }

    private static void appendToInternalFile(Context context, String line) {
        File file = new File(context.getApplicationContext().getFilesDir(), LOG_FILE_NAME);
        FileWriter writer = null;
        try {
            writer = new FileWriter(file, true);
            writer.write(line);
            writer.flush();
        } catch (IOException ioError) {
            Log.e(TAG, "Failed to append internal debug file log.", ioError);
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

    private static void appendToPublicDownloadFile(Context context, String line) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appendUsingMediaStore(context, line);
            } else {
                appendUsingLegacyDownloads(line);
            }
        } catch (Throwable error) {
            Log.e(TAG, "Failed writing public debug log export.", error);
        }
    }

    private static void appendUsingMediaStore(Context context, String line) throws IOException {
        ContentResolver resolver = context.getContentResolver();
        Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        Uri uri = findOrCreateMediaStoreEntry(resolver, collection);
        if (uri == null) {
            throw new IOException("Could not create/find MediaStore log entry");
        }

        OutputStream os = null;
        try {
            os = resolver.openOutputStream(uri, "wa");
            if (os == null) {
                throw new IOException("openOutputStream returned null for " + uri);
            }
            os.write(line.getBytes());
            os.flush();
        } finally {
            if (os != null) {
                try {
                    os.close();
                } catch (IOException ignored) {
                    // ignore
                }
            }
        }
    }

    private static Uri findOrCreateMediaStoreEntry(ContentResolver resolver, Uri collection) {
        String relativePath = Environment.DIRECTORY_DOWNLOADS + "/" + PUBLIC_SUBDIR + "/";
        String[] projection = new String[]{MediaStore.Downloads._ID};
        String selection = MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + "=?";
        String[] selectionArgs = new String[]{LOG_FILE_NAME, relativePath};

        Cursor cursor = null;
        try {
            cursor = resolver.query(collection, projection, selection, selectionArgs, null);
            if (cursor != null && cursor.moveToFirst()) {
                long id = cursor.getLong(0);
                return ContentUris.withAppendedId(collection, id);
            }
        } catch (Throwable error) {
            Log.e(TAG, "MediaStore query failed while locating debug log entry.", error);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, LOG_FILE_NAME);
        values.put(MediaStore.Downloads.MIME_TYPE, "text/plain");
        values.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);

        return resolver.insert(collection, values);
    }

    private static void appendUsingLegacyDownloads(String line) throws IOException {
        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File folder = new File(downloads, PUBLIC_SUBDIR);
        if (!folder.exists() && !folder.mkdirs()) {
            throw new IOException("Failed to create folder: " + folder.getAbsolutePath());
        }

        File out = new File(folder, LOG_FILE_NAME);
        FileWriter writer = null;
        try {
            writer = new FileWriter(out, true);
            writer.write(line);
            writer.flush();
        } finally {
            if (writer != null) {
                writer.close();
            }
        }
    }

    public static String getPublicExportHint(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return "Downloads/" + PUBLIC_SUBDIR + "/" + LOG_FILE_NAME;
        }
        return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            + "/" + PUBLIC_SUBDIR + "/" + LOG_FILE_NAME;
    }
}

package com.ratnzer.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;

public class EarlyStartupProvider extends ContentProvider {
    private static final String TAG = "EarlyStartupProvider";

    @Override
    public boolean onCreate() {
        try {
            RatnzerStartupDiagnostics.recordStartupMarker(getContext(), "provider_onCreate_start");
            RatnzerStartupDiagnostics.installUncaughtHandler(getContext(), "provider");
            Log.i(TAG, "Early startup provider initialized.");
            RatnzerStartupDiagnostics.recordStartupMarker(getContext(), "provider_onCreate_done");
        } catch (Throwable error) {
            Log.e(TAG, "Failed during earliest startup provider initialization.", error);
            RatnzerStartupDiagnostics.recordCrash(getContext(), "Provider init failure", error);
        }
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public String getType(Uri uri) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}

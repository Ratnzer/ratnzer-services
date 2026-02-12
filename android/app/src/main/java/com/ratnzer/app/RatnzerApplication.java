package com.ratnzer.app;

import android.app.Application;
import android.content.Context;
import android.util.Log;

public class RatnzerApplication extends Application {
    private static final String TAG = "RatnzerApplication";

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        try {
            RatnzerStartupDiagnostics.recordStartupMarker(base, "application_attachBaseContext_start");
            RatnzerStartupDiagnostics.installUncaughtHandler(base, "application_attachBaseContext");
            RatnzerStartupDiagnostics.recordStartupMarker(base, "application_attachBaseContext_done");
        } catch (Throwable error) {
            Log.e(TAG, "Failure during attachBaseContext.", error);
            RatnzerStartupDiagnostics.recordCrash(base, "Application attachBaseContext failure", error);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            RatnzerStartupDiagnostics.recordStartupMarker(this, "application_onCreate_start");
            RatnzerStartupDiagnostics.installUncaughtHandler(this, "application_onCreate");
            RatnzerStartupDiagnostics.recordStartupMarker(this, "application_onCreate_done");
            Log.i(TAG, "Application onCreate diagnostics complete.");
        } catch (Throwable error) {
            Log.e(TAG, "Failure during Application onCreate.", error);
            RatnzerStartupDiagnostics.recordCrash(this, "Application onCreate failure", error);
        }
    }
}

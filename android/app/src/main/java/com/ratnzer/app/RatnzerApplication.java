package com.ratnzer.app;

import android.app.Application;
import android.content.Context;
import android.os.Build;
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
            logRuntimeBootstrapInfo();
            verifyCriticalStartupClasses();
            RatnzerStartupDiagnostics.recordStartupMarker(this, "application_onCreate_done");
            Log.i(TAG, "Application onCreate diagnostics complete.");
        } catch (Throwable error) {
            Log.e(TAG, "Failure during Application onCreate.", error);
            RatnzerStartupDiagnostics.recordCrash(this, "Application onCreate failure", error);
        }
    }

    private void logRuntimeBootstrapInfo() {
        String msg = "manufacturer=" + Build.MANUFACTURER
            + ", model=" + Build.MODEL
            + ", sdk=" + Build.VERSION.SDK_INT
            + ", release=" + Build.VERSION.RELEASE;
        RatnzerStartupDiagnostics.recordMessage(this, "BOOTSTRAP", msg);
    }

    private void verifyCriticalStartupClasses() {
        checkClass("com.getcapacitor.BridgeActivity");
        checkClass("com.google.firebase.FirebaseApp");
    }

    private void checkClass(String className) {
        try {
            Class.forName(className);
            RatnzerStartupDiagnostics.recordMessage(this, "CLASS_OK", className);
        } catch (Throwable error) {
            RatnzerStartupDiagnostics.recordCrash(this, "Critical class missing/failing: " + className, error);
        }
    }
}

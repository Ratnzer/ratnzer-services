package com.ratnzer.app;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        RatnzerStartupDiagnostics.recordStartupMarker(this, "main_activity_onCreate_enter");
        RatnzerStartupDiagnostics.installUncaughtHandler(this, "main_activity");
        RatnzerStartupDiagnostics.forceExportStateSnapshot(this, "main_activity_enter");

        super.onCreate(savedInstanceState);

        RatnzerStartupDiagnostics.showPreviousCrashIfAny(this);
        RatnzerStartupDiagnostics.recordStartupMarker(this, "main_activity_onCreate_exit");
    }
}

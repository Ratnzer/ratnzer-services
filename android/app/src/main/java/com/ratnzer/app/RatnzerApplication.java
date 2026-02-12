package com.ratnzer.app;

import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.util.Log;

public class RatnzerApplication extends Application {
    private static final String TAG = "RatnzerApplication";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Application onCreate.");
    }
}

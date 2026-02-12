package com.ratnzer.app;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

import io.capawesome.capacitorjs.plugins.firebase.auth.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            this.registerPlugin(FirebaseAuthenticationPlugin.class);
        } catch (Throwable error) {
            Log.e(TAG, "FirebaseAuthentication plugin registration failed. App will continue without native social auth.", error);
        }
    }
}

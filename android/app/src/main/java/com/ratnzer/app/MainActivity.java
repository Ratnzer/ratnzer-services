package com.ratnzer.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Capacitor 6 handles plugin registration automatically.
        // Manual registration of FirebaseAuthenticationPlugin is removed to prevent startup crashes.
    }
}

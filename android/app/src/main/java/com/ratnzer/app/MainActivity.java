package com.ratnzer.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerBase();
        super.onCreate(savedInstanceState);
    }

    private void registerBase() {
        // يتم تسجيل الإضافات تلقائياً في Capacitor 6
    }
}

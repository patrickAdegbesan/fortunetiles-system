package com.fortunetiles.inventory;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom plugins must be registered before the bridge starts.
        registerPlugin(NexgoPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

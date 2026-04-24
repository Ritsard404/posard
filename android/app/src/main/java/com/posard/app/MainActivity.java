package com.posard.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.posard.app.plugins.SunmiPrinterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SunmiPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

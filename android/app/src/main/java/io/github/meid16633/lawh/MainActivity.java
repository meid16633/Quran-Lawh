package io.github.meid16633.lawh;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LawhWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

package io.github.meid16633.lawh;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the web app hand the home-screen widget its texts. */
@CapacitorPlugin(name = "LawhWidget")
public class LawhWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("missing data");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(LawhWidget.PREFS, Context.MODE_PRIVATE).edit().putString(LawhWidget.KEY, data).apply();
        LawhWidget.refreshAll(context);
        call.resolve();
    }
}

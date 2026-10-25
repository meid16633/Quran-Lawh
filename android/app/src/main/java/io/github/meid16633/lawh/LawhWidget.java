package io.github.meid16633.lawh;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Home-screen widget: today's wird and the ayah of the day. The app writes the texts for the coming days (see
 * src/lib/widget.ts), so the widget stays current for a while without the app being opened.
 */
public class LawhWidget extends AppWidgetProvider {

    static final String PREFS = "lawh_widget";
    static final String KEY = "data";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, views(context));
        }
    }

    /** Redraws every placed widget after the app saved new texts. */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, LawhWidget.class));
        for (int id : ids) {
            manager.updateAppWidget(id, views(context));
        }
    }

    /** Whole days since 1970-01-01 in local time, as dayNumber() in src/lib/dates.ts. */
    static long today() {
        long now = System.currentTimeMillis();
        return (now + TimeZone.getDefault().getOffset(now)) / 86_400_000L;
    }

    static RemoteViews views(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_lawh);
        JSONObject entry = entryFor(context, today());
        if (entry != null) {
            views.setTextViewText(R.id.widget_line, entry.optString("line"));
            setOptional(views, R.id.widget_sub, entry.optString("sub"));
            int percent = entry.optInt("percent", -1);
            views.setViewVisibility(R.id.widget_progress, percent >= 0 ? View.VISIBLE : View.GONE);
            if (percent >= 0) views.setProgressBar(R.id.widget_progress, 100, percent, false);
            setOptional(views, R.id.widget_ayah, entry.optString("ayah"));
            setOptional(views, R.id.widget_ref, entry.optString("ref"));
            int ayah = entry.optInt("ayahIndex", -1);
            if (ayah >= 0) views.setOnClickPendingIntent(R.id.widget_ayah_box, open(context, "lawh://ayah/" + ayah, 2));
        }
        views.setOnClickPendingIntent(R.id.widget_wird, open(context, "lawh://wird", 1));
        return views;
    }

    private static void setOptional(RemoteViews views, int id, String text) {
        views.setTextViewText(id, text);
        views.setViewVisibility(id, text.isEmpty() ? View.GONE : View.VISIBLE);
    }

    /** Opens the app on a lawh:// link, which the web app routes (App plugin "appUrlOpen"). */
    private static PendingIntent open(Context context, String uri, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri), context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Today's entry, or the last one written before today when the app has not been opened for a long time. */
    private static JSONObject entryFor(Context context, long day) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (raw == null) return null;
        try {
            JSONArray days = new JSONObject(raw).getJSONArray("days");
            JSONObject last = null;
            for (int i = 0; i < days.length(); i++) {
                JSONObject entry = days.getJSONObject(i);
                long d = entry.getLong("day");
                if (d == day) return entry;
                if (d < day) last = entry;
            }
            return last;
        } catch (JSONException e) {
            return null;
        }
    }
}

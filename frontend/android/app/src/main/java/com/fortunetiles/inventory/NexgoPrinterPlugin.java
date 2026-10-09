package com.fortunetiles.inventory;

import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import dalvik.system.DexClassLoader;

/**
 * Prints to the built-in thermal printer of NEXGO / XGD terminals (e.g. the N86).
 *
 * The terminal ships a vendor library ("Ddi", package com.xinguodu.ddiinterface) inside its system app
 * com.xgd.smartpos, backed by the native library libxgd_ddi_jni.so. We load that class at run time
 * (exactly as the terminal's own test app and the other POS apps on it do) so nothing vendor-specific
 * has to be bundled. The receipt is drawn as an image, so any text (including the Naira sign) prints.
 */
@CapacitorPlugin(name = "NexgoPrinter")
public class NexgoPrinterPlugin extends Plugin {
    private static final String TAG = "NexgoPrinter";
    private static final String DDI_PACKAGE = "com.xgd.smartpos";
    private static final String DDI_CLASS = "com.xinguodu.ddiinterface.Ddi";
    private static final int DEFAULT_WIDTH_DOTS = 384;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private Class<?> ddi;
    private boolean sysInitDone = false;

    // ---------------------------------------------------------------- JS API

    /** Reports whether the vendor printer library can be loaded on this device. */
    @PluginMethod
    public void status(final PluginCall call) {
        executor.execute(() -> {
            JSObject out = new JSObject();
            try {
                loadDdi();
                out.put("available", true);
                int open = callInt("ddi_thmprn_open");
                int st = open == 0 ? callInt("ddi_thmprn_get_status") : open;
                if (open == 0) callInt("ddi_thmprn_close");
                out.put("openCode", open);
                out.put("statusCode", st);
                call.resolve(out);
            } catch (Throwable t) {
                Log.e(TAG, "status failed", t);
                out.put("available", false);
                out.put("error", describe(t));
                call.resolve(out);
            }
        });
    }

    /**
     * Prints a job described as an array of items:
     *   {type:"text", text, align:"left|center|right", size:"small|normal|large", bold:bool}
     *   {type:"row", left, right, bold, size}      (two columns on one line)
     *   {type:"line"}                              (dashed rule)
     *   {type:"space", px}                         (blank space)
     *   {type:"image", data:"<base64 png/jpg>"}    (centered, scaled to paper width)
     */
    @PluginMethod
    public void print(final PluginCall call) {
        final JSArray items = call.getArray("items");
        final int width = call.getInt("width", DEFAULT_WIDTH_DOTS);
        final int feed = call.getInt("feed", 120);
        if (items == null || items.length() == 0) {
            call.reject("Nothing to print");
            return;
        }
        executor.execute(() -> {
            try {
                Bitmap bmp = render(items, width);
                byte[] bmpBytes = toMonochromeBmp(bmp);
                if (Boolean.TRUE.equals(call.getBoolean("dump", false))) {
                    // Diagnostic: keep a copy of exactly what is sent to the printer (adb pull from app files).
                    try {
                        File dir = getContext().getExternalFilesDir(null);
                        java.io.FileOutputStream fos = new java.io.FileOutputStream(new File(dir, "last-print.bmp"));
                        fos.write(bmpBytes);
                        fos.close();
                    } catch (Exception e) { Log.w(TAG, "dump failed", e); }
                }
                loadDdi();
                int open = callInt("ddi_thmprn_open");
                if (open != 0) {
                    call.reject("Could not open the printer (code " + open + ")");
                    return;
                }
                try {
                    // Same settings the terminal's own TestPrint uses.
                    callInt("ddi_thmprn_ioctl", 1, 1, 0);
                    callInt("ddi_thmprn_ioctl", 3, 0, 0);
                    int rc = callByteArrayInt("ddi_thmprn_print_oneBitBMPImageByBuffer", bmpBytes, bmpBytes.length);
                    // The call returns while the head is still printing (status 2 = busy, 3 = idle); closing the
                    // printer at that point throws away the rest of the receipt, so wait for it to finish first.
                    waitWhileBusy(bmp.getHeight());
                    callInt("ddi_thmprn_feed_paper", feed);
                    waitWhileBusy(feed);
                    int st = callInt("ddi_thmprn_get_status");
                    JSObject out = new JSObject();
                    out.put("ok", rc == 0);
                    out.put("printCode", rc);
                    out.put("statusCode", st);
                    out.put("widthDots", bmp.getWidth());
                    out.put("heightDots", bmp.getHeight());
                    if (rc == 0) call.resolve(out);
                    else call.reject("The printer reported an error (code " + rc + ", status " + st + ")", String.valueOf(rc), out);
                } finally {
                    callInt("ddi_thmprn_close");
                }
            } catch (Throwable t) {
                Log.e(TAG, "print failed", t);
                call.reject(describe(t));
            }
        });
    }

    /** Plain-text fallback that mirrors the terminal's own TestPrint (GB2312 text, built-in font). */
    @PluginMethod
    public void printText(final PluginCall call) {
        final String text = call.getString("text", "");
        if (text.isEmpty()) { call.reject("Nothing to print"); return; }
        executor.execute(() -> {
            try {
                loadDdi();
                Class<?> ctrlCls = Class.forName("com.xinguodu.ddiinterface.struct.StrPrnTextCtrl", true, ddi.getClassLoader());
                Object ctrl = ctrlCls.getConstructor().newInstance();
                ctrlCls.getMethod("setOffset", int.class).invoke(ctrl, 0);
                ctrlCls.getMethod("setAlign", int.class).invoke(ctrl, 0);
                ctrlCls.getMethod("setAscsize", int.class).invoke(ctrl, 6);
                ctrlCls.getMethod("setAsczoom", int.class).invoke(ctrl, 0);
                ctrlCls.getMethod("setNativesize", int.class).invoke(ctrl, 0);
                ctrlCls.getMethod("setNativezoom", int.class).invoke(ctrl, 0);
                ctrlCls.getMethod("setFont", int.class).invoke(ctrl, 2);
                byte[] data = (text + "\n").getBytes("GB2312");
                int open = callInt("ddi_thmprn_open");
                if (open != 0) { call.reject("Could not open the printer (code " + open + ")"); return; }
                try {
                    callInt("ddi_thmprn_ioctl", 1, 1, 0);
                    callInt("ddi_thmprn_ioctl", 3, 0, 0);
                    Method m = ddi.getMethod("ddi_thmprn_print_text", ctrlCls, byte[].class);
                    int rc = ((Number) m.invoke(null, ctrl, data)).intValue();
                    int st = callInt("ddi_thmprn_get_status");
                    callInt("ddi_thmprn_feed_paper", 120);
                    JSObject out = new JSObject();
                    out.put("ok", rc == 0);
                    out.put("printCode", rc);
                    out.put("statusCode", st);
                    if (rc == 0) call.resolve(out);
                    else call.reject("The printer reported an error (code " + rc + ", status " + st + ")", String.valueOf(rc), out);
                } finally {
                    callInt("ddi_thmprn_close");
                }
            } catch (Throwable t) {
                Log.e(TAG, "printText failed", t);
                call.reject(describe(t));
            }
        });
    }

    // ------------------------------------------------------- vendor library

    private synchronized void loadDdi() throws Exception {
        if (ddi == null) {
            ApplicationInfo ai = getContext().getPackageManager().getApplicationInfo(DDI_PACKAGE, 0);
            File opt = new File(getContext().getCodeCacheDir(), "ddi_dex");
            if (!opt.exists() && !opt.mkdirs()) throw new IllegalStateException("Cannot create " + opt);
            DexClassLoader loader = new DexClassLoader(ai.sourceDir, opt.getAbsolutePath(), ai.nativeLibraryDir,
                    getContext().getClassLoader());
            ddi = Class.forName(DDI_CLASS, true, loader);
            Log.i(TAG, "Ddi loaded from " + ai.sourceDir);
        }
        if (!sysInitDone) {
            ddi.getMethod("ddi_ddi_sys_init").invoke(null);
            sysInitDone = true;
        }
    }

    /** Blocks until the printer stops reporting "busy" (status 2), up to a limit based on the job size. */
    private void waitWhileBusy(int dots) throws Exception {
        long limit = System.currentTimeMillis() + 4000 + dots * 12L;
        Thread.sleep(150); // let the head start before asking
        while (System.currentTimeMillis() < limit) {
            int st = callInt("ddi_thmprn_get_status");
            if (st != 2) return;
            Thread.sleep(60);
        }
        Log.w(TAG, "printer still busy after waiting");
    }

    private int callInt(String name, int... args) throws Exception {
        Class<?>[] types = new Class<?>[args.length];
        Object[] values = new Object[args.length];
        for (int i = 0; i < args.length; i++) { types[i] = int.class; values[i] = args[i]; }
        Method m = ddi.getMethod(name, types);
        return ((Number) m.invoke(null, values)).intValue();
    }

    private int callByteArrayInt(String name, byte[] data, int len) throws Exception {
        Method m = ddi.getMethod(name, byte[].class, int.class);
        return ((Number) m.invoke(null, data, len)).intValue();
    }

    private static String describe(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null) root = root.getCause();
        return root.getClass().getSimpleName() + ": " + root.getMessage();
    }

    // ------------------------------------------------------------ rendering

    private static final class Block {
        final int height;
        final Painter painter;
        Block(int height, Painter painter) { this.height = height; this.painter = painter; }
    }

    private interface Painter { void paint(Canvas canvas, int top); }

    private Bitmap render(JSONArray items, int width) throws JSONException {
        List<Block> blocks = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            String type = item.optString("type", "text");
            switch (type) {
                case "line": blocks.add(lineBlock(width)); break;
                case "space": blocks.add(new Block(Math.max(0, item.optInt("px", 8)), (c, t) -> {})); break;
                case "row": blocks.add(rowBlock(item, width)); break;
                case "image": {
                    Block b = imageBlock(item, width);
                    if (b != null) blocks.add(b);
                    break;
                }
                default: blocks.add(textBlock(item, width)); break;
            }
        }
        int total = 8;
        for (Block b : blocks) total += b.height;
        total += 8;
        Bitmap bmp = Bitmap.createBitmap(width, total, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        canvas.drawColor(Color.WHITE);
        int y = 8;
        for (Block b : blocks) {
            b.painter.paint(canvas, y);
            y += b.height;
        }
        return bmp;
    }

    private static float sizeFor(String size) {
        switch (size == null ? "normal" : size) {
            case "small": return 20f;
            case "large": return 34f;
            case "xlarge": return 44f;
            default: return 24f;
        }
    }

    private static TextPaint paint(String size, boolean bold) {
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Color.BLACK);
        p.setTextSize(sizeFor(size));
        p.setTypeface(bold ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        return p;
    }

    private static Layout.Alignment align(String a) {
        if ("center".equals(a)) return Layout.Alignment.ALIGN_CENTER;
        if ("right".equals(a)) return Layout.Alignment.ALIGN_OPPOSITE;
        return Layout.Alignment.ALIGN_NORMAL;
    }

    private static StaticLayout layout(String text, TextPaint p, int w, Layout.Alignment a) {
        return StaticLayout.Builder.obtain(text, 0, text.length(), p, Math.max(1, w))
                .setAlignment(a).setLineSpacing(2f, 1f).setIncludePad(false).build();
    }

    private Block textBlock(JSONObject item, int width) {
        String text = item.optString("text", "");
        final StaticLayout sl = layout(text.isEmpty() ? " " : text,
                paint(item.optString("size"), item.optBoolean("bold")), width, align(item.optString("align")));
        return new Block(sl.getHeight() + 4, (c, top) -> {
            c.save();
            c.translate(0, top);
            sl.draw(c);
            c.restore();
        });
    }

    private Block rowBlock(JSONObject item, int width) {
        String left = item.optString("left", "");
        String right = item.optString("right", "");
        TextPaint p = paint(item.optString("size"), item.optBoolean("bold"));
        int rightW = right.isEmpty() ? 0 : (int) Math.ceil(p.measureText(right));
        int gap = 10;
        int leftW = Math.max(40, width - rightW - gap);
        final StaticLayout l = layout(left.isEmpty() ? " " : left, p, leftW, Layout.Alignment.ALIGN_NORMAL);
        final StaticLayout r = layout(right.isEmpty() ? " " : right, p, Math.max(1, rightW), Layout.Alignment.ALIGN_OPPOSITE);
        final int rw = rightW;
        return new Block(Math.max(l.getHeight(), r.getHeight()) + 4, (c, top) -> {
            c.save();
            c.translate(0, top);
            l.draw(c);
            c.restore();
            c.save();
            c.translate(width - rw, top);
            r.draw(c);
            c.restore();
        });
    }

    private Block lineBlock(final int width) {
        return new Block(12, (c, top) -> {
            Paint p = new Paint();
            p.setColor(Color.BLACK);
            p.setStrokeWidth(2f);
            p.setPathEffect(new DashPathEffect(new float[]{8f, 6f}, 0f));
            c.drawLine(0, top + 6, width, top + 6, p);
        });
    }

    private Block imageBlock(JSONObject item, int width) {
        try {
            String data = item.optString("data", "");
            int comma = data.indexOf(',');
            if (comma >= 0) data = data.substring(comma + 1);
            byte[] raw = Base64.decode(data, Base64.DEFAULT);
            Bitmap src = android.graphics.BitmapFactory.decodeByteArray(raw, 0, raw.length);
            if (src == null) return null;
            int maxW = item.optInt("maxWidth", width);
            float scale = Math.min(1f, (float) Math.min(maxW, width) / src.getWidth());
            final Bitmap scaled = Bitmap.createScaledBitmap(src, Math.max(1, Math.round(src.getWidth() * scale)),
                    Math.max(1, Math.round(src.getHeight() * scale)), true);
            return new Block(scaled.getHeight() + 6, (c, top) -> c.drawBitmap(scaled, (width - scaled.getWidth()) / 2f, top, null));
        } catch (Exception e) {
            Log.w(TAG, "image skipped", e);
            return null;
        }
    }

    // ----------------------------------------------------------- 1-bit BMP

    /**
     * Encodes the bitmap as a 1-bit-per-pixel BMP in exactly the layout the terminal's own sample code
     * (BitmapToBmp3) produces, which is what the printer driver accepts: the height is padded up to a
     * multiple of 8 with white rows (the printer works in bands of 8 dots), the palette is opaque
     * black/white, rows are stored bottom-up and a pixel is white when its average brightness is above 156.
     */
    static byte[] toMonochromeBmp(Bitmap bmp) {
        int w = bmp.getWidth();
        int h = bmp.getHeight();
        int paddedH = ((h + 7) >> 3) << 3;
        int rowBytes = ((w + 31) & ~31) >> 3;
        int imageSize = rowBytes * paddedH;
        int dataOffset = 62;
        ByteArrayOutputStream out = new ByteArrayOutputStream(dataOffset + imageSize);
        writeShort(out, 0x4D42);
        writeInt(out, dataOffset + imageSize);
        writeShort(out, 0);
        writeShort(out, 0);
        writeInt(out, dataOffset);
        writeInt(out, 40);
        writeInt(out, w);
        writeInt(out, paddedH);
        writeShort(out, 1);
        writeShort(out, 1);
        writeInt(out, 0);
        writeInt(out, imageSize);
        writeInt(out, 0);
        writeInt(out, 0);
        writeInt(out, 0);
        writeInt(out, 0);
        writeInt(out, 0xFF000000); // palette 0 = black
        writeInt(out, 0xFFFFFFFF); // palette 1 = white
        byte[] white = new byte[rowBytes];
        java.util.Arrays.fill(white, (byte) 0xFF);
        for (int i = 0; i < paddedH - h; i++) out.write(white, 0, rowBytes); // padding rows (bottom of the picture)
        int[] px = new int[w];
        byte[] row = new byte[rowBytes];
        for (int y = h - 1; y >= 0; y--) { // bottom-up
            bmp.getPixels(px, 0, w, 0, y, w, 1);
            java.util.Arrays.fill(row, (byte) 0);
            for (int x = 0; x < w; x++) {
                int c = px[x];
                int avg = (Color.red(c) + Color.green(c) + Color.blue(c)) / 3;
                if (avg > 156) row[x >> 3] |= (byte) (0x80 >> (x & 7));
            }
            out.write(row, 0, rowBytes);
        }
        return out.toByteArray();
    }

    private static void writeShort(ByteArrayOutputStream o, int v) { o.write(v & 0xFF); o.write((v >> 8) & 0xFF); }
    private static void writeInt(ByteArrayOutputStream o, int v) {
        o.write(v & 0xFF); o.write((v >> 8) & 0xFF); o.write((v >> 16) & 0xFF); o.write((v >> 24) & 0xFF);
    }
}

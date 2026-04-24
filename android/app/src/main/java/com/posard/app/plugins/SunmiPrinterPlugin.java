package com.posard.app.plugins;

import android.os.Build;
import android.os.RemoteException;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.InnerResultCallback;
import com.sunmi.peripheral.printer.SunmiPrinterService;
import java.util.Locale;
import org.json.JSONArray;

@CapacitorPlugin(name = "SunmiPrinter")
public class SunmiPrinterPlugin extends Plugin {
    private static final String TAG = "SunmiPrinterPlugin";
    private SunmiPrinterService printerService;
    private boolean bindAttempted;

    private final InnerPrinterCallback printerCallback = new InnerPrinterCallback() {
        @Override
        protected void onConnected(SunmiPrinterService service) {
            printerService = service;
        }

        @Override
        protected void onDisconnected() {
            printerService = null;
            bindAttempted = false;
        }
    };

    @Override
    public void load() {
        super.load();
        ensureBound();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        unbindPrinterService();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureBound();

        JSObject result = new JSObject();
        result.put("available", hasUsablePrinter());
        result.put("connected", printerService != null);
        result.put("model", Build.MODEL);
        call.resolve(result);
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        ensureBound();

        if (printerService == null) {
            call.reject("SUNMI printer service is not connected on this Android device.");
            return;
        }

        try {
            JSObject result = new JSObject();
            result.put("model", Build.MODEL);
            result.put("printerType", "sunmi-built-in");
            result.put("printerModel", safeString(printerService.getPrinterModal()));
            result.put("printerVersion", safeString(printerService.getPrinterVersion()));
            result.put("printerSerialNo", safeString(printerService.getPrinterSerialNo()));
            result.put("serviceVersion", safeString(printerService.getServiceVersion()));
            result.put("paperWidth", normalizePaperWidth(printerService.getPrinterPaper()));
            result.put("statusCode", printerService.updatePrinterState());
            call.resolve(result);
        } catch (Exception error) {
            call.reject(toMessage(error, "Unable to query SUNMI printer information."));
        }
    }

    @PluginMethod
    public void printText(PluginCall call) {
        ensureBound();

        String content = call.getString("content");
        if (content == null || content.trim().isEmpty()) {
            call.reject("Printer content is required.");
            return;
        }

        if (printerService == null) {
            call.reject("SUNMI printer service is not connected on this Android device.");
            return;
        }

        try {
            printerService.printerInit(null);
            printerService.printOriginalText(ensureTrailingFeed(content), new ResultCallback(call));
        } catch (Exception error) {
            call.reject(toMessage(error, "SUNMI print failed."));
        }
    }

    @PluginMethod
    public void printReceipt(PluginCall call) {
        ensureBound();

        if (printerService == null) {
            call.reject("SUNMI printer service is not connected on this Android device.");
            return;
        }

        JSONArray segments = call.getArray("segments");
        if (segments == null || segments.length() == 0) {
            call.reject("Receipt print segments are required.");
            return;
        }

        try {
            printerService.printerInit(null);

            int printedCount = 0;
            for (int index = 0; index < segments.length(); index += 1) {
                String segment = segments.optString(index, null);

                if (segment == null || segment.trim().isEmpty()) {
                    continue;
                }

                String suffix = index < segments.length() - 1 ? "\n\n\n\n" : "\n\n\n";
                printerService.printOriginalText(normalizeSegment(segment) + suffix, null);
                printedCount += 1;
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("segmentsPrinted", printedCount);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(toMessage(error, "SUNMI receipt print failed."));
        }
    }

    @PluginMethod
    public void testPrint(PluginCall call) {
        ensureBound();

        if (printerService == null) {
            call.reject("SUNMI printer service is not connected on this Android device.");
            return;
        }

        try {
            printerService.printerInit(null);
            printerService.printerSelfChecking(new ResultCallback(call));
        } catch (Exception error) {
            call.reject(toMessage(error, "SUNMI self-test failed."));
        }
    }

    private void ensureBound() {
        if (printerService != null || bindAttempted) {
            return;
        }

        try {
            bindAttempted = true;
            boolean result =
                InnerPrinterManager.getInstance().bindService(getContext(), printerCallback);

            if (!result) {
                bindAttempted = false;
            }
        } catch (InnerPrinterException error) {
            bindAttempted = false;
            Log.w(TAG, "Unable to bind SUNMI printer service", error);
        }
    }

    private void unbindPrinterService() {
        if (!bindAttempted) {
            return;
        }

        try {
            InnerPrinterManager.getInstance().unBindService(getContext(), printerCallback);
        } catch (InnerPrinterException error) {
            Log.w(TAG, "Unable to unbind SUNMI printer service", error);
        } finally {
            bindAttempted = false;
            printerService = null;
        }
    }

    private boolean hasUsablePrinter() {
        if (printerService == null) {
            return false;
        }

        try {
            String printerModel = safeString(printerService.getPrinterModal());

            if (!printerModel.isEmpty()) {
                return true;
            }

            int status = printerService.updatePrinterState();
            return status != 505;
        } catch (Exception error) {
            return false;
        }
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeSegment(String value) {
        return value.replace("\r\n", "\n").trim();
    }

    private String ensureTrailingFeed(String value) {
        return normalizeSegment(value) + "\n\n\n";
    }

    private String normalizePaperWidth(int code) {
        if (code == 1) {
            return "58mm";
        }

        if (code == 2) {
            return "80mm";
        }

        return String.format(Locale.US, "unknown-%d", code);
    }

    private String toMessage(Exception error, String fallback) {
        if (error instanceof RemoteException && error.getMessage() != null && !error.getMessage().trim().isEmpty()) {
            return error.getMessage();
        }

        String message = error.getMessage();
        return message == null || message.trim().isEmpty() ? fallback : message;
    }

    private static class ResultCallback extends InnerResultCallback {
        private final PluginCall call;
        private boolean resolved;

        ResultCallback(PluginCall call) {
            this.call = call;
        }

        @Override
        public void onRunResult(boolean isSuccess) throws RemoteException {
            if (resolved) {
                return;
            }

            if (isSuccess) {
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
                resolved = true;
            }
        }

        @Override
        public void onReturnString(String result) throws RemoteException {
            if (resolved) {
                return;
            }

            JSObject payload = new JSObject();
            payload.put("success", true);
            payload.put("value", result);
            call.resolve(payload);
            resolved = true;
        }

        @Override
        public void onRaiseException(int code, String msg) throws RemoteException {
            if (resolved) {
                return;
            }

            call.reject(msg == null || msg.trim().isEmpty() ? "SUNMI printer operation failed." : msg, String.valueOf(code));
            resolved = true;
        }

        @Override
        public void onPrintResult(int code, String msg) throws RemoteException {
            if (resolved) {
                return;
            }

            JSObject payload = new JSObject();
            payload.put("success", code == 0 || code == 1);
            payload.put("code", code);
            payload.put("message", msg);
            call.resolve(payload);
            resolved = true;
        }
    }
}

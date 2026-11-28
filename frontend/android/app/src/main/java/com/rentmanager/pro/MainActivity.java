package com.rentmanager.pro;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean doubleBackToExitPressedOnce = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;

                if (webView != null) {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  var evt = new CustomEvent('appBackButton', { cancelable: true });" +
                        "  var notCancelled = window.dispatchEvent(evt);" +
                        "  if (!notCancelled) return 'HANDLED_BY_JS';" +
                        "  var path = window.location.pathname;" +
                        "  var isRoot = path === '/' || path === '/login' || path === '/home' || path === '/dashboard';" +
                        "  if (!isRoot && window.history.length > 1) {" +
                        "    window.history.back();" +
                        "    return 'NAVIGATED_BACK';" +
                        "  }" +
                        "  return isRoot ? 'IS_ROOT' : 'NO_HISTORY';" +
                        "})()",
                        value -> {
                            String result = value != null ? value.replace("\"", "") : "";

                            if ("HANDLED_BY_JS".equals(result) || "NAVIGATED_BACK".equals(result)) {
                                return;
                            }

                            if (webView.canGoBack() && !"IS_ROOT".equals(result)) {
                                webView.goBack();
                                return;
                            }

                            // On root screen, require double-tap back to exit safely
                            if (doubleBackToExitPressedOnce) {
                                finish();
                            } else {
                                doubleBackToExitPressedOnce = true;
                                Toast.makeText(MainActivity.this, "Press back again to exit RentManager", Toast.LENGTH_SHORT).show();
                                new Handler(Looper.getMainLooper()).postDelayed(() -> doubleBackToExitPressedOnce = false, 2000);
                            }
                        }
                    );
                } else {
                    finish();
                }
            }
        });
    }
}

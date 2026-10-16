package com.maverick.spreadsheetswars;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + LOCAL_HOST + "/assets/index.html";
    private static final int AUDIO_FILE_PICKER = 4401;
    private WebView webView;
    private ValueCallback<Uri[]> pendingAudioChoice;

    private static WebResourceResponse denyExternalRequest() {
        return new WebResourceResponse("text/plain", "UTF-8",
            new ByteArrayInputStream(new byte[0]));
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff102d20);
        getWindow().setNavigationBarColor(0xff102d20);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain(LOCAL_HOST)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xffeff3f0);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // Identify the offline APK so the web game always enables Android joysticks.
        settings.setUserAgentString(settings.getUserAgentString() + " SpreadsheetsWarsAndroid");
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setDefaultTextEncodingName("UTF-8");

        CookieManager.getInstance().setAcceptCookie(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(
                WebView view, WebResourceRequest request) {
                final Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme())
                    || !LOCAL_HOST.equalsIgnoreCase(uri.getHost())) {
                    return denyExternalRequest();
                }
                final WebResourceResponse local = loader.shouldInterceptRequest(uri);
                return local != null ? local : denyExternalRequest();
            }
            @Override public boolean shouldOverrideUrlLoading(
                WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Never navigate away from the packaged offline game.
                return !"https".equals(uri.getScheme())
                    || !LOCAL_HOST.equalsIgnoreCase(uri.getHost());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams) {
                if (pendingAudioChoice != null) pendingAudioChoice.onReceiveValue(null);
                pendingAudioChoice = filePathCallback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("audio/*");
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(picker, AUDIO_FILE_PICKER);
                } catch (ActivityNotFoundException exception) {
                    pendingAudioChoice.onReceiveValue(null);
                    pendingAudioChoice = null;
                }
                return true;
            }
        });

        setContentView(webView);
        if (state != null) webView.restoreState(state);
        else webView.loadUrl(ENTRY);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode,
        Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != AUDIO_FILE_PICKER || pendingAudioChoice == null) return;
        Uri[] chosen = null;
        if (resultCode == RESULT_OK && data != null) {
            List<Uri> items = new ArrayList<>();
            if (data.getClipData() != null) {
                for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                    Uri item = data.getClipData().getItemAt(i).getUri();
                    if (item != null) items.add(item);
                }
            } else if (data.getData() != null) {
                items.add(data.getData());
            }
            if (!items.isEmpty()) chosen = items.toArray(new Uri[0]);
        }
        pendingAudioChoice.onReceiveValue(chosen);
        pendingAudioChoice = null;
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (webView != null) webView.requestLayout();
    }

    @Override public void onBackPressed() {
        // Android Back behaves like Escape: close dialog or pause the match.
        // In the main menu Android Back closes the application.
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript(
            "!!document.getElementById('homeScreen') && " +
            "document.getElementById('homeScreen').classList.contains('hidden')",
            result -> {
                if ("true".equals(result)) {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new KeyboardEvent('keydown'," +
                        "{key:'Escape',code:'Escape',bubbles:true}))", null);
                } else MainActivity.super.onBackPressed();
            });
    }

    @Override protected void onDestroy() {
        if (pendingAudioChoice != null) {
            pendingAudioChoice.onReceiveValue(null);
            pendingAudioChoice = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const activity=readFileSync(new URL('../android/app/src/main/java/com/maverick/spreadsheetswars/MainActivity.java',import.meta.url),'utf8');
const gradle=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
test('Android leaves 2 mm on every edge in addition to status/navigation/cutout insets',()=>{
  assert.match(activity,/TypedValue\.COMPLEX_UNIT_MM, 2f/);
  assert.match(activity,/WindowCompat\.setDecorFitsSystemWindows\(getWindow\(\), false\)/);
  assert.match(activity,/WindowInsetsCompat\.Type\.systemBars\(\)/);
  assert.match(activity,/WindowInsetsCompat\.Type\.displayCutout\(\)/);
  for(const side of ['left','top','right','bottom']) assert.match(activity,new RegExp('edgeMarginPx \\+ bars\\.'+side));
  assert.match(activity,/ViewCompat\.requestApplyInsets\(frame\)/);
});
test('Android handles WebView renderer process termination without force closing',()=>{
  assert.match(activity,/onRenderProcessGone\(/);
  assert.match(activity,/MainActivity\.this\.recreate\(\)/);
  assert.match(gradle,/versionName '2\.5\.0'/);
});
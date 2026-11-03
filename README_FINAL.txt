ABMI - Autonomous Browser Memory Intelligence
FINAL 1-MINUTE WARNING BUILD

Files:
- manifest.json
- background.js
- feature_engineering.js
- rlstate.js
- qlearning.js
- action_manager.js
- popup.html
- popup.js
- warning.html
- warning.js

Installation:
1. Extract this ZIP.
2. Open chrome://extensions
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the extracted ABMI_Final_1Min_Warning folder.
6. Reload the extension after any code change.

Monitoring:
- Background monitoring uses a 1-minute chrome.alarms interval.
- The final background.js includes DEMO WARNING MODE so an eligible inactive HTTP/HTTPS tab can trigger the warning without requiring the normal pressure threshold.
- Active, pinned, audible, and already-discarded tabs remain protected.

Warning actions:
- KEEP: keep the tab and provide feedback.
- SUSPEND: logically suspend the tab by saving its URL/session information and removing the live Chrome tab. The page cannot reload until RESTORE is explicitly selected.
- CLOSE: user-confirmed close and resource-impact measurement.
- CLEAR WARNING: dismiss the warning without changing the tab.
- RESTORE: recreate a logically suspended tab only when the user explicitly selects RESTORE.

Technical limitation:
Stable Chrome Manifest V3 APIs do not reliably expose exact per-tab RAM/CPU usage. The warning therefore reports system-level RAM/CPU signals and post-action impact rather than inventing per-tab RAM values.

Logical suspension note:
The final build intentionally does not use chrome.tabs.discard() for ABMI SUSPEND. Native discarded tabs automatically reload when activated. ABMI instead stores the tab session and removes the live tab, so the page cannot load until RESTORE.

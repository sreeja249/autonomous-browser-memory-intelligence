// ============================================================
// ABMI MODULE 5
// ACTION MANAGER
// ============================================================

const ABMI_ACTION_MANAGER = (() => {

    const ACTIONS = {

        KEEP:
            "KEEP",

        SUSPEND:
            "SUSPEND",

        CLOSE:
            "CLOSE",

        RESTORE:
            "RESTORE"
    };


    // ========================================================
    // GET TAB
    // ========================================================

    async function getTab(tabId) {

        try {

            return await chrome.tabs.get(
                Number(tabId)
            );

        } catch (error) {

            throw new Error(
                "Tab no longer exists."
            );
        }
    }


    // ========================================================
    // SAFETY CHECK
    // ========================================================

    function checkSafety(
        tab,
        action
    ) {

        if (
            action ===
            ACTIONS.KEEP
        ) {

            return {
                allowed:
                    true
            };
        }


        if (
            action ===
            ACTIONS.RESTORE
        ) {

            if (
                tab.discarded
            ) {

                return {
                    allowed:
                        true
                };
            }


            return {

                allowed:
                    false,

                reason:
                    "Tab is not suspended."
            };
        }


        if (
            action ===
            ACTIONS.SUSPEND
        ) {

            if (
                tab.active
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Active tab cannot be suspended."
                };
            }


            if (
                tab.pinned
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Pinned tab cannot be suspended."
                };
            }


            if (
                tab.audible
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Audible tab cannot be suspended."
                };
            }


            if (
                tab.discarded
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Tab is already suspended."
                };
            }


            return {
                allowed:
                    true
            };
        }


        if (
            action ===
            ACTIONS.CLOSE
        ) {

            if (
                tab.active
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Active tab cannot be closed."
                };
            }


            if (
                tab.pinned
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Pinned tab cannot be closed."
                };
            }


            if (
                tab.audible
            ) {

                return {

                    allowed:
                        false,

                    reason:
                        "Audible tab cannot be closed."
                };
            }


            return {
                allowed:
                    true
            };
        }


        return {

            allowed:
                false,

            reason:
                "Unknown action."
        };
    }


    // ========================================================
    // KEEP
    // ========================================================

    async function keepTab(
        tabId
    ) {

        await getTab(
            tabId
        );


        return {

            success:
                true,

            action:
                "KEEP"
        };
    }


    // ========================================================
    // SUSPEND
    // ========================================================

    async function suspendTab(
        tabId
    ) {

        const tab =
            await getTab(
                tabId
            );


        const safety =
            checkSafety(
                tab,
                ACTIONS.SUSPEND
            );


        if (
            !safety.allowed
        ) {

            return {

                success:
                    false,

                error:
                    safety.reason
            };
        }


        // ABMI logical suspension:
        // Save the tab session information and REMOVE the actual
        // Chrome tab. This guarantees the page cannot reload when
        // the user clicks the old tab. It can only return through
        // the explicit ABMI RESTORE action.
        const stored =
            await chrome.storage.local.get(
                "abmiSuspendedTabs"
            );

        const suspendedTabs =
            Array.isArray(stored.abmiSuspendedTabs)
                ? stored.abmiSuspendedTabs
                : [];

        const suspensionId =
            "abmi-suspended-" +
            Date.now() + "-" +
            Math.random().toString(36).slice(2, 8);

        const suspendedRecord = {

            suspensionId,

            originalTabId:
                Number(tab.id),

            windowId:
                tab.windowId,

            index:
                tab.index,

            url:
                tab.url || "",

            title:
                tab.title || "Untitled Tab",

            pinned:
                Boolean(tab.pinned),

            timestamp:
                Date.now()
        };

        suspendedTabs.push(
            suspendedRecord
        );

        await chrome.storage.local.set({

            abmiSuspendedTabs:
                suspendedTabs
        });

        await chrome.tabs.remove(
            Number(tabId)
        );

        return {

            success:
                true,

            action:
                "SUSPEND",

            suspensionId,

            logicalSuspension:
                true
        };
    }


    // ========================================================
    // CLOSE
    // ========================================================

    async function closeTab(
        tabId
    ) {

        const tab =
            await getTab(
                tabId
            );


        const safety =
            checkSafety(
                tab,
                ACTIONS.CLOSE
            );


        if (
            !safety.allowed
        ) {

            return {

                success:
                    false,

                error:
                    safety.reason
            };
        }


        await chrome.tabs.remove(
            Number(tabId)
        );


        return {

            success:
                true,

            action:
                "CLOSE"
        };
    }


    // ========================================================
    // RESTORE
    // ========================================================

    async function restoreTab(
        suspensionId
    ) {

        const stored =
            await chrome.storage.local.get(
                "abmiSuspendedTabs"
            );

        const suspendedTabs =
            Array.isArray(stored.abmiSuspendedTabs)
                ? stored.abmiSuspendedTabs
                : [];

        const index =
            suspendedTabs.findIndex(
                item =>
                    item.suspensionId ===
                    String(suspensionId)
            );

        if (index === -1) {

            return {

                success: false,

                error:
                    "Suspended tab record not found."
            };
        }

        const suspended =
            suspendedTabs[index];

        if (!suspended.url) {

            return {

                success: false,

                error:
                    "Suspended tab has no restorable URL."
            };
        }

        let windowId =
            suspended.windowId;

        try {

            await chrome.windows.get(
                windowId
            );

        } catch {

            const currentWindow =
                await chrome.windows.getCurrent();

            windowId =
                currentWindow.id;
        }

        const created =
            await chrome.tabs.create({

                windowId,

                index:
                    Math.max(
                        0,
                        Number(suspended.index) || 0
                    ),

                url:
                    suspended.url,

                active: true
            });

        suspendedTabs.splice(
            index,
            1
        );

        await chrome.storage.local.set({

            abmiSuspendedTabs:
                suspendedTabs
        });

        return {

            success: true,

            action: "RESTORE",

            tabId:
                created.id
        };
    }


    // ========================================================
    // EXECUTE ACTION
    // ========================================================

    async function executeAction(
        tabId,
        action
    ) {

        action =
            String(
                action || ""
            ).toUpperCase();


        if (
            action ===
            ACTIONS.KEEP
        ) {

            return keepTab(
                tabId
            );
        }


        if (
            action ===
            ACTIONS.SUSPEND
        ) {

            return suspendTab(
                tabId
            );
        }


        if (
            action ===
            ACTIONS.CLOSE
        ) {

            return closeTab(
                tabId
            );
        }


        if (
            action ===
            ACTIONS.RESTORE
        ) {

            return restoreTab(
                tabId
            );
        }


        return {

            success:
                false,

            error:
                "Invalid action."
        };
    }


    return {

        ACTIONS,

        getTab,

        checkSafety,

        keepTab,

        suspendTab,

        closeTab,

        restoreTab,

        executeAction

    };

})();
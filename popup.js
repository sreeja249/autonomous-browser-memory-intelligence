// ============================================================
// ABMI POPUP
// ============================================================
//
// popup.js ONLY displays data and communicates with
// background.js.
//
// It does NOT:
// - perform Q-learning
// - suspend tabs
// - make resource-management decisions
// ============================================================


// ============================================================
// DOM
// ============================================================

const monitoringStatus =
    document.getElementById(
        "monitoringStatus"
    );


const recordCount =
    document.getElementById(
        "recordCount"
    );


const currentTabCount =
    document.getElementById(
        "currentTabCount"
    );

const suspendedTabCount =
    document.getElementById(
        "suspendedTabCount"
    );

const suspendedTabsContainer =
    document.getElementById(
        "suspendedTabs"
    );


const lastSnapshot =
    document.getElementById(
        "lastSnapshot"
    );


const snapshotId =
    document.getElementById(
        "snapshotId"
    );


const browserImportance =
    document.getElementById(
        "browserImportance"
    );


const browserImportanceLevel =
    document.getElementById(
        "browserImportanceLevel"
    );


const highRatio =
    document.getElementById(
        "highRatio"
    );


const mediumRatio =
    document.getElementById(
        "mediumRatio"
    );


const lowRatio =
    document.getElementById(
        "lowRatio"
    );


const maxImportance =
    document.getElementById(
        "maxImportance"
    );


const browserPressure =
    document.getElementById(
        "browserPressure"
    );


const browserPressureLevel =
    document.getElementById(
        "browserPressureLevel"
    );


const allTabsRLStates =
    document.getElementById(
        "allTabsRLStates"
    );


const latestRecord =
    document.getElementById(
        "latestRecord"
    );


const lastActionResult =
    document.getElementById(
        "lastActionResult"
    );


const collectButton =
    document.getElementById(
        "collectButton"
    );


const downloadButton =
    document.getElementById(
        "downloadButton"
    );


const clearButton =
    document.getElementById(
        "clearButton"
    );


const message =
    document.getElementById(
        "message"
    );


// ============================================================
// HELPERS
// ============================================================

function safeNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : fallback;

}


function formatDecimal(
    value,
    digits = 4
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "-";

    }


    return number.toFixed(
        digits
    );

}


function formatPercent(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "-";

    }


    return (

        number.toFixed(1) +
        "%"

    );

}


function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


function showMessage(
    text
) {

    message.textContent =
        text;

}


// ============================================================
// DATA
// ============================================================

async function getDataset() {

    const result =
        await chrome.storage.local.get(
            "dataset"
        );


    return result.dataset || [];

}


async function getCurrentTabs() {

    return await chrome.tabs.query({});

}


// ============================================================
// LATEST SNAPSHOT
// ============================================================

function getLatestSnapshotRows(
    dataset
) {

    if (
        !dataset ||
        dataset.length === 0
    ) {

        return [];

    }


    const ids =
        dataset

            .map(
                row =>
                    Number(
                        row.snapshot_id
                    )
            )

            .filter(
                id =>
                    Number.isFinite(id)
            );


    if (
        ids.length === 0
    ) {

        return dataset.slice(
            -20
        );

    }


    const latestId =
        Math.max(
            ...ids
        );


    return dataset.filter(

        row =>

            Number(
                row.snapshot_id
            ) ===
            latestId

    );

}


// ============================================================
// BROWSER CONTEXT
// ============================================================

function calculateBrowserContext(
    rows
) {

    if (
        rows.length === 0
    ) {

        return {

            average:
                0,

            max:
                0,

            high:
                0,

            medium:
                0,

            low:
                0,

            browserLevel:
                "LOW",

            pressure:
                0,

            pressureLevel:
                "LOW"

        };

    }


    const importance =
        rows.map(

            row =>

                safeNumber(

                    row.tab_importance_score

                )

        );


    const pressures =
        rows.map(

            row =>

                safeNumber(

                    row.resource_pressure

                )

        );


    const average =

        importance.reduce(

            (
                total,
                value
            ) =>

                total + value,

            0

        ) /

        importance.length;


    const max =
        Math.max(
            ...importance
        );


    const pressure =

        pressures.reduce(

            (
                total,
                value
            ) =>

                total + value,

            0

        ) /

        pressures.length;


    let high = 0;

    let medium = 0;

    let low = 0;


    importance.forEach(

        value => {

            if (
                value >= 0.70
            ) {

                high++;

            }

            else if (
                value >= 0.40
            ) {

                medium++;

            }

            else {

                low++;

            }

        }

    );


    let browserLevel =
        "LOW";


    if (
        average >= 0.70
    ) {

        browserLevel =
            "HIGH";

    }

    else if (
        average >= 0.40
    ) {

        browserLevel =
            "MEDIUM";

    }


    let pressureLevel =
        "LOW";


    if (
        pressure >= 0.70
    ) {

        pressureLevel =
            "HIGH";

    }

    else if (
        pressure >= 0.40
    ) {

        pressureLevel =
            "MEDIUM";

    }


    return {

        average,

        max,

        high:
            high /
            rows.length *
            100,

        medium:
            medium /
            rows.length *
            100,

        low:
            low /
            rows.length *
            100,

        browserLevel,

        pressure,

        pressureLevel

    };

}


// ============================================================
// MODULE 3 DISPLAY
// ============================================================

function displayBrowserContext(
    rows
) {

    const context =
        calculateBrowserContext(
            rows
        );


    browserImportance.textContent =
        formatDecimal(
            context.average
        );


    browserImportanceLevel.textContent =
        context.browserLevel;


    highRatio.textContent =
        formatPercent(
            context.high
        );


    mediumRatio.textContent =
        formatPercent(
            context.medium
        );


    lowRatio.textContent =
        formatPercent(
            context.low
        );


    maxImportance.textContent =
        formatDecimal(
            context.max
        );


    browserPressure.textContent =
        formatDecimal(
            context.pressure
        );


    browserPressureLevel.textContent =
        context.pressureLevel;

}


// ============================================================
// ACTION CLASS
// ============================================================

function actionClass(
    action
) {

    if (
        action === "SUSPEND"
    ) {

        return "action-suspend";

    }


    if (
        action === "WARN"
    ) {

        return "action-warn";

    }


    return "action-keep";

}


// ============================================================
// DISPLAY ALL TABS
// ============================================================

function displayAllTabs(
    rows,
    currentTabs
) {

    if (
        rows.length === 0
    ) {

        allTabsRLStates.innerHTML =

            `<div class="no-data">
                No snapshot data available.
            </div>`;

        return;

    }


    const tabOrder =
        new Map();


    currentTabs.forEach(

        (
            tab,
            index
        ) => {

            tabOrder.set(
                tab.id,
                index
            );

        }

    );


    const sortedRows =
        [...rows].sort(

            (
                a,
                b
            ) => {

                const aIndex =
                    tabOrder.has(
                        a.tab_id
                    )
                        ? tabOrder.get(
                            a.tab_id
                        )
                        : 99999;


                const bIndex =
                    tabOrder.has(
                        b.tab_id
                    )
                        ? tabOrder.get(
                            b.tab_id
                        )
                        : 99999;


                return (
                    aIndex -
                    bIndex
                );

            }

        );


    allTabsRLStates.innerHTML =
        "";


    sortedRows.forEach(

        (
            row,
            index
        ) => {

            const action =
                row.q_action ||
                row.recommended_action ||
                "KEEP";


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "tab-state";


            card.innerHTML = `

                <div class="tab-number">
                    Tab ${index + 1}
                </div>


                <div class="tab-title">
                    ${escapeHTML(
                        row.title ||
                        "Untitled Tab"
                    )}
                </div>


                <div class="small-text">
                    ${escapeHTML(
                        row.domain ||
                        "Unknown domain"
                    )}
                </div>


                <hr>


                <div>
                    <b>Activity:</b>
                    ${formatDecimal(
                        row.activity_score
                    )}
                </div>


                <div>
                    <b>History Importance:</b>
                    ${formatDecimal(
                        row.history_importance_score
                    )}
                </div>


                <div>
                    <b>Tab Importance:</b>
                    ${formatDecimal(
                        row.tab_importance_score
                    )}
                </div>


                <div>
                    <b>Importance Level:</b>
                    ${escapeHTML(
                        row.importance_level ||
                        "-"
                    )}
                </div>


                <div>
                    <b>Resource Pressure:</b>
                    ${formatDecimal(
                        row.resource_pressure
                    )}
                </div>


                <div>
                    <b>Pressure Level:</b>
                    ${escapeHTML(
                        row.pressure_level ||
                        "-"
                    )}
                </div>


                <div>
                    <b>Browser Importance:</b>
                    ${formatDecimal(
                        row.browser_importance
                    )}
                </div>


                <div>
                    <b>Target Tab Importance:</b>
                    ${formatDecimal(
                        row.target_tab_importance
                    )}
                </div>


                <div>
                    <b>RL State:</b>
                    <span class="state">
                        ${escapeHTML(
                            row.rl_state ||
                            "-"
                        )}
                    </span>
                </div>


                <div>
                    <b>RL State ID:</b>
                    ${escapeHTML(
                        row.rl_state_id ??
                        "-"
                    )}
                </div>


                <hr>


                <div>
                    <b>Q-Action:</b>

                    <span class="${actionClass(
                        row.q_action
                    )}">
                        ${escapeHTML(
                            row.q_action ||
                            "KEEP"
                        )}
                    </span>

                </div>


                <div>
                    <b>Recommended Action:</b>

                    <span class="${actionClass(
                        action
                    )}">
                        ${escapeHTML(
                            action
                        )}
                    </span>

                </div>


                <div>
                    <b>Q-Value:</b>
                    ${formatDecimal(
                        row.q_value,
                        6
                    )}
                </div>


                <div>
                    <b>Q(KEEP):</b>
                    ${formatDecimal(
                        row.q_keep,
                        6
                    )}
                </div>


                <div>
                    <b>Q(WARN):</b>
                    ${formatDecimal(
                        row.q_warn,
                        6
                    )}
                </div>


                <div>
                    <b>Q(SUSPEND):</b>
                    ${formatDecimal(
                        row.q_suspend,
                        6
                    )}
                </div>
                <div>
    <b>Q(CLOSE):</b>
    ${formatDecimal(
        row.q_close,
        6
    )}
</div>

                <div>
                    <b>Reward:</b>
                    ${formatDecimal(
                        row.simulated_reward
                    )}
                </div>


                <hr>


                <div>
                    <b>RAM Usage:</b>
                    ${formatPercent(
                        row.system_ram_usage_percent
                    )}
                </div>


                <div>
                    <b>CPU Usage:</b>
                    ${formatPercent(
                        row.system_cpu_usage_percent
                    )}
                </div>


                <div>
                    <b>Open Tabs:</b>
                    ${escapeHTML(
                        row.total_open_tabs ??
                        "-"
                    )}
                </div>

            `;


            allTabsRLStates.appendChild(
                card
            );

        }

    );

}


// ============================================================
// LATEST RECORD
// ============================================================

function displayLatestRecord(
    rows
) {

    if (
        rows.length === 0
    ) {

        latestRecord.textContent =
            "No records yet.";

        return;

    }


    const row =
        rows[
            rows.length - 1
        ];


    latestRecord.innerHTML = `

        <div>

            <b>Tab:</b>
            ${escapeHTML(
                row.title ||
                "-"
            )}

            <br><br>


            <b>Domain:</b>
            ${escapeHTML(
                row.domain ||
                "-"
            )}

            <br><br>


            <b>Activity:</b>
            ${formatDecimal(
                row.activity_score
            )}

            <br>


            <b>History Importance:</b>
            ${formatDecimal(
                row.history_importance_score
            )}

            <br>


            <b>Tab Importance:</b>
            ${formatDecimal(
                row.tab_importance_score
            )}

            <br>


            <b>Importance Level:</b>
            ${escapeHTML(
                row.importance_level ||
                "-"
            )}

            <br>


            <b>Resource Pressure:</b>
            ${formatDecimal(
                row.resource_pressure
            )}

            <br>


            <b>Pressure Level:</b>
            ${escapeHTML(
                row.pressure_level ||
                "-"
            )}

            <br>


            <b>RL State:</b>
            ${escapeHTML(
                row.rl_state ||
                "-"
            )}

            <br>


            <b>RL State ID:</b>
            ${escapeHTML(
                row.rl_state_id ??
                "-"
            )}

            <br><br>


            <b>Q-Action:</b>
            ${escapeHTML(
                row.q_action ||
                "KEEP"
            )}

            <br>


            <b>Recommended Action:</b>
            ${escapeHTML(
                row.recommended_action ||
                "KEEP"
            )}

            <br>


            <b>Q-Value:</b>
            ${formatDecimal(
                row.q_value,
                6
            )}

            <br><br>


            <b>RAM Usage:</b>
            ${formatPercent(
                row.system_ram_usage_percent
            )}

            <br>


            <b>CPU Usage:</b>
            ${formatPercent(
                row.system_cpu_usage_percent
            )}

            <br>


            <b>Open Tabs:</b>
            ${escapeHTML(
                row.total_open_tabs ??
                "-"
            )}

        </div>

    `;

}


// ============================================================
// SUSPENDED TABS + RESTORE
// ============================================================

function displaySuspendedTabs(tabs) {

    // ABMI logical suspension stores suspended sessions in
    // extension storage and removes the live Chrome tab.
    const suspended =
        Array.isArray(tabs)
            ? tabs
            : [];

    suspendedTabCount.textContent =
        suspended.length;

    suspendedTabsContainer.innerHTML =
        "";

    if (suspended.length === 0) {
        suspendedTabsContainer.innerHTML =
            `<div class="no-data">
                No suspended tabs.
            </div>`;
        return;
    }

    suspended.forEach(
        (tab, index) => {

            const card =
                document.createElement("div");

            card.className =
                "suspended-card";

            card.innerHTML = `

                <div class="suspended-title">
                    ${escapeHTML(
                        tab.title ||
                        `Suspended Tab ${index + 1}`
                    )}
                </div>

                <div class="suspended-domain">
                    ${escapeHTML(
                        getDomainFromUrl(tab.url || "")
                    )}
                </div>

                <button
                    class="restore-button"
                    data-suspension-id="${escapeHTML(
                        tab.suspensionId || ""
                    )}"
                >
                    RESTORE & ACTIVATE
                </button>
            `;

            const button =
                card.querySelector(
                    ".restore-button"
                );

            button.addEventListener(
                "click",
                async () => {

                    button.disabled = true;
                    button.textContent =
                        "RESTORING...";

                    try {

                        if (!tab.suspensionId) {
                            throw new Error(
                                "Missing suspension ID for this suspended tab."
                            );
                        }

                        console.log(
                            "[ABMI] Restoring suspended tab:",
                            tab.suspensionId
                        );

                        const response =
                            await chrome.runtime.sendMessage({
                                action: "restoreTab",
                                suspensionId:
                                    String(tab.suspensionId)
                            });

                        console.log(
                            "[ABMI] Restore response:",
                            response
                        );

                        if (
                            !response ||
                            response.success !== true
                        ) {
                            throw new Error(
                                response?.error ||
                                "Restore failed."
                            );
                        }

                        showMessage(
                            "Tab restored successfully."
                        );

                        await updatePopup();

                    } catch (error) {

                        button.disabled = false;
                        button.textContent =
                            "RESTORE & ACTIVATE";

                        showMessage(
                            "Restore failed: " +
                            error.message
                        );
                    }
                }
            );

            suspendedTabsContainer
                .appendChild(card);
        }
    );
}


function getDomainFromUrl(url) {

    try {
        return new URL(url).hostname;
    } catch {
        return "Unknown domain";
    }
}


// ============================================================
// LAST ACTION RESULT
// ============================================================

function displayLastActionResult(result) {

    if (!result) {

        lastActionResult.textContent =
            "No action recorded yet.";

        return;
    }

    const impact = result.resourceImpact || {};

    const action =
        result.action || "UNKNOWN";

    const title =
        result.tabTitle || "Untitled Tab";

    const time =
        result.timestamp
            ? new Date(result.timestamp).toLocaleString()
            : "-";

    lastActionResult.innerHTML = `
        <div class="row">
            <span>Action</span>
            <span class="value">${escapeHTML(action)}</span>
        </div>
        <div class="small-text">${escapeHTML(title)}</div>
        <div class="small-text">${escapeHTML(time)}</div>
        <hr>
        <div class="row">
            <span>RAM Recovered</span>
            <span class="value">${safeNumber(impact.ramRecoveredGB).toFixed(2)} GB</span>
        </div>
        <div class="row">
            <span>RAM Usage Improvement</span>
            <span class="value">${safeNumber(impact.ramUsageImprovementPercent).toFixed(2)} pp</span>
        </div>
        <div class="row">
            <span>CPU Usage Improvement</span>
            <span class="value">${Number.isFinite(Number(impact.cpuUsageImprovementPercent)) ? Number(impact.cpuUsageImprovementPercent).toFixed(2) + " pp" : "Not measured"}</span>
        </div>
        <div class="row">
            <span>RAM Used</span>
            <span class="value">${safeNumber(impact.beforeRamUsedGB).toFixed(2)} → ${safeNumber(impact.afterRamUsedGB).toFixed(2)} GB</span>
        </div>
        <div class="small-text">
            System-level estimate; not exact per-tab RAM.
        </div>
    `;
}


// ============================================================
// UPDATE
// ============================================================

async function updatePopup() {

    try {

        const dataset =
            await getDataset();


        const tabs =
            await getCurrentTabs();

        const status =
            await chrome.runtime.sendMessage({
                action: "getStatus"
            });


        const latestRows =
            getLatestSnapshotRows(
                dataset
            );


        monitoringStatus.textContent =
            "Monitoring: Active";


        recordCount.textContent =
            dataset.length;


        currentTabCount.textContent =
            tabs.length;

        // Logical suspension records are stored in extension storage.
        // They are NOT live Chrome tabs, so use the records returned by getStatus.
        displaySuspendedTabs(
            Array.isArray(status?.suspendedTabs)
                ? status.suspendedTabs
                : []
        );

        displayLastActionResult(
            status?.lastActionResult || null
        );


        if (
            latestRows.length > 0
        ) {

            snapshotId.textContent =
                latestRows[0].snapshot_id;


            lastSnapshot.textContent =
                latestRows[0].timestamp ||
                "-";

        }

        else {

            snapshotId.textContent =
                "-";


            lastSnapshot.textContent =
                "Never";

        }


        displayBrowserContext(
            latestRows
        );


        displayAllTabs(
            latestRows,
            tabs
        );


        displayLatestRecord(
            latestRows
        );

    }

    catch (error) {

        console.error(
            "ABMI popup:",
            error
        );


        monitoringStatus.textContent =
            "Monitoring: Error";

    }

}


// ============================================================
// COLLECT BUTTON
// ============================================================

collectButton.addEventListener(

    "click",

    async () => {

        collectButton.disabled =
            true;


        showMessage(
            "Collecting snapshot..."
        );


        try {

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        "collectSnapshot"

                });


            if (
                response &&
                response.success
            ) {

                showMessage(

                    `${response.newRecords} new records collected.`

                );

            }

            else {

                showMessage(

                    response?.error ||
                    "Snapshot collection failed."

                );

            }


            await updatePopup();

        }

        catch (error) {

            console.error(
                "Collection:",
                error
            );


            showMessage(
                "Could not connect to ABMI background service."
            );

        }


        collectButton.disabled =
            false;

    }

);


// ============================================================
// DOWNLOAD CSV
// ============================================================

downloadButton.addEventListener(

    "click",

    async () => {

        const dataset =
            await getDataset();


        if (
            dataset.length === 0
        ) {

            showMessage(
                "No dataset available."
            );

            return;

        }


        const columns =
            Array.from(

                new Set(

                    dataset.flatMap(

                        row =>
                            Object.keys(
                                row
                            )

                    )

                )

            );


        const csvRows = [];


        csvRows.push(
            columns.join(",")
        );


        dataset.forEach(

            row => {

                const values =
                    columns.map(

                        column => {

                            const value =
                                row[column];


                            if (
                                value ===
                                null ||
                                value ===
                                undefined
                            ) {

                                return "";

                            }


                            return (

                                '"' +

                                String(
                                    value
                                )
                                    .replace(
                                        /"/g,
                                        '""'
                                    ) +

                                '"'

                            );

                        }

                    );


                csvRows.push(
                    values.join(",")
                );

            }

        );


        const blob =
            new Blob(

                [
                    csvRows.join(
                        "\n"
                    )
                ],

                {
                    type:
                        "text/csv"
                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "abmi_dataset.csv";


        link.click();


        URL.revokeObjectURL(
            url
        );


        showMessage(
            "Dataset downloaded."
        );

    }

);


// ============================================================
// CLEAR DATASET
// ============================================================

clearButton.addEventListener(

    "click",

    async () => {

        const confirmed =
            confirm(
                "Clear the ABMI dataset?"
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        "clearDataset"

                });


            if (
                response?.success
            ) {

                showMessage(
                    "Dataset cleared."
                );


                await updatePopup();

            }

        }

        catch (error) {

            console.error(
                "Clear:",
                error
            );


            showMessage(
                "Unable to clear dataset."
            );

        }

    }

);


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        await updatePopup();

    }

);


// ============================================================
// AUTO REFRESH
// ============================================================

setInterval(

    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            await updatePopup();

        }

    },

    3000

);
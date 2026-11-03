// ============================================================
// ABMI - AUTONOMOUS BROWSER MEMORY INTELLIGENCE
// FINAL BACKGROUND SERVICE WORKER
//
// MODULE 1 : Monitoring
// MODULE 2 : Feature Engineering
// MODULE 3 : Browser-Level RL State
// MODULE 4 : Q-Learning
// MODULE 5 : User Warning + KEEP / SUSPEND / CLOSE
// ============================================================


// ============================================================
// LOAD ABMI MODULES
// ============================================================

importScripts(
    "feature_engineering.js",
    "rlstate.js",
    "qlearning.js",
    "action_manager.js"
);


// ============================================================
// CONFIGURATION
// ============================================================

const ABMI_ALARM_NAME =
    "abmi-monitor";

const HISTORY_CACHE_DURATION =
    5 * 60 * 1000;

const WARNING_COOLDOWN =
    60 * 1000;

// DEMO MODE: when true, every monitoring alarm chooses an
// eligible inactive tab and opens a warning. This is useful
// for demonstrating the one-minute warning workflow.
// It never changes the tab automatically.
const DEMO_WARNING_EVERY_MINUTE =
    true;

const WARNING_PRESSURE_THRESHOLD =
    0.45;

const WARNING_IMPORTANCE_THRESHOLD =
    0.60;

const MAX_DATASET_RECORDS =
    10000;


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let sessionData = {};

let historyCache = {};

let activeWarning = null;

let warningWindowId = null;

let warningHistory = {};


// ============================================================
// BASIC UTILITIES
// ============================================================

function now() {

    return Date.now();

}


function timestamp() {

    return new Date().toISOString();

}


function getDomain(url) {

    try {

        return new URL(url).hostname;

    }

    catch {

        return "";

    }

}


function supportedURL(url) {

    if (!url) {

        return false;

    }

    return (
        url.startsWith("http://") ||
        url.startsWith("https://")
    );

}


// ============================================================
// SESSION MANAGEMENT
// ============================================================

function initializeTab(tab) {

    if (
        !tab ||
        tab.id === undefined
    ) {

        return;

    }


    const id =
        String(tab.id);


    if (!sessionData[id]) {

        sessionData[id] = {

            tab_id:
                tab.id,

            first_seen:
                now(),

            last_active:
                now(),

            session_access_count:
                tab.active ? 1 : 0,

            session_revisit_count:
                0

        };

    }

}


async function saveSessionData() {

    await chrome.storage.local.set({

        abmiSessionData:
            sessionData

    });

}


async function loadSessionData() {

    const result =
        await chrome.storage.local.get(
            "abmiSessionData"
        );


    sessionData =
        result.abmiSessionData || {};

}


async function initializeAllTabs() {

    const tabs =
        await chrome.tabs.query({});


    for (const tab of tabs) {

        initializeTab(tab);

    }


    await saveSessionData();

}


// ============================================================
// TAB EVENTS
// ============================================================

chrome.tabs.onActivated.addListener(

    async activeInfo => {

        try {

            const tab =
                await chrome.tabs.get(
                    activeInfo.tabId
                );


            initializeTab(tab);


            const id =
                String(tab.id);


            const session =
                sessionData[id];


            session.session_access_count += 1;


            if (
                session.session_access_count > 1
            ) {

                session.session_revisit_count += 1;

            }


            session.last_active =
                now();


            await saveSessionData();

        }

        catch (error) {

            console.error(
                "ABMI activation error:",
                error
            );

        }

    }

);


chrome.tabs.onCreated.addListener(

    async tab => {

        initializeTab(tab);

        await saveSessionData();

    }

);


chrome.tabs.onUpdated.addListener(

    async (
        tabId,
        changeInfo,
        tab
    ) => {

        initializeTab(tab);

    }

);


chrome.tabs.onRemoved.addListener(

    async tabId => {

        delete sessionData[
            String(tabId)
        ];


        delete warningHistory[
            String(tabId)
        ];


        if (
            activeWarning &&
            Number(activeWarning.tabId) ===
            Number(tabId)
        ) {

            activeWarning = null;

        }


        await saveSessionData();

    }

);


// ============================================================
// INACTIVITY
// ============================================================

function getInactivitySeconds(
    lastActive
) {

    return Math.max(

        0,

        Math.floor(

            (
                now() -
                lastActive
            ) / 1000

        )

    );

}


// ============================================================
// HISTORY FEATURES
// ============================================================

async function getHistoryFeatures(url) {

    const empty = {

        history_visits_24h:
            0,

        history_visits_7d:
            0,

        history_visits_30d:
            0,

        history_last_visit:
            "",

        history_days_since_last_visit:
            -1,

        history_revisit_rate:
            0

    };


    if (
        !supportedURL(url)
    ) {

        return empty;

    }


    const cached =
        historyCache[url];


    if (

        cached &&

        now() -
        cached.time <
        HISTORY_CACHE_DURATION

    ) {

        return cached.data;

    }


    try {

        const visits =
            await chrome.history.getVisits({

                url: url

            });


        const current =
            now();


        const day =
            24 *
            60 *
            60 *
            1000;


        const visits24h =
            visits.filter(

                visit =>

                    visit.visitTime &&

                    current -
                    visit.visitTime <=
                    day

            );


        const visits7d =
            visits.filter(

                visit =>

                    visit.visitTime &&

                    current -
                    visit.visitTime <=
                    7 * day

            );


        const visits30d =
            visits.filter(

                visit =>

                    visit.visitTime &&

                    current -
                    visit.visitTime <=
                    30 * day

            );


        const times =
            visits
                .filter(
                    visit =>
                        visit.visitTime
                )
                .map(
                    visit =>
                        visit.visitTime
                );


        const lastVisit =
            times.length > 0
                ? Math.max(...times)
                : null;


        let daysSinceLastVisit =
            -1;


        if (lastVisit) {

            daysSinceLastVisit =
                Math.floor(

                    (
                        current -
                        lastVisit
                    ) / day

                );

        }


        let revisitRate = 0;


        if (
            visits30d.length > 1
        ) {

            revisitRate =
                (
                    visits30d.length - 1
                ) /
                visits30d.length;

        }


        const data = {

            history_visits_24h:
                visits24h.length,

            history_visits_7d:
                visits7d.length,

            history_visits_30d:
                visits30d.length,

            history_last_visit:
                lastVisit
                    ? new Date(
                        lastVisit
                    ).toISOString()
                    : "",

            history_days_since_last_visit:
                daysSinceLastVisit,

            history_revisit_rate:
                Number(
                    revisitRate.toFixed(4)
                )

        };


        historyCache[url] = {

            time:
                now(),

            data:
                data

        };


        return data;

    }

    catch (error) {

        console.error(
            "ABMI history error:",
            error
        );


        return empty;

    }

}


// ============================================================
// SYSTEM RAM
// ============================================================

async function getSystemMemory() {

    try {

        const memory =
            await chrome.system.memory.getInfo();


        const totalGB =
            memory.capacity /
            (1024 ** 3);


        const availableGB =
            memory.availableCapacity /
            (1024 ** 3);


        const usedGB =
            totalGB -
            availableGB;


        const usagePercent =
            (
                usedGB /
                totalGB
            ) * 100;


        return {

            system_ram_total_gb:
                Number(
                    totalGB.toFixed(2)
                ),

            system_ram_available_gb:
                Number(
                    availableGB.toFixed(2)
                ),

            system_ram_used_gb:
                Number(
                    usedGB.toFixed(2)
                ),

            system_ram_usage_percent:
                Number(
                    usagePercent.toFixed(2)
                )

        };

    }

    catch (error) {

        console.error(
            "ABMI RAM error:",
            error
        );


        return {

            system_ram_total_gb:
                null,

            system_ram_available_gb:
                null,

            system_ram_used_gb:
                null,

            system_ram_usage_percent:
                null

        };

    }

}


// ============================================================
// SYSTEM CPU
// ============================================================

async function getSystemCPU() {

    try {

        const info =
            await chrome.system.cpu.getInfo();


        let total = 0;

        let idle = 0;


        for (
            const processor
            of info.processors
        ) {

            total +=
                processor.usage.total;

            idle +=
                processor.usage.idle;

        }


        const current = {

            total:
                total,

            idle:
                idle

        };


        const previousResult =
            await chrome.storage.local.get(
                "abmiPreviousCPU"
            );


        const previous =
            previousResult.abmiPreviousCPU;


        await chrome.storage.local.set({

            abmiPreviousCPU:
                current

        });


        if (!previous) {

            return {

                system_cpu_usage_percent:
                    null

            };

        }


        const totalDifference =
            current.total -
            previous.total;


        const idleDifference =
            current.idle -
            previous.idle;


        let usage = 0;


        if (
            totalDifference > 0
        ) {

            usage =

                (
                    1 -
                    (
                        idleDifference /
                        totalDifference
                    )
                ) * 100;

        }


        usage =
            Math.max(
                0,
                Math.min(
                    100,
                    usage
                )
            );


        return {

            system_cpu_usage_percent:
                Number(
                    usage.toFixed(2)
                )

        };

    }

    catch (error) {

        console.error(
            "ABMI CPU error:",
            error
        );


        return {

            system_cpu_usage_percent:
                null

        };

    }

}


// ============================================================
// CREATE RAW MODULE 1 ROW
// ============================================================

async function createRawRow(
    tab,
    memory,
    cpu,
    totalTabs
) {

    initializeTab(tab);


    const id =
        String(tab.id);


    const session =
        sessionData[id];


    const inactivity =
        getInactivitySeconds(
            session.last_active
        );


    let sessionRevisitRate =
        0;


    if (
        session.session_access_count > 0
    ) {

        sessionRevisitRate =

            session.session_revisit_count /
            session.session_access_count;

    }


    const history =
        await getHistoryFeatures(
            tab.url || ""
        );


    return {

        timestamp:
            timestamp(),

        tab_id:
            tab.id,

        title:
            tab.title || "",

        url:
            tab.url || "",

        domain:
            getDomain(
                tab.url || ""
            ),

        active:
            Boolean(tab.active),

        inactivity_seconds:
            inactivity,

        session_access_count:
            session.session_access_count,

        session_revisit_count:
            session.session_revisit_count,

        session_revisit_rate:
            Number(
                sessionRevisitRate.toFixed(4)
            ),

        history_visits_24h:
            history.history_visits_24h,

        history_visits_7d:
            history.history_visits_7d,

        history_visits_30d:
            history.history_visits_30d,

        history_last_visit:
            history.history_last_visit,

        history_days_since_last_visit:
            history.history_days_since_last_visit,

        history_revisit_rate:
            history.history_revisit_rate,

        pinned:
            Boolean(tab.pinned),

        audible:
            Boolean(tab.audible),

        discarded:
            Boolean(tab.discarded),

        auto_discardable:
            Boolean(tab.autoDiscardable),

        system_ram_total_gb:
            memory.system_ram_total_gb,

        system_ram_available_gb:
            memory.system_ram_available_gb,

        system_ram_used_gb:
            memory.system_ram_used_gb,

        system_ram_usage_percent:
            memory.system_ram_usage_percent,

        system_cpu_usage_percent:
            cpu.system_cpu_usage_percent,

        total_open_tabs:
            totalTabs

    };

}


// ============================================================
// WARNING COOLDOWN
// ============================================================

function canWarnTab(tabId) {

    const previous =
        warningHistory[
            String(tabId)
        ];


    if (!previous) {

        return true;

    }


    return (

        now() -
        previous >=
        WARNING_COOLDOWN

    );

}


// ============================================================
// DETERMINE WHETHER TAB NEEDS WARNING
// ============================================================

function shouldShowWarning(row) {

    // ========================================================
    // PROTECTED TABS
    // ========================================================

    if (
        row.active ||
        row.pinned ||
        row.audible
    ) {
        return false;
    }


    // ========================================================
    // DO NOT WARN FOR ALREADY SUSPENDED TABS
    // ========================================================

    if (
        row.discarded === true
    ) {
        return false;
    }


    // ========================================================
    // GET IMPORTANCE
    // ========================================================

    const importance =
        Number(
            row.target_tab_importance ??
            row.tab_importance_score ??
            0
        );


    // ========================================================
    // GET RESOURCE PRESSURE
    // ========================================================

    const pressure =
        Number(
            row.resource_pressure
        );


    if (
        !Number.isFinite(importance) ||
        !Number.isFinite(pressure)
    ) {
        return false;
    }


    // ========================================================
    // RESOURCE PRESSURE CANDIDATE
    // ========================================================

    const pressureCandidate =
        pressure >= WARNING_PRESSURE_THRESHOLD &&
        importance <= WARNING_IMPORTANCE_THRESHOLD;


    // ========================================================
    // RL CANDIDATE
    // ========================================================

    const qCandidate =
        row.recommended_action === "SUSPEND";


    // ========================================================
    // FINAL WARNING DECISION
    // ========================================================

    return (
        pressureCandidate ||
        qCandidate
    );
}


// ============================================================
// DEMO WARNING CANDIDATE
// ============================================================
// In DEMO mode the warning is intentionally not dependent on
// resource-pressure/RL thresholds. Every alarm can show one
// warning for an eligible inactive tab.
// The tab is still protected if it is active, pinned, audible,
// discarded, or not an ordinary http/https page.
// ============================================================

function findDemoWarningCandidate(rows) {

    const candidates = rows.filter(row => {

        if (row.active || row.pinned || row.audible) {
            return false;
        }

        if (row.discarded === true) {
            return false;
        }

        if (!supportedURL(row.url)) {
            return false;
        }

        return true;

    });

    if (candidates.length === 0) {
        return null;
    }

    // Prefer the least important tab; if tied, prefer the tab
    // with greater resource pressure.
    candidates.sort((a, b) => {

        const importanceA = Number(
            a.target_tab_importance ??
            a.tab_importance_score ??
            0
        );

        const importanceB = Number(
            b.target_tab_importance ??
            b.tab_importance_score ??
            0
        );

        if (importanceA !== importanceB) {
            return importanceA - importanceB;
        }

        return Number(b.resource_pressure || 0) -
               Number(a.resource_pressure || 0);

    });

    return candidates[0];
}


// ============================================================
// FIND BEST WARNING CANDIDATE
// ============================================================

function findBestCandidate(rows) {

    const candidates =

        rows.filter(

            row =>

                shouldShowWarning(row) &&

                canWarnTab(row.tab_id)

        );


    if (
        candidates.length === 0
    ) {

        return null;

    }


    candidates.sort(

        (a, b) => {

            const importanceA =
                Number(

                    a.target_tab_importance ??
                    a.tab_importance_score ??
                    0

                );


            const importanceB =
                Number(

                    b.target_tab_importance ??
                    b.tab_importance_score ??
                    0

                );


            if (
                importanceA !==
                importanceB
            ) {

                return (

                    importanceA -
                    importanceB

                );

            }


            return (

                Number(
                    b.resource_pressure
                ) -

                Number(
                    a.resource_pressure
                )

            );

        }

    );


    return candidates[0];

}


// ============================================================
// SHOW WARNING WINDOW
// ============================================================

async function showWarning(row) {

    if (
        warningWindowId !== null
    ) {

        return false;

    }


    if (
        activeWarning !== null
    ) {

        return false;

    }


    const tabId =
        Number(row.tab_id);


    // --------------------------------------------------------
    // VERIFY TAB STILL EXISTS
    // --------------------------------------------------------

    let tab;


    try {

        tab =
            await chrome.tabs.get(
                tabId
            );

    }

    catch {

        return false;

    }


    // --------------------------------------------------------
    // SAFETY
    // --------------------------------------------------------

    if (
        tab.active ||
        tab.pinned ||
        tab.audible
    ) {

        return false;

    }


    if (
        !canWarnTab(tabId)
    ) {

        return false;

    }


    // --------------------------------------------------------
    // SAVE WARNING INFORMATION
    // --------------------------------------------------------

    warningHistory[
        String(tabId)
    ] =
        now();


    activeWarning = {

        tabId:
            tabId,

        snapshotId:
            row.snapshot_id,

        title:
            row.title,

        domain:
            row.domain,

        importance:
            Number(

                row.target_tab_importance ??
                row.tab_importance_score ??
                0

            ),

        importanceLevel:
            row.importance_level ||
            "LOW",

        pressure:
            Number(
                row.resource_pressure
            ) || 0,

        pressureLevel:
            row.pressure_level ||
            "LOW",

        rlState:
            row.rl_state ||
            "-",

        rlStateId:
            row.rl_state_id,

        qAction:
            row.q_action ||
            "KEEP",

        recommendedAction:
            row.recommended_action ||
            "KEEP",

        // These are browser/system resource values.
        // Stable Chrome extensions do not expose reliable
        // per-tab RAM/CPU usage through these APIs.
        systemRamUsagePercent:
            Number(row.system_ram_usage_percent) || 0,

        systemRamUsedGB:
            Number(row.system_ram_used_gb) || 0,

        systemRamTotalGB:
            Number(row.system_ram_total_gb) || 0,

        systemRamAvailableGB:
            Number(row.system_ram_available_gb) || 0,

        systemCpuUsagePercent:
            Number(row.system_cpu_usage_percent) || 0,

        totalOpenTabs:
            Number(row.total_open_tabs) || 0

    };


    await chrome.storage.local.set({

        abmiActiveWarning:
            activeWarning

    });


    // --------------------------------------------------------
    // OPEN WARNING WINDOW
    // --------------------------------------------------------

    try {

        const warningWindow =
            await chrome.windows.create({

                url:
                    chrome.runtime.getURL(
                        "warning.html"
                    ),

                type:
                    "popup",

                width:
                    520,

                height:
                    680,

                focused:
                    true

            });


        warningWindowId =
            warningWindow.id;


        return true;

    }

    catch (error) {

        console.error(
            "ABMI warning window error:",
            error
        );


        warningWindowId =
            null;

        activeWarning =
            null;


        await chrome.storage.local.remove(
            "abmiActiveWarning"
        );


        return false;

    }

}


// ============================================================
// WARNING WINDOW CLOSED
// ============================================================

chrome.windows.onRemoved.addListener(

    async windowId => {

        if (
            windowId !==
            warningWindowId
        ) {

            return;

        }


        warningWindowId =
            null;


        activeWarning =
            null;


        await chrome.storage.local.remove(
            "abmiActiveWarning"
        );

    }

);


// ============================================================
// Q-LEARNING FEEDBACK
// ============================================================

async function applyFeedback(
    warning,
    decision,
    resourceImpact
) {

    try {

        const result =
            await chrome.storage.local.get(
                "abmiQTable"
            );


        let qTable =
            result.abmiQTable;


        if (!qTable) {

            qTable =
                ABMI_QLEARNING
                    .createEmptyQTable();

        }


        qTable =
            ABMI_QLEARNING
                .ensureQTable(
                    qTable
                );


        const stateId =
            Number(
                warning.rlStateId
            );


        if (

            !Number.isInteger(stateId) ||

            stateId < 0 ||

            stateId >=
            ABMI_QLEARNING.TOTAL_STATES

        ) {

            return;

        }


        let actionIndex = 0;


        if (
            decision === "KEEP"
        ) {

            actionIndex = 0;

        }

        else if (
            decision === "WARN"
        ) {

            actionIndex = 1;

        }

        else if (
            decision === "SUSPEND"
        ) {

            actionIndex = 2;

        }

        else if (
            decision === "CLOSE"
        ) {

            actionIndex = 3;

        }


        const reward =
            ABMI_QLEARNING.calculateObservedReward(
                warning,
                decision,
                resourceImpact
            );


        qTable =
            ABMI_QLEARNING.updateQValue(

                qTable,

                stateId,

                actionIndex,

                reward,

                stateId

            );


        await chrome.storage.local.set({

            abmiQTable:
                qTable

        });

    }

    catch (error) {

        console.error(
            "ABMI Q-learning feedback error:",
            error
        );

    }

}


// ============================================================
// RESOURCE IMPACT MEASUREMENT
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


async function getCpuCounters() {

    const info =
        await chrome.system.cpu.getInfo();

    let total = 0;
    let idle = 0;

    for (
        const processor
        of info.processors
    ) {

        total +=
            processor.usage.total;

        idle +=
            processor.usage.idle;
    }

    return {
        total,
        idle
    };
}


function calculateCpuUsage(
    before,
    after
) {

    const totalDifference =
        after.total -
        before.total;

    const idleDifference =
        after.idle -
        before.idle;

    if (
        totalDifference <= 0
    ) {

        return null;
    }

    const usage =
        (
            1 -
            (
                idleDifference /
                totalDifference
            )
        ) * 100;

    return Number(
        Math.max(
            0,
            Math.min(
                100,
                usage
            )
        ).toFixed(2)
    );
}


async function measureCpuUsage(
    intervalMs = 500
) {

    try {

        const before =
            await getCpuCounters();

        await sleep(
            intervalMs
        );

        const after =
            await getCpuCounters();

        return calculateCpuUsage(
            before,
            after
        );

    }

    catch (error) {

        console.error(
            "ABMI CPU impact measurement error:",
            error
        );

        return null;
    }
}


async function getResourceSnapshot() {

    const memory =
        await getSystemMemory();

    const cpu =
        await measureCpuUsage(
            500
        );

    return {

        ramUsedGB:
            Number(
                memory.system_ram_used_gb
            ),

        ramTotalGB:
            Number(
                memory.system_ram_total_gb
            ),

        ramAvailableGB:
            Number(
                memory.system_ram_available_gb
            ),

        ramUsagePercent:
            Number(
                memory.system_ram_usage_percent
            ),

        cpuUsagePercent:
            cpu,

        timestamp:
            Date.now()

    };
}


// ============================================================
// MULTI-SAMPLE POST-ACTION RESOURCE MEASUREMENT
// ============================================================
// System RAM/CPU can fluctuate immediately after a tab is
// closed or suspended. Take several samples and use the lowest
// observed RAM usage as the post-action system measurement.
// This remains a system-level measurement; it is NOT exact
// per-tab RAM usage.
// ============================================================

async function getBestPostActionResourceSnapshot(
    samples = 4,
    intervalMs = 1000
) {

    const measurements = [];

    for (
        let i = 0;
        i < samples;
        i++
    ) {

        try {

            const snapshot =
                await getResourceSnapshot();

            if (
                Number.isFinite(
                    snapshot.ramUsedGB
                )
            ) {

                measurements.push(
                    snapshot
                );

            }

        }

        catch (error) {

            console.error(
                "ABMI post-action sample error:",
                error
            );

        }

        if (
            i < samples - 1
        ) {

            await sleep(
                intervalMs
            );

        }

    }

    if (
        measurements.length === 0
    ) {

        return await getResourceSnapshot();

    }

    let best =
        measurements[0];

    for (
        const measurement
        of measurements
    ) {

        if (
            Number.isFinite(
                measurement.ramUsedGB
            ) &&
            measurement.ramUsedGB <
            best.ramUsedGB
        ) {

            best =
                measurement;

        }

    }

    return best;
}


function calculateResourceImpact(
    before,
    after
) {

    const ramRecovered =
        before.ramUsedGB -
        after.ramUsedGB;

    const ramPercentImprovement =
        before.ramUsagePercent -
        after.ramUsagePercent;

    const cpuPercentImprovement =
        (
            Number.isFinite(
                before.cpuUsagePercent
            ) &&
            Number.isFinite(
                after.cpuUsagePercent
            )
        )
            ? before.cpuUsagePercent -
              after.cpuUsagePercent
            : null;

    return {

        beforeRamUsedGB:
            Number(
                before.ramUsedGB.toFixed(2)
            ),

        afterRamUsedGB:
            Number(
                after.ramUsedGB.toFixed(2)
            ),

        ramRecoveredGB:
            Number(
                Math.max(
                    0,
                    ramRecovered
                ).toFixed(2)
            ),

        ramUsageBeforePercent:
            Number(
                before.ramUsagePercent.toFixed(2)
            ),

        ramUsageAfterPercent:
            Number(
                after.ramUsagePercent.toFixed(2)
            ),

        ramUsageImprovementPercent:
            Number(
                Math.max(
                    0,
                    ramPercentImprovement
                ).toFixed(2)
            ),

        cpuUsageBeforePercent:
            Number(
                before.cpuUsagePercent
            ),

        cpuUsageAfterPercent:
            Number(
                after.cpuUsagePercent
            ),

        cpuUsageImprovementPercent:
            Number(
                Math.max(
                    0,
                    cpuPercentImprovement || 0
                ).toFixed(2)
            ),

        // Signed system-level changes are retained for
        // diagnostics so the UI can distinguish a real
        // improvement from a natural resource increase.
        ramSystemDeltaGB:
            Number(
                ramRecovered.toFixed(2)
            ),

        cpuSystemDeltaPercent:
            Number.isFinite(
                cpuPercentImprovement
            )
                ? Number(
                    cpuPercentImprovement.toFixed(2)
                )
                : null

    };
}


// ============================================================
// HANDLE USER DECISION
// MODULE 5 ACTION MANAGER
// ============================================================

async function handleUserDecision(decision) {

    const normalized =
        String(decision || "").toUpperCase();

    if (!["KEEP", "SUSPEND", "CLOSE"].includes(normalized)) {

        return {
            success: false,
            error: "Invalid ABMI decision."
        };
    }

    const stored =
        await chrome.storage.local.get(
            "abmiActiveWarning"
        );

    const warning =
        stored.abmiActiveWarning ||
        activeWarning;

    if (!warning) {

        return {
            success: false,
            error: "No active ABMI warning."
        };
    }

    const tabId =
        Number(warning.tabId);

    // --------------------------------------------------------
    // MEASURE SYSTEM RESOURCES BEFORE THE ACTION
    // --------------------------------------------------------

    let beforeResources;

    try {

        beforeResources =
            await getResourceSnapshot();

    }

    catch (error) {

        console.error(
            "ABMI pre-action resource measurement:",
            error
        );

        beforeResources = {

            ramUsedGB:
                Number(
                    warning.systemRamUsedGB
                ) || 0,

            ramTotalGB:
                Number(
                    warning.systemRamTotalGB
                ) || 0,

            ramAvailableGB:
                Number(
                    warning.systemRamAvailableGB
                ) || 0,

            ramUsagePercent:
                Number(
                    warning.systemRamUsagePercent
                ) || 0,

            cpuUsagePercent:
                Number(
                    warning.systemCpuUsagePercent
                ) || 0

        };
    }

    // --------------------------------------------------------
    // EXECUTE ACTUAL TAB ACTION
    // --------------------------------------------------------

    let result;

    try {

        result =
            await ABMI_ACTION_MANAGER.executeAction(
                tabId,
                normalized
            );

    }

    catch (error) {

        return {
            success: false,
            error: error.message
        };
    }

    if (!result || !result.success) {

        return (
            result || {
                success: false,
                error: "ABMI action failed."
            }
        );
    }

    // ========================================================
    // RESOURCE IMPACT
    // ========================================================

    let resourceImpact;

    // KEEP does not intentionally change browser resources.
    // Do NOT take a second system reading and attribute natural
    // RAM/CPU fluctuations to KEEP.
    if (
        normalized === "KEEP"
    ) {

        resourceImpact = {

            beforeRamUsedGB:
                Number(
                    beforeResources.ramUsedGB
                ),

            afterRamUsedGB:
                Number(
                    beforeResources.ramUsedGB
                ),

            ramRecoveredGB:
                0,

            ramUsageBeforePercent:
                Number(
                    beforeResources.ramUsagePercent
                ),

            ramUsageAfterPercent:
                Number(
                    beforeResources.ramUsagePercent
                ),

            ramUsageImprovementPercent:
                0,

            cpuUsageBeforePercent:
                Number(
                    beforeResources.cpuUsagePercent
                ),

            cpuUsageAfterPercent:
                Number(
                    beforeResources.cpuUsagePercent
                ),

            cpuUsageImprovementPercent:
                0,

            actionEffect:
                "No resource optimization was performed."

        };

    }

    // SUSPEND and CLOSE actually modify browser state, so
    // measure the system again after Chrome has applied them.
    else {

        // Give Chrome time to apply the tab change, then take
        // several system-level measurements to reduce noise.
        await sleep(1500);

        let afterResources;

        try {

            afterResources =
                await getBestPostActionResourceSnapshot(
                    4,
                    1000
                );

        }

        catch (error) {

            console.error(
                "ABMI post-action resource measurement:",
                error
            );

            afterResources =
                beforeResources;
        }

        resourceImpact =
            calculateResourceImpact(
                beforeResources,
                afterResources
            );

        resourceImpact.actionEffect =
            normalized +
            " changed the browser tab state; " +
            "resource impact was measured at system level.";

    }

    // --------------------------------------------------------
    // LEARN FROM USER DECISION
    // --------------------------------------------------------

    try {

        await applyFeedback(
            warning,
            normalized,
            resourceImpact
        );

    }

    catch (error) {

        console.error(
            "ABMI feedback error:",
            error
        );

    }

    warningHistory[String(tabId)] =
        now();

    activeWarning =
        null;

    await chrome.storage.local.remove(
        "abmiActiveWarning"
    );

    await chrome.storage.local.set({
        abmiLastActionResult: {
            action: normalized,
            tabId: tabId,
            tabTitle: warning.title || "Untitled Tab",
            timestamp: timestamp(),
            resourceImpact: resourceImpact
        }
    });

    return {

        success: true,

        action:
            normalized,

        tabId:
            tabId,

        resourceImpact:
            resourceImpact,

        resourceNote:
            "RAM/CPU improvement is measured at system level. " +
            "Chrome stable does not expose reliable exact per-tab RAM usage."

    };
}


// ============================================================
// COLLECT SNAPSHOT


// ============================================================

async function collectSnapshot() {

    const tabs =
        await chrome.tabs.query({});


    const totalTabs =
        tabs.length;


    const snapshotId =
        Date.now();


    // --------------------------------------------------------
    // SYSTEM RESOURCES
    // --------------------------------------------------------

    const memory =
        await getSystemMemory();


    const cpu =
        await getSystemCPU();


    const module2Rows = [];


    // ========================================================
    // MODULE 1 + MODULE 2
    // ========================================================

    for (
        const tab of tabs
    ) {

        try {

            const rawRow =
                await createRawRow(

                    tab,

                    memory,

                    cpu,

                    totalTabs

                );


            const engineeredRow =
                ABMI_FEATURES
                    .engineerFeatures(
                        rawRow
                    );


            module2Rows.push(
                engineeredRow
            );

        }

        catch (error) {

            console.error(
                "ABMI row creation error:",
                error
            );

        }

    }


    // ========================================================
    // MODULE 3
    // ========================================================

    const stateRows =
        ABMI_RL_STATE
            .createBrowserRLStates(
                module2Rows
            );


    // ========================================================
    // MODULE 4
    // ========================================================

    const qResult =
        await chrome.storage.local.get(
            "abmiQTable"
        );


    let qTable =
        qResult.abmiQTable;


    if (!qTable) {

        qTable =
            ABMI_QLEARNING
                .createEmptyQTable();

    }


    qTable =
        ABMI_QLEARNING
            .ensureQTable(
                qTable
            );


    const qResultProcessed =
        ABMI_QLEARNING
            .processSnapshot(

                stateRows,

                qTable

            );


    qTable =
        qResultProcessed.qTable;


    await chrome.storage.local.set({

        abmiQTable:
            qTable

    });


    // ========================================================
    // FINAL DATASET ROWS
    // ========================================================

    const finalRows =
        qResultProcessed.rows.map(

            row => {

                const reward =
                    ABMI_QLEARNING
                        .calculateSimulatedReward(

                            row,

                            row.recommended_action

                        );


                return {

                    ...row,

                    snapshot_id:
                        snapshotId,

                    simulated_reward:
                        reward

                };

            }

        );


    return finalRows;

}


// ============================================================
// COLLECT + STORE
// ============================================================

async function collectAndStoreSnapshot() {

    try {

        const rows =
            await collectSnapshot();


        if (
            rows.length === 0
        ) {

            return {

                success: false,

                newRecords: 0,

                totalRecords: 0,

                warningShown: false

            };

        }


        const result =
            await chrome.storage.local.get(
                "dataset"
            );


        const dataset =
            result.dataset || [];


        dataset.push(
            ...rows
        );

        // Keep storage bounded while retaining the newest records.
        // One-minute monitoring can otherwise grow indefinitely.
        const trimmedDataset =
            dataset.length > MAX_DATASET_RECORDS
                ? dataset.slice(-MAX_DATASET_RECORDS)
                : dataset;


        await chrome.storage.local.set({

            dataset:
                trimmedDataset,

            last_snapshot_time:
                timestamp(),

            last_snapshot_id:
                rows[0].snapshot_id

        });


        // ----------------------------------------------------
        // FIND WARNING
        // ----------------------------------------------------

        let warningShown =
            false;


        // DEMO mode: show one warning on every monitoring alarm
        // whenever an eligible inactive tab exists.
        // NORMAL mode: use the RL/resource-pressure candidate.
        const candidate =
            DEMO_WARNING_EVERY_MINUTE
                ? findDemoWarningCandidate(rows)
                : findBestCandidate(rows);

        console.log(
            "[ABMI] Warning check:",
            new Date().toLocaleTimeString(),
            "demo=",
            DEMO_WARNING_EVERY_MINUTE,
            "candidate=",
            candidate ? candidate.tab_id : null,
            "warningWindowId=",
            warningWindowId,
            "activeWarning=",
            Boolean(activeWarning)
        );

        if (
            candidate &&
            warningWindowId === null &&
            activeWarning === null
        ) {

            warningShown =
                await showWarning(
                    candidate
                );

        }


        return {

            success: true,

            newRecords:
                rows.length,

            totalRecords:
                trimmedDataset.length,

            snapshotId:
                rows[0].snapshot_id,

            warningShown:
                warningShown

        };

    }

    catch (error) {

        console.error(
            "ABMI collection error:",
            error
        );


        return {

            success: false,

            newRecords: 0,

            totalRecords: 0,

            error:
                error.message

        };

    }

}


// ============================================================
// ALARM
// ============================================================

async function createAlarm() {

    if (
        !chrome.alarms
    ) {

        return;

    }


    const existing =
        await chrome.alarms.get(
            ABMI_ALARM_NAME
        );


    if (!existing) {

        await chrome.alarms.create(

            ABMI_ALARM_NAME,

            {

                periodInMinutes:
                    1

            }

        );

        console.log(
            "[ABMI] 1-minute monitoring alarm created."
        );

    }
    else {

        console.log(
            "[ABMI] 1-minute monitoring alarm already exists.",
            existing
        );

    }

}


if (
    chrome.alarms &&
    chrome.alarms.onAlarm
) {

    chrome.alarms.onAlarm.addListener(

        async alarm => {

            if (
                alarm.name ===
                ABMI_ALARM_NAME
            ) {

                console.log(
                    "[ABMI] 1-minute alarm fired:",
                    new Date().toLocaleTimeString()
                );

                const result =
                    await collectAndStoreSnapshot();

                console.log(
                    "[ABMI] Alarm snapshot result:",
                    result
                );

            }

        }

    );

}


// ============================================================
// MESSAGE HANDLER
// ============================================================

chrome.runtime.onMessage.addListener(

    (
        message,
        sender,
        sendResponse
    ) => {

        // ====================================================
        // COLLECT SNAPSHOT
        // ====================================================

        if (
            message.action ===
            "collectSnapshot"
        ) {

            collectAndStoreSnapshot()

                .then(
                    result =>
                        sendResponse(result)
                )

                .catch(
                    error =>
                        sendResponse({

                            success: false,

                            error:
                                error.message

                        })
                );


            return true;

        }


        // ====================================================
        // GET STATUS
        // ====================================================

        if (
            message.action ===
            "getStatus"
        ) {

            chrome.storage.local
                .get([

                    "dataset",
                    "last_snapshot_time",
                    "last_snapshot_id",
                    "abmiLastActionResult",
                    "abmiSuspendedTabs"

                ])
                .then(

                    result => {

                        chrome.tabs.query({})
                            .then(tabs => {

                                const suspendedTabs =
                                    Array.isArray(
                                        result.abmiSuspendedTabs
                                    )
                                        ? result.abmiSuspendedTabs
                                        : [];

                                sendResponse({

                                    success: true,

                                    monitoring:
                                        "Active",

                                    records:
                                        (
                                            result.dataset ||
                                            []
                                        ).length,

                                    lastSnapshot:
                                        result.last_snapshot_time ||
                                        "Never",

                                    lastSnapshotId:
                                        result.last_snapshot_id ||
                                        null,

                                    totalOpenTabs:
                                        tabs.length,

                                    totalSuspendedTabs:
                                        suspendedTabs.length,

                                    lastActionResult:
                                        result.abmiLastActionResult || null,

                                    suspendedTabs:
                                        suspendedTabs.map(
                                            tab => ({
                                                suspensionId:
                                                    tab.suspensionId,
                                                tabId:
                                                    tab.originalTabId,
                                                title:
                                                    tab.title ||
                                                    "Untitled Tab",
                                                url:
                                                    tab.url ||
                                                    "",
                                                domain:
                                                    getDomain(
                                                        tab.url ||
                                                        ""
                                                    )
                                            })
                                        )

                                });

                            });

                    }
                );

            return true;

        }


        // ====================================================
        // RESTORE SUSPENDED TAB
        // ====================================================

        if (
            message.action ===
            "restoreTab"
        ) {

            ABMI_ACTION_MANAGER
                .restoreTab(
                    message.suspensionId
                )
                .then(
                    result =>
                        sendResponse(result)
                )
                .catch(
                    error =>
                        sendResponse({
                            success: false,
                            error: error.message
                        })
                );

            return true;
        }


        // ====================================================
        // CLEAR DATASET
        // ====================================================

        if (
            message.action ===
            "clearDataset"
        ) {

            chrome.storage.local

                .set({

                    dataset: [],

                    last_snapshot_time:
                        null,

                    last_snapshot_id:
                        null

                })

                .then(

                    () => {

                        sendResponse({

                            success: true

                        });

                    }

                );


            return true;

        }


        // ====================================================
        // RESET Q-LEARNING
        // ====================================================

        if (
            message.action ===
            "resetQTable"
        ) {

            chrome.storage.local

                .set({

                    abmiQTable:
                        ABMI_QLEARNING
                            .createEmptyQTable()

                })

                .then(

                    () => {

                        sendResponse({

                            success: true

                        });

                    }

                );


            return true;

        }


        // ====================================================
        // CLEAR WARNING
        // Dismiss warning without changing the tab.
        // This is NOT KEEP/SUSPEND/CLOSE feedback.
        // ====================================================

        if (
            message.action ===
            "clearWarning"
        ) {

            console.log(
                "[ABMI] CLEAR WARNING requested."
            );

            activeWarning = null;

            chrome.storage.local
                .remove("abmiActiveWarning")
                .then(() => {

                    sendResponse({
                        success: true,
                        message:
                            "Warning cleared. Tab was not changed."
                    });

                })
                .catch(error => {

                    console.error(
                        "[ABMI] Clear warning error:",
                        error
                    );

                    sendResponse({
                        success: false,
                        error:
                            error.message ||
                            "Failed to clear warning."
                    });

                });

            return true;
        }


        // ====================================================
        // USER DECISION
        // KEEP / SUSPEND / CLOSE
        // ====================================================

        if (
            message.action ===
            "userDecision"
        ) {

            handleUserDecision(

                message.decision

            )

                .then(

                    result => {

                        console.log(
                            "ABMI decision result:",
                            result
                        );


                        sendResponse(
                            result
                        );

                    }

                )

                .catch(

                    error => {

                        console.error(
                            "ABMI decision handler error:",
                            error
                        );


                        sendResponse({

                            success: false,

                            error:
                                error.message

                        });

                    }

                );


            return true;

        }

    }

);


// ============================================================
// START ABMI
// ============================================================

async function startABMI() {

    try {

        await loadSessionData();

        await initializeAllTabs();

        await createAlarm();


        const result =
            await chrome.storage.local.get(
                "abmiQTable"
            );


        if (
            !result.abmiQTable
        ) {

            await chrome.storage.local.set({

                abmiQTable:
                    ABMI_QLEARNING
                        .createEmptyQTable()

            });

        }


        console.log(
            "================================"
        );

        console.log(
            "ABMI SERVICE WORKER STARTED"
        );

        console.log(
            "Module 1: ACTIVE"
        );

        console.log(
            "Module 2: ACTIVE"
        );

        console.log(
            "Module 3: ACTIVE"
        );

        console.log(
            "Module 4: ACTIVE"
        );

        console.log(
            "Module 5: ACTIVE"
        );

        console.log(
            "KEEP / SUSPEND / CLOSE / RESTORE: ACTIVE"
        );

        console.log(
            "================================"
        );

    }

    catch (error) {

        console.error(
            "ABMI startup error:",
            error
        );

    }

}


startABMI();
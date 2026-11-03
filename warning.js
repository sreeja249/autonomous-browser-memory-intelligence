// ============================================================
// ABMI WARNING WINDOW
// KEEP / SUSPEND / CLOSE
// RESOURCE IMPACT RESULT
// ============================================================


// ============================================================
// ELEMENT REFERENCES
// ============================================================

const warningTabName =
    document.getElementById("tabName");

const warningDomain =
    document.getElementById("domain");

const warningImportance =
    document.getElementById("importance");

const warningImportanceLevel =
    document.getElementById("importanceLevel");

const warningPressure =
    document.getElementById("pressure");

const warningPressureLevel =
    document.getElementById("pressureLevel");

const warningRLState =
    document.getElementById("rlState");

const warningRamUsage =
    document.getElementById("ramUsage");

const warningCpuUsage =
    document.getElementById("cpuUsage");

const warningRamUsedTotal =
    document.getElementById("ramUsedTotal");

const warningOpenTabs =
    document.getElementById("openTabs");

const warningExactTabRam =
    document.getElementById("exactTabRam");


// Resource result elements

const resourceResult =
    document.getElementById("resourceResult");

const resourceResultTitle =
    document.getElementById("resourceResultTitle");

const ramRecovered =
    document.getElementById("ramRecovered");

const ramImprovement =
    document.getElementById("ramImprovement");

const cpuImprovement =
    document.getElementById("cpuImprovement");

const ramAfter =
    document.getElementById("ramAfter");

const ramBeforeAfter =
    document.getElementById(
        "ramBeforeAfter"
    );

const cpuBeforeAfter =
    document.getElementById(
        "cpuBeforeAfter"
    );


// Buttons

const warningKeepButton =
    document.getElementById("keepButton");

const warningSuspendButton =
    document.getElementById("suspendButton");

const warningCloseButton =
    document.getElementById("closeButton");

const clearWarningButton =
    document.getElementById(
        "clearWarningButton"
    );


// ============================================================
// LOAD WARNING DATA
// ============================================================

async function loadWarning() {

    try {

        const result =
            await chrome.storage.local.get(
                "abmiActiveWarning"
            );

        const data =
            result.abmiActiveWarning;


        // ----------------------------------------------------
        // No warning available
        // ----------------------------------------------------

        if (!data) {

            document.body.innerHTML =

                "<h2 style='padding:20px'>" +
                "No active ABMI warning." +
                "</h2>";

            return;

        }


        console.log(
            "ABMI warning data:",
            data
        );


        // ----------------------------------------------------
        // Tab information
        // ----------------------------------------------------

        warningTabName.textContent =
            data.title ||
            "Unknown Tab";


        warningDomain.textContent =
            data.domain ||
            "Unknown domain";


        // ----------------------------------------------------
        // Importance
        // ----------------------------------------------------

        warningImportance.textContent =

            (
                Number(
                    data.importance || 0
                ) * 100
            ).toFixed(1) +

            "%";


        warningImportanceLevel.textContent =
            data.importanceLevel ||
            "-";


        // ----------------------------------------------------
        // Resource pressure
        // ----------------------------------------------------

        warningPressure.textContent =

            (
                Number(
                    data.pressure || 0
                ) * 100
            ).toFixed(1) +

            "%";


        warningPressureLevel.textContent =
            data.pressureLevel ||
            "-";


        // ----------------------------------------------------
        // RL State
        // ----------------------------------------------------

        warningRLState.textContent =
            data.rlState ||
            "-";


        // ----------------------------------------------------
        // System resources
        // ----------------------------------------------------

        warningRamUsage.textContent =

            Number(
                data.systemRamUsagePercent || 0
            ).toFixed(1) +

            "%";


        warningCpuUsage.textContent =

            Number(
                data.systemCpuUsagePercent || 0
            ).toFixed(1) +

            "%";


        warningRamUsedTotal.textContent =

            Number(
                data.systemRamUsedGB || 0
            ).toFixed(2) +

            " GB / " +

            Number(
                data.systemRamTotalGB || 0
            ).toFixed(2) +

            " GB";


        // ----------------------------------------------------
        // Open tabs
        // ----------------------------------------------------

        warningOpenTabs.textContent =
            data.totalOpenTabs ?? "-";


        // ----------------------------------------------------
        // Exact per-tab RAM limitation
        // ----------------------------------------------------

        warningExactTabRam.textContent =
            "Not exposed by stable Chrome API";

    }

    catch (error) {

        console.error(
            "ABMI warning loading error:",
            error
        );

        showError(
            error.message
        );

    }

}


// ============================================================
// SHOW RESOURCE IMPACT
// ============================================================

function showResourceImpact(response) {

    const impact =
        response &&
        response.resourceImpact;


    // --------------------------------------------------------
    // No resource measurement available
    // --------------------------------------------------------

    if (!impact) {

        resourceResultTitle.textContent =
            "Action completed";


        ramRecovered.textContent =
            "0.00 GB";


        ramImprovement.textContent =
            "0.00 percentage points";


        cpuImprovement.textContent =
            "Not measured";


        ramAfter.textContent =
            "-";


        ramBeforeAfter.textContent =
            "Not measured";


        cpuBeforeAfter.textContent =
            "Not measured";


        resourceResult.style.display =
            "block";


        return;

    }


    // --------------------------------------------------------
    // Result title
    // --------------------------------------------------------

    if (response.action === "KEEP") {

        resourceResultTitle.textContent =
            "KEEP completed — no resource optimization performed";

    }
    else {

        resourceResultTitle.textContent =

            (
                response.action ||
                "ACTION"
            ) +

            " completed — estimated resource impact";

    }


    // --------------------------------------------------------
    // RAM recovered
    // --------------------------------------------------------

    ramRecovered.textContent =

        Number(
            impact.ramRecoveredGB || 0
        ).toFixed(2) +

        " GB";


    // --------------------------------------------------------
    // RAM usage improvement
    // --------------------------------------------------------

    ramImprovement.textContent =

        Number(
            impact.ramUsageImprovementPercent || 0
        ).toFixed(2) +

        " percentage points";


    // --------------------------------------------------------
    // CPU improvement
    // --------------------------------------------------------

    if (

        Number.isFinite(

            Number(
                impact.cpuUsageImprovementPercent
            )

        )

    ) {

        cpuImprovement.textContent =

            Number(
                impact.cpuUsageImprovementPercent
            ).toFixed(2) +

            " percentage points";

    }

    else {

        cpuImprovement.textContent =
            "Not measured";

    }


    // --------------------------------------------------------
    // RAM used after action
    // --------------------------------------------------------

    if (

        Number.isFinite(
            Number(
                impact.afterRamUsedGB
            )
        )

    ) {

        ramAfter.textContent =

            Number(
                impact.afterRamUsedGB
            ).toFixed(2) +

            " GB";

    }

    else {

        ramAfter.textContent =
            "Not measured";

    }


    // --------------------------------------------------------
    // RAM before → after
    // --------------------------------------------------------

    if (

        Number.isFinite(
            Number(
                impact.beforeRamUsedGB
            )
        )

        &&

        Number.isFinite(
            Number(
                impact.afterRamUsedGB
            )
        )

    ) {

        ramBeforeAfter.textContent =

            Number(
                impact.beforeRamUsedGB
            ).toFixed(2) +

            " → " +

            Number(
                impact.afterRamUsedGB
            ).toFixed(2) +

            " GB";

    }

    else {

        ramBeforeAfter.textContent =
            "Not measured";

    }


    // --------------------------------------------------------
    // CPU before → after
    // --------------------------------------------------------

    if (

        Number.isFinite(
            Number(
                impact.cpuUsageBeforePercent
            )
        )

        &&

        Number.isFinite(
            Number(
                impact.cpuUsageAfterPercent
            )
        )

    ) {

        cpuBeforeAfter.textContent =

            Number(
                impact.cpuUsageBeforePercent
            ).toFixed(1) +

            "% → " +

            Number(
                impact.cpuUsageAfterPercent
            ).toFixed(1) +

            "%";

    }

    else {

        cpuBeforeAfter.textContent =
            "Not measured";

    }


    // --------------------------------------------------------
    // Show result box
    // --------------------------------------------------------

    resourceResult.style.display =
        "block";


    // --------------------------------------------------------
    // Make result visually prominent
    // --------------------------------------------------------

    resourceResult.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// ============================================================
// FINISH SUCCESSFUL ACTION
// IMPORTANT:
// DO NOT AUTOMATICALLY CLOSE THE WINDOW
// ============================================================

function finishSuccessfulAction(response) {

    // Show resource measurement
    showResourceImpact(
        response
    );


    // --------------------------------------------------------
    // Hide action buttons
    // --------------------------------------------------------

    warningKeepButton.style.display =
        "none";

    warningSuspendButton.style.display =
        "none";

    warningCloseButton.style.display =
        "none";


    // --------------------------------------------------------
    // Hide the CLOSE warning message
    // --------------------------------------------------------

    const closeWarning =
        document.querySelector(
            ".close-warning"
        );

    if (closeWarning) {

        closeWarning.style.display =
            "none";

    }


    // --------------------------------------------------------
    // Show CLEAR / CLOSE button
    // --------------------------------------------------------

    if (clearWarningButton) {

        clearWarningButton.style.display =
            "block";

    }

}


// ============================================================
// DISABLE ACTION BUTTONS
// ============================================================

function disableButtons() {

    warningKeepButton.disabled =
        true;

    warningSuspendButton.disabled =
        true;

    warningCloseButton.disabled =
        true;

}


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

    const errorBox =
        document.createElement("div");


    errorBox.className =
        "abmi-error";


    errorBox.textContent =
        "ABMI Error: " +
        message;


    const card =
        document.querySelector(
            ".card"
        );


    if (card) {

        card.appendChild(
            errorBox
        );

    }

}


// ============================================================
// RE-ENABLE BUTTONS AFTER ERROR
// ============================================================

function enableButtons() {

    warningKeepButton.disabled =
        false;

    warningSuspendButton.disabled =
        false;

    warningCloseButton.disabled =
        false;

}


// ============================================================
// KEEP
// ============================================================

warningKeepButton.addEventListener(

    "click",

    async () => {

        disableButtons();


        try {

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        "userDecision",

                    decision:
                        "KEEP"

                });


            console.log(
                "ABMI KEEP response:",
                response
            );


            if (

                !response ||

                !response.success

            ) {

                showError(

                    response?.error ||

                    "KEEP operation failed."

                );


                enableButtons();


                return;

            }


            finishSuccessfulAction(
                response
            );

        }

        catch (error) {

            console.error(
                "KEEP error:",
                error
            );


            showError(
                error.message
            );


            enableButtons();

        }

    }

);


// ============================================================
// SUSPEND
// ============================================================

warningSuspendButton.addEventListener(

    "click",

    async () => {

        disableButtons();


        try {

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        "userDecision",

                    decision:
                        "SUSPEND"

                });


            console.log(
                "ABMI SUSPEND response:",
                response
            );


            if (

                !response ||

                !response.success

            ) {

                showError(

                    response?.error ||

                    "SUSPEND operation failed."

                );


                enableButtons();


                return;

            }


            // ------------------------------------------------
            // IMPORTANT:
            // Resource result remains visible.
            // Window does NOT automatically close.
            // ------------------------------------------------

            finishSuccessfulAction(
                response
            );

        }

        catch (error) {

            console.error(
                "SUSPEND error:",
                error
            );


            showError(
                error.message
            );


            enableButtons();

        }

    }

);


// ============================================================
// CLOSE
// ============================================================

warningCloseButton.addEventListener(

    "click",

    async () => {


        // ----------------------------------------------------
        // Confirmation
        // ----------------------------------------------------

        const confirmed =
            window.confirm(

                "Are you sure you want to CLOSE this tab?\n\n" +

                "The tab will be permanently removed " +

                "from the current browser session."

            );


        if (!confirmed) {

            return;

        }


        console.log(
            "ABMI CLOSE confirmed by user."
        );


        disableButtons();


        try {


            // ------------------------------------------------
            // Send CLOSE command
            // ------------------------------------------------

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        "userDecision",

                    decision:
                        "CLOSE"

                });


            console.log(
                "ABMI CLOSE response:",
                response
            );


            // ------------------------------------------------
            // Operation failed
            // ------------------------------------------------

            if (

                !response ||

                !response.success

            ) {

                showError(

                    response?.error ||

                    "The tab could not be closed."

                );


                enableButtons();


                return;

            }


            console.log(
                "ABMI successfully closed target tab."
            );


            // ------------------------------------------------
            // Show result.
            // Do NOT automatically close warning.
            // ------------------------------------------------

            finishSuccessfulAction(
                response
            );

        }

        catch (error) {

            console.error(
                "ABMI CLOSE error:",
                error
            );


            showError(
                error.message
            );


            enableButtons();

        }

    }

);


// ============================================================
// CLEAR / CLOSE WARNING
// ============================================================

if (clearWarningButton) {

    clearWarningButton.addEventListener(

        "click",

        async () => {

            try {

                // --------------------------------------------
                // Remove active warning from storage
                // --------------------------------------------

                await chrome.storage.local.remove(
                    "abmiActiveWarning"
                );


                console.log(
                    "ABMI warning cleared."
                );

            }

            catch (error) {

                console.error(
                    "Error clearing ABMI warning:",
                    error
                );

            }


            // --------------------------------------------
            // Close warning window
            // --------------------------------------------

            window.close();

        }

    );

}


// ============================================================
// START
// ============================================================

loadWarning();
// ============================================================
// ABMI MODULE 4
// Q-LEARNING
// ============================================================

var ABMI_QLEARNING = (() => {

    // --------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------

    const ACTIONS = [
        "KEEP",
        "WARN",
        "SUSPEND",
        "CLOSE"
    ];


    const LEARNING_RATE = 0.20;

    const DISCOUNT_FACTOR = 0.80;

    const EPSILON = 0.10;

    const TOTAL_STATES = 27;


    // --------------------------------------------------------
    // CREATE EMPTY Q TABLE
    // --------------------------------------------------------

    function createEmptyQTable() {

        const table = [];

        for (
            let state = 0;
            state < TOTAL_STATES;
            state++
        ) {

            table.push([
                0, // KEEP
                0, // WARN
                0, // SUSPEND
                0  // CLOSE
            ]);

        }

        return table;
    }


    // --------------------------------------------------------
    // ENSURE Q TABLE
    // --------------------------------------------------------

    function ensureQTable(table) {

        if (!Array.isArray(table)) {

            return createEmptyQTable();

        }

        while (
            table.length < TOTAL_STATES
        ) {

            table.push([
                0,
                0,
                0,
                0
            ]);

        }


        for (
            let i = 0;
            i < TOTAL_STATES;
            i++
        ) {

            if (
                !Array.isArray(table[i])
            ) {

                table[i] = [
                    0,
                    0,
                    0,
                    0
                ];

            }


            while (
                table[i].length <
                ACTIONS.length
            ) {

                table[i].push(0);

            }

        }


        return table;

    }


    // --------------------------------------------------------
    // MAX Q
    // --------------------------------------------------------

    function getMaxQ(qValues) {

        return Math.max(
            ...qValues
        );

    }


    // --------------------------------------------------------
    // BEST ACTION
    // --------------------------------------------------------

    function getBestActionIndex(qValues) {

        let bestIndex = 0;

        for (
            let i = 1;
            i < qValues.length;
            i++
        ) {

            if (
                qValues[i] >
                qValues[bestIndex]
            ) {

                bestIndex = i;

            }

        }

        return bestIndex;

    }


    // --------------------------------------------------------
    // CHOOSE ACTION
    // --------------------------------------------------------

    function chooseAction(
        qValues,
        allowExploration = true
    ) {

        if (
            allowExploration &&
            Math.random() < EPSILON
        ) {

            // During exploration we do NOT randomly
            // close a tab.

            return Math.floor(
                Math.random() * 3
            );

        }


        return getBestActionIndex(
            qValues
        );

    }


    // --------------------------------------------------------
    // RECOMMEND ACTION
    // --------------------------------------------------------
    //
    // CLOSE is intentionally NOT automatically recommended.
    // It is a user-confirmed action.
    //
    // --------------------------------------------------------

    function recommendAction(
        row,
        qValues
    ) {

        const importance =
            Number(
                row.target_tab_importance ??
                row.tab_importance_score ??
                0
            );


        const pressure =
            Number(
                row.resource_pressure
            ) || 0;


        // ----------------------------------------------------
        // Safety layer
        // ----------------------------------------------------

        if (
            row.active ||
            row.pinned ||
            row.audible
        ) {

            return "KEEP";

        }


        // ----------------------------------------------------
        // Very important tab
        // ----------------------------------------------------

        if (
            importance >= 0.70
        ) {

            return "KEEP";

        }


        // ----------------------------------------------------
        // Very high resource pressure + low importance
        // ----------------------------------------------------

        if (

            pressure >= 0.70 &&

            importance < 0.40

        ) {

            return "SUSPEND";

        }


        // ----------------------------------------------------
        // Medium pressure + low importance
        // ----------------------------------------------------

        if (

            pressure >= 0.45 &&

            importance < 0.30

        ) {

            return "WARN";

        }


        // ----------------------------------------------------
        // Q-learning
        //
        // Only KEEP / WARN / SUSPEND can be automatically
        // selected.
        //
        // CLOSE remains user-controlled.
        // ----------------------------------------------------

        const safeQValues = [

            qValues[0] || 0,
            qValues[1] || 0,
            qValues[2] || 0

        ];


        const actionIndex =
            chooseAction(
                safeQValues,
                true
            );


        return [

            "KEEP",
            "WARN",
            "SUSPEND"

        ][actionIndex];

    }


    // --------------------------------------------------------
    // PROCESS SNAPSHOT
    // --------------------------------------------------------

    function processSnapshot(
        rows,
        qTable
    ) {

        qTable =
            ensureQTable(
                qTable
            );


        const output =
            rows.map(

                row => {

                    const stateId =
                        Number(
                            row.rl_state_id
                        );


                    const safeStateId =

                        Number.isInteger(
                            stateId
                        ) &&

                        stateId >= 0 &&

                        stateId < TOTAL_STATES

                            ? stateId

                            : 0;


                    const qValues =
                        qTable[
                            safeStateId
                        ];


                    const action =
                        recommendAction(
                            row,
                            qValues
                        );


                    const actionIndex =
                        ACTIONS.indexOf(
                            action
                        );


                    const qValue =
                        qValues[
                            actionIndex
                        ];


                    return {

                        ...row,

                        q_keep:
                            Number(
                                (
                                    qValues[0] || 0
                                ).toFixed(6)
                            ),

                        q_warn:
                            Number(
                                (
                                    qValues[1] || 0
                                ).toFixed(6)
                            ),

                        q_suspend:
                            Number(
                                (
                                    qValues[2] || 0
                                ).toFixed(6)
                            ),

                        q_close:
                            Number(
                                (
                                    qValues[3] || 0
                                ).toFixed(6)
                            ),

                        q_action:
                            action,

                        recommended_action:
                            action,

                        q_value:
                            Number(
                                (
                                    qValue || 0
                                ).toFixed(6)
                            )

                    };

                }

            );


        return {

            rows:
                output,

            qTable:
                qTable

        };

    }


    // --------------------------------------------------------
    // Q UPDATE
    // --------------------------------------------------------

    function updateQValue(

        qTable,
        stateId,
        actionIndex,
        reward,
        nextStateId

    ) {

        qTable =
            ensureQTable(
                qTable
            );


        if (
            stateId < 0 ||
            stateId >= TOTAL_STATES
        ) {

            return qTable;

        }


        if (
            nextStateId < 0 ||
            nextStateId >= TOTAL_STATES
        ) {

            nextStateId =
                stateId;

        }


        const currentQ =
            Number(
                qTable[stateId][actionIndex]
            ) || 0;


        const nextMaxQ =
            getMaxQ(
                qTable[nextStateId]
            );


        const newQ =

            currentQ +

            LEARNING_RATE *

            (
                reward +

                DISCOUNT_FACTOR *
                nextMaxQ -

                currentQ
            );


        qTable[stateId][actionIndex] =
            Number(
                newQ.toFixed(6)
            );


        return qTable;

    }


    // --------------------------------------------------------
    // SIMULATED REWARD
    // --------------------------------------------------------

    function calculateSimulatedReward(
        row,
        action
    ) {

        const importance =
            Number(
                row.target_tab_importance ??
                row.tab_importance_score ??
                0
            );


        const pressure =
            Number(
                row.resource_pressure
            ) || 0;


        if (
            action === "KEEP"
        ) {

            return Number(
                (
                    importance -
                    pressure * 0.20
                ).toFixed(4)
            );

        }


        if (
            action === "WARN"
        ) {

            return Number(
                (
                    pressure * 0.50 +
                    (1 - importance) * 0.20
                ).toFixed(4)
            );

        }


        if (
            action === "SUSPEND"
        ) {

            return Number(
                (
                    pressure -
                    importance
                ).toFixed(4)
            );

        }


        if (
            action === "CLOSE"
        ) {

            return Number(
                (
                    pressure -
                    importance -
                    0.20
                ).toFixed(4)
            );

        }


        return 0;

    }


    // --------------------------------------------------------
    // OBSERVED REWARD
    // --------------------------------------------------------
    // Uses the measured system-level impact after a real user
    // action. This makes the online learning feedback stronger
    // than a fixed reward for every SUSPEND/CLOSE action.
    // --------------------------------------------------------

    function calculateObservedReward(
        row,
        action,
        resourceImpact
    ) {

        const importance =
            Number(
                row.target_tab_importance ??
                row.tab_importance_score ??
                row.importance ??
                0
            ) || 0;

        const pressure =
            Number(row.resource_pressure) || 0;

        const ramImprovement =
            Number(
                resourceImpact?.ramUsageImprovementPercent
            ) || 0;

        const cpuImprovement =
            Number(
                resourceImpact?.cpuUsageImprovementPercent
            ) || 0;

        // Normalize measured improvement so one noisy
        // measurement cannot dominate the Q-table.
        const resourceGain = Math.min(
            3,
            Math.max(
                -2,
                (ramImprovement * 0.08) +
                (cpuImprovement * 0.03)
            )
        );

        if (action === "KEEP") {

            // Keeping an important tab is usually good;
            // keeping a low-value tab under pressure is less useful.
            return Number((
                0.60 * importance +
                0.25 * (1 - pressure) +
                (resourceGain < 0 ? resourceGain * 0.25 : 0)
            ).toFixed(4));
        }

        if (action === "WARN") {

            return Number((
                0.35 * pressure +
                0.20 * (1 - importance)
            ).toFixed(4));
        }

        if (action === "SUSPEND") {

            // Reward resource improvement, but penalize suspending
            // an important tab.
            return Number((
                resourceGain +
                0.35 * pressure -
                0.80 * importance
            ).toFixed(4));
        }

        if (action === "CLOSE") {

            // Closing is more disruptive than suspension, so it
            // needs a stronger penalty unless the measured gain
            // and pressure justify it.
            return Number((
                resourceGain +
                0.45 * pressure -
                1.10 * importance -
                0.25
            ).toFixed(4));
        }

        return 0;
    }


    // --------------------------------------------------------
    // EXPORT
    // --------------------------------------------------------

    return {

        ACTIONS,

        TOTAL_STATES,

        createEmptyQTable,

        ensureQTable,

        chooseAction,

        recommendAction,

        processSnapshot,

        updateQValue,

        calculateSimulatedReward

    };

})();
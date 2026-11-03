// ============================================================
// ABMI MODULE 3
// BROWSER-LEVEL RL STATE
// ============================================================
//
// Every currently open tab receives an RL state.
//
// Browser-level context is calculated from ALL tabs.
// ============================================================

var ABMI_RL_STATE = (() => {


    // ========================================================
    // LEVEL FUNCTIONS
    // ========================================================

    function getImportanceLevel(
        value
    ) {

        const score =
            Number(value) || 0;


        if (
            score >= 0.70
        ) {

            return "HIGH";

        }


        if (
            score >= 0.40
        ) {

            return "MEDIUM";

        }


        return "LOW";

    }


    function getPressureLevel(
        value
    ) {

        const pressure =
            Number(value) || 0;


        if (
            pressure >= 0.70
        ) {

            return "HIGH";

        }


        if (
            pressure >= 0.40
        ) {

            return "MEDIUM";

        }


        return "LOW";

    }


    function levelToNumber(
        level
    ) {

        if (
            level === "HIGH"
        ) {

            return 2;

        }


        if (
            level === "MEDIUM"
        ) {

            return 1;

        }


        return 0;

    }


    // ========================================================
    // BROWSER CONTEXT
    // ========================================================

    function calculateBrowserContext(
        rows
    ) {

        if (
            !rows ||
            rows.length === 0
        ) {

            return {

                averageImportance:
                    0,

                maxImportance:
                    0,

                highImportancePercentage:
                    0,

                mediumImportancePercentage:
                    0,

                lowImportancePercentage:
                    0,

                browserImportanceLevel:
                    "LOW",

                resourcePressure:
                    0,

                pressureLevel:
                    "LOW"

            };

        }


        const importanceValues =
            rows.map(

                row =>
                    Number(
                        row.tab_importance_score
                    ) || 0

            );


        const pressureValues =
            rows.map(

                row =>
                    Number(
                        row.resource_pressure
                    ) || 0

            );


        const averageImportance =

            importanceValues.reduce(

                (
                    total,
                    value
                ) =>

                    total + value,

                0

            ) /

            importanceValues.length;


        const maxImportance =
            Math.max(
                ...importanceValues
            );


        const averagePressure =

            pressureValues.reduce(

                (
                    total,
                    value
                ) =>

                    total + value,

                0

            ) /

            pressureValues.length;


        let highCount = 0;

        let mediumCount = 0;

        let lowCount = 0;


        importanceValues.forEach(

            value => {

                if (
                    value >= 0.70
                ) {

                    highCount++;

                }

                else if (
                    value >= 0.40
                ) {

                    mediumCount++;

                }

                else {

                    lowCount++;

                }

            }

        );


        const total =
            rows.length;


        let browserImportanceLevel =
            "LOW";


        if (
            averageImportance >=
            0.70
        ) {

            browserImportanceLevel =
                "HIGH";

        }

        else if (
            averageImportance >=
            0.40
        ) {

            browserImportanceLevel =
                "MEDIUM";

        }


        const pressureLevel =
            getPressureLevel(
                averagePressure
            );


        return {

            averageImportance:

                Number(
                    averageImportance.toFixed(4)
                ),

            maxImportance:

                Number(
                    maxImportance.toFixed(4)
                ),

            highImportancePercentage:

                Number(
                    (
                        highCount /
                        total *
                        100
                    ).toFixed(1)
                ),

            mediumImportancePercentage:

                Number(
                    (
                        mediumCount /
                        total *
                        100
                    ).toFixed(1)
                ),

            lowImportancePercentage:

                Number(
                    (
                        lowCount /
                        total *
                        100
                    ).toFixed(1)
                ),

            browserImportanceLevel,

            resourcePressure:

                Number(
                    averagePressure.toFixed(4)
                ),

            pressureLevel

        };

    }


    // ========================================================
    // RL STATE ID
    // ========================================================
    //
    // Browser level:
    // LOW    = 0
    // MEDIUM = 1
    // HIGH   = 2
    //
    // Pressure:
    // LOW    = 0
    // MEDIUM = 1
    // HIGH   = 2
    //
    // Target importance:
    // LOW    = 0
    // MEDIUM = 1
    // HIGH   = 2
    //
    // Total states = 3 × 3 × 3 = 27
    //
    // stateID:
    // browser * 9 + pressure * 3 + target
    // ========================================================

    function getRLStateId(
        browserLevel,
        pressureLevel,
        targetLevel
    ) {

        const browser =
            levelToNumber(
                browserLevel
            );


        const pressure =
            levelToNumber(
                pressureLevel
            );


        const target =
            levelToNumber(
                targetLevel
            );


        return (

            browser * 9 +

            pressure * 3 +

            target

        );

    }


    // ========================================================
    // CREATE RL STATES
    // ========================================================

    function createBrowserRLStates(
        rows
    ) {

        if (
            !rows ||
            rows.length === 0
        ) {

            return [];

        }


        const context =
            calculateBrowserContext(
                rows
            );


        return rows.map(

            row => {

                const targetImportance =
                    Number(
                        row.tab_importance_score
                    ) || 0;


                const importanceLevel =
                    getImportanceLevel(
                        targetImportance
                    );


                const pressureLevel =
                    getPressureLevel(
                        row.resource_pressure
                    );


                const rlStateId =
                    getRLStateId(

                        context.browserImportanceLevel,

                        pressureLevel,

                        importanceLevel

                    );


                const rlState =

                    `${context.browserImportanceLevel}_BROWSER_` +

                    `${pressureLevel}_PRESSURE_` +

                    `${importanceLevel}_TARGET`;


                return {

                    ...row,

                    // Browser-level values

                    browser_importance:

                        context.averageImportance,

                    browser_importance_level:

                        context.browserImportanceLevel,

                    browser_max_importance:

                        context.maxImportance,

                    high_importance_percentage:

                        context.highImportancePercentage,

                    medium_importance_percentage:

                        context.mediumImportancePercentage,

                    low_importance_percentage:

                        context.lowImportancePercentage,

                    browser_resource_pressure:

                        context.resourcePressure,

                    browser_pressure_level:

                        context.pressureLevel,


                    // Tab-level values

                    importance_level:
                        importanceLevel,

                    pressure_level:
                        pressureLevel,

                    target_tab_importance:
                        targetImportance,


                    // RL state

                    rl_state:
                        rlState,

                    rl_state_id:
                        rlStateId

                };

            }

        );

    }


    return {

        getImportanceLevel,

        getPressureLevel,

        calculateBrowserContext,

        getRLStateId,

        createBrowserRLStates

    };

})();
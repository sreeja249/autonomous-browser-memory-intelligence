// ============================================================
// ABMI MODULE 2
// FEATURE ENGINEERING
// ============================================================
//
// IMPORTANT:
// This file is isolated inside ABMI_FEATURES so that it does
// not create global-variable conflicts with other modules.
// ============================================================

var ABMI_FEATURES = (() => {

    // --------------------------------------------------------
    // Clamp value between 0 and 1
    // --------------------------------------------------------

    function clamp(
        value,
        min = 0,
        max = 1
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                Number(value) || 0
            )
        );

    }


    // --------------------------------------------------------
    // Activity Score
    // --------------------------------------------------------
    //
    // Considers:
    // - active state
    // - inactivity
    // - session access
    // - session revisit rate
    //
    // --------------------------------------------------------

    function calculateActivityScore(row) {

        const active =
            row.active
                ? 1
                : 0;


        const inactivity =
            Number(
                row.inactivity_seconds
            ) || 0;


        // Activity decreases as inactivity increases.
        const inactivityScore =
            Math.exp(
                -inactivity / 1800
            );


        const accessCount =
            Number(
                row.session_access_count
            ) || 0;


        const accessScore =
            clamp(
                accessCount / 20
            );


        const revisitRate =
            clamp(
                Number(
                    row.session_revisit_rate
                ) || 0
            );


        const score =

            (
                active * 0.40
            ) +

            (
                inactivityScore * 0.25
            ) +

            (
                accessScore * 0.20
            ) +

            (
                revisitRate * 0.15
            );


        return Number(
            clamp(score).toFixed(4)
        );

    }


    // --------------------------------------------------------
    // History Importance
    // --------------------------------------------------------
    //
    // Considers:
    // - visits in last 24h
    // - visits in last 7 days
    // - visits in last 30 days
    // - days since last visit
    // - revisit rate
    //
    // --------------------------------------------------------

    function calculateHistoryImportance(row) {

        const visits24 =
            Number(
                row.history_visits_24h
            ) || 0;


        const visits7 =
            Number(
                row.history_visits_7d
            ) || 0;


        const visits30 =
            Number(
                row.history_visits_30d
            ) || 0;


        const daysSince =
            Number(
                row.history_days_since_last_visit
            );


        const revisitRate =
            clamp(
                Number(
                    row.history_revisit_rate
                ) || 0
            );


        const recentScore =
            clamp(
                visits24 / 5
            );


        const weeklyScore =
            clamp(
                visits7 / 15
            );


        const monthlyScore =
            clamp(
                visits30 / 30
            );


        let recencyScore = 0;


        if (
            Number.isFinite(daysSince) &&
            daysSince >= 0
        ) {

            recencyScore =
                Math.exp(
                    -daysSince / 7
                );

        }


        const score =

            (
                recentScore * 0.30
            ) +

            (
                weeklyScore * 0.25
            ) +

            (
                monthlyScore * 0.15
            ) +

            (
                recencyScore * 0.20
            ) +

            (
                revisitRate * 0.10
            );


        return Number(
            clamp(score).toFixed(4)
        );

    }


    // --------------------------------------------------------
    // Tab Importance
    // --------------------------------------------------------
    //
    // Combines:
    // Activity
    // History
    // Pinned
    // Audible
    //
    // --------------------------------------------------------

    function calculateTabImportance(
        row,
        activityScore,
        historyScore
    ) {

        const pinned =
            row.pinned
                ? 1
                : 0;


        const audible =
            row.audible
                ? 1
                : 0;


        const score =

            (
                activityScore * 0.35
            ) +

            (
                historyScore * 0.35
            ) +

            (
                pinned * 0.20
            ) +

            (
                audible * 0.10
            );


        return Number(
            clamp(score).toFixed(4)
        );

    }


    // --------------------------------------------------------
    // Resource Pressure
    // --------------------------------------------------------
    //
    // RAM = 60%
    // CPU = 40%
    //
    // If CPU isn't available yet, RAM is used.
    //
    // --------------------------------------------------------

    function calculateResourcePressure(row) {

        const ram =
            Number(
                row.system_ram_usage_percent
            );


        const cpu =
            Number(
                row.system_cpu_usage_percent
            );


        const ramPressure =
            Number.isFinite(ram)
                ? clamp(ram / 100)
                : null;


        const cpuPressure =
            Number.isFinite(cpu)
                ? clamp(cpu / 100)
                : null;


        let pressure = 0;


        if (
            ramPressure !== null &&
            cpuPressure !== null
        ) {

            pressure =

                (
                    ramPressure * 0.60
                ) +

                (
                    cpuPressure * 0.40
                );

        }

        else if (
            ramPressure !== null
        ) {

            pressure =
                ramPressure;

        }

        else if (
            cpuPressure !== null
        ) {

            pressure =
                cpuPressure;

        }


        return Number(
            clamp(pressure).toFixed(4)
        );

    }


    // --------------------------------------------------------
    // Main function
    // --------------------------------------------------------

    function engineerFeatures(row) {

        const activityScore =
            calculateActivityScore(
                row
            );


        const historyScore =
            calculateHistoryImportance(
                row
            );


        const tabImportance =
            calculateTabImportance(

                row,

                activityScore,

                historyScore

            );


        const resourcePressure =
            calculateResourcePressure(
                row
            );


        return {

            ...row,

            activity_score:
                activityScore,

            history_importance_score:
                historyScore,

            tab_importance_score:
                tabImportance,

            resource_pressure:
                resourcePressure

        };

    }


    return {

        engineerFeatures,

        calculateActivityScore,

        calculateHistoryImportance,

        calculateTabImportance,

        calculateResourcePressure

    };

})();
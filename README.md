
# autonomous-browser-memory-intelligence
# 🧠 ABMI – Autonomous Browser Memory Intelligence

### An Intelligent Browser Tab Management System Using Reinforcement Learning

## 📌 Project Overview

**Autonomous Browser Memory Intelligence (ABMI)** is a smart browser tab management system designed to improve browser performance and reduce unnecessary resource consumption.

When users open multiple browser tabs, they may experience high memory usage, CPU consumption, and reduced browser performance. ABMI addresses this problem by monitoring browser activity, analyzing tab behavior, measuring system resource usage, and recommending suitable actions using Reinforcement Learning.

The system provides intelligent tab management options such as **KEEP, SUSPEND, CLOSE, and RESTORE**, helping users manage inactive tabs efficiently.

## 🎯 Objectives

- Monitor browser activity and system resource usage.
- Identify inactive and less frequently used browser tabs.
- Analyze tab behavior using feature engineering.
- Apply Reinforcement Learning to support intelligent tab management.
- Reduce unnecessary browser resource consumption.
- Provide users with control over tab management decisions.

## ✨ Key Features

### 1. Browser Tab Monitoring
- Monitors open browser tabs.
- Tracks active and inactive tab durations.
- Collects tab information and browsing activity.

### 2. Resource Measurement
- Monitors system-level RAM usage.
- Monitors system-level CPU usage.
- Measures resource impact after tab management actions.

### 3. Feature Engineering
Analyzes important tab-related features such as:
- Tab activity and inactivity duration.
- Tab importance.
- Browsing history and revisit information.
- Pinned and audible tab status.

### 4. Reinforcement Learning
- Uses a Q-Learning-based approach.
- Evaluates tab-related states and possible actions.
- Uses rewards and feedback to improve action selection.
- Supports intelligent browser tab management.

### 5. Intelligent Warning System

Displays warnings for eligible inactive browser tabs and provides four main actions:

| Action | Description |
|---|---|
| KEEP | Keeps the tab open and records user feedback. |
| SUSPEND | Saves tab session information and removes the live tab. |
| CLOSE | Allows the user to confirm closing the tab. |
| CLEAR WARNING | Dismisses the warning without changing the tab. |

### 6. Restore Functionality
- Stores information about logically suspended tabs.
- Allows users to restore suspended tabs manually.
- Recreates the tab only when the user selects RESTORE.

## 🛠️ Technologies Used

- **JavaScript** – Core application development.
- **HTML5** – User interface development.
- **CSS** – Interface styling.
- **Chrome Extension API** – Browser tab management and monitoring.
- **Chrome Manifest V3** – Extension architecture.
- **Reinforcement Learning (Q-Learning)** – Intelligent decision-making.
- **Chrome Storage API** – Storing tab information and learning data.

## 📂 Project Structure

```text
ABMI/
│
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── feature_engineering.js
├── qlearning.js
├── rlstate.js
├── action_manager.js
├── warning.html
└── warning.js
```

### File Description

| File | Purpose |
|---|---|
| manifest.json | Defines extension configuration and permissions. |
| background.js | Handles background monitoring and tab management. |
| popup.html | Defines the extension popup interface. |
| popup.js | Handles popup interactions and functionality. |
| feature_engineering.js | Extracts and processes tab-related features. |
| qlearning.js | Implements the Q-Learning mechanism. |
| rlstate.js | Manages reinforcement learning state information. |
| action_manager.js | Handles tab management actions. |
| warning.html | Defines the warning interface. |
| warning.js | Handles warning actions and user interactions. |

## ⚙️ Installation and Setup

Follow these steps to install and run ABMI in Google Chrome.

**Step 1: Download the Project**

Download or clone this repository to your local system.

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
```

**Step 2: Extract the Project**

If you downloaded the ZIP file, extract it into a folder.

**Step 3: Open Chrome Extensions**

Open Google Chrome and enter:

```text
chrome://extensions
```

**Step 4: Enable Developer Mode**

Enable the Developer Mode option in the top-right corner.

**Step 5: Load the Extension**

1. Click on the Load unpacked button.
2. Select the extracted ABMI project folder.
3. The ABMI extension will be added to Chrome.

**Step 6: Run the Project**

- Open multiple tabs in Chrome.
- Click the ABMI extension icon.
- Allow the extension to monitor browser activity.
- Observe resource measurements and tab management recommendations.
- Try KEEP, SUSPEND, CLOSE, and RESTORE actions.

## 🔄 Working Methodology

1. **Data Collection:** Collects browser tab information and system-level resource measurements.
2. **Feature Extraction:** Extracts important features related to tab activity and usage.
3. **State Analysis:** Represents tab-related information for reinforcement learning.
4. **Decision Making:** Uses Q-Learning to evaluate possible tab management actions.
5. **User Interaction:** Displays warnings and allows users to select suitable actions.
6. **Feedback and Learning:** Records user feedback to support future decisions.
7. **Resource Evaluation:** Observes system-level resource impact after actions.

## 💡 Advantages

- Helps manage multiple browser tabs efficiently.
- Identifies inactive tabs.
- Provides intelligent tab management recommendations.
- Combines browser monitoring with Reinforcement Learning.
- Provides user-controlled tab management.
- Supports restoration of logically suspended tabs.

## ⚠️ Technical Limitations

- Chrome Manifest V3 does not reliably expose exact RAM and CPU usage for individual tabs.
- Therefore, ABMI uses system-level RAM and CPU measurements instead of displaying invented per-tab resource values.
- Logical suspension removes the live tab after saving its session information.
- A suspended tab can be recreated only through the RESTORE action.

## 🚀 Future Enhancements

- Improve reinforcement learning using more user interaction data.
- Develop advanced tab usage prediction.
- Improve resource optimization strategies.
- Add detailed browser performance analytics.
- Introduce personalized tab management recommendations.
- Extend support to additional browsers.

## 👩‍💻 Project Information

**Project Name:** Autonomous Browser Memory Intelligence (ABMI)

**Project Domain:** Artificial Intelligence and Machine Learning

**Core Concept:** Reinforcement Learning-Based Intelligent Browser Tab Management

**Project Type:** Mini Project

## 📌 Conclusion

ABMI demonstrates how Artificial Intelligence and Reinforcement Learning can be applied to browser resource management. By combining browser activity monitoring, feature engineering, Q-Learning, and user feedback, the system provides an intelligent approach to managing inactive browser tabs. It aims to improve browser efficiency while keeping users in control of their browsing sessions.

---

⭐ **If you find this project interesting, consider giving this repository a star!**
mini project

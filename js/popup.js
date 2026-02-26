document.addEventListener("DOMContentLoaded", async () => {
  const checkbox = document.getElementById("checkbox");
  const statusText = document.getElementById("statusText");
  if (!checkbox || !statusText) {
    return;
  }

  const data = await storageGet({ adMuteIsEnabled: true });
  checkbox.checked = Boolean(data.adMuteIsEnabled);
  updateStatusText(statusText, checkbox.checked);

  checkbox.addEventListener("change", async () => {
    const enabled = checkbox.checked;
    try {
      await storageSet({ adMuteIsEnabled: enabled });
    } catch (error) {
      console.debug("Unable to persist setting:", error);
    }
    updateStatusText(statusText, enabled);

    try {
      const tabs = await queryTabs({ active: true, lastFocusedWindow: true });
      const tab = tabs[0];
      if (!tab || typeof tab.id !== "number") {
        return;
      }

      await sendMessageToTab(tab.id, {
        type: "SET_AD_MUTE_ENABLED",
        enabled
      });
    } catch (error) {
      // This can happen when the active tab doesn't have the content script.
      console.debug("Unable to notify active tab:", error);
    }
  });
});

function storageGet(defaultValues) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(defaultValues, (data) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          console.debug("Unable to read setting:", runtimeError.message);
          resolve(defaultValues);
          return;
        }
        resolve(data || defaultValues);
      });
    } catch (error) {
      console.debug("Unable to read setting:", error);
      resolve(defaultValues);
    }
  });
}

function storageSet(value) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(value, () => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function queryTabs(queryOptions) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query(queryOptions, (tabs) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tabs || []);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(response || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function updateStatusText(statusNode, enabled) {
  statusNode.textContent = enabled ? "Enabled" : "Disabled";
}

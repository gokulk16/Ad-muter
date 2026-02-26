const extensionMutedTabIds = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "MUTE" || message === "UNMUTE") {
    const legacyMutedState = message === "MUTE";
    handleMuteRequest({
      tabId: sender?.tab?.id,
      muted: legacyMutedState,
      reason: "legacy-message"
    })
      .then(() => sendResponse?.({ ok: true }))
      .catch((error) => {
        console.error("Legacy mute request failed:", error);
        sendResponse?.({ ok: false, error: String(error) });
      });

    return true;
  }

  if (!message || message.type !== "SET_TAB_MUTED") {
    return false;
  }

  handleMuteRequest({
    tabId: sender?.tab?.id,
    muted: Boolean(message.muted),
    reason: message.reason || "content-script-request"
  })
    .then(() => sendResponse?.({ ok: true }))
    .catch((error) => {
      console.error("Mute request failed:", error);
      sendResponse?.({ ok: false, error: String(error) });
    });

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  extensionMutedTabIds.delete(tabId);
});

async function handleMuteRequest({ tabId, muted, reason }) {
  if (!Number.isInteger(tabId)) {
    return;
  }

  const tab = await tabsGet(tabId);
  if (!tab) {
    return;
  }

  const isCurrentlyMuted = Boolean(tab.mutedInfo?.muted);

  if (muted) {
    if (!isCurrentlyMuted) {
      await tabsUpdate(tabId, { muted: true });
      console.log(`Muted tab ${tabId} (${reason})`);
    }
    extensionMutedTabIds.add(tabId);
    return;
  }

  // Only unmute tabs that were muted by this extension.
  if (!extensionMutedTabIds.has(tabId)) {
    return;
  }

  if (isCurrentlyMuted) {
    await tabsUpdate(tabId, { muted: false });
    console.log(`Unmuted tab ${tabId} (${reason})`);
  }

  extensionMutedTabIds.delete(tabId);
}

function tabsGet(tabId) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.get(tabId, (tab) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          if ((runtimeError.message || "").includes("No tab with id")) {
            resolve(null);
            return;
          }
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tab || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function tabsUpdate(tabId, updateProperties) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.update(tabId, updateProperties, (tab) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tab || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

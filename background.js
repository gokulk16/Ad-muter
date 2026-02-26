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

  const tab = await chrome.tabs.get(tabId);
  if (!tab) {
    return;
  }

  const isCurrentlyMuted = Boolean(tab.mutedInfo?.muted);

  if (muted) {
    if (!isCurrentlyMuted) {
      await chrome.tabs.update(tabId, { muted: true });
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
    await chrome.tabs.update(tabId, { muted: false });
    console.log(`Unmuted tab ${tabId} (${reason})`);
  }

  extensionMutedTabIds.delete(tabId);
}

document.addEventListener("DOMContentLoaded", async () => {
  const checkbox = document.getElementById("checkbox");
  const statusText = document.getElementById("statusText");
  if (!checkbox || !statusText) {
    return;
  }

  const data = await chrome.storage.local.get({ adMuteIsEnabled: true });
  checkbox.checked = Boolean(data.adMuteIsEnabled);
  updateStatusText(statusText, checkbox.checked);

  checkbox.addEventListener("change", async () => {
    const enabled = checkbox.checked;
    await chrome.storage.local.set({ adMuteIsEnabled: enabled });
    updateStatusText(statusText, enabled);

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SET_AD_MUTE_ENABLED",
        enabled
      });
    } catch (error) {
      // This can happen when the active tab doesn't have the content script.
      console.debug("Unable to notify active tab:", error);
    }
  });
});

function updateStatusText(statusNode, enabled) {
  statusNode.textContent = enabled ? "Enabled" : "Disabled";
}

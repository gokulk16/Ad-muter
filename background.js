chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message === 'MUTE') {
        const tab = await getJioCinemaTab();
        toggleMuteState(tab.id, true);
    } else if (message === 'UNMUTE') {
        const tab = await getJioCinemaTab();
        toggleMuteState(tab.id, false);
    }
});

function toggleMuteState(tabId, muted) {
    chrome.tabs.get(tabId, async (tab) => {
        // let muted = !tab.mutedInfo.muted;
        await chrome.tabs.update(tabId, { muted });
        console.log(`Tab ${tab.id} is ${muted ? "muted" : "unmuted"}`);
    });
}

async function getJioCinemaTab() {
    let queryOptions = { active: true, url: "*://www.jiocinema.com/*" };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}
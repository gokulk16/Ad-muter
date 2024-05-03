const AD_DIV_SELECTOR = "div > div.mui-style-5kj990-adTag";

let isAdMuteEnabled = true;

async function muteTab() {
  chrome.runtime.sendMessage('MUTE');
}

async function unmuteTab() {
  chrome.runtime.sendMessage('UNMUTE');
}

// Initializes the ad mute feature by setting up listeners and intervals
function initAdMuteFeature() {
  const checkForAds = () => {
    // if (!isAdMuteEnabled) return;

    const observer = new MutationObserver((mutationsList, observer) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const adDiv = document.querySelector(AD_DIV_SELECTOR);
          if (adDiv) {
            muteTab()
          } else {
            setTimeout(() => {
              if (!document.querySelector(AD_DIV_SELECTOR)) {
                unmuteTab()
              }
            }, 8000);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const adDetectionInterval = setInterval(() => {
    if (document.readyState === 'complete') {
      checkForAds();
      clearInterval(adDetectionInterval);
    }
  }, 1800);
}

// Initialize ad mute feature when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdMuteFeature);
} else {
  initAdMuteFeature();
}

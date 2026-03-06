const UNMUTE_GRACE_PERIOD_MS = 2500;
const EVALUATION_THROTTLE_MS = 100;

/**
 * Add future ad indicators by appending entries to this array.
 * Supported locator types:
 * - { type: "xpath", query: "<xpath>" }
 * - { type: "css", query: "<css selector>" }
 */
const AD_INDICATOR_RULES = [
  {
    id: "hotstar-ad-badge",
    textEquals: "Ad",
    locators: [
      {
        type: "xpath",
        query:
          "//*[@data-testid='ad-head']//span[@data-testid='indicator-base-text']"
      },
      {
        type: "css",
        query: "div[data-testid='ad-head'] span[data-testid='indicator-base-text']"
      }
    ]
  }
];

let isAdMuteEnabled = true;
let pendingUnmuteTimeoutId = null;
let evaluationTimerId = null;
let lastRequestedMuteState = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SET_AD_MUTE_ENABLED") {
    return false;
  }

  isAdMuteEnabled = Boolean(message.enabled);
  scheduleEvaluation();
  sendResponse?.({ ok: true, adMuteIsEnabled: isAdMuteEnabled });
  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.adMuteIsEnabled) {
    return;
  }

  isAdMuteEnabled = Boolean(changes.adMuteIsEnabled.newValue);
  scheduleEvaluation();
});

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function doesElementMatchText(element, rule) {
  const elementText = normalizeText(element.textContent);

  if (rule.textEquals && elementText !== normalizeText(rule.textEquals)) {
    return false;
  }

  if (rule.textIncludes && !elementText.includes(normalizeText(rule.textIncludes))) {
    return false;
  }

  return true;
}

function resolveLocatorElements(locator) {
  if (locator.type === "css") {
    return Array.from(document.querySelectorAll(locator.query));
  }

  if (locator.type === "xpath") {
    try {
      const result = document.evaluate(
        locator.query,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const nodes = [];
      for (let index = 0; index < result.snapshotLength; index += 1) {
        const node = result.snapshotItem(index);
        if (node) {
          nodes.push(node);
        }
      }
      return nodes;
    } catch (error) {
      console.warn("Invalid XPath locator:", locator.query, error);
      return [];
    }
  }

  return [];
}

function findAdIndicatorMatch() {
  for (const rule of AD_INDICATOR_RULES) {
    for (const locator of rule.locators) {
      const elements = resolveLocatorElements(locator);
      for (const element of elements) {
        if (doesElementMatchText(element, rule)) {
          return { ruleId: rule.id, element };
        }
      }
    }
  }
  return null;
}

function clearPendingUnmuteTimeout() {
  if (pendingUnmuteTimeoutId !== null) {
    window.clearTimeout(pendingUnmuteTimeoutId);
    pendingUnmuteTimeoutId = null;
  }
}

async function requestMuteState(muted, reason, force = false) {
  if (!force && lastRequestedMuteState === muted) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: "SET_TAB_MUTED",
      muted,
      reason
    });
    lastRequestedMuteState = muted;
  } catch (error) {
    console.debug("Mute request failed:", error);
  }
}

function scheduleUnmuteWhenStable() {
  if (pendingUnmuteTimeoutId !== null) {
    return;
  }

  pendingUnmuteTimeoutId = window.setTimeout(async () => {
    pendingUnmuteTimeoutId = null;

    const stillShowingAd = Boolean(findAdIndicatorMatch());
    if (!stillShowingAd) {
      await requestMuteState(false, "no-ad-indicators-after-grace-period");
    }
  }, UNMUTE_GRACE_PERIOD_MS);
}

async function evaluateMuteState() {
  if (!isAdMuteEnabled) {
    clearPendingUnmuteTimeout();
    await requestMuteState(false, "feature-disabled", true);
    return;
  }

  const adMatch = findAdIndicatorMatch();
  if (adMatch) {
    clearPendingUnmuteTimeout();
    await requestMuteState(true, `ad-indicator:${adMatch.ruleId}`);
    return;
  }

  if (lastRequestedMuteState === true) {
    scheduleUnmuteWhenStable();
  }
}

function scheduleEvaluation() {
  if (evaluationTimerId !== null) {
    return;
  }

  evaluationTimerId = window.setTimeout(() => {
    evaluationTimerId = null;
    void evaluateMuteState();
  }, EVALUATION_THROTTLE_MS);
}

function startMutationObserver() {
  const observerTarget = document.documentElement || document.body;
  if (!observerTarget) {
    return;
  }

  const observer = new MutationObserver(() => {
    scheduleEvaluation();
  });

  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function loadSettings() {
  const data = await chrome.storage.local.get({ adMuteIsEnabled: true });
  isAdMuteEnabled = Boolean(data.adMuteIsEnabled);
}

async function initAdMuteFeature() {
  await loadSettings();
  startMutationObserver();
  await evaluateMuteState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initAdMuteFeature();
  });
} else {
  void initAdMuteFeature();
}

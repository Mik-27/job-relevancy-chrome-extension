import { ChromeMessage, ScrapeTextResponse } from "./types";

chrome.runtime.onMessage.addListener(
  (
    request: ChromeMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: ScrapeTextResponse) => void
  ) => {
    console.log("Sender:", sender);
    if (request.type === "scrapeText") {
      console.log("Content script received scrapeText message.");
      const pageText = document.body.innerText;
      sendResponse({ text: pageText });
    }
    return true; // Keep channel open for async response
  }
);
import { ExtensionMessage, ScrapeTextResponse } from "./types";

// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Ensure we have a tab ID
  if (tab.id) {
    console.log("Icon clicked. Sending toggle message to tab:", tab.id);
    
    // Send a message to the content script (overlay.tsx) in the active tab
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY" }).catch((err) => {
      console.error("Could not send message to overlay. Is the content script loaded?", err);
    });
  }
});

/**
 * Listens for a message from the frontend to initiate the scraping process.
 * This script's sole responsibility is to inject the content script,
 * get the page text, and send it back.
 */
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender, sendResponse) => {
  
  // 1. Handle "Scan Page" Request from Overlay
  if (request.type === "RELAY_SCAN_PAGE") {
    // We need to find the active tab to send the message to
    // Note: sender.tab.id is usually the tab where the overlay is running
    const tabId = sender.tab?.id;
    
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: "scanPageForAutofill" })
        .then(response => sendResponse(response))
        .catch(err => sendResponse({ error: err.message }));
      return true; // Keep channel open for async response
    }
  }

  // 2. Handle "Apply Autofill" Request from Overlay
  if (request.type === "RELAY_APPLY_AUTOFILL") {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        type: "applyAutofill", 
        mappings: request.mappings 
      })
      .then(response => sendResponse(response))
      .catch(err => sendResponse({ error: err.message }));
      return true; 
    }
  }
  
  // Check if the message is the one we're expecting
  if (request.type === "getJobDescription") {
    
    const scrapeAndRespond = async () => {
      try {
        // 1. Get the currently active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          throw new Error("Could not find an active tab to scrape.");
        }

        // 2. Programmatically inject the content script into the active tab
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content.js'],
        });
        
        // 3. Send a message to the now-active content script to perform the scrape
        const response: ScrapeTextResponse = await chrome.tabs.sendMessage(tab.id, { type: "scrapeText" });
        
        // 4. Send the successful response back to the original caller (the App.tsx)
        sendResponse(response);

      } catch (e) {
        // If any step fails, send an error response back
        const errorMessage = e instanceof Error ? e.message : "An unknown scraping error occurred.";
        sendResponse({ error: errorMessage });
      }
    };
    
    scrapeAndRespond();
    
    // Return true to indicate that sendResponse will be called asynchronously
    return true; 
  }

  // --- NEW: Relay for Cover Letter Modal ---
  if (request.type === "showCoverLetterModal") {
    // The message comes from the Overlay (which has a sender.tab)
    const tabId = sender.tab?.id;
    
    if (tabId) {
      console.log("Relaying Cover Letter Modal request to tab:", tabId);
      
      // Forward the message to the content script in the same tab
      chrome.tabs.sendMessage(tabId, {
        type: "showCoverLetterModal",
        text: request.text
      })
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
         console.error("Failed to show modal:", err);
         sendResponse({ error: err.message });
      });
      
      return true; // Async response
    }
  }
});
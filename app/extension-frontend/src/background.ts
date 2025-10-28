import { ChromeMessage, ScrapeTextResponse, AnalysisResult } from "./types";

const API_URL = "http://127.0.0.1:8000/api/analyze";

async function analyzeJobPosting(resumeText: string) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error("Could not find active tab.");

    // --- NEW: PROGRAMMATIC INJECTION ---
    // We first inject the content script into the active tab.
    // This guarantees the script is running before we send a message.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content.js'], // This path is relative to the root of the 'dist' folder
    });
    // ------------------------------------

    // Now that we know the script is injected, we can safely send the message.
    const response: ScrapeTextResponse = await chrome.tabs.sendMessage(tab.id, { type: "scrapeText" });
    const jobDescriptionText = response.text;

    if (!jobDescriptionText) throw new Error("Could not scrape any text from the page.");
    
    console.log("Background script received scraped text. Calling API...");

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, jobDescriptionText }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(errorData.detail || `HTTP error! status: ${apiResponse.status}`);
    }

    const analysisResult: AnalysisResult = await apiResponse.json();
    
    chrome.runtime.sendMessage({ type: "analysisComplete", data: analysisResult });

  } catch (error) {
    console.error("Error in analysis pipeline:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    chrome.runtime.sendMessage({ type: "analysisError", error: errorMessage });
  }
}

chrome.runtime.onMessage.addListener((request: ChromeMessage) => {
  if (request.type === "startAnalysis") {
    console.log("Background script received startAnalysis message.");
    analyzeJobPosting(request.resumeText);
  }
  return true;
});
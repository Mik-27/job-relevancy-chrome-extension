import { ExtensionMessage } from "./types";

// // Debug function to save scraped text to a temporary file
// function saveScrapedTextToFile(text: string) {
//   try {
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const filename = `scraped-text-${timestamp}.txt`;
    
//     const blob = new Blob([text], { type: 'text/plain' });
//     const url = URL.createObjectURL(blob);
    
//     // Create a temporary download link
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.style.display = 'none';
    
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Clean up the URL object
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
    
//     console.log(`Scraped text saved to: ${filename}`);
//   } catch (error) {
//     console.error('Failed to save scraped text:', error);
//   }
// }


// // --- NEW: Site-Specific Rules ---
// const siteRules: Record<string, string> = {
//   'www.linkedin.com': '.jobs-description__content .jobs-description-content__text',
//   'job-boards.greenhouse.io': '.job-post-container',
//   'jobs.lever.co': '.content .posting-page',
//   'www.indeed.com': '.jobsearch-InfoHeaderContainer',
//   'jobs.ashbyhq.com': '.ashby-job-posting-right-pane',
//   'amazon.jobs': '#job-detail',
//   'jobs.careers.microsoft.com': '.SearchJobDetailsCard',
//   'workdayjobs.com': '[data-automation-id="jobDescriptionContainer"]',
// };

// function findBestContentElement(): HTMLElement {
//   // --- Heuristic 1: Try common, specific selectors first ---
//   const specificSelectors = [
//     '#job-details',           // Common on many job boards
//     '.job-description',
//     '[class*="job-description"]', // Contains "job-description"
//     '#content',
//     'article',
//     'main'
//   ];

//   for (const selector of specificSelectors) {
//     const element = document.querySelector<HTMLElement>(selector);
//     if (element) {
//       console.log(`Scraper found content with specific selector: ${selector}`);
//       return element;
//     }
//   }

//   return document.body; // Fallback to body if nothing better found
// }


// function getJobDescriptionText(): string {
//   const hostname = window.location.hostname;

//   // --- Step 1: Check for a site-specific rule ---
//   const specificSelector = siteRules[hostname];
//   if (specificSelector) {
//     const element = document.querySelector<HTMLElement>(specificSelector);
//     if (element) {
//       console.log(`Scraper using specific rule for ${hostname}`);
//       return element.innerText;
//     }
//   }

//   // --- Step 2: Fallback to the heuristic approach ---
//   console.log(`No specific rule for ${hostname}. Using heuristic fallback.`);
//   const bestElement = findBestContentElement(); // This is the function from Strategy 1
//   return bestElement.innerText;
// }


const modalInjector = import(chrome.runtime.getURL('src/modal.js'));

chrome.runtime.onMessage.addListener(
  (request: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse) => {
    
    // Handle the original scrape request
    if (request.type === "scrapeText") {
      const pageText = document.body.innerText;
      sendResponse({ text: pageText });
      return true;
    }

    // --- NEW: Handle the request to show the cover letter modal ---
    if (request.type === "showCoverLetterModal") {
      modalInjector.then(module => {
        module.injectCoverLetterModal(request.text);
      });
      sendResponse({ success: true }); // Acknowledge the message
      return true;
    }
  }
);

// chrome.runtime.onMessage.addListener(
//   (
//     request: ChromeMessage, 
//     sender: chrome.runtime.MessageSender, 
//     sendResponse: (response: ScrapeTextResponse) => void
//   ) => {
//     console.log("Sender:", sender);
//     if (request.type === "scrapeText") {
//       console.log("Content script received scrapeText message.");
//       const pageText = document.body.innerText;
      
//       // Debug: Save scraped text to file
//     //   saveScrapedTextToFile(pageText);
      
//       sendResponse({ text: pageText });
//     }
//     return true; // Keep channel open for async response
//   }
// );
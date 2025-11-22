import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Global styles

// We need to import the CSS as a raw string to inject it into Shadow DOM
// Vite allows this with the '?inline' query
import appStyles from './App.css?inline';
import authStyles from './components/auth/Auth.css?inline';
import spinnerStyles from './components/ui/Spinner.css?inline';
import tabsStyles from './components/ui/Tabs.css?inline';
import chooseResumeStyles from './components/resume-tabs/ChooseResumeTab.css?inline';
import uploadResumeStyles from './components/resume-tabs/UploadResumeTab.css?inline';
import editorStyles from './components/editor/ResumeEditor.css?inline';
import coverLetterStyles from './components/CoverLetterDisplay.css?inline';
import userProfileStyles from './components/profile/Profile.css?inline';

const ROOT_ID = 'resume-analyzer-overlay-root';

export function mountOverlay() {
  // Check if already exists
  if (document.getElementById(ROOT_ID)) return;

  console.log("Mounting Overlay..."); // Debug log

  // 1. Create Host Element
  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.position = 'fixed';
  host.style.top = '20px';
  host.style.right = '20px';
  host.style.zIndex = '2147483647'; // Max Z-Index to stay on top
  host.style.width = '400px';
  host.style.height = 'auto';
  host.style.maxHeight = '90vh';
  host.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  host.style.borderRadius = '12px';
  host.style.display = 'block';
  host.style.zIndex = '2147483647';
  
  // CHANGED: Apply the system font stack directly to the host
  host.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
  
  document.body.appendChild(host);


  // 2. Create Shadow DOM (Isolation)
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Inject Styles into Shadow DOM
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    /* 1. Reset basic box sizing for everything inside shadow DOM */
    * {
      box-sizing: border-box;
    }

    /* 2. Inject your app styles */
    ${appStyles}
    ${authStyles}
    ${spinnerStyles}
    ${tabsStyles}
    ${chooseResumeStyles}
    ${uploadResumeStyles}
    ${editorStyles}
    ${coverLetterStyles}
    ${userProfileStyles}
    /* ... add other style variables here ... */

    /* 3. Style the React Root to look like a solid window */
    #react-root {
      width: 100%;
      height: 100%;
      max-height: 95vh;
      background-color: #1e1e1e; /* Dark background color */
      color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
      overflow: hidden; /* Clips corners */
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  `;
  shadow.appendChild(styleTag);

  // 4. Create React Root inside Shadow DOM
  const rootDiv = document.createElement('div');
  rootDiv.id = 'react-root';
  shadow.appendChild(rootDiv);

  const root = ReactDOM.createRoot(rootDiv);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export function unmountOverlay() {
  const host = document.getElementById(ROOT_ID);
  if (host) {
    host.remove();
  }
}

// --- THIS IS THE CRITICAL PART ---
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("Overlay received message:", request); // Debug log

  if (request.type === "TOGGLE_OVERLAY") {
    const host = document.getElementById(ROOT_ID);
    if (host) {
      unmountOverlay();
    } else {
      mountOverlay();
    }
    // Send response to keep the channel open/confirm receipt
    sendResponse({ status: "done" });
  }
  return true;
});
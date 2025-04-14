# Joby Application Auto-filler 🚀

**Joby Application Auto-filler** is a Chrome extension that automates the job application process by intelligently detecting and autofilling application forms across platforms like Comeet. It handles dynamic forms, social links, nested iframes, and Shadow DOM—making job applications faster and easier.

---

## Features 🧩 

- **Smart Form Detection**  
  Locates application forms using semantic selectors, roles, and common class patterns. Works across complex DOM trees, including Shadow DOM and embedded content.

- **Heuristic Field Matching**  
  Maps user data to input fields using flexible pattern recognition across `name`, `id`, `placeholder`, and `aria-label`.

- **Resume Upload Highlighting**  
  Highlights file upload fields and annotates them with the resume filename for easier manual upload.

- **Popup-Driven Data Management**  
  Allows users to save and manage personal data (name, email, phone, etc.) through a clean UI powered by `chrome.storage.sync`.

- **URL Redirection Handling**  
  Automatically transforms `/social?token=` URLs into valid `/apply?token=` pages and navigates accordingly.

---

## 🛠️ Built With

- **JavaScript (ES6+)**
- **HTML5 & CSS3**
- **Chrome Extensions API (Manifest V3)**
- **Chrome Scripting API**
- **Shadow DOM Traversal**
- **DOM Mutation Observation**
- **Event Simulation & Dispatching**

---

## How to Use 🧪

1. Download or clone this repository.
2. Navigate to `chrome://extensions/` in Chrome.
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select the project folder.
5. Click the extension icon → Enter your info → Click **Save**.
6. Open a job application page and click **Fill Form**.

---

## License 📄

Licensed under the MIT License.

---

> Built to simplify job applications and save valuable time—Joby autofills so you can focus on getting hired.

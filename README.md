# RTFiller

RTFiller is a Chrome extension that fills elements matching a configured locator with five random words after a `fetch`, `XMLHttpRequest`, or matching DOM update.

It is built for iframe-heavy pages and modern frontend frameworks. The actual fill happens in the page's main JavaScript world, so React-style value tracking and form libraries can recognize the inserted value.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/basvanopstal/Documents/RTFiller`.

## Use

1. Click the RTFiller extension icon.
2. Turn it on.
3. Pick a locator type:
   - `CSS selector`, for example `input[name='firstName']`
   - `XPath`, for example `//input[@name='firstName']`
4. Enter one word per line, or keep the included hipster-ish word database.

When a page completes a network request, matching text inputs, textareas, and editable elements are filled with five random words from the list.

The bundled word database lives in `word-bank.js`.

RTFiller does a short debounce before filling so network and DOM update bursts settle without adding a noticeable delay.

## Configuration

- **Locator type**: choose CSS selector or XPath.
- **Locator**: target the actual input, textarea, or contenteditable element when possible.
- **Word database**: one word per line. RTFiller randomly picks five words for each fill.
- **Fill existing matches on page load**: fills matching empty fields when the frame loads, not only after later network requests.

## Example Locators

```text
input[name='firstName']
textarea[data-testid='notes']
[contenteditable='true']
//input[@name='firstName']
```

## Troubleshooting

- Reload the extension in `chrome://extensions` after changing extension files.
- Refresh the target page after reloading the extension.
- If the target is inside an iframe, inspect the iframe content and make sure the locator matches the input inside that frame.
- If a custom input wrapper is selected, target the nested real `input`, `textarea`, or `contenteditable` element instead.
- Chrome may show a debugger warning because RTFiller includes a debugger-based fallback for stubborn inputs.

## Notes

- The extension runs in all frames on all URLs while installed.
- It also runs in `about:blank` iframes when Chrome allows extension injection there.
- It supports text-like `input` fields, `textarea`, and `contenteditable` elements.
- It dispatches `input` and `change` events so React, Vue, Angular, and similar frameworks can usually detect the change.
- If a field appears inside an iframe after the parent page finishes a request, DOM changes in the iframe are watched too.
- For text inputs and textareas it uses Chrome's debugger API to send browser-level text input. Chrome will show a debugger-access warning while the extension is filling.

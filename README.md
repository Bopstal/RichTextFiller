# RTFiller

RTFiller is a Chrome extension that fills elements matching a configured locator with five random words after a `fetch`, `XMLHttpRequest`, or matching DOM update.

It is built for iframe-heavy pages and modern frontend frameworks. The actual fill happens in the page's main JavaScript world, so React-style value tracking and form libraries can recognize the inserted value.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder where you cloned or downloaded this project.

## Use

1. Click the RTFiller extension icon.
2. Turn it on.
3. Add one or more locators:
   - `CSS selector`, for example `input[name='firstName']`
   - `XPath`, for example `//input[@name='firstName']`
   - `data-testid` contains, for example `first-name`
4. Enter one word per line, or keep the included hipster-ish word database.

When a page completes a network request, matching text inputs, textareas, and editable elements are filled with five random words from the list.

The toolbar icon is red when RTFiller is off and green when it is on.

The bundled word database lives in `word-bank.js`.

RTFiller does a short debounce before filling so network and DOM update bursts settle without adding a noticeable delay.

## Configuration

- **Locators**: add multiple CSS, XPath, or `data-testid` contains locators. Target the actual input, textarea, or contenteditable element when possible.
- **Word database**: one word per line. RTFiller randomly picks five words for each fill.
- **Fill existing matches on page load**: fills matching empty fields when the frame loads, not only after later network requests.
- **Overwrite filled fields**: when off, RTFiller leaves fields with existing text untouched. When on, matching fields are replaced.

## Example Locators

```text
input[name='firstName']
textarea[data-testid='notes']
[contenteditable='true']
//input[@name='firstName']
first-name-input
```

## Troubleshooting

- Reload the extension in `chrome://extensions` after changing extension files.
- Refresh the target page after reloading the extension.
- If the target is inside an iframe, inspect the iframe content and make sure the locator matches the input inside that frame.
- If a custom input wrapper is selected, target the nested real `input`, `textarea`, or `contenteditable` element instead.
- RTFiller only needs the `storage` permission. It does not use Chrome debugger access.

## Notes

- The extension runs in all frames on all URLs while installed.
- It also runs in `about:blank` iframes when Chrome allows extension injection there.
- It supports text-like `input` fields, `textarea`, and `contenteditable` elements.
- It dispatches `input` and `change` events so React, Vue, Angular, and similar frameworks can usually detect the change.
- If a field appears inside an iframe after the parent page finishes a request, DOM changes in the iframe are watched too.
- It fills in the page's main JavaScript world so modern frontend frameworks can recognize the value without debugger access.

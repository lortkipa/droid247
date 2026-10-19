/**
 * Page-wide CSS for the web and desktop builds, which React Native styles
 * can't express: browser parts (scrollbars, form controls) follow the system
 * theme, and scrollbars are thin and neutral like the overlay ones on phones.
 * ::-webkit-scrollbar covers Chromium, Safari and WebKitGTK (the Linux
 * desktop app) without arrow buttons. The standard properties are for Firefox
 * only: Chromium would prefer them and draw arrows.
 */
const css = `
:root { color-scheme: light dark; }
@supports (-moz-appearance: none) {
  * { scrollbar-width: thin; scrollbar-color: rgba(128, 128, 128, 0.45) transparent; }
}
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.45); border-radius: 4px; }
::-webkit-scrollbar-corner { background: transparent; }
::-webkit-scrollbar-button { display: none; }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

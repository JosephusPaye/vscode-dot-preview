declare global {
  var lastActiveState: boolean | undefined;
}

// Setup an early listener to capture the initial active state message.
// If the event is sent before the listener is added, we miss it and
// initialize the active state incorrectly in the ImageViewer
window.lastActiveState = undefined;
window.addEventListener("message", (e: MessageEvent) => {
  if (e.origin === window.origin && e.data.type === "setActive") {
    window.lastActiveState = e.data.value;
  }
});

import { render } from "preact";

import { App } from "./App";
import { readWebviewProps } from "./props";

import "./main.css";

window.addEventListener("load", () => {
  const webviewProps = readWebviewProps();

  render(<App webviewProps={webviewProps} />, document.getElementById("app")!);
});

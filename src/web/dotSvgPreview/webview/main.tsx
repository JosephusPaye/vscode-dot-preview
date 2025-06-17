import { render } from "preact";

import { App } from "./App";
import { readWebviewProps } from "./props";

import "./main.css";

window.addEventListener("load", () => {
  const webviewProps = readWebviewProps();

  render(<App webviewProps={webviewProps} />, document.getElementById("app")!);
});

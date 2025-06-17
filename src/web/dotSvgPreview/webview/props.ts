import { Layout } from "../layout";

export interface WebviewProps {
  resourcePath: string;
  defaultLayout: Layout;
}

export function readWebviewProps(): WebviewProps {
  const json = document.getElementById("webview-props")?.dataset.props || "";

  try {
    return JSON.parse(json) as WebviewProps;
  } catch (e) {
    console.error("Failed to parse webview props", e);
    return { resourcePath: "", defaultLayout: "dot" };
  }
}

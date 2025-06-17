export interface WebviewProps {
  resourcePath: string;
}

export function readWebviewProps(): WebviewProps {
  const json = document.getElementById("webview-props")?.dataset.props || "";

  try {
    return JSON.parse(json) as WebviewProps;
  } catch (e) {
    console.error("Failed to parse webview props", e);
    return { resourcePath: "" };
  }
}

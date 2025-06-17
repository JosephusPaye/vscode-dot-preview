import { useEffect, useState } from "preact/hooks";

import { WebviewProps } from "./props";
import ImageViewer from "./ImageViewer";
import { fetchAndRenderGraph, RenderResult } from "./viz";
import { ErrorOutput } from "./ErrorOutput";
import { useVsCodeApi } from "./vscode";
import { Layout } from "../layout";

export function App({ webviewProps }: { webviewProps: WebviewProps }) {
  const vscode = useVsCodeApi();

  const layoutFromDefault = webviewProps.defaultLayout;
  const [layoutFromState, setLayoutFromState] = useState(vscode.getState()?.layout as Layout | undefined);

  const [resourcePath] = useState(webviewProps.resourcePath);
  const [rendered, setRendered] = useState<RenderResult | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.origin && e.data.type === "setLayout") {
        const layout = e.data.value as Layout;
        const state = vscode.getState() ?? { offsetX: 0, offsetY: 0, scale: "fit" };

        setLayoutFromState(layout);

        vscode.setState({ ...state, layout });
        vscode.postMessage({ type: "layout", value: layout });
      }
    };

    window.addEventListener("message", onMessage);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    fetchAndRenderGraph(resourcePath, { fromState: layoutFromState, fromDefault: layoutFromDefault })
      .then((rendered) => {
        setRendered(rendered);
        if (rendered.status === "success") {
          vscode.postMessage({ type: "layout", value: rendered.layout });
        }
      })
      .finally(() => {
        document.body.classList.remove("loading");
      });
  }, [resourcePath, layoutFromState, layoutFromDefault]);

  if (!rendered) {
    return "Rendering...";
  }

  switch (rendered.status) {
    case "success":
      if (rendered.errors.length > 0) {
        console.warn("GraphViz render completed with at least one issue", rendered.errors);
      }
      return <ImageViewer src={rendered.output.svgDataUrl} layout={rendered.layout} />;
    case "failure":
      console.error("GraphViz render failed", rendered.errors);
      return <ErrorOutput heading="GraphViz render failed" errors={rendered.errors} />;
    case "error":
      console.error("GraphViz preview error", rendered.errors);
      return <ErrorOutput heading="GraphViz preview error" errors={rendered.errors} />;
    default:
      return null;
  }
}

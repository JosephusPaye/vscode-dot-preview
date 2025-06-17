import { useEffect, useState } from "preact/hooks";

import { WebviewProps } from "./props";
import ImageViewer from "./ImageViewer";
import { fetchAndRenderGraph, RenderResult } from "./viz";
import { ErrorOutput } from "./ErrorOutput";

export function App({ webviewProps }: { webviewProps: WebviewProps }) {
  const [rendered, setRendered] = useState<RenderResult | null>(null);

  useEffect(() => {
    fetchAndRenderGraph(webviewProps.resourcePath)
      .then(setRendered)
      .finally(() => {
        document.body.classList.remove("loading");
      });
  }, []);

  if (!rendered) {
    return <>Rendering...</>;
  }

  switch (rendered.status) {
    case "success":
      if (rendered.errors.length > 0) {
        console.warn("GraphViz render completed with at least one issue", rendered.errors);
      }
      return <ImageViewer src={rendered.output.svgDataUrl} />;
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

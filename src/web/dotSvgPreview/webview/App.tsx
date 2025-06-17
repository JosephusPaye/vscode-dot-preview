import { useEffect, useState } from "preact/hooks";
import { instance, Viz } from "@viz-js/viz";

import { WebviewProps } from "./props";
import ImageViewerSvg from "./ImageViewerSvg";
import ImageViewer from "./ImageViewer";

let viz: Viz | undefined;

export function App({ webviewProps }: { webviewProps: WebviewProps }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  useEffect(() => {
    instance()
      .then((v) => {
        viz = v;
        console.log("Viz instance initialized:", viz);
      })
      .catch((error) => {
        console.error("Error initializing Viz instance:", error);
      })
      .then(() => {
        if (!viz) {
          return;
        }

        let resolvedViz = viz;

        if (webviewProps.resourcePath) {
          console.log("Fetching resource:", webviewProps.resourcePath);
          return fetch(webviewProps.resourcePath)
            .then((response) => response.text())
            .then((data) => {
              console.log("Resource data:", data);

              const rendered = resolvedViz.render(data, {
                format: "svg",
                engine: "dot",
              });

              if (rendered.status == "success") {
                console.log("Rendering successful", rendered);
                setSvg(rendered.output);

                const dataUrl = `data:image/svg+xml;base64,${btoa(rendered.output)}`;
                setSvgUrl(dataUrl);

                console.log("SVG URL created:", svgUrl);
              } else {
                console.error("Rendering failed:", rendered);
              }
            })
            .catch((error) => {
              console.error("Error fetching resource:", error);
            });
        } else {
          console.error("No resource path provided in webview props.");
        }
      })
      .finally(() => {
        document.body.classList.remove("loading");
      });
  }, []);

  return (
    <>
      {/* {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : null} */}
      {/* {svg ? <ImageViewerSvg src={svg} /> : null} */}
      {svgUrl ? <ImageViewer src={svgUrl} /> : null}
      <pre>{JSON.stringify(webviewProps, null, 2)}</pre>
    </>
  );
}

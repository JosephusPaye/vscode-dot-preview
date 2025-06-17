import { instance, RenderError, RenderOptions, Viz } from "@viz-js/viz";

interface SuccessResult {
  status: "success";
  output: { [format: string]: string };
  errors: RenderError[];
}

interface FailureResult {
  status: "failure";
  output: undefined;
  errors: RenderError[];
}

interface ErrorResult {
  status: "error";
  output: undefined;
  errors: RenderError[];
}

export type RenderResult = SuccessResult | FailureResult | ErrorResult;

let instancePromise: Promise<Viz> | undefined;

function getVizInstance(): ReturnType<typeof instance> {
  instancePromise ??= instance();
  return instancePromise;
}

export async function renderGraph(data: string, opts?: Omit<RenderOptions, "format">): Promise<RenderResult> {
  try {
    const viz = await getVizInstance();

    const result = viz.renderFormats(data, ["svg", "json"], opts);

    if (result.status === "success") {
      return {
        ...result,
        output: {
          ...result.output,
          svgDataUrl: `data:image/svg+xml;base64,${btoa(result.output.svg)}`,
          input: data,
        },
      };
    }

    return result;
  } catch (error) {
    console.error("Error rendering graph", error);

    return {
      status: "error",
      output: undefined,
      errors: [{ message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

export async function fetchAndRenderGraph(url: string, opts?: Omit<RenderOptions, "format">): Promise<RenderResult> {
  try {
    if (!url) {
      throw new Error("No URL provided to fetch the graph data from file.");
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch graph data from file: ${response.status}${
          response.statusText ? ` (${response.statusText})` : ""
        }`,
      );
    }

    return renderGraph(await response.text(), opts);
  } catch (error) {
    console.error("Error fetching and rendering graph", error);

    return {
      status: "error",
      output: undefined,
      errors: [{ message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

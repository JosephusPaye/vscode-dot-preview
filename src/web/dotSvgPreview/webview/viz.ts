import { instance, RenderError, RenderOptions, Viz } from "@viz-js/viz";
import { Layout, supportedLayouts } from "../layout";

interface SuccessResult {
  status: "success";
  input: string;
  output: { [format: string]: string };
  layout: Layout;
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
        input: data,
        output: {
          ...result.output,
          svgDataUrl: `data:image/svg+xml;base64,${btoa(result.output.svg)}`,
        },
        layout: (opts?.engine as Layout | undefined) ?? ("dot" as const),
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

const layoutRegex = /@vscode-dot-preview-layout\s+(\w+)/i;

export async function fetchAndRenderGraph(
  url: string,
  layout?: { fromState?: string; fromDefault: string },
  opts?: Omit<RenderOptions, "format" | "engine">,
): Promise<RenderResult> {
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

    const responseText = await response.text();

    let layoutFromFile = responseText.match(layoutRegex)?.[1]?.toLowerCase();
    if (layoutFromFile && !supportedLayouts.includes(layoutFromFile as Layout)) {
      console.warn(
        `Ignoring unsupported layout engine "${layoutFromFile}" specified in the file. Must be one of: ${supportedLayouts.join(
          ", ",
        )}`,
      );
      layoutFromFile = undefined;
    }

    const engine = layout?.fromState ?? layoutFromFile ?? layout?.fromDefault ?? "dot";

    return renderGraph(responseText, { ...opts, engine });
  } catch (error) {
    console.error("Error fetching and rendering graph", error);

    return {
      status: "error",
      output: undefined,
      errors: [{ message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

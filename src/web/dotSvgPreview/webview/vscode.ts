import { Layout } from "../layout";

export interface VsCodeWebViewState {
  layout: Layout;
  scale: number | "fit";
  offsetX: number;
  offsetY: number;
}

let vscode: ReturnType<typeof acquireVsCodeApi<VsCodeWebViewState>> | undefined;

export function useVsCodeApi() {
  vscode ??= acquireVsCodeApi();
  return vscode;
}

export function getVsCodeApi() {
  vscode = useVsCodeApi();
  return vscode;
}

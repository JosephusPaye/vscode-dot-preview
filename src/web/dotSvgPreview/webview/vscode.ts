let vscode: ReturnType<typeof acquireVsCodeApi> | undefined;

export function useVsCodeApi() {
  vscode ??= acquireVsCodeApi();
  return vscode;
}

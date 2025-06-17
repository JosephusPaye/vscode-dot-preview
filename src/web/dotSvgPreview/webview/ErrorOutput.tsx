import { RenderResult } from "./viz";
import { useVsCodeApi } from "./vscode";

import "./ErrorOutput.css";

export function ErrorOutput({ heading, errors }: { heading: string; errors: RenderResult["errors"] }) {
  const vscode = useVsCodeApi();

  return (
    <div class="error-output">
      <div class="error-output-heading">{heading}</div>
      <div class="error-output-errors">
        {errors.length > 0 ? (
          errors.map((error, index) => (
            <div key={index} class="error-output-error">
              {error.level ? `(${error.level}) ` : ""}
              {error.message}
            </div>
          ))
        ) : (
          <div class="error-output-error">No specific errors reported. Make sure the file has valid DOT syntax.</div>
        )}
      </div>
      <div class="error-output-link">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            vscode.postMessage({ type: "reopen-as-text" });
          }}
        >
          Open file using VS Code's standard text editor?
        </a>
      </div>
    </div>
  );
}

# DOT Preview

This is a simple and robust extension for previewing GraphViz DOT files (with extension `.dot` or `.gv`) in Visual Studio Code. It is designed to work like the built-in image preview feature, providing a custom view shown by default when opening DOT files.

## Features

- Does not depend on any external GraphViz installation
- Supports both `.dot` and `.gv` file extensions
- Automatically opens the preview when a DOT file is opened
- Provides robust live updates when the DOT file is modified in VS Code or externally
- Provides support for copying the preview image as a PNG (from preview image context menu)
- Supports <kbd>Ctrl</kbd> + scroll to zoom in and out of the preview
- Supports scroll and <kbd>Shift</kbd> + scroll to pan the preview
- Supports click to zoom in, <kbd>Ctrl</kbd> + click (or <kbd>Option</kbd> + click on macOS) to zoom out
- Supports setting the default GraphViz layout engine globally via preferences, with the ability to override per file using special comments in the DOT file.
  - Use the special comment `# @vscode-dot-preview-layout <layout>` in a DOT file to set the default layout engine for that file. Overrides the global setting.
- Supports changing the layout engine used in the preview on the fly (from the status bar). Overrides both the global setting and the file-specific setting.

You'll need to install an extension that provides syntax highlighting for DOT files if you want syntax highlighting. [Stephanvs.dot](https://marketplace.visualstudio.com/items?itemName=Stephanvs.dot) is a simple option that doesn't clash with this extension.

## Extension Settings

This extension contributes the following settings:

- `dotPreview.defaultLayout`: Set the default layout engine for DOT previews. Options include `dot`, `neato`, `fdp`, `sfdp`, `twopi`, and `circo`. Defaults to `dot`.

## Known Issues

None.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for details on the latest changes.

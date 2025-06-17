import { Component, createRef } from "preact";

import { Layout } from "../layout";

import "./ImageViewer.css";
import { getVsCodeApi } from "./vscode";

interface ImageViewerProps {
  layout: Layout;
  srcUrl: string;
  srcText: string;
}

interface ImageViewerState {
  scale: number | "fit";
  ctrlPressed: boolean;
  altPressed: boolean;
  hasLoadedImage: boolean;
  consumeClick: boolean;
  isActive: boolean;
  isLoading: boolean;
  hasError: boolean;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 50;
const PIXELATION_THRESHOLD = 3;
const SCALE_PINCH_FACTOR = 0.075;
const ZOOM_LEVELS = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20];
const IS_MAC = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export default class ImageViewer extends Component<ImageViewerProps, ImageViewerState> {
  private containerRef = createRef<HTMLDivElement>();
  private imageRef = createRef<HTMLImageElement>();
  private vscode = getVsCodeApi();

  constructor(props: ImageViewerProps) {
    super(props);

    const initialState = this.vscode.getState();

    this.state = {
      scale: initialState?.scale ?? "fit",
      offsetX: initialState?.offsetX ?? 0,
      offsetY: initialState?.offsetY ?? 0,
      ctrlPressed: false,
      altPressed: false,
      hasLoadedImage: false,
      consumeClick: true,
      // Use the last active state if available
      isActive: window.lastActiveState ?? false,
      isLoading: true,
      hasError: false,
    };
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("scroll", this.handleWindowScroll, { passive: true });
    window.addEventListener("message", this.onMessage);
    document.addEventListener("copy", this.onCopyImage);

    this.updateScale(this.state.scale);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("scroll", this.handleWindowScroll);
    window.removeEventListener("message", this.onMessage);
    document.removeEventListener("copy", this.onCopyImage);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.state.hasLoadedImage) return;

    this.setState({ ctrlPressed: e.ctrlKey, altPressed: e.altKey });

    if (IS_MAC ? e.altKey : e.ctrlKey) {
      this.setActive(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.state.hasLoadedImage) return;

    this.setState({ ctrlPressed: e.ctrlKey, altPressed: e.altKey });

    if (!(IS_MAC ? e.altKey : e.ctrlKey)) {
      this.setActive(false);
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.state.hasLoadedImage || e.button !== 0) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
      consumeClick: !this.state.isActive,
    });
  };

  private handleClick = (e: MouseEvent) => {
    if (!this.state.hasLoadedImage || e.button !== 0) return;

    if (this.state.consumeClick) {
      this.setState({ consumeClick: false });
      return;
    }

    if (this.state.scale === "fit") {
      this.firstZoom();
    }

    if (!(IS_MAC ? this.state.altPressed : this.state.ctrlPressed)) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }

    if (!this.state.hasLoadedImage) return;

    const isScrollWheelKeyPressed = IS_MAC ? this.state.altPressed : this.state.ctrlPressed;
    if (!isScrollWheelKeyPressed && !e.ctrlKey) return;

    if (this.state.scale === "fit") {
      this.firstZoom();
    }

    const delta = e.deltaY > 0 ? 1 : -1;
    const currentScale = typeof this.state.scale === "number" ? this.state.scale : 1;

    this.updateScale(currentScale * (1 - delta * SCALE_PINCH_FACTOR));
  };

  private handleWindowScroll = () => {
    if (!this.state.hasLoadedImage || this.state.scale === "fit") return;

    this.setState({ offsetX: window.scrollX, offsetY: window.scrollY });

    this.vscode.setState({
      layout: this.props.layout,
      scale: this.state.scale,
      offsetX: window.scrollX,
      offsetY: window.scrollY,
    });
  };

  private handleImageLoad = () => {
    if (this.state.hasLoadedImage) return;

    const image = this.imageRef.current;
    if (!image) return;

    this.vscode.postMessage({ type: "size", value: `${image.naturalWidth}x${image.naturalHeight}` });

    this.setState({ hasLoadedImage: true, isLoading: false }, () => {
      const initialScale = this.state.scale;
      const initialOffsetX = this.state.offsetX;
      const initialOffsetY = this.state.offsetY;

      this.updateScale(initialScale);

      // Update scale sets the scroll position to center the image at the given scale,
      // but we want to restore the initial scroll position to what it was set to before
      if (initialScale !== "fit") {
        window.scrollTo(initialOffsetX, initialOffsetY);
      }
    });
  };

  private handleImageError = () => {
    if (this.state.hasLoadedImage) return;

    this.setState({ hasLoadedImage: true, isLoading: false, hasError: true });
  };

  private updateScale = (newScale: number | "fit") => {
    const image = this.imageRef.current;
    const container = this.containerRef.current;

    if (!image || !this.state.hasLoadedImage || !container) {
      return;
    }

    if (newScale === "fit") {
      this.setState({ scale: "fit", offsetX: 0, offsetY: 0 });

      image.classList.add("scale-to-fit");
      image.classList.remove("pixelated");
      image.style.zoom = "normal";

      this.vscode.setState(undefined);
      this.vscode.postMessage({ type: "zoom", value: "fit" });
    } else {
      const scaleClamped = clamp(newScale, MIN_SCALE, MAX_SCALE);
      this.setState({ scale: scaleClamped });

      if (scaleClamped >= PIXELATION_THRESHOLD) {
        image.classList.add("pixelated");
      } else {
        image.classList.remove("pixelated");
      }

      const dx = (window.scrollX + container.clientWidth / 2) / container.scrollWidth;
      const dy = (window.scrollY + container.clientHeight / 2) / container.scrollHeight;

      image.classList.remove("scale-to-fit");
      image.style.zoom = scaleClamped.toString();

      const newScrollX = container.scrollWidth * dx - container.clientWidth / 2;
      const newScrollY = container.scrollHeight * dy - container.clientHeight / 2;

      window.scrollTo(newScrollX, newScrollY);

      this.vscode.setState({
        layout: this.props.layout,
        scale: scaleClamped,
        offsetX: newScrollX,
        offsetY: newScrollY,
      });
      this.vscode.postMessage({ type: "zoom", value: scaleClamped });
    }
  };

  private setActive = (value: boolean) => {
    this.setState({ isActive: value });
  };

  private firstZoom = () => {
    const image = this.imageRef.current;
    if (!image || !this.state.hasLoadedImage) return;

    const scale = image.clientWidth / image.naturalWidth;
    this.updateScale(scale);
  };

  private zoomIn = () => {
    if (this.state.scale === "fit") {
      this.firstZoom();
      return;
    }

    const currentScale = typeof this.state.scale === "number" ? this.state.scale : 1;
    let i = 0;
    for (; i < ZOOM_LEVELS.length; ++i) {
      if (ZOOM_LEVELS[i] > currentScale) {
        break;
      }
    }

    this.updateScale(ZOOM_LEVELS[i] || MAX_SCALE);
  };

  private zoomOut = () => {
    if (this.state.scale === "fit") {
      this.firstZoom();
      return;
    }

    const currentScale = typeof this.state.scale === "number" ? this.state.scale : 1;
    let i = ZOOM_LEVELS.length - 1;
    for (; i >= 0; --i) {
      if (ZOOM_LEVELS[i] < currentScale) {
        break;
      }
    }

    this.updateScale(ZOOM_LEVELS[i] || MIN_SCALE);
  };

  private onCopyImage = () => {
    this.copyImage();
  };

  private copyImage = async (retries = 5) => {
    if (!document.hasFocus() && retries > 0) {
      // copyImage() is called at the same time as webview.reveal, which means this function is running whilst the webview is gaining focus.
      // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
      // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
      setTimeout(() => {
        this.copyImage(retries - 1);
      }, 20);
      return;
    }

    const image = this.imageRef.current;
    if (!image || !this.state.hasLoadedImage) {
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": new Promise((resolve, reject) => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(image, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Failed to create blob from canvas"));
                }
                canvas.remove();
              }, "image/png");
            } else {
              reject(new Error("Failed to get canvas 2D context for image copy"));
              canvas.remove();
            }
          }),
        }),
      ]);
    } catch (e) {
      console.error("Failed to copy image to clipboard", e);
    }
  };

  private copySourceText = async (retries = 5) => {
    if (!document.hasFocus() && retries > 0) {
      // copySourceText() is called at the same time as webview.reveal, which means this function is running whilst the webview is gaining focus.
      // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
      // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
      setTimeout(() => {
        this.copySourceText(retries - 1);
      }, 20);
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([this.props.srcText], { type: "text/plain" }),
        }),
      ]);
    } catch (e) {
      console.error("Failed to copy source text to clipboard", e);
    }
  };

  private onMessage = (e: MessageEvent) => {
    if (e.origin !== window.origin) {
      console.error("Dropping message from unknown origin in image preview");
      return;
    }

    switch (e.data.type) {
      case "setScale": {
        this.updateScale(e.data.value);
        break;
      }
      case "setActive": {
        this.setActive(e.data.value);
        break;
      }
      case "zoomIn": {
        this.zoomIn();
        break;
      }
      case "zoomOut": {
        this.zoomOut();
        break;
      }
      case "copyImage": {
        this.copyImage();
        break;
      }
      case "copySourceText": {
        this.copySourceText();
        break;
      }
    }
  };

  render() {
    const { srcUrl } = this.props;
    const { isActive, ctrlPressed, altPressed, isLoading, hasError, hasLoadedImage } = this.state;

    const containerClasses = [
      "image-viewer",
      isLoading && "loading",
      hasError && "error",
      hasLoadedImage && "ready",
      isActive && ((IS_MAC ? altPressed : ctrlPressed) ? "zoom-out" : "zoom-in"),
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={this.containerRef}
        className={containerClasses}
        onMouseDown={this.handleMouseDown}
        onClick={this.handleClick}
        onWheel={this.handleWheel}
      >
        <img
          ref={this.imageRef}
          src={srcUrl}
          onLoad={this.handleImageLoad}
          onError={this.handleImageError}
          alt="Viewer image"
        />
      </div>
    );
  }
}

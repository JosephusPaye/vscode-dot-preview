import { Component, createRef } from "preact";

import "./ImageViewer.css";

interface ImageViewerProps {
  src: string;
  initialScale?: number | "fit";
  onZoom?: (scale: number | "fit") => void;
  onSize?: (size: string) => void;
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
const MAX_SCALE = 20;
const PIXELATION_THRESHOLD = 3;
const SCALE_PINCH_FACTOR = 0.075;
const zoomLevels = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20];
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export default class ImageViewer extends Component<ImageViewerProps, ImageViewerState> {
  private containerRef = createRef<HTMLDivElement>();
  private imageRef = createRef<HTMLImageElement>();

  constructor(props: ImageViewerProps) {
    super(props);
    this.state = {
      scale: props.initialScale || "fit",
      ctrlPressed: false,
      altPressed: false,
      hasLoadedImage: false,
      consumeClick: true,
      isActive: false,
      isLoading: true,
      hasError: false,
      offsetX: 0,
      offsetY: 0,
    };
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("scroll", this.handleScroll);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.state.hasLoadedImage) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
    });

    if (isMac ? e.altKey : e.ctrlKey) {
      this.setActive(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.state.hasLoadedImage) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
    });

    if (!(isMac ? e.altKey : e.ctrlKey)) {
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

    if (!(isMac ? this.state.altPressed : this.state.ctrlPressed)) {
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

    const isScrollWheelKeyPressed = isMac ? this.state.altPressed : this.state.ctrlPressed;
    if (!isScrollWheelKeyPressed && !e.ctrlKey) return;

    if (this.state.scale === "fit") {
      this.firstZoom();
    }

    const delta = e.deltaY > 0 ? 1 : -1;
    const currentScale = typeof this.state.scale === "number" ? this.state.scale : 1;
    this.updateScale(currentScale * (1 - delta * SCALE_PINCH_FACTOR));
  };

  private handleScroll = () => {
    if (!this.state.hasLoadedImage || this.state.scale === "fit") return;

    this.setState({
      offsetX: window.scrollX,
      offsetY: window.scrollY,
    });
  };

  private handleImageLoad = () => {
    if (this.state.hasLoadedImage) return;

    const image = this.imageRef.current;
    if (!image) return;

    this.setState({
      hasLoadedImage: true,
      isLoading: false,
    });

    this.props.onSize?.(`${image.naturalWidth}x${image.naturalHeight}`);
    this.updateScale(this.state.scale);

    if (this.state.scale !== "fit") {
      window.scrollTo(this.state.offsetX, this.state.offsetY);
    }
  };

  private handleImageError = () => {
    if (this.state.hasLoadedImage) return;

    this.setState({
      hasLoadedImage: true,
      isLoading: false,
      hasError: true,
    });
  };

  private updateScale = (newScale: number | "fit") => {
    const image = this.imageRef.current;
    const container = this.containerRef.current;

    if (!image || !this.state.hasLoadedImage || !container) return;

    if (newScale === "fit") {
      this.setState({ scale: "fit" });
      this.props.onZoom?.("fit");
    } else {
      const clampedScale = clamp(newScale, MIN_SCALE, MAX_SCALE);

      const dx = (window.scrollX + container.clientWidth / 2) / container.scrollWidth;
      const dy = (window.scrollY + container.clientHeight / 2) / container.scrollHeight;

      this.setState({ scale: clampedScale });

      // Update scroll position after state change
      setTimeout(() => {
        const newScrollX = container.scrollWidth * dx - container.clientWidth / 2;
        const newScrollY = container.scrollHeight * dy - container.clientHeight / 2;
        window.scrollTo(newScrollX, newScrollY);

        this.setState({
          offsetX: newScrollX,
          offsetY: newScrollY,
        });
      }, 0);

      this.props.onZoom?.(clampedScale);
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
    for (; i < zoomLevels.length; ++i) {
      if (zoomLevels[i] > currentScale) {
        break;
      }
    }
    this.updateScale(zoomLevels[i] || MAX_SCALE);
  };

  private zoomOut = () => {
    if (this.state.scale === "fit") {
      this.firstZoom();
      return;
    }

    const currentScale = typeof this.state.scale === "number" ? this.state.scale : 1;
    let i = zoomLevels.length - 1;
    for (; i >= 0; --i) {
      if (zoomLevels[i] < currentScale) {
        break;
      }
    }
    this.updateScale(zoomLevels[i] || MIN_SCALE);
  };

  render() {
    const { src } = this.props;
    const { scale, isActive, ctrlPressed, altPressed, isLoading, hasError, hasLoadedImage } = this.state;

    const containerClasses = [
      "image-viewer",
      isLoading && "loading",
      hasError && "error",
      hasLoadedImage && "ready",
      isActive && (isMac ? altPressed : ctrlPressed) ? "zoom-out" : "zoom-in",
    ]
      .filter(Boolean)
      .join(" ");

    const imageClasses = [
      scale === "fit" && "scale-to-fit",
      typeof scale === "number" && scale >= PIXELATION_THRESHOLD && "pixelated",
    ]
      .filter(Boolean)
      .join(" ");

    const imageStyle: any = {
      zoom: scale === "fit" ? "normal" : scale,
    };

    return (
      <div
        ref={this.containerRef}
        className={containerClasses}
        onMouseDown={this.handleMouseDown}
        onClick={this.handleClick}
        onWheel={this.handleWheel}
      >
        {hasLoadedImage && (
          <img
            ref={this.imageRef}
            src={src}
            className={imageClasses}
            style={imageStyle}
            onLoad={this.handleImageLoad}
            onError={this.handleImageError}
            alt="Viewer image"
          />
        )}
        {!hasLoadedImage && !hasError && (
          <img
            ref={this.imageRef}
            src={src}
            onLoad={this.handleImageLoad}
            onError={this.handleImageError}
            style={{ display: "none" }}
            alt="Viewer image"
          />
        )}
      </div>
    );
  }
}

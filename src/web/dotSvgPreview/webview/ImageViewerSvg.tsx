import { Component, createRef } from "preact";

interface ImageViewerProps {
  src: string; // SVG source as string
  initialScale?: number | "fit";
  initialOffsetX?: number;
  initialOffsetY?: number;
  onZoom?: (scale: number | "fit") => void;
}

interface ImageViewerState {
  scale: number | "fit";
  ctrlPressed: boolean;
  altPressed: boolean;
  consumeClick: boolean;
  isActive: boolean;
  offsetX: number;
  offsetY: number;
  svgSize: { width: number; height: number } | null;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
const SCALE_PINCH_FACTOR = 0.075;
const zoomLevels = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20];
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export default class ImageViewerSvg extends Component<ImageViewerProps, ImageViewerState> {
  private containerRef = createRef<HTMLDivElement>();

  constructor(props: ImageViewerProps) {
    super(props);
    this.state = {
      scale: props.initialScale || "fit",
      ctrlPressed: false,
      altPressed: false,
      consumeClick: true,
      isActive: false,
      offsetX: 0,
      offsetY: 0,
      svgSize: null,
    };
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    this.parseSvgSize();
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("scroll", this.handleScroll);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.state.svgSize) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
    });

    if (isMac ? e.altKey : e.ctrlKey) {
      this.setActive(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.state.svgSize) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
    });

    if (!(isMac ? e.altKey : e.ctrlKey)) {
      this.setActive(false);
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.state.svgSize || e.button !== 0) return;

    this.setState({
      ctrlPressed: e.ctrlKey,
      altPressed: e.altKey,
      consumeClick: !this.state.isActive,
    });
  };

  private handleClick = (e: MouseEvent) => {
    if (!this.state.svgSize || e.button !== 0) return;

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

    if (!this.state.svgSize) return;

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
    if (!this.state.svgSize || this.state.scale === "fit") return;

    this.setState({
      offsetX: window.scrollX,
      offsetY: window.scrollY,
    });
  };

  private parseSvgSize = () => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(this.props.src, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    if (svgElement.tagName !== "svg") {
      console.error("Invalid SVG source");
      return;
    }

    const width = svgElement.getAttribute("width");
    const height = svgElement.getAttribute("height");
    const viewBox = svgElement.getAttribute("viewBox");

    let svgWidth = 0;
    let svgHeight = 0;

    if (width && height) {
      svgWidth = parseFloat(width);
      svgHeight = parseFloat(height);
    } else if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
      svgWidth = vbWidth;
      svgHeight = vbHeight;
    } else {
      // Default fallback
      svgWidth = 300;
      svgHeight = 150;
    }

    this.setState({ svgSize: { width: svgWidth, height: svgHeight } });
  };

  private updateScale = (newScale: number | "fit") => {
    const container = this.containerRef.current;

    if (!this.state.svgSize || !container) return;

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
    const container = this.containerRef.current;
    if (!this.state.svgSize || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaleX = containerWidth / this.state.svgSize.width;
    const scaleY = containerHeight / this.state.svgSize.height;
    const scale = Math.min(scaleX, scaleY);

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
    const { scale, isActive, ctrlPressed, altPressed, svgSize } = this.state;

    const containerClasses = [
      "image-viewer",
      svgSize && "ready",
      isActive && (isMac ? altPressed : ctrlPressed) ? "zoom-out" : "zoom-in",
    ]
      .filter(Boolean)
      .join(" ");

    const svgStyle: any = {
      width: scale === "fit" ? "100%" : `${svgSize?.width || 0}px`,
      height: scale === "fit" ? "auto" : `${svgSize?.height || 0}px`,
      transform: scale !== "fit" ? `scale(${scale})` : "none",
      transformOrigin: "top left",
      display: "block",
      maxWidth: scale === "fit" ? "100%" : "none",
      maxHeight: scale === "fit" ? "100%" : "none",
    };

    return (
      <div
        ref={this.containerRef}
        className={containerClasses}
        onMouseDown={this.handleMouseDown}
        onClick={this.handleClick}
        onWheel={this.handleWheel}
        style={{
          //   position: "relative",
          //   width: "100%",
          //   height: "100%",
          //   overflow: "auto",
          ...svgStyle,
          cursor: isActive ? ((isMac ? altPressed : ctrlPressed) ? "zoom-out" : "zoom-in") : "default",
        }}
      >
        {svgSize && <div dangerouslySetInnerHTML={{ __html: src }} />}
      </div>
    );
  }
}

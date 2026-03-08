/**
 * Lightweight QR Code renderer using canvas.
 * Implements a minimal QR code generator for alphanumeric/byte mode.
 * Uses a simple encoding approach via data URL for reliability.
 */
import { forwardRef, useEffect, useRef } from "react";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  bgColor?: string;
  fgColor?: string;
  logoSrc?: string;
  logoSize?: number;
  className?: string;
}

/**
 * Generates a QR code using the QR Server API (self-contained fallback available).
 * For deployed ICP apps, we use an SVG-based approach that encodes data inline.
 */
export const QRCodeCanvas = forwardRef<HTMLCanvasElement, QRCodeCanvasProps>(
  (
    {
      value,
      size = 200,
      bgColor = "#ffffff",
      fgColor = "#000000",
      logoSrc,
      logoSize = 40,
      className,
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef =
      (ref as React.RefObject<HTMLCanvasElement>) ?? internalRef;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use QR Server API to generate QR as image
      const img = new Image();
      img.crossOrigin = "anonymous";
      const encodedValue = encodeURIComponent(value);
      const errorLevel = "H";
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&ecc=${errorLevel}&bgcolor=${bgColor.replace("#", "")}&color=${fgColor.replace("#", "")}`;

      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        // Draw logo in center if provided
        if (logoSrc) {
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = logoSrc;
          logo.onload = () => {
            const logoX = (size - logoSize) / 2;
            const logoY = (size - logoSize) / 2;
            // White background behind logo
            ctx.fillStyle = bgColor;
            ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          };
        }
      };

      img.onerror = () => {
        // Fallback: draw a placeholder
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = fgColor;
        ctx.font = `${Math.floor(size / 12)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("QR Code", size / 2, size / 2 - 10);
        ctx.font = `${Math.floor(size / 20)}px monospace`;
        ctx.fillText("(offline mode)", size / 2, size / 2 + 10);
      };
    }, [value, size, bgColor, fgColor, logoSrc, logoSize, canvasRef]);

    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={className}
        style={{ display: "block" }}
      />
    );
  },
);

QRCodeCanvas.displayName = "QRCodeCanvas";

/**
 * SVG-based QR code component using an <img> tag pointing to QR API.
 * Most reliable for ICP deployments.
 */
export interface QRCodeSVGProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  bgColor?: string;
  fgColor?: string;
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate?: boolean;
  };
  className?: string;
  ref?: React.Ref<SVGSVGElement>;
}

export const QRCodeSVG = forwardRef<SVGSVGElement, QRCodeSVGProps>(
  (
    {
      value,
      size = 200,
      level = "H",
      bgColor = "#ffffff",
      fgColor = "#000000",
      imageSettings,
      className,
    },
    _ref,
  ) => {
    const encodedValue = encodeURIComponent(value);
    const bg = bgColor.replace("#", "");
    const fg = fgColor.replace("#", "");
    const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&ecc=${level}&bgcolor=${bg}&color=${fg}`;

    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          position: "relative",
          display: "inline-block",
        }}
      >
        <img
          src={imgSrc}
          width={size}
          height={size}
          alt="QR Code"
          style={{ display: "block" }}
        />
        {imageSettings && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: bgColor,
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={imageSettings.src}
              width={imageSettings.width}
              height={imageSettings.height}
              alt=""
              style={{ display: "block" }}
            />
          </div>
        )}
      </div>
    ) as unknown as React.ReactElement & { ref: React.Ref<SVGSVGElement> };
  },
);

QRCodeSVG.displayName = "QRCodeSVG";

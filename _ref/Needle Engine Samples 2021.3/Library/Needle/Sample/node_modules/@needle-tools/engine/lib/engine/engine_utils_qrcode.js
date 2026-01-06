import { needleLogoOnlySVG } from "./assets/index.js";
import { isDevEnvironment } from "./debug/debug.js";
import { hasCommercialLicense } from "./engine_license.js";
import { InternalAttributeUtils } from "./engine_utils_attributes.js";
/** Generates a QR code HTML image using https://github.com/davidshimjs/qrcodejs
 * @param args.text The text to encode
 * @param args.width The width of the QR code
 * @param args.height The height of the QR code
 * @param args.colorDark The color of the dark squares
 * @param args.colorLight The color of the light squares
 * @param args.correctLevel The error correction level to use
 * @param args.showLogo If true, the logo will be shown in the center of the QR code. By default the Needle Logo will be used. You can override which logo is being used by setting the `needle-engine` web component's `qr-logo-src` attribute. The logo can also be disabled by setting that attribute to a falsey value (e.g. "0" or "false")
 * @param args.showUrl If true, the URL will be shown below the QR code
 * @param args.domElement The dom element to append the QR code to. If not provided a new div will be created and returned
 * @returns The dom element containing the QR code
 */
export async function generateQRCode(args) {
    // Ensure that the QRCode library is loaded
    if (!globalThis["QRCode"]) {
        const url = "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js";
        let script = document.head.querySelector(`script[src="${url}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = url;
            document.head.appendChild(script);
        }
        await new Promise((resolve, _reject) => {
            script.addEventListener("load", () => {
                resolve(true);
            });
        });
    }
    const QRCODE = globalThis["QRCode"];
    const target = args.domElement ?? document.createElement("div");
    const qrCode = new QRCODE(target, {
        width: args.width ?? 256,
        height: args.height ?? 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: args.showLogo ? QRCODE.CorrectionLevel.H : QRCODE.CorrectLevel.M,
        ...args,
    });
    // Number of rows/columns of the generated QR code
    const moduleCount = qrCode?._oQRCode.moduleCount || 0;
    const canvas = qrCode?._oDrawing?._elCanvas;
    let sizePercentage = 0.25;
    if (moduleCount < 40)
        sizePercentage = Math.floor(moduleCount / 4) / moduleCount;
    else
        sizePercentage = Math.floor(moduleCount / 6) / moduleCount;
    const paddingPercentage = Math.floor(moduleCount / 20) / moduleCount;
    try {
        const img = await internalRenderQRCodeOverlays(canvas, { showLogo: args.showLogo, logoSize: sizePercentage, logoPadding: paddingPercentage }).catch(_e => { });
        if (img) {
            target.innerHTML = "";
            target.append(img);
        }
    }
    catch { } // Ignore
    if (args.showUrl !== false && args.text) {
        // Add link label below the QR code
        // Clean up the text. If it's a URL: remove the protocol, www. part, trailing slashes or trailing question marks
        const existingLabel = target.querySelector(".qr-code-link-label");
        let displayText = args.text.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "").replace(/\?+$/, "");
        displayText = "Scan to visit " + displayText;
        if (existingLabel) {
            existingLabel.textContent = displayText;
        }
        else {
            // Create a new label
            const linkLabel = document.createElement("div");
            linkLabel.classList.add("qr-code-link-label");
            args.text = displayText;
            linkLabel.textContent = args.text;
            linkLabel.addEventListener("click", (ev) => {
                // Prevent the QR panel from closing
                ev.stopImmediatePropagation();
            });
            linkLabel.style.textAlign = "center";
            linkLabel.style.fontSize = "0.8em";
            linkLabel.style.marginTop = "0.1em";
            linkLabel.style.color = "#000000";
            linkLabel.style.fontFamily = "'Roboto Flex', sans-serif";
            linkLabel.style.opacity = "0.5";
            linkLabel.style.wordBreak = "break-all";
            linkLabel.style.wordWrap = "break-word";
            linkLabel.style.marginBottom = "0.3em";
            // Ensure max. width
            target.style.width = "calc(210px + 20px)";
            target.appendChild(linkLabel);
        }
    }
    return target;
}
async function internalRenderQRCodeOverlays(canvas, args) {
    if (!canvas)
        return;
    // Internal settings
    const canvasPadding = 8;
    const shadowBlur = 20;
    const rectanglePadding = args.logoPadding || 1. / 32;
    // With dropshadow under the logo
    /*
    const shadowColor = "#00000099";
    const rectangleRadius = 0.4 * 16;
    */
    // Without dropshadow under the logo
    const shadowColor = "transparent";
    const rectangleRadius = 0;
    // Draw the website's icon in the center of the QR code
    const image = new Image();
    const element = document.querySelector("needle-engine");
    if (!element) {
        console.debug("[QR Code] No web component found");
    }
    const canUseCustomLogo = hasCommercialLicense();
    // Query logo src from needle-engine attribute.
    // For any supported attribute it's possible to use "falsey" values (e.g. "0" or "false" to disable the logo in the QR code)
    let logoSrc = null;
    logoSrc = InternalAttributeUtils.getAttributeAndCheckFalsey(element, "qrcode-logo-src");
    if (canUseCustomLogo && args.showLogo !== true && logoSrc === false)
        return; // Explictly disabled
    logoSrc ||= InternalAttributeUtils.getAttributeAndCheckFalsey(element, "logo-src");
    if (canUseCustomLogo && args.showLogo !== true && logoSrc === false)
        return; // Explicitly disabled
    logoSrc ||= InternalAttributeUtils.getAttributeAndCheckFalsey(element, "loading-logo-src", {
        onAttribute: () => {
            if (isDevEnvironment())
                console.warn("[QR Code] 'loading-logo-src' is deprecated, please use 'logo-src' or 'qrcode-logo-src' instead.");
            else
                console.debug("[QR Code] 'loading-logo-src' is deprecated.");
        }
    });
    if (canUseCustomLogo && args.showLogo !== true && logoSrc === false)
        return; // Explicitly disabled
    if (logoSrc && !canUseCustomLogo) {
        console.warn("[QR Code] Custom logo is only available with a commercial license. Using default Needle logo. Please get a commercial license at https://needle.tools/pricing.");
        logoSrc = null;
    }
    logoSrc ||= needleLogoOnlySVG;
    if (!logoSrc)
        return;
    let haveLogo = false;
    if (args.showLogo !== false) {
        image.src = logoSrc;
        haveLogo = await new Promise((resolve, _reject) => {
            image.onload = () => resolve(true);
            image.onerror = (err) => {
                const errorUrl = logoSrc !== needleLogoOnlySVG ? "'" + logoSrc + "'" : null;
                console.error("[QR Code] Error loading logo image for QR code", errorUrl, isDevEnvironment() ? err : "");
                resolve(false);
            };
        });
    }
    // Add some padding around the canvas – we need to copy the QR code image to a larger canvas
    const paddedCanvas = document.createElement("canvas");
    paddedCanvas.width = canvas.width + canvasPadding;
    paddedCanvas.height = canvas.height + canvasPadding;
    const paddedContext = paddedCanvas.getContext("2d");
    if (!paddedContext) {
        return;
    }
    // Clear with white
    paddedContext.fillStyle = "#ffffff";
    paddedContext.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
    paddedContext.drawImage(canvas, canvasPadding / 2, canvasPadding / 2);
    // Enable anti-aliasing
    paddedContext.imageSmoothingEnabled = true;
    paddedContext.imageSmoothingQuality = "high";
    // @ts-ignore
    paddedContext.mozImageSmoothingEnabled = true;
    // @ts-ignore
    paddedContext.webkitImageSmoothingEnabled = true;
    // Draw a slight gradient background with 10% opacity and "lighten" composite operation
    paddedContext.globalCompositeOperation = "lighten";
    const gradient = paddedContext.createLinearGradient(0, 0, 0, paddedCanvas.height);
    gradient.addColorStop(0, "rgb(45, 45, 45)");
    gradient.addColorStop(1, "rgb(45, 45, 45)");
    paddedContext.fillStyle = gradient;
    paddedContext.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
    paddedContext.globalCompositeOperation = "source-over";
    let sizeX = Math.min(canvas.width, canvas.height) * (args.logoSize || 0.25);
    let sizeY = sizeX;
    if (haveLogo) {
        // Get aspect of image
        const aspect = image.width / image.height;
        if (aspect > 1)
            sizeY = sizeX / aspect;
        else
            sizeX = sizeY * aspect;
        const rectanglePaddingPx = rectanglePadding * canvas.width;
        // Apply padding
        const sizeForBackground = Math.max(sizeX, sizeY);
        const sizeXPadded = Math.round(sizeForBackground + rectanglePaddingPx);
        const sizeYPadded = Math.round(sizeForBackground + rectanglePaddingPx);
        const x = (paddedCanvas.width - sizeForBackground) / 2;
        const y = (paddedCanvas.height - sizeForBackground) / 2;
        // Draw shape with blurred shadow
        paddedContext.shadowColor = shadowColor;
        paddedContext.shadowBlur = shadowBlur;
        // Draw rounded rectangle with radius
        // Convert 0.4rem to pixels, taking DPI into account
        const radius = rectangleRadius;
        const xPadded = Math.round(x - rectanglePaddingPx / 2);
        const yPadded = Math.round(y - rectanglePaddingPx / 2);
        paddedContext.beginPath();
        paddedContext.moveTo(xPadded + radius, yPadded);
        paddedContext.lineTo(xPadded + sizeXPadded - radius, yPadded);
        paddedContext.quadraticCurveTo(xPadded + sizeXPadded, yPadded, xPadded + sizeXPadded, yPadded + radius);
        paddedContext.lineTo(xPadded + sizeXPadded, yPadded + sizeYPadded - radius);
        paddedContext.quadraticCurveTo(xPadded + sizeXPadded, yPadded + sizeYPadded, xPadded + sizeXPadded - radius, yPadded + sizeYPadded);
        paddedContext.lineTo(xPadded + radius, yPadded + sizeYPadded);
        paddedContext.quadraticCurveTo(xPadded, yPadded + sizeYPadded, xPadded, yPadded + sizeYPadded - radius);
        paddedContext.lineTo(xPadded, yPadded + radius);
        paddedContext.quadraticCurveTo(xPadded, yPadded, xPadded + radius, yPadded);
        paddedContext.fillStyle = "#ffffff";
        paddedContext.closePath();
        paddedContext.fill();
        paddedContext.clip();
        // Reset shadow and draw favicon
        paddedContext.shadowColor = "transparent";
        const logoX = (paddedCanvas.width - sizeX) / 2;
        const logoY = (paddedCanvas.height - sizeY) / 2;
        paddedContext.drawImage(image, logoX, logoY, sizeX, sizeY);
    }
    // Replace the canvas with the padded one
    const paddedImage = paddedCanvas.toDataURL("image/png");
    const img = document.createElement("img");
    img.src = paddedImage;
    img.style.width = "100%";
    img.style.height = "auto";
    return img;
}
//# sourceMappingURL=engine_utils_qrcode.js.map
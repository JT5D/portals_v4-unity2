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
export declare function generateQRCode(args: {
    domElement?: HTMLElement;
    text: string;
    width?: number;
    height?: number;
    colorDark?: string;
    colorLight?: string;
    correctLevel?: any;
    showLogo?: boolean;
    showUrl?: boolean;
}): Promise<HTMLElement>;

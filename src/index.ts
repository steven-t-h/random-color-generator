export type RandomColorOptions = {
    seed?: number | null;
    count?: number | null;
    // leave undefined for hex
    format?: 'hsvArray' | 'hslArray' | 'hsl' | 'hsla' | 'rgbArray' | 'rgb' | 'rgba'
    alpha?: any;
    hue?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'monochrome'
    verbose?: boolean;
    luminosity?: 'bright' | 'dark' | 'light' | 'random'
} | null

export type ColorResponse = string | number[]
export type MultiColorResponse = ColorResponse[]

/**
 * RandomColorGenerator class
 * @class RandomColorGenerator
 * @classdesc A class to generate random colors
 * @example
 * import RandomColorGenerator from '@apollo-tech/random-color';
 *
 * const generator = new RandomColorGenerator();
 * const color = await generator.randomColor();
 * console.log(color);
 * generator.setSeed(1234);
 * const color2 = await generator.randomColor();
 * console.log(color2);
 */
class RandomColorGenerator {
    /**
     * Seed to get repeatable colors.
     * Use the setSeed method to set the seed to a new value.
     */
    seed: number | null = null;

    /**
     * Verbose mode to log the generated colors
     * Default is false
     * Use the setVerbose method to set the verbose mode
     */
    verbose: boolean = false;

    /**
     * History of generated colors.
     * Useful when you persist the instance of the RandomColorGenerator class
     * @type {ColorResponse[]}
     * @example
     * const generator = new RandomColorGenerator();
     * const color = generator.randomColor({ count: 2 });
     * console.log(generator.history);
     * // Output: ["#FF0000", "#00FF00"]
     */
    history: MultiColorResponse = [];

    // Shared color dictionary
    private colorDictionary: {
        [key: string]: {
            hueRange: number[] | null;
            lowerBounds: any[];
            saturationRange: number[];
            brightnessRange: number[]
        }
    } = {};

    // check if a range is taken
    private colorRanges: boolean[] = [];

    /**
     * Create a new RandomColorGenerator instance
     * @constructor
     * @example
     * const generator = new RandomColorGenerator();
     * const color = generator.randomColor();
     * console.log(color);
     * // Output: "#FF0000"
     */
    constructor() {
        this.loadColorBounds();
    }

    /**
     * Generate a random color
     *
     * @param options - Options for the random color generator
     * @returns A random color in the format specified by the options
     */
    randomColor(options?: RandomColorOptions | null): ColorResponse | MultiColorResponse {
        options = options || {
            seed: null,
            count: 1,
        };
        // Check if there is a seed and ensure it's an
        // integer. Otherwise, reset the seed value.
        if (
            options.seed !== undefined &&
            options.seed !== null
        ) {
            this.seed = +options.seed;
            // If the user inputs a value that can't be represented in 32 bits, the seed is reset
            if (isNaN(this.seed)) {
                this.logger("Seed must be an integer. Seed is not updated.");
                this.seed = null;
            }
        } else {
            this.logger('No seed provided.');
            this.seed = null;
        }

        // Check if we need to generate multiple colors
        if (options.count !== null && options.count !== undefined) {
            const totalColors = options.count
            this.logger(`Generating ${totalColors} color${totalColors > 1 ? 's' : ''}`);
            const colors: MultiColorResponse = [];
            // Value false at index i means the range i is not taken yet.
            for (let i = 0; i < options.count; i++) {
                this.colorRanges.push(false);
            }
            options.count = null;

            while (totalColors > colors.length) {
                const color: string | number[] = this.newColor(options) as string | number[];
                if (this.seed !== null) {
                    options.seed = this.seed;
                }
                colors.push(color);
            }
            options.count = totalColors;
            this.logger('Completed generation of colors');
            this.logger('--- New colors ---', colors);
            this.logger('--- History ---', this.history);
            return colors.length > 1 ? colors : colors[0];
        }
        return this.newColor(options);
    };

    private newColor(options: RandomColorOptions): string | number[] {
        options = options || {
            seed: null,
            count: 1,
        }
        // First we pick a hue (H)
        const H = this.pickHue(options);
        // Then use H to determine saturation (S)
        const S = this.pickSaturation(H, options);
        // Then use S and H to determine brightness (B).
        const B = this.pickBrightness(H, S, options);
        // Then we return the HSB color in the desired format
        const color = this.setFormat([H, S, B], options);
        this.logger('Color generated', color);
        this.history.push(color);
        return color;
    }

    /**
     * Set the seed for the random color generator
     * @param seed - The seed to set. If not a number, the seed will be reset
     * to null
     */
    setSeed(seed: number) {
        if (!isNaN(seed)) {
            this.seed = seed;
        } else {
            this.logger("Seed must be a number. Seed is not updated.");
        }
    }

    /**
     * Set the verbose mode
     * @param verbose - A boolean to set the verbose mode
     */
    setVerbose(verbose: boolean) {
        this.verbose = verbose;
    }

    private pickHue(options: { seed?: any; count?: any; hue?: any; }) {
        let hueRange;
        let hue;
        if (this.colorRanges.length > 0) {
            hueRange = this.getRealHueRange(options.hue);
            hue = this.randomWithin(hueRange) || 0;
            //Each of colorRanges.length ranges has a length equal approximately one step
            let step = (hueRange[1] - hueRange[0]) / this.colorRanges.length;
            let j: number = ((hue - hueRange[0]) / step);

            //Check if the range j is taken
            if (this.colorRanges[j]) {
                j = (j + 2) % this.colorRanges.length;
            } else {
                this.colorRanges[j] = true;
            }

            const min = (hueRange[0] + j * step) % 359,
                max = (hueRange[0] + (j + 1) * step) % 359;

            hueRange = [min, max];

            hue = this.randomWithin(hueRange);

            if (hue < 0) {
                hue = 360 + hue;
            }
            return hue;
        } else {
            hueRange = this.getHueRange(options.hue);
            hue = this.randomWithin(hueRange);
            // Instead of storing red as two separate ranges,
            // we group them, using negative numbers
            if (hue < 0) {
                hue = 360 + hue;
            }
            return hue;
        }
    }

    private pickSaturation(hue: number, options: { seed?: any; count?: any; hue?: any; luminosity?: any; }) {
        if (options.hue === "monochrome") {
            return 0;
        }

        if (options.luminosity === "random") {
            return this.randomWithin([0, 100]);
        }

        const saturationRange = this.getSaturationRange(hue);

        let sMin = saturationRange[0],
            sMax = saturationRange[1];

        switch (options.luminosity) {
            case "bright":
                sMin = 55;
                break;

            case "dark":
                sMin = sMax - 10;
                break;

            case "light":
                sMax = 55;
                break;
        }

        return this.randomWithin([sMin, sMax]);
    }

    private pickBrightness(H: number, S: number, options: { seed?: any; count?: any; luminosity?: any; }) {
        let bMin = this.getMinimumBrightness(H, S),
            bMax = 100;

        switch (options.luminosity) {
            case "dark":
                bMax = bMin + 20;
                break;

            case "light":
                bMin = (bMax + bMin) / 2;
                break;

            case "random":
                bMin = 0;
                bMax = 100;
                break;
        }

        return this.randomWithin([bMin, bMax]);
    }

    private setFormat(hsv: number[], options: {
        seed?: any;
        count?: any;
        format?: any;
        alpha?: any;
    }): string | number[] {
        let alpha;
        let hslColor;
        switch (options.format) {
            case "hsvArray":
                this.logger("Returning HSV array");
                return hsv;

            case "hslArray":
                this.logger("Returning HSL array");
                return this.HSVtoHSL(hsv); //number[]

            case "hsl":
                this.logger("Returning HSL string");
                const hsl = this.HSVtoHSL(hsv);
                return "hsl(" + hsl[0] + ", " + hsl[1] + "%, " + hsl[2] + "%)"; //string

            case "hsla":
                this.logger("Returning HSLA string");
                hslColor = this.HSVtoHSL(hsv);
                alpha = options.alpha || Math.random();
                return (
                    "hsla(" +
                    hslColor[0] +
                    ", " +
                    hslColor[1] +
                    "%, " +
                    hslColor[2] +
                    "%, " +
                    alpha +
                    ")"
                ); //string

            case "rgbArray":
                this.logger("Returning RGB array");
                return this.HSVtoRGB(hsv); //number[]

            case "rgb":
                this.logger("Returning RGB string");
                const rgb = this.HSVtoRGB(hsv);
                return "rgb(" + rgb.join(", ") + ")"; //string

            case "rgba":
                this.logger("Returning RGBA string");
                const rgbColor = this.HSVtoRGB(hsv);
                alpha = options.alpha || Math.random();
                return "rgba(" + rgbColor.join(", ") + ", " + alpha + ")"; //string

            default:
                this.logger("Returning hex string");
                return this.HSVtoHex(hsv); //string
        }
    }

    private getMinimumBrightness(H: number, S: number) {
        const colorInfo = this.getColorInfo(H);
        if (colorInfo) {
            const lowerBounds = this.getColorInfo(H).lowerBounds;

            for (let i = 0; i < lowerBounds.length - 1; i++) {
                const s1 = lowerBounds[i][0],
                    v1 = lowerBounds[i][1];

                const s2 = lowerBounds[i + 1][0],
                    v2 = lowerBounds[i + 1][1];

                if (S >= s1 && S <= s2) {
                    const m = (v2 - v1) / (s2 - s1),
                        b = v1 - m * s1;

                    return m * S + b;
                }
            }
        }
        return 0;
    }

    private getHueRange(colorInput: string) {
        if (!colorInput) {
            return [0, 360];
        }
        if (typeof parseInt(colorInput) === "number") {
            const number = parseInt(colorInput);

            if (number < 360 && number > 0) {
                return [number, number];
            }
        }

        if (this.colorDictionary[colorInput]) {
            const color = this.colorDictionary[colorInput];
            if (color.hueRange) {
                return color.hueRange;
            }
        } else if (colorInput.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
            const hue = this.HexToHSB(colorInput)[0];
            return [hue, hue];
        }

        return [0, 360];
    }

    private getSaturationRange(hue: number) {
        return this.getColorInfo(hue).saturationRange;
    }

    private getColorInfo(hue: number) {
        // Maps red colors to make picking hue easier
        if (hue >= 334 && hue <= 360) {
            hue -= 360;
        }
        if (hue < 0) {
            hue = hue * -1
        }

        for (const colorName in this.colorDictionary) {
            const color = this.colorDictionary[colorName];
            if (
                color.hueRange &&
                hue >= color.hueRange[0] &&
                hue <= color.hueRange[1]
            ) {
                return this.colorDictionary[colorName];
            }
        }
        throw new Error("Color not found");
    }

    private randomWithin(range: number[]) {
        if (this.seed === null) {
            //generate random evenly distinct number from : https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
            const golden_ratio = 0.618033988749895;
            let r = Math.random();
            r += golden_ratio;
            r %= 1;
            return Math.floor(range[0] + r * (range[1] + 1 - range[0]));
        } else {
            //Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
            const max = range[1] || 1;
            const min = range[0] || 0;
            this.seed = (+this.seed * 9301 + 49297) % 233280;
            const rnd = this.seed / 233280.0;
            return Math.floor(min + rnd * (max - min));
        }
    }

    private HSVtoHex(hsv: any[]) {
        const rgb = this.HSVtoRGB(hsv);

        function componentToHex(c: number) {
            const hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        return "#" +
            componentToHex(rgb[0]) +
            componentToHex(rgb[1]) +
            componentToHex(rgb[2]);
    }

    private defineColor(name: string, hueRange: number[] | null, lowerBounds: number[][]) {
        const sMin = lowerBounds[0][0],
            sMax = lowerBounds[lowerBounds.length - 1][0],
            bMin = lowerBounds[lowerBounds.length - 1][1],
            bMax = lowerBounds[0][1];

        this.colorDictionary[name] = {
            hueRange: hueRange,
            lowerBounds: lowerBounds,
            saturationRange: [sMin, sMax],
            brightnessRange: [bMin, bMax],
        };
    }

    private loadColorBounds() {
        this.defineColor("monochrome", null, [
            [0, 0],
            [100, 0],
        ]);

        this.defineColor(
            "red",
            [-26, 18],
            [
                [20, 100],
                [30, 92],
                [40, 89],
                [50, 85],
                [60, 78],
                [70, 70],
                [80, 60],
                [90, 55],
                [100, 50],
            ]
        );

        this.defineColor(
            "orange",
            [18, 46],
            [
                [20, 100],
                [30, 93],
                [40, 88],
                [50, 86],
                [60, 85],
                [70, 70],
                [100, 70],
            ]
        );

        this.defineColor(
            "yellow",
            [46, 62],
            [
                [25, 100],
                [40, 94],
                [50, 89],
                [60, 86],
                [70, 84],
                [80, 82],
                [90, 80],
                [100, 75],
            ]
        );

        this.defineColor(
            "green",
            [62, 178],
            [
                [30, 100],
                [40, 90],
                [50, 85],
                [60, 81],
                [70, 74],
                [80, 64],
                [90, 50],
                [100, 40],
            ]
        );

        this.defineColor(
            "blue",
            [178, 257],
            [
                [20, 100],
                [30, 86],
                [40, 80],
                [50, 74],
                [60, 60],
                [70, 52],
                [80, 44],
                [90, 39],
                [100, 35],
            ]
        );

        this.defineColor(
            "purple",
            [257, 282],
            [
                [20, 100],
                [30, 87],
                [40, 79],
                [50, 70],
                [60, 65],
                [70, 59],
                [80, 52],
                [90, 45],
                [100, 42],
            ]
        );

        this.defineColor(
            "pink",
            [282, 334],
            [
                [20, 100],
                [30, 90],
                [40, 86],
                [60, 84],
                [80, 80],
                [90, 75],
                [100, 73],
            ]
        );
    }

    private HSVtoRGB(hsv: number[]) {
        // this doesn't work for the values of 0 and 360
        // here's the hacky fix
        let h = hsv[0];
        if (h === 0) {
            h = 1;
        }
        if (h === 360) {
            h = 359;
        }

        // Rebase the h,s,v values
        h = h / 360;
        const s = hsv[1] / 100,
            v = hsv[2] / 100;

        let h_i = Math.floor(h * 6),
            f = h * 6 - h_i,
            p = v * (1 - s),
            q = v * (1 - f * s),
            t = v * (1 - (1 - f) * s),
            r = 256,
            g = 256,
            b = 256;

        switch (h_i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
        }

        return [
            Math.floor(r * 255),
            Math.floor(g * 255),
            Math.floor(b * 255),
        ];
    }

    private HexToHSB(hex: string) {
        hex = hex.replace(/^#/, "");
        hex = hex.length === 3 ? hex.replace(/(.)/g, "$1$1") : hex;

        const red = parseInt(hex.substring(0, 2), 16) / 255;
        const green = parseInt(hex.substring(2, 4), 16) / 255;
        const blue = parseInt(hex.substring(4, 6), 16) / 255;

        const cMax = Math.max(red, green, blue),
            delta = cMax - Math.min(red, green, blue),
            saturation = cMax ? delta / cMax : 0;

        switch (cMax) {
            case red:
                return [60 * (((green - blue) / delta) % 6) || 0, saturation, cMax];
            case green:
                return [60 * ((blue - red) / delta + 2) || 0, saturation, cMax];
            case blue:
                return [60 * ((red - green) / delta + 4) || 0, saturation, cMax];
        }
        throw new Error("Something went wrong in HexToHSB");
    }

    private HSVtoHSL(hsv: number[]) {
        const h = hsv[0],
            s = hsv[1] / 100,
            v = hsv[2] / 100,
            k = (2 - s) * v;

        return [
            h,
            Math.round(((s * v) / (k < 1 ? k : 2 - k)) * 10000) / 100,
            (k / 2) * 100,
        ];
    }

    // get The range of given hue when options.count!=0
    private getRealHueRange(colorHue: string | number): number[] {
        if (!isNaN(+colorHue)) {
            const number = +colorHue;

            if (number < 360 && number > 0) {
                return this.getColorInfo(number).hueRange as unknown as number[];
            }
        } else if (typeof colorHue === "string") {
            if (this.colorDictionary[colorHue]) {
                const color = this.colorDictionary[colorHue];

                if (color.hueRange) {
                    return color.hueRange;
                }
            } else if (colorHue.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
                const result = this.HexToHSB(colorHue);
                const hue = result && result.length > 0 ? result[0] : 0;
                return this.getColorInfo(hue).hueRange as unknown as number[];
            }
        }

        return [0, 360];
    }

    private logger(message: string, ...optionalParams: any[]): void {
        if (this.verbose) {
            console.debug(`[RandomColor] ${message}`, ...optionalParams)
        }
    }
}

export default RandomColorGenerator;
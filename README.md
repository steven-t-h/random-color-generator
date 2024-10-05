# Random Color Generator

This is a simple random color generator that generates a random color, or colors, in the requested format. It is heavily
based on the [randomcolor](https://github.com/davidmerfield/randomColor) tiny script. This package simply expands
on the original script by adding more features and options, particularily by instantiating a class that can be used to
retain the history of generated colors.

## Installation

```bash
npm install @apollo-tech/random-color
```

## Usage

### Basic Usage
```javascript
import RandomColorGenerator from '@apollo-tech/random-color';
// create a new instance of the random color generator
const generator = new RandomColorGenerator();
// generate a random color
const color = generator.randomColor()
console.log(color);
// Output: '#a3e2c1'
```

### Options

You can pass an options object to influence the type of color it produces. The options object accepts the following properties:

`hue` – Controls the hue of the generated color. You can pass a string representing a color name: `red`, `orange`, `yellow`, 
`green`, `blue`, `purple`, `pink` and `monochrome` are currently supported.

`luminosity` – Controls the luminosity of the generated color. You can specify a string containing `bright`, `light` or `dark`.

`count` – An integer which specifies the number of colors to generate.

`seed` - An integer or string which when passed will cause randomColor to return the same color each time.

`format` – A string which specifies the format of the generated color. Possible values are `rgb`, `rgba`, `rgbArray`, `hsl`, `hsla`, `hslArray`.
If you do not provide a value, `hex` will be used.

`alpha` – A decimal between 0 and 1. This is only relevant when using a format with an alpha channel (`rgba` and `hsla`). Defaults to a random value.

```javascript
// generate a random color in a specific format
const color = generator.randomColor({ format: 'rgb' });
console.log(color);
// Output: 'rgb(225,200,20)'
```

### History

```javascript
// view the history of generated colors
console.log(generator.history);
// Output: ['#a3e2c1', 'rgb(225,200,20)']
```

### Methods


#### Verbose Logging
You can enable a logging method by setting the verbose mode to true. This will log the generated color to the console.
All console messages are logged using the `console.debug` method and are prefixed with the string `[RandomColor]`.

```javascript
// enable verbose mode for testing
generator.setVerbose(true);
console.log(generator.verbose)
// Output: true
```

#### Set Seed

You can set the seed for the random color generator. This will allow you to generate the same random color each time
you run the generator with the same seed. The seed can be set in the options object when calling the `randomColor` method,
or by calling the `setSeed` method.

```javascript
// change the seed
generator.setSeed(1234);
console.log(generator.seed);
// Output: 1234
```


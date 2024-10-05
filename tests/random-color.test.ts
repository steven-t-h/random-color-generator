import RandomColorGenerator from "../src";

describe('RandomColorGenerator', () => {
    it('should be a class', () => {
        expect(typeof RandomColorGenerator).toBe('function');
    });
    test('Returns a single hex color', async () => {
        const generator = new RandomColorGenerator();
        generator.setVerbose(true);
        const color = generator.randomColor();
        expect(color).toContain('#');
    });

    test('Returns a single rgb color', async () => {
        const generator = new RandomColorGenerator();
        const color = generator.randomColor({ format: 'rgb' });
        expect(color).toContain('rgb');
    });

    test('Returns two hex colors', () => {
        const generator = new RandomColorGenerator();
        const color = generator.randomColor({ count: 2 });
        expect(color.length).toBe(2);
        expect(color[0]).toContain('#');
        expect(color[1]).toContain('#');
    });

    test('Returns two rgb colors and two hex colors, separately', () => {
        const generator = new RandomColorGenerator();
        generator.setVerbose(true);
        const color = generator.randomColor({ count: 2, format: 'rgb'});
        expect(color.length).toBe(2);
        expect(color[0]).toContain('rgb');
        expect(color[1]).toContain('rgb');
        const color2 = generator.randomColor({ count: 2 });
        expect(color2.length).toBe(2);
        expect(generator.history.length).toBe(4);
    });
});
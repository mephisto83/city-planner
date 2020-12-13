import { expect } from 'chai';
import CityLayout from './citylayout';
import ShelfPack from './shelfpack';
describe('City Layout', function () {
    it('can be initialized', function () {
        let city = new CityLayout({ height: 0, width: 0 });
        expect(city).to.not.be.null;
    });

    it('can add a rect', () => {
        let city = new CityLayout({ height: 0, width: 0 });

        city.append({ height: 1, width: 1, x: 0, y: 0 });

        expect(city.getLayouts().length === 1).to.be.true
    });

    it('cant add a colliding rect', () => {

        let city = new CityLayout({ height: 0, width: 0 });

        city.append({ height: 1, width: 1, x: 0, y: 0 });
        city.append({ height: 1, width: 1, x: 0, y: 0 });

        expect(city.getLayouts().length === 1).to.be.true
    });
    it('cant add a colliding rect', () => {

        let city = new CityLayout({ height: 0, width: 0 });

        city.append({ height: 1, width: 1, x: 0, y: 0 });
        city.append({ height: 2, width: 2, x: -1, y: -1 });

        expect(city.getLayouts().length === 1).to.be.true
    });

    it('update the height and with of the layout', () => {
        let city = new CityLayout({ height: 0, width: 0 });
        city.append({ height: 1, width: 1, x: 0, y: 0 });
        expect(city.size.height === 1).to.be.true;
        expect(city.size.width === 1).to.be.true;
    });

    it('can auto move rect to a better spot', () => {
        let city = new CityLayout({ height: 0, width: 0, maxheight: 10, maxwidth: 10 });
        city.append({ height: 1, width: 1, x: 0, y: 0 });
        city.insert({ height: 1, width: 1, x: 0, y: 0 });
        expect(city.getLayouts().length === 2).to.be.true;
    });

    it('can auto move rect to a better spot, if possibled or else it cries', () => {
        let city = new CityLayout({ height: 0, width: 0, maxheight: 10, maxwidth: 10 });
        city.append({ height: 1, width: 1, x: 0, y: 0 });
        let shouldfail = false;
        try {
            city.insert({ height: 11, width: 1, x: 0, y: 0 });
        } catch (e) { shouldfail = true; }
        expect(city.getLayouts().length === 1).to.be.true;
        expect(shouldfail).to.be.true;
    });
    it('can buildCityLayout', () => {
        let layout = CityLayout.buildCityLayout([{ h: 1, w: 1, x: 0, y: 0 }, { h: 1, w: 1, x: 0, y: 0 }, { h: 1, w: 1, x: 0, y: 0 }, { h: 1, w: 1, x: 0, y: 0 }, { h: 1, w: 1, x: 0, y: 0 }])
        expect(layout).to.not.be.null;
    });
    it('can use shelf pack', () => {
        // Initialize the sprite with a width and height..
        var sprite = new ShelfPack(64, 64);

        // Pack bins one at a time..
        for (var i = 0; i < 5; i++) {
            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            var bin = sprite.packOne(32, 32);
            console.log(bin || 'out of space');
        }

    })
});
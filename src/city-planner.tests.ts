import { expect } from 'chai';
import CityPlanner from './city-planner';
import { CityPlannerOptions } from './city-planner';
import { SectionResults } from './section-results';
import ShelfPack, { Bin } from './shelfpack';
describe('City Planner', function () {
    it('can be initialized', function () {
        let cityPlanner = new CityPlanner({
            tile_x: 1,
            tile_y: 1
        });
        expect(!!cityPlanner).to.be.true;
    });

    it('can read a redquick output', () => {
        let results = CityPlanner.loadSectionsFromFile('./vis_out.json');
        expect(!!results).to.be.true;
    });

    it('can can get the toplevel sections', () => {
        let defaultCityPlanner = CreateCityPlanner();
        expect(!!defaultCityPlanner).to.be.true;
    });

    it('can update the get the sections for the root section result', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        expect(!!sectionRoots && !!sectionRoots.length).to.be.true

    });

    it('can get sectioned percentage requirements', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        if (sectionRoots) {
            let sectionPercentage = cityPlanner.getWholeSectionPercentage(sectionRoots[0])
            expect(!!sectionPercentage).to.be.true;
        }
        else {
            throw new Error('sectionRoots should exist')
        }
    })

    it('can get section level distribution', () => {
        let cityPlanner = CreateCityPlanner();
        let distributions = cityPlanner.getSectionLevelDistribution();
        let total = 0;
        Object.values(distributions).forEach((v: number) => {
            total += v;
        })
        expect(!!distributions).to.be.true;
    });

    it('can get the smallest area', () => {
        let cityPlanner = CreateCityPlanner();
        let distributions: { key: string | null, value: number } = cityPlanner.getSmallestDistribution();

        expect(!!distributions).to.be.true;
    });

    it('can get the number of required sections', () => {
        let cityPlanner = CreateCityPlanner();
        let number = cityPlanner.getNumberOfRequiredSections();
        expect(!!number).to.be.true;
    });
    it('can get w, l of city', () => {
        let cityPlanner = CreateCityPlanner();
        let number = cityPlanner.getCityWidthLength();
        expect(!!number).to.be.true;
    });

    it('can get section ids', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let ids = cityPlanner.getSectionIds(section);
        expect(!!ids).to.be.true;
        expect(!!ids.length).to.be.true
    })

    it('can get section percentage', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let localPlans = cityPlanner.getLocalPlans(section, cityPlanner)
        expect(!!localPlans).to.be.true;
    });

    it('can get single section percentage', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let ids = cityPlanner.getSectionIds(section);
        let singleSectionPercentage = cityPlanner.getSectionPercentage(section, ids[0])
        expect(!!singleSectionPercentage).to.be.true;
    });
    it('can get local sections', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let ids = cityPlanner.getSectionIds(section);
        let localSections = cityPlanner.getLocalSectionIds(ids[0])
        expect(!!localSections.length).to.be.true;
    });
    it('can get local section distributions', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let ids = cityPlanner.getSectionIds(section);
        let localSections = cityPlanner.getLocalSectionDistribution(ids[0])
        expect(!!localSections).to.be.true;
    });

    it('can get section distribution', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let singleSectionPercentage = cityPlanner.getSectionDistribution(section)
        expect(!!singleSectionPercentage).to.be.true;
    });

    it('can get section distribution', () => {
        let cityPlanner = CreateCityPlanner();
        let sectionRoots = cityPlanner.getSectionRoots();
        let section = sectionRoots[0];
        let sectionDistbiuteion = cityPlanner.getSectionDistribution(section);

        expect(!!sectionDistbiuteion).to.be.true;
    });

    it('can get section level layout', () => {
        let cityPlanner = CreateCityPlanner();
        let { length, width } = cityPlanner.getCityWidthLength();
        cityPlanner.getCityLevelBin({ length, width });
        // Initialize the sprite with a width and height..
        var sprite = new ShelfPack(width, length, { autoResize: true });

        let distributions = cityPlanner.getSectionLevelDistribution();
        // Pack bins one at a time..
        let bin: Bin | null = null;
        Object.keys(distributions).forEach((key: string) => {
            let sw = Math.ceil(Math.sqrt(distributions[key]) * width);
            let sl = Math.ceil(Math.sqrt(distributions[key]) * length);
            bin = sprite.packOne(sw, sl, key);
        });

        expect(bin).to.not.be.null;

    });

    it('can get Section Level Bin', () => {
        let cityPlanner = CreateCityPlanner();
        let { length, width } = cityPlanner.getCityWidthLength();
        let res = cityPlanner.getCityLevelBin({ length, width });
        expect(res).to.not.be.null;
    })

    it('can build city plans', () => {
        let cityPlanner = CreateCityPlanner();
        let res = cityPlanner.buildCityPlan({ length: 200000, width: 200000 });
        expect(res).to.not.be.null;
    })

    function CreateCityPlanner(): CityPlanner {
        let sectionResults = CityPlanner.loadSectionsFromFile('./vis_out.json');

        let cityPlanner = new CityPlanner({
            tile_x: 1,
            tile_y: 1
        });
        cityPlanner.setRootSectionResults(sectionResults);
        return cityPlanner;
    }
});
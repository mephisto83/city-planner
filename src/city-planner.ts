import { countReset } from 'console';
import fs from 'fs';
import { builtinModules } from 'module';
import { Sectioned, SectionInfo, SectionResults } from "./section-results";
import ShelfPack, { Bin } from './shelfpack';

export interface Distribution {
    [id: string]: number
}
export interface CityPlan extends Bin {
    inner?: CityPlan[]
}
export interface CityPlannerOptions {
    tile_x: number,
    tile_y: number,
}
export default class CityPlanner {
    buildCityPlan(arg0: { length: number; width: number; }): CityPlan[] {
        let { length, width } = arg0;
        let bins: Bin[] = this.getCityLevelBin({ length, width });
        let cityPlans: CityPlan[] = [];
        bins.forEach((bin: Bin) => {
            let subbins = this.getSectionLevelBin({ x: bin.x, y: bin.y, width: bin.w, length: bin.h, id: bin.id });
            cityPlans.push({
                ...bin,
                inner: subbins.map((innerbin: Bin) => {
                    return innerbin;
                })
            })
        });

        return cityPlans;
    }
    getSectionLevelBin(arg0: { x: number, y: number, id: string | number, length: number; width: number; }): CityPlan[] {
        let { length, width } = arg0;
        var sprite = new ShelfPack(width, length, { autoResize: true });
        let distributions = this.getSectionDistribution(`${arg0.id}`);
        // Pack bins one at a time..
        let bins: CityPlan[] = [];
        Object.keys(distributions).forEach((key: string) => {
            let sw = Math.ceil(Math.sqrt(distributions[key]) * width);
            let sl = Math.ceil(Math.sqrt(distributions[key]) * length);

            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            let bin = sprite.packOne(sw, sl, key);
            if (bin) {
                bins.push({
                    ...bin,
                    inner: this.getLocalSectionLevelBin({ ...arg0, id: key })
                })
            }
        });
        return bins;
    }
    getLocalSectionLevelBin(arg0: { x: number, y: number, id: string | number, length: number; width: number; }): CityPlan[] {
        let { length, width } = arg0;
        var sprite = new ShelfPack(width, length, { autoResize: true });
        let distributions = this.getLocalSectionDistribution(`${arg0.id}`);
        // Pack bins one at a time..
        let bins: CityPlan[] = [];
        Object.keys(distributions).forEach((key: string) => {
            let sw = Math.ceil(Math.sqrt(distributions[key]) * width);
            let sl = Math.ceil(Math.sqrt(distributions[key]) * length);

            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            let bin = sprite.packOne(sw, sl, key);
            if (bin) {
                bins.push({
                    ...bin,
                    inner: this.getLocalSectionLevelBin({ ...arg0, id: key })
                })
            }
        });
        return bins;
    }
    options: CityPlannerOptions;
    root: SectionResults | null;
    constructor(cityPlannerOptions: CityPlannerOptions) {
        this.options = cityPlannerOptions;
        this.root = null;
    }
    static loadSectionsFromFile(file: string): SectionResults {
        let fileContents = fs.readFileSync(file, 'utf-8');
        let result: SectionResults = JSON.parse(fileContents);
        return result;
    }
    setRootSectionResults(sectionResults: SectionResults): void {
        this.root = sectionResults;
    }
    getWholeSectionPercentage(section: string): number {
        let total = 0;
        let overall = 0;
        if (this.root) {
            if (this.root.sectioned) {
                let list = Object.values(this.root.sectioned);
                list.forEach((item: SectionInfo) => {
                    if (item && item.sectionType == section) {
                        total++;
                        total += item.count || 0;
                    }
                    overall++;
                })
            }
        }
        return total / overall;
    }
    getSectionPercentage(section: string, id: string): number {
        let total = 0;
        let overall = 0;
        if (this.root) {
            if (this.root.sectioned) {
                let list = Object.values(this.root.sectioned);
                list.forEach((item: SectionInfo) => {
                    if (item && item.sectionType == section) {
                        if (item.id === id) {
                            total++;
                            total += item.count || 0;
                        }
                        overall++;
                        overall += item.count || 0;
                    }
                })
            }
        }
        return total / overall;
    }

    getLocalSectionPercentage(parent: string, id: string): number {
        let total = 1;
        let overall = 1;
        if (this.root) {
            if (this.root.sectioned) {
                let list = Object.values(this.root.sectioned);
                list.forEach((item: SectionInfo) => {
                    if (item && item.parent === parent) {
                        if (item.id) {
                            total++;
                            total += item.count || 0;
                        }
                        overall += item.count || 0;
                        overall++;
                    }
                })
            }
        }
        return total / overall;
    }
    getSectionIds(section: string): string[] {
        let result: string[] = [];
        if (this.root) {
            if (this.root.sectioned) {
                let list = Object.values(this.root.sectioned);
                list.forEach((item: SectionInfo) => {
                    if (item && item.sectionType == section) {
                        result.push(item.id);
                    }
                })
            }
        }
        return result;
    }
    getSmallestDistribution(): { key: string | null, value: number } {
        let distribution = this.getSectionLevelDistribution();
        let min: string | null = null;
        Object.keys(distribution).map((v: string) => {
            if (min && distribution[min] > distribution[v]) {
                min = v;
            }
            else if (!min) {
                min = v;
            }
        });

        return {
            key: min,
            value: distribution[min || '']
        }
    }
    getCityWidthLength(): { width: number, length: number } {
        let requiredSectionCount = this.getNumberOfRequiredSections();

        let count = Math.sqrt(requiredSectionCount);
        return {
            width: Math.ceil(count),
            length: Math.ceil(count)
        }
    }
    getCityLevelBin({ width, length }: { width: number, length: number }): Bin[] {
        let res: Bin[] = [];
        var sprite = new ShelfPack(width, length, { autoResize: true });
        let distributions = this.getSectionLevelDistribution();
        // Pack bins one at a time..
        let bin: Bin | null = null;
        Object.keys(distributions).forEach((key: string) => {
            let sw = Math.ceil(Math.sqrt(distributions[key]) * width);
            let sl = Math.ceil(Math.sqrt(distributions[key]) * length);

            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            bin = sprite.packOne(sw, sl, key);
            if (bin) {
                res.push(bin);
            }
            console.log(bin || 'out of space');
        });

        return res;
    }
    getNumberOfRequiredSections(): number {
        let percentage = this.getSmallestDistribution();
        if (percentage && percentage.value)
            return Math.ceil(1 / percentage.value)
        return -1;
    }
    getLocalSectionIds(parent: string): string[] {
        let result: string[] = [];
        if (this.root) {
            if (this.root.sectioned) {
                let list = Object.values(this.root.sectioned);
                list.forEach((item: SectionInfo) => {
                    if (item && item.parent == parent) {
                        result.push(item.id);
                    }
                })
            }
        }
        return result;
    }

    getLocalPlans(section: string, parentPlan: CityPlanner): CityPlanner {
        let localCityPlanner = new CityPlanner({
            tile_y: 1,
            tile_x: 1
        });
        let sections = this.getSectionIds(section);

        return localCityPlanner;
    }
    getLocalSectionDistribution(parent: string) {
        let sections = this.getLocalSectionIds(parent);
        let distribution: Distribution = {};
        let ids = this.getLocalSectionIds(parent);
        distribution[parent] = 1;
        sections.forEach((section: string) => {
            distribution[section] = this.getLocalSectionPercentage(parent, section);
        });

        let total = 0;
        Object.values(distribution).map(v => { total = total + v })
        Object.keys(distribution).map((v: string) => {
            distribution[v] = distribution[v] / total;
        })

        return distribution;
    }
    getSectionLevelDistribution(): Distribution {
        let sections = this.getSectionRoots();
        let distribution: Distribution = {};

        sections.forEach((section: string) => {
            distribution[section] = this.getWholeSectionPercentage(section);
        });

        let total = 0;
        Object.values(distribution).map(v => { total = total + v })
        Object.keys(distribution).map((v: string) => {
            distribution[v] = distribution[v] / total;
        })

        return distribution;
    }
    getSectionDistribution(sectionId: string): Distribution {
        let sections = this.getSectionIds(sectionId);
        let distribution: Distribution = {};

        sections.forEach((section: string) => {
            distribution[section] = this.getSectionPercentage(sectionId, section);
        });

        let total = 0;
        Object.values(distribution).map(v => { total = total + v })
        Object.keys(distribution).map((v: string) => {
            distribution[v] = distribution[v] / total;
        })

        return distribution;
    }

    getChildrenCount(parent: string, sectioned: SectionInfo[]): number {
        let count = 0;
        sectioned.forEach((item: SectionInfo) => {
            if (item && item.parent === parent) {
                count++;
                count += this.getChildrenCount(item.id, sectioned);
            }
        });

        return count;
    }

    getSectionRoots(): string[] {
        let result: string[] = [];
        if (this.root) {
            Object.entries(this.root.sectioned).map((it: any[]) => {
                let key = it[0];
                let value: SectionInfo = it[1];
                if (value && value.sectionType) {
                    if (!result.some(v => v === value.sectionType))
                        result.push(value.sectionType)
                }
            })
        }
        return result;
    }
}
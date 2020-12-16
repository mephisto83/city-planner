import { countReset } from 'console';
import fs from 'fs';
import { builtinModules } from 'module';
import { Z_FILTERED } from 'zlib';
import { Sectioned, SectionInfo, SectionResults } from "./section-results";
import ShelfPack, { Bin } from './shelfpack';
// let Voronoi = require('@mephistowa/voronoi/dist');
import Voronoi from '@mephistowa/voronoi/dist/voronoi';
import { Sites } from '@mephistowa/voronoi/dist/sites';
import Diagram from '@mephistowa/voronoi/dist/diagram';
import Cell from '@mephistowa/voronoi/dist/cell';
import Edge from '@mephistowa/voronoi/dist/edge';
import HalfEdge from '@mephistowa/voronoi/dist/halfedge';
import Vertex from '@mephistowa/voronoi/dist/vertex';
const cliProgress = require('cli-progress');
const _colors = require('colors');
const CHILD_LESS = 'CHILD_LESS';
export interface Distribution {
    [id: string]: number
}
export interface CityPlan extends Bin {
    inner?: CityPlan[]
    voronoi?: Voronoi
}
export interface CityPlannerOptions {
    tile_x: number,
    tile_y: number,
}
export interface VoronoiPlan {
    voronois: { [key: string]: { id: string, diagram: Diagram } },
    nodes: { [key: string]: {} }
}

export function GUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;

        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export default class CityPlanner {
    veronoiPlan?: VoronoiPlan;
    buildCityPlan(arg0: { length: number; width: number; }): VoronoiPlan {

        // create new progress bar
        // create new container
        const multibar = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true

        }, cliProgress.Presets.shades_grey);
        this._progresBar = multibar;

        let { length, width } = arg0;
        let bins: Bin[] = this.getCityLevelBin({ length, width });
        let cityPlans: CityPlan[] = [];
        const b1 = this._progresBar.create(bins.length, 0);
        this.veronoiPlan = {
            voronois: {},
            nodes: {}
        }
        bins.forEach((bin: Bin, index: number) => {

            let subbins = this.getSectionLevelBin({ x: bin.x, y: bin.y, width: bin.w, length: bin.h, id: bin.id });
            cityPlans.push({
                ...bin,
                inner: subbins.map((innerbin: Bin) => {
                    return innerbin;
                })
            })
            b1.increment({ filename: bin.id });
        });
        multibar.stop();
        return this.veronoiPlan;
    }
    getSectionLevelBin(arg0: { x: number, y: number, id: string | number, length: number; width: number; }): CityPlan[] {
        let { length, width } = arg0;
        var sprite = new ShelfPack(width, length, { autoResize: false });
        let distributions = this.getSectionDistribution(`${arg0.id}`);
        // Pack bins one at a time..
        let bins: CityPlan[] = [];
        let b1: any = null;
        let dist = Object.keys(distributions);
        if (this._progresBar) {
            b1 = this._progresBar.create(dist.length, 0);
        }
        dist.forEach((key: string, index: number) => {
            let sw = 0;
            let sl = 0;
            if (dist.length % 2) {
                sw = distributions[key] * width;
                sl = arg0.length;
            }
            else {

                sl = distributions[key] * length;
                sw = arg0.width;
            }
            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            let bin = sprite.packOne(sw, sl, key);
            if (bin) {
                bins.push({
                    ...bin,
                    inner: this.getLocalSectionLevelBin({
                        ...arg0,
                        x: bin.x + arg0.x,
                        y: bin.y + arg0.y, id: key, width: bin.w, length: bin.h
                    })
                })
            }
            if (b1)
                b1.increment({ filename: key });
        });
        if (this._progresBar) {
            this._progresBar.remove(b1);
        }
        return bins;
    }
    counting: number = 0;
    logCount() {
        this.counting++;
    }

    createVoronoi(sections: { id: string, count: number }[], bin: Bin): any {
        let voronoi = new Voronoi();
        var bbox = { xl: 0, xr: bin.w, yt: 0, yb: bin.h }; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
        let { width, height } = this.getRequiredSites(sections.length);

        var sites: any = [];
        let width_step = bin.w / width;
        let height_step = bin.h / height;
        let sectionindex: number = 0;
        for (let w = 0; w < width; w++) {
            for (let h = 0; h < height; h++) {
                let site: any = {
                    x: (w * width_step) + (width_step / 2),
                    y: (h * height_step) + (height_step / 2),
                    voronoiId: (w - 1) * width + h,
                    w,
                    h
                };
                sites.push(site)
                if (!(w > 0 && h > 0 && w < (width - 1) && h < (height - 1))) {
                    if (sections[sectionindex]) {
                        site.section = sections[sectionindex].id;
                        site.id = GUID();
                        sectionindex++;
                    }
                }
            }
        }

        let id = GUID();
        var diagram = voronoi.compute(sites, bbox);
        if (this.veronoiPlan && this.veronoiPlan.voronois) {
            diagram.cells?.forEach((cell: Cell) => {
                let halfEdges: HalfEdge[] = [];
                let edgesLeft = [...cell.halfedges.map((v: HalfEdge, index: number) => {
                    (v as any).id = index;
                    return v;
                })];
                while (edgesLeft.length) {
                    if (halfEdges.length) {
                        let lastEdge = halfEdges[halfEdges.length - 1];
                        let nextEdge: HalfEdge | undefined = edgesLeft.find((e: HalfEdge) => {
                            let startPoint: Vertex = e.getStartpoint();
                            let lastEndPoint: Vertex = lastEdge.getEndpoint();

                            return lastEndPoint.x === startPoint.x &&
                                lastEndPoint.y === startPoint.y;
                        });

                        if (nextEdge) {
                            let nextEdgeId = (nextEdge as any).id;
                            edgesLeft = edgesLeft.filter((v: any) => v.id !== nextEdgeId)
                            halfEdges.push(nextEdge);
                        }
                        else {
                            throw new Error('no next edge found')
                        }
                    }
                    else {
                        let first = edgesLeft.pop()
                        if (first) {
                            halfEdges.push(first);
                        }
                    }
                    cell.halfedges.forEach((halfEdge: HalfEdge) => {
                        (halfEdge as any).startPoint = halfEdge.getStartpoint();
                        (halfEdge as any).endPoint = halfEdge.getEndpoint();

                    });
                }
                (cell as any).sortedHalfEdges = halfEdges;
            });
            this.veronoiPlan.voronois[id] = { id, diagram };

            this.veronoiPlan.nodes = this.veronoiPlan.nodes || {};
            sections.forEach((section: { id: string, count: number }, index: number) => {
                if (this.root) {
                    let sectionInfo: SectionInfo = this.root.sectioned[section.id];
                    if (sectionInfo) {
                        if (this.veronoiPlan) {
                            this.veronoiPlan.nodes[sectionInfo.id] = {
                                voronoi: id,
                                sectionInfo,
                                relative: {
                                    x: bin.x,
                                    y: bin.y
                                }
                            }
                        }
                    }
                }
            });
        }
        return {
            diagram,
            relative: {
                x: bin.x,
                y: bin.y
            }
        };
    }

    getRequiredSites(num: number) {
        let width = 1;
        let height = 1;
        let n = height * width - ((height - 2) * (width - 2))
        while (n <= num) {
            if (width < height + 2) {
                width++;
            }
            else {
                height++;
            }
            n = height * width - ((height - 2) * (width - 2))
        }
        return { width, height };
    }
    getLocalSectionLevelBin(arg0: { x: number, y: number, id: string | number, length: number; width: number; }): CityPlan[] {
        let { length, width } = arg0;
        var sprite = new ShelfPack(width, length, { autoResize: false });
        let sectionsWithOutChildren = this.getChildrenWithoutChildren(`${arg0.id}`);

        let distributions = this.getLocalSectionDistribution(`${arg0.id}`, sectionsWithOutChildren);
        // Pack bins one at a time..
        let bins: CityPlan[] = [];
        let b1: any = null;
        let dist = Object.keys(distributions).filter(v => v !== arg0.id);
        if (this._progresBar) {
            b1 = this._progresBar.create(dist.length, 0);
        }

        dist.forEach((key: string, index: number) => {
            let sw = 0;
            let sl = 0;
            if (dist.length % 2) {
                sw = distributions[key] * width;
                sl = arg0.length;
            }
            else {

                sl = distributions[key] * length;
                sw = arg0.width;
            }

            // packOne() accepts parameters: `width`, `height`, `id`
            // and returns a single allocated Bin object..
            // `id` is optional - if you skip it, shelf-pack will make up a number for you..
            // (Protip: numeric ids are much faster than string ids)

            let bin = sprite.packOne(sw, sl, key);
            if (bin) {
                if (key === CHILD_LESS) {
                    bins.push({
                        ...bin,
                        x: bin.x + arg0.x,
                        y: bin.y + arg0.y,
                        voronoi: this.createVoronoi(sectionsWithOutChildren, {
                            ...bin,
                            x: bin.x + arg0.x,
                            y: bin.y + arg0.y,
                        })
                    })
                }
                else {
                    bins.push({
                        ...bin,
                        x: bin.x + arg0.x,
                        y: bin.y + arg0.y,
                        inner: this.getLocalSectionLevelBin({
                            ...arg0,
                            x: bin.x + arg0.x,
                            y: bin.y + arg0.y,
                            id: key, width: bin.w, length: bin.h
                        })
                    })
                }
            }
            if (b1) {
                b1.increment({ filename: key });
            }
        });
        if (this._progresBar) {
            this._progresBar.remove(b1);
        }
        return bins;
    }
    options: CityPlannerOptions;
    root: SectionResults | null;
    _progresBar: any;
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

    getLocalSectionPercentage(parent: string): number {
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
        var sprite = new ShelfPack(width, length, { autoResize: false });
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
    getCounts(ids: string[]): { id: string, count: number }[] {
        let res: { id: string, count: number }[] = [];
        ids.forEach((id: string) => {
            if (this.root && this.root.sectioned[id]) {
                res.push({ id, count: this.root.sectioned[id].count })
            }
        });
        return res;
    }
    getLocalSectionDistribution(parent: string, sectionsWithOutChildren: { id: string }[] = []) {
        let sections = this.getLocalSectionIds(parent);
        sections = sections.filter(v => !sectionsWithOutChildren.some((t) => {
            return v === t.id;
        }));
        let distribution: Distribution = {};
        let counts = this.getCounts(sections);
        let child_count = sectionsWithOutChildren.length;
        counts.forEach((count) => {
            child_count += count.count;
        })
        distribution[parent] = child_count ? 1 / child_count : 1;
        sections.forEach((section: string) => {
            distribution[section] = this.getLocalSectionPercentage(parent);
        });

        let total = 0;
        Object.values(distribution).map(v => { total = total + v })
        Object.keys(distribution).map((v: string) => {
            distribution[v] = distribution[v] / total;
        })
        if (sectionsWithOutChildren.length) {
            distribution[CHILD_LESS] = sectionsWithOutChildren.length / child_count;
        }
        return distribution;
    }
    getChildrenWithoutChildren(parent: string) {
        let sections = this.getLocalSectionIds(parent);
        let res: { id: string, count: number }[] = [];
        sections.forEach((id: string) => {
            if (this.root && this.root.sectioned[id]) {
                if (!this.root.sectioned[id].count)
                    res.push({ id, count: this.root.sectioned[id].count })
            }
        });


        return res;
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
import Diagram from '@mephistowa/voronoi/dist/diagram';
import fs from 'fs';
import CityPlanner, { VoronoiPlan } from './city-planner';

function CreateCityPlanner(): CityPlanner {
    let sectionResults = CityPlanner.loadSectionsFromFile('./vis_out.json');

    let cityPlanner = new CityPlanner({
        tile_x: 1,
        tile_y: 1
    });
    cityPlanner.setRootSectionResults(sectionResults);
    return cityPlanner;
}

let cityPlanner = CreateCityPlanner();
let res: VoronoiPlan = cityPlanner.buildCityPlan({ length: 200000, width: 200000 });

let outstream = fs.createWriteStream('./voronoi.json');
let nodesoutstream = fs.createWriteStream('./nodes.json');

async function writeToStream(i: string, obj: any, outstream: fs.WriteStream): Promise<void> {
    let temp = JSON.stringify({ k: i, v: obj });
    await new Promise((resolve, fail) => {
        outstream.write(temp + '\n', 'utf8', (err: any) => {
            if (err) {
                console.error(err);
                fail(err);
            } else {
                resolve(true);
            }
        });
    });
}

async function writeVoronis(outstream: fs.WriteStream) {
    for (var i in res.voronois) {
        await writeToStream(i, res.voronois[i], outstream);
    }
}

async function writeNodes(outstream: fs.WriteStream) {
    for (var i in res.nodes) {
        await writeToStream(i, res.nodes[i], outstream);
    }
}


async function writeAll() {
    await writeVoronis(outstream);
    outstream.close();

    await writeNodes(nodesoutstream);
    nodesoutstream.close();
}

Promise.resolve().then(() => { return writeAll() });
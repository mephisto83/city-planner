let fs = require('fs');

let file = fs.readFileSync('./package.json', 'utf-8')

let jsonFile = JSON.parse(file)
let version = jsonFile.version;
let versionarray = version.split('.');
versionarray[2] = parseInt(versionarray[2]) + 1;
jsonFile.version = versionarray.join('.')

fs.writeFileSync('./package.json', JSON.stringify(jsonFile, null, 4), 'utf-8')

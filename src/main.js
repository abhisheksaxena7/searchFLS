'use strict'
const parseString = require('xml2js');
const colors = require('colors');
const fse = require('fs-extra');

let packageXML;
module.exports = config => {
  const work = createWork(config);
  treatPackages(work, config);
  return work;
};

const createWork = (config) => {
  const work = {
    config: config,
    warnings: [],
  }
  return work;
}

const treatPackages = (work, config) => {
  packageXML = fse.readFileSync(config.manifest).toString();
  console.log('Manifest file', packageXML);
  const customFieldIndex = packageXML.search('CustomField');
  // if (customFieldIndex !== -1) {
  //   returnCustomFieldsArray(packageXML);
  //   console.log(customFieldsArray.toString());
  //   return await this.verifyPermissionsInAdminProfile(profile);
  // }
}

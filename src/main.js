'use strict'
const xml2js = require('xml2js');
const colors = require('colors');
const fse = require('fs-extra');

let packageXML;
let customFieldsArray = [];

module.exports = config => {
  const work = createWork(config);
  verifyCustomFieldPermissions(work, config);
  return work;
};

const createWork = (config) => {
  const work = {
    config: config,
    warnings: [],
  }
  return work;
}

const verifyCustomFieldPermissions = (work, config) => {
  try {
    packageXML = fse.readFileSync(config.manifest).toString();
    // console.log('Manifest file', packageXML);
    const customFieldIndex = packageXML.search('CustomField');
    if (customFieldIndex !== -1) {
      returnCustomFieldsArray(packageXML);
      // console.log(customFieldsArray.toString());
      return verifyPermissionsInAdminProfile(config.profile);
    }
    return console.log(colors.yellow('Custom Fields are not part of the package.xml skipping execution'));
  } catch (error) {
    console.log(error.message);
    if (error.message.includes("ENOENT: no such file or directory")) {
      console.error(colors.red('Package is empty, skipping execution'));
    }
    throw error;
  }
}

/**
 * This method parses the package.xml as Javascript Object,
 * finds the customFields in it, puts them in an array and returns the array
 * @param {String} packageXML - The content of package.xml
 * @returns The array of CustomFields in the package.xml
 */
const returnCustomFieldsArray = (packageXML) => xml2js
  .parseString(packageXML, (err, packageXMLObj) => {
    customFieldsArray = packageXMLObj.Package.types.filter((element) => element.name[0] === 'CustomField')[0].members;
    return customFieldsArray;
  });

/**
* This method verifies if the customFields have permissions in the Admin profile
* @returns
*/
const verifyPermissionsInAdminProfile = (profile) => {
  const fieldsWithoutReadAccess = [];
  const adminProfile = fse.readFileSync(profile).toString();
  xml2js.parseString(adminProfile, (err, adminProfileObj) => {
    customFieldsArray.forEach((customField) => {
      const fieldPermissionBlock = adminProfileObj
        .Profile.fieldPermissions.find((obj) => obj.field[0] === customField);
      if (!fieldPermissionBlock || !fieldPermissionBlock.readable || fieldPermissionBlock.readable[0] === 'false') {
        fieldsWithoutReadAccess.push(customField);
      }
      return fieldsWithoutReadAccess;
    });
  });
  if (fieldsWithoutReadAccess.length > 0) {
    console.error(colors.red('The following fields do not have read permissions on the Admin profile. Update Admin profile to give them access.'));
    console.error(colors.red(fieldsWithoutReadAccess.toString()));
    return process.exit(1);
  }
  return console.log(colors.green('All customFields getting mentioned in this package have permission in the Admin profile.'));
};

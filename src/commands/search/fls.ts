/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { promises as fs } from 'fs';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { parseString } from 'xml2js';
import * as colors from 'colors';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('searchFLS', 'org');
let customFieldsArray: string[] = [];

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    manifest: flags.filepath({
      char: 'x',
      required: true,
      description: messages.getMessage('manifestFlagDescription'),
    }),
    profile: flags.filepath({
      char: 'p',
      required: true,
      description: messages.getMessage('profileFlagDescription'),
    }),
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const manifest = this.flags.manifest as string;
    const profile = this.flags.profile as string;
    try {
      const packageXML = (await fs.readFile(manifest)).toString();
      // this.ux.log('Manifest file', packageXML);
      const customFieldIndex = packageXML.search('CustomField');
      // If Custom fields are present in the package.xml
      if (customFieldIndex !== -1) {
        this.returnCustomFieldsArray(packageXML);
        this.ux.log(customFieldsArray.toString());
        return await this.verifyPermissionsInAdminProfile(profile);
      }
      return this.ux.warn(messages.getMessage('noCustomField'));
    } catch (error) {
      if (error.message === messages.getMessage('pkgNotFound')) return this.ux.warn('Package is empty, skipping execution');
      throw error;
    }

    // Return an object to be displayed with --json
    // return { orgId: this.org.getOrgId(), outputString };
    return {};
  }

  /**
   * This method parses the package.xml as Javascript Object,
   * finds the customFields in it, puts them in an array and returns the array
   *
   * @param {String} packageXML - The content of package.xml
   * @returns The array of CustomFields in the package.xml
   */
  protected returnCustomFieldsArray = (packageXML: string): string[] => {
    return parseString(packageXML, (err, packageXMLObj: string) => {
      customFieldsArray = packageXMLObj.Package.types.filter(
        (element: { name: string[] }) => element.name[0] === 'CustomField'
      )[0].members as string[];
      return customFieldsArray;
    }) as string[];
    return customFieldsArray;
  };

  protected verifyPermissionsInAdminProfile = async (profile: string): Promise<void> => {
    const fieldsWithoutReadAccess = [];
    const adminProfile = (await fs.readFile(profile)).toString();
    parseString(adminProfile, (err, adminProfileObj: string) => {
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
      throw new SfdxError(messages.getMessage('NoFLSFound', [fieldsWithoutReadAccess.toString()]));
    }
    return this.ux.log(
      colors.green('All customFields getting mentioned in this package have permission in the Admin profile.')
    );
  };
}

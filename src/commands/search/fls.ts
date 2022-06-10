/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fls from '../../main';
// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('searchFLS', 'org');
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
    const output = {
      error: null,
      success: true,
      warnings: [],
    }
    try {
      const jobResult = fls({ manifest, profile });
      output.warnings = jobResult?.warnings?.map(warning => warning.message)
    } catch (err) {
      output.success = false
      output.error = err.message
      process.exitCode = 1
    }

    this.ux.log(JSON.stringify(output, null, 2))
    return null
  }
}

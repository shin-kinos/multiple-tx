/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * 2023/12/24
 * This source code is a modified version of https://github.com/hyperledger/fabric-samples/blob/main/test-application/javascript/AppUtil.js
 * Modified by Shibtaro Kinoshita (shintaro.kinoshita@cranfield.ac.uk)
 * Deleted the const variable 'ccpPath'
 * Defined new const variables 'ccpPath1' and 'ccpPath2' (on line 16 and 17, respectively)
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// !!! SET YOUR 'connection-org1.json' PATH TO HERE !!!
const ccpPath1 = '/Users/shintarokinoshita/Desktop/hyperledger_sandbox/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
const ccpPath2 = '/Users/shintarokinoshita/Desktop/hyperledger_sandbox/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json';
// !!! SET YOUR 'connection-org2.json' PATH TO HERE !!!

const fs = require('fs');

exports.buildCCPOrg1 = () => {
	// load the common connection configuration file
	const fileExists = fs.existsSync(ccpPath1);
	if (!fileExists) {
		throw new Error(`no such file or directory: ${ccpPath1}`);
	}
	const contents = fs.readFileSync(ccpPath1, 'utf8');

	// build a JSON object from the file contents
	const ccp = JSON.parse(contents);

	console.log(`Loaded the network configuration located at ${ccpPath1}`);
	return ccp;
};

exports.buildCCPOrg2 = () => {
	// load the common connection configuration file
	const fileExists = fs.existsSync(ccpPath2);
	if (!fileExists) {
		throw new Error(`no such file or directory: ${ccpPath2}`);
	}
	const contents = fs.readFileSync(ccpPath2, 'utf8');

	// build a JSON object from the file contents
	const ccp = JSON.parse(contents);

	console.log(`Loaded the network configuration located at ${ccpPath2}`);
	return ccp;
};

exports.buildWallet = async (Wallets, walletPath) => {
	// Create a new  wallet : Note that wallet is for managing identities.
	let wallet;
	if (walletPath) {
		wallet = await Wallets.newFileSystemWallet(walletPath);
		console.log(`Built a file system wallet at ${walletPath}`);
	} else {
		wallet = await Wallets.newInMemoryWallet();
		console.log('Built an in memory wallet');
	}

	return wallet;
};

exports.prettyJSONString = (inputString) => {
	if (inputString) {
		return JSON.stringify(JSON.parse(inputString), null, 2);
	}
	else {
		return inputString;
	}
}

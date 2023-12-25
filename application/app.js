
/*
 *    Copyright 2023 Shintaro Kinoshita
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
*/

'use strict';

const { Gateway, Wallets } = require( 'fabric-network' );
const FabricCAServices = require( 'fabric-ca-client' );

const path = require( 'path' );

const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require( './utils/CAUtil.js' );
const { buildCCPOrg1, buildWallet } = require( './utils/AppUtil.js' );

const CHANNEL_NAME   = process.env.CHANNEL_NAME   || 'mychannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'branch-tx-demo';

const MSP_ORG_1     = 'Org1MSP';
const WALLET_PATH   = path.join( __dirname, 'wallet' );
const ORG_1_USER_ID = 'testAppUser';

// Variables for creating an asset ID as string
const ASSET_ID_SOURCE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ASSET_ID_LENGTH = 7;

// Function for creating asset ID by generating random
// string which is composed of 7 numbers and capital characters
function createAssetID() {
	let   asset_id      = '';
	const source_length = ASSET_ID_SOURCE.length;

	for ( let i = 0; i < ASSET_ID_LENGTH; i++ ) {
		const index = Math.floor( Math.random() * source_length );
		asset_id    = asset_id.concat( ASSET_ID_SOURCE.charAt( index ) );
	}

	return asset_id;
}

function prettyJSONString( inputString ) {
	return JSON.stringify( JSON.parse( inputString ), null, 2 );
}

// pre-requisites:
// - fabric-sample two organization test-network setup with two peers, ordering service,
//   and 2 certificate authorities
//         ===> from directory /fabric-samples/test-network
//         ./network.sh up createChannel -ca
// - Use any of the asset-transfer-basic chaincodes deployed on the channel "mychannel"
//   with the chaincode name of "basic". The following deploy command will package,
//   install, approve, and commit the javascript chaincode, all the actions it takes
//   to deploy a chaincode to a channel.
//         ===> from directory /fabric-samples/test-network
//         ./network.sh deployCC -ccn branch-tx-demo -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
// - Be sure that node.js is installed
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node -v
// - npm installed code dependencies
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         npm install
// - to run this test application
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node app.js

async function main() {

	try {
		// Build a connection profile
		const connection_profile = buildCCPOrg1();

		// Build an instance of the fabric ca services client
		const ca_client = buildCAClient(
			FabricCAServices,
			connection_profile,
			'ca.org1.example.com'
		);

		// Setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet( Wallets, WALLET_PATH );

		// Enroll the user as an admin, if required
		await enrollAdmin(
			ca_client,
			wallet,
			MSP_ORG_1
		);

		// Register and enroll the user
		await registerAndEnrollUser(
			ca_client,
			wallet,
			MSP_ORG_1,
			ORG_1_USER_ID,
			'org1.department1'
		);

		// Create a new gateway instance for interacting with the fabric network.
		const gateway = new Gateway();

		try {
			// Setup the gateway instance
			await gateway.connect( connection_profile, {
				wallet    : wallet,
				identity  : ORG_1_USER_ID,
				discovery : {
					enabled     : true,
					asLocalhost : true
				}
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork( CHANNEL_NAME );

			// Get the contract from the network.
			const contract = network.getContract( CHAINCODE_NAME );

			console.log( '\n' );

			// Initialise a set of asset data on the channel using the chaincode 'InitLedger' function
			// This demo will create 3 types of asset with different asset compositions and owners
			console.log( 'SUBMIT TRANSACTION: InitLedger, function creates several initial sets of assets on the ledger' );

			// Set timestamp
			var time_now = new Date();
			time_now = time_now.toISOString();
			await contract.submitTransaction( 'InitLedger', time_now );
			console.log( '===> RESULT: Initial assets settings committed!' );

			console.log( '\n' );

			// Check the registered initial assets with 'GetAllAssets'.
			console.log( 'EVALUATE TRANSACTION: GetAllAssets, function returns all the current assets on the ledger' );
			let result = await contract.evaluateTransaction( 'GetAllAssets' );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log('\n');

			// Read asset with ID 'N6ATOE3'
			console.log( 'EVALUATE TRANSACTION: ReadAsset, function returns an asset with a given assetID' );
			result = await contract.evaluateTransaction( 'ReadAsset', 'N6ATOE3' );
			console.log(`===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// Check if a specific asset ID exists in the wallet
			console.log( 'EVALUATE TRANSACTION: AssetExists, function returns "true" if an asset with given assetID exists' );
			result   = await contract.evaluateTransaction( 'AssetExists', 'N6ATOE3' );
			let flag = result.toString().toLowerCase()
			if ( flag === 'true' ) { console.log( '===> RESULT: Asset ID N6ATOE3 exists' );         }
			else                   { console.log( '===> RESULT: Asset ID N6ATOE3 does NOT exist' ); }

			console.log( '\n' );

			// Update asset 'N6ATOE3', change the Value to 350
			console.log('SUBMIT TRANSACTION: UpdateAsset "asset1", change the Value to 350');
			time_now = new Date();
			time_now = time_now.toISOString();
			await contract.submitTransaction( 'UpdateAsset',
				'N6ATOE3', // Asset ID: the owner is Freddie
				'asset1',  // Asset name
				'red',     // Colour
				'5',       // Size
				'350',     // Value
				time_now   // Timestamp
			);
			console.log( '===> RESULT: Update asset commited' );

			console.log( '\n' );

			// Get asset1 again to see if the update is successfully reflected
			console.log( 'EVALUATE TRANSACTION: ReadAsset, function returns an asset with a given assetID' );
			result = await contract.evaluateTransaction( 'ReadAsset', 'N6ATOE3' );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// Now transfer an asset into other owner!
			console.log( 'SUBMIT TRANSACTION: TransferAsset "asset1", change the owner to John' );

			// Create a new asset ID at the first place:
			// If the created new asset already exsists in the wallet, then re-generate it
			var new_asset_id = '';
			while( true ) {
				new_asset_id = createAssetID();
				const exists = await contract.evaluateTransaction( 'AssetExists', new_asset_id );
				if ( exists.toString().toLowerCase() === 'false' ) { break; }
			}

			// Update timestamp
			time_now = new Date();
			time_now = time_now.toISOString();

			// Now transfer the ownership!
			await contract.submitTransaction( 'TransferAsset',
				'N6ATOE3',    // Target asset ID: the owner is Freddie now
				new_asset_id, // New asset ID
				'John',       // New owner
				time_now      // Timestamp
			);
			console.log( '===> RESULT: Ownership transaction committed' );
			const asset_id_john = new_asset_id;

			console.log( '\n' );

			// Check if the transaction was successfully completed with a new asset_id
			console.log( 'EVALUATE TRANSACTION: ReadAsset, function returns an asset with a given assetID' );
			result = await contract.evaluateTransaction( 'ReadAsset', new_asset_id );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// Even though the ownership is transferred, Freddie still cat update his original asset
			// Now try updating 'N6ATOE3' again
			console.log( 'SUBMIT TRANSACTION: UpdateAsset "asset1", change the Size to 25' );

			// Update timestamp
			time_now = new Date();
			time_now = time_now.toISOString();

			await contract.submitTransaction( 'UpdateAsset',
				'N6ATOE3', // Asset ID: the owner is Freddie
				'asset1',  // Asset name
				'red',     // Colour
				'25',      // Size
				'350',     // Value
				time_now   // Timestamp
			);
			console.log( '===> RESULT: Update asset commited' );

			console.log( '\n' );

			console.log( 'EVALUATE TRANSACTION: ReadAsset, function returns an asset with a given assetID' );
			result = await contract.evaluateTransaction( 'ReadAsset', 'N6ATOE3' );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// Then, transfer the current asset to another new owner
			console.log( 'SUBMIT TRANSACTION: TransferAsset N6ATOE3, change the owner to Paul');

			// Create a new asset ID at the first place:
			// If the created new asset already exsists in the wallet, then re-generate it
			while( true ) {
				new_asset_id = createAssetID();
				const exists = await contract.evaluateTransaction( 'AssetExists', new_asset_id );
				if ( exists.toString().toLowerCase() === 'false' ) { break; }
			}

			// Update timestamp
			time_now = new Date();
			time_now = time_now.toISOString();

			// Now transfer the ownership!
			await contract.submitTransaction( 'TransferAsset',
				'N6ATOE3',    // Target asset ID: the owner is Freddie now
				new_asset_id, // New asset ID
				'Paul',       // New owner
				time_now      // Timestamp
			);
			console.log( '===> RESULT: Ownership transaction committed' );
			const asset_id_paul = new_asset_id;

			console.log( '\n' );

			console.log( 'EVALUATE TRANSACTION: ReadAsset, function returns an asset with a given assetID' );
			result = await contract.evaluateTransaction( 'ReadAsset', new_asset_id );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// GetAssetHistory returns transaction history of ONLY ONE asset in JSON format
			// The blocks throughout the transaction are sorted into new to old.
			console.log( 'EVALUATE TRANSACTION: GetAssetHistory, function returns an asset history with a given assetID' );
			result = await contract.evaluateTransaction( 'GetAssetHistory', 'N6ATOE3' );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// GetTxHistory returns transaction history of the whole asset throughout the owners
			// The blocks throughout the transaction are sorted into new to old.
			console.log( 'EVALUATE TRANSACTION: GetTxHistory, function returns an asset history with a given assetID' );
			result = await contract.evaluateTransaction( 'GetTxHistory', asset_id_john );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

			console.log( '\n' );

			// GetTxHistory returns transaction history of the whole asset throughout the owners
			// The blocks throughout the transaction are sorted into new to old.
			console.log( 'EVALUATE TRANSACTION: GetTxHistory, function returns an asset history with a given assetID' );
			result = await contract.evaluateTransaction( 'GetTxHistory', asset_id_paul );
			console.log( `===> RESULT: ${ prettyJSONString( result.toString() ) }` );

		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch ( error ) {
		console.error( `FAILED TO RUN THE APPLICATION: ${ error }` );
		process.exit( 1 );
	}
}

main();

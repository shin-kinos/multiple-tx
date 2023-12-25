
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

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const sha = require('sha256');

class AssetTransfer extends Contract {

	async InitLedger(ctx, time_now) {
		// Set example assets
		const assets = [
			{
				AssetID     : 'N6ATOE3', // Current asset ID
				PrevAssetID : '',        // Previous asset ID throughout transactions
				Owner       : 'Freddie',
				Name        : 'asset1',
				Colour      : 'red',
				Size        : '5',
				Value       : '300',
				TxID        : '', // Current transaction ID
				PrevTxID    : '', // Previous transaction ID
				Timestamp   : ''
			},
			{
				AssetID     : '2HZLO9R', // Current asset ID
				PrevAssetID : '',        // Previous asset ID throughout transactions
				Owner       : 'Brian',
				Name        : 'asset2',
				Colour      : 'blue',
				Size        : '10',
				Value       : '400',
				TxID        : '', // Current transaction ID
				PrevTxID    : '', // Previous transaction ID
				Timestamp   : ''
			},
			{
				AssetID     : 'TQ55HXI', // Current asset ID
				PrevAssetID : '',        // Previous asset ID throughout transactions
				Owner       : 'Roger',
				Name        : 'asset3',
				Colour      : 'green',
				Size        : '15',
				Value       : '500',
				TxID        : '', // Current transaction ID
				PrevTxID    : '', // Previous transaction ID
				Timestamp   : ''
			}
		];

		for (const asset of assets) {
			// Set current time as timestamp
			asset.Timestamp = time_now;

			// Set pseudo current transaction ID by using sha
			const txid = sha(JSON.stringify({time:time_now, asset:asset}));
			asset.TxID = txid;

			// Register one asset
			await ctx.stub.putState(asset.AssetID, Buffer.from(stringify(sortKeysRecursive(asset))));
		}
	}

	// CreateAsset issues a new asset to the world state with given details.
	async CreateAsset(
		ctx,
		asset_id,
		owner,
		name,
		colour,
		size,
		value,
		time_now
	) {
		const asset = {
			AssetID   : asset_id,
			Owner     : owner,
			Name      : name,
			Colour    : colour,
			Size      : size,
			Value     : value,
			TxID      : '', // Current transaction ID
			PrevTxID  : '', // previous transaction ID
			Timestamp : time_now
		};

		// Set pseudo current transaction ID by using sha
		const txid = sha(JSON.stringify({time:time_now, asset:asset}));
		asset.TxID = txid;

		// Register a new asset
		await (ctx.stub).putState(asset_id, Buffer.from(stringify(sortKeysRecursive(asset))));

		return JSON.stringify(asset);
	}

	// ReadAsset returns the asset stored in the world state with given id.
	async ReadAsset( ctx, asset_id ) {
		// Get the asset from chaincode state
		const asset_json = await ( ctx.stub ).getState( asset_id );
		if ( !asset_json || asset_json.length === 0 ) { throw new Error( `The asset ${ asset_id } does not exist` ); }

		return asset_json.toString();
	}

	// AssetExists returns true when asset with given ID exists in world state.
	async AssetExists(ctx, asset_id) {
		var exists;

		const asset_json = await (ctx.stub).getState(asset_id);
		if (!asset_json || asset_json.length === 0) {
			console.info(`The asset ${asset_id} does not exists`);
			exists = false;
		} else {
			console.info(`The asset ${asset_id} already exists`);
			exists = true;
		}

		return exists
	}

	// UpdateAsset updates an existing asset in the world state with provided parameters.
	async UpdateAsset(
		ctx,
		asset_id,
		name,
		colour,
		size,
		value,
		time_now
	) {
		// Check if the asset ID exists
		const exists = await this.AssetExists(ctx, asset_id);
		if (!exists) {throw new Error(`The asset ${asset_id} does not exist`);}
		
		// Get asset with given asset ID
		const asset_str = await this.ReadAsset(ctx, asset_id);

		// Check if the asset ID exisits
		//if (!asset_str || asset_str.length === 0) {throw new Error(`The asset ${asset_id} does not exist`);}

		// Change into JSON format
		var asset = JSON.parse(asset_str);

		// Overwriting original asset with new asset
		asset.Name      = name;
		asset.Colour    = colour;
		asset.Size      = size;
		asset.Value     = value;
		asset.Timestamp = time_now;

		// Update current and previous asset ID.
		asset.PrevTxID = asset.TxID;
		asset.TxID     = (ctx.stub).getTxID();

		// Update asset
		await (ctx.stub).putState(asset_id, Buffer.from(stringify(sortKeysRecursive(asset))));
	}

	// DeleteAsset deletes an given asset from the world state.
	async DeleteAsset(ctx, asset_id) {
		const exists = await this.AssetExists(ctx, asset_id);
		if (!exists) {throw new Error(`The asset ${asset_id} does not exist`);}

		return ctx.stub.deleteState(asset_id);
	}

	// TransferAsset updates the owner field of asset with given id in the world state.
	async TransferAsset(
		ctx,
		asset_id,     // Target asset ID
		new_asset_id, // New asset ID for ownership transaction
		new_owner,    // Name of new organisation
		time_now      // Timestamp
		) {
		// Check if the asset ID exists
		const exists = await this.AssetExists(ctx, asset_id);
		if (!exists) {throw new Error(`The asset ${asset_id} does not exist`);}

		// Get asset with given asset ID
		const asset_str = await this.ReadAsset(ctx, asset_id);
		var   asset     = JSON.parse(asset_str);

		// Update asset IDs
		asset.PrevAssetID = asset.AssetID;
		asset.AssetID     = new_asset_id

		// Update owner
		asset.Owner = new_owner;

		// Update time stamp
		asset.Timestamp = time_now;

		// Update transaction IDs
		asset.PrevTxID = asset.TxID;
		asset.TxID     = (ctx.stub).getTxID();

		// Register transferred asset
		await (ctx.stub).putState(new_asset_id, Buffer.from(stringify(sortKeysRecursive(asset))));
	}

	// GetAllAssets returns all assets found in the world state.
	async GetAllAssets( ctx ) {
		const all_results = [];
		// Range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
		const iterator = await ctx.stub.getStateByRange( '', '' );
		let result = await iterator.next();
		while ( !result.done ) {
			const str_value = Buffer.from( result.value.value.toString() ).toString( 'utf8' );
			let record;
			try {
				record = JSON.parse( str_value );
			} catch ( error ) {
				console.log( error );
				record = str_value;
			}
			all_results.push( record );
			result = await iterator.next();
		}

		return JSON.stringify( all_results );
	}

	// GetAssetHistory returns update history of JUST ONE asset
	async GetAssetHistory(ctx, asset_id) {
		let iterator = await (ctx.stub).getHistoryForKey(asset_id);
		let result   = [];
		let res      = await iterator.next();
		while (!res.done) {
			if (res.value) {
				console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
				const obj = JSON.parse(res.value.value.toString('utf8'));
				result.push(obj);
			}
			res = await iterator.next();
		}
		await iterator.close();

		return result;
	}

	// GetSubHistory returns one asset transaction history.
	// HOWEVER, it returns part of it based on the given transaction ID:
	// e.g., it returns transaction history between 'tx_id' and 'end'.
	async GetSubHistory(ctx, asset_id, tx_id) {
		// Define empty result object
		let result = [];

		// Get target asset history in JSON format
		let asset = await this.GetAssetHistory(ctx, asset_id);

		// Fetch part of the history based on 'tx_id'
		let flag = false;
		for (var block of asset) {
			if      (block.TxID === tx_id) {result.push(block); flag = true;}
			else if (flag === true)        {result.push(block);}
		}

		return result
	}

	// GetTxHistory returns transaction history of an asset
	async GetTxHistory(ctx, asset_id) {
		// Define a transaction history variable
		let tx_history = [];

		// Get the current owner's asset history at the first place
		let target_asset = await this.GetAssetHistory(ctx, asset_id);
		for (var block of target_asset) {tx_history.push(block);}

		// Let's get previous owner's history!
		while(true) {
			// Define index number of the last block in the asset
			let last_elem = tx_history.length - 1;

			// Define the previous asset ID of the last block in the asset
			let target_asset_id = (tx_history[last_elem]).PrevAssetID;

			// Define the previous TxID of the last block in the asset
			let target_tx_id = (tx_history[last_elem]).PrevTxID;

			// If Previous TxID of the last block is empty; break
			if (target_tx_id === '') {
				const owner = (tx_history[last_elem]).Owner;
				console.info(`This owner (${owner}) is on the root of the supply chain!`);
				break;
			} else {
				// Fetch target asset's history between 'target_tx_id' and 'end'
				target_asset = await this.GetSubHistory(ctx, target_asset_id, target_tx_id);

				// Put all the fetched blocks to 'tx_history'
				for (var block of target_asset) {tx_history.push(block)}
			}
		}

		return tx_history
	}

	// GetTransaction returns the transaction ID
	async GetTransactionId(ctx) {
		return ctx.stub.getTxID();
	}
}

module.exports = AssetTransfer;

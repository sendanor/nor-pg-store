/* Connect/Express Session Store for PostgreSQL */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* FIXME: update expiration so that the session does not expire when user is using the system! */

var debug = require('nor-debug');
var util = require('util');
var pg = require('nor-pg');	
var Store = require('connect').session.Store;

function PgStore(options) {
	options = options || {};
	//Store.call(this, options);
	this._table = options.table || 'session';
	this.config = options.pg;
}

PgStore.prototype = new Store();
	
/** Get session data */
PgStore.prototype.get = function(sid, callback) {
	var result;
	var self = this;
	var scope;

	function save_result(db) {
		result = db.fetch();
		return db;
	}

	function do_success() {
		var rows = result;
		debug.log("PgStore.prototype.get(", sid, ") succeeds with rows: ", rows);
		var data = rows.shift();
		if(!(data && data.content)) {
			//throw new TypeError('Failed to read session #' + sid);
			callback(null);
		} else {
			callback(null, data.content);
		}
	}

	function do_fail(err) {
		debug.log("PgStore.prototype.get(", sid, ") failed: ", err);
		scope.rollback(err);
		callback(err);
		//callback(null, {});
	}

	try {
		var query = "SELECT content FROM "+'"' + self._table + '"'+" WHERE sid = $1";
		debug.log("PgStore.prototype.get(", sid, "): query = " + query, " with sid=", sid);

		scope = pg.scope();
		pg.start(self.config).then(pg.scope(scope)).query(query, [sid]).then(save_result).commit().then(do_success).fail(do_fail).done();
		//callback(null, {});
	} catch(e) {
		callback(e);
	}
};
	
/** Set session data */
PgStore.prototype.set = function(sid, session, callback) {
	var scope;

	function do_fail(err) {
		debug.log("PgStore.prototype.set(", sid, ") failed: ", err);
		scope.rollback(err);
		callback(err);
	}

	var self = this;
	try {

		/*
		var maxAge = session.cookie.maxAge,
		    oneDay = 86400,
			ttl = ('number' == typeof maxAge) ? (maxAge / 1000 | 0) : oneDay;
		*/

		if(typeof callback !== 'function') {
			callback = function(err) {
				console.error('Error: ' + util.inspect(err) );
			};
		}

		debug.log("[PgStore.prototype.set] session = " + session);
		debug.log("[PgStore.prototype.set] sid = " + sid);

		var select_query = "SELECT COUNT(sid) AS count FROM "+'"' + self._table + '"'+" WHERE sid = $1";
		debug.log("PgStore.prototype.set(", sid, "): select_query = " + select_query, " with sid=", sid);

		var update_query = "UPDATE "+'"' + self._table + '"'+" SET content = $1 WHERE sid = $2";
		debug.log("[PgStore.prototype.set(", sid, "] update_query = " + update_query);

		var insert_query = "INSERT INTO "+'"' + self._table + '"'+" (content, sid) VALUES ($1, $2)";
		debug.log("[PgStore.prototype.set(", sid, "] insert_query = " + insert_query);

		scope = pg.scope();
		pg.start(self.config).then(pg.scope(scope)).query(select_query, [sid]).then(function(db) {
			var rows = db.fetch();
			debug.log("[PgStore.prototype.set(", sid, "] rows = ", rows);
			var count = parseInt(rows.shift().count, 10);
			debug.log("[PgStore.prototype.set(", sid, "] count = ", count);
			var exists = (count === 0) ? false : true;
			debug.log("[PgStore.prototype.set(", sid, "] exists = ", exists);
			var query = exists ? update_query : insert_query;
			debug.log("[PgStore.prototype.set(", sid, "] query = ", query);
			return db.query( query, [session, sid]);
		}).commit().then(function() {
			callback();
		}).fail(do_fail).done();

	} catch(e) {
		if(callback) {
			callback(e);
		} else {
			console.error('Error: ' + util.inspect(e) );
		}
	}
};

/** Destroy session data */
PgStore.prototype.destroy = function(sid, callback) {
	var scope;

	function do_fail(err) {
		debug.log("PgStore.prototype.destroy(", sid, ") failed: ", err);
		scope.rollback(err);
		callback(err);
	}

	var self = this;
	if(typeof callback !== 'function') {
		callback = function(err) {
			console.error('Error: ' + util.inspect(err) );
		};
	}

	var query = "DELETE FROM "+'"' + self._table + '"'+" WHERE sid = $1";
	debug.log("[PgStore.prototype.destroy] query = " + query);
	scope = pg.scope();
	pg.start(self.config).then(pg.scope(scope)).query(query, [sid]).commit().then(function() {
		callback();
	}).fail(do_fail).done();
};
	
/*
PgStore.prototype.length = function(fn){
	this.client.dbsize(fn);
};

PgStore.prototype.clear = function(fn){
	this.client.flushdb(fn);
};
*/
	
module.exports = PgStore;

/* EOF */

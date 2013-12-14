/* Connect/Express Session Store for PostgreSQL */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* FIXME: update expiration so that the session does not expire when user is using the system! */

module.exports = function(connect) {
	"use strict";
	
	function PgStore(options) {
		options = options || {};
		Store.call(this, options);
		this.config = options.pg;
	}
	
	var util = require('util');
	var pg = require('nor-pg');
	var Store = connect.session.Store;
	
	PgStore.prototype.__proto__ = Store.prototype;
	
	/** Get session data */
	PgStore.prototype.get = function(sid, callback) {
		function do_success(rows) {
			var data = rows.shift().content;
			if(!data) { throw new TypeError('Failed to read session #' + sid); }
			callback(null, data);
		}

		function do_fail(err) {
			scope.rollback(err);
			callback(err);
		}

		var self = this;
		try {
			var scope = pg.scope();

			pg.start(self.config).then(pg.scope(scope)).query("SELECT content FROM session WHERE id = ?", [sid]).then(do_success).commit().fail(do_fail).done();
		} catch(e) {
			callback(e);
		}
	};
	
	/** Set session data */
	PgStore.prototype.set = function(sid, session, callback) {
		function do_success() {
			callback();
		}

		function do_fail(err) {
			scope.rollback(err);
			callback(err);
		}

		var self = this;
		try {
			var scope = pg.scope();

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

			pg.start(self.config).then(pg.scope(scope)).query("UPDATE session SET content = ? WHERE id = ?", [session, sid]).then(do_success).commit().fail(do_fail).done();

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
		function do_success() {
			callback();
		}
		
		function do_fail(err) {
			scope.rollback(err);
			callback(err);
		}

		var self = this;
		if(typeof callback !== 'function') {
			callback = function(err) {
				console.error('Error: ' + util.inspect(err) );
			};
		}

		pg.start(self.config).then(pg.scope(scope)).query("DELETE FROM session WHERE id = ?", [sid]).then(do_success).commit().fail(do_fail).done();
	};
	
	/*
	PgStore.prototype.length = function(fn){
		this.client.dbsize(fn);
	};

	PgStore.prototype.clear = function(fn){
		this.client.flushdb(fn);
	};
	*/
	
	return PgStore;
};

/* EOF */

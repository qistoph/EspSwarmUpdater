'use strict';

var Flags = {
	REQUIRED: 1,
	NO_SET: 2,
	NO_EDIT: 4,
	READ_ONLY: 6,
	NEW_ONLY: 4,
	EDIT_ONLY: 2
};

class API {
	constructor() {
		this.uri = "/api";

		var self = this;
		JSON_get(this.uri + "/types", function(t) {
			self.types = t;
		}).fail(function() {
			console.error("Could not load types:", arguments);
		});

		this.device = new ObjectEndPoint(this.uri + "/device", this.uri + "/devices");
		this.category = new ObjectEndPoint(this.uri + "/category", this.uri + "/categories");
		this.image = new ObjectEndPoint(this.uri + "/image", this.uri + "/images");
		this.pubkey = new ObjectEndPoint(this.uri + "/pubkey", this.uri + "/pubkeys");

		this.flags = Flags;
	}
}

function JSON_get(url, callback) {
	return $.getJSON(url, callback);
}

function JSON_get_paged(url, offset, limit, orderby, callback) {
	if(arguments.length < 4) {
		throw Error("JSON_get_paged has 4 required arguments: url, offset, limit, orderby");
	}

	orderby = orderby || null;

	function setPaginationHeaders(xhr) {
		var params = {'offset': offset, 'limit': limit};
		xhr.setRequestHeader('X-Paginate', JSON.stringify(params));
		xhr.setRequestHeader('X-Order', JSON.stringify(orderby));
	}

	var dfd = new $.Deferred();

	var tmp = $.ajax({
		url: url,
		type: 'GET',
		dataType: 'json',
		beforeSend: setPaginationHeaders
	}).done(function(data, textStatus, jqXHR) {
		var paginate = JSON.parse(jqXHR.getResponseHeader("X-Paginate"));
		var rem_args = Array.prototype.slice.call(arguments, 1);
		if(callback) {
			callback(data, paginate, rem_args);
		}
		dfd.resolve(data, paginate, rem_args);
	}).fail(function() {
		console.error(arguments);
		var args = Array.prototype.slice.call(arguments);
		dfd.reject(args);
	});

	return dfd.promise();
}

function JSON_put(url, data, callback) {
	return $.ajax({
		url: url,
		type: 'PUT',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: callback
	});
}

function JSON_post(url, data, callback, progress) {
	return $.ajax({
		url: url,
		type: 'POST',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: callback,
		xhr: function() {
			var xhr = $.ajaxSettings.xhr();
			xhr.upload.onprogress = progress;
			return xhr;
		},
	});
}

function JSON_delete(url, callback) {
	return $.ajax({
		url: url,
		type: 'DELETE',
		dataType: 'json',
		success: callback
	});
}

class ObjectEndPoint {
	constructor(uri, list_uri) {
		this.uri = uri;
		this.list_uri = list_uri;
	}

	get(id, callback) {
		return JSON_get(this.uri + "/" + id, callback);
	}

	put(id, data, callback) {
		return JSON_put(this.uri + "/" + id, data, callback);
	}

	delete(id, callback) {
		return JSON_delete(this.uri + "/" + id, callback);
	}

	list(offset, limit, orderby, callback) {
		return JSON_get_paged(this.list_uri, offset, limit, orderby, callback);
	}

	add(data, callback, progress) {
		return JSON_post(this.list_uri, data, callback, progress);
	}
}

var api = new API();
window.api = api;

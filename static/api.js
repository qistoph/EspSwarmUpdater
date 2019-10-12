class API {
	constructor() {
		this.uri = "/api";

		this.device = new ObjectEndPoint(this.uri + "/device", this.uri + "/devices");
		this.category = new ObjectEndPoint(this.uri + "/category", this.uri + "/categories");
		this.image = new ObjectEndPoint(this.uri + "/image", this.uri + "/images");
	}
}

function JSON_get(url, callback) {
	return $.getJSON(url, callback);
}

function JSON_get_paged(url, offset, limit, callback) {
	if(arguments.length < 3) {
		throw Error("JSON_get_paged has 3 required arguments: url, offset, limit");
	}

	function setPaginationHeaders(xhr) {
		params = {'offset': offset, 'limit': limit};
		xhr.setRequestHeader('X-Paginate', JSON.stringify(params));
	}

	var dfd = new $.Deferred();

	var tmp = $.ajax({
		url: url,
		type: 'GET',
		dataType: 'json',
		beforeSend: setPaginationHeaders
	}).done(function(data, textStatus, jqXHR) {
		paginate = JSON.parse(jqXHR.getResponseHeader("X-Paginate"));
		rem_args = Array.prototype.slice.call(arguments, 1);
		if(callback) {
			callback(data, paginate, rem_args);
		}
		dfd.resolve(data, paginate, rem_args);
	}).fail(function() {
		args = Array.prototype.slice.call(arguments);
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

function JSON_post(url, data, callback) {
	return $.ajax({
		url: url,
		type: 'POST',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: callback
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

	list(offset, limit, callback) {
		return JSON_get_paged(this.list_uri, offset, limit, callback);
	}

	add(data, callback) {
		return JSON_post(this.list_uri, data, callback);
	}
}

api = new API();

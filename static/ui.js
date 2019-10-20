'use strict';
moment.locale('nl-NL'); //TODO: move to application config

window.labels = {
	"device": "Device",
	"image": "Image",
	"category": "Category",
	"pubkey": "Public Key",
	"type": {
		"device": {
			"mac": "MAC",
			"description": "Description",
			"current_version": "Current version",
			"first_seen": "First seen",
			"last_seen": "Last seen",
			"current_image": "Current image",
			"desired_image": "Desired image",
			"category": "Category"
		},
		"category": {
			"name": "Name",
			"desired_image": "Desired image",
			"num_devices": "Devices"
		},
		"image": {
			"description": "Description",
			"md5": "MD5",
			"version": "Version",
			"filename": "Filename",
			"signed": "Signed",
			"pubkey": "PubKey",
			"added": "Added",
			"last_seen": "Last seen",
		},
		"pubkey": {
			"description": "Description",
			"added": "Added",
			"data": "Data"
		},
	}
};

window.icons = {
	"type": {
		"device": {
			"mac": "fa-ethernet",
			"description": "fa-tag",
			"first_seen": "fa-eye",
			"last_seen": "fa-hourglass-half",
			"current_version": "fa-barcode",
			"current_image": "fa-hdd",
			"desired_image": "fa-hdd",
			"category": "fa-tag"
		},
		"category": {
			"name": "fa-tag",
			"desired_image": "fa-hdd"
		},
		"image": {
			"md5": "fa-fingerprint",
			"description": "fa-tag",
			"version": "fa-barcode",
			"filename": "fa-file-code",
			"signed": "fa-file-signature",
			"pubkey": "fa-key",
			"added": "fa-calendar",
			"last_seen": "fa-hourglass-half",
		},
		"pubkey": {
			"description": "fa-tag",
			"added": "fa-calendar",
			"data": "fa-key"
		},
	}
};

var tables = [
	{
		"type": "device",
		"id": "table-devices",
		"title": "Devices",
		"columns": [
			NrTableColumn(),
			TypeFieldTableColumn("device", "mac"),
			TypeFieldTableColumn("device", "description"),
			TypeFieldTableColumn("device", "first_seen", {
				"getText":(data,idx)=>dateOrEmpty(data["first_seen"])}),
			TypeFieldTableColumn("device", "last_seen", {
				"getText":(data,idx)=>durationOrEmpty(data["last_seen"]),
				"getTitle":(data,idx)=>dateOrEmpty(data["last_seen"])
			}),
			TypeFieldTableColumn("device", "current_version"),
			TypeFieldTableColumn("device", "current_image", {
				//TODO: unknown current_image should not be a link
				"onValueClick": (data, idx)=>hl_image(data["current_image"])
			}),
			TypeFieldTableColumn("device", "desired_image", {
				"getText":(data,idx)=>(data["desired_image"]["md5"]||"")+(data["desired_image"]["source"]!="device"?"*":""),
				"onValueClick": (data, idx)=>hl_image(data["desired_image"]["md5"])
			}),
			TypeFieldTableColumn("device", "category", {
				"onValueClick": (data, idx)=>hl_category(data["category"])
			}),
			ButtonTableColumn("device", "mac"),
		],
		"createRow": DeviceTableRow,
		"note": "* desired image set on category"
	},
	{
		"type": "category",
		"id": "table-categories",
		"title": "Categories",
		"columns": [
			NrTableColumn(),
			TypeFieldTableColumn("category", "name"),
			TypeFieldTableColumn("category", "desired_image"),
			TypeFieldTableColumn("category", "num_devices", {
				"sortable":false,
				"onValueClick":(data,idx)=>hl_devices(data["name"])
			}),
			ButtonTableColumn("category", "name"),
		],
		"createRow": CategoryTableRow,
	},
	{
		"type": "image",
		"id": "table-images",
		"title": "Images",
		"columns": [
			NrTableColumn(),
			TypeFieldTableColumn("image", "description"),
			TypeFieldTableColumn("image", "md5", {
				"getHref":(data,idx)=>"/api/image/"+data["md5"]+"/binary"
			}),
			TypeFieldTableColumn("image", "version"),
			TypeFieldTableColumn("image", "filename"),
			TypeFieldTableColumn("image", "signed", {
				"getText":(data,idx)=>data["signed"]?"Yes":"No"
			}),
			TypeFieldTableColumn("image", "pubkey", {
				"getText":(data,idx)=>data["signed"]?data["pubkey"]?data["pubkey"]:"unknown":"",
				"onValueClick":(data,idx)=>hl_pubkeys(data["pubkey"])
			}),
			TypeFieldTableColumn("image", "added", {
				"getText":(data,idx)=>dateOrEmpty(data["added"])
			}),
			TypeFieldTableColumn("image", "last_seen", {
				"getText":(data,idx)=>durationOrEmpty(data["last_seen"]),
				"getTitle":(data,idx)=>dateOrEmpty(data["last_seen"])
			}),
			ButtonTableColumn("image", "md5"),
		],
		"createRow": ImageTableRow,
	},
	{
		"type": "pubkey",
		"id": "table-pubkeys",
		"title": "Public Keys",
		"columns": [
			NrTableColumn(),
			TypeFieldTableColumn("pubkey", "description"),
			TypeFieldTableColumn("image", "added", {
				"getText":(data,idx)=>dateOrEmpty(data["added"])
			}),
			ButtonTableColumn("pubkey", "description"),
		],
		"createRow": PubkeyTableRow,
	}
];

// Data type plural/singluar mapping
var plural = {
	"device": "devices",
	"category": "categories",
	"image": "images",
	"pubkey": "pubkeys",
};
var singular = {
	"devices": "device",
	"categories": "category",
	"images": "image",
	"pubkeys": "pubkey",
};

var backend_types = [];
var backend = {}; // Ref to stored known backend values

function dateOrEmpty(val) {
	if(val) {
		return moment.unix(val).format("lll");
	} else {
		return "";
	}
}

function durationOrEmpty(val) {
	if(val) {
		return moment.unix(val).fromNow();
	} else {
		return "";
	}
}

function Table(opts) {
	var table = $(`<table class="table table-hover" id="${opts.id}">`);
	var head = $("<thead>");

	opts.columns.forEach(function(th) {
		head.append(th);
	});

	var foot = $("<tfoot>");
	if(opts.note) {
		foot.append($(`<tr><td colspan="100%">${opts.note}</td></tr>`));
	}
	foot.append(`<tr><td colspan="100%">
		Page: <span><select class="page-nr"></select></span>
		Per page: <span><select class="per-page"></select></span>
		Entries shown: <span class="cur-page">?</span> / <span class="total-pages">?</span>
	</td></tr>`);

	foot.find(".per-page").append(
		[10,25,50,100].map((cnt) => $("<option>").attr("value", cnt).text(cnt))
	);

	foot.on("change", function() {
		refresh(opts.type);
	});

	table.append(head);
	table.append($("<tbody>"));
	table.append(foot);
	return table;
}

function TableColumn(label, opts) {
	opts = Object.assign({}, opts);

	var th = $(`<th scope="col"></th>`);
	if(opts && opts.icon) {
		th.append(`<i class="fa ${opts.icon}"></i> `);
	}
	if(typeof(label) == "string") {
		th.append(label);
	} else {
		th.append(label);
	}
	if(opts.class) {
		th.addClass(opts.class);
	}
	th.getValue = function(text) {
		return $(`<td>${text}</td>`);
	};
	return th;
}

function NrTableColumn() {
	var th = TableColumn('#');
	th.getValue = function(data, idx) {
		return $(`<th scope="row">${idx+1}</th>`);
	};
	return th;
}

function ButtonTableColumn(type, keyfield) {
	var th = TableColumn();
	th.addClass("text-right");
	th.append(RefreshButton(type));
	th.append(" ");
	th.append(AddButton(type));

	th.getValue = function(data, idx) {
		var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');

		var id = data[keyfield];
		var btnDelete = $(`<button class="btn btn-danger btn-sm deletebtn" data-type="${type}" data-id="${id}"><i class="fa fa-trash"></i></button>`);
		var btnEdit = $(`<button class="btn btn-primary btn-sm editbtn" data-type="${type}" data-id="${id}"><i class="fa fa-edit"></i></button>`);

		btnDelete.on("click", btnDelete_click);
		btnEdit.on("click", btnEdit_click);

		buttonsTd.append(btnDelete, ' ', btnEdit);
		return buttonsTd;
	};

	return th;
}

function TypeFieldTableColumn(type, field, opts) {
	opts = Object.assign({
		"sortable":true,
		"nullValue":"",
		"getText": function(data, idx) {
			return data[field]||opts.nullValue;
		},
		"getTitle": function(data, idx) {
			return "";
		},
		"getHref": function(data, idx) {
			return "#";
		},
		"onValueClick": undefined,
		"getValue": function(data, idx) {
			var td = $('<td>');
			var text = opts.getText(data, idx);
			var title = opts.getTitle(data, idx);

			var href = opts.getHref(data, idx);
			if(opts.onValueClick || href != '#') {
				var link = $('<a></a>');
				link.attr("href", opts.getHref(data, idx));
				link.text(text);
				link.on("click", (e)=>{
					opts.onValueClick(data, idx, e);
				});
				text = link;
			}

			if(title) {
				td.attr("title", title);
			}

			td.append(text);
			return td;
			//return $(`<td>${data[field]||opts.nullValue}</td>`);
		}
	}, opts); // Some defaults
	opts.icon = icons.type[type][field];

	var th = TableColumn(labels.type[type][field], opts);

	if(opts.sortable) {
		var sort = $(' <i class="fa sort-none"></i>');
		th.append(sort);
		sort.on("click", function(e) {
			sort.closest("table").find("th[scope=col] .sort-asc").addClass("sort-none").removeClass("sort-asc");
			sort.closest("table").find("th[scope=col] .sort-desc").addClass("sort-none").removeClass("sort-desc");

			if(sortings[type] && sortings[type].indexOf(field+":asc") >= 0) {
				sortings[type] = [field+":desc"];
				sort.removeClass("sort-none");
				sort.addClass("sort-desc");
			} else {
				sortings[type] = [field+":asc"];
				sort.removeClass("sort-none");
				sort.addClass("sort-asc");
			}
			refresh(type);
		});
	}

	th.getValue = opts.getValue;
	return th;
}

function TableRow(idx, data, columns) {
	var tr = $('<tr>');
	columns.forEach(function(col) {
		tr.append(col.getValue(data, idx));
	});
	return tr;
}

function DeviceTableRow(idx, data, columns) {
	var $tr = TableRow(idx, data, columns);
	$tr.attr("data-dev-cat", data["category"]);
	if(data["desired_image"] && data["desired_image"]["md5"] != data["current_image"]) {
		$tr.addClass("bg-warning");
	}
	return $tr;
}

function CategoryTableRow(idx, data, columns) {
	var $tr = TableRow(idx, data, columns);
	$tr.attr("data-cat-name", data["name"]);
	return $tr;
}

function ImageTableRow(idx, data, columns) {
	var $tr = TableRow(idx, data, columns);
	$tr.attr("data-img-md5", data["md5"]);
	return $tr;
}

function PubkeyTableRow(idx, data, columns) {
	var $tr = TableRow(idx, data, columns);
	$tr.attr("data-pubkey-name", data["description"]);
	return $tr;
}

function RefreshButton(type) {
	var btn = $(`<button class="btn btn-primary btn-sm"><i class="fa fa-sync-alt"></i></button>`);
	btn.on("click", function() {
		refresh(type);
	});
	return btn;
}

function AddButton(type) {
	var btn = $(`<button class="btn btn-primary btn-sm addbtn" data-type="${type}"><i class="fa fa-plus"></i></button>`);
	btn.on("click", function() {
		showEditPrompt(type, true);
	});
	return btn;
}

function highlight_scroll(targets) {
	$("tr.bg-info").removeClass("bg-info")
	targets.addClass("bg-info")
	$('html, body').animate({
		scrollTop: targets.offset().top - $(".navbar").outerHeight()
	}, 1000);
}

function hl_image(md5) {
	highlight_scroll($(`tr[data-img-md5='${md5}']`));
	return false;
}

function hl_category(name) {
	highlight_scroll($(`tr[data-cat-name='${name}']`));
	return false;
}

function hl_devices(category) {
	highlight_scroll($(`tr[data-dev-cat='${category}']`));
	return false;
}

function hl_pubkeys(name) {
	highlight_scroll($(`tr[data-pubkey-name='${name}']`));
	return false;
}

function btnDelete_click(e){
	var type = $(e.delegateTarget).data("type");
	var id = $(e.delegateTarget).data("id");

	bootbox.dialog({
		title: "Delete Permanently",
		message: "Are you sure you want to delete the "+type+" <b>"+id+"</b>?",
		onEscape: true,
		backdrop: true,
		buttons: {
			cancel: {
				label: "Cancel",
				className: "btn-default"
			},
			delete: {
				label: "Delete",
				className: "btn-danger btn-ok",
				callback: function() {
					var modalDiv = this;
					api[type].delete(id).done(function() {
						//refresh(type);
						$(e.delegateTarget).closest("tr").first().remove()
					}).fail(function() {
						console.error(`Delete ${type} ${id} failed:`, arguments);
						bootbox.alert({
							title: "Delete failed",
							message: "An error occured during the removal. Please try again."
						});
					}).always(function() {
						modalDiv.modal("hide");
					});
					return false;
				}
			}
		}
	});
}

function btnEdit_click(e) {
	var d = $(e.delegateTarget).data();
	//TODO: show spinner while loading?
	//TODO: get from backend-variable instead of through AJAX?
	api[d.type].get(d.id).done((data) => {
		showEditPrompt(d.type, false, data);
	});
}

var sortings = {};

//TODO: pagination
function refresh(type) {
	var table = $("#table-"+plural[type]);
	var pageNr = parseInt(table.find(".page-nr").val())||0;
	var perPage = parseInt(table.find(".per-page").val())||10;
	var orderby = sortings[type];

	var tableInfo = tables.find(t=>t.type==type);

	var offset = pageNr * perPage;

	api[type].list(offset, perPage, orderby).done((data, paginate) => {
		backend[plural[type]] = data;
		table.find("tbody tr").remove()
		var rows = data.map((d, i) => tableInfo.createRow(paginate.offset+i, d, tableInfo.columns));
		table.find("tbody").append(rows);
		// TODO: rename cur-page and total-pages to *-records
		table.find(".cur-page").text(`${paginate.offset+1}-${paginate.offset+data.length}`);
		table.find(".total-pages").text(`${paginate.total}`);

		var $selPages = table.find(".page-nr");
		$selPages[0].innerHTML = "";
		for(var i=0; i<paginate.total/perPage; ++i) {
			$selPages.append($("<option>").attr("value", i).text(i+1).attr("selected", i==(offset/perPage)?"selected":undefined));
		}
	});
}

$(function() {
	// On page load
	
	tables.forEach(function(conf) {
		var h2 = $(`<h2 id=${conf.type}>${conf.title}</h2>`);
		var table = Table(conf);
		$(document.body).append(h2).append(table);
	});

	refresh("device");
	refresh("category");
	refresh("image");
	refresh("pubkey");
});

function imagesToMapping(images, includeNone) {
	var base = {};
	if(includeNone) {
		base[""] = "None";
	}

	var images = backend.images.reduce(function(obj, img) {
		var label = img.md5; // fallback
		if(img.description) {
			label = img.description;
			if(img.version) {
				label += ` (${img.version})`;
			}
		} else if(img.version) {
			label = img.version;
		}

		obj[img.md5] = label;
		return obj;
	}, base);

	return images;
}

function emptyToNull(data) {
	Object.keys(data).forEach(k=>{
		if(data[k] == "") {
			data[k] = null;
		}
	});
	return data;
}

function showEditPrompt(type, isnew, data) {
	// Skip images without filename (and thus binary)
	// Allow 'None' selection
	var images = imagesToMapping(backend.images.filter((img)=>img.filename), true);
	var categories = backend.categories.reduce(function(obj, cat) {
		obj[cat.name] = cat.name;
		return obj;
	}, {"":"None"});

	var inputNr = 1;
	var inputs = [];
	api.types[type].props.forEach(p => {
		if(isnew) {
			// Hide NO_SET options on add form
			if(p.flags & api.flags.NO_SET) {
				return;
			}
		}

		var opts = Object.assign({}, p, {
			id: "inp_" + inputNr,
			value: data?data[p.name]:undefined,
			label: labels.type[type][p.name],
			icon: icons.type[type][p.name],
			readonly: !isnew && (p.flags & api.flags.NO_EDIT)
		});

		switch(p.input.type) {
			case "text":
				inputs.push(popform.TextInput(opts));
				break;
			case "number":
				inputs.push(popform.NumberInput(opts));
				break;
			case "checkbox":
				inputs.push(popform.CheckboxInput(opts));
				break;
			case "datetime":
				inputs.push(popform.DateTimeInput(opts));
				break;
			case "ref_image":
				inputs.push(popform.SelectInput(Object.assign(opts, {
					options: images
				})));
				break;
			case "ref_category":
				inputs.push(popform.SelectInput(Object.assign(opts, {
					options: categories
				})));
				break;
			default:
				console.error(`No popform type for ${p.input.type} in ${type}`);
		}
		inputNr++;
	});

	var keyname = api.types[type].key;
	var oldId;
	if(data) {
		oldId = data[keyname];
	}
	var saveHandler;
	if(isnew) {
		saveHandler = function(id, data) {
			return api[type].add(data, undefined, function(prog) {
				if(opts.progress) {
					opts.progress(prog.loaded/prog.total);
				}
			});
		}
	} else {
		saveHandler = function(id, data) {
			return api[type].put(id, data);
		}
	}

	var opts = {
		title: "New "+labels[type],
		inputs: inputs,
		doneText: isnew ? "Create" : "Save",
	};

	if(customEditPrompt[type]) {
		opts = customEditPrompt[type](opts, isnew);
	}

	var dialog = popform.create(opts);

	dialog.on("submit", function(e) {
		var data = dialog.getData();
		data = emptyToNull(data);
		saveHandler(oldId, data).done(function() {
			//TODO: fetch paginated part with new entry
			refresh(type);
		}).fail(function(xhr) {
			console.error(xhr);
			var message = "An error occured while saving. Please try again.";
			if(xhr.responseJSON && xhr.responseJSON.message) {
				message = xhr.responseJSON.message;
			} else if(xhr.responseText) {
				message = xhr.responseText;
			}

			bootbox.alert({
				title: `Save ${type} ${data[keyname]} failed`,
				message: message
			});
		}).always(function() {
			dialog.modal("hide");
		});

		$(e.target).find(":input").prop("disabled", true);
		// Don't close, we will after callback
		e.stopPropagation();
		e.preventDefault();
		return false;
	});

	dialog.modal("show");
}

function getBase64(file) {
	return new Promise(function(resolve, reject) {
		var reader = new FileReader();
		reader.onload = function () {
			resolve(btoa(reader.result));
		};
		reader.onerror = function (error) {
			console.error('Error: ', error);
		};
		reader.readAsBinaryString(file);
	});
}

var customEditPrompt = {
	"image": function(opts, isnew) {
		if(isnew) {
			var fileInput = popform.FileInput({
				label: "File",
				id: "file_1",
				icon: "fa-file-code",
				showProgress: true,
				required: true,
			});

			opts.inputs.unshift(fileInput);
			opts.progress = fileInput.progress;

			var fileName;
			var fileData;
			fileInput.fileSelected.then(function(input) {
				fileName = input.files[0].name;
				getBase64(input.files[0]).then(function(data) {
					 fileData = data;
				});
			});

			opts.getData = function(data) {
				data["filename"] = fileName;
				data["binary"] = fileData;
				return data;
			};
		} // End if isnew

		return opts;
	},
	"pubkey": function(opts, isnew) {
		if(isnew) {
			var fileInput = popform.FileInput({
				label: "File",
				id: "file_1",
				icon: "fa-key",
				showProgress: true,
				required: true,
			});

			opts.inputs.unshift(fileInput);
			opts.progress = fileInput.progress;

			var fileName;
			var fileData;
			fileInput.fileSelected.then(function(input) {
				fileName = input.files[0].name;
				getBase64(input.files[0]).then(function(data) {
					 fileData = data;
				});
			});

			opts.getData = function(data) {
				data["keydata"] = fileData;
				return data;
			};
		}

		return opts;
	}
};

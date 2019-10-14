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
			TableColumn("#"),
			TableColumn(labels.type.device.mac, {"icon":icons.type.device.mac}),
			TableColumn(labels.type.device.description, {"icon":icons.type.device.description}),
			TableColumn(labels.type.device.first_seen, {"icon":icons.type.device.first_seen}),
			TableColumn(labels.type.device.last_seen, {"icon":icons.type.device.last_seen}),
			TableColumn(labels.type.device.current_version, {"icon":icons.type.device.current_version}),
			TableColumn(labels.type.device.current_image, {"icon":icons.type.device.current_image}),
			TableColumn(labels.type.device.desired_image, {"icon":icons.type.device.desired_image}),
			TableColumn(labels.type.device.category, {"icon":icons.type.device.category}),
			TableColumn(AddButton("device"), {"class":"text-right"}),
		],
		"note": "* desired image set on category"
	},
	{
		"type": "category",
		"id": "table-categories",
		"title": "Categories",
		"columns": [
			TableColumn("#"),
			TableColumn(labels.type.category.name, {"icon":icons.type.category.name}),
			TableColumn(labels.type.category.desired_image, {"icon":icons.type.category.desired_image}),
			TableColumn(labels.type.category.num_devices, {"icon":icons.type.category.num_devices}),
			TableColumn(AddButton("category"), {"class":"text-right"}),
		]
	},
	{
		"type": "image",
		"id": "table-images",
		"title": "Images",
		"columns": [
			TableColumn("#"),
			TableColumn(labels.type.image.description, {"icon":icons.type.image.description}),
			TableColumn(labels.type.image.md5, {"icon":icons.type.image.md5}),
			TableColumn(labels.type.image.version, {"icon":icons.type.image.version}),
			TableColumn(labels.type.image.filename, {"icon":icons.type.image.filename}),
			TableColumn(labels.type.image.signed, {"icon":icons.type.image.signed}),
			TableColumn(labels.type.image.added, {"icon":icons.type.image.added}),
			TableColumn(labels.type.image.last_seen, {"icon":icons.type.image.last_seen}),
			TableColumn(AddButton("image"), {"class":"text-right"}),
		]
	},
	{
		"type": "pubkey",
		"id": "table-pubkeys",
		"title": "Public Keys",
		"columns": [
			TableColumn("#"),
			TableColumn(labels.type.pubkey.description, {"icon":icons.type.pubkey.description}),
			TableColumn(labels.type.pubkey.added, {"icon":icons.type.pubkey.added}),
			TableColumn(AddButton("pubkey"), {"class":"text-right"}),
		]
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

$.fn.datetimepicker.Constructor.Default = $.extend({}, $.fn.datetimepicker.Constructor.Default, {
	icons: {
		time: 'fa fa-clock',
		date: 'fa fa-calendar',
		up: 'fa fa-arrow-up',
		down: 'fa fa-arrow-down',
		previous: 'fa fa-chevron-left',
		next: 'fa fa-chevron-right',
		today: 'fa fa-calendar-check-o',
		clear: 'fa fa-trash',
		close: 'fa fa-times'
	}
});

var backend_types = [];
var backend = {}; // Ref to stored known backend values

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

	var th = $(`<th scopy="col"></th>`);
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
	return th;
}

function AddButton(type) {
	var btn = $(`<button class="btn btn-primary btn-sm addbtn" data-type="${type}"><i class="fa fa-plus"></i></button>`);
	return btn;
}

function highlight_scroll(targets) {
	$("tr.bg-info").removeClass("bg-info")
	targets.addClass("bg-info")
	$('html, body').animate({
		scrollTop: targets.offset().top
	}, 2000);
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

function object_buttons(type, id) {
	var btnDelete = $(`<button class="btn btn-danger btn-sm deletebtn" data-type="${type}" data-id="${id}"><i class="fa fa-trash"></i></button>`);
	var btnEdit = $(`<button class="btn btn-primary btn-sm editbtn" data-type="${type}" data-id="${id}"><i class="fa fa-edit"></i></button>`);

	btnDelete.on("click", btnDelete_click);
	btnEdit.on("click", btnEdit_click);

	return [btnDelete, ' ', btnEdit];
}

function addRow_device(data, idx) {
	var key = data["mac"];

	var tr = $(`
		<tr data-dev-cat="${data["category"]}">
			<th scope="row">${idx+1}</th>
			<td>${data["mac"]}</td>
			<td>${data["description"]||""}</td>
			<td>${data["first_seen"]?moment.unix(data["first_seen"]).format("lll"):""}</td>
			<td title="${data["last_seen"]?moment.unix(data["last_seen"]).format("lll"):""}">${data["last_seen"]?moment.unix(data["last_seen"]).fromNow():""}</td>
			<td>${data["current_version"]||""}</td>
			<td><a href="#" onClick="return hl_image('${data["current_image"]}')">${data["current_image"]||"unknown"}</a></td>
			<td><a href="#" onClick="return hl_image('${data["desired_image"]["md5"]}')">${data["desired_image"]["md5"]||""}</a>${(data["desired_image"]["source"] != "device")?"*":""}</td>
			<td><a href="#" onClick="return hl_category('${data["category"]}')">${data["category"]||""}</a></td>
		</tr>
	`);
	//TODO: unknown current_image should not be a link

	if(data["desired_image"] && data["desired_image"]["md5"] != data["current_image"]) {
		tr.addClass("bg-warning");
	}

	var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');
	buttonsTd.append(object_buttons('device', key));
	tr.append(buttonsTd);

	$("#table-devices tbody").append(tr);
}

function addRow_category(data, idx) {
	var key = data["name"];

	var tr = $(`
		<tr data-cat-name="${key}">
			<th scope="row">${idx+1}</th>
			<td>${data["name"]}</td>
			<td>${data["desired_image"]||""}</td>
			<td><a href="#" onClick="return hl_devices('${data["name"]}')">${data["num_devices"]}</a></td>
		</tr>`);

	var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');
	buttonsTd.append(object_buttons('category', key));
	tr.append(buttonsTd);

	$("#table-categories tbody").append(tr);
}

function addRow_image(data, idx) {
	var key = data["md5"];

	var tr = $(`
		<tr data-img-md5="${key}">
			<th>${idx+1}</th>
			<td>${data["description"]||""}</td>
			<td>${data["md5"]}</td>
			<td>${data["version"]||""}</td>
			<td>${data["filename"]||""}</td>
			<td>${data["signed"]?"Yes":"No"}</td>
			<td>${data["added"]?moment.unix(data["added"]).format("lll"):""}</td>
			<td title="${data["last_seen"]?moment.unix(data["last_seen"]).format("lll"):""}">${data["last_seen"]?moment.unix(data["last_seen"]).fromNow():""}</td>
		</tr>`);
	//TODO: signed: yes/no => valid/invalid/no

	var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');
	buttonsTd.append(object_buttons('image', key));
	tr.append(buttonsTd);

	$("#table-images tbody").append(tr);
}

function addRow_pubkey(data, idx) {
	var key = data["description"];

	var tr = $(`
		<tr data-pubkey-name="${key}">
			<th scope="row">${idx+1}</th>
			<td>${data["description"]}</td>
			<td>${data["added"]?moment.unix(data["added"]).format("lll"):""}</td>
		</tr>`);

	var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');
	buttonsTd.append(object_buttons('pubkey', key));
	tr.append(buttonsTd);

	$("#table-pubkeys tbody").append(tr);
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

function btnAdd_click(e) {
	var type = $(e.delegateTarget).data("type");
	showEditPrompt(type, true);
}

function btnEdit_click(e) {
	var d = $(e.delegateTarget).data();
	//TODO: show spinner while loading?
	//TODO: get from backend-variable instead of through AJAX?
	api[d.type].get(d.id).done((data) => {
		showEditPrompt(d.type, false, data);
	});
}

//TODO: pagination
function refresh(type) {
	var table = $("#table-"+plural[type]);
	var pageNr = parseInt(table.find(".page-nr").val())||0;
	var perPage = parseInt(table.find(".per-page").val())||10;

	var offset = pageNr * perPage;

	api[type].list(offset, perPage).done((data, paginate) => {
		backend[plural[type]] = data;
		table.find("tbody tr").remove()
		data.forEach((d, i) => window["addRow_"+type](d, paginate.offset+i));
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
		var h2 = $(`<h2>${conf.title}</h2>`);
		var table = Table(conf);
		$(document.body).append(h2).append(table);
	});

	$(".addbtn").on("click", btnAdd_click);

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
			var message = "An error occured while saving. Please try again.";
			if(xhr.responseJSON.message) {
				message = xhr.responseJSON.message;
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

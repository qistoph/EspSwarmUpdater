'use strict';
moment.locale('nl-NL');

window.labels = {
	"device": "Device",
	"image": "Image",
	"category": "Category",
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
			"name": "Name",
			"md5": "MD5",
			"version": "Version",
			"filename": "Filename",
			"signed": "Signed"
		}
	}
};

var tables = [
	{
		"type": "device",
		"id": "table-devices",
		"title": "Devices",
		"columns": [
			TableColumn("#"),
			TableColumn(labels.type.device.mac),
			TableColumn(labels.type.device.description),
			TableColumn(labels.type.device.first_seen),
			TableColumn(labels.type.device.last_seen),
			TableColumn(labels.type.device.current_image),
			TableColumn(labels.type.device.desired_image),
			TableColumn(labels.type.device.category),
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
			TableColumn(labels.type.category.name),
			TableColumn(labels.type.category.desired_image),
			TableColumn(labels.type.category.num_devices),
			TableColumn(AddButton("category"), {"class":"text-right"}),
		]
	},
	{
		"type": "image",
		"id": "table-images",
		"title": "Images",
		"columns": [
			TableColumn("#"),
			TableColumn(labels.type.category.name),
			TableColumn(labels.type.category.md5),
			TableColumn(labels.type.category.version),
			TableColumn(labels.type.category.filename),
			TableColumn(labels.type.category.signed),
			TableColumn(AddButton("category"), {"class":"text-right"}),
		]
	}
];

// Data type plural/singluar mapping
var plural = {
	"device": "devices",
	"category": "categories",
	"image": "images",
};
var singular = {
	"devices": "device",
	"categories": "category",
	"images": "image",
};

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
	foot.append(`<tr><td colspan="100%"><span class="cur-page">?</span> / <span class="total-pages">?</span></td></tr>`);

	table.append(head);
	table.append($("<tbody>"));
	table.append(foot);
	return table;
}

function TableColumn(label, opts) {
	var th = $(`<th scopy="col"></th>`);
	if(typeof(label) == "string") {
		th.text(label);
	} else {
		th.append(label);
	}
	opts = Object.assign({}, opts);
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
	var btnEdit = $(`<button class="btn btn-primary btn-sm editbtn" data-type="${type}" data-id="${id}"><i class="fa fa-pencil"></i></button>`);

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
			<td>${moment.unix(data["first_seen"]).format("lll")}</td>
			<td title="${data["last_seen"]}">${moment.unix(data["last_seen"]).fromNow()}</td>
			<td><a href="#" onClick="return hl_image('${data["current_image"]}')">${data["current_image"]||"unknown"}</a></td>
			<td><a href="#" onClick="return hl_image('${data["desired_image"]["md5"]}')">${data["desired_image"]["md5"]||""}</a>${(data["desired_image"]["source"] != "device")?"*":""}</td>
			<td><a href="#" onClick="return hl_category('${data["category"]}')">${data["category"]||""}</a></td>
		</tr>
	`);

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
			<td>??TODO:SIGNED??</td>
		</tr>`);

	var buttonsTd = $('<td class="text-right" style="white-space: nowrap"></td>');
	buttonsTd.append(object_buttons('image', key));
	tr.append(buttonsTd);

	$("#table-images tbody").append(tr);
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
	console.log(d);
	bootbox.alert({
		title: `Edit ${d["type"]} ${d["id"]}`,
		message: "Here we should edit the unit"
	});
}

//TODO: pagination
function refresh(type) {
	api[type].list().done((data, paginate) => {
		backend[plural[type]] = data;
		var table = $("#table-"+plural[type]);
		var addFunc = window["addRow_"+type];
		table.find("tbody tr").remove()
		data.forEach((d, i) => addFunc(d, paginate.offset+i));
		table.find(".cur-page").text(`${paginate.offset+1}-${paginate.offset+data.length}`);
		table.find(".total-pages").text(`${paginate.total}`);
	});
}

$(function() {
	// On page load
	
	tables.forEach(function(conf) {
		var h2 = $(`<h2>${conf.title}</h2>`);
		var table = Table(conf);
		$(document.body).append(h2).append(table);
	});

	$(".deletebtn").on("click", btnDelete_click);// TODO: remove when deletebtns are removed from HTML
	$(".editbtn").on("click", btnEdit_click);// TODO: remove when editbtns are removed from HTML
	$(".addbtn").on("click", function(e) {
		var type = $(e.delegateTarget).data("type");

		showEditPrompt(type);
	});

	refresh("device");
	refresh("category");
	refresh("image");
});

function add_failed_generator(type, name, input) {
	return function() {
		console.error(`Add ${type} ${name} failed:`, arguments, input);
		bootbox.alert({
			title: $("<div>").text(`Add ${type} ${name} failed`).html(),
			message: "An error occured while adding. Please try again."
		});
	};
};

function getFormData($form){
	var unindexed_array = $form.serializeArray();
	var indexed_array = {};

	$.map(unindexed_array, function(n, i){
		indexed_array[n['name']] = n['value'];
	});

	return indexed_array;
}

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

function generateAddCompleteHandler(type, nameField) {
	return function(dialog, form) {
		var data = getFormData($(form));
		if(data.desired_image === "") {
			data.desired_image = undefined;
		}
		api[type].add(data).done(function() {
			refresh(type);
		}).fail(
			add_failed_generator(type, data[nameField], data)
		).always(function() {
			dialog.modal("hide");
		});

		$(form).find(":input").prop("disabled", true);
		return false; // Don't close, we will after callback
	};
}

function showEditPrompt(type, isnew, callback) {
	// Skip images without filename (and thus binary)
	// Allow 'None' selection
	var images = imagesToMapping(backend.images.filter((img)=>img.filename), true);

	var inputNr = 1;
	var inputs = [];
	api.types[type].props.forEach(p => {
		var opts = Object.assign({}, p, {
			id: "inp_" + inputNr,
			label: labels.type[type][p.name],
		});

		switch(p.input.type) {
			case "text":
				inputs.push(popform.TextInput(opts));
				break;
			case "number":
				inputs.push(popform.NumberInput(opts));
				break;
			case "datetime":
				inputs.push(popform.DateTimeInput(opts));
				break;
			case "ref_image":
				inputs.push(popform.SelectInput(Object.assign(opts, {
					options: images
				})));
			default:
				console.error(`No popform type for ${p.input.type} in ${type}`);
		}
		inputNr++;
	});

	popform.show({
		title: "New "+labels[type],
		inputs: inputs,
		completed: generateAddCompleteHandler(type, api.types[type].key),
		//TODO: fetch paginated part with new entry
	});
}


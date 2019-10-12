'use strict';
moment.locale('nl-NL');

var tables = [
	{
		"type": "category",
		"title": "Categories",

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
	$(".deletebtn").on("click", btnDelete_click);// TODO: remove when deletebtns are removed from HTML
	$(".editbtn").on("click", btnEdit_click);// TODO: remove when editbtns are removed from HTML
	$(".addbtn").on("click", function(e) {
		var type = $(e.delegateTarget).data("type");
		if(type in add_prompts) {
			add_prompts[type]();
		} else {
			bootbox.alert(`Cannot add ${type} yet`);
		}
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

window.labels = {
	"type": {
		"category": {
			"name": "Name",
			"desired_image": "Desired Image"
		}
	}
};

//TODO: fetch paginated part with new entry
var add_prompts = {
	"category": function() {
		// Skip images without filename (and thus binary)
		var images = imagesToMapping(backend.images.filter((img)=>img.filename), true);

		var inputNr = 1;
		var inputs = [];
		api.types.find((t)=>t.name=="category").props.forEach(p => {
			var opts = {
				id: "cat_" + inputNr,
				name: p.name,
				label: labels.type["category"][p.name],
				required: p.required
			};

			switch(p.input.type) {
				case "text":
					inputs.push(popform.TextInput(opts));
					break;
				case "ref_image":
					inputs.push(popform.SelectInput(Object.assign(opts, {
						options: images
					})));
			}
			inputNr++;
		});
		console.log(inputs);

		popform.show({
			title: "New Category",
			inputs: inputs,
			completed: generateAddCompleteHandler("category", "name"),
		});
	},
};

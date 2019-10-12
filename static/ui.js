'use strict';
moment.locale('nl-NL');

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

var backend = {}; // Ref to stored known backend values

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

//TODO: fetch paginated part with new entry
var add_prompts = {
	"category": function() {
		// Skip images without filename (and thus binary)
		var images = imagesToMapping(backend.images.filter((img)=>img.filename), true);

		popform.show({
			title: "New Category",
			inputs: [
				popform.TextInput({
					id: "cat_name",
					name: "name",
					label: "Name",
					required: true
				}),
				popform.SelectInput({
					id: "cat_image",
					name: "desired_image",
					label: "Image",
					required: false,
					options: images,
				})
			],
			completed: generateAddCompleteHandler("category", "name"),
		});
	},
};

(function(root, factory){
	'use strict';
	root.popform = factory(root.jQuery);
})(this, function init($, undefined) {
	'use strict';

	var exports = {};
	var VERSION = '1.0.0';
	exports.VERSION = VERSION;
	
	var templates = {
		modal: `<div class="modal fade hide" id="modalCategory" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">

      <!-- Modal Header -->
      <div class="modal-header">
        <h4 class="modal-title"></h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>

	  <form>
		  <!-- Modal body -->
		  <div class="modal-body">
			  <div class="form-group row">
				  <label class="col-4 col-form-label" for="cat_name">Name</label> 
				  <div class="col-8">
					  <div class="input-group">
						  <div class="input-group-prepend">
							  <div class="input-group-text">
								  <i class="fa fa-tag"></i>
							  </div>
						  </div> 
						  <input id="cat_name" name="cat_name" type="text" required="required" class="form-control">
					  </div>
				  </div>
			  </div>
			  <div class="form-group row">
				  <label for="cat_desired_image" class="col-4 col-form-label">Desired Image</label> 
				  <div class="col-8">
					  <div class="input-group">
						  <div class="input-group-prepend">
							  <div class="input-group-text">
								  <i class="fa fa-tag"></i>
							  </div>
						  </div> 
						  <select id="cat_desired_image" name="cat_desired_image" class="custom-select" aria-describedby="cat_desired_imageHelpBlock">
							  <option value="undefined">None</option>
							  <option value="duck">Duck</option>
							  <option value="fish">Fish</option>
						  </select> 
					  </div>
					  <span id="cat_desired_imageHelpBlock" class="form-text text-muted">The firmware image devices in the category should download and install.</span>
				  </div>
			  </div> 
		  </div>

		  <!-- Modal footer // data-dismiss="modal" -->
		  <div class="modal-footer">
			  <button type="button" class="btn btn-secondary" id="formBtnCancel" data-dismiss="modal">Cancel</button>
			  <button type="submit" class="btn btn-primary" id="formBtnDone">Create</button>
		  </div>
	  </form>

    </div>
  </div>
</div>`,
		formRow: '<div class="form-group row"></div>',
		inputGroup: '<div class="col-8"><div class="input-group"><div class="input-group-prepend"><div class="input-group-text"><i class="fa fa-tag"></i></div></div></div></div>',
		label: '<label class="col-4 col-form-label"></label>',
		textInput: '<input type="text" class="form-control">',
		selectInput: '<select class="custom-select"></select>',
	};

	function isArray(a) {
		return (!!a) && (a.constructor === Array);
	};

	function isObject(a) {
		return (!!a) && (a.constructor === Object);
	};

	function inputLabel(options) {//{{{
		var label = $(templates.label);
		label.text(options.label);
		label.attr("for", options.id);
		label.attr("id", options.id+"_lbl");
		return label;
	}//}}}

	function inputRow(options, input) {//{{{
		var row = $(templates.formRow);
		row.append(inputLabel(options));
		row.append($(templates.inputGroup));
		row.find(".input-group").append(input);
		return row;
	}//}}}

	exports.TextInput = function(options) {//{{{
		var input = $(templates.textInput);
		input.attr("required", options.required?"required":undefined);
		input.attr("id", options.id);
		input.attr("name", options.name);
		return inputRow(options, input);
	};//}}}

	exports.SelectInput = function(options) {
		var select = $(templates.selectInput);
		select.attr("required", options.required?"required":undefined);
		select.attr("id", options.id);
		select.attr("name", options.name);
		for (let [value, label] of Object.entries(options.options)) {
			select.append($("<option>").attr("value",value).text(label));
		}
		select.val(options.selected);
		return inputRow(options, select);
	};

	exports.show = function(options) {
		var dialog = $(templates.modal);

		dialog.find(".modal-title").text(options.title);
		var body = dialog.find(".modal-body");
		body.html("");

		options.inputs.forEach(function(input) {
			body.append(input);
		});

		if(options.cancelText) {
			dialog.find("#formBtnCancel").text(options.cancelText);
		}
		if(options.doneText) {
			dialog.find("#formBtnDone").text(options.doneText);
		}

		var formCompleted = false;

		dialog.find("form").on("submit", function() {
			if(options.completed) {
				var ret = options.completed(dialog, this);
				if(ret !== false) {
					formCompleted = true;
					dialog.modal("hide");
				}
			}
			return false; // Don't send the form
		});

		dialog.on("hidden.bs.modal", function() {
			dialog.modal("dispose");
			dialog.remove();
		});

		dialog.on("shown.bs.modal", function() {
			dialog.find(":input")[1].focus()
		});

		$('body').append(dialog);
		dialog.modal('show');
		return dialog;
	};

	return exports;
});

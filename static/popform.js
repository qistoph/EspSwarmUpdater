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
								  <i class="fa fa-check-circle"></i>
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
		inputGroup: '<div class="col-8"><div class="input-group"><div class="input-group-prepend"><div class="input-group-text"></div></div></div></div>',
		label: '<label class="col-4 col-form-label"></label>',
		textInput: '<input type="text" class="form-control">',
		selectInput: '<select class="custom-select"></select>',
		help: '<span id="cat_desired_imageHelpBlock" class="form-text text-muted">The firmware image devices in the category should download and install.</span>',
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

	function faIcon(type) {
		return $(`<i class="fa ${type}"></i>`);
	}

	function inputRow(options, input) {//{{{
		var row = $(templates.formRow);
		row.append(inputLabel(options));
		row.append($(templates.inputGroup));
		if(options.icon) {
			row.find(".input-group-prepend .input-group-text").append(faIcon(options.icon));
		}
		row.find(".input-group").append(input);
		//TODO:row.append($(templates.help));
		return row;
	}//}}}

	exports.TextInput = function(options) {//{{{
		var input = $(templates.textInput);
		input.attr("required", options.required?"required":undefined);
		input.attr("id", options.id);
		input.attr("name", options.name);
		input.attr("value", options.value);
		input.attr("pattern", options.pattern);
		if(options.readonly) {
			input.attr("readonly", "readonly");
		}
		return inputRow(options, input);
	};//}}}

	exports.NumberInput = function(options) {
		var row = exports.TextInput(options);
		var input = row.find("input");
		input.attr("type", "number");
		return row;
	};

	exports.CheckboxInput = function(options) {
		var row = exports.TextInput(options);
		var input = row.find("input");
		input.attr("type", "checkbox");
		input.attr("data-toggle", "toggle");
		if(options.value) {
			input.attr("checked","checked");
		}
		input.bootstrapToggle({"on":"Yes","off":"No"});
		if(options.readonly) {
			input.attr("disabled", "disabled");
		}
		return row;
	};

	exports.DateTimeInput = function(options) {
		//TODO: show calendar/clock
		return exports.NumberInput(options);
	};

	exports.SelectInput = function(options) {
		var select = $(templates.selectInput);
		select.attr("required", options.required?"required":undefined);
		select.attr("id", options.id);
		select.attr("name", options.name);
		for (let [value, label] of Object.entries(options.options)) {
			select.append($("<option>").attr("value",value).text(label));
		}
		select.val(options.value);
		return inputRow(options, select);
	};

	exports.FileInput = function(options) {
		var row = exports.TextInput(options);

		var input = row.find("input");
		input.addClass("custom-file-input");
		input.attr("type", "file");

		var div = $('<div class="custom-file"></div>');
		input.parent().append(div);
		div.append(input);

		var label = $(`<label class="custom-file-label" for="${options.id}">Choose file</label>`);
		div.append(label);

		if(options.showProgress) {
			var progress = $(`<div class="progress-bar"></div>`);
			row.children("div").append($(`<div class="progress"></div>`).append(progress));
		}

		row.progress = function(factor) {
			progress.width((100*factor)+"%");
			if(factor >= 100) {
				progress.removeClass("progress-bar-striped progress-bar-animated");
				progress.addClass("bg-success"); // TODO: green
			} else {
				progress.addClass("progress-bar-striped progress-bar-animated");
			}
		}

		var fileSelectedPromise;
		row.fileSelected = new Promise(function(resolve, reject) {
			fileSelectedPromise = resolve;
		});

		input.on('change', function() {
			label.text(this.files[0].name);
			fileSelectedPromise(this);
		});
		return row;
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

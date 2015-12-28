/* global monguiLang */

$(function(){
	var db = $('#db').val(),
		collection = $('#collection').val();

	$('.exp').click(function(){
		var title = $(this).html() === monguiLang.expand ? monguiLang.colapse : monguiLang.expand;

		$(this).html(title).parents('.result-box').find('.result').toggleClass('expanded');
		return false;
	});

	$(document).click(function(){
		$('#field_menu').hide();
	});

	$('#query-form').submit(function(){
		var $f = $(this);

		$('#sort-order [name^="sortFields"]').each(function(){
			if(this.value)
				$f.append('<input type="hidden" name="sort[' + this.value + ']" value="' + $(this).next().val() + '"/>');
		});
	}).find('[name="fields"]').change(function(){
		$(this.form).submit();
	});

	$('#results').on('click', '[data-action="delete-row"]', function(e){
		e.preventDefault();

		var id = $(this).parents('.result-box:first')[0].id;

		if(!confirm('Are you sure to delete the item with id "' + id + '"?'))
			return;

		$.ajax({
			data: {
				op: 'deleteRow',
				id: id,
				db: db,
				collection: collection
			},
			type: 'post'
		}).done(function(d){console.log(d);
			if(d.error)
				return $.alert(d.error);

			if(d.affected && d.affected.n === 1 && d.affected.ok === 1){
				$('#' + id).slideUp();

				//actualizamos número de registros en la colección
				var $numspan = $('#collections>.active>span');

				$numspan.text($numspan.text().replace(/\d+/, function(n){ return --n; }));
			}
		});
	}).on('click', '[data-action="new-field"]', function(e){
		e.preventDefault();

		fieldMethods.fieldCreate({
			id: $(this).parents('.result-box:first')[0].id
		});
	}).on('click', '[data-action="duplicate"]', function(e){
		e.preventDefault();

		var id = $(this).parents('.result-box:first')[0].id;

		$.ajax({
			data: {
				op: 'duplicate',
				id: id,
				db: db,
				collection: collection
			},
			type: 'post'
		}).done(function(d){
			if(d.error)
				return $.alert(d.error);

			$('#criteria').val('{\n\t_id: ObjectId("' + d._id + '")\n}');
			$('#actsel').val(['find']);

			$('#query-form').submit();
		});
	}).on('click', '.r-key', function(){
		$('.r-key.selected').removeClass('selected');

		var $a = $(this).addClass('selected'),
			pos = $a.position();

		pos.left += $a.width() + 4;

		$('#field_menu').css(pos).show().data({target: $a});

		return false;
	}).on('click', '.moretext', function(e){
		e.preventDefault();

		var $a = $('#field_menu a[href="#fieldUpdate"]');

		$a.parent().data('target', $(this).parent().prev());

		$a.click();
	});
	
	$('#actsel').change(function(){
		$('#update-operators').toggle(this.value === 'update');
		$('#sort-order-td').toggle(this.value === 'find');
		$('#native-fields').toggle(this.value.indexOf('find') === 0);
		$('#query-operators').toggle(this.value !== 'findById');
		$('#by-id').toggle(this.value === 'findById');
		$('#distinct-field').toggle(this.value === 'distinct');
		
		switch($(this).val()){
			case 'find':
//				$('#criteria').focus();
				break;
			case 'findById':
				$('#by-id input').select();
				break;
			case 'distinct':
				$('#distinct-field input').select();
				break;
		}
	}).change();
	
	$('#by-id').focus(function(){
		$(this).select();
	});

	$('#field_menu a').click(function(){
		var $a = $(this),
			$target = $a.parent().data('target'),
			func = $a.attr('href').substr(1),
			parent = $target.attr('data-parent');

		$a.parent().hide();

		fieldMethods[func]({
			field: (parent ? parent + '.' : '') + $target.text(),
			id: $target.parents('.result-box:first').attr('id'),
			target: $target
		});

		return false;
	});

	var $updateDialog = $('#update-dialog').dialog({
		autoOpen: false,
		width: 540,
		modal: true,
		buttons: {
			Apply: function() {
				fieldMethods.doUpdate(function(){
					$updateDialog.dialog( "close" );
				});
			},
			Cancel: function() {
				$updateDialog.dialog( "close" );
			}
		}
	});
	
	var fields;

	var fieldMethods = {
		fieldCreate: function(o){
			var data = {
				key: o.field,
				id: o.id,
				db: db,
				collection: collection
			};

			$('#dialog-field-name').show();

			$('#data_key').val('');

			var $dt = $('#data_type');

			if(!$dt.val())
				$dt.val('');

			$dt.change();

			$('#update-dialog')
				.dialog('open')
				.dialog('option', 'title', 'Add new field')
				.data({field: data, target: null});
		},
		getField: function(id, k, cb){
			$.ajax({
				url: location.pathname + '/' + id + '/' + k
			}).done(cb);
		},
		fieldUpdate: function(o){
			$('#data_key').val(o.field);

			fieldMethods.getField(o.id, o.field, function(d){
				$('#data_type').val(d.inputType).change();
				$('#data_value').attr('data-name', o.field).attr('data-id', o.id);

				switch(d.inputType){
					case 'mixed':
					case 'string':
					case 'binary':
						$('#data_value textarea').val(d.val);
						break;
					case 'boolean':
						$('#data_value select').val([d.val]);
						break;
					case 'null':
						break;
					default:
						$('#data_value input').val(d.val);
				}

				$('#dialog-field-name').hide();

				$('#update-dialog')
					.dialog('open')
					.dialog('option', 'title', 'Modify field "' + o.field + '"')
					.data(o);
			});
		},
		fieldSortAsc: function(o){
			$('#sort-order [name^="sortFields"]').each(function(){
				this.value = '';
			});

			$('#sort-order [name="sortFields[0]"]')
				.val(o.field)
				.next().val([1]);

			$('#query-form').submit();
		},
		fieldSortDesc: function(o){
			$('#sort-order [name^="sortFields"]').each(function(){
				this.value = '';
			});

			$('#sort-order [name="sortFields[0]"]')
				.val(o.field)
				.next().val([-1]);

			$('#query-form').submit();
		},
		fieldRename: function(o){
			var p = o.field.lastIndexOf('.') + 1
			,	basename = o.field.substr(p)
			,	name = prompt('New name for field ' + o.field, basename);

			if(!name || name === basename)
				return;

			var base = o.field.substr(0, p)
			,	value = base + name;
			
			$.ajax({
				url: '/db/' + db + '/' + collection,
				data: {
					op: 'renameField',
					key: o.field,
					name: value,
					id: o.id,
					db: db,
					collection: collection
				},
				type: 'post'
			}).done(function(d){
				if(d.error)
					return $.alert(d.error);

				o.target.html(name);
			});
		},
		fieldRemove: function(o){
			if(!confirm('Are you sure to remove field "' + o.field + '"?'))
				return;

			$.ajax({
				url: '/db/' + db + '/' + collection,
				data: {
					op: 'deleteField',
					key: o.field,
					id: o.id,
					db: db,
					collection: collection
				},
				type: 'post'
			}).done(function(d){
				if(d.error)
					return $.alert(d.error);

				if(d.affected.n === 1){
					$(o.target[0].nextSibling).remove();//text node ': '

					o.target.next().remove();//span content value

					if(o.target[0].previousSibling.nodeValue[0]===',')
						$(o.target[0].previousSibling).remove();
					else if(o.target[0].nextSibling.nodeValue[0]===',')
						$(o.target[0].nextSibling).remove();

					o.target.remove();
				}
			});
		},
		fieldClear: function(o){
			console.error('Todo: fieldClear');
		},
		fieldHide: function(o){
			fieldMethods.getFields();
			
			if(fields.indexOf(o.field) === -1)
				return;
			
			location.search = location.search.replace(new RegExp('[\\?&]fields=' + o.field), '');
		},
		fieldShow: function(o){
			fieldMethods.getFields();
			
			if(fields.indexOf(o.field) !== -1)
				return;
			
			location.search += (location.search ? '&' : '?' ) + 'fields=' + o.field;
		},
		getFields: function(){
			if(fields)
				return fields;
			
			fields = location.search.match(/fields=[^&]+/g) || [];
			
			fields.forEach(function(field, i){
				fields[i] = field.replace(/fields=/, '');
			});
			
			return fields;
		},
		doUpdate: function(cb){
			var ddata = $updateDialog.data()
			,	$target = ddata.target
			,	data = {
					op: 'setField',
					db: db,
					collection: collection,
					id: ddata.id || ddata.field.id,
					field: $.trim($('#data_key').val()),
					value: $('#data_value').find('>*').val(),
					type: $('#data_type').val()
				};

			if(!data.field)
				return $.alert('No name');
			
			if(data.type === 'number' && !data.value)
				data.value = 0;
			
			$.ajax({
				url: '/db/' + db + '/' + collection,
				data: data,
				type: 'POST',
				error: function(e){
					$.alert('Server error: ' + e.statusText);
				}
			}).done(function(d){
				if(d.error)
					return $.alert(d.error);
				
				console.log(d);

				if(!$target){//es un nuevo campo
					var $last = $('#' + data.id + '>.result>span:last');

					$last.append(',\n');

					$target = $('<a class="r-key" href="#" data-type="' + data.type + '">' + data.field + '</a>')
						.insertAfter($last);

					$target.after(': <span>');
				}

				$target.next().html(data.value);

				cb();
			});
		}
	};

	$('#data_type').change(function(){
		var val = $(this).val(),
			$dv = $('#data_value').empty().parent().toggle(val !== 'null').end();

		switch($(this).val()){
			case 'mixed':
			case 'string':
			case 'binary':
				$dv.append('<textarea rows="10" cols="48">');
				break;
			case 'boolean':
				$dv.append('<select><option value="true">True</option><option value="false">False</option></select>');
				break;
			case 'number':
				$dv.append('<input type="number">');
				break;
			case 'null':
				break;
			default:
				$dv.append('<input>');
		}
	});

	$('form#command').submit(function(e){
		e.preventDefault();

		$.ajax({
			url: '/command',
			type: 'post',
			data: {
				command: $(this).find('[name="command"]').val(),
				db: $('[name="db"]').val()
			}
		}).done(function(d){
			$('#command-result').show().find('pre').text(JSON.stringify(d, null, '\t'));
		});

		return false;
	});

	$('[href="truncate"]').click(function() {
		if(confirm(this.dataset.msg.replace('%s', collection))){
			$('#op').val('truncate');

			$('#post').submit();
		}
		return false;
	});

	$('[href="drop"]').click(function() {
		if(confirm(this.dataset.msg.replace('%s', collection))){
			$('#op').val('drop');

			$('#post').submit();
		}
		return false;
	});

	$('#db-repair').click(function() {
		if(confirm(this.dataset.msg.replace('%s', db))){
			var data = {
				command: '{repairDatabase: 1}',
				db: $('[name="db"]').val()
			};

			$.ajax({
				url: '/command',
				type: 'post',
				data: data
			}).done(function(d){
				$.alert(data.command + '<br><br>'
						+ $('#serverResponse').val()
						+ '<br><br>' + JSON.stringify(d));
			});
		}
		return false;
	});

	$('#dropdb').click(function() {
		if(confirm(this.dataset.msg.replace('%s', db))){
			$('#dbop').val('dropdb');

			$('#post').submit();
		}

		return false;
	});

	if($('.result-box').size() === 1)
		$('.exp').click();

	$('#explain').click(function(){
		$.ajax({
			url: location.pathname,
			data: {
				action: 'explain',
				criteria: $('#criteria').val()
			}
		}).done(function(d){
			if(d.error)
				return $.alert(d.error);

			$('.paginator').remove();

			var $r = $('#results').empty()
			,	$t = $('<table style="width:auto" class="lcaption"><thead><tr><th colspan="2">explain()</th></tr></thead><tbody></tbody></table>')
					.appendTo($r).find('tbody');

			$.each(d, function(k){
				$t.append('<tr><th>' + k + '</td><td><pre>' + JSON.stringify(this, null, '\t') + '</pre></td></tr>');
			});
		});
	});

	$(window).resize(function(){
//		$('#leftC .auto-height').height($(this).height()-28);
		$('#rightC .auto-height').height($(this).height()-54);
	}).resize();

	$('#command-examples a').click(function(){
		$('[name="command"]').val($(this).html());

		$('#command').submit();
	});
	
	if($('form#command').size() && location.hash)
		$('#command-examples a[href="' + location.hash + '"]').click();

	var $msgDialog = $('#msg-dialog').dialog({
		autoOpen: false,
		title: 'Mongui',
		modal: true,
		buttons: {
			OK: function() {
				$(this).dialog( "close" );
			}
		}
	});

	$.alert = function(msg){
		$msgDialog.find('#msg-body').html(msg).end().dialog('open');
	};
});